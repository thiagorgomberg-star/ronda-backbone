// Técnico Plus - Multivale · PDF, KMZ e compartilhar
// Os arquivos app-*.js carregam em ordem (ver index.html) e compartilham o mesmo escopo global.
'use strict';
/* ============================ PDF ============================ */
const ACC = [11, 95, 153];
async function logoData() {
  if (S.logoData) return S.logoData;
  try { const b = await (await fetch('logo-pdf.jpg')).blob(); S.logoData = await blobToData(b); } catch (e) { S.logoData = null; }
  return S.logoData;
}
function kmlCompacto(k) {
  const r5 = x => Math.round(x * 1e5) / 1e5; let passo = 1, js;
  do { const lin = k.linhas.map(l => l.filter((_, i) => i % passo === 0 || i === l.length - 1).map(p => [r5(p[0]), r5(p[1])]));
    js = JSON.stringify({ ...k, linhas: lin, pontos: (k.pontos || []).slice(0, 500) }); passo++; } while (js.length > 700000 && passo < 50);
  return js;
}
async function fotoBlob(p) { if (p.blob) return p.blob; if (p.arquivado) return null; if (!p.path || !Nuvem.on || !Nuvem.sb) return null; try { const r = await Nuvem.sb.storage.from(Nuvem.BUCKET).download(p.path); return r.error ? null : r.data; } catch (e) { return null; } }
const blobToData = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
function pdfHeader(doc, logo, titulo, sub, tag, rotulo) {
  if (logo) doc.addImage(logo, 'JPEG', 12, 9, 36, 21.6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...ACC); doc.text(sub.toUpperCase(), 52, 15);
  doc.setFontSize(14); doc.setTextColor(20); doc.text(titulo, 52, 22, { maxWidth: tag != null ? 94 : 146 });
  if (tag != null) { doc.setDrawColor(20); doc.setLineWidth(0.6); doc.rect(150, 11, 48, 15); doc.setFontSize(6.5); doc.setTextColor(90); doc.text(rotulo || 'TAG DA CAIXA', 152, 15); doc.setFontSize(12); doc.setTextColor(20); doc.text(String(tag || '—'), 152, 23); }
  doc.setDrawColor(20); doc.setLineWidth(0.7); doc.line(12, 33, 198, 33);
  return 39;
}
function pdfLog(doc, n) {
  n = +n || 0; if (!n) return; const t = logTxt(n);
  const cor = n >= 4 ? [194, 49, 29] : n > 1 ? [199, 90, 0] : [110, 110, 110];
  doc.setFillColor(...cor); doc.roundedRect(150, 27, 48, 5, 1, 1, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.text(t, 174, 30.4, { align: 'center' }); doc.setTextColor(20);
}
async function logDaInsp(i) { if (!i || !i.rondaId) return null; const r = await DB.get('rondas', i.rondaId); return r ? r.atvLog || null : null; }
function pdfSec(doc, y, n, titulo) {
  if (y > 262) { doc.addPage(); y = 16; }
  doc.setFillColor(...ACC); doc.rect(12, y - 4.2, 5.5, 5.5, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(String(n), 14.75, y - 0.3, { align: 'center' });
  doc.setTextColor(20); doc.setFontSize(10.5); doc.text(titulo.toUpperCase(), 20, y);
  doc.setDrawColor(170); doc.setLineWidth(0.2); doc.line(20 + doc.getTextWidth(titulo.toUpperCase()) + 3, y - 1.5, 198, y - 1.5);
  return y + 3;
}
const TB = { theme: 'grid', margin: { left: 12, right: 12 }, styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: [150, 160, 170], lineWidth: 0.2, textColor: 20 }, headStyles: { fillColor: [233, 238, 241], textColor: 20, fontStyle: 'bold', fontSize: 8 } };
function kv(doc, y, pares) {
  const body = []; for (let k = 0; k < pares.length; k += 2) body.push([pares[k][0], pares[k][1] || '—', pares[k + 1] ? pares[k + 1][0] : '', pares[k + 1] ? (pares[k + 1][1] || '—') : '']);
  doc.autoTable({ ...TB, startY: y, body, columnStyles: { 0: { fontStyle: 'bold', fillColor: [246, 248, 250], cellWidth: 32 }, 1: { cellWidth: 61 }, 2: { fontStyle: 'bold', fillColor: [246, 248, 250], cellWidth: 32 }, 3: { cellWidth: 61 } } });
  return doc.lastAutoTable.finalY + 7;
}
function pdfFooter(doc, txt) {
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) { doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(110); doc.text(txt, 12, 290); doc.text(`Página ${p} de ${n}`, 198, 290, { align: 'right' }); }
}
function nomeArq(base) { return base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_') + '.pdf'; }

async function mapaImg(lines, marks, w = 1400, h = 800) {
  const all = [...lines.flatMap(l => l.pts), ...marks].filter(p => p && p.lat != null);
  if (!all.length) return null;
  const lon2x = (lon, z) => (lon + 180) / 360 * 256 * 2 ** z;
  const lat2y = (lat, z) => { const s = Math.sin(lat * Math.PI / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * 2 ** z; };
  let mnLa = Infinity, mxLa = -Infinity, mnLo = Infinity, mxLo = -Infinity;
  all.forEach(p => { mnLa = Math.min(mnLa, p.lat); mxLa = Math.max(mxLa, p.lat); mnLo = Math.min(mnLo, p.lon); mxLo = Math.max(mxLo, p.lon); });
  const padd = 70; let z = 17;
  for (; z > 3; z--) { if (lon2x(mxLo, z) - lon2x(mnLo, z) <= w - 2 * padd && lat2y(mnLa, z) - lat2y(mxLa, z) <= h - 2 * padd) break; }
  const cx = (lon2x(mnLo, z) + lon2x(mxLo, z)) / 2, cy = (lat2y(mxLa, z) + lat2y(mnLa, z)) / 2, ox = cx - w / 2, oy = cy - h / 2;
  const draw = async withTiles => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.fillStyle = '#e9eef1'; x.fillRect(0, 0, w, h);
    if (withTiles) {
      const n = 2 ** z, jobs = [];
      for (let tx = Math.floor(ox / 256); tx <= Math.floor((ox + w) / 256); tx++) for (let ty = Math.floor(oy / 256); ty <= Math.floor((oy + h) / 256); ty++) {
        if (ty < 0 || ty >= n) continue; const wx = ((tx % n) + n) % n;
        jobs.push(new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; const t = setTimeout(() => res(false), 8000); im.onload = () => { clearTimeout(t); x.drawImage(im, tx * 256 - ox, ty * 256 - oy); res(true); }; im.onerror = () => { clearTimeout(t); res(false); }; im.src = `https://tile.openstreetmap.org/${z}/${wx}/${ty}.png`; }));
      }
      const ok = await Promise.all(jobs); if (!ok.some(Boolean)) return null;
      x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, w, h);
    } else { x.strokeStyle = '#d3dbe1'; x.lineWidth = 1; for (let g = 0; g < w; g += 80) { x.beginPath(); x.moveTo(g, 0); x.lineTo(g, h); x.stroke(); } for (let g = 0; g < h; g += 80) { x.beginPath(); x.moveTo(0, g); x.lineTo(w, g); x.stroke(); } }
    const P = p => [lon2x(p.lon, z) - ox, lat2y(p.lat, z) - oy];
    lines.forEach(l => { if (l.pts.length < 2) return; [[10, 'rgba(255,255,255,.85)'], [6, l.color]].forEach(([lw, col]) => { x.lineWidth = lw; x.strokeStyle = col; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); l.pts.forEach((p, k) => { const [a, b] = P(p); k ? x.lineTo(a, b) : x.moveTo(a, b); }); x.stroke(); }); });
    marks.forEach(m => { if (m.lat == null) return; const [a, b] = P(m); x.beginPath(); x.arc(a, b, 17, 0, Math.PI * 2); x.fillStyle = m.color || '#0b5f99'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#fff'; x.stroke(); x.fillStyle = '#fff'; x.font = 'bold 17px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(m.label, a, b + 1); });
    x.font = '14px Arial'; x.textAlign = 'right'; x.textBaseline = 'bottom'; const at = withTiles ? '© OpenStreetMap' : 'Mapa sem fundo (sem internet)'; const tw = x.measureText(at).width; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(w - tw - 12, h - 22, tw + 12, 22); x.fillStyle = '#333'; x.fillText(at, w - 6, h - 4);
    return c.toDataURL('image/jpeg', 0.85);
  };
  try { const d = await draw(true); if (d) return d; } catch (e) {}
  try { return await draw(false); } catch (e) { return null; }
}

