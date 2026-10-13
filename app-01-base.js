// Técnico Plus - Multivale · utilidades, banco local, estado, GPS, perfil e relatórios
// Os arquivos app-*.js carregam em ordem (ver index.html) e compartilham o mesmo escopo global.
'use strict';
const MODO = new URLSearchParams(location.search).get('modo');
const ACION = MODO === 'acionamento'; // link só de acionamentos Claro
const NOC = MODO === 'noc'; // link do NOC: valida e libera a baixa das corretivas
const ADMIN = MODO === 'admin' || ACION || NOC;
const RESTRITO = ACION || NOC;
/* ============================ utilidades ============================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad2 = n => String(n).padStart(2, '0');
const fData = ts => { const d = new Date(ts); return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`; };
const fHora = ts => { const d = new Date(ts); if (ts == null || ts === true || isNaN(d)) return '—'; return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const fHoraS = ts => { const d = new Date(ts); return `${fHora(ts)}:${pad2(d.getSeconds())}`; };
const fDH = ts => `${fData(ts)} ${fHora(ts)}`;
const fDur = ms => { if (!(ms > 0)) return '0 min'; const m = Math.round(ms / 60000); const h = Math.floor(m / 60); return h ? `${h}h ${pad2(m % 60)}min` : `${m} min`; };
const fClock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${pad2(Math.floor(s/3600))}:${pad2(Math.floor(s/60)%60)}:${pad2(s%60)}`; };
const fKm = km => (km || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' km';
const isoDate = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const COLORS = [['Verde','#2e8b3e'],['Amarelo','#f2c200'],['Branco','#ffffff'],['Azul','#1f5fbf'],['Vermelho','#c8102e'],['Violeta','#7a3fa0'],['Marrom','#7a4a1e'],['Rosa','#f08ab0'],['Preto','#141414'],['Cinza','#8a8a8a'],['Laranja','#f07c00'],['Azul-claro','#5ec8e0']];
const tf = n => ({ t: Math.floor((n - 1) / 12) + 1, f: ((n - 1) % 12) + 1 });
const CAPS = [12, 24, 36, 48, 72, 96, 144, 192, 216, 288];
const EIA = [['Azul','#1f5fbf'],['Laranja','#f07c00'],['Verde','#2e8b3e'],['Marrom','#7a4a1e'],['Cinza','#8a8a8a'],['Branco','#ffffff'],['Vermelho','#c8102e'],['Preto','#141414'],['Amarelo','#f2c200'],['Violeta','#7a3fa0'],['Rosa','#f08ab0'],['Azul-claro','#5ec8e0']];
const PADROES = { ABNT: ['Nacional (ABNT)', COLORS], EIA: ['Americano (EIA/TIA-598)', EIA] };
const pal = p => (PADROES[p] || PADROES.ABNT)[1];
const padNome = p => (PADROES[p] || PADROES.ABNT)[0];
const fCor = (f, p) => pal(p)[(f - 1) % 12];
const tCor = (t, p) => pal(p)[(t - 1) % 12][1];
const tNome = (t, p) => pal(p)[(t - 1) % 12][0] + (t > 12 ? ` (${Math.ceil(t / 12)}º grupo)` : '');
const foTxt = (n, p) => { const { t, f } = tf(n); return `T${t} ${tNome(t, p)} / F${f} ${fCor(f, p)[0]}`; };
const padE = i => i.cabos.entrada.padrao || 'ABNT';
const padS = (i, cabo) => (cabo === 'S2' ? i.cabos.s2.padrao : i.cabos.s1.padrao) || padE(i);
function ensureRows(i) { while (i.fo.rows.length < i.fo.total) i.fo.rows.push({ f: false, cabo: 'S1', fib: '', band: '' }); }
function capSaida(i, cabo) { const v = +(cabo === 'S2' ? i.cabos.s2.fibras : i.cabos.s1.fibras); return CAPS.includes(v) ? v : Math.max(i.fo.total, 12); }
const sw = c => `<i class="sw" style="background:${c}"></i>`;
const hav = (a, b) => { const R = 6371000, r = Math.PI / 180; const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r; const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*r) * Math.cos(b.lat*r) * Math.sin(dLon/2)**2; return 2 * R * Math.asin(Math.sqrt(x)); };
const pathKm = pts => { let m = 0; for (let i = 1; i < pts.length; i++) m += hav(pts[i-1], pts[i]); return m / 1000; };
const gaps = pts => { let n = 0, ms = 0; for (let i = 1; i < pts.length; i++) { const d = pts[i].ts - pts[i-1].ts; if (d > 180000) { n++; ms += d; } } return { n, ms }; };
const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>'
};
let toastT;
function toast(msg, ms = 3200) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms); }

/* ============================ banco local (IndexedDB) ============================ */
const DB = {
  db: null, mem: { rondas: new Map(), inspecoes: new Map(), meta: new Map(), rotas: new Map(), fotos: new Map(), fila: new Map(), equipe: new Map() },
  open() { return new Promise(res => { try { const r = indexedDB.open('ronda-backbone-multivale', 4);
    r.onupgradeneeded = () => { const d = r.result; ['rondas','inspecoes','meta','rotas','fotos','fila','equipe'].forEach(n => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: 'id' }); }); };
    r.onsuccess = () => { this.db = r.result; res(true); }; r.onerror = () => res(false); } catch (e) { res(false); } }); },
  req(store, mode, fn) { if (!this.db) return Promise.resolve(fn(null)); return new Promise((res, rej) => { const t = this.db.transaction(store, mode); const q = fn(t.objectStore(store)); t.oncomplete = () => res(q && 'result' in q ? q.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); },
  get(s, id) { return this.db ? this.req(s, 'readonly', st => st.get(id)) : Promise.resolve(this.mem[s].get(id)); },
  all(s) { return this.db ? this.req(s, 'readonly', st => st.getAll()) : Promise.resolve([...this.mem[s].values()]); },
  putRaw(s, v) { return this.db ? this.req(s, 'readwrite', st => st.put(v)) : Promise.resolve(this.mem[s].set(v.id, v)); },
  delRaw(s, id) { return this.db ? this.req(s, 'readwrite', st => st.delete(id)) : Promise.resolve(this.mem[s].delete(id)); },
  put(s, v) { return this.putRaw(s, v).then(x => { try { Nuvem.marcar(s, v.id, v); } catch (e) {} return x; }); },
  del(s, id) { return this.delRaw(s, id).then(x => { try { Nuvem.marcar(s, id, null); } catch (e) {} return x; }); }
};

/* ============================ estado ============================ */
const CHECK = [
  ['vedacao','Vedação / estanqueidade'],['umidade','Sem umidade interna / formigas'],['fixacao','Fixação e ferragens'],
  ['bandejas','Bandejas e organização'],['raio','Raio de curvatura'],['reserva','Reserva técnica acomodada'],
  ['capa','Cabos sem danos na capa'],['plaqueta','Identificação / plaqueta'],['poste','Poste / CV em bom estado'],['limpeza','Local limpo / sem vegetação']];
const CATS = ['Caixa fechada','Caixa aberta','Bandeja','Acomodação das fibras','VT (reserva técnica)','Rede (foto ampla)','Identificação (TAG)','Poste / CV','Irregularidade','Outra'];
const CATS_OBRIG = ['Caixa fechada','Caixa aberta','Bandeja','VT (reserva técnica)','Rede (foto ampla)'];
const CATS_REDE = ['Rede (foto ampla)','Estrutura no poste','Cabo / espinamento','Poste / ferragem','Poda de árvore','Troca de poste (acompanhamento)','Reserva técnica','Travessia','Irregularidade','Outra'];
const STEPS_PREV = [['caixa','Caixa'],['cabos','Cabos'],['check','Checklist'],['fusoes','Fusões'],['fotos','Fotos'],['lpu','Produção'],['final','Finalizar']];
const STEPS_CORR = [['ocorr','Ocorrência'],['cabos','Cabos'],['fusoes','Fusões'],['fotos','Fotos'],['mat','Materiais'],['lpu','Produção'],['final','Finalizar']];
const STEPS_IMPL = i => [['impl', 'Designação'], ...(usaImpl(i, 'caixa') ? [['caixa', 'Caixa']] : []), ...(usaImpl(i, 'cabos') ? [['cabos', 'Cabos']] : []), ...(usaImpl(i, 'fusoes') ? [['fusoes', i.impl.servico === 'dgo' ? 'Fusões DGO' : 'Fusões']] : []), ['implcheck', 'Checklist'], ['fotos', 'Fotos'], ['lpu', 'Produção'], ['final', 'Finalizar']];
const STEPS_VIST = [['vist', 'Registro'], ['fotos', 'Evidências'], ['final', 'Finalizar']];
const STEPS_VIST_CAIXA = [['vist', 'Caixa'], ['cabos', 'Cabos'], ['fusoes', 'Fusões e mapa'], ['fotos', 'Evidências'], ['final', 'Finalizar']];
// corretiva da Claro: sem dados de cabo nem rota do cabo
const STEPS_CORR_CLARO = STEPS_CORR.filter(([k]) => k !== 'cabos');
const STEPS_SITE = [['site', 'Check-in e site'], ['sfib', 'Fibras'], ['smapa', 'OTDR no mapa'], ['fotos', 'Fotos'], ['final', 'Finalizar']];
const ST = () => isSite(S.insp) ? STEPS_SITE : S.insp && S.insp.tipo === 'corretiva' ? (claroCorr(S.insp) ? STEPS_CORR_CLARO : STEPS_CORR) : isImpl(S.insp) ? STEPS_IMPL(S.insp) : isVist(S.insp) ? (S.insp.vist && S.insp.vist.tipo === 'caixa' ? STEPS_VIST_CAIXA : STEPS_VIST) : STEPS_PREV;
const OCORR = ['Rompimento de cabo','Atenuação / sinal degradado','Vandalismo / furto','Queimada','Poste abalroado ou caído','Obra de terceiros','Caixa de emenda danificada','Outro'];
const CATS_CORR = ['Antes (rompimento)','Local / rede','Sobra técnica','Caixa de emenda','Bandeja / fusões','Cabo lançado','Depois (normalizado)','Identificação (TAG)','Outra'];
const CATS_CORR_OBRIG = ['Antes (rompimento)','Local / rede','Depois (normalizado)'];
const MATERIAIS = [['ceo','Caixa de emenda óptica (CEO)','un'],['bandeja','Bandeja de emenda','un'],['tubete','Protetor de emenda (tubete)','un'],['cabo','Cabo óptico','m'],['alca','Alça preformada','un'],['bap','Braçadeira BAP','un'],['suporteVT','Suporte de reserva técnica (cruzeta)','un'],['fitaInox','Fita de aço inox','m'],['fecho','Fecho para fita de aço','un'],['cordoalha','Cordoalha','m'],['fioEspinar','Fio de espinar','m'],['abracNylon','Abraçadeira de nylon','un'],['plaqueta','Plaqueta de identificação','un'],['fitaIsol','Fita isolante / autofusão','un'],['limpeza','Kit de limpeza (álcool isopropílico)','un']];
const CATS_CAIXA = ['Caixa fechada', 'Caixa aberta', 'Bandeja', 'Acomodação das fibras', 'Mapa de fusão (existente)', 'DGO / bastidor', 'Identificação (TAG)', 'Poste / CV', 'Irregularidade', 'Outra'];
const catsOf = i => isSite(i) ? CATS_SITE : i && i.tipo === 'corretiva' ? CATS_CORR : i && i.tipo === 'implantacao' ? CATS_IMPL : i && i.tipo === 'vistoria' ? (i.vist && i.vist.tipo === 'caixa' ? CATS_CAIXA : CATS_VIST) : CATS;
const obrigOf = i => isSite(i) ? CATS_SITE_OBRIG : i && i.tipo === 'corretiva' ? CATS_CORR_OBRIG : i && i.tipo === 'implantacao' ? ['Antes', 'Depois'] : i && i.tipo === 'vistoria' ? [] : CATS_OBRIG;
const isCorr = x => !!(x && x.tipo === 'corretiva');
const isImpl = x => !!(x && x.tipo === 'implantacao');
const isVist = x => !!(x && x.tipo === 'vistoria');
const isSite = x => !!(x && x.tipo === 'site');
// tickets do parceiro (até 2) da preventiva e da conjunta; o automático é o ticket interno
const tkParcTxt = x => ((x && x.tkParc) || []).map(t => String(t || '').trim()).filter(Boolean).join(' / ');
const TIPOLB = { preventiva: 'Ronda preventiva', corretiva: 'Corretiva', implantacao: 'Implantação', vistoria: 'Vistoria de rota', site: 'Conjunta de site' };
const tipoLb = x => TIPOLB[(x && x.tipo) || 'preventiva'] || 'Ronda preventiva';
const IMPL_SERV = { roteamento: 'Roteamento de fibras', ativacao: 'Ativação de site', dgo: 'Montagem de DGO', fechamento: 'Fechamento de caixa' };
const IMPL_USA = { roteamento: { caixa: 1, cabos: 1, fusoes: 1 }, ativacao: {}, dgo: { fusoes: 1 }, fechamento: { caixa: 1, cabos: 1, fusoes: 1 } };
const usaImpl = (i, k) => !!(IMPL_USA[(i && i.impl && i.impl.servico) || 'roteamento'] || {})[k];
const IMPL_CHECK = {
  roteamento: [['fusTest', 'Fusões testadas (OTDR / power meter)'], ['perda', 'Perda por emenda dentro do limite'], ['ident', 'Fibras e cabos identificados (etiquetas)'], ['acomod', 'Fibras acomodadas nas bandejas'], ['vedacao', 'Caixa vedada e fixada'], ['reserva', 'Reserva técnica acomodada']],
  ativacao: [['potencia', 'Potência óptica dentro da faixa'], ['link', 'Link ativo / sincronizado'], ['limpeza', 'Conectores inspecionados e limpos'], ['cordoes', 'Cordões ópticos identificados'], ['noc', 'Validação com o NOC'], ['alarmes', 'Sem alarmes ativos no site']],
  dgo: [['fixacao', 'DGO fixado e aterrado'], ['conect', 'Conectores instalados e limpos'], ['ident', 'Portas e fibras identificadas'], ['bandejas', 'Bandejas acomodadas'], ['raio', 'Raio de curvatura respeitado'], ['medPorta', 'Medição por porta realizada']],
  fechamento: [['conferidas', 'Fusões conferidas'], ['bandejas', 'Bandejas fechadas e organizadas'], ['vedacao', 'Vedação / estanqueidade'], ['fixacao', 'Caixa fixada'], ['reserva', 'Reserva técnica acomodada'], ['tag', 'Caixa identificada (TAG)']]
};
const VIST_TIPOS = { caixa: 'Mapeamento de caixa de emenda', chaves: 'Retirada de chaves', acomp: 'Acompanhamento de atividade', rota: 'Inspeção da rota', outro: 'Outro registro' };
const CATS_IMPL = ['Antes', 'Caixa de emenda', 'Bandeja / fusões', 'DGO', 'Site / equipamento', 'Etiquetas / identificação', 'Medição (OTDR / power meter)', 'Depois', 'Outra'];
// conjunta de site: fotos obrigatórias (todas menos Irregularidade e Outra)
const CATS_SITE = ['Porta do site', 'Estado de conservação do site', 'DGO', 'Power meter TX', 'Power meter RX', 'OTDR TX', 'OTDR RX', 'Irregularidade', 'Outra'];
const CATS_SITE_OBRIG = CATS_SITE.slice(0, 7);
const CATS_VIST = ['Retirada de chaves', 'Atividade em andamento', 'Equipe / EPI', 'Rede / cabo', 'Caixa / site', 'Irregularidade', 'Outra'];
const S = { view: 'home', perfil: { id: 'perfil', nome: '', matricula: '', placa: '', prefixo: 'CE-BKB' }, ronda: null, insp: null, step: 0,
  rondaView: null, gps: { status: 'off', last: null, msg: 'GPS desligado' }, watchId: null, wake: null, inspCache: new Map(), map: null, mapLayers: null, logoData: null, atvs: new Map(), exp: null, ciente: new Set(), atvPend: null };

function novaInspecao(loc) {
  const now = Date.now(), d = new Date(now);
  const rows = Array.from({ length: 12 }, () => ({ f: false, cabo: 'S1', fib: '', band: '' }));
  return { id: uid(), rondaId: S.ronda && !S.ronda.fim ? S.ronda.id : null, criado: now, atualizado: now, status: 'rascunho', chegada: now, saida: null,
    conjunta: !!(S.ronda && !S.ronda.fim && S.ronda.dono === 'conjunta'), info: { dono: S.ronda && !S.ronda.fim ? (S.ronda.dono === 'conjunta' ? (S.donoConj === 'master' ? 'parceiro' : 'proprio') : S.ronda.dono || '') : S.perfil.ultDono || '', parceiro: S.ronda && !S.ronda.fim ? (S.ronda.dono === 'conjunta' ? (S.donoConj === 'master' ? 'Master' : '') : S.ronda.parceiro || '') : S.perfil.ultParc || '', data: isoDate(now), mes: `${pad2(d.getMonth()+1)}/${d.getFullYear()}`, tecnico: S.perfil.nome, tag: '', modelo: '', fabricante: '', tipo: '', tipoOutro: '', poste: '', endereco: '', bairro: '', cidade: '', rota: '' },
    loc: loc || null,
    cabos: { entrada: { marca: '', lote: '', fibras: '', metragem: '' }, s1: { marca: '', lote: '', fibras: '', metragem: '' }, s2: { marca: '', lote: '', fibras: '', metragem: '' }, temS2: false },
    check: {}, checkObs: {}, fo: { total: 12, rows }, fotos: [], obs: '', assinatura: null };
}
function getPath(o, p) { return p.split('.').reduce((a, k) => a == null ? a : a[k], o); }
function setPath(o, p, v) { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null) a[ks[i]] = {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; }

let saveInspT;
function saveInsp(now) { clearTimeout(saveInspT); const doIt = () => { if (S.insp) { S.insp.atualizado = Date.now(); S.inspCache.set(S.insp.id, S.insp); DB.put('inspecoes', S.insp).catch(() => toast('Não foi possível salvar no aparelho.')); } }; if (now) return doIt(); saveInspT = setTimeout(doIt, 500); }
let saveRondaT, rondaDirty = false;
function saveRonda(now) { rondaDirty = true; clearTimeout(saveRondaT); const doIt = () => { if (S.ronda && rondaDirty) { rondaDirty = false; DB.put('rondas', S.ronda).catch(() => {}); } }; if (now) return doIt(); saveRondaT = setTimeout(doIt, 8000); }

/* ============================ GPS e percurso ============================ */
const NATIVO = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
function plantaoAgora() { const n = Date.now(); return (S.plantoes || []).some(p => p.tipo !== 'folga' && p.inicio <= n && p.fim > n); }
const Nativo = {
  p(n) { return NATIVO && window.Capacitor.Plugins ? window.Capacitor.Plugins[n] || null : null; },
  // alarme do sistema: toca mesmo com o app minimizado ou a tela bloqueada, até o técnico resolver no app
  async alarme(on, titulo, texto, fala) { const A = this.p('AlarmeNativo'); if (!A) return false; try { if (on) await A.tocar({ titulo, texto, falar: fala || null }); else await A.parar(); return true; } catch (e) { return false; } },
  async permissoes(completo) { const A = this.p('AlarmeNativo'); if (!A) return false; try { const r = await A.permissoes(); if (completo) { await A.bateria(); await A.telaCheia(); } return !!(r && r.notificacoes); } catch (e) { return false; } },
  watcher: null, lig: false,
  deveFundo() { return !ADMIN && !!((S.exp && !S.exp.fim) || (S.ronda && !S.ronda.fim) || plantaoAgora()); },
  // serviço em primeiro plano (notificação fixa): mantém o app vivo em segundo plano e entrega o GPS
  async fundo() {
    const B = this.p('BackgroundGeolocation'); if (!B) return; const deve = this.deveFundo();
    if (deve && !this.lig) {
      this.lig = true;
      try { this.watcher = await B.addWatcher({ backgroundTitle: 'Técnico Plus · em serviço', backgroundMessage: 'Recebendo O.S. e alarmes em segundo plano.', requestPermissions: true, stale: false, distanceFilter: 15 }, (loc, err) => {
        if (err) { if (err.code === 'NOT_AUTHORIZED') toast('Libere a localização do Técnico Plus como "Permitir o tempo todo".', 8000); return; }
        if (loc) { try { onPos({ coords: { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, speed: loc.speed } }); pintaDistOS(); } catch (e) {} }
      }); } catch (e) { this.lig = false; }
    } else if (!deve && this.lig) { this.lig = false; try { if (this.watcher) await B.removeWatcher({ id: this.watcher }); } catch (e) {} this.watcher = null; }
  },
  async arquivo(f) { const F = this.p('Filesystem'); const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); }); const w = await F.writeFile({ path: f.name, data: b64, directory: 'CACHE' }); return w.uri; },
  async compartilha(files, texto) { const F = this.p('Filesystem'), Sh = this.p('Share'); if (!F || !Sh) return false; try { const uris = []; for (const f of files) uris.push(await this.arquivo(f)); await Sh.share({ title: files[0].name, text: texto || undefined, files: uris, dialogTitle: 'Salvar ou enviar' }); } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('Não foi possível abrir o arquivo: ' + (e && e.message || e), 6000); } return true; }
};
if (NATIVO) { document.documentElement.classList.add('nativo'); setInterval(() => { try { Nativo.fundo(); } catch (e) {} }, 60000); }
// senha fraca ou vazada (Have I Been Pwned: só os 5 primeiros caracteres do hash SHA-1 saem do aparelho)
async function senhaVazada(t) {
  t = String(t || ''); if (/^(.)\1+$/.test(t) || ['123456', '1234567', '12345678', '123456789', '654321', '111111', '000000', '123123', 'abc123', 'senha123', 'multivale', 'claro123', 'qwerty'].includes(t.toLowerCase())) return true;
  try { const h = [...new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 3000); const r = await fetch('https://api.pwnedpasswords.com/range/' + h.slice(0, 5), { headers: { 'Add-Padding': 'true' }, signal: ctl.signal }); clearTimeout(tm);
    if (!r.ok) return false; return (await r.text()).split('\n').some(l => { const [s, n] = l.trim().split(':'); return s === h.slice(5) && +n > 0; }); } catch (e) { return false; }
}
/* ---------- agilidade na rua: ditado por voz, respostas prontas e aviso de chegada ---------- */
const Voz = {
  rec: null, el: null,
  disp() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition) || !!Nativo.p('SpeechRecognition'); },
  junta(el, t) { t = String(t || '').trim(); if (!t) return; const v = el.value; el.value = v + (v && !/\s$/.test(v) ? ' ' : '') + t.charAt(0).toUpperCase() + t.slice(1); el.dispatchEvent(new Event('input', { bubbles: true })); },
  async ouvir(el, btn) {
    const SR = Nativo.p('SpeechRecognition');
    if (SR) { try { const pm = await SR.requestPermissions(); if (pm && pm.speechRecognition === 'denied') { toast('Libere o microfone para o Técnico Plus.'); return; } btn.textContent = '🎙️ Fale…'; const r = await SR.start({ language: 'pt-BR', maxResults: 1, prompt: 'Fale agora', partialResults: false, popup: true }); this.junta(el, r && r.matches && r.matches[0]); } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('Não entendi. Tente de novo.'); } btn.textContent = '🎤 Falar'; return; }
    const C = window.SpeechRecognition || window.webkitSpeechRecognition; if (!C) { toast('Este celular não tem ditado no navegador. Use o microfone do teclado.'); return; }
    if (this.rec) { try { this.rec.stop(); } catch (e) {} return; }
    const r = new C(); r.lang = 'pt-BR'; r.interimResults = false; r.continuous = false; this.rec = r; this.el = el;
    btn.textContent = '🎙️ Ouvindo… toque para parar'; btn.classList.add('on');
    r.onresult = ev => { const t = [...ev.results].map(x => x[0].transcript).join(' '); this.junta(el, t); };
    r.onerror = ev => { if (ev.error === 'not-allowed') toast('Libere o microfone para o site.'); else if (ev.error !== 'no-speech' && ev.error !== 'aborted') toast('Não entendi. Tente de novo.'); };
    r.onend = () => { this.rec = null; btn.textContent = '🎤 Falar'; btn.classList.remove('on'); };
    try { r.start(); } catch (e) { this.rec = null; btn.textContent = '🎤 Falar'; }
  }
};
// coloca o botão de ditado embaixo de cada campo de texto do celular
function vozBotoes() {
  if (ADMIN || !Voz.disp()) return;
  $$('textarea, input[data-voz]').forEach(el => { if (el._voz || el.disabled || el.readOnly) return; el._voz = true; const b = document.createElement('button'); b.type = 'button'; b.className = 'vozbtn'; b.textContent = '🎤 Falar'; b.setAttribute('aria-label', 'Ditar por voz'); b.onclick = () => Voz.ouvir(el, b); el.insertAdjacentElement('afterend', b); });
}
if (!ADMIN) { let vozT = null; new MutationObserver(() => { clearTimeout(vozT); vozT = setTimeout(vozBotoes, 120); }).observe(document.documentElement, { childList: true, subtree: true }); }
// respostas prontas: um toque escreve a frase no campo
const RESP_UPD = ['Localizei o rompimento', 'Fusões em andamento', 'Aguardando poda da árvore', 'Aguardando a concessionária (poste)', 'Aguardando material', 'Aguardando liberação de acesso', 'Testes e medições em andamento', 'Sinal normalizado, finalizando'];
const RESP_LIB = ['Fusões concluídas e sinal normalizado. Pode validar?', 'Cabo lançado e emendado. Aguardando a validação do sinal.', 'Serviço concluído. Pode validar?'];
const RESP_MSG = ['Ok, aguardo.', 'Pode verificar agora?', 'Ainda no local, verificando.', 'Sinal voltou?'];
function respostasHtml(alvo, lista) { return `<div class="chips resp" role="group" aria-label="Respostas prontas">${lista.map(t => `<button type="button" data-resp="${esc(alvo)}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>`; }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-resp]'); if (!b) return; const el = document.getElementById(b.dataset.resp); if (!el) return; Voz.junta(el, b.dataset.t); el.focus(); });
// chegada automática: perto do local da O.S. o app pergunta se o técnico chegou
function checaChegada(pt) {
  const r = S.ronda; if (ADMIN || !r || r.fim || !r.atividadeId || S.insp || !pt || pt.acc > 80) return;
  const a = S.atvs.get(r.atividadeId); if (!a || a.lat == null || a.status !== 'em_deslocamento') return;
  const d = hav(pt, a); S.chegAvis = S.chegAvis || {};
  if (d > 400) { delete S.chegAvis[a.id]; return; }
  if (d > 150 || S.chegAvis[a.id] || S.alertaId) return;
  S.chegAvis[a.id] = Date.now(); const el = $('#atvAlerta'); if (!el) return; S.alertaId = 'aviso:chegada';
  el.innerHTML = `<div class="box" role="alertdialog" aria-modal="true" aria-labelledby="chT"><div class="topo prev"><small>CHEGADA AO LOCAL</small><b id="chT">📍 Você chegou ao local da O.S.?</b><span>${esc(a.ticket || atvTitulo(a))} · a ${fDist(d)} do ponto</span></div>
    <div class="corpo"><button type="button" class="btn go block" id="chSim">${ICON.check}Sim, cheguei · abrir o atendimento</button><button type="button" class="btn block" id="chNao">Ainda não</button></div></div>`;
  el.hidden = false;
  try { navigator.vibrate && navigator.vibrate([300, 120, 300]); if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance('Você chegou ao local da O S.'); u.lang = 'pt-BR'; speechSynthesis.speak(u); } } catch (e) {}
  $('#chSim').onclick = () => { fechaAlerta(); novaInsp(); };
  $('#chNao').onclick = () => { fechaAlerta(); };
}
function gpsStart() {
  if (NATIVO && Nativo.p('BackgroundGeolocation')) { Nativo.fundo(); if (!S.gps.last || Date.now() - S.gps.last.ts > 60000) { S.gps.status = 'wait'; S.gps.msg = 'Procurando sinal de GPS…'; updateLive(); } if (S.watchId == null) S.watchId = navigator.geolocation.watchPosition(onPos, onPosErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }); return; }
  if (!('geolocation' in navigator)) { S.gps = { status: 'err', last: null, msg: 'Este aparelho não tem GPS disponível no navegador.' }; updateLive(); return; }
  if (S.watchId != null) return;
  S.gps.status = 'wait'; S.gps.msg = 'Procurando sinal de GPS…'; updateLive();
  S.watchId = navigator.geolocation.watchPosition(onPos, onPosErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
}
function gpsStop() { if (S.watchId != null) navigator.geolocation.clearWatch(S.watchId); S.watchId = null; S.gps.status = 'off'; S.gps.msg = 'GPS desligado'; }
function onPos(p) {
  const pt = { lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6), ts: Date.now(), acc: Math.round(p.coords.accuracy || 0) };
  if (p.coords.speed != null && isFinite(p.coords.speed)) pt.spd = +(p.coords.speed * 3.6).toFixed(1);
  S.gps.last = pt;
  S.gps.status = pt.acc <= 50 ? 'ok' : 'weak';
  S.gps.msg = pt.acc <= 50 ? `GPS ativo · precisão ±${pt.acc} m` : `Sinal fraco · ±${pt.acc} m`;
  const r = S.ronda;
  if (r && !r.fim && pt.acc <= 50) {
    const last = r.pontos[r.pontos.length - 1];
    let keep = !last;
    if (last) { const d = hav(last, pt), dt = (pt.ts - last.ts) / 1000; const speed = dt > 0 ? d / dt : 0; keep = (d >= 8 && speed < 45) || (dt > 120 && speed < 45); }
    if (keep) { r.pontos.push(pt); saveRonda(); }
  }
  if (S.ronda && !S.ronda.fim) Nuvem.aoVivo();
  try { checaChegada(pt); } catch (e) {}
  if (S.insp && !S.insp.loc && pt.acc <= 50 && S.insp.status !== 'concluida') { S.insp.loc = pt; saveInsp(); preencherEndereco(true, true); updLocUi(); }
  else tentaGeo();
  updateLive();
}
function onPosErr(e) {
  S.gps.status = 'err';
  S.gps.msg = e.code === 1 ? 'Localização bloqueada. Libere a permissão de localização para este app.' : e.code === 3 ? 'GPS sem resposta. Vá para céu aberto.' : 'Não foi possível obter a localização.';
  updateLive();
}
function posAtual(maxAge = 60000) {
  return new Promise(res => {
    const l = S.gps.last; if (l && Date.now() - l.ts < maxAge && l.acc <= 80) return res(l);
    if (!('geolocation' in navigator)) return res(l || null);
    navigator.geolocation.getCurrentPosition(p => { const pt = { lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6), ts: Date.now(), acc: Math.round(p.coords.accuracy || 0) }; S.gps.last = pt; res(pt); },
      () => res(l || null), { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  });
}
async function wakeOn() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && !S.wake) { S.wake = await navigator.wakeLock.request('screen'); S.wake.addEventListener('release', () => { S.wake = null; }); } } catch (e) { S.wake = null; } }
function wakeOff() { try { S.wake && S.wake.release(); } catch (e) {} S.wake = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { if (S.ronda && !S.ronda.fim) { wakeOn(); gpsStart(); } render(); }
  else { saveRonda(true); saveInsp(true); }
});
window.addEventListener('pagehide', () => { saveRonda(true); saveInsp(true); });

