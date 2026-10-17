// Técnico Plus - Multivale · mapa de fusão e diagrama linear
// Os arquivos app-*.js carregam em ordem (ver index.html) e compartilham o mesmo escopo global.
'use strict';
/* ============================ mapa de fusão da caixa de emenda (diagrama) ============================ */
// tem fusões para desenhar? (preventiva, corretiva, implantação com fusões e vistoria de mapeamento de caixa)
const temMapaFusao = i => !!(i && i.fo && i.cabos && !(isCorr(i) && i.corr && i.corr.houveFusao === 'nao') && (!isVist(i) || (i.vist && i.vist.tipo === 'caixa')) && (!isImpl(i) || usaImpl(i, 'fusoes')) && !claroCorr(i));
function mapaFusaoDados(i) {
  ensureRows(i); if ((i.fo.modo || 'cor') !== 'det') syncFo(i); const tot = i.fo.total, pe = padE(i);
  const links = [], livres = []; const usados = new Set(), deS = new Map();
  const paradas = [];
  for (let k = 0; k < tot; k++) { const r = i.fo.rows[k]; if (r.f && r.fib && paraAqui(i, r)) { paradas.push({ a: k + 1, cabo: r.cabo || 'S1', b: +r.fib, cap: r.cabo === 'S2' && !i.cabos.temS2 ? 0 : capSaida(i, r.cabo || 'S1') }); continue; } if (r.f && r.fib) { const l = { a: k + 1, cabo: r.cabo || 'S1', b: +r.fib, mano: +r.fib !== k + 1 || (r.mot || '').startsWith('Inversão'), band: r.band || '', mot: r.mot || '' }; links.push(l); usados.add(l.cabo + '-' + l.b); deS.set(l.cabo + '-' + l.b, l.a); } else livres.push(k + 1); }
  const saidas = [{ k: 'S1', nome: 'Saída 1', pad: padS(i, 'S1'), cap: capSaida(i, 'S1') }]; if (i.cabos.temS2) saidas.push({ k: 'S2', nome: 'Saída 2', pad: padS(i, 'S2'), cap: capSaida(i, 'S2') });
  return { tot, pe, links, livres, paradas, saidas, usados, deS };
}
// a fibra de entrada estava ligada numa fibra que o cabo de saída atual não tem: ela para nesta caixa e não segue
function paraAqui(i, r) { const c = r.cabo || 'S1'; return !!(r.f && r.fib && ((c === 'S2' && !i.cabos.temS2) || +r.fib > capSaida(i, c))); }
// Diagrama no formato de grupos: o tubo é um bloco na cor do tubo, cada fibra é uma célula na cor da fibra, e as linhas ligam entrada → saída.
// o.edit: linhas mais altas e áreas de toque (data-fe = fibra de entrada, data-fs = "S1-5"); o.sel = { e: n } ou { s: 'S1-5' }
function fusaoSvg(i, o = {}) {
  const D = mapaFusaoDados(i); const ed = !!o.edit, cp = !!o.compacto; const W = o.largura || (cp ? 326 : 680), CW = cp ? 112 : 200, RH = ed ? 24 : 14, TH = 18, G = ed ? 14 : 10, yCab = cp ? 40 : 26, top = cp ? 72 : 58, BK = 22, SW = 22;
  const soComFusao = o.soComFusao ?? (!ed && (D.tot > 48 || D.saidas.some(s => s.cap > 48)));
  const sel = o.sel || {}; const selLink = sel.e ? D.links.find(l => l.a === sel.e) : sel.s ? D.links.find(l => l.cabo + '-' + l.b === sel.s) : null;
  const tubosE = Array.from({ length: Math.ceil(D.tot / 12) }, (_, t) => t + 1).filter(t => o.tubos ? o.tubos.has(t) : !soComFusao || D.links.some(l => tf(l.a).t === t) || (sel.e && tf(sel.e).t === t));
  const posE = new Map(), posS = new Map(); let yE = top, yS = top; const fundo = [], partes = [], toque = [];
  const fs = ed ? 12 : 10.5;
  const txt = (x, y, s, a = {}) => `<text x="${x}" y="${y}" font-size="${a.fs || fs}" ${a.anchor ? `text-anchor="${a.anchor}"` : ''} font-weight="${a.b ? 700 : 400}" fill="${a.cor || '#1d1b19'}" pointer-events="none">${esc(s)}</text>`;
  const cel = (x, y, cor, apagada) => `<rect x="${x}" y="${y + 2}" width="${SW}" height="${RH - 4}" rx="2" fill="${cor}" stroke="#3a3632" stroke-width=".7" ${apagada ? 'opacity=".45"' : ''} pointer-events="none"/>`;
  const cabe = (x, y, s, w) => `<rect x="${x}" y="${y}" width="${w}" height="24" rx="5" fill="#312d2a"/>${txt(x + 8, y + 16, s, { cor: '#fff', b: 1, fs: 12 })}`;
  const marca = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="${RH}" rx="4" fill="#ffe8cc" stroke="#e8590c" stroke-width="1.5" pointer-events="none"/>`;
  partes.push(cabe(0, yCab, `Entrada · ${D.tot} FO${cp ? '' : ' · ' + (D.pe === 'EIA' ? 'americano' : 'nacional')}`, CW));
  tubosE.forEach(t => { const nF = Math.min(12, D.tot - (t - 1) * 12);
    partes.push(txt(0, yE + 13, `Tubo ${t} · ${tNome(t, D.pe)}`, { b: 1, fs: 11 })); yE += TH;
    partes.push(`<rect x="0" y="${yE}" width="${BK}" height="${nF * RH}" rx="3" fill="${tCor(t, D.pe)}" stroke="#3a3632" stroke-width=".8"/>`);
    for (let f = 1; f <= nF; f++) { const n = (t - 1) * 12 + f; const cy = yE + RH / 2; posE.set(n, cy); const livre = D.livres.includes(n); const pa = D.paradas.find(x => x.a === n); const l = livre || pa ? null : D.links.find(x => x.a === n);
      if (sel.e === n) fundo.push(marca(BK + 2, yE, CW - BK - 2));
      partes.push(cel(CW - SW, yE, fCor(f, D.pe)[1], livre), txt(BK + 6, cy + 4, `${n}`, { b: 1, cor: livre ? '#9a938c' : '#1d1b19' }), cp ? '' : txt(BK + 30, cy + 4, `${fCor(f, D.pe)[0]}`, { cor: livre ? '#9a938c' : '#1d1b19' }),
        txt(CW - SW - 4, cy + 4, livre ? 'livre' : pa ? 'para aqui' : `→${l.cabo === 'S1' && D.saidas.length === 1 ? '' : l.cabo + ' '}${l.b}`, { anchor: 'end', fs: ed ? 10 : 8.5, b: !!pa, cor: livre ? '#9a938c' : pa ? '#c2410c' : l.mano ? '#c2410c' : '#655e58' }), pa ? `<path d="M${CW} ${cy} H${CW + 24} M${CW + 24} ${cy - 7} V${cy + 7}" stroke="#e8590c" stroke-width="2.4" fill="none" pointer-events="none"/>` : '');
      if (ed) toque.push(`<rect data-fe="${n}" x="0" y="${yE}" width="${CW}" height="${RH}" fill="transparent" style="cursor:pointer"><title>Entrada FO ${n}</title></rect>`); yE += RH; }
    yE += G; });
  const xR = W - CW;
  D.saidas.forEach((s, si) => { if (si) yS += 14; partes.push(cabe(xR, si ? yS : yCab, `${cp ? s.k : s.nome} · ${s.cap} FO${cp ? '' : ' · ' + (s.pad === 'EIA' ? 'americano' : 'nacional')}`, CW)); if (si) yS += 32;
    const tubos = Array.from({ length: Math.ceil(s.cap / 12) }, (_, t) => t + 1).filter(t => o.tubos ? o.tubos.has(t) || D.links.some(l => l.cabo === s.k && tf(l.b).t === t && o.tubos.has(tf(l.a).t)) : !soComFusao || D.links.some(l => l.cabo === s.k && tf(l.b).t === t) || (sel.s && sel.s.startsWith(s.k + '-') && tf(+sel.s.split('-')[1]).t === t));
    tubos.forEach(t => { const nF = Math.min(12, s.cap - (t - 1) * 12);
      partes.push(txt(W, yS + 13, `Tubo ${t} · ${tNome(t, s.pad)}`, { b: 1, fs: 11, anchor: 'end' })); yS += TH;
      partes.push(`<rect x="${W - BK}" y="${yS}" width="${BK}" height="${nF * RH}" rx="3" fill="${tCor(t, s.pad)}" stroke="#3a3632" stroke-width=".8"/>`);
      for (let f = 1; f <= nF; f++) { const n = (t - 1) * 12 + f; const key = s.k + '-' + n; const cy = yS + RH / 2; posS.set(key, cy); const usada = D.usados.has(key);
        if (sel.s === key) fundo.push(marca(xR, yS, CW - BK - 2));
        partes.push(cel(xR, yS, fCor(f, s.pad)[1], !usada), txt(xR + SW + 4, cy + 4, usada ? `←${D.deS.get(key)}` : '', { fs: ed ? 10 : 8.5, cor: '#655e58' }), cp ? '' : txt(W - BK - 30, cy + 4, `${fCor(f, s.pad)[0]}`, { anchor: 'end', cor: usada ? '#1d1b19' : '#9a938c' }), txt(W - BK - 6, cy + 4, `${n}`, { anchor: 'end', b: 1, cor: usada ? '#1d1b19' : '#9a938c' }));
        if (ed) toque.push(`<rect data-fs="${key}" x="${xR}" y="${yS}" width="${CW}" height="${RH}" fill="transparent" style="cursor:pointer"><title>${s.nome} fibra ${n}</title></rect>`); yS += RH; }
      yS += G; }); });
  const linhas = [], toqueL = []; const x1 = CW, x2 = xR, mx = (x1 + x2) / 2;
  D.links.forEach(l => { const ya = posE.get(l.a), yb = posS.get(l.cabo + '-' + l.b); if (ya == null || yb == null) return; const d = `M${x1} ${ya} C${mx} ${ya}, ${mx} ${yb}, ${x2} ${yb}`; const on = selLink === l;
    linhas.push(`<path d="${d}" fill="none" stroke="${on ? '#1971c2' : l.mano ? '#e8590c' : '#2b2724'}" stroke-width="${on ? 3.2 : l.mano ? 2 : 1.4}" ${l.mano ? 'stroke-dasharray="7 4"' : ''} pointer-events="none"/>`);
    if (ed) toqueL.push(`<path data-fe="${l.a}" d="${d}" fill="none" stroke="transparent" stroke-width="12" style="cursor:pointer"/>`);
    const ym = (ya + yb) / 2; if (l.mano) linhas.push(`<rect x="${mx - 9}" y="${ym - 8}" width="18" height="16" rx="3" fill="#e8590c" pointer-events="none"/>${txt(mx, ym + 4, 'M', { anchor: 'middle', b: 1, cor: '#fff', fs: 10 })}`);
    else if (l.band) linhas.push(`<rect x="${mx - 13}" y="${ym - 7}" width="26" height="14" rx="3" fill="#fff" stroke="#c9c3bd" pointer-events="none"/>${txt(mx, ym + 4, 'B' + l.band, { anchor: 'middle', fs: 9 })}`); });
  const H = Math.max(yE, yS) + 34; const nMan = D.links.filter(l => l.mano).length;
  const tit = `${o.titulo || 'Mapa de fusão'}${i.info && i.info.tag ? ' · ' + i.info.tag : ''}${i.chegada ? ' · ' + fData(i.chegada) : ''}`;
  const leg = `${D.links.length} fusão(ões) de ${D.tot} fibras${D.paradas.length ? ` · ${D.paradas.length} param nesta caixa (⊣)` : ''}${nMan ? ` · ${nMan} manobra/inversão (M, tracejado)` : ''}${D.links.some(l => l.band) ? ' · B = bandeja' : ''}${soComFusao ? ' · só tubos com fusão' : ''}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(tit)}: ${esc(leg)}" style="${o.rola ? `width:${W}px;max-width:none` : 'max-width:100%'};height:auto;background:#fff;font-family:Inter,Arial,sans-serif;-webkit-user-select:none;user-select:none"><rect width="${W}" height="${H}" fill="#fff"/>${txt(0, 14, tit, { b: 1, fs: cp ? 12 : 13 })}${cp ? txt(0, 30, leg.replace(' (M, tracejado)', '').replace(' · B = bandeja', ''), { fs: 9.5, cor: '#655e58' }) : txt(W, 14, leg, { anchor: 'end', fs: 10, cor: '#655e58' })}${fundo.join('')}${partes.join('')}${linhas.join('')}${D.links.length || ed ? '' : txt(W / 2, top + 30, 'Nenhuma fusão marcada nesta caixa.', { anchor: 'middle', cor: '#9a938c' })}${toque.join('')}${toqueL.join('')}</svg>`;
}
// SVG → PNG (canvas), para baixar e para o PDF
async function svgCanvas(svg, escala = 2) {
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/); const w = +m[1], h = +m[2];
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode();
  const c = document.createElement('canvas'); c.width = Math.round(w * escala); c.height = Math.round(h * escala); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); return c;
}
// imagem alta no PDF: largura 186 mm, quebrando em páginas quando passa da folha
function pdfImagemAlta(doc, c, y) {
  const mmPorPx = 186 / c.width; let ini = 0;
  while (ini < c.height) { const disp = 282 - y; const hpx = Math.min(c.height - ini, Math.floor(disp / mmPorPx)); if (hpx < 60) { doc.addPage(); y = 16; continue; }
    const p = document.createElement('canvas'); p.width = c.width; p.height = hpx; p.getContext('2d').drawImage(c, 0, ini, c.width, hpx, 0, 0, c.width, hpx);
    doc.addImage(p.toDataURL('image/jpeg', 0.9), 'JPEG', 12, y, 186, hpx * mmPorPx); y += hpx * mmPorPx + 3; ini += hpx; if (ini < c.height) { doc.addPage(); y = 16; } }
  return y;
}
// ---------- editor: toque na fibra de entrada e depois na de saída ----------
function fmDica(i, s = S.fmSel) {
  const D = mapaFusaoDados(i);
  if (!s) return 'Toque numa fibra de <b>entrada</b> (esquerda) e depois na fibra de <b>saída</b> (direita) para ligar. Toque numa fibra ligada para ver, mudar a bandeja ou desfazer.';
  if (s.e) { const pa = D.paradas.find(x => x.a === s.e); if (pa) return `<b>Entrada ${s.e}</b> para nesta caixa: estava ligada na ${pa.cabo} ${pa.b}, mas o cabo de saída tem ${pa.cap || 0} FO. A fusão fica guardada e volta se o cabo aumentar. Toque numa fibra de saída para ligar em outra.`; const l = D.links.find(x => x.a === s.e); return l ? `<b>Entrada ${s.e}</b> (${esc(foTxt(s.e, D.pe))}) ligada na <b>${l.cabo} ${l.b}</b>. Toque em outra fibra de saída para trocar.` : `<b>Entrada ${s.e}</b> (${esc(foTxt(s.e, D.pe))}) selecionada. Agora toque na fibra de <b>saída</b>.`; }
  const [c, b] = s.s.split('-'); const a = D.deS.get(s.s); return a ? `<b>${c} ${b}</b> recebe a <b>entrada ${a}</b>. Toque em outra fibra de entrada para trocar.` : `<b>${c} ${b}</b> selecionada. Agora toque na fibra de <b>entrada</b>.`;
}
function fmPainel(i, s = S.fmSel) {
  const D = mapaFusaoDados(i); if (!s) return ''; const a = s.e || D.deS.get(s.s); if (!a) return ''; const l = D.links.find(x => x.a === a); if (!l) return ''; const k = a - 1, r = i.fo.rows[k];
  return `<div class="fo on" style="margin:0"><div class="fo-head"><span class="fo-n">FO ${a}</span><span class="meta">→ ${l.cabo} fibra ${l.b} (${esc(foTxt(l.b, padS(i, l.cabo)))})${l.mano ? ' <span class="pill mano">Manobra</span>' : ''}</span></div>
    <div class="grid2"><div class="field"><label class="lb" for="fmpBand">Bandeja</label><input id="fmpBand" type="text" inputmode="numeric" value="${esc(r.band || '')}" placeholder="—"></div>
    ${l.mano ? `<div class="field"><label class="lb" for="fmpMot">Motivo da manobra</label><input id="fmpMot" type="text" value="${esc(r.mot || '')}" placeholder="Ex.: fibra ${l.b} quebrada no trecho"></div>` : '<div></div>'}</div>
    <button type="button" class="del" id="fmpDel" style="min-height:40px;border:1px solid var(--bad);color:var(--bad);background:transparent;border-radius:8px;font-weight:600">Desfazer esta fusão</button></div>`;
}
function mapaFusaoCard(i) {
  if (!temMapaFusao(i)) return ''; const so = S.fmapaSo ?? false; if (S.fmInsp !== i.id) { S.fmInsp = i.id; S.fmSel = null; S.fmUndo = []; S.fmTubos = tubosPadrao(i); S.fmAberto = false; }
  const pend = isCorr(i) || isImpl(i) ? '' : !i.cabos.entrada.padrao ? '<div class="warnbox small">Informe na etapa <b>Cabos</b> o padrão de cores dos cabos. Até lá as cores aparecem no padrão Nacional.</div>' : '';
  return `<section class="card" id="fmCard"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><h2>Diagrama de fusões</h2><span class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn" id="bFmCor" style="min-height:40px">Cor com cor</button><button type="button" class="btn" id="bFmUndo" style="min-height:40px" ${(S.fmUndo || []).length ? '' : 'disabled'}>Desfazer</button><button type="button" class="btn" id="bFmLimpa" style="min-height:40px">Limpar</button></span></div>
    ${pend}
    <div class="row" style="gap:10px;flex-wrap:wrap;align-items:center"><label class="lb" for="fmBand" style="margin:0">Bandeja das próximas fusões</label><input id="fmBand" type="text" inputmode="numeric" value="${esc(S.fmBand || '')}" placeholder="—" style="width:70px"><label class="row" style="gap:8px;align-items:center;min-height:36px"><input type="checkbox" id="fmSo" ${so ? 'checked' : ''} style="width:20px;height:20px"> Só tubos com fusão</label></div>
    ${cabosCtrlHtml(i, true)}${tubosCtrlHtml(i, S.fmTubos)}
    <p class="small" id="fmDica" style="margin:0" aria-live="polite">${fmDica(i)}</p>
    <div id="fmapa" style="overflow:auto;border:1px solid var(--line);border-radius:8px;background:#fff;padding:8px;max-height:75vh">${fusaoSvg(i, { soComFusao: so, rola: 1, edit: 1, compacto: fmEstreito(), sel: S.fmSel || undefined, tubos: S.fmTubos || undefined })}</div>
    <span class="muted small">${fmEstreito() ? 'Na tela do celular o diagrama mostra só os números; a cor de cada fibra está no quadradinho. ' : ''}Linha preta: fusão direta · laranja tracejada (M): manobra ou inversão · B: bandeja.</span>
    <div id="fmPainel">${fmPainel(i)}</div>
    <div class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn" id="bFmPng" style="min-height:40px">Baixar imagem</button><button type="button" class="btn" id="bFmAnexo" style="min-height:40px">${ICON.cam}Anexar mapa existente</button>${!ADMIN && i.info && i.info.tag && Nuvem.on ? '<button type="button" class="btn" id="bFmCopia" style="min-height:40px">Copiar da última visita</button>' : ''}</div>
    ${(i.fotos || []).some(f => /mapa de fus/i.test(f.cat || '')) ? `<p class="small" style="margin:0">✓ ${(i.fotos || []).filter(f => /mapa de fus/i.test(f.cat || '')).length} mapa(s) existente(s) anexado(s) às fotos.</p>` : ''}</section>`;
}
const fmEstreito = () => innerWidth < 640;
function fmEdita(i, fn, msg) {
  ensureRows(i); if ((i.fo.modo || 'cor') !== 'det') { syncFo(i); i.fo.modo = 'det'; msg = (msg ? msg + ' ' : '') + 'O plano passou para "Detalhar no diagrama".'; }
  S.fmUndo = (S.fmUndo || []).slice(-29); S.fmUndo.push(JSON.stringify(i.fo.rows)); fn(); saveInsp(); fmRepinta(); if (msg) toast(msg, 3500);
}
function fmRepinta() { const y = window.scrollY, b = $('#fmapa'), sl = b ? b.scrollLeft : 0, st = b ? b.scrollTop : 0; render(); window.scrollTo(0, y); const n = $('#fmapa'); if (n) { n.scrollLeft = sl; n.scrollTop = st; } }
function fmLiga(i, a, cabo, b) {
  const D = mapaFusaoDados(i); const old = D.deS.get(cabo + '-' + b); const r0 = i.fo.rows[a - 1]; if (r0.f && r0.cabo === cabo && +r0.fib === b) return false;
  fmEdita(i, () => { if (old && old !== a) { const ro = i.fo.rows[old - 1]; ro.f = false; ro.fib = ''; ro.band = ''; ro.mot = ''; }
    const r = i.fo.rows[a - 1]; r.f = true; r.cabo = cabo; r.fib = String(b); if (S.fmBand) r.band = S.fmBand; if (b === a) r.mot = ''; }, old && old !== a ? `A ${cabo} ${b} estava ligada na entrada ${old}; ficou com a entrada ${a}.` : '');
  return true;
}
function bindMapaFusao(i) {
  if (!$('#fmapa')) return;
  $('#fmapa').onclick = e => {
    const he = e.target.closest('[data-fe]'), hs = e.target.closest('[data-fs]'); const s = S.fmSel; const tot = i.fo.total;
    if (he) { const a = +he.dataset.fe;
      if (s && s.s) { const [c, b] = s.s.split('-'); fmLiga(i, a, c, +b); S.fmSel = { e: a }; fmRepinta(); return; }
      S.fmSel = s && s.e === a ? null : { e: a }; fmRepinta(); return; }
    if (hs) { const key = hs.dataset.fs, [c, b] = key.split('-');
      if (s && s.e) { const a = s.e; fmLiga(i, a, c, +b); const D = mapaFusaoDados(i); let prox = null; for (let n = a + 1; n <= tot; n++) if (!D.links.some(l => l.a === n)) { prox = n; break; } S.fmSel = prox ? { e: prox } : null; fmRepinta(); return; }
      S.fmSel = s && s.s === key ? null : { s: key }; fmRepinta(); return; }
  };
  if (window._fmOuve) $('#app').removeEventListener('change', window._fmOuve); let tm;
  window._fmOuve = e => { if (e.target.closest && e.target.closest('#fmCard')) return; clearTimeout(tm); tm = setTimeout(() => { const b = $('#fmapa'); if (S.view === 'insp' && b && S.insp === i) { b.innerHTML = fusaoSvg(i, { soComFusao: S.fmapaSo ?? false, rola: 1, edit: 1, compacto: fmEstreito(), sel: S.fmSel || undefined, tubos: S.fmTubos || undefined }); $('#fmDica').innerHTML = fmDica(i); } }, 250); }; $('#app').addEventListener('change', window._fmOuve);
  $('#fmSo') && ($('#fmSo').onchange = e => { S.fmapaSo = e.target.checked; fmRepinta(); });
  $$('#fmCard [data-fmcap]').forEach(sl => sl.onchange = () => { let n = 0; fmEdita(i, () => { n = aplicaCap(i, sl.dataset.fmcap, +sl.value); }); if (n) toast(`${n} fibra(s) param nesta caixa: o cabo de saída não tem essas fibras. As fusões ficam guardadas.`, 4500); S.fmTubos = S.fmTubos && tubosPadrao(i); fmRepinta(); });
  $$('#fmCard [data-fmtubo]').forEach(b => b.onclick = () => { S.fmTubos = tubosToggle(S.fmTubos, b.dataset.fmtubo); fmRepinta(); });
  $('#fmBand') && ($('#fmBand').onchange = e => { S.fmBand = e.target.value.trim(); });
  $('#bFmCor') && ($('#bFmCor').onclick = () => { const cap = capSaida(i, 'S1'); fmEdita(i, () => { for (let k = 0; k < i.fo.total; k++) { const r = i.fo.rows[k]; if (k < cap) { r.f = true; r.cabo = 'S1'; r.fib = String(k + 1); r.mot = ''; if (S.fmBand) r.band = S.fmBand; } else { r.f = false; r.fib = ''; } } }, 'Todas ligadas cor com cor na Saída 1. Toque numa fibra para mudar só ela.'); S.fmSel = null; fmRepinta(); });
  $('#bFmLimpa') && ($('#bFmLimpa').onclick = () => { if (!confirm('Apagar todas as fusões desta caixa?')) return; fmEdita(i, () => i.fo.rows.forEach(r => { r.f = false; r.fib = ''; r.band = ''; r.mot = ''; })); S.fmSel = null; fmRepinta(); });
  $('#bFmUndo') && ($('#bFmUndo').onclick = () => { const u = (S.fmUndo || []).pop(); if (!u) return; i.fo.rows = JSON.parse(u); i.fo.modo = 'det'; saveInsp(); fmRepinta(); });
  const a = S.fmSel && (S.fmSel.e || mapaFusaoDados(i).deS.get(S.fmSel.s));
  $('#fmpBand') && ($('#fmpBand').onchange = e => { i.fo.rows[a - 1].band = e.target.value.trim(); saveInsp(); fmRepinta(); });
  $('#fmpMot') && ($('#fmpMot').onchange = e => { i.fo.rows[a - 1].mot = e.target.value.trim(); saveInsp(); });
  $('#fmpDel') && ($('#fmpDel').onclick = () => { fmEdita(i, () => { const r = i.fo.rows[a - 1]; r.f = false; r.fib = ''; r.band = ''; r.mot = ''; }); S.fmSel = { e: a }; fmRepinta(); });
  $('#bFmPng') && ($('#bFmPng').onclick = async () => { try { const c = await svgCanvas(comLogo(fusaoSvg(i, { soComFusao: S.fmapaSo || undefined }), await logoUri(), ['Mapa de fusão', i.info.tag, i.info.trecho && 'Trecho ' + i.info.trecho, i.info.rota, fData(i.chegada || Date.now())].filter(Boolean).join(' · ')).svg, 2); const bl = await new Promise(r => c.toBlob(r, 'image/png')); baixar(new File([bl], nomeArq(`Mapa_fusao_${i.info.tag || i.id}`).replace(/\.pdf$/, '') + '.png', { type: 'image/png' })); } catch (e) { toast('Não foi possível gerar a imagem.'); } });
  $('#bFmAnexo') && ($('#bFmAnexo').onclick = () => { S.fotoCat = 'Mapa de fusão (existente)'; toast('Tire a foto ou escolha a imagem do mapa existente.'); $('#fileGal').click(); });
  $('#bFmCopia') && ($('#bFmCopia').onclick = async () => { const tag = String(i.info.tag || '').trim().toUpperCase(); try { const evs = (await Nuvem.evsPorTag(tag, true)).filter(e => e.id !== i.id && e.fo && (e.fo.rows || []).some(r => r.f) && e.cabos).sort((a, b) => (b.chegada || 0) - (a.chegada || 0)); const ult = evs[0];
      if (!ult) { toast('Nenhuma visita anterior desta caixa com mapa de fusão.'); return; } if (!confirm(`Copiar cabos e fusões da visita de ${fData(ult.chegada)} (${ult.info.tecnico || 'técnico'})? O que está nesta etapa será substituído.`)) return;
      S.fmUndo = []; i.cabos = JSON.parse(JSON.stringify(ult.cabos)); i.fo = JSON.parse(JSON.stringify({ total: ult.fo.total, modo: ult.fo.modo || 'det', rows: ult.fo.rows, exc: ult.fo.exc || [] })); i.fo.copiadoDe = { id: ult.id, em: ult.chegada }; S.fmSel = null; saveInsp(true); toast('Mapa copiado. Confira e ajuste o que mudou.'); fmRepinta(); } catch (e) { toast('Sem conexão para buscar o histórico.'); } });
}
function verMapaFusao(i) { const el = document.createElement('div'); el.className = 'modal'; el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:950;display:flex;align-items:center;justify-content:center;padding:12px';
  el.innerHTML = `<div style="background:var(--surface);border-radius:10px;max-width:760px;width:100%;max-height:92vh;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px" role="dialog" aria-modal="true" aria-label="Mapa de fusão"><div class="row" style="justify-content:space-between"><b>Mapa de fusão</b><button type="button" class="btn" data-x style="min-height:38px">Fechar</button></div><div style="background:#fff;border-radius:8px;padding:6px;overflow:auto">${fusaoSvg(i, { rola: innerWidth < 720 })}</div></div>`;
  document.body.appendChild(el); el.onclick = e => { if (e.target === el || e.target.closest('[data-x]')) el.remove(); }; }