async function gerarPdfInsp(i, silencioso) {
  if (!window.jspdf) { toast('Gerador de PDF não carregou. Abra o app com internet uma vez.'); return null; }
  if (!silencioso) toast('Gerando PDF…', 8000);
  try {
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const logo = await logoData();
    const corr = isCorr(i), impl = isImpl(i), vist = isVist(i), site = isSite(i); let sn = 0;
    let y = site ? pdfHeader(doc, logo, 'Conjunta de Site Backbone', 'Multivale x provedor parceiro · site ' + (i.site.sigla || ''), i.ticketAtv || i.site.sigla, i.ticketAtv ? 'TICKET' : 'SITE') : corr ? pdfHeader(doc, logo, 'Relatório de Corretiva Backbone', 'Manutenção corretiva · Rede óptica', i.corr.ticket, 'TICKET') : impl ? pdfHeader(doc, logo, 'Relatório de Implantação', (IMPL_SERV[i.impl.servico] || '') + ' · expansão e interligação de sites', i.impl.designacao, 'DESIGNAÇÃO') : vist ? pdfHeader(doc, logo, 'Registro de Vistoria de Rota', 'Fiscalização de campo · ' + (VIST_TIPOS[i.vist.tipo] || ''), null) : pdfHeader(doc, logo, 'Inspeção Preventiva Backbone', 'Relatório de inspeção · Rede óptica', i.info.tag);
    if (impl) { y = pdfSec(doc, y, ++sn, 'Designação e serviço'); const m = i.impl; y = kv(doc, y, [...(i.wfc || i.wf2 ? [['WFC', i.wfc || '—'], ['WF2', i.wf2 || '—']] : []), ['Designação', m.designacao], ['Serviço', IMPL_SERV[m.servico]], ['Projeto', m.projeto], ['Site A', m.siteA], ['Site B', m.siteB], ...(m.servico === 'ativacao' ? [['Equipamento', m.equipamento], ['Porta / slot', m.porta]] : []), ...(m.servico === 'dgo' ? [['Modelo do DGO', m.dgoModelo], ['Rack / posição', m.dgoPosicao], ['Portas ocupadas', m.dgoPortas]] : []), ['Técnico', i.info.tecnico], ['Data', fDH(i.chegada)], ...(usaImpl(i, 'caixa') ? [] : [['Endereço', [i.info.endereco, i.info.bairro, i.info.cidade].filter(Boolean).join(', ')]])]); }
    if (vist) { y = pdfSec(doc, y, ++sn, 'Registro'); const v = i.vist; y = kv(doc, y, [['Tipo', VIST_TIPOS[v.tipo]], ['Fiscal', i.info.tecnico], ['Data e hora', fDH(i.chegada)], ['Endereço', [i.info.endereco, i.info.cidade].filter(Boolean).join(', ')], ...(v.tipo === 'chaves' ? [['Local da retirada', v.chaveLocal], ['Chave / cadeado', v.chaveId], ['Quem entregou', v.chaveEntregou], ['Devolvida', v.chaveDevolvida ? 'Sim' : 'Não']] : []), ...(v.tipo === 'acomp' ? [['Equipe acompanhada', v.equipe], ['Responsável', v.responsavel], ['Ticket / OS', v.ticket], ['Atividade', v.atividade], ['Conformidade', v.conformidade]] : [])]);
      y = pdfSec(doc, y, ++sn, 'Registro escrito'); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(20); doc.splitTextToSize(v.descricao || '—', 186).forEach(line => { if (y > 280) { doc.addPage(); y = 16; } doc.text(line, 12, y + 1); y += 4.8; }); y += 4; }
    if (site) ({ y, sn } = await pdfSite(doc, y, sn, i));
    if (corr) pdfLog(doc, await logDaInsp(i));
    const tipo = { aerea: 'Aérea (poste)', sub: 'Subterrânea (CS enterrada)', outro: 'Outro' + (i.info.tipoOutro ? ': ' + i.info.tipoOutro : '') }[i.info.tipo] || '';
    const dataBR = i.info.data ? i.info.data.split('-').reverse().join('/') : '';
    if (corr) {
      y = pdfSec(doc, y, ++sn, 'Ocorrência');
      const r0 = i.rondaId ? ((S.ronda && S.ronda.id === i.rondaId) ? S.ronda : await DB.get('rondas', i.rondaId)) : null; const sd = r0 ? segmentos(r0).find(x => x.inspId === i.id) : null;
      y = kv(doc, y, [['Ticket', i.corr.ticket + (i.corr.ticketAuto ? ' (gerado pelo app)' : '')], ['Ocorrência', i.corr.ocorrencia], ['Backbone', donoLb(i.info.dono, i.info.parceiro) || '—'], ...(i.wfc || i.wf2 ? [['WFC', i.wfc || '—'], ['WF2', i.wf2 || '—']] : []), ['Rota', i.info.rota], ['Técnico', i.info.tecnico + (i.apoio ? ` (apoio a ${i.apoioDe || 'outro técnico'})` : '')], ['Matrícula', S.perfil.matricula], ...(i.info.apoio ? [['Equipe de apoio', i.info.apoio]] : []), ['Data', dataBR], ['Acionamento', i.corr.acionamento], ['Início do deslocamento', r0 ? fHora(r0.inicio) : ''], ['Chegada ao local', fHora(i.chegada)], ['Deslocamento', sd ? `${fKm(sd.km)} em ${fDur(sd.fim - sd.ini)}` : ''], ['Normalizado às', i.corr.normalizacao], ['Saída do local', i.saida ? fHora(i.saida) : '—'], ['Tempo no local', i.saida ? fDur(i.saida - i.chegada) : '—'], ['Fibras afetadas', i.corr.fibrasAfetadas], ['Caixa de emenda', [i.info.tag, i.corr.novaCaixa ? '(nova)' : ''].filter(Boolean).join(' ')], ['Endereço', [i.info.endereco, i.info.ref && 'ref.: ' + i.info.ref].filter(Boolean).join(' · ')], ['Bairro / cidade', [i.info.bairro, i.info.cidade, i.info.cep && 'CEP ' + i.info.cep].filter(Boolean).join(' - ')], ['Nº poste / CV', i.info.poste], ['Pendência', i.corr.pendente ? 'Sim' : 'Não'], ['Referência', refTxt(i)]]);
    } else if (!vist && !site && (!impl || usaImpl(i, 'caixa'))) {
    y = pdfSec(doc, y, ++sn, 'Identificação da caixa');
    y = kv(doc, y, [...(i.ticketAtv ? [['Ticket interno', i.ticketAtv]] : []), ...(tkParcTxt(i) ? [['Ticket(s) do parceiro', tkParcTxt(i)]] : []), ['Backbone', donoLb(i.info.dono, i.info.parceiro) || '—'], ['Referência', refTxt(i)], ['Matrícula', S.perfil.matricula], ['Data', dataBR], ['Mês referência', i.info.mes], ['Técnico(s)', i.info.tecnico], ['TAG da caixa', i.info.tag], ['Modelo', i.info.modelo], ['Fabricante', i.info.fabricante], ['Tipo de instalação', tipo], ['Nº poste / CV', i.info.poste], ['Endereço', [i.info.endereco, i.info.ref && 'ref.: ' + i.info.ref].filter(Boolean).join(' · ')], ['Bairro', i.info.bairro], ['Cidade', [i.info.cidade, i.info.cep && 'CEP ' + i.info.cep].filter(Boolean).join(' · ')], ['Rota', i.info.rota], ['Chegada', fHora(i.chegada)], ['Saída', i.saida ? fHora(i.saida) : '—']]);
    }
    y = pdfSec(doc, y, ++sn, 'Localização (GPS)');
    const l = i.loc;
    y = kv(doc, y, [['Coordenadas', l ? `${l.lat.toFixed(6)}, ${l.lon.toFixed(6)}` : 'Não capturada'], ['Precisão', l ? `±${l.acc} m às ${fHoraS(l.ts)}` : ''], ['Mapa', l ? 'maps.google.com/?q=' + l.lat + ',' + l.lon : '']]);
    if (l) { doc.link(12, y - 13, 186, 7, { url: `https://maps.google.com/?q=${l.lat},${l.lon}` }); }
    // mapa do trecho até a caixa
    let seg = null;
    if (i.rondaId) { const r = (S.ronda && S.ronda.id === i.rondaId) ? S.ronda : await DB.get('rondas', i.rondaId); if (r) { await cacheInspRonda(r); seg = segmentos(r).find(s => s.inspId === i.id); } }
    if (l) {
      const img = await mapaImg(seg ? [{ pts: seg.pts, color: SEGCOR[seg.tipo] }] : [], [{ lat: l.lat, lon: l.lon, label: corr ? 'P' : 'C', color: corr ? '#d9480f' : '#0b5f99' }], 1400, 600);
      if (img) { if (y > 205) { doc.addPage(); y = 16; } doc.addImage(img, 'JPEG', 12, y - 3, 186, 79.7); y += 79.7; doc.setFontSize(7.5); doc.setTextColor(90); doc.setFont('helvetica', 'normal');
        doc.text(seg ? `${SEGLB[seg.tipo]}: ${corr ? seg.de.replace('Início da ronda', 'Início do deslocamento') : seg.de} > ${corr ? 'ponto da corretiva' : seg.para} · ${fKm(seg.km)} · ${fHora(seg.ini)}–${fHora(seg.fim)}` : site ? 'Posição do site' : 'Posição da caixa', 12, y + 1); y += 8; }
    }
    if (corr) {
      y = pdfSec(doc, y, ++sn, 'Descrição do atendimento'); y += 3;
      const bloco = (tit, txt) => { if (y > 270) { doc.addPage(); y = 16; } doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(20); doc.text(tit, 12, y + 1); y += 4.5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.splitTextToSize(txt || '—', 186).forEach(line => { if (y > 280) { doc.addPage(); y = 16; } doc.text(line, 12, y + 1); y += 4.4; }); y += 3; };
      bloco('Problema encontrado', i.corr.problema); bloco('Causa provável', i.corr.causa); bloco('Serviço executado', i.corr.servico);
      bloco('Sobra técnica puxada', i.corr.sobra ? i.corr.sobra + ' m' : 'Não informada'); y += 3;
    }
    const vistCx = vist && i.vist && i.vist.tipo === 'caixa';
    const semCabos = site || (vist && !vistCx) || (impl && !usaImpl(i, 'cabos')) || claroCorr(i);
    if (!semCabos) { y = pdfSec(doc, y, ++sn, 'Cabos');
    const cab = [['Entrada', i.cabos.entrada], ['Saída 1', i.cabos.s1]]; if (i.cabos.temS2) cab.push(['Saída 2', i.cabos.s2]);
    doc.autoTable({ ...TB, startY: y, head: [['Cabo', 'Marca', 'Lote', 'Nº de fibras', 'Padrão de cores', 'Metragem (m)']], body: cab.map(([n, c]) => [n, c.marca || '—', c.lote || '—', c.fibras || '—', (c.padrao ? padNome(c.padrao) : 'Não informado'), c.metragem || '—']), columnStyles: { 0: { fontStyle: 'bold' } } });
    y = doc.lastAutoTable.finalY + 7; }
    if (impl) y = pdfImplCheck(doc, y, ++sn, i);
    if (!corr && !impl && !vist && !site) {
    y = pdfSec(doc, y, ++sn, 'Itens inspecionados');
    doc.autoTable({ ...TB, startY: y, head: [['Item', 'Situação', 'Observação']], body: CHECK.map(([k, lb]) => [lb, i.check[k] === 'NC' ? 'N/C' : i.check[k] === 'NA' ? 'N/A' : (i.check[k] || '—'), i.checkObs[k] || '']),
      columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' } },
      didParseCell: d => { if (d.section === 'body' && d.column.index === 1) { if (d.cell.raw === 'OK') d.cell.styles.textColor = [31, 122, 58]; if (d.cell.raw === 'N/C') { d.cell.styles.textColor = [255, 255, 255]; d.cell.styles.fillColor = [180, 35, 27]; } } } });
    y = doc.lastAutoTable.finalY + 7;
    }
    const fm = site || (vist && !vistCx) || (impl && !usaImpl(i, 'fusoes')) || claroCorr(i) ? '__skip' : (i.fo.modo || 'det');
    if (fm !== 'det' && fm !== '__skip') {
      y = pdfSec(doc, y, ++sn, 'Fusões');
      doc.setFont('helvetica', fm === 'cor' ? 'bold' : 'normal'); doc.setFontSize(9); doc.setTextColor(fm === 'cor' ? 31 : 20, fm === 'cor' ? 122 : 20, fm === 'cor' ? 58 : 20);
      doc.splitTextToSize(fm === 'exc' ? `Fusões cor com cor nas ${i.fo.total} fibras, com as exceções abaixo.` : resumoFo(i), 186).forEach(line => { doc.text(line, 12, y + 1); y += 4.6; }); y += 2; doc.setTextColor(20);
      if (fm === 'exc' && (i.fo.exc || []).length) { const pe2 = padE(i); doc.autoTable({ ...TB, startY: y, head: [['Tipo', 'Fibra de entrada', 'Ligada / trocada com', 'Cabo', 'Motivo']], body: i.fo.exc.map(e => [EXCT[e.tipo], e.fo ? `FO ${e.fo} · ${foTxt(+e.fo, pe2)}` : '—', e.tipo === 'livre' ? '—' : e.fib ? `FO ${e.fib} · ${foTxt(+e.fib, padS(i, e.cabo || 'S1'))}` : '—', e.tipo === 'livre' ? '—' : (e.cabo || 'S1'), e.mot || '—']), didParseCell: d => { if (d.section === 'body' && d.column.index === 0) { d.cell.styles.textColor = [200, 70, 10]; d.cell.styles.fontStyle = 'bold'; } } }); y = doc.lastAutoTable.finalY + 7; }
      else y += 3;
    }
    if (fm === 'det') {
    y = pdfSec(doc, y, ++sn, 'Fibras fusionadas e mapa de fusões');
    const fused = i.fo.rows.slice(0, i.fo.total).map((r, k) => ({ ...r, n: k + 1 })).filter(r => r.f);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(20);
    const nMan = fused.filter(r => r.fib && +r.fib !== r.n).length; doc.text(`${fused.length} de ${i.fo.total} fibras do cabo de entrada fusionadas${nMan ? ` · ${nMan} manobra(s) de fibra` : ''}.`, 12, y + 1); y += 4;
    // grade 3 tubos x 12 fibras
    const gx = 12, cw = 14.5, ch = 6.2; doc.setFontSize(7);
    const pe = padE(i); for (let f = 0; f < 12; f++) { doc.setFillColor(fCor(f + 1, pe)[1]); doc.rect(gx + 14 + f * cw, y, cw, 3, 'FD'); doc.setTextColor(20); doc.text(String(f + 1), gx + 14 + f * cw + cw / 2, y + 6, { align: 'center' }); }
    y += 7.5;
    for (let t = 0; t < Math.ceil(i.fo.total / 12); t++) {
      if (y > 276) { doc.addPage(); y = 16; }
      doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.text(`T${t + 1}`, gx + 1, y + 4.2); doc.setFillColor(tCor(t + 1, pe)); doc.rect(gx + 7, y + 1.7, 4, 3, 'FD'); doc.setFont('helvetica', 'normal');
      for (let f = 0; f < 12 && t * 12 + f < i.fo.total; f++) { const r = i.fo.rows[t * 12 + f] || {}; doc.setDrawColor(150); if (r.f) { doc.setFillColor(...ACC); doc.rect(gx + 14 + f * cw, y, cw, ch, 'FD'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.text('X', gx + 14 + f * cw + cw / 2, y + 4.3, { align: 'center' }); doc.setFont('helvetica', 'normal'); } else doc.rect(gx + 14 + f * cw, y, cw, ch); }
      y += ch;
    }
    y += 4;
    if (fused.length) {
      doc.autoTable({ ...TB, startY: y, head: [['FO', 'Entrada (tubo / fibra)', 'Band.', 'Cabo saída', 'Fibra de saída (tubo / fibra)', 'Ligação']],
        body: fused.map(r => paraAqui(i, r) ? [r.n, foTxt(r.n, pe), r.band || '—', r.cabo, '—', `F${r.n} PARA NESTA CAIXA (saída com ${r.cabo === 'S2' && !i.cabos.temS2 ? 0 : capSaida(i, r.cabo || 'S1')} FO)`] : [r.n, foTxt(r.n, pe), r.band || '—', r.cabo, r.fib ? `${r.fib} · ${foTxt(+r.fib, padS(i, r.cabo))}` : '—', r.fib ? (+r.fib === r.n ? `F${r.n} com F${r.fib}` : `F${r.n} com F${r.fib} (MANOBRA)${r.mot ? ' - ' + r.mot : ''}`) : '—']),
        didParseCell: d => { if (d.section === 'body' && d.column.index === 5 && /MANOBRA|PARA NESTA/.test(String(d.cell.raw))) { d.cell.styles.textColor = [200, 70, 10]; d.cell.styles.fontStyle = 'bold'; } }, columnStyles: { 0: { halign: 'center', fontStyle: 'bold', cellWidth: 11 }, 2: { halign: 'center', cellWidth: 13 }, 3: { halign: 'center', cellWidth: 19 } } });
      y = doc.lastAutoTable.finalY + 7;
    }
    }
    if (fm !== '__skip' && fm !== 'nenhuma' && temMapaFusao(i) && mapaFusaoDados(i).links.length) {
      try { if (y > 200) { doc.addPage(); y = 16; } y = pdfSec(doc, y, ++sn, 'Mapa de fusão'); y += 2; const c = await svgCanvas(fusaoSvg(i, { largura: 680 }), 2); y = pdfImagemAlta(doc, c, y) + 4; } catch (e) { console.warn('mapa de fusão no PDF', e); }
    }
    if (corr) {
      y = pdfSec(doc, y, ++sn, 'Materiais utilizados');
      const ml = MATERIAIS.filter(([k]) => +String(i.mat[k] || '').replace(',', '.') > 0).map(([k, lb, un]) => [lb + (k === 'cabo' && i.mat.caboSpec ? ' — ' + i.mat.caboSpec : ''), i.mat[k], un]).concat((i.matExtra || []).filter(m => m.nome).map(m => [m.nome, m.qtd || '—', m.un || '']));
      if (ml.length) { doc.autoTable({ ...TB, startY: y, head: [['Material', 'Quantidade', 'Unid.']], body: ml, columnStyles: { 1: { halign: 'right', cellWidth: 28 }, 2: { cellWidth: 18 } } }); y = doc.lastAutoTable.finalY + 7; }
      else { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(20); doc.text('Nenhum material informado.', 12, y + 1); y += 8; }
    }
    if ((i.lpu || []).length) { y = pdfSec(doc, y, ++sn, 'Produção executada (LPU)'); doc.autoTable({ ...TB, startY: y, head: [['Código', 'Descrição', 'Unid.', 'Qtd.', 'Unit.', 'Total']], body: [...(VV => i.lpu.map((x, k) => VV[k].k === 'estoque' ? [x.c, x.d, x.u, fQtd(x.q), 'Estoque', '—'] : VV[k].k === 'contrato' ? [x.c, x.d, x.u, fQtd(x.q), 'Contrato', '—'] : [x.c, x.d + (VV[k].k === 'franquia' ? ` (${lpuNota(VV[k])})` : ''), x.u, fQtd(x.q), fBRL(x.v), fBRL(VV[k].v)]))(lpuValores(i)), ['', (centroOS(i) ? CENTROS[centroOS(i)] + ' · ' : '') + (centroOS(i) === 'backbone' ? `Valor cobrado pela LPU (lançamento acima de ${FRANQUIA_BB} m)` : claroCorr(i) && i.lpu.some(x => lpuEst(i, x)) ? 'Valor total da O.S. (corretiva Claro: só serviços; material = consumo de estoque)' : 'Valor total da O.S.'), '', '', '', fBRL(valorOS(i))]], columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 13 }, 3: { halign: 'right', cellWidth: 14 }, 4: { halign: 'right', cellWidth: 22 }, 5: { halign: 'right', cellWidth: 25, fontStyle: 'bold' } }, didParseCell: c => { if (c.section === 'body' && c.row.index === i.lpu.length) { c.cell.styles.fontStyle = 'bold'; c.cell.styles.fillColor = [233, 238, 241]; } } }); y = doc.lastAutoTable.finalY + 7; }
    y = pdfSec(doc, y, ++sn, corr ? 'Observações' : 'Observações / irregularidades');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(20);
    const ob = doc.splitTextToSize(i.obs || 'Sem observações.', 186); ob.forEach(line => { if (y > 280) { doc.addPage(); y = 16; } doc.text(line, 12, y + 1); y += 4.6; }); y += 4;
    if (y > 245) { doc.addPage(); y = 20; }
    if (i.assinatura) doc.addImage(i.assinatura, 'PNG', 12, y, 70, 22);
    doc.setDrawColor(20); doc.setLineWidth(0.4); doc.line(12, y + 24, 92, y + 24); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.text((vist ? 'ASSINATURA DO FISCAL — ' : 'ASSINATURA DO TÉCNICO — ') + (i.info.tecnico || '').toUpperCase(), 12, y + 28);
    doc.line(118, y + 24, 198, y + 24); doc.text('VISTO DO SUPERVISOR', 118, y + 28);
    // fotos
    if (i.fotos.length) {
      for (let k = 0; k < i.fotos.length; k++) {
        const p = i.fotos[k]; if (k % 2 === 0) { doc.addPage(); y = site ? pdfHeader(doc, logo, 'Evidências fotográficas', siteTitulo(i), i.site.sigla, 'SITE') : corr ? pdfHeader(doc, logo, 'Evidências fotográficas', 'Relatório de corretiva · ticket ' + i.corr.ticket, i.corr.ticket, 'TICKET') : pdfHeader(doc, logo, 'Evidências fotográficas', 'Relatório de inspeção · ' + (i.info.tag || ''), i.info.tag); }
        const fb = await fotoBlob(p); if (!fb) continue; const data = await blobToData(fb); const bw = 186, bh = 112; let w = bw, h = w * p.h / p.w; if (h > bh) { h = bh; w = h * p.w / p.h; }
        doc.addImage(data, 'JPEG', 12 + (bw - w) / 2, y, w, h); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(20);
        doc.text(`Foto ${k + 1} — ${p.cat}${p.desc ? ': ' + p.desc : ''}`, 12, y + h + 5, { maxWidth: 186 }); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90);
        doc.text(`${fData(p.ts)} ${fHoraS(p.ts)}${p.lat != null ? ` · ${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}` : ''}`, 12, y + h + 9.5);
        y += h + 16;
      }
    }
    if (site) await pdfCurvas(doc, logo, i);
    pdfFooter(doc, `Multivale Engenharia · Ronda Preventiva Backbone · gerado em ${fDH(Date.now())}`);
    const blob = doc.output('blob');
    return new File([blob], nomeArq(site ? `Conjunta_${i.ticketAtv || 'sem_ticket'}_${i.site.sigla || 'sem_sigla'}_${isoDate(i.criado)}` : isCorr(i) ? `Corretiva_${i.corr.ticket || 'sem_ticket'}_${i.info.data || isoDate(i.criado)}` : isImpl(i) ? `Implantacao_${i.impl.designacao || 'sem_designacao'}_${i.impl.servico}_${isoDate(i.criado)}` : isVist(i) ? `Vistoria_${i.vist.tipo}_${isoDate(i.criado)}_${fHora(i.chegada).replace(':', 'h')}` : `Inspecao_${i.info.tag || 'sem_TAG'}_${i.info.data || isoDate(i.criado)}`), { type: 'application/pdf' });
  } catch (e) { console.error(e); toast('Erro ao gerar o PDF: ' + e.message, 6000); return null; }
}

