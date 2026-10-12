// Técnico Plus - Multivale · despacho de atividades, alarmes e expediente
// Os arquivos app-*.js carregam em ordem (ver index.html) e compartilham o mesmo escopo global.
'use strict';
/* ============================ despacho de atividades ============================ */
function distTecAtv(uid, a) { const v = (S.vivo || new Map()).get(uid); if (!v || v.lat == null || !a || a.lat == null || Date.now() - (v.ts || 0) > 3 * 3600000) return null; return hav(v, a); }
function tecOptsAtv(a) {
  const R = a.lat != null ? Rota.paraTecs(a, posTecs(), reRota) : null;
  const L = (S.adm.tecnicos || []).map(t => ({ t, si: situacaoTec(t.uid), d: distTecAtv(t.uid, a), r: R && R.get(t.uid) }));
  if (a.lat != null) L.sort((x, y) => ((x.r ? x.r.s : x.d != null ? x.d / 12 : 1e12) - (y.r ? y.r.s : y.d != null ? y.d / 12 : 1e12)));
  return '<option value="">Sem técnico (fica na fila)</option>' + L.map(({ t, si, d, r }) => `<option value="${t.uid}" ${a.tecnicoUid === t.uid ? 'selected' : ''}>${esc(t.nome)} · ${esc(si.txt)}${r ? ' · 🚗 ' + fRota(r) : d != null ? ' · 📍 ~' + fDist(d) + ' (linha reta)' : a.lat != null ? ' · sem GPS' : ''}</option>`).join('');
}
// agenda: dia em que a O.S. deve ser feita (sem agenda = desde que foi criada)
const agendaDe = a => (a && a.agendaDia) || isoDate((a && a.criado) || Date.now());
const atvFutura = a => !!(a && a.agendaDia && a.agendaDia > isoDate(Date.now()));
const fDiaCurto = d => { const dt = new Date(diaIni(d) + 43200000); return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); };
/* ---------- ticket do acionamento e imagens anexadas à O.S. ---------- */
async function reduzImagem(file, max = 1600) {
  const bmp = await createImageBitmap(file); const sc = Math.min(1, max / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82)); return { blob, w: c.width, h: c.height };
}
function anexosEditHtml(a) {
  const l = a.anexos || [];
  return `<div class="field full"><span class="lb">Imagens do acionamento <span class="muted small" style="font-weight:400">(o técnico vê na O.S. · também dá para colar um print com Ctrl+V)</span></span>
    <div class="anx">${l.map((x, k) => `<span class="anxi"><img data-anxsrc="${esc(x.path)}" alt="Imagem ${k + 1}"><button type="button" class="anxx" data-anxdel="${k}" aria-label="Tirar imagem">×</button></span>`).join('')}<label class="anxadd">+ Imagem<input type="file" accept="image/*" multiple id="anxFile" hidden></label></div></div>`;
}
async function anexosSobe(a, files, depois) {
  if (!Nuvem.on) { toast('Sem conexão com a nuvem.'); return; } a.anexos = a.anexos || []; let n = 0;
  for (const f of files) { if (!/^image\//.test(f.type)) continue; try { toast(`Enviando imagem ${++n}…`); const r = await reduzImagem(f); const path = `${Nuvem.org()}/acion/${a.id || 'novo'}/${uid()}.jpg`; const up = await Nuvem.sb.storage.from(Nuvem.BUCKET).upload(path, r.blob, { contentType: 'image/jpeg', upsert: true }); if (up.error) throw up.error; a.anexos.push({ path, w: r.w, h: r.h, nome: f.name || 'print', em: Date.now() }); } catch (e) { toast('Não foi possível enviar a imagem: ' + (e.message || e), 6000); } }
  if (n) { toast(`${n} imagem(ns) anexada(s). Salve a O.S. para enviar ao técnico.`, 5000); depois && depois(); }
}
const ANX_URL = new Map();
async function pintaAnexos(root) {
  for (const img of $$('[data-anxsrc]', root || document)) { const path = img.dataset.anxsrc; if (img.src) continue; let u = ANX_URL.get(path); if (!u) { const b = await fotoBlob({ path }); if (!b) continue; u = URL.createObjectURL(b); ANX_URL.set(path, u); } img.src = u; img.onclick = () => verImagem(u); }
}
function verImagem(u) { const d = document.createElement('div'); d.className = 'lightbox'; d.innerHTML = `<img src="${u}" alt="Imagem do acionamento"><button type="button" class="btn" aria-label="Fechar">Fechar</button>`; d.onclick = () => d.remove(); document.body.appendChild(d); }
function bindAnexos(a, depois) {
  const f = $('#anxFile'); if (f) f.onchange = () => anexosSobe(a, [...f.files], depois);
  $$('[data-anxdel]').forEach(b => b.onclick = () => { a.anexos.splice(+b.dataset.anxdel, 1); depois && depois(); });
  ['#atTxt', '#acTxt', '#anxFile'].forEach(sel => { const el = sel === '#anxFile' ? document : $(sel); if (!el || el._anxPaste) return; el._anxPaste = true; el.addEventListener('paste', e => { const fs = [...((e.clipboardData || {}).items || [])].filter(i => i.kind === 'file' && /^image\//.test(i.type)).map(i => i.getAsFile()); if (fs.length && $('#anxFile')) { e.preventDefault(); anexosSobe(S.acA && ACION ? S.acA : a, fs, depois); } }); });
  pintaAnexos();
}
function ticketAcionHtml(a) {
  const t = a._txt || a.textoAcion || ''; const l = a.anexos || [];
  if (!t && !l.length) return '';
  return `${t ? `<details ${a.vistaEm ? '' : 'open'}><summary style="cursor:pointer;font-weight:600;min-height:36px;display:flex;align-items:center">Ticket do acionamento</summary><pre style="white-space:pre-wrap;font:13px/1.45 ui-monospace,Menlo,Consolas,monospace;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:10px;margin:4px 0 0;max-height:260px;overflow:auto">${esc(t)}</pre></details>` : ''}
    ${l.length ? `<div><span class="lb">Imagens do acionamento (${l.length}) · toque para ampliar</span><div class="anx">${l.map((x, k) => `<span class="anxi"><img data-anxsrc="${esc(x.path)}" alt="Imagem ${k + 1} do acionamento"></span>`).join('')}</div></div>` : ''}`;
}
/* ---------- validação do endereço (Geoapify ou Google, pela função "geocode"; reserva: OpenStreetMap) ---------- */
async function geocodifica(endereco) {
  const q = String(endereco || '').trim(); if (!q) return null;
  if (ADMIN && Nuvem.on && Nuvem.sb && Nuvem.sb.functions) {
    try { const r = await Nuvem.sb.functions.invoke('geocode', { body: { endereco: q } }); const d = r && r.data;
      if (d && d.ok) return { lat: +d.lat, lon: +d.lon, fonte: d.fonte || 'google', formatado: d.formatado, preciso: !!d.preciso, nivel: d.nivel || '', candidatos: d.candidatos || [], em: Date.now() };
      if (d && d.motivo === 'nao_encontrado') return { naoAchou: true, fonte: 'validador', em: Date.now() };
    } catch (e) { /* função não configurada: usa o OpenStreetMap */ }
  }
  try { const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&addressdetails=0&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'pt-BR' } }); const j = await r.json();
    if (j.length) return { lat: +j[0].lat, lon: +j[0].lon, fonte: 'osm', formatado: j[0].display_name, preciso: false, nivel: 'OpenStreetMap', em: Date.now() };
    return { naoAchou: true, fonte: 'osm', em: Date.now() }; } catch (e) { return null; }
}
// aplica o resultado na O.S. e guarda como foi validado (aparece no formulário e no mapa de calor)
function aplicaGeo(a, g) { if (!a) return; if (!g) { a.geo = null; return; } if (g.naoAchou) { a.geo = { fonte: g.fonte, naoAchou: true, em: g.em }; return; } a.lat = g.lat; a.lon = g.lon; a.geo = { fonte: g.fonte, formatado: g.formatado, preciso: g.preciso, nivel: g.nivel, em: g.em, alternativas: (g.candidatos || []).slice(1, 4) }; }
function geoInfoHtml(a) {
  const g = a && a.geo; if (!g) return '';
  if (g.manual) return `<p class="small" style="margin:0;color:var(--ok)">📍 Local marcado à mão no mapa.</p>`;
  const FONTE = { google: 'Google', geoapify: 'Geoapify' }; const nomeF = FONTE[g.fonte]; const cred = g.fonte === 'geoapify' ? ' <span class="muted">· Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener">Geoapify</a> · © OpenStreetMap</span>' : '';
  if (g.naoAchou) return `<div class="warnbox small" style="border-color:var(--bad);background:var(--bad-soft)">❌ O endereço não foi encontrado. Confira o texto ou marque o local no mapa.</div>`;
  if (nomeF && g.preciso) return `<div class="okbox small">✅ <b>Endereço validado</b> (${esc(g.nivel)}): ${esc(g.formatado || '')}${cred}</div>`;
  if (nomeF) return `<div class="warnbox small">⚠️ <b>Só foi achado um ponto aproximado (${esc(g.nivel)})</b>: ${esc(g.formatado || '')}. Confira e, se precisar, arraste/toque no mapa no ponto certo.${(g.alternativas || []).length ? ` Outras opções: ${g.alternativas.map((c, k) => `<button type="button" class="lnk" data-geoalt="${k}">${esc(c.formatado)}</button>`).join(' · ')}` : ''}${cred}</div>`;
  return `<div class="warnbox small">⚠️ Localizado só pelo OpenStreetMap (sem o validador configurado): ${esc((g.formatado || '').slice(0, 120))}. Confira no mapa.</div>`;
}
function stAtv(a) { return a && a.status === 'recebida' ? (a.vistaEm ? 'Vista pelo técnico' : 'Entregue · aguardando ciente') : ATV_ST[a && a.status] || (a && a.status) || ''; }
const ATV_ST = { vista: 'Vista pelo técnico', pendente: 'Aguardando', recebida: 'Recebida', em_deslocamento: 'Em deslocamento', no_local: 'No local', concluida: 'Concluída', cancelada: 'Cancelada' };
const atvAberta = a => a && !['concluida', 'cancelada'].includes(a.status);
const atvEmerg = a => a && a.tipo === 'emergencial';
const atvImpl = a => a && a.tipo === 'implantacao';
function logTag(n) { n = +n || 0; if (!n) return ''; return `<span class="tlog l${Math.min(n, 4)}" title="${n >= 4 ? 'Escalonar ao gerente' : n > 1 ? 'Reincidência na semana' : 'Primeiro acionamento na semana'}">LOG ${n}${n >= 4 ? ' · GERENTE' : ''}</span>`; }
function logTxt(n) { return n >= 4 ? `LOG ${n} · ESCALONADO AO GERENTE` : n > 1 ? `LOG ${n} · REINCIDÊNCIA` : 'LOG 1 · 1º ACIONAMENTO'; }
function atvRef(a) { return refTxt({ info: { rotaId: a.rotaId || '', refSentido: a.refSentido || '', refKm: a.refKm || '', refLocal: a.refLocal || '' } }); }
function atvTitulo(a) { return (atvEmerg(a) ? 'Emergencial' : atvImpl(a) ? 'Implantação · ' + (IMPL_SERV[a.servico] || '') : 'Preventiva') + (a.ticket ? ' · ' + a.ticket : '') + (atvImpl(a) && a.designacao ? ' · ' + a.designacao : ''); }
function atvSub(a) { const rt = a.rotaId ? rotaById(a.rotaId) : null; return [a.ocorrencia, atvRef(a) || (rt ? rt.codigo : ''), a.endereco].filter(Boolean).join(' · ') || 'Sem referência'; }
function gpsUrl(a, app) {
  if (a.lat != null && a.lon != null) return app === 'waze' ? `https://waze.com/ul?ll=${a.lat},${a.lon}&navigate=yes` : `https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lon}&travelmode=driving`;
  if (a.mapsUrl) return app === 'waze' ? '' : a.mapsUrl;
  if (a.endereco) return app === 'waze' ? `https://waze.com/ul?q=${encodeURIComponent(a.endereco)}&navigate=yes` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a.endereco)}&travelmode=driving`;
  return '';
}
function parseLoc(t) {
  t = String(t || '').trim(); if (!t) return null; const n = x => parseFloat(String(x).replace(',', '.'));
  const pats = [/@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, /[?&](?:q|query|ll|destination|daddr|center)=(?:loc:)?(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/, /^\s*(-?\d{1,2}[.,]\d+)\s*[,; ]\s*(-?\d{1,3}[.,]\d+)\s*$/];
  for (const p of pats) { const m = t.match(p); if (m) { const lat = n(m[1]), lon = n(m[2]); if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon }; } }
  return /^https?:\/\//i.test(t) ? { url: t } : null;
}
const Alarme = {
  ctx: null, t: null, ativo: false,
  destrava() { try { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) {} },
  bip() {
    const c = this.ctx; if (!c || c.state !== 'running') return; const t0 = c.currentTime + 0.02;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -6; comp.connect(c.destination);
    [[1175, 0], [880, 0.16], [1175, 0.32], [880, 0.48], [1175, 0.64], [880, 0.8], [1175, 0.96], [880, 1.12]].forEach(([f, dt]) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + dt); g.gain.exponentialRampToValueAtTime(1, t0 + dt + 0.01); g.gain.setValueAtTime(1, t0 + dt + 0.13); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.15);
      o.connect(g); g.connect(comp); o.start(t0 + dt); o.stop(t0 + dt + 0.16);
    });
  },
  fala: null, falaN: 0,
  falar() { try { if (!this.fala || !('speechSynthesis' in window) || speechSynthesis.speaking) return; const u = new SpeechSynthesisUtterance(this.fala); u.lang = 'pt-BR'; u.rate = 0.95; u.volume = 1; speechSynthesis.speak(u); } catch (e) {} },
  tocar(titulo, texto, fala) {
    this.fala = fala || null;
    if (NATIVO && Nativo.p('AlarmeNativo')) { const k = titulo + '|' + texto + '|' + (fala || ''); if (this.ativo && this.motivo === k) return; this.ativo = true; this.motivo = k; Nativo.alarme(true, titulo || 'Técnico Plus', texto || 'Abra o app.', fala); $$('.alerta .topo').forEach(x => x.classList.add('toca')); return; }
    if (this.ativo) return; this.ativo = true; this.destrava();
    const ciclo = () => { if (!this.ativo) return; this.destrava(); if (this.fala && this.falaN++ % 4 === 0) this.falar(); else this.bip(); try { navigator.vibrate && navigator.vibrate([500, 150, 500, 150, 500]); } catch (e) {} };
    ciclo(); this.t = setInterval(ciclo, 2000); $$('.alerta .topo').forEach(x => x.classList.add('toca'));
  },
  parar() { if (!this.ativo) return; this.ativo = false; this.motivo = null; this.fala = null; this.falaN = 0; try { 'speechSynthesis' in window && speechSynthesis.cancel(); } catch (e) {} if (NATIVO) Nativo.alarme(false); clearInterval(this.t); try { navigator.vibrate && navigator.vibrate(0); } catch (e) {} $$('.alerta .topo').forEach(x => x.classList.remove('toca')); },
  revisa() {
    if (ADMIN) return; if (semLogin()) { this.parar(); return; }
    const l = [...S.atvs.values()].filter(a => (a.status === 'pendente' || a.status === 'recebida') && !a.vistaEm && !atvFutura(a) && !(S.ronda && S.ronda.atividadeId === a.id));
    const atv = l.length > 0; const exp = expAtrasado(), ref = refEstourada(), upd = !!updVencida();
    const esc = escadaVencida(); const deve = esc || atv || exp || ref || upd;
    if (NATIVO) Nativo.fundo();
    if (esc) this.tocar('Modo escada: você está bem?', 'Toque em ESTOU BEM no app. Sem resposta, o supervisor é avisado.', 'Modo escada. Confirme que você está bem.'); else if (deve) { const a1 = l[0]; this.tocar(ref ? 'Tempo de refeição encerrado' : exp ? 'Expediente não iniciado' : atv ? `Nova O.S. ${a1 && a1.ticket ? a1.ticket : ''}`.trim() : 'Atualize a O.S. em andamento', ref ? 'Volte ao app e encerre a refeição.' : exp ? 'Inicie o expediente no app.' : atv ? `${a1 ? atvTitulo(a1) : ''}${a1 && distTxt(a1) ? ' · ' + distTxt(a1).replace(/ \(.*\)$/, '') : ''} · Toque e confirme "O.S. recebida".` : 'O supervisor pediu a atualização da O.S. Informe a situação.', atv && !ref && !exp ? 'Nova O S recebida. Iniciar deslocamento.' : null); } else this.parar();
    const bn = $('#atvBanner'); if (bn) { bn.hidden = esc || !deve || !$('#atvAlerta').hidden; const sp = bn.querySelector('span'); if (sp) sp.textContent = ref ? 'Tempo de refeição encerrado' : exp ? 'Expediente não iniciado' : upd && !atv ? 'O supervisor pediu atualização da O.S.' : 'Atividade aguardando início do deslocamento'; bn.dataset.motivo = upd && !atv && !ref && !exp ? 'upd' : ref ? 'ref' : exp ? 'exp' : 'atv'; }
  }
};
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => Alarme.destrava(), { passive: true }));
document.addEventListener('click', e => { if (!ADMIN || !e.target.closest || !e.target.closest('#dAv') || !Nuvem.admin) return; let inp = $('#admFotoIn'); if (!inp) { document.body.insertAdjacentHTML('beforeend', '<input type="file" id="admFotoIn" accept="image/*" hidden>'); inp = $('#admFotoIn');
  inp.onchange = async () => { const f = inp.files[0]; inp.value = ''; if (!f) return; try { const d = await fotoPerfilDe(f); await Nuvem.adminFoto(d); Nuvem.admin.foto = d; $('#dAv').innerHTML = avIn(d, Nuvem.admin.nome); toast('Foto de perfil salva.'); } catch (x) { toast('Não salvou a foto: ' + (x.message || x) + (/admin_foto/.test(x.message || '') ? ' (rode o supabase.sql novo)' : ''), 7000); } }; } inp.click(); });
async function notificaAtv(a) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const o = { body: `${a.ocorrencia || ''} ${atvRef(a) || a.endereco || ''}`.trim() || 'Toque para abrir', tag: 'atv-' + a.id, renotify: true, requireInteraction: true, vibrate: [500, 150, 500, 150, 500], icon: 'icon-192.png', badge: 'icon-192.png' };
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) reg.showNotification(`Nova atividade ${atvEmerg(a) ? 'EMERGENCIAL' : 'preventiva'} · ${a.ticket || ''}`, o); else new Notification(`Nova atividade · ${a.ticket || ''}`, o);
  } catch (e) {}
}
async function guardaAtv(a) { S.atvs.set(a.id, a); await DB.putRaw('meta', { ...a, id: 'atv:' + a.id, _atv: true }); }
async function esqueceAtv(id) { S.atvs.delete(id); await DB.delRaw('meta', 'atv:' + id); }
async function atvStatus(a, status, extra = {}) {
  if (!a) return; Object.assign(a, extra, { status, atualizado: Date.now() }); await guardaAtv(a); Nuvem.enfileira(a._apoio ? 'apo' : 'atv', 'atv:' + a.id);
}
async function recebeAtv(a, inicial) {
  if (ADMIN || !a) return;
  const me = Nuvem.user && Nuvem.user.id; const meu = me && a.tecnicoUid === me;
  if (!meu && me && (a.apoioUids || []).includes(me)) {
    // apoio: a situação dele é própria; a atividade some quando o principal conclui (se ele não estiver nela)
    const stA0 = (a.apoioSt || {})[me]; const stA = stA0 === 'vista' ? 'recebida' : stA0; const emCampo = S.ronda && S.ronda.atividadeId === a.id;
    a = { ...a, _apoio: true, vistaEm: stA0 === 'vista' ? a.atualizado || Date.now() : null, /* o ciente do apoio é dele, não do principal */ statusPrincipal: a.status, status: a.status === 'cancelada' ? 'cancelada' : stA || (a.status === 'concluida' && !emCampo ? 'concluida' : 'pendente') };
    if (a.statusPrincipal === 'concluida' && !emCampo && !['em_deslocamento', 'no_local'].includes(stA)) a.status = 'concluida';
  }
  if ((!meu && !a._apoio) || a.status === 'cancelada' || (a._apoio && a.status === 'concluida')) { const tinha = S.atvs.has(a.id); await esqueceAtv(a.id); if (tinha && a.status === 'cancelada') toast(`Atividade ${a.ticket || ''} cancelada pelo supervisor.`, 5000); if (S.alertaId === a.id) fechaAlerta(); Alarme.revisa(); if (S.view === 'home') render(); return; }
  const loc = S.atvs.get(a.id); if (loc && (loc.atualizado || 0) > (a.atualizado || 0)) { if (loc.status !== a.status) a = { ...a, status: loc.status }; } if (loc && loc.vistaEm && !a.vistaEm) a = { ...a, vistaEm: loc.vistaEm, atualizacoes: loc.atualizacoes || a.atualizacoes };
  const nova = !loc;
  await guardaAtv(a);
  if (S.ronda && S.ronda.atividadeId === a.id && a.log && S.ronda.atvLog !== a.log) { S.ronda.atvLog = a.log; saveRonda(true); }
  if (a.status === 'pendente') { await atvStatus(a, 'recebida', { recebidaEm: Date.now() }); }
  if ((nova || a.status === 'recebida') && (a.status === 'recebida' || a.status === 'pendente') && !a.vistaEm && !atvFutura(a) && !(S.ronda && S.ronda.atividadeId === a.id)) {
    if (nova && !inicial) notificaAtv(a);
    if (!S.alertaId) mostraAlerta(a);
  }
  Alarme.revisa(); if (S.view === 'home') { const y = window.scrollY; render(); window.scrollTo(0, y); }
}
// sem login (tela de entrar): nenhum alerta ou alarme aparece por cima
const semLogin = () => !ADMIN && (!!S.precisaLogin || S.view === 'entrar');
function mostraAlerta(a) {
  if (semLogin()) return;
  const el = $('#atvAlerta'); if (!el || !a) return; S.alertaId = a.id;
  const ocupado = !!S.ronda && S.ronda.atividadeId !== a.id; const em = atvEmerg(a); const g = gpsUrl(a), w = gpsUrl(a, 'waze');
  const kv = (k, v) => v ? `<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>` : '';
  const rt = a.rotaId ? rotaById(a.rotaId) : null; const pend = a.status === 'pendente' || a.status === 'recebida';
  el.innerHTML = `<div class="box" role="alertdialog" aria-modal="true" aria-labelledby="alT"><div class="topo ${em ? '' : 'prev'} ${Alarme.ativo ? 'toca' : ''}"><small>${a._apoio ? '🤝 APOIO · ' : ''}${pend && !a.vistaEm ? 'NOVA ATIVIDADE' : 'ATIVIDADE'} · ${em ? 'EMERGENCIAL' : atvImpl(a) ? 'IMPLANTAÇÃO · ' + esc((IMPL_SERV[a.servico] || '').toUpperCase()) : 'PREVENTIVA'}</small><b id="alT">${esc(a.ticket || 'Sem ticket')}</b><span>Enviada às ${fHora(a.criado)}${a.criadoPorNome ? ' por ' + esc(a.criadoPorNome) : ''} · ${esc(stAtv(a))}</span></div>
    <div class="corpo">${a._apoio ? `<div class="okbox small"><b>Você é apoio nesta O.S.</b> O técnico principal é <b>${esc(a.tecnicoNome || '—')}</b>: ele lança a produção. Registre seu deslocamento e chegada normalmente.</div>` : (a.apoioNomes || []).length ? `<div class="okbox small">Equipe de apoio: <b>${esc(a.apoioNomes.join(', '))}</b></div>` : ''}${logTag(a.log)}${atvImpl(a) ? kv('Designação', a.designacao) + kv('Projeto', a.projeto) + kv('Sites', [a.siteA, a.siteB].filter(Boolean).join(' ⇄ ')) : ''}${a.cliente === 'Claro' ? kv('Cliente', 'Claro' + (a.programada ? ' · programada' : ' · emergencial')) + kv('Node', a.node) + kv('Rede', a.rede) + kv('Solicitante', a.solicitante) : a.cliente ? kv('Cliente', a.cliente) + kv('Chamado', [a.ticket, a.tsk].filter(Boolean).join(' / ')) + kv('Trecho', a.trecho) + kv('Ponta A', a.pontaA) + kv('Ponta B', a.pontaB) + kv('Designação', a.designacao) + kv('Equipamento', a.equipamento) + kv('Horário da falha', a.dataAcionamento) : ''}${kv('Faturamento', CENTROS[a.centro])}${kv('Ocorrência', a.ocorrencia)}${kv('Referência', atvRef(a))}${kv('Rota', rt ? rotaLb(rt) : '')}${kv('Endereço', a.endereco)}${kv('Descrição', a.descricao)}
      ${ticketAcionHtml(a)}
      ${distOSHtml(a)}
      ${pend && !a._apoio ? (() => { const pr = (S.pedRem || new Map()).get(a.id); return `<div class="kv"><span>Agendada para</span><b>${esc(fDiaCurto(agendaDe(a)))}</b></div>${pr && pr.status === 'pedido' ? `<div class="warnbox small">Remanejamento para <b>${esc(fDiaCurto(pr.dados.para))}</b> aguardando o gestor.</div>` : `<details><summary class="small" style="cursor:pointer;min-height:36px;display:flex;align-items:center;color:var(--accent);font-weight:600">Pedir para remanejar para outro dia</summary><div class="grid2"><div class="field"><label class="lb" for="remDia">Novo dia</label><input type="date" id="remDia" min="${isoDate(Date.now())}" value="${isoDate(Date.now() + 86400000)}"></div><div class="field"><label class="lb" for="remMot">Motivo</label><input type="text" id="remMot" placeholder="Ex.: sem acesso hoje"></div></div><button type="button" class="btn block" id="bRemPede">Enviar pedido ao gestor</button></details>`}`; })() : ''}
      ${g ? `<div class="row"><a class="btn pri" href="${esc(g)}" target="_blank" rel="noopener">${ICON.pin}Abrir no GPS</a>${w ? `<a class="btn" href="${esc(w)}" target="_blank" rel="noopener">Waze</a>` : ''}</div>` : '<p class="muted small" style="margin:0">Sem endereço ou localização. Use a referência da rota.</p>'}
      ${pend && !a.vistaEm ? `<button type="button" class="btn go block" id="alVista">${ICON.check}O.S. recebida</button><p class="muted small" style="margin:0">Avisa o supervisor que você viu a O.S. e para o alarme. Em seguida você informa o odômetro para liberar o deslocamento.</p><button type="button" class="btn block" id="alMin">Minimizar (o alarme continua até confirmar)</button>`
        : pend ? `<div class="okbox small">Você confirmou o recebimento às ${fHora(a.vistaEm)}.</div>${ocupado ? `<p class="muted small" style="margin:0">Encerre a atividade atual para iniciar o deslocamento desta.</p><button type="button" class="btn block" id="alMin">Fechar</button>` : `<button type="button" class="btn go block" id="alIniciar">${ICON.play}Informar odômetro e iniciar deslocamento</button><button type="button" class="btn block" id="alMin">Fechar</button>`}`
        : `<button type="button" class="btn block" id="alMin">Fechar</button>`}
    </div></div>`;
  el.hidden = false; const bn = $('#atvBanner'); if (bn) bn.hidden = true; try { posLeve(); } catch (e) {} pintaAnexos(el);
  $('#alIniciar') && ($('#alIniciar').onclick = () => atenderAtv(a));
  $('#alVista') && ($('#alVista').onclick = async () => { await confirmaVista(a); Alarme.revisa(); if (S.ronda && S.ronda.atividadeId !== a.id) { fechaAlerta(); toast('Recebimento enviado ao supervisor. Encerre a atividade atual para iniciar esta.', 6000); if (S.view === 'home') render(); return; } toast('Recebimento enviado ao supervisor. Agora informe o odômetro.', 5000); atenderAtv(a); });
  $('#alMin') && ($('#alMin').onclick = () => { fechaAlerta(); Alarme.revisa(); });
  $('#bRemPede') && ($('#bRemPede').onclick = async () => { const para = $('#remDia').value, mot = $('#remMot').value.trim(); if (!para) { toast('Escolha o dia.'); return; } if (para === agendaDe(a)) { toast('Escolha um dia diferente.'); return; } if (!mot) { toast('Escreva o motivo.'); $('#remMot').focus(); return; } if (!Nuvem.on) { toast('Sem internet: conecte para pedir.'); return; }
    const pd = { id: 'rem_' + a.id + '_' + Date.now(), org: Nuvem.org(), tipo: 'remanejar', ref_id: a.id, tecnico_uid: Nuvem.user.id, tecnico_nome: S.perfil.nome, dados: { titulo: atvTitulo(a), de: agendaDe(a), para, deTxt: fDiaCurto(agendaDe(a)), paraTxt: fDiaCurto(para), motivo: mot }, status: 'pedido', criado: Date.now() };
    try { await Nuvem.pedCriar(pd); S.pedRem = S.pedRem || new Map(); S.pedRem.set(a.id, pd); toast('Pedido enviado ao gestor.'); mostraAlerta(a); } catch (e) { toast('Não foi possível enviar: ' + (e.message || e), 6000); } });
  setTimeout(() => { const b = $('#alVista') || $('#alIniciar') || $('#alMin'); b && b.focus(); }, 50);
}
/* ---------- distância pelo trajeto de carro (OSRM / OpenStreetMap) ---------- */
// Rota de carro com tempo estimado. Se o serviço de rotas não responder, mostra a linha reta como reserva.
const OSRM = 'https://router.project-osrm.org';
const fMin = s => { const m = Math.max(1, Math.round(s / 60)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${pad2(m % 60)}`; };
const fRota = r => `${fDist(r.m)} · ${fMin(r.s)} de carro`;
const Rota = {
  cache: new Map(), pend: new Map(), tecs: new Map(), tecsPend: new Set(),
  k: (a, b) => [a.lat, a.lon, b.lat, b.lon].map(x => (+x).toFixed(3)).join(','),
  async busca(url) { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000); try { const r = await fetch(url, { signal: ctl.signal }); clearTimeout(t); if (!r.ok) return null; const j = await r.json(); return j && j.code === 'Ok' ? j : null; } catch (e) { clearTimeout(t); return null; } },
  // rota de um ponto até a O.S. (fica em cache por ~110 m de deslocamento)
  de(a, b, depois) {
    if (!a || !b || a.lat == null || b.lat == null) return null; const k = this.k(a, b); const c = this.cache.get(k);
    if (c && Date.now() - c.ts < 20 * 60000) return c.r;
    if (!this.pend.has(k)) { this.pend.set(k, true); this.busca(`${OSRM}/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`).then(j => { this.pend.delete(k); const rt = j && j.routes && j.routes[0]; this.cache.set(k, { ts: Date.now(), r: rt ? { m: rt.distance, s: rt.duration } : null }); depois && depois(); }); }
    return c ? c.r : undefined; // undefined = calculando
  },
  // rota de vários técnicos até a mesma O.S. (uma consulta só)
  paraTecs(a, pos, depois) {
    if (!a || a.lat == null || !pos.length) return null; const k = (+a.lat).toFixed(4) + ',' + (+a.lon).toFixed(4); const c = this.tecs.get(k);
    if (c && Date.now() - c.ts < 5 * 60000) return c.m;
    if (!this.tecsPend.has(k)) { this.tecsPend.add(k); const coords = [[a.lon, a.lat], ...pos.map(p => [p.lon, p.lat])].map(x => x.join(',')).join(';');
      this.busca(`${OSRM}/table/v1/driving/${coords}?sources=${pos.map((_, i) => i + 1).join(';')}&destinations=0&annotations=distance,duration`).then(j => { this.tecsPend.delete(k); const m = new Map(); if (j) pos.forEach((p, i) => { const s2 = j.durations && j.durations[i] && j.durations[i][0], d = j.distances && j.distances[i] && j.distances[i][0]; if (s2 != null && d != null) m.set(p.uid, { m: d, s: s2 }); }); this.tecs.set(k, { ts: Date.now(), m, falhou: !j }); depois && depois(); }); }
    return c ? c.m : null;
  }
};
function posTecs() { const agora = Date.now(); return [...(S.vivo || new Map()).values()].filter(v => v.lat != null && agora - (v.ts || 0) < 3 * 3600000).map(v => ({ uid: v._uid, lat: v.lat, lon: v.lon })); }
let reRotaT = null; const reRota = () => { clearTimeout(reRotaT); reRotaT = setTimeout(() => { if (S.view === 'admAtv' || S.view === 'acion' || S.view === 'adm') { const y = window.scrollY; render(); window.scrollTo(0, y); } }, 150); };
function minhaPos() { const g = S.gps && S.gps.last; return g && g.lat != null && Date.now() - (g.ts || Date.now()) < 30 * 60000 ? g : null; }
function distOS(a) { const g = minhaPos(); return g && a && a.lat != null && a.lon != null ? hav(g, a) : null; }
function distTxt(a) { const g = minhaPos(); if (!g || !a || a.lat == null) return null; const r = Rota.de(g, a, () => pintaDistOS()); if (r) return fRota(r); const d = hav(g, a); return r === undefined ? `calculando a rota… (~${fDist(d)} em linha reta)` : `~${fDist(d)} em linha reta (rota indisponível)`; }
function distOSHtml(a, cls = '') { if (!a || a.lat == null) return ''; const t = distTxt(a); return `<div class="kv ${cls}" data-distos="${a.id}"><span>Distância até a O.S.</span><b>${t != null ? esc(t) : 'aguardando o GPS…'}</b></div>`; }
function pintaDistOS() { $$('[data-distos]').forEach(el => { const a = S.atvs.get(el.dataset.distos); if (!a) return; const t = distTxt(a); const b = el.querySelector('b'); if (b) b.textContent = t != null ? t : 'aguardando o GPS…'; }); }
setInterval(() => { try { if (!ADMIN) pintaDistOS(); } catch (e) {} }, 10000);
async function confirmaVista(a) {
  if (!a || a.vistaEm) return; const now = Date.now(); const u = { ts: now, sit: 'recebida', txt: 'Técnico confirmou o recebimento da O.S.', prev: '', por: S.perfil.nome };
  const g = minhaPos(); const rt = g && a.lat != null ? Rota.de(g, a) : null; const d = rt ? rt.m : distOS(a); if (d != null) { u.txt += rt ? ` · a ${fRota(rt)} do local` : ` · a ~${fDist(d)} do local (linha reta)`; }
  await atvStatus(a, a.status === 'pendente' ? 'recebida' : a.status, { vistaEm: now, recebidaEm: a.recebidaEm || now, distVista: d != null ? Math.round(d) : null, tempoVista: rt ? Math.round(rt.s) : null, atualizacoes: [...(a.atualizacoes || []), u].slice(-60) });
}
function fechaAlerta() { const el = $('#atvAlerta'); if (el) { el.hidden = true; el.innerHTML = ''; el.dataset.est = ''; } S.alertaId = null; if (S.view === 'home') { const bn = $('#atvBanner'); if (bn) bn.hidden = !Alarme.ativo; } }
function atenderAtv(a) {
  if (!a.vistaEm) { mostraAlerta(a); return; }
  if (S.ronda) { fechaAlerta(); Alarme.revisa(); toast('Encerre a atividade atual para iniciar esta.', 6000); go('home'); return; }
  S.atvPend = a.id; S.modo = atvEmerg(a) ? 'corretiva' : atvImpl(a) ? 'implantacao' : 'preventiva';
  if (a.cliente) { S.perfil.ultDono = 'parceiro'; S.perfil.ultParc = a.cliente; DB.put('meta', S.perfil); }
  if (atvImpl(a)) S.im = { designacao: a.designacao || a.ticket || '', servico: a.servico || 'roteamento', projeto: a.projeto || '', siteA: a.siteA || '', siteB: a.siteB || '' };
  S.cr = { cliente: a.cliente || '', ticket: a.ticket || '', ocorrencia: a.ocorrencia || '', descricao: a.descricao || '', refKm: a.refKm || '', refLocal: a.refLocal || '', refSentido: a.refSentido || '' };
  if (a.rotaId && rotaById(a.rotaId)) { S.perfil.rotaId = a.rotaId; const rt = rotaById(a.rotaId); if (rt.dono) { S.perfil.ultDono = rt.dono; S.perfil.ultParc = rt.parceiro || ''; } DB.put('meta', S.perfil); }
  fechaAlerta(); go('home');
  setTimeout(() => { const o = $('#odoIni'); if (o) { o.scrollIntoView({ block: 'center' }); o.focus(); } }, 120);

}
async function vinculaAtividade(r, now) {
  if (S.atvPend && S.atvs.get(S.atvPend)) {
    const a = S.atvs.get(S.atvPend); r.atividadeId = a.id; r.atvLog = a.log || null; S.atvPend = null; S.ciente.delete(a.id);
    if (a.wfc) r.wfc = a.wfc; if (a.wf2) r.wf2 = a.wf2; if (a.centro) r.centro = a.centro; if (a.projeto) r.projeto = a.projeto; if (a.rede) r.rede = a.rede; if (a.cliente && !a._apoio) r.clienteAtv = a.cliente;
    if (a._apoio) { r.apoio = true; r.apoioDe = a.tecnicoNome || ''; } else if ((a.apoioNomes || []).length) r.apoioNomes = a.apoioNomes;
    await atvStatus(a, 'em_deslocamento', { iniciadaEm: now, rondaId: r.id });
  } else if (isCorr(r)) {
    const a = { id: 'atv-' + r.id, criado: now, origem: 'tecnico', tipo: 'emergencial', status: 'em_deslocamento', tecnicoUid: Nuvem.user ? Nuvem.user.id : null, tecnicoNome: r.tecnico, ticket: r.ticket, ocorrencia: r.ocorrencia, descricao: r.descricao, rotaId: r.rotaId || '', refSentido: r.refSentido, refKm: r.refKm, refLocal: r.refLocal, iniciadaEm: now, rondaId: r.id };
    r.atividadeId = a.id; await atvStatus(a, 'em_deslocamento');
  }
  S.atvPend = null;
}
async function atvChegou(loc) {
  const r = S.ronda; if (!r || !r.atividadeId) return; const a = S.atvs.get(r.atividadeId); if (!a || a.status === 'no_local') return;
  const extra = { chegadaEm: Date.now() }; if (loc && a.lat == null) { extra.lat = loc.lat; extra.lon = loc.lon; }
  await atvStatus(a, 'no_local', extra);
}
async function atvConcluiu(r) { if (!r || !r.atividadeId) return; const a = S.atvs.get(r.atividadeId); if (!a) return; await atvStatus(a, 'concluida', { concluidaEm: Date.now() }); S.atvs.delete(a.id); }
async function ativarAlertas(silencioso) {
  if (NATIVO && Nativo.p('AlarmeNativo')) { let pri = false; try { pri = !localStorage.getItem('permNativas'); } catch (e) {} const ok = await Nativo.permissoes(pri || !silencioso); try { localStorage.setItem('permNativas', '1'); } catch (e) {} Nativo.fundo(); if (!silencioso) toast(ok ? 'Alarmes ativados. Pode minimizar o app: eles continuam tocando.' : 'Libere as notificações do Técnico Plus nas configurações do Android.', 7000); return ok; }
  try {
    if (!('Notification' in window)) { if (!silencioso) toast('Este celular não suporta alertas. No iPhone, adicione o app à tela de início primeiro.', 7000); return false; }
    let p = Notification.permission; if (p === 'default') p = await Notification.requestPermission();
    if (p !== 'granted') { if (!silencioso) toast('Alertas bloqueados. Libere as notificações do site nas configurações do navegador.', 7000); return false; }
    const ok = await Nuvem.assinarPush(); if (!silencioso) toast(ok ? 'Alertas ativados: você recebe as atividades mesmo com o app fechado.' : window.VAPID_PUBLIC ? 'Não foi possível ativar agora. Tente com internet.' : 'Alertas com o app fechado ainda não configurados pelo supervisor.', 6000);
    if (S.view === 'perfil') render(); return ok;
  } catch (e) { return false; }
}
// Sem atividade, o GPS contínuo fica desligado; durante o expediente o app pega a posição a cada minuto
// para o supervisor ver o técnico no mapa.
let posLeveBusy = false;
function posLeve() {
  if (ADMIN || !S.exp || (S.ronda && !S.ronda.fim) || posLeveBusy || !('geolocation' in navigator) || document.hidden) return;
  posLeveBusy = true;
  navigator.geolocation.getCurrentPosition(p => { posLeveBusy = false; S.gps.last = { lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6), ts: Date.now(), acc: Math.round(p.coords.accuracy || 0) }; Nuvem.aoVivo(true); try { pintaDistOS(); } catch (e) {} },
    () => { posLeveBusy = false; }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 30000 });
}
setInterval(posLeve, 60000); document.addEventListener('visibilitychange', () => { if (!document.hidden) posLeve(); });
async function iniciarExpediente(auto, jaChecou) {
  if (S.exp) return; Alarme.destrava();
  if (!S.perfil.nome.trim()) { toast('Crie seu perfil antes.'); go('perfil'); return; }
  if (!jaChecou && !(await checaCasa())) return;
  S.exp = { id: uid(), inicio: Date.now(), tecnico: S.perfil.nome, matricula: S.perfil.matricula, distCasa: S.distCasa ?? null };
  await DB.putRaw('meta', { id: 'expAtual', exp: S.exp }); await DB.putRaw('meta', { ...S.exp, id: 'exp:' + S.exp.id }); Nuvem.enfileira('exp', 'exp:' + S.exp.id);
  ativarAlertas(true);
  wakeOn(); Nuvem.aoVivo(true); setTimeout(posLeve, 1500); if (NATIVO) Nativo.fundo(); if (!auto) { toast(NATIVO ? 'Expediente iniciado. Pode minimizar o app: as O.S. e os alarmes continuam chegando.' : 'Expediente iniciado. Mantenha o app aberto para receber as atividades.', 5000); render(); }
}
async function encerrarExpediente() {
  if (!S.exp) return; if (S.ronda) { toast('Encerre a atividade em andamento antes.'); return; }
  if (!confirm('Encerrar o expediente? Você deixa de receber atividades.')) return;
  const e = { ...S.exp, fim: Date.now() }; await DB.putRaw('meta', { ...e, id: 'exp:' + e.id }); Nuvem.enfileira('exp', 'exp:' + e.id);
  if (refAtiva()) e.refeicao.fim = e.fim; if (S.escada && S.escada.ativo) escadaDesativar(); S.exp = null; S.expFimDia = hojeIso(); await DB.putRaw('meta', { id: 'expAtual', exp: null, fimDia: S.expFimDia }); wakeOff(); Alarme.parar(); if (NATIVO) Nativo.fundo(); Nuvem.aoVivo(true); toast('Expediente encerrado às ' + fHora(e.fim) + '.'); render();
}
function expBarHtml(comFim) {
  const r = refAtiva(), J = jornada();
  if (r) return `<div class="expbar" style="background:var(--warn-soft)"><span class="dot" style="background:#d9a400;box-shadow:0 0 0 4px rgba(217,164,0,.2)"></span><span>Em refeição desde <b>${fHora(r.ini)}</b> · volta às <b>${fHora(r.ini + J.refeicaoMin * 60000)}</b> · <span id="refRest" class="clock"></span></span><button type="button" class="btn" id="bRefFim" style="margin-left:auto;min-height:42px">Encerrar refeição</button></div>`;
  return `<div class="expbar"><span class="dot"></span><span>Expediente desde <b>${fHora(S.exp.inicio)}</b></span><button type="button" class="btn" id="bRefIni" style="margin-left:auto;min-height:42px">Refeição (${J.refeicaoMin} min)</button>${comFim ? '<button type="button" class="lnk" id="bExpFim">Encerrar expediente</button>' : ''}</div>`;
}
function minhasAtvHtml() {
  const l = [...S.atvs.values()].filter(atvAberta).filter(a => !(S.ronda && S.ronda.atividadeId === a.id)).sort((x, y) => (atvFutura(x) - atvFutura(y)) || agendaDe(x).localeCompare(agendaDe(y)) || (atvEmerg(y) - atvEmerg(x)) || (atvImpl(x) - atvImpl(y)) || x.criado - y.criado);
  if (!l.length) return '';
  return `<section class="acts"><div class="ah"><span>Minhas atividades</span><span class="muted small" style="font-weight:500">${l.filter(atvEmerg).length} emerg. · ${l.filter(a => a.tipo === 'preventiva').length} prev. · ${l.filter(atvImpl).length} impl.</span></div>
    ${l.map(a => `<button type="button" class="act ${atvEmerg(a) ? 'nc' : atvImpl(a) ? 'done' : 'pend'}" data-atv="${a.id}"><span class="st"></span><span class="tm">${fHora(a.criado)}<span>${atvEmerg(a) ? 'Emerg.' : atvImpl(a) ? 'Impl.' : 'Prev.'}</span></span><span class="bd"><b>${a._apoio ? '🤝 Apoio · ' : ''}${esc(atvTitulo(a))}</b><span>${a._apoio ? 'Principal: ' + esc(a.tecnicoNome || '—') + ' · ' : (a.apoioNomes || []).length ? 'Apoio: ' + esc(a.apoioNomes.join(', ')) + ' · ' : ''}${esc(atvSub(a))}</span></span><span class="ic">${logTag(a.log)}${atvFutura(a) ? `<span class="pill">📅 ${esc(fDiaCurto(a.agendaDia))}</span>` : `<span class="pill ${a.status === 'recebida' || a.status === 'pendente' ? 'bad' : 'ok'}">${stAtv(a)}</span>`}${ICON.next}</span></button>`).join('')}</section>`;
}