async function reverseGeo(lat, lon) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 9000);
  try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=pt-BR&zoom=18&addressdetails=1`, { signal: ctl.signal, headers: { 'Accept': 'application/json' } });
    if (!r.ok) return null; const j = await r.json(); const a = j.address || {};
    return { cep: a.postcode || '', endereco: [a.road || a.pedestrian || a.footway || a.path || a.hamlet || '', a.house_number ? 'nº ' + a.house_number : ''].filter(Boolean).join(', '), bairro: a.suburb || a.neighbourhood || a.quarter || a.city_district || '', cidade: [a.city || a.town || a.village || a.municipality || '', a.state_code || (a['ISO3166-2-lvl4'] || '').replace('BR-', '')].filter(Boolean).join(' - '), completo: j.display_name || '' };
  } catch (e) { return null; } finally { clearTimeout(t); }
}

function segmentos(r) {
  if (!r) return [];
  const ev = [...r.eventos].sort((a, b) => a.ts - b.ts);
  const ini = ev.find(e => e.tipo === 'inicio'); if (!ini) return [];
  const chegadas = ev.filter(e => e.tipo === 'chegada');
  const tagOf = id => { const i = S.inspCache.get(id); return (i && i.info.tag) || 'sem TAG'; };
  const segs = []; let fromTs = ini.ts, fromLb = 'Início da ronda', fromLoc = ini;
  chegadas.forEach((ch, k) => {
    const sai = ev.find(e => e.tipo === 'saida' && e.inspId === ch.inspId);
    segs.push({ tipo: k === 0 ? 'desl' : 'cabo', de: fromLb, para: 'Caixa ' + tagOf(ch.inspId), ini: fromTs, fim: ch.ts, a: fromLoc, b: ch, inspId: ch.inspId });
    fromTs = sai ? sai.ts : ch.ts; fromLb = 'Caixa ' + tagOf(ch.inspId); fromLoc = ch;
  });
  const end = r.fim || Date.now();
  if (end > fromTs) segs.push({ tipo: r.fim ? (chegadas.length ? 'ret' : 'desl') : 'atual', de: fromLb, para: r.fim ? 'Fim da ronda' : 'Posição atual', ini: fromTs, fim: end, a: fromLoc });
  segs.forEach(s => { s.pts = r.pontos.filter(p => p.ts >= s.ini && p.ts <= s.fim); if (s.a && s.a.lat != null) s.pts.unshift(s.a); if (s.b && s.b.lat != null) s.pts.push(s.b); s.km = pathKm(s.pts); s.gap = gaps(s.pts); });
  return segs;
}
const SEGLB = { desl: 'Deslocamento', cabo: 'Rota do cabo', ret: 'Retorno', atual: 'Em deslocamento' };
const SEGCOR = { desl: '#d9480f', cabo: '#0b5f99', ret: '#6b7785', atual: '#7a3fa0' };
const veicTxt = v => v ? (v.txt || [[v.marca, v.modelo].filter(Boolean).join(' '), v.placa].filter(Boolean).join(' · ')) : '';
const veicPerfil = () => ({ txt: S.perfil.veiculoTxt || '', marca: S.perfil.vMarca || '', modelo: S.perfil.vModelo || '', placa: S.perfil.placa || '' });
function odoInfo(r) {
  const a = kmNum(r.odoIni), b = kmNum(r.odoFim); if (a == null || b == null) return null;
  const odo = b - a, gps = totais(r).t.km, dif = odo - gps, pct = odo > 0 ? dif / odo * 100 : null;
  const diverge = odo < 0 || (Math.abs(dif) > 2 && (pct == null || Math.abs(pct) > 10));
  return { a, b, odo, gps, dif, pct, diverge };
}
const fOdo = v => v == null ? '—' : Math.round(v).toLocaleString('pt-BR') + ' km';
function odoTxt(o) { if (!o) return 'Odômetro não informado'; return o.odo < 0 ? 'Odômetro final menor que o inicial' : `${fKm(o.odo)} no odômetro x ${fKm(o.gps)} no GPS (diferença ${o.dif >= 0 ? '+' : ''}${fKm(o.dif)}${o.pct != null ? `, ${Math.round(o.pct)}%` : ''})`; }
const LIM = () => { const v = +String(S.perfil.limiteVel || '').replace(',', '.'); return v > 0 ? v : 80; };
const fVel = v => v == null ? '—' : `${Math.round(v)} km/h`;
function velocidades(r) {
  const pts = r.pontos || [], out = [];
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k], dt = (b.ts - a.ts) / 1000; if (!(dt > 0) || dt > 120) continue;
    let v = b.spd != null ? b.spd : hav(a, b) / dt * 3.6; if (!(v >= 0) || v > 200) continue;
    out.push({ ts: b.ts, lat: b.lat, lon: b.lon, v, dt });
  }
  return out;
}
function velStats(r) {
  const vs = velocidades(r), lim = LIM(); let vmax = 0, sd = 0, st = 0; const exc = []; let cur = null;
  vs.forEach(p => {
    vmax = Math.max(vmax, p.v); if (p.v > 5) { sd += p.v * p.dt; st += p.dt; }
    if (p.v > lim) { if (!cur) cur = { ini: p.ts - p.dt * 1000, fim: p.ts, vmax: p.v, lat: p.lat, lon: p.lon, n: 1 }; else { cur.fim = p.ts; cur.n++; if (p.v > cur.vmax) { cur.vmax = p.v; cur.lat = p.lat; cur.lon = p.lon; } } }
    else if (cur) { if (cur.n >= 2 || cur.fim - cur.ini >= 15000) exc.push(cur); cur = null; }
  });
  if (cur && (cur.n >= 2 || cur.fim - cur.ini >= 15000)) exc.push(cur);
  return { vmax: vs.length ? vmax : null, vmed: st ? sd / st : null, exc, lim };
}
function velAtual() { const l = S.gps.last; if (!l) return null; if (l.spd != null) return l.spd; const r = S.ronda; if (!r || r.pontos.length < 2) return null; const vs = velocidades({ pontos: r.pontos.slice(-2) }); return vs.length && Date.now() - vs[0].ts < 30000 ? vs[0].v : null; }

/* ---------- traçado importado (KMZ/KML) e cobertura ---------- */
async function lerKml(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); let eo = -1;
    for (let k = buf.length - 22; k >= Math.max(0, buf.length - 65557); k--) if (dv.getUint32(k, true) === 0x06054b50) { eo = k; break; }
    if (eo < 0) throw new Error('Arquivo KMZ inválido');
    const n = dv.getUint16(eo + 10, true); let off = dv.getUint32(eo + 16, true); const td = new TextDecoder();
    for (let k = 0; k < n; k++) {
      const met = dv.getUint16(off + 10, true), cs = dv.getUint32(off + 20, true), nl = dv.getUint16(off + 28, true), el = dv.getUint16(off + 30, true), cl = dv.getUint16(off + 32, true), lo = dv.getUint32(off + 42, true);
      const nome = td.decode(buf.subarray(off + 46, off + 46 + nl)); off += 46 + nl + el + cl;
      if (!/\.kml$/i.test(nome)) continue;
      const ln = dv.getUint16(lo + 26, true), le = dv.getUint16(lo + 28, true); const data = buf.subarray(lo + 30 + ln + le, lo + 30 + ln + le + cs);
      if (met === 0) return td.decode(data);
      if (met === 8) { if (!('DecompressionStream' in window)) throw new Error('Este navegador não abre KMZ. Use um arquivo KML.'); const out = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer(); return td.decode(out); }
      throw new Error('Compressão do KMZ não suportada');
    }
    throw new Error('O KMZ não tem arquivo KML dentro');
  }
  return new TextDecoder().decode(buf);
}
function parseKml(txt) {
  const doc = new DOMParser().parseFromString(txt, 'application/xml'); if (doc.getElementsByTagName('parsererror').length) throw new Error('KML inválido');
  const g = (el, t) => Array.from(el.getElementsByTagNameNS('*', t)); const linhas = [], pontos = [];
  g(doc, 'LineString').forEach(ls => { const c = g(ls, 'coordinates')[0]; if (!c) return; const pts = c.textContent.trim().split(/\s+/).map(t => t.split(',').map(Number)).filter(a => isFinite(a[0]) && isFinite(a[1])).map(a => [+a[1].toFixed(6), +a[0].toFixed(6)]); if (pts.length > 1) linhas.push(pts); });
  g(doc, 'Placemark').forEach(pm => { const pt = g(pm, 'Point')[0]; if (!pt) return; const c = g(pt, 'coordinates')[0]; if (!c) return; const a = c.textContent.trim().split(',').map(Number); if (!isFinite(a[0])) return; const nm = g(pm, 'name')[0]; pontos.push({ nome: nm ? nm.textContent.trim() : '', lat: +a[1].toFixed(6), lon: +a[0].toFixed(6) }); });
  const km = linhas.reduce((s, l) => s + pathKm(l.map(([lat, lon]) => ({ lat, lon }))), 0);
  return { linhas, pontos, km };
}
const TOL_COB = 60;
function cobertura(rt, rondas) {
  if (!rt || !rt.kml || !rt.kml.linhas.length) return null;
  const cell = 0.001, grid = new Map(), add = p => { const key = Math.floor(p.lat / cell) + ':' + Math.floor(p.lon / cell); if (!grid.has(key)) grid.set(key, []); grid.get(key).push(p); };
  rondas.forEach(r => { const ps = r.pontos || []; ps.forEach((p, k) => { add(p); if (k) { const a = ps[k - 1], d = hav(a, p); if (d > 30 && d < 600) { const n = Math.ceil(d / 25); for (let j = 1; j < n; j++) add({ lat: a.lat + (p.lat - a.lat) * j / n, lon: a.lon + (p.lon - a.lon) * j / n }); } } }); });
  let tot = 0, cov = 0; const trechos = [];
  rt.kml.linhas.forEach(l => { let atual = null;
    for (let k = 1; k < l.length; k++) { const a = { lat: l[k - 1][0], lon: l[k - 1][1] }, b = { lat: l[k][0], lon: l[k][1] }, d = hav(a, b), n = Math.max(1, Math.ceil(d / 25));
      for (let j = 0; j < n; j++) { const sp = { lat: a.lat + (b.lat - a.lat) * j / n, lon: a.lon + (b.lon - a.lon) * j / n }, sg = d / n; tot += sg;
        const ci = Math.floor(sp.lat / cell), cj = Math.floor(sp.lon / cell); let ok = false;
        for (let x = -1; x <= 1 && !ok; x++) for (let y = -1; y <= 1 && !ok; y++) { const arr = grid.get((ci + x) + ':' + (cj + y)); if (arr) for (const q of arr) if (hav(sp, q) <= TOL_COB) { ok = true; break; } }
        if (ok) { cov += sg; if (!atual) { atual = [[sp.lat, sp.lon]]; trechos.push(atual); } atual.push([sp.lat, sp.lon]); } else atual = null; } } });
  return { totKm: tot / 1000, covKm: cov / 1000, pct: tot ? cov / tot * 100 : 0, trechos };
}
const fPct = v => `${Math.round(v)}%`;
const DESVIO_M = 100;
function gridRota(rt) {
  if (!rt || !rt.kml || !rt.kml.linhas.length) return null; if (rt._grid && rt._grid.v === rt.kml.em) return rt._grid.g;
  const cell = 0.001, g = new Map(), add = (lat, lon) => { const key = Math.floor(lat / cell) + ':' + Math.floor(lon / cell); if (!g.has(key)) g.set(key, []); g.get(key).push({ lat, lon }); };
  rt.kml.linhas.forEach(l => { for (let k = 1; k < l.length; k++) { const a = { lat: l[k - 1][0], lon: l[k - 1][1] }, b = { lat: l[k][0], lon: l[k][1] }, n = Math.max(1, Math.ceil(hav(a, b) / 20)); for (let j = 0; j <= n; j++) add(a.lat + (b.lat - a.lat) * j / n, a.lon + (b.lon - a.lon) * j / n); } });
  Object.defineProperty(rt, '_grid', { value: { v: rt.kml.em, g }, configurable: true, enumerable: false }); return g;
}
function distRota(g, p) { const cell = 0.001, ci = Math.floor(p.lat / cell), cj = Math.floor(p.lon / cell); let m = Infinity; for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) { const arr = g.get((ci + x) + ':' + (cj + y)); if (arr) for (const q of arr) { const d = hav(p, q); if (d < m) m = d; } } return m; }
function distRotaExata(g, p) { let m = Infinity; for (const arr of g.values()) for (const q of arr) { const d = hav(p, q); if (d < m) m = d; } return m; }
function aderencia(r) {
  if (!ADMIN) return null;
  const rt = r && r.rotaId ? rotaById(r.rotaId) : null; const g = gridRota(rt); if (!g || isCorr(r)) return null;
  const segs = segmentos(r).filter(s => s.tipo === 'cabo'); if (!segs.length) return { rt, kmDentro: 0, kmFora: 0, pct: null, desvios: [] };
  let dentro = 0, fora = 0; const desvios = [];
  segs.forEach(sg => { let cur = null; const pts = sg.pts;
    for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k], d = hav(a, b), mid = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
      const db = distRota(g, b), dm = distRota(g, mid), off = db > DESVIO_M && dm > DESVIO_M;
      if (off) { fora += d; if (!cur) { cur = { ini: a.ts || sg.ini, fim: b.ts || sg.fim, km: 0, dmax: 0, pts: [a], de: sg.de, para: sg.para }; desvios.push(cur); } cur.km += d / 1000; cur.fim = b.ts || cur.fim; cur.dmax = Math.max(cur.dmax, isFinite(db) ? db : distRotaExata(g, b)); cur.pts.push(b); }
      else { dentro += d; cur = null; } } });
  const ds = desvios.filter(x => x.km * 1000 >= 50); const kmFora = ds.reduce((s, x) => s + x.km, 0), kmD = dentro / 1000 + (fora / 1000 - kmFora);
  return { rt, kmDentro: kmD, kmFora, pct: kmD + kmFora > 0 ? kmD / (kmD + kmFora) * 100 : null, desvios: ds };
}
const fDmax = m => isFinite(m) && m < 999999 ? fDist(m) : 'mais de 1 km';
function totais(r) {
  const segs = segmentos(r); const t = { km: 0, desl: 0, cabo: 0, ret: 0, atual: 0, caixas: r ? r.eventos.filter(e => e.tipo === 'chegada').length : 0, dur: r ? (r.fim || Date.now()) - r.inicio : 0, gapN: 0, gapMs: 0 };
  segs.forEach(s => { t.km += s.km; t[s.tipo] += s.km; t.gapN += s.gap.n; t.gapMs += s.gap.ms; });
  return { t, segs };
}

/* ============================ perfil e relatórios ============================ */
const donoLb = (d, p) => d === 'conjunta' ? 'Conjunta: Multivale + Master' : d === 'parceiro' ? 'Parceiro' + (p ? ': ' + p : '') : d === 'proprio' ? 'Próprio' : '';
const LISTAS_PADRAO = { projetoImpl: ['Expansão 5G', 'Interligação de sites', 'Backhaul', 'Rede de acesso'], equipImpl: ['Huawei', 'Ericsson', 'Nokia', 'ZTE', 'Cisco'], dgoModelo: ['DGO 12 portas', 'DGO 24 portas', 'DGO 48 portas', 'DGO 72 portas', 'DGO 144 portas'], localChave: ['Base / almoxarifado', 'Portaria do site', 'Central da operadora'], equipeAcomp: [], fabCaixa: ['Furukawa', 'Prysmian', '3M', 'Fibracem', 'CommScope', 'Cablena'], modCaixa: ['FOSC-400', 'CEO 72', 'CEO 144', 'CEO 288'], marcaCabo: ['Furukawa', 'Prysmian', 'Cablena', 'Draka', 'Fibracem'], parceiro: ['Master'], veiculo: [], local: [] };
function listaItens(k) { const extra = ((S.perfil.listas || {})[k]) || []; const legado = k === 'parceiro' ? (S.perfil.parceiros || []) : k === 'local' ? (S.perfil.refLocais || []) : []; const out = []; [...(LISTAS_PADRAO[k] || []), ...legado, ...extra].forEach(x => { if (x && !out.some(y => normLocal(y) === normLocal(x))) out.push(x); }); return out; }
function addLista(k, v) { v = String(v || '').trim(); if (!v) return v; const ex = listaItens(k).find(x => normLocal(x) === normLocal(v)); if (ex) return ex; S.perfil.listas = S.perfil.listas || {}; S.perfil.listas[k] = [...(S.perfil.listas[k] || []), v]; if (!ADMIN) DB.put('meta', S.perfil); return v; }
function selAdd(id, k, val, lb, attrs = '', full = false, req = false) {
  const itens = listaItens(k); if (val && !itens.some(x => x === val)) itens.push(val);
  return `<div class="field ${full ? 'full' : ''}"><label class="lb" for="${id}">${lb}${req ? ' <span class="req">*</span>' : ''}</label><select id="${id}" data-lista="${k}" ${attrs}><option value="">Selecione…</option>${itens.map(x => `<option ${x === val ? 'selected' : ''}>${esc(x)}</option>`).join('')}<option value="__novo">+ Adicionar novo…</option></select>
    <div class="row novo" data-novo-de="${id}" hidden style="flex-wrap:nowrap;margin-top:6px"><input type="text" id="${id}_novo" placeholder="Digite e toque em Salvar" style="flex:1;min-width:0" aria-label="Novo item para ${esc(lb)}"><button type="button" class="btn pri" data-salvanovo="${id}" style="min-height:48px;padding:0 14px">Salvar</button></div></div>`;
}
function aplicaSel(sel, v) {
  const d = sel.dataset;
  if (d.k && S.insp) { setPath(S.insp, d.k, v); saveInsp(); }
  else if (d.pf) { S.perfil[d.pf] = v; if (!ADMIN) DB.put('meta', S.perfil); }
  else if (d.parc === 'rd') { S.perfil.ultParc = v; DB.put('meta', S.perfil); }
  else if (d.parc === 'in' && S.insp) { S.insp.info.parceiro = v; saveInsp(); }
  else if (d.parc === 'rt' && S.rotaEdit) { S.rotaEdit.parceiro = v; }
  else if (d.imsel) { S.im = S.im || {}; S.im[d.imsel] = v; }
}
document.addEventListener('change', e => {
  const sel = e.target; if (!sel.matches || !sel.matches('select[data-lista]')) return;
  const box = document.querySelector(`[data-novo-de="${sel.id}"]`);
  if (sel.value === '__novo') { sel.value = sel.dataset.ant || ''; if (box) { box.hidden = false; const i = box.querySelector('input'); i && i.focus(); } return; }
  sel.dataset.ant = sel.value; if (!sel.dataset.k) aplicaSel(sel, sel.value);
});
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-salvanovo]'); if (!b) return;
  const sel = document.getElementById(b.dataset.salvanovo); const inp = document.getElementById(b.dataset.salvanovo + '_novo'); if (!sel || !inp) return;
  const v = addLista(sel.dataset.lista, inp.value); if (!v) { inp.focus(); return; }
  aplicaSel(sel, v); toast('Item adicionado à lista.'); const y = window.scrollY; if (S.view === 'rota') { const keep = S.rotaEdit; render(); S.rotaEdit = keep; } else render(); window.scrollTo(0, y);
});
document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('select[data-lista]')) e.target.dataset.ant = e.target.value; });
// serviços que o técnico executa (escolhidos no perfil). Vazio = todos.
// clusters e mini clusters de atendimento; classe da equipe
// cargos (função) do colaborador; a "base" (tecnico | fibra | fiscal) define o que o app libera
const CARGOS = [['aux_rede', 'Auxiliar de rede'], ['oficial', 'Oficial de rede'], ['oficial1', 'Oficial de rede 1'], ['oficial2', 'Oficial de rede 2'], ['oficial3', 'Oficial de rede 3'], ['oficial4', 'Oficial de rede 4'], ['oficial5', 'Oficial de rede 5'], ['fibra1', 'Técnico de fibra 1'], ['fibra2', 'Técnico de fibra 2'], ['fibra3', 'Técnico de fibra 3'], ['fibra4', 'Técnico de fibra 4'], ['fibra5', 'Técnico de fibra 5'], ['encarregado', 'Encarregado'], ['fiscal', 'Fiscal de campo'], ['supervisor', 'Supervisor 1'], ['supervisor2', 'Supervisor 2'], ['supervisor3', 'Supervisor 3'], ['supervisor4', 'Supervisor 4'], ['coordenador', 'Coordenador'], ['gerente_proj', 'Gerente de projeto'], ['gerente_geral', 'Gerente geral'], ['aux_escritorio', 'Auxiliar de escritório']];
// equipes (MEC = mecânica, FO = fibra óptica)
const EQUIPES = [...Array.from({ length: 11 }, (_, k) => 'MEC ' + (k + 1)), ...Array.from({ length: 5 }, (_, k) => 'FO ' + (k + 1))];
const eqDatalist = () => `<datalist id="eqCods">${EQUIPES.map(e => `<option value="${e}">`).join('')}</datalist>`;
const eqOpts = (sel, vazio = 'Sem equipe') => `<option value="">${vazio}</option>` + EQUIPES.map(e => `<option ${sel === e ? 'selected' : ''}>${e}</option>`).join('') + (sel && !EQUIPES.includes(sel) ? `<option selected>${esc(sel)}</option>` : '');
const CARGO_LB = Object.fromEntries(CARGOS);
const cargoBase = c => c === 'fiscal' ? 'fiscal' : /^fibra/.test(c || '') ? 'fibra' : 'tecnico';
const cargoPadrao = f => f === 'fiscal' ? 'fiscal' : f === 'fibra' ? 'fibra1' : '';
const cargoLb = x => (x && CARGO_LB[x.cargo]) || (typeof FUNCAO_LB !== 'undefined' && x && FUNCAO_LB[x.funcao]) || 'Técnico';
const cargoOpts = (sel, vazio) => (vazio ? `<option value="">${vazio}</option>` : '') + CARGOS.map(([k, l]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${l}</option>`).join('');
const CLUSTERS = { ddd11: 'Cluster DDD11', ddd12: 'Cluster DDD12', ddd13: 'Cluster DDD13', mg: 'Cluster MG' };
const MINI = { implantacao: ['Implantação', 'ddd11'], sjc: ['São José dos Campos', 'ddd12'], taubate: ['Taubaté', 'ddd12'], litoral: ['Litoral', 'ddd12'], santos: ['Santos', 'ddd13'], sulminas: ['Sul de Minas', 'mg'] };
const CLASSES = { mecanica: 'Equipe mecânica', fusao: 'Equipe fusão', fiscal: 'Fiscal de campo' };
// região do colaborador = cluster + mini cluster; "todas" = todas as áreas do cluster (ex.: fiscal de campo)
const clusterDe = (reg, clu) => reg && reg !== 'todas' ? (MINI[reg] || [])[1] || clu || '' : clu || '';
const miniNome = (reg, clu) => reg === 'todas' ? 'Todas as áreas · ' + (CLUSTERS[clu] || '') : (MINI[reg] || [])[0] || '';
const cluOpts = (sel, vazio = 'Selecione…') => `<option value="">${vazio}</option>` + Object.entries(CLUSTERS).map(([k, l]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${l}</option>`).join('');
const miniOpts = (clu, sel, vazio = 'Selecione…') => `<option value="">${vazio}</option>` + (clu ? `<option value="todas" ${sel === 'todas' ? 'selected' : ''}>Todas as áreas do cluster</option>` : '') + Object.entries(MINI).filter(([, v]) => !clu || v[1] === clu).map(([k, v]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${v[0]}</option>`).join('');
// liga os dois selects: trocar o cluster refaz a lista de mini clusters; fiscal de campo já vem com "todas as áreas"
const meusClusters = () => (ADMIN && Nuvem.admin && Array.isArray(Nuvem.admin.clusters)) ? Nuvem.admin.clusters.filter(c => CLUSTERS[c]) : [];
// calendário: clusters de cada supervisor (o gestor define; o supervisor pode mudar os dele)
async function pintaSupClusters() {
  const bx = $('#supBox'); if (!bx) return; let L;
  try { L = await Nuvem.adminsLista(); } catch (e) { bx.innerHTML = `<p class="muted small">Clusters dos supervisores indisponíveis: rode o supabase.sql novo.</p>`; return; }
  const eu = Nuvem.user && Nuvem.user.id, gestor = (Nuvem.admin || {}).papel === 'gestor';
  bx.innerHTML = `<h2>Supervisores e clusters</h2><p class="muted small" style="margin:0">Um supervisor pode cuidar de mais de um cluster. O calendário abre filtrado pelos clusters dele.${gestor ? '' : ' Só o gestor muda os clusters dos outros.'}</p>
    <div class="list">${L.filter(a => a.papel !== 'noc').sort((a, b) => String(a.nome).localeCompare(String(b.nome))).map(a => { const pode = gestor || a.uid === eu; const cs = a.clusters || []; return `<div class="item" style="cursor:default;flex-wrap:wrap;gap:8px"><span class="tx"><b>${esc(a.nome || 'Sem nome')}</b><span>${a.papel === 'gestor' ? 'Gestor' : 'Supervisor'}</span></span><span class="chips" style="flex-wrap:wrap">${Object.entries(CLUSTERS).map(([k, l]) => `<button type="button" role="checkbox" aria-checked="${cs.includes(k)}" data-supclu="${a.uid}" data-v="${k}" ${pode ? '' : 'disabled'}>${l.replace('Cluster ', '')}</button>`).join('')}</span></div>`; }).join('')}</div>`;
  $$('[data-supclu]', bx).forEach(b => b.onclick = async () => { const a = L.find(x => x.uid === b.dataset.supclu); const cs = new Set(a.clusters || []); cs.has(b.dataset.v) ? cs.delete(b.dataset.v) : cs.add(b.dataset.v);
    try { await Nuvem.adminClusters(a.uid, [...cs]); a.clusters = [...cs]; if (a.uid === eu && Nuvem.admin) Nuvem.admin.clusters = [...cs]; toast('Clusters de ' + (a.nome || 'supervisor') + ' salvos.'); pintaSupClusters(); } catch (e) { toast('Erro: ' + (e.message || e), 6000); } });
}
function bindRegiao(cSel, rSel, claSel, aoMudar) {
  if (!cSel || !rSel) return;
  const muda = () => aoMudar && aoMudar(cSel.value || clusterDe(rSel.value, ''), rSel.value);
  cSel.addEventListener('change', () => { const v = rSel.value; const ok = v === 'todas' || (MINI[v] || [])[1] === cSel.value; rSel.innerHTML = miniOpts(cSel.value, ok ? v : (claSel && claSel.value === 'fiscal' && cSel.value ? 'todas' : '')); muda(); });
  rSel.addEventListener('change', () => { if (rSel.value && rSel.value !== 'todas') cSel.value = MINI[rSel.value][1]; muda(); });
  claSel && claSel.addEventListener('change', () => { if (claSel.value === 'fiscal' && cSel.value && !rSel.value) { rSel.value = 'todas'; muda(); } });
}
const SERVICOS = { claro_int: 'Corretiva Claro interior', bb_multivale: 'Corretiva backbone Multivale', bb_master: 'Corretiva backbone Master', vistoria: 'Vistoria de rede', preventiva: 'Preventiva (ativar rota)', conjunta: 'Conjunta de site (parceiro)', implantacao: 'Implantação' };
// perfis antigos: "backbone próprio" vira Multivale e "backbone de parceiros" vira Master
const SERV_ANTIGO = { bb_proprio: 'bb_multivale', bb_parceiro: 'bb_master' };
function meusServ() { const l = S.recurso && S.recurso.servicos; return Array.isArray(l) && l.length ? [...new Set(l.map(k => SERV_ANTIGO[k] || k))].filter(k => SERVICOS[k]) : Object.keys(SERVICOS); }
function modosPermitidos() { if (S.perfil.funcao === 'fiscal') return ['vistoria']; const s = meusServ(); const m = []; if (s.includes('preventiva')) m.push('preventiva'); if (s.includes('conjunta') || s.includes('preventiva')) m.push('conjunta'); if (s.some(x => x === 'bb_multivale' || x === 'bb_master' || x === 'claro_int')) m.push('corretiva'); if (s.includes('implantacao')) m.push('implantacao'); if (s.includes('vistoria')) m.push('vistoria'); return m.length ? m : ['corretiva']; }
// na corretiva: de quem é o backbone (Multivale = próprio · Master e Claro interior = parceiro)
const CORR_OPC = { multivale: ['Backbone Multivale', 'proprio', ''], master: ['Backbone Master', 'parceiro', 'Master'], claro: ['Claro interior', 'parceiro', 'Claro'] };
function corrOpcoes() { const s = meusServ(); const o = []; if (s.includes('bb_multivale')) o.push('multivale'); if (s.includes('bb_master')) o.push('master'); if (s.includes('claro_int')) o.push('claro'); return o.length ? o : ['multivale', 'master', 'claro']; }
function corrAtual(dono, parc) { return dono === 'proprio' ? 'multivale' : dono === 'parceiro' && /master/i.test(parc || '') ? 'master' : dono === 'parceiro' && /claro/i.test(parc || '') ? 'claro' : ''; }
function soClaro() { const o = corrOpcoes(); return o.length === 1 && o[0] === 'claro'; }
function conjHtml(i) { const v = i.info.dono === 'parceiro' && /master/i.test(i.info.parceiro || '') ? 'master' : 'multivale'; return `<div class="field full"><span class="lb">Esta ${isVist(i) ? 'anotação' : 'caixa'} é do backbone</span><div class="seg" role="group" aria-label="Backbone"><button type="button" data-conj="multivale" aria-pressed="${v === 'multivale'}">Multivale</button><button type="button" data-conj="master" aria-pressed="${v === 'master'}">Master</button></div><span class="muted small">Preventiva conjunta: cada caixa entra no relatório do dono dela.</span></div>`; }
function rondaConj(i) { const r = i && (S.ronda && S.ronda.id === i.rondaId ? S.ronda : null); return !!(r && r.dono === 'conjunta') || !!(i && i.conjunta); }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-conj]'); if (!b || !S.insp) return; const m = b.dataset.conj === 'master'; S.insp.info.dono = m ? 'parceiro' : 'proprio'; S.insp.info.parceiro = m ? 'Master' : ''; S.donoConj = b.dataset.conj; saveInsp(); const y = window.scrollY; render(); window.scrollTo(0, y); });
function donoHtml(prefix, dono, parc) {
  if (prefix === 'rd' && S.modo === 'corretiva' && !S.atvPend) {
    const O = corrOpcoes(); let at = corrAtual(dono, parc);
    if (!O.includes(at)) { at = O[0]; S.perfil.ultDono = CORR_OPC[at][1]; S.perfil.ultParc = CORR_OPC[at][2]; }
    if (O.length === 1) return `<div class="field full"><span class="lb">Backbone</span><b>${CORR_OPC[at][0]}</b></div>`;
    return `<div class="field full"><span class="lb">Corretiva de</span><div class="seg" role="group" aria-label="Corretiva de">${O.map(k => `<button type="button" data-dcorr="${k}" aria-pressed="${at === k}">${CORR_OPC[k][0]}</button>`).join('')}</div></div>`;
  }
  const ps = [...new Set(['Master', ...(S.perfil.parceiros || [])])];
  return `<div class="field full"><span class="lb">Backbone</span><div class="seg" role="group" aria-label="Dono do backbone"><button type="button" data-dono="${prefix}" data-v="proprio" aria-pressed="${dono === 'proprio'}">Próprio</button><button type="button" data-dono="${prefix}" data-v="parceiro" aria-pressed="${dono === 'parceiro'}">Parceiro</button></div></div>
    ${dono === 'parceiro' ? selAdd(prefix + '_parc', 'parceiro', parc || '', 'Parceiro', `data-parc="${prefix}"`, true) : ''}`;
}
function lembraParceiro(p) { p = String(p || '').trim(); if (!p) return; const l = S.perfil.parceiros || []; if (!l.includes(p)) { S.perfil.parceiros = [...l, p].slice(-10); DB.put('meta', S.perfil); } }
const RAIO_CASA = 500;
function casaInfo() { const c = S.perfil.casa; return c && c.lat != null ? `Residência marcada no mapa (${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}). Serve só de referência no relatório de jornada (distância de casa no início do expediente).` : 'Opcional. Se marcar, o relatório de jornada mostra a que distância de casa o expediente começou.'; }
async function checaCasa() {
  // sem exigência de endereço nem de distância de casa: só registra a distância, se houver casa marcada e GPS (não bloqueia)
  S.distCasa = null; const c = S.perfil.casa;
  if (c && c.lat != null) { gpsStart(); posAtual(8000).then(loc => { if (loc) { S.distCasa = Math.round(hav(loc, c)); if (S.exp && S.exp.distCasa == null) { S.exp.distCasa = S.distCasa; salvaExp().catch(() => {}); } } }).catch(() => {}); }
  return true;
}
function viewEntrar() {
  let cv = ''; try { cv = localStorage.getItem('rb_convite') || ''; } catch (e) {} const pa = S.entrarPrimeiro ?? !!cv;
  return `<section class="card" style="max-width:460px;margin:24px auto 0;width:100%"><div style="text-align:center"><img src="logo.png" alt="Multivale" style="height:56px"></div>
    <div class="seg" role="group" aria-label="Como entrar"><button type="button" data-ent="0" aria-pressed="${!pa}">Já tenho senha</button><button type="button" data-ent="1" aria-pressed="${pa}">Primeiro acesso</button></div>
    ${pa ? `<p class="muted small" style="margin:0">Use o código do convite que o supervisor mandou pelo WhatsApp e crie a sua senha.</p>
      <div class="field"><label class="lb" for="enCod">Código do convite</label><input type="text" id="enCod" value="${esc(cv)}" autocapitalize="characters" autocomplete="off" placeholder="Ex.: K7M2QX"></div>
      <div class="field"><label class="lb" for="enS1">Crie uma senha (mínimo 6)</label><input type="password" id="enS1" autocomplete="new-password"></div>
      <div class="field"><label class="lb" for="enS2">Repita a senha</label><input type="password" id="enS2" autocomplete="new-password"></div>
      <button type="button" class="btn pri block" id="enAtivar">Criar senha e entrar</button>`
    : `<div class="field"><label class="lb" for="enLog">Matrícula (ou código do convite)</label><input type="text" id="enLog" autocomplete="username" inputmode="text" value="${esc(S.perfil.matricula || '')}"></div>
      <div class="field"><label class="lb" for="enSen">Senha</label><input type="password" id="enSen" autocomplete="current-password"></div>
      <button type="button" class="btn pri block" id="enEntrar">Entrar</button>
      <button type="button" class="btn block" id="enEsqueci">Esqueci a senha</button>
      <p class="muted small" style="margin:0">Primeira vez no app? Toque em <b>Primeiro acesso</b> e use o código do convite que o supervisor mandou.</p>`}
    <div id="enMsg"></div>
    <p class="muted small" style="margin:0">O acesso é só para colaboradores cadastrados pela Multivale.</p></section>`;
}
function afterEntrar() {
  $$('[data-ent]').forEach(b => b.onclick = () => { S.entrarPrimeiro = b.dataset.ent === '1'; render(); });
  const vai = async (btn, fn) => { btn.disabled = true; const t = btn.textContent; btn.textContent = 'Entrando…'; try { await fn(); toast('Bem-vindo!'); S.entrarPrimeiro = null; go('home'); } catch (e) { toast(e.message || String(e), 6000); btn.disabled = false; btn.textContent = t; } };
  const msg = (html, ok) => { const b = $('#enMsg'); if (b) b.innerHTML = html ? `<div class="${ok ? 'okbox' : 'warnbox'} small">${html}</div>` : ''; };
  // quando o login falha, pergunta ao servidor o porquê (convite não usado, matrícula sem cadastro, senha errada)
  const explica = async l => { try { const d = await Nuvem.acesso('situacao', { login: l }); return d.estado; } catch (e) { return /indispon|acesso/.test(e.message || '') ? 'sem_funcao' : null; } };
  $('#enEntrar') && ($('#enEntrar').onclick = async () => { const l = $('#enLog').value.trim(), s = $('#enSen').value; if (!l || !s) { toast('Informe matrícula e senha.'); return; } const btn = $('#enEntrar'); btn.disabled = true; btn.textContent = 'Entrando…'; msg('');
    try { await Nuvem.entrar(l, s); toast('Bem-vindo!'); S.entrarPrimeiro = null; go('home'); }
    catch (e) { btn.disabled = false; btn.textContent = 'Entrar'; if (!/incorreta/.test(e.message || '')) { toast(e.message || String(e), 6000); return; }
      const st = await explica(l);
      if (st === 'convite_pendente') { S.entrarPrimeiro = true; render(); setTimeout(() => { const b = $('#enMsg'); if (b) b.innerHTML = '<div class="warnbox small">Você ainda não criou sua senha. Use o <b>código do convite</b> que o supervisor mandou e crie a senha aqui.</div>'; }, 50); }
      else if (st === 'sem_cadastro') msg('Não encontramos essa matrícula. Confira o número ou peça ao supervisor para conferir o seu cadastro (a matrícula precisa estar no cadastro).');
      else if (st === 'desativado') msg('Este cadastro está desativado. Fale com o supervisor.');
      else if (st === 'sem_funcao') msg('O acesso ainda não está configurado no servidor (função "acesso" do Supabase). Avise o supervisor.');
      else msg('Senha incorreta. Se não lembrar, toque em <b>Esqueci a senha</b>.'); } });
  $('#enEsqueci') && ($('#enEsqueci').onclick = async () => { const l = $('#enLog').value.trim(); if (!l) { toast('Digite a sua matrícula primeiro.'); $('#enLog').focus(); return; }
    try { const d = await Nuvem.acesso('pedir_senha', { login: l }); if (d.estado === 'ativo') msg('Pedido enviado. O supervisor recebe o aviso no painel, gera uma senha nova e te manda pelo WhatsApp.', true); else if (d.estado === 'convite_pendente') { S.entrarPrimeiro = true; render(); } else if (d.estado === 'sem_cadastro') msg('Não encontramos essa matrícula. Fale com o supervisor.'); else msg('Este cadastro está desativado. Fale com o supervisor.'); }
    catch (e) { msg('Não foi possível enviar o pedido agora. Fale direto com o supervisor.'); } });
  $('#enSen') && $('#enSen').addEventListener('keydown', e => { if (e.key === 'Enter') $('#enEntrar').click(); });
  $('#enAtivar') && ($('#enAtivar').onclick = () => { const c = $('#enCod').value.trim().toUpperCase(), s1 = $('#enS1').value, s2 = $('#enS2').value; if (!c) { toast('Informe o código do convite.'); return; } if (s1.length < 6) { toast('A senha precisa ter pelo menos 6 caracteres.'); return; } if (s1 !== s2) { toast('As senhas não conferem.'); return; }
    vai($('#enAtivar'), async () => { const d = await Nuvem.ativarConvite(c, s1); try { localStorage.removeItem('rb_convite'); } catch (e) {} toast(`Senha criada. Seu login é a matrícula${d.login && !d.login.startsWith('m') ? ' (ou o código ' + c + ')' : ''}.`, 6000); }); });
}
/* ---------- Aparência: modo claro/escuro e tom de cor (fica salvo neste aparelho) ---------- */
// os 2 temas do field service da Claro (as cores de cada um estão no app.css)
const TONS = { claro: ['Vermelho e azul', 'linear-gradient(135deg,#e3260e 50%,#0572ce 50%)'], claro2: ['Vermelho', '#da291c'] };
function temaAtual() { try { const t = JSON.parse(localStorage.getItem('rb_tema') || '{}'); if (t.tom && !TONS[t.tom]) t.tom = t.tom === 'vermelho' || t.tom === 'verde' ? 'claro2' : 'claro'; return t; } catch (e) { return {}; } }
function aplicaTema(t) { const r = document.documentElement; if (t.modo) r.dataset.theme = t.modo; else delete r.dataset.theme; if (t.tom && t.tom !== 'claro') r.dataset.tom = t.tom; else delete r.dataset.tom; try { localStorage.setItem('rb_tema', JSON.stringify(t)); } catch (e) {} const m = document.querySelector('meta[name="theme-color"]'); if (m) setTimeout(() => { m.content = getComputedStyle(r).getPropertyValue('--hdr').trim() || '#e3260e'; }, 30); }
function aparenciaHtml() { const t = temaAtual();
  return `<section class="card" id="cardAparencia"><h2>Aparência</h2>
    <span class="lb">Modo</span><div class="seg" role="group" aria-label="Modo de cor">${[['', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([k, l]) => `<button type="button" data-tmodo="${k}" aria-pressed="${(t.modo || '') === k}">${l}</button>`).join('')}</div>
    <span class="lb">Tema (padrão Claro field service)</span><div class="seg" role="group" aria-label="Tema de cor">${Object.entries(TONS).map(([k, [l, c]]) => `<button type="button" data-ttom="${k}" aria-pressed="${(t.tom || 'claro') === k}"><span class="tom-sw" style="background:${c}"></span>${l}</button>`).join('')}</div>
    <p class="muted small" style="margin:0">Automático segue o celular (escuro à noite, se o aparelho estiver assim). Fica salvo neste aparelho.</p></section>`; }