async function gerarPdfRonda(r) {
  if (!window.jspdf) { toast('Gerador de PDF não carregou. Abra o app com internet uma vez.'); return null; }
  toast('Gerando relatório da ronda…', 8000);
  try {
    await cacheInspRonda(r);
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const logo = await logoData();
    const { t, segs } = totais(r);
    let y = pdfHeader(doc, logo, isCorr(r) ? 'Resumo de Corretiva' : isImpl(r) ? 'Relatório de Designação · Implantação' : isVist(r) ? 'Relatório Final de Vistoria de Rota' : isSite(r) ? 'Relatório de Conjunta de Site' : 'Relatório de Ronda Preventiva', isCorr(r) ? 'Deslocamento e atendimento' : isImpl(r) ? (IMPL_SERV[r.servico] || '') + ' · percurso e produção' : isVist(r) ? 'Fiscalização de campo · ' + (r.objetivo || '') : isSite(r) ? 'Multivale x provedor parceiro · deslocamento e sites' : 'Controle de percurso e produção', isCorr(r) ? r.ticket : isImpl(r) ? r.designacao : r.ticket || null, isImpl(r) ? 'DESIGNAÇÃO' : 'TICKET');
    if (isCorr(r)) pdfLog(doc, r.atvLog);
    y = pdfSec(doc, y, 1, 'Resumo do dia');
    y = kv(doc, y, [...(isCorr(r) ? [['Ticket', r.ticket + (r.ticketAuto ? ' (gerado pelo app)' : '')], ['Ocorrência', r.ocorrencia]] : []), ['Backbone', donoLb(r.dono, r.parceiro) || '—'], ['Equipe', S.perfil.equipe], ['Técnico', r.tecnico], ['Matrícula', r.matricula], ['Data', fData(r.inicio)], ['Veículo', veicTxt(r.veiculo) || r.placa], ...(r.distCasa != null ? [['Início a', fDist(r.distCasa) + ' da residência']] : []), ...((r.refeicoes || []).length ? [['Refeição', r.refeicoes.map(x => `${fHora(x.ini)}–${x.fim ? fHora(x.fim) : '…'}`).join(', ')]] : []), ['Odômetro inicial', fOdo(kmNum(r.odoIni))], ['Odômetro final', fOdo(kmNum(r.odoFim))], [ADMIN ? 'Km odômetro x GPS' : 'Km rodado (odômetro)', (() => { const o = odoInfo(r); return o ? (ADMIN ? odoTxt(o) + (o.diverge ? ' - NÃO CONFERE' : ' - confere') : fKm(o.odo)) : '—'; })()], ['Início', fHora(r.inicio)], ['Fim', r.fim ? fHora(r.fim) : 'Em andamento'], ['Duração', fDur(t.dur)], ['Caixas inspecionadas', String(t.caixas)], ['Km total', fKm(t.km)], ['Km deslocamento', fKm(t.desl + t.ret + t.atual)], ['Km rota do cabo', fKm(t.cabo)], ['Sem GPS (>3 min)', t.gapN ? `${t.gapN} trecho(s), ${fDur(t.gapMs)}` : 'Nenhum'], ['Rota', r.rotaId && rotaById(r.rotaId) ? rotaLb(rotaById(r.rotaId)) : '—'], ['Fotos da rede', String((await fotosRede(r.id)).length)], ...aprPdfLinhas(r)]);
    const ini = r.eventos.find(e => e.tipo === 'inicio');
    const marks = [{ lat: ini && ini.lat, lon: ini && ini.lon, label: 'I', color: '#1f7a3a' }, ...r.eventos.filter(e => e.tipo === 'chegada').map((e, k) => ({ lat: e.lat, lon: e.lon, label: String(k + 1), color: '#0b5f99' }))];
    const fim = r.eventos.find(e => e.tipo === 'fim'); if (fim && fim.lat != null) marks.push({ lat: fim.lat, lon: fim.lon, label: 'F', color: '#b4231b' });
    const rede = await fotosRede(r.id); rede.forEach((f, k) => { if (f.lat != null) marks.push({ lat: f.lat, lon: f.lon, label: 'R' + (k + 1), color: '#7a3fa0' }); });
    const rtm = r.rotaId ? rotaById(r.rotaId) : null; (ADMIN ? velStats(r).exc : []).forEach(e => marks.push({ lat: e.lat, lon: e.lon, label: '!', color: '#b4231b' }));
    const adm = aderencia(r);
    const img = await mapaImg([...(rtm && rtm.kml ? rtm.kml.linhas.map(l => ({ pts: l.map(([lat, lon]) => ({ lat, lon })), color: '#9aa5ad' })) : []), ...segs.map(s => ({ pts: s.pts, color: SEGCOR[s.tipo] })), ...(adm ? adm.desvios.map(x => ({ pts: x.pts, color: '#b4231b' })) : [])], marks, 1400, 1000);
    y = pdfSec(doc, y, 2, 'Mapa do percurso');
    if (img) { if (y > 150) { doc.addPage(); y = 16; } doc.addImage(img, 'JPEG', 12, y - 2, 186, 132.9); y += 133;
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); let lx = 12;
      [['desl', 'Deslocamento'], ['cabo', 'Rota do cabo'], ['ret', 'Retorno'], ['dv', 'Desvio']].forEach(([k, lb]) => { doc.setFillColor(k === 'dv' ? '#b4231b' : SEGCOR[k]); doc.rect(lx, y, 6, 1.6, 'F'); doc.setTextColor(60); doc.text(lb, lx + 8, y + 1.6); lx += 26; });
      doc.text('I início · F fim · nº caixas · R fotos da rede · ! velocidade', 118, y + 1.6); y += 8; }
    y = pdfSec(doc, y, 3, 'Trechos percorridos');
    doc.autoTable({ ...TB, startY: y, head: [['#', 'Tipo', 'De > Para', 'Início', 'Fim', 'Tempo', 'Km']], body: segs.map((s, k) => [k + 1, SEGLB[s.tipo], `${s.de} > ${s.para}`, fHora(s.ini), fHora(s.fim), fDur(s.fim - s.ini), fKm(s.km)]),
      foot: [['', '', 'Total', '', '', fDur(t.dur), fKm(t.km)]], footStyles: { fillColor: [233, 238, 241], textColor: 20, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 6: { halign: 'right' } },
      didParseCell: d => { if (d.section === 'body' && d.column.index === 1) { const k = Object.keys(SEGLB).find(x => SEGLB[x] === d.cell.raw); if (k) { d.cell.styles.textColor = SEGCOR[k]; d.cell.styles.fontStyle = 'bold'; } } } });
    y = doc.lastAutoTable.finalY + 7;
    y = pdfSec(doc, y, 4, isVist(r) ? 'Registros da vistoria' : isImpl(r) ? 'Produção — pontos de implantação' : 'Produção — caixas inspecionadas');
    const ch = r.eventos.filter(e => e.tipo === 'chegada');
    doc.autoTable({ ...TB, startY: y, head: [['#', 'TAG', 'Endereço', 'Chegada', 'Saída', 'Na caixa', 'Fusões', 'N/C', 'Fotos']],
      body: ch.map((e, k) => { const i = S.inspCache.get(e.inspId); if (!i) return [k + 1, '—', '', fHora(e.ts), '', '', '', '', '']; const nf = i.fo.rows.slice(0, i.fo.total).filter(x => x.f).length; const nc = Object.values(i.check).filter(v => v === 'NC').length;
        return [k + 1, isSite(i) ? siteTitulo(i) : isVist(i) ? VIST_TIPOS[i.vist.tipo] : isImpl(i) ? (IMPL_SERV[i.impl.servico] || '') + (usaImpl(i, 'caixa') ? ' · ' + (i.info.tag || '') : '') : (i.info.tag || '—'), [i.info.endereco, i.info.bairro].filter(Boolean).join(' - ') || '—', fHora(i.chegada), i.saida ? fHora(i.saida) : '—', i.saida ? fDur(i.saida - i.chegada) : '—', `${nf}/${i.fo.total}`, String(nc), String(i.fotos.length)]; }),
      columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { fontStyle: 'bold' }, 6: { halign: 'center' }, 7: { halign: 'center' }, 8: { halign: 'center' } },
      didParseCell: d => { if (d.section === 'body' && d.column.index === 7 && +d.cell.raw > 0) { d.cell.styles.textColor = [180, 35, 27]; d.cell.styles.fontStyle = 'bold'; } } });
    y = doc.lastAutoTable.finalY + 6;
    const vs = velStats(r); const rtc = r.rotaId ? rotaById(r.rotaId) : null; const cbr = cobertura(rtc, [r]);
    const adr = aderencia(r);
    if (adr && adr.pct != null) {
      y = pdfSec(doc, y, 5, 'Aderência à rota do backbone'); y += 3;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); if (adr.desvios.length) doc.setTextColor(180, 35, 27); else doc.setTextColor(31, 122, 58);
      doc.text(doc.splitTextToSize(adr.desvios.length ? `TRAJETO NÃO COMPATÍVEL COM A ROTA DO BACKBONE em ${adr.desvios.length} trecho(s): ${fKm(adr.kmFora)} fora do traçado (${fPct(100 - adr.pct)} do percurso entre caixas).` : `Percurso entre as caixas compatível com a rota do backbone: ${fPct(adr.pct)} dentro do traçado.`, 186), 12, y + 1); y += 10; doc.setTextColor(20);
      if (adr.desvios.length) { doc.autoTable({ ...TB, startY: y, head: [['#', 'Início', 'Fim', 'Extensão', 'Distância máx. do traçado', 'Trecho']], body: adr.desvios.map((x, k) => ['D' + (k + 1), fHoraS(x.ini), fHoraS(x.fim), fKm(x.km), fDmax(x.dmax), `${x.de} > ${x.para}`]), didParseCell: d => { if (d.section === 'body' && d.column.index === 0) { d.cell.styles.textColor = [180, 35, 27]; d.cell.styles.fontStyle = 'bold'; } } }); y = doc.lastAutoTable.finalY + 7; }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90); doc.text(`Tolerância: ${DESVIO_M} m do traçado importado (${adr.rt.kml.arquivo}). Avaliado só o percurso entre caixas (rota do cabo).`, 12, y); y += 7; doc.setTextColor(20);
    }
    if (ADMIN) {
    y = pdfSec(doc, y, adr && adr.pct != null ? 6 : 5, 'Velocidade' + (cbr ? ' e cobertura da rota' : ''));
    y = kv(doc, y, [['Velocidade máxima', fVel(vs.vmax)], ['Velocidade média (em movimento)', fVel(vs.vmed)], ['Limite configurado', vs.lim + ' km/h'], ['Excessos de velocidade', String(vs.exc.length)], ...(cbr ? [['Traçado da rota percorrido', `${fKm(cbr.covKm)} de ${fKm(cbr.totKm)} (${fPct(cbr.pct)})`]] : [])]);
    if (vs.exc.length) { doc.autoTable({ ...TB, startY: y - 3, head: [['Início', 'Fim', 'Vel. máxima', 'Local']], body: vs.exc.map(e => [fHoraS(e.ini), fHoraS(e.fim), fVel(e.vmax), `${e.lat.toFixed(5)}, ${e.lon.toFixed(5)}`]), didParseCell: d => { if (d.section === 'body' && d.column.index === 2) { d.cell.styles.textColor = [180, 35, 27]; d.cell.styles.fontStyle = 'bold'; } } }); y = doc.lastAutoTable.finalY + 7; }
    }
    if (t.gapN) { doc.setFontSize(8); doc.setTextColor(150, 70, 10); doc.text(doc.splitTextToSize(`Atenção: ${t.gapN} trecho(s) ficaram mais de 3 minutos sem posição de GPS (total ${fDur(t.gapMs)}). Nesses trechos a distância é estimada em linha reta.`, 186), 12, y); y += 10; }
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setDrawColor(20); doc.setLineWidth(0.4); doc.line(12, y + 18, 92, y + 18); doc.line(118, y + 18, 198, y + 18); doc.setFontSize(7.5); doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.text('TÉCNICO — ' + r.tecnico.toUpperCase(), 12, y + 22); doc.text('SUPERVISOR', 118, y + 22);
    for (let k = 0; k < rede.length; k++) {
      const p = rede[k]; if (k % 2 === 0) { doc.addPage(); y = pdfHeader(doc, logo, 'Fotos da rede', 'Integridade do backbone · ronda ' + fData(r.inicio), null); }
      const fb = await fotoBlob(p); if (!fb) continue; const data = await blobToData(fb); const bw = 186, bh = 112; let w = bw, h = w * p.h / p.w; if (h > bh) { h = bh; w = h * p.w / p.h; }
      doc.addImage(data, 'JPEG', 12 + (bw - w) / 2, y, w, h); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(20);
      doc.text(`R${k + 1} — ${p.cat}${p.desc ? ': ' + p.desc : ''}`, 12, y + h + 5, { maxWidth: 186 }); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90);
      doc.text(`${fData(p.ts)} ${fHoraS(p.ts)}${p.lat != null ? ` · ${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}` : ''}`, 12, y + h + 9.5); y += h + 16;
    }
    if (isVist(r)) {
      doc.addPage(); y = pdfHeader(doc, logo, 'Diário da vistoria', 'Registro escrito · ' + fData(r.inicio), null); y = pdfSec(doc, y, 'D', 'Anotações do fiscal');
      const ds = r.diario || []; const regs = r.eventos.filter(e => e.tipo === 'chegada').map(e => S.inspCache.get(e.inspId)).filter(Boolean);
      const linhas = [...ds.map(d => [fHora(d.ts), 'Anotação', d.txt]), ...regs.map(i => [fHora(i.chegada), VIST_TIPOS[i.vist ? i.vist.tipo : ''] || 'Registro', (i.vist && i.vist.descricao) || ''])].sort((a, b) => a[0].localeCompare(b[0]));
      if (linhas.length) doc.autoTable({ ...TB, startY: y, head: [['Hora', 'Tipo', 'Registro']], body: linhas, columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 42, fontStyle: 'bold' } } });
      else { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('Sem anotações.', 12, y + 1); }
    }
    pdfFooter(doc, `Multivale Engenharia · Ronda Preventiva Backbone · gerado em ${fDH(Date.now())}`);
    return new File([doc.output('blob')], nomeArq(isVist(r) ? `Vistoria_${isoDate(r.inicio)}_${r.tecnico}` : isImpl(r) ? `Designacao_${r.designacao}_${isoDate(r.inicio)}` : isCorr(r) ? `Corretiva_${r.ticket}_${isoDate(r.inicio)}_resumo` : `Ronda_${isoDate(r.inicio)}_${r.tecnico}`), { type: 'application/pdf' });
  } catch (e) { console.error(e); toast('Erro ao gerar o PDF: ' + e.message, 6000); return null; }
}