/* ---------- jornada (expediente obrigatório) e refeição ---------- */
function jornada(ts = Date.now()) { const R = S.recurso && S.recurso.escala; if (R && !ADMIN) { const t = R[new Date(ts).getDay()]; const dias = [0, 1, 2, 3, 4, 5, 6].filter(d => R[d] && R[d].e); return { inicio: t ? t.e : '00:00', fim: t ? t.s : '00:00', refeicaoMin: +((window.JORNADA || {}).refeicaoMin) || 60, dias }; } const j = window.JORNADA || {}; return { inicio: j.inicio || '08:00', fim: j.fim || '18:00', refeicaoMin: +j.refeicaoMin || 60, dias: Array.isArray(j.dias) && j.dias.length ? j.dias : [0, 1, 2, 3, 4, 5, 6] }; }
const hm = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
function emJornada(ts = Date.now()) { const J = jornada(ts), d = new Date(ts), m = d.getHours() * 60 + d.getMinutes(); return J.dias.includes(d.getDay()) && m >= hm(J.inicio) && m < hm(J.fim); }
const hojeIso = () => isoDate(Date.now());
function expAtrasado() { if (ADMIN || !S.perfil.nome || S.exp) return false; if (S.expFimDia === hojeIso() || folgaHoje()) return false; return emJornada(); }
function refAtiva() { return S.exp && S.exp.refeicao && !S.exp.refeicao.fim ? S.exp.refeicao : null; }
function refEstourada() { const r = refAtiva(); return !!(r && Date.now() - r.ini >= jornada().refeicaoMin * 60000); }
async function salvaExp() { await DB.putRaw('meta', { id: 'expAtual', exp: S.exp }); await DB.putRaw('meta', { ...S.exp, id: 'exp:' + S.exp.id }); Nuvem.enfileira('exp', 'exp:' + S.exp.id); }
async function iniciarRefeicao() {
  if (!S.exp) { toast('Inicie o expediente antes.'); return; } if (refAtiva()) return;
  if (!confirm(`Iniciar a refeição agora? O alarme toca em ${jornada().refeicaoMin} minutos.`)) return;
  const now = Date.now(); S.exp.refeicao = { ini: now }; S.exp.refeicoes = [...(S.exp.refeicoes || []), { ini: now }];
  if (S.ronda) { S.ronda.refeicoes = [...(S.ronda.refeicoes || []), { ini: now }]; saveRonda(true); }
  await salvaExp(); Nuvem.aoVivo(true); toast(`Bom almoço! Volta às ${fHora(now + jornada().refeicaoMin * 60000)}.`, 5000); render();
}
async function encerrarRefeicao() {
  const r = refAtiva(); if (!r) return; const now = Date.now(); r.fim = now;
  const l = S.exp.refeicoes || []; if (l.length) l[l.length - 1].fim = now;
  if (S.ronda && (S.ronda.refeicoes || []).length) { const rr = S.ronda.refeicoes; if (!rr[rr.length - 1].fim) rr[rr.length - 1].fim = now; saveRonda(true); }
  S.exp.refeicao = null; await salvaExp(); fechaAviso(); Alarme.revisa(); Nuvem.aoVivo(true); toast(`Refeição encerrada (${Math.round((now - r.ini) / 60000)} min).`); render();
}
const ATUALIZA_MIN = 60; // o técnico atualiza a O.S. em andamento a cada 60 min
const SIT_OS = { deslocamento: 'Em deslocamento', execucao: 'No local, em execução', material: 'Aguardando material', acesso: 'Aguardando acesso / liberação', equipe: 'Aguardando outra equipe', clima: 'Parado por chuva / clima', finalizando: 'Finalizando / testes' };
function atvEmCurso() { const r = S.ronda; if (!r || r.fim || !r.atividadeId) return null; const a = S.atvs.get(r.atividadeId); return a && !a._apoio && atvAberta(a) ? a : null; }
// a atualização só é pedida quando o supervisor cobra (botão no painel); o técnico pode atualizar quando quiser
function updVencida() { const a = atvEmCurso(); if (!a) return null; return +a.cobrarAtualizEm && +a.cobrarAtualizEm > (+a.ultAtualiz || 0) ? a : null; }
async function salvarAtualizacao(a, sit, txt, prev) {
  const now = Date.now(); const u = { ts: now, sit, txt: String(txt || '').trim(), prev: prev || '', por: S.perfil.nome };
  const lista = [...(a.atualizacoes || []), u].slice(-60);
  await atvStatus(a, a.status, { atualizacoes: lista, ultAtualiz: now, situacao: sit, previsao: prev || '' });
  if (S.ronda && !S.ronda.fim) { S.ronda.atualizacoes = [...(S.ronda.atualizacoes || []), u].slice(-60); saveRonda(true); }
  Nuvem.aoVivo(true);
}
function mostraAviso(tipo) {
  if (semLogin()) return;
  if (tipo === 'upd') {
    const el = $('#atvAlerta'); const a = atvEmCurso(); if (!el || !a) return; S.alertaId = 'aviso:upd';
    const ult = a.ultAtualiz || a.iniciadaEm || S.ronda.inicio; const min = Math.round((Date.now() - ult) / 60000);
    el.innerHTML = `<div class="box" role="alertdialog" aria-modal="true" aria-labelledby="avT"><div class="topo prev ${Alarme.ativo ? 'toca' : ''}"><small>${a.cobrarAtualizEm && a.cobrarAtualizEm > (a.ultAtualiz || 0) ? 'O SUPERVISOR PEDIU ATUALIZAÇÃO' + (a.cobrarPor ? ' · ' + esc(String(a.cobrarPor).toUpperCase()) : '') : 'ATUALIZAR A O.S.'}</small><b id="avT">${esc(a.ticket || 'O.S. em andamento')}</b><span>Última atualização há ${fHm(min)}</span></div>
      <div class="corpo"><div class="field"><label class="lb" for="upSit">Situação agora</label><select id="upSit">${Object.entries(SIT_OS).map(([k, l]) => `<option value="${k}" ${(a.situacao || (a.status === 'no_local' ? 'execucao' : 'deslocamento')) === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label class="lb" for="upTxt">O que foi feito / o que falta</label>${respostasHtml('upTxt', RESP_UPD)}<textarea id="upTxt" rows="3" placeholder="Ex.: localizado o rompimento no km 12, iniciando as fusões"></textarea></div>
      <div class="field"><label class="lb" for="upPrev">Previsão de término</label><input type="time" id="upPrev" value="${esc(a.previsao || '')}"></div>
      <button type="button" class="btn go block" id="avOk">${ICON.check}Enviar atualização</button><p class="muted small" style="margin:0">${a.cobrarAtualizEm && a.cobrarAtualizEm > (a.ultAtualiz || 0) ? 'O alarme só para depois da atualização.' : 'A atualização vai direto para o supervisor.'}</p></div></div>`;
    el.hidden = false; const bn = $('#atvBanner'); if (bn) bn.hidden = true;
    $('#avOk').onclick = async () => { const txt = $('#upTxt').value; if (String(txt).trim().length < 5) { toast('Escreva rapidamente o que foi feito ou o que falta.'); $('#upTxt').focus(); return; } await salvarAtualizacao(a, $('#upSit').value, txt, $('#upPrev').value); fechaAlerta(); Alarme.revisa(); toast('Atualização enviada ao supervisor.'); if (S.view === 'home') render(); };
    setTimeout(() => $('#upTxt') && $('#upTxt').focus(), 50); return;
  }
  const el = $('#atvAlerta'); if (!el) return; S.alertaId = 'aviso:' + tipo; const J = jornada(); const r = refAtiva();
  const cfg = tipo === 'exp'
    ? { cor: '', sup: 'EXPEDIENTE NÃO INICIADO', tit: `Seu expediente começa às ${J.inicio}`, txt: 'Inicie o expediente para receber as atividades do dia. O alarme só para quando você iniciar.', bt: `<button type="button" class="btn go block" id="avOk">${ICON.play}Iniciar expediente</button>` }
    : { cor: 'prev', sup: 'TEMPO DE REFEIÇÃO ENCERRADO', tit: `Refeição desde ${fHora(r ? r.ini : Date.now())}`, txt: `Já se passaram ${r ? Math.round((Date.now() - r.ini) / 60000) : J.refeicaoMin} minutos. Encerre a refeição para voltar ao trabalho.`, bt: `<button type="button" class="btn go block" id="avOk">${ICON.check}Encerrar refeição e voltar</button>` };
  el.innerHTML = `<div class="box" role="alertdialog" aria-modal="true" aria-labelledby="avT"><div class="topo ${cfg.cor} ${Alarme.ativo ? 'toca' : ''}"><small>${cfg.sup}</small><b id="avT">${esc(cfg.tit)}</b><span>${fHora(Date.now())}</span></div><div class="corpo"><p style="margin:0">${esc(cfg.txt)}</p>${cfg.bt}</div></div>`;
  el.hidden = false; const bn = $('#atvBanner'); if (bn) bn.hidden = true;
  $('#avOk').onclick = async () => { fechaAviso(); if (tipo === 'exp') await iniciarExpediente(); else await encerrarRefeicao(); Alarme.revisa(); };
  setTimeout(() => $('#avOk') && $('#avOk').focus(), 50);
}
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#bUpd')) mostraAviso('upd'); });
function fechaAviso() { if (String(S.alertaId || '').startsWith('aviso:')) fechaAlerta(); }
function checaJornada() {
  if (ADMIN) return; if (semLogin()) { if (S.alertaId) fechaAlerta(); return; }
  const exp = expAtrasado(), ref = refEstourada();
  if (ref && !S.alertaId) { mostraAviso('ref'); notificaAviso('Tempo de refeição encerrado', 'Encerre a refeição para voltar ao trabalho.'); }
  else if (exp && !S.alertaId) { mostraAviso('exp'); notificaAviso('Expediente não iniciado', `Seu expediente começa às ${jornada().inicio}. Abra o app e inicie.`); }
  const upd = updVencida(); if (upd && !S.alertaId) { mostraAviso('upd'); notificaAviso('Atualize a O.S. ' + (upd.ticket || ''), `${upd.cobrarPor || 'O supervisor'} pediu a atualização da O.S. Abra o app e informe a situação.`); }
  if (!exp && S.alertaId === 'aviso:exp') fechaAlerta(); if (!ref && S.alertaId === 'aviso:ref') fechaAlerta(); if (!upd && S.alertaId === 'aviso:upd') fechaAlerta();
  const J = jornada(), d = new Date(), m = d.getHours() * 60 + d.getMinutes();
  if (S.exp && !S.ronda && m >= hm(J.fim) && S.lembreteFim !== hojeIso()) { S.lembreteFim = hojeIso(); Alarme.destrava(); Alarme.bip(); notificaAviso('Fim do expediente', `São ${J.fim}. Encerre o expediente no app.`); toast(`São ${J.fim}: lembre de encerrar o expediente.`, 8000); }
  Alarme.revisa();
  const rc = $('#refRest'); const r = refAtiva(); if (rc && r) { const rest = r.ini + J.refeicaoMin * 60000 - Date.now(); rc.textContent = rest > 0 ? `faltam ${Math.floor(rest / 60000)}:${pad2(Math.floor(rest / 1000) % 60)}` : `passou ${Math.floor(-rest / 60000)} min`; }
}
async function notificaAviso(t, b) { try { if (!('Notification' in window) || Notification.permission !== 'granted') return; const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); const o = { body: b, tag: 'aviso-' + t, renotify: true, requireInteraction: true, vibrate: [500, 150, 500, 150, 500], icon: 'icon-192.png' }; if (reg) reg.showNotification(t, o); else new Notification(t, o); } catch (e) {} }
setInterval(() => checaJornada(), 15000);
setInterval(() => { const rc = $('#refRest'), r = refAtiva(); if (rc && r) { const rest = r.ini + jornada().refeicaoMin * 60000 - Date.now(); rc.textContent = rest > 0 ? `faltam ${Math.floor(rest / 60000)}:${pad2(Math.floor(rest / 1000) % 60)}` : `passou ${Math.floor(-rest / 60000)} min`; } }, 1000);




/* ---------- produção pela LPU (lista de preços unitários) ---------- */
const LPUI = (() => { const m = new Map(); ((window.LPU || {}).itens || []).forEach(([c, u, d, v, t]) => m.set(c, { c, u, d, v, t, n: normLocal(c + ' ' + d) })); return m; })();
const lpuGrupo = c => { const it = LPUI.get(c); const g = String(c).split('.')[0]; const L = window.LPU || {}; return it && it.t === 'M' ? (L.gruposM || {})[g] || 'Materiais ' + g : (L.gruposS || {})[g] || 'Serviços ' + g; };
const fBRL = v => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fQtd = q => (+q || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const LPU_SUG = { corretiva: /EMENDA|LANÇAMENTO CABOS ÓPTICOS|ESPINAMENTO|TESTES|CORDOALHA|RETENCIONAMENTO/, implantacao: /CAIXA EMENDA|NAP|ACEITAÇÃO|TESTES|LANÇAMENTO CABOS ÓPTICOS|CARACTERIZAÇÃO/, preventiva: /LEVANTAMENTO|VISTORIA|PODA|ROÇADA|CAPINA|ADEQUAÇÃO/ };
// Corretiva da Claro: só o item de SERVIÇO entra no valor; material é só consumo de estoque.
const claroCorr = i => !!i && i.tipo === 'corretiva' && (/claro/i.test(String((i.corr && i.corr.cliente) || '')) || (!!i.info && i.info.dono === 'parceiro' && /claro/i.test(String(i.info.parceiro || ''))));
const ehMat = x => x.t ? x.t === 'M' : ((LPUI.get(x.c) || {}).t === 'M');
// Centro de custo / faturamento da O.S.
//  claro_sp e claro_int: pagas pela LPU. backbone: manutenção com preço fechado; só o lançamento de cabo
//  acima de 500 m na O.S. é cobrado pela LPU (o resto está coberto pelo contrato).
const CENTROS = { claro_sp: 'Contrato Claro SP (LPU)', claro_int: 'Contrato Claro interior (LPU)', backbone: 'Manutenção backbone (preço fechado)' };
const FRANQUIA_BB = 500;
const centroOS = i => (i && i.centro) || '';
// corretiva ou O.S. vinda de atividade cadastrada: o centro de custo é de quem cadastrou, não do técnico
const centroTravado = i => !!i && (isCorr(i) || !!i.centroAtv || i.centro === 'claro_sp');
const ehLanc = x => /^LAN[ÇC]AMENTO CABOS/i.test(String(x.d || (LPUI.get(x.c) || {}).d || '')) && String(x.u || (LPUI.get(x.c) || {}).u || '').toUpperCase() === 'M';
const lpuEst = (i, x) => (claroCorr(i) || centroOS(i) === 'backbone') && ehMat(x);
function lpuValores(i) {
  const bb = centroOS(i) === 'backbone'; let fr = FRANQUIA_BB;
  return (i.lpu || []).map(x => { const q = +x.q || 0, v = +x.v || 0; if (lpuEst(i, x)) return { v: 0, k: 'estoque' }; if (!bb) return { v: q * v, k: '' }; if (!ehLanc(x)) return { v: 0, k: 'contrato' };
    const usa = Math.min(fr, q); fr -= usa; return { v: (q - usa) * v, k: usa ? 'franquia' : '', franq: usa, cobra: q - usa }; });
}
const vItem = (i, x) => { const k = (i.lpu || []).indexOf(x); return k < 0 ? (lpuEst(i, x) ? 0 : (+x.q || 0) * (+x.v || 0)) : lpuValores(i)[k].v; };
const lpuNota = (r, x) => r.k === 'estoque' ? 'consumo de estoque' : r.k === 'contrato' ? 'coberto pelo contrato' : r.k === 'franquia' ? `${fQtd(r.franq)} m na franquia de ${FRANQUIA_BB} m${r.cobra ? ` · cobra ${fQtd(r.cobra)} m` : ''}` : '';
const valorOS = i => i && i.apoio ? 0 : (i.lpu || []).reduce((a, x) => a + vItem(i, x), 0);
function lpuSugestoes(i) {
  const uso = S.perfil.lpuUso || {}; const usados = Object.entries(uso).sort((a, b) => b[1] - a[1]).map(([c]) => LPUI.get(c)).filter(Boolean).slice(0, 8);
  const re = LPU_SUG[i.tipo || 'preventiva'] || LPU_SUG.preventiva; const sug = [...LPUI.values()].filter(x => x.t === 'S' && re.test(x.d) && !usados.includes(x)).slice(0, 10 - Math.min(usados.length, 6));
  return { usados, sug };
}
function lpuLinha(x, i) { const ja = (i.lpu || []).find(l => l.c === x.c); return `<div class="item" style="cursor:default;padding:10px 4px;flex-wrap:wrap"><span class="badge" style="border-radius:6px;width:auto;min-width:46px;padding:0 6px;font-size:12.5px;background:${x.t === 'M' ? 'var(--warn-soft)' : 'var(--accent-soft)'};color:${x.t === 'M' ? 'var(--orange)' : 'var(--accent)'}">${esc(x.c)}</span><span class="tx" style="flex:1 1 180px;min-width:180px"><b style="white-space:normal;font-weight:500;font-size:14.5px">${esc(x.d)}</b><span>${x.t === 'M' ? 'Material' : 'Serviço'} · ${lpuEst(i, x) ? 'consumo de estoque (sem valor na O.S.)' : `${fBRL(x.v)} por ${esc(x.u)}`}${ja ? ` · <b style="color:var(--ok)">lançado: ${fQtd(ja.q)}</b>` : ''}</span></span><span class="row" style="flex-wrap:nowrap;gap:6px;margin-left:auto;justify-content:flex-end"><input type="text" inputmode="decimal" data-lpuqn="${esc(x.c)}" placeholder="Qtd (${esc(x.u || 'un')})" aria-label="Quantidade de ${esc(x.c)}" style="width:96px;min-height:44px;text-align:center"><button type="button" class="btn go" data-lpuadd="${esc(x.c)}" style="min-height:44px;padding:0 12px">${ja ? '+ Somar' : '+ Adicionar'}</button></span></div>`; }
function lpuResultados(i) {
  const q = normLocal(S.lpuBusca || ''); const tab = S.lpuTab || 'S';
  if (!q) { const { usados, sug } = lpuSugestoes(i); return (usados.length ? `<h3>Mais usados por você</h3>${usados.map(x => lpuLinha(x, i)).join('')}` : '') + `<h3>Sugestões para esta atividade</h3>${sug.map(x => lpuLinha(x, i)).join('') || '<p class="empty">Busque pelo código ou pela descrição.</p>'}`; }
  const ws = q.split(/\s+/).filter(Boolean); const r = [...LPUI.values()].filter(x => (tab === 'T' || x.t === tab) && ws.every(w => x.n.includes(w))).slice(0, 40);
  return r.length ? r.map(x => lpuLinha(x, i)).join('') : '<p class="empty">Nada encontrado. Tente outra palavra ou troque entre Serviços e Materiais.</p>';
}
function lpuSelHtml(i) {
  const l = i.lpu || []; if (!l.length) return '<p class="muted small" style="margin:0">Nenhum item lançado ainda.</p>';
  const VV = lpuValores(i);
  return l.map((x, k) => `<div class="item" style="cursor:default;align-items:center;flex-wrap:wrap;padding:10px 4px"><span class="badge" style="border-radius:6px;width:auto;min-width:46px;padding:0 6px;font-size:12.5px">${esc(x.c)}</span><span class="tx" style="min-width:150px"><b style="white-space:normal;font-weight:500;font-size:14.5px">${esc(x.d)}</b><span>${VV[k].k === 'estoque' || VV[k].k === 'contrato' ? `${esc(x.u)} · <b style="color:var(--orange)">${lpuNota(VV[k])}</b>` : `${fBRL(x.v)} por ${esc(x.u)} · <b style="color:var(--ink)">${fBRL(VV[k].v)}</b>${VV[k].k ? ` · <span style="color:var(--orange)">${lpuNota(VV[k])}</span>` : ''}`}</span></span>
    <span class="row" style="flex-wrap:nowrap;gap:6px;margin-left:auto"><button type="button" class="btn" data-lpumenos="${k}" aria-label="Diminuir" style="min-height:44px;min-width:44px;padding:0">−</button><input type="text" inputmode="decimal" data-lpuq="${k}" value="${fQtd(x.q)}" aria-label="Quantidade de ${esc(x.c)}" style="width:76px;text-align:center;min-height:44px"><button type="button" class="btn" data-lpumais="${k}" aria-label="Aumentar" style="min-height:44px;min-width:44px;padding:0">+</button><button type="button" class="btn stop" data-lpudel="${k}" aria-label="Remover" style="min-height:44px;min-width:44px;padding:0">✕</button></span></div>`).join('');
}
function stepLpu(i) {
  if (i.apoio) return `<section class="card"><h2><span class="num">R$</span>Produção executada</h2><div class="okbox"><b>Você está como apoio nesta O.S.</b> A produção da LPU é lançada pelo técnico principal${i.apoioDe ? ` (<b>${esc(i.apoioDe)}</b>)` : ''}. Seu deslocamento, km e horas ficam registrados normalmente.</div></section>`;
  i.lpu = i.lpu || []; const L = window.LPU || {};
  return `<section class="card"><h2><span class="num">R$</span>Produção executada</h2><p class="muted small" style="margin:0">Lance os serviços e materiais da LPU feitos nesta atividade. Eles entram na produção do ciclo (dia 16 ao dia 15). ${esc(L.regiao || '')} · vigência ${esc(L.vigencia || '')}.</p>
    ${centroTravado(i) ? `<div class="field"><span class="lb">Centro de custo / faturamento</span><b>${esc(CENTROS[centroOS(i)] || 'A definir pelo supervisor')}</b><span class="muted small">Definido por quem cadastrou a atividade${isCorr(i) ? ' (corretiva)' : ''}.</span></div>` : `<div class="field"><span class="lb">Centro de custo / faturamento</span><div class="seg" role="group" aria-label="Centro de custo">${Object.entries(CENTROS).map(([k, l]) => `<button type="button" data-centro="${k}" aria-pressed="${centroOS(i) === k}">${l.replace(' (preço fechado)', '').replace(' (LPU)', '')}</button>`).join('')}</div></div>`}
    ${centroOS(i) === 'backbone' ? `<div class="warnbox small"><b>Manutenção backbone (preço fechado):</b> o atendimento já está pago pelo contrato. Só o <b>lançamento de cabo acima de ${FRANQUIA_BB} m</b> nesta O.S. é cobrado pela LPU. Material conta como consumo de estoque.</div>` : ''}
    ${claroCorr(i) ? '<div class="warnbox small"><b>Corretiva Claro:</b> só os <b>serviços</b> entram no valor da O.S. Material lançado aqui conta apenas como <b>consumo de estoque</b>.</div>' : ''}
    <div class="field"><label class="lb" for="lpuBusca">Buscar na LPU</label><input type="search" id="lpuBusca" value="${esc(S.lpuBusca || '')}" placeholder="Código ou descrição (ex.: emenda, 2.11, cordoalha)" autocomplete="off"></div>
    <div class="seg" role="group" aria-label="Tipo de item"><button type="button" data-lputab="S" aria-pressed="${(S.lpuTab || 'S') === 'S'}">Serviços</button><button type="button" data-lputab="M" aria-pressed="${S.lpuTab === 'M'}">Materiais</button><button type="button" data-lputab="T" aria-pressed="${S.lpuTab === 'T'}">Todos</button></div>
    <div class="list" id="lpuRes">${lpuResultados(i)}</div></section>
  <section class="card"><div class="row" style="justify-content:space-between"><h2>Lançados nesta atividade</h2><span class="pill done" id="lpuCount">${(i.lpu || []).length} item(ns) · ${fBRL(valorOS(i))}</span></div><div class="list" id="lpuSel">${lpuSelHtml(i)}</div></section>`;
}
function afterLpu(i) {
  if (i.apoio) return;
  $$('[data-centro]').forEach(b => b.onclick = () => { if (centroTravado(i)) return; i.centro = i.centro === b.dataset.centro ? '' : b.dataset.centro; saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
  const pintaSel = () => { $('#lpuSel').innerHTML = lpuSelHtml(i); $('#lpuCount').textContent = `${i.lpu.length} item(ns) · ${fBRL(valorOS(i))}`; bindSel(); };
  const pintaRes = () => { $('#lpuRes').innerHTML = lpuResultados(i); bindRes(); };
  const salva = () => { saveInsp(); const st = $('.steps [aria-current="step"]'); if (st) st.classList.toggle('done', i.lpu.length > 0); };
  const bindRes = () => { $$('[data-lpuqn]').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = el.parentElement.querySelector('[data-lpuadd]'); b && b.click(); } }));
    $$('[data-lpuadd]').forEach(b => b.onclick = () => {
    const x = LPUI.get(b.dataset.lpuadd); if (!x) return; const ja = i.lpu.find(l => l.c === x.c);
    const qi = b.parentElement.querySelector('[data-lpuqn]'); const qv = qi && String(qi.value).trim() ? kmNum(qi.value) : 1; if (qv == null || qv <= 0) { toast('Quantidade inválida.'); return; }
    if (ja) ja.q = +(+ja.q + qv).toFixed(2); else i.lpu.push({ c: x.c, d: x.d, u: x.u, v: x.v, t: x.t, q: +qv.toFixed(2) });
    S.perfil.lpuUso = { ...(S.perfil.lpuUso || {}), [x.c]: ((S.perfil.lpuUso || {})[x.c] || 0) + 1 }; DB.put('meta', S.perfil);
    salva(); pintaSel(); pintaRes(); toast(`${x.c}: ${fQtd(qv)} ${x.u || ''} lançado(s).`, 2500);
  }); };
  const bindSel = () => {
    $$('[data-lpumais]').forEach(b => b.onclick = () => { const x = i.lpu[+b.dataset.lpumais]; x.q = +(+x.q + 1).toFixed(2); salva(); pintaSel(); });
    $$('[data-lpumenos]').forEach(b => b.onclick = () => { const x = i.lpu[+b.dataset.lpumenos]; x.q = Math.max(0, +(+x.q - 1).toFixed(2)); if (!x.q) i.lpu.splice(+b.dataset.lpumenos, 1); salva(); pintaSel(); pintaRes(); });
    $$('[data-lpudel]').forEach(b => b.onclick = () => { i.lpu.splice(+b.dataset.lpudel, 1); salva(); pintaSel(); pintaRes(); });
    $$('[data-lpuq]').forEach(el => el.addEventListener('change', () => { const v = kmNum(el.value); const x = i.lpu[+el.dataset.lpuq]; if (v == null || v <= 0) { el.value = fQtd(x.q); toast('Quantidade inválida.'); return; } x.q = +v.toFixed(2); el.value = fQtd(x.q); salva(); pintaSel(); }));
  };
  let t; $('#lpuBusca').addEventListener('input', e => { S.lpuBusca = e.target.value; clearTimeout(t); t = setTimeout(pintaRes, 150); });
  $$('[data-lputab]').forEach(b => b.onclick = () => { S.lpuTab = b.dataset.lputab; $$('[data-lputab]').forEach(x => x.setAttribute('aria-pressed', x === b)); pintaRes(); });
  bindRes(); bindSel();
}


/* ---------- metas por dupla e fechamento ---------- */
const METAS_PADRAO = { custo: 15000, minimo: 25000, ideal: 30000, perfeito: 35000, diasUteis: 22, encargos: 0 };
function metas() { const m = (S.metas || {}).metas || {}; const n = k => kmNum(m[k]) ?? METAS_PADRAO[k]; return { custo: n('custo'), minimo: n('minimo'), ideal: n('ideal'), perfeito: n('perfeito'), diasUteis: n('diasUteis') || 22, encargos: n('encargos') || 0 }; }
function duplas() { return ((S.metas || {}).duplas || []).filter(d => d && (d.uids || []).length); }
function duplaDe(uid) { return duplas().find(d => d.uids.includes(uid)) || null; }
// Fechamento: do dia 16 ao dia 15 do mês seguinte.
const CICLO_DIA = 16;
function cicloDe(ts = Date.now(), k = 0) { const d = new Date(ts); let m = d.getMonth() + k; if (d.getDate() < CICLO_DIA) m -= 1; const y = d.getFullYear(); return [isoDate(new Date(y, m, CICLO_DIA).getTime() + 43200000), isoDate(new Date(y, m + 1, CICLO_DIA - 1).getTime() + 43200000)]; }
const nDias = (de, ate) => Math.round((diaIni(ate) - diaIni(de)) / 86400000) + 1;
const fDM = d => d.split('-').reverse().join('/');
function ciclosAtalhos(com7) {
  const [c0, c1] = cicloDe(); const [p0, p1] = cicloDe(Date.now(), -1); const d0 = new Date(diaIni(c0)); const fimM = isoDate(new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getTime() + 43200000); const ini2 = c1.slice(0, 8) + '01';
  return [['Ciclo atual', c0, c1], ['Ciclo anterior', p0, p1], [`16 a ${fimM.slice(8)}/${fimM.slice(5, 7)}`, c0, fimM], [`01 a 15/${c1.slice(5, 7)}`, ini2, c1], ...(com7 ? [['Últimos 7 dias', isoDate(Date.now() - 6 * 86400000), isoDate(Date.now())]] : [])];
}
function fatorPeriodo(de, ate) { const [c0, c1] = cicloDe(diaIni(de) + 43200000); return Math.min(1, nDias(de, ate) / nDias(c0, c1)) || 1; }
// Projeção: no ritmo atual, quanto o período fecha (só enquanto o período está em andamento).
function projecao(v, de, ate) { const hoje = isoDate(Date.now()); if (hoje < de || hoje >= ate) return null; const pass = nDias(de, hoje), tot = nDias(de, ate); return pass > 0 && pass < tot ? v / pass * tot : null; }
function faixa(v, M, f = 1) {
  const c = M.custo * f, mi = M.minimo * f, id = M.ideal * f, pf = M.perfeito * f;
  if (v >= pf) return { k: 'perfeito', txt: 'Perfeito', cor: '#7a3fa0', prox: null };
  if (v >= id) return { k: 'ideal', txt: 'Ideal', cor: 'var(--ok)', prox: ['perfeito', pf] };
  if (v >= mi) return { k: 'minimo', txt: 'Mínimo atingido', cor: 'var(--accent)', prox: ['ideal', id] };
  if (v >= c) return { k: 'custo', txt: 'Cobre o custo', cor: '#d9a400', prox: ['mínimo', mi] };
  return { k: 'abaixo', txt: 'Abaixo do custo', cor: 'var(--bad)', prox: ['custo', c] };
}
function metaBarra(v, M, f = 1, proj = null) {
  const pf = M.perfeito * f, top = Math.max(pf * 1.1, v, proj || 0, 1); const fx = faixa(v, M, f); const pos = x => Math.min(100, x / top * 100);
  const marcas = [['Custo', M.custo * f, '#d9a400'], ['Mínimo', M.minimo * f, 'var(--accent)'], ['Ideal', M.ideal * f, 'var(--ok)'], ['Perfeito', pf, '#7a3fa0']]; const fp = proj != null ? faixa(proj, M, f) : null;
  return `<div class="meta" role="img" aria-label="Produção ${fBRL(v)}: ${fx.txt}"><div class="meta-tr"><span class="meta-f" style="width:${pos(v)}%;background:${fx.cor}"></span>${proj != null && proj > v ? `<span class="meta-p" style="left:${pos(v)}%;width:${pos(proj) - pos(v)}%"></span>` : ''}${marcas.map(([l, x]) => `<i style="left:${pos(x)}%" title="${l}: ${fBRL(x)}"></i>`).join('')}</div>
    <div class="meta-lg">${marcas.map(([l, x, c]) => `<span><i style="background:${c}"></i>${l} <b>${fBRL(x).replace(',00', '')}</b></span>`).join('')}</div>
    <div class="row" style="justify-content:space-between"><b style="color:${fx.cor}">${fx.txt}</b><span class="muted small">${fx.prox ? `Faltam ${fBRL(fx.prox[1] - v)} para o ${fx.prox[0]}` : 'Meta máxima atingida'}</span></div>
    ${fp ? `<div class="muted small">No ritmo atual, o período fecha em <b style="color:${fp.cor}">${fBRL(proj)}</b> (${fp.txt.toLowerCase()}).</div>` : ''}</div>`;
}
function operacaoPorTec() {
  const A = S.adm; const m = new Map();
  const nomeDe = uid => (A.tecnicos.find(t => t.uid === uid) || {}).nome;
  const get = (uid, nome) => { const k = uid || nome; if (!m.has(k)) m.set(k, { uid, nome: nomeDe(uid) || nome || '—', dias: new Set(), kmOdo: 0, kmGps: 0, rondas: 0, semOdo: 0, prod: 0, S: 0, M: 0, ativ: new Set() }); return m.get(k); };
  const a0 = diaIni(A.de), a1 = diaFim(A.ate);
  [...DB.mem.rondas.values()].forEach(r => { if (A.tec && r._uid !== A.tec) return; const o = get(r._uid, r.tecnico); o.rondas++; o.dias.add(isoDate(r.inicio)); const g = totais(r).t.km; o.kmGps += g; const od = odoInfo(r); if (od && od.odo >= 0) o.kmOdo += od.odo; else { o.kmOdo += g; o.semOdo++; } });
  (S.exps || []).forEach(e => { if (e.inicio < a0 || e.inicio > a1 || (A.tec && e.uid !== A.tec)) return; get(e.uid, e.tecnico).dias.add(isoDate(e.inicio)); });
  biLinhas().forEach(r => { const o = get(r.uid, r.tec); o.prod += r.total; o[r.t] += r.total; o.ativ.add(r.inspId); });
  return [...m.values()].map(o => { const dp = duplaDe(o.uid); return { ...o, dupla: dp ? dp.nome : '', nDias: o.dias.size, prodKm: o.kmOdo > 0 ? o.prod / o.kmOdo : null }; }).sort((a, b) => b.prod - a.prod || a.nome.localeCompare(b.nome));
}
function operacaoPorDupla() {
  const ops = operacaoPorTec(); const M = metas(); const f = fatorPeriodo(S.adm.de, S.adm.ate); const out = [];
  duplas().forEach(d => { const os = ops.filter(o => d.uids.includes(o.uid)); const prod = os.reduce((a, o) => a + o.prod, 0); out.push({ nome: d.nome, tecs: d.uids.map(u => (S.adm.tecnicos.find(t => t.uid === u) || {}).nome || '—'), prod, km: os.reduce((a, o) => a + o.kmOdo, 0), custo: M.custo * f, resultado: prod - M.custo * f, fx: faixa(prod, M, f) }); });
  ops.filter(o => !duplaDe(o.uid)).forEach(o => out.push({ nome: o.nome + ' (sem dupla)', tecs: [o.nome], prod: o.prod, km: o.kmOdo, custo: M.custo * f / 2, resultado: o.prod - M.custo * f / 2, fx: faixa(o.prod * 2, M, f), solo: true }));
  return out.sort((a, b) => b.prod - a.prod);
}
function custoDiaTec() { const M = metas(); return M.custo / (M.diasUteis || 22) / 2; }
function fechamentoHtml() {
  const A = S.adm; const M = metas(); const f = fatorPeriodo(A.de, A.ate); const ops = operacaoPorTec(); const dps = operacaoPorDupla();
  const T = { prod: ops.reduce((a, o) => a + o.prod, 0), km: ops.reduce((a, o) => a + o.kmOdo, 0) }; const custoT = dps.reduce((a, d) => a + d.custo, 0);
  const atalhos = ciclosAtalhos(true);
  const fechs = ((S.cfg || {}).fechamentos || []).slice(-6).reverse(); const tecs = A.tecnicos || [];
  return `<section class="card"><h2>Fechamento do período</h2>
    <div class="chips" role="group" aria-label="Período">${atalhos.map(([l, d, a]) => `<button type="button" data-fper="${d}|${a}" aria-checked="${A.de === d && A.ate === a}">${l}</button>`).join('')}</div>
    <div class="grid3"><div class="field"><label class="lb" for="fDe">De</label><input type="date" id="fDe" value="${A.de}"></div><div class="field"><label class="lb" for="fAte">Até</label><input type="date" id="fAte" value="${A.ate}"></div>
    <div class="field"><label class="lb" for="fTec">Técnico</label><select id="fTec"><option value="">Todos os técnicos</option>${tecs.map(t => `<option value="${t.uid}" ${A.tec === t.uid ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div></div>
    <button type="button" class="btn pri" id="bFAplica">Aplicar período</button>
    <p class="muted small" style="margin:0">Fechamento do dia 16 ao dia 15 do mês seguinte.${f < 1 ? ` Período parcial: metas proporcionais (${Math.round(f * 100)}% do ciclo).` : ''}</p></section>
  <section class="card"><h2>Metas por equipe</h2>
    <div class="stats"><div class="stat"><b>${fBRL(T.prod)}</b><span>Produção LPU</span></div><div class="stat"><b>${fBRL(custoT)}</b><span>Custo das duplas</span></div><div class="stat"><b style="color:${T.prod - custoT < 0 ? 'var(--bad)' : 'var(--ok)'}">${fBRL(T.prod - custoT)}</b><span>Resultado</span></div><div class="stat"><b>${fKm(T.km)}</b><span>Km rodados</span></div></div>
    ${dps.length ? dps.map(d => `<div class="card" style="box-shadow:none;border:1px solid var(--line);gap:6px"><div class="row" style="justify-content:space-between"><b>${esc(d.nome)}</b><span class="muted small">${esc(d.tecs.join(' + '))} · ${fKm(d.km)} · resultado <b style="color:${d.resultado < 0 ? 'var(--bad)' : 'var(--ok)'}">${fBRL(d.resultado)}</b></span></div><div class="row" style="justify-content:space-between"><span style="font-size:20px;font-weight:700">${fBRL(d.prod)}</span>${d.solo ? '<span class="muted small">Sem dupla: meta comparada pela metade</span>' : ''}</div>${metaBarra(d.solo ? d.prod * 2 : d.prod, M, f, (() => { const pj = projecao(d.solo ? d.prod * 2 : d.prod, A.de, A.ate); return pj; })())}</div>`).join('') : '<p class="empty">Sem produção no período.</p>'}
    <details><summary style="cursor:pointer;font-weight:600;min-height:40px;display:flex;align-items:center">Configurar metas e equipes (MEC / FO)</summary>
      <p class="muted small" style="margin:4px 0">Valores por equipe para cada ciclo de fechamento (dia 16 ao dia 15). O custo já inclui salário da equipe e gastos do veículo. Escolha a equipe (MEC 1 a MEC 11, FO 1 a FO 5) e os integrantes: a equipe também fica gravada no cadastro de cada um.</p>
      <div class="grid3"><div class="field"><label class="lb" for="mCusto">Custo da operação (R$)</label><input type="text" inputmode="decimal" id="mCusto" value="${M.custo}"></div><div class="field"><label class="lb" for="mMin">Faturamento mínimo (R$)</label><input type="text" inputmode="decimal" id="mMin" value="${M.minimo}"></div><div class="field"><label class="lb" for="mIdeal">Ideal (R$)</label><input type="text" inputmode="decimal" id="mIdeal" value="${M.ideal}"></div>
      <div class="field"><label class="lb" for="mPerf">Perfeito (R$)</label><input type="text" inputmode="decimal" id="mPerf" value="${M.perfeito}"></div><div class="field"><label class="lb" for="mDias">Dias úteis no ciclo</label><input type="text" inputmode="numeric" id="mDias" value="${M.diasUteis}"></div><div class="field"><label class="lb" for="mEnc">Encargos sobre salário (%)</label><input type="text" inputmode="decimal" id="mEnc" value="${M.encargos}" placeholder="Ex.: 70"></div></div>
      <h3>Equipes</h3><div id="dpLista">${duplas().map((d, k) => duplaLinha(d, k, tecs)).join('')}</div>
      <div class="row"><button type="button" class="btn" id="bDpAdd">${ICON.plus}Vincular equipe</button><button type="button" class="btn pri" id="bMetaSalva">${ICON.check}Salvar metas e equipes</button></div></details></section>
  <div id="bonusBox"></div>
  ${ganhoHtml()}
  <section class="card"><h2>Por técnico</h2><div class="tw"><table class="t"><thead><tr><th>Técnico</th><th>Dupla</th><th class="r">Dias</th><th class="r">Km rodados</th><th class="r">Atividades</th><th class="r">Produção</th><th class="r">Produção por km</th><th></th></tr></thead><tbody>
    ${ops.map(o => `<tr><td>${esc(o.nome)}${o.semOdo ? ` <span class="muted small" title="Atividades sem odômetro: usado o km do GPS">(${o.semOdo} sem odôm.)</span>` : ''}</td><td>${esc(o.dupla || '—')}</td><td class="r">${o.nDias}</td><td class="r">${fKm(o.kmOdo)}</td><td class="r">${o.ativ.size}</td><td class="r"><b>${fBRL(o.prod)}</b></td><td class="r">${o.prodKm != null ? fBRL(o.prodKm) : '—'}</td><td><button type="button" class="btn" data-extec="${esc(o.uid || o.nome)}" style="min-height:36px;padding:0 10px">Extrato</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted">Sem atividades no período.</td></tr>'}</tbody></table></div>
    <div class="row"><button type="button" class="btn pri" id="bFecha">${ICON.check}Fechar período e gerar extratos</button><button type="button" class="btn" id="bExtPrev">Prévia dos extratos</button><button type="button" class="btn" id="bFechaCsv">Exportar fechamento para Excel</button></div>
    ${fechs.length ? `<h3>Fechamentos registrados</h3><div class="tw"><table class="t"><thead><tr><th>Período</th><th>Técnico</th><th class="r">Produção</th><th class="r">Km</th><th class="r">Custo</th><th class="r">Resultado</th><th>Registrado</th><th></th></tr></thead><tbody>${fechs.map(fc => `<tr><td>${fc.de.split('-').reverse().join('/')} a ${fc.ate.split('-').reverse().join('/')}</td><td>${esc(fc.tecNome || 'Todos')}</td><td class="r">${fBRL(fc.prod)}</td><td class="r">${fKm(fc.km)}</td><td class="r">${fBRL(fc.custo)}</td><td class="r">${fBRL(fc.prod - fc.custo)}</td><td>${fc.fechado ? '<span class="pill ok">Fechado</span> ' : ''}${fDH(fc.em)} · ${esc(fc.por || '')}</td><td>${fc.fechado ? `<button type="button" class="btn" data-fcext="${fc.em}" style="min-height:36px;padding:0 10px">Extratos</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>`;
}
// grava a equipe no cadastro de cada integrante (o técnico vê no perfil e nos relatórios)
async function vincularEquipes(dps) {
  try { if (!S.cads) S.cads = await Nuvem.cadLista(); } catch (e) { return; }
  const alvo = new Map(); dps.forEach(d => d.uids.forEach(u => alvo.set(u, d.nome)));
  for (const c of S.cads || []) { if (!c.uid || !alvo.has(c.uid) || c.equipe === alvo.get(c.uid)) continue; try { const n = await Nuvem.cadSalvar(c.id, { equipe: alvo.get(c.uid) }); Object.assign(c, n || { equipe: alvo.get(c.uid) }); } catch (e) {} }
  (S.adm.tecnicos || []).forEach(t => { if (alvo.has(t.uid)) t.equipe = alvo.get(t.uid); });
}
function duplaLinha(d, k, tecs) { const op = sel => `<option value="">—</option>${tecs.map(t => `<option value="${t.uid}" ${sel === t.uid ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}`; return `<div class="grid2" data-dp="${k}" style="align-items:end;margin-bottom:10px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))"><div class="field"><label class="lb">Equipe</label><select data-dpn>${eqOpts(d.nome || '', 'Escolha…')}</select></div><div class="field"><label class="lb">Integrante 1</label><select data-dpa>${op(d.uids[0])}</select></div><div class="field"><label class="lb">Integrante 2</label><select data-dpb>${op(d.uids[1])}</select></div><div class="field"><label class="lb">Integrante 3</label><select data-dpc>${op(d.uids[2])}</select></div></div>`; }
function afterFechamento() {
  const A = S.adm; const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  const aplica = async () => { const b = $('#bFAplica'); if (b) { b.disabled = true; b.textContent = 'Carregando…'; } try { await admCarregar(); } catch (e) { toast('Erro ao carregar: ' + e.message, 6000); } re(); };
  $$('[data-fper]').forEach(b => b.onclick = () => { const [d, a] = b.dataset.fper.split('|'); A.de = d; A.ate = a; aplica(); });
  $('#bFAplica').onclick = () => { A.de = $('#fDe').value || A.de; A.ate = $('#fAte').value || A.ate; A.tec = $('#fTec').value; aplica(); };
  $('#bDpAdd').onclick = () => { const k = $$('[data-dp]').length; $('#dpLista').insertAdjacentHTML('beforeend', duplaLinha({ nome: EQUIPES.find(e => !$$('[data-dpn]').some(x => x.value === e)) || '', uids: [] }, k, A.tecnicos || [])); };
  $('#bMetaSalva').onclick = async () => {
    const dps = $$('[data-dp]').map(el => ({ id: 'dp' + el.dataset.dp, nome: el.querySelector('[data-dpn]').value.trim(), uids: [el.querySelector('[data-dpa]').value, el.querySelector('[data-dpb]').value, (el.querySelector('[data-dpc]') || {}).value].filter(Boolean) })).filter(d => d.uids.length);
    if (dps.some(d => !d.nome)) { toast('Escolha a equipe (MEC ou FO) de cada linha.'); return; }
    if (new Set(dps.map(d => d.nome)).size !== dps.length) { toast('Há equipe repetida.'); return; }
    const usados = dps.flatMap(d => d.uids); if (new Set(usados).size !== usados.length) { toast('Um técnico está em mais de uma equipe.'); return; }
    S.metas = { ...(S.metas || {}), metas: { custo: $('#mCusto').value, minimo: $('#mMin').value, ideal: $('#mIdeal').value, perfeito: $('#mPerf').value, diasUteis: $('#mDias').value, encargos: $('#mEnc').value }, duplas: dps };
    try { await Nuvem.metasSalvar(S.metas); await vincularEquipes(dps); toast('Metas e equipes salvas.'); } catch (e) { toast('Erro: ' + e.message, 6000); } re();
  };
  $('#bFecha').onclick = async () => {
    const ops = operacaoPorTec(); const dps = operacaoPorDupla(); const T = { km: ops.reduce((a, o) => a + o.kmOdo, 0), prod: ops.reduce((a, o) => a + o.prod, 0), custo: dps.reduce((a, d) => a + d.custo, 0) };
    if (A.tec) { toast('Para fechar o período, escolha "Todos os técnicos" e aplique.', 6000); return; }
    const ja = ((S.cfg || {}).fechamentos || []).filter(f => f.fechado && f.de === A.de && f.ate === A.ate).pop();
    if (!confirm(`${ja ? `Este período já foi fechado em ${fDH(ja.em)}${ja.por ? ' por ' + ja.por : ''}. Fechar de novo?\n` : ''}Fechar o período de ${fDM(A.de)} a ${fDM(A.ate)} e gerar os extratos?\nProdução ${fBRL(T.prod)} · custo ${fBRL(T.custo)}.`)) return;
    const fc = { de: A.de, ate: A.ate, tec: A.tec || '', tecNome: A.tec ? S.perfil.nome : 'Todos', ...T, metas: metas(), porDupla: dps.map(d => ({ nome: d.nome, prod: +d.prod.toFixed(2), custo: +d.custo.toFixed(2), faixa: d.fx.txt })), porTec: ops.map(o => ({ uid: o.uid || '', nome: o.nome, dupla: o.dupla || '', dias: o.nDias, km: +o.kmOdo.toFixed(1), os: o.ativ.size, prod: +o.prod.toFixed(2) })), em: Date.now(), por: (Nuvem.admin && Nuvem.admin.nome) || '', fechado: true };
    S.cfg = { ...(S.cfg || {}), fechamentos: [...((S.cfg || {}).fechamentos || []), fc].slice(-60) };
    try { await Nuvem.cfgSalvar(S.cfg); toast('Período fechado. Gerando os extratos…', 4000); } catch (e) { toast('Erro: ' + e.message, 6000); re(); return; }
    await baixarExtratos(fc); re();
  };
  $('#bExtPrev').onclick = () => baixarExtratos(null);
  $('#bGanhoCsv') && ($('#bGanhoCsv').onclick = ganhoCsv);
  $$('[data-extec]').forEach(b => b.onclick = () => baixarExtratoTec(b.dataset.extec));
  $$('[data-fcext]').forEach(b => b.onclick = async () => { const fc = ((S.cfg || {}).fechamentos || []).find(f => String(f.em) === b.dataset.fcext); if (!fc) return;
    if (A.de !== fc.de || A.ate !== fc.ate || A.tec) { A.de = fc.de; A.ate = fc.ate; A.tec = ''; b.disabled = true; b.textContent = 'Carregando…'; try { await admCarregar(); } catch (e) { toast('Erro ao carregar: ' + e.message, 6000); re(); return; } }
    await baixarExtratos(fc); re(); });
  $('#bFechaCsv').onclick = () => {
    const ops = operacaoPorTec(); const dps = operacaoPorDupla(); const n = v => (+v || 0).toFixed(2).replace('.', ','); const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`; const per = `${A.de.split('-').reverse().join('/')} a ${A.ate.split('-').reverse().join('/')}`;
    const csv = '﻿' + [['Período', 'Dupla', 'Técnicos', 'Produção', 'Custo', 'Resultado', 'Faixa', 'Km'].join(';'), ...dps.map(d => [per, q(d.nome), q(d.tecs.join(' + ')), n(d.prod), n(d.custo), n(d.resultado), q(d.fx.txt), n(d.km)].join(';')), '', ['Período', 'Técnico', 'Dupla', 'Dias', 'Km rodados', 'Km GPS', 'Serviços', 'Materiais', 'Produção'].join(';'), ...ops.map(o => [per, q(o.nome), q(o.dupla), o.nDias, n(o.kmOdo), n(o.kmGps), n(o.S), n(o.M), n(o.prod)].join(';'))].join('\r\n');
    baixar(new File([csv], `Fechamento_${A.de}_a_${A.ate}.csv`, { type: 'text/csv' }));
  };
}

/* ---------- roteiro diário do técnico ---------- */
function roteiroDia(uid, dia) {
  const d0 = diaIni(dia), d1 = d0 + 86400000; const linhas = []; const T = { kmGps: 0, kmOdo: 0, desl: 0, local: 0, ref: 0, prod: 0, ativ: 0 };
  const exps = (S.exps || []).filter(e => e.uid === uid && e.inicio < d1 && (e.fim || Date.now()) > d0);
  exps.forEach(e => { linhas.push({ ts: e.inicio, tipo: 'exp', txt: 'Início do expediente', det: e.distCasa != null ? `a ${fDist(e.distCasa)} da residência` : '' }); if (e.fim) linhas.push({ ts: e.fim, tipo: 'exp', txt: 'Fim do expediente', det: fDur(e.fim - e.inicio) + ' de expediente' }); (e.refeicoes || []).forEach(r => { linhas.push({ ts: r.ini, tipo: 'ref', txt: 'Refeição', det: r.fim ? `${fHora(r.ini)}–${fHora(r.fim)} · ${fDur(r.fim - r.ini)}` : 'em andamento' }); if (r.fim) T.ref += r.fim - r.ini; }); });
  const rs = [...DB.mem.rondas.values()].filter(r => r._uid === uid && r.inicio >= d0 && r.inicio < d1).sort((a, b) => a.inicio - b.inicio);
  rs.forEach(r => {
    T.ativ++; const od = odoInfo(r); if (od && od.odo >= 0) T.kmOdo += od.odo;
    linhas.push({ ts: r.inicio, tipo: 'ini', txt: `Início · ${tipoLb(r)}${r.ticket ? ' ' + r.ticket : r.designacao ? ' ' + r.designacao : ''}`, det: `${veicTxt(r.veiculo) || ''}${r.odoIni ? ' · odômetro ' + fOdo(kmNum(r.odoIni)) : ''}` });
    segmentos(r).forEach(sg => { T.kmGps += sg.km; T.desl += sg.fim - sg.ini; const lb = t => isCorr(r) || isVist(r) || isImpl(r) ? String(t).replace(/Caixa sem TAG/g, isVist(r) ? 'Registro' : 'Ponto de atendimento').replace('Início da ronda', 'Início').replace('Fim da ronda', 'Fim') : t; linhas.push({ ts: sg.ini, tipo: 'desl', txt: SEGLB[sg.tipo] || 'Deslocamento', det: `${lb(sg.de)} > ${lb(sg.para)}`, km: sg.km, dur: sg.fim - sg.ini }); });
    r.eventos.filter(e => e.tipo === 'chegada').forEach(e => { const i = DB.mem.inspecoes.get(e.inspId) || S.inspCache.get(e.inspId); const sa = r.eventos.find(x => x.tipo === 'saida' && x.inspId === e.inspId); const dur = (sa ? sa.ts : (r.fim || Date.now())) - e.ts; T.local += dur;
      const prod = i ? valorOS(i) : 0; T.prod += prod;
      linhas.push({ ts: e.ts, tipo: 'local', txt: i ? rotuloEvento(i).replace(/ · [^·]*$/, m => i._doEquipe ? '' : m) : 'No local', det: i ? [i.info.endereco, i.info.cidade].filter(Boolean).join(', ') : '', dur, prod }); });
    if (r.fim) linhas.push({ ts: r.fim, tipo: 'fim', txt: `Fim · ${tipoLb(r)}`, det: r.odoFim ? 'odômetro ' + fOdo(kmNum(r.odoFim)) : '' });
  });
  linhas.sort((a, b) => a.ts - b.ts); return { linhas, T };
}
function roteiroHtml() {
  const A = S.adm; const tecs = A.tecnicos || []; A.rotTec = A.rotTec || A.tec || (tecs[0] || {}).uid || ''; A.rotDia = A.rotDia && A.rotDia >= A.de && A.rotDia <= A.ate ? A.rotDia : A.ate;
  const { linhas, T } = roteiroDia(A.rotTec, A.rotDia); const custo = linhas.length ? custoDiaTec() : 0;
  const ic = { exp: 'var(--ok)', ref: '#d9a400', ini: 'var(--accent)', desl: 'var(--st-trav)', local: 'var(--st-done)', fim: 'var(--accent)' };
  return `<section class="card"><h2>Roteiro diário do técnico</h2>
    <div class="grid3"><div class="field"><label class="lb" for="rotTec">Técnico</label><select id="rotTec">${tecs.map(t => `<option value="${t.uid}" ${A.rotTec === t.uid ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div><div class="field"><label class="lb" for="rotDia">Dia</label><input type="date" id="rotDia" value="${A.rotDia}" min="${A.de}" max="${A.ate}"></div><div class="field" style="justify-content:flex-end"><button type="button" class="btn" id="bRotPdf">${ICON.pdf}Roteiro em PDF</button></div></div>
    <div class="stats"><div class="stat"><b>${T.ativ}</b><span>Atividades</span></div><div class="stat"><b>${fKm(T.kmOdo || T.kmGps)}</b><span>Km rodados${T.kmOdo ? ' (odômetro)' : ' (GPS)'}</span></div><div class="stat"><b>${fDur(T.desl)}</b><span>Em deslocamento</span></div><div class="stat"><b>${fDur(T.local)}</b><span>No local</span></div>
    <div class="stat"><b>${fDur(T.ref)}</b><span>Refeição</span></div><div class="stat"><b>${fBRL(T.prod)}</b><span>Produção LPU</span></div><div class="stat"><b>${fBRL(custo)}</b><span>Custo do dia (meta ÷ dias úteis ÷ 2)</span></div><div class="stat"><b style="color:${T.prod - custo < 0 ? 'var(--bad)' : 'var(--ok)'}">${fBRL(T.prod - custo)}</b><span>Resultado do dia</span></div></div>
    ${linhas.length ? `<div class="list">${linhas.map(l => `<div class="act" style="cursor:default;min-height:56px"><span class="st" style="background:${ic[l.tipo]}"></span><span class="tm">${fHora(l.ts)}</span><span class="bd"><b>${esc(l.txt)}</b><span style="white-space:normal">${esc(l.det || '')}${l.km != null ? ` · ${fKm(l.km)}` : ''}${l.dur != null ? ` · ${fDur(l.dur)}` : ''}${l.prod ? ` · ${fBRL(l.prod)}` : ''}</span></span></div>`).join('')}</div>` : '<p class="empty">Sem registros desse técnico nesse dia.</p>'}</section>`;
}
function afterRoteiro() {
  const A = S.adm; const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  $('#rotTec').onchange = e => { A.rotTec = e.target.value; re(); }; $('#rotDia').onchange = e => { A.rotDia = e.target.value; re(); };
  $('#bRotPdf').onclick = async () => {
    if (!window.jspdf) return; const t = (A.tecnicos.find(x => x.uid === A.rotTec) || {}).nome || '—'; const { linhas, T } = roteiroDia(A.rotTec, A.rotDia); const custo = linhas.length ? custoDiaTec() : 0;
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const logo = await logoData(); let y = pdfHeader(doc, logo, 'Roteiro Diário do Técnico', `${t} · ${A.rotDia.split('-').reverse().join('/')}`, null);
    y = pdfSec(doc, y, 1, 'Resumo do dia'); y = kv(doc, y, [['Técnico', t], ['Dia', A.rotDia.split('-').reverse().join('/')], ['Atividades', String(T.ativ)], ['Km rodados', fKm(T.kmOdo || T.kmGps) + (T.kmOdo ? ' (odômetro)' : ' (GPS)')], ['Km pelo GPS', fKm(T.kmGps)], ['Tempo em deslocamento', fDur(T.desl)], ['Tempo no local', fDur(T.local)], ['Refeição', fDur(T.ref)], ['Produção LPU', fBRL(T.prod)], ['Custo estimado', fBRL(custo)], ['Resultado', fBRL(T.prod - custo)]]);
    y = pdfSec(doc, y, 2, 'Roteiro'); doc.autoTable({ ...TB, startY: y, head: [['Hora', 'Evento', 'Detalhe', 'Km', 'Duração', 'Produção']], body: linhas.map(l => [fHora(l.ts), l.txt, l.det || '', l.km != null ? fKm(l.km) : '', l.dur != null ? fDur(l.dur) : '', l.prod ? fBRL(l.prod) : '']), columnStyles: { 0: { cellWidth: 13 }, 3: { halign: 'right', cellWidth: 18 }, 4: { halign: 'right', cellWidth: 18 }, 5: { halign: 'right', cellWidth: 22 } } });
    pdfFooter(doc, `Multivale Engenharia · Roteiro diário · gerado em ${fDH(Date.now())}`); baixar(new File([doc.output('blob')], nomeArq(`Roteiro_${t}_${A.rotDia}`), { type: 'application/pdf' }));
  };
}

/* ---------- ganho líquido estimado por O.S. (rateio do custo da equipe) ---------- */
// peso da O.S. no rateio: tempo de deslocamento até ela + tempo no local
function pesoOS(i) {
  const r = i.rondaId && DB.mem.rondas.get(i.rondaId); const ch = i.chegada || i.criado;
  if (!r) return Math.max(15, ((i.saida || ch + 3600000) - ch) / 60000);
  const ev = (r.eventos || []).slice().sort((a, b) => a.ts - b.ts); let ini = r.inicio;
  for (const e of ev) { if (e.tipo === 'chegada' && e.inspId === i.id) break; if (e.tipo === 'saida') ini = e.ts; }
  const sa = ev.find(e => e.tipo === 'saida' && e.inspId === i.id); const fim = sa ? sa.ts : i.saida || r.fim || ch + 3600000;
  return Math.max(15, (fim - Math.min(ini, ch)) / 60000);
}
function ganhoPeriodo() {
  const A = S.adm; const M = metas(); const f = fatorPeriodo(A.de, A.ate); const enc = (+M.encargos || 0) / 100;
  const cads = new Map((S.cads || []).filter(c => c.uid).map(c => [c.uid, c])); const ops = operacaoPorTec();
  const insp = [...DB.mem.inspecoes.values()].filter(i => !isVist(i) && !i.apoio);
  const tecs = ops.filter(o => o.uid).map(o => {
    const cad = cads.get(o.uid) || null; const X = horasExtras((S.exps || []).filter(e => e.uid === o.uid), cad, A.de, A.ate);
    const R = resumoAbast((S.abast || []).filter(a => a.uid === o.uid).sort((x, y) => x.ts - y.ts), A.de, A.ate);
    const temSal = !!(cad && +cad.salario); const sal = temSal ? X.fixosMes * f : M.custo / 2 * f; const encV = temSal ? sal * enc : 0;
    const c = { sal, enc: encV, vr: X.vrTot, he: X.variaveis, comb: R.total, loc: (+(cad && cad.locacao_mes) || 0) * f };
    const custo = c.sal + c.enc + c.vr + c.he + c.comb + c.loc;
    return { uid: o.uid, nome: o.nome, c, custo, estimado: !temSal, os: insp.filter(i => i._uid === o.uid) };
  });
  // rateio: o custo da dupla é dividido entre as O.S. da dupla, pelo tempo de cada uma
  const grupos = new Map(); tecs.forEach(t => { const dp = duplaDe(t.uid); const k = dp ? 'd:' + dp.nome : 'u:' + t.uid; const g = grupos.get(k) || { nome: dp ? dp.nome : t.nome, tecs: [], os: [] }; g.tecs.push(t); g.os.push(...t.os); grupos.set(k, g); });
  const linhas = []; const resumo = [];
  grupos.forEach(g => { const custo = g.tecs.reduce((s, t) => s + t.custo, 0); const pesos = g.os.map(pesoOS); const tot = pesos.reduce((s, x) => s + x, 0);
    g.os.forEach((i, k) => { const cr = tot ? custo * pesos[k] / tot : 0; const v = valorOS(i); linhas.push({ i, ref: osRef(i), tipo: tipoLb(i), tec: i.info.tecnico || i._tecnico || '', grupo: g.nome, ts: i.chegada || i.criado, min: pesos[k], valor: v, custo: cr, ganho: v - cr }); });
    const receita = g.os.reduce((s, i) => s + valorOS(i), 0);
    resumo.push({ nome: g.nome, tecs: g.tecs.map(t => t.nome), c: g.tecs.reduce((a, t) => { Object.keys(t.c).forEach(k => a[k] = (a[k] || 0) + t.c[k]); return a; }, {}), custo, receita, ganho: receita - custo, nOS: g.os.length, estimado: g.tecs.some(t => t.estimado), semOS: !g.os.length }); });
  const T = resumo.reduce((a, r) => ({ receita: a.receita + r.receita, custo: a.custo + r.custo }), { receita: 0, custo: 0 });
  return { linhas: linhas.sort((a, b) => a.ganho - b.ganho), resumo: resumo.sort((a, b) => b.ganho - a.ganho), T: { ...T, ganho: T.receita - T.custo }, encargos: M.encargos, f };
}
const pct = (a, b) => b ? (a / b * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—';
function ganhoHtml() {
  const G = ganhoPeriodo(); if (!G.resumo.length) return '';
  const neg = G.linhas.filter(l => l.ganho < 0).length;
  return `<section class="card"><div class="row" style="justify-content:space-between"><h2>Ganho líquido estimado</h2><button type="button" class="btn" id="bGanhoCsv" style="min-height:40px">Exportar para Excel</button></div>
    <p class="muted small" style="margin:0">Produção da LPU menos o custo da equipe no período: salário${G.encargos ? ` + ${G.encargos}% de encargos` : ''}, vale-refeição, horas extras, combustível e locação do veículo. O custo de cada dupla é rateado entre as O.S. dela pelo tempo de deslocamento e de atendimento. Sem salário cadastrado, usa a meta de custo da dupla.</p>
    <div class="stats"><div class="stat"><b>${fBRL(G.T.receita)}</b><span>Produção</span></div><div class="stat"><b>${fBRL(G.T.custo)}</b><span>Custo da equipe</span></div><div class="stat"><b style="color:${G.T.ganho < 0 ? 'var(--bad)' : 'var(--ok)'}">${fBRL(G.T.ganho)}</b><span>Ganho líquido · ${pct(G.T.ganho, G.T.receita)}</span></div><div class="stat"><b style="color:${neg ? 'var(--bad)' : 'inherit'}">${neg}</b><span>O.S. com ganho negativo</span></div></div>
    <div class="tw"><table class="t"><thead><tr><th>Dupla / técnico</th><th class="r">Salário + encargos</th><th class="r">VR</th><th class="r">Horas extras</th><th class="r">Combustível</th><th class="r">Locação</th><th class="r">Custo</th><th class="r">Produção</th><th class="r">Ganho</th><th class="r">O.S.</th></tr></thead><tbody>
    ${G.resumo.map(r => `<tr><td><b>${esc(r.nome)}</b>${r.tecs.length > 1 ? `<br><span class="small muted">${esc(r.tecs.join(' + '))}</span>` : ''}${r.estimado ? ' <span class="pill draft" title="Salário não cadastrado: usada a meta de custo">estimado</span>' : ''}</td><td class="r">${fBRL((r.c.sal || 0) + (r.c.enc || 0))}</td><td class="r">${fBRL(r.c.vr || 0)}</td><td class="r">${fBRL(r.c.he || 0)}</td><td class="r">${fBRL(r.c.comb || 0)}</td><td class="r">${fBRL(r.c.loc || 0)}</td><td class="r"><b>${fBRL(r.custo)}</b></td><td class="r">${fBRL(r.receita)}</td><td class="r"><b style="color:${r.ganho < 0 ? 'var(--bad)' : 'var(--ok)'}">${fBRL(r.ganho)}</b></td><td class="r">${r.nOS}${r.semOS ? ' <span class="pill bad">sem O.S.</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
    <details><summary style="cursor:pointer;font-weight:600;min-height:40px;display:flex;align-items:center">Ganho por O.S. (${G.linhas.length})</summary>
    <div class="tw"><table class="t"><thead><tr><th>Data</th><th>O.S.</th><th>Tipo</th><th>Técnico</th><th class="r">Tempo</th><th class="r">Produção</th><th class="r">Custo rateado</th><th class="r">Ganho</th><th class="r">Margem</th></tr></thead><tbody>
    ${G.linhas.map(l => `<tr><td>${fDH(l.ts)}</td><td>${esc(l.ref)}</td><td>${esc(l.tipo)}</td><td>${esc(l.tec)}</td><td class="r">${fHm(l.min)}</td><td class="r">${fBRL(l.valor)}</td><td class="r">${fBRL(l.custo)}</td><td class="r"><b style="color:${l.ganho < 0 ? 'var(--bad)' : 'var(--ok)'}">${fBRL(l.ganho)}</b></td><td class="r">${pct(l.ganho, l.valor)}</td></tr>`).join('')}</tbody></table></div></details></section>`;
}
function ganhoCsv() {
  const G = ganhoPeriodo(); const A = S.adm; const n = v => (+v || 0).toFixed(2).replace('.', ','); const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [['Dupla / técnico', 'Salário', 'Encargos', 'VR', 'Horas extras', 'Combustível', 'Locação', 'Custo', 'Produção', 'Ganho', 'O.S.'].join(';'), ...G.resumo.map(r => [q(r.nome + (r.estimado ? ' (estimado)' : '')), n(r.c.sal), n(r.c.enc), n(r.c.vr), n(r.c.he), n(r.c.comb), n(r.c.loc), n(r.custo), n(r.receita), n(r.ganho), r.nOS].join(';')), '',
    ['Data', 'O.S.', 'Tipo', 'Técnico', 'Dupla', 'Minutos', 'Produção', 'Custo rateado', 'Ganho'].join(';'), ...G.linhas.map(l => [fDH(l.ts), q(l.ref), q(l.tipo), q(l.tec), q(l.grupo), Math.round(l.min), n(l.valor), n(l.custo), n(l.ganho)].join(';'))].join('\r\n');
  baixar(new File([csv], `Ganho_liquido_${A.de}_a_${A.ate}.csv`, { type: 'text/csv' }));
}
function pdfGanho(doc, y, G) {
  if (!G.resumo.length) return y;
  y = pdfSec(doc, y, 6, 'Ganho líquido estimado (gerencial)'); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
  doc.splitTextToSize(`Produção ${fBRL(G.T.receita)} − custo da equipe ${fBRL(G.T.custo)} = ganho ${fBRL(G.T.ganho)} (${pct(G.T.ganho, G.T.receita)}). Custo: salário${G.encargos ? ` + ${G.encargos}% de encargos` : ''}, VR, horas extras, combustível e locação; rateado entre as O.S. de cada dupla pelo tempo de deslocamento e atendimento.`, 186).forEach(l => { doc.text(l, 12, y + 1); y += 3.8; }); y += 2; doc.setTextColor(20);
  doc.autoTable({ ...TB, startY: y, head: [['Dupla / técnico', 'Salário+enc.', 'VR', 'H. extras', 'Combust.', 'Locação', 'Custo', 'Produção', 'Ganho']], body: G.resumo.map(r => [r.nome + (r.estimado ? ' *' : ''), fBRL((r.c.sal || 0) + (r.c.enc || 0)), fBRL(r.c.vr || 0), fBRL(r.c.he || 0), fBRL(r.c.comb || 0), fBRL(r.c.loc || 0), fBRL(r.custo), fBRL(r.receita), fBRL(r.ganho)]), styles: { ...TB.styles, fontSize: 7.5 }, columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' }, 7: { halign: 'right' }, 8: { halign: 'right', fontStyle: 'bold' } }, didParseCell: c => { if (c.section === 'body' && c.column.index === 8 && G.resumo[c.row.index].ganho < 0) c.cell.styles.textColor = [194, 49, 29]; } });
  y = doc.lastAutoTable.finalY + 2; if (G.resumo.some(r => r.estimado)) { doc.setFontSize(7); doc.setTextColor(110); doc.text('* salário não cadastrado: usada a meta de custo da dupla.', 12, y + 2); y += 5; doc.setTextColor(20); } y += 4;
  y = pdfSec(doc, y, 7, 'Ganho por O.S.');
  doc.autoTable({ ...TB, startY: y, head: [['Data', 'O.S.', 'Técnico', 'Tempo', 'Produção', 'Custo rateado', 'Ganho', 'Margem']], body: G.linhas.map(l => [fDH(l.ts), l.ref, l.tec, fHm(l.min), fBRL(l.valor), fBRL(l.custo), fBRL(l.ganho), pct(l.ganho, l.valor)]), styles: { ...TB.styles, fontSize: 7.5 }, columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' }, 7: { halign: 'right' } }, didParseCell: c => { if (c.section === 'body' && c.column.index === 6 && G.linhas[c.row.index].ganho < 0) c.cell.styles.textColor = [194, 49, 29]; } });
  return doc.lastAutoTable.finalY + 7;
}
/* ---------- extratos de produção e fechamento de período ---------- */
const FUNCAO_LB = { tecnico: 'Técnico', fibra: 'Técnico de fibra', fiscal: 'Fiscal de campo' };
const SIT_LB = { medida: 'Medida', enviada: 'Na medição', validada: 'Validada', finalizada: 'A validar', rota: 'Em campo' };
const sitOS = (i, meds) => { const m = meds && meds.get(i.id); return m ? m.status : i.status === 'concluida' ? 'finalizada' : 'rota'; };
function extratoDados(o, oss, meds, extra = {}) {
  const lista = oss.filter(i => !isVist(i) && !i.apoio && (i.lpu || []).length).sort((a, b) => (a.chegada || a.criado) - (b.chegada || b.criado));
  const it = new Map(), est = new Map(); const porSit = { medida: 0, enviada: 0, validada: 0, finalizada: 0, rota: 0 };
  lista.forEach(i => { porSit[sitOS(i, meds)] += valorOS(i); (i.lpu || []).forEach(x => { const e = lpuEst(i, x); const M = e ? est : it; const k = x.c; const g = M.get(k) || { c: x.c, d: x.d, u: x.u, v: +x.v || 0, q: 0, t: 0 }; g.q += +x.q || 0; g.t += vItem(i, x); M.set(k, g); }); });
  return { ...extra, nome: o.nome, uid: o.uid, oss: lista, meds, valor: lista.reduce((a, i) => a + valorOS(i), 0), porSit, itens: [...it.values()].sort((a, b) => b.t - a.t), estoque: [...est.values()].sort((a, b) => b.q - a.q) };
}
function pdfExtratoTec(doc, logo, d) {
  const per = `${fDM(d.de)} a ${fDM(d.ate)}`;
  let y = pdfHeader(doc, logo, 'Extrato de produção', `${d.nome} · ${per}`, null);
  const fx = d.dupla ? d.dupla.fx : null;
  y = pdfSec(doc, y, 1, 'Resumo');
  y = kv(doc, y, [['Técnico', d.nome], ['Matrícula', d.matricula || '—'], ['Período', per], ['Situação', d.fechado ? `Fechado em ${fDH(d.fechado.em)}${d.fechado.por ? ' por ' + d.fechado.por : ''}` : 'Prévia (período não fechado)'],
    ['Dias trabalhados', d.dias != null ? String(d.dias) : '—'], ['Km rodados', d.km != null ? fKm(d.km) : '—'], ['O.S. com produção', String(d.oss.length)], ['Produção do período', fBRL(d.valor)],
    ['Medida', fBRL(d.porSit.medida)], ['Na medição', fBRL(d.porSit.enviada)], ['Validada', fBRL(d.porSit.validada)], ['A validar', fBRL(d.porSit.finalizada + d.porSit.rota)],
    ...(d.dupla ? [['Dupla', d.dupla.nome], ['Produção da dupla', `${fBRL(d.dupla.prod)} · ${fx ? fx.txt : ''}`]] : [])]);
  y = pdfSec(doc, y, 2, 'O.S. do período');
  doc.autoTable({ ...TB, startY: y, head: [['Data', 'O.S.', 'Tipo', 'Situação', 'Valor']], body: [...d.oss.map(i => [fDH(i.chegada || i.criado), osRef(i), tipoLb(i) + (claroCorr(i) ? ' Claro' : ''), SIT_LB[sitOS(i, d.meds)], fBRL(valorOS(i))]), ['', '', '', 'Total', fBRL(d.valor)]],
    columnStyles: { 0: { cellWidth: 30 }, 4: { halign: 'right', cellWidth: 28, fontStyle: 'bold' } }, didParseCell: c => { if (c.section === 'body' && c.row.index === d.oss.length) { c.cell.styles.fontStyle = 'bold'; c.cell.styles.fillColor = [233, 238, 241]; } } });
  y = doc.lastAutoTable.finalY + 7;
  if (d.itens.length) { y = pdfSec(doc, y, 3, 'Itens executados (LPU)'); doc.autoTable({ ...TB, startY: y, head: [['Código', 'Descrição', 'Unid.', 'Qtd.', 'Unit.', 'Total']], body: d.itens.map(x => [x.c, x.d, x.u, fQtd(x.q), fBRL(x.v), fBRL(x.t)]), columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 13 }, 3: { halign: 'right', cellWidth: 14 }, 4: { halign: 'right', cellWidth: 22 }, 5: { halign: 'right', cellWidth: 25, fontStyle: 'bold' } } }); y = doc.lastAutoTable.finalY + 7; }
  if (d.estoque.length) { y = pdfSec(doc, y, 4, 'Material de estoque (corretivas Claro, sem valor)'); doc.autoTable({ ...TB, startY: y, head: [['Código', 'Descrição', 'Unid.', 'Qtd.']], body: d.estoque.map(x => [x.c, x.d, x.u, fQtd(x.q)]), columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 13 }, 3: { halign: 'right', cellWidth: 18 } } }); y = doc.lastAutoTable.finalY + 7; }
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(60); doc.text('Conferi a produção acima, lançada pela LPU vigente. Corretivas da Claro contam só o serviço.', 12, y + 2); y += 22;
  doc.setDrawColor(60); doc.setLineWidth(0.3); doc.line(14, y, 94, y); doc.line(116, y, 196, y); doc.setFontSize(8); doc.setTextColor(20); doc.text(d.nome, 54, y + 4, { align: 'center' }); doc.text('Supervisor / gestor', 156, y + 4, { align: 'center' });
}
function pdfExtratoTotal(doc, logo, T) {
  const per = `${fDM(T.de)} a ${fDM(T.ate)}`; const MM = metas();
  let y = pdfHeader(doc, logo, 'Extrato do fechamento', `Produção total · ${per}`, null);
  const ps = T.extratos.reduce((a, d) => { Object.keys(a).forEach(k => a[k] += d.porSit[k]); return a; }, { medida: 0, enviada: 0, validada: 0, finalizada: 0, rota: 0 });
  y = pdfSec(doc, y, 1, 'Resumo');
  y = kv(doc, y, [['Período', per], ['Situação', T.fechado ? `Fechado em ${fDH(T.fechado.em)}${T.fechado.por ? ' por ' + T.fechado.por : ''}` : 'Prévia (período não fechado)'], ['Produção total', fBRL(T.prod)], ['Custo das duplas', fBRL(T.custo)],
    ['Resultado', fBRL(T.prod - T.custo)], ['Km rodados', fKm(T.km)], ['Técnicos', String(T.extratos.length)], ['O.S. com produção', String(T.extratos.reduce((a, d) => a + d.oss.length, 0))],
    ['Medida', fBRL(ps.medida)], ['Na medição', fBRL(ps.enviada)], ['Validada', fBRL(ps.validada)], ['A validar', fBRL(ps.finalizada + ps.rota)]]);
  if (T.dps.length) { y = pdfSec(doc, y, 2, 'Metas por dupla'); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90); doc.text(`Ciclo 16 a 15${T.f < 1 ? ` (proporcional: ${Math.round(T.f * 100)}% do ciclo)` : ''}: custo ${fBRL(MM.custo)} · mínimo ${fBRL(MM.minimo)} · ideal ${fBRL(MM.ideal)} · perfeito ${fBRL(MM.perfeito)}.`, 12, y + 1); y += 4; doc.setTextColor(20);
    doc.autoTable({ ...TB, startY: y, head: [['Dupla', 'Técnicos', 'Km', 'Produção', 'Custo', 'Resultado', 'Faixa']], body: T.dps.map(d => [d.nome, d.tecs.join(' + '), fKm(d.km), fBRL(d.prod), fBRL(d.custo), fBRL(d.resultado), d.fx.txt]), columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'right' }, 5: { halign: 'right' } } }); y = doc.lastAutoTable.finalY + 7; }
  y = pdfSec(doc, y, 3, 'Extrato por técnico');
  doc.autoTable({ ...TB, startY: y, head: [['Técnico', 'Dupla', 'Dias', 'Km', 'O.S.', 'Produção', 'Medida', 'Na medição', 'A validar']], body: [...T.extratos.map(d => [d.nome, d.dupla ? d.dupla.nome : '—', d.dias ?? '—', d.km != null ? fKm(d.km) : '—', d.oss.length, fBRL(d.valor), fBRL(d.porSit.medida), fBRL(d.porSit.enviada), fBRL(d.porSit.validada + d.porSit.finalizada + d.porSit.rota)]), ['Total', '', '', fKm(T.km), T.extratos.reduce((a, d) => a + d.oss.length, 0), fBRL(T.prod), fBRL(ps.medida), fBRL(ps.enviada), fBRL(ps.validada + ps.finalizada + ps.rota)]],
    styles: { ...TB.styles, fontSize: 7.8 }, columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' } }, didParseCell: c => { if (c.section === 'body' && c.row.index === T.extratos.length) { c.cell.styles.fontStyle = 'bold'; c.cell.styles.fillColor = [233, 238, 241]; } } });
  y = doc.lastAutoTable.finalY + 7;
  const est = new Map(); T.extratos.forEach(d => d.estoque.forEach(x => { const g = est.get(x.c) || { ...x, q: 0 }; g.q += x.q; est.set(x.c, g); }));
  if (est.size) { y = pdfSec(doc, y, 4, 'Material de estoque (corretivas Claro)'); doc.autoTable({ ...TB, startY: y, head: [['Código', 'Descrição', 'Unid.', 'Qtd.']], body: [...est.values()].map(x => [x.c, x.d, x.u, fQtd(x.q)]), columnStyles: { 0: { cellWidth: 15 }, 3: { halign: 'right', cellWidth: 18 } } }); y = doc.lastAutoTable.finalY + 7; }
  y = pdfSec(doc, y, 5, 'Todas as O.S. do período');
  const todas = T.extratos.flatMap(d => d.oss.map(i => ({ i, d }))).sort((a, b) => (a.i.chegada || a.i.criado) - (b.i.chegada || b.i.criado));
  doc.autoTable({ ...TB, startY: y, head: [['Data', 'Técnico', 'O.S.', 'Tipo', 'Situação', 'Valor']], body: todas.map(({ i, d }) => [fDH(i.chegada || i.criado), d.nome, osRef(i), tipoLb(i) + (claroCorr(i) ? ' Claro' : ''), SIT_LB[sitOS(i, d.meds)], fBRL(valorOS(i))]), styles: { ...TB.styles, fontSize: 7.8 }, columnStyles: { 0: { cellWidth: 28 }, 5: { halign: 'right', fontStyle: 'bold' } } });
}
async function novoPdf() { const { jsPDF } = window.jspdf; return { doc: new jsPDF({ unit: 'mm', format: 'a4' }), logo: await logoData() }; }
// monta os extratos do período carregado no painel
function extratosPainel(fc) {
  const A = S.adm; const ops = operacaoPorTec(); const dps = operacaoPorDupla(); const meds = S.meds || new Map();
  const ins = [...DB.mem.inspecoes.values()];
  const ex = ops.map(o => { const dp = duplaDe(o.uid); const dd = dp ? dps.find(x => x.nome === dp.nome) : null; const t = (A.tecnicos || []).find(x => x.uid === o.uid) || {};
    return extratoDados(o, ins.filter(i => o.uid ? i._uid === o.uid : (i.info.tecnico || i._tecnico) === o.nome), meds, { de: A.de, ate: A.ate, matricula: t.matricula || '', dias: o.nDias, km: o.kmOdo, dupla: dd, fechado: fc || null }); }).filter(d => d.oss.length || d.km);
  return { de: A.de, ate: A.ate, extratos: ex, dps, f: fatorPeriodo(A.de, A.ate), prod: ex.reduce((a, d) => a + d.valor, 0), km: ops.reduce((a, o) => a + o.kmOdo, 0), custo: dps.reduce((a, d) => a + d.custo, 0), fechado: fc || null };
}
async function arquivosExtratos(T) {
  const out = []; const rod = `Técnico Plus - Multivale · extrato ${fDM(T.de)} a ${fDM(T.ate)} · gerado em ${fDH(Date.now())}`;
  { const { doc, logo } = await novoPdf(); pdfExtratoTotal(doc, logo, T); try { const G = ganhoPeriodo(); if (G.resumo.length) { doc.addPage(); pdfGanho(doc, 20, G); } } catch (e) { console.warn(e); } pdfFooter(doc, rod); out.push({ name: nomeArq(`Extrato_total_${T.de}_a_${T.ate}`), data: new Uint8Array(doc.output('arraybuffer')) }); }
  for (const d of T.extratos) { const { doc, logo } = await novoPdf(); pdfExtratoTec(doc, logo, d); pdfFooter(doc, rod); out.push({ name: nomeArq(`Extrato_${d.nome}_${T.de}_a_${T.ate}`), data: new Uint8Array(doc.output('arraybuffer')) }); }
  return out;
}
async function baixarExtratos(fc) {
  if (!window.jspdf) { toast('Gerador de PDF não carregou.'); return; }
  try { const T = extratosPainel(fc); if (!T.extratos.length) { toast('Sem produção no período.'); return; } const fs = await arquivosExtratos(T); baixar(await zipArq(`Fechamento_${T.de}_a_${T.ate}.zip`, fs)); toast(`Extratos gerados: total + ${T.extratos.length} técnico(s).`, 4000); }
  catch (e) { console.error(e); toast('Erro ao gerar os extratos: ' + e.message, 6000); }
}
async function baixarExtratoTec(uidOuNome) {
  if (!window.jspdf) { toast('Gerador de PDF não carregou.'); return; }
  const A = S.adm; const fc = ((S.cfg || {}).fechamentos || []).filter(f => f.fechado && f.de === A.de && f.ate === A.ate).pop() || null;
  const d = extratosPainel(fc).extratos.find(x => (x.uid || x.nome) === uidOuNome); if (!d) { toast('Sem produção deste técnico no período.'); return; }
  const { doc, logo } = await novoPdf(); pdfExtratoTec(doc, logo, d); pdfFooter(doc, `Técnico Plus - Multivale · extrato ${fDM(A.de)} a ${fDM(A.ate)} · gerado em ${fDH(Date.now())}`);
  baixar(new File([doc.output('blob')], nomeArq(`Extrato_${d.nome}_${A.de}_a_${A.ate}`), { type: 'application/pdf' }));
}
/* ---------- BI de produção (supervisor) ---------- */
// O.S. com equipe de apoio: a produção é dividida em partes iguais entre as equipes (principal + apoio)
function apoiosDe(i) {
  const dono = i._uid || (!ADMIN && Nuvem.user ? Nuvem.user.id : ''); const s = new Set(i.apoioUids || []);
  const r = i.rondaId && DB.mem.rondas.get(i.rondaId); const atvId = r && r.atividadeId;
  if (atvId) { const a = (S.atvsAdm && S.atvsAdm.get(atvId)) || (S.atvs && S.atvs.get(atvId)); ((a && a.apoioUids) || []).forEach(u => s.add(u)); [...DB.mem.rondas.values()].forEach(x => { if (x.apoio && x.atividadeId === atvId && x._uid) s.add(x._uid); }); }
  s.delete(dono); s.delete(''); return [...s];
}
function rateioOS(i) {
  const dono = i._uid || (!ADMIN && Nuvem.user ? Nuvem.user.id : ''); const ap = apoiosDe(i); if (!ap.length) return [{ uid: dono, frac: 1 }];
  const chave = u => { const d = duplaDe(u); return d ? 'd:' + d.nome : 'u:' + u; }; const eq = new Map(); [dono, ...ap].forEach(u => { const k = chave(u); if (!eq.has(k)) eq.set(k, u); });
  if (eq.size < 2) return [{ uid: dono, frac: 1 }]; // apoio da mesma equipe: não divide
  return [...eq.entries()].map(([k, u]) => ({ uid: u, frac: 1 / eq.size, equipe: k.startsWith('d:') ? k.slice(2) : '' }));
}
const parteOS = (i, uid) => { const p = rateioOS(i).find(x => x.uid === uid); return p ? p.frac : (rateioOS(i).length > 1 ? 0 : 1); };
function marcaApoios(i) { const r = S.ronda; if (!i || i.apoio || !r || r.id !== i.rondaId || !r.atividadeId) return; const a = S.atvs && S.atvs.get(r.atividadeId); if (a && (a.apoioUids || []).length) i.apoioUids = [...a.apoioUids]; }
function biLinhas() {
  const A = S.adm; const out = [];
  const nomeU = u => ((A.tecnicos || []).find(t => t.uid === u) || {}).nome || '—';
  [...DB.mem.inspecoes.values()].filter(i => !i.apoio).forEach(i => { const VV = lpuValores(i); const R = rateioOS(i); (i.lpu || []).forEach((x, kk) => {
    const cur = LPUI.get(x.c); const v = +(x.v ?? (cur ? cur.v : 0)) || 0; const q = +x.q || 0; const est = lpuEst(i, x);
    const base = { proj: projetoDe(i), est, cont: VV[kk].k === 'contrato', centro: centroOS(i), uid: i._uid || '', tec: i.info.tecnico || i._tecnico || '—', dia: isoDate(i.chegada || i.criado), ts: i.chegada || i.criado, c: x.c, d: x.d || (cur && cur.d) || '', u: x.u || (cur && cur.u) || '', t: x.t || (cur && cur.t) || 'S', q, v, total: VV[kk].v, ativ: tipoLb(i), ref: isCorr(i) ? i.corr.ticket : isImpl(i) ? i.impl.designacao : i.info.tag, inspId: i.id };
    R.forEach(p => out.push(R.length < 2 ? base : { ...base, uid: p.uid, tec: p.uid === base.uid ? base.tec : nomeU(p.uid), q: base.q * p.frac, total: base.total * p.frac, rateio: p.frac, rateioN: R.length }));
  }); });
  const bp = S.biProj || ''; return out.filter(r => (!A.tec || r.uid === A.tec) && (!bp || (bp === '__sem' ? !r.proj : r.proj === bp)));
}
const somaPor = (l, k) => { const m = new Map(); l.forEach(r => { const key = typeof k === 'function' ? k(r) : r[k]; const o = m.get(key) || { k: key, total: 0, q: 0, n: 0, S: 0, M: 0, ativ: new Set(), linhas: [] }; o.total += r.total; o.q += r.q; o.n++; o[r.t] += r.total; o.ativ.add(r.inspId); o.linhas.push(r); m.set(key, o); }); return [...m.values()].sort((a, b) => b.total - a.total); };
function barrasHtml(lista, rotulo, titulo, max = 12) {
  const l = lista.slice(0, max); const top = Math.max(...l.map(x => x.total), 1);
  if (!l.length) return `<p class="empty">Sem produção lançada no período.</p>`;
  return `<div class="bars" role="list" aria-label="${esc(titulo)}">${l.map(x => `<div class="bar-row" role="listitem" title="${esc(rotulo(x))}: ${fBRL(x.total)}"><span class="bar-lb">${esc(rotulo(x))}</span><span class="bar-tr"><span class="bar-f" style="width:${Math.max(0.6, x.total / top * 100)}%"></span></span><span class="bar-v">${fBRL(x.total)}</span></div>`).join('')}</div>`;
}
function colunasHtml(dias) {
  const top = Math.max(...dias.map(x => x.total), 1);
  return `<div class="cols" role="list" aria-label="Produção por dia">${dias.map(x => `<div class="col" role="listitem" title="${x.k.split('-').reverse().join('/')}: ${fBRL(x.total)}"><span class="col-v">${x.total ? fBRL(x.total).replace(/\s/g, ' ').replace(',00', '') : ''}</span><span class="col-tr"><span class="col-f" style="height:${x.total ? Math.max(2, x.total / top * 100) : 0}%"></span></span><span class="col-lb">${x.k.slice(8, 10)}/${x.k.slice(5, 7)}</span></div>`).join('')}</div>`;
}
function viewAdmBi() {
  const A = S.adm; const L = biLinhas(); const tot = L.reduce((a, r) => a + r.total, 0); const S_ = L.filter(r => r.t === 'S').reduce((a, r) => a + r.total, 0);
  const tecs = somaPor(L, 'tec'); const itens = somaPor(L.filter(r => !r.est), r => r.c); const grupos = somaPor(L, r => (r.t === 'M' ? 'Mat. · ' : 'Serv. · ') + lpuGrupo(r.c));
  const dias = []; for (let d = diaIni(A.de); d <= diaIni(A.ate); d += 86400000) { const k = isoDate(d + 43200000); const o = L.filter(r => r.dia === k); dias.push({ k, total: o.reduce((a, r) => a + r.total, 0) }); }
  const nAtv = new Set(L.map(r => r.inspId)).size; const LP = window.LPU || {};
  const PJ = projAtivos(), bp = S.biProj || ''; const abas = PJ.length ? `<section class="card" style="padding:8px 12px"><div class="chips" role="tablist" aria-label="Projeto" style="flex-wrap:wrap"><button type="button" role="tab" data-biproj="" aria-selected="${!bp}" aria-pressed="${!bp}">Geral</button>${PJ.map(p => `<button type="button" role="tab" data-biproj="${esc(p.id)}" aria-selected="${bp === p.id}" aria-pressed="${bp === p.id}">${esc(p.nome)}</button>`).join('')}<button type="button" role="tab" data-biproj="__sem" aria-selected="${bp === '__sem'}" aria-pressed="${bp === '__sem'}">Sem projeto</button></div>${bp && bp !== '__sem' ? `<p class="muted small" style="margin:6px 0 0">${esc(PJ_VINC[(projById(bp) || {}).vinculo] || '')}${(projById(bp) || {}).faturamento ? ' · ' + esc(CENTROS[projById(bp).faturamento] || '') : ''} · só a produção das O.S. deste projeto. Custos e resultado em Centro de custo.</p>` : bp === '__sem' ? '<p class="muted small" style="margin:6px 0 0">O.S. ainda sem projeto: defina na Medição.</p>' : ''}</section>` : '';
  return abas + (bp ? '' : fechamentoHtml() + roteiroHtml()) + `<section class="card"><div class="row" style="justify-content:space-between"><h2>Produção (BI) · LPU${bp ? ' · ' + esc(bp === '__sem' ? 'Sem projeto' : projNome(bp)) : ''}</h2><span class="muted small">${esc(LP.regiao || '')} · vigência ${esc(LP.vigencia || '')}</span></div>
    <p class="muted small" style="margin:0">${esc(S.perfil.nome)} · ${A.de.split('-').reverse().join('/')} a ${A.ate.split('-').reverse().join('/')}.</p>
    <div class="stats"><div class="stat"><b>${fBRL(tot)}</b><span>Total produzido</span></div><div class="stat"><b>${fBRL(S_)}</b><span>Serviços</span></div><div class="stat"><b>${fBRL(tot - S_)}</b><span>Materiais</span></div>${L.some(r => r.est) ? `<div class="stat"><b>${new Set(L.filter(r => r.est).map(r => r.inspId)).size}</b><span>Corretivas Claro com material de estoque</span></div>` : ''}<div class="stat"><b>${nAtv ? fBRL(tot / nAtv) : '—'}</b><span>Média por atividade</span></div>
    <div class="stat"><b>${tecs.length}</b><span>Técnicos com produção</span></div><div class="stat"><b>${nAtv}</b><span>Atividades com lançamento</span></div><div class="stat"><b>${itens.length}</b><span>Itens diferentes</span></div><div class="stat"><b>${L.length}</b><span>Lançamentos</span></div></div>
    <div class="row"><button class="btn pri" id="bBiPdf">${ICON.pdf}Relatório de produção (PDF)</button><button class="btn" id="bBiCsv">Exportar para Excel</button></div></section>
  <div class="bi2"><section class="card"><h2>Produção por técnico</h2>${barrasHtml(tecs, x => x.k, 'Produção por técnico')}</section>
    <section class="card"><h2>Por grupo da LPU</h2>${barrasHtml(grupos, x => x.k, 'Produção por grupo')}</section></div>
  <section class="card"><h2>Produção por dia</h2>${colunasHtml(dias)}</section>
  <section class="card"><h2>Itens que mais produziram</h2>${barrasHtml(itens, x => `${x.k} · ${(LPUI.get(x.k) || { d: x.linhas[0].d }).d}`, 'Itens que mais produziram', 10)}</section>
  <section class="card"><h2>Por técnico</h2><div class="tw"><table class="t"><thead><tr><th>Técnico</th><th class="r">Atividades</th><th class="r">Serviços</th><th class="r">Materiais</th><th class="r">Total</th><th class="r">% do total</th></tr></thead><tbody>
    ${tecs.map(x => `<tr><td>${esc(x.k)}</td><td class="r">${x.ativ.size}</td><td class="r">${fBRL(x.S)}</td><td class="r">${fBRL(x.M)}</td><td class="r"><b>${fBRL(x.total)}</b></td><td class="r">${tot ? (x.total / tot * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—'}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Sem produção lançada no período.</td></tr>'}</tbody></table></div></section>
  ${(() => { const E = somaPor(L.filter(r => r.est), r => r.c); return E.length ? `<section class="card"><h2>Consumo de material para estoque</h2><p class="muted small" style="margin:0">Material usado em corretivas da Claro: não entra na produção, só baixa do estoque.</p><div class="tw"><table class="t"><thead><tr><th>Código</th><th>Descrição</th><th>Unid.</th><th class="r">Qtd.</th><th class="r">O.S.</th></tr></thead><tbody>${E.sort((a, b) => b.q - a.q).map(x => `<tr><td>${esc(x.k)}</td><td>${esc(x.linhas[0].d)}</td><td>${esc(x.linhas[0].u)}</td><td class="r"><b>${fQtd(x.q)}</b></td><td class="r">${x.ativ.size}</td></tr>`).join('')}</tbody></table></div></section>` : ''; })()}
  ${(() => { const ab = S.abast || []; if (!ab.length) return ''; const por = new Map(); ab.forEach(a => { const l = por.get(a.uid) || []; l.push(a); por.set(a.uid, l); });
    const rows = [...por.entries()].filter(([u]) => !A.tec || u === A.tec).map(([u, l]) => { const R = resumoAbast(l.sort((x, y) => x.ts - y.ts), A.de, A.ate); return { nome: (A.tecnicos.find(t => t.uid === u) || {}).nome || (l[0] || {}).tecnico || '—', placa: (l[l.length - 1] || {}).placa || '', R }; }).filter(r => r.R.n);
    return rows.length ? `<section class="card"><h2>Combustível</h2><div class="tw"><table class="t"><thead><tr><th>Técnico</th><th>Veículo</th><th class="r">Abastec.</th><th class="r">Litros</th><th class="r">Gasto</th><th class="r">Consumo</th><th class="r">Custo por km</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.nome)}</td><td>${esc(r.placa)}</td><td class="r">${r.R.n}</td><td class="r">${fL(r.R.litros)}</td><td class="r"><b>${fBRL(r.R.total)}</b></td><td class="r">${fKml(r.R.kml)}</td><td class="r">${r.R.rkm != null ? fBRL(r.R.rkm) : '—'}</td></tr>`).join('')}<tr><td><b>Total</b></td><td></td><td class="r">${rows.reduce((s, r) => s + r.R.n, 0)}</td><td class="r">${fL(rows.reduce((s, r) => s + r.R.litros, 0))}</td><td class="r"><b>${fBRL(rows.reduce((s, r) => s + r.R.total, 0))}</b></td><td></td><td></td></tr></tbody></table></div></section>` : ''; })()}
  <section class="card"><h2>Itens produzidos</h2><div class="tw"><table class="t"><thead><tr><th>Código</th><th>Descrição</th><th>Unid.</th><th class="r">Qtd.</th><th class="r">Valor unit.</th><th class="r">Total</th></tr></thead><tbody>
    ${somaPor(L.filter(r => !r.est), r => r.c).map(x => { const it = LPUI.get(x.k); return `<tr><td>${esc(x.k)}</td><td>${esc((it && it.d) || x.linhas[0].d)}</td><td>${esc((it && it.u) || x.linhas[0].u)}</td><td class="r">${fQtd(x.q)}</td><td class="r">${fBRL(x.linhas[0].v)}</td><td class="r"><b>${fBRL(x.total)}</b></td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">—</td></tr>'}</tbody></table></div></section>`;
}
function afterAdmBi() {
  $$('[data-biproj]').forEach(b => b.onclick = () => { S.biProj = b.dataset.biproj; const y = window.scrollY; render(); window.scrollTo(0, y); });
  const A = S.adm; if (!S.biProj) { afterFechamento(); afterRoteiro(); pintaBonus(); }
  $('#bBiCsv').onclick = () => {
    const L = biLinhas(); const cab = ['Data', 'Projeto', 'Técnico', 'Atividade', 'Referência', 'Código', 'Descrição', 'Unidade', 'Tipo', 'Quantidade', 'Valor unitário', 'Total'];
    const n = v => String(v).replace('.', ','); const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿' + [cab.join(';'), ...L.sort((a, b) => a.ts - b.ts).map(r => [r.dia.split('-').reverse().join('/'), q(projNome(r.proj) || ''), q(r.tec), q(r.ativ), q(r.ref || ''), q(r.c), q(r.d), r.u, r.est ? 'Material (estoque)' : r.t === 'M' ? 'Material' : 'Serviço', n(r.q), n(r.est ? '0.00' : r.v.toFixed(2)), n(r.total.toFixed(2))].join(';'))].join('\r\n');
    baixar(new File([csv], nomeArq(`Producao_LPU_${S.biProj && S.biProj !== '__sem' ? projNome(S.biProj) + '_' : ''}${A.de}_a_${A.ate}_${S.perfil.nome}`).replace(/\.pdf$/i, '') + '.csv', { type: 'text/csv' }));
  };
  $('#bBiPdf').onclick = async () => { const f = await gerarPdfProducao(); if (f) baixar(f); };
}
async function gerarPdfProducao() {
  if (!window.jspdf) { toast('Gerador de PDF não carregou.'); return null; }
  try {
    const A = S.adm, L = biLinhas(), tot = L.reduce((a, r) => a + r.total, 0); const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const logo = await logoData(); const LP = window.LPU || {};
    let y = pdfHeader(doc, logo, 'Relatório de Produção · LPU', `${LP.regiao || ''} · ${A.de.split('-').reverse().join('/')} a ${A.ate.split('-').reverse().join('/')}`, null);
    y = pdfSec(doc, y, 1, 'Resumo'); const S_ = L.filter(r => r.t === 'S').reduce((a, r) => a + r.total, 0);
    y = kv(doc, y, [['Técnico', S.perfil.nome], ['Período', `${A.de.split('-').reverse().join('/')} a ${A.ate.split('-').reverse().join('/')}`], ['LPU', `${LP.titulo || ''}`.slice(0, 90)], ['Total produzido', fBRL(tot)], ['Serviços', fBRL(S_)], ['Materiais', fBRL(tot - S_)], ['Atividades com lançamento', String(new Set(L.map(r => r.inspId)).size)]]);
    y = pdfSec(doc, y, 2, 'Por técnico'); const tecs = somaPor(L, 'tec');
    doc.autoTable({ ...TB, startY: y, head: [['Técnico', 'Atividades', 'Serviços', 'Materiais', 'Total', '%']], body: tecs.map(x => [x.k, x.ativ.size, fBRL(x.S), fBRL(x.M), fBRL(x.total), tot ? (x.total / tot * 100).toFixed(1).replace('.', ',') + '%' : '—']), columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' }, 5: { halign: 'right' } } });
    y = doc.lastAutoTable.finalY + 7; const dps = operacaoPorDupla(); const MM = metas(); const ff = fatorPeriodo(A.de, A.ate);
    y = pdfSec(doc, y, '$', 'Metas por dupla'); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90); doc.text(`Metas por dupla no ciclo 16 a 15${ff < 1 ? ` (proporcionais: ${Math.round(ff * 100)}% do ciclo)` : ''}: custo ${fBRL(MM.custo)} · mínimo ${fBRL(MM.minimo)} · ideal ${fBRL(MM.ideal)} · perfeito ${fBRL(MM.perfeito)}.`, 12, y + 1); y += 4; doc.setTextColor(20);
    doc.autoTable({ ...TB, startY: y, head: [['Dupla', 'Técnicos', 'Km', 'Produção', 'Custo', 'Resultado', 'Faixa']], body: dps.map(d => [d.nome, d.tecs.join(' + '), fKm(d.km), fBRL(d.prod), fBRL(d.custo), fBRL(d.resultado), d.fx.txt]), columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'right' }, 5: { halign: 'right' } }, didParseCell: c => { if (c.section === 'body' && (c.column.index === 5 || c.column.index === 6)) { const d = dps[c.row.index]; if (d && d.resultado < 0) c.cell.styles.textColor = [194, 49, 29]; } } });
    y = doc.lastAutoTable.finalY + 7; y = pdfSec(doc, y, 3, 'Itens produzidos'); const itens = somaPor(L, r => r.c);
    doc.autoTable({ ...TB, startY: y, head: [['Código', 'Descrição', 'Unid.', 'Qtd.', 'Unit.', 'Total']], body: itens.map(x => { const it = LPUI.get(x.k); return [x.k, (it && it.d) || x.linhas[0].d, (it && it.u) || x.linhas[0].u, fQtd(x.q), fBRL(x.linhas[0].v), fBRL(x.total)]; }), columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 13 }, 3: { halign: 'right', cellWidth: 16 }, 4: { halign: 'right', cellWidth: 22 }, 5: { halign: 'right', cellWidth: 26, fontStyle: 'bold' } } });
    y = doc.lastAutoTable.finalY + 7; y = pdfSec(doc, y, 4, 'Lançamentos (detalhe)');
    doc.autoTable({ ...TB, startY: y, head: [['Data', 'Técnico', 'Atividade', 'Código', 'Qtd.', 'Total']], body: L.sort((a, b) => a.ts - b.ts).map(r => [r.dia.split('-').reverse().join('/'), r.tec, `${r.ativ}${r.ref ? ' · ' + r.ref : ''}`, r.c, fQtd(r.q), fBRL(r.total)]), columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' } } });
    pdfFooter(doc, `Multivale Engenharia · Produção LPU · gerado em ${fDH(Date.now())}`);
    return new File([doc.output('blob')], nomeArq(`Producao_LPU_${A.de}_a_${A.ate}_${S.perfil.nome}`), { type: 'application/pdf' });
  } catch (e) { console.error(e); toast('Erro ao gerar o PDF: ' + e.message, 6000); return null; }
}


/* ---------- minha produção (técnico) ---------- */
async function producaoTec(de, ate) {
  const a0 = diaIni(de), a1 = diaFim(ate); const me = Nuvem.user ? Nuvem.user.id : null; const dp = me ? duplaDe(me) : null;
  const meus = (await DB.all('inspecoes')).filter(i => (i.chegada || i.criado) >= a0 && (i.chegada || i.criado) <= a1 && (i.lpu || []).length);
  const par = dp ? (await DB.all('equipe')).filter(e => dp.uids.includes(e._uid) && e._uid !== me && (e.chegada || 0) >= a0 && (e.chegada || 0) <= a1 && (e.lpu || []).length) : [];
  return { meus: meus.sort((x, y) => (y.chegada || 0) - (x.chegada || 0)), par, dp };
}
function viewProducao() {
  const at = ciclosAtalhos(false);
  S.prodPer = S.prodPer || [at[0][1], at[0][2]];
  return `<section class="card"><div class="chips" role="group" aria-label="Período">${at.map(([l, d, a]) => `<button type="button" data-pper="${d}|${a}" aria-checked="${S.prodPer[0] === d && S.prodPer[1] === a}">${l}</button>`).join('')}</div><span class="muted small">${fDM(S.prodPer[0])} a ${fDM(S.prodPer[1])} · o fechamento vai do dia 16 ao dia 15</span></section>
    <div id="prodBox"><p class="empty">Carregando…</p></div>`;
}
async function afterProducao() {
  const me = Nuvem.user ? Nuvem.user.id : (S.perfil.id || '');
  $$('[data-pper]').forEach(b => b.onclick = () => { S.prodPer = b.dataset.pper.split('|'); render(); });
  const [de, ate] = S.prodPer;
  if (Nuvem.user) { try { const m = await Nuvem.metasLer(); if (m && Object.keys(m).length) { S.metas = m; DB.putRaw('meta', { id: 'metas', m }); } } catch (e) {} }
  const meds = Nuvem.user ? await Nuvem.medMinhas().catch(() => new Map()) : new Map();
  const { meus, par, dp } = await producaoTec(de, ate); const box = $('#prodBox'); if (!box) return;
  const M = metas(); const f = fatorPeriodo(de, ate); const vMeu = meus.reduce((a, i) => a + valorOS(i) * parteOS(i, me), 0); const rateadas = meus.filter(i => rateioOS(i).length > 1).length; const vPar = par.reduce((a, i) => a + valorOS(i), 0); const vDupla = vMeu + vPar;
  const nomePar = dp ? (par[0] && (par[0]._tecnico || par[0].info.tecnico)) || 'parceiro' : '';
  box.innerHTML = `<section class="card"><h2>${dp ? esc(dp.nome) : 'Minha produção'}</h2>
      <div class="stats"><div class="stat"><b>${fBRL(vMeu)}</b><span>Minha produção</span></div>${dp ? `<div class="stat"><b>${fBRL(vPar)}</b><span>${esc(nomePar)}</span></div><div class="stat"><b>${fBRL(vDupla)}</b><span>Total da dupla</span></div>` : ''}<div class="stat"><b>${meus.length}</b><span>O.S. com produção</span></div></div>
      ${dp ? metaBarra(vDupla, M, f, projecao(vDupla, de, ate)) : `<p class="muted small" style="margin:0">Você ainda não está em uma dupla. O supervisor cadastra as duplas no painel.</p>${metaBarra(vMeu * 2, M, f, projecao(vMeu * 2, de, ate))}`}
      ${f < 1 ? `<p class="muted small" style="margin:0">Metas proporcionais ao período (${Math.round(f * 100)}% do ciclo).</p>` : ''}
      ${rateadas ? `<p class="muted small" style="margin:0">${rateadas} O.S. com equipe de apoio: a produção foi dividida em partes iguais entre as equipes e aqui conta só a sua parte.</p>` : ''}
      ${meus.some(claroCorr) ? '<p class="muted small" style="margin:0">Corretivas da Claro: só o serviço conta na produção; o material é consumo de estoque.</p>' : ''}</section>
    <div class="row" style="padding:0 2px"><button type="button" class="btn" id="bMeuExt">${ICON.pdf}Baixar meu extrato do período</button></div>
    <section class="acts"><div class="ah"><span>Minhas O.S.</span><span class="muted small" style="font-weight:500">${fBRL(vMeu)}</span></div>
      ${meus.map(i => { const d = new Date(i.chegada || i.criado); return `<button type="button" class="act ${isCorr(i) ? 'corr' : 'done'}" data-open="${i.id}"><span class="st"></span><span class="tm">${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}<span>${fHora(d.getTime())}</span></span><span class="bd"><b>${esc(rotuloEvento(i))}</b><span>${(i.lpu || []).length} item(ns) · ${esc((i.lpu || []).map(x => x.c).join(', ')).slice(0, 60)}</span></span><span class="ic">${medPill(meds.get(i.id))}<span class="pill ok">${fBRL(valorOS(i))}</span>${ICON.next}</span></button>`; }).join('') || '<p class="empty">Nenhuma O.S. com produção lançada no período.</p>'}</section>
    ${meus.length ? `<section class="card"><h2>Itens no período</h2><div class="tw"><table class="t"><thead><tr><th>Código</th><th>Descrição</th><th class="r">Qtd.</th><th class="r">Total</th></tr></thead><tbody>${(() => { const m = new Map(); meus.forEach(i => i.lpu.forEach(x => { const e = lpuEst(i, x); const k = x.c + (e ? '|e' : ''); const o = m.get(k) || { c: x.c, d: x.d, q: 0, t: 0, e }; o.q += +x.q || 0; o.t += vItem(i, x); m.set(k, o); })); return [...m.values()].sort((a, b) => b.t - a.t).map(o => `<tr><td>${esc(o.c)}</td><td>${esc(o.d)}</td><td class="r">${fQtd(o.q)}</td><td class="r">${o.e ? '<span class="muted small">estoque</span>' : `<b>${fBRL(o.t)}</b>`}</td></tr>`).join(''); })()}</tbody></table></div></section>` : ''}`;
  bindOpen(box);
  $('#bMeuExt') && ($('#bMeuExt').onclick = async () => {
    if (!window.jspdf) { toast('Gerador de PDF não carregou.'); return; }
    const a0 = diaIni(de), a1 = diaFim(ate); const rs = (await DB.all('rondas')).filter(r => r.inicio >= a0 && r.inicio <= a1);
    const km = rs.reduce((a, r) => { const od = odoInfo(r); return a + (od && od.odo >= 0 ? od.odo : totais(r).t.km); }, 0); const dias = new Set(rs.map(r => isoDate(r.inicio))).size;
    const dd = dp ? { nome: dp.nome, prod: vDupla, fx: faixa(vDupla, M, f) } : null;
    const d = extratoDados({ nome: S.perfil.nome, uid: Nuvem.user ? Nuvem.user.id : '' }, meus, meds, { de, ate, matricula: S.perfil.matricula, dias, km, dupla: dd, fechado: null });
    const { doc, logo } = await novoPdf(); pdfExtratoTec(doc, logo, d); pdfFooter(doc, `Técnico Plus - Multivale · extrato ${fDM(de)} a ${fDM(ate)} · gerado em ${fDH(Date.now())}`);
    const fl = new File([doc.output('blob')], nomeArq(`Extrato_${S.perfil.nome}_${de}_a_${ate}`), { type: 'application/pdf' }); if (navigator.canShare && navigator.canShare({ files: [fl] })) compartilhar([fl], 'Meu extrato de produção'); else baixar(fl);
  });
}

/* ---------- escala de plantão ---------- */
const PLA_TIPO = { plantao: 'Plantão', folga: 'Folga / férias' };
function plaDe(r) { return { id: r.id, uid: r.uid, tecnicoNome: r.tecnico_nome || '', tipo: r.tipo || 'plantao', inicio: +r.inicio, fim: +r.fim, obs: r.obs || '' }; }
function plaAgora(lista, uid, tipo, ts = Date.now()) { return (lista || []).find(p => (!uid || p.uid === uid) && (!tipo || p.tipo === tipo) && p.inicio <= ts && p.fim > ts) || null; }
function folgaHoje() { const d0 = diaIni(isoDate(Date.now())); return (S.plantoes || []).some(p => p.tipo === 'folga' && p.inicio < d0 + 86400000 && p.fim > d0 + 3600000 * 9); }
const fPla = p => `${fData(p.inicio).slice(0, 5)} ${fHora(p.inicio)} → ${fData(p.fim).slice(0, 5)} ${fHora(p.fim)}`;
function minhaEscalaHtml() {
  const l = (S.plantoes || []).filter(p => p.fim > Date.now()).slice(0, 6); if (!l.length) return '';
  const ag = plaAgora(l, null, 'plantao');
  return `<section class="acts"><div class="ah"><span>Minha escala</span>${ag ? `<span class="pill ok">De plantão até ${fHora(ag.fim)}</span>` : ''}</div>${l.map(p => `<div class="act ${p.tipo === 'folga' ? 'done' : 'ini'}" style="cursor:default"><span class="st"></span><span class="tm">${fData(p.inicio).slice(0, 5)}<span>${fHora(p.inicio)}</span></span><span class="bd"><b>${PLA_TIPO[p.tipo]}</b><span>${esc(fPla(p))}${p.obs ? ' · ' + esc(p.obs) : ''}</span></span></div>`).join('')}</section>`;
}
function escalaAdmHtml() {
  const A = S.adm; const base = diaIni(A.escSem || isoDate(Date.now())); const d = new Date(base); const seg = base - ((d.getDay() + 6) % 7) * 86400000;
  const dias = Array.from({ length: 7 }, (_, k) => seg + k * 86400000); const L = S.plantoesAdm || [];
  const cel = (uid, d0) => L.filter(p => p.uid === uid && p.inicio < d0 + 86400000 && p.fim > d0).map(p => `<button type="button" class="pill ${p.tipo === 'folga' ? 'done' : 'ok'}" data-pla="${p.id}" title="${esc(fPla(p) + (p.obs ? ' · ' + p.obs : ''))}" style="border:0;cursor:pointer;display:block;margin:2px 0">${p.tipo === 'folga' ? 'Folga' : `${p.inicio >= d0 ? fHora(p.inicio) : '…'}–${p.fim <= d0 + 86400000 ? fHora(p.fim) : '…'}`}</button>`).join('');
  return `<div class="row" style="justify-content:space-between"><div class="dnav"><button type="button" id="escPrev" aria-label="Semana anterior">${ICON.prev}</button><span style="min-width:150px;text-align:center">${fData(seg).slice(0, 5)} a ${fData(seg + 6 * 86400000).slice(0, 5)}</span><button type="button" id="escNext" aria-label="Próxima semana">${ICON.next}</button></div><button type="button" class="btn pri" id="bNovoPla" style="min-height:44px;flex:0 0 auto">${ICON.plus}Lançar plantão ou folga</button></div>
    <div class="tw"><table class="t"><thead><tr><th>Técnico</th>${dias.map(x => `<th>${['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(x).getDay()]} ${fData(x).slice(0, 5)}</th>`).join('')}</tr></thead><tbody>
    ${(A.tecnicos || []).map(t => `<tr><td><b>${esc(t.nome)}</b>${plaAgora(L, t.uid, 'plantao') ? '<br><span class="pill ok">de plantão agora</span>' : ''}</td>${dias.map(x => `<td>${cel(t.uid, x)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="8" class="muted">Nenhum técnico cadastrado.</td></tr>'}</tbody></table></div>
    <div id="plaForm"></div>`;
}
function plaFormHtml(p) {
  const dt = ts => { const d = new Date(ts); return `${isoDate(ts)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  return `<div class="card" style="background:var(--surface-2);box-shadow:none;border:1px solid var(--line)"><h3>${p._novo ? 'Novo lançamento' : 'Editar lançamento'}</h3>
    <div class="grid2"><div class="field"><label class="lb" for="pl_tec">Técnico</label><select id="pl_tec">${(S.adm.tecnicos || []).map(t => `<option value="${t.uid}" ${p.uid === t.uid ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div>
    <div class="field"><label class="lb" for="pl_tipo">Tipo</label><select id="pl_tipo">${Object.entries(PLA_TIPO).map(([k, l]) => `<option value="${k}" ${p.tipo === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label class="lb" for="pl_ini">Início</label><input type="datetime-local" id="pl_ini" value="${dt(p.inicio)}" style="min-height:48px;border:1px solid var(--line-strong);border-radius:var(--r);padding:8px 10px;background:var(--surface)"></div>
    <div class="field"><label class="lb" for="pl_fim">Fim</label><input type="datetime-local" id="pl_fim" value="${dt(p.fim)}" style="min-height:48px;border:1px solid var(--line-strong);border-radius:var(--r);padding:8px 10px;background:var(--surface)"></div>
    <div class="field full"><label class="lb" for="pl_obs">Observação</label><input type="text" id="pl_obs" value="${esc(p.obs || '')}" placeholder="Ex.: sobreaviso regional sul"></div></div>
    <div class="row"><button type="button" class="btn pri" id="bPlaSalva">${ICON.check}Salvar</button>${p._novo ? '' : '<button type="button" class="btn stop" id="bPlaDel">Excluir</button>'}<button type="button" class="btn" id="bPlaCanc">Cancelar</button></div></div>`;
}
async function carregaEscala() { const A = S.adm; const base = diaIni(A.escSem || isoDate(Date.now())); const d = new Date(base); const seg = base - ((d.getDay() + 6) % 7) * 86400000; try { S.plantoesAdm = await Nuvem.plantoesAdmin(seg - 86400000 * 7, seg + 86400000 * 14); } catch (e) { console.warn(e); S.plantoesAdm = S.plantoesAdm || []; } }
function pintaEscala() {
  const box = $('#escala'); if (!box) return; box.innerHTML = escalaAdmHtml(); const A = S.adm;
  const mv = async k => { A.escSem = isoDate(diaIni(A.escSem || isoDate(Date.now())) + k * 7 * 86400000 + 43200000); await carregaEscala(); pintaEscala(); };
  $('#escPrev').onclick = () => mv(-1); $('#escNext').onclick = () => mv(1);
  const abre = p => {
    $('#plaForm').innerHTML = plaFormHtml(p); $('#plaForm').scrollIntoView({ block: 'nearest' });
    $('#bPlaCanc').onclick = () => { $('#plaForm').innerHTML = ''; };
    $('#bPlaSalva').onclick = async () => {
      const t = S.adm.tecnicos.find(x => x.uid === $('#pl_tec').value); const ini = Date.parse($('#pl_ini').value), fim = Date.parse($('#pl_fim').value);
      if (!t) { toast('Escolha o técnico.'); return; } if (!(ini < fim)) { toast('O fim precisa ser depois do início.'); return; }
      const n = { id: p.id, uid: t.uid, tecnicoNome: t.nome, tipo: $('#pl_tipo').value, inicio: ini, fim, obs: $('#pl_obs').value.trim() };
      try { await Nuvem.plantaoSalvar(n); toast('Escala salva.'); await carregaEscala(); pintaEscala(); pintaVivo(); } catch (e) { toast('Erro: ' + e.message, 6000); }
    };
    $('#bPlaDel') && ($('#bPlaDel').onclick = async () => { if (!confirm('Excluir este lançamento da escala?')) return; try { await Nuvem.plantaoApagar(p.id); await carregaEscala(); pintaEscala(); } catch (e) { toast('Erro: ' + e.message, 6000); } });
  };
  $('#bNovoPla').onclick = () => { const d = new Date(); d.setHours(18, 0, 0, 0); abre({ _novo: true, id: 'pla-' + uid(), uid: (S.adm.tecnicos[0] || {}).uid, tipo: 'plantao', inicio: +d, fim: +d + 14 * 3600000, obs: '' }); };
  $$('[data-pla]', box).forEach(b => b.onclick = () => { const p = (S.plantoesAdm || []).find(x => x.id === b.dataset.pla); if (p) abre({ ...p }); });
}


/* ---------- acionamento Claro (texto colado) ---------- */
function parseAcionamento(txt) {
  const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  const campos = {}; const extras = [];
  String(txt || '').split(/\r?\n/).forEach(l => { const m = l.match(/^\s*([^:]{2,40}?)\s*:\s*(.*)$/); if (!m) return; const k = norm(m[1]), v = m[2].trim(); if (!v) return;
    const chave = k.startsWith('DATA') ? 'data' : k.startsWith('REDE') ? 'rede' : k.startsWith('ATIVIDADE') ? 'atividade' : k.startsWith('MOTIVO') ? 'motivo' : k.startsWith('NODE') || k.startsWith('NO ') ? 'node' : k.startsWith('ENDERECO') ? 'endereco' : k.startsWith('CIDADE') || k.startsWith('MUNICIPIO') ? 'cidade' : k.startsWith('BAIRRO') ? 'bairro' : k.startsWith('SOLICITANTE') ? 'solicitante' : k.includes('EVENTO') || k.startsWith('TICKET') || k.startsWith('INCIDENTE') ? 'evento' : k.startsWith('EMERGENCIAL') ? 'emergencial' : k.startsWith('PROGRAMADA') ? 'programada' : k.startsWith('TELEFONE') || k.startsWith('CONTATO') ? 'contato' : null;
    if (chave) campos[chave] = v; else extras.push(`${m[1].trim()}: ${v}`); });
  const ok = /ACIONAMENTO/i.test(txt) || !!(campos.evento || campos.endereco);
  const sim = v => /^S(IM)?$/i.test(norm(v));
  const cap = t => String(t || '').toLowerCase().replace(/(^|[\s/(-])([a-zà-ú])/g, (a, b, c) => b + c.toUpperCase()).replace(/ (D[aeo]s?|E|Em|No|Na) /g, m => m.toLowerCase());
  return { ok, campos, extras,
    atividade: { tipo: 'emergencial', cliente: 'Claro', ticket: (campos.evento || '').toUpperCase(), ocorrencia: campos.motivo ? cap(campos.motivo) : '', endereco: [campos.endereco, campos.bairro, campos.cidade].filter(Boolean).map(cap).join(', '),
      rede: campos.rede || '', node: (campos.node || '').toUpperCase(), solicitante: campos.solicitante ? cap(campos.solicitante) : '', dataAcionamento: campos.data || '', atividadeClaro: campos.atividade || '', contato: campos.contato || '',
      emergencial: campos.emergencial ? sim(campos.emergencial) : true, programada: campos.programada ? sim(campos.programada) : false,
      descricao: [campos.atividade && `Atividade: ${campos.atividade}`, campos.motivo && `Motivo: ${campos.motivo}`, campos.rede && `Rede: ${campos.rede}`, campos.node && `Node: ${campos.node}`, campos.solicitante && `Solicitante: ${campos.solicitante}`, campos.contato && `Contato: ${campos.contato}`, campos.data && `Data do acionamento: ${campos.data}`, ...extras].filter(Boolean).join('\n') } };
}
// Chamado de corretiva de backbone de parceiro (fora do contrato Claro SP), ex.: TIM
function parseChamadoParceiro(txt) {
  const L = String(txt || '').split(/\r?\n/).map(l => l.replace(/\t+/g, ' ').trim()).filter(Boolean);
  const get = re => { for (const l of L) { const m = l.match(re); if (m) return m[1].trim().replace(/;\s*$/, ''); } return ''; };
  const chamado = get(/^chamado\s*[^:]*:\s*(.+)$/i); const [ev, tsk] = chamado.split(/\s*\/\s*/);
  const oper = get(/^chamado\s+([A-Za-zÀ-ú]{2,})\s*:/i); const assin = get(/^nome do assinante:\s*(.+)$/i);
  const trecho = get(/^trecho:\s*(.+)$/i), pa = get(/^ponta a:\s*(.+)$/i), pb = get(/^ponta b:\s*(.+)$/i), desig = get(/^designa[cç][aã]o:\s*(.+)$/i), falha = get(/^falha:\s*(.+)$/i);
  const equip = get(/^equipamento:\s*(.+)$/i), hora = get(/^hor[aá]rio da falha:\s*(.+)$/i), prov = get(/^provedor:\s*(.+)$/i), cont = get(/^nome de contato:\s*(.+)$/i), tel = get(/^telefone de contato:\s*(.+)$/i), mail = get(/^e-?mail de contato:\s*(.+)$/i), cnpj = get(/^cnpj[:\s]+(.+)$/i), att = get(/^att\.?\s+(.+)$/i);
  const proto = (L.find(l => /^\d{10,}$/.test(l)) || ''); const curvas = L.find(l => /curvas retiradas|retirada de curva/i.test(l)) || '';
  const ok = !!((ev || proto) && (trecho || desig || falha));
  const cap = t => String(t || '').toLowerCase().replace(/(^|[\s/(-])([a-zà-ú])/g, (a, b, c) => b + c.toUpperCase()).replace(/ (D[aeo]s?|E|Em|No|Na|X) /g, m => m.toLowerCase()).replace(/-([a-z]{2})\b/g, (m, uf) => '-' + uf.toUpperCase());
  const cli = (oper || (assin.match(/^([A-Za-zÀ-ú]+)/) || [])[1] || 'Parceiro').toUpperCase();
  return { ok, tipoTexto: 'parceiro', atividade: { tipo: 'emergencial', cliente: cli === 'CLARO' ? 'Claro' : cli, centro: 'backbone', ticket: String(ev || proto).toUpperCase(), tsk: String(tsk || '').toUpperCase(), protocolo: proto, ocorrencia: falha ? cap(falha) : 'Falha no trecho', designacao: desig.toUpperCase(), trecho: trecho.toUpperCase(), pontaA: pa, pontaB: pb, equipamento: equip, dataAcionamento: hora, solicitante: att ? cap(att) : '', contato: [cont, tel, mail].filter(Boolean).join(' · '), cnpj, provedor: prov,
    refLocal: trecho ? 'Trecho ' + trecho.toUpperCase() : '', endereco: pa ? cap(pa.replace(/\s+-\s+/, ', ')) : '',
    descricao: [curvas, chamado && `Chamado ${cli}: ${chamado}`, proto && `Protocolo: ${proto}`, falha && `Falha: ${falha}`, trecho && `Trecho: ${trecho}`, pa && `Ponta A: ${pa}`, pb && `Ponta B: ${pb}`, desig && `Designação: ${desig}`, equip && `Equipamento: ${equip}`, hora && `Horário da falha: ${hora}`, cont && `Contato: ${[cont, tel, mail].filter(Boolean).join(' · ')}`, att && `Enviado por: ${att}`].filter(Boolean).join('\n') } };
}
// Lê o texto e decide o formato: acionamento Claro ou chamado de parceiro
function lerAcionamento(txt) {
  const t = String(txt || '');
  if (/ORIUNDO DO EVENTO|^\s*ACIONAMENTO\s*$/im.test(t)) { const p = parseAcionamento(t); const cid = String((p.campos || {}).cidade || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); p.atividade.centro = /^SAO PAULO\b/.test(cid) ? 'claro_sp' : 'claro_int'; p.tipoTexto = 'claro'; return p; }
  const q = parseChamadoParceiro(t); if (q.ok) return q;
  const p = parseAcionamento(t); p.tipoTexto = 'claro'; if (p.ok) { const cid = String((p.campos || {}).cidade || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); p.atividade.centro = /^SAO PAULO\b/.test(cid) ? 'claro_sp' : 'claro_int'; } return p;
}
const LONGA_MS = 2 * 3600000;
function tecPickerHtml(a) {
  const agora = Date.now(); const vivo = S.vivo || new Map(); const abertas = [...(S.atvsAdm || new Map()).values()].filter(x => atvAberta(x) && x.id !== a.id);
  const R = a.lat != null ? Rota.paraTecs(a, posTecs(), reRota) : null;
  const L = (S.adm.tecnicos || []).map(t => { const v = vivo.get(t.uid); const si = situacaoTec(t.uid); const ativo = !!(v && v.ativo); const dur = ativo && v.inicio ? agora - v.inicio : 0; const livre = si.cls === 'ok' && !ativo; const longa = ativo && dur >= LONGA_MS; const d = a.lat != null && v && v.lat != null && agora - (v.ts || 0) < 3 * 3600000 ? hav(a, v) : null; const r = R && R.get(t.uid); const fila = abertas.filter(x => x.tecnicoUid === t.uid).length; return { t, si, ativo, dur, livre, longa, d, r, fila, v }; })
    .sort((x, y) => (y.livre - x.livre) || (y.longa - x.longa) || (x.fila - y.fila) || ((x.r ? x.r.s : x.d != null ? x.d / 12 : 1e9) - (y.r ? y.r.s : y.d != null ? y.d / 12 : 1e9)));
  if (!L.length) return '';
  return `<div class="field" id="tecPicker"><span class="lb">Escolha o técnico</span><div class="list" style="gap:6px">${L.map(x => { const cor = x.livre ? 'var(--ok)' : x.longa ? '#d9a400' : 'var(--line)'; const tag = x.livre ? '<span class="pill ok">Sem atividade</span>' : x.longa ? `<span class="pill draft">Há ${fDur(x.dur)} na mesma atividade</span>` : x.ativo ? `<span class="pill done">Em atividade há ${fDur(x.dur)}</span>` : `<span class="pill ${x.si.cls === 'bad' ? 'bad' : ''}" style="${x.si.cls ? '' : 'background:var(--surface-2);color:var(--muted)'}">${esc(x.si.txt)}</span>`;
    return `<button type="button" class="item" data-pick="${x.t.uid}" aria-pressed="${a.tecnicoUid === x.t.uid}" style="border:2px solid ${cor};border-radius:8px;padding:10px 12px;${x.si.cls === 'ok' || x.ativo ? '' : 'opacity:.75'}"><span class="badge" style="background:${x.livre ? 'var(--ok)' : x.longa ? '#d9a400' : 'var(--accent-soft)'};color:${x.livre || x.longa ? '#fff' : 'var(--accent)'}">${esc(iniciais(x.t.nome))}</span><span class="tx"><b>${esc(x.t.nome)}</b><span style="white-space:normal">${x.ativo ? esc((TIPOLB[x.v.tipo] || 'Atividade') + (x.v.ticket ? ' ' + x.v.ticket : '')) + ' · ' : ''}${esc(x.si.txt)}${x.r ? ` · 🚗 ${fRota(x.r)} até o local` : x.d != null ? ` · ~${fDist(x.d)} do local (linha reta)` : ''} · ${x.fila ? x.fila + ' na fila' : 'fila vazia'}</span></span>${tag}</button>`; }).join('')}</div><span class="muted small">Ao salvar, a atividade entra na fila de execução do técnico escolhido. Se ele estiver ocupado, ela fica aguardando e o alarme toca quando terminar a atual.</span></div>`;
}
function sugereTecnico(a) {
  const agora = Date.now(); const vivo = S.vivo || new Map();
  const cand = (S.adm.tecnicos || []).map(t => { const v = vivo.get(t.uid); const si = situacaoTec(t.uid); const livre = si.cls === 'ok' && !(v && v.ativo); const d = a.lat != null && v && v.lat != null && agora - (v.ts || 0) < 3 * 3600000 ? hav(a, v) : null; return { t, si, livre, d }; }).filter(x => x.si.cls === 'ok');
  cand.sort((x, y) => (y.livre - x.livre) || ((x.d ?? 1e9) - (y.d ?? 1e9)));
  return cand[0] || null;
}

/* ---------- supervisor: fila de atividades e despacho ---------- */
function situacaoTec(uid) {
  const v = (S.vivo || new Map()).get(uid); const agora = Date.now();
  const pl = plaAgora(S.plantoesAdm, uid, 'plantao'), fg = plaAgora(S.plantoesAdm, uid, 'folga');
  if (v && v.ativo) return { cls: 'ok', txt: v.tipo === 'corretiva' ? 'Em corretiva ' + (v.ticket || '') : 'Em ' + (TIPOLB[v.tipo] || 'ronda preventiva').toLowerCase() };
  if (v && v.refeicao) return { cls: 'draft', txt: 'Em refeição até ' + fHora(v.refeicao + jornada().refeicaoMin * 60000) };
  if (v && v.expediente && agora - (v.ts || 0) < 3 * 3600000) return { cls: 'ok', txt: 'Disponível · expediente desde ' + fHora(v.expIni) + (v.distCasa != null ? ` (a ${fDist(v.distCasa)} de casa)` : '') };
  if (pl) return { cls: 'ok', txt: 'De plantão até ' + fHora(pl.fim) };
  if (fg) return { cls: '', txt: 'De folga' };
  if (emJornada()) return { cls: 'bad', txt: 'Expediente não iniciado' + (v && v.casaOk === false ? ' · residência não cadastrada' : '') };
  return { cls: '', txt: 'Fora do expediente' };
}
function filaHtml() {
  const fc = S.filaClu ?? (meusClusters().length ? 'meus' : ''); const passa = a => { if (!fc) return true; const k = clusterOS(a); return fc === 'meus' ? (!k || meusClusters().includes(k)) : fc === 'sem' ? !k : k === fc; }; // "meus" também mostra as O.S. sem cluster, para nenhuma ficar esquecida
  const l = [...(S.atvsAdm || new Map()).values()]; const abertas = l.filter(atvAberta).filter(passa).sort((p, q) => p.criado - q.criado);
  const chipsClu = `<div class="chips" role="group" aria-label="Cluster da O.S." style="margin-bottom:8px">${[['', 'Todos os clusters'], ...(meusClusters().length ? [['meus', 'Meus clusters (+ sem cluster)']] : []), ...Object.entries(CLUSTERS), ['sem', 'Sem cluster']].map(([k, n]) => `<button type="button" role="radio" data-filaclu="${k}" aria-checked="${fc === k}">${esc(n)}</button>`).join('')}</div>`;
  const hoje0 = diaIni(isoDate(Date.now())); const concl = l.filter(a => a.status === 'concluida' && (a.concluidaEm || a.atualizado || 0) >= hoje0).length;
  const ha = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.floor(m / 60)}h${pad2(m % 60)}` : `há ${Math.floor(m / 1440)} d`; };
  const linha = a => `<button type="button" class="act ${atvEmerg(a) ? 'nc' : atvImpl(a) ? 'done' : 'pend'}" data-atvadm="${a.id}"><span class="st"></span><span class="tm">${fHora(a.criado)}<span>${ha(a.criado)}</span></span><span class="bd"><b>${clusterOS(a) ? `<span class="pill" style="font-size:11px;margin-right:4px">${esc(CLUSTERS[clusterOS(a)].replace('Cluster ', ''))}</span>` : ''}${esc(a.ticket || 'Sem ticket')}${atvImpl(a) ? ' · ' + esc(IMPL_SERV[a.servico] || '') + (a.designacao ? ' · ' + esc(a.designacao) : '') : a.ocorrencia ? ' · ' + esc(a.ocorrencia) : ''}</b><span>${a.tecnicoNome ? esc(a.tecnicoNome) : '<b style="color:var(--bad)">Sem técnico</b>'}${(a.apoioUids || []).length ? ` <b>+ ${a.apoioUids.length} apoio</b>` : ''} · ${esc(stAtv(a))}${slaTag(a)}${(a.status === 'em_deslocamento' || a.status === 'no_local') ? (() => { const m = (Date.now() - (a.ultAtualiz || a.iniciadaEm || a.atualizado || a.criado)) / 60000; return ` · <b style="color:${m >= ATUALIZA_ADM_MIN ? 'var(--bad)' : 'inherit'}">atualizada há ${fHm(m)}</b>`; })() : ''}${atvRef(a) ? ' · ' + esc(atvRef(a)) : a.endereco ? ' · ' + esc(a.endereco) : ''}</span></span><span class="ic">${logTag(a.log)}${ICON.next}</span></button>`;
  const col = (tit, arr) => `<div><h3><span>${tit}</span><span>${arr.length}</span></h3>${arr.map(linha).join('') || '<p class="empty">Fila vazia.</p>'}</div>`;
  return chipsClu + `<div class="fila2">${col('Emergenciais', abertas.filter(atvEmerg))}${col('Preventivas', abertas.filter(a => a.tipo === 'preventiva'))}${col('Implantação', abertas.filter(atvImpl))}</div><p class="muted small" style="margin:0">${concl} concluída(s) hoje.</p>`;
}
function escAlertaHtml() {
  const l = [...(S.atvsAdm || new Map()).values()].filter(a => (a.log || 0) >= 4 && !a.escalonadoEm && a.status !== 'cancelada');
  return l.map(a => `<div class="banner"><span>${esc(a.ticket || 'Atividade')} chegou ao LOG ${a.log}: escalonar ao gerente</span><button type="button" class="btn" data-escalona="${a.id}">Escalonar agora</button></div>`).join('');
}
function pintaFila() { const f = $('#fila'); if (f) { f.innerHTML = filaHtml(); $$('[data-atvadm]', f).forEach(b => b.onclick = () => abrirAtvAdm(b.dataset.atvadm)); $$('[data-filaclu]', f).forEach(b => b.onclick = () => { S.filaClu = b.dataset.filaclu; pintaFila(); }); } const e = $('#escAlerta'); if (e) { e.innerHTML = escAlertaHtml(); $$('[data-escalona]', e).forEach(b => b.onclick = () => escalonar(S.atvsAdm.get(b.dataset.escalona))); } }
function ouvirAtvAdm() {
  if (S.unAtv) return;
  S.unAtv = Nuvem.ouvirAtv((tipo, a) => { if (!a || !a.id) return; S.atvsAdm = S.atvsAdm || new Map(); const ant = S.atvsAdm.get(a.id); if (tipo !== 'DELETE' && a.vistaEm && ant && !ant.vistaEm) { toast(`${a.tecnicoNome || 'Técnico'} confirmou o recebimento da O.S. ${a.ticket || ''}.`, 6000); try { if ('Notification' in window && Notification.permission === 'granted') new Notification(`O.S. ${a.ticket || ''} recebida`, { body: `${a.tecnicoNome || 'Técnico'} viu a O.S. às ${fHora(a.vistaEm)}`, tag: 'vista-' + a.id }); } catch (e) {} } if (tipo === 'DELETE') S.atvsAdm.delete(a.id); else S.atvsAdm.set(a.id, a); pintaFila(); if (S.view === 'admAtv' && S.atvEdit && S.atvEdit.id === a.id && tipo !== 'DELETE') { const st = $('#atStatus'); if (st) st.textContent = stAtv(a); } });
}
function abrirAtvAdm(id) {
  const a = id ? { ...S.atvsAdm.get(id) } : { _novo: true, id: 'atv-' + uid(), tipo: 'emergencial', status: 'pendente', ticket: '', ocorrencia: '', rotaId: '', refSentido: '', refKm: '', refLocal: '', endereco: '', lat: null, lon: null, mapsUrl: '', descricao: '', tecnicoUid: '', tecnicoNome: '' };
  S.atvEdit = a; go('admAtv');
}
async function proximoTicketOS() { const d = new Date(), p = `OS-${String(d.getFullYear()).slice(2)}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-`; const n = [...(S.atvsAdm || new Map()).values()].filter(a => String(a.ticket || '').startsWith(p)).length; return p + String(n + 1).padStart(3, '0'); }
function viewAdmAtv(a) {
  const rt = a.rotaId ? rotaById(a.rotaId) : null; const em = a.tipo === 'emergencial'; const novo = !!a._novo;
  const locTxt = a.lat != null ? `Ponto definido: ${a.lat.toFixed(5)}, ${a.lon.toFixed(5)}` : a.mapsUrl ? 'Link do Google guardado: o técnico abre direto no GPS.' : 'Nenhum ponto definido.';
  return `<section class="card"><div class="row" style="justify-content:space-between"><h2>${novo ? 'Nova atividade' : 'Atividade ' + esc(a.ticket || '')}</h2>${novo ? '' : `<span class="pill ${a.status === 'concluida' ? 'done' : a.status === 'cancelada' ? 'bad' : 'ok'}" id="atStatus">${stAtv(a)}</span>`}</div>
    ${novo ? '' : `<div class="row" style="gap:8px">${logTag(a.log)}${a.escalonadoEm ? `<span class="muted small">Gerente avisado em ${fDH(a.escalonadoEm)}</span>` : ''}</div>`}
    ${novo || a.cliente ? `<details class="card" style="background:var(--surface-2);box-shadow:none;border:1px solid var(--line);padding:12px" ${a._colar ? 'open' : ''}><summary style="cursor:pointer;font-weight:600;min-height:32px;display:flex;align-items:center">Colar texto do acionamento (Claro ou chamado de parceiro)</summary>
      <p class="muted small" style="margin:6px 0">Cole o texto como chega. Acionamento Claro (ACIONAMENTO, MOTIVO, NODE, ENDEREÇO, ORIUNDO DO EVENTO…) ou chamado de parceiro, como o da TIM (Chamado, Falha, Trecho, Ponta A/B, Designação…). O app preenche a corretiva, localiza o endereço e sugere o técnico.</p>
      <textarea id="atTxt" placeholder="ACIONAMENTO&#10;DATA: 09/10/2026&#10;REDE: HFC COAXIAL&#10;…" style="min-height:150px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px">${esc(a._txt || '')}</textarea>
      <button type="button" class="btn pri block" id="bAtLer" style="margin-top:8px">Ler acionamento</button></details>` : ''}
    ${a.cliente && a.cliente !== 'Claro' ? `<div class="okbox small"><b>Chamado ${esc(a.cliente)}${a.tsk ? ' · ' + esc(a.tsk) : ''}</b>${a.trecho ? ' · trecho ' + esc(a.trecho) : ''}${a.designacao ? ' · ' + esc(a.designacao) : ''}${a.equipamento ? ' · ' + esc(a.equipamento) : ''}${a.dataAcionamento ? ' · falha em ' + esc(a.dataAcionamento) : ''}</div>` : ''}
    ${a.cliente === 'Claro' ? `<div class="okbox small"><b>Corretiva Claro${a.programada ? ' · programada' : a.emergencial === false ? '' : ' · emergencial'}</b>${a.node ? ' · Node ' + esc(a.node) : ''}${a.rede ? ' · ' + esc(a.rede) : ''}${a.solicitante ? ' · solicitante ' + esc(a.solicitante) : ''}${a.dataAcionamento ? ' · acionado em ' + esc(a.dataAcionamento) : ''}</div>` : ''}
    ${(a.atualizacoes || []).length ? `<details class="card" style="background:var(--surface-2);box-shadow:none;border:1px solid var(--line);padding:12px" open><summary style="cursor:pointer;font-weight:600">Atualizações do técnico (${a.atualizacoes.length})</summary><div class="list">${a.atualizacoes.slice().reverse().map(u => `<div class="item" style="cursor:default"><span class="badge" style="width:auto;padding:0 8px;border-radius:6px">${fHora(u.ts)}</span><span class="tx"><b>${esc(SIT_OS[u.sit] || (u.sit === 'recebida' ? '✅ O.S. recebida' : u.sit) || '')}${u.prev ? ' · previsão ' + esc(u.prev) : ''}</b><span style="white-space:normal">${esc(u.txt || '')} · ${fData(u.ts).slice(0, 5)} · ${esc(u.por || '')}</span></span></div>`).join('')}</div></details>` : ''}
    ${anexosEditHtml(a)}
    ${!novo && (a.status === 'em_deslocamento' || a.status === 'no_local') ? `<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><button type="button" class="btn go" data-upcobra2="${a.id}">Cobrar atualização do técnico</button><span class="muted small">${a.ultAtualiz ? 'Última atualização ' + fHora(a.ultAtualiz) : 'Ainda sem atualização'}${a.cobrarAtualizEm && a.cobrarAtualizEm > (a.ultAtualiz || 0) ? ' · cobrada às ' + fHora(a.cobrarAtualizEm) : ''}</span></div>` : ''}
    <div class="field"><label class="lb" for="at_agenda">Agendada para</label><input type="date" id="at_agenda" data-atf="agendaDia" value="${esc(a.agendaDia || isoDate(Date.now()))}"><span class="muted small">O alarme do técnico só toca nesse dia.${(a.remanejos || []).length ? ' Remanejada: ' + a.remanejos.map(x => `${fDM(x.de).slice(0, 5)}→${fDM(x.para).slice(0, 5)} (${esc(x.por || '')}${x.pedidoPor ? ', pedido de ' + esc(x.pedidoPor) : ''})`).join(', ') : ''}</span></div>
    <div class="field"><label class="lb" for="at_clu">Cluster da O.S.</label><select id="at_clu"><option value="">Automático pela cidade${(() => { const r = regiaoDeTexto(a.cidade, a.geo && a.geo.formatado, a.endereco); return r ? ` (${esc(CLUSTERS[r.cluster])}${r.mini && MINI[r.mini] ? ' · ' + esc(MINI[r.mini][0]) : ''})` : ' (cidade não reconhecida)'; })()}</option>${Object.entries(CLUSTERS).map(([k, l]) => `<option value="${k}" ${a.clusterManual && a.cluster === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    ${projAtivos().length ? `<div class="field"><label class="lb" for="at_proj">Projeto <span class="req">*</span></label><select id="at_proj" data-atf="projeto">${projOpts(a.projeto || projSugerido(a))}</select><span class="muted small">Separa a O.S. na medição, no faturamento e no BI.</span></div>` : ''}
    <div class="field"><label class="lb" for="at_centro">Centro de custo / faturamento</label><select id="at_centro" data-atf="centro"><option value="">Não definido</option>${Object.entries(CENTROS).map(([k, l]) => `<option value="${k}" ${a.centro === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="seg" role="group" aria-label="Tipo"><button type="button" data-attipo="emergencial" aria-pressed="${em}">Emergencial</button><button type="button" data-attipo="preventiva" aria-pressed="${a.tipo === 'preventiva'}">Preventiva</button><button type="button" data-attipo="implantacao" aria-pressed="${a.tipo === 'implantacao'}">Implantação</button></div>
    ${a.tipo === 'implantacao' ? `<div class="grid2"><div class="field"><label class="lb" for="at_serv">Serviço</label><select id="at_serv" data-atf="servico">${Object.entries(IMPL_SERV).map(([k, l]) => `<option value="${k}" ${(a.servico || 'roteamento') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label class="lb" for="at_des">Designação</label><input type="text" id="at_des" data-atf="designacao" value="${esc(a.designacao || '')}" autocapitalize="characters"></div>
      <div class="field"><label class="lb" for="at_proj">Projeto</label><select id="at_proj" data-atf="projeto"><option value="">Selecione…</option>${LISTAS_PADRAO.projetoImpl.map(o => `<option ${a.projeto === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div><div class="field"><span class="lb">Sites</span><div class="row" style="flex-wrap:nowrap;gap:6px"><input type="text" id="at_sa" data-atf="siteA" value="${esc(a.siteA || '')}" placeholder="Site A" aria-label="Site A" style="min-width:0"><input type="text" id="at_sb" data-atf="siteB" value="${esc(a.siteB || '')}" placeholder="Site B" aria-label="Site B" style="min-width:0"></div></div></div>` : ''}
    <div class="grid2"><div class="field"><label class="lb" for="at_wfc">WFC</label><input type="text" id="at_wfc" data-atf="wfc" value="${esc(a.wfc || '')}" placeholder="Ticket WFC (faturamento)" autocapitalize="characters"></div><div class="field"><label class="lb" for="at_wf2">WF2</label><input type="text" id="at_wf2" data-atf="wf2" value="${esc(a.wf2 || '')}" placeholder="Ticket WF2 (faturamento)" autocapitalize="characters"></div></div>
    <div class="grid2"><div class="field"><label class="lb" for="at_ticket">Ticket</label><input type="text" id="at_ticket" data-atf="ticket" value="${esc(a.ticket)}" placeholder="Em branco = automático" autocapitalize="characters"></div>
    ${em ? `<div class="field"><label class="lb" for="at_ocorr">Ocorrência</label><select id="at_ocorr" data-atf="ocorrencia"><option value="">Selecione…</option>${[...OCORR, ...(a.ocorrencia && !OCORR.includes(a.ocorrencia) ? [a.ocorrencia] : [])].map(o => `<option ${a.ocorrencia === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>` : '<div></div>'}</div>
    <div class="field"><label class="lb" for="at_rota">Rota do cabo</label><select id="at_rota">${rotaOpts(a.rotaId, 'Sem rota')}</select></div>
    ${rt ? `<div class="field">${refRotaHtml(rt, a.refSentido, a.refKm, 'at')}</div>` : `<div class="field"><span class="lb">Referência (opcional)</span><div class="row" style="flex-wrap:nowrap;gap:8px;align-items:center"><input type="text" inputmode="decimal" id="at_refKm" data-atf="refKm" value="${esc(a.refKm)}" placeholder="km" style="width:84px;text-align:right" aria-label="km"><span style="font-weight:600;white-space:nowrap">km de</span><input type="text" id="at_cidade" data-atf="refLocal" value="${esc(a.refLocal)}" placeholder="Cidade" style="flex:1;min-width:0" aria-label="Cidade"></div></div>`}
    <div class="field"><label class="lb" for="at_end">Endereço</label><div class="row" style="flex-wrap:nowrap"><input type="text" id="at_end" data-atf="endereco" value="${esc(a.endereco)}" placeholder="Rua, nº, cidade" style="flex:1;min-width:0"><button type="button" class="btn" id="bAtGeo" style="min-height:48px;flex:0 0 auto">Achar no mapa</button></div>${geoInfoHtml(a)}</div>
    <div class="field"><label class="lb" for="at_loc">Localização do Google Maps</label><input type="text" id="at_loc" value="${esc(a.mapsUrl || (a.lat != null ? a.lat + ', ' + a.lon : ''))}" placeholder="Cole o link do Google Maps ou as coordenadas"><span class="muted small" id="atLocInfo">${esc(locTxt)} Você também pode tocar no mapa.</span></div>
    <div class="map" id="mapAtv" style="height:260px" role="img" aria-label="Mapa para marcar o local"></div>
    <div class="field"><label class="lb" for="at_desc">Descrição</label><textarea id="at_desc" data-atf="descricao" placeholder="O que o técnico precisa saber" style="min-height:72px">${esc(a.descricao)}</textarea></div>
    ${tecPickerHtml(a)}
    <div class="field"><label class="lb" for="at_tec">Técnico</label>${a._sug ? `<span class="small" style="color:var(--ok);font-weight:600">${esc(a._sug)}</span>` : ''}<select id="at_tec">${tecOptsAtv(a)}</select><span class="muted small" id="atDistInfo">${a.lat != null ? 'Distância e tempo pelo trajeto de carro, da posição atual (GPS) de cada técnico até a O.S.' : 'Marque o local da O.S. para ver a distância de cada técnico.'}</span>${a.distVista != null ? `<span class="small">Ao confirmar o recebimento, o técnico estava a <b>${a.tempoVista != null ? fRota({ m: a.distVista, s: a.tempoVista }) : fDist(a.distVista) + ' (linha reta)'}</b> do local.</span>` : ''}</div>
    <div class="field"><span class="lb">Equipe de apoio <span class="muted small" style="font-weight:400">(opcional · recebem a O.S. com alarme; a produção fica com o técnico principal)</span></span><div class="chips" id="atApoio" role="group" aria-label="Equipe de apoio" style="flex-wrap:wrap">${(S.adm.tecnicos || []).filter(t => t.uid !== a.tecnicoUid).map(t => { const si = situacaoTec(t.uid); const on = (a.apoioUids || []).includes(t.uid); const st = (a.apoioSt || {})[t.uid]; return `<button type="button" data-apoio="${t.uid}" aria-checked="${on}" title="${esc(si.txt)}">${on ? ICON.check : ''}${esc(t.nome)}${on && st ? ` · ${esc(ATV_ST[st] || st)}` : ''}</button>`; }).join('') || '<span class="muted small">Cadastre mais técnicos para usar o apoio.</span>'}</div></div>
    ${a.status === 'concluida' || a.status === 'cancelada' ? '' : `<button type="button" class="btn pri block" id="bAtSalvar">${ICON.check}${novo ? 'Salvar e enviar ao técnico' : 'Salvar alterações'}</button>`}
    ${!novo && (a.log || 0) >= 4 ? `<button type="button" class="btn block" id="bAtEsc" style="border-color:var(--st-nc);color:var(--st-nc)">Escalonar ao gerente (WhatsApp)</button>` : ''}
    ${!novo && atvAberta(a) ? `<button type="button" class="btn stop block" id="bAtCanc">Cancelar atividade</button>` : ''}
    ${!novo ? `<button type="button" class="btn block" id="bAtDel" style="color:var(--bad);border-color:var(--bad)">${ICON.trash || ''}Excluir O.S. do sistema</button>` : ''}
    ${!novo ? `<p class="muted small" style="margin:0">Criada ${fDH(a.criado)}${a.recebidaEm ? ' · entregue ' + fHora(a.recebidaEm) : ''}${a.vistaEm ? ' · <b>vista pelo técnico ' + fHora(a.vistaEm) + '</b>' : ''}${a.iniciadaEm ? ' · deslocamento ' + fHora(a.iniciadaEm) : ''}${a.chegadaEm ? ' · no local ' + fHora(a.chegadaEm) : ''}${a.concluidaEm ? ' · concluída ' + fHora(a.concluidaEm) : ''}</p>` : ''}</section>`;
}
function afterAdmAtv() {
  const a = S.atvEdit; const re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  $$('[data-atf]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { a[el.dataset.atf] = el.value; }));
  $('#at_clu') && ($('#at_clu').onchange = e => { if (e.target.value) { a.cluster = e.target.value; a.mini = ''; a.clusterManual = true; } else { a.clusterManual = false; } });
  bindAnexos(a, () => { const y = window.scrollY; render(); window.scrollTo(0, y); });
  $$('[data-attipo]').forEach(b => b.onclick = () => { a.tipo = b.dataset.attipo; if (a.tipo === 'implantacao' && !a.servico) a.servico = 'roteamento'; re(); });
  $('#at_rota').onchange = e => { a.rotaId = e.target.value; a.refSentido = ''; re(); };
  $$('[data-atsent]').forEach(b => b.onclick = () => { a.refSentido = b.dataset.atsent; re(); });
  $('#at_refKm') && $('#at_refKm').addEventListener('input', e => { a.refKm = e.target.value; });
  $$('[data-pick]').forEach(b => b.onclick = () => { a.tecnicoUid = b.dataset.pick; if ((a.apoioUids || []).includes(a.tecnicoUid)) { a.apoioUids = a.apoioUids.filter(x => x !== a.tecnicoUid); setTimeout(pintaApoio, 0); } const t = S.adm.tecnicos.find(x => x.uid === a.tecnicoUid); a.tecnicoNome = t ? t.nome : ''; $('#at_tec').value = a.tecnicoUid; $$('[data-pick]').forEach(x => x.setAttribute('aria-pressed', x === b)); toast(`${a.tecnicoNome}: a atividade entra na fila dele ao salvar.`, 3500); });
  const pintaApoio = () => { a.apoioUids = (a.apoioUids || []).filter(u => u !== a.tecnicoUid); a.apoioNomes = a.apoioUids.map(u => (S.adm.tecnicos.find(t => t.uid === u) || {}).nome || '').filter(Boolean); const y = window.scrollY; render(); window.scrollTo(0, y); };
  $$('[data-apoio]').forEach(b => b.onclick = () => { const u = b.dataset.apoio; a.apoioUids = (a.apoioUids || []).includes(u) ? a.apoioUids.filter(x => x !== u) : [...(a.apoioUids || []), u]; pintaApoio(); });
  $('#at_tec').onchange = e => { a.tecnicoUid = e.target.value; { const t0 = S.adm.tecnicos.find(x => x.uid === a.tecnicoUid); a.tecnicoNome = t0 ? t0.nome : ''; } if ((a.apoioUids || []).includes(a.tecnicoUid)) { pintaApoio(); return; } $$('[data-pick]').forEach(x => x.setAttribute('aria-pressed', x.dataset.pick === a.tecnicoUid)); const t = S.adm.tecnicos.find(x => x.uid === a.tecnicoUid); a.tecnicoNome = t ? t.nome : ''; };
  let mk = null; const marca = (lat, lon, zoom, manual) => { a.lat = lat; a.lon = lon; if (manual) a.geo = { manual: true, em: Date.now() }; { const sel = $('#at_tec'); if (sel) { const v = sel.value; sel.innerHTML = tecOptsAtv({ ...a, tecnicoUid: v }); sel.value = v; } const inf = $('#atDistInfo'); if (inf) inf.textContent = 'Distância e tempo pelo trajeto de carro, da posição atual (GPS) de cada técnico até a O.S.'; } if (S.mapAtv) { if (mk) mk.setLatLng([lat, lon]); else mk = L.marker([lat, lon], { icon: L.divIcon({ className: '', html: '<div class="mk" style="background:#c2311d">!</div>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(S.mapAtv); S.mapAtv.setView([lat, lon], zoom || Math.max(S.mapAtv.getZoom(), 15)); } $('#atLocInfo').textContent = `Ponto definido: ${lat.toFixed(5)}, ${lon.toFixed(5)}`; };
  if (window.L && $('#mapAtv')) { S.mapAtv = L.map('mapAtv'); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(S.mapAtv); S.mapAtv.setView([-22.6, -45.6], 8); if (a.lat != null) marca(a.lat, a.lon, 15); S.mapAtv.on('click', ev => { marca(ev.latlng.lat, ev.latlng.lng, undefined, true); a.mapsUrl = ''; $('#at_loc').value = `${ev.latlng.lat.toFixed(6)}, ${ev.latlng.lng.toFixed(6)}`; }); }
  $('#at_loc').addEventListener('input', e => { const p = parseLoc(e.target.value); if (p && p.lat != null) { a.mapsUrl = /^https?:/i.test(e.target.value.trim()) ? e.target.value.trim() : ''; marca(p.lat, p.lon, 16, true); } else if (p && p.url) { a.mapsUrl = p.url; a.lat = null; a.lon = null; $('#atLocInfo').textContent = 'Link do Google guardado: o técnico abre direto no GPS. (Link curto não mostra o ponto aqui no mapa.)'; } else if (!e.target.value.trim()) { a.mapsUrl = ''; } });
  $('#bAtLer') && ($('#bAtLer').onclick = async () => {
    const txt = $('#atTxt').value; const p = lerAcionamento(txt);
    if (!p.ok) { toast('Não reconheci o texto. Acionamento Claro precisa de ENDEREÇO e ORIUNDO DO EVENTO; chamado de parceiro precisa do número do chamado e do trecho ou designação.', 7000); return; }
    Object.assign(a, p.atividade, { _txt: txt, _colar: false, tipo: 'emergencial' }); const bt = $('#bAtLer'); bt.disabled = true; bt.textContent = 'Localizando o endereço…';
    if (a.endereco) { bt.textContent = 'Validando o endereço…'; aplicaGeo(a, await geocodifica(a.endereco)); }
    a._sug = 'Escolha o técnico abaixo: em verde quem está sem atividade, em amarelo quem está há muito tempo na mesma atividade.';
    toast(`Acionamento lido: ${a.ticket || 'sem evento'}${a.geo && (a.geo.fonte === 'google' || a.geo.fonte === 'geoapify') && a.geo.preciso ? ' · endereço validado' : a.lat != null ? ' · endereço aproximado: confira no mapa' : ' · endereço não localizado: marque no mapa'}. Agora escolha o técnico.`, 6000); re();
    setTimeout(() => { const pk = $('#tecPicker'); if (pk) pk.scrollIntoView({ block: 'center' }); }, 150);
  });
  $('#bAtGeo').onclick = async () => { const q = (a.endereco || '').trim(); if (!q) { toast('Digite o endereço.'); return; } const b = $('#bAtGeo'); b.disabled = true; b.textContent = 'Validando…'; const g = await geocodifica(q); b.disabled = false; b.textContent = 'Achar no mapa'; if (!g) { toast('Sem conexão para buscar o endereço.'); return; } aplicaGeo(a, g); if (g.naoAchou) { toast('Endereço não encontrado. Marque no mapa ou cole o link do Google.', 6000); re(); return; } marca(g.lat, g.lon, 16); re(); };
  $$('[data-geoalt]').forEach(b => b.onclick = () => { const c = a.geo.alternativas[+b.dataset.geoalt]; if (!c) return; a.lat = c.lat; a.lon = c.lon; a.geo = { ...a.geo, formatado: c.formatado, preciso: c.tipo === 'ROOFTOP' || c.tipo === 'RANGE_INTERPOLATED', alternativas: [] }; re(); });
  $('#bAtSalvar') && ($('#bAtSalvar').onclick = async () => {
    const bt = $('#bAtSalvar'); bt.disabled = true;
    try {
      if (!a.projeto) a.projeto = ($('#at_proj') && $('#at_proj').value) || projSugerido(a); if (projAtivos().length && !a.projeto) { toast('Escolha o projeto da O.S.'); bt.disabled = false; $('#at_proj') && $('#at_proj').focus(); return; }
      if (!String(a.ticket || '').trim()) a.ticket = await proximoTicketOS(); a.ticket = a.ticket.trim().toUpperCase();
      if (a.tipo === 'implantacao' && !String(a.designacao || '').trim()) { toast('Informe a designação.'); bt.disabled = false; return; }
      if (!a.rotaId && !a.endereco && a.lat == null && !a.mapsUrl && !a.refLocal) { toast('Informe a rota, o endereço ou a localização.'); bt.disabled = false; return; }
      const novo = a._novo; delete a._novo; const ant = novo ? null : S.atvsAdm.get(a.id);
      if (!novo && ant && ant.tecnicoUid !== a.tecnicoUid) { a.status = 'pendente'; a.recebidaEm = null; a.vistaEm = null; }
      if (!novo && ant && (a.status === 'pendente' || a.status === 'recebida') && agendaDe(ant) !== agendaDe(a)) {
        if (!confirm(`Remanejar a O.S. ${a.ticket} de ${fDiaCurto(agendaDe(ant))} para ${fDiaCurto(agendaDe(a))}?`) || !confirm(`Confirma de novo: a O.S. passa para ${fDiaCurto(agendaDe(a))}.`)) { bt.disabled = false; return; }
        a.remanejos = [...(ant.remanejos || []), { de: agendaDe(ant), para: agendaDe(a), por: (Nuvem.admin && Nuvem.admin.nome) || 'Supervisor', em: Date.now() }].slice(-20);
      }
      a.criadoPorNome = a.criadoPorNome || (Nuvem.admin && Nuvem.admin.nome) || ''; if (novo) { a.criado = Date.now(); a.origem = 'supervisor'; a.status = 'pendente'; }
      const r = novo ? await Nuvem.atvCriar(a) : await Nuvem.atvSalvar(a);
      if (r) S.atvsAdm.set(r.id, r); Nuvem.avisaFuncao();
      toast(`${novo ? 'Atividade enviada' : 'Atividade atualizada'}${r && r.tecnicoNome ? ' para ' + r.tecnicoNome : ' (na fila, sem técnico)'}${r && r.log ? ' · LOG ' + r.log : ''}.`, 5000);
      if (r && (r.log || 0) >= 4 && !r.escalonadoEm && confirm(`${r.ticket} chegou ao LOG ${r.log} (reincidência na semana). Escalonar ao gerente agora pelo WhatsApp?`)) await escalonar(r);
      go('adm');
    } catch (e) { toast('Erro ao salvar: ' + e.message, 6000); bt.disabled = false; }
  });
  $('#bAtDel') && ($('#bAtDel').onclick = async () => {
    const ref = a.ticket || a.id; if (!confirmaExcluir(`Excluir a O.S. ${ref} do sistema? Em seguida o app pergunta se apaga também o que já foi executado.`)) return;
    try { const evs = await Nuvem.evsDaAtv(a); let n = 0;
      if (evs.length && confirm(`Esta O.S. tem ${evs.length} registro(s) executado(s) (ficha, fotos e medição). Apagar também?\n\nOK = apagar tudo · Cancelar = apagar só a O.S. e manter o que foi executado`)) n = await apagaExecutadas(evs);
      await Nuvem.atvApagar(a.id); (S.atvsAdm || new Map()).delete(a.id); toast(`O.S. ${ref} excluída${n ? ` com ${n} registro(s) executado(s)` : ''}.`, 5000); go('adm'); } catch (e) { toast('Erro ao excluir: ' + (e.message || e), 7000); }
  });
  $('#bAtCanc') && ($('#bAtCanc').onclick = async () => { if (!confirm('Cancelar esta atividade? O técnico deixa de vê-la.')) return; a.status = 'cancelada'; try { const r = await Nuvem.atvSalvar(a); if (r) S.atvsAdm.set(r.id, r); toast('Atividade cancelada.'); go('adm'); } catch (e) { toast('Erro: ' + e.message, 6000); } });
  $('#bAtEsc') && ($('#bAtEsc').onclick = () => escalonar(S.atvsAdm.get(a.id) || a));
}
// confirmação forte para apagar (digitar EXCLUIR)
function confirmaExcluir(txt) { const r = prompt(`${txt}\n\nIsso não dá para desfazer. Para confirmar, digite EXCLUIR:`); if (r == null) return false; if (r.trim().toUpperCase() !== 'EXCLUIR') { toast('Nada foi excluído: digite EXCLUIR para confirmar.'); return false; } return true; }
async function apagaExecutadas(evs) { let n = 0; for (const ev of evs) { await Nuvem.evApagar(ev); n++; } return n; }
function reincidencias(a) {
  const sem = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return +x; };
  return [...(S.atvsAdm || new Map()).values()].filter(b => b.id !== a.id && atvEmerg(b) && b.status !== 'cancelada' && b.criado <= a.criado && sem(b.criado) === sem(a.criado) && ((a.rotaId && b.rotaId === a.rotaId) || (a.lat != null && b.lat != null && hav(a, b) <= 1000) || (a.endereco && normLocal(a.endereco) === normLocal(b.endereco)))).sort((p, q) => p.criado - q.criado);
}
async function escalonar(a) {
  if (!a) return; const g = S.cfg || {};
  if (!g.gerenteWhats) { toast('Cadastre o WhatsApp do gerente no card "Escalonamento" do painel.', 6000); go('adm'); setTimeout(() => { const el = $('#cfgWhats'); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } }, 300); return; }
  const prev = reincidencias(a); const rt = a.rotaId ? rotaById(a.rotaId) : null;
  const txt = `⚠️ ESCALONAMENTO · LOG ${a.log} · Backbone Multivale\n\nTicket: ${a.ticket}\nOcorrência: ${a.ocorrencia || '—'}\n${rt ? 'Rota: ' + rotaLb(rt) + '\n' : ''}${atvRef(a) ? 'Referência: ' + atvRef(a) + '\n' : ''}${a.endereco ? 'Endereço: ' + a.endereco + '\n' : ''}${a.lat != null ? `Local: https://maps.google.com/?q=${a.lat},${a.lon}\n` : ''}Técnico: ${a.tecnicoNome || 'sem técnico'}\n\nAcionamentos nesta semana (${prev.length + 1}):\n${[...prev, a].map((b, k) => `LOG ${k + 1} · ${fDH(b.criado)} · ${b.ticket || '—'}${b.ocorrencia ? ' · ' + b.ocorrencia : ''}`).join('\n')}\n\nSupervisor: ${(Nuvem.admin && Nuvem.admin.nome) || ''}`;
  window.open(`https://wa.me/${String(g.gerenteWhats).replace(/\D/g, '')}?text=${encodeURIComponent(txt)}`, '_blank');
  try { a.escalonadoEm = Date.now(); const r = await Nuvem.atvSalvar(a); if (r) S.atvsAdm.set(r.id, r); pintaFila(); toast('Escalonamento registrado.'); } catch (e) { toast('WhatsApp aberto, mas não consegui registrar: ' + e.message, 6000); }
}


/* ---------- etapas de implantação e vistoria ---------- */
function stepImpl(i) {
  const m = i.impl; const s = m.servico;
  return `<section class="card"><h2><span class="num">1</span>Designação e serviço</h2>
    <div class="field"><span class="lb">Serviço</span><div class="chips" role="group" aria-label="Serviço">${Object.entries(IMPL_SERV).map(([k, l]) => `<button type="button" data-implserv="${k}" aria-checked="${s === k}">${l}</button>`).join('')}</div></div>
    <div class="grid2">${inp('impl.designacao', 'Designação', { req: 1, full: 1, caps: 1 })}
    ${selAdd('im_projeto', 'projetoImpl', m.projeto || '', 'Projeto', 'data-k="impl.projeto"', true)}
    ${inp('impl.siteA', 'Site A', { caps: 1, ph: 'ID do site' })}${inp('impl.siteB', 'Site B', { caps: 1, ph: 'ID do site' })}
    ${s === 'ativacao' ? `${selAdd('im_equip', 'equipImpl', m.equipamento || '', 'Equipamento', 'data-k="impl.equipamento"')}${inp('impl.porta', 'Porta / slot', { ph: 'Ex.: 0/1/3' })}` : ''}
    ${s === 'dgo' ? `${selAdd('im_dgo', 'dgoModelo', m.dgoModelo || '', 'Modelo do DGO', 'data-k="impl.dgoModelo"')}${inp('impl.dgoPosicao', 'Rack / posição', { ph: 'Ex.: Rack 2 · U12' })}${inp('impl.dgoPortas', 'Portas ocupadas', { mode: 'numeric' })}` : ''}</div>
    ${usaImpl(i, 'caixa') ? '<p class="muted small" style="margin:0">Na próxima etapa: identificação e mapeamento da caixa de emenda.</p>' : `<h3>Local</h3>${locHtml()}<button type="button" class="btn" id="bLocImpl">${ICON.pin}Atualizar localização</button><div class="grid2">${inp('info.endereco', 'Endereço', { full: 1 })}${inp('info.cidade', 'Cidade - UF')}${inp('info.bairro', 'Bairro')}</div>`}</section>`;
}
function stepImplCheck(i) {
  const m = i.impl; const L = IMPL_CHECK[m.servico] || [];
  return `<section class="card"><div class="row" style="justify-content:space-between"><h2><span class="num">✓</span>Checklist · ${esc(IMPL_SERV[m.servico])}</h2><button class="btn" id="bAllOkImpl" style="min-height:44px">${ICON.check}Todos OK</button></div>
  <div>${L.map(([k, lb]) => `<div class="check-row"><span class="q">${lb}</span><div class="seg ck" role="group" aria-label="${lb}">${['OK', 'NC', 'NA'].map(v => `<button type="button" data-set="impl.check.${k}" data-v="${v}" aria-pressed="${m.check[k] === v}">${v === 'NC' ? 'N/C' : v === 'NA' ? 'N/A' : 'OK'}</button>`).join('')}</div>
    ${m.check[k] === 'NC' ? `<input type="text" data-k="impl.checkObs.${k}" value="${esc(m.checkObs[k] || '')}" placeholder="Descreva o problema" aria-label="Problema: ${lb}">` : ''}</div>`).join('')}</div>
  <h3>Medições</h3><div class="grid2">${inp('impl.med.potTx', 'Potência Tx (dBm)', { mode: 'decimal' })}${inp('impl.med.potRx', 'Potência Rx (dBm)', { mode: 'decimal' })}${inp('impl.med.perda', 'Perda total OTDR (dB)', { mode: 'decimal' })}${inp('impl.med.extensao', 'Extensão do enlace (m)', { mode: 'numeric' })}</div></section>`;
}
function stepVist(i) {
  const v = i.vist; const t = v.tipo;
  return `<section class="card"><h2><span class="num">1</span>Registro da vistoria</h2>${rondaConj(i) ? conjHtml(i) : ''}
    <div class="chips" role="group" aria-label="Tipo de registro">${Object.entries(VIST_TIPOS).map(([k, l]) => `<button type="button" data-vtipo="${k}" aria-checked="${t === k}">${l}</button>`).join('')}</div>
    ${t === 'caixa' ? `<p class="muted small" style="margin:0">Mapeie a caixa de emenda: identifique pela TAG (ou leia o QR da plaqueta), informe os cabos e monte as fusões. O app desenha o mapa de fusão, que vai no relatório e fica no histórico da caixa.</p>
      <div class="grid2">${inp('info.tag', 'TAG da caixa', { caps: 1, ph: 'Ex.: CE-BKB-0012' })}${selAdd('f_info_fabricante', 'fabCaixa', i.info.fabricante, 'Fabricante', 'data-k="info.fabricante"')}${selAdd('f_info_modelo', 'modCaixa', i.info.modelo, 'Modelo', 'data-k="info.modelo"')}${inp('info.poste', 'Nº poste / CV')}</div>
      ${v.nova ? `<div class="warnbox small" style="margin:0"><b>Caixa nova instalada na corretiva${v.ticket ? ' ' + esc(v.ticket) : ''}.</b> Informe entre quais caixas ela ficou, para entrar no lugar certo do mapa da rota.</div><div class="grid2">${inp('vist.entreA', 'Entre a caixa (lado A)', { caps: 1, ph: 'TAG da caixa anterior' })}${inp('vist.entreB', 'E a caixa (lado B)', { caps: 1, ph: 'TAG da caixa seguinte' })}</div>` : ''}
      <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn pri" id="bQrTagV" style="min-height:44px">📷 Ler QR da plaqueta</button><button type="button" class="btn" id="bGerTagV" style="min-height:44px">Gerar TAG (caixa sem plaqueta)</button></div>${i.info.trecho ? `<span class="muted small">Trecho: <b>${esc(i.info.trecho)}</b></span>` : ''}<div id="histCaixa"></div>` : ''}
    <div class="grid2">
    ${t === 'chaves' ? `${selAdd('vi_local', 'localChave', v.chaveLocal || '', 'Local da retirada', 'data-k="vist.chaveLocal"', true)}${inp('vist.chaveId', 'Chave / cadeado', { ph: 'Identificação' })}${inp('vist.chaveEntregou', 'Quem entregou')}
      <label class="row field full" style="min-height:44px;cursor:pointer"><input type="checkbox" data-k="vist.chaveDevolvida" ${v.chaveDevolvida ? 'checked' : ''} style="width:22px;height:22px"> <b>Chave já devolvida</b></label>` : ''}
    ${t === 'acomp' ? `${selAdd('vi_eq', 'equipeAcomp', v.equipe || '', 'Equipe / empresa acompanhada', 'data-k="vist.equipe"', true)}${inp('vist.responsavel', 'Técnico responsável')}${inp('vist.ticket', 'Ticket / OS / designação', { caps: 1 })}
      <div class="field"><label class="lb" for="vi_atv">Atividade acompanhada</label><select id="vi_atv" data-k="vist.atividade"><option value="">Selecione…</option>${['Roteamento de fibras', 'Ativação de site', 'Montagem de DGO', 'Fechamento de caixa', 'Corretiva', 'Preventiva', 'Lançamento de cabo', 'Outra'].map(o => `<option ${v.atividade === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <div class="field full"><span class="lb">Conformidade</span><div class="seg" role="group" aria-label="Conformidade">${['Conforme', 'Parcial', 'Não conforme'].map(o => `<button type="button" data-set="vist.conformidade" data-v="${o}" aria-pressed="${v.conformidade === o}">${o}</button>`).join('')}</div></div>` : ''}
    <div class="field full"><label class="lb" for="f_vist_descricao">${t === 'caixa' ? 'Observações da caixa' : 'Registro escrito <span class="req">*</span>'}</label><textarea id="f_vist_descricao" data-k="vist.descricao" placeholder="Descreva o que foi verificado, o que está certo e o que precisa corrigir" style="min-height:110px">${esc(v.descricao || '')}</textarea></div></div>
    <h3>Local</h3>${locHtml()}<button type="button" class="btn" id="bLocImpl">${ICON.pin}Atualizar localização</button><div class="grid2">${inp('info.endereco', 'Endereço', { full: 1 })}${inp('info.cidade', 'Cidade - UF')}</div></section>`;
}
function pdfImplCheck(doc, y, n, i) {
  const m = i.impl; const L = IMPL_CHECK[m.servico] || [];
  y = pdfSec(doc, y, n, 'Checklist e medições');
  doc.autoTable({ ...TB, startY: y, head: [['Item', 'Situação', 'Observação']], body: L.map(([k, lb]) => [lb, m.check[k] === 'NC' ? 'N/C' : m.check[k] === 'NA' ? 'N/A' : (m.check[k] || '—'), m.checkObs[k] || '']),
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 22, halign: 'center', fontStyle: 'bold' } },
    didParseCell: d => { if (d.section === 'body' && d.column.index === 1) { if (d.cell.raw === 'OK') d.cell.styles.textColor = [31, 122, 58]; if (d.cell.raw === 'N/C') { d.cell.styles.textColor = [255, 255, 255]; d.cell.styles.fillColor = [180, 35, 27]; } } } });
  y = doc.lastAutoTable.finalY + 4; const md = m.med || {};
  doc.autoTable({ ...TB, startY: y, head: [['Potência Tx (dBm)', 'Potência Rx (dBm)', 'Perda total OTDR (dB)', 'Extensão do enlace (m)']], body: [[md.potTx || '—', md.potRx || '—', md.perda || '—', md.extensao || '—']] });
  return doc.lastAutoTable.finalY + 7;
}

/* ---------- histórico de eventos da equipe (consulta) ---------- */
document.addEventListener('click', async ev => {
  const b = ev.target.closest && ev.target.closest('[data-verev]'); if (!b) return; ev.preventDefault();
  const e = (await eventosHistorico()).find(x => x.id === b.dataset.verev); if (!e) { toast('Evento não encontrado neste celular.'); return; }
  if (S.view === 'insp') saveInsp(true);
  S.evView = e; S.evVolta = S.view; go('evento');
});
function viewEventos() {
  const F = S.evF = S.evF || { rota: S.perfil.rotaId || '', sent: '', km: '', cidade: '', raio: '1', q: '', tipo: '' };
  const rt = F.rota ? rotaById(F.rota) : null; if (!rt) F.rota = '';
  const locais = [...new Set([...(S.perfil.refLocais || []), ...(S.rotas || []).flatMap(r => [r.pontaA, r.pontaB]).filter(Boolean)])];
  return `<section class="card"><h2>Onde caiu o evento?</h2><p class="muted small" style="margin:0">Mostra as inspeções e corretivas de toda a equipe naquele trecho. Os percursos de cada técnico continuam visíveis só para ele e para o supervisor.</p>
    <div class="field"><label class="lb" for="ev_rota">Rota do cabo</label><select id="ev_rota">${rotaOpts(F.rota, 'Todas as rotas')}</select></div>
    ${rt ? `<div class="field">${refRotaHtml(rt, F.sent, F.km, 'ev')}</div>` : `<div class="field"><span class="lb">Referência</span><div class="row" style="flex-wrap:nowrap;gap:8px;align-items:center"><input type="text" inputmode="decimal" id="ev_refKm" value="${esc(F.km)}" placeholder="km" style="width:84px;text-align:right" aria-label="Distância em km"><span style="font-weight:600;white-space:nowrap">km de</span><input type="text" id="ev_cidade" list="dl_locaisEv" value="${esc(F.cidade)}" placeholder="Cidade" style="flex:1;min-width:0" aria-label="Cidade de referência"></div><datalist id="dl_locaisEv">${locais.map(l => `<option value="${esc(l)}"></option>`).join('')}</datalist></div>`}
    <div class="grid2"><div class="field"><label class="lb" for="ev_raio">Raio da busca</label><select id="ev_raio">${['0,5', '1', '2', '5', '10'].map(x => `<option value="${x}" ${F.raio === x ? 'selected' : ''}>${x} km</option>`).join('')}</select></div>
    <div class="field"><label class="lb" for="ev_q">Buscar texto</label><input type="text" id="ev_q" value="${esc(F.q)}" placeholder="Ticket, TAG, ocorrência"></div></div>
    <div class="seg" role="group" aria-label="Tipo de evento"><button type="button" data-evtipo="" aria-pressed="${!F.tipo}">Todos</button><button type="button" data-evtipo="corr" aria-pressed="${F.tipo === 'corr'}">Corretivas</button><button type="button" data-evtipo="prev" aria-pressed="${F.tipo === 'prev'}">Preventivas</button></div>
    <button type="button" class="lnk" id="evLimpa" style="align-self:flex-start">Limpar filtros</button></section>
  <section class="acts"><div class="ah"><span>Eventos encontrados</span><span class="muted small" id="evCount" style="font-weight:500"></span></div><div id="evLista"><p class="empty">Carregando…</p></div></section>`;
}
async function listarEventos() {
  const F = S.evF, box = $('#evLista'); if (!box) return;
  const todos = await eventosHistorico(); if (!$('#evLista')) return;
  const km = kmNum(F.km), raio = kmNum(F.raio) ?? 1, q = normLocal(F.q), cid = normLocal(F.cidade), rt = F.rota ? rotaById(F.rota) : null;
  const qa = rt && F.sent && km != null ? posA({ info: { rotaId: F.rota, refSentido: F.sent, refKm: F.km } }) : null;
  const porLocal = qa != null || (!rt && cid && km != null);
  const res = todos.map(e => {
    if (!e || !e.info) return null; let dk = null;
    if (rt) { if (e.info.rotaId !== F.rota) return null; if (qa != null) { const pa = posA(e); if (pa == null) return null; dk = Math.abs(pa - qa); if (dk > raio) return null; } }
    else if (cid) { const mesma = normLocal(e.info.refLocal) === cid; if (!mesma && !normLocal(e.info.cidade).includes(cid)) return null; if (km != null) { const ek = kmNum(e.info.refKm); if (!mesma || ek == null) return null; dk = Math.abs(ek - km); if (dk > raio) return null; } }
    if (F.tipo === 'corr' && !isCorr(e)) return null; if (F.tipo === 'prev' && isCorr(e)) return null;
    if (q) { const txt = normLocal([e.corr && e.corr.ticket, e.info.tag, e.corr && e.corr.ocorrencia, e.corr && e.corr.problema, e.info.endereco, e.info.cidade, e._tecnico, e.info.tecnico, refTxt(e)].filter(Boolean).join(' ')); if (!txt.includes(q)) return null; }
    return { e, dk };
  }).filter(Boolean).sort((a, b) => (porLocal ? (a.dk ?? 99) - (b.dk ?? 99) : 0) || (b.e.chegada || 0) - (a.e.chegada || 0));
  $('#evCount').textContent = res.length > 200 ? `${res.length} (mostrando 200)` : `${res.length}`;
  box.innerHTML = res.slice(0, 200).map(({ e, dk }) => { const d = e.chegada ? new Date(e.chegada) : null; const corr = isCorr(e);
    return `<button type="button" class="act ${corr ? 'corr' : e.status === 'concluida' ? 'done' : 'ini'}" data-verev="${e.id}"><span class="st"></span><span class="tm">${d ? pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) : '—'}<span>${d ? d.getFullYear() : ''}</span></span><span class="bd"><b>${esc(rotuloEvento(e))}</b><span>${esc(refTxt(e) || e.info.endereco || 'Sem referência')}${corr && e.corr.ocorrencia ? ' · ' + esc(e.corr.ocorrencia) : ''}</span></span><span class="ic">${dk != null ? `<span class="pill done">${dk < 0.05 ? 'mesmo ponto' : '≈ ' + fKmRef(dk) + ' km'}</span>` : ''}${ICON.next}</span></button>`; }).join('')
    || `<p class="empty">${porLocal ? `Nenhum evento registrado num raio de ${esc(F.raio)} km desse ponto.` : 'Nenhum evento encontrado com esses filtros.'}</p>`;
}
function afterEventos() {
  const F = S.evF, re = () => { const y = window.scrollY; render(); window.scrollTo(0, y); };
  let t; const debounce = () => { clearTimeout(t); t = setTimeout(listarEventos, 250); };
  $('#ev_rota').onchange = e => { F.rota = e.target.value; F.sent = ''; re(); };
  $$('[data-evsent]').forEach(b => b.onclick = () => { F.sent = b.dataset.evsent; re(); });
  $('#ev_refKm') && $('#ev_refKm').addEventListener('input', e => { F.km = e.target.value; debounce(); });
  $('#ev_cidade') && $('#ev_cidade').addEventListener('input', e => { F.cidade = e.target.value; debounce(); });
  $('#ev_raio').onchange = e => { F.raio = e.target.value; listarEventos(); };
  $('#ev_q').addEventListener('input', e => { F.q = e.target.value; debounce(); });
  $$('[data-evtipo]').forEach(b => b.onclick = () => { F.tipo = b.dataset.evtipo; $$('[data-evtipo]').forEach(x => x.setAttribute('aria-pressed', x === b)); listarEventos(); });
  $('#evLimpa').onclick = () => { S.evF = null; re(); };
  listarEventos();
}
function viewEvento(e) {
  const corr = isCorr(e), rt = e.info.rotaId ? rotaById(e.info.rotaId) : null, meu = !ADMIN && !e._doEquipe, c = e.corr || {};
  const kv = (k, v) => v ? `<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>` : '';
  const mats = [...MATERIAIS.filter(([k]) => +String((e.mat || {})[k] || '').replace(',', '.') > 0).map(([k, l, u]) => `${l}: ${e.mat[k]} ${u}`), ...(e.matExtra || []).filter(m => m.nome).map(m => `${m.nome}: ${m.qtd || ''} ${m.un || ''}`)];
  const ncs = CHECK.filter(([k]) => (e.check || {})[k] === 'NC').map(x => x[1]);
  const end = [e.info.endereco, e.info.bairro, e.info.cidade].filter(Boolean).join(', ');
  return `<section class="rhead"><div class="rh1"><span class="av" style="background:${corr ? 'var(--st-corr)' : 'var(--st-done)'};color:#fff">${corr ? 'C' : 'P'}</span><span class="tx"><b>${esc(corr ? 'Corretiva · Ticket ' + (c.ticket || '—') : 'Preventiva · Caixa ' + (e.info.tag || '—'))}</b><span>${fDH(e.chegada)} · ${esc(e.info.tecnico || e._tecnico || '—')}</span></span><span class="pill ${e.status === 'concluida' ? 'done' : 'draft'}">${e.status === 'concluida' ? (c.pendente ? 'Com pendência' : 'Concluída') : 'Em aberto'}</span></div></section>
  <section class="card"><h2>Onde foi</h2>${kv('Referência', refTxt(e))}${kv('Rota', rt ? rotaLb(rt) : '')}${kv('Endereço', end)}${kv('Poste / CV', e.info.poste)}
    ${e.loc ? `<a class="btn" href="https://maps.google.com/?q=${e.loc.lat},${e.loc.lon}" target="_blank" rel="noopener">${ICON.pin}Abrir no mapa</a>` : ''}
    ${refTxt(e) && !ADMIN ? `<button type="button" class="btn" id="bUsaRefEv">${ICON.plus}Abrir corretiva neste ponto</button>` : ''}${ADMIN ? `<button type="button" class="btn" id="bEvPdf">${ICON.pdf}PDF da O.S.</button>${e.rondaId && DB.mem.rondas.get(e.rondaId) ? '<button type="button" class="btn" id="bEvRonda">Ver deslocamento e rota</button>' : ''}` : ''}</section>
  ${ADMIN ? `<section class="card"><h2>Dados da O.S.</h2>${kv('Técnico', e.info.tecnico || e._tecnico)}${kv('Data', fDH(e.chegada || e.criado))}${kv('Rede', redeDe(e) === 'fibra' ? 'Fibra' : 'Coaxial')}${kv('Faturamento', CENTROS[centroOS(e)])}${kv('WFC', e.wfc)}${kv('WF2', e.wf2)}${kv('Valor da O.S.', (e.lpu || []).length ? fBRL(valorOS(e)) : '')}${kv('Itens da LPU', (e.lpu || []).map(x => `${x.c} ${x.d} — ${fQtd(x.q)} ${x.u}`).join('\n'))}${kv('Situação na medição', (S.meds && S.meds.get(e.id) && SIT_LB[S.meds.get(e.id).status]) || '')}</section>` : ''}
  ${corr ? `<section class="card"><h2>O que aconteceu</h2>${kv('Ocorrência', c.ocorrencia)}${kv('Causa provável', c.causa)}${kv('Problema encontrado', c.problema)}${kv('Fibras afetadas', c.fibrasAfetadas)}${kv('Serviço executado', c.servico)}${kv('Acionamento', c.acionamento)}${kv('Normalizado às', c.normalizacao)}
    ${mats.length ? `<div class="kv"><span>Materiais usados</span><b>${mats.map(esc).join('\n')}</b></div>` : ''}</section>`
  : `<section class="card"><h2>Inspeção</h2>${kv('Caixa', [e.info.fabricante, e.info.modelo].filter(Boolean).join(' '))}${kv('Itens não conformes', ncs.join('\n') || 'Nenhum')}${kv('Observações', e.obs)}</section>`}
  <section class="card"><h2>Fotos</h2>${(e.fotos || []).length ? `<div class="photos" id="evFotos">${e.fotos.map((p, k) => `<div class="ph"><img data-evph="${k}" alt="${esc(p.cat || 'Foto')}"><span class="tag">${esc(p.cat || 'Foto')}</span>${p.desc ? `<div class="pb small">${esc(p.desc)}</div>` : ''}</div>`).join('')}</div>` : '<p class="muted" style="margin:0">Sem fotos.</p>'}</section>
  ${meu ? `<button class="btn block" data-open="${e.id}">Abrir ficha completa</button>` : ''}`;
}
function afterEvento() {
  const e = S.evView; bindOpen();
  $('#bEvPdf') && ($('#bEvPdf').onclick = async () => { const f = await gerarPdfInsp(e); if (f) baixar(f); });
  $('#bEvRonda') && ($('#bEvRonda').onclick = async () => { const r = DB.mem.rondas.get(e.rondaId); if (!r) return; S.rondaView = r; await cacheInspRonda(r); go('ronda'); });
  $$('[data-evph]').forEach(img => { const p = e.fotos[+img.dataset.evph]; fotoBlob(p).then(bl => { if (bl) { img.src = URL.createObjectURL(bl); img.onload = () => URL.revokeObjectURL(img.src); } else img.alt = 'Foto ainda não disponível (sincroniza quando o técnico tiver internet)'; }); });
  $('#bUsaRefEv') && ($('#bUsaRefEv').onclick = () => {
    if (S.ronda) { toast('Encerre a atividade em andamento antes de abrir outra corretiva.'); return; }
    S.modo = 'corretiva'; S.cr = { ...(S.cr || {}), refKm: e.info.refKm || '', refLocal: e.info.refLocal || '', refSentido: e.info.refSentido || '' };
    if (e.info.rotaId && rotaById(e.info.rotaId)) { S.perfil.rotaId = e.info.rotaId; DB.put('meta', S.perfil); }
    toast('Referência copiada para a nova corretiva.'); go('home');
  });
}