/* ============================ diagrama linear: todas as caixas da rota num arquivo só ============================ */
// distância do início da rota (km) até o ponto, projetando no traçado do KMZ
function kmNaRota(rt, p) {
  if (!rt || !rt.kml || !rt.kml.linhas.length || !p || p.lat == null) return null; let acc = 0, best = null;
  troncoRota(rt).forEach(l => { for (let k = 1; k < l.length; k++) { const a = { lat: l[k - 1][0], lon: l[k - 1][1] }, b = { lat: l[k][0], lon: l[k][1] }, seg = hav(a, b);
    const kx = Math.cos(a.lat * Math.PI / 180), bx = (b.lon - a.lon) * kx, by = b.lat - a.lat, px = (p.lon - a.lon) * kx, py = p.lat - a.lat, L2 = bx * bx + by * by;
    const t = L2 ? Math.max(0, Math.min(1, (px * bx + py * by) / L2)) : 0; const d = hav({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t }, p);
    if (!best || d < best.d) best = { d, km: (acc + seg * t) / 1000 }; acc += seg; } });
  return best;
}
// última visita de cada caixa que tem mapa de fusão
function caixasDoMapa(evs) { const m = new Map(); evs.filter(e => e && e.info && e.info.tag && temMapaFusao(e)).sort((a, b) => (b.chegada || 0) - (a.chegada || 0)).forEach(e => { const t = String(e.info.tag).trim().toUpperCase(); if (!m.has(t)) m.set(t, e); }); return m; }
// caixa nova instalada numa corretiva: entra entre as caixas A e B informadas pelo técnico
const cxNova = e => !!(e && e.vist && e.vist.nova);
function encaixaNovas(itens) {
  itens.filter(x => cxNova(x.ev) && x.km == null).forEach(x => { const A = String(x.ev.vist.entreA || '').trim().toUpperCase(), B = String(x.ev.vist.entreB || '').trim().toUpperCase();
    const k0 = itens.indexOf(x); itens.splice(k0, 1); let k = itens.findIndex(y => y.tag === A); if (k >= 0) k++; else { k = itens.findIndex(y => y.tag === B); if (k < 0) k = itens.length; } itens.splice(k, 0, x); });
  return itens;
}
// De onde cada caixa recebe o cabo: a anterior pela Saída 1 (padrão) ou a Saída 1/2 de outra caixa (derivação: a rota se divide).
function linearPais(cx) { return cx.map((c, k) => { if (!k) return null; const m = /^(.+)\|(S[12])$/.exec(c.pai || ''); const p = m ? cx.findIndex((x, j) => j < k && x.tag === m[1]) : -1; return p >= 0 ? { p, s: m[2] } : { p: k - 1, s: 'S1' }; }); }
// Segue cada fibra do início (DGO ou 1ª caixa) caixa a caixa, inclusive pelos ramos.
function linearDados(cx) {
  const pais = linearPais(cx); const N = Math.max(12, ...cx.map(c => Math.max(c.ev.fo.total || 12, capSaida(c.ev, 'S1'), c.ev.cabos.temS2 ? capSaida(c.ev, 'S2') : 0)));
  const ini = new Map(); for (let n = 1; n <= (cx[0] ? cx[0].ev.fo.total : N); n++) ini.set(n, n);
  const passos = [], ras = new Map(), fus = new Map(), cxs = new Map(); let nb = 1;
  const anota = (o, t) => { if (o) (ras.get(o) || ras.set(o, []).get(o)).push(t); };
  cx.forEach((c, k) => { const e = c.ev, D = mapaFusaoDados(e), pas = (e.fo.modo || 'cor') === 'nenhuma', pai = pais[k];
    const antes = !pai ? ini : (passos[pai.p].out[pai.s] || new Map()); let banda = 0, col = 0;
    if (pai) { const pp = passos[pai.p]; col = pp.col + 1; if (pai.s === 'S1' && pp.filhoS1 == null) { banda = pp.banda; pp.filhoS1 = k; } else { banda = nb++; (pp.filhosR = pp.filhosR || []).push(k); if (pai.s === 'S1') pp.filhoS1x = true; else pp.filhoS2 = true; } }
    const out = { S1: new Map(), S2: new Map() };
    antes.forEach((o, n) => { if (o) (cxs.get(o) || cxs.set(o, []).get(o)).push(c.tag); });
    if (pas) antes.forEach((o, n) => { if (n <= D.tot) out.S1.set(n, o); });
    else { D.links.forEach(l => { if (!antes.has(l.a)) return; const o = antes.get(l.a); out[l.cabo].set(l.b, o ?? null); if (o) fus.set(o, (fus.get(o) || 0) + 1);
        if (l.cabo === 'S2') anota(o, `${c.tag}: vai para a Saída 2, fibra ${l.b}`); else if (l.b !== l.a) anota(o, `${c.tag}: posição ${l.a} para ${l.b}`); });
      D.livres.forEach(n => anota(antes.get(n), `${c.tag}: interrompida (sem fusão na posição ${n})`)); D.paradas.forEach(x => anota(antes.get(x.a), `${c.tag}: para nesta caixa (posição ${x.a}; a ${x.cabo} tem ${x.cap} FO)`)); }
    passos.push({ c, D, pas, pai, banda, col, antes, out, capS1: pas ? D.tot : capSaida(e, 'S1'), capS2: !pas && e.cabos.temS2 ? capSaida(e, 'S2') : 0 }); });
  // pontas: saídas que não seguem para outra caixa da lista
  const fim = new Map();
  passos.forEach(p => { const pontas = [['S1', p.filhoS1 == null && !p.filhoS1x], ['S2', !p.filhoS2 && p.capS2]];
    pontas.forEach(([s, ok]) => { if (ok) p.out[s].forEach((o, pos) => { if (o) (fim.get(o) || fim.set(o, []).get(o)).push({ tag: p.c.tag, s, pos, km: p.c.km }); }); }); });
  return { N, passos, ras, fim, fus, cxs, nb, ini: ini.size };
}
function linearSvg(cx, titulo, opt = {}) {
  const L = linearDados(cx), N = L.N, pe = cx[0] ? padE(cx[0].ev) : 'ABNT', bk = opt.book || null; if (bk && !opt.info) opt = { ...opt, info: n => fibraInfo(n, L, bk) }; const rt = opt.rota || null; const dgo = bk ? dgoDe(bk, 'A', rt) : null, dgoB = bk ? dgoDe(bk, 'B', rt) : null;
  const RH = N > 96 ? 10 : N > 48 ? 12 : 15, TG = 12, LW = 150, CC = 128, BX = 30, fs = Math.min(10, RH - 3), DW = dgo ? 84 : 0, HDR = 112;
  const blocoH = (N - 1) * RH + (Math.ceil(N / 12) - 1) * TG + RH; const top0 = 140, GAP = HDR + 30;
  const bTop = b => top0 + b * (blocoH + GAP); const bFim = b => bTop(b) + blocoH;
  const yF = (b, n) => bTop(b) + (n - 1) * RH + (tf(n).t - 1) * TG + RH / 2;
  const x0 = LW + 24 + DW; const maxCol = Math.max(0, ...L.passos.map(p => p.col)); const xC = c => x0 + c * CC + CC / 2;
  const xEnd = Math.max(x0 + (maxCol + 1) * CC + 6, 760 - LW - DW); const W = xEnd + DW + LW; const H = bFim(L.nb - 1) + 92;
  const txt = (x, y, s, a = {}) => `<text x="${x}" y="${y}" font-size="${a.fs || fs}" ${a.anchor ? `text-anchor="${a.anchor}"` : ''} font-weight="${a.b ? 700 : 400}" fill="${a.cor || '#1d1b19'}" pointer-events="none">${esc(s)}</text>`;
  const P = [];
  const rotulos = (b, xb, dir) => { for (let t = 1; t <= Math.ceil(N / 12); t++) { const a = (t - 1) * 12 + 1, z = Math.min(N, t * 12); const y1 = yF(b, a) - RH / 2, y2 = yF(b, z) + RH / 2;
      P.push(`<rect x="${dir > 0 ? xb : xb - 16}" y="${y1}" width="16" height="${y2 - y1}" rx="2" fill="${tCor(t, pe)}" stroke="#3a3632" stroke-width=".7"/>`, txt(dir > 0 ? xb + 8 : xb - 8, y1 - 2, `T${t}`, { anchor: 'middle', fs: 8, b: 1 }));
      for (let n = a; n <= z; n++) { const f = tf(n).f, y = yF(b, n); P.push(`<rect x="${dir > 0 ? xb + LW - 40 : xb - LW + 26}" y="${y - RH / 2 + 1.5}" width="14" height="${RH - 3}" fill="${fCor(f, pe)[1]}" stroke="#3a3632" stroke-width=".5"/>`, txt(dir > 0 ? xb + 22 : xb - 22, y + fs / 2 - 1, `${n} ${fCor(f, pe)[0]}`, { anchor: dir > 0 ? 'start' : 'end' }));
        if (b === 0 && dir > 0 && opt.clicavel) P.push(`<rect data-lnfib="${n}" x="0" y="${y - RH / 2}" width="${LW - 20}" height="${RH}" fill="transparent" style="cursor:pointer"/>`); } } };
  for (let b = 0; b < L.nb; b++) { rotulos(b, 0, 1); rotulos(b, W, -1); }
  const trecho = (b, xa, xb, mapa, cap) => { for (let n = 1; n <= Math.min(N, cap); n++) { const y = yF(b, n), o = mapa.get(n);
      if (o) P.push(`<line x1="${xa}" y1="${y}" x2="${xb}" y2="${y}" stroke="#3a3632" stroke-width="${RH > 11 ? 3.4 : 2.6}"/><line x1="${xa}" y1="${y}" x2="${xb}" y2="${y}" stroke="${fCor(tf(n).f, pe)[1]}" stroke-width="${RH > 11 ? 2.2 : 1.6}"/>`);
      else P.push(`<line x1="${xa}" y1="${y}" x2="${xb}" y2="${y}" stroke="#b5aea7" stroke-width="1.2" stroke-dasharray="4 3"/>`); } };
  // DGO no início da rota: posição de cada fibra (toque para ver o book da fibra)
  let xIni = LW - 14;
  // coluna de DGO: cabeçalho com o site de origem/destino e o bastidor; cada célula é a posição (bandeja-porta) da fibra
  const colDgo = (xa, d, lado, celulas) => { const w = DW - 16; P.push(`<rect x="${xa}" y="${bTop(0) - 14}" width="${w}" height="${blocoH + 26}" rx="5" fill="#e7f0fa" stroke="#1971c2"/>`, txt(xa + w / 2, bTop(0) - 84, lado === 'A' ? 'DGO origem' : 'DGO destino', { anchor: 'middle', b: 1, fs: 9.5, cor: '#1971c2' }), txt(xa + w / 2, bTop(0) - 70, d.sigla || '', { anchor: 'middle', b: 1, fs: 12 }), txt(xa + w / 2, bTop(0) - 56, d.nome, { anchor: 'middle', fs: 9 }), txt(xa + w / 2, bTop(0) - 43, d.bastidor ? 'Bast. ' + d.bastidor : '', { anchor: 'middle', fs: 8.5, cor: '#655e58' }), txt(xa + w / 2, bTop(0) - 31, d.posBastidor || (d.fila ? 'Fila ' + d.fila : ''), { anchor: 'middle', fs: 8.5, cor: '#655e58' }));
    celulas.forEach(({ y, o, rot }) => { const f = o ? (bk.fibras || {})[o] || {} : {}, inf = o && opt.info ? opt.info(o) : null; const cor = inf && inf.situ === 'Crítica' ? '#c92a2a' : inf && inf.situ === 'Atenção' ? '#e8590c' : o ? '#1971c2' : '#b5aea7';
      P.push(`<rect x="${xa + 3}" y="${y - RH / 2 + 1}" width="${w - 6}" height="${RH - 2}" rx="2" fill="${f.cliente ? '#fff' : '#f3f6f9'}" stroke="${cor}" stroke-width="${inf && inf.situ && inf.situ !== 'Normal' ? 1.6 : .6}" ${o ? '' : 'stroke-dasharray="2 2"'}/>`, txt(xa + w / 2, y + fs / 2 - 1, rot, { anchor: 'middle', fs: Math.min(fs, 9), b: !!f.cliente, cor: o ? '#1d1b19' : '#9a938c' }));
      if (o && opt.clicavel) P.push(`<rect data-dgo="${o}" data-lado="${lado}" x="${xa}" y="${y - RH / 2}" width="${w}" height="${RH}" fill="transparent" style="cursor:pointer"><title>Fibra ${o} · ${esc(rot)}${f.cliente ? ' · ' + esc(f.cliente) : ''}</title></rect>`); }); };
  if (dgo && L.passos.length) { colDgo(LW + 8, dgo, 'A', Array.from({ length: L.ini }, (_, k) => ({ y: yF(0, k + 1), o: k + 1, rot: posDgo(k + 1, bk, 'A', k + 1) }))); xIni = LW + 8 + DW - 16; }
  L.passos.forEach((p, k) => { const b = p.banda, xc = xC(p.col), xa = xc - BX / 2, xb = xc + BX / 2, e = p.c.ev;
    // de onde vem o cabo
    if (!p.pai) trecho(b, xIni, xa, p.antes, e.fo.total);
    else { const pp = L.passos[p.pai.p], xpc = xC(pp.col);
      if (pp.banda === b) trecho(b, xpc + BX / 2, xa, p.antes, Math.max(e.fo.total, pp['cap' + p.pai.s]));
      else { // ramo: o cabo desce da caixa de origem até a faixa do ramo
        P.push(`<path d="M${xpc} ${bFim(pp.banda) + 12} V${bTop(b) - 16}" stroke="#1971c2" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55"/>`, txt(xpc + 8, (bFim(pp.banda) + bTop(b)) / 2 - 30, `${p.pai.s === 'S2' ? 'Saída 2' : 'Saída 1'} de ${pp.c.tag}`, { fs: 9.5, b: 1, cor: '#1971c2' }), txt(0, bTop(b) - 70, `Ramo ${b} · sai da ${pp.c.tag} (${p.pai.s === 'S2' ? 'Saída 2' : 'Saída 1'})`, { fs: 11, b: 1, cor: '#1971c2' }));
        P.push(`<rect x="${xpc - BX / 2 - 3}" y="${bTop(b) - 12}" width="${BX + 6}" height="${blocoH + 22}" rx="5" fill="none" stroke="#1971c2" stroke-dasharray="5 4"/>`, txt(xpc, bTop(b) - 18, p.pai.s, { anchor: 'middle', fs: 9, b: 1, cor: '#1971c2' }));
        trecho(b, xpc + BX / 2, xa, p.antes, Math.max(e.fo.total, pp['cap' + p.pai.s])); } }
    P.push(`<rect x="${xa - 3}" y="${bTop(b) - 12}" width="${BX + 6}" height="${blocoH + 22}" rx="5" fill="${p.pas ? '#eef3f8' : cxNova(e) ? '#fff4e6' : '#f3f1ee'}" stroke="${cxNova(e) ? '#e8590c' : '#c9c3bd'}"/>`);
    const hl = [e.chegada ? fData(e.chegada).slice(0, 10) : '', p.c.km != null ? 'km ' + p.c.km.toFixed(2).replace('.', ',') : '', p.pas ? 'passagem' : `${p.D.links.length}/${p.D.tot} fusões`, cxNova(e) ? 'caixa nova' : ''].filter(Boolean);
    const yh = bTop(b) - HDR + 18; if (opt.clicavel) P.push(`<rect data-lncx="${k}" x="${xa - 44}" y="${yh - 12}" width="${BX + 88}" height="${HDR - 18}" fill="transparent" style="cursor:pointer"><title>Abrir o plano de fusão de ${esc(p.c.tag)}</title></rect>`); P.push(txt(xc, yh, `${k + 1}`, { anchor: 'middle', fs: 9, b: 1, cor: '#9a938c' }), txt(xc, yh + 14, p.c.tag, { anchor: 'middle', b: 1, fs: 10.5 }), ...hl.map((t, j) => txt(xc, yh + 28 + j * 13, t, { anchor: 'middle', fs: 9, cor: t === 'passagem' ? '#1971c2' : t === 'caixa nova' ? '#e8590c' : '#655e58', b: t === 'caixa nova' })));
    if (p.pas) p.antes.forEach((o, n) => { if (n <= p.D.tot && n <= N) P.push(`<line x1="${xa}" y1="${yF(b, n)}" x2="${xb}" y2="${yF(b, n)}" stroke="#2b2724" stroke-width="1"/>`); });
    else { const vaiS2 = !!p.filhoS2;
      p.D.links.forEach(l => { if (l.a > N || l.b > N) return; const ya = yF(b, l.a); if (l.cabo !== 'S1') { P.push(`<line x1="${xa}" y1="${ya}" x2="${xa + 10}" y2="${ya}" stroke="#1971c2" stroke-width="1.4"/>`, txt(xa + 12, ya + 3, `S2·${l.b}`, { fs: 7.5, cor: '#1971c2', b: 1 })); return; } const yb = yF(b, l.b);
        P.push(`<line x1="${xa}" y1="${ya}" x2="${xb}" y2="${yb}" stroke="${l.b !== l.a ? '#e8590c' : '#2b2724'}" stroke-width="${l.b !== l.a ? 1.8 : 1}" ${l.b !== l.a ? 'stroke-dasharray="4 2"' : ''}/>`); });
      p.D.livres.forEach(n => { if (n > N) return; const y = yF(b, n); if (p.antes.get(n)) P.push(`<path d="M${xa + 1} ${y - 3}l6 6M${xa + 7} ${y - 3}l-6 6" stroke="#c92a2a" stroke-width="1.4"/>`); }); p.D.paradas.forEach(x => { if (x.a > N || !p.antes.has(x.a)) return; const y = yF(b, x.a); P.push(`<path d="M${xa} ${y} H${xa + 10} M${xa + 10} ${y - 5} V${y + 5}" stroke="#e8590c" stroke-width="2" fill="none"/>`); }); void vaiS2; }
    if (p.filhoS1 == null && !p.filhoS1x) trecho(b, xb, xEnd, p.out.S1, p.capS1); });
  // DGO de destino na ponta da rota principal: em cada posição, a fibra que chega ali
  const ultimo = L.passos.filter(p => p.banda === 0 && p.filhoS1 == null && !p.filhoS1x).pop();
  if (dgoB && ultimo) colDgo(xEnd + 8, dgoB, 'B', Array.from({ length: Math.min(N, ultimo.capS1) }, (_, k) => { const pos = k + 1, o = ultimo.out.S1.get(pos) || null; return { y: yF(0, pos), o, rot: o ? posDgo(o, bk, 'B', pos) : posDgo(0, null, 'B', pos) }; }));
  const ch = [...L.fim.keys()].length;
  P.push(txt(0, H - 64, 'Linha colorida: fibra com continuidade desde o início · cinza tracejada: sem continuidade · laranja: manobra/inversão · ✕ vermelho: fibra sem fusão · ⊣ laranja: fibra para na caixa (cabo de saída menor)', { fs: 9.5, cor: '#655e58' }), txt(0, H - 50, 'Azul S2: derivação para a Saída 2 · faixa de baixo: ramo (a rota se divide) · fundo azul: caixa de passagem · contorno laranja: caixa nova instalada em corretiva', { fs: 9.5, cor: '#655e58' }),
    txt(0, H - 32, `${cx.length} caixa(s)${L.nb > 1 ? ` · ${L.nb - 1} ramo(s)` : ''} · ${ch} de ${L.ini} fibras chegam a alguma ponta com continuidade · cada caixa usa a última visita registrada.`, { fs: 9.5, cor: '#655e58' }));
  const tit = `Diagrama linear de fusões${titulo ? ' · ' + titulo : ''}`;
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(tit)}" style="background:#fff;font-family:Inter,Arial,sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>${txt(0, 16, tit, { b: 1, fs: 14 })}${txt(0, 32, 'Gerado em ' + fData(Date.now()), { fs: 9.5, cor: '#655e58' })}${P.join('')}</svg>`, W, H, L };
}
// logo da Multivale nos diagramas exportados (PNG, SVG e PDF)
async function logoUri() { if (S.logoUri !== undefined) return S.logoUri; try { const b = await (await fetch('logo.png')).blob(); S.logoUri = await blobToData(b); } catch (e) { S.logoUri = null; } return S.logoUri; }
function comLogo(svg, logo, sub) { const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/); const w = +m[1], h = +m[2], hh = 70; const inner = svg.replace(/^<svg /, `<svg x="0" y="${hh}" `).replace(/ style="[^"]*"/, '');
  const out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h + hh}" width="${w}" height="${h + hh}" style="background:#fff;font-family:Inter,Arial,sans-serif"><rect width="${w}" height="${h + hh}" fill="#fff"/>${logo ? `<image href="${logo}" xlink:href="${logo}" x="${w - 110}" y="4" width="106" height="60" preserveAspectRatio="xMaxYMid meet"/>` : ''}<text x="0" y="26" font-size="15" font-weight="700" fill="#1d1b19">Multivale Engenharia</text><text x="0" y="46" font-size="10.5" fill="#655e58">${esc(sub || '')}</text><line x1="0" y1="${hh - 6}" x2="${w}" y2="${hh - 6}" stroke="#d8d3ce"/>${inner}</svg>`;
  return { svg: out, W: w, H: h + hh }; }
