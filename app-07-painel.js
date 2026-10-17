// Técnico Plus - Multivale · painel do supervisor e equipe
// Os arquivos app-*.js carregam em ordem (ver index.html) e compartilham o mesmo escopo global.
'use strict';
/* ============================ painel do supervisor ============================ */
function viewAdmLogin() {
  if (!Nuvem.ativo()) return `<section class="card"><h2>Painel do supervisor</h2><div class="warnbox">O painel usa a nuvem (Supabase). Configure o arquivo <b>supabase-config.js</b> (veja o guia SUPABASE.md) e cadastre seu usuário como supervisor.</div></section>`;
  return `<section class="card" style="max-width:420px;margin:0 auto;width:100%"><h2>${ACION ? 'Acionamentos Claro' : NOC ? 'NOC · validação e liberação' : 'Painel do supervisor'}</h2><p class="muted small" style="margin:0">${ACION ? 'Cole o texto do acionamento da Claro e encaminhe ao técnico ou ao backlog.' : 'Acesso restrito. Desvios de rota, velocidade, odômetro e relatórios de vários dias.'}</p>
    <form id="fLogin" class="grid2"><div class="field full"><label class="lb" for="admEmail">E-mail</label><input type="text" id="admEmail" autocomplete="username" inputmode="email"></div>
    <div class="field full"><label class="lb" for="admSenha">Senha</label><input type="password" id="admSenha" autocomplete="current-password" style="min-height:48px;border:1.5px solid var(--line-strong);border-radius:var(--r);padding:10px 12px;font-size:16px;background:var(--surface)"></div>
    <button type="submit" class="btn pri block field full" id="bAdmEntrar">Entrar</button><button type="button" class="btn block field full" id="bAdmEsqueci">Esqueci a senha</button></form><div id="admErro"></div></section>`;
}
// supervisor abriu o link de "esqueci a senha" do e-mail: cria a senha nova aqui
function trocaSenhaRecuperacao() {
  if ($('#mdRec')) return; const el = document.createElement('div'); el.id = 'mdRec'; el.className = 'modal'; el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:960;display:flex;align-items:center;justify-content:center;padding:12px';
  el.innerHTML = `<div style="background:var(--surface);border-radius:10px;max-width:420px;width:100%;padding:14px;display:flex;flex-direction:column;gap:10px" role="dialog" aria-modal="true"><b>Criar senha nova</b><div class="field"><label class="lb" for="rcS1">Senha nova (mínimo 6)</label><input type="password" id="rcS1" autocomplete="new-password"></div><div class="field"><label class="lb" for="rcS2">Repita a senha</label><input type="password" id="rcS2" autocomplete="new-password"></div><button type="button" class="btn pri" id="rcOk">Salvar senha</button></div>`;
  document.body.appendChild(el);
  $('#rcOk', el).onclick = async () => { const a = $('#rcS1', el).value, b = $('#rcS2', el).value; if (a.length < 6) { toast('A senha precisa ter pelo menos 6 caracteres.'); return; } if (a !== b) { toast('As senhas não conferem.'); return; }
    if (await senhaVazada(a)) { toast('Essa senha é fácil de adivinhar ou já apareceu em vazamentos na internet. Escolha outra.', 7000); return; }
    try { const r = await Nuvem.sb.auth.updateUser({ password: a }); if (r && r.error) throw r.error; el.remove(); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} toast('Senha nova salva. Use-a para entrar.', 5000); } catch (e) { toast('Não foi possível salvar: ' + (e.message || e), 6000); } };
}
function afterAdmLogin() {
  const f = $('#fLogin'); if (!f) return;
  $('#bAdmEsqueci') && ($('#bAdmEsqueci').onclick = async () => { const em = $('#admEmail').value.trim(); if (!/@/.test(em)) { toast('Digite o seu e-mail primeiro.'); $('#admEmail').focus(); return; }
    try { await Nuvem.sdk(); const r = await Nuvem.sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname }); if (r && r.error) throw r.error; $('#admErro').innerHTML = '<div class="okbox small">Se o e-mail estiver cadastrado, chega uma mensagem com o link para criar uma senha nova. Abra o link neste mesmo navegador.</div>'; }
    catch (e) { $('#admErro').innerHTML = `<div class="warnbox small">Não foi possível enviar: ${esc(e.message || e)}</div>`; } });
  f.addEventListener('submit', async e => { e.preventDefault(); const bt = $('#bAdmEntrar'); bt.disabled = true; bt.textContent = 'Entrando…'; $('#admErro').innerHTML = '';
    try { await Nuvem.loginAdmin($('#admEmail').value.trim(), $('#admSenha').value); if (NOC) { go('noc'); return; } if (ACION) { await acionCarregar(); go('acion'); return; } admPeriodoPapel(); await admCarregar(); menuAdmin(); go(admInicio()); lembraBackup(); }
    catch (err) { $('#admErro').innerHTML = `<div class="warnbox" style="border-color:var(--bad);background:var(--bad-soft)">${esc(err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' ? 'E-mail ou senha incorretos.' : err.message)}</div>`; bt.disabled = false; bt.textContent = 'Entrar'; } });
}
/* ---------- importar O.S. pendentes em lote (planilha) ---------- */
const LOTE_COLS = { ticket: ['OS', 'ORDEM', 'ORDEMDESERVICO', 'NUMEROOS', 'NUMERODAOS', 'NOS', 'NUMERO', 'TICKET', 'EVENTO', 'ORIUNDODOEVENTO', 'INCIDENTE', 'CHAMADO', 'PROTOCOLO'], tipo: ['TIPO', 'TIPODEATIVIDADE', 'TIPODAOS', 'NATUREZA', 'CLASSIFICACAO'], ocorrencia: ['OCORRENCIA', 'MOTIVO', 'PROBLEMA', 'ATIVIDADE', 'SERVICO'], descricao: ['DESCRICAO', 'OBS', 'OBSERVACAO', 'OBSERVACOES', 'DETALHE', 'DETALHES'],
  endereco: ['ENDERECO', 'LOGRADOURO', 'LOCAL', 'RUA', 'ENDERECOCOMPLETO'], bairro: ['BAIRRO'], cidade: ['CIDADE', 'MUNICIPIO'], rota: ['ROTA', 'CODIGODAROTA', 'CODROTA', 'LINK', 'ENLACE'], node: ['NODE', 'NO'], rede: ['REDE'], wfc: ['WFC'], wf2: ['WF2'], tecnico: ['TECNICO', 'RESPONSAVEL', 'EXECUTOR', 'EQUIPE'], cliente: ['CLIENTE'],
  lat: ['LAT', 'LATITUDE'], lon: ['LON', 'LONG', 'LNG', 'LONGITUDE'], coord: ['COORDENADA', 'COORDENADAS', 'LATLONG', 'LATLON', 'GPS', 'LOCALIZACAO'], prazo: ['PRAZO', 'DATA', 'DATAPREVISTA', 'VENCIMENTO', 'SLA'], designacao: ['DESIGNACAO', 'CIRCUITO'], centro: ['CENTRODECUSTO', 'CENTRO', 'FATURAMENTO', 'CONTRATO'], projeto: ['PROJETO', 'NOMEDOPROJETO'] };
