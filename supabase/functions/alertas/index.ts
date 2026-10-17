// Técnico Plus - Multivale — função "alertas" (Supabase Edge Function)
// Envia notificações (Web Push) para o celular do técnico mesmo com o app fechado:
//  • atividade nova ou aguardando início do deslocamento (repete a cada 2 min)
//  • expediente não iniciado dentro da jornada (repete a cada 10 min)
//  • tempo de refeição encerrado (repete a cada 5 min)
//  • fim da jornada com expediente aberto (uma vez por dia)
// É chamada a cada minuto pelo agendamento (pg_cron) e na hora em que o supervisor cria uma atividade.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const ORG = env("NUVEM_ORG", "multivale");
const JOR = { inicio: env("JORNADA_INICIO", "08:00"), fim: env("JORNADA_FIM", "18:00"), refeicaoMin: +env("REFEICAO_MIN", "60"), dias: env("JORNADA_DIAS", "0123456") };
const TZ = "America/Sao_Paulo";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const MIN = 60000;
const INTERVALO = { atv: 2 * MIN - 10000, exp: 10 * MIN - 10000, ref: 5 * MIN - 10000 };
// supervisor é avisado quando o técnico não inicia o expediente até X minutos depois do início da jornada
const TOL_EXP = +(Deno.env.get("EXP_TOLERANCIA_MIN") ?? "15") || 15;