const subLinear = (titulo, rt) => [titulo && 'Rota ' + titulo, trechoTxt(rt) && 'Trecho ' + trechoTxt(rt), 'Gerado em ' + fData(Date.now())].filter(Boolean).join(' · ');
const fimTxt = l => l && l.length ? l.map(x => `${x.tag} ${x.s} posição ${x.pos}`).join(' / ') : 'não chega';
function linearRastreio(L, pe) {
  const out = [];
  for (let o = 1; o <= L.ini; o++) { const ev = L.ras.get(o) || [], fp = L.fim.get(o) || []; if (!ev.length && fp.length === 1 && fp[0].pos === o && fp[0].s === 'S1') continue; out.push([`${o} · ${foTxt(o, pe)}`, ev.join(' · ') || '—', fimTxt(fp)]); }
  return out;
}

/* ---------- book de dados da rota (fiber descritivo): DGO, cliente, comprimento, sinal e medições de cada fibra ---------- */
const LAMBDA_DB_KM = { 1310: .35, 1550: .25, 1625: .3 };
const numBr = v => { if (v == null || v === '') return null; const n = +String(v).replace(/\s/g, '').replace(',', '.'); return isFinite(n) ? n : null; };
const fmtBr = (v, d = 2) => v == null ? '—' : v.toFixed(d).replace('.', ',');
const DGO_CAMPOS = [['nome', 'Nome do DGO', 'Ex.: DGO-01'], ['site', 'Site / estação', 'Ex.: PDA · Pindamonhangaba'], ['sala', 'Sala', ''], ['fila', 'Fila', ''], ['bastidor', 'Bastidor', 'Ex.: BST-05'], ['posBastidor', 'Posição no bastidor', 'Ex.: U12 a U15'], ['fpb', 'Fibras por bandeja', '12']];
// DGO da ponta A (origem) ou B (destino): o nome e o site saem da sigla da rota quando não informados
function dgoDe(bk, lado, rt) { const d = (bk && (lado === 'B' ? bk.dgoB : bk.dgo)) || {}; const sg = siglaSite(rt, lado), pt = rt ? rt['ponta' + lado] || '' : ''; return { ...d, nome: d.nome || ('DGO ' + (sg || lado)), site: d.site || [sg, pt].filter(Boolean).join(' · '), sigla: sg || String(d.site || '').split(/[ ·-]/)[0], fpb: +d.fpb || 12 }; }
function posDgo(n, bk, lado = 'A', p = n) { const f = bk && bk.fibras && bk.fibras[n]; const v = f && (lado === 'B' ? f.posDgoB : f.posDgo); if (v) return v; const fpb = +(((bk && (lado === 'B' ? bk.dgoB : bk.dgo)) || {}).fpb) || 12; return `B${Math.ceil(p / fpb)}-${String(((p - 1) % fpb) + 1).padStart(2, '0')}`; }
function posDgoCompleta(n, bk, lado, p, rt) { const d = dgoDe(bk, lado, rt); const pos = posDgo(n, bk, lado, p); const m = /^B(\d+)-(\d+)$/.exec(pos); return [d.site, d.sala && 'Sala ' + d.sala, d.fila && 'Fila ' + d.fila, d.bastidor && 'Bastidor ' + d.bastidor, d.nome + (d.posBastidor ? ' (' + d.posBastidor + ')' : ''), m ? `Bandeja ${+m[1]} · Porta ${m[2]}` : pos].filter(Boolean).join(' · '); }
// posição em que a fibra chega no fim da rota principal (para o DGO de destino)
function posFimPrincipal(L, o) { const ult = L && L.passos.filter(p => p.banda === 0 && p.filhoS1 == null && !p.filhoS1x).pop(); if (!ult) return null; for (const [pos, x] of ult.out.S1) if (x === o) return pos; return null; }
function ultMed(f) { const m = (f.medicoes || []).slice().sort((a, b) => (b.data || 0) - (a.data || 0)); return m[0] || null; }
// tudo o que se sabe da fibra: book + caminho no diagrama + cálculo do orçamento de perda
function fibraInfo(n, L, bk) {
  const f = (bk && bk.fibras && bk.fibras[n]) || {}; const fus = L ? L.fus.get(n) || 0 : null; const fims = L ? L.fim.get(n) || [] : [];
  const kmTr = fims.map(x => x.km).filter(x => x != null); const kmEst = kmTr.length ? Math.max(...kmTr) : null; const kmB = numBr(f.comprimento); const km = kmB ?? kmEst;
  const lam = +f.lambda || 1550, at = LAMBDA_DB_KM[lam] || .25, nCon = numBr(f.conectores) ?? 2;
  const perdaEsp = numBr(f.perdaEsperada) ?? (km != null ? km * at + (fus || 0) * .1 + nCon * .5 : null);
  const tx = numBr(f.tx); const rxEsp = numBr(f.sinalEsperado) ?? (tx != null && perdaEsp != null ? tx - perdaEsp : null);
  const med = ultMed(f); let perdaMed = med ? numBr(med.perda) : null; if (perdaMed == null && med && numBr(med.sinal) != null && tx != null) perdaMed = tx - numBr(med.sinal);
  const perdaKm = perdaMed != null && km ? perdaMed / km : null; const delta = perdaMed != null && perdaEsp != null ? perdaMed - perdaEsp : null;
  const situ = delta == null ? '' : delta > 3 ? 'Crítica' : delta > 1 ? 'Atenção' : 'Normal';
  return { n, f, fus, fims, km, kmB, kmEst, lam, at, nCon, perdaEsp, tx, rxEsp, med, perdaMed, perdaKm, delta, situ, cxs: L ? (L.cxs.get(n) || []) : [] };
}
const BOOK_COLS = [['fibra', 'Fibra'], ['tubo', 'Tubo'], ['cor', 'Cor da fibra'], ['posDgo', 'Posição DGO origem'], ['posDgoB', 'Posição DGO destino'], ['cliente', 'Cliente / ponta atendida'], ['designacao', 'Designação / serviço'], ['pontaB', 'Ponta B'], ['status', 'Status'], ['comprimento', 'Comprimento (km)'], ['lambda', 'Comprimento de onda (nm)'], ['conectores', 'Conectores'], ['tx', 'Potência TX (dBm)'], ['perdaEsperada', 'Perda esperada (dB)'], ['sinalEsperado', 'Sinal esperado (dBm)'], ['medData', 'Data última medição'], ['medPerda', 'Perda medida (dB)'], ['medSinal', 'Sinal medido (dBm)'], ['perdaKm', 'Perda por km atual (dB/km)'], ['situ', 'Situação'], ['fusoes', 'Fusões no caminho'], ['chega', 'Chega em'], ['obs', 'Observação']];
// reconhece o cabeçalho da planilha do cliente (nomes parecidos também valem)
function bookCampo(h) {
  const s = String(h || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const R = [['posDgoB', /(dgo|posicao).*(destino|ponta b)|destino.*(dgo|posicao)/], ['lambda', /onda|lambda|\bnm\b/], ['posDgo', /dgo|posicao/], ['cliente', /cliente|ponta atendida|atendid/], ['designacao', /designa|servico|circuito/], ['pontaB', /ponta b|destino|ponta final/], ['medData', /data/], ['medPerda', /perda medida|perda atual|atenuacao medida|perda total medida/], ['medSinal', /sinal medido|rx medido|potencia medida|potencia rx/],
    ['perdaEsperada', /perda esperada|orcamento|budget|perda prevista/], ['sinalEsperado', /sinal esperado|rx esperado|nivel esperado/], ['tx', /\btx\b|transmiss|potencia/], ['conectores', /conector/], ['comprimento', /comprimento|extensao|distancia|\bkm\b/], ['status', /^status|estado/], ['obs', /obs/], ['fibra', /^fibra|^fo\b|^n.{0,3}fibra|^numero/]];
  for (const [k, rx] of R) if (rx.test(s)) return k; return null;
}
const dataBr = v => { if (v == null || v === '') return null; if (typeof v === 'number') return v > 1e11 ? v : Math.round((v - 25569) * 86400000); const m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/.exec(String(v).trim()); if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return +new Date(y, +m[2] - 1, +m[1], 12); } const t = Date.parse(v); return isFinite(t) ? t : null; };
async function bookImportar(file, bk) {
  if (!window.XLSX) await carregaScript('xlsx.full.min.js');
  let rows;
  if (/\.csv$/i.test(file.name) || /text\/csv/.test(file.type)) { // CSV do Brasil: ; ou , como separador, vírgula decimal e data dd/mm/aaaa (lido como texto)
    const tx = (await file.text()).replace(/^\ufeff/, ''); const sep = (tx.split(/\r?\n/)[0].match(/;/g) || []).length ? ';' : (tx.split(/\r?\n/)[0].match(/\t/g) || []).length ? '\t' : ',';
    rows = tx.split(/\r?\n/).filter(l => l.trim()).map(l => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; }); }
  else { const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false }); const ws = wb.Sheets[wb.SheetNames[0]]; rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }); }
  const hi = rows.findIndex(r => r.some(c => bookCampo(c) === 'fibra')); if (hi < 0) throw new Error('não achei a coluna "Fibra" no cabeçalho');
  const cols = rows[hi].map(bookCampo); bk.fibras = bk.fibras || {}; let n = 0, med = 0;
  rows.slice(hi + 1).forEach(r => { const o = {}; cols.forEach((k, j) => { if (k && r[j] !== '' && r[j] != null) o[k] = r[j]; }); const fib = parseInt(o.fibra, 10); if (!(fib > 0)) return;
    const f = bk.fibras[fib] = bk.fibras[fib] || {}; ['posDgo', 'posDgoB', 'cliente', 'designacao', 'pontaB', 'status', 'obs'].forEach(k => { if (o[k] != null) f[k] = String(o[k]).trim(); }); ['comprimento', 'lambda', 'conectores', 'tx', 'perdaEsperada', 'sinalEsperado'].forEach(k => { if (o[k] != null && numBr(o[k]) != null) f[k] = String(numBr(o[k])); });
    if (o.medPerda != null || o.medSinal != null) { const m = { data: dataBr(o.medData) || Date.now(), perda: numBr(o.medPerda), sinal: numBr(o.medSinal), lambda: +f.lambda || 1550, por: 'planilha importada', obs: '' }; f.medicoes = f.medicoes || []; if (!f.medicoes.some(x => x.data === m.data && x.perda === m.perda && x.sinal === m.sinal)) { f.medicoes.push(m); med++; } }
    n++; });
  return { n, med };
}
async function bookXlsx(bk, rota, L, modelo, rt) {
  if (!window.XLSX) await carregaScript('xlsx.full.min.js'); const pe = 'ABNT'; const tot = Math.max(L ? L.ini : 0, ...Object.keys((bk && bk.fibras) || {}).map(Number), modelo ? 12 : 0);
  const linhas = [BOOK_COLS.map(c => c[1])];
  for (let n = 1; n <= tot; n++) { const I = fibraInfo(n, L, bk), f = I.f, { t, f: ff } = tf(n);
    const v = { fibra: n, tubo: `T${t} ${tNome(t, pe)}`, cor: fCor(ff, pe)[0], posDgo: posDgo(n, bk), posDgoB: (() => { const pB = posFimPrincipal(L, n); return pB ? posDgo(n, bk, 'B', pB) : ((bk && bk.fibras && bk.fibras[n] && bk.fibras[n].posDgoB) || ''); })(), cliente: f.cliente || '', designacao: f.designacao || '', pontaB: f.pontaB || '', status: f.status || '', comprimento: I.kmB ?? (I.kmEst != null ? +I.kmEst.toFixed(3) : ''), lambda: f.lambda || '', conectores: f.conectores || '', tx: f.tx || '',
      perdaEsperada: I.perdaEsp != null ? +I.perdaEsp.toFixed(2) : '', sinalEsperado: I.rxEsp != null ? +I.rxEsp.toFixed(2) : '', medData: I.med ? fData(I.med.data).slice(0, 10) : '', medPerda: I.perdaMed != null ? +I.perdaMed.toFixed(2) : '', medSinal: I.med && I.med.sinal != null ? I.med.sinal : '', perdaKm: I.perdaKm != null ? +I.perdaKm.toFixed(3) : '', situ: I.situ, fusoes: I.fus ?? '', chega: L ? fimTxt(I.fims) : '', obs: f.obs || '' };
    linhas.push(BOOK_COLS.map(c => modelo && !['fibra', 'tubo', 'cor', 'posDgo', 'posDgoB'].includes(c[0]) ? '' : v[c[0]])); }
  const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet(linhas); ws['!cols'] = BOOK_COLS.map(c => ({ wch: Math.max(10, c[1].length + 2) })); XLSX.utils.book_append_sheet(wb, ws, 'Fibras');
  const med = [['Fibra', 'Data', 'Perda medida (dB)', 'Sinal medido (dBm)', 'Comprimento de onda (nm)', 'Por', 'Observação']]; Object.entries((bk && bk.fibras) || {}).forEach(([n, f]) => (f.medicoes || []).forEach(m => med.push([+n, fData(m.data), m.perda ?? '', m.sinal ?? '', m.lambda || '', m.por || '', m.obs || ''])));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(med), 'Medições');
  const dA = dgoDe(bk, 'A', rt), dB = dgoDe(bk, 'B', rt); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Rota', rota || ''], ['Trecho', trechoTxt(rt)], ['Atualizado', bk && bk.atualizado ? fData(bk.atualizado) : ''], [], ['', 'DGO de origem', 'DGO de destino'], ...DGO_CAMPOS.map(([k, lb]) => [lb, dA[k] ?? '', dB[k] ?? '']), [], ['Perda esperada (quando não informada) = comprimento × atenuação (1310 nm: 0,35 · 1550 nm: 0,25 · 1625 nm: 0,30 dB/km) + 0,1 dB por fusão no caminho + 0,5 dB por conector (padrão 2).'], ['Situação: Normal até 1 dB acima do esperado · Atenção de 1 a 3 dB · Crítica acima de 3 dB.']]), 'DGO');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new File([out], nomeArq((modelo ? 'Modelo_book_de_dados_' : 'Book_de_dados_') + (rota || 'rota')).replace(/\.pdf$/, '') + '.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
