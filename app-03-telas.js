// Técnico Plus - Multivale · navegação e telas do técnico (etapas da O.S.)
// Os arquivos app-*.js carregam em ordem (ver index.html) e compartilham o mesmo escopo global.
'use strict';
/* ============================ navegação e render ============================ */
function go(v) { if (ADMIN && typeof ehAlmox === 'function' && ehAlmox() && !['admMat', 'admLogin'].includes(v)) v = 'admMat'; S.view = v; window.scrollTo(0, 0); render(); }
const TOPO = ['home', 'eventos', 'producao', 'veiculo', 'materiais', 'relatorios', 'rotas', 'perfil'];
const ADM_TOPO = ['adm', 'admMed', 'admBi', 'admCalor', 'admEquipe', 'admLote', 'admMat', 'admPrev', 'admProj', 'admCal', 'admSla', 'admAtivo', 'admFusao'];
function menu(abrir) {
  $('#drawer').hidden = !abrir; $('#scrim').hidden = !abrir; $('#btnMenu').setAttribute('aria-expanded', abrir);
  if (!abrir) return;
  if (ADMIN) { const n = (Nuvem.admin && Nuvem.admin.nome) || 'Supervisor'; $('#dAv').innerHTML = avIn((Nuvem.admin || {}).foto, n); $('#dAv').title = 'Toque para trocar sua foto'; $('#dAv').style.cursor = 'pointer'; $('#dNome').textContent = n; $('#dSub').textContent = ({ gestor: 'Gestor', supervisor: 'Supervisor' })[(Nuvem.admin || {}).papel] || 'Supervisor'; }
  else { $('#dAv').innerHTML = S.perfil.nome ? avIn(S.perfil.foto, S.perfil.nome) : '?'; $('#dNome').textContent = S.perfil.nome || 'Perfil não criado';
  $('#dSub').textContent = S.perfil.matricula ? 'Matrícula ' + S.perfil.matricula : 'Toque em Meu perfil para criar'; }
  $$('.navi[data-nav]').forEach(b => b.setAttribute('aria-current', b.dataset.nav === S.view ? 'page' : 'false'));
  const f = $('.navi[aria-current="page"]') || $('#navHome') || $('#drawer .navi'); f && f.focus();
}
$('#btnMenu').onclick = () => menu(true); $('#scrim').onclick = () => menu(false);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#drawer').hidden) { menu(false); $('#btnMenu').focus(); } });
$$('.navi[data-nav]').forEach(b => b.onclick = () => { menu(false); go(b.dataset.nav); });
$('#navSync').onclick = () => { menu(false); if (Nuvem.ativo()) { Nuvem.processar(); toast('Sincronizando com a nuvem…'); } else toast('Nuvem não configurada. Tudo fica salvo neste celular.'); };
$('#btnBack').onclick = () => { if (S.view === 'evento') { go(S.evVolta || 'eventos'); return; } if (ADMIN && S.view === 'rota') { go(S.voltaRota || 'admRotasV'); return; } if (ADMIN && S.voltaPara && S.view === 'admAtv') { const v = S.voltaPara; S.voltaPara = null; go(v); return; } if (!ADMIN) saveInsp(true); S.insp = null; go(ADMIN ? (S.view === 'adm' || S.view === 'admMed' ? admInicio() : S.medVolta && S.view !== 'admBi' ? 'admMed' : admInicio()) : S.view === 'rota' ? 'rotas' : 'home'); };

function render() {
  try { sosFixo(); } catch (e) {}
  if (S.map) { try { S.map.remove(); } catch (e) {} S.map = null; }
  if (S.mapVivo) { try { S.mapVivo.remove(); } catch (e) {} S.mapVivo = null; }
  const app = $('#app'); const inicio = ADMIN ? admInicio() : 'home'; const topo = ADMIN ? (!RESTRITO && ADM_TOPO.includes(S.view)) : TOPO.includes(S.view); $('#btnMenu').hidden = !topo; $('#btnBack').hidden = topo || S.view === inicio || S.view === 'admLogin'; if (S.mapCalor) { try { S.mapCalor.remove(); } catch (e) {} S.mapCalor = null; }
  if (ACION && S.view !== 'admLogin' && S.view !== 'acion') S.view = 'acion';
  if (NOC && S.view !== 'admLogin' && S.view !== 'noc') S.view = 'noc';
  if (S.view === 'noc') { app.innerHTML = viewNoc(); setBar(''); $('#topTitle').textContent = 'NOC · liberações'; $('#topSub').textContent = (Nuvem.admin || {}).nome || ''; afterNoc(); return; }
  if (S.view === 'acion') { app.innerHTML = viewAcion(); setBar(''); $('#topTitle').textContent = 'Acionamentos Claro'; $('#topSub').textContent = `${(Nuvem.admin && Nuvem.admin.nome) || ''} · ${fData(Date.now())}`; afterAcion(); return; }
  if (S.view === 'admLogin') { app.innerHTML = viewAdmLogin(); setBar(''); $('#topTitle').textContent = ACION ? 'Acionamentos Claro' : NOC ? 'NOC' : 'Painel do supervisor'; $('#topSub').textContent = 'Técnico Plus - Multivale'; afterAdmLogin(); return; }
  if (S.mapAtv) { try { S.mapAtv.remove(); } catch (e) {} S.mapAtv = null; }
  if (S.view === 'admEquipe') { app.innerHTML = viewAdmEquipe(); setBar(''); $('#topTitle').textContent = 'Equipe e cadastros'; $('#topSub').textContent = 'Técnicos, técnicos de fibra e fiscais de campo'; afterAdmEquipe(); return; }
  if (S.view === 'admCalor') { app.innerHTML = viewAdmCalor(); setBar(''); $('#topTitle').textContent = 'Mapa de calor'; $('#topSub').textContent = `Executadas ${fDM(S.adm.de)} a ${fDM(S.adm.ate)} · pendentes e em andamento agora`; afterAdmCalor(); return; }
  if (S.view === 'admBackup') { app.innerHTML = viewAdmBackup(); setBar(''); $('#topTitle').textContent = 'Backup e armazenamento'; $('#topSub').textContent = 'Cópia do banco e uso do plano'; afterAdmBackup(); pintaLimites(); return; }
  if (S.view === 'admFusao') { app.innerHTML = viewAdmFusao(); setBar(''); $('#topTitle').textContent = 'Mapa de fusão'; $('#topSub').textContent = 'Plano interativo, diagrama linear e book de dados'; afterAdmFusao(); pintaLimites(); return; }
  if (S.view === 'admAtivo') { app.innerHTML = viewAdmAtivo(); setBar(''); $('#topTitle').textContent = 'Histórico de ativos'; $('#topSub').textContent = 'Caixas, nodes e endereços'; afterAdmAtivo(); pintaLimites(); return; }
  if (S.view === 'admSla') { app.innerHTML = viewAdmSla(); setBar(''); $('#topTitle').textContent = 'Indicadores e SLA'; $('#topSub').textContent = 'Prazos, tempo de resposta e MTTR'; afterAdmSla(); pintaLimites(); return; }
  if (S.view === 'admCal') { app.innerHTML = viewAdmCal(); setBar(''); $('#topTitle').textContent = 'Calendário de recursos'; $('#topSub').textContent = 'Escala, plantões e regiões'; afterAdmCal(); pintaLimites(); return; }
  if (S.view === 'admProj') { app.innerHTML = viewAdmProj(); setBar(''); $('#topTitle').textContent = 'Centro de custo'; $('#topSub').textContent = 'Projetos, equipes e resultado'; afterAdmProj(); pintaLimites(); return; }
  if (S.view === 'admRotasV') { app.innerHTML = viewAdmRotas(); setBar(''); $('#topTitle').textContent = 'Rotas do cabo (KMZ)'; $('#topSub').textContent = `${(S.rotas || []).length} rota(s) cadastrada(s)`; afterAdmRotas(); pintaLimites(); return; }
  if (S.view === 'admPrev') { app.innerHTML = viewAdmPrev(); setBar(''); $('#topTitle').textContent = 'Preventivas do mês'; $('#topSub').textContent = 'Relatório consolidado por backbone'; afterAdmPrev(); pintaLimites(); return; }
  if (S.view === 'admMat') { app.innerHTML = viewAdmMat(); setBar(''); $('#topTitle').textContent = 'Almoxarifado'; $('#topSub').textContent = 'Materiais, saídas e saldos dos técnicos'; afterAdmMat(); pintaLimites(); return; }
  if (S.view === 'admLote') { app.innerHTML = viewAdmLote(); setBar(''); $('#topTitle').textContent = 'Importar O.S. em lote'; $('#topSub').textContent = 'O.S. pendentes de execução'; afterAdmLote(); return; }
  if (S.view === 'admMed') { app.innerHTML = viewAdmMed(); setBar(''); $('#topTitle').textContent = 'Medição'; $('#topSub').textContent = `${Nuvem.admin.nome || ''} · ${fDM(S.adm.de)} a ${fDM(S.adm.ate)}`; afterAdmMed(); pintaLimites(); return; }
  if (S.view === 'admBi') { app.innerHTML = viewAdmBi(); setBar(''); $('#topTitle').textContent = 'Produção (BI)'; $('#topSub').textContent = `${S.perfil.nome} · ${S.adm.de.split('-').reverse().join('/')} a ${S.adm.ate.split('-').reverse().join('/')}`; afterAdmBi(); return; }
  if (S.view === 'admAtv') { app.innerHTML = viewAdmAtv(S.atvEdit); setBar(''); $('#topTitle').textContent = S.atvEdit._novo ? 'Nova atividade' : 'Atividade ' + (S.atvEdit.ticket || ''); $('#topSub').textContent = 'Despacho para o técnico'; afterAdmAtv(); return; }
  if (S.view === 'adm') { app.innerHTML = viewAdm(); setBar(''); $('#topTitle').textContent = 'Painel do supervisor'; $('#topSub').textContent = `${S.perfil.nome} · ${S.adm.de.split('-').reverse().join('/')} a ${S.adm.ate.split('-').reverse().join('/')}`; afterAdm(); return; }
  if (S.view === 'home') { app.innerHTML = viewHome(); setBar(S.ronda ? `${atvEmCurso() ? '<button class="btn" id="bUpd" style="flex:0 0 auto">Atualizar O.S.</button>' : ''}<button class="btn go" id="bNova">${ICON.pin}${botaoChegada(S.ronda)}</button>` : ''); $('#topTitle').textContent = 'Atividades'; $('#topSub').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }); afterHome(); }
  else if (S.view === 'materiais') { app.innerHTML = viewMateriais(); setBar(''); $('#topTitle').textContent = 'Meus materiais'; $('#topSub').textContent = 'Saldo e baixas'; afterMateriais(); }
  else if (S.view === 'veiculo') { app.innerHTML = viewVeiculo(); setBar(''); $('#topTitle').textContent = 'Meu veículo'; $('#topSub').textContent = 'Abastecimentos e consumo'; afterVeiculo(); }
  else if (S.view === 'producao') { app.innerHTML = viewProducao(); setBar(''); $('#topTitle').textContent = 'Minha produção'; $('#topSub').textContent = 'Valores da LPU · metas da dupla'; afterProducao(); }
  else if (S.view === 'eventos') { app.innerHTML = viewEventos(); setBar(''); $('#topTitle').textContent = 'Histórico de eventos'; $('#topSub').textContent = 'Inspeções e corretivas da equipe'; afterEventos(); }
  else if (S.view === 'evento') { app.innerHTML = viewEvento(S.evView); setBar(''); $('#topTitle').textContent = isSite(S.evView) ? siteTitulo(S.evView) : isCorr(S.evView) ? 'Corretiva · Ticket ' + (S.evView.corr.ticket || '—') : 'Caixa ' + (S.evView.info.tag || '—'); $('#topSub').textContent = fDH(S.evView.chegada) + (S.evView._doEquipe ? ' · ' + (S.evView.info.tecnico || S.evView._tecnico || 'outro técnico') : ''); afterEvento(); }
  else if (S.view === 'rotas') { app.innerHTML = viewRotas(); setBar(''); $('#topTitle').textContent = 'Rotas do cabo'; $('#topSub').textContent = `${(S.rotas || []).length} rota(s) cadastrada(s)`; afterRotas(); }
  else if (S.view === 'insp') { app.innerHTML = viewInsp(); $('#topTitle').textContent = isSite(S.insp) ? siteTitulo(S.insp) : isCorr(S.insp) ? 'Corretiva · Ticket ' + (S.insp.corr.ticket || '—') : isImpl(S.insp) ? (IMPL_SERV[S.insp.impl.servico] || 'Implantação') + ' · ' + (S.insp.impl.designacao || '') : isVist(S.insp) ? VIST_TIPOS[S.insp.vist.tipo] || 'Registro da vistoria' : S.insp.info.tag ? 'Caixa ' + S.insp.info.tag : 'Nova inspeção'; $('#topSub').textContent = `${ST()[S.step][1]} · ${S.step + 1} de ${ST().length}`; barInsp(); afterInsp(); }
  else if (S.view === 'entrar') { app.innerHTML = viewEntrar(); setBar(''); $('#topTitle').textContent = 'Técnico Plus - Multivale'; $('#topSub').textContent = 'Entrar'; $('#btnMenu').hidden = true; $('#btnBack').hidden = true; afterEntrar(); }
  else if (S.view === 'perfil') { app.innerHTML = viewPerfil(); setBar(''); $('#topTitle').textContent = 'Perfil do técnico'; $('#topSub').textContent = 'Fica salvo neste celular'; afterPerfil(); }
  else if (S.view === 'relatorios') { app.innerHTML = viewRelatorios(); setBar(''); $('#topTitle').textContent = 'Meus relatórios'; $('#topSub').textContent = 'Inspeções e rondas salvas neste celular'; afterRelatorios(); }
  else if (S.view === 'rota') { app.innerHTML = viewRotaForm(S.rotaEdit); setBar(''); $('#topTitle').textContent = S.rotaEdit._novo ? 'Nova rota' : 'Rota ' + S.rotaEdit.codigo; $('#topSub').textContent = 'Cadastro e traçado do cabo'; afterRota(); }
  else if (S.view === 'ronda') { app.innerHTML = viewRonda(S.rondaView); setBar(''); $('#topTitle').textContent = isCorr(S.rondaView) ? 'Resumo da corretiva' : 'Resumo da ronda'; $('#topSub').textContent = fDH(S.rondaView.inicio); afterRonda(); }
}
function setBar(html) { $('#bar').hidden = !html; $('#barIn').innerHTML = html; }

