// Técnico Plus - Multivale · projeto de cada O.S. e início do app
// Os arquivos app-*.js carregam em ordem (ver index.html) e compartilham o mesmo escopo global.
'use strict';
/* ============================ projeto (centro de custo) de cada O.S. ============================ */
// Toda O.S. pertence a um projeto do Centro de custo. Enquanto o projeto não foi gravado na O.S., o app sugere pelo
// faturamento (LPU) e pelo cliente/contrato; ao validar para medição ele é gravado e, depois de enviada, não muda mais.
const projAtivos = () => (S.projs || []).filter(p => p.ativo !== false);
const projById = id => (S.projs || []).find(p => p.id === id) || null;
const projNome = id => (projById(id) || {}).nome || '';
function projSugerido(x) {
  const P = projAtivos(); if (!x || !P.length) return '';
  const fat = (x.info ? centroOS(x) : x.centro) || ''; if (fat) { const m = P.filter(p => p.faturamento === fat); if (m.length === 1) return m[0].id; }
  const v = x.info ? vincOS(x) : contratoAtv(x); const m = P.filter(p => p.vinculo === v); return m.length === 1 ? m[0].id : '';
}
const projetoDe = x => (x && x.projeto && projById(x.projeto) ? x.projeto : projSugerido(x));
const projAuto = x => !!x && !(x.projeto && projById(x.projeto));
function projOpts(sel, vazio = 'Escolha o projeto…') { return `<option value="">${vazio}</option>` + projAtivos().map(p => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(p.nome)}</option>`).join(''); }
const medTravada = m => !!m && (m.status === 'enviada' || m.status === 'medida' || m._arq);
function menuAdmin() {
  const nav = $('#drawer nav'); if (!nav || RESTRITO) return;
  const it = (v, ic, lb) => `<button class="navi" data-nav="${v}">${SVG(ic)}${lb}</button>`;
  if (ehAlmox()) { nav.innerHTML = it('admMat', '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>', 'Almoxarifado') + `<button class="navi" id="navAparAdm">${SVG('<circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 3a9 9 0 0 1 0 18"/>')}Aparência</button><button class="navi" id="navSairAdm">${SVG('<path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/>')}Sair</button>`; }
  else nav.innerHTML = it('adm', '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>', 'Painel e despacho')
    + it('admEquipe', '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M17 8h5M19.5 5.5v5"/>', 'Equipe e cadastros')
    + it('admCal', '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="M8 13h3M8 17h6"/>', 'Calendário de recursos')
    + it('admLote', '<path d="M4 4h16v4H4zM4 10h16v4H4zM4 16h10v4H4z"/><path d="M18 17v4M16 19h4"/>', 'Importar O.S. em lote')
    + it('admPrev', '<path d="M7 3h10l4 4v14H3V3h4"/><path d="M7 13l3 3 6-6"/>', 'Preventivas do mês')
    + it('admMat', '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>', 'Almoxarifado (materiais)')
    + it('admFusao', '<circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6c5 0 5 12 10 12M7 18c5 0 5-12 10-12"/>', 'Mapa de fusão')
    + it('admAtivo', '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"/>', 'Histórico de ativos')
    + it('admSla', '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>', 'Indicadores e SLA')
    + it('admProj', '<path d="M12 2v20M17 6.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5S9.2 10 12 10s5 1.6 5 3.5S14.8 17 12 17s-5-1.6-5-3.5"/>', 'Centro de custo (projetos)')
    + it('admBi', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', 'Produção do período')
    + it('admCalor', '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', 'Mapa de calor')
    + it('admBackup', '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>', 'Backup e armazenamento')
    + it('admMed', '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>', 'Medição · Telegram')
    + `<a class="navi" href="acionamento.html" target="_blank" rel="noopener" style="text-decoration:none">${SVG('<path d="M4 4h16v12H5.2L4 17.5z"/><path d="M8 8h8M8 12h5"/>')}Acionamentos Claro ↗</a>`
    + `<a class="navi" href="parceiro.html" target="_blank" rel="noopener" style="text-decoration:none">${SVG('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5"/>')}Portal do parceiro ↗</a>`
    + `<a class="navi" href="noc.html" target="_blank" rel="noopener" style="text-decoration:none">${SVG('<path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>')}Área NOC ↗</a>`
    + `<button class="navi" id="navAparAdm">${SVG('<circle cx="12" cy="12" r="9"/><path d="M12 3v18M12 3a9 9 0 0 1 0 18"/>')}Aparência</button>`
    + `<button class="navi" id="navSairAdm">${SVG('<path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/>')}Sair</button>`;
  $$('.navi[data-nav]', nav).forEach(b => b.onclick = () => { menu(false); S.medVolta = false; go(b.dataset.nav); });
  $('#navAparAdm', nav) && ($('#navAparAdm', nav).onclick = () => { menu(false); abrirAparencia(); });
  $('#navSairAdm').onclick = async () => { menu(false); await Nuvem.sairAdmin(); go('admLogin'); };
  const df = $('#drawer .df'); if (df) df.textContent = 'Painel · Técnico Plus - Multivale';
}
const ATUALIZA_ADM_MIN = 60;
async function remanejaAtv(a, para, quem, pedidoPor) {
  if (!a) throw new Error('O.S. não encontrada (atualize o painel).');
  const de = agendaDe(a); const nv = { ...a, agendaDia: para, remanejos: [...(a.remanejos || []), { de, para, por: quem, pedidoPor: pedidoPor || null, em: Date.now() }].slice(-20) };
  const r = await Nuvem.atvSalvar(nv); if (r) S.atvsAdm.set(r.id, r); return r;
}
async function aplicaRemanejo(p) { const a = (S.atvsAdm || new Map()).get(p.ref_id); await remanejaAtv(a, p.dados.para, (Nuvem.admin || {}).nome || 'Gestor', p.tecnico_nome); }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-upcobra2]'); if (b) cobrarAtualizacao(b.dataset.upcobra2); });
async function cobrarAtualizacao(id) {
  const a = (S.atvsAdm || new Map()).get(id); if (!a) return;
  if (!confirm(`Cobrar do ${a.tecnicoNome || 'técnico'} a atualização da O.S. ${a.ticket || ''}? O celular dele toca o alarme até ele atualizar.`)) return;
  try { const r = await Nuvem.atvSalvar({ ...a, cobrarAtualizEm: Date.now(), cobrarPor: (Nuvem.admin || {}).nome || 'Supervisor' }); if (r) S.atvsAdm.set(r.id, r); toast('Cobrança enviada ao técnico.'); pintaLimites(); if (S.view === 'admAtv') render(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); }
}
function viewNoc() {
  return `<div id="nocSos" style="display:flex;flex-direction:column;gap:6px"></div><section class="card"><div class="row" style="justify-content:space-between"><h2>Validação e liberação de corretivas</h2><span class="muted small" id="nocHora"></span></div>
    <p class="muted small" style="margin:0">O técnico só dá baixa na O.S. e sai do local depois da liberação do NOC ou do supervisor. Confira a rede, converse com o técnico e libere ou recuse.</p>
    <div class="stats" id="nocStats"></div></section><div id="nocLista"><section class="card"><p class="empty">Carregando…</p></section></div>`;
}
async function afterNoc() {
  const pSos = () => { const b = $('#nocSos'); if (b) b.innerHTML = sosBanners(); }; sosOuvir(pSos); pSos();
  const pinta = () => {
    const P = [...S.nocPeds.values()].sort((a, b) => a.criado - b.criado); const ab = P.filter(p => p.status === 'pedido'), dec = P.filter(p => p.status !== 'pedido').sort((a, b) => (b.decidido_em || 0) - (a.decidido_em || 0));
    const st = $('#nocStats'); if (!st) return;
    st.innerHTML = `<div class="stat"><b style="color:${ab.length ? 'var(--bad)' : 'inherit'}">${ab.length}</b><span>Aguardando</span></div><div class="stat"><b>${dec.filter(p => p.status === 'aprovado').length}</b><span>Liberadas (36 h)</span></div><div class="stat"><b>${dec.filter(p => p.status === 'recusado').length}</b><span>Recusadas</span></div>`;
    const card = p => { const d = p.dados || {}; const mapa = d.lat != null ? `https://maps.google.com/?q=${d.lat},${d.lon}` : '';
      return `<section class="card" style="${p.status === 'pedido' ? 'border:2px solid var(--accent)' : ''}"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><h2 style="margin:0">${esc(d.ticket || 'Corretiva')}</h2><span class="muted small">${esc(p.tecnico_nome || '')} · pedido às ${fHora(p.criado)} (há ${fHm((Date.now() - p.criado) / 60000)})${d.ocorrencia ? ' · ' + esc(d.ocorrencia) : ''}${d.inicio ? ' · em campo desde ' + fHora(d.inicio) : ''}</span></div>${p.status === 'pedido' ? '<span class="pill bad">aguardando</span>' : `<span class="pill ${p.status === 'aprovado' ? 'ok' : 'bad'}">${p.status === 'aprovado' ? 'liberada' : 'recusada'} · ${esc(p.decidido_por || '')} ${p.decidido_em ? fHora(p.decidido_em) : ''}</span>`}</div>
        ${mapa ? `<a class="lnk" href="${mapa}" target="_blank" rel="noopener">📍 Local do técnico no mapa</a>` : ''}
        ${conversaHtml(p.id, 'noc') || '<p class="muted small" style="margin:0">Sem mensagem do técnico.</p>'}
        ${p.status === 'pedido' ? `<div class="row" style="gap:6px;flex-wrap:nowrap"><input type="text" data-nocmsg="${esc(p.id)}" placeholder="Responder ao técnico" style="flex:1;min-width:0"><button type="button" class="btn" data-nocenv="${esc(p.id)}">Enviar</button></div>
          <div class="row" style="gap:8px"><button type="button" class="btn go" data-nocok="${esc(p.id)}">Validar e liberar</button><button type="button" class="btn" data-nocno="${esc(p.id)}">Recusar</button></div>` : p.obs ? `<p class="small" style="margin:0">Motivo: ${esc(p.obs)}</p>` : ''}</section>`; };
    $('#nocLista').innerHTML = (ab.length ? ab.map(card).join('') : '<section class="card"><p class="empty">Nenhum pedido aguardando. Os novos aparecem aqui na hora, com som.</p></section>') + (dec.length ? `<h3 style="margin:8px 4px">Decididos nas últimas 36 h</h3>${dec.slice(0, 30).map(card).join('')}` : '');
    const h = $('#nocHora'); if (h) h.textContent = 'Atualizado ' + fHora(Date.now());
    const msg = async (pid, texto) => { const m = { id: 'pm_' + uid(), org: Nuvem.org(), pedido_id: pid, tecnico_uid: (S.nocPeds.get(pid) || {}).tecnico_uid, autor_uid: Nuvem.user.id, autor_nome: (Nuvem.admin || {}).nome || 'NOC', papel: Nuvem.admin && Nuvem.admin.papel === 'noc' ? 'noc' : 'supervisor', texto, criado: Date.now() }; await Nuvem.msgCriar(m); guardaMsg(m); };
    $$('[data-nocenv]').forEach(b => b.onclick = async () => { const i = $$('[data-nocmsg]').find(x => x.dataset.nocmsg === b.dataset.nocenv); const t = String(i && i.value || '').trim(); if (!t) return; try { await msg(b.dataset.nocenv, t); pinta(); } catch (e) { toast('Erro: ' + (e.message || e)); } });
    $$('[data-nocok]').forEach(b => b.onclick = async () => { const p = S.nocPeds.get(b.dataset.nocok); if (!confirm(`Validar e liberar ${p.tecnico_nome} para dar baixa e sair do local (${(p.dados || {}).ticket || ''})?`)) return; try { await Nuvem.pedDecidir(p.id, 'aprovado', ''); await msg(p.id, 'Validado pelo NOC. Pode dar baixa e sair do local.'); p.status = 'aprovado'; p.decidido_em = Date.now(); p.decidido_por = 'NOC · ' + ((Nuvem.admin || {}).nome || ''); pinta(); toast('Liberado.'); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } });
    $$('[data-nocno]').forEach(b => b.onclick = async () => { const p = S.nocPeds.get(b.dataset.nocno); const ob = prompt('Motivo da recusa (o técnico vê):', ''); if (ob === null) return; try { await Nuvem.pedDecidir(p.id, 'recusado', ob); if (ob) await msg(p.id, 'Não liberado: ' + ob); p.status = 'recusado'; p.obs = ob; p.decidido_em = Date.now(); pinta(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } });
  };
  if (!S.nocPeds) {
    S.nocPeds = new Map();
    try { (await Nuvem.pedNoc()).forEach(p => S.nocPeds.set(p.id, p)); (await Nuvem.msgsOrg()).forEach(guardaMsg); } catch (e) { $('#nocLista').innerHTML = `<section class="card"><div class="warnbox">Não foi possível carregar: ${esc(e.message || e)}</div></section>`; return; }
    Nuvem.canal('nocped', 'pedidos', (t, row) => { if (!row || !row.id || row.tipo !== 'liberar_corretiva') return; const novo = !S.nocPeds.has(row.id) && row.status === 'pedido'; S.nocPeds.set(row.id, row); if (novo) { toast(`Novo pedido de validação: ${row.tecnico_nome || ''} · ${(row.dados || {}).ticket || ''}`, 8000); try { Alarme.destrava(); Alarme.bip(); if ('Notification' in window && Notification.permission === 'granted') new Notification('Pedido de validação', { body: `${row.tecnico_nome || ''} · ${(row.dados || {}).ticket || ''}`, tag: 'noc-' + row.id, requireInteraction: true }); } catch (e) {} } if (S.view === 'noc') pinta(); });
    Nuvem.canal('nocmsg', 'ped_msgs', (t, m) => { if (!m || !m.id) return; guardaMsg(m); if (S.view === 'noc') pinta(); });
    try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {}
    setInterval(() => { if (S.view === 'noc') pinta(); }, 60000);
  }
  pinta();
}
async function decidePedido(id, ok) {
  const p = (S.peds || new Map()).get(id); if (!p) return;
  let obs = '';
  if (ok) { if (!confirm(p.tipo === 'remanejar' ? `Aprovar o remanejamento pedido por ${p.tecnico_nome}?` : `Liberar ${p.tecnico_nome} para sair do local e fechar a corretiva ${(p.dados || {}).ticket || ''}?`)) return; }
  else { obs = prompt('Motivo da recusa (o técnico vê):', '') ?? null; if (obs === null) return; }
  try { if (ok && p.tipo === 'remanejar') await aplicaRemanejo(p); await Nuvem.pedDecidir(id, ok ? 'aprovado' : 'recusado', obs); if (p.tipo === 'liberar_corretiva') { try { await Nuvem.msgCriar({ id: 'pm_' + uid(), org: Nuvem.org(), pedido_id: p.id, tecnico_uid: p.tecnico_uid, autor_uid: Nuvem.user.id, autor_nome: (Nuvem.admin || {}).nome || 'Supervisor', papel: 'supervisor', texto: ok ? 'Liberado pelo supervisor. Pode dar baixa e sair do local.' : 'Não liberado' + (obs ? ': ' + obs : '.'), criado: Date.now() }); } catch (e) {} } S.peds.delete(id); toast(ok ? 'Liberado.' : 'Recusado.'); pintaLimites(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); }
}
function semAtualizacao() {
  const agora = Date.now(); const out = [];
  [...(S.atvsAdm || new Map()).values()].filter(a => a.status === 'em_deslocamento' || a.status === 'no_local').forEach(a => {
    const ult = a.ultAtualiz || a.iniciadaEm || a.atualizado || a.criado; const min = (agora - ult) / 60000;
    if (min >= ATUALIZA_ADM_MIN) out.push({ a, min, ult });
  });
  return out.sort((x, y) => y.min - x.min);
}
function limiteDia() { const c = S.cfg || {}; return { lim: +c.limiteDiaMin || LIMITE_DIA_PADRAO, aviso: +c.avisoMin || 30 }; }
// técnicos com O.S. aberta perto de passar (ou que já passaram) do limite de horas do dia
function limitesHoras() {
  const { lim, aviso } = limiteDia(); const agora = Date.now(); const out = [];
  (S.vivo || new Map()).forEach(v => {
    if (!v.expediente || v.trabMin == null || agora - (v.ts || 0) > 3 * 3600000) return;
    const atv = [...(S.atvsAdm || new Map()).values()].find(a => a.tecnicoUid === v._uid && (a.status === 'em_deslocamento' || a.status === 'no_local'));
    if (!v.ativo && !atv) return;
    const trab = v.trabMin + (v.refeicao ? 0 : Math.max(0, (agora - (v.ts || agora)) / 60000));
    if (trab < lim - aviso) return;
    out.push({ uid: v._uid, nome: v.tecnico || '—', trab, falta: lim - trab, os: v.ticket || (atv && atv.ticket) || '', tipo: v.tipo || (atv && atv.tipo) || '' });
  });
  return out.sort((a, b) => a.falta - b.falta);
}
// avisos do painel que o supervisor fechou no X (voltam se a situação piorar: mais 1 h sem atualização, SLA estourar, novo dia)
const BF_KEY = 'tp-banfecha';
function banFechados() { if (!S.banF) { try { S.banF = JSON.parse(localStorage.getItem(BF_KEY) || '{}') || {}; } catch (e) { S.banF = {}; } const lim = Date.now() - 2 * 86400000; for (const k in S.banF) if (S.banF[k] < lim) delete S.banF[k]; } return S.banF; }
function banFecha(k) { banFechados()[k] = Date.now(); try { localStorage.setItem(BF_KEY, JSON.stringify(S.banF)); } catch (e) {} }
const bX = k => `<button type="button" class="banx" data-bfecha="${esc(k)}" aria-label="Fechar aviso" title="Fechar aviso">×</button>`;
const kU = x => `upd:${x.a.id}:${Math.floor(x.min / ATUALIZA_ADM_MIN)}`, kSL = x => `sla:${x.a.id}:${x.nome}:${x.x.estourou ? 'e' : 'v'}`, kTR = () => 'tr:' + isoDate(Date.now()), kL = x => `lim:${x.uid}:${isoDate(Date.now())}:${x.falta <= 0 ? 'p' : 'a'}`;
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-bfecha]'); if (!b) return; banFecha(b.dataset.bfecha); const bn = b.closest('.banner'); if (bn) bn.remove(); const box = $('#limAlerta'); if (box && !box.children.length) box.remove(); });
// confere se o banco tem as tabelas/colunas desta versão (supabase.sql rodado por inteiro)
const BANCO_REQ = [['equipamentos', 'id'], ['equip_mov', 'id'], ['atividades', 'apoio_uids'], ['materiais', 'id'], ['mat_mov', 'id'], ['pedidos', 'id'], ['projetos', 'id'], ['recursos', 'uid'], ['noc', 'uid'], ['treinamentos', 'id'], ['sos', 'tipo'], ['escada', 'uid']];
async function checaBanco() {
  if (S.bancoOk !== undefined || !Nuvem.on || !Nuvem.sb) return; S.bancoOk = null; const falta = [];
  await Promise.all(BANCO_REQ.map(async ([t, c]) => { try { const r = await Nuvem.tab(t).select(c).limit(1); if (r && r.error && /schema cache|does not exist|column/i.test(r.error.message || '')) falta.push(c === 'id' || c === 'uid' ? t : `${t}.${c}`); } catch (e) {} }));
  S.bancoOk = falta; pintaLimites();
}
function bancoBanner() { const f = S.bancoOk; if (!f || !f.length || banFechados()['banco:' + isoDate(Date.now())]) return ''; return `<div class="banner" style="background:#5c1a10;color:#fff">${bX('banco:' + isoDate(Date.now()))}<span>⚠️ <b>Banco de dados desatualizado.</b> Faltam: ${f.map(esc).join(', ')}. No Supabase, abra o <b>SQL Editor</b>, cole o arquivo <b>supabase.sql inteiro</b> (Ctrl+A no arquivo) e clique em <b>Run</b>. Depois recarregue esta página.</span></div>`; }
// senha nova do técnico (painel): gera e mostra com o link do WhatsApp
async function senhaNovaTec(cad, nome) {
  const d = await Nuvem.acesso('senha_temp', { cad_id: cad.id }); const login = cad.matricula || d.login; const txt = `Olá ${String(nome || cad.nome || '').split(' ')[0]}! Sua nova senha do app Técnico Plus - Multivale: ${d.senha}\nLogin: ${login}\nDepois de entrar, guarde a senha.`; const tel = String(cad.telefone || '').replace(/\D/g, '');
  const el = document.createElement('div'); el.className = 'modal'; el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:950;display:flex;align-items:center;justify-content:center;padding:12px';
  el.innerHTML = `<div style="background:var(--surface);border-radius:10px;max-width:440px;width:100%;padding:14px;display:flex;flex-direction:column;gap:10px" role="dialog" aria-modal="true"><b>Senha nova · ${esc(nome || cad.nome || '')}</b><div class="okbox">Login: <b>${esc(login)}</b> · Senha: <b style="font-size:20px;letter-spacing:2px">${esc(d.senha)}</b></div><a class="btn wa" href="https://wa.me/${tel ? (tel.length <= 11 ? '55' + tel : tel) : ''}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${ICON.wa}Enviar pelo WhatsApp</a><button type="button" class="btn" data-x>Fechar</button></div>`;
  document.body.appendChild(el); el.onclick = e => { if (e.target === el || e.target.closest('[data-x]')) el.remove(); }; cad.senha_pedida = null;
}
function pintaLimites() {
  if (!ADMIN || RESTRITO || !['adm', 'admMed', 'admBi', 'admCalor', 'admEquipe', 'admLote', 'admMat', 'admPrev', 'admProj', 'admCal', 'admSla', 'admAtivo', 'admFusao'].includes(S.view)) return; const app = $('#app'); if (!app) return;
  if (!S.unVivo && Nuvem.on) { ouvirVivo(); ouvirAtvAdm(); }
  let box = $('#limAlerta'); const L0 = limitesHoras(), L = L0.filter(x => !banFechados()[kL(x)]); const { lim } = limiteDia();
  if (!S.unPed && Nuvem.on) { S.pedMsgsAdm = S.pedMsgsAdm || new Map(); Nuvem.msgsOrg().then(l => { l.forEach(m => { const x = S.pedMsgsAdm.get(m.pedido_id) || []; x.push(m); S.pedMsgsAdm.set(m.pedido_id, x); }); pintaLimites(); }).catch(() => {}); S.unPedMsg = Nuvem.canal('pmadm', 'ped_msgs', (t, m) => { if (!m || !m.id) return; const x = S.pedMsgsAdm.get(m.pedido_id) || []; if (!x.some(y => y.id === m.id)) x.push(m); S.pedMsgsAdm.set(m.pedido_id, x); pintaLimites(); }); S.peds = S.peds || new Map(); Nuvem.pedAbertos().then(l => { l.forEach(p => S.peds.set(p.id, p)); pintaLimites(); }).catch(() => {}); S.unPed = Nuvem.canal('pedadm', 'pedidos', (t, row) => { if (!row || !row.id) return; const novo = !S.peds.has(row.id) && row.status === 'pedido'; if (row.status === 'pedido') S.peds.set(row.id, row); else S.peds.delete(row.id); if (novo) { toast(`${row.tecnico_nome || 'Técnico'} pede liberação: ${row.tipo === 'remanejar' ? 'remanejar atividade' : 'saída da corretiva ' + ((row.dados || {}).ticket || '')}`, 8000); try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Pedido de liberação', { body: `${row.tecnico_nome || ''} · ${row.tipo === 'remanejar' ? 'remanejar atividade' : 'saída da corretiva ' + ((row.dados || {}).ticket || '')}`, tag: 'ped-' + row.id, requireInteraction: true }); } catch (e) {} } pintaLimites(); }); }
  const PD = [...(S.peds || new Map()).values()].filter(p => p.status === 'pedido').sort((a, b) => a.criado - b.criado);
  const U0 = semAtualizacao(), U = U0.filter(x => !banFechados()[kU(x)]);
  const SL0 = slaAlertas(), SL = SL0.filter(x => !banFechados()[kSL(x)]);
  if (Nuvem.on) sosOuvir(pintaLimites);
  if (!S.treinosTodos && !S.trCarregando && Nuvem.on) { S.trCarregando = true; Nuvem.treinosTodos().then(l => { S.treinosTodos = l; pintaLimites(); }).catch(() => { S.treinosTodos = []; }); }
  checaBanco(); const SOS = sosBanners() + bancoBanner(); const TR = banFechados()[kTR()] ? [] : treinosAvisos();
  if (Nuvem.on && (!S.cadsTs || Date.now() - S.cadsTs > 60000)) { S.cadsTs = Date.now(); Nuvem.cadLista().then(l => { const tinha = (S.cads || []).filter(c => c.senha_pedida).length; S.cads = l; if (l.filter(c => c.senha_pedida).length !== tinha) pintaLimites(); }).catch(() => {}); }
  const SPED = (S.cads || []).filter(c => c.senha_pedida && c.ativo !== false);
  // técnicos que não iniciaram o expediente 15 min depois do início da jornada (some quando o supervisor fecha a faixa, até o dia seguinte)
  const kEX = 'exp:' + hojeIso(); const cadAtv = uid => { const l = (S.cads || []).filter(c => c.uid); if (!l.length) return true; const c = l.find(x => x.uid === uid); return !!c && c.ativo !== false; };
  const dJ = new Date(), minJ = dJ.getHours() * 60 + dJ.getMinutes() - hm(jornada().inicio);
  const EXPN = emJornada() && minJ >= 15 && !banFechados()[kEX] ? (S.adm.tecnicos || []).filter(t => cadAtv(t.uid) && /^Expediente não iniciado/.test(situacaoTec(t.uid).txt)) : [];
  const EXPB = EXPN.length ? `<div class="banner" style="background:#fff3bf;color:#5c3a00">${bX(kEX)}<span>⏰ ${EXPN.length === 1 ? `<b>${esc(EXPN[0].nome)}</b> não iniciou o expediente` : `${EXPN.length} técnicos não iniciaram o expediente: ${EXPN.slice(0, 6).map(t => `<b>${esc(t.nome)}</b>`).join(', ')}${EXPN.length > 6 ? '…' : ''}`} (jornada desde ${esc(jornada().inicio)}).</span></div>` : '';
  const SENHAS = SPED.length ? `<div class="banner" style="background:#e7f0fa;color:#0b3d66"><span>🔑 ${SPED.length === 1 ? `<b>${esc(SPED[0].nome)}</b> esqueceu a senha do app.` : `${SPED.length} técnicos esqueceram a senha: ${SPED.slice(0, 4).map(c => `<b>${esc(c.nome)}</b>`).join(', ')}.`}</span>${SPED.slice(0, 3).map(c => `<button type="button" class="btn" data-senhanova="${esc(c.id)}" style="min-height:36px">Gerar senha ${SPED.length > 1 ? 'de ' + esc(String(c.nome).split(' ')[0]) : 'nova'}</button>`).join('')}</div>` : '';
  if (!L.length && !U.length && !PD.length && !SL.length && !SOS && !TR.length && !SENHAS && !EXPB) { if (box) box.remove(); return; }
  if (!box) { box = document.createElement('div'); box.id = 'limAlerta'; box.style.cssText = 'display:flex;flex-direction:column;gap:6px'; app.prepend(box); }
  box.innerHTML = SENHAS + SOS + EXPB + (TR.length ? `<div class="banner" style="background:#fde7c7;color:#5c3a00">${bX(kTR())}<span>🦺 ${TR.length} treinamento(s)/ASO vencido(s) ou vencendo: ${TR.slice(0, 4).map(x => `<b>${esc(((S.adm.tecnicos || []).find(t => t.uid === x.t.uid) || {}).nome || 'técnico')}</b> ${esc(x.t.tipo)} ${x.s.st === 'vencido' ? 'venceu' : 'vence'} ${fDM(x.s.v)}`).join(' · ')}${TR.length > 4 ? ' …' : ''}</span><button type="button" class="btn" data-trver style="min-height:36px">Ver</button></div>` : '') + SL.map(x => `<div class="banner" style="${x.x.estourou ? 'background:var(--bad);color:#fff' : 'background:#fde7c7;color:#5c3a00'}">${bX(kSL(x))}<span>⏱ SLA de <b>${x.nome}</b> da O.S. <b>${esc(x.a.ticket || '—')}</b> (${esc(x.a.tecnicoNome || 'sem técnico')}, ${esc(CONTRATO_LB[contratoAtv(x.a)])}) ${x.x.estourou ? `<b>estourou há ${fHm(-x.x.resto)}</b>` : `<b>vence em ${fHm(x.x.resto)}</b>`}.</span><button type="button" class="btn" data-upver="${x.a.id}" style="min-height:36px">Ver O.S.</button></div>`).join('') + PD.map(p => `<div class="banner" style="background:#e3eef7;color:#0b3d63"><span>🔓 <b>${esc(p.tecnico_nome || 'Técnico')}</b> ${p.tipo === 'remanejar' ? `pede para remanejar <b>${esc((p.dados || {}).titulo || 'atividade')}</b> de ${esc((p.dados || {}).deTxt || '')} para <b>${esc((p.dados || {}).paraTxt || '')}</b>` : `pede liberação para <b>dar baixa e sair do local da corretiva ${esc((p.dados || {}).ticket || '')}</b>${(p.dados || {}).ocorrencia ? ' · ' + esc(p.dados.ocorrencia) : ''}${(() => { const l = (S.pedMsgsAdm || new Map()).get(p.id) || []; const u = l[l.length - 1]; return u ? ` · <i>“${esc(u.texto.slice(0, 120))}”</i>` : ''; })()}`} · há ${fHm((Date.now() - p.criado) / 60000)}.</span><span class="row" style="gap:6px"><button type="button" class="btn go" data-pedok="${esc(p.id)}" style="min-height:36px">${p.tipo === 'remanejar' ? 'Aprovar' : 'Liberar'}</button><button type="button" class="btn" data-pedno="${esc(p.id)}" style="min-height:36px">Recusar</button></span></div>`).join('') + U.map(x => `<div class="banner" style="background:#fbf1cf;color:#5c4400">${bX(kU(x))}<span>🕐 O.S. <b>${esc(x.a.ticket || '—')}</b> (${esc(x.a.tecnicoNome || 'sem técnico')}, ${esc(ATV_ST[x.a.status] || x.a.status)}) <b>sem atualização há ${fHm(x.min)}</b>${x.a.situacao ? ` · última situação: ${esc(SIT_OS[x.a.situacao] || x.a.situacao)}` : ''}.</span><span class="row" style="gap:6px">${x.a.cobrarAtualizEm && x.a.cobrarAtualizEm > (x.a.ultAtualiz || 0) ? `<span class="small">cobrada às ${fHora(x.a.cobrarAtualizEm)}</span>` : `<button type="button" class="btn go" data-upcobra="${x.a.id}" style="min-height:36px">Cobrar atualização</button>`}<button type="button" class="btn" data-upver="${x.a.id}" style="min-height:36px">Ver O.S.</button></span></div>`).join('') + L.map(x => `<div class="banner" style="${x.falta <= 0 ? 'background:var(--bad);color:#fff' : ''}">${bX(kL(x))}<span>⏱️ <b>${esc(x.nome)}</b> está com a O.S. ${esc(x.os || 'em andamento')} aberta e ${x.falta <= 0 ? `<b>passou do limite de ${fHm(lim)} há ${fHm(-x.falta)}</b>` : `<b>chega ao limite de ${fHm(lim)} em ${fHm(x.falta)}</b>`} (trabalhou ${fHm(x.trab)} hoje).</span></div>`).join('');
  $$('[data-trver]', box).forEach(b => b.onclick = () => go('admCal'));
  $$('[data-senhanova]', box).forEach(b => b.onclick = async () => { const c = (S.cads || []).find(x => x.id === b.dataset.senhanova); if (!c || !confirm(`Gerar uma senha nova para ${c.nome}? A senha atual deixa de funcionar.`)) return; try { await senhaNovaTec(c, c.nome); pintaLimites(); } catch (e) { toast('Erro: ' + (e.message || e), 7000); } });
  $$('[data-upver]', box).forEach(b => b.onclick = () => abrirAtvAdm(b.dataset.upver));
  $$('[data-upcobra]', box).forEach(b => b.onclick = () => cobrarAtualizacao(b.dataset.upcobra));
  $$('[data-pedok]', box).forEach(b => b.onclick = () => decidePedido(b.dataset.pedok, true));
  $$('[data-pedno]', box).forEach(b => b.onclick = () => decidePedido(b.dataset.pedno, false));
  U.forEach(x => { const k = `upd:${x.a.id}:${Math.floor(x.min / ATUALIZA_ADM_MIN)}`; S.limAvisados = S.limAvisados || new Set(); if (S.limAvisados.has(k)) return; S.limAvisados.add(k);
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification(`O.S. ${x.a.ticket || ''} sem atualização há ${fHm(x.min)}`, { body: `${x.a.tecnicoNome || 'Sem técnico'} · ${ATV_ST[x.a.status] || x.a.status}`, tag: 'upd-' + x.a.id }); } catch (e) {} });
  SL.forEach(x => { const k = `sla:${x.a.id}:${x.nome}:${x.x.estourou ? 'e' : 'v'}`; S.limAvisados = S.limAvisados || new Set(); if (S.limAvisados.has(k)) return; S.limAvisados.add(k); try { if ('Notification' in window && Notification.permission === 'granted') new Notification(`SLA de ${x.nome} ${x.x.estourou ? 'estourado' : 'vencendo'} · O.S. ${x.a.ticket || ''}`, { body: `${x.a.tecnicoNome || 'Sem técnico'} · ${x.x.estourou ? 'passou ' + fHm(-x.x.resto) : 'faltam ' + fHm(x.x.resto)}`, tag: 'sla-' + x.a.id }); } catch (e) {} });
  const hoje = isoDate(Date.now()); S.limAvisados = S.limAvisados || new Set();
  L.forEach(x => { const k = `${x.uid}:${hoje}:${x.falta <= 0 ? 'p' : 'a'}`; if (S.limAvisados.has(k)) return; S.limAvisados.add(k);
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification(x.falta <= 0 ? `${x.nome} passou do limite de horas` : `${x.nome} perto do limite de horas`, { body: `O.S. ${x.os || 'em andamento'} aberta · trabalhou ${fHm(x.trab)} hoje (limite ${fHm(lim)}).`, tag: 'lim-' + x.uid }); } catch (e) {} });
}
setInterval(() => { try { pintaLimites(); } catch (e) {} }, 60000);
async function bootAdmin() {
  menuAdmin();
  if (!RESTRITO && ultimoDiaMes()) setTimeout(() => toast('Último dia do mês: gere o relatório mensal das preventivas (menu > Preventivas do mês).', 9000), 2500);
  if (!ACION && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  document.body.classList.add('adm'); document.title = ACION ? 'Acionamentos Claro · Técnico Plus' : NOC ? 'NOC · Técnico Plus' : 'Painel do supervisor · Técnico Plus';
  S.adm = { de: isoDate(Date.now() - 6 * 86400000), ate: isoDate(Date.now()), tec: '', lim: '80', tecnicos: [] };
  S.view = 'admLogin'; render();
  try { if (await Nuvem.sessaoAdmin()) { if (NOC) { go('noc'); return; } if (ACION) { await acionCarregar(); go('acion'); return; } admPeriodoPapel(); await admCarregar(); menuAdmin(); go(admInicio()); lembraBackup(); } } catch (e) { console.error(e); }
}

/* ============================ início ============================ */
(async function boot() {
  if (ADMIN) return bootAdmin();
  const cv = new URLSearchParams(location.search).get('convite'); if (cv) { S.entrarPrimeiro = true; try { localStorage.setItem('rb_convite', cv.trim().toUpperCase()); } catch (e) {} try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  const ok = await DB.open(); if (!ok) toast('Armazenamento do aparelho indisponível: os dados não serão guardados se o app fechar.', 6000);
  const pf = await DB.get('meta', 'perfil'); if (pf) S.perfil = Object.assign({ prefixo: 'CE-BKB' }, pf);
  const rc = await DB.get('meta', 'recurso'); if (rc && rc.r) S.recurso = rc.r;

  await carregaRotas();
  const at = await DB.get('meta', 'ativa');
  if (at && at.rondaId) { const r = await DB.get('rondas', at.rondaId); if (r && !r.fim) { S.ronda = r; await cacheInspRonda(r); gpsStart(); wakeOn(); } }
  const pls = await DB.get('meta', 'plantoes'); if (pls) S.plantoes = pls.lista || []; const mt = await DB.get('meta', 'metas'); if (mt) S.metas = mt.m || {};
  const ex = await DB.get('meta', 'expAtual'); if (ex && ex.exp) { S.exp = ex.exp; wakeOn(); } const escM = await DB.get('meta', 'escada'); if (escM && escM.v) S.escada = escM.v; if (ex && ex.fimDia) S.expFimDia = ex.fimDia; setTimeout(checaJornada, 1500);
  for (const m of (await DB.all('meta')).filter(x => x._atv)) { if (atvAberta(m)) { const a = { ...m, id: m.id.slice(4) }; delete a._atv; S.atvs.set(a.id, a); } else if (!(await DB.get('fila', 'atv:' + m.id))) await DB.delRaw('meta', m.id); }
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  Nuvem.init();
})();
