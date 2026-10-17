// Técnico Plus - Multivale · rotas cadastradas e ações da ronda
// Os arquivos app-*.js carregam em ordem (ver index.html) e compartilham o mesmo escopo global.
'use strict';
/* ============================ rotas cadastradas ============================ */
const rotaLb = r => r ? [r.codigo, r.nome].filter(Boolean).join(' · ') + (r.pontaA || r.pontaB ? ` (${r.pontaA || '?'} > ${r.pontaB || '?'})` : '') : '';
const rotaById = id => (S.rotas || []).find(r => r.id === id);
async function carregaRotas() { const all = await DB.all('rotas'); S.sobs = all.filter(r => r.sobreposicao); S.rotas = all.filter(r => !r.sobreposicao).sort((a, b) => String(a.codigo).localeCompare(String(b.codigo))); }
// rota do supervisor (arquivo oficial): o técnico não altera; registra uma sobreposição, que fica por cima até o supervisor trocar o arquivo
const rotaAutor = rt => (rt && (rt._autor || rt._uid)) || '';
const rotaOficial = rt => !ADMIN && !!rt && !rt._novo && !rt.sobreposicao && !!rotaAutor(rt) && !!(Nuvem.user && Nuvem.user.id) && rotaAutor(rt) !== Nuvem.user.id;
const sobsDe = rt => (S.sobs || []).filter(x => x.base === rt.id && (ADMIN || rotaAutor(x) === (Nuvem.user && Nuvem.user.id)));
function sobsHtml(rt) {
  const L = sobsDe(rt); if (!L.length && !rotaOficial(rt)) return '';
  return `<section class="card"><h2>Sobreposições do traçado</h2><p class="muted small" style="margin:0">${ADMIN ? 'Correções de traçado enviadas pelos técnicos. O arquivo original continua o mesmo até você usar uma sobreposição ou trocar o arquivo.' : 'Esta é uma rota oficial do supervisor: o arquivo original não muda. Se o cabo mudou de caminho, envie uma sobreposição (KMZ/KML) com o trecho novo e uma observação; ela aparece em laranja por cima da rota e o supervisor decide se troca o arquivo.'}</p>
    ${L.map(x => `<div class="item" style="cursor:default;flex-wrap:wrap;gap:8px"><span class="badge" style="background:#fde7c7;color:#b85300">${ICON.pin}</span><span class="tx" style="flex:1 1 200px"><b>${esc(x.autorNome || 'Técnico')} · ${x.em ? fDH(x.em) : ''}</b><span>${x.kml ? esc(x.kml.arquivo || '') + ' · ' + fKm(x.kml.km || 0) : 'sem traçado'}${x.obs ? ' · ' + esc(x.obs) : ''}</span></span><span class="row" style="gap:6px;flex-wrap:wrap">${ADMIN ? `<button type="button" class="btn go" data-sobjunta="${esc(x.id)}" style="min-height:40px">Juntar ao KMZ raiz</button><button type="button" class="btn" data-sobusar="${esc(x.id)}" style="min-height:40px">Trocar o arquivo oficial</button>` : ''}<button type="button" class="btn" data-sobdel="${esc(x.id)}" style="min-height:40px">${ADMIN ? 'Descartar' : 'Remover'}</button></span></div>`).join('') || '<p class="muted small" style="margin:0">Nenhuma sobreposição enviada.</p>'}
    ${!ADMIN ? `<div class="field"><label class="lb" for="sobObs">Observação da sobreposição</label><input type="text" id="sobObs" placeholder="Ex.: cabo desviado na Rua X por obra da prefeitura"></div><input type="file" id="fileSob" accept=".kmz,.kml,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml" hidden><button type="button" class="btn pri" id="bSob">${ICON.pin}Enviar sobreposição (KMZ/KML)</button>` : ''}</section>`;
}
async function bindSobs(rt) {
  $$('[data-sobdel]').forEach(b => b.onclick = async () => { if (!confirm(ADMIN ? 'Descartar esta sobreposição?' : 'Remover a sua sobreposição?')) return; await DB.del('rotas', b.dataset.sobdel); await carregaRotas(); const y = window.scrollY; render(); window.scrollTo(0, y); });
  $$('[data-sobusar]').forEach(b => b.onclick = async () => { const x = (S.sobs || []).find(o => o.id === b.dataset.sobusar); if (!x || !x.kml) { toast('Sobreposição sem traçado.'); return; } if (!confirm('Trocar o arquivo oficial desta rota pelo traçado desta sobreposição? As outras sobreposições da rota serão descartadas.')) return;
    const r0 = await DB.get('rotas', rt.id); const nv = { ...r0, kml: { ...x.kml, arquivo: (x.kml.arquivo || 'sobreposicao') + ' (sobreposição de ' + (x.autorNome || 'técnico') + ')', em: Date.now() }, atualizado: Date.now() }; await DB.put('rotas', nv);
    for (const o of sobsDe(rt)) await DB.del('rotas', o.id); await carregaRotas(); S.rotaEdit = { ...nv }; toast('Arquivo oficial trocado.'); render(); });
  $$('[data-sobjunta]').forEach(b => b.onclick = async () => { const x = (S.sobs || []).find(o => o.id === b.dataset.sobjunta); if (!x || !x.kml) { toast('Sobreposição sem traçado.'); return; } if (!confirm('Juntar o traçado e as caixas desta atualização ao KMZ raiz da rota? O que já existe no arquivo continua.')) return;
    const r0 = await DB.get('rotas', rt.id); const nv = { ...r0, kml: juntaKml(r0.kml, x.kml, `${x.origem === 'ronda' ? 'ronda' : 'sobreposição'} de ${x.autorNome || 'técnico'} ${fData(x.em || Date.now())}`), atualizado: Date.now() }; await DB.put('rotas', nv); await DB.del('rotas', x.id); await carregaRotas(); S.rotaEdit = { ...nv }; toast('KMZ raiz atualizado.'); render(); });
  $('#bSob') && ($('#bSob').onclick = () => $('#fileSob').click());
  $('#fileSob') && ($('#fileSob').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const k = parseKml(await lerKml(f)); if (!k.linhas.length && !k.pontos.length) { toast('O arquivo não tem linhas nem pontos.'); return; }
    const me = Nuvem.user && Nuvem.user.id; const x = { id: 'sob_' + rt.id + '_' + String(me || uid()).slice(0, 12) + '_' + Date.now().toString(36), sobreposicao: true, base: rt.id, codigo: rt.codigo, nome: 'Sobreposição de ' + rt.codigo, kml: { ...k, arquivo: f.name, em: Date.now() }, obs: ($('#sobObs').value || '').trim(), autorNome: S.perfil.nome || '', _autor: me || '', em: Date.now(), atualizado: Date.now() };
    await DB.put('rotas', x); await carregaRotas(); toast('Sobreposição enviada ao supervisor. O arquivo original continua o mesmo.', 5000); const y = window.scrollY; render(); window.scrollTo(0, y); } catch (err) { toast('Não foi possível ler: ' + err.message, 6000); } });
}
function rotaOpts(sel, vazio) { return `<option value="">${vazio}</option>` + (S.rotas || []).map(r => `<option value="${r.id}" ${r.id === sel ? 'selected' : ''}>${esc(rotaLb(r))}</option>`).join(''); }
async function dadosRota(rt) {
  const rs = (await DB.all('rondas')).filter(r => r.rotaId === rt.id);
  const ins = (await DB.all('inspecoes')).filter(i => i.info.rotaId === rt.id); ins.forEach(i => S.inspCache.set(i.id, i));
  for (const r of rs) await cacheInspRonda(r);
  const trac = []; rs.forEach(r => segmentos(r).filter(s => s.tipo === 'cabo' && s.pts.length > 1).forEach(s => trac.push({ ...s, ronda: r })));
  const porTag = new Map(); ins.sort((a, b) => a.chegada - b.chegada).forEach(i => porTag.set(i.info.tag || i.id, i));
  (await caixasRotaNuvem(rt)).forEach(e => { if (!e || !e.info) return; const t = e.info.tag || e.id; const x = porTag.get(t); if (!x || (e.chegada || 0) >= (x.chegada || 0)) porTag.set(t, e); });
  const caixas = [...porTag.values()];
  const km = trac.reduce((a, s) => a + s.km, 0);
  return { rs, caixas, trac, km };
}
function viewRotaForm(rt) {
  const v = k => esc(rt[k] ?? '');
  return `<section class="card"><h2>${rt._novo ? 'Cadastrar rota' : 'Rota ' + esc(rt.codigo)}</h2>
    <div class="grid2"><div class="field"><label class="lb" for="rt_codigo">Código da rota <span class="req">*</span></label><input type="text" id="rt_codigo" data-rt="codigo" value="${v('codigo')}" placeholder="Ex.: BKB-SP-01" autocapitalize="characters"></div>
    <div class="field"><label class="lb" for="rt_nome">Nome</label><input type="text" id="rt_nome" data-rt="nome" value="${v('nome')}" placeholder="Ex.: Anel Centro"></div>
    <div class="field"><label class="lb" for="rt_a">Ponta A (início)</label><input type="text" id="rt_a" data-rt="pontaA" value="${v('pontaA')}" placeholder="Ex.: Estação Sé"></div>
    <div class="field"><label class="lb" for="rt_b">Ponta B (fim)</label><input type="text" id="rt_b" data-rt="pontaB" value="${v('pontaB')}" placeholder="Ex.: Estação Paraíso"></div>
    <div class="field"><label class="lb" for="rt_sa">Sigla do site A</label><input type="text" id="rt_sa" data-rt="siglaA" value="${v('siglaA')}" placeholder="${esc(siglaSite({ pontaA: rt.pontaA }, 'A') || 'Ex.: PDA')}" autocapitalize="characters" maxlength="8"></div>
    <div class="field"><label class="lb" for="rt_sb">Sigla do site B</label><input type="text" id="rt_sb" data-rt="siglaB" value="${v('siglaB')}" placeholder="${esc(siglaSite({ pontaB: rt.pontaB }, 'B') || 'Ex.: CPJ')}" autocapitalize="characters" maxlength="8"></div>
    <span class="muted small field full" style="margin-top:-6px">As siglas formam a TAG das caixas e o nome do trecho (ex.: PDA x CPJ) e identificam os DGOs das pontas.</span>
    <div class="field"><label class="lb" for="rt_cap">Cabo (nº de fibras)</label><select id="rt_cap" data-rt="cap"><option value="">Selecione…</option>${CAPS.map(c => `<option value="${c}" ${String(rt.cap) === String(c) ? 'selected' : ''}>${c} FO</option>`).join('')}</select></div>
    <div class="field"><label class="lb" for="rt_marca">Marca / tipo do cabo</label><input type="text" id="rt_marca" data-rt="marca" value="${v('marca')}" placeholder="Ex.: Furukawa AS-80"></div>
    ${donoHtml('rt', rt.dono, rt.parceiro)}
    <div class="field"><label class="lb" for="rt_ext">Extensão prevista (km)</label><input type="text" inputmode="decimal" id="rt_ext" data-rt="extensao" value="${v('extensao')}" placeholder="Opcional"></div>
    <div class="field"><label class="lb" for="rt_cx">Nº de caixas previstas</label><input type="text" inputmode="numeric" id="rt_cx" data-rt="caixasPrev" value="${v('caixasPrev')}" placeholder="Opcional"></div>
    <div class="field full"><label class="lb" for="rt_obs">Observações</label><textarea id="rt_obs" data-rt="obs" placeholder="Trechos aéreos/subterrâneos, pontos de atenção…">${v('obs')}</textarea></div></div>
    ${rotaOficial(rt) ? '<div class="warnbox small">Rota oficial do supervisor: os dados e o arquivo não podem ser alterados no celular. Use a sobreposição abaixo.</div>' : `<button class="btn pri block" id="bSalvaRota">${ICON.check}Salvar rota</button>`}</section>
  ${rt._novo ? '' : `<section class="card"><h2>Traçado cadastrado (KMZ/KML)</h2>
    ${rt.kml ? `<div class="okbox">Importado: <b>${esc(rt.kml.arquivo)}</b> · ${rt.kml.nTronco ? `cabo principal com ${rt.kml.nTronco} trecho(s) encadeados${rt.kml.linhas.length > rt.kml.nTronco ? ` + ${rt.kml.linhas.length - rt.kml.nTronco} ramal(is)` : ''}` : rt.kml.linhas.length + ' linha(s)'} · ${fKm(rt.kml.km)} · ${rt.kml.pontos.length} ponto(s) · ${fData(rt.kml.em)}${(rt.kml.meio || []).length ? `<br>Pontas no meio da rota: ${rt.kml.meio.map(m => `<b>${esc(m.nome)}</b> (km ${fKmRef(m.mTronco / 1000)}${m.ramalM ? ' + ' + (m.ramalM >= 1000 ? fKmRef(m.ramalM / 1000) + ' km' : m.ramalM + ' m') + ' de ramal' : ''})`).join(' · ')}` : ''}</div>` : '<p class="muted small" style="margin:0">Importe o KMZ ou KML com o traçado oficial do backbone. O app mostra a rota no mapa durante a ronda e calcula quanto dela foi percorrido.</p>'}
    <input type="file" id="fileKml" accept=".kmz,.kml,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml" hidden>
    ${rotaOficial(rt) ? '' : `<div class="row"><button class="btn pri" id="bImpKml">${ICON.pin}${rt.kml ? 'Substituir traçado' : 'Importar KMZ / KML'}</button>${rt.kml ? '<button class="btn stop" id="bRemKml">Remover traçado</button>' : ''}</div>`}</section>${sobsHtml(rt)}`}
  ${rt._novo ? '' : `<section class="card"><h2>Traçado do cabo</h2><p class="muted small" style="margin:0">Montado com o GPS do trecho "rota do cabo" de cada ronda nesta rota. Linha tracejada: traçado importado. Verde: trecho já percorrido.</p><div class="stats" id="rtStats"></div><div class="map" id="mapRt" role="img" aria-label="Mapa da rota do cabo"></div><button class="btn block" id="bKmzRt">${ICON.pin}Baixar KMZ da rota (suporte de campo)</button>${ADMIN && rt.kml ? '<button class="btn block" id="bKmzCx">Atualizar o KMZ raiz com as caixas mapeadas</button>' : ''}<span class="muted small">O KMZ leva o traçado oficial, o caminho das rondas e todas as caixas já mapeadas pela equipe. Abre no Google Earth ou no Google Maps.</span></section>
  <section class="card"><h2>Caixas da rota</h2><p class="muted small" style="margin:0">Todas as caixas já mapeadas nesta rota, por qualquer equipe (última visita de cada uma). Toque em "Plano de fusão" para ver o plano com as fotos da bandeja.</p><div class="list" id="rtCx"><p class="muted" style="margin:0">Carregando…</p></div></section>
  ${rotaOficial(rt) ? '' : '<section class="card"><button class="btn stop block" id="bDelRota">Excluir rota</button></section>'}`}`;
}
async function afterRota() {
  const rt = S.rotaEdit;
  $$('[data-rt]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { rt[el.dataset.rt] = el.value; }));
  $$('[data-dono="rt"]').forEach(b => b.onclick = () => { rt.dono = rt.dono === b.dataset.v ? '' : b.dataset.v; const y = window.scrollY; const keep = { ...rt }; render(); S.rotaEdit = keep; window.scrollTo(0, y); });

  $$('[data-rtpad]').forEach(b => b.onclick = () => { rt.padrao = b.dataset.rtpad; $$('[data-rtpad]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  if (rotaOficial(rt)) { $$('[data-rt]').forEach(el => el.disabled = true); $$('[data-dono="rt"],[data-rtpad]').forEach(el => el.disabled = true); }
  $('#bSalvaRota') && ($('#bSalvaRota').onclick = async () => {
    if (!String(rt.codigo || '').trim()) { toast('Informe o código da rota.'); $('#rt_codigo').focus(); return; }
    const novo = rt._novo; delete rt._novo; rt.atualizado = Date.now(); rt.codigo = rt.codigo.trim().toUpperCase(); rt.padrao = rt.padrao || 'ABNT';
    await DB.put('rotas', rt); await carregaRotas(); toast('Rota salva.'); if (novo) render();
  });
  if (rt._novo) return;
  $('#bImpKml') && ($('#bImpKml').onclick = () => $('#fileKml').click());
  $('#fileKml') && ($('#fileKml').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { toast('Lendo arquivo…'); const k = parseKml(await lerKml(f)); if (!k.linhas.length && !k.pontos.length) { toast('O arquivo não tem linhas nem pontos.'); return; } if (ADMIN && sobsDe(rt).length && confirm(`Esta rota tem ${sobsDe(rt).length} sobreposição(ões) dos técnicos. Descartar ao trocar o arquivo?`)) { for (const o of sobsDe(rt)) await DB.del('rotas', o.id); } rt.kml = { ...k, arquivo: f.name, em: Date.now() }; rt.atualizado = Date.now(); await DB.put('rotas', rt); await carregaRotas(); toast(`Traçado importado: ${fKm(k.km)} em ${k.linhas.length} linha(s).`); render(); } catch (err) { toast('Não foi possível ler: ' + err.message, 6000); } });
  $('#bRemKml') && ($('#bRemKml').onclick = async () => { if (!confirm('Remover o traçado importado desta rota?')) return; delete rt.kml; rt.atualizado = Date.now(); await DB.put('rotas', rt); await carregaRotas(); render(); });
  bindSobs(rt);
  $('#bDelRota') && ($('#bDelRota').onclick = async () => { if (!confirm('Excluir esta rota? As rondas e caixas continuam salvas.')) return; await DB.del('rotas', rt.id); await carregaRotas(); go(ADMIN ? 'admRotasV' : 'rotas'); });
  const d = await dadosRota(rt);
  $('#rtStats').innerHTML = `<div class="stat"><b>${d.caixas.length}${rt.caixasPrev ? '/' + esc(rt.caixasPrev) : ''}</b><span>Caixas</span></div><div class="stat"><b>${fKm(d.km)}</b><span>Traçado GPS</span></div>${(() => { const cb = ADMIN ? cobertura(rt, d.rs) : null; return cb ? `<div class="stat"><b>${fPct(cb.pct)}</b><span>Rota percorrida (${fKm(cb.covKm)} de ${fKm(cb.totKm)})</span></div>` : ''; })()}<div class="stat"><b>${rt.extensao ? esc(rt.extensao) + ' km' : '—'}</b><span>Previsto</span></div><div class="stat"><b>${d.rs.length}</b><span>Rondas</span></div>`;
  $('#rtCx').innerHTML = rotaCxHtml(d.caixas); const abrePl = id => { const i = d.caixas.find(x => x.id === id); if (i) abrirPlano(i, { onSalvo: () => { const y = window.scrollY; render(); window.scrollTo(0, y); } }); };
  $$('[data-rtplano]', $('#rtCx')).forEach(b => b.onclick = () => abrePl(b.dataset.rtplano));
  bindOpen($('#rtCx'));
  $('#bKmzRt').onclick = async () => { const f = await kmzRota(rt); if (f) exportar(f); };
  $('#bKmzCx') && ($('#bKmzCx').onclick = async () => { const pts = d.caixas.filter(i => i.loc && i.loc.lat != null && i.info.tag).map(i => ({ lat: i.loc.lat, lon: i.loc.lon, nome: i.info.tag, desc: `${TIPO_INSP(i)} ${fData(i.chegada)}${i.info.trecho ? ' · ' + i.info.trecho : ''}` })); if (!pts.length) { toast('Nenhuma caixa com GPS nesta rota.'); return; }
    if (!confirm(`Atualizar o KMZ raiz com ${pts.length} caixa(s)? Caixas com a mesma TAG ficam com a posição mais nova.`)) return; const r0 = await DB.get('rotas', rt.id); r0.kml = juntaKml(r0.kml, { linhas: [], pontos: pts, km: 0 }, 'caixas ' + fData(Date.now())); r0.kml.km = (rt.kml && rt.kml.km) || r0.kml.km; r0.atualizado = Date.now(); await DB.put('rotas', r0); await carregaRotas(); S.rotaEdit = { ...r0 }; toast('KMZ raiz atualizado com as caixas.'); render(); });
  const el = $('#mapRt'); if (!el || !window.L) return;
  const map = L.map(el); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map); S.map = map;
  const all = [];
  if (rt.kml) { rt.kml.linhas.forEach(l => { all.push(...l); L.polyline(l, { color: '#6b7785', weight: 4, dashArray: '8 8' }).addTo(map); }); const cb = ADMIN ? cobertura(rt, d.rs) : null; if (cb) cb.trechos.forEach(t => L.polyline(t, { color: '#1f7a3a', weight: 7, opacity: .8 }).addTo(map)); rt.kml.pontos.forEach(pt => L.circleMarker([pt.lat, pt.lon], { radius: 5, color: '#6b7785', fillOpacity: 1 }).bindPopup(esc(pt.nome || 'Ponto')).addTo(map)); }
  sobsDe(rt).forEach(x => (x.kml ? x.kml.linhas : []).forEach(l => { all.push(...l); L.polyline(l, { color: '#e8590c', weight: 5, dashArray: '10 6' }).bindPopup('Sobreposição · ' + esc(x.autorNome || '') + (x.obs ? ' · ' + esc(x.obs) : '')).addTo(map); }));
  d.trac.forEach(s => { const ll = s.pts.map(p => [p.lat, p.lon]); all.push(...ll); L.polyline(ll, { color: SEGCOR.cabo, weight: 4 }).addTo(map); });
  d.caixas.filter(i => i.loc).forEach((i, k) => { all.push([i.loc.lat, i.loc.lon]); L.marker([i.loc.lat, i.loc.lon], { icon: L.divIcon({ className: '', html: `<div class="mk">${k + 1}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }) }).bindPopup(`<b>${esc(i.info.tag || '')}</b><br>${fData(i.chegada)} · ${esc(TIPO_INSP(i))}${temMapaFusao(i) ? `<br><button type="button" class="btn" data-rtplano="${esc(i.id)}" style="min-height:36px;margin-top:6px">Plano de fusão</button>` : ''}`).addTo(map); });
  map.on('popupopen', e => { const b = e.popup.getElement().querySelector('[data-rtplano]'); if (b) b.onclick = () => { const i = d.caixas.find(x => x.id === b.dataset.rtplano); if (i) abrirPlano(i, {}); }; });
  if (all.length > 1) map.fitBounds(all, { padding: [24, 24], maxZoom: 17 }); else if (all.length) map.setView(all[0], 16); else map.setView([-23.55, -46.63], 11);
}
async function importaRotaKmz(f) {
    try { toast('Lendo KMZ da rota…'); const txt = await lerKml(f); const k = parseKml(txt); if (!k.linhas.length) { toast('O arquivo não tem o traçado (linha) da rota.'); return; }
      const dn = kmlDoc(txt).getElementsByTagNameNS('*', 'name')[0]; const nome = (dn ? dn.textContent : f.name.replace(/\.km[lz]$/i, '')).trim();
      const ini = k.linhas[0][0], fimL = k.linhas[(k.nTronco || k.linhas.length) - 1], fim = fimL[fimL.length - 1];
      const rt = { id: uid(), _autor: (Nuvem.user && Nuvem.user.id) || '', oficial: ADMIN || undefined, atualizado: Date.now(), codigo: codigoRota(nome), nome, padrao: 'ABNT', criado: Date.now(), extensao: String(+k.km.toFixed(1)).replace('.', ','), kml: { ...k, arquivo: f.name, em: Date.now() } };
      const pa = pontaDoCabo(k.pontos, { lat: ini[0], lon: ini[1] }), pb = pontaDoCabo(k.pontos, { lat: fim[0], lon: fim[1] }); { const sg = siglasDoNome(nome); if (sg) { const inv = (pa && siglaNome(pa.nome) === sg[1]) || (pb && siglaNome(pb.nome) === sg[0]); rt.siglaA = inv ? sg[1] : sg[0]; rt.siglaB = inv ? sg[0] : sg[1]; } }
      if (pa && pa.nome) rt.pontaA = pa.nome; if (pb && pb.nome && pb !== pa) rt.pontaB = pb.nome;
      await DB.put('rotas', rt); await carregaRotas(); toast(`Rota ${rt.codigo} importada (${fKm(k.km)}). Confira as pontas A e B.`, 5000); abrirRota(rt.id);
    } catch (err) { toast('Não foi possível ler: ' + err.message, 6000); }
}
async function abrirRota(id) { if (ADMIN) S.voltaRota = S.view === 'rota' ? (S.voltaRota || 'admRotasV') : S.view; S.rotaEdit = id ? { ...(await DB.get('rotas', id)) } : { id: uid(), _novo: true, codigo: '', padrao: 'ABNT', criado: Date.now(), _autor: (Nuvem.user && Nuvem.user.id) || '' }; go('rota'); }

/* ============================ ações da ronda ============================ */
async function iniciarRonda() {
  if (!S.perfil.nome.trim() || !String(S.perfil.matricula || '').trim()) { toast('Crie seu perfil (nome e matrícula) antes de iniciar.'); go('perfil'); return; }
  const conj = !!S.conjunta && !S.atvPend && (S.modo === 'preventiva' || S.modo === 'vistoria'); const site = S.modo === 'conjunta';
  if (!conj && !S.perfil.ultDono) { toast('Informe se o backbone é próprio ou de parceiro.'); return; }
  if (!S.perfil.veiculoTxt && !S.perfil.placa) { toast('Escolha o veículo.'); $('#st_veic') && $('#st_veic').focus(); return; }
  if (S.atvPend && ODO_POR === 'os' && kmNum(S.odoIni) == null) { toast('Informe o odômetro inicial do veículo.'); $('#odoIni') && $('#odoIni').focus(); return; }
  if (!conj && S.perfil.ultDono === 'parceiro' && !String(S.perfil.ultParc || '').trim()) { toast('Informe o nome do parceiro.'); $('#rd_parc') && $('#rd_parc').focus(); return; }
  if (S.perfil.ultDono === 'parceiro') lembraParceiro(S.perfil.ultParc);
  if (S.modo === 'corretiva' && S.cr && S.cr.refLocal) lembraLocal(S.cr.refLocal);
  await DB.put('meta', S.perfil);
  if (S.modo === 'implantacao' && !String((S.im || {}).designacao || '').trim()) { toast('Informe a designação da implantação.'); $('#im_des') && $('#im_des').focus(); return; }
  if (!(await checaCasa())) return;
  if (!S.exp) { await iniciarExpediente(true, true); if (!S.exp) return; }
  gpsStart(); wakeOn();
  const loc = await posAtual(30000);
  const now = Date.now();
  const distCasa = S.distCasa ?? null;
  const cr = S.modo === 'corretiva' ? { ...(S.cr || {}) } : null; const ac = new Date();
  if (cr && !String(cr.ticket || '').trim()) { cr.ticket = await proximoTicket(); cr.ticketAuto = true; }
  // preventiva e conjunta: usam o ticket da O.S. recebida; sem ele, o app gera um automático (PREV-… / CONJ-…)
  const atvA = S.atvPend ? S.atvs.get(S.atvPend) : null; let tkPv = '', tkPvAuto = false;
  if (!cr && (site || S.modo === 'preventiva')) { tkPv = String((atvA && atvA.ticket) || '').trim().toUpperCase(); if (!tkPv) { tkPv = await proximoTicket(site ? 'CONJ' : 'PREV', tkRota(S.perfil.rotaId ? rotaById(S.perfil.rotaId) : null)); tkPvAuto = true; } }
  const im = S.modo === 'implantacao' ? { ...(S.im || {}) } : null, vi = S.modo === 'vistoria' ? { ...(S.vi || {}) } : null;
  S.ronda = { id: uid(), tipo: im ? 'implantacao' : vi ? 'vistoria' : cr ? 'corretiva' : site ? 'site' : 'preventiva', ...(im ? { designacao: String(im.designacao || '').trim().toUpperCase(), servico: im.servico || 'roteamento', projeto: im.projeto || '', siteA: im.siteA || '', siteB: im.siteB || '' } : {}), ...(vi ? { objetivo: vi.objetivo || 'Vistoria de rota', diario: [] } : {}), ticket: cr ? cr.ticket.trim().toUpperCase() : tkPv, ticketAuto: !!(cr && cr.ticketAuto) || tkPvAuto, ...(!cr && (site || S.modo === 'preventiva') ? { tkParc: [0, 1].map(k => String(((S.tkParc || (atvA && atvA.tkParc) || [])[k]) || '').trim().toUpperCase()) } : {}), cliente: (cr && cr.cliente) || '', refLocal: cr ? (cr.refLocal || '').trim() : '', refKm: cr ? cr.refKm || '' : '', refSentido: cr ? cr.refSentido || '' : '', ocorrencia: cr ? cr.ocorrencia || '' : '', descricao: cr ? cr.descricao || '' : '', acionamento: cr ? `${pad2(ac.getHours())}:${pad2(ac.getMinutes())}` : '', rotaId: S.perfil.rotaId || null, dono: conj ? 'conjunta' : S.perfil.ultDono, parceiro: !conj && S.perfil.ultDono === 'parceiro' ? S.perfil.ultParc.trim() : '', tecnico: S.perfil.nome.trim(), matricula: S.perfil.matricula, placa: S.perfil.placa, veiculo: veicPerfil(), odoIni: S.atvPend && kmNum(S.odoIni) != null ? String(kmNum(S.odoIni)) : '', odoFotoIni: S.atvPend ? S.odoFotoIni || null : null, inicio: now, fim: null, pontos: loc ? [loc] : [], eventos: [{ tipo: 'inicio', ts: now, lat: loc && loc.lat, lon: loc && loc.lon }] };
  if (S.odoFotoIniData) { S.odoFotoIniData.rondaId = S.ronda.id; await DB.put('fotos', S.odoFotoIniData); S.odoFotoIniData = null; }
  S.ronda.distCasa = distCasa; if (im) S.im = { servico: 'roteamento' }; S.tkParc = null;
  await vinculaAtividade(S.ronda, now);
  await DB.put('rondas', S.ronda); await DB.put('meta', { id: 'ativa', rondaId: S.ronda.id }); Alarme.revisa();
  S.cr = {}; S.odoIni = ''; S.odoFotoIni = null; Nuvem.aoVivo(true); toast(loc ? (isCorr(S.ronda) ? (S.ronda.ticketAuto ? `Corretiva ${S.ronda.ticket} iniciada (número automático).` : 'Corretiva iniciada.') : isImpl(S.ronda) ? 'Designação iniciada.' : isVist(S.ronda) ? 'Vistoria iniciada.' : isSite(S.ronda) ? `Conjunta ${S.ronda.ticket} iniciada.` : `Atividade ${S.ronda.ticket} iniciada.`) : 'Atividade iniciada.');
  render();
}
/* ---------- corretiva: sair do local / fechar a O.S. só com a liberação do gestor ---------- */
const Lib = {
  mapa: new Map(), // ref_id -> pedido mais recente
  ref(r) { return r ? r.atividadeId || r.id : null; },
  de(r) { return this.mapa.get(this.ref(r)) || null; },
  precisa(r) { return !!r && isCorr(r) && Nuvem.ativo() && !r.semLiberacao; },
  liberada(r) { if (!this.precisa(r)) return true; const p = this.de(r); return !!(p && p.status === 'aprovado'); },
  guarda(p) { if (!p || p.tipo !== 'liberar_corretiva') return; const ant = this.mapa.get(p.ref_id); if (!ant || (p.criado || 0) >= (ant.criado || 0)) this.mapa.set(p.ref_id, p); }
};
S.pedMsgs = new Map(); // pedido_id -> [mensagens]
function guardaMsg(m) { if (!m || !m.pedido_id) return; const l = S.pedMsgs.get(m.pedido_id) || []; if (!l.some(x => x.id === m.id)) { l.push(m); l.sort((a, b) => a.criado - b.criado); } S.pedMsgs.set(m.pedido_id, l); }
const PAPEL_LB = { tecnico: 'Técnico', noc: 'NOC', supervisor: 'Supervisor' };
function conversaHtml(pid, eu) { const l = S.pedMsgs.get(pid) || []; return l.length ? `<div class="list" style="gap:4px">${l.map(m => `<div style="align-self:${m.papel === eu ? 'flex-end' : 'flex-start'};max-width:88%;background:${m.papel === eu ? 'var(--accent-soft)' : 'var(--surface-2)'};border:1px solid var(--line);border-radius:10px;padding:6px 10px"><span class="small muted">${esc(PAPEL_LB[m.papel] || m.papel)} · ${esc(m.autor_nome || '')} · ${fHora(m.criado)}</span><div style="white-space:pre-wrap">${esc(m.texto)}</div></div>`).join('')}</div>` : ''; }
function liberaHtml(r) {
  if (!Lib.precisa(r)) return '';
  const p = Lib.de(r);
  if (p && p.status === 'aprovado') return `<div class="okbox"><b>Baixa e saída liberadas</b>${p.decidido_por ? ' (' + esc(p.decidido_por) + ')' : ''}${p.decidido_em ? ' às ' + fHora(+p.decidido_em) : ''}. Pode concluir e encerrar.</div>`;
  if (p && p.status === 'pedido') return `<div class="warnbox" style="display:flex;flex-direction:column;gap:8px"><span><b>Aguardando a validação do NOC ou do supervisor</b> desde ${fHora(+p.criado)}. A O.S. fica travada até a liberação.${Date.now() - p.criado > 10 * 60000 ? ' <button type="button" class="lnk" data-libpede>Pedir de novo</button>' : ''}</span>${conversaHtml(p.id, 'tecnico')}${respostasHtml('libMsg', RESP_MSG)}<div class="row" style="gap:6px;flex-wrap:nowrap"><input type="text" id="libMsg" data-voz placeholder="Mensagem para o NOC / supervisor" style="flex:1;min-width:0"><button type="button" class="btn" data-libmsg="${esc(p.id)}">Enviar</button></div></div>`;
  if (p && p.status === 'recusado') return `<div class="warnbox" style="border-color:var(--bad);background:var(--bad-soft)"><b>O gestor não liberou a saída</b>${p.obs ? ': ' + esc(p.obs) : ''}. <button type="button" class="lnk" data-libpede>Pedir de novo</button></div>`;
  const pend = libPend(r);
  if (pend.length) return `<div class="warnbox" style="display:flex;flex-direction:column;gap:8px"><span><b>Antes de pedir a validação ao NOC</b>, falta: ${pend.map(esc).join(', ')}.</span>${pend.some(x => /servi|material|atendimento/.test(x)) ? '<button type="button" class="btn pri block" data-libirlpu>Lançar a produção (serviço e material)</button>' : S.view === 'insp' ? '' : '<button type="button" class="btn pri block" data-libirlpu>Escrever a descrição</button>'}</div>`;
  return `<div class="warnbox" style="display:flex;flex-direction:column;gap:8px"><span><b>Para dar baixa na O.S. e sair do local, peça a validação ao NOC.</b> O NOC ou o supervisor confere e libera. Sem isso a corretiva fica travada.</span>${respostasHtml('libTxt', RESP_LIB)}<textarea id="libTxt" rows="2" placeholder="Ex.: Atividade concluída, pode validar?">Atividade concluída, pode validar?</textarea><button type="button" class="btn pri block" data-libpede>Pedir validação ao NOC</button></div>`;
}
// LPU obrigatória antes da validação: serviço executado e material gasto (ou "não usei material")
function inspsDaRonda(r) { const ids = [...new Set([...(r.retomadas || []), ...r.eventos.filter(e => e.tipo === 'chegada').map(e => e.inspId)])]; const l = ids.map(id => S.insp && S.insp.id === id ? S.insp : S.inspCache.get(id)).filter(Boolean); if (S.insp && S.insp.rondaId === r.id && !l.includes(S.insp)) l.push(S.insp); return l; }
const temMatInsp = i => !!(i.mat && Object.entries(i.mat).some(([k, v]) => k !== 'caboSpec' && +String(v).replace(',', '.') > 0)) || (i.matExtra || []).some(m => m.nome);
function libPend(r) {
  if (!r || !isCorr(r) || window.__regrasCorrOff) return []; const l = inspsDaRonda(r).filter(isCorr);
  if (!l.length) return ['abrir o atendimento ("' + botaoChegada(r) + '") e lançar o serviço executado e o material gasto'];
  if (l.every(i => i.apoio)) return [];
  const lp = l.flatMap(i => i.lpu || []); const p = [];
  if (!lp.some(x => x.t !== 'M')) p.push('o serviço executado');
  if (!lp.some(x => x.t === 'M') && !l.some(temMatInsp) && !l.some(i => i.semMat)) p.push('o material gasto (ou marque "Não usei material")');
  if (!l.some(i => !i.apoio && String((i.corr || {}).servico || '').trim())) p.push('a descrição do que foi feito');
  return p;
}
function irLpu() {
  const r = S.ronda; if (!r) return; const l = inspsDaRonda(r).filter(i => isCorr(i) && !i.apoio);
  const i = S.insp && S.insp.rondaId === r.id ? S.insp : l.filter(x => x.status !== 'concluida').pop() || l.pop(); const soDesc = !libPend(r).some(x => /servi|material|atendimento/.test(x));
  if (!i) { toast('Toque em "' + botaoChegada(r) + '" para abrir o atendimento e lançar a LPU.', 6000); return; }
  saveInsp && S.insp && saveInsp(true); S.insp = i; S.step = Math.max(0, ST().findIndex(s => s[0] === (soDesc ? 'final' : 'lpu'))); go('insp'); window.scrollTo(0, 0); if (soDesc) setTimeout(() => { const t = $('#f_serv'); t && t.focus(); }, 200);
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-libirlpu]'); if (!b || ADMIN) return; irLpu(); });
async function pedirLiberacao(r) {
  if (!r) return;
  const pend = libPend(r); if (pend.length) { toast('Antes de pedir a validação, falta: ' + pend.join(', ') + '.', 7000); irLpu(); return; } if (!Nuvem.on) { toast('Sem internet: conecte para pedir a liberação ao gestor.', 6000); return; }
  const loc = S.gps.last; const ref = Lib.ref(r);
  // resumo da O.S. para o NOC conferir antes de liberar (as fotos sobem junto com a ficha)
  if (S.insp && S.insp.rondaId === r.id) saveInsp(true); const L = inspsDaRonda(r).filter(i => isCorr(i) && !i.apoio);
  const resumo = { problema: L.map(i => i.corr.problema).filter(Boolean).join(' / '), servico: L.map(i => i.corr.servico).filter(Boolean).join(' / '), chegada: (L[0] || {}).chegada || null, lpu: L.flatMap(i => (i.lpu || []).map(x => ({ c: x.c, d: x.d, q: x.q, u: x.u, t: x.t }))), semMat: L.some(i => i.semMat), evid: L.reduce((s, i) => s + (i.fotos || []).length, 0) };
  const p = { id: 'lib_' + ref + '_' + Date.now(), org: Nuvem.org(), tipo: 'liberar_corretiva', ref_id: ref, tecnico_uid: Nuvem.user.id, tecnico_nome: S.perfil.nome, dados: { ticket: r.ticket || '', ocorrencia: r.ocorrencia || '', inicio: r.inicio, rondaId: r.id, lat: loc && loc.lat, lon: loc && loc.lon, caixas: r.eventos.filter(e => e.tipo === 'chegada').length, insps: L.map(i => i.id), resumo }, status: 'pedido', criado: Date.now() };
  try { Nuvem.processar(); } catch (e) {}
  const txt = String(($('#libTxt') || {}).value || '').trim();
  try { await Nuvem.pedCriar(p); Lib.guarda(p); if (txt) { const m = { id: 'pm_' + uid(), org: Nuvem.org(), pedido_id: p.id, tecnico_uid: Nuvem.user.id, autor_uid: Nuvem.user.id, autor_nome: S.perfil.nome, papel: 'tecnico', texto: txt, criado: Date.now() }; await Nuvem.msgCriar(m); guardaMsg(m); } toast('Pedido enviado ao NOC e ao supervisor. Assim que liberarem, você conclui e encerra.', 6000); render(); } catch (e) { toast('Não foi possível enviar: ' + (e.message || e), 6000); }
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-libpede]'); if (!b) return; pedirLiberacao(S.ronda); });
document.addEventListener('click', async e => { const b = e.target.closest && e.target.closest('[data-libmsg]'); if (!b || ADMIN) return; const inp = $('#libMsg'); const txt = String(inp && inp.value || '').trim(); if (!txt) { toast('Escreva a mensagem.'); return; }
  const m = { id: 'pm_' + uid(), org: Nuvem.org(), pedido_id: b.dataset.libmsg, tecnico_uid: Nuvem.user.id, autor_uid: Nuvem.user.id, autor_nome: S.perfil.nome, papel: 'tecnico', texto: txt, criado: Date.now() };
  try { await Nuvem.msgCriar(m); guardaMsg(m); const y = window.scrollY; render(); window.scrollTo(0, y); } catch (x) { toast('Não foi possível enviar: ' + (x.message || x), 6000); } });
function aoPedidoTec(p) {
  if (p && p.tipo === 'remanejar') { S.pedRem = S.pedRem || new Map(); const ant = S.pedRem.get(p.ref_id); S.pedRem.set(p.ref_id, p); if (p.status !== 'pedido' && (!ant || ant.status === 'pedido')) toast(p.status === 'aprovado' ? `Remanejamento aprovado: a O.S. passou para ${fDiaCurto(p.dados.para)}.` : 'O gestor não aprovou o remanejamento' + (p.obs ? ': ' + p.obs : '.'), 8000); if (S.view === 'home') render(); return; }
  if (!p || p.tipo !== 'liberar_corretiva') return; const ant = Lib.mapa.get(p.ref_id); Lib.guarda(p);
  if (p.status !== 'pedido' && (!ant || ant.status === 'pedido')) {
    const ok = p.status === 'aprovado'; toast(ok ? `${p.decidido_por || 'O gestor'} liberou a baixa e a saída. Pode concluir e encerrar a corretiva.` : `${p.decidido_por || 'O gestor'} não liberou` + (p.obs ? ': ' + p.obs : '.'), 8000);
    try { navigator.vibrate && navigator.vibrate([300, 120, 300]); if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(ok ? 'Baixa e saída liberadas.' : 'A saída não foi liberada.'); u.lang = 'pt-BR'; speechSynthesis.speak(u); } } catch (x) {}
  }
  if (S.view === 'home' || S.view === 'insp') { const y = window.scrollY; render(); window.scrollTo(0, y); }
}
async function encerrarRonda() {
  if (!S.ronda) return;
  if (!Lib.liberada(S.ronda)) { toast('A corretiva só encerra com a liberação do gestor. Peça a liberação.', 6000); const el = document.querySelector('[data-libpede]'); el && el.scrollIntoView({ block: 'center' }); return; }
  if (kmNum(S.ronda.odoIni) != null && kmNum(S.ronda.odoFim) == null) { toast('Informe o odômetro final do veículo antes de encerrar.'); $('#odoFim') && $('#odoFim').focus(); return; }
  if (kmNum(S.ronda.odoIni) != null && kmNum(S.ronda.odoFim) < kmNum(S.ronda.odoIni)) { toast('O odômetro final está menor que o inicial. Confira.'); $('#odoFim') && $('#odoFim').focus(); return; }
  if (!confirm(isCorr(S.ronda) ? 'Encerrar a corretiva agora?' : isSite(S.ronda) ? 'Encerrar a conjunta agora?' : 'Encerrar a atividade agora?')) return;
  const loc = await posAtual(60000);
  if (loc && S.ronda.pontos.length && loc.ts > S.ronda.pontos[S.ronda.pontos.length - 1].ts) S.ronda.pontos.push(loc);
  S.ronda.fim = Date.now(); S.ronda.eventos.push({ tipo: 'fim', ts: S.ronda.fim, lat: loc && loc.lat, lon: loc && loc.lon });
  await DB.put('rondas', S.ronda); await DB.put('meta', { id: 'ativa', rondaId: null });
  await atvConcluiu(S.ronda);
  gpsStop(); if (!S.exp) wakeOff();
  const id = S.ronda.id; S.ronda = null; S.ciente.clear(); Nuvem.aoVivo(true); Alarme.revisa(); setTimeout(() => { const prox = [...S.atvs.values()].find(x => (x.status === 'pendente' || x.status === 'recebida') ); if (prox && !S.alertaId) mostraAlerta(prox); }, 1500); S.rondaView = await DB.get('rondas', id);
  go('ronda');
  if (S.rondaView && S.rondaView.rotaId && Nuvem.on) setTimeout(() => enviaPercursoRota(S.rondaView).catch(() => {}), 700);
}
// foto de perfil: recorte quadrado 192 px em JPEG (fica no perfil e sincroniza com o painel)
async function fotoPerfilDe(file) { const bmp = await createImageBitmap(file); const l = Math.min(bmp.width, bmp.height); const c = document.createElement('canvas'); c.width = c.height = 192; c.getContext('2d').drawImage(bmp, (bmp.width - l) / 2, (bmp.height - l) / 2, l, l, 0, 0, 192, 192); return c.toDataURL('image/jpeg', 0.8); }
const avIn = (foto, nome) => foto && /^data:image\//.test(foto) ? `<img src="${foto}" alt="" class="avimg">` : esc(iniciais(nome || '?'));
const fotoTec = uid => ((S.adm && S.adm.tecnicos) || []).find(t => t.uid === uid)?.foto || '';
function iniciais(nome) { const p = String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z ]/g, '').split(/\s+/).filter(Boolean); if (!p.length) return 'XX'; return p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2); }
function prefixo() { return (S.perfil.prefixo || 'CE-BKB').toUpperCase().replace(/\s+/g, '').replace(/-+$/, ''); }
// sigla do site da ponta (ex.: PDA = Pindamonhangaba). Vem do cadastro da rota; sem ela, as 3 primeiras letras da ponta.
function siglaSite(rt, lado) { if (!rt) return ''; const s = String(rt['sigla' + lado] || '').trim(); if (s) return s.toUpperCase().replace(/[^A-Z0-9]/g, ''); return siglaNome(rt['ponta' + lado]); }
function siglaNome(nome) {
  const p = String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); if (!p) return ''; const w = p.split(/\s+/).filter(x => !['ESTACAO', 'SITE', 'DE', 'DO', 'DA', 'DOS', 'DAS', 'EST', 'DGO', 'DIO', 'ODF', 'POP', 'TIM', 'CLARO', 'ROTA'].includes(x)); const x = w[0] || p.split(/\s+/)[0]; return x.length <= 4 ? x : x.slice(0, 3); }
const trechoTxt = rt => { const a = siglaSite(rt, 'A'), b = siglaSite(rt, 'B'); return a && b ? `${a} x ${b}` : a || b || ''; };
function rotaAtual(i) { const id = (i && i.info && i.info.rotaId) || (S.ronda && !S.ronda.fim && S.ronda.rotaId) || S.perfil.rotaId; return id ? rotaById(id) : null; }
const baseTag = rt => [prefixo(), siglaSite(rt, 'A'), siglaSite(rt, 'B')].filter(Boolean).join('-');
function montaTag(n, rt) { return `${baseTag(rt)}-${String(n).padStart(4, '0')}`; }
function tagExemplo() { return montaTag(1, rotaAtual()); }
// trecho da rota para o ticket: siglas das pontas (ex.: PDAxTBT); sem siglas, o código da rota
function tkRota(rt) { if (!rt) return ''; const a = siglaSite(rt, 'A'), b = siglaSite(rt, 'B'); const t = a && b ? a + 'x' + b : a || b || String(rt.codigo || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return t.slice(0, 14); }
// ticket automático: PREFIXO-[ROTA/SITE-]AAMMDD-INICIAIS-NNN (COR corretiva, PREV preventiva, CONJ conjunta de site)
async function proximoTicket(pref, meio) { pref = pref || 'COR'; const k = pref === 'COR' ? 'seqCorr' : 'seq' + pref; const m = (await DB.get('meta', k)) || { id: k, n: 0 }; m.n++; await DB.put('meta', m); const d = new Date(); return `${pref}-${meio ? meio + '-' : ''}${String(d.getFullYear()).slice(2)}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${iniciais(S.perfil.nome)}-${String(m.n).padStart(3, '0')}`; }
// próximo número do trecho: o maior já usado (na nuvem e neste aparelho) + 1
async function proximaTag(i) { const rt = rotaAtual(i), base = baseTag(rt); const rx = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-(\\d+)$', 'i'); let mx = 0; const ver = t => { const m = rx.exec(String(t || '').trim()); if (m) mx = Math.max(mx, +m[1]); };
  try { (await DB.all('inspecoes')).forEach(x => ver(x.info && x.info.tag)); } catch (e) {} S.inspCache.forEach(x => ver(x.info && x.info.tag));
  const m = (await DB.get('meta', 'seqTag')) || { id: 'seqTag', bases: {} }; mx = Math.max(mx, m.bases[base] || 0);
  let online = false; try { if (Nuvem.on) { (await Nuvem.evsPorTag(base + '-%', true)).forEach(e => ver(e.info && e.info.tag)); online = true; } } catch (e) {}
  m.bases[base] = mx + 1; await DB.put('meta', m); if (!online) toast('Sem conexão: a TAG saiu pela numeração deste aparelho. Confira se não repetiu quando tiver sinal.', 4500); return montaTag(mx + 1, rt); }
async function geraTag(i) { i.info.tag = await proximaTag(i); i.info.tagAuto = true; const rt = rotaAtual(i); if (rt) { i.info.trecho = trechoTxt(rt); if (!i.info.rotaId) { i.info.rotaId = rt.id; i.info.rota = rotaLb(rt); } } return i.info.tag; }
async function novaInsp() {
  const site = !!(S.ronda && !S.ronda.fim && isSite(S.ronda));
  if (aprNecessaria()) { await carregaMeusTreinos(); abrirAPR(() => novaInsp()); return; }
  toast(site ? 'Registrando chegada no site…' : S.ronda && isCorr(S.ronda) ? 'Registrando chegada no ponto da corretiva…' : S.ronda && isVist(S.ronda) ? 'Abrindo novo registro…' : S.ronda && isImpl(S.ronda) ? 'Registrando chegada no ponto…' : 'Registrando chegada na caixa…', 2000);
  const loc = await posAtual(45000);
  const i = novaInspecao(loc);
  if (S.ronda && !S.ronda.fim) { S.ronda.eventos.push({ tipo: 'chegada', ts: i.chegada, inspId: i.id, lat: loc && loc.lat, lon: loc && loc.lon, acc: loc && loc.acc }); if (loc && (!S.ronda.pontos.length || loc.ts > S.ronda.pontos[S.ronda.pontos.length-1].ts)) S.ronda.pontos.push(loc); saveRonda(true);  Nuvem.aoVivo(true); atvChegou(loc); }
  if (S.ronda && !S.ronda.fim && isCorr(S.ronda)) { i.tipo = 'corretiva'; i.corr = { cliente: S.ronda.cliente || '', ticket: S.ronda.ticket || '', ticketAuto: !!S.ronda.ticketAuto, ocorrencia: S.ronda.ocorrencia || '', acionamento: S.ronda.acionamento || '', problema: S.ronda.descricao || '', fibrasAfetadas: '', causa: '', servico: '', sobra: '', normalizacao: '', novaCaixa: false, pendente: false }; i.mat = {}; i.matExtra = []; }
  else if (S.ronda && !S.ronda.fim && isVist(S.ronda)) { i.tipo = 'vistoria'; i.vist = { tipo: 'acomp', descricao: '', equipe: '', responsavel: '', ticket: '', atividade: '', conformidade: '', chaveLocal: '', chaveId: '', chaveEntregou: '', chaveDevolvida: false }; }
  else if (site) { i.tipo = 'site'; i.site = siteNovo(); if (S.ronda.siteSigla) i.site.sigla = S.ronda.siteSigla; if (S.ronda.siteNome) i.site.nome = S.ronda.siteNome; if (S.ronda.siteParceiro) i.site.parc.empresa = S.ronda.siteParceiro; }
  else { await geraTag(i); if (S.ronda && !S.ronda.fim && isImpl(S.ronda)) { i.tipo = 'implantacao'; i.impl = { servico: S.ronda.servico || 'roteamento', designacao: S.ronda.designacao || '', projeto: S.ronda.projeto || '', siteA: S.ronda.siteA || '', siteB: S.ronda.siteB || '', equipamento: '', porta: '', dgoModelo: '', dgoPosicao: '', check: {}, checkObs: {}, med: {} }; } }
  const rt = S.ronda && !S.ronda.fim && S.ronda.rotaId ? rotaById(S.ronda.rotaId) : null;
  if (S.ronda && !S.ronda.fim && !isCorr(S.ronda) && S.ronda.ticket) i.ticketAtv = S.ronda.ticket;
  if (S.ronda && !S.ronda.fim && Array.isArray(S.ronda.tkParc)) i.tkParc = [...S.ronda.tkParc];
  if (S.ronda && !S.ronda.fim) { if (S.ronda.wfc) i.wfc = S.ronda.wfc; if (S.ronda.wf2) i.wf2 = S.ronda.wf2; if (S.ronda.centro) i.centro = S.ronda.centro; if (S.ronda.projeto) i.projeto = S.ronda.projeto; if (S.ronda.atividadeId) i.centroAtv = true; if (S.ronda.rede) i.rede = S.ronda.rede; }
  if (S.ronda && !S.ronda.fim && S.ronda.apoio) { i.apoio = true; i.apoioDe = S.ronda.apoioDe || ''; } else if (S.ronda && !S.ronda.fim && (S.ronda.apoioNomes || []).length) i.info.apoio = S.ronda.apoioNomes.join(', '); marcaApoios(i);
  if (rt) { i.info.rotaId = rt.id; i.info.rota = rotaLb(rt); ['entrada', 's1', 's2'].forEach(k => { if (rt.cap) i.cabos[k].fibras = String(rt.cap); if (rt.marca) i.cabos[k].marca = rt.marca; }); if (CAPS.includes(+rt.cap)) { i.fo.total = +rt.cap; ensureRows(i); } }
  i.fo.modo = 'cor'; i.fo.exc = []; syncFo(i);
  if (S.ronda && !S.ronda.fim && (S.ronda.refLocal || S.ronda.refKm)) { i.info.refLocal = S.ronda.refLocal || ''; i.info.refKm = S.ronda.refKm || ''; i.info.refSentido = S.ronda.refSentido || ''; }
  S.insp = i; S.step = 0; S.inspCache.set(i.id, i); await DB.put('inspecoes', i);
  go('insp');
  if (loc) preencherEndereco(true, true);
}
async function preencherEndereco(soVazios, silencioso) {
  const i = S.insp; if (!i || !i.loc) return;
  if (S.geoBusy) return; S.geoBusy = true; S.geoTry = Date.now();
  const a = await reverseGeo(i.loc.lat, i.loc.lon); S.geoBusy = false;
  if (S.insp !== i) return;
  if (!a) { i.geoPend = true; saveInsp(); if (!silencioso) toast('Sem internet agora. O endereço será buscado sozinho quando o sinal voltar.'); updLocUi(); return; }
  i.geoPend = false;
  ['endereco','bairro','cidade','cep'].forEach(k => { if (a[k] && (!soVazios || !i.info[k])) i.info[k] = a[k]; });
  i.loc.endCompleto = a.completo; i.info.endAuto = true; saveInsp(); updLocUi(); if (!silencioso) toast('Endereço preenchido pelo GPS.');
}
const RAIO_M = 1000, RAIO_KM = 1;
const kmNum = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : null; };
const fKmRef = v => { const n = kmNum(v); return n == null ? '' : n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }); };
const extRota = rt => rt ? (kmNum(rt.extensao) ?? (rt.kml && rt.kml.km ? rt.kml.km : null)) : null;
const pontaNome = (rt, s) => s === 'B' ? (rt.pontaB || 'ponta B') : (rt.pontaA || 'ponta A');
function posA(e) { const rt = e && e.info.rotaId ? rotaById(e.info.rotaId) : null; const km = kmNum(e && e.info.refKm); if (!rt || !e.info.refSentido || km == null) return null; if (e.info.refSentido === 'A') return km; const x = extRota(rt); return x != null ? x - km : null; }
function refTxt(i) {
  if (!i) return ''; const km = kmNum(i.info.refKm); const rt = i.info.rotaId ? rotaById(i.info.rotaId) : null;
  if (rt && i.info.refSentido && km != null) { const s = i.info.refSentido, o = s === 'A' ? 'B' : 'A', x = extRota(rt); const outro = x != null && x - km >= 0 ? ` · ≈ ${fKmRef(x - km)} km de ${pontaNome(rt, o)} (${o}→${s})` : ''; return `Rota ${rt.codigo}: ${fKmRef(km)} km de ${pontaNome(rt, s)} (${s}→${o})${outro}`; }
  return i.info.refLocal && km != null ? `${fKmRef(km)} km de ${i.info.refLocal}` : (i.info.refLocal ? `Próximo a ${i.info.refLocal}` : '');
}
const normLocal = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const fDist = m => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
function rotuloEvento(e) { return (isSite(e) ? siteTitulo(e) : isCorr(e) ? `Corretiva · Ticket ${e.corr.ticket || '—'}` : isImpl(e) ? `Implantação · ${IMPL_SERV[e.impl.servico] || ''} · ${e.impl.designacao || '—'}` : isVist(e) ? `Vistoria · ${VIST_TIPOS[e.vist.tipo] || ''}` : `Preventiva · Caixa ${e.info.tag || '—'}`) + (e._doEquipe ? ` · ${e._tecnico || 'outro técnico'}` : ''); }
function eventosProximos(i, todos) {
  const out = [];
  todos.forEach(e => {
    if (e.id === i.id) return;
    let d = null, viaRef = false;
    if (i.loc && e.loc) d = hav(i.loc, e.loc);
    let dk = null;
    if (i.info.rotaId && i.info.rotaId === e.info.rotaId) { const pa = posA(i), pb = posA(e); if (pa != null && pb != null) dk = Math.abs(pa - pb); else if (i.info.refSentido && i.info.refSentido === e.info.refSentido && kmNum(i.info.refKm) != null && kmNum(e.info.refKm) != null) dk = Math.abs(kmNum(i.info.refKm) - kmNum(e.info.refKm)); }
    else { const mesmoLocal = i.info.refLocal && e.info.refLocal && normLocal(i.info.refLocal) === normLocal(e.info.refLocal); if (mesmoLocal && kmNum(i.info.refKm) != null && kmNum(e.info.refKm) != null) dk = Math.abs(kmNum(i.info.refKm) - kmNum(e.info.refKm)); }
    if (d != null && d <= RAIO_M) out.push({ e, d, dk });
    else if (dk != null && dk <= RAIO_KM) { viaRef = true; out.push({ e, d, dk, viaRef }); }
  });
  return out.sort((a, b) => (a.d ?? a.dk * 1000) - (b.d ?? b.dk * 1000)).slice(0, 8);
}
function refRotaHtml(rt, sent, km, pref) {
  const x = extRota(rt), k = kmNum(km);
  return `<span class="lb">Medição (OTDR) a partir de</span>
    <div class="seg" role="group" aria-label="Sentido da medição"><button type="button" data-${pref}sent="A" aria-pressed="${sent === 'A'}">A · ${esc(rt.pontaA || 'Ponta A')}</button><button type="button" data-${pref}sent="B" aria-pressed="${sent === 'B'}">B · ${esc(rt.pontaB || 'Ponta B')}</button></div>
    <div class="row" style="flex-wrap:nowrap;gap:8px;align-items:center;margin-top:6px"><input type="text" inputmode="decimal" id="${pref}_refKm" value="${esc(km || '')}" placeholder="km" aria-label="Distância em km" style="width:96px;text-align:right"><span style="font-weight:600">km de ${esc(sent ? pontaNome(rt, sent) : 'ponta A ou B')}</span></div>
    <span class="muted small">${sent && k != null ? (x != null ? `No outro sentido: ≈ ${fKmRef(x - k)} km de ${esc(pontaNome(rt, sent === 'A' ? 'B' : 'A'))} (rota com ${fKmRef(x)} km).` : 'Cadastre a extensão da rota (ou importe o KMZ) para o app converter entre os sentidos A→B e B→A.') : 'Escolha de qual ponta foi feita a medição e informe o km.'}</span>`;
}
function refHtml(i) {
  const rt = i.info.rotaId ? rotaById(i.info.rotaId) : null;
  if (rt) return `<div class="field full">${refRotaHtml(rt, i.info.refSentido, i.info.refKm, 'in')}</div><div class="field full" id="prox"></div>`;
  const locais = [...new Set([...(S.perfil.refLocais || []), ...(S.rotas || []).flatMap(r => [r.pontaA, r.pontaB]).filter(Boolean)])];
  return `<div class="field full"><span class="lb">Referência do evento</span>
    <div class="row" style="flex-wrap:nowrap;gap:8px;align-items:center"><input type="text" inputmode="decimal" id="f_info_refKm" data-k="info.refKm" value="${esc(i.info.refKm || '')}" placeholder="km" aria-label="Distância em km" style="width:84px;text-align:right"><span style="font-weight:600;white-space:nowrap">km de</span><input type="text" id="f_info_refLocal" data-k="info.refLocal" list="dl_locais" value="${esc(i.info.refLocal || '')}" placeholder="Ex.: Itajubá" aria-label="Cidade ou ponto de referência" style="flex:1;min-width:0"></div>
    <datalist id="dl_locais">${locais.map(l => `<option value="${esc(l)}"></option>`).join('')}</datalist>
    <span class="muted small">Selecione a rota do cabo abaixo para informar a referência pela ponta A ou B.</span></div>
    <div class="field full" id="prox"></div>`;
}
async function pintaProximos(i) {
  const box = $('#prox'); if (!box) return;
  const todos = await eventosHistorico(); todos.forEach(e => { if (!e._doEquipe && !S.inspCache.has(e.id)) S.inspCache.set(e.id, e); });
  if (S.insp !== i || !document.contains(box)) return;
  const prox = eventosProximos(i, todos);
  if (!prox.length) { box.innerHTML = i.loc || i.info.refLocal ? '<span class="muted small">Nenhum evento anterior registrado num raio de 1 km.</span>' : ''; return; }
  const sug = !i.info.refLocal && !i.info.refKm ? prox.find(p => p.e.info.refLocal || p.e.info.refSentido) : null;
  box.innerHTML = `<div class="warnbox" style="display:flex;flex-direction:column;gap:8px"><b>${prox.length} evento(s) próximo(s) no histórico</b>
    ${sug ? `<span>Sugestão de referência: <b>${esc(refTxt(sug.e))}</b>${sug.d != null ? ` (evento a ${fDist(sug.d)} daqui)` : ''}.</span>` : ''}
    <div class="list">${prox.map(({ e, d, dk, viaRef }, k) => `<div class="item" style="cursor:default;background:var(--surface);align-items:flex-start"><span class="badge" style="${isCorr(e) ? 'background:var(--warn-soft);color:var(--orange)' : ''}">${d != null ? esc(fDist(d).replace(' ', '')) : '≈'}</span><span class="tx"><b style="white-space:normal">${esc(rotuloEvento(e))}</b><span style="white-space:normal">${fData(e.chegada)}${isCorr(e) && e.corr.ocorrencia ? ' · ' + esc(e.corr.ocorrencia) : ''}${refTxt(e) ? ' · ' + esc(refTxt(e)) : ''}</span><span class="muted small" style="white-space:normal">${d != null ? `A ${fDist(d)} daqui pelo GPS` : ''}${dk != null ? `${d != null ? ' · ' : ''}${viaRef ? 'Mesma referência, ' : ''}${fKmRef(dk)} km de diferença na referência` : ''}</span>
      <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">${e.info.refLocal || e.info.refSentido ? `<button type="button" class="btn" data-usaref="${k}" style="min-height:40px;padding:0 12px;font-size:14px">Usar referência</button>` : ''}<button type="button" class="btn" data-verev="${e.id}" style="min-height:40px;padding:0 12px;font-size:14px">Ver detalhes</button></div></span></div>`).join('')}</div></div>`;
  $$('[data-usaref]', box).forEach(b => b.onclick = () => {
    const { e, d } = prox[+b.dataset.usaref];
    if (e.info.rotaId && e.info.refSentido) { const pa = posA(e), rt = rotaById(e.info.rotaId), x = extRota(rt);
      if (!i.info.rotaId) { i.info.rotaId = e.info.rotaId; i.info.rota = rotaLb(rt); }
      const s0 = i.info.refSentido || e.info.refSentido; i.info.refSentido = s0;
      i.info.refKm = s0 === e.info.refSentido ? e.info.refKm : (pa != null && x != null ? String(+(s0 === 'A' ? pa : x - pa).toFixed(1)).replace('.', ',') : e.info.refKm); }
    else { i.info.refLocal = e.info.refLocal; i.info.refKm = e.info.refKm || ''; }
    i.info.refDe = e.id; saveInsp();
    toast(d != null ? `Referência copiada. O evento anterior fica a ${fDist(d)} daqui: ajuste o km se precisar.` : 'Referência copiada. Ajuste o km se precisar.', 5000);
    const y = window.scrollY; render(); window.scrollTo(0, y);
  });
  $$('[data-open]', box).forEach(b => b.onclick = async () => { saveInsp(true); const ev = S.inspCache.get(b.dataset.open) || await DB.get('inspecoes', b.dataset.open); if (!ev) return; S.insp = ev; S.step = 0; go('insp'); });
}
function lembraLocal(l) { l = String(l || '').trim(); if (!l) return; const a = S.perfil.refLocais || []; if (!a.some(x => normLocal(x) === normLocal(l))) { S.perfil.refLocais = [...a, l].slice(-30); DB.put('meta', S.perfil); } }
function updLocUi() { const k = S.view === 'insp' && S.insp ? ST()[S.step][0] : ''; if (k === 'caixa' || k === 'ocorr') { const y = window.scrollY; render(); window.scrollTo(0, y); } }
function tentaGeo() { const i = S.insp; if (!i || !i.loc || S.geoBusy) return; if (i.info.endereco && !i.geoPend) return; if (S.geoTry && Date.now() - S.geoTry < 20000) return; preencherEndereco(true, true); }
window.addEventListener('online', () => { S.geoTry = 0; tentaGeo(); });
async function concluirInsp() {
  const i = S.insp; if (!i) return; marcaApoios(i);
  if (isCorr(i) && S.ronda && S.ronda.id === i.rondaId && !Lib.liberada(S.ronda)) { const p = Lib.de(S.ronda); if (!p || p.status === 'recusado') { if (confirm('Para concluir e sair do local é preciso a liberação do gestor. Pedir agora?')) pedirLiberacao(S.ronda); } else toast('Aguardando a liberação do gestor para concluir.', 6000); return; }
  if (isCorr(i) && !i.apoio && !window.__regrasCorrOff && i.status !== 'concluida' && i.fotos.length < EVID_MIN) { toast(`Tire no mínimo ${EVID_MIN} evidências do evento (agora são ${i.fotos.length}).`, 6000); S.step = Math.max(0, ST().findIndex(s => s[0] === 'fotos')); render(); window.scrollTo(0, 0); return; }
  if (isCorr(i)) { if (!String(i.corr.ticket || '').trim()) { i.corr.ticket = await proximoTicket(); i.corr.ticketAuto = true; toast('Ticket gerado automaticamente: ' + i.corr.ticket); } } else if (isVist(i)) { if (!String(i.vist.descricao || '').trim()) { toast('Escreva o registro da vistoria.'); S.step = 0; render(); return; } } else if (isImpl(i) && !usaImpl(i, 'caixa')) { if (!String(i.impl.designacao || '').trim()) { toast('Informe a designação.'); S.step = 0; render(); return; } } else if (isSite(i)) { const stp = k => Math.max(0, ST().findIndex(x => x[0] === k)); if (!i.site.checkin) { toast('Faça o check-in no site.'); S.step = 0; render(); return; } if ((i.site.fibras || []).some(f => (f.bobina && mNum(f.bobinaM) == null) || (f.ev || []).some(e => mNum(e.dist) == null))) { toast('Informe o tamanho da bobina e a distância de cada evento do OTDR.'); S.step = stp('sfib'); render(); return; } if (!String(i.site.sigla || '').trim()) { toast('Informe a sigla do site.'); S.step = 0; render(); return; } if (!String(i.site.parc.nome || '').trim()) { toast('Informe o técnico do parceiro que acompanhou.'); S.step = 0; render(); return; } if (!siteFibOk(i).length) { toast('Informe as fibras trabalhadas (origem x destino).'); S.step = stp('sfib'); render(); return; } if (siteFibSemPot(i).length) { toast('Escreva a potência TX e RX de todas as fibras.'); S.step = stp('sfib'); render(); return; } const ff = obrigOf(i).filter(c => !i.fotos.some(x => x.cat === c)); if (ff.length && !confirm('Faltam fotos de: ' + ff.join(', ') + '. Concluir assim mesmo?')) { S.step = stp('fotos'); render(); return; } } else if (!i.info.tag.trim()) { toast('Preencha a TAG da caixa.'); S.step = isImpl(i) ? 1 : 0; render(); return; }
  if (isCorr(i) && i.status !== 'concluida' && S.ronda && S.ronda.id === i.rondaId) { const p = Lib.de(S.ronda); if (p) { i.corr.libPedido = p.criado || null; if (p.status === 'aprovado') { i.corr.libEm = +p.decidido_em || Date.now(); i.corr.libPor = p.decidido_por || ''; } } }
  if (i.status !== 'concluida') { i.status = 'concluida'; i.saida = Date.now(); }
  const r = S.ronda && S.ronda.id === i.rondaId ? S.ronda : null;
  if (r && !r.eventos.some(e => e.tipo === 'saida' && e.inspId === i.id)) { r.eventos.push({ tipo: 'saida', ts: i.saida, inspId: i.id }); saveRonda(true);  Nuvem.aoVivo(true); }
  saveInsp(true); baixaDaInsp(i); toast(isCorr(i) ? 'Atendimento concluído. Ao sair do local, toque em Encerrar corretiva.' : isSite(i) ? 'Conjunta concluída. Fica pendente para o supervisor anexar as curvas do OTDR (TX e RX).' : 'Inspeção concluída.');
  S.insp = null; go('home');
}

