// Técnico Plus - Multivale — função "acesso" (Supabase Edge Function)
// Contas sem login anônimo e portal do parceiro. Usa a chave de serviço que o Supabase já
// injeta na função (SUPABASE_SERVICE_ROLE_KEY); nenhuma chave fica no site.
// Na criação da função: DESLIGUE "Verify JWT" (o primeiro acesso do técnico chega sem login);
// a própria função confere quem está chamando em cada ação.
//
// Ações (POST { acao, ... }):
//   ativar          { codigo, senha }        técnico, sem login: cria a senha a partir do convite
//   senha_temp      { cad_id }               supervisor: gera uma senha provisória para o técnico
//   criar_parceiro  { nome, email, cliente } gestor/supervisor: cria o acesso do parceiro
//   parceiro_senha  { uid }                  gestor/supervisor: nova senha do parceiro
//   parceiro_dados  { de, ate }              parceiro logado: O.S. do cliente dele
//   parceiro_fotos  { id }                   parceiro logado: links das fotos de uma O.S. (1 hora)
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const ORG = env("NUVEM_ORG", "multivale");
const DOMINIO = env("LOGIN_DOMINIO", "tecnicoplus.app");
const BUCKET = "fotos";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// ---------- regras puras (testadas) ----------
export const MINI: Record<string, [string, string]> = { implantacao: ["Implantação", "ddd11"], sjc: ["São José dos Campos", "ddd12"], taubate: ["Taubaté", "ddd12"], litoral: ["Litoral", "ddd12"], santos: ["Santos", "ddd13"], sulminas: ["Sul de Minas", "mg"] };
export const CLUSTERS: Record<string, string> = { ddd11: "Cluster DDD11", ddd12: "Cluster DDD12", ddd13: "Cluster DDD13", mg: "Cluster MG" };
const limpa = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
// login do técnico: a matrícula ("m" + matrícula); sem matrícula, o código do convite
export function loginDe(c: { id: string; matricula?: string | null }) { const m = limpa(c.matricula); return m ? "m" + m : limpa(c.id); }
export const emailDe = (login: string, org = ORG) => `${limpa(login)}@${limpa(org)}.${DOMINIO}`;
export function senhaOk(s: unknown) { const t = String(s ?? ""); return t.length >= 6 && t.length <= 72; }
export function senhaProvisoria(n = 6) { const a = new Uint32Array(n); crypto.getRandomValues(a); return [...a].map((x) => String(x % 10)).join(""); }
// a O.S. é do parceiro? (Claro, Master ou outro nome cadastrado)
export function doCliente(textos: unknown[], cliente: string) { const c = limpa(cliente); if (!c) return false; return textos.some((t) => limpa(t).includes(c)); }
// cluster da O.S. pela cidade do endereço (DDD local) — mesma regra do app; ajustes do gestor vêm de config.dados.cidades
const CID_DDD12 = ["Aparecida", "Arapeí", "Areias", "Bananal", "Caçapava", "Cachoeira Paulista", "Campos do Jordão", "Canas", "Caraguatatuba", "Cruzeiro", "Cunha", "Guaratinguetá", "Igaratá", "Ilhabela", "Jacareí", "Jambeiro", "Lagoinha", "Lavrinhas", "Lorena", "Monteiro Lobato", "Natividade da Serra", "Paraibuna", "Pindamonhangaba", "Piquete", "Potim", "Queluz", "Redenção da Serra", "Roseira", "Santa Branca", "Santo Antônio do Pinhal", "São Bento do Sapucaí", "São José do Barreiro", "São José dos Campos", "São Luiz do Paraitinga", "São Sebastião", "Silveiras", "Taubaté", "Tremembé", "Ubatuba"];
const CID_DDD13 = ["Barra do Turvo", "Bertioga", "Cajati", "Cananéia", "Cubatão", "Eldorado", "Guarujá", "Iguape", "Ilha Comprida", "Itanhaém", "Itariri", "Jacupiranga", "Juquiá", "Miracatu", "Mongaguá", "Pariquera-Açu", "Pedro de Toledo", "Peruíbe", "Praia Grande", "Registro", "Santos", "São Vicente", "Sete Barras"];
const nCid = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
export function mapaCidades(ajustes: any[] = []) { const m = new Map<string, string>(); CID_DDD12.forEach((c) => m.set(nCid(c), "ddd12")); CID_DDD13.forEach((c) => m.set(nCid(c), "ddd13")); (ajustes || []).forEach((x) => { if (x && x.cidade && CLUSTERS[x.cluster]) m.set(nCid(x.cidade), x.cluster); }); return m; }
export function clusterTexto(m: Map<string, string>, ...txts: unknown[]) {
  let uf = "";
  for (const t of txts.filter(Boolean)) { const s = String(t); const u = s.match(/(?:\s-\s|\/|,\s*)(SP|MG|RJ|PR)\b/) || s.match(/\b(S[aã]o Paulo|Minas Gerais)\b/i); if (u && !uf) uf = /mg|minas/i.test(u[1]) ? "MG" : /sp|paulo/i.test(u[1]) ? "SP" : u[1].toUpperCase();
    for (const p of s.split(/,|\s-\s|\//).map(nCid).filter(Boolean).reverse()) { const k = m.get(p); if (k) return k; } }
  return uf === "MG" ? "mg" : uf === "SP" ? "ddd11" : "";
}
export function clusterTec(uid: string, cads: Map<string, any>, recs: Map<string, any>, tecs: Map<string, any>) {
  const c = cads.get(uid); if (c && c.centro_custo) return c.centro_custo;
  const r = recs.get(uid); if (r && r.cluster) return r.cluster; if (r && r.regiao && MINI[r.regiao]) return MINI[r.regiao][1];
  const t = tecs.get(uid) || {}; if (t.cluster) return t.cluster; if (t.regiao && MINI[t.regiao]) return MINI[t.regiao][1];
  return "";
}
const ST_ATV: Record<string, string> = { pendente: "Aberta", recebida: "Recebida pelo técnico", em_deslocamento: "Em deslocamento", no_local: "No local", concluida: "Concluída", cancelada: "Cancelada" };
// linha do portal a partir de uma O.S. executada (evento) e, se houver, da atividade com o mesmo ticket
export function linhaEvento(e: any, atv: any, cluster: string, mostrarTec: boolean) {
  const d = e.dados || {}; const info = d.info || {}; const corr = d.corr || {}; const ad = (atv && atv.dados) || {};
  const ticket = corr.ticket || (d.impl && d.impl.designacao) || info.tag || "";
  const criado = (atv && +atv.criado) || null, chegada = d.chegada || null, fim = d.saida || null;
  return { id: e.id, origem: "os", tipo: d.tipo === "corretiva" ? "Corretiva" : d.tipo === "implantacao" ? "Implantação" : d.tipo === "vistoria" ? "Vistoria" : "Preventiva", ticket, status: d.status === "concluida" ? "Concluída" : "Em execução",
    endereco: info.endereco || (atv && atv.endereco) || "", cidade: info.cidade || ad.cidade || "", bairro: info.bairro || "", node: ad.node || corr.node || "", cluster, clusterNome: CLUSTERS[cluster] || "",
    tecnico: mostrarTec ? String(info.tecnico || "").split(" ")[0] : "", criado, chegada, fim, tempoChegadaMin: criado && chegada && chegada > criado ? Math.round((chegada - criado) / 60000) : null, tempoTotalMin: (criado || chegada) && fim ? Math.round((fim - (criado || chegada)) / 60000) : null,
    ocorrencia: corr.ocorrencia || ad.ocorrencia || "", problema: corr.problema || "", causa: corr.causa || "", servico: corr.servico || "", lat: d.loc ? d.loc.lat : (atv ? atv.lat : null), lon: d.loc ? d.loc.lon : (atv ? atv.lon : null), fotos: (d.fotos || []).filter((f: any) => f && f.path).length };
}
export function linhaAtividade(a: any, cluster: string, mostrarTec: boolean) {
  const ad = a.dados || {};
  return { id: a.id, origem: "atividade", tipo: a.tipo === "emergencial" ? "Corretiva" : a.tipo === "preventiva" ? "Preventiva" : String(a.tipo || "Atividade"), ticket: a.ticket || "", status: ST_ATV[a.status] || a.status,
    endereco: a.endereco || "", cidade: ad.cidade || "", bairro: ad.bairro || "", node: ad.node || "", cluster, clusterNome: CLUSTERS[cluster] || "", tecnico: mostrarTec ? String(a.tecnico_nome || "").split(" ")[0] : "",
    criado: +a.criado || null, chegada: null, fim: null, tempoChegadaMin: null, tempoTotalMin: null, ocorrencia: ad.ocorrencia || "", problema: "", causa: "", servico: "", lat: a.lat, lon: a.lon, fotos: 0 };
}

// ---------- quem está chamando ----------
async function quem(sb: any, req: Request) {
  const tok = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""); if (!tok) return null;
  const { data } = await sb.auth.getUser(tok); const u = data && data.user; if (!u || u.is_anonymous) return null;
  const { data: a } = await sb.from("admins").select("uid, nome, papel").eq("uid", u.id).eq("org", ORG).maybeSingle();
  if (a) return { u, papel: a.papel || "supervisor", nome: a.nome };
  const { data: p } = await sb.from("parceiros").select("*").eq("uid", u.id).eq("org", ORG).maybeSingle();
  if (p && p.ativo !== false) return { u, papel: "parceiro", parceiro: p };
  return { u, papel: "outro" };
}
const todos = async (q: () => any) => { const out: any[] = []; for (let de = 0; ; de += 1000) { const { data, error } = await q().range(de, de + 999); if (error) throw error; out.push(...(data || [])); if (!data || data.length < 1000) return out; } };

export async function handler(req: Request, sbFab = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } })) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const sb: any = sbFab(); const b: any = await req.json().catch(() => ({})); const acao = String(b.acao || "");
  try {
    if (acao === "ativar") {
      const codigo = String(b.codigo || "").trim().toUpperCase(); if (!codigo) return json({ ok: false, motivo: "Informe o código do convite." }, 400);
      if (!senhaOk(b.senha)) return json({ ok: false, motivo: "A senha precisa ter de 6 a 72 caracteres." }, 400);
      const { data: c } = await sb.from("cadastros").select("*").eq("id", codigo).eq("org", ORG).maybeSingle();
      if (!c || c.ativo === false) return json({ ok: false, motivo: "Convite não encontrado ou desativado." }, 404);
      let login = loginDe(c); let email = emailDe(login);
      const { data: dup } = await sb.from("cadastros").select("id").eq("login_email", email).neq("id", c.id).limit(1); if (dup && dup.length) { login = limpa(c.id); email = emailDe(login); }
      let uid = c.uid as string | null;
      if (uid) { // já tinha celular: se for o login anônimo antigo, vira conta com senha (mantém o histórico)
        const { data: ex } = await sb.auth.admin.getUserById(uid); const u = ex && ex.user;
        if (u && !u.is_anonymous && u.email && c.login_email) return json({ ok: false, motivo: "Este convite já foi ativado. Peça uma nova senha ao supervisor." }, 409);
        if (u) { const { error } = await sb.auth.admin.updateUserById(uid, { email, password: b.senha, email_confirm: true }); if (error) throw error; } else uid = null;
      }
      if (!uid) { const { data: cr, error } = await sb.auth.admin.createUser({ email, password: b.senha, email_confirm: true, user_metadata: { nome: c.nome } }); if (error) throw error; uid = cr.user.id; }
      await sb.from("cadastros").update({ uid: null }).eq("uid", uid).neq("id", c.id);
      const { error: e2 } = await sb.from("cadastros").update({ uid, login_email: email, resgatado_em: c.resgatado_em || new Date().toISOString() }).eq("id", c.id); if (e2) throw e2;
      return json({ ok: true, login, email, nome: c.nome });
    }
    const q = await quem(sb, req); if (!q) return json({ ok: false, motivo: "Entre com seu login." }, 401);
    const adm = q.papel === "supervisor" || q.papel === "gestor";
    if (acao === "senha_temp") {
      if (!adm) return json({ ok: false, motivo: "Só o painel pode gerar senha." }, 403);
      const { data: c } = await sb.from("cadastros").select("*").eq("id", String(b.cad_id || "")).eq("org", ORG).maybeSingle();
      if (!c) return json({ ok: false, motivo: "Cadastro não encontrado." }, 404); if (!c.uid || !c.login_email) return json({ ok: false, motivo: "Este colaborador ainda não ativou o convite: envie o convite." }, 409);
      const senha = senhaProvisoria(); const { error } = await sb.auth.admin.updateUserById(c.uid, { password: senha }); if (error) throw error;
      return json({ ok: true, senha, login: c.login_email.split("@")[0] });
    }
    if (acao === "criar_parceiro" || acao === "parceiro_senha") {
      if (!adm) return json({ ok: false, motivo: "Só o painel pode cadastrar parceiros." }, 403);
      const senha = senhaProvisoria(8);
      if (acao === "parceiro_senha") { const { data: p } = await sb.from("parceiros").select("uid").eq("uid", String(b.uid || "")).eq("org", ORG).maybeSingle(); if (!p) return json({ ok: false, motivo: "Parceiro não encontrado." }, 404); const { error } = await sb.auth.admin.updateUserById(p.uid, { password: senha }); if (error) throw error; return json({ ok: true, senha }); }
      const email = String(b.email || "").trim().toLowerCase(), nome = String(b.nome || "").trim(), cliente = String(b.cliente || "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !nome || !cliente) return json({ ok: false, motivo: "Informe nome, e-mail e cliente." }, 400);
      const { data: cr, error } = await sb.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } }); if (error) return json({ ok: false, motivo: /already|registered|exists/i.test(error.message) ? "Este e-mail já tem acesso." : error.message }, 409);
      const row = { uid: cr.user.id, org: ORG, nome, email, cliente, ativo: true, mostrar_tecnico: !!b.mostrar_tecnico, criado_por: q.nome || "Painel" };
      const { error: e2 } = await sb.from("parceiros").insert(row); if (e2) throw e2;
      return json({ ok: true, senha, parceiro: row });
    }
    if (acao === "parceiro_dados" || acao === "parceiro_fotos") {
      if (q.papel !== "parceiro") return json({ ok: false, motivo: "Acesso exclusivo de parceiros cadastrados." }, 403);
      const p = q.parceiro; const cli = p.cliente; const mostrarTec = !!p.mostrar_tecnico;
      if (acao === "parceiro_fotos") {
        const { data: e } = await sb.from("eventos").select("id, dados").eq("id", String(b.id || "")).eq("org", ORG).maybeSingle(); if (!e) return json({ ok: false, motivo: "O.S. não encontrada." }, 404);
        const d = e.dados || {}; if (!doCliente([d.corr && d.corr.cliente, d.info && d.info.parceiro, d.clienteAtv], cli)) return json({ ok: false, motivo: "O.S. de outro cliente." }, 403);
        const fs = (d.fotos || []).filter((f: any) => f && f.path); const out = [];
        for (const f of fs.slice(0, 60)) { const { data: s } = await sb.storage.from(BUCKET).createSignedUrl(f.path, 3600); if (s && s.signedUrl) out.push({ url: s.signedUrl, cat: f.cat || "", ts: f.ts || null }); }
        return json({ ok: true, fotos: out });
      }
      const de = Math.max(0, b.de != null && b.de !== '' ? +b.de : Date.now() - 30 * 86400000), ate = b.ate != null && b.ate !== '' ? +b.ate : Date.now(); if (ate - de > 400 * 86400000) return json({ ok: false, motivo: "Período máximo de 400 dias." }, 400);
      const [evs, atvs, cads, recs, tecs] = await Promise.all([
        todos(() => sb.from("eventos").select("id, uid, chegada, dados").eq("org", ORG).gte("chegada", de).lte("chegada", ate)),
        todos(() => sb.from("atividades").select("*").eq("org", ORG).gte("criado", de - 15 * 86400000).lte("criado", ate)),
        todos(() => sb.from("cadastros").select("uid, centro_custo").eq("org", ORG)),
        todos(() => sb.from("recursos").select("uid, cluster, regiao").eq("org", ORG)).catch(() => []),
        todos(() => sb.from("tecnicos").select("uid, dados").eq("org", ORG)),
      ]);
      const { data: cfg } = await sb.from("config").select("dados").eq("org", ORG).maybeSingle(); const mCid = mapaCidades((cfg && cfg.dados && cfg.dados.cidades) || []);
      const cluOS = (x: any, a: any, uid: string) => (a && a.dados && a.dados.clusterManual && a.dados.cluster) || clusterTexto(mCid, x && x.info && x.info.cidade, a && a.dados && a.dados.cidade, a && a.dados && a.dados.geo && a.dados.geo.formatado, x && x.info && x.info.endereco, a && a.endereco) || (a && a.dados && a.dados.cluster) || (uid ? clusterTec(uid, mc, mr, mt) : "");
      const mc = new Map(cads.filter((c: any) => c.uid).map((c: any) => [c.uid, c])), mr = new Map(recs.map((r: any) => [r.uid, r])), mt = new Map(tecs.map((t: any) => [t.uid, t.dados || {}]));
      const daAtv = (a: any) => doCliente([a.dados && a.dados.cliente, a.dados && a.dados.parceiro], cli);
      const porTicket = new Map(); atvs.forEach((a: any) => { if (a.ticket) porTicket.set(String(a.ticket).toUpperCase(), a); });
      const rows: any[] = []; const tickets = new Set();
      evs.forEach((e: any) => { const d = e.dados || {}; if (d.apoio || d.tipo === "vistoria") return; const t = String((d.corr && d.corr.ticket) || "").toUpperCase(); const a = t ? porTicket.get(t) : null;
        if (!doCliente([d.corr && d.corr.cliente, d.info && d.info.parceiro, d.clienteAtv], cli) && !(a && daAtv(a))) return;
        rows.push(linhaEvento(e, a, cluOS(d, a, e.uid), mostrarTec)); if (t) tickets.add(t); });
      atvs.forEach((a: any) => { if (!daAtv(a) || a.status === "cancelada" || (+a.criado < de)) return; if (a.ticket && tickets.has(String(a.ticket).toUpperCase())) return; if (a.status === "concluida") return; rows.push(linhaAtividade(a, cluOS(null, a, a.tecnico_uid), mostrarTec)); });
      rows.sort((x, y) => (y.criado || y.chegada || 0) - (x.criado || x.chegada || 0));
      return json({ ok: true, parceiro: { nome: p.nome, cliente: cli }, de, ate, rows });
    }
    return json({ ok: false, motivo: "Ação desconhecida." }, 400);
  } catch (e) { return json({ ok: false, motivo: "Erro: " + ((e as any)?.message || String(e)) }, 500); }
}
if (!(globalThis as any).__TESTE_ACESSO__) Deno.serve((r) => handler(r));
