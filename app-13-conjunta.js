/* ============================ conjunta de site (Multivale x provedor parceiro) ============================
   Atividade como a preventiva, mas no site do backbone. O técnico registra o site, o técnico do parceiro que
   acompanhou, as fibras trabalhadas (origem x destino) com as potências e as fotos obrigatórias.
   Depois de concluída fica pendente para o supervisor anexar as curvas do OTDR (TX e RX) no painel. */
const siteNovo = () => ({ sigla: '', nome: '', dgo: '', parc: { nome: '', empresa: '', telefone: '', doc: '', funcao: '' }, fibras: [{ origem: '', destino: '', tx: '', rx: '', obs: '' }], curvas: {} });
const temPot = v => /-?\d/.test(String(v || ''));
// fibra completa: origem, destino e as potências TX e RX escritas (a foto do power meter é cobrada nas fotos)
const siteFibSemPot = i => ((i.site || {}).fibras || []).filter(f => (String(f.origem || '').trim() || String(f.destino || '').trim()) && !(temPot(f.tx) && temPot(f.rx)));
const siteFibOk = i => ((i.site || {}).fibras || []).filter(f => String(f.origem || '').trim() && String(f.destino || '').trim());
const curvasDe = i => (i && i.site && i.site.curvas) || {};
const curvasFaltam = i => ['tx', 'rx'].filter(l => !curvasDe(i)[l]);
const siteTitulo = i => 'Conjunta de site' + (i && i.site && i.site.sigla ? ' · ' + i.site.sigla : '');
const LADO_LB = { tx: 'TX', rx: 'RX' };

/* ---------- check-in no site: obrigatório antes de começar a conjunta ---------- */
const CHECKIN_RAIO = 300;
function alvoCheckin(i) { const a = S.ronda && S.ronda.atividadeId ? S.atvs.get(S.ronda.atividadeId) : null; if (a && a.lat != null) return { lat: +a.lat, lon: +a.lon, ref: 'ponto da O.S.' }; return null; }
function checkinHtml(i) {
  const c = i.site.checkin;
  if (c) return `<div class="okbox" style="display:flex;gap:10px;align-items:center"><span aria-hidden="true" style="font-size:22px">📍</span><span><b>Check-in no site às ${fHora(c.ts)}</b> · ${c.lat.toFixed(5)}, ${c.lon.toFixed(5)} (±${c.acc} m)${c.dist != null ? ` · a ${fDist(c.dist)} do ${esc(c.ref || 'ponto da O.S.')}` : ''}${c.motivo ? `<br><span class="small">Justificativa: ${esc(c.motivo)}</span>` : ''}</span></div>`;
  const alvo = alvoCheckin(i);
  return `<section class="card" style="border:2px solid var(--accent)"><h2><span class="num">✓</span>Check-in no site</h2>
    <p style="margin:0">Ao chegar no site, faça o check-in antes de começar a conjunta. O app registra a hora e a sua localização${alvo ? ` e confere a distância até o ${esc(alvo.ref)}` : ''}.</p>
    <button type="button" class="btn go block" id="bCheckin">📍 Fazer check-in no site</button>
    <p class="muted small" style="margin:0">As outras etapas da conjunta liberam depois do check-in.</p></section>`;
}
async function fazCheckin(i) {
  const b = $('#bCheckin'); if (b) { b.disabled = true; b.textContent = 'Pegando a localização…'; }
  const l = await posAtual(0); if (!l) { toast(S.gps.msg && S.gps.status === 'err' ? S.gps.msg : 'Sem sinal de GPS. Vá para um local aberto e tente de novo.', 6000); if (b) { b.disabled = false; b.textContent = '📍 Fazer check-in no site'; } return; }
  const alvo = alvoCheckin(i); const dist = alvo ? Math.round(hav(l, alvo)) : null; let motivo = '';
  if (dist != null && dist > CHECKIN_RAIO) { motivo = prompt(`Você está a ${fDist(dist)} do ${alvo.ref}. Explique o motivo para fazer o check-in assim mesmo:`, '') ?? null; if (motivo === null || !motivo.trim()) { toast('Check-in não feito. Chegue ao site ou informe o motivo.', 6000); if (b) { b.disabled = false; b.textContent = '📍 Fazer check-in no site'; } return; } }
  i.site.checkin = { ts: Date.now(), lat: +l.lat.toFixed(6), lon: +l.lon.toFixed(6), acc: l.acc, dist, ref: alvo ? alvo.ref : '', motivo: motivo.trim() };
  if (!i.loc) i.loc = l; saveInsp(true);
  try { const a = S.ronda && S.ronda.atividadeId ? S.atvs.get(S.ronda.atividadeId) : null; if (a) await atvStatus(a, 'no_local', { chegadaEm: a.chegadaEm || i.site.checkin.ts, checkinEm: i.site.checkin.ts, checkinDist: dist, checkinMotivo: motivo.trim() }); } catch (e) {}
  if (!i.info.endereco) preencherEndereco(true); toast('Check-in feito às ' + fHora(i.site.checkin.ts) + '.'); render();
}
const checkinTxt = c => c ? `${fDH(c.ts)} · ${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}${c.dist != null ? ` · a ${fDist(c.dist)} do ${c.ref || 'ponto da O.S.'}` : ''}${c.motivo ? ' · justificativa: ' + c.motivo : ''}` : 'Não feito';