type Envia = (uid: string, msg: Record<string, unknown>) => Promise<number>;
type Db = {
  atividadesPendentes(): Promise<any[]>;
  apoiosAbertos?(): Promise<any[]>;
  gestores?(): Promise<string[]>;
  emCurso?(): Promise<any[]>;
  aoVivo?(): Promise<any[]>;
  limiteCfg?(): Promise<{ lim: number; aviso: number }>;
  tecnicos(): Promise<any[]>;
  cadastrosAtivos?(): Promise<Set<string>>;
  expedientesDesde(ts: number): Promise<any[]>;
  comAssinatura(): Promise<Set<string>>;
  logLer(chaves: string[]): Promise<Map<string, number>>;
  logGravar(chave: string, ts: number): Promise<void>;
  plantoes(de: number, ate: number): Promise<any[]>;
  // despacho automático do backlog (não emergencial) para técnico livre do mesmo mini cluster
  despachoCfg?(): Promise<boolean>;
  backlog?(): Promise<any[]>;
  abertasTec?(): Promise<any[]>;
  recursos?(): Promise<any[]>;
  fiscais?(): Promise<Set<string>>;
  atribuir?(a: any, uid: string, nome: string, agora: number, nota: string): Promise<boolean>;
  retomar?(a: any, agora: number): Promise<boolean>;
};
export const MINI_CLU: Record<string, string> = { implantacao: "ddd11", sjc: "ddd12", taubate: "ddd12", litoral: "ddd12", santos: "ddd13", sulminas: "mg" };
// a O.S. do backlog combina com o técnico? mesmo mini cluster (ou mesmo cluster quando um dos dois não tem mini) e serviço liberado na ficha
export function combina(a: any, rec: any) {
  const d = a.dados || {}; const reg = rec && rec.regiao && rec.regiao !== "todas" ? rec.regiao : ""; const clu = (rec && rec.cluster) || (reg ? MINI_CLU[reg] : "") || "";
  const serv = rec && Array.isArray(rec.servicos) && rec.servicos.length ? rec.servicos : null;
  if (serv && a.tipo === "preventiva" && !serv.includes("preventiva")) return false;
  if (serv && a.tipo === "implantacao" && !serv.includes("implantacao")) return false;
  if (serv && a.tipo === "conjunta" && !serv.includes("conjunta") && !serv.includes("preventiva")) return false;
  if (serv && a.tipo === "vistoria" && !serv.includes("vistoria")) return false;
  if (d.mini && reg) return d.mini === reg;
  if (d.cluster && clu) return d.cluster === clu;
  return false;
}
const distM = (p: any, q: any) => { if (!p || !q || p.lat == null || q.lat == null) return Infinity; const R = 6371000, r = Math.PI / 180; const a = Math.sin((q.lat - p.lat) * r / 2) ** 2 + Math.cos(p.lat * r) * Math.cos(q.lat * r) * Math.sin((q.lon - p.lon) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(a)); };
// técnico livre: expediente aberto, fora de refeição, sem ronda ativa e sem O.S. aberta; primeiro retoma a O.S. pausada mais antiga, depois pega a mais antiga do backlog
export async function despachoAuto(db: Db, agora: number, nomes: Map<string, string>) {
  const out: string[] = [];
  if (!db.backlog || !db.abertasTec || !db.recursos || !db.atribuir || !db.aoVivo) return out;
  if (db.despachoCfg && !(await db.despachoCfg())) return out;
  const vivo = (await db.aoVivo()).filter((v: any) => { const d = v.dados || {}; return d.expediente && !d.ativo && !d.refeicao && agora - (+d.ts || +v.ts || 0) < 15 * MIN; });
  if (!vivo.length) return out;
  const abertas = await db.abertasTec(); const fiscais = db.fiscais ? await db.fiscais() : new Set<string>();
  const ocupado = new Set<string>(); const pausadas = new Map<string, any[]>();
  for (const a of abertas) {
    if (a.status === "pausada") { if (a.tecnico_uid) (pausadas.get(a.tecnico_uid) || pausadas.set(a.tecnico_uid, []).get(a.tecnico_uid)!).push(a); continue; }
    if (a.tecnico_uid) ocupado.add(a.tecnico_uid); (a.apoio_uids || []).forEach((u: string) => ocupado.add(u));
  }
  const recs = new Map((await db.recursos()).map((r: any) => [r.uid, r]));
  const livres = vivo.filter((v: any) => !ocupado.has(v.uid) && !fiscais.has(v.uid));
  const restantes: any[] = [];
  for (const v of livres) {
    const p = (pausadas.get(v.uid) || []).sort((x, y) => +x.criado - +y.criado)[0];
    if (p && db.retomar) { if (await db.retomar(p, agora)) out.push(`retomar ${p.id} → ${v.uid}`); continue; }
    restantes.push(v);
  }
  if (!restantes.length) return out;
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(agora));
  const fila = (await db.backlog()).filter((a: any) => a.tipo !== "emergencial" && a.tipo !== "vistoria" && !((a.dados || {}).agendaDia && (a.dados || {}).agendaDia > hoje)).sort((x: any, y: any) => +x.criado - +y.criado);
  const usados = new Set<string>();
  for (const a of fila) {
    const cand = restantes.filter((v: any) => !usados.has(v.uid) && combina(a, recs.get(v.uid)));
    if (!cand.length) continue;
    const alvo = { lat: a.lat ?? (a.dados || {}).lat, lon: a.lon ?? (a.dados || {}).lon };
    cand.sort((x: any, y: any) => distM(x.dados, alvo) - distM(y.dados, alvo));
    const t = cand[0]; const nome = nomes.get(t.uid) || (t.dados || {}).nome || "Técnico"; const rec = recs.get(t.uid) || {};
    const nota = `Despacho automático: técnico livre no ${(a.dados || {}).mini && rec.regiao ? "mini cluster" : "cluster"} da O.S.`;
    if (await db.atribuir(a, t.uid, nome, agora, nota)) { usados.add(t.uid); out.push(`auto ${a.id} → ${t.uid}`); }
    if (usados.size >= restantes.length) break;
  }
  return out;
}

export function relogio(agora: number) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" }).formatToParts(new Date(agora)).map((x) => [x.type, x.value]));
  const ymd = `${p.year}-${p.month}-${p.day}`;
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  const min = +p.hour * 60 + +p.minute;
  const inicioDia = Date.parse(`${ymd}T00:00:00-03:00`);
  return { ymd, dow, min, inicioDia };
}
const hm = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const hora = (ts: number) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(ts));

