// Técnico Plus - Multivale · almoxarifado, materiais e equipamentos
// Os arquivos app-*.js carregam em ordem (ver index.html) e compartilham o mesmo escopo global.
'use strict';
/* ============================ WMS · almoxarifado e materiais dos técnicos ============================ */
// Movimentos (tabela mat_mov): entrada (fornecedor → almox), saida (almox → técnico), devolucao (técnico → almox),
// baixa (consumo do técnico, automático ao concluir a O.S. ou manual), ajuste_almox e ajuste_tec (inventário, ±).
const MOV_TIPO = { entrada: 'Entrada no almoxarifado', saida: 'Liberação para técnico (saída)', devolucao: 'Devolução do técnico', baixa: 'Baixa (consumo)', ajuste_almox: 'Ajuste de inventário · almoxarifado', ajuste_tec: 'Ajuste no saldo do técnico' };
const MOV_COR = { entrada: 'var(--ok)', saida: 'var(--accent)', devolucao: '#7a3fa0', baixa: 'var(--bad)', ajuste_almox: 'var(--muted)', ajuste_tec: 'var(--muted)' };
// contas de estoque com saldo separado
const CONTAS = { claro: 'Manutenção Claro', multivale: 'Backbone Multivale', master: 'Backbone Master' };
const CONTA_COR = { claro: '#c2311d', multivale: '#0b5f99', master: '#7a3fa0' };
const contaDe = m => (m && m.conta) || 'multivale';
// nome da conta com os projetos que usam esse estoque (vínculo do projeto em Centro de custo)
const contaLb = c => { const ps = (S.projs || []).filter(p => p.ativo !== false && p.vinculo === c).map(p => p.nome); return CONTAS[c] + (ps.length && !(ps.length === 1 && ps[0] === CONTAS[c]) ? ' · ' + ps.join(', ') : ''); };
const contaTag = c => `<span class="pill" style="display:inline-flex;width:auto;align-self:flex-start;margin-right:6px;background:${CONTA_COR[c]}1a;color:${CONTA_COR[c]};border:1px solid ${CONTA_COR[c]}55">${esc(CONTAS[c] || c)}</span>`;
// de qual conta sai o material usado numa O.S.
function contaDaInsp(i) {
  if (claroCorr(i) || String(centroOS(i)).startsWith('claro')) return 'claro';
  const inf = i.info || {}; const r = S.ronda && S.ronda.id === i.rondaId ? S.ronda : null;
  const dono = inf.dono || (r && r.dono) || ''; const parc = String(inf.parceiro || (r && r.parceiro) || '');
  if (/claro/i.test(parc) || (r && r.clienteAtv === 'Claro')) return 'claro';
  if (dono === 'parceiro' && /master/i.test(parc)) return 'master';
  return 'multivale';
}
const fQ = n => (+n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const qNum = v => { const n = parseFloat(String(v ?? '').replace(/\./g, (m, o, s) => /,/.test(s) ? '' : m).replace(',', '.')); return isFinite(n) ? n : null; };
const normMat = t => normLocal(String(t || '')).replace(/\s+/g, ' ').trim();
function matLabel(m) { return m ? (m.codigo ? `${m.codigo} — ${m.descricao}` : m.descricao) : ''; }
function matPorId(cat, id) { return (cat || []).find(m => m.id === id) || null; }
function matResolve(cat, txt) {
  const t = String(txt || '').trim(); if (!t) return null; const n = normMat(t);
  return cat.find(m => matLabel(m) === t) || cat.find(m => m.codigo && normMat(m.codigo) === n) || cat.find(m => normMat(m.descricao) === n) || cat.find(m => normMat(matLabel(m)) === n) || null;
}
// saldo do almoxarifado e de cada técnico a partir dos movimentos
function saldosMat(movs, conta) {
  const almox = new Map(), tec = new Map(); const add = (mp, k, v) => mp.set(k, +((mp.get(k) || 0) + v).toFixed(4));
  (movs || []).forEach(m => {
    if (conta && contaDe(m) !== conta) return;
    const q = +m.qtd || 0, k = m.material_id;
    if (m.tipo === 'entrada' || m.tipo === 'devolucao' || m.tipo === 'ajuste_almox') add(almox, k, q);
    if (m.tipo === 'saida') add(almox, k, -q);
    if (m.tecnico_uid && ['saida', 'devolucao', 'baixa', 'ajuste_tec'].includes(m.tipo)) {
      const t = tec.get(m.tecnico_uid) || new Map(); tec.set(m.tecnico_uid, t);
      add(t, k, m.tipo === 'saida' || m.tipo === 'ajuste_tec' ? q : -q);
    }
  });
  return { almox, tec };
}
// nome e unidade de um material (do catálogo ou do próprio movimento, para baixa sem cadastro)
function matInfo(cat, id, movs) { const m = matPorId(cat, id); if (m) return m; const mv = (movs || []).find(x => x.material_id === id); return { id, codigo: '', descricao: (mv && mv.descricao) || id.replace(/^sem:/, ''), unidade: (mv && mv.unidade) || 'un', semCadastro: true }; }

/* ---------- baixa automática: materiais lançados na O.S. saem do saldo do técnico ---------- */
function materiaisDaInsp(i, cat) {
  const por = new Map(); // material_id -> { fonte: qtd, desc, un }
  const soma = (ref, label, qtd, un, fonte) => {
    const q = qNum(qtd); if (!q || q <= 0) return;
    const m = cat.find(x => (x.refs || []).includes(ref)) || matResolve(cat, label);
    const id = m ? m.id : 'sem:' + normMat(label).slice(0, 80);
    const o = por.get(id) || { desc: m ? m.descricao : String(label).trim(), un: m ? m.unidade : un || 'un', f: {} };
    o.f[fonte] = +((o.f[fonte] || 0) + q).toFixed(4); por.set(id, o);
  };
  MATERIAIS.forEach(([k, lb, un]) => soma('mat:' + k, k === 'cabo' && (i.mat || {}).caboSpec ? lb : lb, (i.mat || {})[k], un, 'mat'));
  (i.matExtra || []).forEach(m => m && m.nome && soma('nome:' + normMat(m.nome), m.nome, m.qtd, m.un || m.unid, 'mat'));
  if (!i.apoio) (i.lpu || []).forEach(x => { const it = LPUI.get(x.c); if (it && it.t === 'M') soma('lpu:' + x.c, x.d || it.d, x.q, x.u || it.u, 'lpu'); });
  // o mesmo material informado na lista de materiais e na LPU conta uma vez só (vale o maior)
  return [...por.entries()].map(([id, o]) => ({ material_id: id, descricao: o.desc, unidade: o.un, qtd: Math.max(...Object.values(o.f)) }));
}
async function matCatLocal() { const c = await DB.get('meta', 'matCat'); return (c && c.lista) || []; }
async function baixaDaInsp(i) {
  try {
    if (ADMIN || !i || i.status !== 'concluida') return;
    const cat = await matCatLocal(); const quer = materiaisDaInsp(i, cat);
    const me = Nuvem.user && Nuvem.user.id; const pre = 'bx_' + i.id + '_';
    const tem = (await DB.all('meta')).filter(x => x._mov && x.insp_id === i.id);
    const ticket = (i.corr && i.corr.ticket) || (i.info && i.info.tag) || '';
    for (const b of quer) {
      const id = pre + b.material_id; const ant = tem.find(x => x.id === 'mov:' + id);
      if (ant && +ant.qtd === +b.qtd && ant.material_id === b.material_id && contaDe(ant) === contaDaInsp(i)) continue;
      const mv = { id: 'mov:' + id, _mov: true, org: Nuvem.org ? Nuvem.org() : 'multivale', ts: i.saida || Date.now(), tipo: 'baixa', conta: contaDaInsp(i), material_id: b.material_id, descricao: b.descricao, unidade: b.unidade, qtd: b.qtd, tecnico_uid: me, tecnico_nome: S.perfil.nome, atividade_id: (S.ronda && S.ronda.atividadeId) || i.atividadeId || null, ticket, insp_id: i.id, doc: '', obs: 'Baixa automática da O.S.', por: me, por_nome: S.perfil.nome, criado: (ant && ant.criado) || Date.now() };
      await DB.putRaw('meta', mv); Nuvem.enfileira('mov', mv.id);
    }
    for (const x of tem) { if (!quer.some(b => 'mov:' + pre + b.material_id === x.id) && x.id.startsWith('mov:' + pre)) { await DB.delRaw('meta', x.id); Nuvem.enfileira('mov', x.id); } }
  } catch (e) { console.warn('baixa', e); }
}

/* ---------- técnico: Meus materiais (só o próprio saldo) ---------- */
async function meusMovs() {
  const loc = (await DB.all('meta')).filter(x => x._mov).map(x => ({ ...x, id: x.id.slice(4) }));
  const nuv = ((await DB.get('meta', 'matMovCache')) || {}).lista || [];
  const m = new Map(nuv.map(x => [x.id, x])); loc.forEach(x => m.set(x.id, { ...x, _local: true }));
  // baixas apagadas no celular e ainda não sincronizadas somem também
  const fila = new Set((await DB.all('fila')).filter(f => f.store === 'mov').map(f => f.docId.slice(4)));
  return [...m.values()].filter(x => !(fila.has(x.id) && !loc.some(l => l.id === x.id) && x.tipo === 'baixa' && String(x.id).startsWith('bx_'))).sort((a, b) => b.ts - a.ts);
}
// busca única no catálogo de materiais e na LPU (código ou nome)
function buscaItens(q, cat, saldo) {
  const n = normLocal(String(q || '').trim()); if (n.length < 2) return [];
  const pal = n.split(/\s+/).filter(Boolean); const bate = t => pal.every(w => t.includes(w)); const out = [];
  (cat || []).filter(m => m.ativo !== false).forEach(m => { if (bate(normLocal((m.codigo || '') + ' ' + m.descricao))) out.push({ fonte: 'Material', c: m.codigo || '', d: m.descricao, u: m.unidade || 'un', s: saldo ? saldo(m.id) : null }); });
  LPUI.forEach(x => { if (bate(x.n)) out.push({ fonte: x.t === 'M' ? 'LPU · material' : 'LPU · serviço', c: x.c, d: x.d, u: x.u }); });
  return out.slice(0, 60);
}
function viewMateriais() {
  return `<section class="card"><h2>Consultar LPU e materiais</h2><p class="muted small" style="margin:0">Digite o código ou parte do nome. Mostra os itens da LPU e os materiais do nosso cadastro.</p>
    <input type="search" id="cqBusca" placeholder="Ex.: cordão, 1.11, cabo 12 FO, caixa de emenda" autocomplete="off"><div id="cqRes" class="list"></div></section>
  <section class="card"><div class="row" style="justify-content:space-between"><h2>Meu saldo de materiais</h2><button type="button" class="lnk" id="bMatAtual">Atualizar</button></div>
    <p class="muted small" style="margin:0">Material que o almoxarifado entregou para você, menos o que você usou nas O.S. e devolveu. Os materiais lançados na O.S. são baixados sozinhos quando você conclui o atendimento.</p>
    <div id="matSaldo"><p class="empty">Carregando…</p></div></section>
  <section class="card"><h2>Registrar uso de material</h2><p class="muted small" style="margin:0">Use só para material gasto fora de uma O.S. lançada no app (ex.: perda, material usado em apoio).</p>
    <div class="grid2"><div class="field full"><label class="lb" for="mbConta">Saldo</label><select id="mbConta">${Object.entries(CONTAS).map(([k, l]) => `<option value="${k}" ${(soClaro() ? 'claro' : 'multivale') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field full"><label class="lb" for="mbMat">Material</label><input type="text" id="mbMat" list="dlMatT" placeholder="Digite o código ou o nome"><datalist id="dlMatT"></datalist></div>
    <div class="field"><label class="lb" for="mbQtd">Quantidade</label><input type="text" inputmode="decimal" id="mbQtd" placeholder="0"></div>
    <div class="field"><label class="lb" for="mbOs">O.S. / ticket (opcional)</label><input type="text" id="mbOs" autocapitalize="characters"></div>
    <div class="field full"><label class="lb" for="mbObs">Observação</label><input type="text" id="mbObs" placeholder="Onde / por que foi usado"></div></div>
    <button type="button" class="btn pri block" id="bMbSalvar">${ICON.check}Registrar baixa</button></section>
  <section class="acts"><div class="ah"><span>Movimentos</span></div><div id="matMovs"><p class="empty">Carregando…</p></div></section>`;
}
async function afterMateriais() {
  $('#cqBusca') && ($('#cqBusca').oninput = async e => { const cat = await matCatLocal(); const movs = await meusMovs(); const me = Nuvem.user && Nuvem.user.id; const meus = movs.filter(m => !me || m.tecnico_uid === me || m._local);
    const sal = id => Object.keys(CONTAS).reduce((s2, c) => { const T = saldosMat(meus, c).tec; const mp = T.get(me) || (T.size === 1 ? [...T.values()][0] : new Map()); return s2 + (mp.get(id) || 0); }, 0);
    const L = buscaItens(e.target.value, cat, sal); const box = $('#cqRes'); if (!box) return;
    box.innerHTML = String(e.target.value).trim().length < 2 ? '' : L.length ? L.map(x => `<div class="item" style="cursor:default;align-items:center"><span class="badge" style="width:auto;padding:0 8px;border-radius:6px;font-size:11px;background:${x.fonte === 'Material' ? 'var(--accent-soft)' : 'var(--surface-2)'};color:var(--ink)">${esc(x.fonte)}</span><span class="tx" style="flex:1"><b>${esc(x.c ? x.c + ' — ' : '')}${esc(x.d)}</b><span>Unidade: ${esc(x.u || '')}${x.s != null ? ` · meu saldo: <b>${fQ(x.s)}</b>` : ''}</span></span></div>`).join('') : '<p class="empty">Nada encontrado.</p>'; });
  const pinta = async () => {
    const cat = await matCatLocal(); const movs = await meusMovs(); const me = Nuvem.user && Nuvem.user.id;
    const meus = movs.filter(m => !me || m.tecnico_uid === me || m._local);
    const dl = $('#dlMatT'); if (dl) dl.innerHTML = cat.filter(m => m.ativo !== false).map(m => `<option value="${esc(matLabel(m))}">`).join('');
    const blocos = Object.keys(CONTAS).map(c => { const T = saldosMat(meus, c).tec; const sal = T.get(me) || (T.size === 1 ? [...T.values()][0] : new Map()); return { c, linhas: [...sal.entries()].filter(([, q]) => Math.abs(q) > 1e-9).map(([k, q]) => ({ m: matInfo(cat, k, meus), q })).sort((x, y) => x.m.descricao.localeCompare(y.m.descricao)) }; }).filter(x => x.linhas.length);
    const box = $('#matSaldo'); if (!box) return;
    box.innerHTML = blocos.length ? blocos.map(({ c, linhas }) => `<h3 style="margin:10px 0 0">${contaTag(c)}</h3><div class="list">${linhas.map(({ m, q }) => `<div class="item" style="cursor:default;align-items:center"><span class="tx"><b>${esc(m.descricao)}</b><span>${esc(m.codigo || (m.semCadastro ? 'sem cadastro no almoxarifado' : ''))}</span></span><b style="font-size:18px;white-space:nowrap;color:${q < 0 ? 'var(--bad)' : 'inherit'}">${fQ(q)} ${esc(m.unidade || '')}</b></div>`).join('')}</div>`).join('') + (blocos.some(x => x.linhas.some(l => l.q < 0)) ? '<div class="warnbox small">Saldo negativo: foi usado mais do que o almoxarifado registrou de saída para você. Avise o almoxarifado.</div>' : '') : '<p class="empty">Nenhum material em seu nome.</p>';
    const lm = $('#matMovs'); if (lm) lm.innerHTML = meus.length ? meus.slice(0, 60).map(m => `<div class="act" style="cursor:default"><span class="st" style="background:${MOV_COR[m.tipo]}"></span><span class="tm">${fData(m.ts).slice(0, 5)}<span>${fHora(m.ts)}</span></span><span class="bd"><b>${m.tipo === 'saida' ? '+' : m.tipo === 'baixa' || m.tipo === 'devolucao' ? '−' : '±'} ${fQ(m.qtd)} ${esc(m.unidade || '')} · ${esc(m.descricao || matInfo(cat, m.material_id, meus).descricao)}</b><span>${esc(CONTAS[contaDe(m)])} · ${esc(m.tipo === 'saida' ? 'Recebido do almoxarifado' : m.tipo === 'devolucao' ? 'Devolvido ao almoxarifado' : m.tipo === 'baixa' ? 'Usado' : 'Ajuste')}${m.ticket ? ' · O.S. ' + esc(m.ticket) : ''}${m.obs ? ' · ' + esc(m.obs) : ''}${m._local ? ' · aguardando envio' : ''}</span></span>${m.tipo === 'baixa' && String(m.id).startsWith('bm_') ? `<button type="button" class="lnk" data-mbdel="${esc(m.id)}">Excluir</button>` : ''}</div>`).join('') : '<p class="empty">Nenhum movimento ainda.</p>';
    $$('[data-mbdel]').forEach(b => b.onclick = async () => { if (!confirm('Excluir esta baixa?')) return; await DB.delRaw('meta', 'mov:' + b.dataset.mbdel); const c = (await DB.get('meta', 'matMovCache')) || { lista: [] }; c.lista = (c.lista || []).filter(x => x.id !== b.dataset.mbdel); await DB.putRaw('meta', { ...c, id: 'matMovCache' }); Nuvem.enfileira('mov', 'mov:' + b.dataset.mbdel); pinta(); });
  };
  const nuvem = async () => { if (!Nuvem.on) return; try { const [cat, movs] = await Promise.all([Nuvem.matCatalogo(), Nuvem.movMeus()]); await DB.putRaw('meta', { id: 'matCat', lista: cat }); await DB.putRaw('meta', { id: 'matMovCache', lista: movs }); } catch (e) { console.warn(e); } };
  await pinta(); nuvem().then(pinta);
  $('#bMatAtual').onclick = async () => { toast('Atualizando…'); await nuvem(); pinta(); };
  $('#bMbSalvar').onclick = async () => {
    const cat = await matCatLocal(); const txt = $('#mbMat').value.trim(); const q = qNum($('#mbQtd').value);
    if (!txt) { toast('Informe o material.'); $('#mbMat').focus(); return; } if (!q || q <= 0) { toast('Informe a quantidade.'); $('#mbQtd').focus(); return; }
    const m = matResolve(cat, txt); const me = Nuvem.user && Nuvem.user.id; const id = 'bm_' + uid();
    const mv = { id: 'mov:' + id, _mov: true, org: Nuvem.org(), ts: Date.now(), tipo: 'baixa', conta: $('#mbConta').value, material_id: m ? m.id : 'sem:' + normMat(txt).slice(0, 80), descricao: m ? m.descricao : txt, unidade: m ? m.unidade : 'un', qtd: q, tecnico_uid: me, tecnico_nome: S.perfil.nome, atividade_id: null, ticket: $('#mbOs').value.trim().toUpperCase(), insp_id: null, doc: '', obs: $('#mbObs').value.trim(), por: me, por_nome: S.perfil.nome, criado: Date.now() };
    await DB.putRaw('meta', mv); Nuvem.enfileira('mov', mv.id); ['mbMat', 'mbQtd', 'mbOs', 'mbObs'].forEach(k => $('#' + k).value = ''); toast('Baixa registrada.'); pinta();
  };
}

/* ---------- gestor: almoxarifado, saídas, saldos de todos ---------- */
// ---------- equipamentos de alto custo (patrimônio): máquina de fusão, OTDR, máquina de espinar… ----------
const EQ_TIPO = { maquina_fusao: 'Máquina de fusão', otdr: 'OTDR', espinadeira: 'Máquina de espinar', clivador: 'Clivador', power_meter: 'Power meter / fonte de luz', vfl: 'Caneta de luz (VFL)', gerador: 'Gerador', outro: 'Outro' };
const EQ_ST = { almox: 'No almoxarifado', tecnico: 'Com técnico', manutencao: 'Em manutenção', baixado: 'Baixado' };
const EQM_TIPO = { cadastro: 'Cadastro', entrega: 'Entrega ao técnico', devolucao: 'Devolução ao almoxarifado', transf: 'Transferência entre técnicos', manutencao: 'Enviado para manutenção', retorno: 'Retorno da manutenção', baixa: 'Baixa' };
const EQ_ESTADO = ['Bom estado', 'Com avaria', 'Com defeito'];
const EQ_TERMO = 'Declaro que recebi o equipamento descrito, para uso exclusivo nas atividades da Multivale. Comprometo-me a zelar pela sua guarda e conservação, a não emprestá-lo a terceiros, a comunicar imediatamente ao supervisor qualquer dano, defeito, perda, furto ou roubo (com boletim de ocorrência) e a devolvê-lo quando solicitado ou no meu desligamento.';
const eqpCal = e => { if (!e || !e.calibracao) return null; const d = Date.parse(e.calibracao + 'T12:00:00'); if (isNaN(d)) return null; const dias = Math.floor((d - Date.now()) / 864e5); return { dias, txt: fData(d), cor: dias < 0 ? 'var(--bad)' : dias <= 30 ? '#b26a00' : 'inherit', aviso: dias < 0 ? 'calibração vencida' : dias <= 30 ? `calibração vence em ${dias} dia(s)` : '' }; };
const eqpUltRec = (mov, e) => mov.filter(m => m.equip_id === e.id && (m.tipo === 'entrega' || m.tipo === 'transf') && m.para_uid === e.tecnico_uid).sort((a, b) => b.ts - a.ts)[0] || null;
async function eqpCarrega(forca) {
  if (S.eqpAdm && !forca && Date.now() - S.eqpAdm.t < 60000) return S.eqpAdm;
  const [eq, mov] = await Promise.all([Nuvem.eqpTodos(), Nuvem.eqpMovTodos()]); S.eqpAdm = { eq, mov, t: Date.now() }; return S.eqpAdm;
}
async function termoEqp(e, m) {
  const { doc, logo } = await novoPdf(); let y = pdfHeader(doc, logo, 'Termo de responsabilidade', 'Equipamento da empresa', e.patrimonio || e.serie || null, e.patrimonio ? 'PATRIMÔNIO' : 'Nº DE SÉRIE');
  y = pdfSec(doc, y, 1, 'Equipamento'); y = kv(doc, y, [['Tipo', EQ_TIPO[e.tipo] || e.tipo], ['Descrição', e.descricao], ['Marca / modelo', [e.marca, e.modelo].filter(Boolean).join(' ') || '—'], ['Nº de série', e.serie || '—'], ['Patrimônio', e.patrimonio || '—'], ['Valor de referência', e.valor ? fBRL(e.valor) : '—'], ['Projeto', e.projeto ? projNome(e.projeto) : '—'], ['Calibração até', eqpCal(e) ? eqpCal(e).txt : '—']]);
  y = pdfSec(doc, y, 2, 'Responsável'); y = kv(doc, y, [['Técnico', m.para_nome || e.tecnico_nome || '—'], ['Entregue em', fDH(m.ts)], ['Entregue por', m.por_nome || '—'], ['Origem', m.tipo === 'transf' ? 'Transferido de ' + (m.de_nome || '—') : 'Almoxarifado'], ['Estado na entrega', m.estado || '—'], ['Observação', m.obs || '—']]);
  y = pdfSec(doc, y, 3, 'Declaração'); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(20);
  const ls = doc.splitTextToSize(EQ_TERMO, 186); doc.text(ls, 12, y + 2); y += ls.length * 4.6 + 8;
  doc.setFont('helvetica', 'bold'); doc.text(m.aceite_ts ? `Recebimento confirmado no app Técnico Plus em ${fDH(m.aceite_ts)} por ${m.aceite_nome || m.para_nome || ''}.` : 'Recebimento ainda não confirmado no app.', 12, y); y += 24;
  doc.setDrawColor(60); doc.setLineWidth(0.3); doc.line(12, y, 95, y); doc.line(115, y, 198, y); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(m.para_nome || 'Técnico', 12, y + 4.5); doc.text('Multivale · ' + (m.por_nome || 'Almoxarifado'), 115, y + 4.5);
  pdfFooter(doc, `Técnico Plus - Multivale · termo de responsabilidade · ${e.descricao}`);
  baixar(new File([doc.output('blob')], nomeArq(`Termo_${e.patrimonio || e.serie || e.descricao}_${m.para_nome || ''}`), { type: 'application/pdf' }));
}
function eqpFormHtml(e) {
  return `<section class="card" style="box-shadow:none;border:1px solid var(--line)"><h3 style="margin-top:0">${e._novo ? 'Cadastrar equipamento' : 'Editar · ' + esc(e.descricao)}</h3><div class="grid3">
    <div class="field"><label class="lb" for="eqTipo">Tipo</label><select id="eqTipo">${Object.entries(EQ_TIPO).map(([k, l]) => `<option value="${k}" ${e.tipo === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field" style="grid-column:span 2"><label class="lb" for="eqDesc">Descrição <span class="req">*</span></label><input type="text" id="eqDesc" value="${esc(e.descricao || '')}" placeholder="Ex.: Máquina de fusão Fujikura 90S+"></div>
    <div class="field"><label class="lb" for="eqMarca">Marca</label><input type="text" id="eqMarca" value="${esc(e.marca || '')}"></div><div class="field"><label class="lb" for="eqModelo">Modelo</label><input type="text" id="eqModelo" value="${esc(e.modelo || '')}"></div>
    <div class="field"><label class="lb" for="eqPat">Patrimônio</label><input type="text" id="eqPat" value="${esc(e.patrimonio || '')}" autocapitalize="characters"></div>
    <div class="field"><label class="lb" for="eqSerie">Nº de série</label><input type="text" id="eqSerie" value="${esc(e.serie || '')}" autocapitalize="characters"></div>
    <div class="field"><label class="lb" for="eqValor">Valor de referência (R$)</label><input type="text" inputmode="decimal" id="eqValor" value="${e.valor != null ? esc(String(e.valor).replace('.', ',')) : ''}"></div>
    <div class="field"><label class="lb" for="eqCal">Calibração válida até</label><input type="date" id="eqCal" value="${esc(e.calibracao || '')}"></div>
    <div class="field"><label class="lb" for="eqProj">Projeto (centro de custo)</label><select id="eqProj">${projOpts(e.projeto, 'Sem projeto')}</select></div>
    <div class="field" style="grid-column:span 2"><label class="lb" for="eqObs">Observação</label><input type="text" id="eqObs" value="${esc(e.obs || '')}" placeholder="Acessórios, maleta, carregador…"></div></div>
    <div class="row" style="gap:8px"><button type="button" class="btn pri" id="bEqSalva">${ICON.check}Salvar</button><button type="button" class="btn" id="bEqCanc">Cancelar</button></div></section>`;
}
async function eqpAba(box) {
  let D; try { D = await eqpCarrega(); } catch (e) { box.innerHTML = `<section class="card"><div class="warnbox">Não foi possível carregar os equipamentos: ${esc(e.message || e)}. Rode o supabase.sql novo (v52: tabelas equipamentos e equip_mov).</div></section>`; return; }
  const tecs = (S.adm && S.adm.tecnicos) || []; const nomeTec = u => (tecs.find(t => t.uid === u) || {}).nome || (D.eq.find(e => e.tecnico_uid === u) || {}).tecnico_nome || 'Técnico';
  const F = S.eqpF = S.eqpF || { q: '', st: 'ativos' };
  const ativos = D.eq.filter(e => e.status !== 'baixado'); const cont = st => ativos.filter(e => e.status === st).length;
  const calAl = ativos.filter(e => { const c = eqpCal(e); return c && c.dias <= 30; }).length; const pend = ativos.filter(e => e.status === 'tecnico' && !(eqpUltRec(D.mov, e) || {}).aceite_ts).length;
  const nq = normLocal(F.q || '').trim();
  const L = D.eq.filter(e => (F.st === 'ativos' ? e.status !== 'baixado' : e.status === F.st) && (!nq || nq.split(/\s+/).every(w => normLocal([e.descricao, e.marca, e.modelo, e.patrimonio, e.serie, e.tecnico_nome, EQ_TIPO[e.tipo]].join(' ')).includes(w))))
    .sort((a, b) => (a.tecnico_nome || '~').localeCompare(b.tecnico_nome || '~') || a.descricao.localeCompare(b.descricao));
  box.innerHTML = `<section class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Equipamentos de alto custo</h2><span class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn" id="bEqpCsv" style="min-height:40px">Exportar planilha</button><button type="button" class="btn pri" id="bEqpNovo" style="min-height:40px">${ICON.plus}Novo equipamento</button></span></div>
    <div class="stats"><div class="stat"><b>${cont('tecnico')}</b><span>Com técnicos</span></div><div class="stat"><b>${cont('almox')}</b><span>No almoxarifado</span></div><div class="stat"><b>${cont('manutencao')}</b><span>Em manutenção</span></div><div class="stat"><b style="${pend ? 'color:#b26a00' : ''}">${pend}</b><span>Recebimento não confirmado</span></div><div class="stat"><b style="${calAl ? 'color:var(--bad)' : ''}">${calAl}</b><span>Calibração vencida ou vencendo</span></div></div>
    <div id="eqpForm"></div>
    <input type="search" id="eqpQ" value="${esc(F.q)}" placeholder="Buscar: OTDR, patrimônio, série, técnico…" autocomplete="off">
    <div class="chips" role="group" aria-label="Situação">${[['ativos', 'Ativos'], ['tecnico', 'Com técnico'], ['almox', 'Almoxarifado'], ['manutencao', 'Manutenção'], ['baixado', 'Baixados']].map(([k, l]) => `<button type="button" role="radio" data-eqpst="${k}" aria-checked="${F.st === k}">${l}</button>`).join('')}</div>
    <div class="tw"><table class="t"><thead><tr><th>Equipamento</th><th>Tipo</th><th>Patrimônio</th><th>Nº de série</th><th>Com quem</th><th>Desde</th><th>Calibração</th><th>Termo</th><th></th></tr></thead><tbody>
    ${L.map(e => { const c = eqpCal(e); const r = e.status === 'tecnico' ? eqpUltRec(D.mov, e) : null; return `<tr style="${e.status === 'baixado' ? 'opacity:.55' : ''}"><td><b>${esc(e.descricao)}</b>${e.marca || e.modelo ? `<br><span class="small muted">${esc([e.marca, e.modelo].filter(Boolean).join(' '))}</span>` : ''}</td><td>${esc(EQ_TIPO[e.tipo] || e.tipo)}</td><td>${esc(e.patrimonio || '—')}</td><td>${esc(e.serie || '—')}</td><td>${e.status === 'tecnico' ? `<b>${esc(e.tecnico_nome || nomeTec(e.tecnico_uid))}</b>` : `<span class="pill ${e.status === 'baixado' ? 'bad' : e.status === 'manutencao' ? 'draft' : ''}">${esc(EQ_ST[e.status] || e.status)}</span>`}</td><td>${e.desde ? fData(e.desde) : '—'}</td><td style="color:${c ? c.cor : 'inherit'};white-space:nowrap">${c ? esc(c.txt) : '—'}</td><td>${r ? (r.aceite_ts ? '<span class="pill ok">Confirmado</span>' : '<span class="pill draft">Pendente</span>') : '—'}</td><td><button type="button" class="btn" data-eqpab="${esc(e.id)}" style="min-height:36px;padding:0 10px">Abrir</button></td></tr>`; }).join('') || `<tr><td colspan="9" class="muted">Nenhum equipamento${F.q || F.st !== 'ativos' ? ' neste filtro' : ' cadastrado ainda'}.</td></tr>`}
    </tbody></table></div></section><div id="eqpDet"></div>`;
  const repinta = async (forca, foco) => { if (forca) await eqpCarrega(true); await eqpAba(box); if (foco) { const i = $('#eqpQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } };
  let tq; $('#eqpQ').oninput = ev => { clearTimeout(tq); tq = setTimeout(() => { F.q = ev.target.value; repinta(false, true); }, 300); };
  $$('[data-eqpst]', box).forEach(b => b.onclick = () => { F.st = b.dataset.eqpst; repinta(); });
  const grava = async (eq, mov) => { await Nuvem.eqpSalvar([{ ...eq, atualizado: Date.now() }]); if (mov) await Nuvem.eqpMovGravar([{ id: 'em_' + uid(), org: Nuvem.org(), ts: Date.now(), equip_id: eq.id, de_uid: null, de_nome: null, para_uid: null, para_nome: null, estado: null, obs: null, por: Nuvem.user.id, por_nome: (Nuvem.admin || {}).nome || '', aceite_ts: null, aceite_nome: null, ...mov }]); };
  const abreForm = e => { const f = $('#eqpForm'); f.innerHTML = eqpFormHtml(e); f.scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#eqDesc').focus();
    $('#bEqCanc').onclick = () => { f.innerHTML = ''; };
    $('#bEqSalva').onclick = async () => { const descricao = $('#eqDesc').value.trim(); if (!descricao) { toast('Informe a descrição.'); $('#eqDesc').focus(); return; }
      const pat = $('#eqPat').value.trim().toUpperCase(), serie = $('#eqSerie').value.trim().toUpperCase(); const vs = $('#eqValor').value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'); const valor = vs && !isNaN(+vs) ? +vs : null;
      const dup = D.eq.find(x => x.id !== e.id && x.status !== 'baixado' && ((pat && x.patrimonio === pat) || (serie && x.serie === serie)));
      if (dup && !confirm(`Já existe "${dup.descricao}" com este ${dup.patrimonio === pat ? 'patrimônio' : 'nº de série'}. Salvar mesmo assim?`)) return;
      const { _novo, ...base } = e; const eq = { ...base, tipo: $('#eqTipo').value, descricao, marca: $('#eqMarca').value.trim() || null, modelo: $('#eqModelo').value.trim() || null, patrimonio: pat || null, serie: serie || null, valor, calibracao: $('#eqCal').value || null, projeto: $('#eqProj').value || null, obs: $('#eqObs').value.trim() || null };
      try { await grava(eq, _novo ? { tipo: 'cadastro', obs: 'Entrada no almoxarifado' } : null); toast(_novo ? 'Equipamento cadastrado no almoxarifado.' : 'Dados salvos.'); S.eqpSel = eq.id; await repinta(true); } catch (er) { toast('Erro ao gravar: ' + (er.message || er), 7000); } };
  };
  $('#bEqpNovo').onclick = () => abreForm({ _novo: true, id: 'eq_' + uid(), org: Nuvem.org(), tipo: 'maquina_fusao', status: 'almox', tecnico_uid: null, tecnico_nome: null, desde: Date.now() });
  $('#bEqpCsv').onclick = () => { const linhas = [['Tipo', 'Descrição', 'Marca', 'Modelo', 'Patrimônio', 'Nº de série', 'Valor', 'Projeto', 'Situação', 'Com quem', 'Desde', 'Calibração até', 'Recebimento confirmado']];
    D.eq.forEach(e => { const r = e.status === 'tecnico' ? eqpUltRec(D.mov, e) : null; linhas.push([EQ_TIPO[e.tipo] || e.tipo, e.descricao, e.marca, e.modelo, e.patrimonio, e.serie, e.valor != null ? String(e.valor).replace('.', ',') : '', e.projeto ? projNome(e.projeto) : '', EQ_ST[e.status], e.status === 'tecnico' ? e.tecnico_nome : '', e.desde ? fData(e.desde) : '', eqpCal(e) ? eqpCal(e).txt : '', r ? (r.aceite_ts ? fDH(r.aceite_ts) : 'pendente') : '']); });
    const t = '﻿' + linhas.map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n'); baixar(new File([t], `Equipamentos_${isoDate(Date.now())}.csv`, { type: 'text/csv' })); };
  const det = () => { const bx = $('#eqpDet'); const e = D.eq.find(x => x.id === S.eqpSel); if (!bx || !e) return; const c = eqpCal(e); const H = D.mov.filter(m => m.equip_id === e.id).sort((a, b) => b.ts - a.ts); const r = e.status === 'tecnico' ? eqpUltRec(D.mov, e) : null;
    const bt = (k, l, pri) => `<button type="button" class="btn${pri ? ' pri' : ''}" data-eqac="${k}" style="min-height:40px">${l}</button>`;
    const acoes = e.status === 'almox' ? bt('entrega', 'Entregar a um técnico', 1) + bt('manutencao', 'Enviar para manutenção') + bt('baixa', 'Dar baixa') : e.status === 'tecnico' ? bt('devolucao', 'Receber devolução', 1) + bt('transf', 'Transferir para outro técnico') + bt('manutencao', 'Enviar para manutenção') + bt('baixa', 'Dar baixa') : e.status === 'manutencao' ? bt('retorno', 'Retorno da manutenção', 1) + bt('baixa', 'Dar baixa') : '';
    bx.innerHTML = `<section class="card" id="eqpCard"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>${esc(e.descricao)}</h2><button type="button" class="lnk" id="bEqFecha">Fechar</button></div>
      <p style="margin:0">${esc(EQ_TIPO[e.tipo] || e.tipo)}${e.marca || e.modelo ? ' · ' + esc([e.marca, e.modelo].filter(Boolean).join(' ')) : ''}${e.patrimonio ? ' · Patrimônio <b>' + esc(e.patrimonio) + '</b>' : ''}${e.serie ? ' · S/N <b>' + esc(e.serie) + '</b>' : ''}${e.valor ? ' · ' + fBRL(e.valor) : ''}${e.projeto ? ' · ' + esc(projNome(e.projeto)) : ''}</p>
      <p style="margin:0"><b>${e.status === 'tecnico' ? 'Com ' + esc(e.tecnico_nome || nomeTec(e.tecnico_uid)) : esc(EQ_ST[e.status])}</b>${e.desde ? ' desde ' + fData(e.desde) : ''}${r ? (r.aceite_ts ? ` · recebimento confirmado em ${fDH(r.aceite_ts)}` : ' · <span style="color:#b26a00">recebimento ainda não confirmado no app</span>') : ''}${c ? ` · <span style="color:${c.cor}">calibração até ${esc(c.txt)}${c.aviso ? ' (' + c.aviso + ')' : ''}</span>` : ''}${e.obs ? '<br><span class="small muted">' + esc(e.obs) + '</span>' : ''}</p>
      <div class="row" style="gap:6px;flex-wrap:wrap">${acoes}${r ? `<button type="button" class="btn" id="bEqTermo" style="min-height:40px">Termo de responsabilidade (PDF)</button>` : ''}${e.status !== 'baixado' ? `<button type="button" class="btn" id="bEqEdita" style="min-height:40px">Editar dados</button>` : ''}</div>
      <div id="eqAcao"></div>
      <h3>Histórico</h3><div class="tw"><table class="t"><thead><tr><th>Quando</th><th>Movimento</th><th>De</th><th>Para</th><th>Estado</th><th>Observação</th><th>Por</th><th>Recebimento</th></tr></thead><tbody>
      ${H.map(m => `<tr><td style="white-space:nowrap">${fDH(m.ts)}</td><td>${esc(EQM_TIPO[m.tipo] || m.tipo)}</td><td>${esc(m.de_nome || '—')}</td><td>${esc(m.para_nome || '—')}</td><td>${esc(m.estado || '—')}</td><td>${esc(m.obs || '—')}</td><td>${esc(m.por_nome || '—')}</td><td>${m.para_uid ? (m.aceite_ts ? 'confirmado ' + fDH(m.aceite_ts) : 'pendente') : '—'}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">Sem movimentos.</td></tr>'}</tbody></table></div></section>`;
    $('#bEqFecha').onclick = () => { S.eqpSel = null; bx.innerHTML = ''; };
    $('#bEqEdita') && ($('#bEqEdita').onclick = () => abreForm({ ...e }));
    $('#bEqTermo') && ($('#bEqTermo').onclick = () => termoEqp(e, r));
    $$('[data-eqac]', bx).forEach(b => b.onclick = () => { const k = b.dataset.eqac; const box2 = $('#eqAcao'); const opsTec = tecs.filter(t => t.uid !== e.tecnico_uid).map(t => `<option value="${esc(t.uid)}">${esc(t.nome)}</option>`).join('');
      box2.innerHTML = `<section class="card" style="box-shadow:none;border:1px solid var(--line)"><h3 style="margin-top:0">${esc(EQM_TIPO[k])}</h3><div class="grid2">
        ${k === 'entrega' || k === 'transf' ? `<div class="field"><label class="lb" for="eaTec">${k === 'transf' ? 'Para o técnico' : 'Técnico'} <span class="req">*</span></label><select id="eaTec"><option value="">Selecione…</option>${opsTec}</select></div>` : ''}
        ${k === 'entrega' || k === 'transf' || k === 'devolucao' || k === 'retorno' ? `<div class="field"><label class="lb" for="eaEst">Estado do equipamento</label><select id="eaEst">${EQ_ESTADO.map(x => `<option>${x}</option>`).join('')}</select></div>` : ''}
        ${k === 'baixa' ? `<div class="field"><label class="lb" for="eaMot">Motivo <span class="req">*</span></label><select id="eaMot"><option value="">Selecione…</option><option>Perda</option><option>Furto / roubo</option><option>Sem conserto (sucata)</option><option>Venda / devolução ao fornecedor</option></select></div>` : ''}
        ${k === 'retorno' ? `<div class="field"><label class="lb" for="eaCal">Nova calibração válida até</label><input type="date" id="eaCal" value="${esc(e.calibracao || '')}"></div>` : ''}
        <div class="field full"><label class="lb" for="eaObs">Observação${k === 'manutencao' ? ' (assistência e defeito)' : k === 'baixa' ? ' (nº do B.O., se houver)' : ''}</label><input type="text" id="eaObs"></div></div>
        ${k === 'entrega' || k === 'transf' ? '<p class="muted small" style="margin:0">O técnico confirma o recebimento no app (Perfil). O termo de responsabilidade em PDF sai com essa confirmação.</p>' : ''}
        <div class="row" style="gap:8px"><button type="button" class="btn pri" id="bEaOk">${ICON.check}Confirmar</button><button type="button" class="btn" id="bEaCanc">Cancelar</button></div></section>`;
      box2.scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#bEaCanc').onclick = () => { box2.innerHTML = ''; };
      $('#bEaOk').onclick = async () => { const obs = $('#eaObs').value.trim() || null; const estado = $('#eaEst') ? $('#eaEst').value : null; const agora = Date.now(); const atual = e.status === 'tecnico' ? { de_uid: e.tecnico_uid, de_nome: e.tecnico_nome || nomeTec(e.tecnico_uid) } : {};
        let eq, mov;
        if (k === 'entrega' || k === 'transf') { const t = $('#eaTec').value; if (!t) { toast('Escolha o técnico.'); $('#eaTec').focus(); return; } const nm = nomeTec(t); eq = { ...e, status: 'tecnico', tecnico_uid: t, tecnico_nome: nm, desde: agora }; mov = { tipo: k, ...atual, para_uid: t, para_nome: nm, estado, obs }; }
        else if (k === 'devolucao') { eq = { ...e, status: 'almox', tecnico_uid: null, tecnico_nome: null, desde: agora }; mov = { tipo: k, ...atual, estado, obs }; }
        else if (k === 'manutencao') { if (!obs) { toast('Informe a assistência e o defeito.'); $('#eaObs').focus(); return; } eq = { ...e, status: 'manutencao', tecnico_uid: null, tecnico_nome: null, desde: agora }; mov = { tipo: k, ...atual, obs }; }
        else if (k === 'retorno') { eq = { ...e, status: 'almox', desde: agora, calibracao: $('#eaCal').value || e.calibracao || null }; mov = { tipo: k, estado, obs: [obs, $('#eaCal').value && $('#eaCal').value !== e.calibracao ? 'calibração até ' + fData(Date.parse($('#eaCal').value + 'T12:00:00')) : ''].filter(Boolean).join(' · ') || null }; }
        else if (k === 'baixa') { const mot = $('#eaMot').value; if (!mot) { toast('Escolha o motivo da baixa.'); $('#eaMot').focus(); return; } if (!confirm(`Dar baixa em ${e.descricao}? Ele sai da lista de ativos.`)) return; eq = { ...e, status: 'baixado', tecnico_uid: null, tecnico_nome: null, desde: agora }; mov = { tipo: k, ...atual, estado: mot, obs }; }
        try { await grava(eq, mov); toast(k === 'entrega' || k === 'transf' ? `Entregue a ${eq.tecnico_nome}. Ele confirma o recebimento no app.` : 'Movimento registrado.'); await repinta(true); } catch (er) { toast('Erro ao gravar: ' + (er.message || er), 7000); } };
    });
  };
  $$('[data-eqpab]', box).forEach(b => b.onclick = () => { S.eqpSel = b.dataset.eqpab; det(); setTimeout(() => { const c = $('#eqpCard'); c && c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); });
  if (S.eqpSel) det();
}
// técnico: equipamentos sob a responsabilidade dele (Perfil) e confirmação do recebimento
async function eqpMeusLer() {
  if (Nuvem.on && Nuvem.user) { try { const d = await Nuvem.eqpMeus(); await DB.putRaw('meta', { id: 'eqpMeus', ...d }); return d; } catch (e) {} }
  const c = await DB.get('meta', 'eqpMeus'); return c ? { eq: c.eq || [], mov: c.mov || [] } : { eq: [], mov: [] };
}
async function pintaMeusEqp() {
  const sec = $('#pfEquip'), box = $('#pfEqBox'); if (!sec || !box) return; let D; try { D = await eqpMeusLer(); } catch (e) { return; }
  const me = Nuvem.user && Nuvem.user.id; const L = D.eq.filter(e => e.status === 'tecnico' && (!me || e.tecnico_uid === me)); sec.hidden = !L.length; if (!L.length) return;
  box.innerHTML = L.map(e => { const r = eqpUltRec(D.mov, e); const c = eqpCal(e); return `<div style="border-bottom:1px solid var(--line);padding:8px 0"><b>${esc(e.descricao)}</b><br><span class="small muted">${esc(EQ_TIPO[e.tipo] || e.tipo)}${e.patrimonio ? ' · Pat. ' + esc(e.patrimonio) : ''}${e.serie ? ' · S/N ' + esc(e.serie) : ''}${e.desde ? ' · com você desde ' + fData(e.desde) : ''}</span>${c && c.aviso ? `<br><span class="small" style="color:${c.cor}">${esc(c.aviso)} (${esc(c.txt)}) · avise o supervisor</span>` : ''}
    ${r && !r.aceite_ts ? `<div class="warnbox" style="margin-top:6px"><span class="small">${esc(EQ_TERMO)}</span><button type="button" class="btn pri block" data-eqok="${esc(r.id)}" style="margin-top:8px">${ICON.check}Confirmo que recebi</button></div>` : r ? `<br><span class="small muted">Recebimento confirmado em ${fDH(r.aceite_ts)}</span>` : ''}</div>`; }).join('');
  $$('[data-eqok]', box).forEach(b => b.onclick = async () => { if (!Nuvem.on) { toast('Sem internet: confirme quando tiver sinal.'); return; } b.disabled = true; try { await Nuvem.eqpAceite(b.dataset.eqok); toast('Recebimento confirmado. Obrigado!'); } catch (e) { toast('Não foi possível confirmar: ' + (e.message || e), 7000); } pintaMeusEqp(); });
}
async function matCarrega(forca) {
  if (S.matAdm && !forca && Date.now() - S.matAdm.t < 60000) return S.matAdm;
  const [cat, mov] = await Promise.all([Nuvem.matCatalogo(), Nuvem.movTodos()]); S.matAdm = { cat, mov, t: Date.now() }; return S.matAdm;
}
function viewAdmMat() {
  const ab = S.matAba || 'saldos';
  return `<section class="card"><div class="seg" role="group" aria-label="Almoxarifado">${[['saldos', 'Saldos'], ['mov', 'Movimentar'], ['hist', 'Movimentos'], ['req', 'Requisições'], ['cat', 'Catálogo'], ['eqp', 'Equipamentos']].map(([k, l]) => `<button type="button" data-mataba="${k}" aria-pressed="${ab === k}">${l}</button>`).join('')}</div></section>
    <div id="matBox"><section class="card"><p class="empty">Carregando…</p></section></div>`;
}
async function afterAdmMat() {
  $$('[data-mataba]').forEach(b => b.onclick = () => { S.matAba = b.dataset.mataba; render(); });
  if (S.matAba === 'eqp') { const bx = $('#matBox'); if (bx) await eqpAba(bx); return; }
  let D; try { D = await matCarrega(); } catch (e) { $('#matBox').innerHTML = `<section class="card"><div class="warnbox">Não foi possível carregar o almoxarifado: ${esc(e.message || e)}. Confira se o supabase.sql novo (tabelas materiais e mat_mov) foi rodado.</div></section>`; return; }
  const box = $('#matBox'); if (!box) return; const ab = S.matAba || 'saldos';
  const tecs = S.adm.tecnicos || []; const nomeTec = u => (tecs.find(t => t.uid === u) || {}).nome || ((D.mov.find(m => m.tecnico_uid === u) || {}).tecnico_nome) || 'Técnico';
  const ativos = D.cat.filter(m => m.ativo !== false);
  const dl = `<datalist id="dlMat">${ativos.map(m => `<option value="${esc(matLabel(m))}">`).join('')}</datalist>`;
  const csv = (nome, linhas) => { const t = '﻿' + linhas.map(l => l.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n'); baixar(new File([t], nome, { type: 'text/csv' })); };

  if (ab === 'saldos') {
    const CF = S.matConta || 'todas'; const contas = CF === 'todas' ? Object.keys(CONTAS) : [CF];
    const linhas = [], tecM = new Map();
    contas.forEach(c => {
      const { almox, tec } = saldosMat(D.mov, c);
      const ids = new Set(CF === 'todas' ? [] : ativos.map(m => m.id)); almox.forEach((q, k) => ids.add(k)); tec.forEach(t => t.forEach((q, k) => ids.add(k)));
      const campo = k => { let s2 = 0; tec.forEach(t => { s2 += t.get(k) || 0; }); return s2; };
      [...ids].forEach(k => { const x = { c, m: matInfo(D.cat, k, D.mov), a: almox.get(k) || 0, cp: campo(k) }; if (CF !== 'todas' || Math.abs(x.a) > 1e-9 || Math.abs(x.cp) > 1e-9) if (!x.m.semCadastro || x.a || x.cp) linhas.push(x); });
      tec.forEach((mp, u) => mp.forEach((q, k) => { if (Math.abs(q) > 1e-9) { const l = tecM.get(u) || []; l.push({ c, k, q }); tecM.set(u, l); } }));
    });
    linhas.sort((x, y) => (!(x.a || x.cp)) - (!(y.a || y.cp)) || x.m.descricao.localeCompare(y.m.descricao) || x.c.localeCompare(y.c));
    const tecL = [...tecM.entries()].map(([u, itens]) => ({ u, nome: nomeTec(u), itens })).sort((a2, b2) => a2.nome.localeCompare(b2.nome));
    const semCad = linhas.filter(x => x.m.semCadastro); const multi = contas.length > 1;
    box.innerHTML = `<section class="card"><div class="row" style="justify-content:space-between"><h2>Almoxarifado</h2><span class="row" style="gap:8px"><button type="button" class="btn" id="bMatCsv">Exportar saldos</button><button type="button" class="btn" id="bMatRe">Atualizar</button></span></div>
      <div class="chips" role="group" aria-label="Estoque do projeto">${[['todas', 'Todos os projetos'], ...Object.keys(CONTAS).map(k => [k, contaLb(k)])].map(([k, l]) => `<button type="button" role="radio" data-mconta="${k}" aria-checked="${CF === k}">${esc(l)}</button>`).join('')}</div>
      <div class="stats"><div class="stat"><b>${linhas.filter(x => x.a > 0).length}</b><span>Itens com saldo</span></div><div class="stat"><b>${linhas.filter(x => x.m.minimo != null && x.a < +x.m.minimo).length}</b><span>Abaixo do mínimo</span></div><div class="stat"><b>${tecL.length}</b><span>Técnicos com material</span></div></div>
      <div class="tw"><table class="t"><thead><tr>${multi ? '<th>Conta</th>' : ''}<th>Código</th><th>Material</th><th>Un.</th><th style="text-align:right">Almoxarifado</th><th style="text-align:right">Com técnicos</th><th style="text-align:right">Total</th><th style="text-align:right">Mínimo</th></tr></thead><tbody>
      ${linhas.map(x => `<tr>${multi ? `<td>${contaTag(x.c)}</td>` : ''}<td>${esc(x.m.codigo || '—')}</td><td>${esc(x.m.descricao)}${x.m.semCadastro ? ' <span class="pill bad">sem cadastro</span>' : ''}</td><td>${esc(x.m.unidade || '')}</td><td style="text-align:right;font-weight:700;color:${x.a < 0 || (x.m.minimo != null && x.a < +x.m.minimo) ? 'var(--bad)' : 'inherit'}">${fQ(x.a)}</td><td style="text-align:right">${fQ(x.cp)}</td><td style="text-align:right">${fQ(x.a + x.cp)}</td><td style="text-align:right">${x.m.minimo != null ? fQ(x.m.minimo) : '—'}</td></tr>`).join('') || `<tr><td colspan="${multi ? 8 : 7}" class="muted">Sem saldo. Cadastre os materiais no Catálogo e lance as entradas em Movimentar.</td></tr>`}</tbody></table></div>
      ${semCad.length ? `<div class="warnbox small"><b>${semCad.length} material(is) baixado(s) pelos técnicos sem cadastro.</b> Vincule cada um a um item do catálogo para o saldo ficar certo.<div class="list" style="margin-top:6px">${[...new Map(semCad.map(x => [x.m.id, x])).values()].map(x => `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><span style="flex:1;min-width:160px"><b>${esc(x.m.descricao)}</b></span><input type="text" list="dlMat" data-vincin="${esc(x.m.id)}" placeholder="Material do catálogo" style="flex:1;min-width:180px"><button type="button" class="btn" data-vinc="${esc(x.m.id)}">Vincular</button></div>`).join('')}</div></div>` : ''}${dl}</section>
      <section class="card"><h2>Saldo por técnico</h2>${tecL.length ? tecL.map(t => `<details class="card" style="background:var(--surface-2);box-shadow:none;border:1px solid var(--line);padding:12px"><summary style="cursor:pointer;font-weight:600">${esc(t.nome)} · ${t.itens.length} item(ns)${t.itens.some(x => x.q < 0) ? ' <span class="pill bad">saldo negativo</span>' : ''}</summary>
        <div class="tw"><table class="t"><thead><tr>${multi ? '<th>Conta</th>' : ''}<th>Código</th><th>Material</th><th style="text-align:right">Saldo</th><th>Un.</th></tr></thead><tbody>${t.itens.map(({ c, k, q }) => { const m = matInfo(D.cat, k, D.mov); return `<tr>${multi ? `<td>${contaTag(c)}</td>` : ''}<td>${esc(m.codigo || '—')}</td><td>${esc(m.descricao)}</td><td style="text-align:right;font-weight:700;color:${q < 0 ? 'var(--bad)' : 'inherit'}">${fQ(q)}</td><td>${esc(m.unidade || '')}</td></tr>`; }).join('')}</tbody></table></div></details>`).join('') : '<p class="empty">Nenhum técnico com material em nome.</p>'}</section>`;
    $$('[data-mconta]').forEach(b2 => b2.onclick = () => { S.matConta = b2.dataset.mconta; render(); });
    $('#bMatRe').onclick = async () => { await matCarrega(true); render(); };
    $('#bMatCsv').onclick = () => { const L = [['Conta', 'Local', 'Código', 'Material', 'Unidade', 'Saldo']]; linhas.forEach(x => L.push([CONTAS[x.c], 'Almoxarifado', x.m.codigo, x.m.descricao, x.m.unidade, fQ(x.a)])); tecL.forEach(t => t.itens.forEach(({ c, k, q }) => { const m = matInfo(D.cat, k, D.mov); L.push([CONTAS[c], t.nome, m.codigo, m.descricao, m.unidade, fQ(q)]); })); csv(`Saldos_materiais_${isoDate(Date.now())}.csv`, L); };
    $$('[data-vinc]').forEach(b2 => b2.onclick = async () => {
      const sid = b2.dataset.vinc; const inp = $$('[data-vincin]').find(x => x.dataset.vincin === sid); const m = matResolve(D.cat, inp && inp.value); if (!m) { toast('Escolha um material do catálogo.'); return; }
      try { await Nuvem.matSalvar({ ...m, refs: [...new Set([...(m.refs || []), 'nome:' + sid.replace(/^sem:/, '')])] }); await Nuvem.movRevincular(sid, m); toast('Vinculado. As próximas baixas com esse nome já entram neste material.'); await matCarrega(true); render(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); }
    });
    return;
  }

  if (ab === 'mov') {
    const F = S.matF = S.matF || { tipo: 'saida', conta: 'claro', tec: '', doc: '', obs: '', linhas: [{ mat: '', q: '' }] }; F.conta = F.conta || 'claro';
    const { almox, tec } = saldosMat(D.mov, F.conta);
    const precisaTec = ['saida', 'devolucao', 'ajuste_tec', 'transf'].includes(F.tipo);
    box.innerHTML = `<section class="card"><h2>Movimentar materiais</h2>
      <div class="field"><span class="lb">Estoque do projeto</span><div class="chips" role="group" aria-label="Estoque do projeto">${Object.keys(CONTAS).map(k => `<button type="button" role="radio" data-mvconta="${k}" aria-checked="${F.conta === k}">${esc(contaLb(k))}</button>`).join('')}</div></div>
      <div class="grid2"><div class="field full"><label class="lb" for="mvTipo">Tipo</label><select id="mvTipo">${Object.entries(MOV_TIPO).filter(([k]) => k !== 'baixa').map(([k, l]) => `<option value="${k}" ${F.tipo === k ? 'selected' : ''}>${l}</option>`).join('')}<option value="transf" ${F.tipo === 'transf' ? 'selected' : ''}>Transferir de um técnico para outro</option><option value="baixa" ${F.tipo === 'baixa' ? 'selected' : ''}>Baixa por conta do técnico</option></select></div>
      ${precisaTec || F.tipo === 'baixa' ? `<div class="field full"><label class="lb" for="mvTec">${F.tipo === 'transf' ? 'Do técnico' : 'Técnico'} <span class="req">*</span></label><select id="mvTec"><option value="">Selecione…</option>${tecs.map(t => `<option value="${t.uid}" ${F.tec === t.uid ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div>` : ''}
      ${F.tipo === 'transf' ? `<div class="field full"><label class="lb" for="mvTec2">Para o técnico <span class="req">*</span></label><select id="mvTec2"><option value="">Selecione…</option>${tecs.map(t => `<option value="${t.uid}" ${F.tec2 === t.uid ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label class="lb" for="mvDoc">${F.tipo === 'entrada' ? 'Nota fiscal / fornecedor' : 'Documento / requisição'}</label><input type="text" id="mvDoc" value="${esc(F.doc)}"></div>
      <div class="field"><label class="lb" for="mvObs">Observação</label><input type="text" id="mvObs" value="${esc(F.obs)}"></div></div>
      <p class="muted small" style="margin:0">${{ transf: 'Sai do saldo de um técnico e entra no saldo do outro, sem passar pelo almoxarifado (fica registrado como devolução + liberação).', entrada: 'Soma no almoxarifado.', saida: 'Sai do almoxarifado e entra no saldo do técnico.', devolucao: 'Sai do saldo do técnico e volta ao almoxarifado.', ajuste_almox: 'Inventário do almoxarifado: use quantidade negativa para tirar e positiva para pôr.', ajuste_tec: 'Inventário do técnico: negativa tira, positiva põe (não mexe no almoxarifado).', baixa: 'Consumo do técnico registrado pelo gestor (não volta ao almoxarifado).' }[F.tipo]}</p>
      <div class="list" id="mvLinhas">${F.linhas.map((l, k) => `<div class="row" style="gap:8px;flex-wrap:nowrap;align-items:end"><div class="field" style="flex:1;min-width:0"><label class="lb" for="mvM${k}">Material</label><input type="text" id="mvM${k}" list="dlMat" data-mvm="${k}" value="${esc(l.mat)}" placeholder="Código ou nome"></div><div class="field" style="width:110px"><label class="lb" for="mvQ${k}">Qtd.</label><input type="text" inputmode="decimal" id="mvQ${k}" data-mvq="${k}" value="${esc(l.q)}"></div><span class="muted small" data-mvinfo="${k}" style="width:110px;padding-bottom:12px"></span>${F.linhas.length > 1 ? `<button type="button" class="lnk" data-mvdel="${k}" style="padding-bottom:12px">Tirar</button>` : ''}</div>`).join('')}</div>
      <button type="button" class="btn" id="bMvLinha">${ICON.plus}Mais um material</button>${dl}
      <button type="button" class="btn pri block" id="bMvSalvar">${ICON.check}Registrar movimento</button></section>`;
    const info = () => F.linhas.forEach((l, k) => { const el = $(`[data-mvinfo="${k}"]`); if (!el) return; const m = matResolve(D.cat, l.mat); if (!m) { el.textContent = l.mat ? 'não cadastrado' : ''; return; } const sa = almox.get(m.id) || 0; const st = F.tec ? ((tec.get(F.tec) || new Map()).get(m.id) || 0) : null; el.textContent = `almox ${fQ(sa)}${st != null ? ' · téc ' + fQ(st) : ''} ${m.unidade || ''}`; });
    info();
    $('#mvTipo').onchange = e => { F.tipo = e.target.value; render(); };
    $$('[data-mvconta]').forEach(b2 => b2.onclick = () => { F.conta = b2.dataset.mvconta; render(); });
    $('#mvTec') && ($('#mvTec').onchange = e => { F.tec = e.target.value; info(); });
    $('#mvTec2') && ($('#mvTec2').onchange = e => { F.tec2 = e.target.value; });
    $('#mvDoc').oninput = e => { F.doc = e.target.value; }; $('#mvObs').oninput = e => { F.obs = e.target.value; };
    $$('[data-mvm]').forEach(i => i.oninput = () => { F.linhas[+i.dataset.mvm].mat = i.value; info(); });
    $$('[data-mvq]').forEach(i => i.oninput = () => { F.linhas[+i.dataset.mvq].q = i.value; });
    $$('[data-mvdel]').forEach(b => b.onclick = () => { F.linhas.splice(+b.dataset.mvdel, 1); render(); });
    $('#bMvLinha').onclick = () => { F.linhas.push({ mat: '', q: '' }); render(); setTimeout(() => { const l = $(`#mvM${F.linhas.length - 1}`); l && l.focus(); }, 50); };
    $('#bMvSalvar').onclick = async () => {
      if ((precisaTec || F.tipo === 'baixa') && !F.tec) { toast('Escolha o técnico.'); $('#mvTec').focus(); return; }
      if (F.tipo === 'transf' && (!F.tec2 || F.tec2 === F.tec)) { toast('Escolha para qual técnico vai o material (outro técnico).'); $('#mvTec2') && $('#mvTec2').focus(); return; }
      const out = []; const avisos = [];
      for (const [k, l] of F.linhas.entries()) {
        if (!l.mat && !l.q) continue; const m = matResolve(D.cat, l.mat); const q = qNum(l.q);
        if (!m) { toast(`Linha ${k + 1}: material não está no catálogo. Cadastre antes.`, 6000); return; }
        if (q == null || q === 0 || (q < 0 && !F.tipo.startsWith('ajuste'))) { toast(`Linha ${k + 1}: quantidade inválida.`); return; }
        if (F.tipo === 'saida' && (almox.get(m.id) || 0) < q) avisos.push(`${m.descricao}: almoxarifado tem ${fQ(almox.get(m.id) || 0)}`);
        if (F.tipo === 'transf' && ((tec.get(F.tec) || new Map()).get(m.id) || 0) < q) { toast(`${m.descricao}: ${nomeTec(F.tec)} só tem ${fQ(Math.max(0, (tec.get(F.tec) || new Map()).get(m.id) || 0))} ${m.unidade || ''} — não dá para transferir ${fQ(q)}.`, 7000); return; }
        if ((F.tipo === 'devolucao' || F.tipo === 'baixa') && ((tec.get(F.tec) || new Map()).get(m.id) || 0) < q) avisos.push(`${m.descricao}: técnico tem ${fQ((tec.get(F.tec) || new Map()).get(m.id) || 0)}`);
        if (F.tipo === 'transf') { const doc = F.doc.trim() || 'TRF-' + isoDate(Date.now()).replace(/-/g, '') + '-' + uid().slice(0, 4).toUpperCase(); const base = { org: Nuvem.org(), ts: Date.now(), conta: F.conta, material_id: m.id, descricao: m.descricao, unidade: m.unidade, qtd: q, atividade_id: null, ticket: '', insp_id: null, doc, por: Nuvem.user.id, por_nome: (Nuvem.admin || {}).nome || '', criado: Date.now() };
          out.push({ ...base, id: 'mv_' + uid(), tipo: 'devolucao', tecnico_uid: F.tec, tecnico_nome: nomeTec(F.tec), obs: `Transferido para ${nomeTec(F.tec2)}${F.obs.trim() ? ' · ' + F.obs.trim() : ''}` }, { ...base, id: 'mv_' + uid(), tipo: 'saida', tecnico_uid: F.tec2, tecnico_nome: nomeTec(F.tec2), obs: `Transferido de ${nomeTec(F.tec)}${F.obs.trim() ? ' · ' + F.obs.trim() : ''}` }); continue; }
        out.push({ id: 'mv_' + uid(), org: Nuvem.org(), ts: Date.now(), tipo: F.tipo, conta: F.conta, material_id: m.id, descricao: m.descricao, unidade: m.unidade, qtd: q, tecnico_uid: F.tec || null, tecnico_nome: F.tec ? nomeTec(F.tec) : null, atividade_id: null, ticket: '', insp_id: null, doc: F.doc.trim(), obs: F.obs.trim(), por: Nuvem.user.id, por_nome: (Nuvem.admin || {}).nome || '', criado: Date.now() });
      }
      if (!out.length) { toast('Informe pelo menos um material e a quantidade.'); return; }
      if (avisos.length && !confirm('Saldo insuficiente:\n' + avisos.join('\n') + '\n\nRegistrar mesmo assim (o saldo fica negativo)?')) return;
      if (!confirm(F.tipo === 'transf' ? `Transferir ${out.length / 2} material(is) de ${nomeTec(F.tec)} para ${nomeTec(F.tec2)} (${contaLb(F.conta)})?` : `Registrar ${out.length} movimento(s) no estoque ${contaLb(F.conta)}?`)) return;
      try { await Nuvem.movGravar(out); toast(`${out.length} movimento(s) registrado(s).`); S.matF = { tipo: F.tipo, conta: F.conta, tec: F.tec, tec2: F.tec2, doc: '', obs: '', linhas: [{ mat: '', q: '' }] }; await matCarrega(true); render(); } catch (e) { toast('Erro ao gravar: ' + (e.message || e), 7000); }
    };
    return;
  }

  if (ab === 'hist') {
    const H = S.matH = S.matH || { de: isoDate(Date.now() - 30 * 86400000), ate: isoDate(Date.now()), tec: '', tipo: '', mat: '', conta: '' };
    const L = D.mov.filter(m => m.ts >= diaIni(H.de) && m.ts <= diaFim(H.ate) && (!H.tec || m.tecnico_uid === H.tec) && (!H.tipo || m.tipo === H.tipo) && (!H.conta || contaDe(m) === H.conta) && (!H.mat || normMat((m.descricao || '') + ' ' + (matPorId(D.cat, m.material_id) || {}).codigo).includes(normMat(H.mat)))).sort((a, b) => b.ts - a.ts);
    box.innerHTML = `<section class="card"><h2>Movimentos</h2>
      <div class="grid2"><div class="field"><label class="lb" for="mhDe">De</label><input type="date" id="mhDe" value="${H.de}"></div><div class="field"><label class="lb" for="mhAte">Até</label><input type="date" id="mhAte" value="${H.ate}"></div>
      <div class="field"><label class="lb" for="mhTec">Técnico</label><select id="mhTec"><option value="">Todos</option>${tecs.map(t => `<option value="${t.uid}" ${H.tec === t.uid ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div>
      <div class="field"><label class="lb" for="mhTipo">Tipo</label><select id="mhTipo"><option value="">Todos</option>${Object.entries(MOV_TIPO).map(([k, l]) => `<option value="${k}" ${H.tipo === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label class="lb" for="mhConta">Conta</label><select id="mhConta"><option value="">Todas</option>${Object.entries(CONTAS).map(([k, l]) => `<option value="${k}" ${H.conta === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label class="lb" for="mhMat">Material</label><input type="text" id="mhMat" value="${esc(H.mat)}" placeholder="Filtrar por código ou nome"></div></div>
      <button type="button" class="btn" id="bMhCsv">Exportar (${L.length})</button>
      <div class="tw"><table class="t"><thead><tr><th>Data</th><th>Conta</th><th>Tipo</th><th>Material</th><th style="text-align:right">Qtd.</th><th>Técnico</th><th>O.S. / documento</th><th>Por</th><th></th></tr></thead><tbody>
      ${L.slice(0, 400).map(m => `<tr><td>${fDH(m.ts)}</td><td>${contaTag(contaDe(m))}</td><td><span style="color:${MOV_COR[m.tipo]};font-weight:600">${esc(MOV_TIPO[m.tipo] || m.tipo)}</span></td><td>${esc(m.descricao || matInfo(D.cat, m.material_id, D.mov).descricao)}</td><td style="text-align:right">${fQ(m.qtd)} ${esc(m.unidade || '')}</td><td>${esc(m.tecnico_uid ? m.tecnico_nome || nomeTec(m.tecnico_uid) : '—')}</td><td>${esc([m.ticket, m.doc].filter(Boolean).join(' · ') || '—')}${m.obs ? `<br><span class="muted small">${esc(m.obs)}</span>` : ''}</td><td class="small">${esc(m.por_nome || '')}</td><td><button type="button" class="lnk" data-mhdel="${esc(m.id)}">Excluir</button></td></tr>`).join('') || '<tr><td colspan="9" class="muted">Nenhum movimento no filtro.</td></tr>'}</tbody></table></div>${L.length > 400 ? '<p class="muted small">Mostrando 400. Exporte para ver todos.</p>' : ''}</section>`;
    const set = (k, v) => { H[k] = v; render(); };
    $('#mhDe').onchange = e => set('de', e.target.value); $('#mhAte').onchange = e => set('ate', e.target.value); $('#mhTec').onchange = e => set('tec', e.target.value); $('#mhTipo').onchange = e => set('tipo', e.target.value); $('#mhMat').onchange = e => set('mat', e.target.value); $('#mhConta').onchange = e => set('conta', e.target.value);
    $('#bMhCsv').onclick = () => csv(`Movimentos_materiais_${H.de}_a_${H.ate}.csv`, [['Data', 'Conta', 'Tipo', 'Código', 'Material', 'Qtd', 'Unidade', 'Técnico', 'O.S.', 'Documento', 'Observação', 'Registrado por'], ...L.map(m => [fDH(m.ts), CONTAS[contaDe(m)], MOV_TIPO[m.tipo] || m.tipo, (matPorId(D.cat, m.material_id) || {}).codigo || '', m.descricao, fQ(m.qtd), m.unidade, m.tecnico_nome || '', m.ticket, m.doc, m.obs, m.por_nome])]);
    $$('[data-mhdel]').forEach(b => b.onclick = async () => { if (!confirm('Excluir este movimento? O saldo é recalculado.')) return; try { await Nuvem.movApagar(b.dataset.mhdel); await matCarrega(true); render(); } catch (e) { toast('Erro: ' + (e.message || e)); } });
    return;
  }

  if (ab === 'req') {
    let R = []; try { R = await Nuvem.reqLista(); } catch (e) { box.innerHTML = `<section class="card"><div class="warnbox">Não foi possível ler as requisições: ${esc(e.message || e)}. Rode o supabase.sql novo.</div></section>`; return; }
    const ab2 = S.reqAberta && R.find(r => r.id === S.reqAberta);
    const mesLb = m => { const [y, mo] = String(m).split('-'); return `${['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][+mo - 1]}/${y}`; };
    const ST = { aberta: 'Aberta', enviada: 'Enviada', recebida: 'Recebida' };
    box.innerHTML = `<section class="card"><div class="row" style="justify-content:space-between"><h2>Requisições de material</h2><button type="button" class="btn" id="bReqGerar">Gerar agora (consumo do mês passado)</button></div>
      <p class="muted small" style="margin:0">Todo dia 20 o sistema gera sozinho uma requisição para a <b>Claro</b> e outra para a <b>Master</b>, com o material usado pelos técnicos no mês anterior (baixas da conta). Ajuste as quantidades, exporte e marque como enviada.</p>
      <div class="list">${R.map(r => `<button type="button" class="item" data-reqab="${esc(r.id)}" ${S.reqAberta === r.id ? 'aria-current="true" style="border-color:var(--accent)"' : ''}><span class="tx"><b>${contaTag(r.conta)} Consumo de ${esc(mesLb(r.mes_ref))}</b><span>${(r.itens || []).length} item(ns) · gerada ${fDH(+r.gerada_em)}</span></span><span class="pill ${r.status === 'aberta' ? 'bad' : 'ok'}">${ST[r.status] || r.status}</span></button>`).join('') || '<p class="empty">Nenhuma requisição ainda. A primeira sai no dia 20 ou em "Gerar agora".</p>'}</div></section>
      ${ab2 ? `<section class="card"><div class="row" style="justify-content:space-between"><h2>${contaTag(ab2.conta)} Requisição · consumo de ${esc(mesLb(ab2.mes_ref))}</h2><span class="row" style="gap:8px"><button type="button" class="btn" id="bReqPdf">PDF</button><button type="button" class="btn" id="bReqCsv">Excel (CSV)</button></span></div>
        <div class="tw"><table class="t"><thead><tr><th>Código</th><th>Material</th><th>Un.</th><th style="text-align:right">Usado no mês</th><th style="text-align:right">Saldo almox</th><th style="text-align:right">Com técnicos</th><th style="text-align:right">Solicitar</th></tr></thead><tbody>
        ${(ab2.itens || []).map((x, k) => `<tr><td>${esc(x.codigo || '—')}</td><td>${esc(x.descricao || '')}</td><td>${esc(x.unidade || '')}</td><td style="text-align:right">${fQ(x.consumo)}</td><td style="text-align:right">${fQ(x.saldo_almox)}</td><td style="text-align:right">${fQ(x.saldo_tecnicos)}</td><td style="text-align:right"><input type="text" inputmode="decimal" data-reqq="${k}" value="${esc(String(x.solicitado ?? x.consumo).replace('.', ','))}" style="width:90px;text-align:right" ${ab2.status !== 'aberta' ? 'disabled' : ''}></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Nenhum material usado nessa conta no mês.</td></tr>'}</tbody></table></div>
        <div class="field"><label class="lb" for="reqObs">Observação</label><input type="text" id="reqObs" value="${esc(ab2.obs || '')}"></div>
        <div class="row" style="gap:8px;flex-wrap:wrap">${ab2.status === 'aberta' ? '<button type="button" class="btn pri" id="bReqSalva">Salvar quantidades</button><button type="button" class="btn go" id="bReqEnv">Marcar como enviada</button>' : ab2.status === 'enviada' ? '<button type="button" class="btn go" id="bReqRec">Marcar como recebida</button><button type="button" class="btn" id="bReqReabre">Reabrir</button>' : '<button type="button" class="btn" id="bReqReabre">Reabrir</button>'}</div></section>` : ''}`;
    $$('[data-reqab]').forEach(b2 => b2.onclick = () => { S.reqAberta = S.reqAberta === b2.dataset.reqab ? null : b2.dataset.reqab; render(); });
    $('#bReqGerar').onclick = async () => { if (!confirm('Gerar (ou refazer) as requisições da Claro e da Master com o consumo do mês passado? Quantidades editadas numa requisição ainda aberta serão recalculadas.')) return; try { const n = await Nuvem.reqGerar(); toast(`${n} requisição(ões) gerada(s).`); render(); } catch (e) { toast('Erro: ' + (e.message || e), 7000); } };
    if (ab2) {
      const itens = () => (ab2.itens || []).map((x, k) => { const el = $(`[data-reqq="${k}"]`); return { ...x, solicitado: el ? qNum(el.value) ?? 0 : x.solicitado }; });
      const salva = async (patch, msg) => { try { await Nuvem.reqSalvar(ab2.id, { itens: itens(), obs: $('#reqObs').value.trim(), ...patch }); toast(msg); render(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } };
      $('#bReqSalva') && ($('#bReqSalva').onclick = () => salva({}, 'Quantidades salvas.'));
      $('#bReqEnv') && ($('#bReqEnv').onclick = () => salva({ status: 'enviada' }, 'Requisição marcada como enviada.'));
      $('#bReqRec') && ($('#bReqRec').onclick = () => salva({ status: 'recebida' }, 'Requisição recebida. Lance a entrada do material em Movimentar.'));
      $('#bReqReabre') && ($('#bReqReabre').onclick = () => salva({ status: 'aberta' }, 'Reaberta.'));
      const cab = ['Código', 'Material', 'Unidade', 'Usado no mês', 'Saldo almox', 'Com técnicos', 'Solicitar'];
      const lin = () => itens().filter(x => +x.solicitado > 0).map(x => [x.codigo || '', x.descricao || '', x.unidade || '', fQ(x.consumo), fQ(x.saldo_almox), fQ(x.saldo_tecnicos), fQ(x.solicitado)]);
      $('#bReqCsv').onclick = () => csv(`Requisicao_${ab2.conta}_${ab2.mes_ref}.csv`, [cab, ...lin()]);
      $('#bReqPdf').onclick = async () => {
        const { doc, logo } = await novoPdf(); let y = pdfHeader(doc, logo, 'Requisição de materiais', `${CONTAS[ab2.conta]} · consumo de ${mesLb(ab2.mes_ref)}`, null);
        y = kv(doc, y, [['Solicitante', 'Multivale Engenharia'], ['Destino', ab2.conta === 'claro' ? 'Claro' : 'Master'], ['Base', `Material utilizado em ${mesLb(ab2.mes_ref)}`], ['Gerada em', fDH(+ab2.gerada_em)], ...(($('#reqObs').value || '').trim() ? [['Observação', $('#reqObs').value.trim()]] : [])]);
        doc.autoTable({ ...TB, startY: y + 2, head: [cab], body: lin(), columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } } });
        pdfFooter(doc, `Técnico Plus - Multivale · requisição ${CONTAS[ab2.conta]} · ${mesLb(ab2.mes_ref)}`);
        baixar(new File([doc.output('blob')], `Requisicao_${ab2.conta}_${ab2.mes_ref}.pdf`, { type: 'application/pdf' }));
      };
    }
    return;
  }

  // catálogo
  box.innerHTML = `<section class="card"><h2>Catálogo de materiais</h2>
    <div class="grid2"><div class="field"><label class="lb" for="ctCod">Código</label><input type="text" id="ctCod" autocapitalize="characters"></div><div class="field"><label class="lb" for="ctUn">Unidade</label><input type="text" id="ctUn" value="un"></div>
    <div class="field full"><label class="lb" for="ctDesc">Descrição <span class="req">*</span></label><input type="text" id="ctDesc"></div><div class="field"><label class="lb" for="ctMin">Estoque mínimo (opcional)</label><input type="text" inputmode="decimal" id="ctMin"></div></div>
    <button type="button" class="btn pri" id="bCtAdd">${ICON.plus}Cadastrar material</button>
    <details><summary class="small" style="cursor:pointer;min-height:40px;display:flex;align-items:center;color:var(--accent);font-weight:600">Cadastrar vários de uma vez</summary>
      <p class="muted small">Uma linha por material: <b>código; descrição; unidade; mínimo</b> (pode colar do Excel).</p><textarea id="ctLote" rows="5" placeholder="CEO-24; CAIXA DE EMENDA ÓPTICA 24F; un; 5"></textarea>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="bCtLote">Cadastrar a lista</button><button type="button" class="btn" id="bCtLpu">Trazer os materiais da LPU</button><button type="button" class="btn" id="bCtPadrao">Trazer a lista de materiais do app</button></div></details></section>
    <section class="card"><h2>${D.cat.length} material(is)</h2><div class="tw"><table class="t"><thead><tr><th>Código</th><th>Descrição</th><th>Un.</th><th>Mínimo</th><th>Vínculos</th><th></th></tr></thead><tbody>
    ${D.cat.slice().sort((a, b) => a.descricao.localeCompare(b.descricao)).map(m => `<tr style="${m.ativo === false ? 'opacity:.5' : ''}"><td><input type="text" data-ctf="codigo" data-ct="${m.id}" value="${esc(m.codigo || '')}" style="min-width:90px"></td><td><input type="text" data-ctf="descricao" data-ct="${m.id}" value="${esc(m.descricao)}" style="min-width:220px"></td><td><input type="text" data-ctf="unidade" data-ct="${m.id}" value="${esc(m.unidade || '')}" style="width:60px"></td><td><input type="text" inputmode="decimal" data-ctf="minimo" data-ct="${m.id}" value="${m.minimo != null ? esc(String(m.minimo).replace('.', ',')) : ''}" style="width:70px"></td><td class="small muted">${esc((m.refs || []).map(r => r.replace(/^lpu:/, 'LPU ').replace(/^mat:/, 'lista ').replace(/^nome:/, '"') + (r.startsWith('nome:') ? '"' : '')).join(', ') || '—')}</td><td><button type="button" class="lnk" data-ctativo="${m.id}">${m.ativo === false ? 'Reativar' : 'Desativar'}</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhum material cadastrado.</td></tr>'}</tbody></table></div>
    <p class="muted small">Os vínculos ligam o material ao que o técnico lança na O.S. (lista de materiais do app, itens de material da LPU ou nome digitado), para a baixa sair do saldo certo.</p></section>`;
  const novo = (codigo, descricao, unidade, minimo, refs) => ({ id: 'mt_' + uid(), org: Nuvem.org(), codigo: String(codigo || '').trim().toUpperCase(), descricao: String(descricao || '').trim().toUpperCase(), unidade: String(unidade || 'un').trim() || 'un', minimo: qNum(minimo), refs: refs || [], ativo: true, atualizado: Date.now() });
  const grava = async (lista, msg) => { try { await Nuvem.matSalvarVarios(lista); toast(msg || `${lista.length} material(is) salvo(s).`); await matCarrega(true); render(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } };
  const jaTem = (cod, desc) => D.cat.some(m => (cod && m.codigo && normMat(m.codigo) === normMat(cod)) || normMat(m.descricao) === normMat(desc));
  $('#bCtAdd').onclick = () => { const d = $('#ctDesc').value.trim(); if (!d) { toast('Informe a descrição.'); $('#ctDesc').focus(); return; } if (jaTem($('#ctCod').value, d)) { toast('Já existe material com esse código ou descrição.'); return; } grava([novo($('#ctCod').value, d, $('#ctUn').value, $('#ctMin').value)], 'Material cadastrado.'); };
  $('#bCtLote').onclick = () => { const L = $('#ctLote').value.split(/\r?\n/).map(l => l.split(/[;\t]/).map(x => x.trim())).filter(c => c[1] || c[0]).map(c => c[1] ? c : ['', c[0]]).filter(c => !jaTem(c[0], c[1])).map(c => novo(c[0], c[1], c[2], c[3])); if (!L.length) { toast('Nada novo para cadastrar.'); return; } grava(L); };
  $('#bCtLpu').onclick = () => { const L = ((window.LPU || {}).itens || []).filter(x => x[4] === 'M' && !D.cat.some(m => (m.refs || []).includes('lpu:' + x[0])) && !jaTem(x[0], x[2])).map(x => novo(x[0], x[2], String(x[1]).toLowerCase() === 'unit' ? 'un' : String(x[1]).toLowerCase(), null, ['lpu:' + x[0]])); if (!L.length) { toast('Os materiais da LPU já estão no catálogo.'); return; } if (confirm(`Cadastrar ${L.length} materiais da LPU?`)) grava(L); };
  $('#bCtPadrao').onclick = () => { const L = MATERIAIS.filter(([k]) => !D.cat.some(m => (m.refs || []).includes('mat:' + k))).map(([k, lb, un]) => { const ex = D.cat.find(m => normMat(m.descricao) === normMat(lb)); return ex ? { ...ex, refs: [...new Set([...(ex.refs || []), 'mat:' + k])] } : novo('', lb, un, null, ['mat:' + k]); }); if (!L.length) { toast('A lista do app já está no catálogo.'); return; } grava(L); };
  $$('[data-ct]').forEach(i => i.onchange = () => { const m = D.cat.find(x => x.id === i.dataset.ct); if (!m) return; const f = i.dataset.ctf; const v = f === 'minimo' ? qNum(i.value) : f === 'unidade' ? i.value.trim() : i.value.trim().toUpperCase(); if (f === 'descricao' && !v) { toast('A descrição não pode ficar vazia.'); i.value = m.descricao; return; } grava([{ ...m, [f]: v, atualizado: Date.now() }], 'Salvo.'); });
  $$('[data-ctativo]').forEach(b => b.onclick = () => { const m = D.cat.find(x => x.id === b.dataset.ctativo); grava([{ ...m, ativo: m.ativo === false, atualizado: Date.now() }], m.ativo === false ? 'Reativado.' : 'Desativado (some das listas, o histórico fica).'); });
}

