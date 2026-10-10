-- =====================================================================
-- Técnico Plus - Multivale — banco de dados no Supabase
-- Cole TUDO no Supabase: SQL Editor > New query > Run.
-- Pode rodar de novo sem problema (não apaga dados).
-- =====================================================================

-- Supervisores (cadastrados por você, depois de criar o usuário em Authentication)
create table if not exists public.admins (
  uid  uuid primary key references auth.users (id) on delete cascade,
  org  text not null default 'multivale',
  nome text
);

-- Perfil de cada técnico (um por celular/login)
create table if not exists public.tecnicos (
  uid   uuid primary key default auth.uid(),
  org   text not null,
  dados jsonb not null,
  sync  timestamptz not null default now()
);

-- Rotas do cabo e traçados KMZ (a equipe toda vê)
create table if not exists public.rotas (
  id         text primary key,
  org        text not null,
  uid        uuid not null default auth.uid(),
  atualizado bigint,
  dados      jsonb not null,
  sync       timestamptz not null default now()
);

-- Rondas preventivas e corretivas (percurso GPS, odômetro, velocidade)
create table if not exists public.rondas (
  id     text primary key,
  org    text not null,
  uid    uuid not null default auth.uid(),
  inicio bigint,
  dados  jsonb not null,
  sync   timestamptz not null default now()
);
create index if not exists rondas_org_inicio on public.rondas (org, inicio);

-- Inspeções de caixa e atendimentos de corretiva
create table if not exists public.eventos (
  id      text primary key,
  org     text not null,
  uid     uuid not null default auth.uid(),
  chegada bigint,
  dados   jsonb not null,
  sync    timestamptz not null default now()
);
create index if not exists eventos_org_chegada on public.eventos (org, chegada);

-- Fotos da rede e do odômetro (o arquivo fica no Storage, bucket "fotos")
create table if not exists public.fotos_rede (
  id    text primary key,
  org   text not null,
  uid   uuid not null default auth.uid(),
  dados jsonb not null,
  sync  timestamptz not null default now()
);

-- Posição em tempo real de cada técnico
create table if not exists public.aovivo (
  uid   uuid primary key default auth.uid(),
  org   text not null,
  ts    bigint,
  dados jsonb not null
);

-- É supervisor desta equipe?
create or replace function public.eh_admin(p_org text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where uid = auth.uid() and org = p_org);
$$;

alter table public.admins     enable row level security;
alter table public.tecnicos   enable row level security;
alter table public.rotas      enable row level security;
alter table public.rondas     enable row level security;
alter table public.eventos    enable row level security;
alter table public.fotos_rede enable row level security;
alter table public.aovivo     enable row level security;

-- Recria as regras (políticas)
do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('admins','tecnicos','rotas','rondas','eventos','fotos_rede','aovivo') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- admins: cada um lê só o próprio cadastro. Ninguém grava pelo app.
create policy admins_ler on public.admins for select to authenticated using (uid = auth.uid());

-- tecnicos: o técnico grava e lê o seu; o supervisor lê todos.
create policy tec_ler     on public.tecnicos for select to authenticated using (uid = auth.uid() or public.eh_admin(org));
create policy tec_inserir on public.tecnicos for insert to authenticated with check (uid = auth.uid());
create policy tec_editar  on public.tecnicos for update to authenticated using (uid = auth.uid()) with check (uid = auth.uid());

-- rotas: a equipe lê; técnico e supervisor cadastram; só o supervisor apaga.
create policy rotas_ler     on public.rotas for select to authenticated using (true);
create policy rotas_inserir on public.rotas for insert to authenticated with check (uid = auth.uid());
create policy rotas_editar  on public.rotas for update to authenticated using (true) with check (uid = auth.uid());
create policy rotas_apagar  on public.rotas for delete to authenticated using (public.eh_admin(org));

-- eventos: a equipe lê (busca de eventos próximos); cada um grava os seus.
create policy ev_ler     on public.eventos for select to authenticated using (true);
create policy ev_inserir on public.eventos for insert to authenticated with check (uid = auth.uid());
create policy ev_editar  on public.eventos for update to authenticated using (uid = auth.uid() or public.eh_admin(org));
create policy ev_apagar  on public.eventos for delete to authenticated using (uid = auth.uid() or public.eh_admin(org));

-- rondas e fotos da rede: só o próprio técnico e o supervisor.
-- (desvio de rota, velocidade e odômetro são calculados só no painel do supervisor)
create policy rondas_ler     on public.rondas for select to authenticated using (uid = auth.uid() or public.eh_admin(org));
create policy rondas_inserir on public.rondas for insert to authenticated with check (uid = auth.uid());
create policy rondas_editar  on public.rondas for update to authenticated using (uid = auth.uid() or public.eh_admin(org));
create policy rondas_apagar  on public.rondas for delete to authenticated using (uid = auth.uid() or public.eh_admin(org));

create policy fr_ler     on public.fotos_rede for select to authenticated using (uid = auth.uid() or public.eh_admin(org));
create policy fr_inserir on public.fotos_rede for insert to authenticated with check (uid = auth.uid());
create policy fr_editar  on public.fotos_rede for update to authenticated using (uid = auth.uid() or public.eh_admin(org));
create policy fr_apagar  on public.fotos_rede for delete to authenticated using (uid = auth.uid() or public.eh_admin(org));

