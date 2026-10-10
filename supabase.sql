-- =====================================================================
-- Ronda Backbone Multivale — banco de dados no Supabase
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
  insert into public.os_medidas (id, org, uid, tecnico, os, tipo, cliente, data_os, ciclo, valor, itens, lote, validado_em, validado_por, enviado_em, enviado_por, medido_em, medido_por, tg_chat, tg_thread)
  select mv.id, mv.org, mv.uid, mv.dados->>'tecnico', mv.dados->>'os', mv.dados->>'tipo',
         case when coalesce(mv.dados->>'claro', '') = 'true' then 'Claro' end,
         to_timestamp(coalesce(e.chegada, mv.enviado_em, mv.medido_em) / 1000.0),
         public.ciclo_de(to_timestamp(coalesce(e.chegada, mv.enviado_em, mv.medido_em) / 1000.0)),
         mv.valor, mv.itens, mv.lote, mv.validado_em, mv.validado_por, mv.enviado_em, mv.enviado_por, mv.medido_em, mv.medido_por, mv.tg_chat, mv.tg_thread
  from mv left join public.eventos e on e.id = mv.id
  on conflict (id) do update set medido_em = excluded.medido_em, medido_por = excluded.medido_por, valor = excluded.valor, itens = excluded.itens, arquivado_em = now();
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