export async function ciclo(db: Db, envia: Envia, agora = Date.now()) {
  const out: string[] = [];
  const subs = await db.comAssinatura();
  const chaves: string[] = [];
  const pend = (await db.atividadesPendentes()).filter((a) => a.tecnico_uid && subs.has(a.tecnico_uid) && !(a.dados || {}).vistaEm); // o alarme para quando o técnico confirma "O.S. recebida"
  pend.forEach((a) => chaves.push("atv:" + a.id));
  // equipe de apoio: cada técnico de apoio que ainda não iniciou o deslocamento
  const apo: { a: any; uid: string }[] = [];
  for (const a of (db.apoiosAbertos ? await db.apoiosAbertos() : [])) for (const u of (a.apoio_uids || [])) { const st = (a.apoio_st || {})[u]; if (subs.has(u) && !["vista", "em_deslocamento", "no_local", "concluida"].includes(st)) apo.push({ a, uid: u }); }
  apo.forEach((x) => chaves.push(`apo:${x.a.id}:${x.uid}`));
  const R = relogio(agora);
  const tecs = (await db.tecnicos()).filter((t) => subs.has(t.uid));
  const exps = await db.expedientesDesde(R.inicioDia - 18 * 3600000);
  tecs.forEach((t) => chaves.push(`exp:${t.uid}:${R.ymd}`, `ref:${t.uid}`, `fim:${t.uid}:${R.ymd}`));
  const pls = await db.plantoes(R.inicioDia - 86400000, agora + 2 * 86400000);
  pls.forEach((p) => chaves.push('pla:' + p.id));
  const log = await db.logLer(chaves);
  const pode = (k: string, int: number) => !log.has(k) || agora - (log.get(k) || 0) >= int;
  const marca = async (k: string) => { log.set(k, agora); await db.logGravar(k, agora); };

  // 1) atividades aguardando o técnico iniciar o deslocamento
  for (const a of pend) {
    const k = "atv:" + a.id; if (!pode(k, INTERVALO.atv)) continue;
    const d = a.dados || {}; const em = a.tipo === "emergencial"; const impl = a.tipo === "implantacao"; const cnj = a.tipo === "conjunta"; const vis = a.tipo === "vistoria";
    const titulo = `${em ? "🚨 EMERGENCIAL" : impl ? "Nova implantação" : cnj ? "Nova conjunta de site" : vis ? "Nova vistoria" : "Nova preventiva"} · ${a.ticket || ""}${a.log >= 2 ? ` · LOG ${a.log}` : ""}`;
    const corpo = [d.ocorrencia, d.designacao, d.siteSigla ? "Site " + d.siteSigla : "", a.endereco || d.refLocal, "Toque para abrir e confirmar o recebimento."].filter(Boolean).join(" · ");
    const n = await envia(a.tecnico_uid, { titulo, corpo, tag: "atv-" + a.id, url: "./" });
    await marca(k); out.push(`atv ${a.id} → ${n}`);
  }
  for (const { a, uid } of apo) {
    const k = `apo:${a.id}:${uid}`; if (!pode(k, INTERVALO.atv)) continue; const d = a.dados || {};
    const titulo = `🤝 APOIO · ${a.tipo === "emergencial" ? "emergencial" : a.tipo === "implantacao" ? "implantação" : a.tipo === "conjunta" ? "conjunta de site" : a.tipo === "vistoria" ? "vistoria" : "preventiva"} · ${a.ticket || ""}`;
    const corpo = [d.ocorrencia, a.endereco || d.refLocal, a.tecnico_nome ? "Principal: " + a.tecnico_nome : "", "Toque para abrir e confirmar o recebimento."].filter(Boolean).join(" · ");
    const n = await envia(uid, { titulo, corpo, tag: "apo-" + a.id, url: "./" }); await marca(k); out.push(`apo ${a.id} ${uid} → ${n}`);
  }
  // 2) jornada: expediente não iniciado, refeição estourada, fim do dia
  const diaUtil = JOR.dias.includes(String(R.dow));
  const dentro = diaUtil && R.min >= hm(JOR.inicio) && R.min < hm(JOR.fim);
  for (const t of tecs) {
    const meus = exps.filter((e) => e.uid === t.uid);
    const aberto = meus.find((e) => !e.fim);
    const hoje = meus.some((e) => e.inicio >= R.inicioDia);
    const folga = pls.some((p) => p.uid === t.uid && p.tipo === 'folga' && p.inicio < R.inicioDia + 86400000 && p.fim > R.inicioDia + 9 * 3600000);
    if (dentro && !aberto && !hoje && !folga) {
      const k = `exp:${t.uid}:${R.ymd}`;
      if (pode(k, INTERVALO.exp)) { const n = await envia(t.uid, { titulo: "⏰ Expediente não iniciado", corpo: `Seu expediente começa às ${JOR.inicio}. Abra o app e toque em Iniciar expediente.`, tag: "expediente", url: "./" }); await marca(k); out.push(`exp ${t.uid} → ${n}`); }
    }
    const rf = aberto && aberto.dados && aberto.dados.refeicao;
    if (rf && rf.ini && !rf.fim && agora - rf.ini >= JOR.refeicaoMin * MIN) {
      const k = `ref:${t.uid}`;
      if (pode(k, INTERVALO.ref)) { const n = await envia(t.uid, { titulo: "🍽️ Tempo de refeição encerrado", corpo: `Refeição desde ${hora(rf.ini)}. Encerre a refeição no app para voltar ao trabalho.`, tag: "refeicao", url: "./" }); await marca(k); out.push(`ref ${t.uid} → ${n}`); }
    }
    if (aberto && diaUtil && R.min >= hm(JOR.fim)) {
      const k = `fim:${t.uid}:${R.ymd}`;
      if (!log.has(k)) { const n = await envia(t.uid, { titulo: "Fim da jornada", corpo: `São ${JOR.fim}. Lembre de encerrar o expediente no app.`, tag: "fim", url: "./" }); await marca(k); out.push(`fim ${t.uid} → ${n}`); }
    }
  }
  // 3b) gestor: técnico que não iniciou o expediente depois da tolerância (um aviso por técnico por dia, juntos numa notificação)
  if (db.gestores && dentro && R.min >= hm(JOR.inicio) + TOL_EXP) {
    const gest = (await db.gestores()).filter((u) => subs.has(u));
    if (gest.length) {
      const ativos = db.cadastrosAtivos ? await db.cadastrosAtivos() : null; const todos = (await db.tecnicos()).filter((t: any) => !ativos || !ativos.size || ativos.has(t.uid));
      const faltam = todos.filter((t: any) => { const meus = exps.filter((e) => e.uid === t.uid); const folga = pls.some((p) => p.uid === t.uid && p.tipo === 'folga' && p.inicio < R.inicioDia + 86400000 && p.fim > R.inicioDia + 9 * 3600000); return !meus.find((e) => !e.fim) && !meus.some((e) => e.inicio >= R.inicioDia) && !folga; });
      const ks = faltam.map((t: any) => `expsup:${t.uid}:${R.ymd}`); const lg = await db.logLer(ks); const novos = faltam.filter((t: any) => !lg.has(`expsup:${t.uid}:${R.ymd}`));
      if (novos.length) {
        const nomes = novos.map((t: any) => (t.dados || {}).nome || "Técnico");
        const msg = { titulo: novos.length === 1 ? `⏰ ${nomes[0]} não iniciou o expediente` : `⏰ ${novos.length} técnicos não iniciaram o expediente`, corpo: `Jornada desde ${JOR.inicio}: ${nomes.slice(0, 6).join(", ")}${nomes.length > 6 ? "…" : ""}. Toque para ver no painel.`, tag: "expsup", url: "./index.html?modo=admin" };
        let n = 0; for (const g of gest) n += await envia(g, msg); for (const t of novos) await db.logGravar(`expsup:${t.uid}:${R.ymd}`, agora); out.push(`expsup ${novos.length} → ${n}`);
      }
    }
  }
  // 4) gestor: técnico com O.S. aberta perto de passar (ou passando) do limite de horas do dia (CLT: 2 h extras → 10 h)
  if (db.gestores && db.emCurso && db.aoVivo) {
    const gest = (await db.gestores()).filter((u) => subs.has(u));
    if (gest.length) {
      const L = db.limiteCfg ? await db.limiteCfg() : { lim: 600, aviso: 30 }; const vivo = new Map((await db.aoVivo()).map((v: any) => [v.uid, v.dados || {}])); const curso = await db.emCurso();
      const nomes = new Map((await db.tecnicos()).map((t: any) => [t.uid, (t.dados || {}).nome || "Técnico"]));
      const abertos = exps.filter((e) => !e.fim && e.inicio >= R.inicioDia - 6 * 3600000);
      const ks: string[] = []; abertos.forEach((e) => ks.push(`lim:${e.uid}:${R.ymd}:a`, `lim:${e.uid}:${R.ymd}:p`)); const lg = await db.logLer(ks);
      for (const e of abertos) {
        const v: any = vivo.get(e.uid) || {}; const atv = curso.find((a) => a.tecnico_uid === e.uid); if (!v.ativo && !atv) continue;
        let ref = 0; for (const r of ((e.dados || {}).refeicoes || [])) if (r && r.ini) ref += Math.min(r.fim || agora, agora) - r.ini;
        const trab = Math.round((agora - +e.inicio - ref) / MIN); const falta = L.lim - trab; if (falta > L.aviso) continue;
        const k = `lim:${e.uid}:${R.ymd}:${falta <= 0 ? "p" : "a"}`; if (lg.has(k)) continue;
        const nome = nomes.get(e.uid) || "Técnico"; const os = v.ticket || (atv && atv.ticket) || "em andamento"; const fh = (m: number) => `${Math.floor(Math.abs(m) / 60)}h${String(Math.abs(m) % 60).padStart(2, "0")}`;
        const msg = { titulo: falta <= 0 ? `⏱️ ${nome} passou do limite de horas` : `⏱️ ${nome} perto do limite de horas`, corpo: `O.S. ${os} aberta · trabalhou ${fh(trab)} hoje · limite ${fh(L.lim)}${falta > 0 ? ` (faltam ${fh(falta)})` : ""}.`, tag: "lim-" + e.uid, url: "./index.html?modo=admin" };
        let n = 0; for (const g of gest) n += await envia(g, msg); await db.logGravar(k, agora); out.push(`lim ${e.uid} → ${n}`);
      }
    }
  }
  // 5) O.S. em andamento sem atualização há 60 min: avisa os gestores a cada hora.
  //    O técnico só é avisado quando o supervisor cobra a atualização (botão "Cobrar atualização" no painel).
  if (db.emCurso) {
    const curso = await db.emCurso(); const gest = db.gestores ? (await db.gestores()).filter((u) => subs.has(u)) : [];
    const ks: string[] = []; const venc: any[] = []; const cob: any[] = [];
    for (const a of curso) {
      const d = a.dados || {}; const ult = +(d.ultAtualiz || d.iniciadaEm || a.atualizado || a.criado) || agora; const min = Math.floor((agora - ult) / MIN);
      if (+d.cobrarAtualizEm && +d.cobrarAtualizEm > (+d.ultAtualiz || 0)) { const kc = `cob:${a.id}:${d.cobrarAtualizEm}`; ks.push(kc); cob.push({ a, kc, por: d.cobrarPor || "O supervisor" }); }
      if (min < 60) continue; const k = `upd:${a.id}:${Math.floor(min / 60)}`; ks.push(k); venc.push({ a, min, k });
    }
    const lg = ks.length ? await db.logLer(ks) : new Map();
    for (const { a, kc, por } of cob) {
      if (lg.has(kc)) continue; let n = 0;
      if (a.tecnico_uid && subs.has(a.tecnico_uid)) n += await envia(a.tecnico_uid, { titulo: `📝 Atualize a O.S. ${a.ticket || ""}`, corpo: `${por} pediu a atualização da O.S. Abra o app e informe a situação.`, tag: "upd-" + a.id, url: "./" });
      await db.logGravar(kc, agora); out.push(`cob ${a.id} → ${n}`);
    }
    for (const { a, min, k } of venc) {
      if (lg.has(k)) continue; const h = `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`; let n = 0;
      for (const g of gest) n += await envia(g, { titulo: `🕐 O.S. ${a.ticket || ""} sem atualização há ${h}`, corpo: `${a.tecnico_nome || "Sem técnico"} · ${a.status === "no_local" ? "no local" : "em deslocamento"} · toque em "Cobrar atualização" no painel`, tag: "upd-" + a.id, url: "./index.html?modo=admin" });
      await db.logGravar(k, agora); out.push(`upd ${a.id} → ${n}`);
    }
  }
  // 6) despacho automático do backlog para técnico livre (só dentro da jornada)
  if (dentro) { try { const nomes = new Map((await db.tecnicos()).map((t: any) => [t.uid, (t.dados || {}).nome || "Técnico"])); out.push(...await despachoAuto(db, agora, nomes)); } catch (e) { console.error("despacho", e); } }
  // 3) aviso 30 min antes do início do plantão
  for (const p of pls) {
    if (p.tipo !== 'plantao' || !subs.has(p.uid) || p.inicio <= agora || p.inicio - agora > 30 * MIN || log.has('pla:' + p.id)) continue;
    const n = await envia(p.uid, { titulo: '📟 Seu plantão começa às ' + hora(p.inicio), corpo: `Plantão até ${hora(p.fim)}${p.obs ? ' · ' + p.obs : ''}. Deixe o celular com som e o app aberto.`, tag: 'pla-' + p.id, url: './' });
    await marca('pla:' + p.id); out.push(`pla ${p.id} → ${n}`);
  }
  return out;
}

