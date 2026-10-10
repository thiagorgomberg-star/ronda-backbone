// Ronda Backbone Multivale — função "telegram" (Supabase Edge Function)
//  • acao "enviar": o painel manda um lote de O.S. para a medição. Para cada O.S. a função
//    cria um tópico no grupo do Telegram, publica os dados e os itens da LPU com o botão
//    "✅ O.S MEDIDA" e, no fim, envia a planilha do lote.
//  • acao "conectar": registra o webhook do bot (feito pelo botão "Conectar Telegram" do painel).
//  • webhook do Telegram: "/vincular" no grupo liga o grupo ao sistema; o botão "O.S MEDIDA"
//    grava a O.S. como medida no banco.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const ORG = env("NUVEM_ORG", "multivale");
const TZ = "America/Sao_Paulo";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const brl = (v: number) => (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const qtd = (v: number) => (+v || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const dh = (ts: number) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
const h = (t: unknown) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type Tg = (metodo: string, corpo: Record<string, unknown> | FormData) => Promise<any>;
export type Db = {
  eventos(ids: string[]): Promise<any[]>;
  medicoes(ids: string[]): Promise<Map<string, any>>;
  gravarMedicao(row: Record<string, unknown>): Promise<void>;
  telegramCfg(): Promise<any>;
  salvarTelegramCfg(cfg: any): Promise<void>;
};

// Corretiva da Claro: só o SERVIÇO entra no valor; material é só consumo de estoque.
export const claroCorretiva = (d: any) => d.tipo === "corretiva" && (/claro/i.test(String((d.corr && d.corr.cliente) || "")) || (!!d.info && d.info.dono === "parceiro" && /claro/i.test(String(d.info.parceiro || ""))));
export const ehMaterial = (x: any) => x.t ? x.t === "M" : String(x.c || "").split(".").length >= 3;
export function resumoOS(e: any) {
  const d = e.dados || e; const so = claroCorretiva(d);
  const itens = (d.lpu || []).map((x: any) => { const est = so && ehMaterial(x); const q = +x.q || 0, v = +x.v || 0; return { c: x.c, d: x.d, u: x.u, q, v, t: est ? 0 : q * v, ...(est ? { est: true } : {}) }; });
  const valor = itens.reduce((a: number, x: any) => a + x.t, 0);
  const tipo = d.tipo === "corretiva" ? "Corretiva" : d.tipo === "implantacao" ? "Implantação" : d.tipo === "vistoria" ? "Vistoria" : "Preventiva";
  const os = (d.corr && d.corr.ticket) || (d.impl && d.impl.designacao) || (d.info && d.info.tag) || d.id;
  const info = d.info || {};
  return { id: d.id, os, tipo, valor, itens, data: d.chegada || d.criado, tecnico: info.tecnico || d._tecnico || "", matricula: d._matricula || "", endereco: [info.endereco, info.bairro, info.cidade].filter(Boolean).join(", "), ocorrencia: (d.corr && d.corr.ocorrencia) || "", servico: (d.impl && d.impl.servico) || "", uid: d._uid, claro: so };
}
export function textoOS(r: ReturnType<typeof resumoOS>) {
  return [`<b>O.S ${h(r.os)}</b> · ${h(r.tipo)}${r.ocorrencia ? " · " + h(r.ocorrencia) : ""}`, `Data: ${dh(r.data)} · Técnico: ${h(r.tecnico)}${r.matricula ? " (" + h(r.matricula) + ")" : ""}`, r.endereco ? `Endereço: ${h(r.endereco)}` : "", "", r.claro ? "<i>Corretiva Claro: só serviço entra no valor; material é consumo de estoque.</i>" : "", "<b>Itens da LPU</b>",
    ...r.itens.filter((x: any) => !x.est).map((x: any) => `${h(x.c)} ${h(x.d)} — ${qtd(x.q)} ${h(x.u)} × ${brl(x.v)} = <b>${brl(x.t)}</b>`),
    ...(r.itens.some((x: any) => x.est) ? ["", "<b>Material (consumo de estoque, sem valor)</b>", ...r.itens.filter((x: any) => x.est).map((x: any) => `${h(x.c)} ${h(x.d)} — ${qtd(x.q)} ${h(x.u)}`)] : []), "", `<b>Valor da O.S: ${brl(r.valor)}</b>`].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n").slice(0, 4000);
}
export function planilhaLote(rs: ReturnType<typeof resumoOS>[]) {
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`; const n = (v: number) => (+v || 0).toFixed(2).replace(".", ",");
  const linhas = [["Data", "O.S", "Tipo", "Técnico", "Matrícula", "Endereço", "Ocorrência / serviço", "Valor da O.S", "Itens LPU (código x quantidade)", "Material de estoque (código x quantidade)"].join(";"),
    ...rs.map((r) => [dh(r.data), q(r.os), r.tipo, q(r.tecnico), q(r.matricula), q(r.endereco), q(r.ocorrencia || r.servico), n(r.valor), q(r.itens.filter((x: any) => !x.est).map((x: any) => `${x.c} x ${qtd(x.q)}`).join("; ")), q(r.itens.filter((x: any) => x.est).map((x: any) => `${x.c} x ${qtd(x.q)}`).join("; "))].join(";")),
    ["", "", "", "", "", "", "TOTAL", n(rs.reduce((a, r) => a + r.valor, 0)), "", ""].join(";")];
  return "﻿" + linhas.join("\r\n");
}

export async function enviarLote(db: Db, tg: Tg, ids: string[], por: string, agora = Date.now()) {
  const cfg = await db.telegramCfg(); if (!cfg || !cfg.chatId) throw new Error("Grupo do Telegram não vinculado. No grupo, envie /vincular.");
  const evs = await db.eventos(ids); const meds = await db.medicoes(ids); const lote = "L" + new Date(agora).toISOString().slice(0, 16).replace(/\D/g, "");
  const ok: any[] = [], erros: any[] = [];
  for (const e of evs) {
    const r = resumoOS(e); const m = meds.get(r.id) || {};
    if (m.status === "medida") { erros.push({ id: r.id, erro: "já medida" }); continue; }
    try {
      let thread: number | null = m.tg_thread || null;
      if (!thread && cfg.forum) { const t = await tg("createForumTopic", { chat_id: cfg.chatId, name: `O.S ${r.os} · ${r.tecnico} · ${brl(r.valor)}`.slice(0, 128), icon_color: 0x6FB9F0 }); thread = t && t.message_thread_id; }
      const msg = await tg("sendMessage", { chat_id: cfg.chatId, ...(thread ? { message_thread_id: thread } : {}), text: textoOS(r), parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ O.S MEDIDA", callback_data: "medida:" + r.id }]] } });
      await db.gravarMedicao({ id: r.id, org: ORG, uid: r.uid || null, status: "enviada", valor: +r.valor.toFixed(2), itens: r.itens, dados: { os: r.os, tipo: r.tipo, tecnico: r.tecnico, endereco: r.endereco, claro: r.claro }, enviado_em: agora, enviado_por: por, lote, tg_chat: String(cfg.chatId), tg_thread: thread, tg_msg: msg && msg.message_id, atualizado: agora });
      ok.push({ id: r.id, os: r.os, valor: r.valor });
    } catch (x: any) { erros.push({ id: r.id, erro: String(x && x.message || x) }); }
  }
  if (ok.length) {
    const rs = evs.map(resumoOS).filter((r) => ok.some((o) => o.id === r.id)); const total = rs.reduce((a, r) => a + r.valor, 0);
    const fd = new FormData(); fd.append("chat_id", String(cfg.chatId)); if (cfg.threadLotes) fd.append("message_thread_id", String(cfg.threadLotes));
    fd.append("caption", `📦 Lote ${lote} · ${rs.length} O.S · ${brl(total)} · enviado por ${por}`.slice(0, 1000));
    fd.append("document", new Blob([planilhaLote(rs)], { type: "text/csv" }), `medicao_${lote}.csv`);
    try { await tg("sendDocument", fd); } catch (x: any) { erros.push({ id: "planilha", erro: String(x && x.message || x) }); }
  }
  return { lote, enviados: ok, erros };
}

export async function tratarUpdate(db: Db, tg: Tg, upd: any, agora = Date.now()) {
  const permitidos = env("TELEGRAM_MEDIDORES").split(",").map((s) => s.trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
  if (upd.message && typeof upd.message.text === "string" && /^\/vincular/.test(upd.message.text)) {
    const c = upd.message.chat; const cfg = { chatId: c.id, titulo: c.title || "", forum: !!c.is_forum, vinculadoEm: agora, threadLotes: upd.message.message_thread_id || null };
    await db.salvarTelegramCfg(cfg);
    await tg("sendMessage", { chat_id: c.id, ...(upd.message.message_thread_id ? { message_thread_id: upd.message.message_thread_id } : {}), text: `✅ Grupo vinculado ao Ronda Backbone.${cfg.forum ? " Cada O.S. enviada para medição vai abrir um tópico aqui." : " Ative os Tópicos do grupo para cada O.S. ter o seu tópico."}` });
    return "vinculado";
  }
  const cb = upd.callback_query; if (!cb || !/^medida:/.test(cb.data || "")) return "ignorado";
  const id = cb.data.slice(7); const quem = cb.from && (cb.from.username ? "@" + cb.from.username : [cb.from.first_name, cb.from.last_name].filter(Boolean).join(" ")) || "medição";
  if (permitidos.length && !permitidos.includes(String(cb.from && cb.from.username || "").toLowerCase()) && !permitidos.includes(String(cb.from && cb.from.id))) { await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Você não está autorizado a marcar O.S como medida.", show_alert: true }); return "negado"; }
  const m = (await db.medicoes([id])).get(id);
  if (m && m.status === "medida") { await tg("answerCallbackQuery", { callback_query_id: cb.id, text: `Esta O.S já foi medida por ${m.medido_por || "outra pessoa"}.` }); return "repetido"; }
  await db.gravarMedicao({ id, org: ORG, status: "medida", medido_em: agora, medido_por: quem, atualizado: agora });
  await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "O.S marcada como MEDIDA ✅" });
  if (cb.message) { try { await tg("editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: (cb.message.text ? h(cb.message.text) : "O.S") + `\n\n✅ <b>MEDIDA</b> por ${h(quem)} em ${dh(agora)}`, parse_mode: "HTML" }); } catch (_) { /* mensagem antiga */ } }
  if (env("TELEGRAM_FECHAR_TOPICO") === "sim" && cb.message && cb.message.message_thread_id) { try { await tg("closeForumTopic", { chat_id: cb.message.chat.id, message_thread_id: cb.message.message_thread_id }); } catch (_) { /* sem permissão */ } }
  return "medida";
}

function dbSupabase(sb: any): Db {
  return {
    async eventos(ids) { const { data, error } = await sb.from("eventos").select("id,uid,dados").eq("org", ORG).in("id", ids); if (error) throw error; return data || []; },
    async medicoes(ids) {
      const m = new Map(); if (!ids.length) return m;
      // O.S. já arquivada (medida) conta como medida: não reenvia nem regrava.
      const { data: arq } = await sb.from("os_medidas").select("id,medido_em,medido_por").in("id", ids); (arq || []).forEach((r: any) => m.set(r.id, { ...r, status: "medida" }));
      const { data } = await sb.from("medicoes").select("*").in("id", ids); (data || []).forEach((r: any) => m.set(r.id, r)); return m;
    },
    async gravarMedicao(row) { const { error } = await sb.from("medicoes").upsert(row); if (error) throw error; },
    async telegramCfg() { const { data } = await sb.from("config").select("dados").eq("org", ORG).maybeSingle(); return data && data.dados && data.dados.telegram; },
    async salvarTelegramCfg(cfg) { const { data } = await sb.from("config").select("dados").eq("org", ORG).maybeSingle(); const d = (data && data.dados) || {}; d.telegram = cfg; await sb.from("config").upsert({ org: ORG, dados: d }); },
  };
}
function tgReal(token: string): Tg {
  return async (metodo, corpo) => {
    const r = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, corpo instanceof FormData ? { method: "POST", body: corpo } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const j = await r.json(); if (!j.ok) throw new Error(`Telegram ${metodo}: ${j.description || r.status}`); return j.result;
  };
}

async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const token = env("TELEGRAM_BOT_TOKEN"); if (!token) return json({ erro: "Configure o segredo TELEGRAM_BOT_TOKEN" }, 500);
  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const db = dbSupabase(sb), tg = tgReal(token);
  const segredo = env("TELEGRAM_WEBHOOK_SECRET");
  if (req.headers.get("x-telegram-bot-api-secret-token")) {
    if (!segredo || req.headers.get("x-telegram-bot-api-secret-token") !== segredo) return new Response("forbidden", { status: 403 });
    try { await tratarUpdate(db, tg, await req.json()); } catch (e) { console.error(e); }
    return new Response("ok");
  }
  const tok = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""); let admin: any = null;
  if (tok) { const { data } = await sb.auth.getUser(tok); if (data && data.user) { const { data: ad } = await sb.from("admins").select("uid,nome,papel").eq("uid", data.user.id).eq("org", ORG).maybeSingle(); admin = ad; } }
  if (!admin) return json({ erro: "não autorizado" }, 401);
  const body = await req.json().catch(() => ({}));
  try {
    if (body.acao === "conectar") {
      if (!segredo) return json({ erro: "Configure o segredo TELEGRAM_WEBHOOK_SECRET" }, 500);
      await tg("setWebhook", { url: `${env("SUPABASE_URL")}/functions/v1/telegram`, secret_token: segredo, allowed_updates: ["message", "callback_query"] });
      const me = await tg("getMe", {}); const cfg = await db.telegramCfg();
      return json({ ok: true, bot: me.username, grupo: cfg ? cfg.titulo : null, forum: cfg ? cfg.forum : null });
    }
    if (body.acao === "enviar") { const ids = (body.ids || []).map(String).slice(0, 200); if (!ids.length) return json({ erro: "nenhuma O.S" }, 400); return json(await enviarLote(db, tg, ids, admin.nome || "supervisor")); }
    return json({ erro: "ação desconhecida" }, 400);
  } catch (e: any) { console.error(e); return json({ erro: String(e && e.message || e) }, 500); }
}

if (!(globalThis as any).__TESTE_TELEGRAM__) Deno.serve(handler);