-- aovivo: cada técnico grava só a própria posição; o supervisor vê todos.
create policy vivo_ler     on public.aovivo for select to authenticated using (uid = auth.uid() or public.eh_admin(org));
create policy vivo_inserir on public.aovivo for insert to authenticated with check (uid = auth.uid());
create policy vivo_editar  on public.aovivo for update to authenticated using (uid = auth.uid()) with check (uid = auth.uid());

-- Tempo real (mapa ao vivo, rotas e eventos da equipe)
do $$ begin
  begin alter publication supabase_realtime add table public.aovivo;  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.rotas;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.eventos; exception when duplicate_object then null; end;
end $$;

-- Fotos: bucket privado "fotos" (até 15 MB por arquivo, só imagens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 15728640, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists fotos_ler     on storage.objects;
drop policy if exists fotos_enviar  on storage.objects;
drop policy if exists fotos_trocar  on storage.objects;
create policy fotos_ler    on storage.objects for select to authenticated using (bucket_id = 'fotos');
create policy fotos_enviar on storage.objects for insert to authenticated with check (bucket_id = 'fotos');
create policy fotos_trocar on storage.objects for update to authenticated using (bucket_id = 'fotos' and owner = auth.uid());

-- =====================================================================
-- DESPACHO: atividades alocadas pelo supervisor, expediente e escalonamento
-- =====================================================================

-- Atividades (fila emergencial e preventiva)
create table if not exists public.atividades (
  id             text primary key,
  org            text not null,
  criado         bigint not null,
  criado_por     uuid default auth.uid(),
  origem         text not null default 'supervisor',      -- supervisor | tecnico
  tipo           text not null,                            -- emergencial | preventiva
  status         text not null default 'pendente',         -- pendente | recebida | em_deslocamento | no_local | concluida | cancelada
  tecnico_uid    uuid,
  tecnico_nome   text,
  ticket         text,
  rota_id        text,
  endereco       text,
  lat            double precision,
  lon            double precision,
  log            int,                                      -- 1 = primeiro acionamento, 2 = reincidência...
  escalonar      boolean not null default false,           -- LOG 4 ou mais
  escalonado_em  bigint,                                   -- quando o gerente foi avisado
  atualizado     bigint,
  dados          jsonb not null default '{}'::jsonb
);
create index if not exists atividades_org_criado on public.atividades (org, criado);
create index if not exists atividades_tecnico on public.atividades (tecnico_uid, status);

-- LOG automático: conta acionamentos emergenciais na mesma semana (segunda a domingo, horário de Brasília)
-- no mesmo local (até 1 km), na mesma rota ou no mesmo endereço.
create or replace function public.calcula_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int; semana timestamp;
begin
  if new.tipo <> 'emergencial' or new.status = 'cancelada' then
    new.log := null; new.escalonar := false; return new;
  end if;
  semana := date_trunc('week', to_timestamp(new.criado / 1000.0) at time zone 'America/Sao_Paulo');
  select count(*) into n from public.atividades a
   where a.org = new.org and a.id <> new.id and a.tipo = 'emergencial' and a.status <> 'cancelada'
     and a.criado < new.criado
     and date_trunc('week', to_timestamp(a.criado / 1000.0) at time zone 'America/Sao_Paulo') = semana
     and (   (new.rota_id is not null and new.rota_id <> '' and a.rota_id = new.rota_id)
          or (new.lat is not null and a.lat is not null and
              12742000 * asin(sqrt(power(sin(radians(a.lat - new.lat) / 2), 2)
                + cos(radians(new.lat)) * cos(radians(a.lat)) * power(sin(radians(a.lon - new.lon) / 2), 2))) <= 1000)
          or (coalesce(trim(new.endereco), '') <> '' and lower(trim(a.endereco)) = lower(trim(new.endereco))) );
  new.log := n + 1;
  new.escalonar := new.log >= 4;
  return new;
end $$;
drop trigger if exists atividades_log on public.atividades;
create trigger atividades_log before insert or update of tipo, status, rota_id, lat, lon, endereco, criado
  on public.atividades for each row execute function public.calcula_log();

-- Expediente do técnico (início e fim da jornada)
create table if not exists public.expedientes (
  id     text primary key,
  org    text not null,
  uid    uuid not null default auth.uid(),
  inicio bigint not null,
  fim    bigint,
  dados  jsonb not null default '{}'::jsonb
);
create index if not exists expedientes_org_inicio on public.expedientes (org, inicio);

-- Configuração da equipe (gerente para escalonamento)
create table if not exists public.config (
  org   text primary key,
  dados jsonb not null default '{}'::jsonb
);

alter table public.atividades  enable row level security;
alter table public.expedientes enable row level security;
alter table public.config      enable row level security;

do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('atividades','expedientes','config') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- atividades: o supervisor faz tudo; o técnico vê e atualiza as dele e pode abrir corretiva própria.
create policy atv_ler     on public.atividades for select to authenticated using (public.eh_admin(org) or tecnico_uid = auth.uid());
create policy atv_inserir on public.atividades for insert to authenticated with check (public.eh_admin(org) or (origem = 'tecnico' and tecnico_uid = auth.uid()));
create policy atv_editar  on public.atividades for update to authenticated using (public.eh_admin(org) or tecnico_uid = auth.uid()) with check (public.eh_admin(org) or tecnico_uid = auth.uid());
create policy atv_apagar  on public.atividades for delete to authenticated using (public.eh_admin(org));

-- expedientes: o técnico grava o dele; o supervisor vê todos.
create policy exp_ler     on public.expedientes for select to authenticated using (uid = auth.uid() or public.eh_admin(org));
create policy exp_inserir on public.expedientes for insert to authenticated with check (uid = auth.uid());
create policy exp_editar  on public.expedientes for update to authenticated using (uid = auth.uid()) with check (uid = auth.uid());

-- config: só supervisores.
create policy cfg_ler     on public.config for select to authenticated using (public.eh_admin(org));
create policy cfg_inserir on public.config for insert to authenticated with check (public.eh_admin(org));
create policy cfg_editar  on public.config for update to authenticated using (public.eh_admin(org));

do $$ begin
  begin alter publication supabase_realtime add table public.atividades; exception when duplicate_object then null; end;
end $$;

-- =====================================================================
-- ALERTAS COM O APP FECHADO (Web Push) E ESCALA DE PLANTÃO
-- =====================================================================

-- Celulares inscritos para receber alertas
create table if not exists public.push_subs (
  endpoint   text primary key,
  org        text not null,
  uid        uuid not null default auth.uid(),
  sub        jsonb not null,
  atualizado bigint
);
-- Controle de repetição dos alertas (usado só pela função "alertas")
create table if not exists public.push_log (
  chave text primary key,
  ts    bigint not null
);
-- Escala de plantão e folgas
create table if not exists public.plantoes (
  id           text primary key,
  org          text not null,
  uid          uuid not null,
  tecnico_nome text,
  tipo         text not null default 'plantao',   -- plantao | folga
  inicio       bigint not null,
  fim          bigint not null,
  obs          text,
  criado_por   uuid default auth.uid()
);
create index if not exists plantoes_org_inicio on public.plantoes (org, inicio);

alter table public.push_subs enable row level security;
alter table public.push_log  enable row level security;
alter table public.plantoes  enable row level security;

do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('push_subs','push_log','plantoes') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- push_subs: cada celular cuida da própria inscrição. push_log: sem acesso pelo app.
create policy push_ler     on public.push_subs for select to authenticated using (uid = auth.uid());
create policy push_inserir on public.push_subs for insert to authenticated with check (uid = auth.uid());
create policy push_editar  on public.push_subs for update to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create policy push_apagar  on public.push_subs for delete to authenticated using (uid = auth.uid());

-- plantoes: o supervisor monta a escala; o técnico vê a dele.
create policy pla_ler     on public.plantoes for select to authenticated using (public.eh_admin(org) or uid = auth.uid());
create policy pla_inserir on public.plantoes for insert to authenticated with check (public.eh_admin(org));
create policy pla_editar  on public.plantoes for update to authenticated using (public.eh_admin(org));
create policy pla_apagar  on public.plantoes for delete to authenticated using (public.eh_admin(org));

do $$ begin
  begin alter publication supabase_realtime add table public.plantoes; exception when duplicate_object then null; end;
end $$;

-- =====================================================================
-- METAS DE PRODUÇÃO POR DUPLA (o técnico vê; só o supervisor altera)
-- =====================================================================
create table if not exists public.metas (
  org   text primary key,
  dados jsonb not null default '{}'::jsonb
);
alter table public.metas enable row level security;
drop policy if exists metas_ler on public.metas;
drop policy if exists metas_inserir on public.metas;
drop policy if exists metas_editar on public.metas;
create policy metas_ler     on public.metas for select to authenticated using (true);
create policy metas_inserir on public.metas for insert to authenticated with check (public.eh_admin(org));
create policy metas_editar  on public.metas for update to authenticated using (public.eh_admin(org));

-- =====================================================================
-- MEDIÇÃO (gestor): validação, envio em lote para o Telegram e "O.S MEDIDA"
-- =====================================================================
-- papel do usuário do painel: 'supervisor' (padrão) ou 'gestor'
alter table public.admins add column if not exists papel text not null default 'supervisor';

create table if not exists public.medicoes (
  id            text primary key,           -- mesmo id do evento (O.S.)
  org           text not null,
  uid           uuid,                       -- técnico dono da O.S.
  status        text not null default 'validada',  -- validada | enviada | medida
  valor         numeric(12,2) not null default 0,
  itens         jsonb not null default '[]'::jsonb,
  dados         jsonb not null default '{}'::jsonb,
  validado_em   bigint,
  validado_por  text,
  enviado_em    bigint,
  enviado_por   text,
  lote          text,
  tg_chat       text,
  tg_thread     bigint,
  tg_msg        bigint,
  medido_em     bigint,
  medido_por    text,
  atualizado    bigint
);
create index if not exists medicoes_org_status on public.medicoes (org, status);
create index if not exists medicoes_uid on public.medicoes (uid);
alter table public.medicoes enable row level security;
drop policy if exists med_ler on public.medicoes;
drop policy if exists med_inserir on public.medicoes;
drop policy if exists med_editar on public.medicoes;
drop policy if exists med_apagar on public.medicoes;
-- o técnico só enxerga a situação das O.S. dele; quem altera é o painel (ou a função do Telegram)
create policy med_ler     on public.medicoes for select to authenticated using (public.eh_admin(org) or uid = auth.uid());
create policy med_inserir on public.medicoes for insert to authenticated with check (public.eh_admin(org));
create policy med_editar  on public.medicoes for update to authenticated using (public.eh_admin(org));
create policy med_apagar  on public.medicoes for delete to authenticated using (public.eh_admin(org));

do $$ begin
  begin alter publication supabase_realtime add table public.medicoes; exception when duplicate_object then null; end;
end $$;

-- =====================================================================
-- ARQUIVO: O.S. medidas e histórico de acionamentos
--  • O.S. medida (resposta "O.S MEDIDA" no Telegram) sai de "medicoes" e vai
--    para "os_medidas", uma tabela plana (uma linha por O.S.), boa para tabular.
--  • Acionamentos (atividades) ficam completos por 6 meses. Depois, os
--    concluídos/cancelados são compactados por mês em "acionamentos_historico"
--    e o painel exporta cada mês em .zip (CSV + JSON).
--  • Rotina diária: public.arquivar_rotina() (agendada abaixo se o pg_cron
--    estiver ativo; também está no agendamento.sql).
-- =====================================================================
create table if not exists public.os_medidas (
  id           text primary key,
  org          text not null,
  uid          uuid,
  tecnico      text,
  os           text,
  tipo         text,
  cliente      text,
  data_os      timestamptz,
  ciclo        date,                       -- início do ciclo de fechamento (dia 16)
  valor        numeric(12,2) not null default 0,
  itens        jsonb not null default '[]'::jsonb,
  lote         text,
  validado_em  bigint,
  validado_por text,
  enviado_em   bigint,
  enviado_por  text,
  medido_em    bigint,
  medido_por   text,
  tg_chat      text,
  tg_thread    bigint,
  arquivado_em timestamptz not null default now()
);
alter table public.os_medidas add column if not exists wfc text;
alter table public.os_medidas add column if not exists wf2 text;
create index if not exists os_medidas_org_ciclo on public.os_medidas (org, ciclo);
create index if not exists os_medidas_uid_ciclo on public.os_medidas (uid, ciclo);
alter table public.os_medidas enable row level security;
drop policy if exists osm_ler on public.os_medidas;
drop policy if exists osm_editar on public.os_medidas;
drop policy if exists osm_apagar on public.os_medidas;
create policy osm_ler    on public.os_medidas for select to authenticated using (public.eh_admin(org) or uid = auth.uid());
create policy osm_editar on public.os_medidas for update to authenticated using (public.eh_admin(org));
create policy osm_apagar on public.os_medidas for delete to authenticated using (public.eh_admin(org));

create table if not exists public.acionamentos_historico (
  org           text not null,
  mes           date not null,             -- primeiro dia do mês dos acionamentos
  qtd           int  not null default 0,
  dados         jsonb not null default '[]'::jsonb,   -- linhas completas (o Postgres comprime o jsonb)
  gerado_em     timestamptz not null default now(),
  exportado_em  timestamptz,
  exportado_por text,
  primary key (org, mes)
);
alter table public.acionamentos_historico enable row level security;
drop policy if exists ach_ler on public.acionamentos_historico;
drop policy if exists ach_editar on public.acionamentos_historico;
create policy ach_ler    on public.acionamentos_historico for select to authenticated using (public.eh_admin(org));
create policy ach_editar on public.acionamentos_historico for update to authenticated using (public.eh_admin(org));

-- início do ciclo (dia 16) de uma data, no horário de Brasília
create or replace function public.ciclo_de(t timestamptz) returns date language sql stable as $$
  select case when extract(day from (t at time zone 'America/Sao_Paulo')) >= 16
    then (date_trunc('month', t at time zone 'America/Sao_Paulo') + interval '15 days')::date
    else (date_trunc('month', t at time zone 'America/Sao_Paulo') - interval '1 month' + interval '15 days')::date end
$$;

create or replace function public.arquivar_medidas() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with mv as (
    delete from public.medicoes m where m.status = 'medida' returning m.*
  )
  insert into public.os_medidas (id, org, uid, tecnico, os, wfc, wf2, tipo, cliente, data_os, ciclo, valor, itens, lote, validado_em, validado_por, enviado_em, enviado_por, medido_em, medido_por, tg_chat, tg_thread)
  select mv.id, mv.org, mv.uid, mv.dados->>'tecnico', mv.dados->>'os', nullif(coalesce(mv.dados->>'wfc', e.dados->>'wfc'), ''), nullif(coalesce(mv.dados->>'wf2', e.dados->>'wf2'), ''), mv.dados->>'tipo',
         case when coalesce(mv.dados->>'claro', '') = 'true' then 'Claro' end,
         to_timestamp(coalesce(e.chegada, mv.enviado_em, mv.medido_em) / 1000.0),
         public.ciclo_de(to_timestamp(coalesce(e.chegada, mv.enviado_em, mv.medido_em) / 1000.0)),
         mv.valor, mv.itens, mv.lote, mv.validado_em, mv.validado_por, mv.enviado_em, mv.enviado_por, mv.medido_em, mv.medido_por, mv.tg_chat, mv.tg_thread
  from mv left join public.eventos e on e.id = mv.id
  on conflict (id) do update set medido_em = excluded.medido_em, medido_por = excluded.medido_por, valor = excluded.valor, itens = excluded.itens, wfc = coalesce(excluded.wfc, public.os_medidas.wfc), wf2 = coalesce(excluded.wf2, public.os_medidas.wf2), arquivado_em = now();
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.compactar_acionamentos(meses int default 6) returns int language plpgsql security definer set search_path = public as $$
declare n int; limite bigint := (extract(epoch from (now() - make_interval(months => meses))) * 1000)::bigint;
begin
  with velhos as (
    delete from public.atividades a where a.criado < limite and a.status in ('concluida', 'cancelada') returning a.*
  ), grp as (
    select org, date_trunc('month', to_timestamp(criado / 1000.0) at time zone 'America/Sao_Paulo')::date as mes,
           count(*)::int as qtd, jsonb_agg(to_jsonb(velhos) order by criado) as dados
    from velhos group by 1, 2
  )
  insert into public.acionamentos_historico (org, mes, qtd, dados)
  select org, mes, qtd, dados from grp
  on conflict (org, mes) do update set dados = public.acionamentos_historico.dados || excluded.dados,
    qtd = public.acionamentos_historico.qtd + excluded.qtd, gerado_em = now(), exportado_em = null;
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.arquivar_rotina() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object('os_medidas', public.arquivar_medidas(), 'meses_compactados', public.compactar_acionamentos(6));
end $$;
revoke all on function public.arquivar_medidas() from public;
revoke all on function public.compactar_acionamentos(int) from public;
revoke all on function public.arquivar_rotina() from public;
do $$ begin
  begin revoke all on function public.arquivar_medidas() from anon, authenticated; exception when undefined_object then null; end;
  begin revoke all on function public.compactar_acionamentos(int) from anon, authenticated; exception when undefined_object then null; end;
  begin revoke all on function public.arquivar_rotina() from anon, authenticated; exception when undefined_object then null; end;
end $$;

-- rotina diária às 03:10 (06:10 UTC), se o pg_cron estiver ativo
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('arquivo-ronda-backbone', '10 6 * * *', 'select public.arquivar_rotina()');
  end if;
end $$;

-- =====================================================================
-- EQUIPE DE APOIO NA MESMA O.S.
--  O supervisor inclui técnicos de apoio na atividade. Eles recebem a
--  atividade (com alarme), registram o próprio deslocamento e chegada,
--  mas a produção (LPU) fica na O.S. do técnico principal.
-- =====================================================================
alter table public.atividades add column if not exists apoio_uids uuid[] not null default '{}';
alter table public.atividades add column if not exists apoio_st jsonb not null default '{}'::jsonb;  -- {uid: status do apoio}
create index if not exists atividades_apoio on public.atividades using gin (apoio_uids);
drop policy if exists atv_ler_apoio on public.atividades;
create policy atv_ler_apoio on public.atividades for select to authenticated using (auth.uid() = any (apoio_uids));

-- o técnico de apoio só altera a própria situação (não mexe no resto da atividade)
create or replace function public.apoio_status(p_id text, p_status text) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('recebida', 'vista', 'em_deslocamento', 'no_local', 'concluida') then return; end if;
  update public.atividades
     set apoio_st = coalesce(apoio_st, '{}'::jsonb) || jsonb_build_object(auth.uid()::text, p_status),
         atualizado = (extract(epoch from now()) * 1000)::bigint
   where id = p_id and auth.uid() = any (apoio_uids);
end $$;
revoke all on function public.apoio_status(text, text) from public;
grant execute on function public.apoio_status(text, text) to authenticated;

-- =====================================================================
-- LINK DE ACIONAMENTOS CLARO (acionamento.html)
--  Quem está em "despachantes" só lê o texto do acionamento e cria/encaminha
--  a atividade: vê técnicos, posição ao vivo, escala e atividades. Não vê
--  rondas, fichas, produção, medição nem configurações.
--  Cadastro: insert into public.despachantes (uid, org, nome) values ('UID', 'multivale', 'Nome');
-- =====================================================================
create table if not exists public.despachantes (
  uid  uuid primary key references auth.users (id) on delete cascade,
  org  text not null default 'multivale',
  nome text
);
alter table public.despachantes enable row level security;
drop policy if exists desp_proprio on public.despachantes;
create policy desp_proprio on public.despachantes for select to authenticated using (uid = auth.uid() or public.eh_admin(org));

create or replace function public.eh_despacho(p_org text) returns boolean language sql stable security definer set search_path = public as $$
  select public.eh_admin(p_org) or exists (select 1 from public.despachantes d where d.uid = auth.uid() and d.org = p_org)
$$;

drop policy if exists desp_atv_ler on public.atividades;
drop policy if exists desp_atv_inserir on public.atividades;
drop policy if exists desp_atv_editar on public.atividades;
drop policy if exists desp_tec_ler on public.tecnicos;
drop policy if exists desp_vivo_ler on public.aovivo;
drop policy if exists desp_pla_ler on public.plantoes;
create policy desp_atv_ler     on public.atividades for select to authenticated using (public.eh_despacho(org));
create policy desp_atv_inserir on public.atividades for insert to authenticated with check (public.eh_despacho(org));
create policy desp_atv_editar  on public.atividades for update to authenticated using (public.eh_despacho(org)) with check (public.eh_despacho(org));
create policy desp_tec_ler     on public.tecnicos   for select to authenticated using (public.eh_despacho(org));
create policy desp_vivo_ler    on public.aovivo     for select to authenticated using (public.eh_despacho(org));
create policy desp_pla_ler     on public.plantoes   for select to authenticated using (public.eh_despacho(org));

-- =====================================================================
-- CADASTRO DA EQUIPE PELO PAINEL (técnico, técnico de fibra, fiscal de campo)
--  O supervisor cria o cadastro e manda o link de convite. Ao abrir o link,
--  o celular resgata o cadastro (nome, matrícula, função) e fica vinculado.
--  A função definida aqui vale no celular (o técnico não troca sozinho).
-- =====================================================================
create table if not exists public.cadastros (
  id           text primary key,          -- código do convite
  org          text not null,
  uid          uuid,                      -- celular que resgatou
  nome         text not null,
  matricula    text,
  funcao       text not null default 'tecnico',   -- tecnico | fibra | fiscal
  equipe       text,
  veiculo      text,
  telefone     text,
  ativo        boolean not null default true,
  criado       timestamptz not null default now(),
  criado_por   text,
  resgatado_em timestamptz
);
create unique index if not exists cadastros_uid on public.cadastros (uid) where uid is not null;
alter table public.cadastros enable row level security;
drop policy if exists cad_ler on public.cadastros;
drop policy if exists cad_inserir on public.cadastros;
drop policy if exists cad_editar on public.cadastros;
drop policy if exists cad_apagar on public.cadastros;
create policy cad_ler     on public.cadastros for select to authenticated using (public.eh_admin(org) or uid = auth.uid());
create policy cad_inserir on public.cadastros for insert to authenticated with check (public.eh_admin(org));
create policy cad_editar  on public.cadastros for update to authenticated using (public.eh_admin(org)) with check (public.eh_admin(org));
create policy cad_apagar  on public.cadastros for delete to authenticated using (public.eh_admin(org));

create or replace function public.resgatar_cadastro(p_codigo text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.cadastros;
begin
  if auth.uid() is null then raise exception 'sem login'; end if;
  select * into c from public.cadastros where id = upper(trim(p_codigo)) and ativo;
  if not found then raise exception 'Convite não encontrado ou desativado.'; end if;
  if c.uid is not null and c.uid <> auth.uid() then raise exception 'Este convite já foi usado em outro celular. Peça um novo ao supervisor.'; end if;
  update public.cadastros set uid = null where uid = auth.uid() and id <> c.id;   -- um cadastro por celular
  update public.cadastros set uid = auth.uid(), resgatado_em = coalesce(resgatado_em, now()) where id = c.id returning * into c;
  return to_jsonb(c);
end $$;
revoke all on function public.resgatar_cadastro(text) from public;
grant execute on function public.resgatar_cadastro(text) to authenticated;

-- =====================================================================
-- ABASTECIMENTOS DO VEÍCULO (lançados pelo técnico) e dados de RH no cadastro
-- =====================================================================
create table if not exists public.abastecimentos (
  id    text primary key,
  org   text not null,
  uid   uuid not null default auth.uid(),
  ts    bigint not null,
  dados jsonb not null,
  sync  timestamptz not null default now()
);
create index if not exists abastecimentos_org_ts on public.abastecimentos (org, ts);
alter table public.abastecimentos enable row level security;
drop policy if exists abs_ler on public.abastecimentos;
drop policy if exists abs_inserir on public.abastecimentos;
drop policy if exists abs_editar on public.abastecimentos;
drop policy if exists abs_apagar on public.abastecimentos;
create policy abs_ler     on public.abastecimentos for select to authenticated using (uid = auth.uid() or public.eh_admin(org));
create policy abs_inserir on public.abastecimentos for insert to authenticated with check (uid = auth.uid());
create policy abs_editar  on public.abastecimentos for update to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create policy abs_apagar  on public.abastecimentos for delete to authenticated using (uid = auth.uid() or public.eh_admin(org));

-- salário, vale-refeição e jornada (para o extrato de horas extras). Só o supervisor grava;
-- o técnico enxerga apenas o próprio cadastro.
alter table public.cadastros add column if not exists salario numeric(12,2);
alter table public.cadastros add column if not exists vr_dia numeric(10,2);
alter table public.cadastros add column if not exists jornada_min int;        -- minutos por dia útil (padrão 528 = 8h48, 44 h/semana)
alter table public.cadastros add column if not exists locacao_mes numeric(10,2);   -- locação do veículo por mês (rateio do ganho líquido)

-- Dados de RH (salário, VR, jornada, locação) ficam numa tabela só do painel:
-- o técnico não enxerga nem pelo app nem pela API.
create table if not exists public.rh_dados (
  cad_id      text primary key references public.cadastros (id) on delete cascade,
  org         text not null,
  salario     numeric(12,2),
  vr_dia      numeric(10,2),
  jornada_min int,
  locacao_mes numeric(10,2),
  atualizado  timestamptz not null default now()
);
alter table public.rh_dados enable row level security;
drop policy if exists rh_tudo on public.rh_dados;
create policy rh_tudo on public.rh_dados for all to authenticated using (public.eh_admin(org)) with check (public.eh_admin(org));
insert into public.rh_dados (cad_id, org, salario, vr_dia, jornada_min, locacao_mes)
  select id, org, salario, vr_dia, jornada_min, locacao_mes from public.cadastros
   where coalesce(salario::text, vr_dia::text, jornada_min::text, locacao_mes::text) is not null
  on conflict (cad_id) do nothing;
update public.cadastros set salario = null, vr_dia = null, jornada_min = null, locacao_mes = null
 where coalesce(salario::text, vr_dia::text, jornada_min::text, locacao_mes::text) is not null;

-- =====================================================================
-- ALMOXARIFADO (WMS): catálogo de materiais e movimentos
--  entrada (→ almox) · saida (almox → técnico) · devolucao (técnico → almox)
--  baixa (consumo do técnico; automática ao concluir a O.S.) · ajuste_almox / ajuste_tec (inventário ±)
--  Gestor/supervisor vê e lança tudo. O técnico só vê os próprios movimentos e só lança/edita as próprias baixas.
-- =====================================================================
create table if not exists public.materiais (
  id         text primary key,
  org        text not null default 'multivale',
  codigo     text,
  descricao  text not null,
  unidade    text not null default 'un',
  minimo     numeric,
  refs       text[] not null default '{}',
  ativo      boolean not null default true,
  atualizado bigint
);
create index if not exists materiais_org on public.materiais (org);
alter table public.materiais enable row level security;
drop policy if exists mat_ler on public.materiais;
drop policy if exists mat_admin on public.materiais;
create policy mat_ler   on public.materiais for select to authenticated using (true);
create policy mat_admin on public.materiais for all    to authenticated using (public.eh_admin(org)) with check (public.eh_admin(org));

create table if not exists public.mat_mov (
  id           text primary key,
  org          text not null default 'multivale',
  ts           bigint not null,
  tipo         text not null check (tipo in ('entrada', 'saida', 'devolucao', 'baixa', 'ajuste_almox', 'ajuste_tec')),
  material_id  text not null,
  descricao    text,
  unidade      text,
  qtd          numeric not null,
  tecnico_uid  uuid,
  tecnico_nome text,
  atividade_id text,
  ticket       text,
  insp_id      text,
  doc          text,
  obs          text,
  por          uuid,
  por_nome     text,
  criado       bigint
);
create index if not exists mat_mov_org_ts on public.mat_mov (org, ts);
create index if not exists mat_mov_tec on public.mat_mov (tecnico_uid);
create index if not exists mat_mov_mat on public.mat_mov (material_id);
alter table public.mat_mov enable row level security;
drop policy if exists mov_ler on public.mat_mov;
drop policy if exists mov_admin on public.mat_mov;
drop policy if exists mov_tec_inserir on public.mat_mov;
drop policy if exists mov_tec_editar on public.mat_mov;
drop policy if exists mov_tec_apagar on public.mat_mov;
create policy mov_ler         on public.mat_mov for select to authenticated using (tecnico_uid = auth.uid() or public.eh_admin(org));
create policy mov_admin       on public.mat_mov for all    to authenticated using (public.eh_admin(org)) with check (public.eh_admin(org));
create policy mov_tec_inserir on public.mat_mov for insert to authenticated with check (tecnico_uid = auth.uid() and tipo = 'baixa');
create policy mov_tec_editar  on public.mat_mov for update to authenticated using (tecnico_uid = auth.uid() and tipo = 'baixa') with check (tecnico_uid = auth.uid() and tipo = 'baixa');
create policy mov_tec_apagar  on public.mat_mov for delete to authenticated using (tecnico_uid = auth.uid() and tipo = 'baixa');

-- contas de estoque: manutenção Claro, backbone Multivale e backbone Master (saldos separados)
alter table public.mat_mov add column if not exists conta text not null default 'multivale';
do $$ begin
  alter table public.mat_mov add constraint mat_mov_conta check (conta in ('claro', 'multivale', 'master'));
exception when duplicate_object then null; end $$;
create index if not exists mat_mov_conta on public.mat_mov (org, conta, tipo, ts);

-- =====================================================================
-- REQUISIÇÃO MENSAL DE MATERIAIS (todo dia 20): consumo do mês anterior
-- vira uma requisição para a Claro e outra para a Master.
-- =====================================================================
create table if not exists public.mat_requisicoes (
  id         text primary key,            -- conta-AAAA-MM (mês de consumo)
  org        text not null default 'multivale',
  conta      text not null,
  mes_ref    text not null,               -- AAAA-MM do consumo usado como base
  gerada_em  bigint not null,
  itens      jsonb not null default '[]', -- [{material_id, codigo, descricao, unidade, consumo, saldo_almox, saldo_tecnicos, solicitado}]
  status     text not null default 'aberta' check (status in ('aberta', 'enviada', 'recebida')),
  obs        text,
  atualizado bigint
);
alter table public.mat_requisicoes enable row level security;
drop policy if exists req_admin on public.mat_requisicoes;
create policy req_admin on public.mat_requisicoes for all to authenticated using (public.eh_admin(org)) with check (public.eh_admin(org));

create or replace function public.gerar_requisicoes(p_ref date default (now() at time zone 'America/Sao_Paulo')::date, p_org text default 'multivale', p_refazer boolean default false)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_ini date := (date_trunc('month', p_ref) - interval '1 month')::date;
  v_fim date := date_trunc('month', p_ref)::date;
  a bigint := (extract(epoch from (v_ini::timestamp at time zone 'America/Sao_Paulo')) * 1000)::bigint;
  z bigint := (extract(epoch from (v_fim::timestamp at time zone 'America/Sao_Paulo')) * 1000)::bigint;
  c text; v_itens jsonb; n int := 0; v_id text;
begin
  if auth.uid() is not null and not public.eh_admin(p_org) then raise exception 'sem permissão'; end if;
  foreach c in array array['claro', 'master'] loop
    v_id := c || '-' || to_char(v_ini, 'YYYY-MM');
    -- já existe: só refaz quando pedido e se ainda estiver aberta (enviada/recebida não muda)
    if exists (select 1 from public.mat_requisicoes where id = v_id and (not p_refazer or status <> 'aberta')) then continue; end if;
    select coalesce(jsonb_agg(jsonb_build_object(
             'material_id', u.material_id, 'codigo', m.codigo, 'descricao', coalesce(m.descricao, u.descricao), 'unidade', coalesce(m.unidade, u.unidade),
             'consumo', u.consumo, 'saldo_almox', coalesce(s.almox, 0), 'saldo_tecnicos', coalesce(s.tec, 0), 'solicitado', u.consumo)
             order by coalesce(m.descricao, u.descricao)), '[]'::jsonb)
      into v_itens
      from (select material_id, max(descricao) descricao, max(unidade) unidade, sum(qtd) consumo
              from public.mat_mov where org = p_org and conta = c and tipo = 'baixa' and ts >= a and ts < z
             group by material_id having sum(qtd) > 0) u
      left join public.materiais m on m.id = u.material_id
      left join (select material_id,
                        sum(case when tipo in ('entrada', 'devolucao', 'ajuste_almox') then qtd when tipo = 'saida' then -qtd else 0 end) almox,
                        sum(case when tipo in ('saida', 'ajuste_tec') then qtd when tipo in ('devolucao', 'baixa') then -qtd else 0 end) tec
                   from public.mat_mov where org = p_org and conta = c group by material_id) s on s.material_id = u.material_id;
    insert into public.mat_requisicoes (id, org, conta, mes_ref, gerada_em, itens, status, atualizado)
    values (v_id, p_org, c, to_char(v_ini, 'YYYY-MM'), (extract(epoch from now()) * 1000)::bigint, v_itens, 'aberta', (extract(epoch from now()) * 1000)::bigint)
    on conflict (id) do update set itens = excluded.itens, gerada_em = excluded.gerada_em, atualizado = excluded.atualizado, status = 'aberta';
    n := n + 1;
  end loop;
  return n;
end $$;
do $$ begin
  revoke all on function public.gerar_requisicoes(date, text, boolean) from public;
  begin revoke all on function public.gerar_requisicoes(date, text, boolean) from anon; exception when undefined_object then null; end;
end $$;
grant execute on function public.gerar_requisicoes(date, text, boolean) to authenticated;

-- todo dia 20 às 08:00 (11:00 UTC), se o pg_cron estiver ativo
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('requisicao-materiais', '0 11 20 * *', 'select public.gerar_requisicoes()');
  end if;
end $$;

-- =====================================================================
-- CENTRO DE CUSTO POR PROJETO
--  projetos: vínculo com as O.S. (claro / multivale / master / outro), modelo de receita,
--  receita fixa mensal, dia do fechamento e alocação dos funcionários (% por uid).
--  proj_lanc: receitas (ex.: venda de fibras, recorrente) e custos lançados à mão.
-- =====================================================================
create table if not exists public.projetos (
  id             text primary key,
  org            text not null default 'multivale',
  nome           text not null,
  vinculo        text not null default 'outro' check (vinculo in ('claro', 'multivale', 'master', 'outro')),
  modelo         text not null default 'outro' check (modelo in ('acionamento', 'fixo', 'venda_fibra', 'outro')),
  receita_fixa   numeric,
  dia_fechamento int not null default 31 check (dia_fechamento between 1 and 31),
  alocacao       jsonb not null default '[]',
  ativo          boolean not null default true,
  obs            text,
  atualizado     bigint
);
create table if not exists public.proj_lanc (
  id          text primary key,
  org         text not null default 'multivale',
  projeto_id  text not null references public.projetos (id) on delete cascade,
  data        text not null,               -- AAAA-MM-DD
  tipo        text not null check (tipo in ('receita', 'custo')),
  categoria   text,
  descricao   text,
  valor       numeric not null,
  recorrente  boolean not null default false,  -- repete em todo ciclo a partir da data
  ate         text,                            -- fim da recorrência (opcional)
  por_nome    text,
  criado      bigint
);
create index if not exists proj_lanc_proj on public.proj_lanc (projeto_id, data);
alter table public.projetos enable row level security;
alter table public.proj_lanc enable row level security;
drop policy if exists proj_admin on public.projetos;
drop policy if exists plan_admin on public.proj_lanc;
create policy proj_admin on public.projetos  for all to authenticated using (public.eh_admin(org)) with check (public.eh_admin(org));
create policy plan_admin on public.proj_lanc for all to authenticated using (public.eh_admin(org)) with check (public.eh_admin(org));