function dbSupabase(sb: any): Db {
  return {
    async apoiosAbertos() { const { data, error } = await sb.from("atividades").select("id,tipo,ticket,tecnico_nome,status,endereco,dados,apoio_uids,apoio_st").eq("org", ORG).not("status", "in", "(concluida,cancelada)").neq("apoio_uids", "{}"); if (error) throw error; return data || []; },
    async gestores() { const { data } = await sb.from("admins").select("uid,papel").eq("org", ORG); return (data || []).filter((r: any) => r.papel !== "almoxarife").map((r: any) => r.uid); },
    async emCurso() { const { data } = await sb.from("atividades").select("id,ticket,tipo,tecnico_uid,tecnico_nome,status,atualizado,criado,dados").eq("org", ORG).in("status", ["em_deslocamento", "no_local"]); return data || []; },
    async aoVivo() { const { data } = await sb.from("aovivo").select("uid,dados").eq("org", ORG); return data || []; },
    async limiteCfg() { const { data } = await sb.from("config").select("dados").eq("org", ORG).maybeSingle(); const d = (data && data.dados) || {}; return { lim: +d.limiteDiaMin || 600, aviso: +d.avisoMin || 30 }; },
    async atividadesPendentes() { const { data, error } = await sb.from("atividades").select("id,tipo,ticket,tecnico_uid,status,endereco,log,dados").eq("org", ORG).in("status", ["pendente", "recebida"]).not("tecnico_uid", "is", null); if (error) throw error; return data || []; },
    async tecnicos() { const { data, error } = await sb.from("tecnicos").select("uid,dados").eq("org", ORG); if (error) throw error; return data || []; },
    async cadastrosAtivos() { const { data } = await sb.from("cadastros").select("uid,ativo").eq("org", ORG); return new Set((data || []).filter((c: any) => c.uid && c.ativo !== false).map((c: any) => c.uid)); },
    async expedientesDesde(ts: number) { const { data, error } = await sb.from("expedientes").select("id,uid,inicio,fim,dados").eq("org", ORG).gte("inicio", ts); if (error) throw error; return data || []; },
    async comAssinatura() { const { data, error } = await sb.from("push_subs").select("uid").eq("org", ORG); if (error) throw error; return new Set((data || []).map((r: any) => r.uid)); },
    async logLer(chaves: string[]) { const m = new Map<string, number>(); if (!chaves.length) return m; for (let i = 0; i < chaves.length; i += 200) { const { data } = await sb.from("push_log").select("chave,ts").in("chave", chaves.slice(i, i + 200)); (data || []).forEach((r: any) => m.set(r.chave, +r.ts)); } return m; },
    async logGravar(chave: string, ts: number) { await sb.from("push_log").upsert({ chave, ts }); },
    async despachoCfg() { const { data } = await sb.from("config").select("dados").eq("org", ORG).maybeSingle(); return !(data && data.dados && data.dados.despachoAuto === false); },
    async backlog() { const { data, error } = await sb.from("atividades").select("id,tipo,ticket,criado,lat,lon,status,dados").eq("org", ORG).eq("status", "pendente").is("tecnico_uid", null).neq("tipo", "emergencial").order("criado").limit(200); if (error) throw error; return data || []; },
    async abertasTec() { const { data, error } = await sb.from("atividades").select("id,tipo,ticket,criado,status,tecnico_uid,apoio_uids,dados").eq("org", ORG).in("status", ["pendente", "recebida", "em_deslocamento", "no_local", "pausada"]); if (error) throw error; return data || []; },
    async recursos() { const { data } = await sb.from("recursos").select("*").eq("org", ORG); return data || []; },
    async fiscais() { const { data } = await sb.from("cadastros").select("uid,funcao,ativo").eq("org", ORG); return new Set((data || []).filter((c: any) => c.uid && (c.funcao === "fiscal" || c.ativo === false)).map((c: any) => c.uid)); },
    async atribuir(a: any, uid: string, nome: string, agora: number, nota: string) {
      const d = a.dados || {}; const atu = [...(d.atualizacoes || []), { ts: agora, sit: "auto", txt: nota, por: "Sistema" }].slice(-60);
      const { data, error } = await sb.from("atividades").update({ tecnico_uid: uid, tecnico_nome: nome, atualizado: agora, dados: { ...d, tecnicoUid: uid, tecnicoNome: nome, autoDespachoEm: agora, atualizado: agora, atualizacoes: atu } }).eq("id", a.id).is("tecnico_uid", null).eq("status", "pendente").select("id");
      if (error) throw error; return !!(data && data.length);
    },
    async retomar(a: any, agora: number) {
      const d = a.dados || {}; const atu = [...(d.atualizacoes || []), { ts: agora, sit: "retomar", txt: "Técnico livre: O.S. pausada mais antiga reenviada para ele concluir.", por: "Sistema" }].slice(-60);
      const { data, error } = await sb.from("atividades").update({ status: "pendente", atualizado: agora, dados: { ...d, status: "pendente", vistaEm: null, retomarEm: agora, atualizado: agora, atualizacoes: atu } }).eq("id", a.id).eq("status", "pausada").select("id");
      if (error) throw error; return !!(data && data.length);
    },
    async plantoes(de: number, ate: number) { const { data, error } = await sb.from("plantoes").select("id,uid,tipo,inicio,fim,obs").eq("org", ORG).gte("fim", de).lte("inicio", ate); if (error) throw error; return (data || []).map((p: any) => ({ ...p, inicio: +p.inicio, fim: +p.fim })); },
  };
}
function enviaPush(sb: any): Envia {
  return async (uid, msg) => {
    const { data } = await sb.from("push_subs").select("endpoint,sub").eq("uid", uid);
    let n = 0;
    for (const s of data || []) {
      try { await webpush.sendNotification(s.sub, JSON.stringify(msg), { TTL: 600, urgency: "high" }); n++; }
      catch (e: any) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await sb.from("push_subs").delete().eq("endpoint", s.endpoint); else console.error("push", e && (e.statusCode || e.message)); }
    }
    return n;
  };
}