// fotos do DGO de um lado: as do book + as de campo (categoria DGO) nas visitas da rota, pela metade do traçado mais próxima
function fotosDgo(Lr, lado, rt) {
  const bk = Lr.book || {}; const out = (((lado === 'B' ? bk.dgoB : bk.dgo) || {}).fotos || []).filter(f => f.path).map(f => ({ ...f, de: 'Book · ' + fData(f.ts).slice(0, 10) }));
  const tot = rt && rt.kml ? rt.kml.km || 0 : 0;
  (Lr.evsRota || []).forEach(e => (e.fotos || []).filter(f => f.path && !f.arquivado && /dgo|bastidor/i.test(f.cat || '')).forEach(f => { const k = kmNaRota(rt, e.loc); const ladoEv = k && tot ? (k.km <= tot / 2 ? 'A' : 'B') : null; if (!ladoEv || ladoEv === lado) out.push({ ...f, de: `${TIPO_INSP(e)} ${fData(e.chegada).slice(0, 10)}` }); }));
  return out;
}
// ficha da fibra (toque na posição do DGO ou no número da fibra)
function abrirFibra(n, ctx) {
  const { bk, L, salvar } = ctx; const rt = ctx.rt || null; const I = fibraInfo(n, L, bk); const pB = posFimPrincipal(L, n); const f = I.f; const pe = 'ABNT';
  const el = document.createElement('div'); el.className = 'modal'; el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:950;display:flex;align-items:center;justify-content:center;padding:12px';
  const lin = (a, b) => `<div class="row" style="justify-content:space-between;gap:10px;border-bottom:1px solid var(--line);padding:5px 0"><span class="muted">${a}</span><b style="text-align:right">${b}</b></div>`;
  const sitCor = I.situ === 'Crítica' ? 'var(--bad)' : I.situ === 'Atenção' ? '#e8590c' : 'var(--ok, #2b8a3e)';
  const campo = (k, lb, ph = '', tipo = 'text') => `<div class="field"><label class="lb" for="fb_${k}">${lb}</label><input id="fb_${k}" data-fb="${k}" type="${tipo}" value="${esc(f[k] || '')}" placeholder="${esc(ph)}"></div>`;
  el.innerHTML = `<div style="background:var(--surface);border-radius:10px;max-width:640px;width:100%;max-height:92vh;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px" role="dialog" aria-modal="true" aria-label="Fibra ${n}">
    <div class="row" style="justify-content:space-between"><b>Fibra ${n} · ${esc(foTxt(n, pe))}</b><button type="button" class="btn" data-x style="min-height:38px;flex:0 0 auto;width:auto">Fechar</button></div>
    ${ctx.fotos ? `<section style="display:flex;flex-direction:column;gap:6px"><b class="small">Fotos do DGO de ${ctx.lado === 'B' ? 'destino' : 'origem'} (${esc(dgoDe(bk, ctx.lado || 'A', rt).site || '')})</b>${ctx.fotos.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px">${ctx.fotos.map(f => `<figure style="margin:0"><span class="anxi" style="width:100%;aspect-ratio:4/3;height:auto"><img data-anxsrc="${esc(f.path)}" alt="${esc(f.cat || 'DGO')}" style="cursor:zoom-in"></span><figcaption class="small">${esc(f.de || f.cat || '')}</figcaption></figure>`).join('')}</div>` : '<span class="muted small">Nenhuma foto deste DGO ainda. Tire no mapeamento (tipo "DGO / bastidor") ou envie pelo book de dados.</span>'}</section>` : ''}
    <div>${lin('DGO de origem', esc(posDgoCompleta(n, bk, 'A', n, rt)))}${lin('DGO de destino', pB ? esc(posDgoCompleta(n, bk, 'B', pB, rt)) : 'não chega na ponta B')}
      ${lin('Cliente / ponta atendida', esc(f.cliente || '—'))}${lin('Designação / serviço', esc(f.designacao || '—'))}${lin('Ponta B', esc(f.pontaB || '—'))}${lin('Status', esc(f.status || '—'))}
      ${L ? lin('Caminho', `${I.cxs.length} caixa(s) · ${I.fus} fusão(ões) · chega em ${esc(fimTxt(I.fims))}`) : ''}
      ${lin('Comprimento', I.kmB != null ? fmtBr(I.kmB, 3) + ' km' : I.kmEst != null ? '≈ ' + fmtBr(I.kmEst, 2) + ' km (pelo traçado, até a última caixa)' : '—')}
      ${lin('Perda esperada', I.perdaEsp != null ? `${fmtBr(I.perdaEsp)} dB${numBr(f.perdaEsperada) == null ? ` <span class="muted small">(${I.lam} nm: ${fmtBr(I.at)} dB/km × km + ${I.fus || 0} × 0,1 dB fusões + ${I.nCon} × 0,5 dB conectores)</span>` : ''}` : '—')}
      ${lin('Sinal esperado na ponta', I.rxEsp != null ? fmtBr(I.rxEsp) + ' dBm' : '—')}
      ${lin('Última medição', I.med ? `${fData(I.med.data)} · ${I.perdaMed != null ? fmtBr(I.perdaMed) + ' dB' : ''}${I.med.sinal != null ? ' · ' + fmtBr(numBr(I.med.sinal)) + ' dBm' : ''} · ${I.med.lambda || ''} nm${I.med.por ? ' · ' + esc(I.med.por) : ''}` : 'nenhuma')}
      ${lin('Perda por km atual', I.perdaKm != null ? fmtBr(I.perdaKm, 3) + ' dB/km' : '—')}
      ${lin('Diferença para o esperado', I.delta != null ? `${I.delta >= 0 ? '+' : ''}${fmtBr(I.delta)} dB · <span style="color:${sitCor}">${I.situ}</span>` : '—')}</div>
    ${(f.medicoes || []).length > 1 ? `<details><summary>Histórico de medições (${f.medicoes.length})</summary><div class="tw"><table class="t"><thead><tr><th>Data</th><th>Perda (dB)</th><th>Sinal (dBm)</th><th>nm</th><th>Por</th></tr></thead><tbody>${f.medicoes.slice().sort((a, b) => b.data - a.data).map(m => `<tr><td>${fData(m.data)}</td><td>${m.perda != null ? fmtBr(numBr(m.perda)) : '—'}</td><td>${m.sinal != null ? fmtBr(numBr(m.sinal)) : '—'}</td><td>${m.lambda || ''}</td><td>${esc(m.por || '')}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
    <details ${f.cliente ? '' : 'open'}><summary><b>Dados da fibra</b></summary><div class="grid2">${campo('posDgo', 'Posição no DGO de origem', posDgo(n, bk))}${campo('posDgoB', 'Posição no DGO de destino', pB ? posDgo(n, bk, 'B', pB) : '')}${campo('cliente', 'Cliente / ponta atendida')}${campo('designacao', 'Designação / serviço')}${campo('pontaB', 'Ponta B')}${campo('status', 'Status', 'Ativa, reserva, defeito…')}${campo('comprimento', 'Comprimento (km)', I.kmEst != null ? fmtBr(I.kmEst, 2) : '', 'text')}
      <div class="field"><label class="lb" for="fb_lambda">Comprimento de onda</label><select id="fb_lambda" data-fb="lambda">${[1550, 1310, 1625].map(v => `<option value="${v}" ${+(f.lambda || 1550) === v ? 'selected' : ''}>${v} nm</option>`).join('')}</select></div>${campo('conectores', 'Conectores', '2')}${campo('tx', 'Potência TX (dBm)')}${campo('perdaEsperada', 'Perda esperada (dB)', 'em branco: o app calcula')}${campo('sinalEsperado', 'Sinal esperado (dBm)', 'em branco: TX − perda')}${campo('obs', 'Observação')}</div>
      <button type="button" class="btn pri" id="fbSalva">Salvar dados da fibra</button></details>
    <details><summary><b>Registrar medição</b></summary><div class="grid2"><div class="field"><label class="lb" for="fm_data">Data</label><input id="fm_data" type="date" value="${new Date().toISOString().slice(0, 10)}"></div><div class="field"><label class="lb" for="fm_perda">Perda medida (dB)</label><input id="fm_perda" type="text" inputmode="decimal" placeholder="Ex.: 7,8"></div>
      <div class="field"><label class="lb" for="fm_sinal">Sinal medido (dBm)</label><input id="fm_sinal" type="text" inputmode="decimal" placeholder="opcional"></div><div class="field"><label class="lb" for="fm_lam">Comprimento de onda</label><select id="fm_lam">${[1550, 1310, 1625].map(v => `<option value="${v}" ${+(f.lambda || 1550) === v ? 'selected' : ''}>${v} nm</option>`).join('')}</select></div>
      <div class="field full"><label class="lb" for="fm_obs">Observação</label><input id="fm_obs" type="text" placeholder="OTDR, power meter, ponta medida…"></div></div><button type="button" class="btn pri" id="fmSalva">Salvar medição</button></details></div>`;
  document.body.appendChild(el); el.onclick = e => { if (e.target === el || e.target.closest('[data-x]')) el.remove(); };
  pintaAnexos(el); const reabre = () => { el.remove(); abrirFibra(n, ctx); };
  $('#fbSalva', el).onclick = async () => { const ff = bk.fibras[n] = bk.fibras[n] || {}; $$('[data-fb]', el).forEach(i => { const v = i.value.trim(); if (v) ff[i.dataset.fb] = v; else delete ff[i.dataset.fb]; }); try { await salvar(); toast('Dados da fibra salvos.'); reabre(); } catch (e) { toast('Não foi possível salvar: ' + (e.message || e), 6000); } };
  $('#fmSalva', el).onclick = async () => { const perda = numBr($('#fm_perda', el).value), sinal = numBr($('#fm_sinal', el).value); if (perda == null && sinal == null) { toast('Informe a perda (dB) ou o sinal (dBm).'); return; }
    const ff = bk.fibras[n] = bk.fibras[n] || {}; (ff.medicoes = ff.medicoes || []).push({ data: dataBr($('#fm_data', el).value.split('-').reverse().join('/')) || Date.now(), perda, sinal, lambda: +$('#fm_lam', el).value, por: (S.perfil && S.perfil.nome) || (Nuvem.user && Nuvem.user.email) || '', obs: $('#fm_obs', el).value.trim() });
    try { await salvar(); toast('Medição salva.'); reabre(); } catch (e) { toast('Não foi possível salvar: ' + (e.message || e), 6000); } };
}
function linearHtml() {
  const Lr = S.lin = S.lin || { rota: '', tags: '', itens: null };
  return `<section class="card"><h2>Diagrama linear de fusões</h2><p class="muted small" style="margin:0">Junta o mapa de fusão das caixas numa sequência só (como um unifilar), seguindo cada fibra caixa a caixa, inclusive quando a rota se divide. Usa a última visita de cada caixa, então caixas novas instaladas em corretivas entram sozinhas.</p>
    <div class="grid2"><div class="field"><label class="lb" for="lnRota">Rota</label><select id="lnRota">${rotaOpts(Lr.rota, (S.rotas || []).length ? 'Escolha a rota…' : 'Nenhuma rota cadastrada')}</select></div>
    <div class="field"><label class="lb" for="lnTags">Ou as TAGs na ordem (uma por linha)</label><textarea id="lnTags" rows="3" placeholder="CE-BKB-0012&#10;CE-BKB-0013">${esc(Lr.tags)}</textarea></div></div>
    <button type="button" class="btn pri" id="bLnBusca">Montar a sequência</button><div id="lnBook">${bookCardHtml()}</div><div id="lnLista">${linearListaHtml()}</div></section>`;
}
function bookCardHtml() {
  const Lr = S.lin; if (!Lr || !Lr.rota || !Lr.book) return ''; const bk = Lr.book, rt = rotaById(Lr.rota); const fb = bk.fibras || {};
  const dgoCampos = lado => { const nf = (((lado === 'B' ? bk.dgoB : bk.dgo) || {}).fotos || []).length; return dgoCampos0(lado) + `<div class="row" style="gap:6px;align-items:center;flex-wrap:wrap;margin:4px 0 6px"><span class="small">Fotos do DGO de ${lado === 'A' ? 'origem' : 'destino'}: <b>${nf}</b></span><button type="button" class="btn" data-bkfoto="${lado}" style="min-height:36px">Enviar fotos do DGO</button></div>`; };
  const dgoCampos0 = lado => { const d = (lado === 'B' ? bk.dgoB : bk.dgo) || {}, pad = dgoDe(bk, lado, rt); return `<fieldset style="border:1px solid var(--line);border-radius:8px;padding:8px 10px;margin:0"><legend class="small"><b>${lado === 'A' ? 'DGO de origem' : 'DGO de destino'}</b> · ${esc(pad.site || (lado === 'A' ? 'ponta A' : 'ponta B'))}</legend><div class="grid2">${DGO_CAMPOS.map(([k, lb, ph]) => `<div class="field"><label class="lb" for="bk${lado}_${k}">${lb}</label>${k === 'fpb' ? `<select id="bk${lado}_${k}" data-bkd="${lado}.${k}">${[12, 24, 6, 36, 48].map(v => `<option ${+(d.fpb || 12) === v ? 'selected' : ''}>${v}</option>`).join('')}</select>` : `<input id="bk${lado}_${k}" data-bkd="${lado}.${k}" value="${esc(d[k] || '')}" placeholder="${esc(k === 'nome' ? pad.nome : k === 'site' ? pad.site || ph : ph)}">`}</div>`).join('')}</div></fieldset>`; };
  const nCli = Object.values(fb).filter(f => f.cliente).length, nMed = Object.values(fb).filter(f => (f.medicoes || []).length).length;
  return `<div class="card" style="background:var(--surface-2);margin-top:10px"><h3 style="margin:0">Book de dados da rota (fiber descritivo)</h3><p class="muted small" style="margin:0">Arquivo separado do mapa: posição de cada fibra no DGO, cliente, comprimento, sinal esperado e medições. No diagrama, toque na posição do DGO (ou no número da fibra) para abrir a ficha.</p>
    ${dgoCampos('A')}${dgoCampos('B')}
    <p class="small" style="margin:0">${nCli} fibra(s) com cliente · ${nMed} com medição${bk.atualizado ? ' · atualizado em ' + fData(bk.atualizado) : ' · ainda sem dados'}</p>
    <div class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn" id="bBkImp">Importar planilha</button><button type="button" class="btn" id="bBkExp">Baixar book (.xlsx)</button><button type="button" class="btn" id="bBkMod">Baixar modelo</button><input type="file" id="fileBook" accept=".xlsx,.xls,.csv" hidden></div></div>`;
}
function linearListaHtml() {
  const Lr = S.lin; if (!Lr || !Lr.itens) return ''; if (!Lr.itens.length) return '<p class="empty">Nenhuma caixa com mapa de fusão encontrada.</p>';
  const on = Lr.itens.filter(x => x.on);
  const paiOpts = (x, k) => { const ant = Lr.itens.slice(0, k).filter(y => y.on); if (!ant.length) return ''; const v = x.pai || '';
    return `<select data-lnpai="${k}" aria-label="De onde vem o cabo da ${esc(x.tag)}" style="max-width:220px;min-height:38px"><option value="">Recebe da anterior (Saída 1)</option>${ant.map(y => ['S1', ...(y.ev.cabos && y.ev.cabos.temS2 ? ['S2'] : [])].map(s => `<option value="${esc(y.tag)}|${s}" ${v === y.tag + '|' + s ? 'selected' : ''}>Recebe da ${esc(y.tag)} · ${s === 'S1' ? 'Saída 1' : 'Saída 2'}</option>`).join('')).join('')}</select>`; };
  return `<h3>Caixas na ordem (${on.length})</h3><p class="muted small" style="margin:0">${Lr.porKm ? 'Ordenadas pela posição no traçado da rota.' : 'Na ordem informada.'} Use as setas para ajustar e desmarque as que não entram. Onde a rota se divide, escolha de qual caixa e saída a caixa recebe o cabo.</p>
    <div class="list">${Lr.itens.map((x, k) => `<div class="item" style="cursor:default;gap:8px;flex-wrap:wrap"><input type="checkbox" data-lnon="${k}" ${x.on ? 'checked' : ''} aria-label="Incluir ${esc(x.tag)}" style="width:20px;height:20px"><span class="tx" style="flex:1;min-width:200px"><b>${k + 1}. ${esc(x.tag)}${x.km != null ? ' · km ' + x.km.toFixed(2).replace('.', ',') : ''}${cxNova(x.ev) ? ' · caixa nova' + (x.ev.vist.ticket ? ' (corretiva ' + esc(x.ev.vist.ticket) + ')' : '') : ''}</b><span>${fData(x.ev.chegada)} · ${esc(TIPO_INSP(x.ev))} · ${esc(x.ev.info.tecnico || '')} · ${esc(resumoFo(x.ev))}${x.ev.cabos && x.ev.cabos.temS2 ? ' · tem Saída 2' : ''}</span></span>${x.on ? paiOpts(x, k) : ''}<button type="button" class="btn" data-lnup="${k}" aria-label="Subir" style="min-height:38px;padding:0 10px" ${k ? '' : 'disabled'}>↑</button><button type="button" class="btn" data-lndn="${k}" aria-label="Descer" style="min-height:38px;padding:0 10px" ${k < Lr.itens.length - 1 ? '' : 'disabled'}>↓</button></div>`).join('')}</div>
    <div class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn pri" id="bLnVer" ${on.length ? '' : 'disabled'}>Ver diagrama</button><button type="button" class="btn" id="bLnPdf" ${on.length ? '' : 'disabled'}>Baixar PDF</button><button type="button" class="btn" id="bLnPng" ${on.length ? '' : 'disabled'}>Baixar imagem</button><button type="button" class="btn" id="bLnSvg" ${on.length ? '' : 'disabled'}>Baixar SVG</button></div>
    <div id="lnPrev"></div>`;
}
async function linearPdf(cx, titulo, book, rt) {
  if (!window.jspdf) { toast('Gerador de PDF não carregou.'); return null; }
  const R0 = linearSvg(cx, titulo, { book, rota: rt }), R = { ...R0, ...comLogo(R0.svg, await logoUri(), subLinear(titulo, rt)) }, pe = cx[0] ? padE(cx[0].ev) : 'ABNT'; const esc2 = Math.max(.6, Math.min(2, Math.sqrt(16e6 / (R.W * R.H)), 15000 / R.W, 15000 / R.H)); const c = await svgCanvas(R.svg, esc2);
  const mm = .2646, wmm = Math.max(297, R.W * mm + 20), hmm = Math.max(210, R.H * mm + 20); const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: [wmm, hmm], orientation: wmm >= hmm ? 'landscape' : 'portrait' });
  doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 10, R.W * mm, R.H * mm);
  const ras = linearRastreio(R.L, pe); doc.addPage('a4', 'portrait'); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(20); doc.text('Rastreio das fibras' + (titulo ? ' · ' + titulo : ''), 12, 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`Caixas na ordem: ${cx.map((x, k) => `${k + 1}. ${x.tag}`).join('  ')}`, 12, 23, { maxWidth: 186 });
  if (ras.length) doc.autoTable({ ...TB, startY: 32, head: [['Fibra no início', 'O que muda no caminho', 'Chega em']], body: ras, columnStyles: { 0: { cellWidth: 46 }, 2: { cellWidth: 40 } } });
  else doc.text('Todas as fibras seguem na mesma posição do início ao fim, sem interrupção.', 12, 34);
  return new File([doc.output('blob')], nomeArq('Diagrama_linear_' + (titulo || 'rota')), { type: 'application/pdf' });
}
function bindLinear(box) {
  const Lr = S.lin; const rtSel = () => (Lr.rota && rotaById(Lr.rota)) || null; const tit = () => { const rt = rtSel(); return rt ? rotaLb(rt) : 'caixas'; };
  const sel = () => Lr.itens.filter(x => x.on); const bkSalva = async () => { await Nuvem.bookSalvar(Lr.rota, Lr.book); };
  const pinta = () => { $('#lnLista', box).innerHTML = linearListaHtml(); $('#lnBook', box).innerHTML = bookCardHtml(); liga(); };
  const ver = () => { const cx = sel(); if (!cx.length) return; const L0 = linearDados(cx); const bk = Lr.book; const R = linearSvg(cx, tit(), { book: bk, clicavel: 1, rota: rtSel() }); const ras = linearRastreio(R.L, padE(cx[0].ev));
    $('#lnPrev', box).innerHTML = `${bk ? '<p class="small" style="margin:6px 0">Toque na posição do DGO ou no número da fibra para abrir a ficha da fibra. Toque no nome de uma caixa para abrir o plano de fusão com as fotos.</p>' : ''}<div id="lnSvg" style="overflow:auto;max-height:80vh;border:1px solid var(--line);border-radius:8px;background:#fff;padding:6px">${R.svg}</div>${ras.length ? `<h3>Rastreio das fibras</h3><div class="tw"><table class="t"><thead><tr><th>Fibra no início</th><th>O que muda no caminho</th><th>Chega em</th></tr></thead><tbody>${ras.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="small">Todas as fibras seguem na mesma posição do início ao fim, sem interrupção.</p>'}`;
    $('#lnSvg', box).onclick = e => { const cxb = e.target.closest('[data-lncx]'); if (cxb) { const it = cx[+cxb.dataset.lncx]; if (it) abrirPlano(it.ev, { onSalvo: nv => { it.ev = nv; ver(); } }); return; } const t = e.target.closest('[data-dgo],[data-lnfib]'); if (!t) return; const n = +(t.dataset.dgo || t.dataset.lnfib); if (!Lr.book) { toast('Escolha uma rota para ter o book de dados das fibras.'); return; } abrirFibra(n, { bk: Lr.book, L: R.L, rt: rtSel(), lado: t.dataset.lado || 'A', fotos: fotosDgo(Lr, t.dataset.lado || 'A', rtSel()), salvar: async () => { await bkSalva(); $('#lnBook', box).innerHTML = bookCardHtml(); ligaBook(); ver(); } }); }; };
  const ligaBook = () => {
    $$('[data-bkd]', box).forEach(i => i.onchange = async () => { const [lado, k] = i.dataset.bkd.split('.'); const alvo = lado === 'B' ? 'dgoB' : 'dgo'; Lr.book[alvo] = Lr.book[alvo] || {}; Lr.book[alvo][k] = i.value.trim(); try { await bkSalva(); if ($('#lnSvg', box)) ver(); } catch (e) { toast('Não foi possível salvar: ' + (e.message || e), 6000); } });
    $$('[data-bkfoto]', box).forEach(b => b.onclick = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.onchange = async () => { const lado = b.dataset.bkfoto, alvo = lado === 'B' ? 'dgoB' : 'dgo'; Lr.book[alvo] = Lr.book[alvo] || {}; const L0 = Lr.book[alvo].fotos = Lr.book[alvo].fotos || []; let n = 0;
      toast('Enviando fotos do DGO…', 4000); try { for (const f of inp.files) { const id = uid(); const path = await Nuvem.subir(`${Nuvem.org()}/dgo/${Lr.rota}/${lado}/${id}.jpg`, f); L0.push({ id, path, cat: 'DGO / bastidor', ts: Date.now(), por: (Nuvem.admin && Nuvem.admin.nome) || '' }); n++; } await bkSalva(); toast(`${n} foto(s) do DGO salvas.`); $('#lnBook', box).innerHTML = bookCardHtml(); ligaBook(); } catch (e) { toast('Não foi possível enviar: ' + (e.message || e), 6000); } }; inp.click(); });
    $('#bBkImp', box) && ($('#bBkImp', box).onclick = () => $('#fileBook', box).click());
    $('#fileBook', box) && ($('#fileBook', box).onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const r = await bookImportar(f, Lr.book); await bkSalva(); toast(`Book importado: ${r.n} fibra(s), ${r.med} medição(ões) nova(s).`, 5000); pinta(); if (sel().length) ver(); } catch (er) { toast('Não foi possível importar: ' + (er.message || er), 7000); } });
    const L0 = () => sel().length ? linearDados(sel()) : null;
    $('#bBkExp', box) && ($('#bBkExp', box).onclick = async () => { try { baixar(await bookXlsx(Lr.book, tit(), L0(), false, rtSel())); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } });
    $('#bBkMod', box) && ($('#bBkMod', box).onclick = async () => { try { baixar(await bookXlsx(Lr.book, tit(), L0(), true, rtSel())); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } });
  };
  const liga = () => {
    ligaBook();
    $$('[data-lnon]', box).forEach(c => c.onchange = () => { Lr.itens[+c.dataset.lnon].on = c.checked; pinta(); });
    $$('[data-lnpai]', box).forEach(c => c.onchange = () => { Lr.itens[+c.dataset.lnpai].pai = c.value; if ($('#lnSvg', box)) ver(); });
    $$('[data-lnup]', box).forEach(b => b.onclick = () => { const k = +b.dataset.lnup; [Lr.itens[k - 1], Lr.itens[k]] = [Lr.itens[k], Lr.itens[k - 1]]; Lr.porKm = false; pinta(); });
    $$('[data-lndn]', box).forEach(b => b.onclick = () => { const k = +b.dataset.lndn; [Lr.itens[k + 1], Lr.itens[k]] = [Lr.itens[k], Lr.itens[k + 1]]; Lr.porKm = false; pinta(); });
    $('#bLnVer', box) && ($('#bLnVer', box).onclick = ver);
    $('#bLnPdf', box) && ($('#bLnPdf', box).onclick = async () => { toast('Gerando PDF…', 6000); try { const f = await linearPdf(sel(), tit(), Lr.book, rtSel()); if (f) baixar(f); } catch (e) { toast('Erro ao gerar: ' + (e.message || e), 6000); } });
    $('#bLnPng', box) && ($('#bLnPng', box).onclick = async () => { try { const R = comLogo(linearSvg(sel(), tit(), { book: Lr.book, rota: rtSel() }).svg, await logoUri(), subLinear(tit(), rtSel())); const c = await svgCanvas(R.svg, Math.max(.6, Math.min(2, Math.sqrt(16e6 / (R.W * R.H))))); const bl = await new Promise(r => c.toBlob(r, 'image/png')); baixar(new File([bl], nomeArq('Diagrama_linear_' + tit()).replace(/\.pdf$/, '') + '.png', { type: 'image/png' })); } catch (e) { toast('Não foi possível gerar a imagem.'); } });
    $('#bLnSvg', box) && ($('#bLnSvg', box).onclick = async () => { const R = comLogo(linearSvg(sel(), tit(), { book: Lr.book, rota: rtSel() }).svg, await logoUri(), subLinear(tit(), rtSel())); baixar(new File([R.svg], nomeArq('Diagrama_linear_' + tit()).replace(/\.pdf$/, '') + '.svg', { type: 'image/svg+xml' })); });
  };
  $('#bLnBusca', box).onclick = async () => {
    Lr.rota = $('#lnRota', box).value; Lr.tags = $('#lnTags', box).value; const tags = Lr.tags.split(/\r?\n/).map(x => x.trim().toUpperCase()).filter(Boolean);
    if (!Lr.rota && !tags.length) { toast('Escolha a rota ou informe as TAGs.'); return; }
    $('#lnLista', box).innerHTML = '<p class="empty">Buscando as caixas…</p>';
    try { let evs = []; if (Lr.rota) evs = await Nuvem.evsPorRota(Lr.rota); for (const t of tags) evs = evs.concat(await Nuvem.evsPorTag(t, true));
      Lr.book = Lr.rota ? (await Nuvem.bookGet(Lr.rota).catch(() => null)) || { dgo: {}, fibras: {} } : null; if (Lr.book) { Lr.book.dgo = Lr.book.dgo || {}; Lr.book.fibras = Lr.book.fibras || {}; }
      const m = caixasDoMapa(evs); const rt = Lr.rota ? rotaById(Lr.rota) : null; const antes = new Map((Lr.itens || []).map(x => [x.tag, x.pai || '']));
      let itens = [...m].map(([tag, ev]) => { const p = kmNaRota(rt, ev.loc); return { tag, ev, km: p && p.d < 2000 ? p.km : null, on: true, pai: antes.get(tag) || '' }; });
      const ord = t => { const k = tags.indexOf(t); return k < 0 ? 1e9 : k; };
      Lr.porKm = !tags.length && itens.some(x => x.km != null);
      itens.sort((a, b) => tags.length ? ord(a.tag) - ord(b.tag) || a.tag.localeCompare(b.tag, 'pt', { numeric: true }) : (a.km ?? 1e9) - (b.km ?? 1e9) || a.tag.localeCompare(b.tag, 'pt', { numeric: true }));
      Lr.evsRota = evs; Lr.itens = encaixaNovas(itens); pinta(); } catch (e) { $('#lnLista', box).innerHTML = `<div class="warnbox">Erro na busca: ${esc(e.message || e)}</div>`; }
  };
  liga();
}

