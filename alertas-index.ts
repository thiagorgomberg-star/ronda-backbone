// Ronda Backbone Multivale — função "alertas" (Supabase Edge Function)
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

type Envia = (uid: string, msg: Record<string, unknown>) => Promise<number>;
type Db = {
  atividadesPendentes(): Promise<any[]>;
  tecnicos(): Promise<any[]>;
  expedientesDesde(ts: number): Promise<any[]>;
  comAssinatura(): Promise<Set<string>>;
  logLer(chaves: string[]): Promise<Map<string, number>>;
  logGravar(chave: string, ts: number): Promise<void>;
  plantoes(de: number, ate: number): Promise<any[]>;
};

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
  const pend = (await db.atividadesPendentes()).filter((a) => a.tecnico_uid && subs.has(a.tecnico_uid));
  pend.forEach((a) => chaves.push("atv:" + a.id));
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
    const d = a.dados || {}; const em = a.tipo === "emergencial"; const impl = a.tipo === "implantacao";
    const titulo = `${em ? "🚨 EMERGENCIAL" : impl ? "Nova implantação" : "Nova preventiva"} · ${a.ticket || ""}${a.log >= 2 ? ` · LOG ${a.log}` : ""}`;
    const corpo = [d.ocorrencia, d.designacao, a.endereco || d.refLocal, "Toque para abrir e iniciar o deslocamento."].filter(Boolean).join(" · ");
    const n = await envia(a.tecnico_uid, { titulo, corpo, tag: "atv-" + a.id, url: "./" });
    await marca(k); out.push(`atv ${a.id} → ${n}`);
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
    async atividadesPendentes() { const { data, error } = await sb.from("atividades").select("id,tipo,ticket,tecnico_uid,status,endereco,log,dados").eq("org", ORG).in("status", ["pendente", "recebida"]).not("tecnico_uid", "is", null); if (error) throw error; return data || []; },
    async tecnicos() { const { data, error } = await sb.from("tecnicos").select("uid,dados").eq("org", ORG); if (error) throw error; return data || []; },
    async expedientesDesde(ts: number) { const { data, error } = await sb.from("expedientes").select("id,uid,inicio,fim,dados").eq("org", ORG).gte("inicio", ts); if (error) throw error; return data || []; },
    async comAssinatura() { const { data, error } = await sb.from("push_subs").select("uid").eq("org", ORG); if (error) throw error; return new Set((data || []).map((r: any) => r.uid)); },
    async logLer(chaves: string[]) { const m = new Map<string, number>(); if (!chaves.length) return m; for (let i = 0; i < chaves.length; i += 200) { const { data } = await sb.from("push_log").select("chave,ts").in("chave", chaves.slice(i, i + 200)); (data || []).forEach((r: any) => m.set(r.chave, +r.ts)); } return m; },
    async logGravar(chave: string, ts: number) { await sb.from("push_log").upsert({ chave, ts }); },
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
    if (tok) { const { data } = await sb.auth.getUser(tok); if (data && data.user) { const { data: ad } = await sb.from("admins").select("uid").eq("uid", data.user.id).maybeSingle(); ok = !!ad; } }
  }
  if (!ok) return new Response(JSON.stringify({ erro: "não autorizado" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
  if (!env("VAPID_PUBLIC") || !env("VAPID_PRIVATE")) return new Response(JSON.stringify({ erro: "Configure os segredos VAPID_PUBLIC e VAPID_PRIVATE" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  webpush.setVapidDetails(env("VAPID_SUBJECT", "mailto:alertas@multivale.com.br"), env("VAPID_PUBLIC"), env("VAPID_PRIVATE"));
  try { const enviados = await ciclo(dbSupabase(sb), enviaPush(sb)); return new Response(JSON.stringify({ ok: true, enviados }), { headers: { ...CORS, "Content-Type": "application/json" } }); }
  catch (e: any) { console.error(e); return new Response(JSON.stringify({ erro: String(e && e.message || e) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }); }
}

if (!(globalThis as any).__TESTE_ALERTAS__) Deno.serve(handler);