async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  let ok = !!env("CRON_SECRET") && req.headers.get("x-cron-secret") === env("CRON_SECRET");
  if (!ok) {
    const tok = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (tok) { const { data } = await sb.auth.getUser(tok); if (data && data.user) { const { data: ad } = await sb.from("admins").select("uid").eq("uid", data.user.id).maybeSingle(); ok = !!ad; if (!ok) { const { data: dp } = await sb.from("despachantes").select("uid").eq("uid", data.user.id).maybeSingle(); ok = !!dp; } } }
  }
  if (!ok) return new Response(JSON.stringify({ erro: "não autorizado" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
  if (!env("VAPID_PUBLIC") || !env("VAPID_PRIVATE")) return new Response(JSON.stringify({ erro: "Configure os segredos VAPID_PUBLIC e VAPID_PRIVATE" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  webpush.setVapidDetails(env("VAPID_SUBJECT", "mailto:alertas@multivale.com.br"), env("VAPID_PUBLIC"), env("VAPID_PRIVATE"));
  try { const enviados = await ciclo(dbSupabase(sb), enviaPush(sb)); return new Response(JSON.stringify({ ok: true, enviados }), { headers: { ...CORS, "Content-Type": "application/json" } }); }
  catch (e: any) { console.error(e); return new Response(JSON.stringify({ erro: String(e && e.message || e) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }); }
}

if (!(globalThis as any).__TESTE_ALERTAS__) Deno.serve(handler);
