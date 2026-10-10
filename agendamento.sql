-- =====================================================================
-- Ronda Backbone Multivale — agendamento dos alertas (rode UMA vez)
-- Antes de rodar, troque:
--   SEU-PROJETO  pelo código do seu projeto (o que vem antes de .supabase.co na Project URL)
--   SEU-SEGREDO  pelo mesmo texto que você colocou no segredo CRON_SECRET da função
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('alertas-ronda-backbone') where exists (select 1 from cron.job where jobname = 'alertas-ronda-backbone');

select cron.schedule('alertas-ronda-backbone', '* * * * *', $$
  select net.http_post(
    url     := 'https://SEU-PROJETO.supabase.co/functions/v1/alertas',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "SEU-SEGREDO"}'::jsonb,
    body    := '{"origem": "agendamento"}'::jsonb
  );
$$);

-- Limpeza semanal do controle de alertas (domingo, 03:00 UTC)
select cron.unschedule('limpa-push-log') where exists (select 1 from cron.job where jobname = 'limpa-push-log');
select cron.schedule('limpa-push-log', '0 3 * * 0', $$ delete from public.push_log where ts < (extract(epoch from now()) * 1000)::bigint - 7 * 86400000 $$);

-- Arquivo diário (03:10 de Brasília): O.S. medidas vão para "os_medidas" e
-- acionamentos com mais de 6 meses são compactados por mês em "acionamentos_historico".
select cron.unschedule('arquivo-ronda-backbone') where exists (select 1 from cron.job where jobname = 'arquivo-ronda-backbone');
select cron.schedule('arquivo-ronda-backbone', '10 6 * * *', $$ select public.arquivar_rotina() $$);
