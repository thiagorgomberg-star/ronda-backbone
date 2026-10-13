// Rotina diária de manutenção (chamada pelo agendamento do banco com o cabeçalho x-cron-secret):
//  • Telegram: registra o webhook do bot com o segredo atual (idempotente) e anota o último erro.
//  • Backup: uma vez por semana grava uma cópia de todas as tabelas no Storage privado "backups"
//    (arquivo .json.gz) e mantém só as 8 mais recentes. O painel mostra o último backup automático.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const ORG = "multivale";
const MANTER = 8;
const DIAS_ENTRE = 6.5;
const env = (k: string) => Deno.env.get(k) || "";
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

export async function segredoTelegram(bruto: string) {
  if (!bruto) return "";
  if (/^[A-Za-z0-9_-]{1,256}$/.test(bruto)) return bruto;
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bruto));
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function telegram() {
  const token = env("TELEGRAM_BOT_TOKEN"), segredo = await segredoTelegram(env("TELEGRAM_WEBHOOK_SECRET"));
  if (!token || !segredo) return { telegram: "sem segredos do bot" };
  const api = async (m: string, corpo: unknown = {}) => { const r = await fetch(`https://api.telegram.org/bot${token}/${m}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }); const j = await r.json(); if (!j.ok) throw new Error(`${m}: ${j.description || r.status}`); return j.result; };
  const url = `${env("SUPABASE_URL")}/functions/v1/telegram`;
  const info = await api("getWebhookInfo");
  // registra sempre (é idempotente): garante que o segredo em uso é o atual
  await api("setWebhook", { url, secret_token: segredo, allowed_updates: ["message", "callback_query"], drop_pending_updates: false });
  return { telegram: "webhook registrado", ultimoErro: info.last_error_message || null, urlAntes: info.url === url ? "igual" : info.url || "(vazia)" };
}

async function gzip(txt: string) {
  const s = new Blob([txt]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

async function backup(sb: any, forcar: boolean) {
  const { data: lista, error: eL } = await sb.storage.from("backups").list("", { limit: 100, sortBy: { column: "name", order: "desc" } });
  if (eL) throw new Error("listar backups: " + eL.message);
  const arqs = (lista || []).filter((f: any) => /\.json\.gz$/.test(f.name)).sort((a: any, b: any) => b.name.localeCompare(a.name));
  const ult = arqs[0] ? Date.parse(arqs[0].created_at || 0) : 0;
  if (!forcar && ult && Date.now() - ult < DIAS_ENTRE * 86400000) return { backup: "em dia", ultimo: arqs[0].name };
  const { data: dump, error } = await sb.rpc("backup_dump"); if (error) throw new Error("backup_dump: " + error.message);
  const linhas = Object.values(dump || {}).reduce((a: number, v: any) => a + (Array.isArray(v) ? v.length : 0), 0);
  const nome = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".json.gz";
  const corpo = await gzip(JSON.stringify({ gerado_em: new Date().toISOString(), org: ORG, tabelas: dump }));
  const { error: eU } = await sb.storage.from("backups").upload(nome, corpo, { contentType: "application/gzip", upsert: true }); if (eU) throw new Error("gravar backup: " + eU.message);
  const velhos = [{ name: nome }, ...arqs].slice(MANTER).map((f: any) => f.name);
  if (velhos.length) await sb.storage.from("backups").remove(velhos);
  // registra no config para o painel mostrar
  const { data: cfg } = await sb.from("config").select("dados").eq("org", ORG).maybeSingle();
  const dados = (cfg && cfg.dados) || {};
  const auto = [...(dados.backupsAuto || []), { em: Date.now(), arquivo: nome, linhas, bytes: corpo.length }].slice(-MANTER);
  await sb.from("config").update({ dados: { ...dados, backupsAuto: auto } }).eq("org", ORG);
  return { backup: "gravado", arquivo: nome, linhas, bytes: corpo.length, removidos: velhos.length };
}

export async function handler(req: Request) {
  if (!env("CRON_SECRET") || req.headers.get("x-cron-secret") !== env("CRON_SECRET")) return json({ erro: "não autorizado" }, 401);
  const body = await req.json().catch(() => ({}));
  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const out: Record<string, unknown> = {};
  try { Object.assign(out, await telegram()); } catch (e: any) { console.error(e); out.telegram = "falhou: " + (e && e.message || e); }
  try { Object.assign(out, await backup(sb, !!body.forcarBackup)); } catch (e: any) { console.error(e); out.backup = "falhou: " + (e && e.message || e); }
  console.log(JSON.stringify(out));
  return json(out);
}

if (!(globalThis as any).__TESTE_MANUT__) Deno.serve(handler);