function bindAparencia(root = document) { $$('[data-tmodo]', root).forEach(b => b.onclick = () => { aplicaTema({ ...temaAtual(), modo: b.dataset.tmodo }); $$('[data-tmodo]', root).forEach(x => x.setAttribute('aria-pressed', x === b)); }); $$('[data-ttom]', root).forEach(b => b.onclick = () => { aplicaTema({ ...temaAtual(), tom: b.dataset.ttom }); $$('[data-ttom]', root).forEach(x => x.setAttribute('aria-pressed', x === b)); }); }
function abrirAparencia() { const el = document.createElement('div'); el.className = 'modal'; el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:950;display:flex;align-items:center;justify-content:center;padding:12px';
  el.innerHTML = `<div style="max-width:460px;width:100%" role="dialog" aria-modal="true" aria-label="Aparência">${aparenciaHtml()}<button type="button" class="btn block" data-x style="margin-top:8px">Fechar</button></div>`; document.body.appendChild(el); bindAparencia(el); el.onclick = e => { if (e.target === el || e.target.closest('[data-x]')) el.remove(); }; }
function viewPerfil() {
  const v = k => esc(S.perfil[k] || '');
  return `<section class="card"><h2>Meu perfil</h2><p class="muted small" style="margin:0">Preencha só uma vez. Fica salvo neste celular.</p>
    <div class="row" style="gap:14px;align-items:center;margin-top:4px"><span class="av avbig">${avIn(S.perfil.foto, S.perfil.nome || '?')}</span><span class="row" style="gap:8px"><label class="btn" for="pfFoto" style="cursor:pointer">${ICON.cam}${S.perfil.foto ? 'Trocar foto' : 'Foto de perfil'}</label>${S.perfil.foto ? '<button type="button" class="lnk" id="pfFotoDel">Remover</button>' : ''}</span><input type="file" id="pfFoto" accept="image/*" hidden></div>
    <div class="grid2"><div class="field full"><label class="lb" for="pf_nome">Nome <span class="req">*</span></label><input type="text" id="pf_nome" data-pf="nome" value="${v('nome')}" autocomplete="name"></div>
    <div class="field full"><label class="lb" for="pf_mat">Matrícula <span class="req">*</span></label><input type="text" id="pf_mat" data-pf="matricula" value="${v('matricula')}" inputmode="numeric"></div>
    <div class="field full"><label class="lb" for="pf_cargo">Função${S.perfil.funcaoTravada ? ' <span class="muted small" style="font-weight:400">· definida pelo supervisor</span>' : ''}</label><select id="pf_cargo" ${S.perfil.funcaoTravada ? 'disabled' : ''}>${cargoOpts(S.perfil.cargo || cargoPadrao(S.perfil.funcao), 'Selecione…')}</select></div>
    ${S.perfil.centroCusto ? `<div class="field full"><span class="lb">Centro de custo</span><span>${esc(CLUSTERS[S.perfil.centroCusto] || S.perfil.centroCusto)} <span class="muted small">· definido pelo gestor</span></span></div>` : ''}
    <div class="field"><label class="lb" for="pf_clu">Cluster</label><select id="pf_clu">${cluOpts(clusterDe(S.perfil.regiao, S.perfil.cluster))}</select></div>
    <div class="field"><label class="lb" for="pf_reg">Mini cluster que atendo</label><select id="pf_reg">${miniOpts(clusterDe(S.perfil.regiao, S.perfil.cluster), S.perfil.regiao || '')}</select></div>
    <div class="field"><label class="lb" for="pf_cla">Minha classe</label><select id="pf_cla" data-pf="classe"><option value="">Selecione…</option>${Object.entries(CLASSES).map(([k, l]) => `<option value="${k}" ${S.perfil.classe === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field full"><span class="lb">Serviços liberados para você</span><b style="font-weight:600">${meusServ().map(k => esc(SERVICOS[k])).join(' · ')}</b><span class="muted small">Definidos pelo supervisor na sua ficha. O.S. enviadas pelo supervisor chegam sempre, de qualquer tipo.</span></div>
    ${selAdd('pf_veic', 'veiculo', S.perfil.veiculoTxt || '', 'Veículo (placa e modelo)', 'data-pf="veiculoTxt"', true)}
    <div class="field full"><label class="lb" for="pf_casa">Endereço da residência (opcional)</label><input type="text" id="pf_casa" value="${esc((S.perfil.casa || {}).endereco || '')}" placeholder="Rua, nº, bairro, cidade" autocomplete="street-address">
      <div class="row" style="margin-top:6px"><button type="button" class="btn" id="bCasaGps">${ICON.pin}Estou em casa: usar o GPS</button><button type="button" class="btn" id="bCasaBusca">Localizar o endereço</button></div>
      <span class="muted small" id="casaInfo">${casaInfo()}</span></div></div>
    <details><summary class="small" style="cursor:pointer;min-height:40px;display:flex;align-items:center;color:var(--accent);font-weight:600">Mais opções (não obrigatório)</summary>
    <div class="grid2" style="margin-top:6px"><div class="field"><label class="lb" for="pf_fone">Telefone</label><input type="tel" id="pf_fone" data-pf="fone" value="${v('fone')}"></div>
    <div class="field"><label class="lb" for="pf_eq">Equipe / base</label><input type="text" id="pf_eq" data-pf="equipe" value="${v('equipe')}" list="eqCods" placeholder="MEC 1 … MEC 11, FO 1 … FO 5">${eqDatalist()}</div>
    <div class="field full"><label class="lb" for="pf_pref">Prefixo da TAG automática</label><input type="text" id="pf_pref" data-pf="prefixo" value="${esc(S.perfil.prefixo || 'CE-BKB')}" autocapitalize="characters"><span class="muted small">As TAGs saem assim: <b id="tagEx">${esc(tagExemplo())}</b> (prefixo + sigla da ponta A + sigla da ponta B da rota + número do trecho)</span></div></div></details>
    <button class="btn pri block" id="bSalvaPerfil">${ICON.check}Salvar perfil</button></section>
  <section class="card" id="pfEstoque"><div class="row" style="justify-content:space-between"><h2>Meu estoque de material</h2><button type="button" class="lnk" id="bPfMat">Ver tudo</button></div><div id="pfEstBox"><p class="muted small" style="margin:0">Carregando…</p></div></section>
  <section class="card" id="pfEquip" hidden><h2>Meus equipamentos</h2><div id="pfEqBox"></div></section>
  ${aparenciaHtml()}
  <section class="card"><h2>Alertas com o app fechado</h2>
    <p class="muted small" style="margin:0">Recebe atividades novas, expediente não iniciado e fim da refeição mesmo com o celular bloqueado.${/iPhone|iPad/.test(navigator.userAgent) ? ' No iPhone: primeiro toque em Compartilhar > Adicionar à Tela de Início e abra o app por lá.' : ''}</p>
    <div class="gps ${Nuvem.pushOk ? 'ok' : 'Notification' in window && Notification.permission === 'denied' ? 'err' : ''}" style="align-self:flex-start"><span class="dot"></span><span>${Nuvem.pushOk ? 'Alertas ativados neste celular' : 'Notification' in window && Notification.permission === 'denied' ? 'Notificações bloqueadas no navegador' : 'Alertas desativados'}</span></div>
    ${Nuvem.pushOk ? '' : '<button type="button" class="btn pri block" id="bAlertas">Ativar alertas</button>'}</section>
  <section class="card"><h2>Nuvem</h2><div class="nuvemSt">${Nuvem.chip()}</div>
    <p class="muted small" style="margin:0">${Nuvem.ativo() ? `Equipe: <b>${esc(Nuvem.org())}</b>. Perfil, rotas, KMZ, rondas, inspeções, corretivas e fotos são enviados automaticamente quando há internet. Sem internet, ficam na fila e sobem depois.` : 'Quando a nuvem (Supabase) for configurada, perfil, rotas, KMZ, rondas, inspeções, corretivas e fotos passam a ser enviados automaticamente para a nuvem, e o histórico de eventos próximos passa a incluir os registros da equipe toda.'}</p>
    ${Nuvem.on ? '<button class="btn block" id="bSyncAgora">Sincronizar agora</button>' : ''}${Nuvem.on && Nuvem.user ? '<button class="btn block" id="bSairConta">Sair desta conta</button>' : ''}</section>${meusTreinosHtml()}`;
}
function afterPerfil() {
  bindAparencia($('#cardAparencia') || document);
  $('#bPfMat') && ($('#bPfMat').onclick = () => go('materiais'));
  const pfEst = async () => { const box = $('#pfEstBox'); if (!box) return; try { const cat = await matCatLocal(); const movs = await meusMovs(); const me = Nuvem.user && Nuvem.user.id; const meus = movs.filter(m => !me || m.tecnico_uid === me || m._local);
      const blocos = ['claro', ...Object.keys(CONTAS).filter(c => c !== 'claro')].map(c => { const T = saldosMat(meus, c).tec; const sal = T.get(me) || (T.size === 1 ? [...T.values()][0] : new Map()); return { c, l: [...sal.entries()].filter(([, q]) => Math.abs(q) > 1e-9).map(([k, q]) => ({ m: matInfo(cat, k, meus), q })) }; }).filter(b => b.l.length);
      box.innerHTML = blocos.length ? blocos.map(b => `<h3 style="margin:6px 0 2px">${esc(CONTAS[b.c])}${b.c === 'claro' ? ' (corretiva)' : ''}</h3><div class="list">${b.l.slice(0, 8).map(({ m, q }) => `<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:4px 0"><span>${esc(m.descricao)}</span><b style="color:${q < 0 ? 'var(--bad)' : 'inherit'}">${fQ(q)} ${esc(m.unidade || '')}</b></div>`).join('')}${b.l.length > 8 ? `<span class="muted small">+ ${b.l.length - 8} item(ns) em Materiais</span>` : ''}</div>`).join('') : '<p class="muted small" style="margin:0">Você não tem material liberado pelo almoxarifado.</p>'; } catch (e) { box.innerHTML = '<p class="muted small" style="margin:0">Não foi possível ler o estoque agora.</p>'; } };
  pintaMeusEqp().catch(() => {});
  pfEst().then(async () => { if (!Nuvem.on || !Nuvem.user) return; try { const [cat, movs] = await Promise.all([Nuvem.matCatalogo(), Nuvem.movMeus()]); await DB.putRaw('meta', { id: 'matCat', lista: cat }); await DB.putRaw('meta', { id: 'matMovCache', lista: movs }); if (S.view === 'perfil') pfEst(); } catch (e) {} });
  $('#bSyncAgora') && ($('#bSyncAgora').onclick = () => { Nuvem.processar(); toast('Sincronizando…'); });
  $('#bSairConta') && ($('#bSairConta').onclick = async () => { if ((await DB.all('fila')).length && !confirm('Ainda há dados esperando envio. Sair mesmo assim? Eles continuam no celular e vão quando você entrar de novo.')) return; if (!confirm('Sair desta conta neste celular?')) return; Nuvem.sair(); });
  $('#bAlertas') && ($('#bAlertas').onclick = () => ativarAlertas(false));
  bindRegiao($('#pf_clu'), $('#pf_reg'), $('#pf_cla'), (c, r) => { S.perfil.cluster = c || ''; S.perfil.regiao = r || ''; });
  $$('[data-pf]').forEach(el => el.addEventListener('input', () => { S.perfil[el.dataset.pf] = el.value; const ex = $('#tagEx'); if (ex) ex.textContent = tagExemplo(); }));
  $$('[data-serv]').forEach(b => b.onclick = () => { const l = new Set(meusServ()); if (l.has(b.dataset.serv)) { if (l.size === 1) { toast('Deixe pelo menos um serviço.'); return; } l.delete(b.dataset.serv); } else l.add(b.dataset.serv); S.perfil.servicos = Object.keys(SERVICOS).filter(k => l.has(k)); DB.put('meta', S.perfil); $$('[data-serv]').forEach(x => x.setAttribute('aria-checked', l.has(x.dataset.serv))); });
  $('#pfFoto').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { S.perfil.foto = await fotoPerfilDe(f); await DB.put('meta', S.perfil); const y = window.scrollY; render(); window.scrollTo(0, y); toast('Foto de perfil salva.'); } catch (x) { toast('Não foi possível ler a imagem.'); } };
  $('#pfFotoDel') && ($('#pfFotoDel').onclick = async () => { S.perfil.foto = ''; await DB.put('meta', S.perfil); const y = window.scrollY; render(); window.scrollTo(0, y); });
  $('#pf_cargo') && ($('#pf_cargo').onchange = e => { if (S.perfil.funcaoTravada) return; S.perfil.cargo = e.target.value; S.perfil.funcao = cargoBase(e.target.value); DB.put('meta', S.perfil); });
  const casa = () => (S.perfil.casa = S.perfil.casa || { endereco: '', lat: null, lon: null });
  $('#pf_casa').addEventListener('input', e => { casa().endereco = e.target.value; });
  const marcou = (lat, lon, via) => { Object.assign(casa(), { lat: +lat.toFixed(6), lon: +lon.toFixed(6), via, definidoEm: Date.now() }); $('#casaInfo').textContent = casaInfo(); DB.put('meta', S.perfil); toast('Local da residência marcado.'); };
  $('#bCasaGps').onclick = async () => { gpsStart(); toast('Buscando sua localização…'); const l = await posAtual(10000); if (!l) { toast('Sem sinal de GPS. Tente perto de uma janela ou use "Localizar o endereço".', 6000); return; } marcou(l.lat, l.lon, 'gps');
    if (!casa().endereco) { try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${l.lat}&lon=${l.lon}&zoom=18&addressdetails=1`, { headers: { 'Accept-Language': 'pt-BR' } }); const j = await r.json(); const a = j.address || {}; casa().endereco = [[a.road, a.house_number].filter(Boolean).join(', '), a.suburb || a.neighbourhood, a.city || a.town || a.village].filter(Boolean).join(' - '); $('#pf_casa').value = casa().endereco; DB.put('meta', S.perfil); } catch (e) {} } };
  $('#bCasaBusca').onclick = async () => { const q = (casa().endereco || '').trim(); if (!q) { toast('Digite o endereço primeiro.'); $('#pf_casa').focus(); return; } try { const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'pt-BR' } }); const j = await r.json(); if (!j.length) { toast('Endereço não encontrado. Confira ou use o GPS estando em casa.', 6000); return; } marcou(+j[0].lat, +j[0].lon, 'endereco'); } catch (e) { toast('Sem internet para localizar o endereço.'); } };
  $('#bSalvaPerfil').onclick = async () => {
    if (!S.perfil.nome.trim() || !String(S.perfil.matricula || '').trim()) { toast('Preencha nome e matrícula.'); return; }
    S.perfil.nome = S.perfil.nome.trim(); await DB.put('meta', S.perfil); toast('Perfil salvo.'); go('home');
  };
}
function viewRelatorios() {
  const hoje = isoDate(Date.now()); if (!S.perDe) { S.perDe = hoje; S.perAte = hoje; }
  return `${!ADMIN ? '' : `<section class="card"><h2>Relatório e KMZ por período</h2>
    <div class="chips" role="group" aria-label="Período rápido">${[[1, 'Hoje (diário)'], [7, '7 dias (semanal)'], [10, '10 dias'], [15, '15 dias (quinzenal)'], [20, '20 dias'], [30, '30 dias']].map(([n, lb]) => `<button type="button" data-per="${n}">${lb}</button>`).join('')}</div>
    <div class="grid2"><div class="field"><label class="lb" for="perDe">De</label><input type="date" id="perDe" value="${S.perDe}"></div><div class="field"><label class="lb" for="perAte">Até</label><input type="date" id="perAte" value="${S.perAte}"></div></div>
    <div id="perResumo" class="small muted"></div>
    <div class="row"><button class="btn wa" id="bPerWa">${ICON.wa}Enviar relatório no WhatsApp</button><button class="btn" id="bPerPdf">${ICON.pdf}Baixar PDF</button></div>
    <button class="btn block" id="bPerKmz">${ICON.pin}Exportar KMZ do período</button></section>`}
  <section class="card"><div class="field"><label class="lb" for="relBusca">Buscar por TAG, ticket, endereço, referência (ex.: Itajubá), rota ou parceiro</label><input type="text" id="relBusca" value="${esc(S.relBusca || '')}" placeholder="Ex.: CE-BKB-MS-0012"></div>
    <div class="seg" role="group" aria-label="Filtro"><button type="button" data-relf="todos" aria-pressed="${(S.relF || 'todos') === 'todos'}">Todos</button><button type="button" data-relf="proprio" aria-pressed="${S.relF === 'proprio'}">Próprio</button><button type="button" data-relf="parceiro" aria-pressed="${S.relF === 'parceiro'}">Parceiro</button></div></section>
    <section class="card"><h2>Inspeções e corretivas</h2><div class="list" id="relInsp"><p class="muted" style="margin:0">Carregando…</p></div></section>
    <section class="card"><h2>Rondas</h2><div class="list" id="relRondas"></div></section>`;
}
const diaIni = d => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd, 0, 0, 0, 0).getTime(); };
const diaFim = d => diaIni(d) + 86400000 - 1;
function tipoPeriodo(de, ate) { const n = Math.round((diaIni(ate) - diaIni(de)) / 86400000) + 1; return n === 1 ? 'Diário' : n === 7 ? 'Semanal' : n === 15 ? 'Quinzenal' : `${n} dias`; }
async function dadosPeriodo(de, ate) {
  const a = diaIni(de), b = diaFim(ate);
  const rs = (await DB.all('rondas')).filter(r => r.inicio >= a && r.inicio <= b).sort((x, y) => x.inicio - y.inicio);
  const ins = (await DB.all('inspecoes')).filter(i => i.chegada >= a && i.chegada <= b).sort((x, y) => x.chegada - y.chegada);
  ins.forEach(i => S.inspCache.set(i.id, i)); for (const r of rs) await cacheInspRonda(r);
  const dias = new Map(); const dia = ts => { const k = isoDate(ts); if (!dias.has(k)) dias.set(k, { k, prev: 0, corr: 0, cx: 0, at: 0, km: 0, desl: 0, cabo: 0, ms: 0, vmax: null, exc: 0, odo: 0, odoN: 0, div: 0 }); return dias.get(k); };
  const tot = { prev: 0, corr: 0, cx: 0, at: 0, km: 0, desl: 0, cabo: 0, ms: 0, vmax: null, exc: [], desv: [], odo: 0, odoN: 0, div: [] };
  rs.forEach(r => { const { t } = totais(r); const vs = velStats(r); const d = dia(r.inicio);
    if (isCorr(r)) { d.corr++; tot.corr++; } else { d.prev++; tot.prev++; }
    d.km += t.km; d.desl += t.desl + t.ret + t.atual; d.cabo += t.cabo; d.ms += t.dur; d.exc += vs.exc.length; if (vs.vmax != null) d.vmax = Math.max(d.vmax || 0, vs.vmax);
    tot.km += t.km; tot.desl += t.desl + t.ret + t.atual; tot.cabo += t.cabo; tot.ms += t.dur; if (vs.vmax != null) tot.vmax = Math.max(tot.vmax || 0, vs.vmax); vs.exc.forEach(e => tot.exc.push({ ...e, r })); const ad = aderencia(r); if (ad) ad.desvios.forEach(x => tot.desv.push({ ...x, r })); const o = odoInfo(r); if (o) { d.odo += o.odo; d.odoN++; tot.odo += o.odo; tot.odoN++; if (o.diverge) { d.div++; tot.div.push({ r, o }); } } });
  ins.forEach(i => { const d = dia(i.chegada); if (isCorr(i)) { d.at++; tot.at++; } else { d.cx++; tot.cx++; } });
  return { rs, ins, dias: [...dias.values()].sort((x, y) => x.k.localeCompare(y.k)), tot };
}
async function resumoPeriodoUi() {
  const el = $('#perResumo'); if (!el) return; const d = await dadosPeriodo(S.perDe, S.perAte);
  el.innerHTML = `${d.tot.odoN ? `Odômetro ${fKm(d.tot.odo)} x GPS ${fKm(d.tot.km)}${d.tot.div.length ? ` (${d.tot.div.length} divergência(s))` : ''} · ` : ''}${tipoPeriodo(S.perDe, S.perAte)}: ${d.rs.length} atividade(s) · ${d.tot.cx} caixa(s) · ${d.tot.at} atendimento(s) de corretiva · ${fKm(d.tot.km)} · ${d.tot.exc.length} excesso(s) de velocidade · ${d.tot.desv.length} desvio(s) de rota`;
}
async function gerarPdfPeriodo(de, ate) {
  if (!window.jspdf) { toast('Gerador de PDF não carregou. Abra o app com internet uma vez.'); return null; }
  toast('Gerando relatório do período…', 8000);
  try {
    const d = await dadosPeriodo(de, ate); const tp = tipoPeriodo(de, ate); const fBR = x => x.split('-').reverse().join('/');
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const logo = await logoData();
    let y = pdfHeader(doc, logo, `Relatório ${tp === 'Diário' || tp === 'Semanal' || tp === 'Quinzenal' ? tp : 'do Período'} de Atividades`, `${fBR(de)} a ${fBR(ate)} · backbone`, null); let sn = 0;
    y = pdfSec(doc, y, ++sn, 'Resumo');
    y = kv(doc, y, [['Técnico', S.perfil.nome], ['Matrícula', S.perfil.matricula], ['Equipe', S.perfil.equipe], ['Período', `${fBR(de)} a ${fBR(ate)} (${tp.toLowerCase()})`], ['Dias com atividade', String(d.dias.length)], ['Horas em atividade', fDur(d.tot.ms)], ['Rondas preventivas', String(d.tot.prev)], ['Caixas inspecionadas', String(d.tot.cx)], ['Corretivas', String(d.tot.corr)], ['Atendimentos de corretiva', String(d.tot.at)], ['Km total', fKm(d.tot.km)], ['Km deslocamento', fKm(d.tot.desl)], ['Km rota do cabo', fKm(d.tot.cabo)], ['Velocidade máxima', fVel(d.tot.vmax)], ['Excessos de velocidade', `${d.tot.exc.length} (limite ${LIM()} km/h)`], ['Desvios de rota', `${d.tot.desv.length} trecho(s), ${fKm(d.tot.desv.reduce((a, x) => a + x.km, 0))}`], ['Veículo', veicTxt(veicPerfil())], ['Km odômetro x GPS', d.tot.odoN ? `${fKm(d.tot.odo)} x ${fKm(d.tot.km)}${d.tot.div.length ? ` · ${d.tot.div.length} atividade(s) não conferem` : ' · confere'}` : 'Odômetro não informado']]);
    const lines = [], marks = []; d.rs.forEach(r => segmentos(r).forEach(sg => lines.push({ pts: sg.pts, color: SEGCOR[sg.tipo] })));
    d.ins.filter(i => i.loc).forEach(i => marks.push({ lat: i.loc.lat, lon: i.loc.lon, label: isCorr(i) ? 'P' : 'C', color: isCorr(i) ? '#d9480f' : '#0b5f99' }));
    d.tot.exc.forEach(e => marks.push({ lat: e.lat, lon: e.lon, label: '!', color: '#b4231b' }));
    if (lines.length || marks.length) { const img = await mapaImg(lines, marks, 1400, 900); if (img) { y = pdfSec(doc, y, ++sn, 'Mapa do período'); if (y > 160) { doc.addPage(); y = 16; } doc.addImage(img, 'JPEG', 12, y - 2, 186, 119.6); y += 121; doc.setFontSize(7.5); doc.setTextColor(60); doc.setFont('helvetica', 'normal'); doc.text('C = caixa inspecionada · P = ponto de corretiva · ! = excesso de velocidade', 12, y + 1); y += 7; } }
    if (ADMIN && S.atvsAdm) {
      const a0 = diaIni(de), a1 = diaFim(ate); const la = [...S.atvsAdm.values()].filter(a => a.criado >= a0 && a.criado <= a1 && (!S.adm.tec || a.tecnicoUid === S.adm.tec)).sort((p, q) => p.criado - q.criado);
      if (la.length) {
        y = pdfSec(doc, y, ++sn, 'Atividades e reincidências (LOG)');
        const esc4 = la.filter(a => (a.log || 0) >= 4).length; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(esc4 ? 194 : 60, esc4 ? 49 : 60, esc4 ? 29 : 60);
        doc.text(`${la.length} atividade(s) · ${la.filter(atvEmerg).length} emergencial(is) · ${esc4} com LOG 4 ou mais (escalonadas ao gerente)`, 12, y + 1); doc.setTextColor(20); y += 4;
        doc.autoTable({ ...TB, startY: y, head: [['Data', 'Tipo', 'Ticket', 'Técnico', 'Referência / local', 'Status', 'LOG']], body: la.map(a => [fDH(a.criado), atvEmerg(a) ? 'Emergencial' : 'Preventiva', a.ticket || '—', a.tecnicoNome || '—', atvRef(a) || a.endereco || '—', stAtv(a), a.log ? (a.log >= 4 ? `LOG ${a.log} · GERENTE${a.escalonadoEm ? ' ✓' : ''}` : `LOG ${a.log}`) : '—']),
          columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 20 }, 6: { cellWidth: 26, fontStyle: 'bold' } },
          didParseCell: c => { if (c.section !== 'body') return; const a = la[c.row.index]; if ((a.log || 0) >= 4) { if (c.column.index === 6) { c.cell.styles.fillColor = [194, 49, 29]; c.cell.styles.textColor = 255; } else c.cell.styles.fillColor = [251, 232, 228]; } else if ((a.log || 0) > 1 && c.column.index === 6) c.cell.styles.textColor = [199, 90, 0]; } });
        y = doc.lastAutoTable.finalY + 6;
      }
    }
    if (ADMIN) { const LB = biLinhas(); if (LB.length) { const tt = LB.reduce((a, r) => a + r.total, 0); y = pdfSec(doc, y, ++sn, 'Produção LPU'); doc.autoTable({ ...TB, startY: y, head: [['Técnico', 'Atividades', 'Total produzido']], body: [...somaPor(LB, 'tec').map(x => [x.k, x.ativ.size, fBRL(x.total)]), ['Total', '', fBRL(tt)]], columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } } }); y = doc.lastAutoTable.finalY + 7; } }
    y = pdfSec(doc, y, ++sn, 'Dia a dia');
    doc.autoTable({ ...TB, startY: y, head: [['Data', 'Prev.', 'Corr.', 'Caixas', 'Atend.', 'Horas', 'Km GPS', 'Km odôm.', 'Vel. máx.', 'Excessos']], body: d.dias.map(x => [fBR(x.k), x.prev, x.corr, x.cx, x.at, fDur(x.ms), fKm(x.km), x.odoN ? fKm(x.odo) + (x.div ? ' (!)' : '') : '—', fVel(x.vmax), x.exc]),
      foot: [['Total', d.tot.prev, d.tot.corr, d.tot.cx, d.tot.at, fDur(d.tot.ms), fKm(d.tot.km), d.tot.odoN ? fKm(d.tot.odo) : '—', fVel(d.tot.vmax), d.tot.exc.length]], footStyles: { fillColor: [233, 238, 241], textColor: 20, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 9: { halign: 'center' } },
      didParseCell: c => { if (c.section === 'body' && c.column.index === 7 && String(c.cell.raw).includes('(!)')) { c.cell.styles.textColor = [180, 35, 27]; c.cell.styles.fontStyle = 'bold'; } if (c.section === 'body' && c.column.index === 9 && +c.cell.raw > 0) { c.cell.styles.textColor = [180, 35, 27]; c.cell.styles.fontStyle = 'bold'; } } });
    y = doc.lastAutoTable.finalY + 7;
    const corr = d.ins.filter(isCorr);
    if (corr.length) { y = pdfSec(doc, y, ++sn, 'Corretivas'); doc.autoTable({ ...TB, startY: y, head: [['Data', 'Ticket', 'Ocorrência', 'Referência', 'Local', 'No local', 'Situação']], body: corr.map(i => [fDH(i.chegada), i.corr.ticket, i.corr.ocorrencia || '—', refTxt(i) || '—', [i.info.endereco, i.info.bairro].filter(Boolean).join(' - ') || '—', i.saida ? fDur(i.saida - i.chegada) : '—', i.status === 'concluida' ? (i.corr.pendente ? 'Concluída c/ pendência' : 'Concluída') : 'Em aberto']), styles: { ...TB.styles, fontSize: 7.5 } }); y = doc.lastAutoTable.finalY + 7; }
    const cxs = d.ins.filter(i => !isCorr(i));
    if (cxs.length) { y = pdfSec(doc, y, ++sn, 'Caixas inspecionadas'); doc.autoTable({ ...TB, startY: y, head: [['Data', 'TAG', 'Rota', 'Endereço', 'Backbone', 'N/C', 'Fusões']], body: cxs.map(i => [fDH(i.chegada), i.info.tag || '—', i.info.rota || '—', [i.info.endereco, i.info.bairro].filter(Boolean).join(' - ') || '—', donoLb(i.info.dono, i.info.parceiro) || '—', String(Object.values(i.check).filter(v => v === 'NC').length), i.fo.modo === 'cor' ? 'Cor com cor' : i.fo.modo === 'exc' ? `C/ ${(i.fo.exc || []).length} exceção(ões)` : i.fo.modo === 'nenhuma' ? 'Sem fusão' : 'Detalhado']), styles: { ...TB.styles, fontSize: 7.5 }, didParseCell: c => { if (c.section === 'body' && c.column.index === 5 && +c.cell.raw > 0) { c.cell.styles.textColor = [180, 35, 27]; c.cell.styles.fontStyle = 'bold'; } } }); y = doc.lastAutoTable.finalY + 7; }
    if (d.tot.div.length) { y = pdfSec(doc, y, ++sn, 'Odômetro x GPS (divergências)'); doc.autoTable({ ...TB, startY: y, head: [['Data', 'Atividade', 'Odôm. inicial', 'Odôm. final', 'Km odômetro', 'Km GPS', 'Diferença']], body: d.tot.div.map(({ r, o }) => [fDH(r.inicio), isCorr(r) ? 'Corretiva ' + r.ticket : 'Preventiva', fOdo(o.a), fOdo(o.b), fKm(o.odo), fKm(o.gps), `${o.dif >= 0 ? '+' : ''}${fKm(o.dif)}${o.pct != null ? ` (${Math.round(o.pct)}%)` : ''}`]), didParseCell: c => { if (c.section === 'body' && c.column.index === 6) { c.cell.styles.textColor = [180, 35, 27]; c.cell.styles.fontStyle = 'bold'; } } }); y = doc.lastAutoTable.finalY + 7; }
    y = pdfSec(doc, y, ++sn, 'Aderência às rotas (trajeto x traçado)');
    if (d.tot.desv.length) { doc.autoTable({ ...TB, startY: y, head: [['Data', 'Início', 'Fim', 'Rota', 'Extensão fora', 'Trecho']], body: d.tot.desv.map(x => [fData(x.ini), fHora(x.ini), fHora(x.fim), (rotaById(x.r.rotaId) || {}).codigo || '—', fKm(x.km), `${x.de} > ${x.para}`]), didParseCell: c => { if (c.section === 'body' && c.column.index === 4) { c.cell.styles.textColor = [180, 35, 27]; c.cell.styles.fontStyle = 'bold'; } } }); y = doc.lastAutoTable.finalY + 7; }
    else { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(31, 122, 58); doc.text(d.rs.some(r => aderencia(r)) ? 'Nenhum trajeto incompatível com as rotas no período.' : 'Sem rotas com traçado importado nas rondas do período.', 12, y + 1); y += 8; doc.setTextColor(20); }
    y = pdfSec(doc, y, ++sn, `Radar de velocidade (limite ${LIM()} km/h)`);
    if (d.tot.exc.length) { doc.autoTable({ ...TB, startY: y, head: [['Data', 'Início', 'Fim', 'Vel. máxima', 'Atividade', 'Local']], body: d.tot.exc.map(e => [fData(e.ini), fHoraS(e.ini), fHoraS(e.fim), fVel(e.vmax), isCorr(e.r) ? 'Corretiva ' + e.r.ticket : 'Preventiva', `${e.lat.toFixed(5)}, ${e.lon.toFixed(5)}`]), didParseCell: c => { if (c.section === 'body' && c.column.index === 3) { c.cell.styles.textColor = [180, 35, 27]; c.cell.styles.fontStyle = 'bold'; } } }); y = doc.lastAutoTable.finalY + 7; }
    else { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(31, 122, 58); doc.text('Nenhum excesso de velocidade no período.', 12, y + 1); y += 8; doc.setTextColor(20); }
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setDrawColor(20); doc.setLineWidth(0.4); doc.line(12, y + 18, 92, y + 18); doc.line(118, y + 18, 198, y + 18); doc.setFontSize(7.5); doc.setTextColor(20); doc.setFont('helvetica', 'bold'); doc.text('TÉCNICO — ' + String(S.perfil.nome || '').toUpperCase(), 12, y + 22); doc.text('SUPERVISOR', 118, y + 22);
    pdfFooter(doc, `Multivale Engenharia · Ronda Preventiva Backbone · gerado em ${fDH(Date.now())}`);
    return new File([doc.output('blob')], nomeArq(`Relatorio_${tp}_${de}_a_${ate}_${S.perfil.nome}`), { type: 'application/pdf' });
  } catch (e) { console.error(e); toast('Erro ao gerar o PDF: ' + e.message, 6000); return null; }
}
async function kmzPeriodo(de, ate) {
  try {
    toast('Gerando KMZ do período…'); const d = await dadosPeriodo(de, ate); const files = []; let corpo = '';
    for (const r of d.rs) corpo += await kmlRondaFolder(r, files, false);
    let av = ''; for (const i of d.ins.filter(i => !i.rondaId)) av += await kmlCaixa(i, files, false); if (av) corpo += `<Folder><name>Inspeções avulsas</name>${av}</Folder>`;
    const rtIds = [...new Set(d.rs.map(r => r.rotaId).filter(Boolean))]; rtIds.forEach(id => { const rt = rotaById(id); if (rt && rt.kml) corpo += `<Folder><name>Traçado cadastrado · ${xe(rt.codigo)}</name>${rt.kml.linhas.map(l => `<Placemark><styleUrl>#tracado</styleUrl><LineString><tessellate>1</tessellate><coordinates>${l.map(([la, lo]) => `${lo},${la},0`).join(' ')}</coordinates></LineString></Placemark>`).join('')}</Folder>`; });
    if (!corpo) { toast('Nenhuma atividade nesse período.'); return null; }
    return montaKmz(`Atividades_${de}_a_${ate}_${S.perfil.nome}`, corpo, files);
  } catch (e) { console.error(e); toast('Erro ao gerar KMZ: ' + e.message, 6000); return null; }
}
async function afterRelatorios() {
  if ($('#perDe')) {
  $$('[data-per]').forEach(b => b.onclick = () => { const n = +b.dataset.per; S.perAte = isoDate(Date.now()); S.perDe = isoDate(Date.now() - (n - 1) * 86400000); $('#perDe').value = S.perDe; $('#perAte').value = S.perAte; resumoPeriodoUi(); });
  $('#perDe').onchange = e => { S.perDe = e.target.value; if (S.perAte < S.perDe) { S.perAte = S.perDe; $('#perAte').value = S.perAte; } resumoPeriodoUi(); };
  $('#perAte').onchange = e => { S.perAte = e.target.value; if (S.perAte < S.perDe) { S.perDe = S.perAte; $('#perDe').value = S.perDe; } resumoPeriodoUi(); };
  $('#bPerPdf').onclick = async () => { const f = await gerarPdfPeriodo(S.perDe, S.perAte); if (f) baixar(f); };
  $('#bPerWa').onclick = async () => { const f = await gerarPdfPeriodo(S.perDe, S.perAte); if (f) compartilhar([f], `Relatório ${tipoPeriodo(S.perDe, S.perAte).toLowerCase()} — ${S.perfil.nome}\n${S.perDe.split('-').reverse().join('/')} a ${S.perAte.split('-').reverse().join('/')}`); };
  $('#bPerKmz').onclick = async () => { const f = await kmzPeriodo(S.perDe, S.perAte); if (f) exportar(f); };
  resumoPeriodoUi();
  }
  const ins = (await DB.all('inspecoes')).sort((a, b) => b.criado - a.criado); ins.forEach(i => S.inspCache.set(i.id, i));
  const rs = (await DB.all('rondas')).sort((a, b) => b.inicio - a.inicio);
  const pinta = () => {
    const q = (S.relBusca || '').toLowerCase(), f = S.relF || 'todos';
    const okD = d => f === 'todos' || d === f;
    const li = ins.filter(i => okD(i.info.dono) && (!q || [i.info.tag, i.info.endereco, i.info.bairro, i.info.rota, i.info.parceiro, refTxt(i), i.corr ? i.corr.ticket + ' ' + i.corr.ocorrencia : ''].join(' ').toLowerCase().includes(q)));
    $('#relInsp').innerHTML = li.length ? li.map(i => itemInsp(i, fData(i.chegada).slice(0, 5))).join('') : '<p class="muted" style="margin:0">Nenhuma inspeção encontrada.</p>';
    const lr = rs.filter(r => okD(r.dono) && (!q || [r.tecnico, r.parceiro, r.rotaId && rotaById(r.rotaId) ? rotaLb(rotaById(r.rotaId)) : ''].join(' ').toLowerCase().includes(q)));
    $('#relRondas').innerHTML = lr.length ? lr.map(r => { const n = r.eventos.filter(e => e.tipo === 'chegada').length; return `<button class="item" data-ronda="${r.id}"><span class="badge">${n}</span><span class="tx"><b>Ronda ${fData(r.inicio)}${r.dono ? ' · ' + esc(donoLb(r.dono, r.parceiro)) : ''}</b><span>${fHora(r.inicio)}–${r.fim ? fHora(r.fim) : 'agora'} · ${fKm(pathKm(r.pontos))} · ${n} caixa${n === 1 ? '' : 's'}</span></span>${r.fim ? '<span class="pill ok">Encerrada</span>' : '<span class="pill draft">Em andamento</span>'}</button>`; }).join('') : '<p class="muted" style="margin:0">Nenhuma ronda encontrada.</p>';
    bindOpen($('#relInsp'));
    $$('[data-ronda]', $('#relRondas')).forEach(b => b.onclick = async () => { S.rondaView = await DB.get('rondas', b.dataset.ronda); await cacheInspRonda(S.rondaView); go('ronda'); });
  };
  $('#relBusca').addEventListener('input', e => { S.relBusca = e.target.value; pinta(); });
  $$('[data-relf]').forEach(b => b.onclick = () => { S.relF = b.dataset.relf; $$('[data-relf]').forEach(x => x.setAttribute('aria-pressed', x === b)); pinta(); });
  pinta();
}