/* ============================ KMZ (Google Earth) ============================ */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipStore(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const d = new Date(), dT = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), dD = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length, met = f.comp ? 8 : 0, csz = f.comp ? f.comp.length : sz;
    const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, met, true); lh.setUint16(10, dT, true); lh.setUint16(12, dD, true); lh.setUint32(14, crc, true); lh.setUint32(18, csz, true); lh.setUint32(22, sz, true); lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), nm, f.comp || f.data);
    const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, met, true); ch.setUint16(12, dT, true); ch.setUint16(14, dD, true); ch.setUint32(16, crc, true); ch.setUint32(20, csz, true); ch.setUint32(24, sz, true); ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), nm); off += 30 + nm.length + csz;
  }
  const cs = central.reduce((a, c) => a + c.length, 0);
  const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cs, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.google-earth.kmz' });
}
async function zipArq(nome, files) {
  const fs = files.map(f => ({ name: f.name, data: f.data instanceof Uint8Array ? f.data : typeof f.data === 'string' ? new TextEncoder().encode(f.data) : new Uint8Array(f.data) }));
  if (typeof CompressionStream !== 'undefined') { try { for (const f of fs) { const c = new Uint8Array(await new Response(new Blob([f.data]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); if (c.length < f.data.length) f.comp = c; } } catch (e) { fs.forEach(f => delete f.comp); } }
  return new File([zipStore(fs)], nome, { type: 'application/zip' });
}
const xe = s => String(s ?? '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const kc = hex => { const h = hex.replace('#', ''); return 'ff' + h.slice(4, 6) + h.slice(2, 4) + h.slice(0, 2); };
const iso = ts => new Date(ts).toISOString();
function kmlStyles() {
  const ln = Object.entries(SEGCOR).map(([k, c]) => `<Style id="seg_${k}"><LineStyle><color>${kc(c)}</color><width>4</width></LineStyle></Style>`).join('');
  const pin = (id, icon, sc) => `<Style id="${id}"><IconStyle><scale>${sc}</scale><Icon><href>https://maps.google.com/mapfiles/kml/paddle/${icon}.png</href></Icon><hotSpot x="32" y="1" xunits="pixels" yunits="pixels"/></IconStyle><LabelStyle><scale>0.85</scale></LabelStyle></Style>`;
  return ln + pin('cx_ok', 'blu-circle', 1.1) + pin('cx_nc', 'red-circle', 1.1) + pin('ini', 'go', 1.1) + pin('fim', 'stop', 1.1) + pin('vel', 'stop', 0.9) + `<Style id="tracado"><LineStyle><color>ff8596a3</color><width>3</width></LineStyle></Style><Style id="coberto"><LineStyle><color>ff3a7a1f</color><width>6</width></LineStyle></Style><Style id="desvio"><LineStyle><color>ff1b23b4</color><width>6</width></LineStyle></Style>` + `<Style id="foto"><IconStyle><scale>1</scale><Icon><href>https://maps.google.com/mapfiles/kml/shapes/camera.png</href></Icon></IconStyle></Style>`;
}
function descInsp(i, fotosRef) {
  const t = { aerea: 'Aérea (poste)', sub: 'Subterrânea (CS enterrada)', outro: 'Outro' }[i.info.tipo] || '—';
  const nc = CHECK.filter(([k]) => i.check[k] === 'NC').map(([k, lb]) => `${lb}${i.checkObs[k] ? ': ' + i.checkObs[k] : ''}`);
  const nf = i.fo.rows.slice(0, i.fo.total).filter(r => r.f).length;
  const row = (a, b) => `<tr><td><b>${xe(a)}</b></td><td>${xe(b || '—')}</td></tr>`;
  let h = `<table border="1" cellpadding="3" style="border-collapse:collapse;font-family:Arial;font-size:12px">${isCorr(i) ? row('Ticket', i.corr.ticket) + row('Ocorrência', i.corr.ocorrencia) + row('Problema', i.corr.problema) + row('Serviço executado', i.corr.servico) : ''}${row('TAG', i.info.tag)}${row('Data', fDH(i.chegada))}${row('Técnico', i.info.tecnico)}${row('Modelo / fabricante', [i.info.modelo, i.info.fabricante].filter(Boolean).join(' / '))}${row('Instalação', t)}${row('Referência', refTxt(i))}${row('Backbone', donoLb(i.info.dono, i.info.parceiro))}${row('Rota', i.info.rota)}${row('Poste / CV', i.info.poste)}${row('Endereço', [i.info.endereco, i.info.bairro, i.info.cidade].filter(Boolean).join(' - '))}${row('Cabo entrada', [i.cabos.entrada.marca, i.cabos.entrada.lote && 'lote ' + i.cabos.entrada.lote, i.cabos.entrada.fibras && i.cabos.entrada.fibras + ' FO', i.cabos.entrada.metragem && i.cabos.entrada.metragem + ' m'].filter(Boolean).join(' · '))}${row('Fusões', resumoFo(i))}${(() => { const m = i.fo.rows.slice(0, i.fo.total).map((r, k) => ({ ...r, n: k + 1 })).filter(r => r.f && r.fib && +r.fib !== r.n); return m.length ? row('Manobras', m.map(r => `F${r.n} com F${r.fib} (${r.cabo})${r.mot ? ' - ' + r.mot : ''}`).join('; ')) : ''; })()}${row('Irregularidades', nc.length ? nc.join('; ') : 'Nenhuma')}${row('Observações', i.obs)}</table>`;
  (fotosRef || []).forEach((f, k) => { h += `<p style="font-family:Arial;font-size:12px;margin:8px 0 2px"><b>Foto ${k + 1}</b> — ${xe(f.cat)}${f.desc ? ': ' + xe(f.desc) : ''}</p><img src="${f.path}" width="420">`; });
  return `<![CDATA[${h}]]>`;
}
async function kmlCaixa(i, files, comFotos) {
  if (!i.loc) return '';
  const fotosRef = [];
  if (comFotos) for (let k = 0; k < i.fotos.length; k++) { const p = i.fotos[k]; const fb = await fotoBlob(p); if (!fb) continue; const path = `fotos/${nomeArq(`${i.info.tag || i.id}_${k + 1}`).replace(/\.pdf$/, '')}.jpg`; files.push({ name: path, data: new Uint8Array(await fb.arrayBuffer()) }); fotosRef.push({ path, cat: p.cat, desc: p.desc }); }
  const nc = Object.values(i.check).some(v => v === 'NC');
  return `<Placemark><name>${xe(isCorr(i) ? 'Corretiva ' + i.corr.ticket : i.info.tag || 'Sem TAG')}</name><TimeStamp><when>${iso(i.chegada)}</when></TimeStamp><styleUrl>#${nc ? 'cx_nc' : 'cx_ok'}</styleUrl><description>${descInsp(i, fotosRef)}</description><Point><coordinates>${i.loc.lon},${i.loc.lat},0</coordinates></Point></Placemark>`;
}
function kmlSegs(r) {
  return segmentos(r).filter(s => s.pts.length > 1).map(s => `<Placemark><name>${xe(SEGLB[s.tipo])}: ${xe(s.de)} &gt; ${xe(s.para)} (${xe(fKm(s.km))})</name><TimeSpan><begin>${iso(s.ini)}</begin><end>${iso(s.fim)}</end></TimeSpan><styleUrl>#seg_${s.tipo}</styleUrl><description>${xe(`${fHora(s.ini)} às ${fHora(s.fim)} · ${fDur(s.fim - s.ini)} · ${fKm(s.km)}`)}</description><LineString><tessellate>1</tessellate><coordinates>${s.pts.map(p => `${p.lon},${p.lat},0`).join(' ')}</coordinates></LineString></Placemark>`).join('');
}
async function kmlRede(r, files, comFotos) {
  const fs = (await fotosRede(r.id)).filter(f => f.lat != null); if (!fs.length) return '';
  let h = ''; for (let k = 0; k < fs.length; k++) { const f = fs[k]; let img = '';
    if (comFotos) { const path = `fotos/rede_${isoDate(r.inicio)}_${k + 1}.jpg`; files.push({ name: path, data: new Uint8Array(await f.blob.arrayBuffer()) }); img = `<br><img src="${path}" width="420">`; }
    h += `<Placemark><name>R${k + 1} · ${xe(f.cat)}</name><TimeStamp><when>${iso(f.ts)}</when></TimeStamp><styleUrl>#foto</styleUrl><description><![CDATA[<p style="font-family:Arial;font-size:12px">${xe(f.cat)}${f.desc ? ': ' + xe(f.desc) : ''}<br>${fDH(f.ts)}</p>${img}]]></description><Point><coordinates>${f.lon},${f.lat},0</coordinates></Point></Placemark>`; }
  return `<Folder><name>Fotos da rede</name>${h}</Folder>`;
}
async function kmlRondaFolder(r, files, comFotos) {
  await cacheInspRonda(r);
  const { t } = totais(r); const ini = r.eventos.find(e => e.tipo === 'inicio'), fim = r.eventos.find(e => e.tipo === 'fim');
  let cx = ''; for (const e of r.eventos.filter(e => e.tipo === 'chegada')) { const i = S.inspCache.get(e.inspId); if (i) cx += await kmlCaixa(i, files, comFotos); }
  const pm = (e, nome, st) => e && e.lat != null ? `<Placemark><name>${nome}</name><TimeStamp><when>${iso(e.ts)}</when></TimeStamp><styleUrl>#${st}</styleUrl><Point><coordinates>${e.lon},${e.lat},0</coordinates></Point></Placemark>` : '';
  return `<Folder><name>${isCorr(r) ? 'Corretiva ' + xe(r.ticket) : 'Ronda'} ${fData(r.inicio)} · ${xe(r.tecnico)}</name><description>${xe(`${r.dono ? donoLb(r.dono, r.parceiro) + ' · ' : ''}${veicTxt(r.veiculo) ? veicTxt(r.veiculo) + ' · ' : ''}${odoInfo(r) ? 'odômetro ' + fKm(odoInfo(r).odo) + ' · ' : ''}${fHora(r.inicio)} às ${r.fim ? fHora(r.fim) : 'agora'} · ${t.caixas} caixa(s) · ${fKm(t.km)} (deslocamento ${fKm(t.desl + t.ret + t.atual)}, rota do cabo ${fKm(t.cabo)})${r.placa ? ' · veículo ' + r.placa : ''}`)}</description>
    <Folder><name>Percurso</name>${kmlSegs(r)}${pm(ini, 'Início da ronda', 'ini')}${pm(fim, 'Fim da ronda', 'fim')}</Folder>${(() => { const ad = aderencia(r); return ad && ad.desvios.length ? `<Folder><name>Trajeto não compatível com a rota (${ad.desvios.length} desvio(s))</name>${ad.desvios.map((x, k) => `<Placemark><name>D${k + 1}: ${xe(fKm(x.km))} fora da rota</name><TimeSpan><begin>${iso(x.ini)}</begin><end>${iso(x.fim)}</end></TimeSpan><styleUrl>#desvio</styleUrl><LineString><tessellate>1</tessellate><coordinates>${x.pts.map(p => `${p.lon},${p.lat},0`).join(' ')}</coordinates></LineString></Placemark>`).join('')}</Folder>` : ''; })()}${(() => { const vs = velStats(r); return ADMIN && vs.exc.length ? `<Folder><name>Excessos de velocidade (limite ${vs.lim} km/h)</name>${vs.exc.map(e => `<Placemark><name>${xe(fVel(e.vmax))} às ${fHora(e.ini)}</name><TimeStamp><when>${iso(e.ini)}</when></TimeStamp><styleUrl>#vel</styleUrl><Point><coordinates>${e.lon},${e.lat},0</coordinates></Point></Placemark>`).join('')}</Folder>` : ''; })()}<Folder><name>Caixas inspecionadas</name>${cx}</Folder>${await kmlRede(r, files, comFotos)}</Folder>`;
}
function montaKmz(nome, corpo, files) {
  const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xe(nome)}</name>${kmlStyles()}${corpo}</Document></kml>`;
  const blob = zipStore([{ name: 'doc.kml', data: new TextEncoder().encode(kml) }, ...files]);
  return new File([blob], nomeArq(nome).replace(/\.pdf$/, '.kmz'), { type: 'application/vnd.google-earth.kmz' });
}
async function kmzRonda(r) { try { toast('Gerando KMZ…'); const files = []; const corpo = await kmlRondaFolder(r, files, true); return montaKmz(isCorr(r) ? `Corretiva_${r.ticket}_${isoDate(r.inicio)}` : `Ronda_${isoDate(r.inicio)}_${r.tecnico}`, corpo, files); } catch (e) { console.error(e); toast('Erro ao gerar KMZ: ' + e.message, 6000); return null; } }
async function kmzInsp(i) {
  try {
    if (!i.loc) { toast('Esta caixa ainda não tem localização. Capture o GPS na etapa Caixa.'); return null; }
    const files = []; let corpo = await kmlCaixa(i, files, true);
    if (i.rondaId) { const r = (S.ronda && S.ronda.id === i.rondaId) ? S.ronda : await DB.get('rondas', i.rondaId); if (r) { const s = segmentos(r).find(x => x.inspId === i.id); if (s && s.pts.length > 1) corpo += `<Placemark><name>${xe(SEGLB[s.tipo])} até a caixa (${xe(fKm(s.km))})</name><styleUrl>#seg_${s.tipo}</styleUrl><LineString><tessellate>1</tessellate><coordinates>${s.pts.map(p => `${p.lon},${p.lat},0`).join(' ')}</coordinates></LineString></Placemark>`; } }
    return montaKmz(isCorr(i) ? `Corretiva_${i.corr.ticket}_${i.info.data || isoDate(i.criado)}` : `Caixa_${i.info.tag || 'sem_TAG'}_${i.info.data || isoDate(i.criado)}`, corpo, files);
  } catch (e) { console.error(e); toast('Erro ao gerar KMZ: ' + e.message, 6000); return null; }
}
async function kmzTodas() {
  try {
    toast('Gerando KMZ de todas as rondas…');
    const rs = (await DB.all('rondas')).sort((a, b) => a.inicio - b.inicio); const ins = await DB.all('inspecoes'); ins.forEach(i => S.inspCache.set(i.id, i));
    let corpo = ''; const files = [];
    for (const r of rs) corpo += await kmlRondaFolder(r, files, false);
    let av = ''; for (const i of ins.filter(i => !i.rondaId)) av += await kmlCaixa(i, files, false);
    if (av) corpo += `<Folder><name>Inspeções avulsas</name>${av}</Folder>`;
    if (!corpo) { toast('Ainda não há rondas nem caixas para exportar.'); return null; }
    return montaKmz(`Rondas_Backbone_${isoDate(Date.now())}`, corpo, files);
  } catch (e) { console.error(e); toast('Erro ao gerar KMZ: ' + e.message, 6000); return null; }
}
async function kmzRota(rt) {
  try {
    toast('Gerando KMZ da rota…'); const d = await dadosRota(rt); const files = [];
    const tr = d.trac.map(s => `<Placemark><name>${xe(s.de)} &gt; ${xe(s.para)} (${xe(fKm(s.km))})</name><TimeSpan><begin>${iso(s.ini)}</begin><end>${iso(s.fim)}</end></TimeSpan><styleUrl>#seg_cabo</styleUrl><description>${xe(`Ronda ${fData(s.ronda.inicio)} · ${s.ronda.tecnico}`)}</description><LineString><tessellate>1</tessellate><coordinates>${s.pts.map(p => `${p.lon},${p.lat},0`).join(' ')}</coordinates></LineString></Placemark>`).join('');
    let cx = ''; for (const i of d.caixas) cx += await kmlCaixa(i, files, false);
    const desc = xe([rt.nome, `${rt.pontaA || '?'} > ${rt.pontaB || '?'}`, rt.cap && rt.cap + ' FO', rt.marca, rt.extensao && 'previsto ' + rt.extensao + ' km', `traçado GPS ${fKm(d.km)}`, rt.obs].filter(Boolean).join(' · '));
    const cb = cobertura(rt, d.rs);
    const imp = rt.kml ? `<Folder><name>Traçado cadastrado (importado)</name>${rt.kml.linhas.map((l, k) => `<Placemark><name>Traçado ${k + 1}</name><styleUrl>#tracado</styleUrl><LineString><tessellate>1</tessellate><coordinates>${l.map(([la, lo]) => `${lo},${la},0`).join(' ')}</coordinates></LineString></Placemark>`).join('')}</Folder>${cb && cb.trechos.length ? `<Folder><name>Trecho percorrido (${xe(fPct(cb.pct))})</name>${cb.trechos.map(t => `<Placemark><styleUrl>#coberto</styleUrl><LineString><tessellate>1</tessellate><coordinates>${t.map(([la, lo]) => `${lo},${la},0`).join(' ')}</coordinates></LineString></Placemark>`).join('')}</Folder>` : ''}` : '';
    return montaKmz(`Rota_${rt.codigo}`, `<description>${desc}${cb ? xe(` · percorrido ${fKm(cb.covKm)} de ${fKm(cb.totKm)} (${fPct(cb.pct)})`) : ''}</description>${imp}<Folder><name>Rota do cabo (GPS das rondas)</name>${tr}</Folder><Folder><name>Caixas</name>${cx}</Folder>`, files);
  } catch (e) { console.error(e); toast('Erro ao gerar KMZ: ' + e.message, 6000); return null; }
}
async function exportar(f) {
  if (NATIVO && await Nativo.compartilha([f])) return;
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: f.name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  baixar(f); toast('KMZ salvo em Downloads. Abra no Google Earth ou envie pelo WhatsApp.', 6000);
}

/* ============================ compartilhar ============================ */
function textoInsp(i) { const l = i.loc; if (isCorr(i)) return `Corretiva backbone — Ticket ${i.corr.ticket}\n${i.corr.ocorrencia || ''}\nTécnico: ${i.info.tecnico}\nData: ${fDH(i.chegada)}${l ? `\nLocal: https://maps.google.com/?q=${l.lat},${l.lon}` : ''}`; return `Inspeção preventiva backbone — Caixa ${i.info.tag || 'sem TAG'}\nTécnico: ${i.info.tecnico}\nData: ${fDH(i.chegada)}${l ? `\nLocal: https://maps.google.com/?q=${l.lat},${l.lon}` : ''}`; }
function textoRonda(r) { const { t } = totais(r); if (isCorr(r)) return `Corretiva backbone — Ticket ${r.ticket}\nTécnico: ${r.tecnico}\n${fData(r.inicio)} ${fHora(r.inicio)} às ${r.fim ? fHora(r.fim) : 'agora'} · ${fKm(t.km)} percorridos`; return `Ronda preventiva backbone — ${fData(r.inicio)}\nTécnico: ${r.tecnico}\n${fHora(r.inicio)} às ${r.fim ? fHora(r.fim) : 'agora'} · ${t.caixas} caixa(s) · ${fKm(t.km)}`; }
function baixar(f) { if (NATIVO && Nativo.p('Share')) { Nativo.compartilha([f]); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000); toast('PDF salvo em Downloads.'); }
async function compartilhar(files, texto) {
  if (NATIVO && await Nativo.compartilha(files, texto)) return;
  try {
    if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, title: files[0].name, text: texto }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  files.forEach(baixar);
  toast('Este navegador não envia arquivos direto. O PDF foi salvo; anexe no WhatsApp.', 6000);
  setTimeout(() => window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank'), 800);
}



