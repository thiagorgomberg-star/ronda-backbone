// Técnico Plus - Multivale — função "geocode" (Supabase Edge Function)
// Valida o endereço do acionamento para o ponto sair certo no mapa e no mapa de calor.
// Serviço usado (a chave fica só aqui, nos segredos da função, nunca no site):
//   GEOAPIFY_KEY     → Geoapify (grátis, sem cartão: 3.000 consultas/dia) — recomendado
//   GOOGLE_MAPS_KEY  → Google Geocoding (exige conta de faturamento) — opcional
//   sem nenhuma chave → OpenStreetMap (Nominatim), menos preciso no número da casa
// Quem pode chamar: supervisor/gestor (admins) e despachantes. Resposta:
//   { ok, lat, lon, formatado, preciso, nivel, parcial, candidatos[] }  ou  { ok:false, motivo }
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const ORG = env("NUVEM_ORG", "multivale");
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
// área de atendimento (Vale do Paraíba, Litoral Norte/Baixada e Sul de Minas): só puxa o resultado para cá, não exclui
const BOUNDS = "-24.40,-46.90|-21.20,-44.00";
const NIVEL: Record<string, string> = { ROOFTOP: "número exato", RANGE_INTERPOLATED: "número aproximado na rua", GEOMETRIC_CENTER: "centro da rua ou região", APPROXIMATE: "aproximado (bairro ou cidade)" };

const TIPO_GEOAPIFY: Record<string, string> = { building: "número exato", amenity: "local exato", street: "rua (sem o número)", postcode: "CEP", suburb: "bairro", district: "bairro", city: "cidade", county: "município", state: "estado" };
export async function geocodificarGeoapify(endereco: string, key: string, f: typeof fetch = fetch) {
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(endereco)}&filter=countrycode:br&bias=rect:-46.90,-24.40,-44.00,-21.20&lang=pt&limit=4&format=json&apiKey=${key}`;
  const r = await f(url); const j = await r.json();
  if (!r.ok) return { ok: false, motivo: "geoapify", detalhe: (j && (j.message || j.error)) || String(r.status) };
  const res = (j && j.results) || []; if (!res.length) return { ok: false, motivo: "nao_encontrado" };
  const conv = (x: any) => { const rk = x.rank || {}; const exato = (x.result_type === "building" || x.result_type === "amenity") && (rk.confidence ?? 0) >= 0.7; return { lat: x.lat, lon: x.lon, formatado: x.formatted, tipo: exato ? "ROOFTOP" : x.result_type === "street" ? "GEOMETRIC_CENTER" : "APPROXIMATE", nivel: TIPO_GEOAPIFY[x.result_type] || x.result_type, confianca: rk.confidence ?? null }; };
  const c = res.map(conv); const m = c[0];
  return { ok: true, fonte: "geoapify", lat: m.lat, lon: m.lon, formatado: m.formatado, preciso: m.tipo === "ROOFTOP", nivel: m.nivel, confianca: m.confianca, candidatos: c };
}
export async function geocodificar(endereco: string, key: string, f: typeof fetch = fetch) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&components=country:BR&region=br&language=pt-BR&bounds=${encodeURIComponent(BOUNDS)}&key=${key}`;
  const r = await f(url); const j = await r.json();
  if (j.status === "ZERO_RESULTS") return { ok: false, motivo: "nao_encontrado" };
  if (j.status !== "OK") return { ok: false, motivo: "google", detalhe: j.status + (j.error_message ? ": " + j.error_message : "") };
  const conv = (x: any) => ({ lat: x.geometry.location.lat, lon: x.geometry.location.lng, formatado: x.formatted_address, tipo: x.geometry.location_type, parcial: !!x.partial_match });
  const c = j.results.map(conv); const m = c[0];
  return { ok: true, fonte: "google", lat: m.lat, lon: m.lon, formatado: m.formatado, preciso: (m.tipo === "ROOFTOP" || m.tipo === "RANGE_INTERPOLATED") && !m.parcial, nivel: NIVEL[m.tipo] || m.tipo, parcial: m.parcial, candidatos: c.slice(0, 4) };
}

// sem chave cadastrada: usa o OpenStreetMap (Nominatim) pelo servidor, puxando o resultado para a área de atendimento
export async function geocodificarOSM(endereco: string, f: typeof fetch = fetch) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&countrycodes=br&addressdetails=0&viewbox=-46.90,-21.20,-44.00,-24.40&q=${encodeURIComponent(endereco)}`;
  const r = await f(url, { headers: { "User-Agent": "TecnicoPlus-Multivale/1.0 (geocodificacao de acionamentos)", "Accept-Language": "pt-BR" } });
  if (!r.ok) return { ok: false, motivo: "osm", detalhe: String(r.status) };
  const res = await r.json(); if (!Array.isArray(res) || !res.length) return { ok: false, motivo: "nao_encontrado" };
  const conv = (x: any) => { const exato = ["house", "building"].includes(x.addresstype || x.type); return { lat: +x.lat, lon: +x.lon, formatado: x.display_name, tipo: exato ? "ROOFTOP" : (x.addresstype === "road" ? "GEOMETRIC_CENTER" : "APPROXIMATE"), nivel: exato ? "número exato" : x.addresstype === "road" ? "rua (sem o número)" : (x.addresstype || "aproximado") }; };
  const c = res.map(conv); const m = c[0];
  return { ok: true, fonte: "osm", lat: m.lat, lon: m.lon, formatado: m.formatado, preciso: m.tipo === "ROOFTOP", nivel: m.nivel, candidatos: c };
}

async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const geoKey = env("GEOAPIFY_KEY"), gKey = env("GOOGLE_MAPS_KEY");
  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const tok = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""); let ok = false;
  if (tok) { const { data } = await sb.auth.getUser(tok); const u = data && data.user; if (u) {
    const { data: a } = await sb.from("admins").select("uid").eq("uid", u.id).eq("org", ORG).maybeSingle(); ok = !!a;
    if (!ok) { const { data: d } = await sb.from("despachantes").select("uid").eq("uid", u.id).eq("org", ORG).maybeSingle(); ok = !!d; } } }
  if (!ok) return json({ ok: false, motivo: "nao_autorizado" }, 401);
  const body = await req.json().catch(() => ({})); const end = String(body.endereco || "").trim().slice(0, 300);
  if (!end) return json({ ok: false, motivo: "sem_endereco" }, 400);
  try { return json(geoKey ? await geocodificarGeoapify(end, geoKey) : gKey ? await geocodificar(end, gKey) : await geocodificarOSM(end)); } catch (e) { return json({ ok: false, motivo: "erro", detalhe: String(e) }, 500); }
}
if (!(globalThis as any).__TESTE_GEOCODE__) Deno.serve(handler);
