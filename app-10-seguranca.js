// Técnico Plus - Multivale · APR, EPI, treinamentos, SOS, escada, bônus, fotos e cluster
// Os arquivos app-*.js carregam em ordem (ver index.html) e compartilham o mesmo escopo global.
'use strict';
/* ============================ segurança do trabalho: APR, EPI, treinamentos e SOS ============================ */
const TREINOS = { 'NR-10': { m: 24, d: 'Eletricidade (proximidade da rede elétrica)' }, 'NR-10 SEP': { m: 24, d: 'Sistema elétrico de potência' }, 'NR-35': { m: 24, d: 'Trabalho em altura' }, 'NR-33': { m: 12, d: 'Espaço confinado' }, 'NR-12': { m: 24, d: 'Máquinas e equipamentos' }, 'ASO': { m: 12, d: 'Atestado de saúde ocupacional' }, 'Direção defensiva': { m: 36, d: '' }, 'Primeiros socorros': { m: 24, d: '' } };
const RISCOS = [['altura', 'Trabalho em altura (poste ou escada)', 'NR-35', ['Capacete com jugular', 'Cinto paraquedista e talabarte']], ['eletrica', 'Proximidade da rede elétrica', 'NR-10', ['Luvas', 'Detector de tensão']], ['confinado', 'Espaço confinado (caixa subterrânea)', 'NR-33', ['Detector de gases']], ['transito', 'Via pública / trânsito', null, ['Colete refletivo', 'Cones e sinalização']], ['animais', 'Animais peçonhentos / mato', null, ['Botina', 'Perneira']], ['fibra', 'Fibra óptica / ferramentas cortantes', null, ['Óculos de proteção', 'Luvas']], ['clima', 'Chuva, raios ou calor intenso', null, []]];
const EPIS = ['Capacete com jugular', 'Cinto paraquedista e talabarte', 'Luvas', 'Óculos de proteção', 'Botina', 'Perneira', 'Colete refletivo', 'Cones e sinalização', 'Detector de tensão', 'Detector de gases'];
// validade: a informada ou emissão + período padrão do treinamento
function validadeTreino(t) { if (t.validade) return t.validade; if (!t.emitido) return null; const d = new Date(diaIni(t.emitido) + 43200000); d.setMonth(d.getMonth() + ((TREINOS[t.tipo] || {}).m || 24)); return isoDate(+d); }
function statusTreino(t, hoje = isoDate(Date.now())) { const v = validadeTreino(t); if (!v) return { st: 'sem', v }; if (v < hoje) return { st: 'vencido', v }; const dias = Math.round((diaIni(v) - diaIni(hoje)) / 86400000); return { st: dias <= 30 ? 'vence' : 'ok', v, dias }; }
// melhor treinamento válido de um tipo para um técnico
function treinoValido(lista, tipo) { const l = (lista || []).filter(t => t.tipo === tipo).map(t => ({ t, s: statusTreino(t) })).sort((a, b) => String(b.s.v).localeCompare(String(a.s.v))); return l[0] || null; }
const ST_TR = { ok: ['ok', 'em dia'], vence: ['draft', 'vence em breve'], vencido: ['bad', 'vencido'], sem: ['', 'sem validade'] };
// ---------- celular: APR antes de começar no local ----------
function aprNecessaria() { const r = S.ronda; return !!(!window.__semAPR && r && !r.fim && !r.apr && !isVist(r)); }
function abrirAPR(depois) {
  const el = $('#atvAlerta'); if (!el) { depois(); return; } S.alertaId = 'aviso:apr'; const A = S.aprRasc = S.aprRasc || { riscos: [], epis: [], obs: '', foto: null };
  const pinta = () => {
    const obrig = [...new Set(A.riscos.flatMap(k => (RISCOS.find(r => r[0] === k) || [])[3] || []))];
    const nrsP = [...new Set(A.riscos.map(k => (RISCOS.find(r => r[0] === k) || [])[2]).filter(Boolean))];
    el.innerHTML = `<div class="box" role="alertdialog" aria-modal="true" aria-labelledby="aprT"><div class="topo prev"><small>SEGURANÇA · ANTES DE COMEÇAR</small><b id="aprT">Análise preliminar de risco (APR)</b><span>${esc(S.ronda.ticket || tipoLb(S.ronda))}</span></div>
      <div class="corpo"><span class="lb">Riscos deste serviço</span><div class="list" style="gap:4px">${RISCOS.map(([k, lb, nr]) => `<label style="display:flex;flex-wrap:nowrap;gap:10px;align-items:center;min-height:40px"><input type="checkbox" data-aprr="${k}" ${A.riscos.includes(k) ? 'checked' : ''} style="flex:0 0 22px;width:22px;height:22px;margin:0"> <span>${esc(lb)}${nr ? ` <span class="muted small" style="white-space:nowrap">(${nr})</span>` : ''}</span></label>`).join('')}</div>
      ${nrsP.length ? `<div class="okbox small" style="margin:0">${ICON.check} <b>Treinamentos em dia:</b> ${nrsP.map(nr => { const v = treinoValido(S.meusTreinos, nr); return esc(nr) + (v && v.s.v ? ` (até ${fDM(v.s.v)})` : ''); }).join(', ')} · OK</div>` : ''}
      <span class="lb">EPIs em uso</span><div class="chips" style="flex-wrap:wrap">${EPIS.map(e => `<button type="button" role="checkbox" data-apre="${esc(e)}" aria-checked="${A.epis.includes(e)}" style="${obrig.includes(e) && !A.epis.includes(e) ? 'border-color:var(--bad)' : ''}">${esc(e)}${obrig.includes(e) ? ' *' : ''}</button>`).join('')}</div>
      ${obrig.length ? `<p class="muted small" style="margin:0">* obrigatório para os riscos marcados.</p>` : ''}
      <div class="field"><label class="lb" for="aprObs">Medidas de controle / observações</label><textarea id="aprObs" rows="2" placeholder="Ex.: área isolada com cones, escada amarrada no poste">${esc(A.obs)}</textarea></div>
      <button type="button" class="btn ${A.foto ? '' : 'pri'} block" id="aprFoto">${ICON.cam}${A.foto ? 'Foto com EPI registrada ✓ (trocar)' : 'Foto da equipe com EPI'}</button>
      <button type="button" class="btn go block" id="aprOk">${ICON.check}Avaliei os riscos · começar</button><button type="button" class="btn block" id="aprCanc">Voltar</button></div></div>`;
    el.hidden = false;
    $$('[data-aprr]', el).forEach(c => c.onchange = () => { A.riscos = $$('[data-aprr]', el).filter(x => x.checked).map(x => x.dataset.aprr); A.obs = $('#aprObs').value; pinta(); });
    $$('[data-apre]', el).forEach(b => b.onclick = () => { const e = b.dataset.apre; A.epis = A.epis.includes(e) ? A.epis.filter(x => x !== e) : [...A.epis, e]; A.obs = $('#aprObs').value; pinta(); });
    $('#aprObs').oninput = e => { A.obs = e.target.value; };
    $('#aprFoto').onclick = () => { A.obs = $('#aprObs').value; S.fotoMode = 'apr'; S.aprVolta = () => { abrirAPR(depois); }; $('#fileCam').click(); };
    $('#aprCanc').onclick = () => { fechaAlerta(); };
    $('#aprOk').onclick = async () => {
      A.obs = $('#aprObs').value; if (!A.riscos.length) { toast('Marque os riscos do serviço (ou "Fibra óptica / ferramentas cortantes", no mínimo).'); return; }
      const falta = obrig.filter(e => !A.epis.includes(e)); if (falta.length) { toast('Sem EPI obrigatório: ' + falta.join(', ') + '.', 7000); return; }
      // treinamentos obrigatórios em dia
      const nrs = [...new Set(A.riscos.map(k => (RISCOS.find(r => r[0] === k) || [])[2]).filter(Boolean))];
      // por padrão todo colaborador está habilitado (NR em dia); só bloqueia se houver certificado cadastrado e vencido
      const bloq = nrs.filter(nr => { const v = treinoValido(S.meusTreinos, nr); return !!(v && v.s.st === 'vencido'); });
      if (bloq.length) { S.ronda.aprBloqueio = { ts: Date.now(), nrs: bloq }; saveRonda(true); el.querySelector('.corpo').insertAdjacentHTML('afterbegin', `<div class="warnbox" style="border-color:var(--bad);background:var(--bad-soft)"><b>Bloqueado:</b> você não tem ${bloq.join(' e ')} em dia (${bloq.map(nr => { const v = treinoValido(S.meusTreinos, nr); return v && v.s.v ? `${nr} venceu em ${fDM(v.s.v)}` : `${nr} não cadastrada`; }).join('; ')}). Não execute essa parte do serviço e avise o supervisor.</div>`); el.querySelector('.box').scrollTop = 0; return; }
      if (!A.foto) { toast('Tire a foto da equipe com o EPI.'); return; }
      const loc = S.gps.last; S.ronda.apr = { ts: Date.now(), riscos: A.riscos, epis: A.epis, obs: A.obs.trim(), foto: A.foto, lat: loc && loc.lat, lon: loc && loc.lon, tecnico: S.perfil.nome, nrs: nrs.map(nr => { const v = treinoValido(S.meusTreinos, nr); return { nr, ok: true, validade: (v && v.s.v) || null, padrao: !(v && v.s.v) }; }) };
      saveRonda(true); S.aprRasc = null; fechaAlerta(); toast('APR registrada. Bom trabalho, com segurança!'); depois();
    };
  };
  pinta();
}
// ---------- celular: SOS ----------
function sosHtml() {
  if (ADMIN || !S.exp) return '';
  return `<button type="button" class="sosbtn" id="bSos" aria-label="Emergência: enviar SOS">SOS</button>`;
}
async function enviarSOS() {
  const el = $('#atvAlerta'); if (!el) return; S.alertaId = 'aviso:sos';
  el.innerHTML = `<div class="box" role="alertdialog" aria-modal="true" aria-labelledby="sosT"><div class="topo"><small>EMERGÊNCIA</small><b id="sosT">Enviar SOS?</b><span>O supervisor e o NOC recebem na hora, com a sua localização.</span></div>
    <div class="corpo"><textarea id="sosTxt" rows="2" placeholder="O que aconteceu? (opcional)"></textarea><button type="button" class="btn stop block" id="sosEnv" style="background:var(--bad);color:#fff;border-color:var(--bad)">Enviar SOS agora</button>
    <div class="row" style="gap:8px"><a class="btn" href="tel:192" style="flex:1;text-decoration:none">Ligar 192 (SAMU)</a><a class="btn" href="tel:193" style="flex:1;text-decoration:none">Ligar 193 (Bombeiros)</a></div><button type="button" class="btn block" id="sosCanc">Cancelar</button></div></div>`;
  el.hidden = false;
  $('#sosCanc').onclick = () => fechaAlerta();
  $('#sosEnv').onclick = async () => {
    const loc = S.gps.last || await posAtual(8000); const s = { id: 'sos_' + uid(), org: Nuvem.org(), uid: Nuvem.user && Nuvem.user.id, nome: S.perfil.nome, ts: Date.now(), lat: loc && loc.lat, lon: loc && loc.lon, texto: ($('#sosTxt').value || '').trim(), status: 'aberto' };
    try { await Nuvem.sosCriar(s); fechaAlerta(); toast('SOS enviado. O supervisor e o NOC foram avisados. Se puder, ligue também.', 9000); try { navigator.vibrate && navigator.vibrate([500, 200, 500]); } catch (e) {} }
    catch (e) { toast('Sem internet: ligue 192/193 ou para o supervisor.', 9000); }
  };
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#bSos'); if (b) enviarSOS(); });
// ---------- painel e NOC: SOS em tempo real ----------
function sosOuvir(depois) {
  if (S.unSos || !Nuvem.on) return; S.sosMap = S.sosMap || new Map();
  Nuvem.sosAbertos().then(l => { l.forEach(x => S.sosMap.set(x.id, x)); depois && depois(); }).catch(() => {});
  S.unSos = Nuvem.canal('sos', 'sos', (t, row) => { if (!row || !row.id) return; const novo = !S.sosMap.has(row.id) && row.status === 'aberto'; if (row.status === 'aberto') S.sosMap.set(row.id, row); else S.sosMap.delete(row.id);
    if (novo) { toast(row.tipo === 'escada' ? `🪜 ${row.nome || 'Técnico'} não respondeu ao alarme do modo escada!` : `🆘 SOS de ${row.nome || 'técnico'}!`, 12000); try { Alarme.destrava(); Alarme.bip(); setTimeout(() => Alarme.bip(), 1300); if ('Notification' in window && Notification.permission === 'granted') new Notification('🆘 SOS de ' + (row.nome || 'técnico'), { body: row.texto || 'Toque para ver a localização', tag: 'sos-' + row.id, requireInteraction: true }); } catch (e) {} }
    depois && depois(); });
}
function sosBanners() { return [...(S.sosMap || new Map()).values()].filter(x => x.status === 'aberto').map(x => `<div class="banner" style="background:var(--bad);color:#fff"><span>${x.tipo === 'escada' ? '🪜 <b>Modo escada: ' + esc(x.nome || 'técnico') + ' não respondeu</b>' : '🆘 <b>SOS de ' + esc(x.nome || 'técnico') + '</b>'} às ${fHora(x.ts)}${x.texto ? ' · ' + esc(x.texto) : ''}${x.lat != null ? ` · <a href="https://maps.google.com/?q=${x.lat},${x.lon}" target="_blank" rel="noopener" style="color:#fff;text-decoration:underline">ver no mapa</a>` : ' · sem GPS'}</span><button type="button" class="btn" data-sosok="${esc(x.id)}" style="min-height:36px">Atendido</button></div>`).join(''); }
document.addEventListener('click', async e => { const b = e.target.closest && e.target.closest('[data-sosok]'); if (!b) return; if (!confirm('Marcar o SOS como atendido?')) return; try { await Nuvem.sosAtender(b.dataset.sosok); S.sosMap.delete(b.dataset.sosok); if (S.view === 'noc') render(); else pintaLimites(); } catch (x) { toast('Erro: ' + (x.message || x)); } });
// ---------- painel: treinamentos vencendo ----------
function treinosAvisos() {
  const L = S.treinosTodos || []; const por = new Map(); L.forEach(t => { const s = statusTreino(t); if (s.st === 'vencido' || s.st === 'vence') { const k = t.uid + '|' + t.tipo; const ant = por.get(k); if (!ant || String(s.v) > String(ant.s.v)) por.set(k, { t, s }); } });
  // se o técnico já tem um mais novo em dia do mesmo tipo, não avisa
  return [...por.values()].filter(x => { const v = treinoValido(L.filter(t => t.uid === x.t.uid), x.t.tipo); return v && v.s.st !== 'ok'; });
}
function treinoListaHtml(uidT) {
  const L = (S.treinosTodos || []).filter(t => t.uid === uidT).sort((a, b) => a.tipo.localeCompare(b.tipo));
  return `<h3>Treinamentos e ASO</h3><div class="list">${L.map(t => { const s = statusTreino(t); const [c, l] = ST_TR[s.st]; return `<div class="item" style="cursor:default;align-items:center"><span class="tx"><b>${esc(t.tipo)}</b><span>${t.emitido ? 'emitido ' + fDM(t.emitido) + ' · ' : ''}${s.v ? 'válido até ' + fDM(s.v) : 'sem validade'}${t.arquivo ? ' · <button type="button" class="lnk" data-trarq="' + esc(t.arquivo) + '">certificado</button>' : ''}</span></span><span class="pill ${c}">${l}</span><button type="button" class="lnk" data-trdel="${esc(t.id)}">Excluir</button></div>`; }).join('') || '<p class="muted small">Nenhum treinamento cadastrado.</p>'}</div>
    <div class="grid2"><div class="field"><label class="lb" for="trTipo">Treinamento</label><select id="trTipo">${Object.entries(TREINOS).map(([k, v]) => `<option value="${k}">${k}${v.d ? ' · ' + v.d : ''}</option>`).join('')}</select></div><div class="field"><label class="lb" for="trEmi">Emitido em</label><input type="date" id="trEmi"></div><div class="field"><label class="lb" for="trVal">Válido até (vazio = automático)</label><input type="date" id="trVal"></div><div class="field"><label class="lb" for="trArq">Certificado (foto ou PDF, opcional)</label><input type="file" id="trArq" accept="image/*,application/pdf"></div></div>
    <button type="button" class="btn" id="bTrAdd">${ICON.plus}Adicionar treinamento</button>`;
}
function bindTreinos(uidT, depois) {
  $$('[data-trarq]').forEach(b => b.onclick = async () => { const bl = await fotoBlob({ path: b.dataset.trarq }); if (bl) window.open(URL.createObjectURL(bl), '_blank'); else toast('Arquivo indisponível.'); });
  $$('[data-trdel]').forEach(b => b.onclick = async () => { if (!confirm('Excluir este treinamento?')) return; try { await Nuvem.treinoApagar(b.dataset.trdel); S.treinosTodos = (S.treinosTodos || []).filter(t => t.id !== b.dataset.trdel); depois(); } catch (e) { toast('Erro: ' + (e.message || e)); } });
  $('#bTrAdd') && ($('#bTrAdd').onclick = async () => {
    const emi = $('#trEmi').value, val = $('#trVal').value; if (!emi && !val) { toast('Informe a data de emissão ou a validade.'); return; }
    const t = { id: 'tr_' + uid(), org: Nuvem.org(), uid: uidT, tipo: $('#trTipo').value, emitido: emi || null, validade: val || null, arquivo: null, obs: null, atualizado: Date.now() };
    const f = $('#trArq').files[0];
    try { if (f) { const path = `${Nuvem.org()}/treinamentos/${uidT}/${t.id}${/pdf/i.test(f.type) ? '.pdf' : '.jpg'}`; const body = /pdf/i.test(f.type) ? f : (await reduzImagem(f)).blob; const up = await Nuvem.sb.storage.from(Nuvem.BUCKET).upload(path, body, { contentType: /pdf/i.test(f.type) ? 'application/pdf' : 'image/jpeg', upsert: true }); if (up.error) throw up.error; t.arquivo = path; }
      await Nuvem.treinoSalvar(t); S.treinosTodos = [...(S.treinosTodos || []), t]; toast('Treinamento salvo.'); depois(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); }
  });
}
// ---------- celular: meus treinamentos (no perfil) ----------
function meusTreinosHtml() {
  const L = S.meusTreinos || []; if (!L.length) return '';
  return `<section class="card"><h2>Meus treinamentos</h2><div class="list">${L.map(t => { const s = statusTreino(t); const [c, l] = ST_TR[s.st]; return `<div class="item" style="cursor:default;align-items:center"><span class="tx"><b>${esc(t.tipo)}</b><span>${s.v ? 'válido até ' + fDM(s.v) : 'sem validade'}</span></span><span class="pill ${c}">${l}</span></div>`; }).join('')}</div></section>`;
}

async function carregaMeusTreinos(forca) {
  if (ADMIN) return; if (!S.meusTreinos) { const m = await DB.get('meta', 'treinos'); S.meusTreinos = (m && m.lista) || []; }
  if ((forca || !S.treinosOk) && Nuvem.on && Nuvem.user && navigator.onLine) { try { S.meusTreinos = await Nuvem.treinosMeus(); S.treinosOk = true; await DB.put('meta', { id: 'treinos', lista: S.meusTreinos }); } catch (e) {} }
  return S.meusTreinos;
}
function sosFixo() {
  const quer = !ADMIN && S.exp && !S.exp.fim; let b = $('#segFixo');
  if (!quer) { if (b) b.remove(); return; }
  if (!b) { document.body.insertAdjacentHTML('beforeend', '<div id="segFixo" class="segfixo"></div>'); b = $('#segFixo'); }
  const h = escadaBtnHtml() + sosHtml(); if (b.dataset.h !== h) { b.innerHTML = h; b.dataset.h = h; }
}
function aprPdfLinhas(r) { const a = r.apr; if (!a) return r.aprBloqueio ? [['APR', 'BLOQUEADA às ' + fHora(r.aprBloqueio.ts) + ' (sem ' + r.aprBloqueio.nrs.join(', ') + ' em dia)']] : []; return [['APR', `${fHora(a.ts)} · ${a.riscos.map(k => (RISCOS.find(x => x[0] === k) || [k, k])[1]).join('; ')}`], ['EPIs', a.epis.join(', ') || '—'], ...(a.obs ? [['Medidas', a.obs]] : []), ...((a.nrs || []).length ? [['Treinamentos', a.nrs.map(x => x.nr + (x.validade ? ' em dia até ' + fDM(x.validade) : ' em dia')).join(', ') + ' · OK']] : [])]; }

/* ============================ modo escada (trabalho em altura): "você está bem?" a cada hora ============================ */
const ESC_MIN = 60, ESC_2 = 5, ESC_ALERTA = 10; // 1º alarme após 60 min; 2º alarme +5 min; sem resposta ao 2º (+10 min) → alerta ao supervisor
function escadaPrazo() { const e = S.escada; return e && e.ativo ? e.ultimo_ok + (e.intervalo_min || ESC_MIN) * 60000 : null; }
function escadaVencida() { const p = escadaPrazo(); return !!(p && Date.now() >= p); }
function escadaEstagio() { const p = escadaPrazo(); if (!p) return 0; const d = Date.now() - p; return d < 0 ? 0 : d < ESC_2 * 60000 ? 1 : d < ESC_ALERTA * 60000 ? 2 : 3; }
async function escadaGrava() { await DB.putRaw('meta', { id: 'escada', v: S.escada }); try { if (Nuvem.on && Nuvem.user) { const l = S.gps.last; await Nuvem.escadaSalvar({ uid: Nuvem.user.id, org: Nuvem.org(), nome: S.perfil.nome, ativo: !!S.escada.ativo, inicio: S.escada.inicio, ultimo_ok: S.escada.ultimo_ok, intervalo_min: S.escada.intervalo_min || ESC_MIN, lat: l ? l.lat : null, lon: l ? l.lon : null, alertado: S.escada.alertado || null, atualizado: Date.now() }); } } catch (e) { console.warn(e); } }
function escadaAtivar() {
  const el = $('#atvAlerta'); if (!el) return; S.alertaId = 'aviso:escada0';
  el.innerHTML = `<div class="box" role="alertdialog" aria-modal="true" aria-labelledby="escT"><div class="topo prev"><small>SEGURANÇA · TRABALHO EM ALTURA</small><b id="escT">Ativar o modo escada?</b><span>Para quando você for subir no poste ou na escada.</span></div>
    <div class="corpo"><p style="margin:0">A cada <b>1 hora</b> o app toca e pergunta se você está bem. Toque em <b>Estou bem</b> para confirmar.</p><p style="margin:0">Se você não responder ao <b>2º alarme</b>, o supervisor e o NOC recebem um alerta com a sua localização.</p>
    <button type="button" class="btn go block" id="escOk">🪜 Ativar modo escada</button><button type="button" class="btn block" id="escCanc">Cancelar</button></div></div>`;
  el.hidden = false; $('#escCanc').onclick = () => fechaAlerta();
  $('#escOk').onclick = async () => { Alarme.destrava(); S.escada = { ativo: true, inicio: Date.now(), ultimo_ok: Date.now(), intervalo_min: ESC_MIN, alertado: null }; fechaAlerta(); await escadaGrava(); sosFixo(); toast('Modo escada ativo. Próxima confirmação às ' + fHora(escadaPrazo()) + '.', 6000); };
}
async function escadaDesativar() { if (!S.escada) return; S.escada = { ...S.escada, ativo: false }; if (S.alertaId === 'aviso:escada') fechaAlerta(); await escadaGrava(); Alarme.revisa(); sosFixo(); }
async function escadaEstouBem() {
  const e = S.escada; if (!e || !e.ativo) return; const ant = e.ultimo_ok, alertou = e.alertado;
  S.escada = { ...e, ultimo_ok: Date.now(), alertado: null }; if (S.alertaId === 'aviso:escada') fechaAlerta(); Alarme.revisa(); await escadaGrava(); sosFixo();
  const tarde = Date.now() >= ant + ((e.intervalo_min || ESC_MIN) + ESC_ALERTA) * 60000; // o servidor pode ter avisado mesmo sem o celular saber
  if ((alertou || tarde) && Nuvem.on) { try { await Nuvem.sosCancelar(escadaSosId(ant)); } catch (x) {} }
  toast(alertou ? 'Confirmado. O alerta ao supervisor foi encerrado.' : 'Confirmado. Próxima confirmação às ' + fHora(escadaPrazo()) + '.', 5000);
}
function escadaSosId(ok) { return 'esc_' + ((Nuvem.user && Nuvem.user.id) || 'x') + '_' + ok; }
function escadaModal(est) {
  const el = $('#atvAlerta'); if (!el || (!el.hidden && S.alertaId !== 'aviso:escada')) return; if (!el.hidden && el.dataset.est === String(est)) return; S.alertaId = 'aviso:escada'; el.dataset.est = String(est);
  el.innerHTML = `<div class="box" role="alertdialog" aria-modal="true" aria-labelledby="escT2"><div class="topo toca" style="background:${est >= 2 ? 'var(--bad)' : ''}"><small>MODO ESCADA · ${est >= 3 ? 'SUPERVISOR AVISADO' : est === 2 ? '2º ALARME' : '1º ALARME'}</small><b id="escT2">Você está bem?</b><span>Última confirmação às ${fHora(S.escada.ultimo_ok)}</span></div>
    <div class="corpo">${est >= 3 ? '<p style="margin:0"><b>O supervisor e o NOC já receberam um alerta com a sua localização.</b> Confirme abaixo para encerrar o alerta.</p>' : est === 2 ? '<p style="margin:0">Se não confirmar, o supervisor será avisado em instantes.</p>' : ''}
    <button type="button" class="btn go block" id="escBem" style="min-height:64px;font-size:20px">✓ Estou bem</button><button type="button" class="btn block" id="escSos" style="color:var(--bad)">Preciso de ajuda (SOS)</button><button type="button" class="btn block" id="escDesl">Desci da escada · desativar</button></div></div>`;
  el.hidden = false;
  $('#escBem').onclick = () => escadaEstouBem();
  $('#escSos').onclick = async () => { await escadaEstouBem(); enviarSOS(); };
  $('#escDesl').onclick = async () => { await escadaEstouBem(); await escadaDesativar(); toast('Modo escada desativado.'); };
}
let escadaUltEst = 0;
async function escadaTick() {
  if (ADMIN || !S.escada || !S.escada.ativo) return; const est = escadaEstagio();
  if (est >= 1) { Alarme.revisa(); escadaModal(est); if (est !== escadaUltEst) { notificaAviso(est >= 3 ? 'Modo escada: supervisor avisado' : `Modo escada: ${est === 2 ? '2º alarme' : 'você está bem?'}`, 'Abra o app e toque em ESTOU BEM.'); } }
  if (est >= 3 && !S.escada.alertado) {
    const loc = S.gps.last || await posAtual(30000).catch(() => null); const ok = S.escada.ultimo_ok;
    const s = { id: escadaSosId(ok), org: Nuvem.org(), uid: Nuvem.user && Nuvem.user.id, nome: S.perfil.nome, ts: Date.now(), lat: loc && loc.lat, lon: loc && loc.lon, tipo: 'escada', texto: `Sem resposta ao 2º alarme do modo escada (última confirmação ${fHora(ok)})`, status: 'aberto' };
    try { await Nuvem.sosCriar(s); S.escada.alertado = Date.now(); await escadaGrava(); } catch (e) { console.warn(e); }
  }
  escadaUltEst = est; sosFixo();
}
setInterval(() => { try { escadaTick(); } catch (e) {} }, 20000);
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#bEscada'); if (!b) return; if (!S.escada || !S.escada.ativo) escadaAtivar(); else if (escadaVencida()) escadaEstouBem(); else if (confirm('Desativar o modo escada? Faça isso quando descer do poste/escada.')) escadaDesativar(); });
function escadaBtnHtml() {
  const e = S.escada; if (!e || !e.ativo) return `<button type="button" class="escbtn mini" id="bEscada" aria-label="Ativar modo escada" title="Modo escada">🪜</button>`;
  if (escadaVencida()) return `<button type="button" class="escbtn vence" id="bEscada" aria-label="Estou bem">✓ Estou bem</button>`;
  return `<button type="button" class="escbtn on" id="bEscada" aria-label="Modo escada ativo; toque para desativar">🪜 Ativo · ${fHora(escadaPrazo())}</button>`;
}

/* ============================ bônus de produção e folha por centro de custo (cluster) ============================ */
const BONUS_ST = { rascunho: ['draft', 'em definição'], aprovado: ['ok', 'aprovado'], pago: ['done', 'pago'] };
const ehGestor = () => ((Nuvem.admin || {}).papel === 'gestor');
function bonusCfg() { const m = (S.metas || {}).metas || {}; const n = (k, d) => { const v = kmNum(m[k]); return v == null ? d : v; }; return { pct: n('bonusPct', 0), imp: n('impostoPct', 25) }; }
// bônus sugerido: produção da equipe − impostos da nota fiscal (≈25%) × percentual do bônus
function bonusCalc(prod, cfg = bonusCfg()) { const imp = prod * cfg.imp / 100, liq = prod - imp; return { prod, imp, liq, bonus: liq * cfg.pct / 100 }; }
const bonusId = (de, ate, eq) => `${de}_${ate}_${eq}`.replace(/\s+/g, '');
async function pintaBonus() {
  const box = $('#bonusBox'); if (!box) return; const A = S.adm; const cfg = bonusCfg(); const G = ehGestor();
  const eqs = operacaoPorDupla().map(d => ({ nome: d.solo ? d.nome.replace(' (sem dupla)', '') : d.nome, solo: !!d.solo, prod: d.prod, uids: d.solo ? (operacaoPorTec().filter(o => o.nome + ' (sem dupla)' === d.nome).map(o => o.uid)) : ((duplas().find(x => x.nome === d.nome) || {}).uids || []) })).filter(e => e.prod > 0 && e.uids.length);
  let L = []; try { L = await Nuvem.bonusLista(A.de, A.ate); } catch (e) { box.innerHTML = `<section class="card"><h2>Bônus de produção</h2><div class="warnbox">Bônus indisponível: rode o supabase.sql novo (tabela bonus).</div></section>`; return; }
  const salvo = new Map(L.map(b => [b.equipe, b])); const nome = u => ((A.tecnicos || []).find(t => t.uid === u) || {}).nome || '—';
  const linhas = eqs.map(e => { const c = bonusCalc(e.prod, cfg); const b = salvo.get(e.nome); return { e, c, b, final: b && b.valor_final != null ? +b.valor_final : +c.bonus.toFixed(2) }; });
  const T = linhas.reduce((t, x) => ({ prod: t.prod + x.c.prod, imp: t.imp + x.c.imp, calc: t.calc + x.c.bonus, fin: t.fin + x.final }), { prod: 0, imp: 0, calc: 0, fin: 0 });
  box.innerHTML = `<section class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Bônus de produção</h2><span class="muted small">${fDM(A.de)} a ${fDM(A.ate)}</span></div>
    <p class="muted small" style="margin:0">Bônus sugerido = (produção da equipe − ${cfg.imp}% de impostos da nota fiscal) × ${cfg.pct}% . ${G ? 'Você, como gestor, define o valor final, o rateio entre os integrantes e o pagamento.' : 'O gestor define o valor final, o rateio e o pagamento.'} O valor aprovado entra no centro de custo do cluster de cada colaborador.</p>
    ${G ? `<div class="grid3"><div class="field"><label class="lb" for="bnPct">Bônus (% da produção líquida)</label><input type="text" inputmode="decimal" id="bnPct" value="${String(cfg.pct).replace('.', ',')}"></div><div class="field"><label class="lb" for="bnImp">Impostos da nota fiscal (%)</label><input type="text" inputmode="decimal" id="bnImp" value="${String(cfg.imp).replace('.', ',')}"></div><div class="field" style="justify-content:flex-end"><button type="button" class="btn" id="bnCfg">Salvar percentuais</button></div></div>` : ''}
    <div class="stats"><div class="stat"><b>${fBRL(T.prod)}</b><span>Produção</span></div><div class="stat"><b>${fBRL(T.imp)}</b><span>Impostos (${cfg.imp}%)</span></div><div class="stat"><b>${fBRL(T.calc)}</b><span>Bônus sugerido (${cfg.pct}%)</span></div><div class="stat"><b>${fBRL(T.fin)}</b><span>Valor final</span></div></div>
    ${linhas.length ? linhas.map((x, k) => { const st = (x.b && x.b.status) || 'rascunho'; const trava = !G || st === 'pago'; const rat = (x.b && x.b.rateio) || {}; const par = x.e.uids.length ? x.final / x.e.uids.length : 0;
      return `<div class="card" style="box-shadow:none;border:1px solid var(--line);gap:8px" data-bn="${k}"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><b>${esc(x.e.nome)}</b><span class="pill ${BONUS_ST[st][0]}">${BONUS_ST[st][1]}${x.b && x.b.aprovado_por ? ' · ' + esc(x.b.aprovado_por) : ''}</span></div>
        <div class="tw"><table class="t"><tbody><tr><td>Produção</td><td class="r">${fBRL(x.c.prod)}</td><td>Impostos (${cfg.imp}%)</td><td class="r">− ${fBRL(x.c.imp)}</td></tr><tr><td>Produção líquida</td><td class="r">${fBRL(x.c.liq)}</td><td>Bônus sugerido (${cfg.pct}%)</td><td class="r"><b>${fBRL(x.c.bonus)}</b></td></tr></tbody></table></div>
        <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))"><div class="field"><label class="lb">Valor final da equipe (R$)</label><input type="text" inputmode="decimal" data-bnfin value="${x.final.toFixed(2).replace('.', ',')}" ${trava ? 'disabled' : ''}></div>
        ${x.e.uids.map(u => `<div class="field"><label class="lb">${esc(nome(u))} (R$)</label><input type="text" inputmode="decimal" data-bnrat="${u}" value="${(rat[u] != null ? +rat[u] : par).toFixed(2).replace('.', ',')}" ${trava ? 'disabled' : ''}></div>`).join('')}</div>
        ${G && st !== 'pago' ? `<div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-bnigual="${k}">Dividir igual</button><button type="button" class="btn go" data-bnap="${k}">${ICON.check}${st === 'aprovado' ? 'Salvar aprovação' : 'Aprovar bônus'}</button>${st === 'aprovado' ? `<button type="button" class="btn pri" data-bnpago="${k}">Marcar como pago</button>` : ''}</div>` : ''}</div>`; }).join('') : '<p class="muted small" style="margin:0">Nenhuma equipe com produção no período.</p>'}</section>`;
  $('#bnCfg') && ($('#bnCfg').onclick = async () => { const p = kmNum($('#bnPct').value), i = kmNum($('#bnImp').value); if (p == null || i == null || p < 0 || i < 0 || i >= 100) { toast('Confira os percentuais.'); return; }
    S.metas = { ...(S.metas || {}), metas: { ...((S.metas || {}).metas || {}), bonusPct: p, impostoPct: i } }; try { await Nuvem.metasSalvar(S.metas); toast('Percentuais do bônus salvos.'); pintaBonus(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } });
  $$('[data-bnigual]', box).forEach(b => b.onclick = () => { const el = b.closest('[data-bn]'); const fin = kmNum(el.querySelector('[data-bnfin]').value) || 0; const ins = $$('[data-bnrat]', el); ins.forEach(x => x.value = (fin / ins.length).toFixed(2).replace('.', ',')); });
  const grava = async (k, status) => { const x = linhas[k]; const el = box.querySelector(`[data-bn="${k}"]`); const fin = kmNum(el.querySelector('[data-bnfin]').value); if (fin == null || fin < 0) { toast('Informe o valor final.'); return; }
    const rateio = {}; $$('[data-bnrat]', el).forEach(i => { rateio[i.dataset.bnrat] = kmNum(i.value) || 0; }); const soma = Object.values(rateio).reduce((a, v) => a + v, 0);
    if (Math.abs(soma - fin) > 0.05) { toast(`O rateio (${fBRL(soma)}) precisa somar o valor final (${fBRL(fin)}).`, 6000); return; }
    const b = { id: bonusId(A.de, A.ate, x.e.nome), org: Nuvem.org(), ciclo_de: A.de, ciclo_ate: A.ate, equipe: x.e.nome, uids: x.e.uids, producao: +x.c.prod.toFixed(2), imposto_pct: cfg.imp, bonus_pct: cfg.pct, valor_calc: +x.c.bonus.toFixed(2), valor_final: fin, rateio, status, aprovado_por: (Nuvem.admin || {}).nome || 'Gestor', aprovado_em: (x.b && x.b.aprovado_em) || Date.now(), pago_em: status === 'pago' ? Date.now() : null, atualizado: Date.now() };
    try { await Nuvem.bonusSalvar(b); toast(status === 'pago' ? `Bônus da ${x.e.nome} marcado como pago.` : `Bônus da ${x.e.nome} aprovado: ${fBRL(fin)}.`); pintaBonus(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } };
  $$('[data-bnap]', box).forEach(b => b.onclick = () => grava(+b.dataset.bnap, 'aprovado'));
  $$('[data-bnpago]', box).forEach(b => b.onclick = () => { if (confirm('Marcar este bônus como pago? Depois disso ele não pode mais ser alterado.')) grava(+b.dataset.bnpago, 'pago'); });
}
// centro de custo do colaborador: o definido no cadastro; se vazio, o cluster da ficha
function ccDe(uid, cad) { if (cad && cad.centro_custo) return cad.centro_custo; const t = (S.adm.tecnicos || []).find(x => x.uid === uid); return t ? fichaTec(t).cluster || '' : ''; }
function folhaPorCluster(de, ate, bonus) {
  const [y, m] = ate.split('-').map(Number); const f = nDias(de, ate) / diasMes(y, m - 1); const enc = (+metas().encargos || 0) / 100;
  const bon = new Map(); (bonus || []).filter(b => b.status !== 'rascunho' && b.ciclo_ate >= de && b.ciclo_ate <= ate).forEach(b => Object.entries(b.rateio || {}).forEach(([u, v]) => bon.set(u, (bon.get(u) || 0) + (+v || 0))));
  const G = new Map(); const add = (cc, linha) => { const g = G.get(cc) || { cc, L: [], fixos: 0, enc: 0, vr: 0, varr: 0, bonus: 0, total: 0 }; g.L.push(linha); ['fixos', 'enc', 'vr', 'varr', 'bonus', 'total'].forEach(k => g[k] += linha[k]); G.set(cc, g); };
  (S.cads || []).filter(c => c.ativo !== false && (+c.salario || bon.has(c.uid))).forEach(c => {
    const X = horasExtras((S.exps || []).filter(e => e.uid === c.uid), c, de, ate); const fixos = (X.fixosMes || 0) * f; const l = { nome: c.nome, cargo: cargoLb(c), fixos, enc: fixos * enc, vr: X.vrTot || 0, varr: X.variaveis || 0, bonus: bon.get(c.uid) || 0 };
    l.total = l.fixos + l.enc + l.vr + l.varr + l.bonus; add(ccDe(c.uid, c) || '', l); });
  return [...G.values()].sort((a, b) => String(a.cc).localeCompare(String(b.cc)));
}
function folhaClusterHtml(D, R) {
  const [de, ate] = R.mesCivil; const F = folhaPorCluster(de, ate, D.bonus || []); if (!F.length) return `<section class="card"><h2>Folha por centro de custo (cluster)</h2><p class="muted small" style="margin:0">Cadastre o salário em Equipe e cadastros > Horas e salário e o centro de custo de cada colaborador.</p></section>`;
  const T = F.reduce((t, g) => ({ total: t.total + g.total, bonus: t.bonus + g.bonus }), { total: 0, bonus: 0 });
  return `<section class="card"><h2>Folha por centro de custo (cluster) · ${fDM(de)} a ${fDM(ate)}</h2>
    <p class="muted small" style="margin:0">Salário + periculosidade + outros adicionais (proporcional ao período)${(+metas().encargos || 0) ? ` + ${metas().encargos}% de encargos` : ''} + VR + horas extras, noturno e DSR + bônus de produção aprovado. Cada colaborador entra no centro de custo definido no cadastro dele.</p>
    <div class="tw"><table class="t"><thead><tr><th>Centro de custo</th><th class="r">Pessoas</th><th class="r">Salários e adicionais</th><th class="r">Encargos</th><th class="r">VR</th><th class="r">Extras / noturno / DSR</th><th class="r">Bônus</th><th class="r">Total</th></tr></thead><tbody>
    ${F.map(g => `<tr><td><b>${esc(CLUSTERS[g.cc] || 'Sem centro de custo')}</b></td><td class="r">${g.L.length}</td><td class="r">${fBRL(g.fixos)}</td><td class="r">${fBRL(g.enc)}</td><td class="r">${fBRL(g.vr)}</td><td class="r">${fBRL(g.varr)}</td><td class="r">${fBRL(g.bonus)}</td><td class="r"><b>${fBRL(g.total)}</b></td></tr>`).join('')}
    <tr><td><b>Total</b></td><td></td><td></td><td></td><td></td><td></td><td class="r"><b>${fBRL(T.bonus)}</b></td><td class="r"><b>${fBRL(T.total)}</b></td></tr></tbody></table></div>
    ${F.map(g => `<details><summary class="small" style="cursor:pointer;min-height:36px;display:flex;align-items:center;color:var(--accent);font-weight:600">${esc(CLUSTERS[g.cc] || 'Sem centro de custo')} · ${g.L.length} colaborador(es)</summary><div class="tw"><table class="t"><thead><tr><th>Colaborador</th><th>Função</th><th class="r">Salários e adicionais</th><th class="r">Extras</th><th class="r">Bônus</th><th class="r">Total</th></tr></thead><tbody>${g.L.map(l => `<tr><td>${esc(l.nome)}</td><td>${esc(l.cargo)}</td><td class="r">${fBRL(l.fixos + l.enc)}</td><td class="r">${fBRL(l.varr)}</td><td class="r">${fBRL(l.bonus)}</td><td class="r">${fBRL(l.total)}</td></tr>`).join('')}</tbody></table></div></details>`).join('')}</section>`;
}

/* ============================ fotos: limpeza no celular e arquivo no fechamento ============================ */
// celular: depois de enviada para a nuvem, a foto fica guardada no aparelho só por 30 dias
async function limpaFotosLocais(dias = 30) {
  if (ADMIN) return; const hoje = isoDate(Date.now()); const m = await DB.get('meta', 'limpaFotos'); if (m && m.dia === hoje) return;
  const lim = Date.now() - dias * 86400000; let n = 0;
  for (const i of await DB.all('inspecoes')) { if (i.status !== 'concluida' || (i.saida || i.chegada || 0) > lim) continue; let mud = false; (i.fotos || []).forEach(f => { if (f.path && f.blob) { delete f.blob; mud = true; n++; } }); if (mud) await DB.putRaw('inspecoes', i); }
  for (const f of await DB.all('fotos')) { if (f.path && f.blob && (f.ts || 0) < lim) { delete f.blob; await DB.putRaw('fotos', f); n++; } }
  await DB.putRaw('meta', { id: 'limpaFotos', dia: hoje, n }); if (n) console.info(`Técnico Plus: ${n} foto(s) antigas já enviadas saíram do celular.`);
}
// painel: backup das fotos do período (.zip por cluster e O.S.) para guardar no Google Drive / OneDrive e liberar o Supabase
const FOTOS_POR_ZIP = 500;
function fotosDoPeriodo(de, ate) {
  const a0 = diaIni(de), a1 = diaFim(ate); const out = []; const slug = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'sem';
  const clu = uid => { const c = (S.cads || []).find(x => x.uid === uid); const k = ccDe(uid, c); return slug(CLUSTERS[k] || 'Sem cluster'); };
  const cluI = i => { const k = clusterOS(i, i._uid); return k ? slug(CLUSTERS[k]) : clu(i._uid); };
  [...DB.mem.inspecoes.values()].filter(i => (i.chegada || i.criado) >= a0 && (i.chegada || i.criado) <= a1).forEach(i => { const pasta = `${cluI(i)}/${isoDate(i.chegada || i.criado)}_${slug(osRef(i))}_${slug(tipoLb(i))}`;
    (i.fotos || []).forEach((f, k) => { if (f.path && !f.arquivado) out.push({ path: f.path, nome: `${pasta}/${String(k + 1).padStart(2, '0')}_${slug(f.cat)}.jpg`, ev: i.id, k, os: osRef(i), tec: i.info.tecnico || '', cat: f.cat || '', ts: f.ts || i.chegada }); }); });
  [...(DB.mem.fotos || new Map()).values()].filter(f => f.path && !f.arquivado && (f.ts || 0) >= a0 && (f.ts || 0) <= a1).forEach((f, k) => { const r = DB.mem.rondas.get(f.rondaId) || {}; out.push({ path: f.path, nome: `${clu(r._uid)}/${isoDate(f.ts)}_rede_${slug(r.ticket || r.id)}/${String(k + 1).padStart(3, '0')}_${slug(f.cat)}.jpg`, rede: f.id, os: r.ticket || 'rede', tec: r.tecnico || '', cat: f.cat || '', ts: f.ts }); });
  return out.sort((x, y) => x.nome.localeCompare(y.nome));
}
// lote de relatórios PDF e de fotos por O.S. (em .zip; até 150 por arquivo)
const slugArq = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'sem';
const progLote = t => { const e = $('#mLoteProg'); if (e) e.textContent = t; };
async function pdfsEmLote(lista, nome, porZip = 150) {
  if (!lista.length) { toast('Nenhuma O.S.'); return; } if (lista.length > 20 && !confirm(`Gerar ${lista.length} relatórios em PDF? Pode levar alguns minutos; deixe esta tela aberta.`)) return;
  const partes = Math.ceil(lista.length / porZip); let falhas = 0;
  for (let p = 0; p < partes; p++) { const files = []; const pedaco = lista.slice(p * porZip, (p + 1) * porZip);
    for (const [k, i] of pedaco.entries()) { progLote(`Gerando relatório ${p * porZip + k + 1} de ${lista.length}…`); try { const f = await gerarPdfInsp(i, true); if (f) files.push({ name: `${isoDate(i.chegada || i.criado)}_${slugArq(osRef(i))}_${slugArq(tipoLb(i))}.pdf`, data: new Uint8Array(await f.arrayBuffer()) }); else falhas++; } catch (e) { falhas++; } }
    baixar(new File([zipStore(files)], `${nome}${partes > 1 ? `_parte${p + 1}de${partes}` : ''}.zip`, { type: 'application/zip' })); }
  progLote(`${lista.length - falhas} relatório(s) em PDF${falhas ? ` · ${falhas} não gerado(s)` : ''}.`);
}
async function fotosPorOS(lista, nome, porZip = 400) {
  const itens = []; lista.forEach(i => { const pasta = `${isoDate(i.chegada || i.criado)}_${slugArq(osRef(i))}_${slugArq(tipoLb(i))}`; (i.fotos || []).forEach((f, k) => { if (f.path || f.blob) itens.push({ f, nome: `${pasta}/${String(k + 1).padStart(2, '0')}_${slugArq(f.cat)}.jpg`, i }); }); });
  if (!itens.length) { toast('Essas O.S. não têm fotos na nuvem (ou já foram arquivadas).'); return; }
  const partes = Math.ceil(itens.length / porZip); let falhas = 0;
  for (let p = 0; p < partes; p++) { const files = []; const pedaco = itens.slice(p * porZip, (p + 1) * porZip);
    for (const [k, x] of pedaco.entries()) { progLote(`Baixando foto ${p * porZip + k + 1} de ${itens.length}…`); const bl = await fotoBlob(x.f); if (!bl) { falhas++; continue; } files.push({ name: x.nome, data: new Uint8Array(await bl.arrayBuffer()) }); }
    baixar(new File([zipStore(files)], `${slugArq(nome)}${partes > 1 ? `_parte${p + 1}de${partes}` : ''}.zip`, { type: 'application/zip' })); }
  progLote(`${itens.length - falhas} foto(s) de ${lista.length} O.S.${falhas ? ` · ${falhas} indisponível(is) (arquivada ou sem internet)` : ''}.`);
}
function fotosArqHtml() {
  const A = S.adm; const L = fotosDoPeriodo(A.de, A.ate); const partes = Math.ceil(L.length / FOTOS_POR_ZIP); const feitas = (S.fotoArqFeitas || {})[A.de + '_' + A.ate] || [];
  const hist = ((S.cfg || {}).arquivoFotos || []).slice(-6).reverse();
  return `<section class="card" id="faBox"><h2>Fotos do período · backup e liberar espaço</h2>
    <p class="muted small" style="margin:0">Baixe as fotos de ${fDM(A.de)} a ${fDM(A.ate)} em .zip, organizadas por cluster e por O.S., e guarde no Google Drive ou no OneDrive. Depois de guardar, libere o espaço no Supabase (o plano grátis comporta cerca de 6.500 fotos). O relatório da O.S. passa a indicar que a foto está no arquivo.</p>
    <div class="stats"><div class="stat"><b>${L.length}</b><span>Fotos ainda na nuvem</span></div><div class="stat"><b>~${Math.round(L.length * 0.25)} MB</b><span>Tamanho estimado</span></div><div class="stat"><b>${partes}</b><span>Arquivo(s) .zip (até ${FOTOS_POR_ZIP} fotos)</span></div></div>
    <div class="row" style="gap:8px;flex-wrap:wrap">${Array.from({ length: partes }, (_, k) => `<button type="button" class="btn ${feitas.includes(k) ? '' : 'pri'}" data-fazip="${k}">${feitas.includes(k) ? '✓ ' : ''}Baixar parte ${k + 1} de ${partes}</button>`).join('') || '<span class="muted small">Nenhuma foto na nuvem neste período.</span>'}</div>
    ${partes ? `<button type="button" class="btn stop" id="faLibera" ${feitas.length >= partes ? '' : 'disabled'}>Liberar espaço: apagar estas ${L.length} fotos do Supabase</button><p class="muted small" style="margin:0">${feitas.length >= partes ? 'Confirme que os arquivos .zip já estão guardados antes de liberar.' : 'Baixe todas as partes para liberar o espaço.'}</p>` : ''}
    <div class="muted small" id="faProg"></div>
    ${hist.length ? `<h3>Arquivados</h3><div class="list">${hist.map(h => `<div class="item" style="cursor:default"><span class="tx"><b>${fDM(h.de)} a ${fDM(h.ate)} · ${h.n} foto(s)</b><span>${esc(h.por || '')} · ${fDH(h.em)} · ${esc(h.onde || 'arquivo .zip')}</span></span></div>`).join('')}</div>` : ''}</section>`;
}
function bindFotosArq() {
  const A = S.adm; const chave = A.de + '_' + A.ate; const L = fotosDoPeriodo(A.de, A.ate); const prog = t => { const e = $('#faProg'); if (e) e.textContent = t; };
  $$('[data-fazip]').forEach(b => b.onclick = async () => { const k = +b.dataset.fazip; const parte = L.slice(k * FOTOS_POR_ZIP, (k + 1) * FOTOS_POR_ZIP); const files = []; let falha = 0; $$('[data-fazip]').forEach(x => x.disabled = true);
    try { for (const [n, f] of parte.entries()) { prog(`Baixando foto ${n + 1} de ${parte.length}…`); const bl = await fotoBlob({ path: f.path }); if (!bl) { falha++; continue; } files.push({ name: f.nome, data: new Uint8Array(await bl.arrayBuffer()) }); }
      const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`; files.push({ name: 'indice.csv', data: new TextEncoder().encode('﻿' + ['Arquivo;O.S.;Técnico;Categoria;Data', ...parte.map(f => [f.nome, f.os, f.tec, f.cat, f.ts ? fDH(f.ts) : ''].map(q).join(';'))].join('\n')) });
      prog('Montando o .zip…'); const nome = `Fotos_${A.de}_a_${A.ate}_parte${k + 1}de${Math.ceil(L.length / FOTOS_POR_ZIP)}.zip`; baixar(new File([zipStore(files)], nome, { type: 'application/zip' }));
      S.fotoArqFeitas = S.fotoArqFeitas || {}; S.fotoArqFeitas[chave] = [...new Set([...(S.fotoArqFeitas[chave] || []), k])]; prog(`${nome}: ${files.length - 1} foto(s)${falha ? `, ${falha} não baixaram (tente de novo)` : ''}.`);
      if (falha) S.fotoArqFeitas[chave] = S.fotoArqFeitas[chave].filter(x => x !== k); const box = $('#faBox'); if (box) { box.outerHTML = fotosArqHtml(); bindFotosArq(); }
    } catch (e) { toast('Erro: ' + (e.message || e), 6000); $$('[data-fazip]').forEach(x => x.disabled = false); } });
  $('#faLibera') && ($('#faLibera').onclick = async () => {
    const onde = prompt(`Antes de apagar: onde você guardou os ${L.length} arquivos de fotos? (ex.: Google Drive > Multivale > Fotos ${A.de.slice(0, 7)})\nDigite o local para confirmar.`); if (!onde || !onde.trim()) return;
    if (!confirm(`Apagar ${L.length} fotos do Supabase? Elas ficam só no arquivo que você guardou.`)) return;
    const b = $('#faLibera'); b.disabled = true;
    try { for (let k = 0; k < L.length; k += 100) { prog(`Apagando ${Math.min(k + 100, L.length)} de ${L.length}…`); const r = await Nuvem.sb.storage.from(Nuvem.BUCKET).remove(L.slice(k, k + 100).map(f => f.path)); if (r.error) throw r.error; }
      const marca = 'arquivo:' + A.de + '_' + A.ate; const evs = new Map(); L.filter(f => f.ev).forEach(f => { const s = evs.get(f.ev) || []; s.push(f.k); evs.set(f.ev, s); });
      let n = 0; for (const [id, ks] of evs) { const i = DB.mem.inspecoes.get(id); if (!i) continue; ks.forEach(k => { if (i.fotos[k]) i.fotos[k].arquivado = marca; }); const d = limpaJson(i); (d.fotos || []).forEach(f => delete f.blob); try { Nuvem.ok(await Nuvem.tab('eventos').update({ dados: d }).eq('id', id)); } catch (e) { console.warn(e); } prog(`Marcando O.S. ${++n} de ${evs.size}…`); }
      for (const f of L.filter(f => f.rede)) { const x = DB.mem.fotos.get(f.rede); if (!x) continue; x.arquivado = marca; const d = limpaJson(x); delete d.blob; try { Nuvem.ok(await Nuvem.tab('fotos_rede').update({ dados: d }).eq('id', x.id)); } catch (e) { console.warn(e); } }
      S.cfg = { ...(S.cfg || {}), arquivoFotos: [...((S.cfg || {}).arquivoFotos || []), { de: A.de, ate: A.ate, n: L.length, em: Date.now(), por: (Nuvem.admin || {}).nome || '', onde: onde.trim().slice(0, 120) }].slice(-36) }; await Nuvem.cfgSalvar(S.cfg);
      toast(`${L.length} fotos arquivadas e removidas do Supabase.`, 6000); const box = $('#faBox'); if (box) { box.outerHTML = fotosArqHtml(); bindFotosArq(); }
    } catch (e) { toast('Erro ao liberar: ' + (e.message || e), 7000); b.disabled = false; } });
}

/* ============================ cluster da O.S. pela cidade do endereço (DDD local) ============================ */
// DDD 12: Vale do Paraíba, Serra da Mantiqueira e Litoral Norte; DDD 13: Baixada Santista e Vale do Ribeira.
// Resto de SP → DDD 11; Minas Gerais → Sul de Minas. O gestor ajusta cidade a cidade no Calendário de recursos.
const CID_DDD12 = ['Aparecida', 'Arapeí', 'Areias', 'Bananal', 'Caçapava', 'Cachoeira Paulista', 'Campos do Jordão', 'Canas', 'Caraguatatuba', 'Cruzeiro', 'Cunha', 'Guaratinguetá', 'Igaratá', 'Ilhabela', 'Jacareí', 'Jambeiro', 'Lagoinha', 'Lavrinhas', 'Lorena', 'Monteiro Lobato', 'Natividade da Serra', 'Paraibuna', 'Pindamonhangaba', 'Piquete', 'Potim', 'Queluz', 'Redenção da Serra', 'Roseira', 'Santa Branca', 'Santo Antônio do Pinhal', 'São Bento do Sapucaí', 'São José do Barreiro', 'São José dos Campos', 'São Luiz do Paraitinga', 'São Sebastião', 'Silveiras', 'Taubaté', 'Tremembé', 'Ubatuba'];
const CID_DDD13 = ['Barra do Turvo', 'Bertioga', 'Cajati', 'Cananéia', 'Cubatão', 'Eldorado', 'Guarujá', 'Iguape', 'Ilha Comprida', 'Itanhaém', 'Itariri', 'Jacupiranga', 'Juquiá', 'Miracatu', 'Mongaguá', 'Pariquera-Açu', 'Pedro de Toledo', 'Peruíbe', 'Praia Grande', 'Registro', 'Santos', 'São Vicente', 'Sete Barras'];
const MINI_SJC = ['São José dos Campos', 'Jacareí', 'Caçapava', 'Igaratá', 'Santa Branca', 'Jambeiro', 'Paraibuna', 'Monteiro Lobato'];
const MINI_LITORAL = ['Caraguatatuba', 'Ubatuba', 'São Sebastião', 'Ilhabela'];
const nCid = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
function cidadesMapa() {
  if (S._cidM && S._cidM.v === JSON.stringify((S.cfg || {}).cidades || [])) return S._cidM.m;
  const m = new Map();
  CID_DDD12.forEach(c => m.set(nCid(c), { cidade: c, cluster: 'ddd12', mini: MINI_LITORAL.includes(c) ? 'litoral' : MINI_SJC.includes(c) ? 'sjc' : 'taubate', padrao: true }));
  CID_DDD13.forEach(c => m.set(nCid(c), { cidade: c, cluster: 'ddd13', mini: 'santos', padrao: true }));
  ((S.cfg || {}).cidades || []).forEach(x => { if (x && x.cidade && CLUSTERS[x.cluster]) m.set(nCid(x.cidade), { cidade: x.cidade, cluster: x.cluster, mini: x.mini || '', padrao: false }); });
  S._cidM = { v: JSON.stringify((S.cfg || {}).cidades || []), m }; return m;
}
// cidade e estado a partir do texto ("…, Taubaté - SP, 12000-000, Brasil", "Taubaté/SP", ou o campo cidade)
function regiaoDeTexto(...txts) {
  const M = cidadesMapa(); let uf = '';
  for (const t of txts.filter(Boolean)) {
    const s = String(t); const mUF = s.match(/(?:\s-\s|\/|,\s*)(SP|MG|RJ|PR)\b/) || s.match(/\b(S[aã]o Paulo|Minas Gerais)\b/i); if (mUF && !uf) uf = /mg|minas/i.test(mUF[1]) ? 'MG' : /sp|paulo/i.test(mUF[1]) ? 'SP' : mUF[1].toUpperCase();
    const partes = s.split(/,|\s-\s|\//).map(nCid).filter(Boolean);
    for (const p of partes.reverse()) { const r = M.get(p); if (r) return { ...r }; }
  }
  if (uf === 'MG') return { cidade: '', cluster: 'mg', mini: 'sulminas', padrao: true };
  if (uf === 'SP') return { cidade: '', cluster: 'ddd11', mini: 'implantacao', padrao: true };
  return null;
}
// cluster da O.S.: o escolhido no cadastro; senão, pela cidade do endereço; senão, o do técnico
function regiaoOS(x, uidTec) {
  if (!x) return null; if (x.clusterManual && x.cluster) return { cluster: x.cluster, mini: x.mini || '' };
  const info = x.info || {}; const r = regiaoDeTexto(x.cidade, info.cidade, x.geo && x.geo.formatado, x.endereco, info.endereco);
  if (r) return r; if (x.cluster) return { cluster: x.cluster, mini: x.mini || '' };
  const u = uidTec || x.tecnicoUid || x._uid; if (u) { const t = (S.adm && S.adm.tecnicos || []).find(y => y.uid === u); if (t) { const f = fichaTec(t); if (f.cluster) return { cluster: f.cluster, mini: f.regiao !== 'todas' ? f.regiao : '' }; } }
  return null;
}
const clusterOS = (x, u) => (regiaoOS(x, u) || {}).cluster || '';
// ---------- painel: cidades por cluster (padrão + ajustes do gestor) ----------
function cidadesHtml() {
  const aj = ((S.cfg || {}).cidades || []);
  return `<h2>Cidades por cluster</h2><p class="muted small" style="margin:0">O cluster de cada O.S. sai da cidade do endereço (DDD local): Vale do Paraíba e Litoral Norte → DDD12; Baixada Santista e Vale do Ribeira → DDD13; demais cidades de SP → DDD11; Minas Gerais → MG. Ajuste aqui uma cidade que deva ir para outro cluster ou mini cluster.</p>
    <div class="list">${aj.map((x, k) => `<div class="item" style="cursor:default"><span class="tx"><b>${esc(x.cidade)}</b><span>${esc(CLUSTERS[x.cluster] || '')}${x.mini ? ' · ' + esc((MINI[x.mini] || [x.mini])[0]) : ''}</span></span><button type="button" class="lnk" data-cidel="${k}">Remover</button></div>`).join('') || '<p class="muted small" style="margin:0">Nenhum ajuste: valendo o padrão.</p>'}</div>
    <div class="grid3"><div class="field"><label class="lb" for="ciNome">Cidade</label><input type="text" id="ciNome" placeholder="Ex.: Caçapava"></div><div class="field"><label class="lb" for="ciClu">Cluster</label><select id="ciClu">${cluOpts('')}</select></div><div class="field"><label class="lb" for="ciMini">Mini cluster</label><select id="ciMini">${miniOpts('', '', 'Nenhum')}</select></div></div>
    <button type="button" class="btn" id="bCiAdd">${ICON.plus}Salvar ajuste</button>
    <details><summary class="small" style="cursor:pointer;min-height:36px;display:flex;align-items:center;color:var(--accent);font-weight:600">Ver a lista padrão (${CID_DDD12.length + CID_DDD13.length} cidades)</summary><p class="small" style="margin:0"><b>DDD12 · São José dos Campos:</b> ${MINI_SJC.join(', ')}.<br><b>DDD12 · Litoral:</b> ${MINI_LITORAL.join(', ')}.<br><b>DDD12 · Taubaté:</b> ${CID_DDD12.filter(c => !MINI_SJC.includes(c) && !MINI_LITORAL.includes(c)).join(', ')}.<br><b>DDD13 · Santos:</b> ${CID_DDD13.join(', ')}.</p></details>`;
}
function bindCidades(box) {
  bindRegiao($('#ciClu'), $('#ciMini'));
  const salva = async l => { S.cfg = { ...(S.cfg || {}), cidades: l }; try { await Nuvem.cfgSalvar(S.cfg); toast('Cidades por cluster salvas.'); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } box.innerHTML = cidadesHtml(); bindCidades(box); };
  $$('[data-cidel]', box).forEach(b => b.onclick = () => { const l = [...((S.cfg || {}).cidades || [])]; l.splice(+b.dataset.cidel, 1); salva(l); });
  $('#bCiAdd').onclick = () => { const c = $('#ciNome').value.trim(), cl = $('#ciClu').value, mi = $('#ciMini').value === 'todas' ? '' : $('#ciMini').value; if (!c || !cl) { toast('Informe a cidade e o cluster.'); return; } const l = ((S.cfg || {}).cidades || []).filter(x => nCid(x.cidade) !== nCid(c)); l.push({ cidade: c, cluster: cl, mini: mi }); salva(l); };
}