const nCol = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function loteTabela(txt) {
  const linhas = String(txt || '').replace(/\r/g, '').split('\n').filter(l => l.trim()); if (linhas.length < 2) return null;
  const d = ['\t', ';', ','].find(c => linhas[0].split(c).length > 1) || '\t';
  const split = l => { const out = []; let cur = '', q = false; for (let k = 0; k < l.length; k++) { const ch = l[k]; if (ch === '"') { if (q && l[k + 1] === '"') { cur += '"'; k++; } else q = !q; } else if (ch === d && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(x => x.trim()); };
  return linhas.map(split);
}
function loteLer(rows) {
  if (!rows || rows.length < 2) return { erro: 'Cole a planilha com a linha de cabeçalho (ex.: OS, Tipo, Endereço, WFC, WF2, Técnico).' };
  const cab = rows[0].map(nCol); const idx = {}; Object.entries(LOTE_COLS).forEach(([k, al]) => { const i = cab.findIndex(c => al.includes(c)); if (i >= 0) idx[k] = i; });
  if (idx.ticket == null && idx.endereco == null) return { erro: 'Não achei as colunas. O cabeçalho precisa ter pelo menos "OS" (ou Ticket) ou "Endereço".' };
  const L = S.lote || {}; const abertas = [...(S.atvsAdm || new Map()).values()].filter(atvAberta); const vistos = new Set(); const nn = t => nCol(t);
  const itens = rows.slice(1).map((r, k) => {
    const g = c => idx[c] != null ? String(r[idx[c]] ?? '').trim() : '';
    const tp = nn(g('tipo')); const tipo = /CORRET|EMERG/.test(tp) ? 'emergencial' : /IMPLANT|EXPANS/.test(tp) ? 'implantacao' : /PREVENT/.test(tp) ? 'preventiva' : L.tipo || 'emergencial';
    let lat = parseFloat(g('lat').replace(',', '.')), lon = parseFloat(g('lon').replace(',', '.')); if ((isNaN(lat) || isNaN(lon)) && g('coord')) { const pl = parseLoc(g('coord')); if (pl && pl.lat != null) { lat = pl.lat; lon = pl.lon; } }
    const rtTxt = nn(g('rota')); const rt = rtTxt ? (S.rotas || []).find(x => nn(x.codigo) === rtTxt || nn(x.nome) === rtTxt) : null;
    const tTxt = nn(g('tecnico')); const tec = tTxt ? (S.adm.tecnicos || []).find(t => nn(t.nome) === tTxt || nn(t.nome).startsWith(tTxt) || nn(t.matricula) === tTxt) : null;
    const cli = g('cliente') ? (/CLARO/i.test(g('cliente')) ? 'Claro' : g('cliente')) : (L.claro && tipo === 'emergencial' ? 'Claro' : '');
    const ticket = g('ticket').toUpperCase(); const avisos = [];
    if (ticket && (abertas.some(a => String(a.ticket || '').toUpperCase() === ticket) || vistos.has(ticket))) avisos.push('duplicada'); if (ticket) vistos.add(ticket);
    const endereco = [g('endereco'), g('bairro'), g('cidade')].filter(Boolean).join(', ');
    if (!endereco && !rt && (isNaN(lat) || isNaN(lon))) avisos.push('sem local');
    if (tTxt && !tec) avisos.push('técnico não encontrado');
    if (g('rota') && !rt) avisos.push('rota não encontrada');
    const ctx = nn(g('centro')); const centro = /BACKBONE|MANUT|FECHADO/.test(ctx) ? 'backbone' : /INTERIOR/.test(ctx) ? 'claro_int' : /SP|CAPITAL/.test(ctx) ? 'claro_sp' : '';
    return { k, centro, ticket, tipo, ocorrencia: g('ocorrencia'), descricao: g('descricao'), endereco, rotaId: rt ? rt.id : '', rotaTxt: g('rota'), lat: isNaN(lat) ? null : lat, lon: isNaN(lon) ? null : lon, node: g('node').toUpperCase(), rede: g('rede'), wfc: g('wfc').toUpperCase(), wf2: g('wf2').toUpperCase(), tecTxt: g('tecnico'), tec, cliente: cli, prazo: g('prazo'), designacao: g('designacao').toUpperCase(), avisos, incluir: !avisos.includes('duplicada') };
  }).filter(x => x.ticket || x.endereco || x.ocorrencia);
  return { itens, cols: Object.keys(idx) };
}
function viewAdmLote() {
  const L = S.lote || (S.lote = { tipo: 'emergencial', claro: true, geo: false }); const R = L.res; const sel = R && R.itens ? R.itens.filter(x => x.incluir) : [];
  return `<section class="card"><h2>Planilha das O.S. pendentes</h2><p class="muted small" style="margin:0">Copie as linhas do Excel (com o cabeçalho) e cole abaixo, ou escolha o arquivo (.xlsx, .xls ou .csv). Colunas reconhecidas: <b>OS</b> (ou Ticket/Evento), <b>Tipo</b>, <b>Ocorrência</b>, <b>Endereço</b>, Bairro, Cidade, <b>Rota</b>, Node, Rede, <b>WFC</b>, <b>WF2</b>, <b>Técnico</b>, Cliente, Latitude/Longitude ou Coordenadas, Prazo, Designação, Observação.</p>
    <div class="field"><label class="lb" for="ltTxt">Colar da planilha</label><textarea id="ltTxt" rows="7" placeholder="OS&#9;Tipo&#9;Endereço&#9;Cidade&#9;WFC&#9;WF2&#9;Técnico" style="font-family:ui-monospace,monospace;font-size:13px">${esc(L.txt || '')}</textarea></div>
    <div class="row"><button type="button" class="btn" id="ltArq">Escolher arquivo</button><input type="file" id="ltFile" accept=".xlsx,.xls,.csv,.txt" hidden><button type="button" class="btn" id="ltModelo">Baixar modelo (Excel)</button><button type="button" class="btn pri" id="ltLer">Ler planilha</button></div>
    <div class="grid2"><div class="field"><span class="lb">Tipo quando a planilha não informar</span><div class="seg" role="group" aria-label="Tipo padrão">${[['emergencial', 'Corretiva'], ['preventiva', 'Preventiva'], ['implantacao', 'Implantação']].map(([k, l]) => `<button type="button" data-lttipo="${k}" aria-pressed="${L.tipo === k}">${l}</button>`).join('')}</div></div>
    <div class="field"><span class="lb">Opções</span><label class="row" style="min-height:40px;cursor:pointer"><input type="checkbox" id="ltClaro" ${L.claro ? 'checked' : ''} style="width:20px;height:20px"> Corretivas são da Claro (só serviço conta na produção)</label><label class="row" style="min-height:40px;cursor:pointer"><input type="checkbox" id="ltGeo" ${L.geo ? 'checked' : ''} style="width:20px;height:20px"> Localizar os endereços no mapa (cerca de 1 por segundo)</label></div></div></section>
  ${R && R.erro ? `<div class="warnbox">${esc(R.erro)}</div>` : ''}
  ${R && R.itens ? `<section class="card"><div class="row" style="justify-content:space-between"><h2>Conferência · ${R.itens.length} linha(s)</h2><span class="muted small">Colunas lidas: ${esc(R.cols.join(', '))}</span></div>
    <div class="tw"><table class="t"><thead><tr><th style="width:40px"><input type="checkbox" id="ltTodas" ${R.itens.every(x => x.incluir) ? 'checked' : ''} aria-label="Incluir todas"></th><th>O.S.</th><th>Tipo</th><th>Ocorrência</th><th>Local</th><th>WFC</th><th>WF2</th><th>Técnico</th><th>Avisos</th></tr></thead><tbody>
    ${R.itens.map((x, k) => `<tr style="${x.incluir ? '' : 'opacity:.5'}"><td><input type="checkbox" data-ltinc="${k}" ${x.incluir ? 'checked' : ''} aria-label="Incluir linha ${k + 1}"></td><td><b>${esc(x.ticket || '(automático)')}</b></td><td>${x.tipo === 'emergencial' ? 'Corretiva' + (x.cliente === 'Claro' ? ' Claro' : '') : x.tipo === 'implantacao' ? 'Implantação' : 'Preventiva'}</td><td>${esc(x.ocorrencia || '—')}</td><td class="small">${esc(x.endereco || (x.rotaId ? 'Rota ' + x.rotaTxt : x.lat != null ? `${x.lat}, ${x.lon}` : '—'))}</td><td>${esc(x.wfc || '—')}</td><td>${esc(x.wf2 || '—')}</td><td>${x.tec ? esc(x.tec.nome) : x.tecTxt ? `<span style="color:var(--bad)">${esc(x.tecTxt)}?</span>` : '<span class="muted">Backlog</span>'}</td><td>${x.avisos.map(a => `<span class="pill ${a === 'duplicada' ? 'bad' : 'draft'}">${esc(a)}</span>`).join(' ') || '<span class="pill ok">OK</span>'}</td></tr>`).join('')}</tbody></table></div>
    <div class="row"><button type="button" class="btn go" id="ltInserir" ${sel.length ? '' : 'disabled'}>${ICON.check}Inserir ${sel.length} O.S. (${sel.filter(x => x.tec).length} com técnico · ${sel.filter(x => !x.tec).length} no backlog)</button></div><div id="ltProg"></div></section>` : ''}`;
}
async function afterAdmLote() {
  const L = S.lote; const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  $('#ltTxt').addEventListener('input', e => { L.txt = e.target.value; });
  $$('[data-lttipo]').forEach(b => b.onclick = () => { L.tipo = b.dataset.lttipo; if (L.res && L.res.itens) L.res = loteLer(loteTabela(L.txt) || L.rows); re(); });
  $('#ltClaro').onchange = e => { L.claro = e.target.checked; if (L.res && L.res.itens) L.res = loteLer(L.rows); re(); };
  $('#ltGeo').onchange = e => { L.geo = e.target.checked; };
  $('#ltLer').onclick = () => { L.rows = loteTabela(L.txt); L.res = loteLer(L.rows); re(); };
  $('#ltArq').onclick = () => $('#ltFile').click();
  $('#ltFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { if (/\.(xlsx|xls)$/i.test(f.name)) { if (!window.XLSX) await carregaScript('xlsx.full.min.js'); const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]]; L.rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }).filter(r => r.some(c => String(c).trim())); L.txt = L.rows.slice(0, 200).map(r => r.join('\t')).join('\n'); }
      else { L.txt = await f.text(); L.rows = loteTabela(L.txt); }
      L.res = loteLer(L.rows); toast(`${f.name}: ${L.res.itens ? L.res.itens.length + ' linha(s) lida(s)' : 'não reconhecido'}.`); re(); } catch (er) { toast('Não consegui ler o arquivo: ' + er.message, 7000); } };
  $('#ltModelo').onclick = async () => { const cab = ['OS', 'Tipo', 'Ocorrência', 'Endereço', 'Bairro', 'Cidade', 'Rota', 'Node', 'WFC', 'WF2', 'Técnico', 'Cliente', 'Coordenadas', 'Prazo', 'Observação']; const ex = ['INM00001234567', 'Corretiva', 'Cabo rompido', 'Rua Exemplo, 100', 'Centro', 'São José dos Campos', '', 'CPOAEA', 'WFC123456', 'WF2123456', '', 'Claro', '-23.1791, -45.8872', '12/10/2026', 'Prioridade alta'];
    try { if (!window.XLSX) await carregaScript('xlsx.full.min.js'); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([cab, ex]), 'O.S.'); const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }); baixar(new File([out], 'Modelo_importar_OS.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); }
    catch (e) { baixar(new File(['﻿' + [cab, ex].map(r => r.join(';')).join('\r\n')], 'Modelo_importar_OS.csv', { type: 'text/csv' })); } };
  if (!L.res || !L.res.itens) return;
  $$('[data-ltinc]').forEach(c => c.onchange = () => { L.res.itens[+c.dataset.ltinc].incluir = c.checked; re(); });
  $('#ltTodas').onchange = e => { L.res.itens.forEach(x => { x.incluir = e.target.checked; }); re(); };
  $('#ltInserir').onclick = async () => {
    const lista = L.res.itens.filter(x => x.incluir); if (!lista.length) return; const b = $('#ltInserir'); b.disabled = true; const prog = $('#ltProg');
    const loteId = 'IMP-' + new Date().toISOString().slice(0, 16).replace(/\D/g, ''); const quem = (Nuvem.admin && Nuvem.admin.nome) || ''; let ok = 0, erro = 0; const erros = [];
    for (let k = 0; k < lista.length; k++) {
      const x = lista[k]; prog.innerHTML = `<p class="muted">Inserindo ${k + 1} de ${lista.length}…</p>`;
      if (L.geo && x.endereco && x.lat == null) { const g = await geocodifica(x.endereco); aplicaGeo(x, g); if (!g || g.fonte === 'osm') await new Promise(r => setTimeout(r, 1100)); }
      const a = { id: 'atv-' + uid(), criado: Date.now() + k, origem: 'supervisor', tipo: x.tipo, status: 'pendente', ticket: x.ticket || await proximoTicketOS(), ocorrencia: x.ocorrencia, descricao: [x.descricao, x.prazo && 'Prazo: ' + x.prazo, x.node && 'Node: ' + x.node, x.rede && 'Rede: ' + x.rede].filter(Boolean).join('\n'), endereco: x.endereco, rotaId: x.rotaId, refSentido: '', refKm: '', refLocal: '', lat: x.lat, lon: x.lon, mapsUrl: '',
        node: x.node, rede: x.rede, wfc: x.wfc, wf2: x.wf2, cliente: x.cliente, centro: x.centro, projeto: (() => { const n = String(x.projeto || '').trim().toLowerCase(); const pj = n && projAtivos().find(p => p.nome.toLowerCase() === n || p.id === x.projeto); return pj ? pj.id : ''; })(), prazo: x.prazo, loteImport: loteId, criadoPorNome: quem, tecnicoUid: x.tec ? x.tec.uid : '', tecnicoNome: x.tec ? x.tec.nome : '', ...(x.tipo === 'implantacao' ? { designacao: x.designacao || x.ticket, servico: 'roteamento' } : {}) };
      try { const r = await Nuvem.atvCriar(a); if (r) S.atvsAdm.set(r.id, r); ok++; } catch (e) { erro++; erros.push(`${x.ticket || 'linha ' + (x.k + 2)}: ${e.message}`); }
    }
    Nuvem.avisaFuncao(); L.res = null; L.txt = ''; L.rows = null;
    re(); const box = $('#ltProg') || $('#app'); const msg = `<div class="${erro ? 'warnbox' : 'okbox'}"><b>${ok} O.S. inserida(s)</b> no lote ${esc(loteId)}${erro ? ` · ${erro} com erro: ${esc(erros.slice(0, 5).join('; '))}` : ''}. As que têm técnico já tocaram no celular dele; as demais estão no backlog do painel.</div>`;
    $('#app').insertAdjacentHTML('afterbegin', msg); window.scrollTo(0, 0);
  };
}
/* ---------- veículo: abastecimentos e consumo ---------- */
const COMBUST = { gasolina: 'Gasolina', etanol: 'Etanol', diesel: 'Diesel', gnv: 'GNV' };
async function meusAbast() { return (await DB.all('meta')).filter(x => x._abast).map(x => ({ ...x, id: x.id.slice(6) })).sort((a, b) => a.ts - b.ts); }
// consumo: entre dois abastecimentos de tanque cheio, km rodados ÷ litros colocados depois do anterior
function consumoAbast(l) {
  const out = l.map(a => ({ ...a })); let ant = null, litros = 0, custo = 0;
  out.forEach(a => { if (ant) { litros += +a.litros || 0; custo += +a.total || 0; } if (a.cheio !== false) { if (ant && litros > 0 && a.odo > ant.odo) { a.km = a.odo - ant.odo; a.kml = a.km / litros; a.rkm = custo / a.km; } ant = a; litros = 0; custo = 0; } });
  return out;
}
function resumoAbast(l, de, ate) {
  const a0 = diaIni(de), a1 = diaFim(ate); const c = consumoAbast(l); const per = c.filter(a => a.ts >= a0 && a.ts <= a1);
  const comKm = c.filter(a => a.kml && a.ts >= a0 && a.ts <= a1); const km = comKm.reduce((s, a) => s + a.km, 0), lt = comKm.reduce((s, a) => s + a.km / a.kml, 0), rs = comKm.reduce((s, a) => s + a.rkm * a.km, 0);
  return { lista: c, per, n: per.length, litros: per.reduce((s, a) => s + (+a.litros || 0), 0), total: per.reduce((s, a) => s + (+a.total || 0), 0), kml: lt ? km / lt : null, rkm: km ? rs / km : null, km };
}
const fL = v => (+v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' L';
const fKml = v => v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' km/l';
function viewVeiculo() {
  const F = S.abForm || (S.abForm = { cheio: true, comb: S.perfil.ultComb || 'gasolina', quando: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) });
  const [c0, c1] = S.abPer || cicloDe();
  return `<section class="card"><h2>Novo abastecimento</h2><p class="muted small" style="margin:0">${esc(S.perfil.veiculoTxt || 'Veículo não informado no perfil')}. Marque "Tanque cheio" para o app calcular o consumo.</p>
    <div class="grid2"><div class="field"><label class="lb" for="abQ">Data e hora</label><input type="datetime-local" id="abQ" value="${esc(F.quando)}"></div><div class="field"><label class="lb" for="abOdo">Hodômetro (km) <span class="req">*</span></label><input type="text" inputmode="numeric" id="abOdo" value="${esc(F.odo || '')}" placeholder="Ex.: 48250"></div>
    <div class="field"><label class="lb" for="abL">Litros <span class="req">*</span></label><input type="text" inputmode="decimal" id="abL" value="${esc(F.litros || '')}" placeholder="Ex.: 42,5"></div><div class="field"><label class="lb" for="abP">Preço do litro (R$) <span class="req">*</span></label><input type="text" inputmode="decimal" id="abP" value="${esc(F.preco || '')}" placeholder="Ex.: 5,89"></div>
    <div class="field"><label class="lb" for="abT">Total pago (R$)</label><input type="text" inputmode="decimal" id="abT" value="${esc(F.total || '')}" placeholder="Calculado"></div><div class="field"><label class="lb" for="abC">Combustível</label><select id="abC">${Object.entries(COMBUST).map(([k, l]) => `<option value="${k}" ${F.comb === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field full"><label class="lb" for="abPosto">Posto</label><input type="text" id="abPosto" value="${esc(F.posto || '')}" placeholder="Nome e cidade"></div>
    <label class="row field full" style="min-height:44px;cursor:pointer"><input type="checkbox" id="abCheio" ${F.cheio ? 'checked' : ''} style="width:22px;height:22px"> <b>Tanque cheio</b></label></div>
    <button type="button" class="btn pri block" id="bAbSalvar">${ICON.check}Salvar abastecimento</button></section>
  <section class="card"><div class="chips" role="group" aria-label="Período">${ciclosAtalhos(false).map(([l, d, a]) => `<button type="button" data-abper="${d}|${a}" aria-checked="${c0 === d && c1 === a}">${l}</button>`).join('')}</div><div id="abRes"><p class="empty">Carregando…</p></div></section>`;
}
async function afterVeiculo() {
  const F = S.abForm; const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  const num = id => kmNum($('#' + id).value);
  const calc = () => { const l = num('abL'), pr = num('abP'); if (l && pr && !$('#abT').dataset.manual) $('#abT').value = (l * pr).toFixed(2).replace('.', ','); };
  [['abQ', 'quando'], ['abOdo', 'odo'], ['abL', 'litros'], ['abP', 'preco'], ['abT', 'total'], ['abPosto', 'posto']].forEach(([id, k]) => $('#' + id).addEventListener('input', e => { F[k] = e.target.value; if (id === 'abT') e.target.dataset.manual = '1'; if (id === 'abL' || id === 'abP') { calc(); F.total = $('#abT').value; } }));
  $('#abC').onchange = e => { F.comb = e.target.value; }; $('#abCheio').onchange = e => { F.cheio = e.target.checked; };
  $$('[data-abper]').forEach(b => b.onclick = () => { S.abPer = b.dataset.abper.split('|'); re(); });
  const lista = await meusAbast();
  $('#bAbSalvar').onclick = async () => {
    const odo = num('abOdo'), lt = num('abL'), pr = num('abP'); let tot = num('abT');
    if (!odo || !lt || !pr) { toast('Informe hodômetro, litros e preço do litro.'); return; }
    if (!tot) tot = lt * pr; const ts = Date.parse($('#abQ').value) || Date.now();
    const ant = lista.filter(a => a.ts < ts).pop(); if (ant && odo <= ant.odo) { toast(`O hodômetro precisa ser maior que o do abastecimento anterior (${ant.odo} km).`, 6000); return; }
    if (Math.abs(tot - lt * pr) > Math.max(2, tot * 0.05)) { if (!confirm(`Total informado (${fBRL(tot)}) diferente de litros × preço (${fBRL(lt * pr)}). Salvar assim mesmo?`)) return; }
    const a = { id: 'ab' + uid(), ts, odo: Math.round(odo), litros: +lt.toFixed(3), preco: +pr.toFixed(3), total: +tot.toFixed(2), comb: F.comb, posto: String(F.posto || '').trim(), cheio: !!F.cheio, placa: S.perfil.veiculoTxt || '', tecnico: S.perfil.nome, criado: Date.now() };
    await DB.putRaw('meta', { ...a, id: 'abast:' + a.id, _abast: true }); Nuvem.enfileira('abast', 'abast:' + a.id);
    S.perfil.ultComb = F.comb; DB.put('meta', S.perfil); S.abForm = null;
    const c = consumoAbast([...lista, a].sort((x, y) => x.ts - y.ts)).find(x => x.id === a.id);
    toast(c && c.kml ? `Salvo. Consumo desde o último tanque cheio: ${fKml(c.kml)} (${fBRL(c.rkm)}/km).` : 'Abastecimento salvo.', 6000); re();
  };
  const [de, ate] = S.abPer || cicloDe(); const R = resumoAbast(lista, de, ate); const box = $('#abRes'); if (!box) return;
  box.innerHTML = `<div class="stats"><div class="stat"><b>${fKml(R.kml)}</b><span>Consumo médio</span></div><div class="stat"><b>${R.rkm != null ? fBRL(R.rkm) : '—'}</b><span>Custo por km</span></div><div class="stat"><b>${fBRL(R.total)}</b><span>Gasto no período</span></div><div class="stat"><b>${fL(R.litros)}</b><span>${R.n} abastecimento(s)</span></div></div>
    <div class="list">${R.lista.slice().reverse().filter(a => a.ts >= diaIni(de) && a.ts <= diaFim(ate)).map(a => `<div class="item" style="cursor:default;align-items:center"><span class="badge" style="width:auto;padding:0 8px;border-radius:6px">${fData(a.ts).slice(0, 5)}</span><span class="tx"><b>${fL(a.litros)} · ${fBRL(a.total)} · ${(+a.odo).toLocaleString('pt-BR')} km</b><span>${esc(COMBUST[a.comb] || a.comb || '')} · ${fBRL(a.preco)}/L${a.posto ? ' · ' + esc(a.posto) : ''}${a.cheio === false ? ' · parcial' : ''}${a.kml ? ` · <b style="color:var(--ok)">${fKml(a.kml)}</b> (${fKm(a.km)}, ${fBRL(a.rkm)}/km)` : ''}</span></span><button type="button" class="btn" data-abdel="${a.id}" aria-label="Excluir abastecimento" style="min-height:40px;min-width:40px;padding:0">✕</button></div>`).join('') || '<p class="empty">Nenhum abastecimento no período.</p>'}</div>`;
  $$('[data-abdel]', box).forEach(b => b.onclick = async () => { if (!confirm('Excluir este abastecimento?')) return; const id = b.dataset.abdel; await DB.delRaw('meta', 'abast:' + id); try { await DB.delRaw('fila', 'abast:abast:' + id); } catch (e) {} if (Nuvem.on) { try { await Nuvem.tab('abastecimentos').delete().eq('id', id); } catch (e) {} } re(); });
}

/* ---------- horas extras e vale-refeição ---------- */
const JORNADA_PADRAO_MIN = 528; // 8h48 por dia útil = 44 h por semana
const LIMITE_DIA_PADRAO = 600;  // CLT: no máximo 2 h extras por dia → 10 h de trabalho
// minutos trabalhados no expediente (desconta as refeições)
function trabHoje(e, agora = Date.now()) { const fim = e.fim || agora; let ref = 0; (e.refeicoes || (e.refeicao ? [e.refeicao] : [])).forEach(r => { if (r && r.ini) ref += (Math.min(r.fim || fim, fim) - r.ini); }); return Math.max(0, Math.round((fim - e.inicio - ref) / 60000)); }
const fHm = m => { const s = m < 0 ? '-' : ''; m = Math.abs(Math.round(m)); return `${s}${Math.floor(m / 60)}h${pad2(m % 60)}`; };
// minutos trabalhados entre 22h e 5h (descontando a refeição que cair nesse horário)
function minNoturnos(e) {
  const jan = (a, b) => { let m = 0; const d0 = new Date(a); d0.setHours(0, 0, 0, 0); for (let d = d0.getTime() - 86400000; d < b; d += 86400000) { const n0 = d + 22 * 3600000, n1 = d + 29 * 3600000; m += Math.max(0, Math.min(b, n1) - Math.max(a, n0)); } return m / 60000; };
  let m = jan(e.inicio, e.fim); (e.refeicoes || (e.refeicao ? [e.refeicao] : [])).forEach(r => { if (r && r.ini) m -= jan(r.ini, Math.min(r.fim || e.fim, e.fim)); }); return Math.max(0, m);
}
// dias úteis (seg a sáb) e domingos no período, para o DSR sobre as variáveis
function diasCal(de, ate) { let uteis = 0, domFer = 0; for (let d = diaIni(de) + 43200000; d <= diaFim(ate); d += 86400000) { if (new Date(d).getDay() === 0) domFer++; else uteis++; } return { uteis, domFer }; }
function horasExtras(exps, cad, de, ate) {
  const a0 = diaIni(de), a1 = diaFim(ate); const jor = +(cad && cad.jornada_min) || JORNADA_PADRAO_MIN; const dias = new Map();
  (exps || []).filter(e => e.inicio >= a0 && e.inicio <= a1 && e.fim).forEach(e => { const k = isoDate(e.inicio); const d = dias.get(k) || { dia: k, ent: e.inicio, sai: e.fim, bruto: 0, ref: 0, nref: 0 };
    d.ent = Math.min(d.ent, e.inicio); d.sai = Math.max(d.sai, e.fim); d.bruto += (e.fim - e.inicio) / 60000;
    (e.refeicoes || (e.refeicao ? [e.refeicao] : [])).forEach(r => { if (r && r.ini) { d.ref += (Math.min(r.fim || e.fim, e.fim) - r.ini) / 60000; d.nref++; } }); dias.set(k, d); });
  const L = [...dias.values()].sort((x, y) => x.ent - y.ent).map(d => { const dow = new Date(d.ent).getDay(); const trab = Math.max(0, d.bruto - d.ref); let normal = 0, he50 = 0, he100 = 0;
    if (dow === 0) he100 = trab; else if (dow === 6) he50 = trab; else { normal = Math.min(trab, jor); he50 = Math.max(0, trab - jor); }
    return { ...d, dow, trab, normal, he50, he100, falta: dow >= 1 && dow <= 5 && trab < jor ? jor - trab : 0, intervalo: trab > 360 && d.ref < 60, acimaLim: trab > LIMITE_DIA_PADRAO }; });
  const T = L.reduce((t, d) => { ['trab', 'normal', 'he50', 'he100', 'falta'].forEach(k => t[k] += d[k]); return t; }, { trab: 0, normal: 0, he50: 0, he100: 0, falta: 0 });
  const sal = +(cad && cad.salario) || 0, vr = +(cad && cad.vr_dia) || 0;
  // adicionais: periculosidade (% do salário base) e outros fixos (gratificação etc.)
  const per = sal * (+(cad && cad.peric_pct) || 0) / 100, ins = 0, outros = +(cad && cad.outros_mes) || 0; // as equipes não recebem insalubridade
  const hora = sal ? (sal + per) / 220 : 0; // a periculosidade entra na base da hora extra e do noturno
  const notPct = cad && cad.noturno_pct != null && cad.noturno_pct !== '' ? +cad.noturno_pct : 20;
  const minNot = (exps || []).filter(e => e.inicio >= a0 && e.inicio <= a1 && e.fim).reduce((t, e) => t + minNoturnos(e), 0);
  const v50 = T.he50 / 60 * hora * 1.5, v100 = T.he100 / 60 * hora * 2, vNot = minNot / 52.5 * hora * notPct / 100; // hora noturna reduzida: 52min30s
  const cal = diasCal(de, ate); const dsr = cad && cad.dsr === false || !cal.uteis ? 0 : (v50 + v100 + vNot) / cal.uteis * cal.domFer;
  return { L, T, jor, sal, vr, hora, per, ins, outros, fixosMes: sal + per + ins + outros, minNot, notPct, v50, v100, vNot, dsr, variaveis: v50 + v100 + vNot + dsr, vrTot: vr * L.length, dias: L.length, cal };
}
const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
function horasHtml(X) {
  return `<div class="stats"><div class="stat"><b>${fHm(X.T.trab)}</b><span>Trabalhadas · ${X.dias} dia(s)</span></div><div class="stat"><b>${fHm(X.T.he50)}</b><span>Horas extras 50%${X.hora ? ' · ' + fBRL(X.v50) : ''}</span></div><div class="stat"><b>${fHm(X.T.he100)}</b><span>Horas extras 100%${X.hora ? ' · ' + fBRL(X.v100) : ''}</span></div><div class="stat"><b>${X.vr ? fBRL(X.vrTot) : '—'}</b><span>Vale-refeição${X.vr ? ` (${fBRL(X.vr)}/dia)` : ''}</span></div></div>
    ${X.hora ? `<div class="stats"><div class="stat"><b>${fBRL(X.per)}</b><span>Periculosidade / mês</span></div><div class="stat"><b>${fHm(X.minNot)} · ${fBRL(X.vNot)}</b><span>Adicional noturno (${X.notPct}%)</span></div><div class="stat"><b>${fBRL(X.dsr)}</b><span>DSR sobre extras e noturno</span></div></div>
    <p class="muted small" style="margin:0">Salário ${fBRL(X.sal)}${X.per ? ' + periculosidade ' + fBRL(X.per) : ''}${X.outros ? ' + outros adicionais ' + fBRL(X.outros) : ''} = <b>${fBRL(X.fixosMes)}/mês</b>. Hora ${fBRL(X.hora)} (salário + periculosidade ÷ 220) · jornada ${fHm(X.jor)} por dia útil. Sábado conta como extra 50%; domingo como 100%. Noturno: das 22h às 5h, hora reduzida de 52min30s. DSR: ${X.cal.domFer} domingo(s) sobre ${X.cal.uteis} dia(s) úteis. Variáveis no período (extras + noturno + DSR): <b>${fBRL(X.variaveis)}</b>.</p>` : '<p class="muted small" style="margin:0">Os valores em R$ aparecem quando o supervisor cadastrar o salário.</p>'}
    <div class="tw"><table class="t"><thead><tr><th>Dia</th><th>Entrada</th><th>Saída</th><th class="r">Refeição</th><th class="r">Trabalhado</th><th class="r">Extra 50%</th><th class="r">Extra 100%</th><th>Obs.</th></tr></thead><tbody>
    ${X.L.map(d => `<tr><td>${fData(d.ent).slice(0, 5)} ${DOW[d.dow]}</td><td>${fHora(d.ent)}</td><td>${fHora(d.sai)}</td><td class="r">${fHm(d.ref)}</td><td class="r"><b>${fHm(d.trab)}</b></td><td class="r">${d.he50 ? fHm(d.he50) : '—'}</td><td class="r">${d.he100 ? fHm(d.he100) : '—'}</td><td class="small">${[d.acimaLim ? '<b style="color:var(--bad)">Acima de 10h (limite de 2h extras)</b>' : '', d.intervalo ? 'Refeição abaixo de 1h' : '', d.falta ? 'Abaixo da jornada (' + fHm(d.falta) + ')' : ''].filter(Boolean).join(' · ')}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">Nenhum expediente encerrado no período.</td></tr>'}</tbody></table></div>`;
}
async function pdfHorasExtras(nome, matricula, X, de, ate) {
  if (!window.jspdf) { toast('Gerador de PDF não carregou.'); return null; }
  const { doc, logo } = await novoPdf(); const per = `${fDM(de)} a ${fDM(ate)}`;
  let y = pdfHeader(doc, logo, 'Extrato de horas extras', `${nome} · ${per}`, null);
  y = pdfSec(doc, y, 1, 'Resumo'); y = kv(doc, y, [['Colaborador', nome], ['Matrícula', matricula || '—'], ['Período', per], ['Dias trabalhados', String(X.dias)], ['Horas trabalhadas', fHm(X.T.trab)], ['Jornada por dia útil', fHm(X.jor)], ['Horas extras 50%', fHm(X.T.he50) + (X.hora ? ' · ' + fBRL(X.v50) : '')], ['Horas extras 100%', fHm(X.T.he100) + (X.hora ? ' · ' + fBRL(X.v100) : '')], ['Salário base', X.sal ? fBRL(X.sal) : '—'], ['Valor da hora', X.hora ? fBRL(X.hora) : '—'], ['Total de horas extras', X.hora ? fBRL(X.v50 + X.v100) : '—'], ['Periculosidade (mês)', X.per ? fBRL(X.per) : '—'], ['Outros adicionais (mês)', X.outros ? fBRL(X.outros) : '—'], ['Adicional noturno', X.minNot ? `${fHm(X.minNot)} · ${X.hora ? fBRL(X.vNot) : '—'}` : '—'], ['DSR sobre extras e noturno', X.hora ? fBRL(X.dsr) : '—'], ['Total de variáveis', X.hora ? fBRL(X.variaveis) : '—'], ['Vale-refeição', X.vr ? `${fBRL(X.vrTot)} (${X.dias} × ${fBRL(X.vr)})` : '—']]);
  y = pdfSec(doc, y, 2, 'Dia a dia');
  doc.autoTable({ ...TB, startY: y, head: [['Dia', 'Entrada', 'Saída', 'Refeição', 'Trabalhado', 'Extra 50%', 'Extra 100%', 'Obs.']], body: X.L.map(d => [`${fData(d.ent).slice(0, 5)} ${DOW[d.dow]}`, fHora(d.ent), fHora(d.sai), fHm(d.ref), fHm(d.trab), d.he50 ? fHm(d.he50) : '—', d.he100 ? fHm(d.he100) : '—', [d.acimaLim ? 'Acima de 10h' : '', d.intervalo ? 'Refeição < 1h' : '', d.falta ? 'Abaixo da jornada' : ''].filter(Boolean).join(' · ')]), styles: { ...TB.styles, fontSize: 8 }, columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' }, 5: { halign: 'right' }, 6: { halign: 'right' } } });
  y = doc.lastAutoTable.finalY + 6; if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90); doc.splitTextToSize('Calculado pelos horários de início e fim de expediente e de refeição registrados no app. Hora = (salário + periculosidade) ÷ 220. Dias úteis acima da jornada: 50%. Sábado: 50%. Domingo: 100%. Adicional noturno das 22h às 5h com hora reduzida (52min30s). DSR calculado sobre os domingos do período; feriados devem ser conferidos pelo RH.', 186).forEach(l => { doc.text(l, 12, y); y += 3.6; });
  y += 16; doc.setDrawColor(60); doc.setLineWidth(0.3); doc.line(14, y, 94, y); doc.line(116, y, 196, y); doc.setFontSize(8); doc.setTextColor(20); doc.text(nome, 54, y + 4, { align: 'center' }); doc.text('Supervisor / RH', 156, y + 4, { align: 'center' });
  pdfFooter(doc, `Técnico Plus - Multivale · horas extras ${per} · gerado em ${fDH(Date.now())}`);
  return new File([doc.output('blob')], nomeArq(`Horas_extras_${nome}_${de}_a_${ate}`), { type: 'application/pdf' });
}
/* ---------- equipe e cadastros (supervisor) ---------- */
function codigoConvite() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const r = new Uint8Array(6); crypto.getRandomValues(r); return [...r].map(x => A[x % A.length]).join(''); }
const linkConvite = c => new URL('index.html?convite=' + c, location.href).href;
function waConvite(c) { const t = `Olá ${c.nome.split(' ')[0]}! Este é o seu acesso ao app Técnico Plus - Multivale (${cargoLb(c)}).\n\n1. Abra o link no celular: ${linkConvite(c.id)}\n2. Em "Primeiro acesso", crie a sua senha (o código do convite já vem preenchido: ${c.id}).\n3. Nas próximas vezes, entre com a sua matrícula${c.matricula ? ' (' + c.matricula + ')' : ''} e a senha.\n4. Complete o perfil (veículo e endereço da residência).`; const tel = String(c.telefone || '').replace(/\D/g, ''); return `https://wa.me/${tel ? (tel.length <= 11 ? '55' + tel : tel) : ''}?text=${encodeURIComponent(t)}`; }
function equipeLinhas() {
  const cads = S.cads || []; const porUid = new Map(cads.filter(c => c.uid).map(c => [c.uid, c])); const out = [];
  (S.adm.tecnicos || []).forEach(t => { const c = porUid.get(t.uid); out.push({ uid: t.uid, nome: (c && c.nome) || t.nome, matricula: (c && c.matricula) || t.matricula, funcao: (c && c.funcao) || t.funcao || 'tecnico', cargo: (c && c.cargo) || t.cargo || '', equipe: (c && c.equipe) || t.equipe || '', cad: c || null, ativoCel: true }); });
  cads.filter(c => !c.uid || !(S.adm.tecnicos || []).some(t => t.uid === c.uid)).forEach(c => out.push({ uid: c.uid, nome: c.nome, matricula: c.matricula, funcao: c.funcao, cargo: c.cargo || '', equipe: c.equipe || '', cad: c, ativoCel: false }));
  return out.sort((a, b) => a.nome.localeCompare(b.nome));
}
function viewAdmEquipe() {
  const F = S.cadForm || (S.cadForm = { funcao: 'tecnico', cargo: 'oficial' }); const filt = S.eqFilt || 'todos'; const L = equipeLinhas().filter(x => filt === 'todos' || x.funcao === filt); const novo = S.cadNovo;
  const cont = f => equipeLinhas().filter(x => x.funcao === f).length;
  return `<section class="card"><h2>Novo cadastro</h2><p class="muted small" style="margin:0">Cadastre a pessoa e envie o convite pelo WhatsApp. Ao abrir o link no celular, o app já entra com o nome, a matrícula e a função definidos aqui.</p>
    <div class="grid3"><div class="field"><label class="lb" for="cdCargo">Função <span class="req">*</span></label><select id="cdCargo">${cargoOpts(F.cargo)}</select></div><div class="field"><label class="lb" for="cdNome">Nome completo <span class="req">*</span></label><input type="text" id="cdNome" value="${esc(F.nome || '')}" autocomplete="off"></div>
    <div class="field"><label class="lb" for="cdMat">Matrícula</label><input type="text" id="cdMat" value="${esc(F.matricula || '')}" inputmode="numeric"></div>
    <div class="field"><label class="lb" for="cdTel">WhatsApp</label><input type="tel" id="cdTel" value="${esc(F.telefone || '')}" placeholder="(12) 99999-0000"></div>
    <div class="field"><label class="lb" for="cdEq">Equipe</label><select id="cdEq">${eqOpts(F.equipe || '')}</select></div>
    <div class="field"><label class="lb" for="cdVei">Veículo (placa e modelo)</label><input type="text" id="cdVei" value="${esc(F.veiculo || '')}" placeholder="ABC1D23 Strada"></div></div>
    <button type="button" class="btn pri" id="bCadCriar">${ICON.plus}Criar ${esc((CARGO_LB[F.cargo] || 'cadastro').toLowerCase())} e gerar convite</button>
    ${novo ? `<div class="okbox"><b>${esc(novo.nome)}</b> cadastrado como <b>${esc(cargoLb(novo))}</b>. Código do convite: <b style="font-size:18px;letter-spacing:2px">${esc(novo.id)}</b><br><span class="small">${esc(linkConvite(novo.id))}</span>
      <div class="row" style="margin-top:8px"><a class="btn wa" href="${esc(waConvite(novo))}" target="_blank" rel="noopener">${ICON.wa}Enviar convite pelo WhatsApp</a><button type="button" class="btn" data-copiar="${esc(linkConvite(novo.id))}">Copiar link</button></div></div>` : ''}</section>
  <section class="card"><div class="row" style="justify-content:space-between"><h2>Equipe</h2><span class="muted small">${cont('tecnico')} técnico(s) · ${cont('fibra')} de fibra · ${cont('fiscal')} fiscal(is)</span></div>
    <div class="chips" role="group" aria-label="Filtrar por função">${[['todos', 'Todos'], ['tecnico', 'Técnicos'], ['fibra', 'Técnicos de fibra'], ['fiscal', 'Fiscais de campo']].map(([k, l]) => `<button type="button" data-eqf="${k}" aria-checked="${filt === k}">${l}</button>`).join('')}</div>
    <div class="tw"><table class="t"><thead><tr><th>Nome</th><th>Matrícula</th><th>Função</th><th>Equipe</th><th>Situação</th><th></th></tr></thead><tbody>
    ${L.map((x, k) => { const si = x.uid && x.ativoCel ? situacaoTec(x.uid) : null; const pend = x.cad && !x.cad.uid; const des = x.cad && x.cad.ativo === false;
      return `<tr style="${des ? 'opacity:.55' : ''}"><td><b>${esc(x.nome)}</b></td><td>${esc(x.matricula || '—')}</td><td><select data-eqfun="${k}" aria-label="Função de ${esc(x.nome)}" style="min-height:38px">${cargoOpts(x.cargo || cargoPadrao(x.funcao), x.cargo || cargoPadrao(x.funcao) ? '' : 'Técnico (sem função)')}</select></td><td>${esc(x.equipe || '—')}</td>
        <td>${des ? '<span class="pill">Desativado</span>' : pend ? `<span class="pill draft">Convite pendente · ${esc(x.cad.id)}</span>` : si ? `<span class="small">${esc(si.txt)}</span>` : '<span class="small muted">Ativo</span>'}</td>
        <td style="white-space:nowrap"><button type="button" class="btn" data-eqdet="${k}" style="min-height:36px;padding:0 10px">Horas e salário</button> ${x.cad && x.cad.login_email && !des ? `<button type="button" class="btn" data-eqsenha="${k}" style="min-height:36px;padding:0 10px;${x.cad.senha_pedida ? 'border-color:#1971c2;color:#1971c2;font-weight:700' : ''}">${x.cad.senha_pedida ? '🔑 Pediu senha nova' : 'Nova senha'}</button> ` : ''}${pend && !des ? `<a class="btn wa" href="${esc(waConvite(x.cad))}" target="_blank" rel="noopener" style="min-height:36px;padding:0 10px">${ICON.wa}Reenviar</a> ` : ''}${x.cad ? `<button type="button" class="btn" data-eqat="${k}" style="min-height:36px;padding:0 10px">${des ? 'Reativar' : 'Desativar'}</button> ` : ''}<button type="button" class="btn" data-eqdel="${k}" style="min-height:36px;padding:0 10px;color:var(--bad);border-color:var(--bad)">Excluir</button></td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">Ninguém nesta função ainda.</td></tr>'}</tbody></table></div>
    <div id="eqDet"></div>
    <p class="muted small" style="margin:0">Quem instalou o app antes dos cadastros aparece aqui pelo nome do perfil. Trocar a função cria o vínculo e passa a valer no celular dele na próxima abertura do app.</p></section>
    <section class="card" id="pnBox"><h2>Acessos do painel</h2><p class="muted small" style="margin:0">Carregando…</p></section>
    <section class="card" id="parBox"><h2>Portal do parceiro</h2><p class="muted small" style="margin:0">Carregando…</p></section>`;
}
// ---------- acessos do painel: supervisor e almoxarife criados aqui (função "acesso") ----------
const PAINEL_LB = { gestor: 'Gestor', supervisor: 'Supervisor', almoxarife: 'Almoxarife' };
async function pintaPainelUsers() {
  const box = $('#pnBox'); if (!box) return; const eu = Nuvem.admin || {}; const souGestor = eu.papel === 'gestor';
  let L = []; try { L = await Nuvem.painelLista(); } catch (e) { box.innerHTML = `<h2>Acessos do painel</h2><div class="warnbox">Lista indisponível: rode o supabase.sql novo (v52).</div>`; return; }
  const pode = a => a.uid !== (Nuvem.user && Nuvem.user.id) && (souGestor ? ['supervisor', 'almoxarife'].includes(a.papel || 'supervisor') : a.papel === 'almoxarife');
  const nv = S.pnNovo; const papeis = souGestor ? [['almoxarife', 'Almoxarife'], ['supervisor', 'Supervisor']] : [['almoxarife', 'Almoxarife']];
  box.innerHTML = `<h2>Acessos do painel</h2><p class="muted small" style="margin:0">Quem entra no painel com e-mail e senha. O <b>almoxarife</b> vê só o Almoxarifado (materiais e equipamentos). ${souGestor ? 'Você pode criar supervisores e almoxarifes.' : 'Supervisor novo é criado pelo gestor.'}</p>
    ${nv ? `<div class="okbox">Acesso criado / senha nova para <b>${esc(nv.nome)}</b>. Entrar em <b>${esc(new URL('admin.html', location.href).href)}</b> · e-mail <b>${esc(nv.email || '')}</b> · senha provisória: <b style="font-size:18px;letter-spacing:1px">${esc(nv.senha)}</b><br><span class="small">Envie por um canal seguro. Depois de entrar, a pessoa pode trocar a senha em "Esqueci a senha".</span></div>` : ''}
    <div class="list">${L.map(a => `<div class="item" style="cursor:default;flex-wrap:wrap;gap:8px"><span class="tx" style="flex:1 1 220px"><b>${esc(a.nome || '—')}</b><span>${esc(PAINEL_LB[a.papel || 'supervisor'] || a.papel)}${a.email ? ' · ' + esc(a.email) : ''}${a.uid === (Nuvem.user && Nuvem.user.id) ? ' · você' : ''}</span></span>${pode(a) ? `<span class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn" data-pnsen="${esc(a.uid)}" style="min-height:40px">Nova senha</button><button type="button" class="btn" data-pndel="${esc(a.uid)}" style="min-height:40px">Remover acesso</button></span>` : ''}</div>`).join('')}</div>
    <h3>Novo acesso</h3><div class="grid3"><div class="field"><label class="lb" for="pnNome">Nome</label><input type="text" id="pnNome"></div><div class="field"><label class="lb" for="pnEmail">E-mail de login</label><input type="email" id="pnEmail"></div>
      <div class="field"><label class="lb" for="pnPapel">Papel</label><select id="pnPapel">${papeis.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div></div>
    <button type="button" class="btn pri" id="bPnCriar">${ICON.plus}Criar acesso do painel</button>`;
  $('#bPnCriar').onclick = async () => { const nome = $('#pnNome').value.trim(), email = $('#pnEmail').value.trim(), papel = $('#pnPapel').value; if (!nome || !email) { toast('Informe nome e e-mail.'); return; }
    try { const d = await Nuvem.acesso('criar_painel', { nome, email, papel }); S.pnNovo = { nome, email, senha: d.senha }; toast('Acesso criado.'); pintaPainelUsers(); } catch (e) { toast('Erro: ' + (e.message || e), 7000); } };
  $$('[data-pnsen]', box).forEach(b => b.onclick = async () => { const a = L.find(x => x.uid === b.dataset.pnsen); if (!confirm(`Gerar uma senha nova para ${a.nome}?`)) return; try { const d = await Nuvem.acesso('painel_senha', { uid: a.uid }); S.pnNovo = { nome: a.nome, email: d.email || a.email, senha: d.senha }; pintaPainelUsers(); } catch (e) { toast('Erro: ' + (e.message || e), 7000); } });
  $$('[data-pndel]', box).forEach(b => b.onclick = async () => { const a = L.find(x => x.uid === b.dataset.pndel); if (!confirm(`Remover o acesso de ${a.nome} ao painel? Ele não consegue mais entrar.`)) return; try { await Nuvem.acesso('painel_remover', { uid: a.uid }); S.pnNovo = null; toast('Acesso removido.'); pintaPainelUsers(); } catch (e) { toast('Erro: ' + (e.message || e), 7000); } });
}
// ---------- portal do parceiro: acessos (Claro, Master e outros) ----------
const linkPortal = () => new URL('parceiro.html', location.href).href;
async function pintaParceiros() {
  const box = $('#parBox'); if (!box) return; let L = [];
  try { L = await Nuvem.parceirosLista(); } catch (e) { box.innerHTML = `<h2>Portal do parceiro</h2><div class="warnbox">Portal indisponível: rode o supabase.sql novo e crie a função "acesso" (veja SUPABASE.md).</div>`; return; }
  const nv = S.parNovo;
  box.innerHTML = `<h2>Portal do parceiro</h2><p class="muted small" style="margin:0">O parceiro entra com e-mail e senha em <a href="${esc(linkPortal())}" target="_blank" rel="noopener">${esc(linkPortal())}</a> e vê só as O.S. do cliente dele (BI, mapa, fotos e busca por ticket, node, endereço, cidade e cluster). Não existe acesso sem login.</p>
    ${nv ? `<div class="okbox">Acesso criado para <b>${esc(nv.nome)}</b>. E-mail: <b>${esc(nv.email)}</b> · senha provisória: <b style="font-size:18px;letter-spacing:1px">${esc(nv.senha)}</b><br><span class="small">Envie por um canal seguro. Se o parceiro esquecer, gere uma senha nova aqui.</span></div>` : ''}
    <div class="list">${L.map(p => `<div class="item" style="cursor:default;flex-wrap:wrap;gap:8px;${p.ativo === false ? 'opacity:.55' : ''}"><span class="tx" style="flex:1 1 220px"><b>${esc(p.nome)} · ${esc(p.cliente)}</b><span>${esc(p.email || '')}${p.mostrar_tecnico ? ' · vê o nome do técnico' : ''}${p.ativo === false ? ' · desativado' : ''}</span></span><span class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn" data-parsen="${esc(p.uid)}" style="min-height:40px">Nova senha</button><button type="button" class="btn" data-parat="${esc(p.uid)}" style="min-height:40px">${p.ativo === false ? 'Reativar' : 'Desativar'}</button></span></div>`).join('') || '<p class="muted small" style="margin:0">Nenhum parceiro cadastrado.</p>'}</div>
    <h3>Novo acesso</h3><div class="grid3"><div class="field"><label class="lb" for="prNome">Nome (empresa / área)</label><input type="text" id="prNome" placeholder="Ex.: Claro · NOC Vale"></div><div class="field"><label class="lb" for="prEmail">E-mail de login</label><input type="email" id="prEmail"></div>
      <div class="field"><label class="lb" for="prCli">Cliente das O.S.</label><input type="text" id="prCli" list="prClis" placeholder="Claro, Master…"><datalist id="prClis"><option value="Claro"><option value="Master"></datalist></div></div>
    <label class="row" style="gap:8px;align-items:center"><input type="checkbox" id="prTec" style="width:22px;height:22px"> Mostrar o primeiro nome do técnico</label>
    <button type="button" class="btn pri" id="bParCriar">${ICON.plus}Criar acesso do parceiro</button>`;
  $('#bParCriar').onclick = async () => { const nome = $('#prNome').value.trim(), email = $('#prEmail').value.trim(), cliente = $('#prCli').value.trim(); if (!nome || !email || !cliente) { toast('Informe nome, e-mail e cliente.'); return; }
    try { const d = await Nuvem.acesso('criar_parceiro', { nome, email, cliente, mostrar_tecnico: $('#prTec').checked }); S.parNovo = { nome, email, senha: d.senha }; toast('Acesso criado.'); pintaParceiros(); } catch (e) { toast('Erro: ' + (e.message || e), 7000); } };
  $$('[data-parsen]', box).forEach(b => b.onclick = async () => { const p = L.find(x => x.uid === b.dataset.parsen); if (!confirm(`Gerar uma senha nova para ${p.nome}?`)) return; try { const d = await Nuvem.acesso('parceiro_senha', { uid: p.uid }); S.parNovo = { nome: p.nome, email: p.email, senha: d.senha }; pintaParceiros(); } catch (e) { toast('Erro: ' + (e.message || e), 7000); } });
  $$('[data-parat]', box).forEach(b => b.onclick = async () => { const p = L.find(x => x.uid === b.dataset.parat); try { await Nuvem.parceiroAtivo(p.uid, p.ativo === false); toast(p.ativo === false ? 'Parceiro reativado.' : 'Parceiro desativado: ele não entra mais no portal.'); pintaParceiros(); } catch (e) { toast('Erro: ' + (e.message || e), 7000); } });
}
async function afterAdmEquipe() {
  pintaParceiros(); pintaPainelUsers();
  const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); }; const F = S.cadForm;
  if (!S.cads) { try { S.cads = await Nuvem.cadLista(); } catch (e) { S.cads = []; toast('Cadastros indisponíveis: rode de novo o supabase.sql. (' + e.message + ')', 7000); } re(); return; }
  $('#cdEq').addEventListener('change', e => { F.equipe = e.target.value; });
  [['cdNome', 'nome'], ['cdMat', 'matricula'], ['cdTel', 'telefone'], ['cdVei', 'veiculo']].forEach(([id, k]) => $('#' + id).addEventListener('input', e => { F[k] = e.target.value; }));
  $('#cdCargo').onchange = e => { F.cargo = e.target.value; F.funcao = cargoBase(F.cargo); re(); };
  $$('[data-eqf]').forEach(b => b.onclick = () => { S.eqFilt = b.dataset.eqf; re(); });
  $$('[data-copiar]').forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copiar); toast('Link copiado.'); } catch (e) { toast(b.dataset.copiar, 8000); } });
  $('#bCadCriar').onclick = async () => {
    const nome = String(F.nome || '').trim(); if (nome.length < 3) { toast('Informe o nome completo.'); $('#cdNome').focus(); return; }
    const b = $('#bCadCriar'); b.disabled = true;
    try { const c = await Nuvem.cadCriar({ id: codigoConvite(), nome, matricula: String(F.matricula || '').trim() || null, funcao: cargoBase(F.cargo), cargo: F.cargo, equipe: String(F.equipe || '').trim() || null, veiculo: String(F.veiculo || '').trim().toUpperCase() || null, telefone: String(F.telefone || '').trim() || null, criado_por: (Nuvem.admin && Nuvem.admin.nome) || '' });
      S.cads.push(c); S.cadNovo = c; S.cadForm = { funcao: F.funcao, cargo: F.cargo }; toast(`${c.nome} cadastrado. Envie o convite.`, 4000); re(); }
    catch (e) { b.disabled = false; toast('Não salvou: ' + e.message, 7000); }
  };
  const linhas = equipeLinhas().filter(x => (S.eqFilt || 'todos') === 'todos' || x.funcao === S.eqFilt);
  $$('[data-eqfun]').forEach(sel => sel.onchange = async () => { const x = linhas[+sel.dataset.eqfun]; const cg = sel.value, f = cargoBase(cg);
    try { if (x.cad) { const c = await Nuvem.cadSalvar(x.cad.id, { funcao: f, cargo: cg }); Object.assign(x.cad, c); }
      else { const c = await Nuvem.cadCriar({ id: codigoConvite(), uid: x.uid, nome: x.nome, matricula: x.matricula || null, funcao: f, cargo: cg, equipe: x.equipe || null, criado_por: (Nuvem.admin && Nuvem.admin.nome) || '', resgatado_em: new Date().toISOString() }); S.cads.push(c); }
      const t = (S.adm.tecnicos || []).find(t => t.uid === x.uid); if (t) { t.funcao = f; t.cargo = cg; } toast(`${x.nome}: ${CARGO_LB[cg]}.`); re(); } catch (e) { toast('Erro: ' + e.message, 6000); re(); } });
  $$('[data-eqsenha]').forEach(b => b.onclick = async () => { const x = linhas[+b.dataset.eqsenha]; if (!confirm(`Gerar uma senha nova para ${x.nome}? A senha atual deixa de funcionar.`)) return;
    try { const d = await Nuvem.acesso('senha_temp', { cad_id: x.cad.id }); const txt = `Olá ${x.nome.split(' ')[0]}! Sua nova senha do app Técnico Plus - Multivale: ${d.senha}\nLogin: ${x.matricula || d.login}\nDepois de entrar, guarde a senha.`; const tel = String(x.cad.telefone || '').replace(/\D/g, '');
      const box = $('#eqDet'); if (box) { box.innerHTML = `<section class="card" style="box-shadow:none;border:1px solid var(--line)"><h2>Senha nova · ${esc(x.nome)}</h2><div class="okbox">Login: <b>${esc(x.matricula || d.login)}</b> · Senha: <b style="font-size:20px;letter-spacing:2px">${esc(d.senha)}</b></div><a class="btn wa" href="https://wa.me/${tel ? (tel.length <= 11 ? '55' + tel : tel) : ''}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${ICON.wa}Enviar pelo WhatsApp</a></section>`; box.scrollIntoView({ block: 'start' }); } }
    catch (e) { toast('Erro: ' + (e.message || e), 7000); } });
  $$('[data-eqdet]').forEach(b => b.onclick = () => { S.eqDetSel = linhas[+b.dataset.eqdet]; pintaEqDet(); setTimeout(() => { const d = $('#eqDet'); d && d.scrollIntoView({ block: 'start' }); }, 60); });
  if (S.eqDetSel) pintaEqDet();
  $$('[data-eqdel]').forEach(b => b.onclick = async () => { const x = linhas[+b.dataset.eqdel]; if (!x) return;
    if (!confirmaExcluir(`Excluir ${x.nome}${x.matricula ? ' (matrícula ' + x.matricula + ')' : ''}? O cadastro, a ficha, o RH e o login dele são apagados. As O.S. e fichas que ele já executou ficam no histórico; as O.S. que estavam com ele voltam para a fila.`)) return;
    b.disabled = true; try { const rr = await Nuvem.acesso('remover_tecnico', { cad_id: x.cad ? x.cad.id : '', uid: x.uid || '' }); if (rr && rr.soPerfil) toast('Era um perfil de técnico gravado com um login do painel: o perfil foi apagado e o acesso ao painel continua.', 7000); S.cads = (S.cads || []).filter(c => !x.cad || c.id !== x.cad.id); if (x.uid) S.adm.tecnicos = (S.adm.tecnicos || []).filter(t => t.uid !== x.uid); toast(`${x.nome} excluído.`, 5000); render(); } catch (e) { b.disabled = false; toast('Não foi possível excluir: ' + (e.message || e), 7000); } });
  $$('[data-eqat]').forEach(b => b.onclick = async () => { const x = linhas[+b.dataset.eqat]; try { const c = await Nuvem.cadSalvar(x.cad.id, { ativo: x.cad.ativo === false }); Object.assign(x.cad, c); re(); } catch (e) { toast('Erro: ' + e.message, 6000); } });
}

async function pintaEqDet() {
  const box = $('#eqDet'); const x = S.eqDetSel; if (!box || !x) return;
  setTimeout(async () => { const bx = $('#eqDet'); if (!bx || S.eqDetSel !== x || !x.uid || $('#eqEstoque')) return; try { const D = await matCarrega(); const linhas = []; Object.keys(CONTAS).forEach(c => { const mp = saldosMat(D.mov, c).tec.get(x.uid); if (mp) mp.forEach((q, k) => { if (Math.abs(q) > 1e-9) linhas.push({ c, m: matInfo(D.cat, k, D.mov), q }); }); });
      bx.insertAdjacentHTML('beforeend', `<section class="card" id="eqEstoque" style="box-shadow:none;border:1px solid var(--line)"><div class="row" style="justify-content:space-between"><h2>${esc(x.nome)} · estoque de material</h2><button type="button" class="btn" id="eqMatMov" style="min-height:38px">Liberar / transferir material</button></div>${linhas.length ? `<div class="tw"><table class="t"><thead><tr><th>Estoque</th><th>Material</th><th style="text-align:right">Saldo</th><th>Un.</th></tr></thead><tbody>${linhas.map(l => `<tr><td>${esc(contaLb(l.c))}</td><td>${esc(l.m.descricao)}</td><td style="text-align:right;font-weight:700;color:${l.q < 0 ? 'var(--bad)' : 'inherit'}">${fQ(l.q)}</td><td>${esc(l.m.unidade || '')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small" style="margin:0">Sem material com o técnico.</p>'}</section>`);
      $('#eqMatMov').onclick = () => { S.matAba = 'mov'; S.matF = { tipo: 'saida', conta: 'claro', tec: x.uid, doc: '', obs: '', linhas: [{ mat: '', q: '' }] }; go('admMat'); }; } catch (e) {} }, 0);
  setTimeout(async () => { const bx = $('#eqDet'); if (!bx || S.eqDetSel !== x || !x.uid || $('#eqEquip')) return; try { const D = await eqpCarrega(); if (S.eqDetSel !== x || $('#eqEquip')) return; const L = D.eq.filter(e => e.status === 'tecnico' && e.tecnico_uid === x.uid);
      bx.insertAdjacentHTML('beforeend', `<section class="card" id="eqEquip" style="box-shadow:none;border:1px solid var(--line)"><div class="row" style="justify-content:space-between"><h2>${esc(x.nome)} · equipamentos</h2><button type="button" class="btn" id="eqEqpAbre" style="min-height:38px">Entregar / recolher equipamento</button></div>${L.length ? `<div class="tw"><table class="t"><thead><tr><th>Equipamento</th><th>Patrimônio</th><th>Nº de série</th><th>Desde</th><th>Recebimento</th></tr></thead><tbody>${L.map(e => { const r = eqpUltRec(D.mov, e); return `<tr><td>${esc(e.descricao)}</td><td>${esc(e.patrimonio || '—')}</td><td>${esc(e.serie || '—')}</td><td>${e.desde ? fData(e.desde) : '—'}</td><td>${r && r.aceite_ts ? 'confirmado' : '<span style="color:#b26a00">pendente</span>'}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted small" style="margin:0">Nenhum equipamento com este técnico.</p>'}</section>`);
      $('#eqEqpAbre').onclick = () => { S.matAba = 'eqp'; S.eqpF = { q: x.nome, st: 'ativos' }; S.eqpSel = L.length === 1 ? L[0].id : null; go('admMat'); }; } catch (e) {} }, 0); const c = x.cad || {}; const [de, ate] = S.eqPer || cicloDe();
  const jor = +(c.jornada_min) || JORNADA_PADRAO_MIN;
  box.innerHTML = `<section class="card" style="box-shadow:none;border:1px solid var(--line)"><div class="row" style="justify-content:space-between"><h2>${esc(x.nome)} · horas e salário</h2><button type="button" class="lnk" id="eqDetX">Fechar</button></div>
    <div class="grid3"><div class="field"><label class="lb" for="rhSal">Salário base (R$)</label><input type="text" inputmode="decimal" id="rhSal" value="${c.salario != null ? String(c.salario).replace('.', ',') : ''}"></div><div class="field"><label class="lb" for="rhVr">Vale-refeição por dia (R$)</label><input type="text" inputmode="decimal" id="rhVr" value="${c.vr_dia != null ? String(c.vr_dia).replace('.', ',') : ''}"></div><div class="field"><label class="lb" for="rhJor">Jornada por dia útil (h:mm)</label><input type="text" id="rhJor" value="${Math.floor(jor / 60)}:${pad2(jor % 60)}"></div><div class="field"><label class="lb" for="rhLoc">Locação do veículo por mês (R$)</label><input type="text" inputmode="decimal" id="rhLoc" value="${c.locacao_mes != null ? String(c.locacao_mes).replace('.', ',') : ''}" placeholder="0 se o veículo é próprio"></div>
      <div class="field"><label class="lb" for="rhPer">Periculosidade</label><select id="rhPer">${[0, 30].map(v => `<option value="${v}" ${(+c.peric_pct || 0) === v ? 'selected' : ''}>${v ? v + '% do salário base' : 'Não recebe'}</option>`).join('')}</select></div>
      <div class="field"><label class="lb" for="rhNot">Adicional noturno (%)</label><input type="text" inputmode="decimal" id="rhNot" value="${c.noturno_pct != null ? String(c.noturno_pct).replace('.', ',') : '20'}"></div>
      <div class="field"><label class="lb" for="rhOut">Outros adicionais fixos por mês (R$)</label><input type="text" inputmode="decimal" id="rhOut" value="${c.outros_mes != null ? String(c.outros_mes).replace('.', ',') : ''}" placeholder="Gratificação, cargo, ajuda de custo…"></div>
      <div class="field"><label class="lb" for="rhCc">Centro de custo (cluster da folha)</label><select id="rhCc">${cluOpts(c.centro_custo || '', 'Automático (cluster da ficha)')}</select></div>
      <label style="display:flex;flex-direction:row;gap:10px;align-items:center;cursor:pointer;align-self:end;min-height:48px"><input type="checkbox" id="rhDsr" ${c.dsr === false ? '' : 'checked'} style="width:22px;height:22px"> Calcular DSR sobre extras e noturno</label></div>
    <button type="button" class="btn pri" id="rhSalvar">${ICON.check}Salvar dados</button>
    <div class="chips" role="group" aria-label="Período">${ciclosAtalhos(false).map(([l, d, a]) => `<button type="button" data-eqper="${d}|${a}" aria-checked="${de === d && ate === a}">${l}</button>`).join('')}</div><div id="rhHoras"><p class="empty">Carregando os expedientes…</p></div></section>`;
  $('#eqDetX').onclick = () => { S.eqDetSel = null; box.innerHTML = ''; };
  $$('[data-eqper]').forEach(b => b.onclick = () => { S.eqPer = b.dataset.eqper.split('|'); pintaEqDet(); });
  $('#rhSalvar').onclick = async () => { const sal = kmNum($('#rhSal').value), vr = kmNum($('#rhVr').value); const m = String($('#rhJor').value).match(/^(\d{1,2})(?::(\d{2}))?$/); const jm = m ? +m[1] * 60 + (+m[2] || 0) : null;
    const patch = { salario: sal ?? null, vr_dia: vr ?? null, jornada_min: jm || null, locacao_mes: kmNum($('#rhLoc').value) ?? null, peric_pct: +$('#rhPer').value || 0, noturno_pct: kmNum($('#rhNot').value) ?? 20, outros_mes: kmNum($('#rhOut').value) ?? null, dsr: $('#rhDsr').checked };
    try { if (!x.cad) { const nc = await Nuvem.cadCriar({ id: codigoConvite(), uid: x.uid, nome: x.nome, matricula: x.matricula || null, funcao: x.funcao || 'tecnico', criado_por: (Nuvem.admin && Nuvem.admin.nome) || '', resgatado_em: new Date().toISOString() }); S.cads.push(nc); x.cad = nc; } await Nuvem.rhSalvar(x.cad.id, patch); Object.assign(x.cad, patch); const cc = $('#rhCc').value || null; if ((x.cad.centro_custo || null) !== cc) { try { const n = await Nuvem.cadSalvar(x.cad.id, { centro_custo: cc }); Object.assign(x.cad, n || {}, { centro_custo: cc }); } catch (e) { toast('Centro de custo: rode o supabase.sql novo.', 6000); } } toast('Dados salvos (visíveis só no painel).'); pintaEqDet(); } catch (e) { toast('Erro: ' + e.message, 6000); } };
  let exps = []; if (x.uid) { try { exps = (await Nuvem.expAdmin(diaIni(de), diaFim(ate))).filter(e => e.uid === x.uid); } catch (e) {} }
  const X = horasExtras(exps, x.cad, de, ate); const hb = $('#rhHoras'); if (!hb) return;
  hb.innerHTML = (x.uid ? horasHtml(X) : '<p class="muted">Ainda sem celular vinculado (convite pendente).</p>') + `<div class="row"><button type="button" class="btn" id="rhPdf" ${x.uid ? '' : 'disabled'}>${ICON.pdf}Extrato de horas extras (PDF)</button></div>`;
  $('#rhPdf').onclick = async () => { const f = await pdfHorasExtras(x.nome, x.matricula, X, de, ate); if (f) baixar(f); };
}
/* ---------- mapa de calor (supervisor) ---------- */
// fibra ou coaxial: pelo campo REDE do acionamento; sem ele, pelos textos e itens da LPU da O.S.
function redeDe(x) {
  const r = String(x.rede || '').toUpperCase(); if (r) return /COAX|HFC/.test(r) && !/OPTIC|ÓPTIC|FIBRA|GPON|FTTH/.test(r) ? 'coaxial' : 'fibra';
  const t = [x.ocorrencia, x.atividadeClaro, x.descricao, x.corr && x.corr.ocorrencia, x.corr && x.corr.servico, x.corr && x.corr.problema, ...(x.lpu || []).map(l => l.d)].filter(Boolean).join(' ').toUpperCase();
  return /COAXIA|\bHFC\b|\bADE\b|AMPLIFICADOR|TAP\b/.test(t) && !/ÓPTIC|OPTIC|FIBRA|FUS[ÃA]O/.test(t) ? 'coaxial' : 'fibra';
}
const REDE_COR = { fibra: '#1f6fb2', coaxial: '#d9480f' };
const CALOR_TIPO = i => i.tipo === 'corretiva' || i.tipo === 'emergencial' ? 'corretiva' : i.tipo === 'implantacao' ? 'implantacao' : i.tipo === 'vistoria' ? 'vistoria' : 'preventiva';
function calorDados() {
  const C = S.calor || (S.calor = { modo: 'ambas', tipo: 'todas', rede: 'todas' }); C.rede = C.rede || 'todas'; const ok = (t, x) => (C.tipo === 'todas' || C.tipo === t) && (C.rede === 'todas' || redeDe(x) === C.rede);
  const exec = [...DB.mem.inspecoes.values()].filter(i => !isVist(i) && !i.apoio && i.loc && i.loc.lat != null && ok(CALOR_TIPO(i), i)).map(i => ({ id: i.id, kind: 'exec', rede: redeDe(i), st: i.status === 'concluida' ? 'executada' : 'em_campo', lat: i.loc.lat, lon: i.loc.lon, t: CALOR_TIPO(i), w: CALOR_TIPO(i) === 'corretiva' ? 1 : 0.5, ref: osRef(i), end: [i.info.endereco, i.info.bairro, i.info.cidade].filter(Boolean).join(', '), ts: i.chegada || i.criado, tec: i.info.tecnico || i._tecnico || '' }));
  const abertas = [...(S.atvsAdm || new Map()).values()].filter(a => atvAberta(a) && ok(CALOR_TIPO(a), a));
  const pend = abertas.filter(a => a.lat != null).map(a => ({ id: a.id, kind: 'pend', rede: redeDe(a), lat: a.lat, lon: a.lon, t: CALOR_TIPO(a), w: 1, ref: a.ticket || '', end: a.endereco || '', ts: a.criado, tec: a.tecnicoNome || '', st: a.status, log: a.log }));
  const semLoc = [...DB.mem.inspecoes.values()].filter(i => !isVist(i) && !i.apoio && !(i.loc && i.loc.lat != null)).length + abertas.filter(a => a.lat == null).length;
  return { C, exec, pend, semLoc };
}
function calorPontos(exec, pend) {
  const m = new Map(); const add = (p, k) => { const key = Math.round(p.lat / 0.005) + ':' + Math.round(p.lon / 0.005); const o = m.get(key) || { lat: 0, lon: 0, n: 0, e: 0, p: 0, ends: {}, ult: 0, refs: [] }; o.lat += p.lat; o.lon += p.lon; o.n++; o[k]++; if (p.end) o.ends[p.end] = (o.ends[p.end] || 0) + 1; o.ult = Math.max(o.ult, p.ts || 0); if (p.ref && o.refs.length < 4) o.refs.push(p.ref); m.set(key, o); };
  exec.forEach(p => add(p, 'e')); pend.forEach(p => add(p, 'p'));
  return [...m.values()].map(o => ({ ...o, lat: o.lat / o.n, lon: o.lon / o.n, end: Object.entries(o.ends).sort((a, b) => b[1] - a[1]).map(x => x[0])[0] || '' })).sort((a, b) => (b.e + b.p) - (a.e + a.p)).slice(0, 12);
}
function viewAdmCalor() {
  const { C, exec, pend, semLoc } = calorDados(); const top = calorPontos(C.modo === 'pend' ? [] : exec, C.modo === 'exec' ? [] : pend);
  return `<section class="card"><div class="row" style="justify-content:space-between;align-items:flex-start"><div class="seg" role="group" aria-label="Mostrar"><button type="button" data-cm="exec" aria-pressed="${C.modo === 'exec'}">Executadas</button><button type="button" data-cm="pend" aria-pressed="${C.modo === 'pend'}">Atuais e pendentes</button><button type="button" data-cm="ambas" aria-pressed="${C.modo === 'ambas'}">Ambas</button></div>
      <div class="chips" role="group" aria-label="Período das executadas">${[[7, '7 dias'], [30, '30 dias'], [90, '90 dias'], [180, '6 meses']].map(([n, l]) => `<button type="button" data-cper="${n}" aria-checked="${S.adm.ate === isoDate(Date.now()) && S.adm.de === isoDate(Date.now() - (n - 1) * 86400000)}">${l}</button>`).join('')}</div></div>
    <div class="row" style="gap:8px 18px"><div class="chips" role="group" aria-label="Tipo">${[['todas', 'Todas'], ['corretiva', 'Corretivas'], ['preventiva', 'Preventivas'], ['implantacao', 'Implantação']].map(([k, l]) => `<button type="button" data-ct="${k}" aria-checked="${C.tipo === k}">${l}</button>`).join('')}</div>
    <div class="chips" role="group" aria-label="Rede">${[['todas', 'Fibra e coaxial'], ['fibra', 'Só fibra'], ['coaxial', 'Só coaxial']].map(([k, l]) => `<button type="button" data-cr="${k}" aria-checked="${C.rede === k}">${l}</button>`).join('')}</div></div>
    <div class="stats"><div class="stat"><b>${exec.length}</b><span>Executadas no período</span></div><div class="stat"><b>${pend.length}</b><span>Atuais e pendentes</span></div><div class="stat"><b>${top.length ? top[0].e + top[0].p : 0}</b><span>No ponto mais quente</span></div><div class="stat"><b>${semLoc}</b><span>Sem localização (fora do mapa)</span></div></div></section>
  <section class="card" style="padding:0;overflow:hidden"><div class="map" id="mapCalor" style="height:520px;border:0;border-radius:0" role="img" aria-label="Mapa de calor das atividades"></div>
    <div class="glg" style="padding:10px 14px">${C.modo !== 'pend' ? '<span><i style="background:linear-gradient(90deg,#2b83ba,#abdda4,#fdae61,#d7191c);width:40px"></i>Calor das executadas</span>' : ''}<span><i style="background:${REDE_COR.fibra};border-radius:50%"></i>Fibra</span><span><i style="background:${REDE_COR.coaxial};border-radius:50%"></i>Coaxial</span><span><i style="background:#fff;border:3px solid #c2311d;border-radius:50%"></i>Com atividade aberta</span><span class="muted">Toque no pino para ver os eventos do local</span></div></section>
  <section class="card" id="calorLista"><h2>Eventos do local</h2><p class="muted small" style="margin:0">Toque num pino do mapa (ou numa linha da tabela abaixo) para listar as O.S. daquele ponto.</p></section>
  <section class="card"><h2>Pontos com mais ocorrências</h2><p class="muted small" style="margin:0">Áreas de cerca de 500 m. Corretivas pesam mais no calor que preventivas.</p>
    <div class="tw"><table class="t"><thead><tr><th>Local</th><th class="r">Executadas</th><th class="r">Atuais/pendentes</th><th>Últimas O.S.</th><th>Última</th></tr></thead><tbody>
    ${top.map((o, k) => `<tr data-cz="${k}" style="cursor:pointer"><td><b>${esc(o.end || `${o.lat.toFixed(4)}, ${o.lon.toFixed(4)}`)}</b></td><td class="r">${o.e}</td><td class="r">${o.p ? `<b style="color:var(--bad)">${o.p}</b>` : 0}</td><td class="small">${esc(o.refs.join(', '))}</td><td>${o.ult ? fDH(o.ult) : '—'}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Sem atividades com localização.</td></tr>'}</tbody></table></div></section>`;
}
function afterAdmCalor() {
  const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); }; const { C, exec, pend } = calorDados(); const A = S.adm;
  $$('[data-cm]').forEach(b => b.onclick = () => { C.modo = b.dataset.cm; re(); });
  $$('[data-ct]').forEach(b => b.onclick = () => { C.tipo = b.dataset.ct; re(); });
  $$('[data-cr]').forEach(b => b.onclick = () => { C.rede = b.dataset.cr; re(); });
  $$('[data-cper]').forEach(b => b.onclick = async () => { const n = +b.dataset.cper; A.ate = isoDate(Date.now()); A.de = isoDate(Date.now() - (n - 1) * 86400000); b.textContent = 'Carregando…'; try { await admCarregar(); } catch (e) { toast('Erro ao carregar: ' + e.message, 6000); } re(); });
  if (!window.L) return;
  const map = S.mapCalor = L.map('mapCalor'); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  const pts = [];
  if (C.modo !== 'pend' && exec.length && L.heatLayer) { L.heatLayer(exec.map(p => [p.lat, p.lon, p.w]), { radius: 26, blur: 20, maxZoom: 9, max: 2, minOpacity: 0.35, gradient: { 0.25: '#2b83ba', 0.5: '#abdda4', 0.75: '#fdae61', 1: '#d7191c' } }).addTo(map); exec.forEach(p => pts.push([p.lat, p.lon])); }
  if (C.modo === 'pend' && pend.length > 2 && L.heatLayer) L.heatLayer(pend.map(p => [p.lat, p.lon, 1]), { radius: 30, blur: 22, maxZoom: 9, max: 2, minOpacity: 0.3, gradient: { 0.3: '#f3b6c6', 0.7: '#d63384', 1: '#7a003c' } }).addTo(map);
  // pinos: um por local (cerca de 50 m), na cor da rede; contorno vermelho quando há atividade aberta
  const grupos = new Map(); [...(C.modo === 'pend' ? [] : exec), ...(C.modo === 'exec' ? [] : pend)].forEach(p => { const k = Math.round(p.lat / 0.0005) + ':' + Math.round(p.lon / 0.0005); const g = grupos.get(k) || { k, lat: 0, lon: 0, l: [] }; g.lat += p.lat; g.lon += p.lon; g.l.push(p); grupos.set(k, g); });
  S.calorGrupos = new Map();
  grupos.forEach(g => { g.lat /= g.l.length; g.lon /= g.l.length; S.calorGrupos.set(g.k, g); pts.push([g.lat, g.lon]);
    const nf = g.l.filter(p => p.rede === 'fibra').length, nc = g.l.length - nf; const cor = nc > nf ? REDE_COR.coaxial : REDE_COR.fibra; const aberta = g.l.some(p => p.kind === 'pend'); const n = g.l.length; const sz = n > 9 ? 34 : n > 1 ? 30 : 24;
    const bg = nf && nc ? `conic-gradient(${REDE_COR.fibra} 0 ${nf / n * 360}deg, ${REDE_COR.coaxial} 0)` : cor;
    const mk = L.marker([g.lat, g.lon], { icon: L.divIcon({ className: '', html: `<div class="pin-ev" style="width:${sz}px;height:${sz}px;background:${bg};border:${aberta ? '3px solid #c2311d' : '2px solid #fff'}">${n > 1 ? n : ''}</div>`, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }), title: `${n} evento(s) · ${nf} fibra · ${nc} coaxial`, riseOnHover: true }).addTo(map);
    mk.on('click', () => listaLocal(g.k)); });
  function listaLocal(k) {
    const g = S.calorGrupos.get(k); const box = $('#calorLista'); if (!g || !box) return;
    const ins = id => DB.mem.inspecoes.get(id); const atv = id => (S.atvsAdm || new Map()).get(id);
    const l = g.l.slice().sort((a, b) => (b.kind === 'pend') - (a.kind === 'pend') || b.ts - a.ts);
    const nf = l.filter(p => p.rede === 'fibra').length;
    box.innerHTML = `<div class="row" style="justify-content:space-between"><h2>${esc(l.map(p => p.end).find(Boolean) || `${g.lat.toFixed(5)}, ${g.lon.toFixed(5)}`)}</h2><span class="muted small">${l.length} evento(s) · ${nf} fibra · ${l.length - nf} coaxial · <a href="https://maps.google.com/?q=${g.lat},${g.lon}" target="_blank" rel="noopener">abrir no Google Maps</a></span></div>
      <div class="list">${l.map(p => { const i = p.kind === 'exec' ? ins(p.id) : null; const a = p.kind === 'pend' ? atv(p.id) : null;
        const tipo = i ? tipoLb(i) : a ? (atvEmerg(a) ? 'Corretiva' : atvImpl(a) ? 'Implantação' : atvConj(a) ? 'Conjunta de site' : atvVist(a) ? 'Vistoria' : 'Preventiva') : '';
        const st = p.kind === 'pend' ? `<span class="pill bad">${esc(ATV_ST[p.st] || p.st)}</span>` : `<span class="pill ok">${p.st === 'executada' ? 'Executada' : 'Em campo'}</span>`;
        const val = i ? valorOS(i) : 0;
        return `<div class="item" style="cursor:default;align-items:center;flex-wrap:wrap"><span class="badge" style="background:${REDE_COR[p.rede]};color:#fff;width:auto;padding:0 8px;border-radius:6px">${p.rede === 'fibra' ? 'Fibra' : 'Coaxial'}</span>
          <span class="tx" style="min-width:200px"><b>${esc(p.ref || '—')} · ${esc(tipo)}${i && i.corr && i.corr.ocorrencia ? ' · ' + esc(i.corr.ocorrencia) : a && a.ocorrencia ? ' · ' + esc(a.ocorrencia) : ''}</b><span>${fDH(p.ts)} · ${esc(p.tec || 'sem técnico')}${val ? ' · ' + fBRL(val) : ''}${a && a.log >= 2 ? ' · LOG ' + a.log : ''}</span></span>
          ${st}<button type="button" class="btn" data-calab="${p.kind}:${p.id}" style="min-height:40px">Abrir O.S.</button></div>`; }).join('')}</div>`;
    $$('[data-calab]', box).forEach(b => b.onclick = async () => { const [kind, id] = b.dataset.calab.split(':');
      if (kind === 'exec') { const i = ins(id); if (!i) return; S.evView = i; S.evVolta = 'admCalor'; S.calorSel = k; go('evento'); }
      else { S.voltaPara = 'admCalor'; S.calorSel = k; abrirAtvAdm(id); } });
    box.scrollIntoView({ block: 'nearest' });
  }
  if (S.calorSel && S.calorGrupos.has(S.calorSel)) setTimeout(() => listaLocal(S.calorSel), 50);
  if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 }); else if (pts.length) map.setView(pts[0], 14); else map.setView([-23.2, -45.9], 9);
  const top = calorPontos(C.modo === 'pend' ? [] : exec, C.modo === 'exec' ? [] : pend);
  $$('[data-cz]').forEach(tr => tr.onclick = () => { const o = top[+tr.dataset.cz]; map.setView([o.lat, o.lon], 17); let best = null, bd = 1e9; S.calorGrupos.forEach(g => { const d = Math.abs(g.lat - o.lat) + Math.abs(g.lon - o.lon); if (d < bd) { bd = d; best = g.k; } }); if (best) listaLocal(best); $('#mapCalor').scrollIntoView({ block: 'center' }); });
}
/* ---------- link de acionamentos Claro (acionamento.html) ---------- */
async function acionCarregar() {
  const org = Nuvem.org(); const hoje0 = diaIni(isoDate(Date.now()));
  const tecs = await Nuvem.todos(() => Nuvem.tab('tecnicos').select('uid, dados').eq('org', org));
  S.adm.tecnicos = tecs.map(t => ({ uid: t.uid, nome: (t.dados || {}).nome || '(sem nome)', matricula: (t.dados || {}).matricula || '', funcao: (t.dados || {}).funcao || 'tecnico' })).filter(t => t.funcao !== 'fiscal').sort((x, y) => x.nome.localeCompare(y.nome));
  try { S.atvsAdm = await Nuvem.atvAdmin(hoje0 - 86400000); } catch (e) { console.warn(e); S.atvsAdm = new Map(); }
  try { S.plantoesAdm = await Nuvem.plantoesAdmin(Date.now() - 86400000, Date.now() + 86400000); } catch (e) { S.plantoesAdm = []; }
  try { await carregaRotas(); } catch (e) {}
}
function acionLista() {
  const hoje0 = diaIni(isoDate(Date.now()));
  return [...(S.atvsAdm || new Map()).values()].filter(a => a.cliente && (atvAberta(a) || (a.criado || 0) >= hoje0)).sort((x, y) => (atvAberta(y) - atvAberta(x)) || ((!x.tecnicoUid) - (!y.tecnicoUid)) * -1 || y.criado - x.criado);
}
function viewAcion() {
  const a = S.acA; const L = acionLista(); const back = L.filter(x => atvAberta(x) && !x.tecnicoUid);
  const dup = a && a._novo && a.ticket ? [...(S.atvsAdm || new Map()).values()].find(x => x.id !== a.id && atvAberta(x) && String(x.ticket || '').toUpperCase() === a.ticket) : null;
  const kv = (k, v) => v ? `<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>` : '';
  const linha = x => `<div class="item" style="cursor:default;align-items:center;flex-wrap:wrap"><span class="badge" style="background:${!x.tecnicoUid && atvAberta(x) ? 'var(--bad-soft)' : 'var(--accent-soft)'};color:${!x.tecnicoUid && atvAberta(x) ? 'var(--bad)' : 'var(--accent)'};width:auto;padding:0 8px;border-radius:6px">${fHora(x.criado)}</span><span class="tx" style="min-width:180px"><b>${esc(x.ticket || '—')}${x.ocorrencia ? ' · ' + esc(x.ocorrencia) : ''}</b><span>${x.tecnicoNome ? esc(x.tecnicoNome) : '<b style="color:var(--bad)">Backlog (sem técnico)</b>'} · ${esc(ATV_ST[x.status] || x.status)}${x.endereco ? ' · ' + esc(x.endereco) : ''}</span></span>${logTag(x.log)}${atvAberta(x) && x.status !== 'em_deslocamento' && x.status !== 'no_local' ? `<button type="button" class="btn ${x.tecnicoUid ? '' : 'pri'}" data-acenc="${x.id}" style="min-height:40px;margin-left:auto">${x.tecnicoUid ? 'Trocar técnico' : 'Enviar ao técnico'}</button>` : ''}</div>`;
  return `<section class="card"><h2>Ler acionamento</h2><p class="muted small" style="margin:0">Cole o texto completo do acionamento da Claro (ACIONAMENTO, MOTIVO, NODE, ENDEREÇO, ORIUNDO DO EVENTO…) ou do chamado de parceiro, como o da TIM (Chamado, Falha, Trecho, Ponta A/B, Designação…).</p>
    <div class="field"><label class="lb" for="acTxt">Texto do acionamento</label><textarea id="acTxt" rows="9" placeholder="ACIONAMENTO&#10;DATA: 09/10/2026&#10;REDE: HFC COAXIAL&#10;…" style="font-family:ui-monospace,monospace;font-size:14px">${esc(S.acTxt || '')}</textarea></div>
    <div class="row"><button type="button" class="btn pri" id="acLer">Ler acionamento</button>${a || S.acTxt ? '<button type="button" class="btn" id="acLimpar">Limpar</button>' : ''}</div></section>
  ${a ? `<section class="card" id="acRes"><div class="row" style="justify-content:space-between"><h2>${a._novo ? (a.cliente && a.cliente !== 'Claro' ? 'Chamado ' + esc(a.cliente) + ' reconhecido' : 'Acionamento Claro reconhecido') : 'Encaminhar ' + esc(a.ticket || '')}</h2><span class="pill ${a.programada ? 'done' : 'bad'}">${a.programada ? 'Programada' : 'Emergencial'}</span></div>
    ${dup ? `<div class="warnbox small"><b>Já existe uma atividade aberta com o evento ${esc(a.ticket)}</b> (${esc(dup.tecnicoNome || 'backlog')} · ${esc(ATV_ST[dup.status] || dup.status)}). <button type="button" class="lnk" data-acenc="${dup.id}">Abrir a existente</button></div>` : ''}
    <div class="grid2"><div class="field"><label class="lb" for="acTicket">Evento (ticket)</label><input type="text" id="acTicket" value="${esc(a.ticket || '')}"></div><div class="field"><label class="lb" for="acOcorr">Motivo / ocorrência</label><input type="text" id="acOcorr" value="${esc(a.ocorrencia || '')}"></div>
    <div class="field full"><label class="lb" for="acEnd">Endereço</label><input type="text" id="acEnd" value="${esc(a.endereco || '')}"></div>
    <div class="field"><label class="lb" for="acWfc">WFC</label><input type="text" id="acWfc" value="${esc(a.wfc || '')}" placeholder="Opcional"></div><div class="field"><label class="lb" for="acWf2">WF2</label><input type="text" id="acWf2" value="${esc(a.wf2 || '')}" placeholder="Opcional"></div></div>
    <div class="field"><label class="lb" for="acCentro">Centro de custo / faturamento</label><select id="acCentro">${Object.entries(CENTROS).map(([k, l]) => `<option value="${k}" ${a.centro === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="list" style="gap:0">${kv('Cliente', a.cliente)}${kv('Chamado', a.tsk ? a.ticket + ' / ' + a.tsk : '')}${kv('Trecho', a.trecho)}${kv('Ponta A', a.pontaA)}${kv('Ponta B', a.pontaB)}${kv('Designação', a.designacao)}${kv('Equipamento', a.equipamento)}${kv('Node', a.node)}${kv('Rede', a.rede)}${kv('Atividade', a.atividadeClaro)}${kv('Solicitante', a.solicitante)}${kv('Contato', a.contato)}${kv(a.cliente === 'Claro' ? 'Data do acionamento' : 'Horário da falha', a.dataAcionamento)}</div>
    <p class="small" style="margin:0;color:${a.lat != null ? 'var(--ok)' : 'var(--bad)'}">${a.lat != null ? `📍 Endereço localizado no mapa (${a.lat.toFixed(5)}, ${a.lon.toFixed(5)}) · <a href="https://www.google.com/maps?q=${a.lat},${a.lon}" target="_blank" rel="noopener">conferir</a>` : 'Endereço não localizado: o técnico abre o endereço escrito no GPS.'} <button type="button" class="lnk" id="acGeo">Localizar de novo</button></p>
    ${anexosEditHtml(a)}
    ${a._novo ? `<div class="row" style="margin-top:6px"><button type="button" class="btn" id="acBack" style="flex:1 1 220px">Inserir no backlog (sem técnico)</button><button type="button" class="btn go" id="acTec" style="flex:1 1 220px">${ICON.play}Enviar direto ao técnico</button></div>` : ''}
    ${S.acPick ? `${tecPickerHtml(a)}<button type="button" class="btn go block" id="acEnviar" ${a.tecnicoUid ? '' : 'disabled'}>${a.tecnicoUid ? `Enviar para ${esc(a.tecnicoNome)}` : 'Escolha o técnico acima'}</button>${a._novo ? '' : '<button type="button" class="btn block" id="acCanc">Cancelar</button>'}` : ''}</section>` : ''}
  <section class="card"><div class="row" style="justify-content:space-between"><h2>Acionamentos de hoje</h2><span class="muted small">${back.length} no backlog · ${L.filter(x => atvAberta(x) && x.tecnicoUid).length} com técnico</span></div>
    <div class="list" id="acLista">${L.map(linha).join('') || '<p class="empty">Nenhum acionamento Claro hoje.</p>'}</div>
    <p class="muted small" style="margin:0">${esc((Nuvem.admin && Nuvem.admin.nome) || '')} · <a href="#" id="lnkSairA">sair</a></p></section>`;
}
function afterAcion() {
  const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  const a = S.acA;
  $('#acTxt').addEventListener('input', e => { S.acTxt = e.target.value; });
  const geo = async () => { if (!a || !a.endereco) return; const g = await geocodifica(a.endereco); aplicaGeo(a, g); if (g && g.naoAchou) { a.lat = null; a.lon = null; } };
  $('#acLer').onclick = async () => {
    const txt = $('#acTxt').value; S.acTxt = txt; const p = lerAcionamento(txt);
    if (!p.ok || (p.tipoTexto === 'claro' && !(p.campos.evento || p.campos.endereco))) { toast('Não reconheci o texto. Acionamento Claro precisa de ENDEREÇO e ORIUNDO DO EVENTO; chamado de parceiro precisa do número do chamado e do trecho.', 7000); return; }
    const b = $('#acLer'); b.disabled = true; b.textContent = 'Lendo e localizando…';
    S.acA = { _novo: true, id: 'atv-' + uid(), status: 'pendente', refSentido: '', refKm: '', refLocal: '', rotaId: '', mapsUrl: '', lat: null, lon: null, tecnicoUid: '', tecnicoNome: '', ...p.atividade, _txt: txt, tipo: 'emergencial' }; S.acPick = false;
    const aa = S.acA; if (aa.endereco) { b.textContent = 'Validando o endereço…'; aplicaGeo(aa, await geocodifica(aa.endereco)); }
    re(); setTimeout(() => { const r = $('#acRes'); r && r.scrollIntoView({ block: 'start' }); }, 80);
  };
  $('#acLimpar') && ($('#acLimpar').onclick = () => { S.acA = null; S.acTxt = ''; S.acPick = false; re(); });
  $('#lnkSairA').onclick = async e => { e.preventDefault(); await Nuvem.sairAdmin(); S.acA = null; go('admLogin'); };
  $$('[data-acenc]').forEach(b => b.onclick = () => { const x = S.atvsAdm.get(b.dataset.acenc); if (!x) return; S.acA = { ...x }; S.acPick = true; re(); setTimeout(() => { const r = $('#acRes'); r && r.scrollIntoView({ block: 'start' }); }, 80); });
  if (!a) return;
  bindAnexos(a, re);
  ['acTicket', 'acOcorr', 'acEnd', 'acWfc', 'acWf2'].forEach(id => { const el = $('#' + id); el && el.addEventListener('input', () => { if (id === 'acTicket') a.ticket = el.value.trim().toUpperCase(); else if (id === 'acOcorr') a.ocorrencia = el.value; else if (id === 'acWfc') a.wfc = el.value.trim().toUpperCase(); else if (id === 'acWf2') a.wf2 = el.value.trim().toUpperCase(); else a.endereco = el.value; }); });
  $('#acEnd') && $('#acEnd').addEventListener('change', async () => { await geo(); re(); });
  $('#acCentro') && ($('#acCentro').onchange = e => { a.centro = e.target.value; });
  $('#acGeo').onclick = async () => { await geo(); re(); toast(a.lat != null ? 'Endereço localizado.' : 'Endereço não encontrado no mapa.'); };
  $('#acCanc') && ($('#acCanc').onclick = () => { S.acA = null; S.acPick = false; re(); });
  const salvar = async (comTec, bt) => {
    if (bt) bt.disabled = true;
    try {
      if (!String(a.ticket || '').trim()) a.ticket = await proximoTicketOS(); a.ticket = String(a.ticket).trim().toUpperCase();
      if (!a.endereco && a.lat == null) { toast('Informe o endereço.'); if (bt) bt.disabled = false; return; }
      if (!comTec) { a.tecnicoUid = ''; a.tecnicoNome = ''; }
      const novo = a._novo; const ant = novo ? null : S.atvsAdm.get(a.id); delete a._novo;
      const quem = (Nuvem.admin && Nuvem.admin.nome) || '';
      if (novo) { a.criado = Date.now(); a.origem = 'supervisor'; a.status = 'pendente'; a.criadoPorNome = quem; a.cliente = a.cliente || 'Claro'; }
      else if (ant && ant.tecnicoUid !== a.tecnicoUid) { a.status = 'pendente'; a.recebidaEm = null; a.vistaEm = null; a.encaminhadoPor = quem; }
      const r = novo ? await Nuvem.atvCriar(a) : await Nuvem.atvSalvar(a);
      if (r) S.atvsAdm.set(r.id, r); Nuvem.avisaFuncao();
      toast(r && r.tecnicoNome ? `${r.ticket} enviado para ${r.tecnicoNome}: o celular dele vai tocar.${r.log >= 2 ? ' LOG ' + r.log + '.' : ''}` : `${(r || a).ticket} inserido no backlog.`, 6000);
      if (r && (r.log || 0) >= 4) toast(`${r.ticket} chegou ao LOG ${r.log} (reincidência na semana): avise o supervisor para escalonar ao gerente.`, 8000);
      S.acA = null; S.acTxt = ''; S.acPick = false; re();
    } catch (e) { toast('Não salvou: ' + e.message, 7000); if (bt) bt.disabled = false; a._novo = a._novo ?? !S.atvsAdm.has(a.id); }
  };
  $('#acBack') && ($('#acBack').onclick = e => salvar(false, e.currentTarget));
  $('#acTec') && ($('#acTec').onclick = () => { S.acPick = true; const sg = sugereTecnico(a); if (sg && !a.tecnicoUid) { a.tecnicoUid = sg.t.uid; a.tecnicoNome = sg.t.nome; } re(); setTimeout(() => { const pk = $('#tecPicker'); pk && pk.scrollIntoView({ block: 'center' }); }, 80); });
  $$('[data-pick]').forEach(b => b.onclick = () => { a.tecnicoUid = b.dataset.pick; const t = S.adm.tecnicos.find(x => x.uid === a.tecnicoUid); a.tecnicoNome = t ? t.nome : ''; re(); });
  $('#acEnviar') && ($('#acEnviar').onclick = e => salvar(true, e.currentTarget));
  if (!S.unAtvA) { S.unAtvA = Nuvem.ouvirAtv((tipo, x) => { if (!x || !x.id) return; if (tipo === 'DELETE') S.atvsAdm.delete(x.id); else S.atvsAdm.set(x.id, x); const l = $('#acLista'); if (l && S.view === 'acion' && !S.acA) re(); }); }
  if (!S.unVivo) { S.vivo = S.vivo || new Map(); S.unVivo = Nuvem.ouvirAoVivo((tipo, v) => { if (tipo === 'del') S.vivo.delete(v._uid); else if (tipo === 'set') S.vivo.set(v._uid, v); clearTimeout(S.acVivoT); S.acVivoT = setTimeout(() => { if (S.view === 'acion' && S.acPick && !document.activeElement.matches('input,textarea')) render(); }, 400); }, () => {}); }
}
/* ---------- medição (gestor): pipeline das O.S., validação, envio ao Telegram ---------- */
const ehAlmox = () => ((Nuvem.admin || {}).papel === 'almoxarife');
const admInicio = () => NOC ? 'noc' : ACION ? 'acion' : ehAlmox() ? 'admMat' : 'adm'; // painel e despacho é a tela principal de supervisor e gestor
function admPeriodoPapel() { if (Nuvem.admin && Nuvem.admin.papel === 'gestor') { const [c0, c1] = cicloDe(); S.adm.de = c0; S.adm.ate = c1; } }
const MED_ETAPAS = [['pendente', 'Pendentes', 'var(--muted)'], ['rota', 'Em rota', 'var(--st-trav, #0b5f99)'], ['finalizada', 'Finalizadas', 'var(--accent)'], ['validada', 'Validadas', '#d9a400'], ['enviada', 'Enviadas p/ medição', '#7a3fa0'], ['medida', 'Medidas', 'var(--ok)']];
const MED_LB = Object.fromEntries(MED_ETAPAS.map(([k, l]) => [k, l]));
function medPill(m) { if (!m) return ''; return m.status === 'medida' ? '<span class="pill ok">Medida</span>' : m.status === 'enviada' ? '<span class="pill" style="background:#efe4f6;color:#7a3fa0">Na medição</span>' : m.status === 'validada' ? '<span class="pill" style="background:#fbf1cf;color:#8a6a00">Validada</span>' : ''; }
const osRef = i => isCorr(i) ? (i.corr.ticket || '—') : isImpl(i) ? (i.impl.designacao || '—') : (i.info.tag || '—');
function medItens(i) { const VV = lpuValores(i); return (i.lpu || []).map((x, kk) => { const e = lpuEst(i, x); return { c: x.c, d: x.d, u: x.u, q: +x.q || 0, v: +x.v || 0, t: VV[kk].v, ...(VV[kk].k === 'contrato' ? { cont: true } : {}), ...(e ? { est: true } : {}) }; }); }
function medLinhas() {
  const meds = S.meds || new Map(); const out = []; const A = S.adm;
  [...DB.mem.inspecoes.values()].filter(i => !isVist(i) && !i.apoio && (!A.tec || i._uid === A.tec)).forEach(i => {
    const m = meds.get(i.id); const et = m ? m.status : i.status === 'concluida' ? 'finalizada' : 'rota';
    const md = (m && m.dados) || {}; const ed = (S.medEd || {})[i.id] || {};
    out.push({ proj: (m && m.projeto) || projetoDe(i), projAuto: !(m && m.projeto) && projAuto(i), wfc: ed.wfc ?? md.wfc ?? i.wfc ?? '', wf2: ed.wf2 ?? md.wf2 ?? i.wf2 ?? '', id: i.id, i, m, et, os: osRef(i), tipo: tipoLb(i), tec: i.info.tecnico || i._tecnico || '—', ts: i.chegada || i.criado, valor: m && (m.status === 'enviada' || m.status === 'medida') ? +m.valor || 0 : valorOS(i), nItens: (i.lpu || []).length, claro: claroCorr(i) });
  });
  return out.sort((a, b) => b.ts - a.ts);
}
function medAtvs() { const l = [...((S.atvsAdm || new Map()).values())].filter(a => !S.adm.tec || a.tecnicoUid === S.adm.tec); return { pend: l.filter(a => a.status === 'pendente' || a.status === 'recebida'), rota: l.filter(a => a.status === 'em_deslocamento' || a.status === 'no_local') }; }
/* ---------- O.S. com centro de custo a definir (corretiva aberta pelo técnico, sem atividade cadastrada) ---------- */
function centroPend() { const A = S.adm; return [...DB.mem.inspecoes.values()].filter(i => !isVist(i) && !i.apoio && !centroOS(i) && (!A.tec || i._uid === A.tec)).sort((a, b) => (b.chegada || b.criado) - (a.chegada || a.criado)); }
function centroPendHtml() {
  const L = centroPend(); if (!L.length) return '';
  return `<section class="card" id="cpBox" style="border:2px solid var(--orange)"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Centro de custo a definir</h2><span class="pill draft">${L.length} O.S.</span></div>
    <p class="muted small" style="margin:0">O.S. abertas pelo técnico sem atividade cadastrada ficam sem centro de custo / faturamento. Defina aqui: o valor da LPU e a medição seguem o centro escolhido.</p>
    <div class="tw"><table class="t"><thead><tr><th>Data</th><th>O.S.</th><th>Tipo</th><th>Técnico</th><th>Endereço</th><th class="r">Valor</th><th>Centro de custo</th></tr></thead><tbody>
    ${L.slice(0, 60).map(i => `<tr><td>${fDH(i.chegada || i.criado)}</td><td><b>${esc(osRef(i))}</b></td><td>${esc(tipoLb(i))}${claroCorr(i) ? ' · Claro' : ''}</td><td>${esc(i.info.tecnico || i._tecnico || '—')}</td><td class="small">${esc([i.info.endereco, i.info.cidade].filter(Boolean).join(', ') || '—')}</td><td class="r">${fBRL(valorOS(i))}</td><td><span class="row" style="flex-wrap:nowrap;gap:6px"><select data-cpsel="${esc(i.id)}" aria-label="Centro de custo da O.S. ${esc(osRef(i))}"><option value="">Escolha…</option>${Object.entries(CENTROS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><button type="button" class="btn pri" data-cpok="${esc(i.id)}" style="min-height:40px">Salvar</button></span></td></tr>`).join('')}</tbody></table></div>
    ${L.length > 60 ? `<p class="muted small" style="margin:0">Mostrando as 60 mais recentes de ${L.length}.</p>` : ''}</section>`;
}
function bindCentroPend() {
  $$('[data-cpok]').forEach(b => b.onclick = async () => { const id = b.dataset.cpok; const c = ($(`[data-cpsel="${CSS.escape(id)}"]`) || {}).value; if (!c) { toast('Escolha o centro de custo.'); return; }
    b.disabled = true; try { const d = await Nuvem.evCentro(id, c); const i = DB.mem.inspecoes.get(id); if (i) Object.assign(i, { centro: c, centroPor: d.centroPor, centroEm: d.centroEm }); toast(`O.S. ${i ? osRef(i) : ''}: ${CENTROS[c]}.`); const y = window.scrollY; render(); window.scrollTo(0, y); } catch (e) { b.disabled = false; toast('Erro: ' + (e.message || e), 6000); } });
}
function viewAdmMed() {
  const A = S.adm; const L = medLinhas(); const at = medAtvs(); const f = S.medFiltro || 'finalizada'; const tg = (S.cfg || {}).telegram; const tecs = A.tecnicos || [];
  const cont = k => k === 'pendente' ? { n: at.pend.length, v: null } : k === 'rota' ? { n: at.rota.length + L.filter(r => r.et === 'rota').length, v: L.filter(r => r.et === 'rota').reduce((a, r) => a + r.valor, 0) } : { n: L.filter(r => r.et === k).length, v: L.filter(r => r.et === k).reduce((a, r) => a + r.valor, 0) };
  const PJ = projAtivos(); const fp = S.medProj || ''; const lista0 = L.filter(r => r.et === f); const lista = lista0.filter(r => !fp || (fp === '__sem' ? !r.proj : r.proj === fp)); const sel = S.medSel || (S.medSel = new Set()); [...sel].forEach(id => { if (!lista.some(r => r.id === id)) sel.delete(id); });
  const selV = lista.filter(r => sel.has(r.id)).reduce((a, r) => a + r.valor, 0);
  const acoes = { finalizada: `<button type="button" class="btn pri" id="mValidar" ${sel.size ? '' : 'disabled'}>${ICON.check}Validar e enviar ao Telegram</button>`, validada: `<button type="button" class="btn pri" id="mEnviar" ${sel.size ? '' : 'disabled'}>Enviar para medição (Telegram)</button><button type="button" class="btn" id="mDesvalidar" ${sel.size ? '' : 'disabled'}>Voltar para finalizada</button>`, enviada: `<button type="button" class="btn" id="mReenviar" ${sel.size ? '' : 'disabled'}>Reenviar ao Telegram</button><button type="button" class="btn" id="mMedida" ${sel.size ? '' : 'disabled'}>Marcar como medida</button>`, medida: '', rota: '' }[f] || '';
  const filaAtv = l => l.length ? `<div class="tw"><table class="t"><thead><tr><th>Criada</th><th>Ticket</th><th>Tipo</th><th>Técnico</th><th>Situação</th></tr></thead><tbody>${l.map(a => `<tr><td>${fDH(a.criado)}</td><td>${esc(a.ticket || '—')} ${logTag(a.log)}</td><td>${esc(a.cliente === 'Claro' ? 'Corretiva Claro' : atvEmerg(a) ? 'Emergencial' : atvImpl(a) ? 'Implantação' : atvConj(a) ? 'Conjunta de site' : atvVist(a) ? 'Vistoria' : 'Preventiva')}</td><td>${esc(a.tecnicoNome || '—')}</td><td>${esc(stAtv(a))}</td></tr>`).join('')}</tbody></table></div>` : '';
  return `<section class="card"><div class="row" style="justify-content:space-between"><h2>Período</h2><span class="muted small">${esc(Nuvem.admin.nome || '')} · ${Nuvem.admin.papel === 'gestor' ? 'gestor' : 'supervisor'} · <a href="#" id="lnkSairM">sair</a></span></div>
    <div class="chips" role="group" aria-label="Período">${ciclosAtalhos(true).map(([l, d, a]) => `<button type="button" data-mper="${d}|${a}" aria-checked="${A.de === d && A.ate === a}">${l}</button>`).join('')}</div>
    <div class="grid3"><div class="field"><label class="lb" for="mDe">De</label><input type="date" id="mDe" value="${A.de}"></div><div class="field"><label class="lb" for="mAte">Até</label><input type="date" id="mAte" value="${A.ate}"></div>
    <div class="field"><label class="lb" for="mTec">Técnico</label><select id="mTec"><option value="">Todos os técnicos</option>${tecs.map(t => `<option value="${t.uid}" ${A.tec === t.uid ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div></div>
    <div class="row"><button type="button" class="btn pri" id="mAplica">Atualizar</button><button type="button" class="btn" id="mBi">Produção (BI)</button><button type="button" class="btn" id="mPainel">Painel do supervisor</button></div>
    ${S.medErro ? `<div class="warnbox small">Não consegui ler as medições (${esc(S.medErro)}). Rode de novo o supabase.sql no Supabase.</div>` : ''}</section>
  ${centroPendHtml()}
  <section class="card"><h2>Situação das O.S.</h2><div class="pipe" role="group" aria-label="Etapas">${MED_ETAPAS.map(([k, l, c]) => { const x = cont(k); return `<button type="button" class="pst" data-met="${k}" aria-pressed="${f === k}" style="--c:${c}"><span>${l}</span><b>${x.n}</b><small>${x.v != null ? fBRL(x.v) : 'sem valor ainda'}</small></button>`; }).join('')}</div>
    <p class="muted small" style="margin:0">Finalizada → <b>validar</b> (já envia para a medição: abre um tópico no Telegram por O.S.) → a equipe de medição toca em <b>✅ O.S MEDIDA</b> e a O.S. vira <b>medida</b> aqui.</p></section>
  <section class="card"><div class="row" style="justify-content:space-between"><h2>${esc(MED_LB[f])}</h2>${PJ.length && f !== 'pendente' ? `</div><div class="chips" role="group" aria-label="Projeto" style="flex-wrap:wrap"><button type="button" data-mproj="" aria-pressed="${!fp}">Todos os projetos (${lista0.length})</button>${PJ.map(p => `<button type="button" data-mproj="${esc(p.id)}" aria-pressed="${fp === p.id}">${esc(p.nome)} (${lista0.filter(r => r.proj === p.id).length})</button>`).join('')}${lista0.some(r => !r.proj) ? `<button type="button" data-mproj="__sem" aria-pressed="${fp === '__sem'}" style="color:var(--bad)">Sem projeto (${lista0.filter(r => !r.proj).length})</button>` : ''}</div><div class="row" style="justify-content:flex-end">` : ''}${['finalizada', 'validada', 'enviada', 'medida'].includes(f) && lista.length ? `<span class="muted small" id="mSelInfo">${sel.size} selecionada(s) · ${fBRL(selV)}</span>` : ''}</div>
    ${f === 'pendente' ? (filaAtv(at.pend) || '<p class="empty">Nenhuma atividade pendente.</p>') : ''}
    ${f === 'rota' ? (filaAtv(at.rota) || '') + (lista.length ? '<h3>Fichas abertas em campo</h3>' : '') : ''}
    ${f !== 'pendente' && (lista.length || f !== 'rota') ? `<div class="tw"><table class="t" id="mTab"><thead><tr>${f === 'rota' ? '' : `<th style="width:44px"><input type="checkbox" id="mTodas" aria-label="Selecionar todas" ${lista.length && lista.every(r => sel.has(r.id)) ? 'checked' : ''}></th>`}<th>Data</th><th>O.S.</th><th>Tipo</th>${PJ.length ? '<th>Projeto</th>' : ''}<th>Técnico</th><th>WFC</th><th>WF2</th><th class="r">Itens</th><th class="r">Valor</th><th>${f === 'medida' ? 'Medida por' : f === 'enviada' ? 'Lote' : 'Situação'}</th></tr></thead><tbody>
      ${lista.map(r => `<tr><td ${f === 'rota' ? 'hidden' : ''}><input type="checkbox" data-msel="${r.id}" aria-label="Selecionar ${esc(r.os)}" ${sel.has(r.id) ? 'checked' : ''}></td><td>${fDH(r.ts)}</td><td><a href="#" data-mos="${r.id}">${esc(r.os)}</a>${(r.i.fotos || []).some(x => x.path || x.blob) ? ` <button type="button" class="lnk small" data-mfz="${r.id}" title="Baixar as fotos desta O.S. (.zip)">fotos</button>` : ''} <button type="button" class="lnk small" data-mdel="${r.id}" title="Excluir esta O.S. executada" style="color:var(--bad)">excluir</button></td><td>${esc(r.tipo)}${r.claro ? ' <span class="pill" title="Só serviço entra no valor">Claro</span>' : ''}</td>${PJ.length ? `<td>${medTravada(r.m) ? `<b>${esc(projNome(r.proj) || (r.m.dados && r.m.dados.projetoNome) || '—')}</b>` : `<select data-mpj="${r.id}" aria-label="Projeto da O.S. ${esc(r.os)}" style="min-height:36px;max-width:180px;${r.proj ? '' : 'border-color:var(--bad)'}">${projOpts(r.proj, 'Sem projeto')}</select>${r.proj && r.projAuto ? ' <span class="muted small" title="Sugerido pelo cliente/contrato; fica gravado ao validar">auto</span>' : ''}`}</td>` : ''}<td>${esc(r.tec)}</td>${['wfc', 'wf2'].map(k => `<td>${f === 'medida' ? esc(r[k] || '—') : `<input type="text" data-mwf="${k}" data-mid="${r.id}" value="${esc(r[k] || '')}" aria-label="${k.toUpperCase()} da O.S. ${esc(r.os)}" style="min-height:36px;width:120px;padding:4px 8px;font-size:14px">`}</td>`).join('')}<td class="r">${r.nItens || '<span style="color:var(--bad)">0</span>'}</td><td class="r"><b>${fBRL(r.valor)}</b></td><td>${f === 'medida' ? `${esc(r.m.medido_por || '')} · ${r.m.medido_em ? fDH(+r.m.medido_em) : ''}` : f === 'enviada' ? `${esc(r.m.lote || '')} · ${r.m.enviado_em ? fDH(+r.m.enviado_em) : ''}` : f === 'validada' ? `${esc(r.m.validado_por || '')}` : r.i.status === 'concluida' ? 'Concluída' : 'Em campo'}</td></tr>`).join('') || `<tr><td colspan="11" class="muted">Nenhuma O.S. nesta etapa no período.</td></tr>`}</tbody></table></div>` : ''}
    <div class="row">${acoes}${['finalizada', 'validada', 'enviada', 'medida'].includes(f) ? `<button type="button" class="btn" id="mCsv" ${lista.length ? '' : 'disabled'}>Planilha${sel.size ? ' das selecionadas' : ' da etapa'} (Excel)</button><button type="button" class="btn" id="mPdfs" ${lista.length ? '' : 'disabled'}>${ICON.pdf}Relatórios PDF${sel.size ? ' das selecionadas' : ' da etapa'} (.zip)</button><button type="button" class="btn" id="mFotosZip" ${lista.length ? '' : 'disabled'}>Fotos por O.S.${sel.size ? ' (selecionadas)' : ''} (.zip)</button>` : ''}</div><div class="muted small" id="mLoteProg"></div>
    <div id="mMsg"></div></section>
  <section class="card"><h2>Telegram da medição</h2>${tg && tg.chatId ? `<div class="okbox small">Grupo vinculado: <b>${esc(tg.titulo || String(tg.chatId))}</b>${tg.forum ? ' · com tópicos (uma O.S. por tópico)' : ' · <b>sem tópicos</b>: ative “Tópicos” nas configurações do grupo'}</div>` : '<div class="warnbox small">Nenhum grupo vinculado ainda. Toque em <b>Conectar Telegram</b> e depois envie <b>/vincular</b> no grupo da medição.</div>'}
    <div class="row"><button type="button" class="btn" id="mConectar">Conectar Telegram</button></div><div id="mTgMsg"></div></section>
  <section class="card"><h2>Arquivo</h2><p class="muted small" style="margin:0">Todo dia, de madrugada, as O.S. medidas vão para o arquivo (tabela <b>os_medidas</b>, uma linha por O.S.). Os acionamentos ficam completos por <b>6 meses</b>; depois são compactados por mês e ficam aqui para exportar.</p>
    <div class="row"><button type="button" class="btn" id="mOsmExp">O.S. medidas arquivadas do ciclo (Excel)</button></div>
    <div id="mHist"><p class="muted small">Carregando…</p></div></section>
  ${fotosArqHtml()}`;
}
function medCsv(rs, nome) {
  const n = v => (+v || 0).toFixed(2).replace('.', ','); const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = [['Data', 'O.S', 'Projeto', 'WFC', 'WF2', 'Faturamento', 'Tipo', 'Técnico', 'Endereço', 'Ocorrência / serviço', 'Situação', 'Lote', 'Medida por', 'Valor da O.S', 'Itens LPU (código x quantidade)', 'Material de estoque (código x quantidade)'].join(';'),
    ...rs.map(r => { const it = medItens(r.i); const inf = r.i.info || {}; return [fDH(r.ts), q(r.os), q(projNome(r.proj) || ''), q(r.wfc), q(r.wf2), q(CENTROS[centroOS(r.i)] || ''), q(r.tipo + (r.claro ? ' Claro' : '')), q(r.tec), q([inf.endereco, inf.bairro, inf.cidade].filter(Boolean).join(', ')), q((r.i.corr && r.i.corr.ocorrencia) || (r.i.impl && (IMPL_SERV[r.i.impl.servico] || r.i.impl.servico)) || ''), MED_LB[r.et] || r.et, q(r.m && r.m.lote || ''), q(r.m && r.m.medido_por || ''), n(r.valor), q(it.filter(x => !x.est).map(x => `${x.c} x ${fQtd(x.q)}`).join('; ')), q(it.filter(x => x.est).map(x => `${x.c} x ${fQtd(x.q)}`).join('; '))].join(';'); }),
    ['', '', '', '', '', '', '', '', '', '', '', '', 'TOTAL', n(rs.reduce((a, r) => a + r.valor, 0)), '', ''].join(';')];
  baixar(new File(['﻿' + linhas.join('\r\n')], nome, { type: 'text/csv' }));
}
function afterAdmMed() {
  bindFotosArq();
  bindCentroPend();
  const A = S.adm; const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); }; const sel = S.medSel || (S.medSel = new Set());
  const aplica = async () => { const b = $('#mAplica'); if (b) { b.disabled = true; b.textContent = 'Carregando…'; } try { await admCarregar(); } catch (e) { toast('Erro ao carregar: ' + e.message, 6000); } re(); };
  $$('[data-mper]').forEach(b => b.onclick = () => { const [d, a] = b.dataset.mper.split('|'); A.de = d; A.ate = a; aplica(); });
  $('#mAplica').onclick = () => { A.de = $('#mDe').value || A.de; A.ate = $('#mAte').value || A.ate; A.tec = $('#mTec').value; aplica(); };
  $('#mBi').onclick = () => { S.medVolta = true; go('admBi'); }; $('#mPainel').onclick = () => go('adm');
  $('#lnkSairM').onclick = async e => { e.preventDefault(); await Nuvem.sairAdmin(); go('admLogin'); };
  $$('[data-met]').forEach(b => b.onclick = () => { S.medFiltro = b.dataset.met; sel.clear(); re(); });
  $$('[data-mproj]').forEach(b => b.onclick = () => { S.medProj = b.dataset.mproj; sel.clear(); re(); });
  $$('[data-mpj]').forEach(el => el.onchange = async () => { const id = el.dataset.mpj, pid = el.value; const m = S.meds.get(id); if (medTravada(m)) { toast('Esta O.S. já foi enviada para medição: o projeto não muda mais.'); re(); return; }
    try { const d = await Nuvem.evProjeto(id, pid); const i = DB.mem.inspecoes.get(id); if (i) Object.assign(i, { projeto: d.projeto, projetoNome: d.projetoNome, centro: d.centro }); if (m && !m._arq) { const row = await Nuvem.medGravar({ id, projeto: pid || null, dados: { ...(m.dados || {}), projetoNome: d.projetoNome } }); S.meds.set(id, { ...m, ...(row || {}), projeto: pid || null }); } toast(pid ? `Projeto: ${projNome(pid)}.` : 'Projeto removido.', 2500); re(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } });
  $$('[data-msel]').forEach(c => c.onchange = () => { c.checked ? sel.add(c.dataset.msel) : sel.delete(c.dataset.msel); re(); });
  $('#mTodas') && ($('#mTodas').onchange = e => { const f = S.medFiltro || 'finalizada'; medLinhas().filter(r => r.et === f).forEach(r => e.target.checked ? sel.add(r.id) : sel.delete(r.id)); re(); });
  $$('[data-mos]').forEach(a => a.onclick = async e => { e.preventDefault(); const i = DB.mem.inspecoes.get(a.dataset.mos); const r = i && i.rondaId && DB.mem.rondas.get(i.rondaId); if (r) { S.medVolta = true; S.rondaView = r; await cacheInspRonda(r); go('ronda'); } else toast('Abra pelo painel do supervisor: a atividade desta O.S. não está no período.'); });
  const escolhidas = () => medLinhas().filter(r => sel.has(r.id));
  const quem = () => Nuvem.admin.nome || (Nuvem.user && Nuvem.user.email) || 'gestor';
  const grava = async (rs, fn, ok) => { let n = 0; for (const r of rs) { try { const row = await Nuvem.medGravar(fn(r)); S.meds.set(r.id, { ...(S.meds.get(r.id) || {}), ...(row || fn(r)) }); n++; } catch (e) { toast(`Erro na O.S. ${r.os}: ${e.message}`, 6000); } } sel.clear(); toast(ok(n), 4000); re(); };
  $('#mValidar') && ($('#mValidar').onclick = async () => { const rs = escolhidas(); const vaz = rs.filter(r => !r.nItens); if (vaz.length) { toast(`${vaz.length} O.S. sem itens da LPU: lance a produção antes de validar (${vaz.map(r => r.os).join(', ')}).`, 7000); return; }
    if (projAtivos().length) { const semP = rs.filter(r => !r.proj); if (semP.length) { toast(`${semP.length} O.S. sem projeto: escolha o projeto antes de validar (${semP.map(r => r.os).join(', ')}).`, 7000); return; }
      for (const r of rs.filter(r => r.projAuto)) { try { const d = await Nuvem.evProjeto(r.id, r.proj); const i = DB.mem.inspecoes.get(r.id); if (i) Object.assign(i, { projeto: d.projeto, projetoNome: d.projetoNome, centro: d.centro }); } catch (e) { toast(`Erro ao gravar o projeto da O.S. ${r.os}: ${e.message}`, 6000); return; } } }
    const ids = rs.map(r => r.id); await grava(rs, r => ({ id: r.id, uid: r.i._uid || null, status: 'validada', projeto: r.proj || null, valor: +r.valor.toFixed(2), itens: medItens(r.i), dados: { os: r.os, tipo: r.tipo, tecnico: r.tec, claro: r.claro, wfc: r.wfc || '', wf2: r.wf2 || '', projetoNome: projNome(r.proj) }, validado_em: Date.now(), validado_por: quem() }), n => `${n} O.S. validada(s). Enviando ao Telegram…`);
    // validar já envia para a medição (Telegram): passa para "Validadas" com as O.S. marcadas e dispara o envio
    const ok = ids.filter(id => (S.meds.get(id) || {}).status === 'validada'); if (!ok.length || !((S.cfg || {}).telegram || {}).chatId) return;
    S.medFiltro = 'validada'; ok.forEach(id => sel.add(id)); re(); const b = $('#mEnviar'); if (b) { b.dataset.conf = '1'; b.click(); } });
  $$('[data-mwf]').forEach(el => el.addEventListener('change', async () => {
    const id = el.dataset.mid, k = el.dataset.mwf, v = el.value.trim().toUpperCase(); el.value = v; S.medEd = S.medEd || {}; S.medEd[id] = { ...(S.medEd[id] || {}), [k]: v };
    const m = S.meds.get(id); if (!m || m._arq) { toast(`${k.toUpperCase()} anotado. Fica gravado ao validar a O.S.`, 3000); return; }
    try { const dados = { ...(m.dados || {}), [k]: v }; const row = await Nuvem.medGravar({ id, dados }); S.meds.set(id, { ...m, ...(row || {}), dados }); toast(`${k.toUpperCase()} salvo.`, 2000); } catch (e) { toast('Erro: ' + e.message, 6000); }
  }));
  $('#mDesvalidar') && ($('#mDesvalidar').onclick = async () => { for (const r of escolhidas()) { try { await Nuvem.medApagar(r.id); S.meds.delete(r.id); } catch (e) { toast('Erro: ' + e.message, 6000); } } sel.clear(); re(); });
  $('#mMedida') && ($('#mMedida').onclick = () => grava(escolhidas(), r => ({ id: r.id, status: 'medida', medido_em: Date.now(), medido_por: quem() + ' (painel)' }), n => `${n} O.S. marcada(s) como medida.`));
  const enviar = async b => {
    const rs = escolhidas(); if (!rs.length) return; const tot = rs.reduce((a, r) => a + r.valor, 0);
    if (!b.dataset.conf) { b.dataset.conf = '1'; b.textContent = `Confirmar envio de ${rs.length} O.S. · ${fBRL(tot)}`; b.classList.add('go'); setTimeout(() => { if (b.isConnected && b.dataset.conf) { delete b.dataset.conf; re(); } }, 8000); return; }
    b.disabled = true; b.textContent = 'Gerando os relatórios (PDF)…';
    const pdfs = {}; for (const [k, x] of rs.entries()) { try { b.textContent = `Gerando relatório ${k + 1} de ${rs.length}…`; const f = await gerarPdfInsp(x.i, true); if (f) { const path = `${Nuvem.org()}/relatorios/${x.id}-${Date.now()}.pdf`; const up = await Nuvem.sb.storage.from(Nuvem.BUCKET).upload(path, f, { contentType: 'application/pdf', upsert: true }); if (!up.error) pdfs[x.id] = path; } } catch (e) { console.warn('pdf', e); } }
    b.textContent = 'Enviando ao Telegram…';
    try {
      const grupos = new Map(); rs.forEach(x => { const k = x.proj || ''; grupos.set(k, [...(grupos.get(k) || []), x]); }); const r = { lote: '', enviados: [], erros: [] };
      for (const [k, g] of grupos) { b.textContent = `Enviando ao Telegram${grupos.size > 1 ? ` · ${projNome(k) || 'sem projeto'}` : ''}…`; const x = await Nuvem.telegram({ acao: 'enviar', ids: g.map(y => y.id), pdfs, projeto: projNome(k) }); r.lote = [r.lote, x.lote].filter(Boolean).join(', '); r.enviados.push(...(x.enviados || [])); r.erros.push(...(x.erros || [])); }
      S.meds = await Nuvem.medTodas(); sel.clear();
      const er = (r.erros || []).filter(e => e.id !== 'planilha'); const ep = (r.erros || []).find(e => e.id === 'planilha');
      re(); const box = $('#mMsg'); if (box) box.innerHTML = `<div class="${er.length ? 'warnbox' : 'okbox'} small">Lote <b>${esc(r.lote || '')}</b>: ${(r.enviados || []).length} O.S. enviada(s) ao Telegram${er.length ? ` · ${er.length} com erro: ${esc(er.map(e => (rs.find(x => x.id === e.id) || {}).os + ' (' + e.erro + ')').join('; '))}` : ''}${ep ? ` · a planilha não foi enviada (${esc(ep.erro)})` : ''}.</div>`;
    } catch (e) { b.disabled = false; delete b.dataset.conf; b.textContent = 'Enviar para medição (Telegram)'; toast('Não enviou: ' + e.message, 8000); }
  };
  $('#mEnviar') && ($('#mEnviar').onclick = e => enviar(e.currentTarget)); $('#mReenviar') && ($('#mReenviar').onclick = e => enviar(e.currentTarget));
  const loteRs = () => { const f = S.medFiltro || 'finalizada'; return sel.size ? escolhidas() : medLinhas().filter(r => r.et === f); };
  $('#mPdfs') && ($('#mPdfs').onclick = () => pdfsEmLote(loteRs().map(r => r.i), `Relatorios_${S.medFiltro || 'finalizada'}_${A.de}_a_${A.ate}`));
  $('#mFotosZip') && ($('#mFotosZip').onclick = () => fotosPorOS(loteRs().map(r => r.i), `Fotos_por_OS_${A.de}_a_${A.ate}`));
  $$('[data-mfz]').forEach(b => b.onclick = () => { const r = medLinhas().find(x => x.id === b.dataset.mfz); if (r) fotosPorOS([r.i], `Fotos_${osRef(r.i)}`); });
  $$('[data-mdel]').forEach(b => b.onclick = async () => { const r = medLinhas().find(x => x.id === b.dataset.mdel); if (!r) return;
    if (!confirmaExcluir(`Excluir a O.S. executada ${r.os} (${r.tipo} · ${r.tec})? Apaga a ficha, as fotos, o relatório e a medição dela${r.m && r.m.status === 'medida' ? '. ATENÇÃO: ela já foi MEDIDA' : ''}.`)) return;
    try { await Nuvem.evApagar(r.i); toast(`O.S. ${r.os} excluída.`); const y = window.scrollY; render(); window.scrollTo(0, y); } catch (e) { toast('Erro ao excluir: ' + (e.message || e), 7000); } });
  $('#mCsv') && ($('#mCsv').onclick = () => { const f = S.medFiltro || 'finalizada', fp = S.medProj || ''; const rs = sel.size ? escolhidas() : medLinhas().filter(r => r.et === f && (!fp || (fp === '__sem' ? !r.proj : r.proj === fp))); medCsv(rs, `Medicao_${fp && fp !== '__sem' ? nomeArq(projNome(fp)).replace(/\.pdf$/, '') + '_' : ''}${f}_${A.de}_a_${A.ate}.csv`); });
  $('#mConectar').onclick = async () => { const b = $('#mConectar'); b.disabled = true; b.textContent = 'Conectando…'; const box = $('#mTgMsg');
    try { const r = await Nuvem.telegram({ acao: 'conectar' }); box.innerHTML = `<div class="okbox small">Bot <b>@${esc(r.bot || '')}</b> conectado. ${r.grupo ? `Grupo vinculado: <b>${esc(r.grupo)}</b>.` : 'Agora adicione o bot ao grupo da medição como administrador (com permissão de gerenciar tópicos) e envie <b>/vincular</b> no grupo.'}</div>`; S.cfg = await Nuvem.cfgLer(); }
    catch (e) { box.innerHTML = `<div class="warnbox small">Não conectou: ${esc(e.message)}. Veja o passo “Telegram da medição” no SUPABASE.md.</div>`; }
    b.disabled = false; b.textContent = 'Conectar Telegram'; };
  const qv = v => `"${String(v ?? '').replace(/"/g, '""')}"`; const nv = v => (+v || 0).toFixed(2).replace('.', ',');
  $('#mOsmExp').onclick = async () => { const c = cicloDe(diaIni(A.de) + 43200000)[0]; try { const l = await Nuvem.osmCiclo(c); if (!l.length) { toast(`Nenhuma O.S. arquivada no ciclo que começa em ${fDM(c)}.`, 5000); return; }
    const csv = '﻿' + [['Data da O.S.', 'Ciclo', 'O.S.', 'WFC', 'WF2', 'Tipo', 'Cliente', 'Técnico', 'Valor', 'Itens LPU (código x quantidade)', 'Material de estoque (código x quantidade)', 'Lote', 'Enviada em', 'Medida em', 'Medida por'].join(';'), ...l.map(r => [r.data_os ? fDH(Date.parse(r.data_os)) : '', fDM(r.ciclo), qv(r.os), qv(r.wfc || ''), qv(r.wf2 || ''), qv(r.tipo), qv(r.cliente || ''), qv(r.tecnico), nv(r.valor), qv((r.itens || []).filter(x => !x.est).map(x => `${x.c} x ${fQtd(x.q)}`).join('; ')), qv((r.itens || []).filter(x => x.est).map(x => `${x.c} x ${fQtd(x.q)}`).join('; ')), qv(r.lote || ''), r.enviado_em ? fDH(+r.enviado_em) : '', r.medido_em ? fDH(+r.medido_em) : '', qv(r.medido_por || '')].join(';'))].join('\r\n');
    baixar(await zipArq(`OS_medidas_ciclo_${c}.zip`, [{ name: `OS_medidas_ciclo_${c}.csv`, data: csv }, { name: `OS_medidas_ciclo_${c}.json`, data: JSON.stringify(l) }])); } catch (e) { toast('Erro: ' + e.message, 6000); } };
  const pintaHist = async () => { const box = $('#mHist'); if (!box) return; let l; try { l = await Nuvem.histLista(); } catch (e) { box.innerHTML = `<p class="muted small">Arquivo indisponível (${esc(e.message)}). Rode de novo o supabase.sql.</p>`; return; }
    box.innerHTML = l.length ? `<div class="tw"><table class="t"><thead><tr><th>Mês dos acionamentos</th><th class="r">Acionamentos</th><th>Compactado em</th><th>Exportado</th><th></th></tr></thead><tbody>${l.map(h => `<tr><td>${h.mes.slice(5, 7)}/${h.mes.slice(0, 4)}</td><td class="r">${h.qtd}</td><td>${fDH(Date.parse(h.gerado_em))}</td><td>${h.exportado_em ? `${fDH(Date.parse(h.exportado_em))} · ${esc(h.exportado_por || '')}` : '<span class="pill bad">Não exportado</span>'}</td><td><button type="button" class="btn" data-hexp="${h.mes}" style="min-height:36px;padding:0 10px">Exportar (.zip)</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small" style="margin:0">Nenhum mês compactado ainda: os acionamentos dos últimos 6 meses estão completos no banco.</p>';
    $$('[data-hexp]', box).forEach(b => b.onclick = async () => { const mes = b.dataset.hexp; b.disabled = true; try { const rows = await Nuvem.histMes(mes);
      const csv = '﻿' + [['Criado', 'Ticket', 'Tipo', 'Cliente', 'Ocorrência', 'Endereço', 'Técnico', 'Situação', 'LOG', 'Escalonado', 'Iniciada', 'Concluída'].join(';'), ...rows.map(r => { const d = r.dados || {}; return [fDH(+r.criado), qv(r.ticket || ''), qv(r.tipo), qv(d.cliente || ''), qv(d.ocorrencia || ''), qv(r.endereco || ''), qv(r.tecnico_nome || ''), qv(ATV_ST[r.status] || r.status), r.log || '', r.escalonar ? 'sim' : '', d.iniciadaEm ? fDH(+d.iniciadaEm) : '', d.concluidaEm ? fDH(+d.concluidaEm) : ''].join(';'); })].join('\r\n');
      baixar(await zipArq(`Acionamentos_${mes.slice(0, 7)}.zip`, [{ name: `Acionamentos_${mes.slice(0, 7)}.csv`, data: csv }, { name: `Acionamentos_${mes.slice(0, 7)}.json`, data: JSON.stringify(rows) }]));
      await Nuvem.histMarcar(mes, Nuvem.admin.nome || 'painel'); pintaHist(); } catch (e) { b.disabled = false; toast('Erro: ' + e.message, 6000); } }); };
  pintaHist();
  if (!S.unMed) S.unMed = Nuvem.ouvirMed((tipo, row) => { if (!row || !row.id) return; if (tipo === 'DELETE') { const ex = S.meds.get(row.id); if (ex && ex.status === 'medida') ex._arq = true; else S.meds.delete(row.id); } else S.meds.set(row.id, row); if (S.view === 'admMed' && !document.querySelector('#mEnviar[data-conf],#mReenviar[data-conf]')) re(); });
}
async function admCarregar() {
  S.adm.carregando = true; const tec = S.adm.tec || '';
  const r = await Nuvem.carregarAdmin(S.adm.de, S.adm.ate, tec);
  if (ehAlmox()) { try { const L = await Nuvem.equipeNomes(); if (L.length) S.adm.tecnicos = L; } catch (e) { console.warn(e); } }
  S.abast = await Nuvem.abastAdmin(diaIni(S.adm.de), diaFim(S.adm.ate));
  try { S.cads = await Nuvem.cadLista(); } catch (e) { S.cads = S.cads || []; }
  try { S.projs = await Nuvem.projLista(); } catch (e) { S.projs = S.projs || []; }
  try { S.meds = await Nuvem.medTodas(); S.medErro = null; } catch (e) { console.warn(e); S.meds = S.meds || new Map(); S.medErro = e.message; }
  const t = S.adm.tecnicos.find(x => x.uid === tec);
  S.perfil = { id: 'perfil', nome: t ? t.nome : 'Todos os técnicos', matricula: t ? t.matricula : '—', equipe: t ? t.equipe : (Nuvem.admin.equipe || ''), limiteVel: S.adm.lim || '80', prefixo: 'CE-BKB' };
  S.adm.carregando = false; return r;
}
/* ---------- rotas do cabo: importar o KMZ do traçado (fica para todos os técnicos) ---------- */
function viewAdmRotas() {
  const L = S.rotas || [];
  return `<section class="card"><h2>Importar rota (KMZ)</h2><p class="muted small" style="margin:0">Envie o KMZ (ou KML) do traçado de cada rota. A rota vai para todos os técnicos e passa a valer na ronda preventiva, na referência de km das corretivas, na conjunta de site (alfinetes dos eventos do OTDR) e no mapa de fusão. Depois de importar, confira as pontas A e B e as siglas dos sites.</p>
    <input type="file" id="fileRotaB" accept=".kmz,.kml" hidden><button type="button" class="btn pri block" id="bAdmRotaB">${ICON.pin}Escolher o arquivo KMZ da rota</button></section>
  <section class="card"><h2>Rotas cadastradas (${L.length})</h2><div class="list" id="admRotasB">${L.map(rt => `<button class="item" data-rotab="${rt.id}"><span class="badge">${rt.cap ? esc(rt.cap) : '—'}</span><span class="tx"><b>${esc(rt.codigo)}${rt.nome ? ' · ' + esc(rt.nome) : ''}</b><span>${esc(rt.pontaA || '?')} (${esc(siglaSite(rt, 'A') || '—')}) > ${esc(rt.pontaB || '?')} (${esc(siglaSite(rt, 'B') || '—')})${rt.kml ? ` · traçado ${fKm(rt.kml.km)}` : ' · <b style="color:var(--bad)">sem traçado (KMZ)</b>'}</span></span><span class="muted small" style="white-space:nowrap">Abrir ›</span></button>`).join('') || '<p class="empty">Nenhuma rota ainda. Importe o primeiro KMZ acima.</p>'}</div></section>`;
}
function afterAdmRotas() {
  $('#bAdmRotaB').onclick = () => $('#fileRotaB').click();
  $('#fileRotaB').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) await importaRotaKmz(f); };
  $$('[data-rotab]').forEach(b => b.onclick = () => abrirRota(b.dataset.rotab));
}
function viewAdm() {
  const A = S.adm;
  return `<section class="card"><div class="row" style="justify-content:space-between"><h2>Filtros</h2><span class="muted small">${esc(Nuvem.admin.nome || Nuvem.user.email || '')} · <a href="#" id="lnkSair">sair</a></span></div>
    <div class="grid3"><div class="field"><label class="lb" for="admTec">Técnico</label><select id="admTec"><option value="">Todos os técnicos</option>${A.tecnicos.map(t => `<option value="${t.uid}" ${A.tec === t.uid ? 'selected' : ''}>${esc(t.nome)}${t.matricula ? ' · ' + esc(t.matricula) : ''}</option>`).join('')}</select></div>
    <div class="field"><label class="lb" for="admDe">De</label><input type="date" id="admDe" value="${A.de}"></div><div class="field"><label class="lb" for="admAte">Até</label><input type="date" id="admAte" value="${A.ate}"></div></div>
    <div class="chips" role="group" aria-label="Período rápido">${[[1, 'Hoje'], [7, '7 dias'], [10, '10 dias'], [15, '15 dias'], [20, '20 dias'], [30, '30 dias']].map(([n, lb]) => `<button type="button" data-aper="${n}">${lb}</button>`).join('')}</div>
    <div class="row"><div class="field" style="flex:0 0 160px"><label class="lb" for="admLim">Limite de velocidade</label><input type="text" inputmode="numeric" id="admLim" value="${esc(A.lim || '80')}"></div><button class="btn pri" id="bAdmAtual" style="align-self:flex-end">Atualizar</button></div></section>
  <section class="card cons"><div class="res"><div class="hd"><h2>Equipe</h2><span class="muted small" id="vivoAt">atualiza sozinho</span></div><div class="list" id="listaVivo"><p class="empty">Carregando…</p></div></div>
    <div class="vw"><div class="hd"><div class="seg" role="group" aria-label="Visualização"><button type="button" data-avis="tempo" aria-pressed="${(A.vis || 'tempo') === 'tempo'}">Linha do tempo</button><button type="button" data-avis="mapa" aria-pressed="${A.vis === 'mapa'}">Mapa ao vivo</button></div>
      <div class="dnav" id="gNav" ${A.vis === 'mapa' ? 'hidden' : ''}><button type="button" id="gPrev" aria-label="Dia anterior">${ICON.prev}</button><span id="gDia" style="min-width:118px;text-align:center"></span><button type="button" id="gNext" aria-label="Próximo dia">${ICON.next}</button></div></div>
      <div id="vTempo" ${A.vis === 'mapa' ? 'hidden' : ''}><div class="gantt" id="gantt"></div><div class="glg"><span><i style="background:var(--ok-soft);border:1px dashed var(--ok)"></i>Expediente</span><span><i style="background:#f6d77a"></i>Refeição</span><span><i style="background:var(--st-trav);height:5px"></i>Deslocamento / retorno</span><span><i style="background:var(--st-cabo);height:5px"></i>Rota do cabo</span><span><i style="background:var(--st-ini)"></i>Em atividade agora</span><span><i style="background:var(--st-done)"></i>Atividade concluída</span><span><i style="background:var(--st-nc)"></i>Com N/C</span><span><i style="background:var(--st-corr)"></i>Corretiva</span><span><i style="background:#0f8a83"></i>Implantação</span><span><i style="background:#7a3fa0"></i>Vistoria</span><span><i style="background:var(--st-nc);width:2px"></i>Agora</span></div></div>
      <div id="vMapa" ${A.vis === 'mapa' ? '' : 'hidden'}><div class="map" id="mapVivo" style="height:460px;border:0;border-radius:0" role="img" aria-label="Mapa dos técnicos em tempo real"></div>
      <div class="glg"><span><i style="background:#2f8a3a"></i>Disponível (sem atividade)</span><span><i style="background:#d9a400"></i>Em refeição</span><span><i style="background:#0b5f99"></i>Preventiva</span><span><i style="background:#d9480f"></i>Corretiva</span><span><i style="background:#8a8a8a"></i>Sem sinal há mais de 10 min</span></div></div></div></section>
  <section class="card"><div class="row" style="justify-content:space-between"><h2>Fila de atividades</h2><span class="row" style="gap:8px"><button type="button" class="btn" id="bColarAtv" style="min-height:44px;flex:0 0 auto">Colar acionamento Claro</button><button type="button" class="btn pri" id="bNovaAtv" style="min-height:44px;flex:0 0 auto">${ICON.plus}Nova atividade</button></span></div><div id="escAlerta" style="display:flex;flex-direction:column;gap:8px"></div><div id="fila"></div></section>
  <section class="card"><h2>Resumo do período</h2><div class="stats" id="admKpi"><p class="muted">Carregando…</p></div>
    <div class="row"><button class="btn wa" id="bAdmWa">${ICON.wa}Enviar relatório</button><button class="btn" id="bAdmPdf">${ICON.pdf}Relatório do período (PDF)</button><button class="btn" id="bAdmKmz">${ICON.pin}KMZ do período</button><button class="btn pri" id="bAdmBi">Produção (BI) · LPU</button><button class="btn" id="bAdmMed">Medição · Telegram</button></div></section>
  <section class="card"><h2>Atividades (rondas e corretivas)</h2><div class="tw"><table class="t" id="admTab"><thead><tr><th>Data</th><th>Técnico</th><th>Tipo</th><th>Rota</th><th class="r">Km GPS</th><th class="r">Km odôm.</th><th>Aderência</th><th class="r">Excessos</th></tr></thead><tbody></tbody></table></div></section>
  <section class="card"><h2>Por técnico</h2><div class="tw"><table class="t" id="admTec2"><thead><tr><th>Técnico</th><th class="r">Ativ.</th><th class="r">Caixas</th><th class="r">Atend.</th><th class="r">Km</th><th class="r">Desvios</th><th class="r">Excessos</th><th class="r">Odôm. ≠</th></tr></thead><tbody></tbody></table></div></section>
  <section class="card"><h2>Escala de plantão</h2><p class="muted small" style="margin:0">Quem estiver de plantão recebe as atividades com alarme fora do horário. Quem estiver de folga não recebe o alarme de expediente.</p><div id="escala"><p class="empty">Carregando…</p></div></section>
  <section class="card"><h2>Escalonamento (LOG 4)</h2><p class="muted small" style="margin:0">Na 4ª atividade emergencial na mesma semana (mesmo local até 1 km, mesma rota ou mesmo endereço), o painel avisa e manda o resumo ao gerente pelo WhatsApp.</p>
    <div class="grid2"><div class="field"><label class="lb" for="cfgGer">Gerente</label><input type="text" id="cfgGer" value="${esc((S.cfg || {}).gerenteNome || '')}" placeholder="Nome"></div><div class="field"><label class="lb" for="cfgWhats">WhatsApp do gerente</label><input type="tel" id="cfgWhats" value="${esc((S.cfg || {}).gerenteWhats || '')}" placeholder="55 35 99999-0000"></div></div>
    <div class="grid2"><div class="field"><label class="lb" for="cfgLim">Limite de trabalho por dia (h:mm)</label><input type="text" id="cfgLim" value="${fHm(limiteDia().lim).replace('h', ':')}" placeholder="10:00"></div><div class="field"><label class="lb" for="cfgAviso">Avisar o gestor com antecedência de (min)</label><input type="text" inputmode="numeric" id="cfgAviso" value="${limiteDia().aviso}"></div></div>
    <p class="muted small" style="margin:0">Pela CLT, no máximo 2 horas extras por dia (10 h de trabalho). Quem estiver com O.S. aberta perto do limite aparece no alerta do topo do painel e, com os alertas ativados, chega notificação neste computador. <button type="button" class="lnk" id="bAlertaAdm">Ativar alertas neste computador</button></p>
    <button type="button" class="btn" id="bCfgSalva">Salvar</button><span class="muted small">Jornada dos técnicos: ${jornada().inicio} às ${jornada().fim} · refeição de ${jornada().refeicaoMin} min (ajuste no arquivo supabase-config.js).</span></section>
  <section class="card"><h2>Rotas</h2><div class="list" id="admRotas"></div><input type="file" id="fileRotaA" accept=".kmz,.kml" hidden><button class="btn" id="bAdmRota">${ICON.pin}Importar rota (KMZ) e enviar para os técnicos</button><span class="muted small">Também no menu: <b>Rotas (KMZ)</b>.</span></section>`;
}
function iniciaisNome(n) { return iniciais(n || '?'); }
// última posição conhecida de cada técnico (fica no mapa mesmo sem sinal ou offline)
function vivoUlt() { if (!S.vivoUltM) { try { S.vivoUltM = new Map(Object.entries(JSON.parse(localStorage.getItem('tp-vivoult') || '{}'))); } catch (e) { S.vivoUltM = new Map(); } } return S.vivoUltM; }
function vivoPos(v) {
  const M = vivoUlt(); const u = v && v._uid; if (!u) return v;
  if (v.lat != null) { const p = { lat: v.lat, lon: v.lon, ts: v.posTs || v.ts }; const a = M.get(u); if (!a || (p.ts || 0) >= (a.ts || 0)) { M.set(u, p); clearTimeout(S.vivoUltT); S.vivoUltT = setTimeout(() => { try { localStorage.setItem('tp-vivoult', JSON.stringify(Object.fromEntries(M))); } catch (e) {} }, 2000); } return v; }
  const a = M.get(u); return a ? { ...v, lat: a.lat, lon: a.lon, posTs: a.ts, _ultima: true } : v;
}
function pintaVivo() {
  try { pintaLimites(); } catch (e) {}
  const lista = $('#listaVivo'); if (!lista) return; const agora = Date.now();
  const ativos = [...(S.vivo || new Map()).values()].map(vivoPos).filter(v => v.ativo).sort((a, b) => (a.tecnico || '').localeCompare(b.tecnico || ''));
  const cor = v => agora - (v.ts || 0) > 600000 ? '#8a8a8a' : v.tipo === 'corretiva' ? '#d9480f' : v.tipo === 'implantacao' ? '#0f8a83' : v.tipo === 'vistoria' ? '#7a3fa0' : '#0b5f99';
  const ha = ts => { if (!ts) return '—'; const m = Math.round((agora - ts) / 60000); return m < 1 ? 'agora' : m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)}h${pad2(m % 60)}`; };
  const vivos = new Set(ativos.map(v => v._uid));
  const inativos = (S.adm.tecnicos || []).filter(t => !vivos.has(t.uid)).map(t => `<div class="item" ${((S.vivo || new Map()).get(t.uid) || {}).lat != null && ((S.vivo || new Map()).get(t.uid) || {}).expediente ? `data-vivotec="${t.uid}" style="cursor:pointer" title="Ver no mapa"` : 'style="cursor:default"'}><span class="badge" style="background:var(--surface-2);color:var(--muted)">${avIn(t.foto, t.nome)}</span><span class="tx"><b>${esc(t.nome)}${t.matricula ? ' · ' + esc(t.matricula) : ''}</b><span>${esc(situacaoTec(t.uid).txt)}</span></span>${situacaoTec(t.uid).cls ? `<span class="pill ${situacaoTec(t.uid).cls}">${situacaoTec(t.uid).cls === 'bad' ? 'Atrasado' : situacaoTec(t.uid).cls === 'draft' ? 'Refeição' : 'Disponível'}</span>` : ''}</div>`).join('');
  lista.innerHTML = (ativos.length ? ativos.map(v => { const rt = v.rotaId ? rotaById(v.rotaId) : null; return `<button class="item" data-vivo="${v._uid}"><span class="badge" style="background:${cor(v)};color:#fff">${avIn(fotoTec(v._uid), v.tecnico)}</span><span class="tx"><b>${esc(v.tecnico || '—')}${v.matricula ? ' · ' + esc(v.matricula) : ''}</b><span>${v.apoio ? '🤝 Apoio' + (v.apoioDe ? ' a ' + esc(v.apoioDe) : '') + ' · ' : ''}${v.tipo === 'corretiva' ? 'Corretiva · ticket ' + esc(v.ticket || '—') : esc(TIPOLB[v.tipo] || 'Ronda preventiva')}${rt ? ' · ' + esc(rt.codigo) : ''}${v.noLocal ? ' · <b>no local</b>' : ''}</span><span class="muted small">Desde ${v.inicio ? fHora(v.inicio) : '—'} · ${fKm(v.km || 0)} · ${v.caixas || 0} ${v.tipo === 'corretiva' ? 'ponto(s)' : 'caixa(s)'} · ${v.vel != null ? fVel(v.vel) : '—'} · posição ${ha(v.posTs || v.ts)}${v.veiculo ? ' · ' + esc(v.veiculo) : ''}</span></span>${agora - (v.ts || 0) > 600000 ? '<span class="pill bad">Sem sinal</span>' : '<span class="pill ok">Ativo</span>'}</button>`; }).join('') : '<p class="empty">Ninguém em ronda ou corretiva agora.</p>') + inativos;
  const at = $('#vivoAt'); if (at) at.textContent = `${ativos.length} em atividade · ${fHora(agora)}`;
  if (window.L && $('#mapVivo') && !$('#vMapa').hidden) {
    if (!S.mapVivo) { S.mapVivo = L.map('mapVivo'); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(S.mapVivo); S.vivoLayer = L.layerGroup().addTo(S.mapVivo); S.mapVivo.setView([-22.9, -45.5], 7); S.vivoFit = false; }
    S.vivoLayer.clearLayers(); const pts = [];
    const semSinal = v => agora - (v.ts || 0) > 600000 || agora - (v.posTs || v.ts || 0) > 600000 || v._ultima;
    const disp = [...(S.vivo || new Map()).values()].map(vivoPos).filter(v => !v.ativo && v.expediente && v.lat != null && agora - (v.ts || 0) < 16 * 3600000);
    disp.forEach(v => { pts.push([v.lat, v.lon]); const c = v.refeicao ? '#d9a400' : semSinal(v) ? '#8a8a8a' : '#2f8a3a';
      L.marker([v.lat, v.lon], { icon: L.divIcon({ className: '', html: `<div class="mk" style="background:${c};width:30px;height:30px;font-size:11px;border:2px dashed #fff">${esc(iniciaisNome(v.tecnico))}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).bindPopup(`<b>${esc(v.tecnico)}</b><br>${v.refeicao ? 'Em refeição' : 'Disponível · sem atividade'}<br>Expediente desde ${v.expIni ? fHora(v.expIni) : '—'}<br>${semSinal(v) ? '<b>📵 Sem sinal</b> · última posição ' : 'Posição '}${ha(v.posTs || v.ts)}`).addTo(S.vivoLayer); });
    ativos.filter(v => v.lat != null).forEach(v => { pts.push([v.lat, v.lon]); const ss = semSinal(v); L.marker([v.lat, v.lon], { icon: L.divIcon({ className: '', html: `<div class="mk" style="background:${ss ? '#8a8a8a' : cor(v)};width:34px;height:34px;font-size:12px;${ss ? 'border:2px dashed #fff;opacity:.9' : ''}">${esc(iniciaisNome(v.tecnico))}</div>${ss ? '<span style="position:absolute;top:-8px;right:-10px;font-size:14px">📵</span>' : ''}`, iconSize: [34, 34], iconAnchor: [17, 17] }) }).bindPopup(`<b>${esc(v.tecnico)}</b><br>${v.tipo === 'corretiva' ? 'Corretiva ' + esc(v.ticket) : 'Preventiva'}<br>${fKm(v.km || 0)} · ${v.vel != null ? fVel(v.vel) : ''}<br>${ss ? '<b>📵 Sem sinal</b> · última posição ' : ''}${ha(v.posTs || v.ts)}`).addTo(S.vivoLayer); });
    if (pts.length && !S.vivoFit) { S.vivoFit = true; if (pts.length > 1) S.mapVivo.fitBounds(pts, { padding: [30, 30], maxZoom: 15 }); else S.mapVivo.setView(pts[0], 15); }
  }
  $$('[data-vivotec]', lista).forEach(b => b.onclick = () => { const v = S.vivo.get(b.dataset.vivotec); if (!v || v.lat == null) { toast('Sem posição recente deste técnico.'); return; } admVis('mapa'); if (S.mapVivo) S.mapVivo.setView([v.lat, v.lon], 16); });
  $$('[data-vivo]', lista).forEach(b => b.onclick = () => { const v = S.vivo.get(b.dataset.vivo); if (!v || v.lat == null) return; admVis('mapa'); if (S.mapVivo) S.mapVivo.setView([v.lat, v.lon], 16); });
  if ($('#gantt') && !$('#vTempo').hidden) pintaGantt();
}
function admVis(v) {
  S.adm.vis = v; $('#vTempo').hidden = v !== 'tempo'; $('#vMapa').hidden = v !== 'mapa'; $('#gNav').hidden = v !== 'tempo';
  $$('[data-avis]').forEach(b => b.setAttribute('aria-pressed', b.dataset.avis === v));
  if (v === 'mapa') { S.vivoFit = false; pintaVivo(); setTimeout(() => { if (S.mapVivo) S.mapVivo.invalidateSize(); }, 60); } else pintaGantt();
}
function ganttBlocos(r) {
  const fim = r.fim || Date.now(); const ev = (r.eventos || []).slice().sort((a, b) => a.ts - b.ts); const out = []; let cur = r.inicio, primeira = true;
  ev.filter(e => e.tipo === 'chegada').forEach(c => {
    if (c.ts > cur) out.push({ t: primeira ? 'desl' : 'cabo', a: cur, b: c.ts }); primeira = false;
    const sa = ev.find(e => e.tipo === 'saida' && e.inspId === c.inspId); const i = DB.mem.inspecoes.get(c.inspId) || S.inspCache.get(c.inspId);
    const fimC = sa ? sa.ts : fim; const nc = i ? Object.values(i.check || {}).filter(v => v === 'NC').length : 0;
    out.push({ t: isCorr(r) ? 'cr' : isImpl(r) ? 'im' : isVist(r) ? 'vi' : 'cx', st: !sa && !r.fim ? 'ini' : nc ? 'nc' : '', a: c.ts, b: fimC, lb: i ? (isCorr(i) ? 'Ticket ' + (i.corr.ticket || '—') : isImpl(i) ? (IMPL_SERV[i.impl.servico] || 'Implantação') : isVist(i) ? (VIST_TIPOS[i.vist.tipo] || 'Registro') : (i.info.tag || 'Atividade')) : (isCorr(r) ? 'Corretiva' : isImpl(r) ? 'Implantação' : isVist(r) ? 'Vistoria' : 'Caixa') });
    cur = Math.max(cur, fimC);
  });
  if (fim > cur) out.push({ t: 'desl', a: cur, b: fim, ret: !primeira });
  return out;
}
function pintaGantt() {
  const A = S.adm; const box = $('#gantt'); if (!box) return;
  const dia = A.gDia && A.gDia >= A.de && A.gDia <= A.ate ? A.gDia : A.ate; A.gDia = dia;
  const d0 = diaIni(dia), d1 = d0 + 86400000, agora = Date.now();
  $('#gDia').textContent = new Date(d0).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  $('#gPrev').disabled = dia <= A.de; $('#gNext').disabled = dia >= A.ate;
  const rs = [...DB.mem.rondas.values()].filter(r => r.inicio >= d0 && r.inicio < d1);
  const linhas = new Map();
  (A.tecnicos || []).filter(t => !A.tec || t.uid === A.tec).forEach(t => linhas.set(t.uid, { nome: t.nome, mat: t.matricula, rs: [] }));
  const ids = new Set(rs.map(r => r.id));
  [...(S.vivo || new Map()).values()].filter(v => v.ativo && v.inicio >= d0 && v.inicio < d1 && !ids.has(v.rondaId)).forEach(v => rs.push({ id: v.rondaId || ('vivo-' + v._uid), _vivo: true, _uid: v._uid, tecnico: v.tecnico, matricula: v.matricula, tipo: v.tipo, ticket: v.ticket, inicio: v.inicio, eventos: [] }));
  rs.forEach(r => { const k = r._uid || r.tecnico; if (!linhas.has(k)) linhas.set(k, { nome: r.tecnico || '—', mat: r.matricula || '', rs: [] }); linhas.get(k).rs.push(r); });
  let h0 = 6, h1 = 20;
  rs.forEach(r => { h0 = Math.min(h0, new Date(r.inicio).getHours()); const fimR = r.fim || Math.min(agora, d1 - 1); h1 = Math.max(h1, Math.ceil((fimR - d0) / 3600000)); });
  h1 = Math.min(24, h1); const n = h1 - h0, span = n * 3600000;
  const x = t => Math.max(0, Math.min(100, (t - d0 - h0 * 3600000) / span * 100));
  const nome = { desl: 'Deslocamento', cabo: 'Rota do cabo', cx: 'Atividade', cr: 'Corretiva', im: 'Implantação', vi: 'Vistoria' };
  let out = `<div class="gt" style="--n:${n}"><div class="gr ghead"><div class="gn">Técnico</div><div class="gl">${Array.from({ length: n }, (_, k) => h0 + k).filter(hh => (hh - h0) % 2 === 0).map(hh => `<span style="left:${(hh - h0) / n * 100}%">${pad2(hh)}h</span>`).join('')}</div></div>`;
  [...linhas.values()].sort((p, q) => p.nome.localeCompare(q.nome)).forEach(l => {
    let bars = '';
    l.rs.forEach(r => ganttBlocos(r).forEach(bk => {
      const L = x(bk.a), W = Math.max(0.5, x(bk.b) - L); const rot = bk.t === 'desl' && bk.ret ? 'Retorno' : nome[bk.t];
      const tip = `${l.nome} · ${rot}${bk.lb ? ' ' + bk.lb : ''} · ${fHora(bk.a)}–${bk.b >= agora - 60000 && !r.fim ? 'agora' : fHora(bk.b)}${bk.st === 'nc' ? ' · com N/C' : ''}`;
      bars += `<button type="button" class="gb ${bk.t}${bk.st ? ' ' + bk.st : ''}" data-ronda="${r.id}" style="left:${L}%;width:${W}%" title="${esc(tip)}" aria-label="${esc(tip)}">${bk.lb && W > 4 ? esc(bk.lb) : ''}</button>`;
    }));
    const ativo = l.rs.some(r => !r.fim);
    const uidL = [...linhas.entries()].find(([, v]) => v === l)[0];
    const expsL = (S.exps || []).filter(e => e.uid === uidL && e.inicio < d1 && (e.fim || agora) > d0); const vv = (S.vivo || new Map()).get(uidL); if (vv && vv.expediente && vv.expIni && vv.expIni < d1 && !expsL.some(e => !e.fim)) expsL.push({ inicio: vv.expIni, fim: null, refeicoes: vv.refeicao ? [{ ini: vv.refeicao }] : [] });
    expsL.forEach(e => { const L = x(e.inicio), W = Math.max(0.5, x(e.fim || agora) - L); bars = `<i class="gexp" style="left:${L}%;width:${W}%" title="Expediente ${fHora(e.inicio)}–${e.fim ? fHora(e.fim) : 'agora'}${e.distCasa != null ? ' · iniciado a ' + fDist(e.distCasa) + ' de casa' : ''}"></i>` + bars; (e.refeicoes || []).forEach(rf => { const L2 = x(rf.ini), W2 = Math.max(0.5, x(rf.fim || agora) - L2); bars += `<i class="gexp" style="left:${L2}%;width:${W2}%;background:repeating-linear-gradient(45deg,#f6d77a 0 4px,#fdf1de 4px 8px);border-color:#d9a400;z-index:1" title="Refeição ${fHora(rf.ini)}–${rf.fim ? fHora(rf.fim) : 'agora'}"></i>`; }); });
    out += `<div class="gr"><div class="gn">${esc(l.nome)}<span>${l.rs.length ? l.rs.length + ' atividade(s)' + (ativo ? ' · em campo' : '') : 'Sem atividade'}</span></div><div class="gl">${bars}${agora >= d0 && agora < d1 ? `<i class="gnow" style="left:${x(agora)}%"></i>` : ''}</div></div>`;
  });
  if (!linhas.size) out += '<p class="empty">Nenhum técnico cadastrado ainda.</p>';
  const ag = [...(S.atvsAdm || new Map()).values()].filter(a => (a.status === 'pendente' || a.status === 'recebida') && agendaDe(a) === dia && (!A.tec || a.tecnicoUid === A.tec)).sort((p, q) => (p.tecnicoNome || '').localeCompare(q.tecnicoNome || ''));
  out += '</div>' + (ag.length ? `<div class="gag"><b>O.S. agendadas para ${esc(fDiaCurto(dia))} (${ag.length})</b>${ag.map(a => `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center;border-top:1px solid var(--line);padding:6px 0"><span style="flex:1;min-width:200px"><b>${esc(a.ticket || atvTitulo(a))}</b> · ${esc(a.tecnicoNome || 'sem técnico')} · ${esc(stAtv(a))}${(a.remanejos || []).length ? ` · <span class="muted small">remanejada ${a.remanejos.length}x</span>` : ''}</span><input type="date" data-remdia="${a.id}" value="${isoDate(diaIni(dia) + 86400000 + 43200000)}" style="min-height:36px"><button type="button" class="btn" data-remaj="${a.id}" style="min-height:36px">Remanejar</button></div>`).join('')}</div>` : '');
  box.innerHTML = out;
  $$('[data-remaj]', box).forEach(b => b.onclick = async () => { const a = S.atvsAdm.get(b.dataset.remaj); const para = ($$('[data-remdia]', box).find(x => x.dataset.remdia === a.id) || {}).value; if (!para || para === agendaDe(a)) { toast('Escolha outro dia.'); return; }
    if (!confirm(`Remanejar a O.S. ${a.ticket || ''} (${a.tecnicoNome || 'sem técnico'}) de ${fDiaCurto(agendaDe(a))} para ${fDiaCurto(para)}?`)) return;
    if (!confirm(`Confirma de novo: a O.S. ${a.ticket || ''} passa para ${fDiaCurto(para)}. O técnico é avisado.`)) return;
    try { await remanejaAtv(a, para, (Nuvem.admin || {}).nome || 'Supervisor'); toast('O.S. remanejada.'); pintaGantt(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } });
  $$('[data-ronda]', box).forEach(b => b.onclick = async () => { const r = DB.mem.rondas.get(b.dataset.ronda); if (!r) { toast('Atividade em andamento. Os detalhes chegam quando o celular do técnico sincronizar; toque em Atualizar.', 5000); return; } S.rondaView = r; await cacheInspRonda(r); go('ronda'); });
}
function ouvirVivo() {
  if (S.unVivo) { try { S.unVivo(); } catch (e) {} }
  S.vivo = S.vivo || new Map();
  S.unVivo = Nuvem.ouvirAoVivo((tipo, v) => { if (tipo === 'pinta') { pintaVivo(); return; } if (tipo === 'del') S.vivo.delete(v._uid); else S.vivo.set(v._uid, v); pintaVivo(); }, e => { const l = $('#listaVivo'); if (l) l.innerHTML = `<div class="warnbox">Sem permissão para ver os técnicos em tempo real: ${esc(e.message)}</div>`; });
  clearInterval(S.vivoT); S.vivoT = setInterval(pintaVivo, 30000);
}
async function afterAdm() {
  const A = S.adm; S.medVolta = false;
  $$('[data-avis]').forEach(b => b.onclick = () => admVis(b.dataset.avis));
  const mvDia = k => { const d = new Date(diaIni(A.gDia || A.ate) + k * 86400000 + 3600000 * 12); A.gDia = isoDate(d.getTime()); pintaGantt(); };
  $('#gPrev').onclick = () => mvDia(-1); $('#gNext').onclick = () => mvDia(1);
  pintaGantt();
  ouvirVivo(); ouvirAtvAdm(); pintaFila(); carregaEscala().then(() => { pintaEscala(); pintaVivo(); });
  $('#bNovaAtv').onclick = () => abrirAtvAdm(null);
  $('#bColarAtv').onclick = () => { abrirAtvAdm(null); S.atvEdit._colar = true; render(); setTimeout(() => { const t = $('#atTxt'); if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); } }, 100); };
  $('#bAlertaAdm').onclick = async () => { try { let p = Notification.permission; if (p === 'default') p = await Notification.requestPermission(); if (p !== 'granted') { toast('Notificações bloqueadas no navegador.', 6000); return; } const ok = await Nuvem.assinarPush(); toast(ok ? 'Alertas ativados neste computador.' : 'Notificação liberada. O alerta com o painel fechado depende das chaves de alerta (VAPID) configuradas.', 6000); } catch (e) { toast('Não foi possível: ' + e.message, 6000); } };
  $('#bCfgSalva').onclick = async () => { const m = String($('#cfgLim').value).match(/^(\d{1,2})(?::(\d{2}))?$/); S.cfg = { ...(S.cfg || {}), gerenteNome: $('#cfgGer').value.trim(), gerenteWhats: $('#cfgWhats').value.trim(), limiteDiaMin: m ? +m[1] * 60 + (+m[2] || 0) : LIMITE_DIA_PADRAO, avisoMin: +$('#cfgAviso').value || 30 }; try { await Nuvem.cfgSalvar(S.cfg); toast('Gerente salvo.'); } catch (e) { toast('Erro: ' + e.message, 6000); } };
  $('#lnkSair').onclick = async e => { e.preventDefault(); await Nuvem.sairAdmin(); go('admLogin'); };
  $$('[data-aper]').forEach(b => b.onclick = () => { const n = +b.dataset.aper; A.ate = isoDate(Date.now()); A.de = isoDate(Date.now() - (n - 1) * 86400000); $('#admDe').value = A.de; $('#admAte').value = A.ate; });
  $('#admDe').onchange = e => { A.de = e.target.value; }; $('#admAte').onchange = e => { A.ate = e.target.value; };
  $('#admTec').onchange = e => { A.tec = e.target.value; }; $('#admLim').oninput = e => { A.lim = e.target.value; };
  $('#bAdmAtual').onclick = async () => { $('#bAdmAtual').disabled = true; try { await admCarregar(); } catch (e) { toast('Erro ao carregar: ' + e.message, 6000); } render(); };
  $('#bAdmPdf').onclick = async () => { const f = await gerarPdfPeriodo(A.de, A.ate); if (f) baixar(f); };
  $('#bAdmWa').onclick = async () => { const f = await gerarPdfPeriodo(A.de, A.ate); if (f) compartilhar([f], `Relatório ${tipoPeriodo(A.de, A.ate).toLowerCase()} — ${S.perfil.nome}`); };
  $('#bAdmBi').onclick = () => go('admBi');
  $('#bAdmMed').onclick = () => go('admMed');
  $('#bAdmKmz').onclick = async () => { const f = await kmzPeriodo(A.de, A.ate); if (f) exportar(f); };
  $('#bAdmRota').onclick = () => $('#fileRotaA').click();
  $('#fileRotaA').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) { await importaRotaKmz(f); } };
  $('#admRotas').innerHTML = (S.rotas || []).map(rt => `<button class="item" data-rota="${rt.id}"><span class="badge">${rt.cap ? esc(rt.cap) : '—'}</span><span class="tx"><b>${esc(rt.codigo)}${rt.nome ? ' · ' + esc(rt.nome) : ''}</b><span>${esc(rt.pontaA || '?')} > ${esc(rt.pontaB || '?')}${rt.kml ? ` · traçado ${fKm(rt.kml.km)}` : ' · sem traçado'}</span></span></button>`).join('') || '<p class="muted" style="margin:0">Nenhuma rota cadastrada.</p>';
  $$('[data-rota]', $('#admRotas')).forEach(b => b.onclick = () => abrirRota(b.dataset.rota));
  const d = await dadosPeriodo(A.de, A.ate);
  const kmDesv = d.tot.desv.reduce((a, x) => a + x.km, 0);
  $('#admKpi').innerHTML = `<div class="stat"><b>${d.rs.length}</b><span>Atividades</span></div><div class="stat"><b>${d.tot.cx}</b><span>Caixas</span></div><div class="stat"><b>${d.tot.at}</b><span>Atend. corretiva</span></div><div class="stat"><b>${fKm(d.tot.km)}</b><span>Km GPS</span></div>
    <div class="stat"><b>${d.tot.odoN ? fKm(d.tot.odo) : '—'}</b><span>Km odômetro</span></div><div class="stat"><b style="color:${d.tot.div.length ? 'var(--bad)' : 'inherit'}">${d.tot.div.length}</b><span>Odômetro ≠ GPS</span></div><div class="stat"><b style="color:${d.tot.desv.length ? 'var(--bad)' : 'inherit'}">${d.tot.desv.length}</b><span>Desvios (${fKm(kmDesv)})</span></div><div class="stat"><b style="color:${d.tot.exc.length ? 'var(--bad)' : 'inherit'}">${d.tot.exc.length}</b><span>Excessos de vel.</span></div>`;
  $('#admTab tbody').innerHTML = d.rs.slice().reverse().map(r => { const { t } = totais(r); const o = odoInfo(r), ad = aderencia(r), vs = velStats(r); const rt = r.rotaId ? rotaById(r.rotaId) : null;
    return `<tr data-ronda="${r.id}" style="cursor:pointer"><td>${fDH(r.inicio)}</td><td>${esc(r.tecnico)}</td><td>${isCorr(r) ? 'Corretiva ' + esc(r.ticket) : isImpl(r) ? 'Implantação ' + esc(r.designacao || '') : isVist(r) ? 'Vistoria' : 'Preventiva'} ${logTag(r.atvLog)}</td><td>${esc(rt ? rt.codigo : '—')}</td><td class="r">${fKm(t.km)}</td><td class="r" style="${o && o.diverge ? 'color:var(--bad);font-weight:700' : ''}">${o ? fKm(o.odo) : '—'}</td><td style="${ad && ad.desvios.length ? 'color:var(--bad);font-weight:700' : ''}">${ad && ad.pct != null ? (ad.desvios.length ? `${ad.desvios.length} desvio(s) · ${fPct(ad.pct)}` : `OK · ${fPct(ad.pct)}`) : '—'}</td><td class="r" style="${vs.exc.length ? 'color:var(--bad);font-weight:700' : ''}">${vs.exc.length}</td></tr>`; }).join('') || '<tr><td colspan="8" class="muted">Nenhuma atividade no período.</td></tr>';
  $$('#admTab [data-ronda]').forEach(tr => tr.onclick = async () => { S.rondaView = DB.mem.rondas.get(tr.dataset.ronda); await cacheInspRonda(S.rondaView); go('ronda'); });
  const porTec = new Map(); const pt = n => { if (!porTec.has(n)) porTec.set(n, { n, at: 0, cx: 0, co: 0, km: 0, dv: 0, ex: 0, od: 0 }); return porTec.get(n); };
  d.rs.forEach(r => { const x = pt(r.tecnico || '—'); x.at++; x.km += totais(r).t.km; const ad = aderencia(r); if (ad) x.dv += ad.desvios.length; x.ex += velStats(r).exc.length; const o = odoInfo(r); if (o && o.diverge) x.od++; });
  d.ins.forEach(i => { const x = pt(i.info.tecnico || i._tecnico || '—'); if (isCorr(i)) x.co++; else x.cx++; });
  $('#admTec2 tbody').innerHTML = [...porTec.values()].sort((a, b) => a.n.localeCompare(b.n)).map(x => `<tr><td>${esc(x.n)}</td><td class="r">${x.at}</td><td class="r">${x.cx}</td><td class="r">${x.co}</td><td class="r">${fKm(x.km)}</td><td class="r" style="${x.dv ? 'color:var(--bad);font-weight:700' : ''}">${x.dv}</td><td class="r" style="${x.ex ? 'color:var(--bad);font-weight:700' : ''}">${x.ex}</td><td class="r" style="${x.od ? 'color:var(--bad);font-weight:700' : ''}">${x.od}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">—</td></tr>';
}
const SVG = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
/* ---------- BI das O.S.: pendente → alocada → em execução → finalizada → medida → arquivada, com o tempo de SLA ---------- */
const BIOS_ET = [['pendente', 'Pendentes', '#6b6b6b', 'Sem técnico'], ['alocada', 'Alocadas ao técnico', '#0b5f99', 'Aguardando o técnico iniciar'], ['execucao', 'Em execução', '#d97a00', 'Em deslocamento, no local ou pausada'], ['finalizada', 'Finalizadas', '#0572ce', 'Concluídas, ainda não medidas'], ['medida', 'Medidas', '#2e7d32', 'Medidas pela equipe de medição'], ['arquivada', 'Arquivadas', '#7a3fa0', 'Medidas e já arquivadas no ciclo']];
const BIOS_LB = Object.fromEntries(BIOS_ET.map(x => [x[0], x[1]]));
const tipoAtvLb = a => atvEmerg(a) ? (/claro/i.test(a.cliente || '') ? 'Corretiva Claro' : 'Corretiva / emergencial') : atvImpl(a) ? 'Implantação' : atvConj(a) ? 'Conjunta de site' : atvVist(a) ? 'Vistoria' : 'Preventiva';
function biosLinhas() {
  const A = S.adm, de = diaIni(A.de), ate = diaFim(A.ate), agora = Date.now();
  const atvs = [...((S.atvsAdm || new Map()).values())].filter(a => a.status !== 'cancelada' && (!A.tec || a.tecnicoUid === A.tec || (a.apoioUids || []).includes(A.tec)));
  const meds = S.meds || new Map(); const arq = S.biosArq || new Map();
  // ficha (inspeção) → atividade, pela ronda
  const porAtv = new Map(), soltas = [];
  [...DB.mem.inspecoes.values()].filter(i => !i.apoio && (!A.tec || i._uid === A.tec)).forEach(i => { const r = i.rondaId ? DB.mem.rondas.get(i.rondaId) : null; const aid = (r && r.atividadeId) || i.atividadeId; if (aid) (porAtv.get(aid) || porAtv.set(aid, []).get(aid)).push(i); else soltas.push(i); });
  const etapaFicha = l => { if (l.some(i => arq.has(i.id) || (meds.get(i.id) || {})._arq)) return ['arquivada', '']; const m = l.map(i => meds.get(i.id)).find(Boolean); if (m && m.status === 'medida') return ['medida', '']; if (m && m.status === 'enviada') return ['finalizada', 'Na medição']; if (m && m.status === 'validada') return ['finalizada', 'Validada']; return ['finalizada', 'Aguardando validação']; };
  const out = [], usadas = new Set();
  for (const a of atvs) {
    const l = porAtv.get(a.id) || []; l.forEach(i => usadas.add(i.id));
    let et, sub = '';
    if (a.status === 'pendente' || a.status === 'recebida') { et = a.tecnicoUid ? 'alocada' : 'pendente'; sub = a.tecnicoUid ? (a.vistaEm ? 'Técnico ciente' : a.status === 'recebida' ? 'Entregue' : 'Enviada') : 'Sem técnico'; }
    else if (a.status === 'em_deslocamento' || a.status === 'no_local' || a.status === 'pausada') { et = 'execucao'; sub = a.status === 'no_local' ? 'No local' : a.status === 'pausada' ? 'Pausada' : 'Em deslocamento'; }
    else if (a.status === 'concluida') [et, sub] = etapaFicha(l); else continue;
    const fim = et === 'pendente' || et === 'alocada' || et === 'execucao' ? null : +(a.concluidaEm || Math.max(0, ...l.map(i => i.saida || 0)) || a.atualizado) || null;
    if (fim && (fim < de || fim > ate)) continue;
    const s = slaDe(a, agora); const ini = +a.criado || null;
    out.push({ id: a.id, atv: a, i: l[0] || null, os: a.ticket || (l[0] ? osRef(l[0]) : '—'), tipo: tipoAtvLb(a), tec: a.tecnicoNome || '—', clu: CLUSTERS[a.cluster] || '', et, sub, ini, fim, min: ini ? ((fim || agora) - ini) / 60000 : null, lim: s ? s.rep.lim : null, estourou: s ? s.rep.estourou : false, valor: l.reduce((t, i) => t + (meds.get(i.id) && ['enviada', 'medida'].includes(meds.get(i.id).status) ? +meds.get(i.id).valor || 0 : valorOS(i)), 0) || (arq.get(a.id) || {}).valor || 0 });
  }
  // fichas sem atividade (corretiva aberta em campo, antes do despacho só pelo supervisor)
  for (const i of soltas) {
    if (isVist(i) && !i.lpu) continue; const m = meds.get(i.id);
    const [et, sub] = i.status !== 'concluida' && !m ? ['execucao', 'Ficha aberta em campo'] : etapaFicha([i]);
    const ini = +(i.chegada || i.criado) || null, fim = et === 'execucao' ? null : +(i.saida || i.chegada) || null;
    if (fim && (fim < de || fim > ate)) continue;
    out.push({ id: i.id, atv: null, i, os: osRef(i), tipo: tipoLb(i), tec: i.info.tecnico || i._tecnico || '—', clu: '', et, sub, ini, fim, min: ini ? ((fim || agora) - ini) / 60000 : null, lim: null, estourou: false, valor: m && ['enviada', 'medida'].includes(m.status) ? +m.valor || 0 : valorOS(i) });
    usadas.add(i.id);
  }
  // arquivadas que não estão mais carregadas
  for (const [id, o] of arq) { if (usadas.has(id) || out.some(x => x.i && x.i.id === id)) continue; if (A.tec && o.uid !== A.tec) continue; const t = o.data_os ? Date.parse(o.data_os) : null;
    out.push({ id, atv: null, i: null, os: o.os || '—', tipo: o.tipo || '—', tec: o.tecnico || '—', clu: '', et: 'arquivada', sub: o.lote ? 'Lote ' + o.lote : '', ini: t, fim: +o.medido_em || null, min: null, lim: null, estourou: false, valor: +o.valor || 0 }); }
  return out.sort((a, b) => (b.ini || 0) - (a.ini || 0));
}
function viewAdmOsBi() {
  const A = S.adm, L = biosLinhas(), f = S.biosEt || ''; const tecs = A.tecnicos || []; const q = normLocal(S.biosBusca || '');
  const lista = L.filter(x => (!f || x.et === f) && (!q || normLocal(`${x.os} ${x.tec} ${x.tipo} ${x.sub}`).includes(q)));
  const fin = L.filter(x => x.fim && x.min != null && ['finalizada', 'medida', 'arquivada'].includes(x.et)); const med = fin.length ? fin.reduce((t, x) => t + x.min, 0) / fin.length : null;
  const comMeta = L.filter(x => x.lim != null && x.fim); const dentro = comMeta.filter(x => !x.estourou).length;
  const abertasEst = L.filter(x => x.lim != null && !x.fim && x.estourou).length;
  const tempo = x => x.min == null ? '—' : `${fHm(x.min)}${x.fim ? '' : ' <span class="muted small">(em curso)</span>'}${x.lim != null ? ` <span class="pill ${x.estourou ? 'bad' : 'ok'}" title="Meta de reparo ${fHm(x.lim)}">${x.estourou ? 'fora do SLA' : 'no SLA'}</span>` : ''}`;
  return `<section class="card"><div class="row" style="justify-content:space-between"><h2>BI das O.S.</h2><span class="muted small">${esc(Nuvem.admin.nome || '')}</span></div>
    <div class="chips" role="group" aria-label="Período">${ciclosAtalhos(true).map(([l, d, a]) => `<button type="button" data-bper="${d}|${a}" aria-checked="${A.de === d && A.ate === a}">${l}</button>`).join('')}</div>
    <div class="grid3"><div class="field"><label class="lb" for="bDe">De</label><input type="date" id="bDe" value="${A.de}"></div><div class="field"><label class="lb" for="bAte">Até</label><input type="date" id="bAte" value="${A.ate}"></div>
    <div class="field"><label class="lb" for="bTec">Técnico</label><select id="bTec"><option value="">Todos os técnicos</option>${tecs.map(t => `<option value="${t.uid}" ${A.tec === t.uid ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div></div>
    <div class="row" style="flex-wrap:wrap"><button type="button" class="btn pri" id="bBiAplica">Atualizar</button><button type="button" class="btn" id="bBiXlsx">Exportar Excel</button><button type="button" class="btn" id="bBiPdf">${ICON.pdf}Exportar PDF</button></div>
    <p class="muted small" style="margin:0">Pendentes, alocadas e em execução mostram a situação de agora. Finalizadas, medidas e arquivadas são as concluídas no período. O tempo de SLA vai da criação da O.S. até a finalização (ou até agora, se ainda aberta).</p></section>
  <section class="card"><div class="pipe" role="group" aria-label="Situação das O.S.">${BIOS_ET.map(([k, l, c, d]) => { const n = L.filter(x => x.et === k); return `<button type="button" class="pst" data-bet="${k}" aria-pressed="${f === k}" style="--c:${c}" title="${esc(d)}"><span>${l}</span><b>${n.length}</b><small>${n.some(x => x.valor) ? fBRL(n.reduce((t, x) => t + x.valor, 0)) : esc(d)}</small></button>`; }).join('')}</div>
    <div class="stats"><div class="stat"><b>${L.length}</b><span>O.S. no painel</span></div><div class="stat"><b>${med != null ? fHm(med) : '—'}</b><span>Tempo médio criação → finalização</span></div><div class="stat"><b>${comMeta.length ? Math.round(dentro / comMeta.length * 100) + '%' : '—'}</b><span>Corretivas no SLA de reparo (${dentro}/${comMeta.length})</span></div><div class="stat"><b style="color:${abertasEst ? 'var(--bad)' : 'inherit'}">${abertasEst}</b><span>Abertas fora do SLA</span></div></div></section>
  <section class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2 style="margin:0">${f ? esc(BIOS_LB[f]) : 'Todas as O.S.'} <span class="muted small">(${lista.length})</span></h2>${f ? '<button type="button" class="lnk" data-bet="">Ver todas</button>' : ''}</div>
    <input type="search" id="bBusca" value="${esc(S.biosBusca || '')}" placeholder="Buscar por O.S., técnico ou tipo" aria-label="Buscar O.S.">
    <p class="muted small" style="margin:0">Toque numa O.S. para abrir a ficha completa: fotos, produção (LPU), horários e o PDF da O.S. As exportações seguem o filtro escolhido.</p>
    ${lista.length ? `<div class="tw"><table class="t"><thead><tr><th>Criada</th><th>O.S.</th><th>Tipo</th><th>Técnico</th><th>Situação</th><th>Finalizada</th><th>Tempo (SLA)</th><th>Valor</th></tr></thead><tbody>${lista.slice(0, 400).map(x => `<tr data-bios="${esc(x.id)}" style="cursor:pointer"><td>${x.ini ? fDH(x.ini) : '—'}</td><td><b>${esc(x.os)}</b>${x.clu ? `<br><span class="muted small">${esc(x.clu)}</span>` : ''}</td><td>${esc(x.tipo)}</td><td>${esc(x.tec)}</td><td><span class="pill" style="background:color-mix(in srgb, ${BIOS_ET.find(e => e[0] === x.et)[2]} 15%, transparent);color:${BIOS_ET.find(e => e[0] === x.et)[2]}">${esc(BIOS_LB[x.et])}</span>${x.sub ? `<br><span class="muted small">${esc(x.sub)}</span>` : ''}</td><td>${x.fim ? fDH(x.fim) : '—'}</td><td>${tempo(x)}</td><td>${x.valor ? fBRL(x.valor) : '—'}</td></tr>`).join('')}</tbody></table></div>${lista.length > 400 ? '<p class="muted small" style="margin:0">Mostrando as 400 mais recentes. A planilha traz todas.</p>' : ''}` : '<p class="empty">Nenhuma O.S. nesta situação.</p>'}</section>`;
}
async function biosArquivadas() { try { const A = S.adm; const l = await Nuvem.osmPeriodo(diaIni(A.de), diaFim(A.ate)); S.biosArq = new Map(l.map(o => [o.id, o])); } catch (e) { console.warn('os_medidas', e); S.biosArq = S.biosArq || new Map(); } }
function afterAdmOsBi() {
  const A = S.adm; const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  if (!S.meds && !S.biosMedCarr) { S.biosMedCarr = true; Nuvem.medTodas().then(m => { S.meds = m; re(); }).catch(() => {}); }
  if (!S.biosArq && !S.biosArqCarr) { S.biosArqCarr = true; biosArquivadas().then(re); }
  const aplica = async () => { const b = $('#bBiAplica'); if (b) { b.disabled = true; b.textContent = 'Carregando…'; } try { await admCarregar(); try { S.meds = await Nuvem.medTodas(); } catch (e) {} await biosArquivadas(); } catch (e) { toast('Erro ao carregar: ' + e.message, 6000); } re(); };
  $$('[data-bper]').forEach(b => b.onclick = () => { const [d, a] = b.dataset.bper.split('|'); A.de = d; A.ate = a; aplica(); });
  $('#bDe').onchange = e => { A.de = e.target.value; }; $('#bAte').onchange = e => { A.ate = e.target.value; }; $('#bTec').onchange = e => { A.tec = e.target.value; };
  $('#bBiAplica').onclick = aplica;
  $$('[data-bet]').forEach(b => b.onclick = () => { S.biosEt = S.biosEt === b.dataset.bet ? '' : b.dataset.bet; re(); });
  let t; $('#bBusca').addEventListener('input', e => { S.biosBusca = e.target.value; clearTimeout(t); t = setTimeout(() => { re(); const i = $('#bBusca'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 300); });
  $$('[data-bios]').forEach(tr => tr.onclick = () => biosAbrir(tr.dataset.bios));
  $('#bBiXlsx').onclick = () => biosExcel(); $('#bBiPdf').onclick = () => biosPdf();
}
const biosFiltradas = () => { const f = S.biosEt || '', q = normLocal(S.biosBusca || ''); return biosLinhas().filter(x => (!f || x.et === f) && (!q || normLocal(`${x.os} ${x.tec} ${x.tipo} ${x.sub}`).includes(q))); };
async function biosAbrir(id) {
  const x = biosLinhas().find(r => r.id === id); if (!x) return;
  let i = x.i;
  if (!i && x.et === 'arquivada') { try { const r = Nuvem.ok(await Nuvem.tab('eventos').select('dados').eq('id', x.id).maybeSingle()); i = r && r.dados; } catch (e) {} if (!i) { toast('A ficha desta O.S. arquivada não está mais no servidor (só o resumo da medição).', 6000); return; } }
  if (i) { S.evView = i; S.evVolta = 'admOsBi'; go('evento'); return; }
  if (x.atv) abrirAtvAdm(x.atv.id);
}
function biosTabela(L) { return L.map(x => ({ 'Criada': x.ini ? fDH(x.ini) : '', 'O.S.': x.os, 'Tipo': x.tipo, 'Técnico': x.tec, 'Cluster': x.clu, 'Situação': BIOS_LB[x.et], 'Detalhe': x.sub, 'Finalizada': x.fim ? fDH(x.fim) : '', 'Tempo (h:mm)': x.min != null ? fHm(x.min) : '', 'Tempo (min)': x.min != null ? Math.round(x.min) : '', 'Meta SLA reparo (h:mm)': x.lim != null ? fHm(x.lim) : '', 'SLA': x.lim != null ? (x.estourou ? 'fora do SLA' : 'no SLA') : '', 'Valor (R$)': +(+x.valor || 0).toFixed(2) })); }
async function biosExcel() {
  const A = S.adm, L = biosFiltradas(); if (!L.length) { toast('Nenhuma O.S. para exportar.'); return; }
  const linhas = biosTabela(L); const itens = []; L.forEach(x => (x.i && x.i.lpu || []).forEach(it => itens.push({ 'O.S.': x.os, 'Técnico': x.tec, 'Código': it.c, 'Descrição': it.d, 'Tipo': it.t === 'M' ? 'Material' : 'Serviço', 'Quantidade': +it.q || 0, 'Unidade': it.u || '', 'Valor unitário (R$)': +it.v || 0 })));
  const resumo = BIOS_ET.map(([k, l]) => { const n = L.filter(x => x.et === k); return { 'Situação': l, 'O.S.': n.length, 'Valor (R$)': +n.reduce((t, x) => t + (+x.valor || 0), 0).toFixed(2) }; });
  const nome = `BI_OS_${A.de}_a_${A.ate}${S.biosEt ? '_' + S.biosEt : ''}`;
  try {
    if (!window.XLSX) await carregaScript('xlsx.full.min.js'); const wb = XLSX.utils.book_new();
    const add = (rows, nm) => { if (!rows.length) return; const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.min(60, Math.max(k.length, ...rows.map(l => String(l[k] ?? '').length)) + 2) })); XLSX.utils.book_append_sheet(wb, ws, nm); };
    add(resumo, 'Resumo'); add(linhas, 'O.S.'); add(itens, 'Itens LPU');
    baixar(new File([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], nome + '.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); toast(`${L.length} O.S. exportada(s).`);
  } catch (e) { const csv = '\ufeff' + [Object.keys(linhas[0]), ...linhas.map(Object.values)].map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n'); baixar(new File([csv], nome + '.csv', { type: 'text/csv' })); }
}
async function biosPdf() {
  const A = S.adm, L = biosFiltradas(); if (!L.length) { toast('Nenhuma O.S. para exportar.'); return; }
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' }); const logo = await logoData();
  if (logo) doc.addImage(logo, 'JPEG', 12, 8, 30, 18); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(20); doc.text('BI das O.S.' + (S.biosEt ? ' · ' + BIOS_LB[S.biosEt] : ''), 48, 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90); doc.text(`Período ${fDM(A.de)} a ${fDM(A.ate)}${A.tec ? ' · ' + ((A.tecnicos || []).find(t => t.uid === A.tec) || {}).nome : ''} · gerado em ${fDH(Date.now())} por ${(Nuvem.admin || {}).nome || ''}`, 48, 22);
  doc.autoTable({ startY: 30, theme: 'grid', styles: { fontSize: 8.5, cellPadding: 1.6 }, headStyles: { fillColor: [14, 42, 59] }, margin: { left: 12, right: 12 }, head: [BIOS_ET.map(e => e[1])], body: [BIOS_ET.map(([k]) => String(L.filter(x => x.et === k).length))] });
  const T = biosTabela(L); const cols = ['Criada', 'O.S.', 'Tipo', 'Técnico', 'Situação', 'Detalhe', 'Finalizada', 'Tempo (h:mm)', 'SLA', 'Valor (R$)'];
  doc.autoTable({ startY: doc.lastAutoTable.finalY + 6, theme: 'grid', styles: { fontSize: 7.5, cellPadding: 1.4 }, headStyles: { fillColor: [14, 42, 59] }, margin: { left: 12, right: 12 }, head: [cols], body: T.map(r => cols.map(c => c === 'Valor (R$)' ? (r[c] ? fBRL(r[c]) : '') : String(r[c] ?? ''))),
    didParseCell: d => { if (d.section === 'body' && d.column.index === 8 && d.cell.raw === 'fora do SLA') d.cell.styles.textColor = [190, 30, 30]; } });
  const tot = L.reduce((t, x) => t + (+x.valor || 0), 0); doc.setFontSize(9); doc.setTextColor(20); doc.text(`${L.length} O.S. · valor total ${fBRL(tot)}`, 12, doc.lastAutoTable.finalY + 6);
  baixar(new File([doc.output('blob')], `BI_OS_${A.de}_a_${A.ate}${S.biosEt ? '_' + S.biosEt : ''}.pdf`, { type: 'application/pdf' }));
}
/* ---------- Configurações › Remanejar O.S.: trocar o técnico e/ou o dia das O.S. que ainda não começaram ---------- */
const remAbertas = () => [...((S.atvsAdm || new Map()).values())].filter(a => ['pendente', 'recebida', 'pausada'].includes(a.status)).sort((x, y) => agendaDe(x).localeCompare(agendaDe(y)) || x.criado - y.criado);
function viewAdmRemanejar() {
  const tecs = (S.adm.tecnicos || []).slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome))); const q = normLocal(S.remBusca || ''); const ft = S.remTec || '';
  const L = remAbertas().filter(a => (!ft || (ft === '__sem' ? !a.tecnicoUid : a.tecnicoUid === ft)) && (!q || normLocal(`${a.ticket} ${a.tecnicoNome} ${atvTitulo(a)} ${a.endereco || ''} ${a.refLocal || ''}`).includes(q)));
  const opt = a => `<option value="">Sem técnico (fila)</option>${tecs.map(t => `<option value="${esc(t.uid)}" ${a.tecnicoUid === t.uid ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}`;
  return `<section class="card"><h2>Remanejar O.S.</h2><p class="muted small" style="margin:0">Troque o técnico e/ou o dia das O.S. que ainda não começaram (pendentes, entregues ou pausadas). Trocando o técnico, o novo recebe a O.S. com alarme e o anterior deixa de vê-la. Os pedidos de remanejamento feitos pelos técnicos continuam chegando no aviso do painel.</p>
    <div class="grid2"><div class="field"><label class="lb" for="remBusca">Buscar</label><input type="search" id="remBusca" value="${esc(S.remBusca || '')}" placeholder="Ticket, técnico ou endereço"></div>
    <div class="field"><label class="lb" for="remTec">Técnico atual</label><select id="remTec"><option value="">Todos</option><option value="__sem" ${ft === '__sem' ? 'selected' : ''}>Sem técnico (fila)</option>${tecs.map(t => `<option value="${esc(t.uid)}" ${ft === t.uid ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div></div></section>
  ${L.length ? L.map(a => `<section class="card" data-rem="${esc(a.id)}" style="gap:8px"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><b>${esc(a.ticket || 'Sem ticket')} · ${esc(tipoAtvLb(a))}</b><span class="pill ${a.status === 'pausada' ? 'draft' : 'ok'}">${esc(stAtv(a))}</span></div>
    <span class="muted small">${esc(a.tecnicoNome || 'Sem técnico')} · agendada para ${esc(fDiaCurto(agendaDe(a)))}${a.endereco || a.refLocal ? ' · ' + esc(a.endereco || a.refLocal) : ''}${(a.remanejos || []).length ? ` · já remanejada ${a.remanejos.length}x` : ''}</span>
    <div class="grid3" style="align-items:end"><div class="field"><label class="lb" for="rt_${esc(a.id)}">Novo técnico</label><select id="rt_${esc(a.id)}" data-remtec>${opt(a)}</select></div><div class="field"><label class="lb" for="rd_${esc(a.id)}">Novo dia</label><input type="date" id="rd_${esc(a.id)}" data-remdia value="${esc(agendaDe(a))}"></div><button type="button" class="btn pri" data-remok="${esc(a.id)}">Remanejar</button></div></section>`).join('') : '<section class="card"><p class="empty">Nenhuma O.S. para remanejar.</p></section>'}`;
}
function afterAdmRemanejar() {
  const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  let t; $('#remBusca').addEventListener('input', e => { S.remBusca = e.target.value; clearTimeout(t); t = setTimeout(() => { re(); const i = $('#remBusca'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 300); });
  $('#remTec').onchange = e => { S.remTec = e.target.value; re(); };
  $$('[data-remok]').forEach(b => b.onclick = async () => {
    const a = (S.atvsAdm || new Map()).get(b.dataset.remok); if (!a) { toast('O.S. não encontrada (atualize o painel).'); return; }
    const box = b.closest('[data-rem]'); const uid = $('[data-remtec]', box).value, dia = $('[data-remdia]', box).value;
    const novoTec = uid !== (a.tecnicoUid || ''), novoDia = dia && dia !== agendaDe(a);
    if (!novoTec && !novoDia) { toast('Escolha outro técnico ou outro dia.'); return; }
    const t = (S.adm.tecnicos || []).find(x => x.uid === uid); const quem = (Nuvem.admin || {}).nome || 'Supervisor';
    const txt = [novoTec ? `técnico: ${a.tecnicoNome || 'sem técnico'} → ${t ? t.nome : 'sem técnico (fila)'}` : '', novoDia ? `dia: ${fDiaCurto(agendaDe(a))} → ${fDiaCurto(dia)}` : ''].filter(Boolean).join('\n');
    if (!confirm(`Remanejar a O.S. ${a.ticket || ''}?\n\n${txt}`)) return;
    const nv = { ...a };
    if (novoTec) { nv.tecnicoUid = uid || null; nv.tecnicoNome = t ? t.nome : ''; nv.status = 'pendente'; nv.recebidaEm = null; nv.vistaEm = null; nv.atualizacoes = [...(a.atualizacoes || []), { ts: Date.now(), sit: 'remanejo', txt: `Remanejada de ${a.tecnicoNome || 'sem técnico'} para ${t ? t.nome : 'a fila'}`, por: quem }].slice(-60); }
    if (novoDia) { nv.agendaDia = dia; nv.remanejos = [...(a.remanejos || []), { de: agendaDe(a), para: dia, por: quem, em: Date.now() }].slice(-20); }
    b.disabled = true; b.textContent = 'Salvando…';
    try { const r = await Nuvem.atvSalvar(nv); if (r) S.atvsAdm.set(r.id, r); Nuvem.avisaFuncao(); toast(`O.S. ${a.ticket || ''} remanejada${novoTec ? ' para ' + (t ? t.nome : 'a fila') : ''}${novoDia ? ' · ' + fDiaCurto(dia) : ''}.`, 5000); re(); }
    catch (e) { toast('Erro ao remanejar: ' + (e.message || e), 6000); b.disabled = false; b.textContent = 'Remanejar'; }
  });
}