/* ---------- caixa de emenda nova instalada na corretiva (rompimento entre caixas) ---------- */
function caixaNovaCard(i) {
  if (!isCorr(i) || ADMIN) return ''; const novas = [...S.inspCache.values()].filter(x => cxNova(x) && x.vist.origemId === i.id);
  return `<section class="card"><h2>Caixa de emenda nova</h2><p class="muted small" style="margin:0">Se o rompimento foi entre duas caixas e você instalou uma (ou mais) caixa de emenda nova, registre cada uma aqui. Ela ganha TAG, cabos e o diagrama de fusões, e entra no mapa da rota entre as caixas que você informar.</p>
    ${novas.length ? `<div class="list">${novas.map(x => `<button type="button" class="item" data-open="${x.id}"><span class="tx"><b>${esc(x.info.tag || 'Caixa nova')}</b><span>${x.vist.entreA || x.vist.entreB ? `entre ${esc(x.vist.entreA || '?')} e ${esc(x.vist.entreB || '?')} · ` : ''}${x.status === 'concluida' ? 'concluída' : 'em aberto'}</span></span></button>`).join('')}</div>` : ''}
    <button type="button" class="btn" id="bCxNova">${ICON.plus}Registrar caixa de emenda nova</button></section>`;
}
async function novaCaixaCorr(i) {
  saveInsp(true); toast('Abrindo a caixa nova…', 2000); const loc = await posAtual(15000) || i.loc || null;
  const n = novaInspecao(loc); n.tipo = 'vistoria'; n.vist = { tipo: 'caixa', nova: true, origemId: i.id, ticket: (i.corr && i.corr.ticket) || '', entreA: '', entreB: '', descricao: '', equipe: '', responsavel: '', atividade: 'Corretiva', conformidade: '' };
  ['rotaId', 'rota', 'dono', 'parceiro', 'endereco', 'cidade', 'bairro', 'tecnico', 'apoio'].forEach(k => { if (i.info[k]) n.info[k] = i.info[k]; });
  const rt = n.info.rotaId ? rotaById(n.info.rotaId) : null; if (rt) { ['entrada', 's1', 's2'].forEach(k => { if (rt.cap) n.cabos[k].fibras = String(rt.cap); if (rt.marca) n.cabos[k].marca = rt.marca; }); if (CAPS.includes(+rt.cap)) { n.fo.total = +rt.cap; ensureRows(n); } }
  ['entrada', 's1'].forEach(k => { if (i.cabos && i.cabos[k] && i.cabos[k].padrao) n.cabos[k].padrao = i.cabos[k].padrao; }); await geraTag(n);
  n.fo.modo = 'cor'; n.fo.exc = []; syncFo(n); if (i.centro) n.centro = i.centro; if (i.projeto) n.projeto = i.projeto;
  if (S.ronda && !S.ronda.fim) { S.ronda.eventos.push({ tipo: 'chegada', ts: n.chegada, inspId: n.id, lat: loc && loc.lat, lon: loc && loc.lon, acc: loc && loc.acc }); saveRonda(true); }
  S.insp = n; S.step = 0; S.inspCache.set(n.id, n); await DB.put('inspecoes', n); go('insp');
}
/* ---------- tamanho dos cabos da caixa (o mesmo trecho pode ter cabo de 12, 24… até 288 FO) ---------- */
const nTubosCx = i => Math.max(Math.ceil(i.fo.total / 12), Math.ceil(capSaida(i, 'S1') / 12), i.cabos.temS2 ? Math.ceil(capSaida(i, 'S2') / 12) : 0);
function cabosCtrlHtml(i, pode) {
  const sel = (k, v, lb, zero) => `<div class="field" style="min-width:110px;flex:1"><label class="lb" for="fmcap_${k}">${lb}</label><select id="fmcap_${k}" data-fmcap="${k}" ${pode ? '' : 'disabled'}>${zero ? `<option value="0" ${!v ? 'selected' : ''}>Sem saída 2</option>` : ''}${CAPS.map(c => `<option value="${c}" ${+v === c ? 'selected' : ''}>${c} FO</option>`).join('')}</select></div>`;
  return `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end">${sel('E', i.fo.total, 'Cabo de entrada')}${sel('S1', capSaida(i, 'S1'), 'Saída 1')}${sel('S2', i.cabos.temS2 ? capSaida(i, 'S2') : 0, 'Saída 2', 1)}</div>`;
}
// troca o tamanho de um cabo; fusões que ficariam fora do cabo novo são desfeitas (e avisadas)
function aplicaCap(i, k, v) {
  ensureRows(i); if ((i.fo.modo || 'cor') !== 'det') { syncFo(i); i.fo.modo = 'det'; }
  if (k === 'E') { i.fo.total = v; i.cabos.entrada.fibras = String(v); ensureRows(i); }
  else if (k === 'S1') i.cabos.s1.fibras = String(v);
  else if (!v) i.cabos.temS2 = false; else { i.cabos.temS2 = true; i.cabos.s2.fibras = String(v); }
  return i.fo.rows.slice(0, i.fo.total).filter(r => paraAqui(i, r)).length;
}
// filtro de tubos (cabos grandes): null = todos
function tubosCtrlHtml(i, tubos) {
  const n = nTubosCx(i); if (n <= 2) return ''; const D = mapaFusaoDados(i); const com = new Set(D.links.flatMap(l => [tf(l.a).t, tf(l.b).t]));
  return `<div class="chips" role="group" aria-label="Tubos visíveis" style="flex-wrap:wrap"><button type="button" data-fmtubo="todos" aria-pressed="${!tubos}">Todos os tubos</button>${Array.from({ length: n }, (_, k) => k + 1).map(t => `<button type="button" data-fmtubo="${t}" aria-pressed="${!!(tubos && tubos.has(t))}" title="${esc(tNome(t, padE(i)))}">${com.has(t) ? '● ' : ''}T${t}</button>`).join('')}</div>`;
}
function tubosToggle(tubos, v) { if (v === 'todos') return null; const t = +v; const s = new Set(tubos || []); if (s.has(t)) s.delete(t); else s.add(t); return s.size ? s : null; }
function tubosPadrao(i) { if (i.fo.total <= 48) return null; const D = mapaFusaoDados(i); const s = new Set(D.links.map(l => tf(l.a).t)); if (!s.size) s.add(1); return s; }
// liga entrada a → saída (cabo, b) num plano qualquer; devolve aviso quando tira a ligação anterior daquela saída
function ligaPlano(i, a, cabo, b, band) {
  ensureRows(i); const D = mapaFusaoDados(i); const old = D.deS.get(cabo + '-' + b); if (old && old !== a) { const ro = i.fo.rows[old - 1]; ro.f = false; ro.fib = ''; ro.band = ''; ro.mot = ''; }
  const r = i.fo.rows[a - 1]; r.f = true; r.cabo = cabo; r.fib = String(b); if (band) r.band = band; if (b === a) r.mot = '';
  return old && old !== a ? `A ${cabo} ${b} estava ligada na entrada ${old}; ficou com a entrada ${a}.` : '';
}