function stepSite(i) {
  if (!i.site.checkin) return checkinHtml(i);
  const s = i.site, rt = rotaAtual(i);
  const pontas = rt ? [['A', rt.pontaA, siglaSite(rt, 'A')], ['B', rt.pontaB, siglaSite(rt, 'B')]].filter(x => x[1] || x[2]) : [];
  return checkinHtml(i) + `<section class="card"><h2><span class="num">1</span>Site do backbone</h2>
    <p class="muted small" style="margin:0">Conjunta entre o técnico Multivale e o técnico do provedor parceiro. Registre o site, quem acompanhou, as fibras trabalhadas e as fotos. As curvas do OTDR (TX e RX) o supervisor anexa depois, no painel.</p>
    ${pontas.length ? `<div class="chips" role="group" aria-label="Site da rota">${pontas.map(([l, n, sg]) => `<button type="button" data-sitepta="${l}" aria-checked="${!!sg && s.sigla === sg}">Ponta ${l}: ${esc(sg || n)}${n && sg ? ' · ' + esc(n) : ''}</button>`).join('')}</div>` : ''}
    <div class="grid2">${inp('site.sigla', 'Sigla / ID do site', { req: 1, caps: 1, ph: 'Ex.: PDA' })}${inp('site.nome', 'Nome do site', { ph: 'Ex.: Estação Pindamonhangaba' })}${inp('site.dgo', 'DGO / bastidor', { ph: 'Ex.: DGO 02 · rack 3' })}<div></div><div class="field full"><span class="lb">Ticket interno</span><b>${esc(i.ticketAtv || '—')}</b><span class="muted small">Gerado automaticamente ao iniciar a conjunta.</span></div>${inp('tkParc.0', 'Ticket do parceiro 1', { caps: 1, ph: 'Opcional' })}${inp('tkParc.1', 'Ticket do parceiro 2', { caps: 1, ph: 'Opcional' })}</div>
    <h3>Local</h3>${locHtml()}<button type="button" class="btn" id="bLocImpl">${ICON.pin}Atualizar localização</button><div class="grid2">${inp('info.endereco', 'Endereço', { full: 1 })}${inp('info.cidade', 'Cidade - UF')}</div></section>
  <section class="card"><h2><span class="num">2</span>Técnico do parceiro que acompanhou</h2>
    <div class="grid2">${inp('site.parc.nome', 'Nome completo', { req: 1, full: 1 })}${inp('site.parc.empresa', 'Provedor / empresa', { req: 1, ph: 'Ex.: Master' })}${inp('site.parc.funcao', 'Função', { ph: 'Ex.: técnico de campo' })}${inp('site.parc.telefone', 'Telefone', { mode: 'tel', ph: '(12) 90000-0000' })}${inp('site.parc.doc', 'Documento ou matrícula', { ph: 'RG, CPF ou matrícula no provedor' })}</div></section>`;
}
function stepSiteFib(i) {
  const L = i.site.fibras;
  return `<section class="card"><h2><span class="num">3</span>Fibras trabalhadas</h2>
    <p class="muted small" style="margin:0">Uma linha por fibra: de onde sai (origem) e para onde vai (destino). Ex.: origem "DGO 01 · porta 05" e destino "DGO 02 · porta 07", ou "Cabo PDA x TBT · FO 12". As potências TX e RX são <b>obrigatórias</b> em cada fibra (em dBm, com o sinal de menos), e a foto do power meter vai na etapa de fotos.</p>
    <div class="list" style="gap:10px">${L.map((f, k) => `<div class="sfib"><div class="row" style="justify-content:space-between;align-items:center"><b>Fibra ${k + 1}${f.origem && f.destino ? ': ' + esc(f.origem) + ' › ' + esc(f.destino) : ''}</b>${L.length > 1 ? `<button type="button" class="lnk" data-sfdel="${k}">Remover</button>` : ''}</div>
      <div class="grid2">${inp(`site.fibras.${k}.origem`, 'Origem', { req: 1, ph: 'Ex.: DGO 01 · porta 05' })}${inp(`site.fibras.${k}.destino`, 'Destino', { req: 1, ph: 'Ex.: DGO 02 · porta 07' })}${inp(`site.fibras.${k}.tx`, 'Potência TX (dBm)', { req: 1, ph: 'Ex.: -3,2' })}${inp(`site.fibras.${k}.rx`, 'Potência RX (dBm)', { req: 1, ph: 'Ex.: -18,5' })}${inp(`site.fibras.${k}.obs`, 'Observação', { full: 1, ph: 'Opcional' })}</div>${evFibraHtml(f, k)}</div>`).join('')}</div>
    <button type="button" class="btn block" id="bSfAdd">${ICON.plus}Adicionar fibra</button>
    <div class="okbox small">Depois de concluir, a conjunta fica <b>aguardando as curvas do OTDR</b> (TX e RX), que o supervisor anexa no painel.</div></section>`;
}
function afterSite(i, key) {
  $('#bCheckin') && ($('#bCheckin').onclick = () => fazCheckin(i));
  if (!i.site.checkin) { $$('[data-step]').forEach(b => b.onclick = () => { if (+b.dataset.step > 0) toast('Faça o check-in no site primeiro.'); }); const nx = $('#bNext'); if (nx) { nx.disabled = true; } }
  $$('[data-sfevadd]').forEach(b => b.onclick = () => { const f = i.site.fibras[+b.dataset.sfevadd]; f.ev = f.ev || []; f.ev.push({ dist: '', perda: '', tipo: '', obs: '' }); saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
  $$('[data-sfevdel]').forEach(b => b.onclick = () => { const [k, j] = b.dataset.sfevdel.split(':').map(Number); if (!confirm('Remover este evento?')) return; i.site.fibras[k].ev.splice(j, 1); saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
  $$('[data-k$=".bobinaM"]').forEach(el => el.addEventListener('change', () => { if (mNum(el.value) != null) { S.perfil.bobinaM = el.value; DB.put('meta', S.perfil); } }));
  if (key === 'smapa') {
    const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
    $('#sRota') && ($('#sRota').onchange = e => { const rt = rotaById(e.target.value); i.info.rotaId = rt ? rt.id : ''; i.info.rota = rt ? rotaLb(rt) : ''; i.site.otdr = { ...(i.site.otdr || {}), origem: '' }; saveInsp(); re(); });
    $('#sKmz') && ($('#sKmz').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importaKmzSite(f, i); });
    $$('[data-sorig]').forEach(b => b.onclick = () => { otdrCfg(i).origem = b.dataset.sorig; saveInsp(); re(); });
    $$('[data-ssent]').forEach(b => b.onclick = () => { otdrCfg(i).sentido = b.dataset.ssent; saveInsp(); re(); });
    $('#sCorr') && $('#sCorr').addEventListener('change', e => { otdrCfg(i).corr = e.target.value; const c = otdrCfg(i).corrN; if (mNum(e.target.value) == null || mNum(e.target.value) > CORR_MAX || mNum(e.target.value) < 0) toast(`A correção vai de 0 a ${CORR_MAX}%. Usando ${fmtN(c)}%.`); saveInsp(); re(); });
    $('#bSiteKmz') && ($('#bSiteKmz').onclick = async () => { const f = await kmzSite(i); if (f) exportar(f); });
    if (!S.cxRef && !S.cxCarr) { S.cxCarr = true; carregaCaixasRef().then(() => { S.cxCarr = false; if (S.view === 'insp' && S.insp === i && ST()[S.step][0] === 'smapa') re(); }); }
    const R = calcPins(i); if (R.ok) { guardaPins(i, R); saveInsp(); } mapaSite(i, $('#sMapa'));
  }
  $$('[data-sitepta]').forEach(b => b.onclick = () => { const rt = rotaAtual(i); if (!rt) return; const l = b.dataset.sitepta; i.site.sigla = siglaSite(rt, l); if (!i.site.nome) i.site.nome = rt['ponta' + l] || ''; saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
  $('#bSfAdd') && ($('#bSfAdd').onclick = () => { i.site.fibras.push({ origem: '', destino: '', tx: '', rx: '', obs: '' }); saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); const l = $$('[data-k$=".origem"]'); l.length && l[l.length - 1].focus(); });
  $$('[data-sfdel]').forEach(b => b.onclick = () => { if (!confirm('Remover esta fibra?')) return; i.site.fibras.splice(+b.dataset.sfdel, 1); saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
  if (key === 'site') $('#f_site_sigla') && $('#f_site_sigla').addEventListener('input', e => { $('#topTitle').textContent = 'Conjunta de site' + (e.target.value ? ' · ' + e.target.value : ''); });
}
function pendSite(i) {
  const p = [], s = i.site || siteNovo();
  if (!s.checkin) p.push('Check-in no site');
  (s.fibras || []).forEach((f, k) => { if (f.bobina && mNum(f.bobinaM) == null) p.push(`Tamanho da bobina da fibra ${k + 1}`); if ((f.ev || []).some(e => mNum(e.dist) == null)) p.push(`Distância dos eventos do OTDR da fibra ${k + 1}`); });
  if (evsOtdr(i).length && !calcPins(i).ok && !(s.otdrRes && s.otdrRes.pins && s.otdrRes.pins.length)) p.push('Rota (KMZ) para localizar os eventos do OTDR');
  if (!String(s.sigla || '').trim()) p.push('Sigla do site'); if (!String(s.parc.nome || '').trim()) p.push('Nome do técnico do parceiro'); if (!String(s.parc.empresa || '').trim()) p.push('Provedor do técnico do parceiro');
  if (!siteFibOk(i).length) p.push('Fibras trabalhadas (origem x destino)'); if (siteFibSemPot(i).length) p.push('Potência TX e RX escrita em ' + siteFibSemPot(i).length + ' fibra(s)'); if (!i.loc) p.push('Localização (GPS)');
  const ff = obrigOf(i).filter(c => !i.fotos.some(f => f.cat === c)); if (ff.length) p.push('Fotos de ' + ff.join(', ')); if (!i.assinatura) p.push('Assinatura');
  return p;
}

/* ---------- PDF ---------- */
async function pdfSite(doc, y, sn, i) {
  const s = i.site, p = s.parc, C = curvasDe(i);
  y = pdfSec(doc, y, ++sn, 'Site e equipe');
  y = kv(doc, y, [['Check-in no site', checkinTxt(s.checkin)], ['Ticket interno', i.ticketAtv], ['Ticket(s) do parceiro', tkParcTxt(i) || s.protocolo || s.ticket], ['Site', [s.sigla, s.nome].filter(Boolean).join(' · ')], ['DGO / bastidor', s.dgo], ['Endereço', [i.info.endereco, i.info.cidade].filter(Boolean).join(', ')], ['Rota', i.info.rota], ['Técnico Multivale', i.info.tecnico], ['Data', fDH(i.chegada)], ['Saída', i.saida ? fHora(i.saida) : '']]);
  y = pdfSec(doc, y, ++sn, 'Técnico do parceiro que acompanhou');
  y = kv(doc, y, [['Nome', p.nome], ['Provedor / empresa', p.empresa], ['Função', p.funcao], ['Telefone', p.telefone], ['Documento / matrícula', p.doc]]);
  y = pdfSec(doc, y, ++sn, 'Fibras trabalhadas (origem x destino)');
  const F = siteFibOk(i);
  if (F.length) { doc.autoTable({ ...TB, startY: y, head: [['#', 'Origem', 'Destino', 'TX (dBm)', 'RX (dBm)', 'Observação']], body: F.map((f, k) => [k + 1, f.origem, f.destino, f.tx || '—', f.rx || '—', f.obs || '']), columnStyles: { 0: { halign: 'center', cellWidth: 9, fontStyle: 'bold' }, 3: { halign: 'center', cellWidth: 20 }, 4: { halign: 'center', cellWidth: 20 } } }); y = doc.lastAutoTable.finalY + 7; }
  else { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(20); doc.text('Nenhuma fibra informada.', 12, y + 1); y += 8; }
  if ((s.fibras || []).some(f => f.bobina)) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(20); doc.text('Bobina de lançamento: ' + (s.fibras || []).map((f, k) => f.bobina ? `fibra ${k + 1}: ${fM(mNum(f.bobinaM))}` : '').filter(Boolean).join(' · ') + ' (descontada da distância dos eventos).', 12, y - 2, { maxWidth: 186 }); y += 5; }
  ({ y, sn } = await pdfOtdr(doc, y, sn, i));
  y = pdfSec(doc, y, ++sn, 'Curvas do OTDR');
  y = kv(doc, y, ['tx', 'rx'].map(l => [`Curva ${LADO_LB[l]}`, C[l] ? `${C[l].nome || 'arquivo'} · anexada por ${C[l].por || 'supervisor'} em ${fDH(C[l].em)}${/^image\//.test(C[l].mime || '') ? ' (imagem no fim do relatório)' : ' (arquivo no painel)'}` : 'Pendente: o supervisor anexa no painel']));
  return { y, sn };
}
async function pdfCurvas(doc, logo, i) {
  const C = curvasDe(i);
  for (const l of ['tx', 'rx']) { const c = C[l]; if (!c || !/^image\//.test(c.mime || '')) continue; const fb = await fotoBlob({ path: c.path }); if (!fb) continue;
    try { const data = await blobToData(fb); const bmp = await createImageBitmap(fb); doc.addPage(); let y = pdfHeader(doc, logo, `Curva do OTDR · ${LADO_LB[l]}`, siteTitulo(i), i.site.sigla, 'SITE'); const bw = 186, bh = 210; let w = bw, h = w * bmp.height / bmp.width; if (h > bh) { h = bh; w = h * bmp.width / bmp.height; }
      doc.addImage(data, /png/.test(c.mime) ? 'PNG' : 'JPEG', 12 + (bw - w) / 2, y, w, h); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(20); doc.text(`Curva ${LADO_LB[l]} · ${c.nome || ''}`, 12, y + h + 5, { maxWidth: 186 }); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90); doc.text(`Anexada por ${c.por || 'supervisor'} em ${fDH(c.em)}`, 12, y + h + 9.5); } catch (e) { console.warn('curva no PDF', e); } }
}

/* ---------- painel do supervisor: pendências e anexo das curvas ---------- */
function sitesPendentes() { return (S.sitesConj || []).filter(e => e.status === 'concluida' && curvasFaltam(e).length); }
function carregaSitesConj(depois) { if (!Nuvem.on || S.sitesCarr) return; S.sitesCarr = true; Nuvem.sitesConj().then(l => { S.sitesConj = l; S.sitesTs = Date.now(); depois && depois(); }).catch(() => {}).finally(() => { S.sitesCarr = false; }); }
function sitesBanner() {
  if (Nuvem.on && (!S.sitesTs || Date.now() - S.sitesTs > 60000)) carregaSitesConj(pintaLimites);
  const P = sitesPendentes(); if (!P.length) return '';
  return `<div class="banner" style="background:#e8f4ea;color:#14532d"><span>📈 ${P.length === 1 ? 'Conjunta de site aguardando' : P.length + ' conjuntas de site aguardando'} as curvas do OTDR: ${P.slice(0, 4).map(e => `<b>${esc((e.site || {}).sigla || 'site')}</b> (${e.ticketAtv ? esc(e.ticketAtv) + ', ' : ''}${esc(e.info.tecnico || e._tecnico || '')}, ${fData(e.chegada).slice(0, 5)}, falta ${curvasFaltam(e).map(l => LADO_LB[l]).join(' e ')})`).join(' · ')}${P.length > 4 ? ' …' : ''}</span>${P.slice(0, 3).map(e => `<button type="button" class="btn go" data-sitecurva="${esc(e.id)}" style="min-height:36px">Inserir curvas${P.length > 1 ? ' · ' + esc((e.site || {}).sigla || '') : ''}</button>`).join('')}</div>`;
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-sitecurva]'); if (!b || !ADMIN) return; const ev = (S.sitesConj || []).find(x => x.id === b.dataset.sitecurva); if (!ev) return; ev.fotos = ev.fotos || []; ev.check = ev.check || {}; S.evView = ev; S.evVolta = S.view; go('evento'); });
function curvasCardHtml(e) {
  const C = curvasDe(e), pode = ADMIN && Nuvem.on && !(typeof ehAlmox === 'function' && ehAlmox());
  return `<section class="card"><h2>Curvas do OTDR</h2>${curvasFaltam(e).length ? `<div class="warnbox small">Pendente: ${curvasFaltam(e).map(l => 'curva ' + LADO_LB[l]).join(' e ')}.${pode ? ' Anexe o arquivo exportado do OTDR (PDF, imagem ou .sor).' : ' O supervisor anexa no painel.'}</div>` : '<div class="okbox small">Curvas TX e RX anexadas.</div>'}
    ${['tx', 'rx'].map(l => { const c = C[l]; return `<div class="item" style="cursor:default;align-items:center"><span class="badge">${LADO_LB[l]}</span><span class="tx"><b>Curva ${LADO_LB[l]}</b><span>${c ? `${esc(c.nome || 'arquivo')} · ${esc(c.por || '')} · ${fDH(c.em)}` : 'Ainda não anexada'}</span></span>${c ? `<button type="button" class="btn" data-curvaver="${l}" style="min-height:40px">Abrir</button>` : ''}${pode ? `<label class="btn ${c ? '' : 'pri'}" style="min-height:40px;cursor:pointer">${c ? 'Trocar' : 'Anexar'}<input type="file" data-curvaup="${l}" accept="image/*,application/pdf,.pdf,.sor,.SOR" hidden></label>` : ''}</div>`; }).join('')}</section>`;
}
function siteEventoHtml(e) {
  const s = e.site || siteNovo(), p = s.parc || {}, kv = (k, v) => v ? `<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>` : ''; const F = siteFibOk(e);
  const pins = pinsDe(e);
  return `<section class="card"><h2>Site e técnico do parceiro</h2>${kv('Check-in no site', checkinTxt(s.checkin))}${kv('Site', [s.sigla, s.nome].filter(Boolean).join(' · '))}${kv('Ticket interno', e.ticketAtv)}${kv('Ticket(s) do parceiro', tkParcTxt(e) || s.protocolo || s.ticket)}${kv('DGO / bastidor', s.dgo)}${kv('Acompanhou', [p.nome, p.empresa].filter(Boolean).join(' · '))}${kv('Função', p.funcao)}${kv('Telefone', p.telefone)}${kv('Documento', p.doc)}</section>
    <section class="card"><h2>Fibras trabalhadas (${F.length})</h2>${F.length ? `<div class="list">${F.map((f, k) => `<div class="item" style="cursor:default"><span class="badge">${k + 1}</span><span class="tx"><b style="white-space:normal">${esc(f.origem)} › ${esc(f.destino)}</b><span>TX ${esc(f.tx || '—')} dBm · RX ${esc(f.rx || '—')} dBm${f.obs ? ' · ' + esc(f.obs) : ''}</span></span></div>`).join('')}</div>` : '<p class="muted" style="margin:0">Nenhuma fibra informada.</p>'}</section>
    ${pins.length ? `<section class="card"><h2>Eventos do OTDR no traçado (${pins.length})</h2>${kv('Rota (KMZ)', (e.site.otdrRes || {}).rota || (calcPins(e).ok ? calcPins(e).rt.codigo : ''))}${kv('Correção', fmtN((e.site.otdrRes || {}).corr ?? otdrCfg(e).corrN) + '%')}<div class="list">${pins.map(p => `<div class="item" style="cursor:default"><span class="badge" style="width:auto;padding:0 8px;border-radius:6px">${esc(p.rot)}</span><span class="tx"><b style="white-space:normal">${esc(p.e.tipo || 'Evento')}${p.e.perda ? ' · ' + esc(p.e.perda) + ' dB' : ''} · ${fM(p.ef)} do site</b><span>OTDR ${fM(p.bruta)}${p.bob ? ' − bobina ' + fM(p.bob) : ''} · <a href="https://maps.google.com/?q=${p.lat},${p.lon}" target="_blank" rel="noopener">${(+p.lat).toFixed(5)}, ${(+p.lon).toFixed(5)}</a></span>${(p.cx || []).length ? `<span class="small" style="white-space:normal;color:var(--bad);font-weight:700">⚠ Possível ponto crítico: caixa ${esc(cxTxt(p.cx))}</span>` : ''}</span></div>`).join('')}</div><button type="button" class="btn block" id="bEvKmzOtdr">${ICON.pin}Baixar KMZ com os alfinetes</button></section>` : ''}
    ${curvasCardHtml(e)}`;
}
function afterSiteEvento(e) {
  $('#bEvKmzOtdr') && ($('#bEvKmzOtdr').onclick = async () => { const f = await kmzSite(e); if (f) exportar(f); });
  $$('[data-curvaver]').forEach(b => b.onclick = async () => { const c = curvasDe(e)[b.dataset.curvaver]; if (!c) return; const bl = await fotoBlob({ path: c.path }); if (!bl) { toast('Arquivo indisponível.'); return; } const u = URL.createObjectURL(new Blob([bl], { type: c.mime || bl.type || 'application/octet-stream' })); if (/^image\//.test(c.mime || '')) verImagem(u); else { const a = document.createElement('a'); a.href = u; a.download = c.nome || ('curva_' + b.dataset.curvaver); document.body.appendChild(a); a.click(); a.remove(); } });
  $$('[data-curvaup]').forEach(inp => inp.onchange = async () => { const f = inp.files[0]; inp.value = ''; if (!f) return; const lado = inp.dataset.curvaup;
    if (f.size > 15 * 1048576) { toast('Arquivo maior que 15 MB.'); return; }
    toast('Enviando a curva ' + LADO_LB[lado] + '…', 6000);
    try { const d = await Nuvem.evCurva(e.id, lado, f); Object.assign(e, d); S.sitesConj = (S.sitesConj || []).map(x => x.id === e.id ? { ...x, site: d.site } : x); toast(`Curva ${LADO_LB[lado]} anexada.${curvasFaltam(e).length ? ' Falta a ' + curvasFaltam(e).map(l => LADO_LB[l]).join(' e ') + '.' : ' Conjunta completa.'}`, 6000); const y = window.scrollY; render(); window.scrollTo(0, y); }
    catch (x) { toast('Não foi possível anexar: ' + (x.message || x), 7000); } });
}

/* ============================ OTDR no mapa: eventos das fibras como alfinetes no traçado (KMZ) da rota ============================
   distância do evento no OTDR − bobina de lançamento = distância na fibra; aplica a correção (até 15%: sobra de cabo nas reservas
   técnicas, folga e helicoidal do cabo) e mede essa distância ao longo do traçado, a partir do site, no sentido do disparo. */
const EV_TIPOS = ['Quebra / fim de fibra', 'Emenda com perda alta', 'Curvatura / macrocurvatura', 'Conector / reflexão', 'Atenuação distribuída', 'Outro'];
const CORR_MAX = 15;
// número em metros: aceita "10.000", "10000", "1.234,5", "1234,5"
function mNum(v) { const s = String(v ?? '').trim().replace(/\s|m$/gi, ''); if (!s) return null; const t = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.'); const n = parseFloat(t); return isFinite(n) ? n : null; }
const fM = m => m == null ? '—' : Math.round(m).toLocaleString('pt-BR') + ' m';
function otdrCfg(i) {
  const s = i.site; if (!s.otdr) s.otdr = { corr: CORR_MAX, sentido: 'B' };
  if (!s.otdr.origem) { const rt = i.info.rotaId ? rotaById(i.info.rotaId) : null; const sg = String(s.sigla || '').toUpperCase(); const km = meiosRota(rt).findIndex(m => sg && siglaMeio(m) === sg); s.otdr.origem = rt && sg && siglaSite(rt, 'A') === sg ? 'A' : rt && sg && siglaSite(rt, 'B') === sg ? 'B' : km >= 0 ? 'meio:' + km : rt ? 'gps' : 'A'; }
  const c = mNum(s.otdr.corr); s.otdr.corrN = c == null ? CORR_MAX : Math.max(0, Math.min(CORR_MAX, c)); return s.otdr;
}
// traçado como um caminho só, com a distância acumulada (m) desde a ponta A; entre linhas separadas não soma distância (igual ao kmNaRota)
function rotaPath(rt) { const P = []; let acc = 0; troncoRota(rt).forEach(l => l.forEach(([lat, lon], k) => { const p = { lat, lon }; if (P.length && (k > 0 || rt.kml.nTronco)) acc += hav(P[P.length - 1], p); P.push({ lat, lon, m: acc }); })); return P; }
function pontoEm(P, m) { if (!P.length) return null; if (m <= 0) return { lat: P[0].lat, lon: P[0].lon }; for (let j = 1; j < P.length; j++) { const a = P[j - 1], b = P[j]; if (m <= b.m) { const t = b.m > a.m ? (m - a.m) / (b.m - a.m) : 0; return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t }; } } const z = P[P.length - 1]; return { lat: z.lat, lon: z.lon }; }
function trechoEntre(P, a, b) { const lo = Math.max(0, Math.min(a, b)), hi = Math.max(a, b); const out = [pontoEm(P, lo)]; P.forEach(p => { if (p.m > lo && p.m < hi) out.push({ lat: p.lat, lon: p.lon }); }); out.push(pontoEm(P, hi)); return out; }
// caixas de referência: caixas já cadastradas nas inspeções (com GPS) e os pontos do KMZ da rota
const CX_RAIO = 500;
async function carregaCaixasRef() { try { const m = new Map(); const evs = [...(await eventosHistorico()), ...(S.inspCache ? [...S.inspCache.values()] : [])]; evs.filter(e => e && e.info && e.info.tag && e.loc && e.loc.lat != null && e.tipo !== 'site').sort((a, b) => (a.chegada || 0) - (b.chegada || 0)).forEach(e => m.set(String(e.info.tag).trim().toUpperCase(), { tag: String(e.info.tag).trim().toUpperCase(), lat: e.loc.lat, lon: e.loc.lon, origem: 'cadastro', end: [e.info.endereco, e.info.cidade].filter(Boolean).join(', ') })); S.cxRef = [...m.values()]; } catch (e) { S.cxRef = []; } return S.cxRef; }
function cxPerto(p, rt) { if (!p) return []; const pts = [...(S.cxRef || []), ...((rt && rt.kml && rt.kml.pontos) || []).filter(x => x.nome).map(x => ({ tag: x.nome, lat: x.lat, lon: x.lon, origem: 'KMZ' }))]; const vis = new Set(); return pts.map(c => ({ ...c, dist: Math.round(hav(p, c)) })).filter(c => c.dist <= CX_RAIO).sort((a, b) => a.dist - b.dist).filter(c => { const k = c.tag.toUpperCase(); if (vis.has(k)) return false; vis.add(k); return true; }).slice(0, 3); }
const cxTxt = l => (l || []).map(c => `${c.tag} a ${fDist(c.dist)}${c.origem === 'KMZ' ? ' (ponto do KMZ)' : ''}`).join('; ');
function evsOtdr(i) {
  const o = otdrCfg(i), L = [];
  (i.site.fibras || []).forEach((f, k) => (f.ev || []).forEach((e, j) => { const bruta = mNum(e.dist); if (bruta == null) return; const bob = f.bobina ? (mNum(f.bobinaM) || 0) : 0; const liq = Math.max(0, bruta - bob); L.push({ k, j, f, e, bruta, bob, liq, ef: liq * (1 - o.corrN / 100), rot: `F${k + 1}.E${j + 1}` }); }));
  return L;
}
function calcPins(i) {
  const o = otdrCfg(i), lista = evsOtdr(i), rt = i.info.rotaId ? rotaById(i.info.rotaId) : null;
  if (!rt || !rt.kml || !rt.kml.linhas.length) return { rt, o, lista, ok: false };
  const P = rotaPath(rt), tot = P[P.length - 1].m; let orig, dir, longe = null;
  const meio = /^meio:/.test(o.origem || '') ? meiosRota(rt)[+o.origem.slice(5)] : null;
  if (meio) { // site no meio: o cabo sai do DGO pelo ramal até o tronco e segue para a ponta escolhida
    const ram = meio.ramal >= 0 ? (rt.kml.linhas[(rt.kml.nTronco || 0) + meio.ramal] || []).map(([lat, lon]) => ({ lat, lon })) : []; const rp = meio.ramalDoFim ? ram.slice().reverse() : ram;
    const RP = []; let acc = 0; rp.forEach((p, k) => { if (k) acc += hav(rp[k - 1], p); RP.push({ ...p, m: acc }); }); const sp = RP.length ? RP[RP.length - 1].m : 0; dir = o.sentido === 'A' ? -1 : 1; orig = meio.mTronco;
    const onde = d => d <= sp && RP.length ? pontoEm(RP, d) : pontoEm(P, Math.max(0, Math.min(tot, orig + dir * (d - sp))));
    lista.forEach(x => { const mm = x.ef <= sp ? null : orig + dir * (x.ef - sp); x.m = mm; x.fora = mm != null && (mm < 0 || mm > tot); x.pos = onde(x.ef);
      const a = Math.min(x.ef, x.liq), b = Math.max(x.ef, x.liq); const pts = [onde(a)]; for (let t = 1; t < 12; t++) pts.push(onde(a + (b - a) * t / 12)); pts.push(onde(b)); x.faixa = pts; const old = (((i.site.otdrRes || {}).pins) || []).find(q => q.rot === x.rot); x.cx = S.cxRef ? cxPerto(x.pos, rt) : (old && old.cx) || []; });
    return { rt, o, lista, ok: true, P, tot, origM: orig, orig: { lat: meio.lat, lon: meio.lon }, longe: null, meio };
  }
  if (o.origem === 'A') { orig = 0; dir = 1; } else if (o.origem === 'B') { orig = tot; dir = -1; }
  else { const kk = i.loc ? kmNaRota(rt, i.loc) : null; if (!kk) return { rt, o, lista, ok: false, semGps: true }; orig = kk.km * 1000; dir = o.sentido === 'A' ? -1 : 1; longe = kk.d; }
  lista.forEach(x => { const m = orig + dir * x.ef, m0 = orig + dir * x.liq; x.m = m; x.fora = m < 0 || m > tot; x.pos = pontoEm(P, Math.max(0, Math.min(tot, m))); x.faixa = trechoEntre(P, Math.max(0, Math.min(tot, m)), Math.max(0, Math.min(tot, m0))); const old = (((i.site.otdrRes || {}).pins) || []).find(q => q.rot === x.rot); x.cx = S.cxRef ? cxPerto(x.pos, rt) : (old && old.cx) || []; });
  return { rt, o, lista, ok: true, P, tot, origM: orig, orig: pontoEm(P, orig), longe };
}
// guarda o resultado na ficha: o painel e o PDF mostram os alfinetes mesmo sem a rota carregada
function guardaPins(i, R) { if (!R.ok) return; i.site.otdrRes = { rota: R.rt.codigo, rotaId: R.rt.id, origem: R.o.origem, sentido: R.o.sentido, corr: R.o.corrN, orig: R.orig, pins: R.lista.map(x => ({ rot: x.rot, k: x.k, j: x.j, lat: +x.pos.lat.toFixed(6), lon: +x.pos.lon.toFixed(6), ef: Math.round(x.ef), liq: Math.round(x.liq), bruta: x.bruta, bob: x.bob, fora: !!x.fora, cx: x.cx || [], faixa: x.faixa.map(p => [+p.lat.toFixed(6), +p.lon.toFixed(6)]) })) }; }
function pinsDe(i) { const R = calcPins(i); if (R.ok) return R.lista.map(x => ({ rot: x.rot, k: x.k, j: x.j, lat: x.pos.lat, lon: x.pos.lon, ef: x.ef, liq: x.liq, bruta: x.bruta, bob: x.bob, fora: x.fora, cx: x.cx || [], faixa: x.faixa.map(p => [p.lat, p.lon]), e: x.e, f: x.f })); const c = (i.site && i.site.otdrRes) || null; return c ? c.pins.map(p => ({ ...p, f: (i.site.fibras || [])[p.k] || {}, e: (((i.site.fibras || [])[p.k] || {}).ev || [])[p.j] || {} })) : []; }
const meiosRota = rt => (rt && rt.kml && rt.kml.meio) || [];
const siglaMeio = m => String(m.sigla || siglaNome(m.nome) || '').toUpperCase();
const origemTxt = (i, rt) => { const o = (i.site && (i.site.otdr || i.site.otdrRes)) || {}; return o.origem === 'A' ? `ponta A${rt && rt.pontaA ? ' · ' + rt.pontaA : ''}` : o.origem === 'B' ? `ponta B${rt && rt.pontaB ? ' · ' + rt.pontaB : ''}` : `site no meio da rota (GPS), medindo em direção à ponta ${o.sentido || 'B'}`; };

function evFibraHtml(f, k) {
  const ev = f.ev || [];
  if (f.bobina && !f.bobinaM && S.perfil.bobinaM) f.bobinaM = S.perfil.bobinaM;
  return `<label class="row" style="min-height:44px;cursor:pointer;gap:8px"><input type="checkbox" data-k="site.fibras.${k}.bobina" data-fore="1" ${f.bobina ? 'checked' : ''} style="width:22px;height:22px"> <b>Usou bobina de lançamento (teste)</b></label>
    ${f.bobina ? `<div class="grid2">${inp(`site.fibras.${k}.bobinaM`, 'Tamanho da bobina (m)', { req: 1, mode: 'decimal', ph: 'Ex.: 1000' })}<span class="muted small" style="align-self:center">Descontada da distância dos eventos do OTDR.</span></div>` : ''}
    ${ev.map((e, j) => `<div class="sfev"><div class="row" style="justify-content:space-between;align-items:center"><b class="small">Evento ${j + 1} do OTDR</b><button type="button" class="lnk" data-sfevdel="${k}:${j}">Remover</button></div>
      <div class="grid2">${inp(`site.fibras.${k}.ev.${j}.dist`, 'Distância no OTDR (m)', { req: 1, mode: 'decimal', ph: 'Ex.: 10000' })}${inp(`site.fibras.${k}.ev.${j}.perda`, 'Perda (dB)', { mode: 'decimal', ph: 'Ex.: 1,8' })}
      <div class="field"><label class="lb" for="f_ev_${k}_${j}">Tipo</label><select id="f_ev_${k}_${j}" data-k="site.fibras.${k}.ev.${j}.tipo"><option value="">Selecione…</option>${EV_TIPOS.map(t => `<option ${e.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>${inp(`site.fibras.${k}.ev.${j}.obs`, 'Observação', { ph: 'Opcional' })}</div></div>`).join('')}
    <button type="button" class="btn" data-sfevadd="${k}" style="min-height:44px">${ICON.plus}Evento do OTDR com problema</button>`;
}
function stepSiteMapa(i) {
  const o = otdrCfg(i), rotas = S.rotas || [], R = calcPins(i), rt = R.rt;
  const x = R.ok ? R.lista : evsOtdr(i);
  return `<section class="card"><h2><span class="num">4</span>OTDR no mapa da rota</h2>
    <p class="muted small" style="margin:0">Escolha o KMZ da rota em que você está trabalhando. O app pega a distância de cada evento do OTDR, desconta a bobina de lançamento e a correção (até ${CORR_MAX}%: sobra de cabo nas reservas e folgas) e coloca um alfinete no traçado, a partir do site.</p>
    <div class="field"><label class="lb" for="sRota">Rota (KMZ)</label><div class="row" style="flex-wrap:nowrap;gap:8px"><select id="sRota" style="flex:1;min-width:0"><option value="">Selecione…</option>${rotas.map(r => `<option value="${r.id}" ${r.id === i.info.rotaId ? 'selected' : ''}>${esc(r.codigo)}${r.nome ? ' · ' + esc(r.nome) : ''}${r.kml ? ' · ' + fKm(r.kml.km) : ' (sem KMZ)'}</option>`).join('')}</select><label class="btn" style="min-height:48px;flex:0 0 auto;cursor:pointer">Importar KMZ<input type="file" id="sKmz" accept=".kmz,.kml" hidden></label></div></div>
    ${rt && !rt.kml ? '<div class="warnbox small">Essa rota não tem o traçado (KMZ). Importe o KMZ da rota para localizar os eventos.</div>' : ''}
    ${rt && rt.kml ? `<div class="field"><span class="lb">OTDR disparado de</span><div class="seg" role="group" aria-label="Origem da medição"><button type="button" data-sorig="A" aria-pressed="${o.origem === 'A'}">A · ${esc(siglaSite(rt, 'A') || rt.pontaA || 'Ponta A')}</button><button type="button" data-sorig="B" aria-pressed="${o.origem === 'B'}">B · ${esc(siglaSite(rt, 'B') || rt.pontaB || 'Ponta B')}</button>${meiosRota(rt).map((m, k) => `<button type="button" data-sorig="meio:${k}" aria-pressed="${o.origem === 'meio:' + k}">Meio · ${esc(siglaMeio(m) || m.nome)}</button>`).join('')}<button type="button" data-sorig="gps" aria-pressed="${o.origem === 'gps'}">Outro ponto (GPS)</button></div>${R.meio ? `<span class="muted small">${esc(R.meio.nome)}: no km ${fKmRef(R.meio.mTronco / 1000)} da rota${R.meio.ramalM ? `, com ${fM(R.meio.ramalM)} de ramal até o tronco (entra na conta)` : ''}.</span>` : ''}</div>
      ${o.origem === 'gps' || /^meio:/.test(o.origem || '') ? `<div class="field"><span class="lb">Medindo em direção a</span><div class="seg" role="group" aria-label="Sentido"><button type="button" data-ssent="A" aria-pressed="${o.sentido === 'A'}">Ponta A · ${esc(rt.pontaA || '')}</button><button type="button" data-ssent="B" aria-pressed="${o.sentido !== 'A'}">Ponta B · ${esc(rt.pontaB || '')}</button></div>${o.origem !== 'gps' ? '' : R.semGps ? '<div class="warnbox small">Capture a localização do site (etapa 1) para o app achar o site no traçado.</div>' : R.longe != null && R.longe > 500 ? `<div class="warnbox small">O site está a ${fDist(R.longe)} do traçado. Confira a rota ou a localização.</div>` : R.ok ? `<span class="muted small">Site no km ${fKmRef(R.origM / 1000)} da rota (a partir da ponta A).</span>` : ''}</div>` : ''}
      <div class="grid2"><div class="field"><label class="lb" for="sCorr">Correção da distância (%)</label><input type="text" id="sCorr" inputmode="decimal" value="${esc(o.corr ?? CORR_MAX)}"></div><span class="muted small" style="align-self:center">De 0 a ${CORR_MAX}%. Ex.: evento a 10.000 m com ${fmtN(o.corrN)}% → alfinete a ${fM(10000 * (1 - o.corrN / 100))} do site.</span></div>` : ''}
    ${x.length ? `${R.ok ? '<div class="map" id="sMapa" style="height:300px" role="img" aria-label="Mapa da rota com os eventos do OTDR"></div><span class="muted small">Alfinete vermelho: ponto com a correção. Linha laranja: faixa de busca até a distância sem correção.</span>' : ''}
      <div class="list">${x.map(p => `<div class="item" style="cursor:default"><span class="badge" style="width:auto;padding:0 8px;border-radius:6px">${p.rot}</span><span class="tx"><b style="white-space:normal">${esc(p.e.tipo || 'Evento')}${p.e.perda ? ' · ' + esc(p.e.perda) + ' dB' : ''} · ${esc(p.f.origem || '')} › ${esc(p.f.destino || '')}</b><span style="white-space:normal">OTDR ${fM(p.bruta)}${p.bob ? ' − bobina ' + fM(p.bob) : ''} = ${fM(p.liq)} · com ${fmtN(o.corrN)}%: <b>${fM(p.ef)} do site</b>${p.pos ? ` · ${p.pos.lat.toFixed(5)}, ${p.pos.lon.toFixed(5)}` : ''}${p.fora ? ' · <b style="color:var(--bad)">além do fim da rota</b>' : ''}</span>${(p.cx || []).length ? `<span class="small" style="white-space:normal;color:var(--bad);font-weight:700">⚠ Possível ponto crítico: caixa ${esc(cxTxt(p.cx))}. Verifique essa caixa.</span>` : R.ok ? `<span class="small muted">Nenhuma caixa cadastrada a até ${CX_RAIO} m do alfinete.</span>` : ''}</span></div>`).join('')}</div>
      ${R.ok ? `<button type="button" class="btn pri block" id="bSiteKmz">${ICON.pin}Baixar KMZ da rota com os alfinetes</button>` : ''}` : '<p class="muted" style="margin:0">Nenhum evento do OTDR informado. Na etapa Fibras, use "Evento do OTDR com problema" nas fibras que tiveram falha.</p>'}</section>`;
}
const fmtN = n => String(+(+n).toFixed(1)).replace('.', ',');
function mapaSite(i, el) {
  if (!window.L || !el) return; const R = calcPins(i); if (!R.ok) return;
  const m = L.map(el); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
  const all = []; R.rt.kml.linhas.forEach(l => { L.polyline(l, { color: '#6b7785', weight: 4, dashArray: '8 8' }).addTo(m); all.push(...l); });
  if (R.orig) L.marker([R.orig.lat, R.orig.lon], { icon: L.divIcon({ className: '', html: '<div class="mk" style="background:#0572ce">S</div>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).bindPopup('Site ' + esc(i.site.sigla || '')).addTo(m);
  R.lista.forEach(x => { L.polyline(x.faixa.map(p => [p.lat, p.lon]), { color: '#e8590c', weight: 7, opacity: .7 }).addTo(m); L.marker([x.pos.lat, x.pos.lon], { icon: L.divIcon({ className: '', html: `<div class="mk" style="background:#c2311d;font-size:10px;width:auto;padding:0 5px">${x.rot}</div>`, iconSize: [40, 24], iconAnchor: [20, 12] }) }).bindPopup(`${x.rot} · ${esc(x.e.tipo || 'Evento')}<br>${fM(x.ef)} do site`).addTo(m); (x.cx || []).forEach(c => L.marker([c.lat, c.lon], { icon: L.divIcon({ className: '', html: '<div class="mk" style="background:#e8590c;border-radius:4px;font-size:10px;width:auto;padding:0 4px">CX</div>', iconSize: [26, 22], iconAnchor: [13, 11] }) }).bindPopup(`⚠ Possível ponto crítico<br><b>${esc(c.tag)}</b> a ${fDist(c.dist)} de ${x.rot}`).addTo(m)); });
  const pts = [...R.lista.map(x => [x.pos.lat, x.pos.lon]), ...(R.orig ? [[R.orig.lat, R.orig.lon]] : [])];
  try { m.fitBounds(L.latLngBounds(pts.length > 1 ? pts : all), { padding: [24, 24] }); } catch (e) { m.setView([-22.6, -45.6], 8); }
  S.mapSite = m;
}
async function importaKmzSite(f, i) {
  try { toast('Lendo KMZ da rota…'); const txt = await lerKml(f); const k = parseKml(txt); if (!k.linhas.length) { toast('O arquivo não tem o traçado (linha) da rota.'); return; }
    const dn = kmlDoc(txt).getElementsByTagNameNS('*', 'name')[0]; const nome = (dn ? dn.textContent : f.name.replace(/\.km[lz]$/i, '')).trim();
    const ini = k.linhas[0][0], fimL = k.linhas[(k.nTronco || k.linhas.length) - 1], fim = fimL[fimL.length - 1];
    const rt = { id: uid(), _autor: (Nuvem.user && Nuvem.user.id) || '', atualizado: Date.now(), codigo: codigoRota(nome), nome, padrao: 'ABNT', criado: Date.now(), extensao: String(+k.km.toFixed(1)).replace('.', ','), kml: { ...k, arquivo: f.name, em: Date.now() } };
    const pa = pontaDoCabo(k.pontos, { lat: ini[0], lon: ini[1] }), pb = pontaDoCabo(k.pontos, { lat: fim[0], lon: fim[1] }); { const sg = siglasDoNome(nome); if (sg) { const inv = (pa && siglaNome(pa.nome) === sg[1]) || (pb && siglaNome(pb.nome) === sg[0]); rt.siglaA = inv ? sg[1] : sg[0]; rt.siglaB = inv ? sg[0] : sg[1]; } }
    if (pa && pa.nome) rt.pontaA = pa.nome; if (pb && pb.nome && pb !== pa) rt.pontaB = pb.nome;
    await DB.put('rotas', rt); await carregaRotas(); i.info.rotaId = rt.id; i.info.rota = rotaLb(rt); i.site.otdr = { ...(i.site.otdr || {}), origem: '' }; saveInsp(true);
    toast(`Rota ${rt.codigo} importada (${fKm(k.km)}).`, 4000); render();
  } catch (e) { toast('Não foi possível ler: ' + (e.message || e), 6000); }
}
function kmlSite(i) {
  const R = calcPins(i), pins = pinsDe(i); if (!pins.length && !R.ok) return '';
  const st = `<Style id="evotdr"><IconStyle><scale>1.2</scale><Icon><href>https://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href></Icon><hotSpot x="20" y="2" xunits="pixels" yunits="pixels"/></IconStyle><LabelStyle><scale>0.9</scale></LabelStyle></Style><Style id="faixa"><LineStyle><color>c80c59e8</color><width>8</width></LineStyle></Style><Style id="cxcrit"><IconStyle><scale>1.1</scale><Icon><href>https://maps.google.com/mapfiles/kml/paddle/orange-square.png</href></Icon></IconStyle></Style><Style id="siteotdr"><IconStyle><scale>1.2</scale><Icon><href>https://maps.google.com/mapfiles/kml/paddle/S.png</href></Icon></IconStyle></Style>`;
  const c = (i.site.otdrRes || {}); const corr = R.ok ? R.o.corrN : c.corr; const orig = R.ok ? R.orig : c.orig;
  const tr = R.ok ? `<Folder><name>Traçado da rota ${xe(R.rt.codigo)}</name>${R.rt.kml.linhas.map((l, k) => `<Placemark><name>Traçado ${k + 1}</name><styleUrl>#tracado</styleUrl><LineString><tessellate>1</tessellate><coordinates>${l.map(([la, lo]) => `${lo},${la},0`).join(' ')}</coordinates></LineString></Placemark>`).join('')}</Folder>` : '';
  const site = orig ? `<Placemark><name>Site ${xe(i.site.sigla || '')}</name><styleUrl>#siteotdr</styleUrl><description>${xe(`OTDR disparado de: ${origemTxt(i, R.rt)} · correção ${fmtN(corr)}%`)}</description><Point><coordinates>${orig.lon},${orig.lat},0</coordinates></Point></Placemark>` : '';
  const ev = pins.map(p => { const d = `<![CDATA[<table border="1" cellpadding="3" style="border-collapse:collapse;font-family:Arial;font-size:12px"><tr><td><b>Fibra</b></td><td>${xe((p.f.origem || '') + ' > ' + (p.f.destino || ''))}</td></tr><tr><td><b>Evento</b></td><td>${xe(p.e.tipo || '—')}${p.e.perda ? ' · ' + xe(p.e.perda) + ' dB' : ''}</td></tr><tr><td><b>Distância no OTDR</b></td><td>${xe(fM(p.bruta))}</td></tr><tr><td><b>Bobina de lançamento</b></td><td>${xe(p.bob ? fM(p.bob) : 'não usada')}</td></tr><tr><td><b>Distância na fibra</b></td><td>${xe(fM(p.liq))}</td></tr><tr><td><b>Com correção de ${xe(fmtN(corr))}%</b></td><td><b>${xe(fM(p.ef))} do site</b></td></tr>${p.e.obs ? `<tr><td><b>Obs.</b></td><td>${xe(p.e.obs)}</td></tr>` : ''}${(p.cx || []).length ? `<tr><td><b>Possível ponto crítico</b></td><td><b>Caixa ${xe(cxTxt(p.cx))}</b></td></tr>` : ''}<tr><td><b>Ticket</b></td><td>${xe(i.ticketAtv || '')}</td></tr></table>]]>`;
    return `<Placemark><name>${xe(p.rot)} · ${xe(fM(p.ef))}</name><styleUrl>#evotdr</styleUrl><description>${d}</description><Point><coordinates>${p.lon},${p.lat},0</coordinates></Point></Placemark>${p.faixa && p.faixa.length > 1 ? `<Placemark><name>${xe(p.rot)} · faixa de busca (0 a ${xe(fmtN(corr))}%)</name><styleUrl>#faixa</styleUrl><LineString><tessellate>1</tessellate><coordinates>${p.faixa.map(([la, lo]) => `${lo},${la},0`).join(' ')}</coordinates></LineString></Placemark>` : ''}${(p.cx || []).map(c => `<Placemark><name>⚠ ${xe(c.tag)} · ponto crítico (${xe(p.rot)})</name><styleUrl>#cxcrit</styleUrl><description>${xe(`Possível ponto crítico: caixa a ${fDist(c.dist)} do alfinete ${p.rot}.`)}</description><Point><coordinates>${c.lon},${c.lat},0</coordinates></Point></Placemark>`).join('')}`; }).join('');
  return `${st}${tr}<Folder><name>Eventos do OTDR · ${xe(siteTitulo(i))}</name>${site}${ev}</Folder>`;
}
async function kmzSite(i) { try { const c = kmlSite(i); if (!c) { toast('Escolha a rota (KMZ) e informe os eventos do OTDR.'); return null; } return montaKmz(`OTDR_${i.ticketAtv || 'conjunta'}_${i.site.sigla || 'site'}`, c, []); } catch (e) { console.error(e); toast('Erro ao gerar KMZ: ' + e.message, 6000); return null; } }
async function pdfOtdr(doc, y, sn, i) {
  const pins = pinsDe(i); if (!pins.length) return { y, sn };
  const R = calcPins(i), c = i.site.otdrRes || {}; const corr = R.ok ? R.o.corrN : c.corr;
  y = pdfSec(doc, y, ++sn, 'Eventos do OTDR no traçado');
  y = kv(doc, y, [['Rota (KMZ)', R.ok ? rotaLb(R.rt) : c.rota], ['OTDR disparado de', origemTxt(i, R.rt)], ['Correção aplicada', fmtN(corr) + '%']]);
  doc.autoTable({ ...TB, startY: y, head: [['Evento', 'Fibra', 'Tipo / perda', 'OTDR', 'Bobina', 'Na fibra', 'Corrigida', 'Coordenadas']], body: pins.map(p => [p.rot, `${p.f.origem || ''} > ${p.f.destino || ''}`, `${p.e.tipo || '—'}${p.e.perda ? ' · ' + p.e.perda + ' dB' : ''}`, fM(p.bruta), p.bob ? fM(p.bob) : '—', fM(p.liq), fM(p.ef) + (p.fora ? ' (além do fim)' : ''), `${(+p.lat).toFixed(5)}, ${(+p.lon).toFixed(5)}`]), styles: { fontSize: 7.5 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 14 }, 6: { fontStyle: 'bold' } } });
  y = doc.lastAutoTable.finalY + 5;
  const crit = pins.filter(p => (p.cx || []).length);
  if (crit.length) { if (y > 250) { doc.addPage(); y = 16; } doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(180, 35, 27); doc.text(`Possíveis pontos críticos (caixa a até ${CX_RAIO} m do alfinete)`, 12, y + 1); y += 3; doc.setTextColor(20);
    doc.autoTable({ ...TB, startY: y, head: [['Evento', 'Caixa de referência', 'Distância', 'Coordenadas da caixa', 'Origem']], body: crit.flatMap(p => p.cx.map(c => [p.rot, c.tag, fDist(c.dist), `${(+c.lat).toFixed(5)}, ${(+c.lon).toFixed(5)}`, c.origem === 'KMZ' ? 'Ponto do KMZ' : 'Caixa cadastrada'])), styles: { fontSize: 8 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 16 }, 1: { fontStyle: 'bold', textColor: [180, 35, 27] } } }); y = doc.lastAutoTable.finalY + 5; }
  try { const lines = R.ok ? R.rt.kml.linhas.map(l => ({ pts: l.map(([lat, lon]) => ({ lat, lon })), color: '#9aa5ad' })) : []; pins.forEach(p => p.faixa && p.faixa.length > 1 && lines.push({ pts: p.faixa.map(([lat, lon]) => ({ lat, lon })), color: '#e8590c' }));
    const orig = R.ok ? R.orig : c.orig; const img = await mapaImg(lines, [...(orig ? [{ lat: orig.lat, lon: orig.lon, label: 'S', color: '#0572ce' }] : []), ...pins.map((p, n) => ({ lat: +p.lat, lon: +p.lon, label: String(n + 1), color: '#c2311d' })), ...crit.flatMap(p => p.cx.map(c => ({ lat: +c.lat, lon: +c.lon, label: 'C', color: '#e8590c' })))], 1400, 700);
    if (img) { if (y > 190) { doc.addPage(); y = 16; } doc.addImage(img, 'JPEG', 12, y, 186, 93); y += 95; doc.setFontSize(7.5); doc.setTextColor(90); doc.setFont('helvetica', 'normal'); doc.text(`S = site · números = eventos na ordem da tabela · C = caixa (possível ponto crítico) · laranja = faixa de busca (0 a ${fmtN(corr)}% de correção)`, 12, y + 1); y += 7; } } catch (e) { console.warn('mapa OTDR', e); }
  return { y, sn };
}
