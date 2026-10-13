// Técnico Plus - Multivale · relatório mensal, centro de custo, calendário, SLA e histórico de ativos
// Os arquivos app-*.js carregam em ordem (ver index.html) e compartilham o mesmo escopo global.
'use strict';
/* ============================ relatório mensal consolidado das preventivas ============================ */
// Tudo o que a preventiva fez no mês, separado pelo dono do backbone (Multivale / Master / outros parceiros):
// rotas percorridas, rede no trecho (estrutura nos postes, poda, troca de poste, travessias…), caixas de emenda,
// vistorias e acompanhamentos — só o executado — e o registro fotográfico.
const ehPrev = i => !!i && !isCorr(i) && !isImpl(i) && !isVist(i);
const donoNome = (d, p) => d === 'parceiro' ? (/master/i.test(String(p || '')) ? 'Master' : String(p || '').trim() || 'Parceiro') : 'Multivale';
function donoPrev(i) { return donoNome((i.info || {}).dono, (i.info || {}).parceiro); }
function donosRonda(r) { return r.dono === 'conjunta' ? ['Multivale', 'Master'] : [donoNome(r.dono, r.parceiro)]; }
function donosFotoRede(f, r) { return f.dono ? [f.dono === 'master' ? 'Master' : 'Multivale'] : r ? donosRonda(r) : ['Multivale']; }
const ultimoDiaMes = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate();
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesTxt = ym => { const [y, m] = ym.split('-'); return `${MESES[+m - 1]}/${y}`; };
const ncDe = i => CHECK.filter(([k]) => (i.check || {})[k] === 'NC').length;
// junta os dados do mês de um dono
function dadosPrevMes(ym, dono) {
  const [y, m] = ym.split('-').map(Number); const a = +new Date(y, m - 1, 1), z = +new Date(y, m, 1) - 1;
  const noMes = t => t >= a && t <= z;
  const R = [...DB.mem.rondas.values()].filter(r => (r.tipo === 'preventiva' || r.tipo === 'vistoria' || !r.tipo) && noMes(r.inicio) && donosRonda(r).includes(dono)).sort((p, q) => p.inicio - q.inicio);
  const ins = [...DB.mem.inspecoes.values()].filter(i => i.status === 'concluida' && noMes(i.chegada) && donoPrev(i) === dono);
  const L = ins.filter(ehPrev).sort((p, q) => p.chegada - q.chegada);
  const V = ins.filter(isVist).sort((p, q) => p.chegada - q.chegada);
  const rondaDe = id => DB.mem.rondas.get(id);
  const F = [...DB.mem.fotos.values()].filter(f => { const r = rondaDe(f.rondaId); return r && noMes(f.ts || r.inicio) && donosFotoRede(f, r).includes(dono); }).sort((p, q) => (p.ts || 0) - (q.ts || 0));
  return { R, L, V, F, km: R.reduce((s, r) => s + (totais(r).t.km || 0), 0) };
}
function donosDoMes(ym) {
  const [y, m] = ym.split('-').map(Number); const a = +new Date(y, m - 1, 1), z = +new Date(y, m, 1) - 1; const set = new Set(['Multivale', 'Master']);
  DB.mem.rondas.forEach(r => { if (r.inicio >= a && r.inicio <= z && !isCorr(r) && !isImpl(r)) donosRonda(r).forEach(d => set.add(d)); });
  DB.mem.inspecoes.forEach(i => { if (i.chegada >= a && i.chegada <= z && (ehPrev(i) || isVist(i))) set.add(donoPrev(i)); });
  return [...set];
}
function viewAdmPrev() {
  const P = S.prevMes = S.prevMes || { mes: isoDate(Date.now()).slice(0, 7), dono: 'Multivale' };
  return `<section class="card"><h2>Relatório mensal das preventivas</h2>
    <p class="muted small" style="margin:0">A preventiva é feita dentro do mês e o relatório sai no último dia. Ele junta, por dono do backbone, tudo o que foi executado: rotas percorridas, rede no trecho (estrutura nos postes, poda de árvore, troca de poste, travessias, irregularidades), caixas de emenda, vistorias e acompanhamentos, com o registro fotográfico.${ultimoDiaMes() ? ' <b style="color:var(--accent)">Hoje é o último dia do mês.</b>' : ''}</p>
    <div class="grid2"><div class="field"><label class="lb" for="pmMes">Mês</label><input type="month" id="pmMes" value="${P.mes}"></div>
    <div class="field"><span class="lb">Backbone</span><div class="chips" id="pmDonos" role="group" aria-label="Backbone"></div></div></div></section>
    <div id="pmBox"><section class="card"><p class="empty">Carregando o mês…</p></section></div>`;
}
async function afterAdmPrev() {
  const P = S.prevMes; const [y, m] = P.mes.split('-').map(Number);
  const de = isoDate(+new Date(y, m - 1, 1)), ate = isoDate(+new Date(y, m, 0));
  $('#pmMes').onchange = e => { if (e.target.value) { P.mes = e.target.value; render(); } };
  try { if (S.prevCarregado !== P.mes) { await Nuvem.carregarAdmin(de, ate); S.prevCarregado = P.mes; } } catch (e) { $('#pmBox').innerHTML = `<section class="card"><div class="warnbox">Não foi possível carregar: ${esc(e.message || e)}</div></section>`; return; }
  const donos = donosDoMes(P.mes);
  $('#pmDonos').innerHTML = donos.map(d => { const x = dadosPrevMes(P.mes, d); return `<button type="button" role="radio" data-pmdono="${esc(d)}" aria-checked="${P.dono === d}">${esc(d)} (${x.R.length + x.L.length + x.V.length})</button>`; }).join('');
  $$('[data-pmdono]').forEach(b => b.onclick = () => { P.dono = b.dataset.pmdono; render(); });
  const D = dadosPrevMes(P.mes, P.dono); const { R, L, V, F } = D;
  const porCat = {}; F.forEach(f => { porCat[f.cat] = (porCat[f.cat] || 0) + 1; });
  const nc = L.reduce((s, i) => s + ncDe(i), 0) + F.filter(f => /irregular/i.test(f.cat)).length;
  const vazio = !R.length && !L.length && !V.length;
  $('#pmBox').innerHTML = `<section class="card"><div class="row" style="justify-content:space-between"><h2>Backbone ${esc(P.dono)} · ${esc(mesTxt(P.mes))}</h2><button type="button" class="btn pri" id="bPmPdf" ${vazio ? 'disabled' : ''}>Gerar relatório consolidado (PDF)</button></div>
    <div class="stats"><div class="stat"><b>${R.length}</b><span>Rotas percorridas</span></div><div class="stat"><b>${fKm(D.km)}</b><span>Km de preventiva</span></div><div class="stat"><b>${F.length}</b><span>Fotos da rede</span></div><div class="stat"><b>${L.length}</b><span>Caixas de emenda</span></div><div class="stat"><b>${V.length}</b><span>Vistorias / acompanhamentos</span></div><div class="stat"><b>${nc}</b><span>Irregularidades</span></div></div>
    ${F.length ? `<h3>Rede no trecho</h3><div class="chips" style="flex-wrap:wrap">${Object.entries(porCat).map(([c, n]) => `<span class="pill">${esc(c)}: <b>${n}</b></span>`).join('')}</div>` : ''}
    <h3>Rotas percorridas</h3><div class="tw"><table class="t"><thead><tr><th>Data</th><th>Técnico</th><th>Rota</th><th>Km</th><th>Caixas</th><th>Fotos da rede</th></tr></thead><tbody>
    ${R.map(r => `<tr><td>${fDH(r.inicio)}</td><td>${esc(r.tecnico || '')}</td><td>${esc(rotaLb(rotaById(r.rotaId)) || '—')}${r.dono === 'conjunta' ? ' <span class="pill">conjunta</span>' : ''}</td><td>${fKm(totais(r).t.km)}</td><td>${L.filter(i => i.rondaId === r.id).length}</td><td>${F.filter(f => f.rondaId === r.id).length}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhuma rota de preventiva no mês.</td></tr>'}</tbody></table></div>
    ${L.length ? `<h3>Caixas de emenda</h3><div class="tw"><table class="t"><thead><tr><th>Data</th><th>TAG</th><th>Local</th><th>Técnico</th><th>Checklist</th><th>Fotos</th></tr></thead><tbody>${L.map(i => `<tr><td>${fDH(i.chegada)}</td><td><b>${esc(i.info.tag || '—')}</b></td><td>${esc([i.info.endereco, i.info.cidade].filter(Boolean).join(', ') || '—')}</td><td>${esc(i.info.tecnico || '')}</td><td>${CHECK.filter(([k]) => i.check[k] === 'OK').length} OK${ncDe(i) ? ` · <b style="color:var(--bad)">${ncDe(i)} NC</b>` : ''}</td><td>${(i.fotos || []).length}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${V.length ? `<h3>Vistorias e acompanhamentos</h3><div class="list">${V.map(i => `<div class="item" style="cursor:default"><span class="badge" style="width:auto;padding:0 8px;border-radius:6px">${fData(i.chegada).slice(0, 5)}</span><span class="tx"><b>${esc(VIST_TIPOS[(i.vist || {}).tipo] || 'Registro')}</b><span style="white-space:normal">${esc(((i.vist || {}).descricao || '').slice(0, 220))}</span></span></div>`).join('')}</div>` : ''}</section>`;
  $('#bPmPdf') && ($('#bPmPdf').onclick = async () => { const b = $('#bPmPdf'); b.disabled = true; try { const f = await pdfPrevMes(D, P.dono, P.mes, t => { b.textContent = t; }); if (f) baixar(f); } catch (e) { toast('Erro ao gerar: ' + (e.message || e), 7000); } b.disabled = false; b.textContent = 'Gerar relatório consolidado (PDF)'; });
}
// reduz a foto para o PDF não ficar gigante
async function fotoPdf(p) {
  const fb = await fotoBlob(p); if (!fb) return null;
  try { const bmp = await createImageBitmap(fb); const sc = Math.min(1, 1000 / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return { data: c.toDataURL('image/jpeg', 0.72), w: c.width, h: c.height }; }
  catch (e) { return { data: await blobToData(fb), w: p.w || 4, h: p.h || 3 }; }
}
async function pdfPrevMes(D, dono, ym, prog) {
  if (!window.jspdf) { toast('Gerador de PDF não carregou.'); return null; }
  const { R, L, V, F } = D;
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const logo = await logoData();
  const sub = `Backbone ${dono} · ${mesTxt(ym)}`, MES = mesTxt(ym).toUpperCase();
  const cab = t => pdfHeader(doc, logo, t, sub, MES, 'MÊS');
  let y = cab('Relatório mensal de manutenção preventiva'); let sn = 0;
  const novaSe = h => { if (y + h > 280) { doc.addPage(); y = 16; } };
  const [yy, mm] = ym.split('-').map(Number);
  const porCat = {}; F.forEach(f => { porCat[f.cat] = (porCat[f.cat] || 0) + 1; });
  const nc = L.reduce((s, i) => s + ncDe(i), 0) + F.filter(f => /irregular/i.test(f.cat)).length;
  y = pdfSec(doc, y, ++sn, 'Resumo do mês');
  y = kv(doc, y, [['Backbone', dono], ['Período', `01/${pad2(mm)}/${yy} a ${new Date(yy, mm, 0).getDate()}/${pad2(mm)}/${yy}`], ['Rotas percorridas', `${R.length} · ${fKm(D.km)}`], ['Rede no trecho', F.length ? Object.entries(porCat).map(([c, n]) => `${c}: ${n}`).join(' · ') : '—'], ['Caixas de emenda', String(L.length)], ['Vistorias / acompanhamentos', String(V.length)], ['Irregularidades registradas', String(nc)], ['Técnicos', [...new Set([...R.map(r => r.tecnico), ...L.map(i => i.info.tecnico), ...V.map(i => i.info.tecnico)].filter(Boolean))].join(', ') || '—']]);
  if (R.length) {
    novaSe(30); y = pdfSec(doc, y + 2, ++sn, 'Rotas percorridas');
    doc.autoTable({ ...TB, startY: y, head: [['Data', 'Técnico', 'Rota', 'Km', 'Duração', 'Caixas', 'Fotos da rede']], body: R.map(r => { const t = totais(r).t; return [fDH(r.inicio), r.tecnico || '', (rotaLb(rotaById(r.rotaId)) || '—') + (r.dono === 'conjunta' ? ' (conjunta Multivale + Master)' : ''), fKm(t.km), fDur(t.dur), String(L.filter(i => i.rondaId === r.id).length), String(F.filter(f => f.rondaId === r.id).length)]; }) });
    y = doc.lastAutoTable.finalY + 6;
  }
  if (F.length) {
    novaSe(30); y = pdfSec(doc, y, ++sn, 'Rede no trecho (estrutura, poda, postes, travessias)');
    doc.autoTable({ ...TB, startY: y, head: [['Data', 'Serviço / registro', 'Descrição', 'Local']], body: F.map(f => [f.ts ? fDH(f.ts) : '—', f.cat || '', f.desc || '', f.end || (f.lat != null ? `${(+f.lat).toFixed(5)}, ${(+f.lon).toFixed(5)}` : '—')]), columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 40, fontStyle: 'bold' } }, didParseCell: d => { if (d.section === 'body' && d.column.index === 1 && /irregular/i.test(String(d.cell.raw))) d.cell.styles.textColor = [160, 30, 20]; } });
    y = doc.lastAutoTable.finalY + 6;
  }
  if (L.length) {
    novaSe(30); y = pdfSec(doc, y, ++sn, 'Caixas de emenda');
    const ex = L.map(i => [`${i.info.tag || '—'}\n${fDH(i.chegada)}`, [i.info.endereco, i.info.cidade].filter(Boolean).join(', ') || (i.loc ? `${i.loc.lat.toFixed(5)}, ${i.loc.lon.toFixed(5)}` : '—'), CHECK.filter(([k]) => i.check[k] === 'OK').map(([, lb]) => lb).join('; ') || '—', CHECK.filter(([k]) => i.check[k] === 'NC').map(([k, lb]) => `${lb}${(i.checkObs || {})[k] ? ': ' + i.checkObs[k] : ''}`).join('\n') || 'Nenhuma', [...(i.lpu || []).filter(x => +x.q > 0).map(x => `${x.c} ${x.d} (${fQtd(x.q)} ${x.u || ''})`), i.obs || ''].filter(Boolean).join('\n') || '—']);
    doc.autoTable({ ...TB, startY: y, head: [['TAG / data', 'Local', 'Verificado e conforme', 'Irregularidades', 'Serviços / observações']], body: ex, columnStyles: { 0: { cellWidth: 26, fontStyle: 'bold' }, 3: { textColor: [160, 30, 20] } } });
    y = doc.lastAutoTable.finalY + 6;
  }
  if (V.length) {
    novaSe(30); y = pdfSec(doc, y, ++sn, 'Vistorias e acompanhamentos');
    doc.autoTable({ ...TB, startY: y, head: [['Data', 'Tipo', 'Registro', 'Local']], body: V.map(i => [fDH(i.chegada), VIST_TIPOS[(i.vist || {}).tipo] || 'Registro', (i.vist || {}).descricao || '', [i.info.endereco, i.info.cidade].filter(Boolean).join(', ') || '—']), columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 34, fontStyle: 'bold' } } });
    y = doc.lastAutoTable.finalY + 6;
  }
  // registro fotográfico: rede por tipo de serviço, depois caixas e vistorias
  const grupos = [];
  Object.keys(porCat).forEach(c => grupos.push({ t: `Rede no trecho · ${c}`, fs: F.filter(f => f.cat === c).map(f => ({ ...f, leg: f.desc || '' })) }));
  L.forEach(i => (i.fotos || []).length && grupos.push({ t: `Caixa ${i.info.tag || 'sem TAG'} · ${fDH(i.chegada)} · ${[i.info.endereco, i.info.cidade].filter(Boolean).join(', ')}`, fs: i.fotos.map(p => ({ ...p, leg: `${p.cat || ''}${p.desc ? ': ' + p.desc : ''}` })) }));
  V.forEach(i => (i.fotos || []).length && grupos.push({ t: `${VIST_TIPOS[(i.vist || {}).tipo] || 'Vistoria'} · ${fDH(i.chegada)}`, fs: i.fotos.map(p => ({ ...p, leg: `${p.cat || ''}${p.desc ? ': ' + p.desc : ''}` })) }));
  const tot = grupos.reduce((s, g) => s + g.fs.length, 0); let feitas = 0;
  if (tot) {
    doc.addPage(); y = cab('Registro fotográfico');
    const bw = 90, bh = 66, gx = 6;
    for (const g of grupos) {
      if (y > 206) { doc.addPage(); y = cab('Registro fotográfico'); }
      doc.setFillColor(238, 242, 245); doc.rect(12, y - 4, 186, 7, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(20); doc.text(g.t.slice(0, 115), 14, y + 1); y += 6;
      for (let k = 0; k < g.fs.length; k++) {
        const col = k % 2; if (col === 0 && y + bh + 10 > 285) { doc.addPage(); y = cab('Registro fotográfico'); }
        const p = g.fs[k]; prog && prog(`Fotos ${++feitas} de ${tot}…`); const im = await fotoPdf(p); const x0 = 12 + col * (bw + gx);
        if (im) { let w = bw, h = w * im.h / im.w; if (h > bh) { h = bh; w = h * im.w / im.h; } doc.addImage(im.data, 'JPEG', x0 + (bw - w) / 2, y, w, h); }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(20); doc.text(String(p.leg || p.cat || 'Foto').slice(0, 62), x0, y + bh + 3.5);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(90); doc.text(`${p.ts ? fDH(p.ts) : ''}${p.lat != null ? ` · ${(+p.lat).toFixed(5)}, ${(+p.lon).toFixed(5)}` : ''}`, x0, y + bh + 7);
        if (col === 1 || k === g.fs.length - 1) y += bh + 11;
      }
      y += 2;
    }
  }
  pdfFooter(doc, `Técnico Plus - Multivale · preventiva ${dono} · ${mesTxt(ym)} · gerado em ${fDH(Date.now())}`);
  return new File([doc.output('blob')], `Preventiva_${dono.replace(/\W+/g, '_')}_${ym}.pdf`, { type: 'application/pdf' });
}

/* ============================ centro de custo por projeto ============================ */
// Receita: produção das O.S. vinculadas + valor fixo mensal + lançamentos (ex.: contratos de venda de fibra).
// Custo: mão de obra (salário, encargos, VR, horas extras) + deslocamento (combustível) + veículo (locação) + custos lançados.
// Funcionário com alocação manual entra pelo % informado; sem alocação, é rateado pelo tempo das O.S. de cada projeto.
const PJ_VINC = { claro: 'O.S. da Claro (corretivas)', multivale: 'Backbone Multivale', master: 'Backbone Master', outro: 'Sem O.S. (só lançamentos)' };
const PJ_MOD = { acionamento: 'Por acionamento (produção das O.S.)', fixo: 'Valor fixo mensal', venda_fibra: 'Venda de fibras a parceiros', outro: 'Outro' };
const PJ_PADRAO = [
  { nome: 'Manutenção Claro', vinculo: 'claro', modelo: 'acionamento', dia_fechamento: 15, obs: 'Recebemos por acionamento de atividades corretivas (LPU).' },
  { nome: 'Backbone Multivale', vinculo: 'multivale', modelo: 'venda_fibra', dia_fechamento: 31, obs: 'Cabo próprio: a receita vem da venda de fibras para parceiros.' },
  { nome: 'Backbone Master', vinculo: 'master', modelo: 'fixo', dia_fechamento: 31, obs: 'Valor fixo mensal para manter a integridade da rede.' }
];
const diasMes = (y, m) => new Date(y, m + 1, 0).getDate();
// ciclo do projeto que contém a data ref (k = -1 ciclo anterior): do dia seguinte ao fechamento anterior até o dia do fechamento
function cicloProj(p, ref = Date.now(), k = 0) {
  const d = new Date(ref); let y = d.getFullYear(), m = d.getMonth(); const fd = (yy, mm) => { const dt = new Date(yy, mm, 1); return Math.min(+p.dia_fechamento || 31, diasMes(dt.getFullYear(), dt.getMonth())); };
  if (d.getDate() > fd(y, m)) m += 1; m += k;
  const fim = new Date(y, m, fd(y, m)), ini = new Date(y, m - 1, fd(y, m - 1) + 1);
  return [isoDate(+ini + 43200000), isoDate(+fim + 43200000)];
}
const vincOS = i => (claroCorr(i) || String(centroOS(i)).startsWith('claro')) ? 'claro' : donoPrev(i) === 'Master' ? 'master' : 'multivale';
function custoTecJanela(uid, de, ate, cads) {
  const cad = cads.get(uid) || null; const [y, m] = ate.split('-').map(Number); const f = nDias(de, ate) / diasMes(y, m - 1);
  const enc = (+metas().encargos || 0) / 100; const temSal = !!(cad && +cad.salario);
  const X = horasExtras((S.exps || []).filter(e => e.uid === uid), cad, de, ate);
  const R = resumoAbast((S.abast || []).filter(a => a.uid === uid).sort((p, q) => p.ts - q.ts), de, ate);
  const sal = temSal ? X.fixosMes * f : (+metas().custo || 0) / 2 * f;
  return { mo: sal + (temSal ? sal * enc : 0) + (X.vrTot || 0) + (X.variaveis || 0), desl: R.total || 0, veic: (+(cad && cad.locacao_mes) || 0) * f, estimado: !temSal };
}
function osJanela(de, ate) { const a = diaIni(de), z = diaFim(ate); return [...DB.mem.inspecoes.values()].filter(i => !isVist(i) && !i.apoio && (i.chegada || i.criado) >= a && (i.chegada || i.criado) <= z); }
function lancAtivos(L, pid, de, ate) { return L.filter(l => l.projeto_id === pid && (l.recorrente ? l.data <= ate && (!l.ate || l.ate >= de) : l.data >= de && l.data <= ate)); }
// fração do tempo de cada técnico nas O.S. de um vínculo (para quem não tem alocação manual)
function fracaoAuto(uid, pid, os) { const meus = os.filter(i => i._uid === uid); const tot = meus.reduce((s, i) => s + pesoOS(i), 0); return tot ? meus.filter(i => projetoDe(i) === pid).reduce((s, i) => s + pesoOS(i), 0) / tot : 0; }
function calcProjeto(p, k, cads, lancs, manuais) {
  const [de, ate] = cicloProj(p, Date.now(), k); const os = osJanela(de, ate); const osP = os.filter(i => projetoDe(i) === p.id);
  const aloc = new Map((p.alocacao || []).filter(a => +a.pct > 0).map(a => [a.uid, +a.pct / 100]));
  const uids = new Set([...aloc.keys(), ...os.map(i => i._uid).filter(u => u && !manuais.has(u))]);
  const eq = [];
  uids.forEach(uid => {
    const fr = aloc.has(uid) ? aloc.get(uid) : (!manuais.has(uid) ? fracaoAuto(uid, p.id, os) : 0); if (fr <= 0) return;
    const c = custoTecJanela(uid, de, ate, cads); const meus = osP.filter(i => i._uid === uid);
    eq.push({ uid, nome: (S.adm.tecnicos.find(t => t.uid === uid) || {}).nome || '—', fr, manual: aloc.has(uid), mo: c.mo * fr, desl: c.desl * fr, veic: c.veic * fr, estimado: c.estimado, nOS: meus.length, prod: meus.reduce((s, i) => s + valorOS(i), 0) });
  });
  const L = lancAtivos(lancs, p.id, de, ate); const rLanc = L.filter(l => l.tipo === 'receita').reduce((s, l) => s + +l.valor, 0), cLanc = L.filter(l => l.tipo === 'custo').reduce((s, l) => s + +l.valor, 0);
  const prod = osP.reduce((s, i) => s + valorOS(i), 0); const fixo = +p.receita_fixa || 0;
  const mo = eq.reduce((s, e) => s + e.mo, 0), desl = eq.reduce((s, e) => s + e.desl, 0), veic = eq.reduce((s, e) => s + e.veic, 0);
  const receita = prod + fixo + rLanc, custo = mo + desl + veic + cLanc;
  // por equipe (dupla cadastrada nas metas ou o próprio técnico)
  const times = new Map(); eq.forEach(e => { const dp = duplaDe(e.uid); const kk = dp ? 'd:' + dp.nome : 'u:' + e.uid; const t = times.get(kk) || { nome: dp ? dp.nome : e.nome, membros: [], custo: 0, nOS: 0, prod: 0 }; t.membros.push(e.nome); t.custo += e.mo + e.desl + e.veic; t.nOS += e.nOS; t.prod += e.prod; times.set(kk, t); });
  return { p, de, ate, os: osP, eq, times: [...times.values()].sort((a, b) => b.custo - a.custo), L, prod, fixo, rLanc, cLanc, mo, desl, veic, receita, custo, res: receita - custo, proj: (() => { const rec = L.filter(l => l.tipo === 'receita' && l.recorrente).reduce((s2, l) => s2 + +l.valor, 0); const pv = projecao(receita - fixo - rec, de, ate); return pv == null || !(receita - fixo - rec) ? null : pv + fixo + rec; })() };
}
async function projCarrega(k) {
  const P = await Nuvem.projLista(); const ativos = P.filter(p => p.ativo !== false);
  const jan = ativos.map(p => cicloProj(p, Date.now(), k)); const hoje = isoDate(Date.now());
  const de = jan.reduce((a, j) => j[0] < a ? j[0] : a, hoje.slice(0, 8) + '01'), ate = jan.reduce((a, j) => j[1] > a ? j[1] : a, hoje);
  await Nuvem.carregarAdmin(de, ate); S.abast = await Nuvem.abastAdmin(diaIni(de), diaFim(ate)); try { S.cads = await Nuvem.cadLista(); } catch (e) { S.cads = S.cads || []; }
  const lancs = await Nuvem.projLancLista(); let bonus = []; try { bonus = await Nuvem.bonusJanela(isoDate(diaIni(de) - 62 * 86400000), '9999-12-31'); } catch (e) {}
  return { P, lancs, de, ate, bonus };
}
function projResumo(D, k) {
  const cads = new Map((S.cads || []).filter(c => c.uid).map(c => [c.uid, c]));
  const ativos = D.P.filter(p => p.ativo !== false); const manuais = new Set(ativos.flatMap(p => (p.alocacao || []).filter(a => +a.pct > 0).map(a => a.uid)));
  const C = ativos.map(p => calcProjeto(p, k, cads, D.lancs, manuais));
  const T = C.reduce((a, c) => ({ receita: a.receita + c.receita, custo: a.custo + c.custo, mo: a.mo + c.mo, desl: a.desl + c.desl, veic: a.veic + c.veic, outros: a.outros + c.cLanc }), { receita: 0, custo: 0, mo: 0, desl: 0, veic: 0, outros: 0 });
  // custo da operação que não caiu em nenhum projeto (mês civil vigente)
  const hoje = new Date(); const de = isoDate(+new Date(hoje.getFullYear(), hoje.getMonth() + k, 1) + 43200000), ate = isoDate(+new Date(hoje.getFullYear(), hoje.getMonth() + k + 1, 0) + 43200000);
  const os = osJanela(de, ate); const semProj = [];
  (S.adm.tecnicos || []).forEach(t => { const c = custoTecJanela(t.uid, de, ate, cads); const tot = c.mo + c.desl + c.veic; let fr = 0;
    if (manuais.has(t.uid)) fr = ativos.reduce((s, p) => s + (+((p.alocacao || []).find(a => a.uid === t.uid) || {}).pct || 0) / 100, 0);
    else fr = ativos.reduce((s, p) => s + fracaoAuto(t.uid, p.id, os), 0);
    const resto = tot * Math.max(0, 1 - fr); if (resto > 0.5 && (cads.get(t.uid) || os.some(i => i._uid === t.uid))) semProj.push({ nome: t.nome, valor: resto, fr }); });
  return { C, T: { ...T, res: T.receita - T.custo }, semProj, mesCivil: [de, ate] };
}
function viewAdmProj() {
  return `<section class="card"><div class="row" style="justify-content:space-between"><h2>Centro de custo por projeto</h2><span class="row" style="gap:8px"><button type="button" class="btn" id="bPjNovo">${ICON.plus}Novo projeto</button><button type="button" class="btn pri" id="bPjPdf">Relatório gerencial (PDF)</button></span></div>
    <div class="chips" role="group" aria-label="Ciclo">${[[0, 'Ciclo atual'], [-1, 'Ciclo anterior'], [-2, 'Dois ciclos atrás']].map(([k, l]) => `<button type="button" role="radio" data-pjk="${k}" aria-checked="${(S.pjK || 0) === k}">${l}</button>`).join('')}</div>
    <p class="muted small" style="margin:0">Cada projeto fecha no seu dia. Custo = mão de obra (salário${(+metas().encargos || 0) ? ` + ${metas().encargos}% de encargos` : ''}, VR, horas extras) + deslocamento (combustível) + veículo (locação) + custos lançados. Quem não tem alocação manual é rateado pelo tempo das O.S. de cada projeto.</p></section>
    <div id="pjBox"><section class="card"><p class="empty">Carregando…</p></section></div>`;
}
async function afterAdmProj() {
  const k = S.pjK || 0; $$('[data-pjk]').forEach(b => b.onclick = () => { S.pjK = +b.dataset.pjk; S.pjD = null; render(); });
  const box = $('#pjBox');
  try { if (!S.pjD || S.pjD.k !== k) S.pjD = { k, ...(await projCarrega(k)) }; } catch (e) { box.innerHTML = `<section class="card"><div class="warnbox">Não foi possível carregar: ${esc(e.message || e)}. Rode o supabase.sql novo (tabelas projetos e proj_lanc).</div></section>`; return; }
  const D = S.pjD; const R = projResumo(D, k); const tecs = S.adm.tecnicos || [];
  const cor = v => v < 0 ? 'var(--bad)' : 'var(--ok)';
  const recarrega = async () => { S.pjD = null; render(); };
  box.innerHTML = `${!D.P.length ? `<section class="card"><div class="warnbox">Nenhum projeto cadastrado.</div><button type="button" class="btn pri" id="bPjPadrao">Criar os projetos Claro, Backbone Multivale e Backbone Master</button></section>` : ''}
    <section class="card"><h2>Total da operação · ${k === 0 ? 'mês vigente' : 'ciclos anteriores'}</h2>
      <div class="stats"><div class="stat"><b>${fBRL(R.T.receita)}</b><span>Receita</span></div><div class="stat"><b>${fBRL(R.T.custo)}</b><span>Custo</span></div><div class="stat"><b style="color:${cor(R.T.res)}">${fBRL(R.T.res)}</b><span>Resultado · ${pct(R.T.res, R.T.receita)}</span></div><div class="stat"><b>${fBRL(R.T.mo)}</b><span>Mão de obra</span></div><div class="stat"><b>${fBRL(R.T.desl)}</b><span>Deslocamento</span></div><div class="stat"><b>${fBRL(R.T.veic)}</b><span>Veículos</span></div></div>
      <div class="tw"><table class="t"><thead><tr><th>Projeto</th><th>Ciclo</th><th class="r">Receita</th><th class="r">Custo</th><th class="r">Resultado</th><th class="r">Margem</th></tr></thead><tbody>${R.C.map(c => `<tr><td><b>${esc(c.p.nome)}</b></td><td class="small">${fDM(c.de)} a ${fDM(c.ate)}</td><td class="r">${fBRL(c.receita)}</td><td class="r">${fBRL(c.custo)}</td><td class="r" style="color:${cor(c.res)};font-weight:700">${fBRL(c.res)}</td><td class="r">${pct(c.res, c.receita)}</td></tr>`).join('')}</tbody></table></div>
      ${R.semProj.length ? `<div class="warnbox small"><b>Custo sem projeto em ${fDM(R.mesCivil[0])} a ${fDM(R.mesCivil[1])}: ${fBRL(R.semProj.reduce((s, x) => s + x.valor, 0))}.</b> ${R.semProj.map(x => `${esc(x.nome)} (${fBRL(x.valor)})`).join(' · ')}. Aloque esses funcionários num projeto para o custo entrar na conta.</div>` : ''}</section>
    ${R.C.map(c => { const p = c.p; return `<section class="card" data-pjcard="${p.id}"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h2 style="margin:0">${esc(p.nome)}</h2><span class="muted small">${esc(PJ_MOD[p.modelo] || '')} · ${esc(PJ_VINC[p.vinculo] || '')} · fecha dia ${p.dia_fechamento} · ciclo ${fDM(c.de)} a ${fDM(c.ate)}</span></div><button type="button" class="lnk" data-pjedit="${p.id}">Editar projeto</button></div>
      <div class="stats"><div class="stat"><b>${fBRL(c.receita)}</b><span>Receita${c.proj ? ` · projeção ${fBRL(c.proj)}` : ''}</span></div><div class="stat"><b>${fBRL(c.custo)}</b><span>Custo</span></div><div class="stat"><b style="color:${cor(c.res)}">${fBRL(c.res)}</b><span>Resultado · ${pct(c.res, c.receita)}</span></div><div class="stat"><b>${c.os.length}</b><span>O.S. no ciclo</span></div></div>
      <div class="tw"><table class="t"><tbody>
        <tr><td>Produção das O.S. (LPU)</td><td class="r">${fBRL(c.prod)}</td><td>Mão de obra</td><td class="r">${fBRL(c.mo)}</td></tr>
        <tr><td>Valor fixo mensal</td><td class="r">${fBRL(c.fixo)}</td><td>Deslocamento (combustível)</td><td class="r">${fBRL(c.desl)}</td></tr>
        <tr><td>Receitas lançadas</td><td class="r">${fBRL(c.rLanc)}</td><td>Veículo (locação)</td><td class="r">${fBRL(c.veic)}</td></tr>
        <tr><td></td><td></td><td>Custos lançados</td><td class="r">${fBRL(c.cLanc)}</td></tr></tbody></table></div>
      <h3>Por equipe</h3><div class="tw"><table class="t"><thead><tr><th>Equipe</th><th class="r">Custo no projeto</th><th class="r">O.S.</th><th class="r">Produção</th><th class="r">Produção − custo</th></tr></thead><tbody>${c.times.map(t => `<tr><td><b>${esc(t.nome)}</b>${t.membros.length > 1 || t.membros[0] !== t.nome ? `<br><span class="small muted">${esc(t.membros.join(' + '))}</span>` : ''}</td><td class="r">${fBRL(t.custo)}</td><td class="r">${t.nOS}</td><td class="r">${fBRL(t.prod)}</td><td class="r" style="color:${cor(t.prod - t.custo)}">${fBRL(t.prod - t.custo)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Ninguém alocado e nenhuma O.S. no ciclo.</td></tr>'}</tbody></table></div>
      ${c.eq.some(e => e.estimado) ? '<p class="muted small" style="margin:0">Alguém sem salário cadastrado no RH: usado o custo da meta (estimado).</p>' : ''}
      <details><summary class="small" style="cursor:pointer;min-height:40px;display:flex;align-items:center;color:var(--accent);font-weight:600">Lançamentos (${c.L.length}) · nova receita ou custo</summary>
        <div class="list">${c.L.map(l => `<div class="item" style="cursor:default;align-items:center"><span class="badge" style="width:auto;padding:0 8px;border-radius:6px;background:${l.tipo === 'receita' ? 'var(--ok)' : 'var(--bad)'};color:#fff">${l.tipo === 'receita' ? '+' : '−'}</span><span class="tx"><b>${fBRL(+l.valor)} · ${esc(l.descricao || l.categoria || '')}</b><span>${esc(l.categoria || '')} · ${l.recorrente ? `todo ciclo desde ${fDM(l.data)}${l.ate ? ' até ' + fDM(l.ate) : ''}` : fDM(l.data)}</span></span><button type="button" class="lnk" data-pldel="${l.id}">Excluir</button></div>`).join('') || '<p class="empty">Nenhum lançamento neste ciclo.</p>'}</div>
        <div class="grid2"><div class="field"><label class="lb">Tipo</label><select data-plf="tipo" data-pl="${p.id}"><option value="receita">Receita</option><option value="custo">Custo</option></select></div><div class="field"><label class="lb">Data</label><input type="date" data-plf="data" data-pl="${p.id}" value="${isoDate(Date.now())}"></div>
        <div class="field"><label class="lb">Categoria</label><input type="text" data-plf="categoria" data-pl="${p.id}" list="dlPlCat" placeholder="Ex.: venda de fibra, ferramenta"></div><div class="field"><label class="lb">Valor (R$)</label><input type="text" inputmode="decimal" data-plf="valor" data-pl="${p.id}"></div>
        <div class="field full"><label class="lb">Descrição</label><input type="text" data-plf="descricao" data-pl="${p.id}" placeholder="Ex.: 4 fibras para o parceiro X"></div>
        <label class="row" style="gap:8px;align-items:center"><input type="checkbox" data-plf="recorrente" data-pl="${p.id}"> Repete todo ciclo (contrato)</label></div>
        <button type="button" class="btn" data-pladd="${p.id}">${ICON.plus}Lançar</button></details></section>`; }).join('')}
    <datalist id="dlPlCat">${['Venda de fibra', 'Contrato fixo', 'Ferramentas', 'Material', 'Terceiros', 'Pedágio / estacionamento', 'Hospedagem / alimentação', 'Manutenção de veículo', 'Outros'].map(x => `<option value="${x}">`).join('')}</datalist>
    ${folhaClusterHtml(D, R)}
    <section class="card" id="pjForm" hidden></section>`;
  $('#bPjPadrao') && ($('#bPjPadrao').onclick = async () => { try { await Nuvem.projSalvar(PJ_PADRAO.map(x => ({ ...x, id: 'pj_' + uid(), receita_fixa: null, alocacao: [], ativo: true }))); toast('Projetos criados. Ajuste o valor fixo e as alocações em "Editar projeto".', 6000); recarrega(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } });
  const form = p => {
    const f = $('#pjForm'); const a = new Map((p.alocacao || []).map(x => [x.uid, x.pct]));
    f.hidden = false; f.innerHTML = `<h2>${p.id ? 'Editar projeto' : 'Novo projeto'}</h2><div class="grid2">
      <div class="field full"><label class="lb" for="pjNome">Nome</label><input type="text" id="pjNome" value="${esc(p.nome || '')}"></div>
      <div class="field"><label class="lb" for="pjVinc">O.S. que entram no projeto</label><select id="pjVinc">${Object.entries(PJ_VINC).map(([k2, l]) => `<option value="${k2}" ${p.vinculo === k2 ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label class="lb" for="pjFat">Faturamento (LPU) das O.S.</label><select id="pjFat"><option value="">—</option>${Object.entries(CENTROS).map(([k2, l]) => `<option value="${k2}" ${p.faturamento === k2 ? 'selected' : ''}>${l}</option>`).join('')}</select><span class="muted small">O.S. com esse faturamento entram neste projeto automaticamente.</span></div>
      <div class="field"><label class="lb" for="pjMod">Como recebemos</label><select id="pjMod">${Object.entries(PJ_MOD).map(([k2, l]) => `<option value="${k2}" ${p.modelo === k2 ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label class="lb" for="pjFixo">Valor fixo mensal (R$)</label><input type="text" inputmode="decimal" id="pjFixo" value="${p.receita_fixa != null ? String(p.receita_fixa).replace('.', ',') : ''}" placeholder="Ex.: contrato Master"></div>
      <div class="field"><label class="lb" for="pjDia">Dia do fechamento</label><input type="number" min="1" max="31" id="pjDia" value="${p.dia_fechamento || 31}"><span class="muted small">31 = último dia do mês</span></div>
      <div class="field full"><label class="lb" for="pjObs">Observação</label><input type="text" id="pjObs" value="${esc(p.obs || '')}"></div></div>
      <h3>Funcionários alocados (% do custo de cada um que vai para este projeto)</h3><p class="muted small" style="margin:0">Deixe em branco quem divide o tempo entre projetos: ele é rateado pelo tempo das O.S.</p>
      <div class="tw"><table class="t"><tbody>${tecs.map(t => `<tr><td>${esc(t.nome)}</td><td style="width:120px"><input type="text" inputmode="decimal" data-pjal="${t.uid}" value="${a.get(t.uid) || ''}" placeholder="%" style="width:90px;text-align:right"></td></tr>`).join('')}</tbody></table></div>
      <label class="row" style="gap:8px;align-items:center"><input type="checkbox" id="pjAtivo" ${p.ativo !== false ? 'checked' : ''}> Projeto ativo</label>
      <div class="row" style="gap:8px"><button type="button" class="btn pri" id="bPjSalva">Salvar projeto</button><button type="button" class="btn" id="bPjCancela">Cancelar</button></div>`;
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#bPjCancela').onclick = () => { f.hidden = true; };
    $('#bPjSalva').onclick = async () => {
      const nome = $('#pjNome').value.trim(); if (!nome) { toast('Dê um nome ao projeto.'); return; } const dia = Math.min(31, Math.max(1, parseInt($('#pjDia').value, 10) || 31));
      const al = $$('[data-pjal]').map(i => ({ uid: i.dataset.pjal, pct: qNum(i.value) })).filter(x => x.pct > 0);
      const outros = D.P.filter(o => o.id !== p.id && o.ativo !== false); const exc = al.filter(x => x.pct + outros.reduce((s, o) => s + (+((o.alocacao || []).find(y => y.uid === x.uid) || {}).pct || 0), 0) > 100.01);
      if (exc.length && !confirm(`Passa de 100% somando os projetos: ${exc.map(x => (tecs.find(t => t.uid === x.uid) || {}).nome).join(', ')}. Salvar mesmo assim?`)) return;
      try { S.projs = null; await Nuvem.projSalvar([{ ...p, id: p.id || 'pj_' + uid(), nome, vinculo: $('#pjVinc').value, faturamento: $('#pjFat').value || null, modelo: $('#pjMod').value, receita_fixa: qNum($('#pjFixo').value), dia_fechamento: dia, obs: $('#pjObs').value.trim(), alocacao: al, ativo: $('#pjAtivo').checked }]); toast('Projeto salvo.'); try { S.projs = await Nuvem.projLista(); } catch (e2) {} recarrega(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); }
    };
  };
  $('#bPjNovo').onclick = () => form({ vinculo: 'outro', modelo: 'outro', dia_fechamento: 31, alocacao: [], ativo: true });
  $$('[data-pjedit]').forEach(b => b.onclick = () => form(D.P.find(p => p.id === b.dataset.pjedit)));
  $$('[data-pladd]').forEach(b => b.onclick = async () => {
    const pid = b.dataset.pladd; const v = f => { const el = $$(`[data-pl="${pid}"]`).find(x => x.dataset.plf === f); return el.type === 'checkbox' ? el.checked : el.value; };
    const valor = qNum(v('valor')); if (!valor || valor <= 0) { toast('Informe o valor.'); return; } if (!v('data')) { toast('Informe a data.'); return; }
    try { await Nuvem.projLancSalvar({ id: 'pl_' + uid(), org: Nuvem.org(), projeto_id: pid, data: v('data'), tipo: v('tipo'), categoria: v('categoria').trim(), descricao: v('descricao').trim(), valor, recorrente: !!v('recorrente'), ate: null, por_nome: (Nuvem.admin || {}).nome || '', criado: Date.now() }); toast('Lançado.'); recarrega(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); }
  });
  $$('[data-pldel]').forEach(b => b.onclick = async () => { if (!confirm('Excluir este lançamento?')) return; try { await Nuvem.projLancApagar(b.dataset.pldel); recarrega(); } catch (e) { toast('Erro: ' + (e.message || e)); } });
  $('#bPjPdf').onclick = async () => { try { const f = await pdfGerencial(R, k); if (f) baixar(f); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } };
}
async function pdfGerencial(R, k) {
  if (!window.jspdf) { toast('Gerador de PDF não carregou.'); return null; }
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const logo = await logoData();
  const ref = k === 0 ? 'mês vigente' : k === -1 ? 'ciclo anterior' : 'dois ciclos atrás';
  let y = pdfHeader(doc, logo, 'Relatório gerencial da operação', `Centro de custo por projeto · ${ref}`, fDM(isoDate(Date.now())), 'EMITIDO'); let sn = 0;
  y = pdfSec(doc, y, ++sn, 'Total da operação');
  y = kv(doc, y, [['Receita', fBRL(R.T.receita)], ['Custo', fBRL(R.T.custo)], ['Resultado', `${fBRL(R.T.res)} (${pct(R.T.res, R.T.receita)})`], ['Mão de obra', fBRL(R.T.mo)], ['Deslocamento', fBRL(R.T.desl)], ['Veículos', fBRL(R.T.veic)], ['Outros custos', fBRL(R.T.outros)], ['Custo sem projeto', R.semProj.length ? fBRL(R.semProj.reduce((s, x) => s + x.valor, 0)) + ' · ' + R.semProj.map(x => x.nome).join(', ') : '—']]);
  doc.autoTable({ ...TB, startY: y + 2, head: [['Projeto', 'Ciclo', 'Receita', 'Custo', 'Resultado', 'Margem']], body: R.C.map(c => [c.p.nome, `${fDM(c.de)} a ${fDM(c.ate)}`, fBRL(c.receita), fBRL(c.custo), fBRL(c.res), pct(c.res, c.receita)]), columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' }, 5: { halign: 'right' } } });
  y = doc.lastAutoTable.finalY + 6;
  for (const c of R.C) {
    if (y > 200) { doc.addPage(); y = 16; }
    y = pdfSec(doc, y, ++sn, `${c.p.nome} · ${fDM(c.de)} a ${fDM(c.ate)}`);
    y = kv(doc, y, [['Como recebemos', PJ_MOD[c.p.modelo] || ''], ['O.S. no ciclo', String(c.os.length)], ['Produção das O.S.', fBRL(c.prod)], ['Valor fixo', fBRL(c.fixo)], ['Receitas lançadas', fBRL(c.rLanc)], ['Mão de obra', fBRL(c.mo)], ['Deslocamento', fBRL(c.desl)], ['Veículo', fBRL(c.veic)], ['Custos lançados', fBRL(c.cLanc)], ['Resultado', `${fBRL(c.res)} (${pct(c.res, c.receita)})`]]);
    if (c.times.length) { doc.autoTable({ ...TB, startY: y + 1, head: [['Equipe', 'Custo no projeto', 'O.S.', 'Produção', 'Produção − custo']], body: c.times.map(t => [t.nome + (t.membros.length > 1 ? ` (${t.membros.join(' + ')})` : ''), fBRL(t.custo), String(t.nOS), fBRL(t.prod), fBRL(t.prod - t.custo)]), columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } } }); y = doc.lastAutoTable.finalY + 3; }
    if (c.L.length) { doc.autoTable({ ...TB, startY: y + 1, head: [['Lançamento', 'Categoria', 'Data', 'Valor']], body: c.L.map(l => [`${l.tipo === 'receita' ? 'Receita' : 'Custo'} · ${l.descricao || ''}`, l.categoria || '', l.recorrente ? 'recorrente' : fDM(l.data), (l.tipo === 'custo' ? '− ' : '') + fBRL(+l.valor)]), columnStyles: { 3: { halign: 'right' } } }); y = doc.lastAutoTable.finalY + 3; }
    y += 4;
  }
  pdfFooter(doc, `Técnico Plus - Multivale · relatório gerencial · ${ref} · gerado em ${fDH(Date.now())}`);
  return new File([doc.output('blob')], `Relatorio_gerencial_${isoDate(Date.now())}.pdf`, { type: 'application/pdf' });
}

/* ============================ calendário de recursos ============================ */
// Ficha de cada técnico (região/mini cluster → cluster, classe, telefone, placa), escala de trabalho
// (entrada e saída por dia da semana), plantões e folgas; exportação dos plantonistas do fim de semana.
const DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ESC_PADRAO = { 0: null, 1: { e: '08:00', s: '17:48' }, 2: { e: '08:00', s: '17:48' }, 3: { e: '08:00', s: '17:48' }, 4: { e: '08:00', s: '17:48' }, 5: { e: '08:00', s: '17:48' }, 6: null };
// junta o que o gestor cadastrou (recursos) com o que o técnico informou no perfil
function fichaTec(t) {
  const r = (S.recursos || new Map()).get(t.uid) || {};
  const reg = r.regiao || t.regiao || ''; const clu = clusterDe(reg, r.regiao ? r.cluster : (t.cluster || r.cluster)); return { ...t, regiao: reg, mini: miniNome(reg, clu), cluster: clu, classe: r.classe || t.classe || '', telefone: r.telefone || t.fone || '', placa: r.placa || t.placa || '', escala: r.escala || null, servicos: Array.isArray(r.servicos) && r.servicos.length ? r.servicos : null, temFicha: !!S.recursos && S.recursos.has(t.uid) };
}
function turnoDia(f, dow) { const e = (f.escala || ESC_PADRAO)[dow]; return e && e.e && e.s ? e : null; }
function viewAdmCal() {
  const F = S.calF = S.calF || { cluster: meusClusters().length ? 'meus' : '', regiao: '', classe: '' };
  const chip = (k, v, l) => `<button type="button" role="radio" data-calf="${k}" data-v="${v}" aria-checked="${F[k] === v}">${l}</button>`;
  return `<section class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Calendário de recursos</h2><span class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="bCalPla">${ICON.plus}Plantão / folga</button><button type="button" class="btn pri" id="bCalExp">Exportar plantonistas do fim de semana</button></span></div>
    <div class="chips" role="group" aria-label="Cluster">${chip('cluster', '', 'Todos os clusters')}${meusClusters().length ? chip('cluster', 'meus', 'Meus clusters (' + meusClusters().map(c => CLUSTERS[c] ? CLUSTERS[c].replace('Cluster ', '') : c).join(', ') + ')') : ''}${Object.entries(CLUSTERS).map(([k, l]) => chip('cluster', k, l)).join('')}</div>
    <div class="chips" role="group" aria-label="Mini cluster">${chip('regiao', '', 'Todos os mini clusters')}${Object.entries(MINI).filter(([, v]) => !F.cluster || (F.cluster === 'meus' ? meusClusters().includes(v[1]) : v[1] === F.cluster)).map(([k, v]) => chip('regiao', k, v[0])).join('')}</div>
    <div class="chips" role="group" aria-label="Classe">${chip('classe', '', 'Todas as classes')}${Object.entries(CLASSES).map(([k, l]) => chip('classe', k, l)).join('')}</div>
    <p class="muted small" style="margin:0">Toque no nome do técnico para editar a ficha e a escala de trabalho. Toque num plantão ou folga para editar.${new Date().getDay() === 5 ? ' <b style="color:var(--accent)">Hoje é sexta: exporte os plantonistas do fim de semana.</b>' : ''}</p></section>
    <div id="calBox"><section class="card"><p class="empty">Carregando…</p></section></div><div id="calForm"></div><section class="card" id="supBox"></section><section class="card" id="ciBox"></section>`;
}
async function afterAdmCal() {
  pintaSupClusters(); { const cb = $('#ciBox'); if (cb) { cb.innerHTML = cidadesHtml(); bindCidades(cb); } }
  const F = S.calF; const A = S.adm;
  $$('[data-calf]').forEach(b => b.onclick = () => { F[b.dataset.calf] = b.dataset.v; if (b.dataset.calf === 'cluster') F.regiao = ''; render(); });
  try { if (!S.recursos) S.recursos = new Map((await Nuvem.recursosLista()).map(r => [r.uid, r])); } catch (e) { S.recursos = new Map(); toast('Ficha dos técnicos indisponível: rode o supabase.sql novo.', 6000); }
  const base = diaIni(A.calSem || isoDate(Date.now())); const seg = base - ((new Date(base).getDay() + 6) % 7) * 86400000; const dias = Array.from({ length: 7 }, (_, k) => seg + k * 86400000);
  try { S.plantoesAdm = await Nuvem.plantoesAdmin(seg - 86400000, seg + 9 * 86400000); } catch (e) { S.plantoesAdm = S.plantoesAdm || []; }
  const L = S.plantoesAdm || [];
  const tecs = (A.tecnicos || []).map(fichaTec).filter(t => (!F.cluster || (F.cluster === 'meus' ? meusClusters().includes(t.cluster) : t.cluster === F.cluster)) && (!F.regiao || t.regiao === F.regiao || (t.regiao === 'todas' && t.cluster === (MINI[F.regiao] || [])[1])) && (!F.classe || t.classe === F.classe));
  const cel = (t, d0) => { const dow = new Date(d0).getDay(); const pl = L.filter(p => p.uid === t.uid && p.inicio < d0 + 86400000 && p.fim > d0); const fol = pl.some(p => p.tipo === 'folga'); const tn = turnoDia(t, dow);
    return `${tn && !fol ? `<span class="small">${tn.e}–${tn.s}</span>` : `<span class="small muted">${fol ? '' : 'folga'}</span>`}${pl.map(p => `<button type="button" class="pill ${p.tipo === 'folga' ? 'done' : 'ok'}" data-calpla="${p.id}" title="${esc(fPla(p) + (p.obs ? ' · ' + p.obs : ''))}" style="border:0;cursor:pointer;display:block;margin:2px 0">${p.tipo === 'folga' ? 'Folga' : `Plantão ${fHora(Math.max(p.inicio, d0))}–${p.fim >= d0 + 86400000 ? '24h' : fHora(p.fim)}`}</button>`).join('')}`; };
  const grupos = {}; tecs.forEach(t => { const k = t.mini || 'Sem região'; (grupos[k] = grupos[k] || []).push(t); });
  $('#calBox').innerHTML = `<section class="card"><div class="row" style="justify-content:space-between"><div class="dnav"><button type="button" id="calPrev" aria-label="Semana anterior">${ICON.prev}</button><span style="min-width:150px;text-align:center">${fData(seg).slice(0, 5)} a ${fData(seg + 6 * 86400000).slice(0, 5)}</span><button type="button" id="calNext" aria-label="Próxima semana">${ICON.next}</button></div><span class="muted small">${tecs.length} técnico(s)</span></div>
    <div class="tw"><table class="t"><thead><tr><th>Técnico</th>${dias.map(x => `<th${[0, 6].includes(new Date(x).getDay()) ? ' style="background:var(--surface-2)"' : ''}>${DIAS_SEM[new Date(x).getDay()]} ${fData(x).slice(0, 5)}</th>`).join('')}</tr></thead><tbody>
    ${Object.entries(grupos).sort().map(([g, l]) => `<tr><td colspan="8" style="background:var(--surface-2);font-weight:700">${esc(g)}${l[0].cluster && l[0].regiao !== 'todas' ? ' · ' + esc(CLUSTERS[l[0].cluster]) : ''}</td></tr>${l.map(t => `<tr><td><button type="button" class="lnk" data-calrec="${t.uid}" style="text-align:left"><b>${esc(t.nome)}</b></button><br><span class="small muted">${esc(CLASSES[t.classe] || 'classe não definida')}${t.telefone ? ' · ' + esc(t.telefone) : ''}${t.placa ? ' · ' + esc(t.placa) : ''}</span>${plaAgora(L, t.uid, 'plantao') ? '<br><span class="pill ok">de plantão agora</span>' : ''}</td>${dias.map(x => `<td${[0, 6].includes(new Date(x).getDay()) ? ' style="background:var(--surface-2)"' : ''}>${cel(t, x)}</td>`).join('')}</tr>`).join('')}`).join('') || '<tr><td colspan="8" class="muted">Nenhum técnico no filtro.</td></tr>'}</tbody></table></div></section>`;
  const mv = k => { A.calSem = isoDate(seg + k * 7 * 86400000 + 43200000); render(); };
  $('#calPrev').onclick = () => mv(-1); $('#calNext').onclick = () => mv(1);
  const form = $('#calForm');
  const abrePla = p => {
    form.innerHTML = plaFormHtml(p); form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#bPlaCanc').onclick = () => { form.innerHTML = ''; };
    $('#bPlaSalva').onclick = async () => { const t = A.tecnicos.find(x => x.uid === $('#pl_tec').value); const ini = Date.parse($('#pl_ini').value), fim = Date.parse($('#pl_fim').value); if (!t) { toast('Escolha o técnico.'); return; } if (!(ini < fim)) { toast('O fim precisa ser depois do início.'); return; }
      try { await Nuvem.plantaoSalvar({ id: p.id, uid: t.uid, tecnicoNome: t.nome, tipo: $('#pl_tipo').value, inicio: ini, fim, obs: $('#pl_obs').value.trim() }); toast('Escala salva.'); form.innerHTML = ''; render(); } catch (e) { toast('Erro: ' + e.message, 6000); } };
    $('#bPlaDel') && ($('#bPlaDel').onclick = async () => { if (!confirm('Excluir este lançamento?')) return; try { await Nuvem.plantaoApagar(p.id); form.innerHTML = ''; render(); } catch (e) { toast('Erro: ' + e.message, 6000); } });
  };
  $('#bCalPla').onclick = () => { const [ini, fim] = janelaFimSemana(); abrePla({ _novo: true, id: 'pla-' + uid(), uid: (tecs[0] || A.tecnicos[0] || {}).uid, tipo: 'plantao', inicio: ini, fim, obs: '' }); };
  $$('[data-calpla]').forEach(b => b.onclick = () => { const p = L.find(x => x.id === b.dataset.calpla); if (p) abrePla({ ...p }); });
  $$('[data-calrec]').forEach(b => b.onclick = () => {
    const t = fichaTec(A.tecnicos.find(x => x.uid === b.dataset.calrec)); const E = { ...ESC_PADRAO, ...(t.escala || {}) };
    form.innerHTML = `<section class="card"><h2>Ficha e escala · ${esc(t.nome)}</h2><div class="grid2">
      <div class="field"><label class="lb" for="rcClu">Cluster</label><select id="rcClu">${cluOpts(t.cluster, 'Não definido')}</select></div>
      <div class="field"><label class="lb" for="rcReg">Mini cluster</label><select id="rcReg">${miniOpts(t.cluster, t.regiao, 'Não definido')}</select></div>
      <div class="field"><label class="lb" for="rcCla">Classe</label><select id="rcCla"><option value="">Não definida</option>${Object.entries(CLASSES).map(([k, l]) => `<option value="${k}" ${t.classe === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label class="lb" for="rcTel">Telefone</label><input type="tel" id="rcTel" value="${esc(t.telefone)}"></div><div class="field"><label class="lb" for="rcPla">Placa do veículo</label><input type="text" id="rcPla" value="${esc(t.placa)}" autocapitalize="characters"></div></div>
      <h3>Serviços que ele executa</h3><div class="chips" role="group" aria-label="Serviços que o técnico executa" style="flex-wrap:wrap">${Object.entries(SERVICOS).map(([k, l]) => `<button type="button" role="checkbox" data-rcserv="${k}" aria-checked="${!t.servicos || t.servicos.includes(k)}">${l}</button>`).join('')}</div>
      <p class="muted small" style="margin:0">Só esses aparecem para ele iniciar no app. As O.S. que você envia chegam sempre, de qualquer tipo. Fiscal de campo faz só vistoria.</p>
      <h3>Escala de trabalho</h3><div class="tw"><table class="t"><thead><tr><th>Dia</th><th>Trabalha</th><th>Entrada</th><th>Saída</th></tr></thead><tbody>${[1, 2, 3, 4, 5, 6, 0].map(d => `<tr><td>${DIAS_SEM[d]}</td><td><input type="checkbox" data-rcon="${d}" ${E[d] ? 'checked' : ''}></td><td><input type="time" data-rce="${d}" value="${(E[d] || {}).e || '08:00'}"></td><td><input type="time" data-rcs="${d}" value="${(E[d] || {}).s || '17:48'}"></td></tr>`).join('')}</tbody></table></div>
      <p class="muted small" style="margin:0">O alarme de "expediente não iniciado" do técnico segue esta escala.</p>
      <div class="row" style="gap:8px"><button type="button" class="btn pri" id="bRcSalva">Salvar ficha</button><button type="button" class="btn" id="bRcCanc">Cancelar</button></div></section>`;
    bindRegiao($('#rcClu'), $('#rcReg'), $('#rcCla'));
    $$('[data-rcserv]', form).forEach(b => b.onclick = () => { const on = b.getAttribute('aria-checked') === 'true'; if (on && $$('[data-rcserv][aria-checked="true"]', form).length === 1) { toast('Deixe pelo menos um serviço.'); return; } b.setAttribute('aria-checked', String(!on)); });
    form.insertAdjacentHTML('beforeend', '<section class="card" id="trBox"><p class="muted small">Carregando treinamentos…</p></section>');
    const pTr = () => { const bx = $('#trBox'); if (!bx) return; bx.innerHTML = treinoListaHtml(t.uid); bindTreinos(t.uid, pTr); };
    (async () => { if (!S.treinosTodos) { try { S.treinosTodos = await Nuvem.treinosTodos(); } catch (e) { S.treinosTodos = []; } } pTr(); })();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#bRcCanc').onclick = () => { form.innerHTML = ''; };
    $('#bRcSalva').onclick = async () => {
      const esc2 = {}; [0, 1, 2, 3, 4, 5, 6].forEach(d => { const on = $(`[data-rcon="${d}"]`).checked; const e = $(`[data-rce="${d}"]`).value, s2 = $(`[data-rcs="${d}"]`).value; esc2[d] = on && e && s2 ? { e, s: s2 } : null; });
      if (Object.values(esc2).some(x => x && x.s <= x.e)) { toast('A saída precisa ser depois da entrada.'); return; }
      const r = { uid: t.uid, org: Nuvem.org(), nome: t.nome, regiao: $('#rcReg').value || null, cluster: $('#rcClu').value || clusterDe($('#rcReg').value, '') || null, classe: $('#rcCla').value || null, telefone: $('#rcTel').value.trim() || null, placa: $('#rcPla').value.trim().toUpperCase() || null, escala: esc2, servicos: (() => { const l = $$('[data-rcserv]', form).filter(x => x.getAttribute('aria-checked') === 'true').map(x => x.dataset.rcserv); return l.length === Object.keys(SERVICOS).length ? null : l; })(), atualizado: Date.now() };
      try { await Nuvem.recursoSalvar(r); S.recursos.set(r.uid, r); toast('Ficha salva.'); form.innerHTML = ''; render(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); }
    };
  });
  $('#bCalExp').onclick = () => exportaPlantonistas();
}
// fim de semana: de sexta 18h a segunda 8h (o próximo, ou o atual se já estiver nele)
function janelaFimSemana(ref = Date.now()) { const d = new Date(ref); const dow = d.getDay(); const voltar = dow === 6 ? 1 : dow === 0 ? 2 : dow === 1 && d.getHours() < 8 ? 3 : -((5 - dow + 7) % 7); const sex = new Date(d.getFullYear(), d.getMonth(), d.getDate() - voltar, 18, 0); return [+sex, +sex + 62 * 3600000]; }
async function exportaPlantonistas() {
  const [a, z] = janelaFimSemana(); let L; try { L = await Nuvem.plantoesAdmin(a, z); } catch (e) { toast('Erro: ' + (e.message || e)); return; }
  const P = L.filter(p => p.tipo === 'plantao' && p.inicio < z && p.fim > a).sort((p, q) => p.inicio - q.inicio);
  if (!P.length) { toast('Nenhum plantão lançado para o fim de semana.', 5000); return; }
  const linhas = P.map(p => { const t = fichaTec((S.adm.tecnicos || []).find(x => x.uid === p.uid) || { uid: p.uid, nome: p.tecnicoNome }); return { 'Técnico': t.nome || p.tecnicoNome, 'Matrícula': t.matricula || '', 'Telefone': t.telefone || '', 'Placa': t.placa || '', 'Região de atendimento': t.mini || '', 'Cluster': CLUSTERS[t.cluster] || '', 'Classe': CLASSES[t.classe] || '', 'Início': `${fData(p.inicio)} ${fHora(p.inicio)}`, 'Fim': `${fData(p.fim)} ${fHora(p.fim)}`, 'Observação': p.obs || '' }; });
  const nome = `Plantonistas_${fData(a).replace(/\//g, '-')}_a_${fData(z).replace(/\//g, '-')}`;
  try {
    if (!window.XLSX) await carregaScript('xlsx.full.min.js'); const ws = XLSX.utils.json_to_sheet(linhas); ws['!cols'] = Object.keys(linhas[0]).map(k => ({ wch: Math.max(k.length, ...linhas.map(l => String(l[k]).length)) + 2 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Plantonistas'); const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    baixar(new File([buf], nome + '.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); toast(`${P.length} plantonista(s) exportado(s).`);
  } catch (e) { const csv = '﻿' + [Object.keys(linhas[0]), ...linhas.map(Object.values)].map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n'); baixar(new File([csv], nome + '.csv', { type: 'text/csv' })); }
}

/* ============================ SLA e indicadores de tempo ============================ */
// Prazo de chegada (acionamento → técnico no local) e de reparo (acionamento → O.S. concluída) para as
// O.S. emergenciais, por contrato. Valores em minutos; o gestor ajusta na tela "Indicadores e SLA".
const SLA_PADRAO = { claro: { chegada: 240, reparo: 480 }, master: { chegada: 240, reparo: 480 }, multivale: { chegada: 360, reparo: 720 } };
const CONTRATO_LB = { claro: 'Claro', master: 'Backbone Master', multivale: 'Backbone Multivale' };
function contratoAtv(a) { const c = String((a && a.cliente) || ''), ce = String((a && a.centro) || ''); if (/claro/i.test(c) || ce.startsWith('claro')) return 'claro'; if (/master/i.test(c) || /master/i.test(String((a && a.parceiro) || ''))) return 'master'; return 'multivale'; }
function slaCfg(k) { const s = ((S.cfg || {}).sla || {})[k] || {}; return { chegada: +s.chegada || SLA_PADRAO[k].chegada, reparo: +s.reparo || SLA_PADRAO[k].reparo }; }
// situação do SLA de uma O.S. (só emergenciais que não foram canceladas)
function slaDe(a, agora = Date.now()) {
  if (!a || !atvEmerg(a) || a.status === 'cancelada' || !a.criado) return null;
  const k = contratoAtv(a), c = slaCfg(k), t0 = +a.criado;
  const item = (lim, fim) => { const limite = t0 + lim * 60000, ref = fim || agora; return { lim, limite, feito: !!fim, gasto: (ref - t0) / 60000, resto: (limite - ref) / 60000, estourou: ref > limite }; };
  return { k, cheg: item(c.chegada, a.chegadaEm), rep: item(c.reparo, a.concluidaEm) };
}
// etiqueta para a fila: o prazo que está correndo agora
function slaTag(a) {
  const s = slaDe(a); if (!s || a.status === 'concluida') return '';
  const x = !s.cheg.feito ? s.cheg : s.rep; const nome = !s.cheg.feito ? 'chegada' : 'reparo';
  const cor = x.estourou ? 'var(--bad)' : x.resto <= 30 ? '#b7791f' : 'var(--ok)';
  return ` · <b style="color:${cor}" title="SLA de ${nome}: ${fHm(x.lim)}">⏱ ${nome} ${x.estourou ? 'estourado há ' + fHm(-x.resto) : 'em ' + fHm(x.resto)}</b>`;
}
// O.S. abertas com prazo vencendo em até 30 min ou já estourado (para o aviso do topo do painel)
function slaAlertas() {
  const out = []; (S.atvsAdm || new Map()).forEach(a => { if (!atvAberta(a)) return; const s = slaDe(a); if (!s) return; const x = !s.cheg.feito ? s.cheg : s.rep; if (x.resto <= 30) out.push({ a, x, nome: !s.cheg.feito ? 'chegada' : 'reparo' }); });
  return out.sort((p, q) => p.x.resto - q.x.resto);
}
const mediaMin = l => l.length ? l.reduce((s, v) => s + v, 0) / l.length : null;
const fMed = v => v == null ? '—' : fHm(v);
// indicadores de um conjunto de O.S. emergenciais
function slaIndicadores(L, agora = Date.now()) {
  const E = L.filter(a => atvEmerg(a) && a.status !== 'cancelada');
  const S2 = E.map(a => ({ a, s: slaDe(a, agora) })).filter(x => x.s);
  const comCheg = S2.filter(x => x.s.cheg.feito || x.s.cheg.estourou), comRep = S2.filter(x => x.s.rep.feito || x.s.rep.estourou);
  return {
    n: E.length,
    chegPrazo: comCheg.length ? comCheg.filter(x => !x.s.cheg.estourou).length / comCheg.length * 100 : null,
    repPrazo: comRep.length ? comRep.filter(x => !x.s.rep.estourou).length / comRep.length * 100 : null,
    ciente: mediaMin(E.filter(a => a.vistaEm).map(a => (a.vistaEm - a.criado) / 60000)),
    resposta: mediaMin(E.filter(a => a.chegadaEm).map(a => (a.chegadaEm - a.criado) / 60000)),
    desloc: mediaMin(E.filter(a => a.chegadaEm && a.iniciadaEm).map(a => (a.chegadaEm - a.iniciadaEm) / 60000)),
    mttr: mediaMin(E.filter(a => a.concluidaEm).map(a => (a.concluidaEm - a.criado) / 60000)),
    fora: S2.filter(x => x.s.cheg.estourou || x.s.rep.estourou).map(x => x.a)
  };
}
const fPctS = v => v == null ? '—' : Math.round(v) + '%';
function viewAdmSla() {
  const P = S.slaP = S.slaP || { k: 0, grupo: 'contrato' };
  return `<section class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Indicadores e SLA</h2><span class="row" style="gap:8px"><button type="button" class="btn" id="bSlaCsv">Exportar</button><button type="button" class="btn" id="bSlaCfg">Prazos do contrato</button></span></div>
    <div class="chips" role="group" aria-label="Período">${[[0, 'Ciclo atual'], [-1, 'Ciclo anterior'], [-2, 'Dois ciclos atrás']].map(([k, l]) => `<button type="button" role="radio" data-slak="${k}" aria-checked="${P.k === k}">${l}</button>`).join('')}</div>
    <div class="chips" role="group" aria-label="Agrupar por">${[['contrato', 'Por contrato'], ['cluster', 'Por cluster'], ['mini', 'Por mini cluster'], ['equipe', 'Por equipe'], ['tecnico', 'Por técnico']].map(([k, l]) => `<button type="button" role="radio" data-slag="${k}" aria-checked="${P.grupo === k}">${l}</button>`).join('')}</div>
    <p class="muted small" style="margin:0">Só O.S. emergenciais. <b>Resposta</b> = do acionamento até o técnico chegar. <b>MTTR</b> = do acionamento até concluir. O prazo de cada contrato fica em "Prazos do contrato".</p></section>
    <div id="slaCfgBox"></div><div id="slaBox"><section class="card"><p class="empty">Carregando…</p></section></div>`;
}
async function afterAdmSla() {
  const P = S.slaP; const box = $('#slaBox');
  $$('[data-slak]').forEach(b => b.onclick = () => { P.k = +b.dataset.slak; S.slaD = null; render(); });
  $$('[data-slag]').forEach(b => b.onclick = () => { P.grupo = b.dataset.slag; render(); });
  $('#bSlaCfg').onclick = () => {
    const c = $('#slaCfgBox'); if (c.innerHTML) { c.innerHTML = ''; return; }
    c.innerHTML = `<section class="card"><h2>Prazos do contrato (SLA)</h2><div class="tw"><table class="t"><thead><tr><th>Contrato</th><th>Chegada ao local (h:mm)</th><th>Reparo / conclusão (h:mm)</th></tr></thead><tbody>${Object.keys(SLA_PADRAO).map(k => { const v = slaCfg(k); return `<tr><td>${CONTRATO_LB[k]}</td><td><input type="text" data-slac="${k}" value="${fHm(v.chegada).replace('h', ':')}" style="width:90px"></td><td><input type="text" data-slar="${k}" value="${fHm(v.reparo).replace('h', ':')}" style="width:90px"></td></tr>`; }).join('')}</tbody></table></div>
      <p class="muted small" style="margin:0">Use os prazos que estão no contrato. Os valores de fábrica são só um ponto de partida.</p><button type="button" class="btn pri" id="bSlaSalva">Salvar prazos</button></section>`;
    $('#bSlaSalva').onclick = async () => { const hm2 = v => { const m = String(v).trim().match(/^(\d{1,3})(?::(\d{2}))?$/); return m ? +m[1] * 60 + (+m[2] || 0) : null; }; const sla = {};
      for (const k of Object.keys(SLA_PADRAO)) { const ch = hm2($(`[data-slac="${k}"]`).value), rp = hm2($(`[data-slar="${k}"]`).value); if (!ch || !rp) { toast(`Confira os prazos de ${CONTRATO_LB[k]} (formato h:mm).`); return; } sla[k] = { chegada: ch, reparo: rp }; }
      S.cfg = { ...(S.cfg || {}), sla }; try { await Nuvem.cfgSalvar(S.cfg); toast('Prazos salvos.'); c.innerHTML = ''; render(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } };
  };
  const [de, ate] = cicloDe(Date.now(), P.k);
  try { if (!S.slaD || S.slaD.k !== P.k) { const L = await Nuvem.atvPeriodo(diaIni(de), diaFim(ate)); if (!S.recursos) { try { S.recursos = new Map((await Nuvem.recursosLista()).map(r => [r.uid, r])); } catch (e) { S.recursos = new Map(); } } S.slaD = { k: P.k, L }; } }
  catch (e) { box.innerHTML = `<section class="card"><div class="warnbox">Não foi possível carregar: ${esc(e.message || e)}</div></section>`; return; }
  const L = S.slaD.L; const T = slaIndicadores(L);
  const tecDe = a => fichaTec((S.adm.tecnicos || []).find(t => t.uid === a.tecnicoUid) || { uid: a.tecnicoUid, nome: a.tecnicoNome || 'Sem técnico' });
  const chave = a => { const t = tecDe(a); if (P.grupo === 'contrato') return CONTRATO_LB[contratoAtv(a)]; if (P.grupo === 'cluster') return CLUSTERS[clusterOS(a)] || 'Sem cluster'; if (P.grupo === 'mini') { const r = regiaoOS(a); return r && r.mini && MINI[r.mini] ? MINI[r.mini][0] : r ? (CLUSTERS[r.cluster] || 'Sem região') + ' (todas as áreas)' : 'Sem região'; } if (P.grupo === 'equipe') { const d = a.tecnicoUid && duplaDe(a.tecnicoUid); return d ? d.nome : t.nome || 'Sem técnico'; } return t.nome || 'Sem técnico'; };
  const G = new Map(); L.filter(a => atvEmerg(a) && a.status !== 'cancelada').forEach(a => { const k = chave(a); (G.get(k) || G.set(k, []).get(k)).push(a); });
  const linhas = [...G.entries()].map(([k, l]) => ({ k, ...slaIndicadores(l) })).sort((a, b) => b.n - a.n);
  const cor = v => v == null ? 'inherit' : v >= 90 ? 'var(--ok)' : v >= 75 ? '#b7791f' : 'var(--bad)';
  box.innerHTML = `<section class="card"><h2>Ciclo ${fDM(de)} a ${fDM(ate)}</h2>
    <div class="stats"><div class="stat"><b>${T.n}</b><span>O.S. emergenciais</span></div><div class="stat"><b style="color:${cor(T.chegPrazo)}">${fPctS(T.chegPrazo)}</b><span>Chegada no prazo</span></div><div class="stat"><b style="color:${cor(T.repPrazo)}">${fPctS(T.repPrazo)}</b><span>Reparo no prazo</span></div><div class="stat"><b>${fMed(T.ciente)}</b><span>Tempo até o ciente</span></div><div class="stat"><b>${fMed(T.resposta)}</b><span>Tempo de resposta</span></div><div class="stat"><b>${fMed(T.desloc)}</b><span>Deslocamento médio</span></div><div class="stat"><b>${fMed(T.mttr)}</b><span>MTTR</span></div></div>
    <div class="tw"><table class="t"><thead><tr><th>${{ contrato: 'Contrato', cluster: 'Cluster', mini: 'Mini cluster', equipe: 'Equipe', tecnico: 'Técnico' }[P.grupo]}</th><th class="r">O.S.</th><th class="r">Chegada no prazo</th><th class="r">Reparo no prazo</th><th class="r">Ciente</th><th class="r">Resposta</th><th class="r">Deslocamento</th><th class="r">MTTR</th><th class="r">Fora do prazo</th></tr></thead><tbody>
    ${linhas.map(x => `<tr><td><b>${esc(x.k)}</b></td><td class="r">${x.n}</td><td class="r" style="color:${cor(x.chegPrazo)};font-weight:700">${fPctS(x.chegPrazo)}</td><td class="r" style="color:${cor(x.repPrazo)};font-weight:700">${fPctS(x.repPrazo)}</td><td class="r">${fMed(x.ciente)}</td><td class="r">${fMed(x.resposta)}</td><td class="r">${fMed(x.desloc)}</td><td class="r">${fMed(x.mttr)}</td><td class="r">${x.fora.length}</td></tr>`).join('') || '<tr><td colspan="9" class="muted">Nenhuma O.S. emergencial no ciclo.</td></tr>'}</tbody></table></div></section>
    <section class="card"><h2>O.S. fora do prazo (${T.fora.length})</h2>${T.fora.length ? `<div class="tw"><table class="t"><thead><tr><th>Acionamento</th><th>O.S.</th><th>Contrato</th><th>Técnico</th><th>Chegada</th><th>Reparo</th></tr></thead><tbody>${T.fora.sort((a, b) => b.criado - a.criado).map(a => { const s = slaDe(a); const c2 = x => x.estourou ? `<b style="color:var(--bad)">${fHm(x.gasto)} (prazo ${fHm(x.lim)})</b>` : x.feito ? fHm(x.gasto) : 'em andamento'; return `<tr><td>${fDH(a.criado)}</td><td><button type="button" class="lnk" data-slaos="${a.id}">${esc(a.ticket || '—')}</button></td><td>${CONTRATO_LB[s.k]}</td><td>${esc(a.tecnicoNome || '—')}</td><td>${c2(s.cheg)}</td><td>${c2(s.rep)}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="empty">Nenhuma O.S. fora do prazo no ciclo. 👏</p>'}</section>`;
  $$('[data-slaos]').forEach(b => b.onclick = () => { const a = L.find(x => x.id === b.dataset.slaos); if (a) { S.atvsAdm.set(a.id, a); abrirAtvAdm(a.id); } });
  $('#bSlaCsv').onclick = () => { const cab = ['Acionamento', 'O.S.', 'Contrato', 'Técnico', 'Mini cluster', 'Ciente (min)', 'Resposta (min)', 'Deslocamento (min)', 'Conclusão (min)', 'Prazo chegada (min)', 'Prazo reparo (min)', 'Chegada no prazo', 'Reparo no prazo'];
    const rows = L.filter(a => atvEmerg(a) && a.status !== 'cancelada').map(a => { const s = slaDe(a); const t = tecDe(a); const mn = (x, y) => x && y ? Math.round((x - y) / 60000) : ''; return [fDH(a.criado), a.ticket || '', CONTRATO_LB[s.k], a.tecnicoNome || '', t.mini || '', mn(a.vistaEm, a.criado), mn(a.chegadaEm, a.criado), mn(a.chegadaEm, a.iniciadaEm), mn(a.concluidaEm, a.criado), s.cheg.lim, s.rep.lim, s.cheg.feito || s.cheg.estourou ? (s.cheg.estourou ? 'não' : 'sim') : 'em andamento', s.rep.feito || s.rep.estourou ? (s.rep.estourou ? 'não' : 'sim') : 'em andamento']; });
    const t = '﻿' + [cab, ...rows].map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n'); baixar(new File([t], `SLA_${de}_a_${ate}.csv`, { type: 'text/csv' })); };
}

/* ============================ histórico por ativo (caixa, node, endereço) e QR da plaqueta ============================ */
const TIPO_INSP = i => isCorr(i) ? 'Corretiva' : isImpl(i) ? 'Implantação' : isVist(i) ? (i.vist && i.vist.revisao ? 'Revisão do plano' : i.vist && i.vist.tipo === 'caixa' ? 'Mapeamento' : 'Vistoria') : 'Preventiva';
function resumoInsp(i) {
  if (isCorr(i)) return [i.corr && i.corr.ocorrencia, i.corr && i.corr.problema, i.corr && i.corr.causa && 'Causa: ' + i.corr.causa].filter(Boolean).join(' · ');
  if (isVist(i)) return ((i.vist || {}).descricao || '').slice(0, 220);
  const nc = CHECK.filter(([k]) => (i.check || {})[k] === 'NC').map(([k, lb]) => `${lb}${(i.checkObs || {})[k] ? ': ' + i.checkObs[k] : ''}`);
  return nc.length ? 'N/C: ' + nc.join('; ') : 'Tudo conforme';
}
const ncDeInsp = i => CHECK.filter(([k]) => (i.check || {})[k] === 'NC').map(([k, lb]) => `${lb}${(i.checkObs || {})[k] ? ': ' + i.checkObs[k] : ''}`);
// resumo do histórico de uma caixa (usado no celular e no painel)
function resumoAtivo(evs, atvs = []) {
  const ord = [...evs].sort((a, b) => b.chegada - a.chegada); const ult = ord[0]; const ultPrev = ord.find(ehPrev);
  const d90 = Date.now() - 90 * 86400000;
  return { visitas: evs.length, corretivas: evs.filter(isCorr).length + atvs.filter(a => atvEmerg(a)).length, reinc90: evs.filter(i => isCorr(i) && i.chegada >= d90).length + atvs.filter(a => atvEmerg(a) && a.criado >= d90).length, ult, ncAbertas: ultPrev ? ncDeInsp(ultPrev) : [] };
}
// ---------- celular: histórico da caixa ao digitar ou ler a TAG ----------
async function pintaHistCaixa(tag) {
  const box = $('#histCaixa'); if (!box) return; tag = String(tag || '').trim().toUpperCase(); if (!tag || !Nuvem.on) { box.innerHTML = ''; return; }
  box.innerHTML = '<p class="muted small" style="margin:0">Buscando o histórico desta caixa…</p>';
  let evs = []; try { evs = (await Nuvem.evsPorTag(tag, true)).filter(i => !S.insp || i.id !== S.insp.id); } catch (e) { box.innerHTML = ''; return; }
  if (!$('#histCaixa')) return;
  if (!evs.length) { box.innerHTML = '<p class="muted small" style="margin:0">Primeira visita registrada nesta caixa.</p>'; return; }
  const R = resumoAtivo(evs);
  box.innerHTML = `<div class="okbox small" style="display:flex;flex-direction:column;gap:4px"><b>Histórico da caixa ${esc(tag)}: ${R.visitas} visita(s)${R.corretivas ? ` · ${R.corretivas} corretiva(s)` : ''}${R.reinc90 > 1 ? ` · <span style="color:var(--bad)">${R.reinc90} corretivas em 90 dias</span>` : ''}</b>
    <span>Última: ${fData(R.ult.chegada)} · ${esc(TIPO_INSP(R.ult))} · ${esc(R.ult.info.tecnico || '')}</span>${R.ncAbertas.length ? `<span style="color:var(--bad)">Pendências da última preventiva: ${esc(R.ncAbertas.join('; '))}</span>` : ''}${(() => { const u = evs.filter(temMapaFusao).sort((a, b) => (b.chegada || 0) - (a.chegada || 0))[0]; return u ? `<button type="button" class="btn" id="bHistPlano" style="min-height:40px;align-self:flex-start">Ver plano de fusão e fotos (${fData(u.chegada).slice(0, 10)})</button>` : ''; })()}</div>`;
  const hb = $('#bHistPlano'); if (hb) hb.onclick = () => abrirPlano(evs.filter(temMapaFusao).sort((a, b) => (b.chegada || 0) - (a.chegada || 0))[0], { soVer: true });
}
// ---------- leitura de QR pela câmera ----------
async function lerQR(cb) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Este celular não deixa o app usar a câmera para QR. Digite a TAG.'); return; }
  const ov = document.createElement('div'); ov.className = 'qrov'; ov.innerHTML = `<video playsinline muted></video><div class="qrmira"></div><p>Aponte para o QR da plaqueta</p><button type="button" class="btn">Cancelar</button>`; document.body.appendChild(ov);
  const video = ov.querySelector('video'); let stream = null, fim = false;
  const fecha = () => { fim = true; try { stream && stream.getTracks().forEach(t => t.stop()); } catch (e) {} ov.remove(); };
  ov.querySelector('button').onclick = fecha;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); } catch (e) { fecha(); toast('Sem acesso à câmera. Libere a câmera para o app.', 6000); return; }
  video.srcObject = stream; await video.play().catch(() => {});
  let det = null; if ('BarcodeDetector' in window) { try { det = new BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { det = null; } }
  if (!det && !window.jsQR) { try { await carregaScript('jsqr.min.js'); } catch (e) {} }
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  const passo = async () => {
    if (fim) return; let txt = null;
    try {
      if (video.readyState >= 2) {
        if (det) { const r = await det.detect(video); if (r && r[0]) txt = r[0].rawValue; }
        else if (window.jsQR) { const w = Math.min(640, video.videoWidth), h = Math.round(video.videoHeight * w / video.videoWidth); cv.width = w; cv.height = h; cx.drawImage(video, 0, 0, w, h); const r = jsQR(cx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' }); if (r) txt = r.data; }
      }
    } catch (e) {}
    if (txt) { try { navigator.vibrate && navigator.vibrate(120); } catch (e) {} fecha(); cb(tagDoQR(txt)); return; }
    setTimeout(passo, 180);
  };
  passo();
}
function tagDoQR(t) { t = String(t || '').trim(); const m = t.match(/[?&]tag=([^&#]+)/i); return decodeURIComponent(m ? m[1] : t.replace(/^TP:/i, '')).trim().toUpperCase(); }
// ---------- painel: busca do ativo ----------
function viewAdmAtivo() {
  const B = S.atvB = S.atvB || { q: '', tipo: 'tag' };
  return `<section class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Histórico de ativos</h2><span class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn" id="bLinear">Diagrama linear de fusões</button><button type="button" class="btn" id="bEtiq">Etiquetas QR das caixas</button></span></div>
    <div class="chips" role="group" aria-label="Buscar por">${[['tag', 'Caixa (TAG)'], ['node', 'Node'], ['texto', 'Ticket ou endereço']].map(([k, l]) => `<button type="button" role="radio" data-abt="${k}" aria-checked="${B.tipo === k}">${l}</button>`).join('')}</div>
    <div class="row" style="gap:8px;flex-wrap:nowrap"><input type="search" id="abQ" value="${esc(B.q)}" placeholder="${{ tag: 'Ex.: CE-BKB-0012', node: 'Ex.: SJC-12', texto: 'Ex.: INM000070 ou Rua das Flores' }[B.tipo]}" style="flex:1;min-width:0" autocapitalize="characters"><button type="button" class="btn pri" id="bAbBusca">Buscar</button></div>
    <p class="muted small" style="margin:0">Mostra todas as visitas, corretivas, fotos e pendências daquele ponto, mais as O.S. a menos de 200 m nos últimos 12 meses (reincidência no local).</p></section>
    <div id="lnBox"></div><div id="abBox"></div><div id="etqBox"></div>`;
}
async function afterAdmAtivo() {
  const B = S.atvB; const box = $('#abBox');
  $$('[data-abt]').forEach(b => b.onclick = () => { B.tipo = b.dataset.abt; render(); });
  const busca = async () => {
    B.q = $('#abQ').value.trim(); if (B.q.length < 2) { toast('Digite pelo menos 2 letras.'); return; }
    box.innerHTML = '<section class="card"><p class="empty">Buscando…</p></section>';
    let evs = [], atvs = [];
    try {
      if (B.tipo === 'tag') evs = await Nuvem.evsPorTag(B.q, false);
      else if (B.tipo === 'node') atvs = await Nuvem.atvsPorNode(B.q);
      else { [evs, atvs] = await Promise.all([Nuvem.evsPorTexto(B.q), Nuvem.atvsPorTexto(B.q)]); }
    } catch (e) { box.innerHTML = `<section class="card"><div class="warnbox">Erro na busca: ${esc(e.message || e)}</div></section>`; return; }
    // O.S. vizinhas (até 200 m, 12 meses) para ver reincidência no local
    const pts = [...evs.map(i => i.loc).filter(l => l && l.lat != null), ...atvs.filter(a => a.lat != null)];
    let viz = [];
    if (pts.length) { const c = { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lon: pts.reduce((s, p) => s + p.lon, 0) / pts.length };
      try { const ids = new Set(atvs.map(a => a.id)); viz = (await Nuvem.atvPeriodo(Date.now() - 365 * 86400000, Date.now())).filter(a => a.lat != null && !ids.has(a.id) && hav(c, a) <= 200); } catch (e) {} }
    const R = resumoAtivo(evs, [...atvs, ...viz]);
    const itens = [...evs.map(i => ({ ts: i.chegada, ev: i })), ...atvs.map(a => ({ ts: a.criado, atv: a })), ...viz.map(a => ({ ts: a.criado, atv: a, viz: true }))].sort((a, b) => b.ts - a.ts);
    if (!itens.length) { box.innerHTML = '<section class="card"><p class="empty">Nada encontrado para essa busca.</p></section>'; return; }
    box.innerHTML = `<section class="card"><h2>${esc(B.q.toUpperCase())}</h2>
      <div class="stats"><div class="stat"><b>${R.visitas}</b><span>Visitas registradas</span></div><div class="stat"><b>${R.corretivas}</b><span>Corretivas</span></div><div class="stat"><b style="color:${R.reinc90 > 1 ? 'var(--bad)' : 'inherit'}">${R.reinc90}</b><span>Corretivas em 90 dias</span></div><div class="stat"><b>${R.ult ? fData(R.ult.chegada) : '—'}</b><span>Última visita</span></div></div>
      ${R.ncAbertas.length ? `<div class="warnbox small"><b>Pendências da última preventiva:</b> ${esc(R.ncAbertas.join('; '))}</div>` : ''}
      <div class="list">${itens.map(x => x.ev ? `<div class="item" style="cursor:default;align-items:flex-start;flex-wrap:wrap"><span class="badge" style="width:auto;padding:0 8px;border-radius:6px;background:${isCorr(x.ev) ? 'var(--bad)' : 'var(--accent)'};color:#fff">${fData(x.ts).slice(0, 5)}<br>${fData(x.ts).slice(6)}</span><span class="tx" style="flex:1;min-width:220px"><b>${esc(TIPO_INSP(x.ev))} · ${esc(x.ev.info.tag || (x.ev.corr || {}).ticket || '')} · ${esc(x.ev.info.tecnico || '')}</b><span style="white-space:normal">${esc(resumoInsp(x.ev))}${x.ev.info.endereco ? ' · ' + esc(x.ev.info.endereco) : ''}</span>${(x.ev.fotos || []).length ? `<div class="anx" style="margin-top:4px">${x.ev.fotos.slice(0, 4).map(f => f.path ? `<span class="anxi" style="width:72px;height:72px"><img data-anxsrc="${esc(f.path)}" alt="${esc(f.cat || 'foto')}"></span>` : '').join('')}${x.ev.fotos.length > 4 ? `<span class="muted small" style="align-self:center">+${x.ev.fotos.length - 4}</span>` : ''}</div>` : ''}</span><button type="button" class="btn" data-abpdf="${esc(x.ev.id)}" style="min-height:36px">Relatório</button><button type="button" class="btn" data-abdel="${esc(x.ev.id)}" style="min-height:36px;color:var(--bad);border-color:var(--bad)">Excluir</button>${x.ev.fo && (x.ev.fo.rows || []).some(r => r.f) && x.ev.cabos ? `<button type="button" class="btn" data-abmapa="${esc(x.ev.id)}" style="min-height:36px">Mapa de fusão</button>` : ''}</div>`
        : `<div class="item" style="cursor:default;align-items:flex-start"><span class="badge" style="width:auto;padding:0 8px;border-radius:6px;background:var(--surface-2);color:var(--ink)">${fData(x.ts).slice(0, 5)}<br>${fData(x.ts).slice(6)}</span><span class="tx"><b>${x.viz ? '📍 Perto (até 200 m) · ' : ''}O.S. ${esc(x.atv.ticket || '')} · ${esc(stAtv(x.atv))}${x.atv.log > 1 ? ' · LOG ' + x.atv.log : ''}</b><span style="white-space:normal">${esc([x.atv.ocorrencia, x.atv.node && 'Node ' + x.atv.node, x.atv.endereco, x.atv.tecnicoNome].filter(Boolean).join(' · '))}</span></span></div>`).join('')}</div></section>`;
    pintaAnexos(box);
    $$('[data-abmapa]', box).forEach(b => b.onclick = () => { const i = evs.find(e => e.id === b.dataset.abmapa); if (i) abrirPlano(i, { onSalvo: () => busca() }); });
    $$('[data-abdel]', box).forEach(b => b.onclick = async () => { const i = evs.find(e => e.id === b.dataset.abdel); if (!i) return; const ref = (i.corr && i.corr.ticket) || i.info.tag || i.id;
      if (!confirmaExcluir(`Excluir o registro executado ${TIPO_INSP(i)} ${ref} de ${fData(i.chegada)} (${i.info.tecnico || ''})? Apaga a ficha, as fotos, o relatório e a medição dele.`)) return;
      try { await Nuvem.evApagar(i); toast('Registro excluído.'); busca(); } catch (e) { toast('Erro ao excluir: ' + (e.message || e), 7000); } });
    $$('[data-abpdf]', box).forEach(b => b.onclick = async () => { const i = evs.find(e => e.id === b.dataset.abpdf); if (!i) return; const f = await gerarPdfInsp(i); if (f) baixar(f); });
  };
  $('#bAbBusca').onclick = busca; $('#abQ').addEventListener('keydown', e => { if (e.key === 'Enter') busca(); });
  if (B.q) busca();
  $('#bLinear').onclick = () => { const e = $('#lnBox'); if (e.innerHTML) { e.innerHTML = ''; S.linAberto = false; return; } S.linAberto = true; e.innerHTML = linearHtml(); bindLinear(e); };
  if (S.linAberto) { $('#lnBox').innerHTML = linearHtml(); bindLinear($('#lnBox')); }
  $('#bEtiq').onclick = () => {
    const e = $('#etqBox'); if (e.innerHTML) { e.innerHTML = ''; return; }
    e.innerHTML = `<section class="card"><h2>Etiquetas QR para as plaquetas</h2><p class="muted small" style="margin:0">Folha A4 com 24 etiquetas (3 × 8). O técnico lê o QR na caixa e o app preenche a TAG e mostra o histórico.</p>
      <div class="grid2"><div class="field"><label class="lb" for="etPref">Prefixo</label><input type="text" id="etPref" value="${esc(tagExemplo().replace(/\d+$/, ''))}" autocapitalize="characters"></div><div class="field"><label class="lb" for="etIni">Do número</label><input type="number" id="etIni" value="1" min="0"></div><div class="field"><label class="lb" for="etFim">Até o número</label><input type="number" id="etFim" value="24" min="0"></div><div class="field"><label class="lb" for="etDig">Dígitos</label><input type="number" id="etDig" value="4" min="1" max="8"></div>
      <div class="field full"><label class="lb" for="etLista">Ou cole as TAGs (uma por linha)</label><textarea id="etLista" rows="3" placeholder="CE-BKB-0012&#10;CE-BKB-0013"></textarea></div></div>
      <button type="button" class="btn pri" id="bEtGera">Gerar PDF das etiquetas</button></section>`;
    $('#bEtGera').onclick = async () => {
      let tags = $('#etLista').value.split(/\r?\n/).map(x => x.trim().toUpperCase()).filter(Boolean);
      if (!tags.length) { const a = +$('#etIni').value, z = +$('#etFim').value, d = +$('#etDig').value || 4, p = $('#etPref').value.trim().toUpperCase(); if (!(z >= a) || z - a > 600) { toast('Confira a faixa de números (até 600 etiquetas).'); return; } for (let n = a; n <= z; n++) tags.push(p + String(n).padStart(d, '0')); }
      try { const f = await pdfEtiquetas(tags); if (f) baixar(f); } catch (er) { toast('Erro: ' + (er.message || er), 6000); }
    };
  };
}
async function pdfEtiquetas(tags) {
  if (!window.qrcode) await carregaScript('qrcode.min.js');
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 63.5, H = 33.9, mx = 7.2, my = 12.9;
  tags.forEach((t, k) => {
    const pos = k % 24; if (k && !pos) doc.addPage(); const c = pos % 3, r = Math.floor(pos / 3); const x = mx + c * W, y = my + r * H;
    doc.setDrawColor(210); doc.setLineWidth(0.1); doc.rect(x + 1, y + 1, W - 2, H - 2);
    const qr = qrcode(0, 'M'); qr.addData(t); qr.make(); const n = qr.getModuleCount(), lado = 26, cel = lado / n, qx = x + 3, qy = y + (H - lado) / 2;
    doc.setFillColor(0, 0, 0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (qr.isDark(i, j)) doc.rect(qx + j * cel, qy + i * cel, cel + 0.02, cel + 0.02, 'F');
    doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.setFontSize(t.length > 12 ? 9 : 11); doc.text(t, x + 32, y + 15, { maxWidth: W - 34 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(90); doc.text('Multivale · Técnico Plus', x + 32, y + 21); doc.text('Caixa de emenda óptica', x + 32, y + 25);
  });
  return new File([doc.output('blob')], `Etiquetas_QR_${tags[0]}_a_${tags[tags.length - 1]}.pdf`, { type: 'application/pdf' });
}


/* ============================ backup do banco e uso do armazenamento (v54) ============================ */
// tabelas copiadas no backup (fica de fora o que é temporário ou só técnico: posição ao vivo, inscrições de push, tentativas de login)
const BACKUP_TABS = [['atividades', 'id'], ['eventos', 'id'], ['rondas', 'id'], ['fotos_rede', 'id'], ['tecnicos', 'uid'], ['cadastros', 'id'], ['rh_dados', 'cad_id'], ['recursos', 'uid'], ['treinamentos', 'id'], ['expedientes', 'id'], ['abastecimentos', 'id'], ['plantoes', 'id'], ['escada', 'uid'], ['sos', 'id'],
  ['pedidos', 'id'], ['ped_msgs', 'id'], ['medicoes', 'id'], ['os_medidas', 'id'], ['bonus', 'id'], ['projetos', 'id'], ['proj_lanc', 'id'], ['materiais', 'id'], ['mat_mov', 'id'], ['mat_requisicoes', 'id'], ['equipamentos', 'id'], ['equip_mov', 'id'],
  ['rotas', 'id'], ['fiber_book', 'id'], ['metas', 'org'], ['config', 'org'], ['admins', 'uid'], ['despachantes', 'uid'], ['noc', 'uid'], ['parceiros', 'uid'], ['acionamentos_historico', 'mes']];
const PLANO = { banco: 500 * 1048576, fotos: 1024 * 1048576 };
const fMB = b => (b / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: b < 10 * 1048576 ? 1 : 0 }) + ' MB';
const diasDesde = ts => ts ? Math.floor((Date.now() - ts) / 86400000) : null;
function ultBackup() { const l = (S.cfg || {}).backups || []; return l.length ? l[l.length - 1] : null; }
async function usoArmazenamento() { const r = await Nuvem.sb.rpc('uso_armazenamento', { p_org: Nuvem.org() }); if (r.error) throw r.error; S.uso = { ...r.data, t: Date.now() }; return S.uso; }
// avisa no login: backup atrasado (mais de 7 dias) ou plano perto de lotar
async function lembraBackup() {
  if (RESTRITO || ehAlmox() || S.lembrouBackup) return; S.lembrouBackup = true;
  try { if (!S.cfg) S.cfg = await Nuvem.cfgLer(); } catch (e) {}
  const u = ultBackup(); const ua = ((S.cfg || {}).backupsAuto || []).slice(-1)[0]; const d = u ? diasDesde(u.em) : null; const da = ua ? diasDesde(ua.em) : null; let msg = '';
  try { const x = await usoArmazenamento(); const pb = x.banco_bytes / PLANO.banco, pf = x.fotos_bytes / PLANO.fotos; if (Math.max(pb, pf) >= 0.8) msg = `Armazenamento em ${Math.round(Math.max(pb, pf) * 100)}% do plano grátis (${pf >= pb ? 'fotos' : 'banco'}). Veja em menu > Backup e armazenamento.`; } catch (e) {}
  if (!msg && da != null && da <= 8) { if (d == null || d > 35) msg = `Backup automático em dia. Uma vez por mês, baixe uma cópia e guarde no Drive: menu > Backup e armazenamento.`; }
  else if (!msg && (d == null || d > 7)) msg = da != null ? `O backup automático não roda há ${da} dias. Baixe um backup manual: menu > Backup e armazenamento.` : d == null ? 'Nenhum backup do banco feito ainda. Menu > Backup e armazenamento.' : `Último backup do banco há ${d} dias. Faça o backup semanal: menu > Backup e armazenamento.`;
  if (msg) setTimeout(() => toast(msg, 9000), 3500);
}
function viewAdmBackup() {
  return `<section class="card"><h2>Uso do plano (Supabase grátis)</h2><div id="bkUso"><p class="muted small" style="margin:0">Carregando…</p></div></section>
    <section class="card"><h2>Backup do banco</h2><div id="bkBox"></div></section>
    <section class="card"><h2>Fotos</h2><p class="muted small" style="margin:0">As fotos são a maior parte do espaço. No fim de cada período, baixe as fotos em .zip, guarde no Google Drive ou OneDrive e libere o espaço no Supabase.</p><button type="button" class="btn" id="bkFotos">Arquivar fotos do período (Medição)</button></section>`;
}
async function afterAdmBackup() {
  const barra = (lb, v, max) => { const p = Math.min(1, v / max); const cor = p >= 0.95 ? 'var(--bad)' : p >= 0.8 ? '#b26a00' : 'var(--accent)'; return `<div style="margin:6px 0"><div class="row" style="justify-content:space-between"><b>${lb}</b><span><b style="color:${cor}">${Math.round(p * 100)}%</b> · ${fMB(v)} de ${fMB(max)}</span></div><div role="meter" aria-label="${esc(lb)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p * 100)}" style="height:10px;border-radius:999px;background:var(--surface-2);overflow:hidden;border:1px solid var(--line)"><div style="height:100%;width:${(p * 100).toFixed(1)}%;background:${cor};border-radius:999px"></div></div></div>`; };
  try { const u = await usoArmazenamento(); $('#bkUso').innerHTML = barra('Banco de dados', u.banco_bytes, PLANO.banco) + barra(`Fotos (${(u.fotos_n || 0).toLocaleString('pt-BR')} arquivos)`, u.fotos_bytes, PLANO.fotos) + `<p class="muted small" style="margin:0">Acima de 80% o painel avisa no login. Se lotar, o app para de subir fotos: arquive as fotos antigas ou mude para o plano pago.</p>`; }
  catch (e) { $('#bkUso').innerHTML = `<div class="warnbox">Não foi possível ler o uso: ${esc(e.message || e)}. Rode o supabase.sql novo (v54).</div>`; }
  $('#bkFotos').onclick = () => { S.medAba = S.medAba || 'lotes'; go('admMed'); setTimeout(() => { const b = $('#faBox'); b && b.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 600); };
  const pinta = () => { const L = ((S.cfg || {}).backups || []).slice().reverse(); const u = L[0]; const d = u ? diasDesde(u.em) : null;
    const A = ((S.cfg || {}).backupsAuto || []).slice().reverse(); const ua = A[0]; const da = ua ? diasDesde(ua.em) : null;
    $('#bkBox').innerHTML = `<h3 style="margin-top:0">Backup automático (toda semana)</h3><p class="muted small" style="margin:0">O servidor grava sozinho uma cópia de todas as tabelas uma vez por semana e guarda as 8 últimas no armazenamento privado. Uma vez por mês, baixe a mais recente e guarde no Drive: assim você tem uma cópia fora do Supabase.</p>
      ${ua ? `<div class="${da > 8 ? 'warnbox' : 'okbox'}">Último automático: <b>${fDH(ua.em)}</b> (${da === 0 ? 'hoje' : da === 1 ? 'ontem' : `há ${da} dias`}) · ${(ua.linhas || 0).toLocaleString('pt-BR')} registros · ${fMB(ua.bytes || 0)}</div><div class="list">${A.map(b => `<div class="item" style="cursor:default;align-items:center"><span class="tx"><b>${fDH(b.em)}</b><span>${(b.linhas || 0).toLocaleString('pt-BR')} registros · ${fMB(b.bytes || 0)}</span></span><button type="button" class="btn" data-bkauto="${esc(b.arquivo)}" style="margin-left:auto">Baixar</button></div>`).join('')}</div>` : '<div class="warnbox">O primeiro backup automático ainda não rodou (roda de madrugada).</div>'}
      <h3>Backup manual (.zip)</h3><p class="muted small" style="margin:0">Baixa uma cópia de todas as tabelas (O.S., técnicos, cadastros, RH, medição, materiais, equipamentos, rotas, configurações) em um arquivo .zip. Guarde no Google Drive ou OneDrive. Use quando quiser uma cópia na hora (antes de uma mudança grande, por exemplo). As fotos não entram aqui (veja abaixo).</p>
      ${u ? `<div class="${d > 7 ? 'warnbox' : 'okbox'}">Último backup: <b>${fDH(u.em)}</b> (${d === 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`}) por ${esc(u.por || '—')} · ${(u.linhas || 0).toLocaleString('pt-BR')} registros · ${fMB(u.bytes || 0)}</div>` : ua && da <= 8 ? '<p class="muted small" style="margin:0">Opcional enquanto o automático estiver em dia.</p>' : '<div class="warnbox">Nenhum backup feito ainda.</div>'}
      <button type="button" class="btn pri" id="bkGerar">Baixar backup completo (.zip)</button><div class="muted small" id="bkProg"></div>
      ${L.length > 1 ? `<h3>Anteriores</h3><div class="list">${L.slice(1, 8).map(b => `<div class="item" style="cursor:default"><span class="tx"><b>${fDH(b.em)}</b><span>${esc(b.por || '')} · ${(b.linhas || 0).toLocaleString('pt-BR')} registros · ${fMB(b.bytes || 0)}${b.falhas ? ` · ${b.falhas} tabela(s) com erro` : ''}</span></span></div>`).join('')}</div>` : ''}`;
    $('#bkGerar').onclick = gerarBackup;
    $$('[data-bkauto]').forEach(b => b.onclick = async () => { b.disabled = true; try { const { data, error } = await Nuvem.sb.storage.from('backups').download(b.dataset.bkauto); if (error) throw error; baixar(new File([data], 'Backup_auto_TecnicoPlus_' + b.dataset.bkauto, { type: 'application/gzip' })); toast('Backup baixado (.json.gz). Guarde no Google Drive ou OneDrive.', 6000); } catch (e) { toast('Não foi possível baixar: ' + (e.message || e), 6000); } b.disabled = false; }); };
  try { S.cfg = await Nuvem.cfgLer(); } catch (e) {}
  pinta();
  async function gerarBackup() {
    const b = $('#bkGerar'); b.disabled = true; const prog = t => { const e = $('#bkProg'); if (e) e.textContent = t; };
    const enc = new TextEncoder(); const files = []; const resumo = []; let linhas = 0, falhas = 0;
    try {
      for (const [k, [t, pk]] of BACKUP_TABS.entries()) { prog(`Copiando ${t} (${k + 1} de ${BACKUP_TABS.length})…`);
        let rows; try { rows = await Nuvem.todos(() => Nuvem.tab(t).select('*').order(pk)); } catch (e) { try { rows = await Nuvem.todos(() => Nuvem.tab(t).select('*')); } catch (e2) { falhas++; resumo.push(`${t}: ERRO (${e2.message || e2})`); continue; } }
        linhas += rows.length; resumo.push(`${t}: ${rows.length}`); files.push({ name: `tabelas/${t}.json`, data: enc.encode(JSON.stringify(rows)) }); }
      const quando = new Date(); const nome = `Backup_TecnicoPlus_${isoDate(+quando)}_${pad2(quando.getHours())}${pad2(quando.getMinutes())}.zip`;
      files.unshift({ name: 'LEIA-ME.txt', data: enc.encode(`Backup do banco · Técnico Plus - Multivale\r\nGerado em ${fDH(+quando)} por ${(Nuvem.admin || {}).nome || ''} (${Nuvem.org()})\r\n\r\nUm arquivo JSON por tabela (pasta "tabelas"), com todas as linhas que o seu login enxerga.\r\nPara restaurar: cada JSON vira um comando SQL de importação na tabela de mesmo nome (peça ao responsável pelo sistema; o Claude gera esse SQL a partir deste arquivo).\r\nAs fotos não estão aqui: use "Arquivar fotos do período" na Medição.\r\n\r\nRegistros por tabela:\r\n${resumo.join('\r\n')}\r\n`) });
      prog('Compactando…'); const arq = await zipArq(nome, files); const blob = arq; baixar(arq);
      const reg = { em: +quando, por: (Nuvem.admin || {}).nome || '', linhas, bytes: blob.size || 0, falhas };
      S.cfg = { ...(S.cfg || {}), backups: [...((S.cfg || {}).backups || []), reg].slice(-30) }; try { await Nuvem.cfgSalvar(S.cfg); } catch (e) { console.warn(e); }
      prog(`${nome}: ${linhas.toLocaleString('pt-BR')} registros${falhas ? ` · ${falhas} tabela(s) não copiadas (veja o LEIA-ME)` : ''}. Guarde no Drive.`); toast('Backup baixado. Guarde o arquivo no Google Drive ou OneDrive.', 6000); pinta(); prog(`${nome}: ${linhas.toLocaleString('pt-BR')} registros${falhas ? ` · ${falhas} tabela(s) com erro` : ''}.`);
    } catch (e) { toast('Erro no backup: ' + (e.message || e), 7000); b.disabled = false; }
  }
}