/* ---------- plano de fusão interativo da caixa (fora da visita): fotos de campo + plano que dá para ajustar ---------- */
const FOTO_PRIO = /bandeja|acomoda|fus|caixa aberta|mapa de fus/i;
async function abrirPlano(ev, opt = {}) {
  if (!ev || !ev.fo || !ev.cabos) { toast('Esta visita não tem plano de fusão.'); return; }
  const pode = ADMIN && !opt.soVer && Nuvem.on; const tag = String((ev.info && ev.info.tag) || '').trim().toUpperCase();
  const w = { id: ev.id, tipo: ev.tipo, vist: ev.vist, corr: ev.corr, impl: ev.impl, chegada: ev.chegada, info: { ...(ev.info || {}) }, cabos: JSON.parse(JSON.stringify(ev.cabos)), fo: JSON.parse(JSON.stringify(ev.fo)) };
  ['entrada', 's1', 's2'].forEach(k => { w.cabos[k] = w.cabos[k] || { fibras: '' }; }); if (!w.fo.rows) w.fo.rows = []; ensureRows(w); if ((w.fo.modo || 'cor') !== 'det') syncFo(w);
  const st = { sel: null, undo: [], tubos: tubosPadrao(w), so: false, band: '', vis: ev.id, mudou: false };
  let hist = [ev]; try { if (tag && Nuvem.on) { const h = await Nuvem.evsPorTag(tag, true); if (h.length) hist = h; if (!hist.some(x => x.id === ev.id)) hist.push(ev); } } catch (e) {}
  hist.sort((a, b) => (b.chegada || 0) - (a.chegada || 0)); if (!(ev.fotos || []).some(f => f.path)) { const cf = hist.find(x => (x.fotos || []).some(f => f.path && !f.arquivado)); if (cf) st.vis = cf.id; }
  const el = document.createElement('div'); el.className = 'modal'; el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:940;display:flex;align-items:stretch;justify-content:center;padding:8px';
  document.body.appendChild(el);
  const fecha = () => { if (st.mudou && !confirm('Fechar sem salvar as mudanças no plano?')) return; el.remove(); };
  const fotosHtml = () => { const v = hist.find(x => x.id === st.vis) || ev; const fs = (v.fotos || []).filter(f => f.path && !f.arquivado).slice().sort((a, b) => (FOTO_PRIO.test(b.cat || '') ? 1 : 0) - (FOTO_PRIO.test(a.cat || '') ? 1 : 0));
    return `<div class="chips" role="group" aria-label="Visita" style="flex-wrap:wrap">${hist.filter(x => (x.fotos || []).some(f => f.path)).slice(0, 8).map(x => `<button type="button" data-plvis="${esc(x.id)}" aria-pressed="${x.id === st.vis}">${fData(x.chegada).slice(0, 10)} · ${esc(TIPO_INSP(x))} (${(x.fotos || []).filter(f => f.path).length})</button>`).join('') || '<span class="muted small">Nenhuma foto nas visitas desta caixa.</span>'}</div>
      <div class="anx" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px">${fs.map(f => `<figure style="margin:0;display:flex;flex-direction:column;gap:2px"><span class="anxi" style="width:100%;aspect-ratio:4/3;height:auto"><img data-anxsrc="${esc(f.path)}" alt="${esc(f.cat || 'foto')}" style="cursor:zoom-in"></span><figcaption class="small" style="${FOTO_PRIO.test(f.cat || '') ? 'font-weight:700' : ''}">${esc(f.cat || '')}${f.desc ? ' · ' + esc(f.desc) : ''}</figcaption></figure>`).join('')}</div>
      ${fs.length ? '<span class="muted small">Toque na foto para ampliar. As fotos de bandeja, acomodação e caixa aberta vêm primeiro.</span>' : '<p class="muted small" style="margin:0">Esta visita não tem fotos salvas na nuvem.</p>'}`; };
  const pinta = () => {
    const box = $('#plSvg', el), sl = box ? box.scrollLeft : 0, stp = box ? box.scrollTop : 0, sc = el.firstElementChild ? el.firstElementChild.scrollTop : 0;
    const estreito = innerWidth < 900;
    el.innerHTML = `<div style="background:var(--surface);border-radius:10px;width:100%;max-width:1280px;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:10px" role="dialog" aria-modal="true" aria-label="Plano de fusão ${esc(tag)}">
      <div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><span><b style="font-size:1.05em">Plano de fusão · ${esc(tag || 'caixa')}</b>${w.info.trecho ? ` <span class="pill">${esc(w.info.trecho)}</span>` : ''}<br><span class="muted small">Base: visita de ${fData(ev.chegada)} · ${esc(TIPO_INSP(ev))} · ${esc(ev.info.tecnico || ev._tecnico || '')}${w.info.endereco ? ' · ' + esc(w.info.endereco) : ''}</span></span><button type="button" class="btn" data-plx style="min-height:40px;flex:0 0 auto;width:auto">Fechar</button></div>
      <div style="display:grid;grid-template-columns:${estreito ? '1fr' : 'minmax(280px,38%) 1fr'};gap:12px;align-items:start">
        <section style="display:flex;flex-direction:column;gap:8px;${estreito ? '' : 'position:sticky;top:0'}"><h3 style="margin:0">Fotos de campo</h3>${fotosHtml()}</section>
        <section style="display:flex;flex-direction:column;gap:8px;min-width:0"><h3 style="margin:0">Plano</h3>
          ${cabosCtrlHtml(w, pode)}
          ${pode ? `<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"><button type="button" class="btn" id="plCor" style="min-height:40px">Cor com cor</button><button type="button" class="btn" id="plUndo" style="min-height:40px" ${st.undo.length ? '' : 'disabled'}>Desfazer</button><button type="button" class="btn" id="plLimpa" style="min-height:40px">Limpar</button><label class="lb" for="plBand" style="margin:0 0 0 6px">Bandeja</label><input id="plBand" value="${esc(st.band)}" placeholder="—" inputmode="numeric" style="width:64px"></div>` : ''}
          ${tubosCtrlHtml(w, st.tubos)}
          <p class="small" style="margin:0" aria-live="polite">${pode ? fmDica(w, st.sel) : 'Somente leitura. O supervisor ajusta o plano pelo painel; em campo, use "Copiar da última visita" na etapa Fusões.'}</p>
          <div id="plSvg" style="overflow:auto;border:1px solid var(--line);border-radius:8px;background:#fff;padding:6px;max-height:${estreito ? '70vh' : '72vh'}">${fusaoSvg(w, { edit: pode ? 1 : 0, rola: 1, compacto: innerWidth < 640, sel: st.sel || undefined, tubos: st.tubos || undefined, soComFusao: st.so })}</div>
          <div id="plPainel">${pode ? fmPainel(w, st.sel) : ''}</div>
          <div class="row" style="gap:6px;flex-wrap:wrap">${pode ? `<input id="plObs" placeholder="O que mudou (ex.: conferido pelas fotos da bandeja 2)" style="flex:1 1 240px"><button type="button" class="btn pri" id="plSalva" ${st.mudou ? '' : 'disabled'}>Salvar revisão do plano</button>` : ''}<button type="button" class="btn" id="plPng">Baixar imagem</button></div>
          ${pode ? '<span class="muted small">A revisão vira a versão mais nova do plano desta caixa (vale para o mapa da rota e o diagrama linear). A visita original continua no histórico.</span>' : ''}</section></div></div>`;
    pintaAnexos(el); const nb = $('#plSvg', el); if (nb) { nb.scrollLeft = sl; nb.scrollTop = stp; } if (el.firstElementChild) el.firstElementChild.scrollTop = sc; liga(); };
  const edita = (fn, msg) => { st.undo = st.undo.slice(-29); st.undo.push(JSON.stringify({ cabos: w.cabos, fo: w.fo })); fn(); st.mudou = true; if (msg) toast(msg, 3500); };
  const liga = () => {
    $('[data-plx]', el).onclick = fecha; el.onclick = e => { if (e.target === el) fecha(); };
    $$('[data-plvis]', el).forEach(b => b.onclick = () => { st.vis = b.dataset.plvis; pinta(); });
    $$('[data-fmtubo]', el).forEach(b => b.onclick = () => { st.tubos = tubosToggle(st.tubos, b.dataset.fmtubo); pinta(); });
    $('#plPng', el).onclick = async () => { try { const c = await svgCanvas(comLogo(fusaoSvg(w, { tubos: st.tubos || undefined }), await logoUri(), ['Plano de fusão', tag, w.info.trecho && 'Trecho ' + w.info.trecho, 'Gerado em ' + fData(Date.now())].filter(Boolean).join(' · ')).svg, 2); const bl = await new Promise(r => c.toBlob(r, 'image/png')); baixar(new File([bl], nomeArq('Plano_fusao_' + (tag || ev.id)).replace(/\.pdf$/, '') + '.png', { type: 'image/png' })); } catch (e) { toast('Não foi possível gerar a imagem.'); } };
    if (!pode) return;
    $$('[data-fmcap]', el).forEach(s => s.onchange = () => { let n = 0; edita(() => { n = aplicaCap(w, s.dataset.fmcap, +s.value); }); if (n) toast(`${n} fibra(s) param nesta caixa: o cabo de saída não tem essas fibras. As fusões ficam guardadas.`, 4500); st.tubos = st.tubos && tubosPadrao(w); pinta(); });
    $('#plBand', el).onchange = e => { st.band = e.target.value.trim(); };
    $('#plCor', el).onclick = () => { const cap = capSaida(w, 'S1'); edita(() => { for (let k = 0; k < w.fo.total; k++) { const r = w.fo.rows[k]; if (k < cap) { r.f = true; r.cabo = 'S1'; r.fib = String(k + 1); r.mot = ''; if (st.band) r.band = st.band; } else { r.f = false; r.fib = ''; } } }, 'Todas cor com cor na Saída 1. Toque para mudar só uma.'); st.sel = null; pinta(); };
    $('#plLimpa', el).onclick = () => { if (!confirm('Apagar todas as fusões deste plano?')) return; edita(() => w.fo.rows.forEach(r => { r.f = false; r.fib = ''; r.band = ''; r.mot = ''; })); st.sel = null; pinta(); };
    $('#plUndo', el).onclick = () => { const u = st.undo.pop(); if (!u) return; const o = JSON.parse(u); w.cabos = o.cabos; w.fo = o.fo; st.mudou = true; pinta(); };
    $('#plSvg', el).onclick = e => { const he = e.target.closest('[data-fe]'), hs = e.target.closest('[data-fs]'); const s = st.sel;
      if (he) { const a = +he.dataset.fe; if (s && s.s) { const [c, b] = s.s.split('-'); let m = ''; edita(() => { m = ligaPlano(w, a, c, +b, st.band); }); if (m) toast(m, 3500); st.sel = { e: a }; } else st.sel = s && s.e === a ? null : { e: a }; pinta(); return; }
      if (hs) { const key = hs.dataset.fs, [c, b] = key.split('-'); if (s && s.e) { const a = s.e; let m = ''; edita(() => { m = ligaPlano(w, a, c, +b, st.band); }); if (m) toast(m, 3500); const D = mapaFusaoDados(w); let prox = null; for (let n = a + 1; n <= w.fo.total; n++) if (!D.links.some(l => l.a === n)) { prox = n; break; } st.sel = prox ? { e: prox } : null; } else st.sel = s && s.s === key ? null : { s: key }; pinta(); } };
    const a = st.sel && (st.sel.e || mapaFusaoDados(w).deS.get(st.sel.s));
    $('#fmpBand', el) && ($('#fmpBand', el).onchange = e => { edita(() => { w.fo.rows[a - 1].band = e.target.value.trim(); }); pinta(); });
    $('#fmpMot', el) && ($('#fmpMot', el).onchange = e => { edita(() => { w.fo.rows[a - 1].mot = e.target.value.trim(); }); });
    $('#fmpDel', el) && ($('#fmpDel', el).onclick = () => { edita(() => { const r = w.fo.rows[a - 1]; r.f = false; r.fib = ''; r.band = ''; r.mot = ''; }); st.sel = { e: a }; pinta(); });
    $('#plSalva', el) && ($('#plSalva', el).onclick = async () => { const obs = ($('#plObs', el).value || '').trim(); const b = $('#plSalva', el); b.disabled = true;
      try { const nv = await salvaRevisaoPlano(ev, w, obs); st.mudou = false; toast('Revisão do plano salva. Ela é agora a versão mais nova desta caixa.', 5000); el.remove(); opt.onSalvo && opt.onSalvo(nv); } catch (e) { b.disabled = false; toast('Não foi possível salvar: ' + (e.message || e), 6000); } });
  };
  pinta();
}
// revisão do plano = nova visita (vistoria de mapeamento) com o plano ajustado; a visita original fica intacta no histórico
async function salvaRevisaoPlano(ev, w, obs) {
  const now = Date.now(), id = uid();
  const d = { id, tipo: 'vistoria', status: 'concluida', criado: now, atualizado: now, chegada: now, saida: now, loc: ev.loc || null,
    info: { ...(ev.info || {}), tecnico: (ADMIN && Nuvem.admin && Nuvem.admin.nome) || (S.perfil && S.perfil.nome) || 'Supervisor', data: new Date().toISOString().slice(0, 10) },
    vist: { tipo: 'caixa', revisao: true, base: ev.id, baseEm: ev.chegada || null, descricao: obs || 'Plano de fusão revisado pelas fotos de campo.' },
    cabos: w.cabos, fo: w.fo, fotos: [], check: {}, checkObs: {}, obs: obs || '', assinatura: null };
  await Nuvem.revisaoPlano(d); if (DB.mem && DB.mem.inspecoes) DB.mem.inspecoes.set(id, d); return d;
}

/* ---------- rota: caixas já mapeadas (de toda a equipe), KMZ raiz e atualização pelo percurso da ronda ---------- */
async function caixasRotaNuvem(rt) { try { return Nuvem.on ? await Nuvem.evsPorRota(rt.id) : []; } catch (e) { return []; } }
function rotaCxHtml(caixas) {
  if (!caixas.length) return '<p class="muted" style="margin:0">Nenhuma caixa registrada nesta rota ainda.</p>';
  return caixas.map((i, k) => `<div class="item" style="cursor:default;gap:8px;flex-wrap:wrap"><span class="badge">${k + 1}</span><span class="tx" style="flex:1 1 200px"><b>${esc(i.info.tag || 'sem TAG')}${i.info.trecho ? ' · ' + esc(i.info.trecho) : ''}</b><span>${fData(i.chegada)} · ${esc(TIPO_INSP(i))} · ${esc(i.info.tecnico || i._tecnico || '')}${i.fo ? ' · ' + esc(resumoFo(i)) : ''}</span></span><span class="row" style="gap:6px">${temMapaFusao(i) ? `<button type="button" class="btn" data-rtplano="${esc(i.id)}" style="min-height:40px">Plano de fusão</button>` : ''}${S.inspCache.has(i.id) && !ADMIN ? `<button type="button" class="btn" data-open="${esc(i.id)}" style="min-height:40px">Abrir</button>` : ''}</span></div>`).join('');
}
async function enviaPercursoRota(r) {
  const rt = r && r.rotaId ? rotaById(r.rotaId) : null; if (!rt) return;
  await cacheInspRonda(r); const segs = segmentos(r).filter(s => s.tipo === 'cabo' && s.pts.length > 1);
  const cx = [...S.inspCache.values()].filter(i => i.rondaId === r.id && i.loc && i.loc.lat != null && i.info && i.info.tag);
  if (!segs.length && !cx.length) return;
  const km = segs.reduce((a, s) => a + s.km, 0);
  if (!confirm(`Enviar o percurso do cabo de hoje (${fKm(km)}) e ${cx.length} caixa(s) para o supervisor atualizar o KMZ da rota ${rt.codigo}?`)) return;
  const me = Nuvem.user && Nuvem.user.id;
  const x = { id: 'sob_' + rt.id + '_' + String(me || uid()).slice(0, 12) + '_' + Date.now().toString(36), sobreposicao: true, origem: 'ronda', rondaId: r.id, base: rt.id, codigo: rt.codigo, nome: 'Atualização de ' + rt.codigo,
    kml: { linhas: segs.map(s => s.pts.map(p => [p.lat, p.lon])), pontos: cx.map(i => ({ lat: i.loc.lat, lon: i.loc.lon, nome: i.info.tag, desc: `${TIPO_INSP(i)} ${fData(i.chegada)}${i.info.trecho ? ' · ' + i.info.trecho : ''}` })), km, arquivo: `Ronda de ${fData(r.inicio)} (GPS)`, em: Date.now() },
    obs: `Percurso e caixas da ronda de ${fData(r.inicio)}`, autorNome: S.perfil.nome || '', _autor: me || '', em: Date.now(), atualizado: Date.now() };
  await DB.put('rotas', x); await carregaRotas(); toast('Atualização enviada. O supervisor junta ao KMZ raiz da rota.', 5000);
}
// junta linhas e pontos de uma atualização ao KMZ raiz (pontos com o mesmo nome/TAG são trocados pela posição nova)
function juntaKml(base, novo, rotulo) {
  if (!base) return { ...novo, arquivo: rotulo || novo.arquivo, em: Date.now() };
  const pts = new Map((base.pontos || []).map(p => [String(p.nome || '').toUpperCase() || Math.random(), p])); (novo.pontos || []).forEach(p => pts.set(String(p.nome || '').toUpperCase() || Math.random(), p));
  return { ...base, linhas: (base.linhas || []).concat(novo.linhas || []), pontos: [...pts.values()], km: (base.km || 0) + (novo.km || 0), arquivo: (base.arquivo || 'rota') + ' + ' + (rotulo || 'atualização ' + fData(Date.now())), em: Date.now() };
}

// tela do menu "Mapa de fusão": abrir o plano interativo de uma caixa pela TAG e montar o diagrama linear da rota
function viewAdmFusao() {
  return `<section class="card"><h2>Plano de fusão de uma caixa</h2><p class="muted small" style="margin:0">Abre o plano mais novo da caixa com as fotos de campo (bandeja, acomodação, DGO). Dá para ajustar o plano pelas fotos e salvar uma revisão.</p>
    <div class="row" style="gap:8px;flex-wrap:nowrap"><input type="search" id="fzTag" placeholder="TAG da caixa (ex.: CE-PDA-CPJ-0007)" autocapitalize="characters" style="flex:1;min-width:0" value="${esc(S.fzTag || '')}"><button type="button" class="btn pri" id="bFzAbre">Abrir plano</button></div><div id="fzRes"></div></section><div id="lnBox"></div>`;
}
function afterAdmFusao() {
  const abre = async () => { const tag = ($('#fzTag').value || '').trim().toUpperCase(); S.fzTag = tag; if (tag.length < 3) { toast('Digite a TAG da caixa.'); return; } $('#fzRes').innerHTML = '<p class="muted small" style="margin:0">Buscando…</p>';
    let evs = []; try { evs = await Nuvem.evsPorTag(tag, false); } catch (e) { $('#fzRes').innerHTML = `<div class="warnbox">Erro: ${esc(e.message || e)}</div>`; return; }
    const m = caixasDoMapa(evs); if (!m.size) { $('#fzRes').innerHTML = '<p class="empty">Nenhuma caixa com plano de fusão para essa TAG.</p>'; return; }
    if (m.size === 1) { $('#fzRes').innerHTML = ''; abrirPlano([...m.values()][0], { onSalvo: abre }); return; }
    $('#fzRes').innerHTML = `<div class="list">${[...m].map(([t, e]) => `<button type="button" class="item" data-fzev="${esc(e.id)}"><span class="tx"><b>${esc(t)}</b><span>${fData(e.chegada)} · ${esc(TIPO_INSP(e))} · ${esc(e.info.tecnico || '')}</span></span></button>`).join('')}</div>`;
    $$('[data-fzev]').forEach(b => b.onclick = () => { const e = [...m.values()].find(x => x.id === b.dataset.fzev); if (e) abrirPlano(e, { onSalvo: abre }); }); };
  $('#bFzAbre').onclick = abre; $('#fzTag').addEventListener('keydown', e => { if (e.key === 'Enter') abre(); });
  S.linAberto = true; $('#lnBox').innerHTML = linearHtml(); bindLinear($('#lnBox'));
}