/* ---------- home ---------- */
function gpsChip() { const g = S.gps; const c = g.status === 'ok' ? 'ok' : g.status === 'weak' || g.status === 'wait' ? 'weak' : g.status === 'err' ? 'err' : ''; return `<div class="gps ${c}" id="gpsChip" role="status"><span class="dot"></span><span>${esc(g.msg)}</span></div>`; }
function hojeTxt() { const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }); return t.charAt(0).toUpperCase() + t.slice(1); }
function viewHome() {
  const r = S.ronda;
  let h = '';
  if (!r) {
    const temPerfil = S.perfil.nome && S.perfil.matricula;
    h += `<div class="banner" id="atvBanner" ${Alarme.ativo && $('#atvAlerta').hidden ? '' : 'hidden'}><span>Atividade aguardando início do deslocamento</span><button type="button" class="btn" id="bVerAtv">Ver</button></div>`;
    h += `<section class="rhead"><div class="rh1"><span class="av">${temPerfil ? avIn(S.perfil.foto, S.perfil.nome) : '?'}</span><span class="tx"><b>${temPerfil ? esc(S.perfil.nome) : 'Técnico'}</b><span>${temPerfil ? 'Matrícula ' + esc(S.perfil.matricula) + (veicTxt(veicPerfil()) ? ' · ' + esc(veicTxt(veicPerfil())) : '') : 'Perfil não criado'}</span></span><span class="pill" style="background:var(--surface-2);color:var(--muted)">${S.exp ? 'Disponível' : 'Fora do expediente'}</span></div>
      ${S.exp ? expBarHtml(true) : temPerfil ? `<div class="expbar"><button type="button" class="btn go block" id="bExpIni">${ICON.play}Iniciar expediente</button><span class="muted small">Jornada ${jornada().inicio}–${jornada().fim}</span></div>` : ''}</section>`;
    h += meusTreinosAviso(); h += minhasAtvHtml(); h += minhaEscalaHtml();
    if (!temPerfil) h += `<section class="card"><div class="warnbox">Crie seu perfil (nome e matrícula) antes da primeira ronda. Fica salvo neste celular.</div><button type="button" class="btn pri block" id="bCriaPerfil">Criar meu perfil</button></section>`;
    const ap = S.atvPend ? S.atvs.get(S.atvPend) : null; const fiscal = S.perfil.funcao === 'fiscal'; const emCurso = atvEmCurso();
    const MP = modosPermitidos(); if (!ap && !MP.includes(S.modo)) S.modo = MP[0];
    const M = S.modo || 'preventiva'; S.im = S.im || { servico: 'roteamento' }; S.vi = S.vi || { objetivo: 'Vistoria de rota' };
    const TIT = { corretiva: 'Iniciar corretiva', implantacao: 'Iniciar designação implantação', vistoria: 'Iniciar vistoria de rota', preventiva: 'Ativar rota', conjunta: 'Iniciar conjunta de site' };
    h += `<section class="card"><h2>${TIT[M]}</h2>
      ${ap ? `<div class="warnbox" style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><span>Atendendo: <b>${esc(atvTitulo(ap))}</b> ${logTag(ap.log)}</span><button type="button" class="lnk" id="bAtvSolta">Trocar</button></div>${distOSHtml(ap)}` : ''}
      ${ap || MP.length < 2 ? '' : `<div class="seg${MP.length > 3 ? ' seg4' : ''}" role="group" aria-label="Tipo de atividade">${MP.map(k => `<button type="button" data-modo="${k}" aria-pressed="${M === k}">${{ preventiva: 'Preventiva', conjunta: 'Conjunta de site', corretiva: 'Corretiva', implantacao: 'Implantação', vistoria: 'Vistoria' }[k]}</button>`).join('')}</div>`}
      <p class="muted small" style="margin:0">${{ corretiva: 'O app registra o deslocamento até o local. Chegando, toque em "Encontrei o ponto da corretiva".', implantacao: 'Expansão 5G e interligação de sites. O app registra o deslocamento e cada ponto de trabalho com relatório e fotos.', vistoria: 'Registra seu deslocamento, a retirada de chaves, o acompanhamento das atividades com evidências e o diário da vistoria.', preventiva: 'O app registra o deslocamento até a primeira caixa e depois a rota do cabo entre as caixas. O ticket da atividade é gerado automaticamente.', conjunta: 'Conjunta no site do backbone com o técnico do provedor parceiro. O app gera o ticket, registra o deslocamento e, no site, você preenche as fibras trabalhadas (origem x destino) com as potências TX e RX, as fotos e os dados de quem acompanhou. Depois o supervisor anexa as curvas do OTDR.' }[M]}</p>
      ${M === 'implantacao' ? `<div class="grid2"><div class="field full"><label class="lb" for="im_des">Designação <span class="req">*</span></label><input type="text" id="im_des" data-im="designacao" value="${esc(S.im.designacao || '')}" placeholder="Ex.: DES-5G-0001" autocapitalize="characters"></div>
        <div class="field full"><label class="lb" for="im_serv">Serviço</label><select id="im_serv" data-im="servico">${Object.entries(IMPL_SERV).map(([k, l]) => `<option value="${k}" ${S.im.servico === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        ${selAdd('im_proj', 'projetoImpl', S.im.projeto || '', 'Projeto', 'data-imsel="projeto"', true)}
        <div class="field"><label class="lb" for="im_sa">Site A</label><input type="text" id="im_sa" data-im="siteA" value="${esc(S.im.siteA || '')}" placeholder="ID do site" autocapitalize="characters"></div><div class="field"><label class="lb" for="im_sb">Site B</label><input type="text" id="im_sb" data-im="siteB" value="${esc(S.im.siteB || '')}" placeholder="ID do site" autocapitalize="characters"></div></div>` : ''}
      ${M === 'preventiva' || M === 'conjunta' ? (() => { const tp = S.tkParc || (ap && ap.tkParc) || []; return `<div class="grid2"><div class="field full" style="margin-bottom:-6px"><span class="lb">Ticket interno</span><span class="muted small">${ap && ap.ticket ? '<b>' + esc(ap.ticket) + '</b> (da O.S.)' : `Gerado automaticamente ao iniciar: ${M === 'conjunta' ? 'CONJ' : 'PREV'}-rota-data-iniciais-nº`}</span></div><div class="field"><label class="lb" for="rd_tp1">Ticket do parceiro 1</label><input type="text" id="rd_tp1" data-tkp="0" value="${esc(tp[0] || '')}" placeholder="Opcional" autocapitalize="characters"></div><div class="field"><label class="lb" for="rd_tp2">Ticket do parceiro 2</label><input type="text" id="rd_tp2" data-tkp="1" value="${esc(tp[1] || '')}" placeholder="Opcional" autocapitalize="characters"></div></div>`; })() : ''}
      ${M === 'vistoria' ? `<div class="field"><label class="lb" for="vi_obj">Objetivo</label><select id="vi_obj" data-vi="objetivo">${['Vistoria de rota', 'Acompanhamento de equipe', 'Fiscalização de implantação', 'Fiscalização de corretiva', 'Outro'].map(o => `<option ${S.vi.objetivo === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>` : ''}
      ${S.modo === 'corretiva' ? `<div class="grid2"><div class="field full"><label class="lb" for="cr_ticket">Nº do ticket</label><input type="text" id="cr_ticket" data-cr="ticket" value="${esc((S.cr || {}).ticket || '')}" placeholder="Deixe em branco para gerar automático" autocapitalize="characters"><span class="muted small">Sem ticket, o app cria um número automático (ex.: COR-${String(new Date().getFullYear()).slice(2)}${pad2(new Date().getMonth() + 1)}${pad2(new Date().getDate())}-${esc(iniciais(S.perfil.nome))}-001).</span></div>
        <div class="field full"><label class="lb" for="cr_ocorr">Tipo de ocorrência</label><select id="cr_ocorr" data-cr="ocorrencia"><option value="">Selecione…</option>${OCORR.map(o => `<option ${(S.cr || {}).ocorrencia === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
        <details class="field full" id="crMais" ${S.crMais || (S.cr || {}).refKm || (S.cr || {}).descricao ? 'open' : ''}><summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600;color:var(--accent)">Rota, referência e descrição do chamado (opcional)</summary><div class="grid2">
        <div class="field full"><label class="lb" for="cr_rota">Rota do cabo</label><select id="cr_rota">${rotaOpts(S.perfil.rotaId, S.rotas && S.rotas.length ? 'Sem rota definida' : 'Nenhuma rota cadastrada')}</select></div>
        <div class="field full">${S.perfil.rotaId && rotaById(S.perfil.rotaId) ? refRotaHtml(rotaById(S.perfil.rotaId), (S.cr || {}).refSentido, (S.cr || {}).refKm, 'cr') : `<span class="lb">Referência informada no ticket</span><div class="row" style="flex-wrap:nowrap;gap:8px;align-items:center"><input type="text" inputmode="decimal" id="cr_refKm" data-cr="refKm" value="${esc((S.cr || {}).refKm || '')}" placeholder="km" aria-label="Distância em km" style="width:84px;text-align:right"><span style="font-weight:600;white-space:nowrap">km de</span><input type="text" id="cr_refLocal" data-cr="refLocal" list="dl_locais0" value="${esc((S.cr || {}).refLocal || '')}" placeholder="Ex.: Itajubá" aria-label="Cidade de referência" style="flex:1;min-width:0"></div><datalist id="dl_locais0">${(S.perfil.refLocais || []).map(l => `<option value="${esc(l)}"></option>`).join('')}</datalist>`}<div id="crProx"></div></div>
        <div class="field full"><label class="lb" for="cr_desc">Descrição do chamado</label><textarea id="cr_desc" data-cr="descricao" placeholder="O que foi informado no ticket" style="min-height:72px">${esc((S.cr || {}).descricao || '')}</textarea></div></div></details></div>` : ''}
      ${!ap && (M === 'preventiva' || M === 'vistoria') ? `<div class="chips" role="group" aria-label="Preventiva conjunta"><button type="button" role="checkbox" id="bConj" aria-checked="${!!S.conjunta}">Conjunta: Multivale + Master (mesmo trajeto)</button></div>` : ''}
      <div class="grid2">${!ap && S.conjunta && (M === 'preventiva' || M === 'vistoria') ? '<div class="field full"><span class="lb">Backbone</span><b>Multivale e Master juntos</b><span class="muted small">Em cada caixa você marca se ela é da Multivale ou da Master. No fim do mês sai um relatório para cada um.</span></div>' : donoHtml('rd', S.perfil.ultDono, S.perfil.ultParc)}
      <div class="field full" ${S.modo === 'corretiva' ? 'hidden' : ''}><label class="lb" for="pf_rota">Rota</label><select id="pf_rota">${rotaOpts(S.perfil.rotaId, S.rotas && S.rotas.length ? 'Sem rota definida' : 'Nenhuma rota cadastrada')}</select></div></div>
      <div class="grid2">${selAdd('st_veic', 'veiculo', S.perfil.veiculoTxt || '', 'Veículo', 'data-pf="veiculoTxt"', true, true)}
      ${ap && ODO_POR === 'os' ? `<div class="field"><label class="lb" for="odoIni">Odômetro inicial (km) <span class="req">*</span></label><input type="text" inputmode="numeric" id="odoIni" value="${esc(S.odoIni || '')}" placeholder="Ex.: 48210"></div>
      <div class="field" style="justify-content:flex-end"><button type="button" class="btn" id="bFotoOdoIni" style="min-height:48px">${ICON.cam}${S.odoFotoIni ? 'Foto ✓' : 'Foto do painel'}</button></div>` : `<p class="muted small field full" style="margin:0">${ODO_POR === 'expediente' ? 'O odômetro é informado só no início e no fim do expediente.' : 'O odômetro é pedido quando você recebe uma O.S. e inicia o deslocamento até ela.'}</p>`}</div>
      <button class="btn go block" id="bIniciar" ${ap && ODO_POR === 'os' && kmNum(S.odoIni) == null ? 'disabled' : ''}>${ICON.play}${ap ? 'Iniciar deslocamento' : TIT[M]}</button>
      ${M === 'preventiva' ? `<button class="btn block" id="bAvulsa">${ICON.plus}Inspeção avulsa (sem rota)</button>` : ''}</section>`;
    h += `<section class="acts"><div class="ah"><span>Concluídas hoje</span><button type="button" class="lnk" id="bVerRel">Ver anteriores</button></div><div id="hist"><p class="empty">Carregando…</p></div></section>`;
    return h;
  }
  const { t } = totais(r); const corr = isCorr(r); const rt = r.rotaId ? rotaById(r.rotaId) : null;
  h += `<div class="banner" id="atvBanner" ${Alarme.ativo && $('#atvAlerta').hidden ? '' : 'hidden'}><span>Nova atividade recebida</span><button type="button" class="btn" id="bVerAtv">Ver</button></div>`;
  h += `<section class="rhead"><div class="rh1"><span class="av" style="background:${corr ? 'var(--st-corr)' : 'var(--st-ini)'};color:#fff">${avIn(S.perfil.foto, r.tecnico || S.perfil.nome)}</span><span class="tx"><b>${corr ? 'Corretiva · Ticket ' + esc(r.ticket) : isImpl(r) ? 'Implantação · ' + esc(r.designacao) : isVist(r) ? 'Vistoria de rota' : isSite(r) ? 'Conjunta de site · ' + esc(r.ticket || '—') : 'Rota ativada' + (r.ticket ? ' · ' + esc(r.ticket) : '')}</b><span>${isImpl(r) ? esc(IMPL_SERV[r.servico] || '') + ' · ' : isVist(r) ? esc(r.objetivo || '') + ' · ' : ''}Desde ${fHora(r.inicio)}${rt ? ' · ' + esc(rt.codigo) : ''}${tkParcTxt(r) ? ' · parceiro ' + esc(tkParcTxt(r)) : ''}${r.dono ? ' · ' + esc(donoLb(r.dono, r.parceiro)) : ''}</span></span><span class="pill ${corr ? 'draft' : 'ok'}">${corr ? 'Em atendimento' : 'Ativa'}</span></div>${r.atvLog ? `<div class="rh2">${logTag(r.atvLog)}</div>` : ''}
    <div class="rh2">${corr && r.ocorrencia ? `<span>Ocorrência: <b>${esc(r.ocorrencia)}</b></span>` : ''}${gpsChip()}</div>
    ${S.exp ? expBarHtml(false) : ''}
    <div class="rstats"><div><b class="clock" id="stDur">${fClock(t.dur)}</b><span>Tempo</span></div><div><b id="stKm">${fKm(t.km)}</b><span>Percorrido</span></div><div><b id="stCx">${t.caixas}</b><span>${corr || isImpl(r) ? 'Pontos' : isVist(r) ? 'Registros' : isSite(r) ? 'Sites' : 'Caixas'}</span></div><div><b id="stVel">${fVel(velAtual())}</b><span>Velocidade</span></div></div></section>
    <div class="warnbox" id="velWarn" hidden style="border-color:var(--bad);background:var(--bad-soft);color:var(--bad);font-weight:700">Acima do limite de ${LIM()} km/h. Reduza a velocidade.</div>
    ${minhasAtvHtml()}
    <div class="tabs" role="tablist" aria-label="Visualização"><button type="button" role="tab" data-htab="lista" aria-selected="${S.homeTab !== 'mapa'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>Lista</button><button type="button" role="tab" data-htab="mapa" aria-selected="${S.homeTab === 'mapa'}">${ICON.pin}Mapa</button></div>`;
  if (S.homeTab === 'mapa') {
    h += `<section class="card" style="padding:0;overflow:hidden;gap:0"><div class="map" id="map" style="height:58vh;min-height:320px;border:0;border-radius:0" role="img" aria-label="Mapa do percurso"></div>
      <div class="legend" style="padding:10px 16px"><span><i style="background:${SEGCOR.desl}"></i>Deslocamento</span><span><i style="background:${SEGCOR.cabo}"></i>Rota do cabo</span><span><i style="background:${SEGCOR.atual}"></i>Trecho atual</span></div></section>
      <div class="warnbox small">Mantenha o app aberto durante a atividade. Com a tela apagada, o celular pode parar de enviar a posição.</div>`;
    return h;
  }
  const ins = [...(r.retomadas || []).map(id => S.inspCache.get(id)), ...r.eventos.filter(e => e.tipo === 'chegada').map(e => S.inspCache.get(e.inspId))].filter(Boolean);
  h += `<section class="acts"><div class="ah"><span>${corr ? 'Pontos atendidos' : isImpl(r) ? 'Pontos da designação' : isVist(r) ? 'Registros da vistoria' : isSite(r) ? 'Sites da conjunta' : 'Atividades da rota'}</span><span class="muted small" style="font-weight:500">${ins.length} ${corr || isImpl(r) ? 'ponto(s)' : isVist(r) ? 'registro(s)' : isSite(r) ? 'site(s)' : 'caixa(s)'}</span></div>
    <div class="act trav"><span class="st"></span><span class="tm">${fHora(r.inicio)}</span><span class="bd"><b>Início · deslocamento</b><span>${[veicTxt(r.veiculo) ? esc(veicTxt(r.veiculo)) : '', kmNum(r.odoIni) != null ? 'Odômetro ' + fOdo(kmNum(r.odoIni)) : ''].filter(Boolean).join(' · ') || '—'}</span></span></div>
    ${ins.map((i, k) => actInsp(i, k + 1)).join('')}
    ${aprPossivel() ? '<div style="padding:8px 16px"><button type="button" class="btn block" id="bAprOpc">🦺 Preencher APR (opcional)</button></div>' : ''}
    <div class="act pend"><span class="st"></span><span class="tm">—</span><span class="bd"><b>${corr ? 'Local da corretiva' : isImpl(r) ? 'Próximo ponto de trabalho' : isVist(r) ? 'Próximo registro' : isSite(r) ? 'Site da conjunta' : 'Próxima caixa'}</b><span>${isVist(r) ? 'Toque em "Novo registro" para retirada de chaves, acompanhamento ou irregularidade' : `Ao chegar, toque em "${botaoChegada(r)}"`}</span></span></div></section>
    ${isVist(r) ? `<section class="card"><h2>Diário da vistoria</h2><div class="field"><label class="lb" for="diarioTxt">Anotação</label><textarea id="diarioTxt" placeholder="O que você viu, com quem falou, o que foi combinado" style="min-height:72px"></textarea></div><button type="button" class="btn block" id="bDiario">${ICON.plus}Anotar no diário</button>
      ${(r.diario || []).length ? `<div class="list">${r.diario.slice().reverse().map(n => `<div class="item" style="cursor:default;align-items:flex-start"><span class="badge" style="font-size:12px">${fHora(n.ts)}</span><span class="tx"><span style="white-space:pre-wrap;color:var(--ink);font-size:14.5px">${esc(n.txt)}</span></span></div>`).join('')}</div>` : '<p class="muted small" style="margin:0">Nenhuma anotação ainda.</p>'}</section>` : ''}
    <section class="card"><h2>Foto da rede no trecho</h2>${r.dono === 'conjunta' ? `<div class="seg" role="group" aria-label="Backbone da foto"><button type="button" data-conjrede="multivale" aria-pressed="${S.donoConj !== 'master'}">Multivale</button><button type="button" data-conjrede="master" aria-pressed="${S.donoConj === 'master'}">Master</button></div>` : ''}${chipsHtml(CATS_REDE, S.fotoCatRede || CATS_REDE[0])}<button class="btn block" id="bFotoRede">${ICON.cam}Tirar foto · ${esc(S.fotoCatRede || CATS_REDE[0])}</button><span class="muted small" id="redeCount">${(S.redeFotos || []).length} foto(s) da rede nesta ronda</span></section>
    <section class="card"><h2>${corr ? 'Encerrar corretiva' : isImpl(r) ? 'Encerrar designação' : isVist(r) ? 'Encerrar vistoria' : isSite(r) ? 'Encerrar conjunta' : 'Encerrar rota'}</h2>
      ${corr ? liberaHtml(r) : ''}
      ${kmNum(r.odoIni) != null ? `<div class="grid2"><div class="field"><label class="lb" for="odoFim">Odômetro final (km) <span class="req">*</span></label><input type="text" inputmode="numeric" id="odoFim" value="${esc(r.odoFim || '')}" placeholder="Ao encerrar"></div>
      <div class="field" style="justify-content:flex-end"><button type="button" class="btn" id="bFotoOdoFim" style="min-height:48px">${ICON.cam}${r.odoFotoFim ? 'Foto ✓' : 'Foto do painel'}</button></div>
      <span class="muted small field full">Inicial: ${fOdo(kmNum(r.odoIni))}${veicTxt(r.veiculo) ? ' · ' + esc(veicTxt(r.veiculo)) : ''}</span></div>` : ''}
      <div class="row"><button class="btn" id="bVerRonda">Ver resumo</button><button class="btn stop" id="bEncerrar">${ICON.stop}${corr ? 'Encerrar corretiva' : isImpl(r) ? 'Encerrar designação' : isVist(r) ? 'Encerrar vistoria' : isSite(r) ? 'Encerrar conjunta' : 'Encerrar rota'}</button></div></section>`;
  return h;
}
function botaoChegada(r) { return isSite(r) ? 'Cheguei no site' : isCorr(r) ? 'Encontrei o ponto da corretiva' : isImpl(r) ? 'Cheguei no ponto · novo relatório' : isVist(r) ? 'Novo registro da vistoria' : 'Cheguei na caixa'; }
function actInsp(i, n) {
  const nc = Object.values(i.check || {}).filter(v => v === 'NC').length; const corr = isCorr(i); const conc = i.status === 'concluida';
  const cls = !conc ? 'ini' : nc ? 'nc' : corr ? 'corr' : 'done';
  const st = !conc ? (corr ? 'Em atendimento' : 'Iniciada') : nc ? nc + ' N/C' : 'Concluída';
  const tit = isSite(i) ? siteTitulo(i) : corr ? 'Corretiva · Ticket ' + (i.corr.ticket || '—') : isImpl(i) ? (IMPL_SERV[i.impl.servico] || 'Implantação') + (usaImpl(i, 'caixa') && i.info.tag ? ' · ' + i.info.tag : '') : isVist(i) ? (VIST_TIPOS[i.vist.tipo] || 'Registro') : (i.info.tag || 'Sem TAG');
  const sub = isSite(i) ? [i.site.parc.nome ? 'com ' + i.site.parc.nome + (i.site.parc.empresa ? ' (' + i.site.parc.empresa + ')' : '') : 'Técnico do parceiro não informado', siteFibOk(i).length + ' fibra(s)', conc && curvasFaltam(i).length ? 'aguardando curvas OTDR' : ''].filter(Boolean).join(' · ') : corr ? (i.corr.ocorrencia || 'Ocorrência não informada') + (refTxt(i) ? ' · ' + refTxt(i) : '') : isVist(i) ? (i.vist.descricao || 'Sem descrição').slice(0, 90) : isImpl(i) ? [i.impl.designacao, i.info.endereco].filter(Boolean).join(' · ') || 'Endereço não preenchido' : (i.info.endereco || 'Endereço não preenchido');
  return `<button type="button" class="act ${cls}" data-open="${i.id}"><span class="st"></span><span class="tm">${fHora(i.chegada)}<span>${conc && i.saida ? fHora(i.saida) : conc ? '' : 'agora'}</span></span><span class="bd"><b>${n ? n + '. ' : ''}${esc(tit)}</b><span>${esc(sub)}</span></span><span class="ic">${valorOS(i) ? `<span class="pill ok">${fBRL(valorOS(i))}</span>` : ''}<span class="pill ${cls === 'nc' ? 'bad' : cls === 'ini' ? 'ok' : 'done'}">${st}</span>${ICON.next}</span></button>`;
}
function viewRotas() {
  return `<section class="acts"><div class="ah"><span>Rotas cadastradas</span><span class="muted small" style="font-weight:500">${(S.rotas || []).length}</span></div>${(S.rotas || []).map(rt => `<button type="button" class="act done" data-rota="${rt.id}"><span class="st"></span><span class="tm">${rt.cap ? esc(rt.cap) + '<span>FO</span>' : '—'}</span><span class="bd"><b>${esc(rt.codigo)}${rt.nome ? ' · ' + esc(rt.nome) : ''}</b><span>${esc(rt.pontaA || '?')} › ${esc(rt.pontaB || '?')}${rt.kml ? ' · traçado ' + fKm(rt.kml.km) : ''}${rt.dono ? ' · ' + esc(donoLb(rt.dono, rt.parceiro)) : ''}</span></span><span class="ic">${ICON.next}</span></button>`).join('') || '<p class="empty">Nenhuma rota cadastrada. Cadastre a rota do cabo ou importe o KMZ do traçado.</p>'}</section>
    <section class="card"><div class="row"><button class="btn" id="bNovaRota">${ICON.plus}Cadastrar rota</button><button class="btn" id="bImpRota">${ICON.pin}Importar KMZ</button></div><input type="file" id="fileRota" accept=".kmz,.kml" hidden></section>`;
}
function afterRotas() {
  $('#bNovaRota').onclick = () => abrirRota(null);
  $('#bImpRota').onclick = () => $('#fileRota').click();
  $('#fileRota').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) importaRotaKmz(f); };
  $$('[data-rota]').forEach(b => b.onclick = () => abrirRota(b.dataset.rota));
}
function itemInsp(i, n) {
  const nc = Object.values(i.check).filter(v => v === 'NC').length;
  const pill = i.status === 'concluida' ? (nc ? `<span class="pill bad">${nc} N/C</span>` : '<span class="pill ok">Concluída</span>') : '<span class="pill draft">Rascunho</span>';
  if (isCorr(i)) return `<button class="item" data-open="${i.id}"><span class="badge" style="background:var(--warn-soft);color:var(--orange)">${n}</span><span class="tx"><b>Corretiva · Ticket ${esc(i.corr.ticket || '—')}</b><span>${fHora(i.chegada)} · ${esc(i.corr.ocorrencia || 'Ocorrência não informada')}${refTxt(i) ? ' · ' + esc(refTxt(i)) : ''}</span></span>${i.status === 'concluida' ? '<span class="pill ok">Concluída</span>' : '<span class="pill draft">Em atendimento</span>'}</button>`;
  return `<button class="item" data-open="${i.id}"><span class="badge">${n}</span><span class="tx"><b>${esc(i.info.tag || 'Sem TAG')}</b><span>${fHora(i.chegada)} · ${esc(i.info.endereco || 'Endereço não preenchido')}</span></span>${pill}</button>`;
}
async function crProx() {
  const box = $('#crProx'); if (!box) return; const c = S.cr || {};
  const comRota = S.perfil.rotaId && c.refSentido; if ((!c.refLocal && !comRota) || kmNum(c.refKm) == null) { box.innerHTML = ''; return; }
  const todos = await eventosHistorico();
  const fake = { id: '_', info: { refLocal: comRota ? '' : c.refLocal, refKm: c.refKm, rotaId: comRota ? S.perfil.rotaId : '', refSentido: c.refSentido || '' }, loc: null };
  const prox = eventosProximos(fake, todos);
  box.innerHTML = prox.length ? `<div class="warnbox small" style="margin-top:6px;display:flex;flex-direction:column;gap:4px"><b>Já houve ${prox.length} evento(s) nessa região:</b>${prox.map(p => `<button type="button" class="lnk" data-verev="${p.e.id}" style="text-align:left;padding:4px 0;min-height:36px">${esc(rotuloEvento(p.e))} · ${fData(p.e.chegada)} · ${esc(refTxt(p.e))} ›</button>`).join('')}</div>` : '';
}
async function afterHome() {
  $('#bAprOpc') && ($('#bAprOpc').onclick = async () => { await carregaMeusTreinos(); abrirAPR(() => render()); });
  limpaFotosLocais().catch(() => {});
  if (!ADMIN && !S.eqpAvisou && Nuvem.on && Nuvem.user) { S.eqpAvisou = true; eqpMeusLer().then(D => { const n = D.eq.filter(e => e.status === 'tecnico' && e.tecnico_uid === Nuvem.user.id && (eqpUltRec(D.mov, e) || { aceite_ts: 1 }).aceite_ts == null).length; if (n) toast(`Você recebeu ${n} equipamento(s): confirme o recebimento no Perfil.`, 8000); }).catch(() => {}); }
  if (!S.treinosOk) carregaMeusTreinos().then(() => { if (S.treinosOk && S.view === 'home' && !S.ronda && !S.trAvisoPint && meusTreinosAviso()) { S.trAvisoPint = true; render(); } }).catch(() => {});
  $$('[data-pf]').forEach(el => el.addEventListener('input', () => { S.perfil[el.dataset.pf] = el.value; DB.put('meta', S.perfil); const ex = $('#tagEx'); if (ex) ex.textContent = tagExemplo(); }));
  $('#bIniciar') && ($('#bIniciar').onclick = iniciarRonda);
  $('#crMais') && ($('#crMais').ontoggle = e => { S.crMais = e.target.open; });
  $$('[data-modo]').forEach(b => b.onclick = () => { S.modo = b.dataset.modo; render(); });
  $('#bConj') && ($('#bConj').onclick = () => { S.conjunta = !S.conjunta; render(); });
  $$('[data-cr]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { S.cr = S.cr || {}; S.cr[el.dataset.cr] = el.value; if (el.dataset.cr === 'refKm' || el.dataset.cr === 'refLocal') crProx(); }));
  crProx();
  $('#cr_rota') && ($('#cr_rota').onchange = e => { S.perfil.rotaId = e.target.value; DB.put('meta', S.perfil); const rt = rotaById(e.target.value); if (rt && rt.dono) { S.perfil.ultDono = rt.dono; S.perfil.ultParc = rt.parceiro || ''; } const y = window.scrollY; render(); window.scrollTo(0, y); });
  $$('[data-crsent]').forEach(b => b.onclick = () => { S.cr = S.cr || {}; S.cr.refSentido = b.dataset.crsent; const y = window.scrollY; render(); window.scrollTo(0, y); });
  $('#cr_refKm') && $('#cr_refKm').addEventListener('change', e => { S.cr = S.cr || {}; S.cr.refKm = e.target.value; const y = window.scrollY; render(); window.scrollTo(0, y); });
  $('#lnkVeic') && ($('#lnkVeic').onclick = e => { e.preventDefault(); go('perfil'); });
  $('#odoIni') && $('#odoIni').addEventListener('input', e => { S.odoIni = e.target.value; const b = $('#bIniciar'); if (b) b.disabled = kmNum(S.odoIni) == null; });
  $('#bFotoOdoIni') && ($('#bFotoOdoIni').onclick = () => { S.fotoMode = 'odoIni'; $('#fileCam').click(); });
  $('#bEditPerfil') && ($('#bEditPerfil').onclick = () => go('perfil')); $('#bCriaPerfil') && ($('#bCriaPerfil').onclick = () => go('perfil'));
  $$('[data-dcorr]').forEach(b => b.onclick = () => { const o = CORR_OPC[b.dataset.dcorr]; S.perfil.ultDono = o[1]; S.perfil.ultParc = o[2]; DB.put('meta', S.perfil); const y = window.scrollY; render(); window.scrollTo(0, y); });
  $$('[data-dono="rd"]').forEach(b => b.onclick = () => { S.perfil.ultDono = S.perfil.ultDono === b.dataset.v ? '' : b.dataset.v; DB.put('meta', S.perfil); const y = window.scrollY; render(); window.scrollTo(0, y); });

  $('#pf_rota') && ($('#pf_rota').onchange = e => { S.perfil.rotaId = e.target.value; const rt = rotaById(e.target.value); if (rt && rt.dono) { S.perfil.ultDono = rt.dono; S.perfil.ultParc = rt.parceiro || ''; } DB.put('meta', S.perfil); const y = window.scrollY; render(); window.scrollTo(0, y); });
  $$('[data-htab]').forEach(b => b.onclick = () => { S.homeTab = b.dataset.htab; render(); });
  $$('[data-im]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { S.im = S.im || {}; S.im[el.dataset.im] = el.value; }));
  $$('[data-tkp]').forEach(el => el.addEventListener('input', () => { const ap0 = S.atvPend ? S.atvs.get(S.atvPend) : null; S.tkParc = S.tkParc || [...((ap0 && ap0.tkParc) || ['', ''])]; S.tkParc[+el.dataset.tkp] = el.value; }));
  $$('[data-vi]').forEach(el => el.addEventListener('change', () => { S.vi = S.vi || {}; S.vi[el.dataset.vi] = el.value; }));
  $$('[data-imsel]').forEach(el => el.addEventListener('change', () => { if (el.value !== '__novo') { S.im = S.im || {}; S.im[el.dataset.imsel] = el.value; } }));
  $('#bExpIni') && ($('#bExpIni').onclick = () => iniciarExpediente());
  $('#bIrPerfil') && ($('#bIrPerfil').onclick = () => go('perfil'));
  $('#bExpFim') && ($('#bExpFim').onclick = encerrarExpediente);
  $$('[data-atv]').forEach(b => b.onclick = () => { const a = S.atvs.get(b.dataset.atv); if (a) mostraAlerta(a); });
  $('#bRefIni') && ($('#bRefIni').onclick = iniciarRefeicao); $('#bRefFim') && ($('#bRefFim').onclick = encerrarRefeicao);
  $('#bVerAtv') && ($('#bVerAtv').onclick = () => { const mo = $('#atvBanner').dataset.motivo; if (mo === 'ref' || mo === 'exp' || mo === 'upd') { mostraAviso(mo); return; } const a = [...S.atvs.values()].find(x => (x.status === 'recebida' || x.status === 'pendente') && !S.ciente.has(x.id)) || [...S.atvs.values()].find(x => x.status === 'recebida'); if (a) mostraAlerta(a); });
  $('#bAtvSolta') && ($('#bAtvSolta').onclick = () => { S.atvPend = null; S.cr = {}; render(); });
  $('#bVerRel') && ($('#bVerRel').onclick = () => go('relatorios'));
  $('#bAvulsa') && ($('#bAvulsa').onclick = () => { if (!S.perfil.nome.trim()) { toast('Crie seu perfil antes.'); go('perfil'); return; } DB.put('meta', S.perfil); gpsStart(); novaInsp(); });
  $('#bNova') && ($('#bNova').onclick = novaInsp);
  $('#bDiario') && ($('#bDiario').onclick = async () => { const t = $('#diarioTxt').value.trim(); if (!t) { $('#diarioTxt').focus(); return; } const l = S.gps.last; S.ronda.diario = [...(S.ronda.diario || []), { ts: Date.now(), txt: t, lat: l ? l.lat : null, lon: l ? l.lon : null }]; saveRonda(true); toast('Anotado no diário.'); const y = window.scrollY; render(); window.scrollTo(0, y); });
  $('#bFotoRede') && ($('#bFotoRede').onclick = () => { S.fotoMode = 'rede'; $('#fileCam').click(); });
  $$('[data-conjrede]').forEach(b => b.onclick = () => { S.donoConj = b.dataset.conjrede; const y = window.scrollY; render(); window.scrollTo(0, y); });
  $$('[data-cat]').forEach(b => b.onclick = () => { S.fotoCatRede = b.dataset.cat; const y = window.scrollY; render(); window.scrollTo(0, y); });
  $('#bEncerrar') && ($('#bEncerrar').onclick = encerrarRonda);
  $('#odoFim') && $('#odoFim').addEventListener('input', e => { S.ronda.odoFim = e.target.value; saveRonda(); });
  $('#bFotoOdoFim') && ($('#bFotoOdoFim').onclick = () => { S.fotoMode = 'odoFim'; $('#fileCam').click(); });
  $('#bVerRonda') && ($('#bVerRonda').onclick = () => { S.rondaView = S.ronda; go('ronda'); });
  bindOpen();
  if (S.ronda) { S.redeFotos = await fotosRede(S.ronda.id); const rc = $('#redeCount'); if (rc) rc.textContent = `${S.redeFotos.length} foto(s) da rede nesta ronda`; if ($('#map')) drawLiveMap('map', S.ronda, true); }
  // histórico
  const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
  const rs = (await DB.all('rondas')).filter(r => r.fim && r.inicio >= +hoje0).sort((a, b) => b.inicio - a.inicio);
  const av = (await DB.all('inspecoes')).filter(i => !i.rondaId && (i.criado || i.chegada || 0) >= +hoje0).sort((a, b) => b.criado - a.criado);
  av.forEach(i => S.inspCache.set(i.id, i));
  const hist = $('#hist'); if (!hist) return;
  let h = rs.map(r => { const n = r.eventos.filter(e => e.tipo === 'chegada').length; const rt = r.rotaId ? rotaById(r.rotaId) : null; return `<button type="button" class="act ${isCorr(r) ? 'corr' : 'done'}" data-ronda="${r.id}"><span class="st"></span><span class="tm">${fHora(r.inicio)}<span>${fHora(r.fim)}</span></span><span class="bd"><b>${isCorr(r) ? 'Corretiva · Ticket ' + esc(r.ticket || '—') : isImpl(r) ? 'Implantação · ' + esc(r.designacao || '') : isVist(r) ? 'Vistoria de rota' : 'Ronda preventiva'}${rt ? ' · ' + esc(rt.codigo) : ''}</b><span>${fKm(pathKm(r.pontos))} · ${n} ${isCorr(r) ? 'ponto(s)' : n === 1 ? 'caixa' : 'caixas'}</span></span><span class="ic"><span class="pill done">Concluída</span>${ICON.next}</span></button>`; }).join('');
  h += av.map(i => actInsp(i, '')).join('');
  hist.innerHTML = h || '<p class="empty">Nenhuma atividade concluída hoje.</p>';
  $$('[data-ronda]', hist).forEach(b => b.onclick = async () => { S.rondaView = await DB.get('rondas', b.dataset.ronda); await cacheInspRonda(S.rondaView); go('ronda'); });
  bindOpen(hist);
}
function bindOpen(root = document) { $$('[data-open]', root).forEach(b => b.onclick = async () => { const i = S.inspCache.get(b.dataset.open) || await DB.get('inspecoes', b.dataset.open); if (!i) return; S.insp = i; S.step = 0; go('insp'); }); }
async function cacheInspRonda(r) { for (const id of [...r.eventos.map(e => e.inspId), ...(r.retomadas || [])]) if (id && !S.inspCache.has(id)) { const i = await DB.get('inspecoes', id); if (i) S.inspCache.set(i.id, i); } }

let lastMapDraw = 0;
function drawLiveMap(id, r, live) {
  S.mapFotos = (S.redeFotos || []).filter(f => f.rondaId === r.id);
  const el = document.getElementById(id); if (!el || !window.L) { if (el) el.innerHTML = '<p class="muted small" style="padding:12px">Mapa indisponível sem internet. O percurso continua sendo registrado.</p>'; return; }
  const map = L.map(el, { zoomControl: true, attributionControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  S.map = map; S.mapLayers = L.layerGroup().addTo(map); S.mapLive = live; S.mapRonda = r;
  paintMap(true);
}
function paintMap(fit) {
  if (!S.map) return; const r = S.mapRonda; const g = S.mapLayers; g.clearLayers();
  const segs = segmentos(r); const all = [];
  const rtk = r.rotaId ? rotaById(r.rotaId) : null; if (rtk && rtk.kml) rtk.kml.linhas.forEach(l => { L.polyline(l, { color: '#6b7785', weight: 4, opacity: .8, dashArray: '8 8' }).addTo(g); if (!segs.some(s => s.pts.length)) all.push(...l); });
  segs.forEach(s => { const ll = s.pts.map(p => [p.lat, p.lon]); all.push(...ll); if (ll.length > 1) L.polyline(ll, { color: SEGCOR[s.tipo], weight: 5, opacity: .9 }).addTo(g); });
  const adm = aderencia(r); if (adm) adm.desvios.forEach((x, k) => { L.polyline(x.pts.map(p => [p.lat, p.lon]), { color: '#b4231b', weight: 7, opacity: .9 }).bindPopup(`Desvio D${k + 1}: ${fKm(x.km)} fora da rota`).addTo(g); });
  (ADMIN ? velStats(r).exc : []).forEach(e => L.marker([e.lat, e.lon], { icon: L.divIcon({ className: '', html: '<div class="mk" style="background:#b4231b;width:26px;height:26px;font-size:10px">!</div>', iconSize: [26, 26], iconAnchor: [13, 13] }) }).bindPopup(`${fVel(e.vmax)} às ${fHora(e.ini)}`).addTo(g));
  const ini = r.eventos.find(e => e.tipo === 'inicio');
  if (ini && ini.lat != null) L.marker([ini.lat, ini.lon], { icon: L.divIcon({ className: '', html: '<div class="mk start">I</div>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(g);
  r.eventos.filter(e => e.tipo === 'chegada' && e.lat != null).forEach((e, k) => { const i = S.inspCache.get(e.inspId); L.marker([e.lat, e.lon], { icon: L.divIcon({ className: '', html: `<div class="mk">${k + 1}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }) }).bindPopup(esc((i && i.info.tag) || 'Caixa ' + (k + 1))).addTo(g); all.push([e.lat, e.lon]); });
  (S.mapFotos || []).filter(f => f.lat != null).forEach(f => { L.marker([f.lat, f.lon], { icon: L.divIcon({ className: '', html: '<div class="mk foto">F</div>', iconSize: [24, 24], iconAnchor: [12, 12] }) }).bindPopup(esc(f.cat) + ' · ' + fHora(f.ts)).addTo(g); });
  if (S.mapLive && S.gps.last) { L.marker([S.gps.last.lat, S.gps.last.lon], { icon: L.divIcon({ className: '', html: '<div class="mk me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(g); all.push([S.gps.last.lat, S.gps.last.lon]); }
  if (fit) { if (all.length > 1) S.map.fitBounds(all, { padding: [24, 24], maxZoom: 17 }); else if (all.length) S.map.setView(all[0], 16); else S.map.setView([-23.55, -46.63], 11); }
  lastMapDraw = Date.now();
}
function updateLive() {
  const c = $('#gpsChip'); if (c) c.outerHTML = gpsChip();
  if (S.view === 'home' && S.ronda) { const { t } = totais(S.ronda); const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; }; set('stKm', fKm(t.km)); set('stCx', t.caixas); const va = velAtual(); set('stVel', fVel(va)); const vw = $('#velWarn'); if (vw) { const over = va != null && va > LIM(); vw.hidden = !over; if (over && navigator.vibrate && (!S.vibT || Date.now() - S.vibT > 60000)) { S.vibT = Date.now(); try { navigator.vibrate([300, 150, 300]); } catch (e) {} } } if (Date.now() - lastMapDraw > 5000) paintMap(false); }
  const gl = $('#gpsLoc'); if (gl && S.view === 'insp') gl.innerHTML = locHtml();
}
setInterval(() => { if (S.view === 'home' && S.ronda) { const e = $('#stDur'); if (e) e.textContent = fClock(Date.now() - S.ronda.inicio); } }, 1000);

/* ---------- inspeção ---------- */
function inp(k, lb, opts = {}) {
  const v = getPath(S.insp, k) ?? '';
  const id = 'f_' + k.replace(/\./g, '_');
  const cls = opts.full ? 'field full' : 'field';
  const req = opts.req ? ' <span class="req">*</span>' : '';
  const type = opts.type || 'text';
  const extra = (opts.mode ? ` inputmode="${opts.mode}"` : '') + (opts.ph ? ` placeholder="${esc(opts.ph)}"` : '') + (opts.caps ? ' autocapitalize="characters"' : '');
  return `<div class="${cls}"><label class="lb" for="${id}">${lb}${req}</label><input type="${type}" id="${id}" data-k="${k}" value="${esc(v)}"${extra}></div>`;
}
function stepDone(key) {
  const i = S.insp;
  if (key === 'caixa') return !!(i.info.tag && i.info.endereco);
  if (key === 'ocorr') return !!(i.corr && i.corr.ticket && i.corr.problema);
  if (key === 'mat') return !!(i.mat && (Object.entries(i.mat).some(([k, v]) => k !== 'caboSpec' && +String(v).replace(',', '.') > 0) || (i.matExtra || []).some(m => m.nome)));
  if (key === 'cabos') return !!(i.cabos.entrada.lote || i.cabos.entrada.marca);
  if (key === 'check') return CHECK.every(([k]) => i.check[k]);
  if (key === 'fusoes') return !!i.fo.modo && (i.fo.modo !== 'exc' || (i.fo.exc || []).every(e => e.fo && (e.tipo === 'livre' || e.fib)));
  if (key === 'fotos') return i.fotos.length > 0;
  if (key === 'impl') return !!(i.impl && i.impl.designacao && (usaImpl(i, 'caixa') || i.info.endereco));
  if (key === 'implcheck') return !!(i.impl && (IMPL_CHECK[i.impl.servico] || []).every(([k]) => i.impl.check[k]));
  if (key === 'site') return !!(i.site && i.site.checkin && i.site.sigla && i.site.parc.nome && i.site.parc.empresa);
  if (key === 'smapa') return !evsOtdr(i).length || calcPins(i).ok;
  if (key === 'sfib') return siteFibOk(i).length > 0 && !siteFibSemPot(i).length;
  if (key === 'vist') return i.vist && i.vist.tipo === 'caixa' ? !!i.info.tag : !!(i.vist && i.vist.descricao);
  if (key === 'lpu') return !!(i.lpu && i.lpu.length);
  if (key === 'final') return i.status === 'concluida';
}
function viewInsp() {
  const i = S.insp, key = ST()[S.step][0];
  let h = `<nav class="steps" aria-label="Etapas">${ST().map(([k, lb], n) => `<button data-step="${n}" class="${stepDone(k) ? 'done' : ''}" ${n === S.step ? 'aria-current="step"' : ''}><span class="chk"></span>${lb}</button>`).join('')}</nav>`;
  if (key === 'caixa') h += stepCaixa(i);
  if (key === 'ocorr') h += stepOcorr(i) + caixaNovaCard(i);
  if (key === 'mat') h += stepMat(i);
  if (key === 'cabos') h += stepCabos(i);
  if (key === 'check') h += stepCheck(i);
  if (key === 'fusoes') h += stepFusoes(i);
  if (key === 'fotos') h += stepFotos(i);
  if (key === 'impl') h += stepImpl(i);
  if (key === 'implcheck') h += stepImplCheck(i);
  if (key === 'vist') h += stepVist(i);
  if (key === 'site') h += stepSite(i);
  if (key === 'sfib') h += stepSiteFib(i);
  if (key === 'smapa') h += stepSiteMapa(i);
  if (key === 'lpu') h += stepLpu(i);
  if (key === 'final') h += stepFinal(i);
  return h;
}
function locHtml() {
  const l = S.insp && S.insp.loc;
  if (!l) return `<div class="warnbox">Localização ainda não capturada. ${esc(S.gps.status === 'err' ? S.gps.msg : 'Toque em "Capturar localização".')}</div>`;
  return `<div class="okbox"><b>${l.lat.toFixed(6)}, ${l.lon.toFixed(6)}</b> · precisão ±${l.acc} m · ${fHoraS(l.ts)}<br><a href="https://maps.google.com/?q=${l.lat},${l.lon}" target="_blank" rel="noopener">Abrir no mapa</a></div>`;
}
function stepCaixa(i) {
  const tipos = [['aerea','Aérea (poste)'],['sub','Subterrânea (CS enterrada)'],['outro','Outro']];
  return `<section class="card"><h2><span class="num">1</span>Identificação</h2>
    <div class="grid2">${inp('info.tag', 'TAG da caixa', { req: 1, full: 1, caps: 1, ph: 'Ex.: ' + tagExemplo() })}
    <div class="field full" style="margin-top:-4px"><div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn pri" id="bQrTag" style="min-height:44px;flex:0 1 auto">📷 Ler QR da plaqueta</button><button type="button" class="btn" id="bGerTag" style="min-height:44px;flex:0 1 auto">Gerar TAG automática</button><span class="muted small" style="flex:1 1 180px">${i.info.tagAuto ? 'TAG gerada pelo app.' : 'TAG digitada.'} Se a caixa já tem plaqueta, leia o QR ou digite a TAG dela.</span></div><div id="histCaixa" style="margin-top:6px"></div></div>
    <details class="field full"><summary class="small" style="cursor:pointer;min-height:40px;display:flex;align-items:center;color:var(--muted)">${esc(i.info.data ? i.info.data.split('-').reverse().join('/') : '')} · ${esc(i.info.tecnico || '')} (automático) · <span style="color:var(--accent);font-weight:600;margin-left:4px">alterar</span></summary><div class="grid2" style="margin-top:6px">${inp('info.data', 'Data', { type: 'date' })}${inp('info.mes', 'Mês referência', { ph: 'MM/AAAA' })}${inp('info.tecnico', 'Técnico(s) responsável(is)', { full: 1 })}</div></details>
    ${selAdd('f_info_fabricante', 'fabCaixa', i.info.fabricante, 'Fabricante', 'data-k="info.fabricante"')}${selAdd('f_info_modelo', 'modCaixa', i.info.modelo, 'Modelo', 'data-k="info.modelo"')}
    <div class="field full"><span class="lb">Tipo de instalação</span><div class="seg" role="group" aria-label="Tipo de instalação">${tipos.map(([v, lb]) => `<button type="button" data-set="info.tipo" data-v="${v}" aria-pressed="${i.info.tipo === v}">${lb}</button>`).join('')}</div></div>
    ${i.info.tipo === 'outro' ? inp('info.tipoOutro', 'Qual tipo?', { full: 1 }) : ''}
    ${inp('info.poste', 'Nº poste / CV', { full: 1 })}</div></section>
  <section class="card"><h2><span class="num">2</span>Localização</h2>
    <div id="gpsLoc">${locHtml()}</div>
    ${i.info.endereco ? `<div class="item" style="cursor:default;align-items:flex-start"><span class="badge">${ICON.pin}</span><span class="tx"><b style="white-space:normal">${esc(i.info.endereco)}</b><span style="white-space:normal">${esc([i.info.bairro, i.info.cidade, i.info.cep && 'CEP ' + i.info.cep].filter(Boolean).join(' · '))}</span>${i.info.endAuto ? '<span class="muted small">Preenchido automaticamente pelo GPS</span>' : ''}</span></div>` : i.loc ? `<div class="warnbox">${i.geoPend ? 'Sem internet no momento. O endereço será buscado sozinho quando o sinal voltar.' : 'Buscando o endereço pelo GPS…'}</div>` : ''}
    <details class="edit-end" ${!i.info.endereco && i.geoPend ? 'open' : ''}><summary class="small" style="cursor:pointer;min-height:40px;display:flex;align-items:center;font-weight:600;color:var(--accent)">Corrigir endereço ou localização</summary>
    <div class="row" style="margin:8px 0"><button class="btn" id="bLoc">${ICON.pin}Atualizar localização</button><button class="btn" id="bEnd">Buscar endereço de novo</button></div>
    <div class="grid2">${inp('info.endereco', 'Endereço (rua, nº)', { full: 1 })}${inp('info.bairro', 'Bairro')}${inp('info.cidade', 'Cidade - UF')}${inp('info.cep', 'CEP', { mode: 'numeric' })}${inp('info.ref', 'Ponto de referência', { ph: 'Opcional' })}</div></details>
    ${(() => { const rt = i.info.rotaId ? rotaById(i.info.rotaId) : null; const ok = !claroCorr(i) && (i.info.dono || rondaConj(i)) && (rt || i.info.rota || isCorr(i)); return ok ? `<details class="ref-rota"><summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600;color:var(--accent)">Rota e backbone: ${esc([rt ? rt.nome : i.info.rota, rondaConj(i) ? 'conjunta' : i.info.dono === 'parceiro' ? 'parceiro ' + (i.info.parceiro || '') : 'próprio'].filter(Boolean).join(' · '))} (alterar)</summary>` : '<div>'; })()}
    <div class="grid2">${claroCorr(i) ? `<div class="field full" id="prox"></div>${/claro/i.test(String((i.corr && i.corr.cliente) || '')) ? '' : donoHtml('in', i.info.dono, i.info.parceiro)}<p class="muted small field full" style="margin:0">Corretiva da Claro: não é preciso informar cabo nem rota do cabo.</p>` : `${refHtml(i)}${rondaConj(i) ? conjHtml(i) : donoHtml('in', i.info.dono, i.info.parceiro)}
    <div class="field full"><label class="lb" for="f_rotaSel">Rota do cabo</label><select id="f_rotaSel">${rotaOpts(i.info.rotaId, 'Rota não cadastrada (digitar abaixo)')}</select></div>
    ${i.info.rotaId ? '' : inp('info.rota', 'Rota (descrição do trecho)', { full: 1, ph: 'Ex.: Estação Sé > Estação Paraíso' })}`}</div>${(() => { const rt = i.info.rotaId ? rotaById(i.info.rotaId) : null; return !claroCorr(i) && (i.info.dono || rondaConj(i)) && (rt || i.info.rota || isCorr(i)) ? '</details>' : '</div>'; })()}</section>`;
}
function stepOcorr(i) {
  const c = i.corr; const full = stepCaixa(i); const locPart = full.slice(full.indexOf('<section class="card"><h2><span class="num">2</span>Localização'));
  return `<section class="card"><h2><span class="num">1</span>Ocorrência</h2>
    <div class="grid2">${inp('corr.ticket', 'Nº do ticket', { full: 1, caps: 1, ph: 'Em branco: o app gera automático' })}${c.ticketAuto ? '<span class="muted small field full" style="margin-top:-6px">Número gerado pelo app (sem ticket informado). Se o ticket chegar depois, digite por cima.</span>' : ''}
    <div class="field full"><label class="lb" for="f_ocorr">Tipo de ocorrência</label><select id="f_ocorr" data-k="corr.ocorrencia"><option value="">Selecione…</option>${OCORR.map(o => `<option ${c.ocorrencia === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
    <div class="field full"><label class="lb" for="f_prob">Problema encontrado <span class="req">*</span></label><textarea id="f_prob" data-k="corr.problema" placeholder="Ex.: cabo rompido por queda de árvore entre os postes P-120 e P-121">${esc(c.problema || '')}</textarea></div>
    <details class="field full" id="ocMais" ${c.causa || c.fibrasAfetadas || i.info.poste ? 'open' : ''}><summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600;color:var(--accent)">Mais detalhes (opcional): acionamento, fibras, causa, poste</summary><div class="grid2">
    ${inp('corr.acionamento', 'Hora do acionamento', { type: 'time' })}${inp('info.data', 'Data', { type: 'date' })}
    ${inp('corr.fibrasAfetadas', 'Fibras afetadas', { full: 1, ph: 'Ex.: cabo 72 FO, tubos 1 a 3' })}
    ${inp('corr.causa', 'Causa provável', { full: 1 })}${inp('info.poste', 'Nº poste / CV', { full: 1 })}</div></details>
    ${inp('info.tag', 'TAG da caixa de emenda (se criou ou usou uma)', { full: 1, caps: 1, ph: 'Opcional' })}
    <div class="field full" style="margin-top:-4px"><div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn pri" id="bQrTag" style="min-height:44px;flex:0 1 auto">📷 Ler QR da plaqueta</button><button type="button" class="btn" id="bGerTag" style="min-height:44px;flex:0 1 auto">Gerar TAG para caixa nova</button></div><div id="histCaixa" style="margin-top:6px"></div></div></div></section>
  ${locPart}`;
}
function stepMat(i) {
  if (!i.mat) i.mat = {}; if (!i.matExtra) i.matExtra = [];
  return `<section class="card"><h2><span class="num">5</span>Materiais utilizados</h2><p class="muted small" style="margin:0">Informe a quantidade de cada material usado. Deixe em branco o que não foi usado.</p>
    <div class="list">${MATERIAIS.map(([k, lb, un]) => `<div class="row" style="flex-wrap:nowrap;gap:10px;border-bottom:1px solid var(--line);padding:6px 0"><label for="m_${k}" style="flex:1;min-width:0;font-weight:600">${esc(lb)}</label><input type="text" inputmode="decimal" id="m_${k}" data-k="mat.${k}" value="${esc(i.mat[k] || '')}" placeholder="0" style="width:84px;min-height:46px;text-align:right"><span class="muted small" style="width:24px">${un}</span></div>`).join('')}</div>
    ${inp('mat.caboSpec', 'Cabo óptico usado (tipo / nº de fibras)', { full: 1, ph: 'Ex.: AS-80 72 FO' })}
    <h3>Outros materiais</h3>
    <div class="list">${i.matExtra.map((m, k) => `<div class="grid3" style="align-items:end"><div class="field"><label class="lb" for="mx_n${k}">Material</label><input type="text" id="mx_n${k}" data-k="matExtra.${k}.nome" value="${esc(m.nome)}" list="dlCatMat" placeholder="Digite o código ou o nome"></div><div class="field"><label class="lb" for="mx_q${k}">Qtd.</label><input type="text" inputmode="decimal" id="mx_q${k}" data-k="matExtra.${k}.qtd" value="${esc(m.qtd)}"></div><div class="field"><label class="lb" for="mx_u${k}">Unid.</label><input type="text" id="mx_u${k}" data-k="matExtra.${k}.un" value="${esc(m.un)}" placeholder="un / m"></div></div>`).join('')}</div>
    <button type="button" class="btn" id="bMatAdd">${ICON.plus}Adicionar outro material</button><datalist id="dlCatMat"></datalist></section>`;
}
function stepCabos(i) {
  const capSel = k => { const v = String(i.cabos[k].fibras || ''); return `<div class="field"><label class="lb" for="cap_${k}">Nº de fibras</label><select id="cap_${k}" data-k="cabos.${k}.fibras"><option value="">Selecione…</option>${CAPS.map(c => `<option value="${c}" ${v === String(c) ? 'selected' : ''}>${c} FO</option>`).join('')}</select></div>`; };
  const padSel = k => { const v = i.cabos[k].padrao || ''; return `<div class="field full"><span class="lb">Padrão de cores deste cabo <span class="req">*</span></span><div class="seg" role="group" aria-label="Padrão de cores">${Object.entries(PADROES).map(([pk, [lb]]) => `<button type="button" data-set="cabos.${k}.padrao" data-v="${pk}" aria-pressed="${v === pk}">${pk === 'ABNT' ? 'Nacional' : 'Americano'}</button>`).join('')}</div>${v ? `<span class="muted small">${pal(v).slice(0, 4).map(c => sw(c[1]) + ' ' + c[0]).join(' · ')} …</span>` : '<span class="fo-warn">Escolha o padrão deste cabo nesta caixa (Nacional ou Americano).</span>'}</div>`; };
  const bloco = (k, nome) => `<h3>${nome}</h3><div class="grid2">${selAdd(`f_cabos_${k}_marca`, 'marcaCabo', i.cabos[k].marca, 'Marca', `data-k="cabos.${k}.marca"`)}${inp(`cabos.${k}.lote`, 'Lote')}${capSel(k)}${inp(`cabos.${k}.metragem`, 'Metragem (m)', { mode: 'numeric', ph: 'Marcação na capa' })}${padSel(k)}</div>`;
  return `<section class="card"><h2><span class="num">3</span>Cabos</h2><p class="muted small" style="margin:0">Metragem: anote a marcação métrica impressa na capa do cabo, junto à caixa. O padrão de cores é informado em cada caixa e em cada cabo, porque um cabo americano pode estar ligado a um nacional.</p>
    ${bloco('entrada', 'Cabo de entrada')}${bloco('s1', 'Cabo de saída 1')}
    <label class="row" style="min-height:44px;cursor:pointer"><input type="checkbox" data-k="cabos.temS2" ${i.cabos.temS2 ? 'checked' : ''} style="width:22px;height:22px"> <b>Tem cabo de saída 2</b></label>
    ${i.cabos.temS2 ? bloco('s2', 'Cabo de saída 2') : ''}</section>`;
}
function stepCheck(i) {
  return `<section class="card"><div class="row" style="justify-content:space-between"><h2><span class="num">4</span>Itens inspecionados</h2><button class="btn" id="bAllOk" style="min-height:44px">${ICON.check}Todos OK</button></div>
  <div>${CHECK.map(([k, lb]) => `<div class="check-row"><span class="q">${lb}</span><div class="seg ck" role="group" aria-label="${lb}">${['OK','NC','NA'].map(v => `<button type="button" data-set="check.${k}" data-v="${v}" aria-pressed="${i.check[k] === v}">${v === 'NC' ? 'N/C' : v === 'NA' ? 'N/A' : 'OK'}</button>`).join('')}</div>
    ${i.check[k] === 'NC' ? `<input type="text" data-k="checkObs.${k}" value="${esc(i.checkObs[k] || '')}" placeholder="Descreva a irregularidade" aria-label="Irregularidade: ${lb}">` : ''}</div>`).join('')}</div></section>`;
}
const FMODOS = [['cor', 'Todas fusionadas cor com cor', 'Fibra 1 com 1, 2 com 2… sem inversões.'], ['exc', 'Cor com cor, com inversão ou manobra', 'Informe só as fibras diferentes.'], ['nenhuma', 'Sem fusão nesta caixa', 'Caixa de passagem / sangria sem emenda.'], ['det', 'Detalhar no diagrama', 'Toque na fibra de entrada e depois na de saída.']];
const EXCT = { manobra: 'Manobra', inversao: 'Inversão', livre: 'Fibra livre (sem fusão)' };
function syncFo(i) {
  ensureRows(i); const m = i.fo.modo || 'cor'; if (m === 'det') return;
  const tot = i.fo.total;
  for (let k = 0; k < i.fo.rows.length; k++) { const r = i.fo.rows[k]; r.f = m !== 'nenhuma' && k < tot; r.cabo = 'S1'; r.fib = r.f ? String(k + 1) : ''; r.mot = ''; }
  if (m === 'exc') (i.fo.exc || []).forEach(e => {
    const a = +e.fo, b = +e.fib; if (!a || a > tot) return; const ra = i.fo.rows[a - 1];
    if (e.tipo === 'livre') { ra.f = false; ra.fib = ''; ra.mot = e.mot || ''; return; }
    if (!b) return; ra.f = true; ra.cabo = e.cabo || 'S1'; ra.fib = String(b); ra.mot = (e.tipo === 'inversao' ? 'Inversão' : 'Manobra') + (e.mot ? ' - ' + e.mot : '');
    if (e.tipo === 'inversao' && b <= tot) { const rb = i.fo.rows[b - 1]; rb.f = true; rb.cabo = e.cabo || 'S1'; rb.fib = String(a); rb.mot = 'Inversão' + (e.mot ? ' - ' + e.mot : ''); }
  });
}
function resumoFo(i) {
  const m = i.fo.modo || 'cor', tot = i.fo.total;
  if (m === 'cor') return `Todas as ${tot} fibras fusionadas cor com cor (1 com 1), sem inversões ou manobras.`;
  if (m === 'nenhuma') return 'Sem fusão nesta caixa (passagem).';
  if (m === 'exc') { const ex = i.fo.exc || []; return `Fusões cor com cor nas ${tot} fibras, exceto ${ex.length} ocorrência(s): ` + ex.map(e => e.tipo === 'livre' ? `FO ${e.fo} livre${e.mot ? ' (' + e.mot + ')' : ''}` : `${EXCT[e.tipo]} FO ${e.fo} com FO ${e.fib || '?'}${e.cabo && e.cabo !== 'S1' ? ' na ' + e.cabo : ''}${e.mot ? ' (' + e.mot + ')' : ''}`).join('; ') + '.'; }
  const f = i.fo.rows.slice(0, tot).filter(r => r.f && !paraAqui(i, r)).length, pa = i.fo.rows.slice(0, tot).filter(r => paraAqui(i, r)).length; return `Plano detalhado: ${f} de ${tot} fibras fusionadas${pa ? `; ${pa} param nesta caixa (o cabo de saída é menor)` : ''}.`;
}
function stepFusoes(i) {
  ensureRows(i); if (!i.fo.modo) i.fo.modo = i.fo.rows.some(r => r.f) && !isCorr(i) ? 'det' : 'cor'; if (!i.fo.exc) i.fo.exc = [];
  const tot = i.fo.total, m = i.fo.modo, pe = padE(i);
  const optFo = (sel, max) => Array.from({ length: max }, (_, x) => { const n = x + 1, { t, f } = tf(n); return `<option value="${n}" ${+sel === n ? 'selected' : ''}>FO ${n} · T${t} ${esc(tNome(t, pe).split(' (')[0])} / ${esc(fCor(f, pe)[0])}</option>`; }).join('');
  let h = `<section class="card"><h2><span class="num">${isCorr(i) ? 3 : 5}</span>Fusões</h2>
    <div class="field"><label class="lb" for="foTot">Fibras no cabo</label><select id="foTot">${CAPS.map(v => `<option ${v === tot ? 'selected' : ''} value="${v}">${v} FO · ${v / 12} tubo${v > 12 ? 's' : ''}</option>`).join('')}</select></div>
    <div class="list" role="radiogroup" aria-label="Como ficaram as fusões">${FMODOS.map(([v, t, d]) => `<button type="button" role="radio" class="item fmodo ${m === v ? 'sel' : ''}" data-fmodo="${v}" aria-checked="${m === v}"><span class="radio"></span><span class="tx"><b>${t}</b><span>${d}</span></span></button>`).join('')}</div>
    <div class="okbox">${esc(resumoFo(i))}</div>`;
  if (m === 'exc') {
    h += `<h3>Inversões e manobras</h3><div class="list">${i.fo.exc.map((e, k) => `<div class="fo on"><div class="seg" role="group" aria-label="Tipo">${Object.entries(EXCT).map(([tv, tl]) => `<button type="button" data-exct="${k}" data-v="${tv}" aria-pressed="${e.tipo === tv}">${tv === 'livre' ? 'Fibra livre' : tl}</button>`).join('')}</div>
      <div class="grid2"><div class="field ${e.tipo === 'livre' ? 'full' : ''}"><label class="lb" for="ex_a${k}">${e.tipo === 'livre' ? 'Fibra sem fusão' : 'Fibra de entrada'}</label><select id="ex_a${k}" data-k="fo.exc.${k}.fo" data-fore="1"><option value="">Escolha…</option>${optFo(e.fo, tot)}</select></div>
      ${e.tipo === 'livre' ? '' : `<div class="field"><label class="lb" for="ex_b${k}">${e.tipo === 'inversao' ? 'Trocada com a fibra' : 'Ligada na fibra'}</label><select id="ex_b${k}" data-k="fo.exc.${k}.fib" data-fore="1"><option value="">Escolha…</option>${optFo(e.fib, Math.max(tot, capSaida(i, e.cabo || 'S1')))}</select></div>
      ${i.cabos.temS2 ? `<div class="field full"><label class="lb" for="ex_c${k}">Cabo de saída</label><select id="ex_c${k}" data-k="fo.exc.${k}.cabo" data-fore="1"><option ${e.cabo !== 'S2' ? 'selected' : ''}>S1</option><option ${e.cabo === 'S2' ? 'selected' : ''}>S2</option></select></div>` : ''}`}
      <div class="field full"><label class="lb" for="ex_m${k}">Motivo</label><input type="text" id="ex_m${k}" data-k="fo.exc.${k}.mot" data-fore2="1" value="${esc(e.mot || '')}" placeholder="Ex.: fibra quebrada no trecho"></div></div>
      <button type="button" class="del" data-exdel="${k}" style="min-height:40px;border:1px solid var(--bad);color:var(--bad);background:transparent;border-radius:8px;font-weight:600">Remover</button></div>`).join('')}</div>
      <button type="button" class="btn" id="bExAdd">${ICON.plus}Adicionar inversão ou manobra</button>
      <p class="muted small" style="margin:0"><b>Manobra:</b> uma fibra ligada em outra (ex.: 1 com 2 porque a 1 quebrou). <b>Inversão:</b> duas fibras trocadas entre si (3 com 7 e 7 com 3). <b>Fibra livre:</b> fibra sem emenda.</p>`;
  }
  h += '</section>';
  const mc = mapaFusaoCard(i);
  return h + (mc && m === 'cor' && !S.fmAberto ? `<details class="card" id="fmDet"><summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600;color:var(--accent)">Ver ou ajustar o diagrama de fusões</summary>${mc}</details>` : mc) + (m === 'det' ? stepFusoesDet(i) : '');
}
function stepFusoesDet(i) {
  ensureRows(i); const pe = padE(i);
  const tot = i.fo.total; const n = i.fo.rows.slice(0, tot).filter(r => r.f).length; const nTub = Math.ceil(tot / 12);
  if (!S.openTubes) S.openTubes = new Set([1]);
  const usados = {}; for (let k = 0; k < tot; k++) { const r = i.fo.rows[k]; if (r.f && r.fib) { const key = r.cabo + '-' + r.fib; usados[key] = (usados[key] || 0) + 1; } }
  let h = `<section class="card"><details id="foLista" ${S.foLista ? 'open' : ''}><summary style="cursor:pointer;min-height:40px;display:flex;align-items:center;gap:8px"><b>Lista fibra a fibra</b><span class="muted small">outra forma de editar o mesmo plano</span></summary><h2 style="margin-top:8px">Plano fibra a fibra</h2>
    <div class="grid2" hidden><div class="field"><label class="lb" for="foTotX">Fibras no cabo de entrada</label><select id="foTotX"></select></div></div>
    ${i.cabos.entrada.padrao ? `<p class="small" style="margin:0">Padrão de cores da entrada: <b>${esc(padNome(pe))}</b>. Saída 1: <b>${esc(i.cabos.s1.padrao ? padNome(i.cabos.s1.padrao) : 'não informado')}</b>${i.cabos.temS2 ? `. Saída 2: <b>${esc(i.cabos.s2.padrao ? padNome(i.cabos.s2.padrao) : 'não informado')}</b>` : ''}. Para trocar, vá na etapa Cabos.</p>` : '<div class="warnbox">Informe na etapa <b>Cabos</b> o padrão de cores (Nacional ou Americano) dos cabos desta caixa. Até lá as cores aparecem no padrão Nacional.</div>'}
    <p class="muted small" style="margin:0">Abra o tubo, marque cada fibra de entrada fusionada e escolha em qual cabo, tubo e fibra de saída ela foi ligada. A ligação é livre: fibra 1 com 1, 1 com 2, 3 com 7… Quando for diferente, o app marca como <b>Manobra</b> e pede o motivo.</p>
    <div class="fo-tools"><button class="btn" id="bSeq">Todas 1→1 na Saída 1</button><button class="btn" id="bLimpaFo">Limpar fusões</button></div>
    <div class="list">`;
  for (let t = 1; t <= nTub; t++) {
    const ini = (t - 1) * 12, fim = Math.min(t * 12, tot); const nt = i.fo.rows.slice(ini, fim).filter(r => r.f).length;
    const nd = i.fo.rows.slice(ini, fim).some((r, j) => r.f && r.fib && usados[r.cabo + '-' + r.fib] > 1);
    const open = S.openTubes.has(t);
    h += `<details class="tubo" data-tube="${t}" ${open ? 'open' : ''}><summary>${sw(tCor(t, pe))} <b>Tubo ${t}</b> <span class="muted">${esc(tNome(t, pe))}</span><span class="tcount ${nt ? 'on' : ''}">${nt}/${fim - ini}</span>${nd ? '<span class="pill bad">Repetida</span>' : ''}</summary>`;
    if (open) {
      h += '<div class="list" style="padding:8px 0 4px">';
      for (let k = ini; k < fim; k++) {
        const r = i.fo.rows[k], { f } = tf(k + 1);
        const mano = r.f && r.fib && +r.fib !== k + 1; const dup = r.f && r.fib && usados[r.cabo + '-' + r.fib] > 1;
        h += `<div class="fo ${r.f ? 'on' : ''} ${dup ? 'dup' : ''}"><div class="fo-head"><span class="fo-n">FO ${k + 1}</span><span class="meta">${sw(fCor(f, pe)[1])} F${f} ${fCor(f, pe)[0]}${mano ? ' <span class="pill mano">Manobra</span>' : ''}</span><button type="button" class="tog" data-fo="${k}" aria-pressed="${r.f}">${r.f ? 'Fusionada' : 'Marcar fusão'}</button></div>`;
        if (r.f) {
          const cap = capSaida(i, r.cabo), st = r.fib ? tf(+r.fib) : { t: 0, f: 0 }, ps = padS(i, r.cabo);
          h += `<div class="fo-body5"><div class="field"><label class="lb" for="foc${k}">Cabo saída</label><select id="foc${k}" data-k="fo.rows.${k}.cabo" data-fore="1"><option ${r.cabo === 'S1' ? 'selected' : ''}>S1</option><option ${r.cabo === 'S2' ? 'selected' : ''}>S2</option></select></div>
            <div class="field"><label class="lb" for="fot${k}">Tubo saída</label><select id="fot${k}" data-fot="${k}">${Array.from({ length: Math.ceil(cap / 12) }, (_, x) => `<option value="${x + 1}" ${st.t === x + 1 ? 'selected' : ''}>T${x + 1} ${esc(pal(ps)[x % 12][0])}</option>`).join('')}</select></div>
            <div class="field"><label class="lb" for="fof${k}">Fibra saída</label><select id="fof${k}" data-fof="${k}">${pal(ps).map((c, x) => `<option value="${x + 1}" ${st.f === x + 1 ? 'selected' : ''}>F${x + 1} ${c[0]}</option>`).join('')}</select></div>
            <div class="field"><label class="lb" for="fob${k}">Bandeja</label><input id="fob${k}" type="text" inputmode="numeric" data-k="fo.rows.${k}.band" value="${esc(r.band)}" placeholder="—"></div>
            <div class="fo-mot muted small">Ligada na fibra <b>${esc(r.fib || '—')}</b> da ${esc(r.cabo)}${r.fib ? ' (' + esc(foTxt(+r.fib, ps)) + ')' : ''}</div>
            ${mano ? `<div class="field fo-mot"><label class="lb" for="fom${k}">Motivo da manobra</label><input id="fom${k}" type="text" data-k="fo.rows.${k}.mot" value="${esc(r.mot || '')}" placeholder="Ex.: fibra ${r.fib} quebrada no trecho"></div>` : ''}
            ${dup ? `<div class="fo-warn fo-mot">Atenção: outra fibra de entrada já está ligada na fibra ${esc(r.fib)} da ${esc(r.cabo)}.</div>` : ''}</div>`;
        }
        h += '</div>';
      }
      h += '</div>';
    }
    h += '</details>';
  }
  return h + '</div></details></section>';
}
function chipsHtml(cats, sel, cont) { return `<div class="chips" role="radiogroup" aria-label="Tipo da foto">${cats.map(c => `<button type="button" role="radio" data-cat="${esc(c)}" aria-checked="${c === sel}">${esc(c)}${cont ? `<span class="cnt">${cont[c] || 0}</span>` : ''}</button>`).join('')}</div>`; }
function stepFotos(i) {
  const cats = catsOf(i); if (!cats.includes(S.fotoCat)) S.fotoCat = cats[0];
  const cont = {}; i.fotos.forEach(p => cont[p.cat] = (cont[p.cat] || 0) + 1);
  const falta = obrigOf(i).filter(c => !cont[c]);
  return `<section class="card"><h2><span class="num">${isCorr(i) ? 4 : 6}</span>Evidências (fotos)</h2>
    <span class="lb">1. Escolha o tipo da foto</span>
    ${chipsHtml(cats, S.fotoCat, cont)}
    <span class="lb">2. Tire a foto</span>
    <div class="okbox small" style="display:flex;gap:10px;align-items:center" role="note"><span aria-hidden="true" style="font-size:22px;line-height:1">📱↔</span><span><b>Deite o celular:</b> tire todas as fotos na horizontal. Elas ficam maiores e mais nítidas no relatório.</span></div>
    <div class="row"><button class="btn pri" id="bCam">${ICON.cam}Tirar foto · ${esc(S.fotoCat)}</button><button class="btn" id="bGal">${ICON.img}Da galeria</button></div>
    <p class="muted small" style="margin:0">Cada foto recebe um carimbo com o tipo, TAG, data, hora e coordenadas do GPS.</p>
    ${falta.length ? `<div class="warnbox">${isCorr(i) ? 'Para comprovar o serviço' : 'Para comprovar a integridade'}, ainda faltam fotos de: <b>${falta.map(esc).join(', ')}</b>.</div>` : '<div class="okbox">Todas as fotos obrigatórias foram tiradas.</div>'}
    <div class="photos" id="photos">${i.fotos.map((p, k) => `<div class="ph"><img data-ph="${k}" alt="Foto ${k + 1}: ${esc(p.cat)}"><span class="tag">${esc(p.cat)}</span><div class="pb"><select data-k="fotos.${k}.cat" data-fore="1" aria-label="Tipo da foto ${k + 1}">${(cats.includes(p.cat) ? cats : [p.cat, ...cats]).map(c => `<option ${p.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><input type="text" data-k="fotos.${k}.desc" value="${esc(p.desc)}" placeholder="Descrição (opcional)" aria-label="Descrição da foto ${k + 1}"><button class="del" data-delph="${k}">Remover foto</button></div></div>`).join('')}</div>
    ${i.fotos.length ? '' : '<p class="muted" style="margin:0">Nenhuma foto ainda.</p>'}</section>`;
}
function pendencias(i) {
  const p = [];
  if (isSite(i)) return pendSite(i);
  if (isVist(i)) { if (i.vist.tipo === 'caixa' ? !i.info.tag : !i.vist.descricao) p.push(i.vist.tipo === 'caixa' ? 'TAG da caixa' : 'Registro escrito'); if (!i.loc) p.push('Localização (GPS)'); if (!i.fotos.length) p.push('Pelo menos uma foto de evidência'); if (!i.assinatura) p.push('Assinatura'); return p; }
  if (isCorr(i)) { if (!i.corr.problema) p.push('Problema encontrado'); if (!i.corr.servico) p.push('Serviço executado'); } else if (isImpl(i)) { if (!i.impl.designacao) p.push('Designação'); if (usaImpl(i, 'caixa') && !i.info.tag) p.push('TAG da caixa'); } else if (!i.info.tag) p.push('TAG da caixa');
  if (!i.info.dono && !claroCorr(i)) p.push('Backbone próprio ou parceiro'); if (!i.info.tecnico) p.push('Técnico');
  if (!i.loc) p.push('Localização (GPS)'); if (!i.info.endereco) p.push('Endereço');
  const sem = isCorr(i) ? 0 : isImpl(i) ? (IMPL_CHECK[i.impl.servico] || []).filter(([k]) => !i.impl.check[k]).length : CHECK.filter(([k]) => !i.check[k]).length; if (sem) p.push(`${sem} item(ns) do checklist`);
  (isCorr(i) || (isImpl(i) && !usaImpl(i, 'cabos')) ? [] : [['entrada', 'entrada'], ['s1', 'saída 1'], ...(i.cabos.temS2 ? [['s2', 'saída 2']] : [])]).forEach(([k, n]) => { if (!i.cabos[k].padrao) p.push(`Padrão de cores do cabo de ${n}`); });
  const faltaF = obrigOf(i).filter(c => !i.fotos.some(f => f.cat === c)); if (faltaF.length) p.push('Fotos de ' + faltaF.join(', ')); if (!i.assinatura) p.push('Assinatura');
  return p;
}
function pendHtml(i) { const p = pendencias(i); return p.length ? `<div class="warnbox"><b>Faltando:</b> ${p.map(esc).join(', ')}.<br>O PDF pode ser gerado assim mesmo.</div>` : '<div class="okbox">Tudo preenchido.</div>'; }
function pendUpd() { const e = $('#pend'); if (e && S.insp) e.innerHTML = pendHtml(S.insp); }
function stepFinal(i) {
  const p = pendencias(i);
  const servHtml = isCorr(i) ? `<section class="card"><h2><span class="num">6</span>Serviço executado</h2><div class="grid2">
    <div class="field full"><label class="lb" for="f_serv">O que foi feito <span class="req">*</span></label><textarea id="f_serv" data-k="corr.servico" placeholder="Ex.: puxada sobra técnica de 40 m, instalada caixa de emenda nova, fusionadas 72 fibras, testes OK">${esc(i.corr.servico || '')}</textarea></div>
    ${inp('corr.sobra', 'Sobra técnica puxada (m)', { mode: 'decimal', ph: '0' })}${inp('corr.normalizacao', 'Normalizado às', { type: 'time' })}
    <label class="row field full" style="min-height:44px;cursor:pointer"><input type="checkbox" data-k="corr.novaCaixa" ${i.corr.novaCaixa ? 'checked' : ''} style="width:22px;height:22px"> <b>Foi criada caixa de emenda nova</b></label>
    <label class="row field full" style="min-height:44px;cursor:pointer"><input type="checkbox" data-k="corr.pendente" ${i.corr.pendente ? 'checked' : ''} style="width:22px;height:22px"> <b>Ficou pendência para outra equipe / retorno</b></label></div></section>` : '';
  if (!isCorr(i) && !isImpl(i) && !isVist(i) && !Array.isArray(i.tkParc)) i.tkParc = ['', ''];
  const tkHtml = isCorr(i) || isImpl(i) || isVist(i) || isSite(i) ? '' : `<section class="card"><h2>Tickets</h2><div class="grid2"><div class="field full"><span class="lb">Ticket interno</span><b>${esc(i.ticketAtv || '—')}</b></div>${inp('tkParc.0', 'Ticket do parceiro 1', { caps: 1, ph: 'Opcional' })}${inp('tkParc.1', 'Ticket do parceiro 2', { caps: 1, ph: 'Opcional' })}</div></section>`;
  const wfHtml = tkHtml + (isVist(i) || i.apoio ? '' : `<details class="card" ${i.wfc || i.wf2 ? 'open' : ''}><summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600;color:var(--accent)">Tickets de faturamento WFC / WF2 (opcional)</summary><div class="grid2">${inp('wfc', 'WFC', { ph: 'Opcional' })}${inp('wf2', 'WF2', { ph: 'Opcional' })}</div></details>`);
  return servHtml + (isCorr(i) && S.ronda && S.ronda.id === i.rondaId ? liberaHtml(S.ronda) : '') + `<section class="card"><h2><span class="num">7</span>Observações</h2><textarea data-k="obs" id="f_obs" aria-label="Observações e irregularidades" placeholder="Irregularidades encontradas, serviços executados, pendências…">${esc(i.obs)}</textarea></section>
  <section class="card"><h2><span class="num">8</span>Assinatura do técnico</h2><canvas class="sig" id="sig" aria-label="Área para assinar com o dedo"></canvas><div class="row"><button class="btn" id="bSigClear" style="min-height:44px">Limpar assinatura</button></div></section>
  ${wfHtml}<section class="card"><h2>Relatório</h2>
    <div id="pend">${p.length ? `<div class="warnbox"><b>Faltando:</b> ${p.map(esc).join(', ')}.<br>O PDF pode ser gerado assim mesmo.</div>` : '<div class="okbox">Tudo preenchido.</div>'}</div>
    <div class="row"><button class="btn wa" id="bWa">${ICON.wa}Enviar PDF no WhatsApp</button><button class="btn" id="bPdf">${ICON.pdf}Baixar PDF</button></div>
    <button class="btn block" id="bKmz">${ICON.pin}Exportar KMZ (Google Earth)</button>
    <button class="btn go block" id="bConcluir">${ICON.check}${i.status === 'concluida' ? 'Salvar e voltar' : isCorr(i) ? 'Concluir atendimento' : isSite(i) ? 'Concluir conjunta' : 'Concluir inspeção'}</button>
    ${S.ronda && i.rondaId === S.ronda.id && i.status !== 'concluida' ? '<p class="muted small" style="margin:0">Ao concluir, o app passa a registrar a rota do cabo até a próxima caixa.</p>' : ''}</section>`;
}
function barInsp() {
  const last = S.step === ST().length - 1;
  setBar(`<button class="btn" id="bPrev" ${S.step === 0 ? 'disabled' : ''}>${ICON.prev}Anterior</button>${last ? `<button class="btn go" id="bConc2">${ICON.check}Concluir</button>` : `<button class="btn pri" id="bNext">Próximo${ICON.next}</button>`}`);
  $('#bPrev').onclick = () => { S.step = Math.max(0, S.step - 1); window.scrollTo(0, 0); render(); };
  $('#bNext') && ($('#bNext').onclick = () => { S.step = Math.min(ST().length - 1, S.step + 1); window.scrollTo(0, 0); render(); });
  $('#bConc2') && ($('#bConc2').onclick = concluirInsp);
}
function afterInsp() {
  $('#fmDet') && ($('#fmDet').ontoggle = e => { S.fmAberto = e.target.open; });
  const i = S.insp, app = $('#app');
  $$('[data-step]').forEach(b => b.onclick = () => { S.step = +b.dataset.step; window.scrollTo(0, 0); render(); });
  const cur = $('.steps [aria-current]'); cur && cur.scrollIntoView({ inline: 'center', block: 'nearest' });
  $$('[data-k]', app).forEach(el => {
    const ev = el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(ev, () => {
      if (el.value === '__novo') return;
      setPath(i, el.dataset.k, el.type === 'checkbox' ? el.checked : el.value); saveInsp();
      if (el.dataset.k === 'info.tag' && !isCorr(i)) { $('#topTitle').textContent = el.value ? 'Caixa ' + el.value : 'Nova inspeção'; }
      if (el.dataset.k === 'corr.ticket') { i.corr.ticketAuto = false; $('#topTitle').textContent = 'Corretiva · Ticket ' + (el.value || '—'); }
      if (el.dataset.k === 'cabos.temS2') render();
      if (el.dataset.k === 'cabos.entrada.fibras' && CAPS.includes(+el.value)) { i.fo.total = +el.value; ensureRows(i); syncFo(i); }
      if (el.dataset.fore) { if (el.dataset.k.startsWith('fo.exc')) syncFo(i); const y = window.scrollY; render(); window.scrollTo(0, y); }
    });
  });
  $$('[data-set]', app).forEach(b => b.onclick = () => { const cur = getPath(i, b.dataset.set); setPath(i, b.dataset.set, cur === b.dataset.v ? '' : b.dataset.v); saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
  const key = ST()[S.step][0];
  if (key === 'mat') matCatLocal().then(cat => { const dl = $('#dlCatMat'); if (!dl) return; const vis = new Set(); const op = t => { if (vis.has(t)) return ''; vis.add(t); return `<option value="${esc(t)}">`; }; dl.innerHTML = cat.filter(m => m.ativo !== false).map(m => op(matLabel(m))).join('') + [...LPUI.values()].filter(x => x.t === 'M').map(x => op(x.d)).join(''); });
  if (key === 'mat') $('#bMatAdd').onclick = () => { i.matExtra.push({ nome: '', qtd: '', un: 'un' }); saveInsp(); render(); };
  if (key === 'ocorr') { $('#bCxNova') && ($('#bCxNova').onclick = () => novaCaixaCorr(i)); bindOpen($('#app')); }
  if (key === 'caixa' || key === 'ocorr') {
    $('#bLoc').onclick = async () => { $('#bLoc').disabled = true; $('#bLoc').textContent = 'Capturando…'; const l = await posAtual(0); if (l) { i.loc = l; saveInsp(); toast(`Localização atualizada (±${l.acc} m).`); S.geoTry = 0; await preencherEndereco(false); } else toast(S.gps.msg && S.gps.status === 'err' ? S.gps.msg : 'Não foi possível pegar a localização.'); render(); };
    $('#bEnd').onclick = () => { if (!i.loc) { toast('Capture a localização primeiro.'); return; } S.geoTry = 0; preencherEndereco(false); };
    pintaProximos(i);
    $$('[data-insent]').forEach(b => b.onclick = () => { i.info.refSentido = b.dataset.insent; saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
    $('#in_refKm') && $('#in_refKm').addEventListener('change', e => { i.info.refKm = e.target.value; saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
    ['f_info_refKm', 'f_info_refLocal'].forEach(id => { const el = $('#' + id); el && el.addEventListener('change', () => { if (id === 'f_info_refLocal') lembraLocal(el.value); pintaProximos(i); }); });
    ['info.endereco', 'info.bairro', 'info.cidade', 'info.cep'].forEach(k => { const el = document.getElementById('f_' + k.replace('.', '_')); el && el.addEventListener('input', () => { i.info.endAuto = false; }); });
    tentaGeo();
    $('#f_rotaSel') && ($('#f_rotaSel').onchange = e => { const rt = rotaById(e.target.value); i.info.rotaId = rt ? rt.id : ''; i.info.rota = rt ? rotaLb(rt) : ''; if (rt) ['entrada', 's1', 's2'].forEach(k => { if (!i.cabos[k].fibras && rt.cap) i.cabos[k].fibras = String(rt.cap); }); if (rt && CAPS.includes(+rt.cap) && !i.fo.rows.some(r => r.f)) { i.fo.total = +rt.cap; ensureRows(i); } saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
    $$('[data-dono="in"]').forEach(b => b.onclick = () => { i.info.dono = i.info.dono === b.dataset.v ? '' : b.dataset.v; saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
    $('#bGerTag').onclick = async () => { await geraTag(i); saveInsp(); render(); toast('TAG gerada: ' + i.info.tag); };
    $('#f_info_tag') && $('#f_info_tag').addEventListener('input', () => { if (i.info.tagAuto) { i.info.tagAuto = false; } });
    $('#f_info_tag') && $('#f_info_tag').addEventListener('change', e => pintaHistCaixa(e.target.value));
    $('#bQrTag') && ($('#bQrTag').onclick = () => lerQR(tag => { if (!tag) return; i.info.tag = tag; i.info.tagAuto = false; saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); toast('TAG lida: ' + tag); }));
    if (i.info.tag) pintaHistCaixa(i.info.tag);
  }
  if (key === 'lpu') afterLpu(i);
  if (key === 'implcheck') $('#bAllOkImpl').onclick = () => { (IMPL_CHECK[i.impl.servico] || []).forEach(([k]) => { if (!i.impl.check[k]) i.impl.check[k] = 'OK'; }); saveInsp(); render(); };
  $$('[data-implserv]', app).forEach(b => b.onclick = () => { i.impl.servico = b.dataset.implserv; saveInsp(); render(); });
  $$('[data-vtipo]', app).forEach(b => b.onclick = () => { i.vist.tipo = b.dataset.vtipo; saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
  if (key === 'vist' && i.vist && i.vist.tipo === 'caixa') { if (i.info.tag) pintaHistCaixa(i.info.tag); $('#f_info_tag') && $('#f_info_tag').addEventListener('change', e => pintaHistCaixa(e.target.value)); $('#bGerTagV') && ($('#bGerTagV').onclick = async () => { if (i.info.tag && !confirm('Trocar a TAG ' + i.info.tag + ' por uma nova?')) return; await geraTag(i); saveInsp(true); const y = window.scrollY; render(); window.scrollTo(0, y); toast('TAG gerada: ' + i.info.tag); }); $('#bQrTagV') && ($('#bQrTagV').onclick = () => lerQR(t => { const tag = tagDoQR(t); if (!tag) { toast('QR sem TAG reconhecível.'); return; } i.info.tag = tag; saveInsp(true); const y = window.scrollY; render(); window.scrollTo(0, y); })); }
  if (isSite(i)) afterSite(i, key);
  if (key === 'impl' || key === 'vist' || key === 'site') { $('#bLocImpl') && ($('#bLocImpl').onclick = async () => { const l = await posAtual(5000); if (l) { i.loc = l; saveInsp(); preencherEndereco(true); render(); } else toast('Sem sinal de GPS.'); }); }
  if (key === 'check') $('#bAllOk').onclick = () => { CHECK.forEach(([k]) => { if (!i.check[k]) i.check[k] = 'OK'; }); saveInsp(); render(); };
  if (key === 'fusoes') {
    bindMapaFusao(i);
    $('#foLista') && $('#foLista').addEventListener('toggle', e => { S.foLista = e.target.open; });
    $('#foTot').onchange = e => { i.fo.total = +e.target.value; i.cabos.entrada.fibras = String(i.fo.total); ensureRows(i); syncFo(i); saveInsp(); render(); };
    $$('[data-fmodo]').forEach(b => b.onclick = () => { i.fo.modo = b.dataset.fmodo; if (i.fo.modo === 'exc' && !i.fo.exc.length) i.fo.exc.push({ tipo: 'manobra', fo: '', fib: '', cabo: 'S1', mot: '' }); syncFo(i); saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
    $('#bExAdd') && ($('#bExAdd').onclick = () => { i.fo.exc.push({ tipo: 'manobra', fo: '', fib: '', cabo: 'S1', mot: '' }); saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
    $$('[data-exct]').forEach(b => b.onclick = () => { i.fo.exc[+b.dataset.exct].tipo = b.dataset.v; syncFo(i); saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
    $$('[data-exdel]').forEach(b => b.onclick = () => { i.fo.exc.splice(+b.dataset.exdel, 1); syncFo(i); saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
    $$('[data-fore2]').forEach(el => el.addEventListener('change', () => { syncFo(i); saveInsp(); }));
    $$('details.tubo').forEach(d => d.addEventListener('toggle', () => { const t = +d.dataset.tube; if (d.open === S.openTubes.has(t)) return; if (d.open) S.openTubes.add(t); else S.openTubes.delete(t); const y = window.scrollY; render(); window.scrollTo(0, y); }));
    const setFib = (k, tub, fib) => { const r = i.fo.rows[k]; r.fib = String((tub - 1) * 12 + fib); saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); };
    $$('[data-fot]').forEach(el => el.onchange = () => { const k = +el.dataset.fot; const cur = i.fo.rows[k].fib ? tf(+i.fo.rows[k].fib).f : 1; setFib(k, +el.value, cur); });
    $$('[data-fof]').forEach(el => el.onchange = () => { const k = +el.dataset.fof; const cur = i.fo.rows[k].fib ? tf(+i.fo.rows[k].fib).t : 1; setFib(k, cur, +el.value); });
    $$('[data-fo]').forEach(b => b.onclick = () => { const r = i.fo.rows[+b.dataset.fo]; r.f = !r.f; if (r.f && !r.fib) r.fib = String(+b.dataset.fo + 1); saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
    $('#bSeq') && ($('#bSeq').onclick = () => { ensureRows(i); for (let k = 0; k < i.fo.total; k++) { const r = i.fo.rows[k]; r.f = true; r.cabo = 'S1'; r.fib = String(k + 1); } saveInsp(); render(); toast('Todas as fibras marcadas 1→1 na Saída 1. Ajuste as que forem diferentes.'); });
    $('#bLimpaFo') && ($('#bLimpaFo').onclick = () => { i.fo.rows.forEach(r => { r.f = false; r.fib = ''; r.band = ''; }); saveInsp(); render(); });
  }
  if (key === 'fotos') {
    S.fotoMode = 'insp';
    $('#bCam').onclick = () => { S.fotoMode = 'insp'; $('#fileCam').click(); }; $('#bGal').onclick = () => { S.fotoMode = 'insp'; $('#fileGal').click(); };
    $$('[data-cat]').forEach(b => b.onclick = () => { S.fotoCat = b.dataset.cat; const y = window.scrollY; render(); window.scrollTo(0, y); });
    $$('[data-ph]').forEach(img => { const p = i.fotos[+img.dataset.ph]; if (p) fotoBlob(p).then(bl => { if (bl) { img.src = URL.createObjectURL(bl); img.onload = () => URL.revokeObjectURL(img.src); } }); });
    $$('[data-delph]').forEach(b => b.onclick = () => { if (!confirm('Remover esta foto?')) return; i.fotos.splice(+b.dataset.delph, 1); saveInsp(); render(); });
  }
  if (key === 'final') {
    sigInit();
    $('#bPdf').onclick = async () => { const f = await gerarPdfInsp(i); if (f) baixar(f); };
    $('#bKmz').onclick = async () => { const f = isSite(i) ? await kmzSite(i) : await kmzInsp(i); if (f) exportar(f); };
    $('#bWa').onclick = async () => { const f = await gerarPdfInsp(i); if (f) compartilhar([f], textoInsp(i)); };
    $('#bConcluir').onclick = concluirInsp;
  }
}
['fileCam', 'fileGal'].forEach(id => $('#' + id).addEventListener('change', async e => {
  const files = Array.from(e.target.files || []); e.target.value = '';
  if (!files.length) return;
  if (S.fotoMode === 'odoIni' || S.fotoMode === 'odoFim') {
    const modo = S.fotoMode; S.fotoMode = 'insp';
    try { const loc = S.gps.last; const p = await processarFoto(files[0], loc, { cat: modo === 'odoIni' ? 'Odômetro inicial' : 'Odômetro final', tag: 'Rede', tecnico: S.perfil.nome }); p.id = uid(); p.odo = modo; if (modo === 'odoIni') { S.odoFotoIni = p.id; S.odoFotoIniData = p; } else if (S.ronda) { p.rondaId = S.ronda.id; await DB.put('fotos', p); S.ronda.odoFotoFim = p.id; saveRonda(true); } toast('Foto do painel registrada.'); } catch (err) { toast('Não foi possível ler a foto.'); }
    const y = window.scrollY; render(); window.scrollTo(0, y); return;
  }
  if (S.fotoMode === 'apr') {
    S.fotoMode = 'insp'; const r = S.ronda; if (!r || !S.aprRasc) return;
    try { const loc = S.gps.last; const p = await processarFoto(files[0], loc, { cat: 'APR / EPI', tag: 'Rede', tecnico: S.perfil.nome }); p.id = uid(); p.rondaId = r.id; p.apr = true; await DB.put('fotos', p); S.aprRasc.foto = p.id; } catch (err) { toast('Não foi possível ler a foto.'); }
    const v = S.aprVolta; S.aprVolta = null; v && v(); return;
  }
  if (S.fotoMode === 'rede') {
    const r = S.ronda; if (!r || r.fim) return;
    toast('Processando foto da rede…', 6000);
    const loc = await posAtual(60000);
    for (const f of files) { try { const p = await processarFoto(f, loc, { cat: S.fotoCatRede || CATS_REDE[0], tag: 'Rede', tecnico: r.tecnico }); p.rondaId = r.id; if (r.dono === 'conjunta') p.dono = S.donoConj === 'master' ? 'master' : 'multivale'; await DB.put('fotos', p); } catch (err) { toast('Não foi possível ler a foto.'); } }
    S.redeFotos = await fotosRede(r.id); render(); toast('Foto da rede registrada com GPS.'); return;
  }
  if (!S.insp) return;
  toast(files.length > 1 ? `Processando ${files.length} fotos…` : 'Processando foto…', 6000);
  const loc = S.gps.last && Date.now() - S.gps.last.ts < 120000 ? S.gps.last : S.insp.loc; let nVert = 0;
  for (const f of files) { try { const p = await processarFoto(f, loc, { cat: S.fotoCat || catsOf(S.insp)[0], tag: isSite(S.insp) ? 'Site ' + (S.insp.site.sigla || '') : S.insp.info.tag, ticket: isCorr(S.insp) ? S.insp.corr.ticket : isImpl(S.insp) ? S.insp.impl.designacao : '', tecnico: S.insp.info.tecnico, endereco: [S.insp.info.endereco, S.insp.info.bairro, S.insp.info.cidade].filter(Boolean).join(', ') }); if (p.h > p.w * 1.05) { p.vertical = true; nVert++; } S.insp.fotos.push(p); } catch (err) { toast('Não foi possível ler uma das fotos.'); } }
  saveInsp(true); render(); if (nVert) toast(`${nVert === 1 ? 'Foto tirada em pé' : nVert + ' fotos tiradas em pé'}. Da próxima vez, deite o celular (horizontal): fica melhor no relatório.`, 5000); else toast('Foto adicionada: ' + (S.fotoCat || catsOf(S.insp)[0]) + '.');
}));
async function fotosRede(rondaId) { return (await DB.all('fotos')).filter(f => f.rondaId === rondaId && !f.apr).sort((a, b) => a.ts - b.ts); }
// Foto com carimbo no padrão Multivale: hora, data, endereço, latitude/longitude e, na faixa branca,
// o nome e a função do técnico com o logo da Multivale.
let LOGO_IMG = null;
function logoImg() { if (LOGO_IMG) return LOGO_IMG; LOGO_IMG = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'logo.png'; }); return LOGO_IMG; }
const END_CACHE = new Map();
async function enderecoDe(loc) {
  if (!loc || loc.lat == null) return ''; const k = loc.lat.toFixed(4) + ',' + loc.lon.toFixed(4); if (END_CACHE.has(k)) return END_CACHE.get(k);
  try { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${loc.lat}&lon=${loc.lon}`, { headers: { 'Accept-Language': 'pt-BR' }, signal: ctl.signal }); clearTimeout(t); const j = await r.json(); const a = j.address || {};
    const rua = [a.road || a.pedestrian || a.footway || a.path, a.house_number].filter(Boolean).join(', '); const bai = a.suburb || a.neighbourhood || a.quarter || a.village || '';
    const cid = a.city || a.town || a.municipality || a.village || ''; const uf = (a['ISO3166-2-lvl4'] || '').replace('BR-', '') || a.state || '';
    const txt = [rua, bai].filter(Boolean).join(' - ') + (cid ? `, ${cid}${uf ? ' - ' + uf : ''}` : '') + (a.postcode ? `, ${a.postcode}` : '');
    END_CACHE.set(k, txt); return txt; } catch (e) { return ''; }
}
function quebraTexto(x, txt, larg) { const out = []; let lin = ''; String(txt || '').split(/\s+/).forEach(w => { const t = lin ? lin + ' ' + w : w; if (x.measureText(t).width > larg && lin) { out.push(lin); lin = w; } else lin = t; }); if (lin) out.push(lin); return out; }
const MES_AB = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'], DIA_AB = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
async function processarFoto(file, loc, o) {
  let bmp; try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); }); }
  const max = 1600, sc = Math.min(1, max / Math.max(bmp.width, bmp.height)); const w = Math.round(bmp.width * sc), h = Math.round(bmp.height * sc);
  const ts = Date.now(); const d = new Date(ts); const u = Math.min(w, h * 1.4) / 100; // unidade de escala
  const rodape = Math.round(u * 8.2); const c = document.createElement('canvas'); c.width = w; c.height = h + rodape; const x = c.getContext('2d');
  x.drawImage(bmp, 0, 0, w, h);
  const end = await enderecoDe(loc) || o.endereco || '';
  // degradê para leitura do texto
  const gH = Math.round(h * 0.5); const g = x.createLinearGradient(0, h - gH, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.62)'); x.fillStyle = g; x.fillRect(0, h - gH, w, gH);
  x.textBaseline = 'alphabetic'; x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = u * 0.6; x.fillStyle = '#fff';
  const m = Math.round(u * 1.8); const fEnd = Math.round(u * 2.6), fCoord = Math.round(u * 2.1), fHoraPx = Math.round(u * 8.4), fData_ = Math.round(u * 2.9);
  x.font = `500 ${fEnd}px "Roboto Condensed","Arial Narrow",Arial,sans-serif`; const lEnd = quebraTexto(x, end, w * 0.62).slice(0, 2);
  let y = h - m; // de baixo para cima
  const coord = loc && loc.lat != null ? `Lat ${loc.lat.toFixed(6)}  ·  Lon ${loc.lon.toFixed(6)}${loc.acc ? `  ·  ±${loc.acc} m` : ''}` : 'Sem GPS no momento da foto';
  x.font = `500 ${fCoord}px "Roboto Condensed","Arial Narrow",Arial,sans-serif`; x.globalAlpha = 0.92; x.fillText(coord, m, y); x.globalAlpha = 1; y -= fCoord * 1.55;
  x.font = `500 ${fEnd}px "Roboto Condensed","Arial Narrow",Arial,sans-serif`; for (let k = lEnd.length - 1; k >= 0; k--) { x.fillText(lEnd[k], m, y); y -= fEnd * 1.25; }
  y -= fEnd * 0.35; const baseHora = y;
  x.font = `400 ${fHoraPx}px "Roboto Condensed","Arial Narrow",Arial,sans-serif`; const hTxt = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; x.fillText(hTxt, m, baseHora); const hw = x.measureText(hTxt).width;
  x.shadowBlur = 0; x.fillStyle = '#f2b705'; x.fillRect(m + hw + u * 1.6, baseHora - fHoraPx * 0.78, Math.max(2, u * 0.45), fHoraPx * 0.8); x.fillStyle = '#fff'; x.shadowBlur = u * 0.6;
  x.font = `500 ${fData_}px "Roboto Condensed","Arial Narrow",Arial,sans-serif`; const dx = m + hw + u * 3.6;
  x.fillText(`${pad2(d.getDate())} ${MES_AB[d.getMonth()]} ${d.getFullYear()}`, dx, baseHora - fHoraPx * 0.44); x.fillText(DIA_AB[d.getDay()], dx, baseHora - fHoraPx * 0.02);
  // categoria e O.S. no canto superior esquerdo
  const sub = [o.cat, o.ticket ? 'O.S. ' + o.ticket : o.tag && o.tag !== 'Rede' ? 'TAG ' + o.tag : ''].filter(Boolean).join('  ·  ');
  if (sub) { x.font = `600 ${Math.round(u * 2.2)}px "Roboto Condensed","Arial Narrow",Arial,sans-serif`; x.fillText(sub.toUpperCase(), m, m + u * 2.2); }
  x.shadowBlur = 0;
  // faixa branca: técnico, função e logo da Multivale
  x.fillStyle = '#fff'; x.fillRect(0, h, w, rodape); x.fillStyle = '#e4e4e4'; x.fillRect(0, h, w, Math.max(1, u * 0.12));
  const nome = String(o.tecnico || S.perfil.nome || '').toUpperCase(); const func = o.funcao || cargoLb(S.perfil);
  x.fillStyle = '#222'; x.font = `700 ${Math.round(u * 2.9)}px "Roboto Condensed","Arial Narrow",Arial,sans-serif`; x.fillText(nome, m, h + rodape * 0.47);
  x.fillStyle = '#444'; x.font = `400 ${Math.round(u * 2.5)}px "Roboto Condensed","Arial Narrow",Arial,sans-serif`; x.fillText(func, m, h + rodape * 0.8);
  const lg = await logoImg(); if (lg) { const lh = rodape * 0.72, lw = lg.width * lh / lg.height; x.drawImage(lg, w - m - lw, h + (rodape - lh) / 2, lw, lh); } else { x.fillStyle = '#0b5f99'; x.textAlign = 'right'; x.font = `800 ${Math.round(u * 3)}px Arial,sans-serif`; x.fillText('MULTIVALE', w - m, h + rodape * 0.62); x.textAlign = 'left'; }
  const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
  return { id: uid(), cat: o.cat, desc: '', blob, w, h: h + rodape, ts, lat: loc && loc.lat, lon: loc && loc.lon, end };
}
function sigInit() {
  const c = $('#sig'); const i = S.insp; const dpr = window.devicePixelRatio || 1;
  const w = c.clientWidth, h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; const x = c.getContext('2d'); x.scale(dpr, dpr); x.lineWidth = 2.4; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#111';
  if (i.assinatura) { const im = new Image(); im.onload = () => x.drawImage(im, 0, 0, w, h); im.src = i.assinatura; }
  let drawing = false, last = null;
  const pos = e => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  c.addEventListener('pointerdown', e => { drawing = true; last = pos(e); c.setPointerCapture(e.pointerId); x.beginPath(); x.arc(last[0], last[1], 1.1, 0, Math.PI * 2); x.fillStyle = '#111'; x.fill(); });
  c.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); x.beginPath(); x.moveTo(last[0], last[1]); x.lineTo(p[0], p[1]); x.stroke(); last = p; });
  const end = () => { if (!drawing) return; drawing = false; i.assinatura = c.toDataURL('image/png'); saveInsp(); pendUpd(); };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  $('#bSigClear').onclick = () => { x.clearRect(0, 0, w, h); i.assinatura = null; saveInsp(); pendUpd(); };
}

/* ---------- resumo da ronda ---------- */
function viewRonda(r) {
  const { t, segs } = totais(r);
  const ins = r.eventos.filter(e => e.tipo === 'chegada').map(e => S.inspCache.get(e.inspId)).filter(Boolean);
  return `<section class="card"><div class="hero"><span class="lb">${isCorr(r) ? 'Corretiva · Ticket ' + esc(r.ticket) + (r.fim ? ' · encerrada' : ' · em andamento') : r.fim ? 'Ronda encerrada' : 'Ronda em andamento'}</span><div class="big">${esc(r.tecnico)} · ${fData(r.inicio)}</div><span class="muted small">${fHora(r.inicio)} até ${r.fim ? fHora(r.fim) : 'agora'}${veicTxt(r.veiculo) ? ' · ' + esc(veicTxt(r.veiculo)) : (r.placa ? ' · Veículo ' + esc(r.placa) : '')}</span></div>
    <div class="stats"><div class="stat"><b>${fDur(t.dur)}</b><span>Duração</span></div><div class="stat"><b>${fKm(t.km)}</b><span>Total</span></div><div class="stat"><b>${fKm(t.desl + t.ret)}</b><span>Deslocamento</span></div><div class="stat"><b>${fKm(t.cabo)}</b><span>Rota do cabo</span></div></div>
    ${(() => { const o = odoInfo(r); return `<div class="stats"><div class="stat"><b>${fOdo(kmNum(r.odoIni))}</b><span>Odômetro inicial</span></div><div class="stat"><b>${fOdo(kmNum(r.odoFim))}</b><span>Odômetro final</span></div><div class="stat"><b>${o ? fKm(o.odo) : '—'}</b><span>Km odômetro</span></div><div class="stat"><b>${fKm(totais(r).t.km)}</b><span>Km GPS</span></div></div>
    ${o && ADMIN ? (o.diverge ? `<div class="warnbox" style="border-color:var(--bad);background:var(--bad-soft)"><b>Odômetro não confere com o GPS:</b> ${esc(odoTxt(o))}. Pode indicar uso do veículo fora da atividade ou trechos sem GPS.</div>` : `<div class="okbox">Odômetro confere com o GPS: ${esc(odoTxt(o))}.</div>`) : (!o && r.fim && kmNum(r.odoIni) != null ? `<div class="grid2"><div class="field"><label class="lb" for="odoFimR">Odômetro final (km)</label><input type="text" inputmode="numeric" id="odoFimR" value="${esc(r.odoFim || '')}"></div><div class="field" style="justify-content:flex-end"><button class="btn" id="bSalvaOdo">Salvar odômetro</button></div></div>` : '')}`; })()}
    ${!ADMIN ? '' : (() => { const vs = velStats(r); const rt = r.rotaId ? rotaById(r.rotaId) : null; const cb = cobertura(rt, [r]); return `<div class="stats"><div class="stat"><b>${fVel(vs.vmax)}</b><span>Vel. máxima</span></div><div class="stat"><b>${fVel(vs.vmed)}</b><span>Vel. média</span></div><div class="stat"><b style="color:${vs.exc.length ? 'var(--bad)' : 'inherit'}">${vs.exc.length}</b><span>Acima de ${vs.lim} km/h</span></div><div class="stat"><b>${cb ? fPct(cb.pct) : '—'}</b><span>Rota percorrida</span></div></div>
    ${vs.exc.length ? `<div class="warnbox" style="border-color:var(--bad);background:var(--bad-soft)"><b>Excesso de velocidade (limite ${vs.lim} km/h):</b><br>${vs.exc.map(e => `${fHora(e.ini)} · ${fVel(e.vmax)} por ${fDur(Math.max(e.fim - e.ini, 60000))} · <a href="https://maps.google.com/?q=${e.lat},${e.lon}" target="_blank" rel="noopener">ver local</a>`).join('<br>')}</div>` : ''}
    ${cb ? `<p class="small" style="margin:0">Traçado cadastrado da rota: <b>${fKm(cb.covKm)} de ${fKm(cb.totKm)}</b> percorridos nesta atividade (${fPct(cb.pct)}).</p>` : ''}
    ${(() => { const ad = aderencia(r); if (!ad) return ADMIN && r.rotaId && !isCorr(r) ? '<p class="muted small" style="margin:0">Importe o KMZ do traçado na rota para verificar se o percurso ficou dentro da rota.</p>' : ''; if (ad.pct == null) return ''; return ad.desvios.length ? `<div class="warnbox" style="border-color:var(--bad);background:var(--bad-soft)"><b>Trajeto não compatível com a rota do backbone em ${ad.desvios.length} trecho(s)</b> (${fKm(ad.kmFora)} fora do traçado, ${fPct(100 - ad.pct)} do percurso entre caixas):<br>${ad.desvios.map((x, k) => `D${k + 1}: ${fHora(x.ini)}–${fHora(x.fim)} · ${fKm(x.km)} · até ${fDmax(x.dmax)} do traçado · entre ${esc(x.de)} e ${esc(x.para)}`).join('<br>')}</div>` : `<div class="okbox">Percurso entre as caixas <b>compatível com a rota do backbone</b>: ${fPct(ad.pct)} dentro do traçado (tolerância de ${DESVIO_M} m).</div>`; })()}`; })()}
    <div class="map" id="mapR" role="img" aria-label="Mapa do percurso"></div>
    <div class="legend"><span><i style="background:${SEGCOR.desl}"></i>Deslocamento</span><span><i style="background:${SEGCOR.cabo}"></i>Rota do cabo</span><span><i style="background:${SEGCOR.ret}"></i>Retorno</span>${ADMIN ? '<span><i style="background:#b4231b"></i>Desvio da rota</span>' : ''}<span><i style="background:#6b7785"></i>Traçado cadastrado</span></div>
    ${t.gapN ? `<div class="warnbox">${t.gapN} trecho(s) sem registro de GPS por mais de 3 min (total ${fDur(t.gapMs)}). Nesses trechos o app estava fechado, em segundo plano ou sem sinal.</div>` : ''}
    <div class="row"><button class="btn wa" id="bWaR">${ICON.wa}Enviar ${isCorr(r) ? 'resumo' : 'ronda'} no WhatsApp</button><button class="btn" id="bPdfR">${ICON.pdf}Baixar PDF da ronda</button></div>
    <button class="btn block" id="bKmzR">${ICON.pin}Exportar KMZ do percurso (Google Earth)</button>
    ${ins.length ? `<button class="btn block" id="bTudo">${ICON.wa}Enviar ${isCorr(r) ? 'resumo + relatório da corretiva' : `ronda + relatórios das ${ins.length} caixas`}</button>` : ''}</section>
  <section class="card"><h2>Trechos</h2><div class="tw"><table class="t"><thead><tr><th>Trecho</th><th>De → Para</th><th>Horário</th><th class="r">Km</th></tr></thead><tbody>
    ${segs.map(s => `<tr><td><b style="color:${SEGCOR[s.tipo]}">${SEGLB[s.tipo]}</b></td><td>${esc(s.de)} → ${esc(s.para)}</td><td>${fHora(s.ini)}–${fHora(s.fim)}<br><span class="muted small">${fDur(s.fim - s.ini)}</span></td><td class="r">${fKm(s.km)}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><h2>Fotos da rede</h2><div class="photos" id="galRede"><p class="muted" style="margin:0">Carregando…</p></div></section>
  <section class="card"><h2>Caixas inspecionadas</h2>${ins.length ? `<div class="list">${ins.map((i, k) => itemInsp(i, k + 1)).join('')}</div>` : '<p class="muted" style="margin:0">Nenhuma caixa nesta ronda.</p>'}</section>`;
}
function galeriaRede(r) {
  const g = $('#galRede'); if (!g) return; const fs = S.redeFotos || [];
  if (!fs.length) { g.outerHTML = '<p class="muted" style="margin:0" id="galRede">Nenhuma foto da rede nesta ronda.</p>'; return; }
  g.innerHTML = fs.map((p, k) => `<div class="ph"><img data-rph="${k}" alt="${esc(p.cat)}"><span class="tag">${esc(p.cat)}</span><div class="pb"><span class="small">${fHora(p.ts)}${p.lat != null ? ` · <a href="https://maps.google.com/?q=${p.lat},${p.lon}" target="_blank" rel="noopener">ver no mapa</a>` : ''}</span><input type="text" data-rdesc="${k}" value="${esc(p.desc)}" placeholder="Descrição (opcional)" aria-label="Descrição da foto da rede ${k + 1}"><button class="del" data-rdel="${k}">Remover foto</button></div></div>`).join('');
  $$('[data-rph]', g).forEach(img => { const p = fs[+img.dataset.rph]; fotoBlob(p).then(bl => { if (bl) { img.src = URL.createObjectURL(bl); img.onload = () => URL.revokeObjectURL(img.src); } }); });
  $$('[data-rdesc]', g).forEach(el => el.addEventListener('input', () => { const p = fs[+el.dataset.rdesc]; p.desc = el.value; DB.put('fotos', p); }));
  $$('[data-rdel]', g).forEach(b => b.onclick = async () => { if (!confirm('Remover esta foto da rede?')) return; await DB.del('fotos', fs[+b.dataset.rdel].id); S.redeFotos = await fotosRede(r.id); galeriaRede(r); });
}
async function afterRonda() {
  const r = S.rondaView;
  $('#bSalvaOdo') && ($('#bSalvaOdo').onclick = async () => { r.odoFim = $('#odoFimR').value; await DB.put('rondas', r); render(); }); S.redeFotos = await fotosRede(r.id); galeriaRede(r); drawLiveMap('mapR', r, !r.fim); bindOpen();
  $('#bPdfR').onclick = async () => { const f = await gerarPdfRonda(r); if (f) baixar(f); };
  $('#bWaR').onclick = async () => { const f = await gerarPdfRonda(r); if (f) compartilhar([f], textoRonda(r)); };
  $('#bKmzR').onclick = async () => { const f = await kmzRonda(r); if (f) exportar(f); };
  $('#bTudo') && ($('#bTudo').onclick = async () => {
    const files = []; const f = await gerarPdfRonda(r); if (!f) return; files.push(f);
    for (const e of r.eventos.filter(e => e.tipo === 'chegada')) { const i = S.inspCache.get(e.inspId); if (i) { const g = await gerarPdfInsp(i, true); if (g) files.push(g); } }
    compartilhar(files, textoRonda(r));
  });
}

