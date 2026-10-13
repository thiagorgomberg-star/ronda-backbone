// Técnico Plus - Multivale · nuvem (Supabase)
// Os arquivos app-*.js carregam em ordem (ver index.html) e compartilham o mesmo escopo global.
'use strict';
/* ============================ nuvem (Supabase) ============================ */
function carregaScript(src) { return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = src; sc.onload = res; sc.onerror = () => rej(new Error('Falha ao carregar ' + src)); document.head.appendChild(sc); }); }
const limpaJson = v => JSON.parse(JSON.stringify(v, (k, x) => (x instanceof Blob || typeof x === 'function') ? undefined : x));
const SEM_META = ['_uid', '_tecnico', '_matricula', '_equipe', '_sync'];
const tiraMeta = d => { const o = { ...d }; SEM_META.forEach(k => delete o[k]); return o; };
const Nuvem = {
  on: false, user: null, sb: null, status: 'off', msg: 'Nuvem desativada: o Supabase ainda não foi configurado.', pend: 0, busy: false, canais: [],
  COLS: { rondas: 'rondas', inspecoes: 'eventos', rotas: 'rotas', fotos: 'fotos_rede' },
  BUCKET: 'fotos',
  org() { return String(window.NUVEM_ORG || 'multivale').replace(/[^\w-]/g, '_'); },
  ativo() { return !!(window.SUPABASE_URL && window.SUPABASE_KEY && /^https:\/\//.test(window.SUPABASE_URL)); },
  async sdk() {
    if (this.sb) return this.sb;
    if (!window.supabase || !window.supabase.createClient) await carregaScript('supabase.min.js');
    this.sb = window.supabase.createClient(window.SUPABASE_URL.replace(/\/+$/, ''), window.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: NOC ? 'rb-noc' : ADMIN ? 'rb-supervisor' : 'rb-tecnico' } }); try { if (ADMIN && this.sb.auth.onAuthStateChange) this.sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') setTimeout(trocaSenhaRecuperacao, 300); }); } catch (e) {}
    return this.sb;
  },
  // banco sem a coluna apoio_uids (supabase.sql antigo): grava sem os apoios em vez de travar
  async atvW(fn) { let r = await fn(); if (r && r.error && /apoio_uids/.test(r.error.message || '') && !this.semApoio) { this.semApoio = true; console.warn('Coluna apoio_uids ausente: rode o supabase.sql de novo.'); r = await fn(); } return r; },
  ok(r) { if (r && r.error) throw new Error(r.error.message || String(r.error)); return r ? r.data : null; },
  tab(n) { return this.sb.from(n); },
  async todos(fn) { const out = []; for (let i = 0; ; i += 1000) { const d = this.ok(await fn().range(i, i + 999)); out.push(...(d || [])); if (!d || d.length < 1000) break; } return out; },
  async euAdmin(uid) { let r = await this.tab('admins').select('nome, org, papel, clusters, foto').eq('uid', uid).eq('org', this.org()).maybeSingle(); if (r && r.error) r = await this.tab('admins').select('nome, org, papel, clusters').eq('uid', uid).eq('org', this.org()).maybeSingle(); if (r && r.error) r = await this.tab('admins').select('nome, org, papel').eq('uid', uid).eq('org', this.org()).maybeSingle(); if (r && r.error) r = await this.tab('admins').select('nome, org').eq('uid', uid).eq('org', this.org()).maybeSingle(); let d = this.ok(r); if (d && !d.papel) d.papel = 'supervisor'; if (!d && NOC) { try { const x = this.ok(await this.tab('noc').select('nome, org').eq('uid', uid).eq('org', this.org()).maybeSingle()); if (x) d = { ...x, papel: 'noc' }; } catch (e) {} } if (!d && ACION) { try { const x = this.ok(await this.tab('despachantes').select('nome, org').eq('uid', uid).eq('org', this.org()).maybeSingle()); if (x) d = { ...x, papel: 'despacho' }; } catch (e) {} } return d; },
  async medTodas() {
    const m = new Map(); const A = S.adm || {};
    try { const c0 = cicloDe(diaIni(A.de || isoDate(Date.now())) + 43200000)[0], c1 = cicloDe(diaIni(A.ate || isoDate(Date.now())) + 43200000)[0];
      (await this.todos(() => this.tab('os_medidas').select('id, uid, valor, itens, lote, enviado_em, medido_em, medido_por, validado_por, ciclo').eq('org', this.org()).gte('ciclo', c0).lte('ciclo', c1))).forEach(r => m.set(r.id, { ...r, status: 'medida', _arq: true }));
    } catch (e) { console.warn('os_medidas', e.message); }
    (await this.todos(() => this.tab('medicoes').select('*').eq('org', this.org()))).forEach(r => m.set(r.id, r)); return m;
  },
  async histLista() { return this.ok(await this.tab('acionamentos_historico').select('mes, qtd, gerado_em, exportado_em, exportado_por').eq('org', this.org()).order('mes', { ascending: false })) || []; },
  async histMes(mes) { const d = this.ok(await this.tab('acionamentos_historico').select('dados').eq('org', this.org()).eq('mes', mes).maybeSingle()); return (d && d.dados) || []; },
  async histMarcar(mes, por) { this.ok(await this.tab('acionamentos_historico').update({ exportado_em: new Date().toISOString(), exportado_por: por }).eq('org', this.org()).eq('mes', mes)); },
  async osmCiclo(ciclo) { return await this.todos(() => this.tab('os_medidas').select('*').eq('org', this.org()).eq('ciclo', ciclo).order('data_os')); },
  async medGravar(row) { return this.ok(await this.tab('medicoes').upsert({ org: this.org(), atualizado: Date.now(), ...row }).select().maybeSingle()); },
  async medApagar(id) { this.ok(await this.tab('medicoes').delete().eq('id', id)); },
  async medMinhas() { if (!this.user) return new Map(); const m = new Map(); try { (this.ok(await this.tab('os_medidas').select('id, lote, medido_em, enviado_em').eq('uid', this.user.id)) || []).forEach(r => m.set(r.id, { ...r, status: 'medida' })); } catch (e) {} (this.ok(await this.tab('medicoes').select('id, status, lote, medido_em, enviado_em').eq('uid', this.user.id)) || []).forEach(r => m.set(r.id, r)); return m; },
  ouvirMed(cb) { return this.canal('med', 'medicoes', (tipo, row) => cb(tipo, row), null, 'org=eq.' + this.org()); },
  async telegram(corpo) { const r = await this.sb.functions.invoke('telegram', { body: corpo }); if (r.error) { let m = r.error.message || String(r.error); try { const j = r.error.context && await r.error.context.json(); if (j && j.erro) m = j.erro; } catch (e) {} throw new Error(m); } if (r.data && r.data.erro) throw new Error(r.data.erro); return r.data; },
  async loginAdmin(email, senha) {
    await this.sdk();
    const r = await this.sb.auth.signInWithPassword({ email, password: senha });
    if (r.error) { const e = new Error(r.error.message); e.code = /invalid/i.test(r.error.message) ? 'auth/invalid-credential' : r.error.code; throw e; }
    this.user = r.data.user;
    const ad = await this.euAdmin(this.user.id);
    if (!ad) { await this.sb.auth.signOut(); this.user = null; throw new Error(ACION ? 'Este usuário não tem acesso aos acionamentos.' : NOC ? 'Este usuário não está cadastrado no NOC.' : 'Este usuário não está cadastrado como supervisor.'); }
    this.on = true; this.admin = ad; this.set('ok', 'Supervisor conectado'); return ad;
  },
  async sessaoAdmin() {
    if (!this.ativo()) return null; await this.sdk();
    const { data } = await this.sb.auth.getSession(); const u = data && data.session && data.session.user;
    if (!u || u.is_anonymous) return null; this.user = u;
    const ad = await this.euAdmin(u.id); if (!ad) return null; this.on = true; this.admin = ad; return ad;
  },
  async sairAdmin() { try { await this.sb.auth.signOut(); } catch (e) {} this.on = false; this.user = null; },
  async carregarAdmin(de, ate, tec) {
    const a = diaIni(de), b = diaFim(ate); const M = DB.mem; ['rondas', 'inspecoes', 'rotas', 'fotos'].forEach(k => M[k].clear()); S.inspCache.clear();
    const org = this.org();
    const [tecs, rotas, rondas, evs] = await Promise.all([
      this.todos(() => this.tab('tecnicos').select('uid, dados').eq('org', org)),
      this.todos(() => this.tab('rotas').select('dados').eq('org', org)),
      this.todos(() => { let q = this.tab('rondas').select('dados').eq('org', org).gte('inicio', a).lte('inicio', b); if (tec) q = q.eq('uid', tec); return q.order('inicio'); }),
      this.todos(() => { let q = this.tab('eventos').select('dados').eq('org', org).gte('chegada', a).lte('chegada', b); if (tec) q = q.eq('uid', tec); return q.order('chegada'); })]);
    S.adm.tecnicos = tecs.map(t => ({ uid: t.uid, nome: (t.dados || {}).nome || (t.dados || {})._tecnico || '(sem nome)', matricula: (t.dados || {}).matricula || '', equipe: (t.dados || {}).equipe || '', funcao: (t.dados || {}).funcao || 'tecnico', cargo: (t.dados || {}).cargo || '', foto: (t.dados || {}).foto || '', fone: (t.dados || {}).fone || '', placa: (t.dados || {}).placa || (t.dados || {}).veiculoTxt || '', regiao: (t.dados || {}).regiao || '', cluster: (t.dados || {}).cluster || '', classe: (t.dados || {}).classe || '' })).sort((x, y) => x.nome.localeCompare(y.nome));
    rotas.forEach(r => { const rt = { ...r.dados }; if (!rt.kml) delete rt.kml; M.rotas.set(rt.id, rt); });
    rondas.forEach(r => { const v = { ...r.dados }; v.pontos = v.pontos || []; M.rondas.set(v.id, v); });
    const idsR = new Set(M.rondas.keys());
    try { (await this.todos(() => this.tab('fotos_rede').select('dados').eq('org', org))).forEach(r => { const f = r.dados; if (f && idsR.has(f.rondaId)) M.fotos.set(f.id, f); }); } catch (e) { console.warn(e); }
    evs.forEach(r => { const v = { ...r.dados }; v.fotos = v.fotos || []; v.check = v.check || {}; v.checkObs = v.checkObs || {}; M.inspecoes.set(v.id, v); S.inspCache.set(v.id, v); });
    await carregaRotas();
    try { S.atvsAdm = await this.atvAdmin(a); } catch (e) { console.warn(e); S.atvsAdm = new Map(); }
    try { S.exps = await this.expAdmin(a, b); } catch (e) { console.warn(e); S.exps = []; }
    S.cfg = await this.cfgLer(); S.metas = await this.metasLer();
    return { rondas: M.rondas.size, eventos: M.inspecoes.size };
  },
  async init() {
    if (ADMIN) return;
    if (!this.ativo()) { this.set('off', this.msg); return; }
    if (this.on || this.conectando) return; this.conectando = true;
    try {
      this.set('con', 'Conectando à nuvem…');
      await this.sdk();
      let { data } = await this.sb.auth.getSession(); let u = data && data.session && data.session.user;
      if (!u || u.is_anonymous) { this.conectando = false; this.precisaLogin = true; S.precisaLogin = true; this.set('err', 'Entre com sua matrícula e senha'); if (S.view !== 'entrar') go('entrar'); return; }
      this.precisaLogin = false; S.precisaLogin = false;
      this.user = u; this.on = true; this.set('ok', 'Conectado à nuvem'); this.aoVivo(true); setInterval(() => { if ((S.ronda && !S.ronda.fim) || S.exp) this.aoVivo(); }, 60000);
      await this.restauraPerfil(); await this.aplicaCadastro(); this.ouvir(); this.processar(); this.iniciaAtv();
      setInterval(() => this.processar(), 60000); window.addEventListener('online', () => this.processar()); this.conectando = false;
    } catch (e) { this.conectando = false; console.error(e); this.set('err', 'Não foi possível conectar à nuvem: ' + (/fetch|network/i.test(e.message || '') ? 'sem internet no momento. Tenta de novo sozinho.' : (e.message || e))); if (!this.retry) { this.retry = true; window.addEventListener('online', () => { if (!this.on) this.init(); }); setInterval(() => { if (!this.on && navigator.onLine) this.init(); }, 120000); } }
  },
  set(st, msg) { this.status = st; this.msg = msg; $$('.nuvemSt').forEach(el => el.innerHTML = this.chip()); const d = $('#syncDot'); if (d) { d.hidden = st === 'off'; d.className = 'syncdot ' + (st === 'ok' ? 'ok' : st === 'err' ? 'err' : 'pend'); d.setAttribute('aria-label', 'Nuvem: ' + msg); d.title = msg; } },
  chip() { const c = { ok: 'ok', con: 'weak', err: 'err', off: '' }[this.status] || ''; return `<span class="gps ${c}" style="align-self:auto"><span class="dot"></span><span>${esc(this.msg)}${this.on && this.pend ? ` · ${this.pend} pendente(s)` : this.on ? ' · tudo sincronizado' : ''}</span></span>`; },
  async marcar(store, id, v) {
    if (ADMIN && store !== 'rotas') return;
    if (!(store in this.COLS) && !(store === 'meta' && id === 'perfil')) return;
    if (store === 'meta' && id !== 'perfil') return;
    await DB.putRaw('fila', { id: store + ':' + id, store, docId: id, ts: Date.now(), del: !v });
    this.pend = (await DB.all('fila')).length; this.set(this.status, this.msg);
    clearTimeout(this.t); this.t = setTimeout(() => this.processar(), 4000);
  },
  async processar() {
    if (!this.on || this.busy || !navigator.onLine) return; this.busy = true;
    try {
      const fila = (await DB.all('fila')).sort((a, b) => a.ts - b.ts); this.pend = fila.length; this.set('ok', fila.length ? 'Sincronizando…' : 'Conectado à nuvem');
      let pulados = 0;
      for (const f of fila) {
        if (S.ronda && f.store === 'rondas' && f.docId === S.ronda.id && Date.now() - f.ts < 30000 && !S.ronda.fim) { pulados++; continue; }
        const v = f.del ? null : (f.store === 'atv' || f.store === 'exp' || f.store === 'apo' || f.store === 'abast' || f.store === 'mov' ? await DB.get('meta', f.docId) : await DB.get(f.store, f.docId));
        if (v) await this.enviar(f.store, v); else await this.apagar(f.store, f.docId);
        const atual = await DB.get('fila', f.id); if (atual && atual.ts === f.ts) await DB.delRaw('fila', f.id);
        this.pend = Math.max(0, this.pend - 1); this.set('ok', 'Sincronizando…');
      }
      this.pend = (await DB.all('fila')).length; this.set('ok', 'Conectado à nuvem');
      if (this.pend > pulados) { clearTimeout(this.t); this.t = setTimeout(() => this.processar(), 2000); }
    } catch (e) { console.error(e); this.set('err', 'Erro ao sincronizar (tenta de novo sozinho): ' + (e.message || e)); }
    finally { this.busy = false; }
  },
  base() { return { _uid: this.user.id, _tecnico: S.perfil.nome || '', _matricula: S.perfil.matricula || '', _equipe: S.perfil.equipe || '', _sync: new Date().toISOString() }; },
  async reduz(blob) {
    try { const bmp = await createImageBitmap(blob); const max = 1280, sc = Math.min(1, max / Math.max(bmp.width, bmp.height)); if (sc === 1 && blob.size < 250000) return blob;
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const b = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.7)); return b && b.size < blob.size ? b : blob; } catch (e) { return blob; }
  },
  async subir(path, blob) { blob = await this.reduz(blob); const r = await this.sb.storage.from(this.BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true }); if (r.error && !/exist/i.test(r.error.message || '')) throw new Error('Foto: ' + r.error.message); return path; },
  async gravar(tabela, linha) { this.ok(await this.tab(tabela).upsert({ org: this.org(), uid: this.user.id, ...linha })); },
  enfileira(store, docId) { DB.putRaw('fila', { id: store + ':' + docId, store, docId, ts: Date.now(), del: false }).then(async () => { this.pend = (await DB.all('fila')).length; this.set(this.status, this.msg); clearTimeout(this.t); this.t = setTimeout(() => this.processar(), 1500); }); },
  atvDe(row) { return { ...(row.dados || {}), id: row.id, criado: +row.criado, origem: row.origem, tipo: row.tipo, status: row.status, tecnicoUid: row.tecnico_uid, tecnicoNome: row.tecnico_nome, ticket: row.ticket || '', rotaId: row.rota_id || '', endereco: row.endereco || '', lat: row.lat, lon: row.lon, log: row.log, escalonar: !!row.escalonar, escalonadoEm: row.escalonado_em, atualizado: +row.atualizado || 0, apoioUids: row.apoio_uids || [], apoioSt: row.apoio_st || {} }; },
  atvRow(a) { if (!a.clusterManual) { const r = regiaoDeTexto(a.cidade, a.geo && a.geo.formatado, a.endereco); if (r) { a.cluster = r.cluster; a.mini = r.mini || ''; } } const d = limpaJson(a); ['log', 'escalonar', '_atv', '_apoio', 'statusPrincipal', 'apoioUids', 'apoioSt'].forEach(k => delete d[k]); return { ...(Array.isArray(a.apoioUids) && !a._apoio && !this.semApoio ? { apoio_uids: a.apoioUids } : {}), id: a.id, org: this.org(), criado: a.criado, origem: a.origem || 'supervisor', tipo: a.tipo, status: a.status || 'pendente', tecnico_uid: a.tecnicoUid || null, tecnico_nome: a.tecnicoNome || null, ticket: a.ticket || null, rota_id: a.rotaId || null, endereco: a.endereco || null, lat: a.lat ?? null, lon: a.lon ?? null, escalonado_em: a.escalonadoEm || null, atualizado: a.atualizado || Date.now(), dados: d }; },
  async atvCriar(a) { return this.atvDe(this.ok(await this.atvW(() => this.tab('atividades').insert(this.atvRow(a)).select().single()))); },
  async atvSalvar(a) { const r = this.ok(await this.atvW(() => this.tab('atividades').update(this.atvRow(a)).eq('id', a.id).select())); return r && r[0] ? this.atvDe(r[0]) : null; },
  async atvMinhas() { let q = await this.tab('atividades').select('*').or(`tecnico_uid.eq.${this.user.id},apoio_uids.cs.{${this.user.id}}`).not('status', 'in', '(concluida,cancelada)').order('criado'); if (q && q.error) q = await this.tab('atividades').select('*').eq('tecnico_uid', this.user.id).not('status', 'in', '(concluida,cancelada)').order('criado'); return (this.ok(q) || []).map(r => this.atvDe(r)); },
  async apoioStatus(id, st) { this.ok(await this.sb.rpc('apoio_status', { p_id: id, p_status: st })); },
  async atvAdmin(de) { const m = new Map(); const add = l => l.forEach(r => m.set(r.id, this.atvDe(r))); add(await this.todos(() => this.tab('atividades').select('*').eq('org', this.org()).not('status', 'in', '(concluida,cancelada)').order('criado'))); add(await this.todos(() => this.tab('atividades').select('*').eq('org', this.org()).gte('criado', de).order('criado'))); return m; },
  ouvirAtv(cb) { const filtro = 'org=eq.' + this.org(); /* o banco só entrega ao técnico as dele e as de apoio */ return this.canal('atv', 'atividades', (tipo, row) => cb(tipo, tipo === 'DELETE' ? { id: row && row.id, status: 'cancelada' } : this.atvDe(row)), null, filtro); },
  async expAdmin(a, b) { return (await this.todos(() => this.tab('expedientes').select('*').eq('org', this.org()).gte('inicio', a - 86400000).lte('inicio', b))).map(r => ({ ...(r.dados || {}), id: r.id, uid: r.uid, inicio: +r.inicio, fim: r.fim ? +r.fim : null })); },
  async metasLer() { try { const d = this.ok(await this.tab('metas').select('dados').eq('org', this.org()).maybeSingle()); return (d && d.dados) || {}; } catch (e) { return {}; } },
  async bonusLista(de, ate) { return this.ok(await this.tab('bonus').select('*').eq('org', this.org()).eq('ciclo_de', de).eq('ciclo_ate', ate)) || []; },
  async bonusJanela(de, ate) { return this.ok(await this.tab('bonus').select('*').eq('org', this.org()).gte('ciclo_ate', de).lte('ciclo_ate', ate)) || []; },
  async bonusSalvar(b) { this.ok(await this.tab('bonus').upsert(b)); },
  async evProjeto(id, pid) { const r = this.ok(await this.tab('eventos').select('dados').eq('id', id).maybeSingle()); if (!r || !r.dados) throw new Error('O.S. não encontrada (atualize o painel).'); const pj = projById(pid); const d = { ...r.dados, projeto: pid || null, projetoNome: pj ? pj.nome : '', projetoPor: (this.admin || {}).nome || 'Supervisor', projetoEm: Date.now() }; if (pj && pj.faturamento && !d.centro) d.centro = pj.faturamento; this.ok(await this.tab('eventos').update({ dados: d }).eq('id', id)); return d; },
  async sitesConj(dias) { return (this.ok(await this.tab('eventos').select('dados').eq('org', this.org()).ilike('dados->>tipo', 'site').gte('chegada', Date.now() - (dias || 120) * 86400000).order('chegada', { ascending: false }).limit(500)) || []).map(r => r.dados).filter(Boolean); },
  // curva do OTDR (TX ou RX) anexada pelo supervisor: arquivo vai para o Storage e a referência fica no evento
  async evCurva(id, lado, file) {
    const r = this.ok(await this.tab('eventos').select('dados').eq('id', id).maybeSingle()); if (!r || !r.dados) throw new Error('Conjunta não encontrada (atualize o painel).');
    const nome = String(file.name || 'curva').replace(/[^\w.\- ]+/g, '_').slice(0, 80); const ext = (nome.match(/\.([a-z0-9]{1,5})$/i) || [, ''])[1].toLowerCase();
    const mime = /^image\/(jpeg|png|webp)$/.test(file.type) ? file.type : ext === 'pdf' || file.type === 'application/pdf' ? 'application/pdf' : 'application/octet-stream';
    const path = `${this.org()}/curvas/${id}/${lado}_${Date.now()}${ext ? '.' + ext : ''}`;
    const up = await this.sb.storage.from(this.BUCKET).upload(path, file, { contentType: mime, upsert: true }); if (up.error) throw new Error(/mime|type/i.test(up.error.message || '') ? 'O servidor ainda não aceita esse tipo de arquivo. Rode o supabase-v61.sql ou envie a curva como imagem (PNG/JPG).' : up.error.message);
    const d = { ...r.dados }; d.site = { ...(d.site || {}) }; d.site.curvas = { ...(d.site.curvas || {}), [lado]: { path, nome, mime, por: (this.admin || {}).nome || 'Supervisor', em: Date.now() } };
    if (d.site.curvas.tx && d.site.curvas.rx) d.site.curvasOk = Date.now();
    this.ok(await this.tab('eventos').update({ dados: d }).eq('id', id)); return d; },
  async evCentro(id, centro) { const r = this.ok(await this.tab('eventos').select('dados').eq('id', id).maybeSingle()); if (!r || !r.dados) throw new Error('O.S. não encontrada (atualize o painel).'); const d = { ...r.dados, centro, centroPor: (this.admin || {}).nome || 'Supervisor', centroEm: Date.now() }; this.ok(await this.tab('eventos').update({ dados: d }).eq('id', id)); return d; },
  async parceirosLista() { return this.ok(await this.tab('parceiros').select('*').eq('org', this.org()).order('nome')) || []; },
  async parceiroAtivo(uid, ativo) { this.ok(await this.tab('parceiros').update({ ativo }).eq('uid', uid)); },
  // função "acesso" (contas, senhas e portal do parceiro)
  async acesso(acao, body = {}) { const r = await this.sb.functions.invoke('acesso', { body: { acao, ...body } }); let d = r.data; if (r.error) { try { d = await r.error.context.json(); } catch (e) {} if (!d || !d.motivo) throw new Error('Função "acesso" indisponível: crie a função no Supabase (veja SUPABASE.md).'); } if (!d || !d.ok) throw new Error((d && d.motivo) || 'Falhou.'); return d; },
  async metasSalvar(d) { this.ok(await this.tab('metas').upsert({ org: this.org(), dados: d })); },
  async cfgLer() { try { const d = this.ok(await this.tab('config').select('dados').eq('org', this.org()).maybeSingle()); return (d && d.dados) || {}; } catch (e) { return {}; } },
  async cfgSalvar(d) { this.ok(await this.tab('config').upsert({ org: this.org(), dados: d })); },
  async enviar(store, v) {
    const org = this.org();
    if (store === 'exp') { const e = { ...v, id: v.id.slice(4) }; this.ok(await this.tab('expedientes').upsert({ id: e.id, org, uid: this.user.id, inicio: e.inicio, fim: e.fim || null, dados: limpaJson(e) })); return; }
    if (store === 'apo') { await this.apoioStatus(v.id.slice(4), v.status === 'recebida' && v.vistaEm ? 'vista' : v.status); return; }
    if (store === 'mov') { const d = { ...v, id: v.id.slice(4) }; delete d._mov; delete d._local; this.ok(await this.tab('mat_mov').upsert(limpaJson(d))); return; }
    if (store === 'abast') { const d = { ...v, id: v.id.slice(6) }; delete d._abast; this.ok(await this.tab('abastecimentos').upsert({ id: d.id, org, uid: this.user.id, ts: d.ts, dados: limpaJson(d) })); return; }
    if (store === 'atv') {
      const a = { ...v, id: v.id.slice(4) }; delete a._atv; if (a.origem === 'tecnico') { a.tecnicoUid = this.user.id; a.tecnicoNome = a.tecnicoNome || S.perfil.nome; }
      let r = this.ok(await this.atvW(() => this.tab('atividades').update(this.atvRow(a)).eq('id', a.id).select()));
      if ((!r || !r.length) && a.origem === 'tecnico') r = [this.ok(await this.atvW(() => this.tab('atividades').insert(this.atvRow(a)).select().single()))];
      if (r && r[0]) { const n = this.atvDe(r[0]); if (S.atvs.has(n.id)) { const l = S.atvs.get(n.id); l.log = n.log; l.escalonar = n.escalonar; await DB.putRaw('meta', { ...l, id: 'atv:' + l.id, _atv: true }); } if (S.ronda && S.ronda.atividadeId === n.id && n.log && S.ronda.atvLog !== n.log) { S.ronda.atvLog = n.log; saveRonda(true); if (S.view === 'home') render(); } else if (n.log) { const rr = await DB.get('rondas', n.rondaId || ''); if (rr && rr.atvLog !== n.log) { rr.atvLog = n.log; await DB.put('rondas', rr); } } }
      return;
    }
    if (store === 'meta') return this.gravar('tecnicos', { dados: { ...limpaJson(v), ...this.base() } });
    if (store === 'rotas') { const d = limpaJson(v); delete d._novo; d.atualizado = v.atualizado || Date.now(); return this.gravar('rotas', { id: v.id, atualizado: d.atualizado, dados: { ...d, ...this.base() } }); }
    if (store === 'rondas') return this.gravar('rondas', { id: v.id, inicio: v.inicio, dados: { ...limpaJson(v), ...this.base() } });
    if (store === 'fotos') { let path = v.path; if (!path && v.blob) { path = await this.subir(`${org}/rede/${v.rondaId || 'sem_ronda'}/${v.id}.jpg`, v.blob); v.path = path; await DB.putRaw('fotos', v); } const d = limpaJson(v); delete d.blob; return this.gravar('fotos_rede', { id: v.id, dados: { ...d, path: path || null, ...this.base() } }); }
    if (store === 'inspecoes') {
      let mudou = false; const fotos = [];
      for (const f of v.fotos || []) { if (!f.path && f.blob) { f.path = await this.subir(`${org}/fotos/${v.id}/${f.id}.jpg`, f.blob); mudou = true; } fotos.push({ id: f.id, cat: f.cat, desc: f.desc || '', ts: f.ts, lat: f.lat ?? null, lon: f.lon ?? null, w: f.w, h: f.h, path: f.path || null }); }
      if (mudou) await DB.putRaw('inspecoes', v);
      const d = limpaJson({ ...v, fotos: undefined }); d.fotos = fotos;
      if (v.tipo === 'site') { try { const at = this.ok(await this.tab('eventos').select('dados').eq('id', v.id).maybeSingle()); const c = at && at.dados && at.dados.site && at.dados.site.curvas; if (c && Object.keys(c).length) { d.site = { ...(d.site || {}), curvas: { ...c, ...((d.site || {}).curvas || {}) } }; if (at.dados.site.curvasOk) d.site.curvasOk = at.dados.site.curvasOk; } } catch (e) {} }
      return this.gravar('eventos', { id: v.id, chegada: v.chegada || v.criado || Date.now(), dados: { ...d, ...this.base() } });
    }
  },
  async aoVivo(force) {
    if (!this.on || ADMIN || !navigator.onLine || !this.user) return; const now = Date.now(); if (!force && !S.ronda && !S.exp && this.lastVivo) return;
    if (!force && this.lastVivo && now - this.lastVivo < 30000) return; this.lastVivo = now;
    const r = S.ronda && !S.ronda.fim ? S.ronda : null; let l = S.gps.last;
    // sem GPS agora (app reaberto sem sinal): manda a última posição conhecida, com o horário dela
    if (l && l.lat != null) { if (!this.ultPosTs || l.ts !== this.ultPosTs) { this.ultPosTs = l.ts; DB.putRaw('meta', { id: 'ultPos', l: { lat: l.lat, lon: l.lon, acc: l.acc, ts: l.ts } }).catch(() => {}); } } else { try { const m = await DB.get('meta', 'ultPos'); l = (m && m.l) || null; } catch (e) { l = null; } }
    const dados = { _uid: this.user.id, tecnico: S.perfil.nome || '', matricula: S.perfil.matricula || '', ativo: !!r, tipo: r ? (r.tipo || 'preventiva') : '', ticket: r ? r.ticket || '' : '', rotaId: r ? r.rotaId || '' : '', rondaId: r ? r.id : '', inicio: r ? r.inicio : null, lat: l ? l.lat : null, lon: l ? l.lon : null, acc: l ? l.acc : null, vel: velAtual(), ts: now, posTs: l ? l.ts : null, caixas: r ? r.eventos.filter(e => e.tipo === 'chegada').length : 0, km: r ? +totais(r).t.km.toFixed(2) : 0, veiculo: r ? veicTxt(r.veiculo) : '', noLocal: !!(r && S.insp && S.insp.rondaId === r.id && S.insp.status !== 'concluida'), gps: S.gps.status, expediente: !!S.exp, expIni: S.exp ? S.exp.inicio : null, distCasa: S.exp ? S.exp.distCasa ?? null : null, casaOk: !!(S.perfil.casa && S.perfil.casa.lat != null), refeicao: refAtiva() ? refAtiva().ini : null, trabMin: S.exp ? trabHoje(S.exp, now) : null, ultAtualiz: (atvEmCurso() || {}).ultAtualiz || null, atividadeId: r ? r.atividadeId || '' : '', apoio: !!(r && r.apoio), apoioDe: r && r.apoio ? r.apoioDe || '' : '' };
    try { await this.gravar('aovivo', { ts: now, dados }); } catch (e) { console.warn(e); }
  },
  async apagar(store, id) { if (store === 'mov') { try { this.ok(await this.tab('mat_mov').delete().eq('id', String(id).replace(/^mov:/, ''))); } catch (e) { console.warn(e); } return; } const c = this.COLS[store]; if (c) { try { this.ok(await this.tab(c).delete().eq('id', id)); } catch (e) { console.warn(e); } } },
  // login do técnico: matrícula (ou código do convite) + senha; a conta nasce no primeiro acesso, pelo convite
  emailLogin(login) { const l = String(login || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); const org = String(this.org()).toLowerCase().replace(/[^a-z0-9]/g, ''); const dom = (window.LOGIN_DOMINIO || 'tecnicoplus.app'); return [/^\d/.test(l) ? 'm' + l : l, l.startsWith('m') ? l : 'm' + l, l].filter((x, k, a) => x && a.indexOf(x) === k).map(x => `${x}@${org}.${dom}`); },
  async entrar(login, senha) {
    await this.sdk(); const cands = login.includes('@') ? [login.trim().toLowerCase()] : this.emailLogin(login); let ult = null;
    for (const email of cands) { const r = await this.sb.auth.signInWithPassword({ email, password: senha }); if (!r.error) { ult = null; break; } ult = r.error; }
    if (ult) throw new Error(/invalid|credentials/i.test(ult.message) ? 'Matrícula ou senha incorreta.' : /fetch|network/i.test(ult.message) ? 'Sem internet no momento.' : ult.message);
    this.precisaLogin = false; S.precisaLogin = false; this.on = false; await this.init();
  },
  async ativarConvite(codigo, senha) {
    await this.sdk(); const r = await this.sb.functions.invoke('acesso', { body: { acao: 'ativar', codigo, senha } });
    let d = r.data; if (r.error) { try { d = await r.error.context.json(); } catch (e) {} if (!d || !d.motivo) throw new Error(/fetch|network/i.test(String(r.error.message)) ? 'Sem internet no momento.' : 'O acesso ainda não foi liberado no servidor (função "acesso").'); }
    if (!d || !d.ok) throw new Error((d && d.motivo) || 'Não foi possível ativar.'); await this.entrar(d.email, senha); return d;
  },
  async sair() { try { await this.sb.auth.signOut(); } catch (e) {} this.on = false; this.user = null; this.precisaLogin = true; S.precisaLogin = true; try { fechaAlerta(); Alarme.parar(); } catch (e) {} this.set('err', 'Entre com sua matrícula e senha'); go('entrar'); },
  async aplicaCadastro() {
    try {
      let cod = null; try { cod = localStorage.getItem('rb_convite'); localStorage.removeItem('rb_convite'); } catch (e) {} const pend = cod ? { codigo: cod } : null; let c = null;
      if (!c) { const r = await this.tab('cadastros').select('*').eq('uid', this.user.id).maybeSingle(); if (r && !r.error) c = r.data; }
      if (!c) { if (S.perfil.funcaoTravada) { S.perfil.funcaoTravada = false; await DB.put('meta', S.perfil); } return; }
      const antes = JSON.stringify([S.perfil.nome, S.perfil.matricula, S.perfil.funcao, S.perfil.cargo, S.perfil.equipe, S.perfil.funcaoTravada, S.perfil.centroCusto]);
      S.perfil.nome = c.nome || S.perfil.nome; S.perfil.matricula = c.matricula || S.perfil.matricula; S.perfil.funcao = c.funcao || 'tecnico'; S.perfil.centroCusto = c.centro_custo || ''; S.perfil.cargo = c.cargo || S.perfil.cargo || cargoPadrao(S.perfil.funcao); if (c.equipe) S.perfil.equipe = c.equipe;
      if (c.veiculo && !S.perfil.veiculoTxt) S.perfil.veiculoTxt = c.veiculo; S.perfil.cadastroId = c.id; S.perfil.funcaoTravada = true;
      if (antes !== JSON.stringify([S.perfil.nome, S.perfil.matricula, S.perfil.funcao, S.perfil.cargo, S.perfil.equipe, S.perfil.funcaoTravada])) { await DB.put('meta', S.perfil); if (['home', 'perfil'].includes(S.view)) render(); }
      if (pend && pend.codigo && (!S.perfil.casa || S.perfil.casa.lat == null)) go('perfil');
    } catch (e) { console.warn('cadastro', e); }
  },
  // ---------- almoxarifado ----------
  async matCatalogo() { return (await this.todos(() => this.tab('materiais').select('*').eq('org', this.org()).order('descricao'))).map(r => ({ ...r, minimo: r.minimo == null ? null : +r.minimo, refs: r.refs || [] })); },
  async matSalvar(m) { return this.matSalvarVarios([m]); },
  async matSalvarVarios(l) { for (let i = 0; i < l.length; i += 300) this.ok(await this.tab('materiais').upsert(l.slice(i, i + 300).map(m => ({ id: m.id, org: this.org(), codigo: m.codigo || null, descricao: m.descricao, unidade: m.unidade || 'un', minimo: m.minimo, refs: m.refs || [], ativo: m.ativo !== false, atualizado: Date.now() })))); },
  async movTodos() { return (await this.todos(() => this.tab('mat_mov').select('*').eq('org', this.org()).order('ts'))).map(r => ({ ...r, ts: +r.ts, qtd: +r.qtd })); },
  async movMeus() { return (await this.todos(() => this.tab('mat_mov').select('*').eq('tecnico_uid', this.user.id).order('ts'))).map(r => ({ ...r, ts: +r.ts, qtd: +r.qtd })); },
  async eqpTodos() { return (await this.todos(() => this.tab('equipamentos').select('*').eq('org', this.org()).order('descricao'))).map(r => ({ ...r, valor: r.valor == null ? null : +r.valor, desde: r.desde ? +r.desde : null })); },
  async eqpMovTodos() { return (await this.todos(() => this.tab('equip_mov').select('*').eq('org', this.org()).order('ts'))).map(r => ({ ...r, ts: +r.ts, aceite_ts: r.aceite_ts ? +r.aceite_ts : null })); },
  async eqpSalvar(l) { this.ok(await this.tab('equipamentos').upsert(l)); },
  async eqpMovGravar(l) { this.ok(await this.tab('equip_mov').upsert(l)); },
  async eqpMeus() { const u = this.user.id; const [e, m] = await Promise.all([this.tab('equipamentos').select('*').eq('tecnico_uid', u), this.tab('equip_mov').select('*').eq('para_uid', u).order('ts')]); return { eq: (this.ok(e) || []).map(r => ({ ...r, desde: r.desde ? +r.desde : null })), mov: (this.ok(m) || []).map(r => ({ ...r, ts: +r.ts, aceite_ts: r.aceite_ts ? +r.aceite_ts : null })) }; },
  async equipeNomes() { return ((this.ok(await this.sb.rpc('equipe_nomes', { p_org: this.org() })) || [])).map(t => ({ uid: t.uid, nome: t.nome || 'Técnico', matricula: t.matricula || '' })); },
  async eqpAceite(id) { return this.ok(await this.sb.rpc('equip_aceite', { p_id: id })); },
  async movGravar(l) { for (let i = 0; i < l.length; i += 300) this.ok(await this.tab('mat_mov').upsert(l.slice(i, i + 300))); },
  async reqLista() { return this.ok(await this.tab('mat_requisicoes').select('*').eq('org', this.org()).order('mes_ref', { ascending: false }).limit(48)) || []; },
  async reqSalvar(id, patch) { this.ok(await this.tab('mat_requisicoes').update({ ...patch, atualizado: Date.now() }).eq('id', id)); },
  async reqGerar() { const r = await this.sb.rpc('gerar_requisicoes', { p_org: this.org(), p_refazer: true }); if (r.error) throw r.error; return r.data; },
  async projLista() { return (this.ok(await this.tab('projetos').select('*').eq('org', this.org()).order('nome')) || []).map(p => ({ ...p, receita_fixa: p.receita_fixa == null ? null : +p.receita_fixa, alocacao: p.alocacao || [] })); },
  async projSalvar(l) { this.ok(await this.tab('projetos').upsert(l.map(p => ({ id: p.id, org: this.org(), nome: p.nome, vinculo: p.vinculo || 'outro', modelo: p.modelo || 'outro', receita_fixa: p.receita_fixa ?? null, faturamento: p.faturamento || null, dia_fechamento: p.dia_fechamento || 31, alocacao: p.alocacao || [], ativo: p.ativo !== false, obs: p.obs || null, atualizado: Date.now() })))); },
  async projLancLista() { return (await this.todos(() => this.tab('proj_lanc').select('*').eq('org', this.org()).order('data'))).map(l => ({ ...l, valor: +l.valor })); },
  async projLancSalvar(l) { this.ok(await this.tab('proj_lanc').upsert(l)); },
  async projLancApagar(id) { this.ok(await this.tab('proj_lanc').delete().eq('id', id)); },
  async pedCriar(p) { this.ok(await this.tab('pedidos').insert(p)); },
  async pedMeus() { return this.ok(await this.tab('pedidos').select('*').eq('tecnico_uid', this.user.id).gte('criado', Date.now() - 7 * 86400000)) || []; },
  async pedAbertos() { return this.ok(await this.tab('pedidos').select('*').eq('org', this.org()).eq('status', 'pedido').order('criado')) || []; },
  async pedDecidir(id, status, obs) { const a = this.admin || {}; this.ok(await this.tab('pedidos').update({ status, obs: obs || null, decidido_por: (a.papel === 'noc' ? 'NOC · ' : '') + (a.nome || 'Gestor'), decidido_em: Date.now() }).eq('id', id)); },
  async pedNoc() { return this.ok(await this.tab('pedidos').select('*').eq('org', this.org()).eq('tipo', 'liberar_corretiva').gte('criado', Date.now() - 36 * 3600000).order('criado', { ascending: false })) || []; },
  async msgCriar(m) { this.ok(await this.tab('ped_msgs').insert(m)); },
  async msgsMeus() { return this.ok(await this.tab('ped_msgs').select('*').eq('tecnico_uid', this.user.id).gte('criado', Date.now() - 3 * 86400000).order('criado')) || []; },
  async msgsOrg() { return this.ok(await this.tab('ped_msgs').select('*').eq('org', this.org()).gte('criado', Date.now() - 36 * 3600000).order('criado')) || []; },
  async treinosMeus() { return this.ok(await this.tab('treinamentos').select('*').eq('uid', this.user.id)) || []; },
  async treinosTodos() { return this.ok(await this.tab('treinamentos').select('*').eq('org', this.org())) || []; },
  async treinoSalvar(t) { this.ok(await this.tab('treinamentos').upsert(t)); },
  async treinoApagar(id) { this.ok(await this.tab('treinamentos').delete().eq('id', id)); },
  async escadaSalvar(e) { this.ok(await this.tab('escada').upsert(e)); },
  async sosCancelar(id) { this.ok(await this.tab('sos').update({ status: 'cancelado' }).eq('id', id).eq('status', 'aberto')); },
  async sosCriar(s) { this.ok(await this.tab('sos').insert(s)); },
  async sosAbertos() { return this.ok(await this.tab('sos').select('*').eq('org', this.org()).eq('status', 'aberto').order('ts')) || []; },
  async sosAtender(id) { this.ok(await this.tab('sos').update({ status: 'atendido', atendido_por: (this.admin || {}).nome || 'Supervisor', atendido_em: Date.now() }).eq('id', id)); },
  async adminFoto(foto) { this.ok(await this.sb.rpc('admin_foto', { p_foto: foto })); },
  async atvApagar(id) { this.ok(await this.tab('atividades').delete().eq('id', id)); },
  async painelLista() { let r = await this.tab('admins').select('uid, nome, papel, email').eq('org', this.org()); if (r && r.error) r = await this.tab('admins').select('uid, nome, papel').eq('org', this.org()); return (this.ok(r) || []).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''))); },
  async adminsLista() { return this.ok(await this.tab('admins').select('uid, nome, papel, clusters').eq('org', this.org())) || []; },
  async adminClusters(uid, clusters) { this.ok(await this.sb.rpc('admin_clusters', { p_uid: uid, p_clusters: clusters })); },
  async recursosLista() { return this.ok(await this.tab('recursos').select('*').eq('org', this.org())) || []; },
  async recursoSalvar(r) { this.ok(await this.tab('recursos').upsert(r)); },
  async meuRecurso() { return this.ok(await this.tab('recursos').select('*').eq('uid', this.user.id).maybeSingle()); },
  async atvPeriodo(a, b) { return (await this.todos(() => this.tab('atividades').select('*').eq('org', this.org()).gte('criado', a).lte('criado', b).order('criado'))).map(r => this.atvDe(r)); },
  async bookGet(rotaId) { const r = this.ok(await this.tab('fiber_book').select('dados').eq('id', String(rotaId)).maybeSingle()); return r ? r.dados : null; },
  async bookSalvar(rotaId, dados) { dados.atualizado = Date.now(); this.ok(await this.tab('fiber_book').upsert({ id: String(rotaId), org: this.org(), uid: this.user.id, atualizado: new Date().toISOString(), dados: limpaJson(dados) })); },
  async revisaoPlano(d) { await this.gravar('eventos', { id: d.id, chegada: d.chegada, dados: { ...limpaJson(d), ...this.base() } }); },
  async evsDaAtv(a) { const out = new Map(); const org = this.org();
    try { const rs = this.ok(await this.tab('rondas').select('id').eq('org', org).ilike('dados->>atividadeId', String(a.id))) || []; for (const r of rs) (this.ok(await this.tab('eventos').select('id, dados').eq('org', org).ilike('dados->>rondaId', String(r.id))) || []).forEach(e => out.set(e.id, e.dados)); } catch (e) {}
    if (a.ticket) { try { (this.ok(await this.tab('eventos').select('id, dados').eq('org', org).ilike('dados->corr->>ticket', String(a.ticket))) || []).forEach(e => out.set(e.id, e.dados)); } catch (e) {} }
    return [...out.values()].filter(Boolean); },
  async evApagar(ev) { const id = ev.id, org = this.org(); const paths = (ev.fotos || []).map(f => f.path).filter(Boolean);
    try { await this.tab('medicoes').delete().eq('id', id); } catch (e) {} try { await this.tab('os_medidas').delete().eq('id', id); } catch (e) {}
    this.ok(await this.tab('eventos').delete().eq('id', id));
    try { if (paths.length) await this.sb.storage.from(this.BUCKET).remove(paths); const l = await this.sb.storage.from(this.BUCKET).list(`${org}/relatorios`, { search: id }); const rel = ((l && l.data) || []).filter(x => String(x.name).startsWith(id)).map(x => `${org}/relatorios/${x.name}`); if (rel.length) await this.sb.storage.from(this.BUCKET).remove(rel); } catch (e) {}
    try { DB.mem && DB.mem.inspecoes && DB.mem.inspecoes.delete(id); S.inspCache && S.inspCache.delete(id); } catch (e) {} },
  async evsPorRota(id) { return (this.ok(await this.tab('eventos').select('dados').eq('org', this.org()).ilike('dados->info->>rotaId', String(id)).order('chegada', { ascending: false }).limit(1000)) || []).map(r => r.dados).filter(Boolean); },
  async evsPorTag(tag, exato) { return (this.ok(await this.tab('eventos').select('dados').eq('org', this.org()).ilike('dados->info->>tag', exato ? tag : `%${tag}%`).order('chegada', { ascending: false }).limit(300)) || []).map(r => r.dados).filter(Boolean); },
  async evsPorTexto(q) { const [a, b] = await Promise.all([this.tab('eventos').select('dados').eq('org', this.org()).ilike('dados->corr->>ticket', `%${q}%`).limit(200), this.tab('eventos').select('dados').eq('org', this.org()).ilike('dados->info->>endereco', `%${q}%`).limit(200)]); const m = new Map(); [...(this.ok(a) || []), ...(this.ok(b) || [])].forEach(r => r.dados && m.set(r.dados.id, r.dados)); return [...m.values()]; },
  async atvsPorNode(q) { return (this.ok(await this.tab('atividades').select('*').eq('org', this.org()).ilike('dados->>node', `%${q}%`).order('criado', { ascending: false }).limit(300)) || []).map(r => this.atvDe(r)); },
  async atvsPorTexto(q) { const [a, b] = await Promise.all([this.tab('atividades').select('*').eq('org', this.org()).ilike('ticket', `%${q}%`).limit(200), this.tab('atividades').select('*').eq('org', this.org()).ilike('endereco', `%${q}%`).limit(200)]); const m = new Map(); [...(this.ok(a) || []), ...(this.ok(b) || [])].forEach(r => m.set(r.id, this.atvDe(r))); return [...m.values()]; },
  async movApagar(id) { this.ok(await this.tab('mat_mov').delete().eq('id', id)); },
  async movRevincular(deId, m) { this.ok(await this.tab('mat_mov').update({ material_id: m.id, descricao: m.descricao, unidade: m.unidade }).eq('org', this.org()).eq('material_id', deId)); },
  async abastAdmin(a, b) { try { return (await this.todos(() => this.tab('abastecimentos').select('*').eq('org', this.org()).gte('ts', a - 40 * 86400000).lte('ts', b))).map(r => ({ ...(r.dados || {}), id: r.id, uid: r.uid, ts: +r.ts })); } catch (e) { return []; } },
  async cadLista() { const l = await this.todos(() => this.tab('cadastros').select('*').eq('org', this.org()).order('nome')); let rh = []; try { rh = await this.todos(() => this.tab('rh_dados').select('*').eq('org', this.org())); } catch (e) {} const m = new Map(rh.map(r => [r.cad_id, r])); return l.map(c => { const r = m.get(c.id); return r ? { ...c, salario: r.salario, vr_dia: r.vr_dia, jornada_min: r.jornada_min, locacao_mes: r.locacao_mes, peric_pct: r.peric_pct, insal_pct: r.insal_pct, insal_base: r.insal_base, noturno_pct: r.noturno_pct, outros_mes: r.outros_mes, dsr: r.dsr } : c; }); },
  async rhSalvar(cadId, patch) { const row = { cad_id: cadId, org: this.org(), ...patch, atualizado: new Date().toISOString() }; let r = await this.tab('rh_dados').upsert(row);
    if (r && r.error && /peric|insal|noturno|outros_mes|dsr/.test(r.error.message || '')) { ['peric_pct', 'insal_pct', 'insal_base', 'noturno_pct', 'outros_mes', 'dsr'].forEach(k => delete row[k]); r = await this.tab('rh_dados').upsert(row); this.ok(r); throw new Error('salário salvo, mas os adicionais precisam do supabase.sql novo'); } this.ok(r); },
  async cadCriar(row) { let r = await this.tab('cadastros').insert({ org: this.org(), ...row }).select().single(); if (r && r.error && /cargo/.test(r.error.message || '')) { const { cargo, ...sem } = row; r = await this.tab('cadastros').insert({ org: this.org(), ...sem }).select().single(); } const c = this.ok(r); ['salario', 'vr_dia', 'jornada_min', 'locacao_mes'].forEach(k => c && delete c[k]); return c; },
  async cadSalvar(id, patch) { let r = await this.tab('cadastros').update(patch).eq('id', id).select().single(); if (r && r.error && /cargo/.test(r.error.message || '')) { const { cargo, ...sem } = patch; r = await this.tab('cadastros').update(sem).eq('id', id).select().single(); } const c = this.ok(r); ['salario', 'vr_dia', 'jornada_min', 'locacao_mes'].forEach(k => c && delete c[k]); return c; },
  async restauraPerfil() {
    try { const d = this.ok(await this.tab('tecnicos').select('dados').eq('uid', this.user.id).maybeSingle()); if (d && d.dados && !S.perfil.nome) { S.perfil = Object.assign({ prefixo: 'CE-BKB' }, tiraMeta(d.dados), { id: 'perfil' }); await DB.putRaw('meta', S.perfil); render(); } } catch (e) {}
  },
  canal(nome, tabela, cb, err, filtro) {
    const ch = this.sb.channel(nome + '-' + Math.random().toString(36).slice(2, 8))
      .on('postgres_changes', { event: '*', schema: 'public', table: tabela, filter: filtro || 'org=eq.' + this.org() }, p => cb(p.eventType, p.eventType === 'DELETE' ? p.old : p.new))
      .subscribe((st, e) => { if ((st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') && err) err(e || new Error(st)); });
    this.canais.push(ch); return () => { try { this.sb.removeChannel(ch); } catch (e) {} };
  },
  async rotaRecebida(d) {
    const loc = await DB.get('rotas', d.id); if (loc && (loc.atualizado || 0) >= (d.atualizado || 0)) { if (!loc._autor && d._uid) { loc._autor = d._uid; await DB.putRaw('rotas', loc); } return false; }
    const rt = tiraMeta(d); rt._autor = d._uid || (loc && loc._autor) || ''; if (!rt.kml) delete rt.kml; await DB.putRaw('rotas', rt); return true;
  },
  async atualizaTelaRotas() { await carregaRotas(); if (S.view === 'home' || S.view === 'rotas') { const y = window.scrollY; render(); window.scrollTo(0, y); } },
  async eventoRecebido(d) { if (!d || d._uid === this.user.id) return; const e = { ...d, _doEquipe: true }; delete e._sync; await DB.putRaw('equipe', e); },
  async ouvir() {
    const org = this.org();
    try {
      const rts = await this.todos(() => this.tab('rotas').select('dados').eq('org', org));
      let mud = false; const ids = new Set(rts.map(r => r.dados.id));
      for (const r of rts) if (await this.rotaRecebida(r.dados)) mud = true;
      if (mud) this.atualizaTelaRotas();
    } catch (e) { this.set('err', 'Sem permissão para ler as rotas da equipe: ' + e.message); }
    this.canal('rotas', 'rotas', async (tipo, row) => { if (tipo === 'DELETE') { if (row && row.id) await DB.delRaw('rotas', row.id); } else if (row && row.dados && !(await this.rotaRecebida(row.dados))) return; this.atualizaTelaRotas(); });
    try {
      const evs = this.ok(await this.tab('eventos').select('dados').eq('org', org).neq('uid', this.user.id).order('chegada', { ascending: false }).limit(3000));
      for (const r of evs || []) await this.eventoRecebido(r.dados);
    } catch (e) { this.set('err', 'Sem permissão para ler os eventos da equipe: ' + e.message); }
    this.canal('eventos', 'eventos', async (tipo, row) => { if (tipo === 'DELETE') { if (row && row.id) await DB.delRaw('equipe', row.id); } else if (row) await this.eventoRecebido(row.dados); });
  },
  async assinarPush() {
    try {
      if (RESTRITO || !this.on || !window.VAPID_PUBLIC || !('PushManager' in window) || !('serviceWorker' in navigator) || Notification.permission !== 'granted') return false;
      const reg = await navigator.serviceWorker.ready; const chave = Uint8Array.from(atob(window.VAPID_PUBLIC.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - window.VAPID_PUBLIC.length % 4) % 4)), c => c.charCodeAt(0));
      let sub = await reg.pushManager.getSubscription(); if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chave });
      const j = sub.toJSON(); this.ok(await this.tab('push_subs').upsert({ endpoint: j.endpoint, org: this.org(), uid: this.user.id, sub: j, atualizado: Date.now() })); this.pushOk = true; return true;
    } catch (e) { console.warn('push', e); this.pushErro = e.message; return false; }
  },
  async plantoesMeus() { try { const l = this.ok(await this.tab('plantoes').select('*').eq('uid', this.user.id).gte('fim', Date.now() - 86400000).order('inicio')) || []; S.plantoes = l.map(plaDe); await DB.putRaw('meta', { id: 'plantoes', lista: S.plantoes }); if (S.view === 'home') { const y = window.scrollY; render(); window.scrollTo(0, y); } } catch (e) { console.warn(e); } },
  async plantoesAdmin(a, b) { return (await this.todos(() => this.tab('plantoes').select('*').eq('org', this.org()).gte('fim', a).lte('inicio', b).order('inicio'))).map(plaDe); },
  async plantaoSalvar(p) { this.ok(await this.tab('plantoes').upsert({ id: p.id, org: this.org(), uid: p.uid, tecnico_nome: p.tecnicoNome, tipo: p.tipo, inicio: p.inicio, fim: p.fim, obs: p.obs || null })); },
  async plantaoApagar(id) { this.ok(await this.tab('plantoes').delete().eq('id', id)); },
  async avisaFuncao() { try { if (this.sb && this.sb.functions) this.sb.functions.invoke('alertas', { body: { origem: 'despacho' } }).catch(() => {}); } catch (e) {} },
  async iniciaAtv() {
    const sync = async inicial => { try { const l = await this.atvMinhas(); const ids = new Set(l.map(a => a.id)); for (const a of l) await recebeAtv(a, inicial); for (const a of [...S.atvs.values()]) if (a.origem !== 'tecnico' && !ids.has(a.id) && !(S.ronda && S.ronda.atividadeId === a.id) && !(await DB.get('fila', 'atv:atv:' + a.id))) { await esqueceAtv(a.id); } Alarme.revisa(); if (S.view === 'home') render(); } catch (e) { console.warn(e); } };
    await sync(true); this.ouvirAtv((tipo, a) => recebeAtv(a)); setInterval(() => sync(false), 60000);
    this.assinarPush(); this.plantoesMeus(); this.meuRecurso().then(r => { if (!r) return; const servAntes = JSON.stringify((S.recurso || {}).servicos || null); S.recurso = r; if (JSON.stringify(r.servicos || null) !== servAntes && S.view === 'home' && !S.ronda) setTimeout(() => { if (S.view === 'home' && !S.ronda && !document.activeElement.matches('input,textarea,select')) render(); }, 0); DB.putRaw('meta', { id: 'recurso', r }); let mud = false; if (r.regiao && S.perfil.regiao !== r.regiao) { S.perfil.regiao = r.regiao; mud = true; } if (r.cluster && S.perfil.cluster !== r.cluster) { S.perfil.cluster = r.cluster; mud = true; } if (r.classe && S.perfil.classe !== r.classe) { S.perfil.classe = r.classe; mud = true; } if (mud) DB.put('meta', S.perfil); }).catch(() => {}); this.pedMeus().then(l => { l.forEach(p => { if (p.tipo === 'remanejar') { S.pedRem = S.pedRem || new Map(); S.pedRem.set(p.ref_id, p); } else Lib.guarda(p); }); if (S.view === 'home') render(); }).catch(() => {}); this.canal('ped', 'pedidos', (t, row) => aoPedidoTec(row), null, 'tecnico_uid=eq.' + this.user.id); this.msgsMeus().then(l => { l.forEach(guardaMsg); }).catch(() => {}); this.canal('pmsg', 'ped_msgs', (t, row) => { if (!row || !row.id) return; const novo = !(S.pedMsgs.get(row.pedido_id) || []).some(x => x.id === row.id); guardaMsg(row); if (novo && row.papel !== 'tecnico') { toast(`${PAPEL_LB[row.papel] || ''} ${row.autor_nome || ''}: ${row.texto}`, 8000); try { navigator.vibrate && navigator.vibrate(200); } catch (e) {} } if (S.view === 'home' || S.view === 'insp') { const y = window.scrollY; render(); window.scrollTo(0, y); } }, null, 'tecnico_uid=eq.' + this.user.id); this.matCatalogo().then(l => DB.putRaw('meta', { id: 'matCat', lista: l })).catch(() => {}); this.metasLer().then(m => { S.metas = m; DB.putRaw('meta', { id: 'metas', m }); }); this.canal('pla', 'plantoes', () => this.plantoesMeus(), null, 'uid=eq.' + this.user.id); setInterval(() => this.plantoesMeus(), 600000);
  },
  async vivoInicial() { return (this.ok(await this.tab('aovivo').select('uid, dados').eq('org', this.org())) || []).map(r => ({ ...r.dados, _uid: r.uid })); },
  ouvirAoVivo(cb, err) {
    this.vivoInicial().then(l => { l.forEach(v => cb('set', v)); cb('pinta', null); }).catch(e => { cb('pinta', null); err && err(e); });
    return this.canal('aovivo', 'aovivo', (tipo, row) => { if (tipo === 'DELETE') cb('del', { _uid: row && row.uid }); else if (row) cb('set', { ...row.dados, _uid: row.uid }); }, err);
  }
};

async function eventosHistorico() { const meus = await DB.all('inspecoes'); const ids = new Set(meus.map(x => x.id)); return [...meus, ...(await DB.all('equipe')).filter(x => !ids.has(x.id))]; }

