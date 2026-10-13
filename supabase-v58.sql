-- ===== v58: backup semanal automático (Storage privado) =====
insert into storage.buckets (id, name, public) values ('backups', 'backups', false) on conflict (id) do nothing;
create or replace function public.backup_dump() returns jsonb
language plpgsql security definer set search_path = public as $$
declare t text; r jsonb := '{}'::jsonb; v jsonb;
begin
  for t in select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' and table_name not in ('acesso_limite', 'push_log') order by 1 loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t) into v;
    r := r || jsonb_build_object(t, v);
  end loop;
  return r;
end $$;
revoke all on function public.backup_dump() from public, anon, authenticated;
grant execute on function public.backup_dump() to service_role;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'backups_admin_le') then
    create policy backups_admin_le on storage.objects for select to authenticated using (bucket_id = 'backups' and public.eh_admin('multivale'));
  end if;
end $$;
-- agendamento diário da função manutencao (já criado no projeto; para recriar, troque SEU_CRON_SECRET):
-- select cron.schedule('manutencao-diaria', '20 6 * * *', $c$ select net.http_post(url := 'https://hwxwoejikghquenzmwes.supabase.co/functions/v1/manutencao', headers := '{"Content-Type": "application/json", "x-cron-secret": "SEU_CRON_SECRET"}'::jsonb, body := '{}'::jsonb); $c$);


-- ===== v58: políticas de segurança mais rápidas (mesmas regras de acesso) =====
-- 1) auth.uid() vira (select auth.uid()): o Postgres calcula uma vez por consulta, não uma vez por linha.
-- 2) quando duas políticas valiam para o mesmo comando, viram uma só (com OU): o resultado é idêntico.
--    eh_admin já está contido em eh_estoque e eh_gestor em eh_admin, por isso algumas somas simplificam.
begin;
create schema if not exists bkp;
create table if not exists bkp.policies_v58 as select now() as em, * from pg_policies where schemaname in ('public', 'storage');
revoke all on schema bkp from public, anon, authenticated;

-- abastecimentos
drop policy if exists abs_apagar on public.abastecimentos; create policy abs_apagar on public.abastecimentos for delete to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));
drop policy if exists abs_inserir on public.abastecimentos; create policy abs_inserir on public.abastecimentos for insert to authenticated with check (uid = (select auth.uid()) and public.eh_membro(org));
drop policy if exists abs_ler on public.abastecimentos; create policy abs_ler on public.abastecimentos for select to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));
drop policy if exists abs_editar on public.abastecimentos; create policy abs_editar on public.abastecimentos for update to authenticated using (uid = (select auth.uid())) with check (uid = (select auth.uid()));

-- admins
drop policy if exists admins_equipe on public.admins; drop policy if exists admins_ler on public.admins;
create policy admins_ler on public.admins for select to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));

-- aovivo
drop policy if exists vivo_inserir on public.aovivo; create policy vivo_inserir on public.aovivo for insert to authenticated with check (uid = (select auth.uid()) and public.eh_membro(org));
drop policy if exists desp_vivo_ler on public.aovivo; drop policy if exists vivo_ler on public.aovivo;
create policy vivo_ler on public.aovivo for select to authenticated using (uid = (select auth.uid()) or public.eh_despacho(org));
drop policy if exists vivo_editar on public.aovivo; create policy vivo_editar on public.aovivo for update to authenticated using (uid = (select auth.uid())) with check (uid = (select auth.uid()));

-- atividades
drop policy if exists atv_inserir on public.atividades; drop policy if exists desp_atv_inserir on public.atividades;
create policy atv_inserir on public.atividades for insert to authenticated with check (public.eh_despacho(org) or (origem = 'tecnico' and tecnico_uid = (select auth.uid())));
drop policy if exists atv_ler on public.atividades; drop policy if exists atv_ler_apoio on public.atividades; drop policy if exists desp_atv_ler on public.atividades;
create policy atv_ler on public.atividades for select to authenticated using (public.eh_despacho(org) or tecnico_uid = (select auth.uid()) or (select auth.uid()) = any (apoio_uids));
drop policy if exists atv_editar on public.atividades; drop policy if exists desp_atv_editar on public.atividades;
create policy atv_editar on public.atividades for update to authenticated using (public.eh_despacho(org) or tecnico_uid = (select auth.uid())) with check (public.eh_despacho(org) or tecnico_uid = (select auth.uid()));

-- bonus (gestor grava; admin lê)
drop policy if exists bonus_gestor on public.bonus; drop policy if exists bonus_ler on public.bonus;
create policy bonus_ler on public.bonus for select to authenticated using (public.eh_admin(org));
create policy bonus_inserir on public.bonus for insert to authenticated with check (public.eh_gestor(org));
create policy bonus_editar on public.bonus for update to authenticated using (public.eh_gestor(org)) with check (public.eh_gestor(org));
create policy bonus_apagar on public.bonus for delete to authenticated using (public.eh_gestor(org));

-- cadastros
drop policy if exists cad_ler on public.cadastros; create policy cad_ler on public.cadastros for select to authenticated using (public.eh_admin(org) or uid = (select auth.uid()));

-- despachantes / noc
drop policy if exists desp_proprio on public.despachantes; create policy desp_proprio on public.despachantes for select to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));
drop policy if exists noc_eu on public.noc; create policy noc_eu on public.noc for select to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));

-- equip_mov (eh_estoque já inclui os admins)
drop policy if exists eqm_admin on public.equip_mov; drop policy if exists eqm_estoque on public.equip_mov; drop policy if exists eqm_ler on public.equip_mov;
create policy eqm_ler on public.equip_mov for select to authenticated using (para_uid = (select auth.uid()) or de_uid = (select auth.uid()) or public.eh_estoque(org));
create policy eqm_inserir on public.equip_mov for insert to authenticated with check (public.eh_estoque(org));
create policy eqm_editar on public.equip_mov for update to authenticated using (public.eh_estoque(org)) with check (public.eh_estoque(org));
create policy eqm_apagar on public.equip_mov for delete to authenticated using (public.eh_estoque(org));

-- equipamentos
drop policy if exists eqp_admin on public.equipamentos; drop policy if exists eqp_estoque on public.equipamentos; drop policy if exists eqp_ler on public.equipamentos;
create policy eqp_ler on public.equipamentos for select to authenticated using (tecnico_uid = (select auth.uid()) or public.eh_estoque(org));
create policy eqp_inserir on public.equipamentos for insert to authenticated with check (public.eh_estoque(org));
create policy eqp_editar on public.equipamentos for update to authenticated using (public.eh_estoque(org)) with check (public.eh_estoque(org));
create policy eqp_apagar on public.equipamentos for delete to authenticated using (public.eh_estoque(org));

-- escada
drop policy if exists esc_proprio on public.escada; drop policy if exists esc_equipe on public.escada;
create policy esc_ler on public.escada for select to authenticated using (uid = (select auth.uid()) or public.eh_admin(org) or public.eh_noc(org));
create policy esc_inserir on public.escada for insert to authenticated with check (uid = (select auth.uid()));
create policy esc_editar on public.escada for update to authenticated using (uid = (select auth.uid())) with check (uid = (select auth.uid()));
create policy esc_apagar on public.escada for delete to authenticated using (uid = (select auth.uid()));

-- eventos
drop policy if exists ev_apagar on public.eventos; create policy ev_apagar on public.eventos for delete to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));
drop policy if exists ev_inserir on public.eventos; create policy ev_inserir on public.eventos for insert to authenticated with check (uid = (select auth.uid()) and public.eh_membro(org));
drop policy if exists ev_editar on public.eventos; create policy ev_editar on public.eventos for update to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));

-- expedientes
drop policy if exists exp_inserir on public.expedientes; create policy exp_inserir on public.expedientes for insert to authenticated with check (uid = (select auth.uid()) and public.eh_membro(org));
drop policy if exists exp_ler on public.expedientes; create policy exp_ler on public.expedientes for select to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));
drop policy if exists exp_editar on public.expedientes; create policy exp_editar on public.expedientes for update to authenticated using (uid = (select auth.uid())) with check (uid = (select auth.uid()));

-- fiber_book (admin grava; admin, despacho e NOC leem; técnico não vê)
drop policy if exists fbook_gravar on public.fiber_book; drop policy if exists fbook_ler on public.fiber_book;
create policy fbook_ler on public.fiber_book for select to authenticated using (public.eh_despacho(org) or public.eh_noc(org));
create policy fbook_inserir on public.fiber_book for insert to authenticated with check (public.eh_admin(org));
create policy fbook_editar on public.fiber_book for update to authenticated using (public.eh_admin(org)) with check (public.eh_admin(org));
create policy fbook_apagar on public.fiber_book for delete to authenticated using (public.eh_admin(org));

-- fotos_rede
drop policy if exists fr_apagar on public.fotos_rede; create policy fr_apagar on public.fotos_rede for delete to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));
drop policy if exists fr_inserir on public.fotos_rede; create policy fr_inserir on public.fotos_rede for insert to authenticated with check (uid = (select auth.uid()) and public.eh_membro(org));
drop policy if exists fr_ler on public.fotos_rede; create policy fr_ler on public.fotos_rede for select to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));
drop policy if exists fr_editar on public.fotos_rede; create policy fr_editar on public.fotos_rede for update to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));

-- mat_mov (estoque grava tudo; técnico só a própria baixa)
drop policy if exists mov_admin on public.mat_mov; drop policy if exists mov_estoque on public.mat_mov; drop policy if exists mov_tec_apagar on public.mat_mov; drop policy if exists mov_tec_inserir on public.mat_mov; drop policy if exists mov_ler on public.mat_mov; drop policy if exists mov_tec_editar on public.mat_mov;
create policy mov_ler on public.mat_mov for select to authenticated using (tecnico_uid = (select auth.uid()) or public.eh_estoque(org));
create policy mov_inserir on public.mat_mov for insert to authenticated with check (public.eh_estoque(org) or (tecnico_uid = (select auth.uid()) and tipo = 'baixa'));
create policy mov_editar on public.mat_mov for update to authenticated using (public.eh_estoque(org) or (tecnico_uid = (select auth.uid()) and tipo = 'baixa')) with check (public.eh_estoque(org) or (tecnico_uid = (select auth.uid()) and tipo = 'baixa'));
create policy mov_apagar on public.mat_mov for delete to authenticated using (public.eh_estoque(org) or (tecnico_uid = (select auth.uid()) and tipo = 'baixa'));

-- mat_requisicoes
drop policy if exists req_admin on public.mat_requisicoes; drop policy if exists req_estoque on public.mat_requisicoes;
create policy req_estoque on public.mat_requisicoes for all to authenticated using (public.eh_estoque(org)) with check (public.eh_estoque(org));

-- materiais (catálogo: membros leem, estoque grava)
drop policy if exists mat_admin on public.materiais; drop policy if exists mat_estoque on public.materiais; drop policy if exists mat_ler on public.materiais;
create policy mat_ler on public.materiais for select to authenticated using (public.eh_membro(org) or public.eh_estoque(org));
create policy mat_inserir on public.materiais for insert to authenticated with check (public.eh_estoque(org));
create policy mat_editar on public.materiais for update to authenticated using (public.eh_estoque(org)) with check (public.eh_estoque(org));
create policy mat_apagar on public.materiais for delete to authenticated using (public.eh_estoque(org));

-- medicoes / os_medidas / plantoes
drop policy if exists med_ler on public.medicoes; create policy med_ler on public.medicoes for select to authenticated using (public.eh_admin(org) or uid = (select auth.uid()));
drop policy if exists osm_ler on public.os_medidas; create policy osm_ler on public.os_medidas for select to authenticated using (public.eh_admin(org) or uid = (select auth.uid()));
drop policy if exists desp_pla_ler on public.plantoes; drop policy if exists pla_ler on public.plantoes;
create policy pla_ler on public.plantoes for select to authenticated using (public.eh_despacho(org) or uid = (select auth.uid()));

-- parceiros
drop policy if exists par_admin on public.parceiros; drop policy if exists par_ler on public.parceiros;
create policy par_ler on public.parceiros for select to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));
create policy par_inserir on public.parceiros for insert to authenticated with check (public.eh_admin(org));
create policy par_editar on public.parceiros for update to authenticated using (public.eh_admin(org)) with check (public.eh_admin(org));
create policy par_apagar on public.parceiros for delete to authenticated using (public.eh_admin(org));

-- ped_msgs
drop policy if exists pm_equipe on public.ped_msgs; drop policy if exists pm_tec on public.ped_msgs;
create policy pm_inserir on public.ped_msgs for insert to authenticated with check (autor_uid = (select auth.uid()) and (((papel = 'noc') and public.eh_noc(org)) or ((papel = 'supervisor') and public.eh_admin(org)) or ((papel = 'tecnico') and tecnico_uid = (select auth.uid()) and exists (select 1 from public.pedidos p where p.id = ped_msgs.pedido_id and p.tecnico_uid = (select auth.uid())))));
drop policy if exists pm_ler on public.ped_msgs; create policy pm_ler on public.ped_msgs for select to authenticated using (tecnico_uid = (select auth.uid()) or public.eh_admin(org) or public.eh_noc(org));

-- pedidos
drop policy if exists ped_admin on public.pedidos; drop policy if exists ped_tec_criar on public.pedidos; drop policy if exists ped_ler on public.pedidos; drop policy if exists ped_noc_ler on public.pedidos; drop policy if exists ped_noc_decidir on public.pedidos; drop policy if exists ped_tec_cancelar on public.pedidos;
create policy ped_ler on public.pedidos for select to authenticated using (tecnico_uid = (select auth.uid()) or public.eh_admin(org) or (tipo = 'liberar_corretiva' and public.eh_noc(org)));
create policy ped_inserir on public.pedidos for insert to authenticated with check (public.eh_admin(org) or (tecnico_uid = (select auth.uid()) and status = 'pedido'));
create policy ped_editar on public.pedidos for update to authenticated
  using (public.eh_admin(org) or (tipo = 'liberar_corretiva' and public.eh_noc(org)) or (tecnico_uid = (select auth.uid()) and status = 'pedido'))
  with check (public.eh_admin(org) or (tipo = 'liberar_corretiva' and public.eh_noc(org)) or (tecnico_uid = (select auth.uid()) and status = any (array['pedido', 'cancelado'])));
create policy ped_apagar on public.pedidos for delete to authenticated using (public.eh_admin(org));

-- projetos (admin grava; estoque lê)
drop policy if exists proj_admin on public.projetos; drop policy if exists proj_estoque on public.projetos;
create policy proj_ler on public.projetos for select to authenticated using (public.eh_estoque(org));
create policy proj_inserir on public.projetos for insert to authenticated with check (public.eh_admin(org));
create policy proj_editar on public.projetos for update to authenticated using (public.eh_admin(org)) with check (public.eh_admin(org));
create policy proj_apagar on public.projetos for delete to authenticated using (public.eh_admin(org));

-- push_subs
drop policy if exists push_apagar on public.push_subs; create policy push_apagar on public.push_subs for delete to authenticated using (uid = (select auth.uid()));
drop policy if exists push_inserir on public.push_subs; create policy push_inserir on public.push_subs for insert to authenticated with check (uid = (select auth.uid()));
drop policy if exists push_ler on public.push_subs; create policy push_ler on public.push_subs for select to authenticated using (uid = (select auth.uid()));
drop policy if exists push_editar on public.push_subs; create policy push_editar on public.push_subs for update to authenticated using (uid = (select auth.uid())) with check (uid = (select auth.uid()));

-- recursos (admin grava; técnico lê a própria, despacho lê todas)
drop policy if exists rec_admin on public.recursos; drop policy if exists rec_ler on public.recursos;
create policy rec_ler on public.recursos for select to authenticated using (uid = (select auth.uid()) or public.eh_despacho(org));
create policy rec_inserir on public.recursos for insert to authenticated with check (public.eh_admin(org));
create policy rec_editar on public.recursos for update to authenticated using (public.eh_admin(org)) with check (public.eh_admin(org));
create policy rec_apagar on public.recursos for delete to authenticated using (public.eh_admin(org));

-- rondas
drop policy if exists rondas_apagar on public.rondas; create policy rondas_apagar on public.rondas for delete to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));
drop policy if exists rondas_inserir on public.rondas; create policy rondas_inserir on public.rondas for insert to authenticated with check (uid = (select auth.uid()) and public.eh_membro(org));
drop policy if exists rondas_ler on public.rondas; create policy rondas_ler on public.rondas for select to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));
drop policy if exists rondas_editar on public.rondas; create policy rondas_editar on public.rondas for update to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));

-- rotas
drop policy if exists rotas_apagar on public.rotas; drop policy if exists rotas_apagar_sob on public.rotas;
create policy rotas_apagar on public.rotas for delete to authenticated using (public.eh_admin(org) or (uid = (select auth.uid()) and (dados ->> 'sobreposicao') = 'true'));
drop policy if exists rotas_inserir on public.rotas; create policy rotas_inserir on public.rotas for insert to authenticated with check (uid = (select auth.uid()) and public.eh_membro(org));
drop policy if exists rotas_editar on public.rotas; create policy rotas_editar on public.rotas for update to authenticated using (uid = (select auth.uid()) or public.eh_admin(org)) with check (uid = (select auth.uid()) or public.eh_admin(org));

-- sos
drop policy if exists sos_criar on public.sos; create policy sos_criar on public.sos for insert to authenticated with check (uid = (select auth.uid()) and public.eh_membro(org));
drop policy if exists sos_ler on public.sos; create policy sos_ler on public.sos for select to authenticated using (uid = (select auth.uid()) or public.eh_admin(org) or public.eh_noc(org));
drop policy if exists sos_equipe on public.sos; drop policy if exists sos_tec_cancelar on public.sos;
create policy sos_editar on public.sos for update to authenticated
  using (public.eh_admin(org) or public.eh_noc(org) or uid = (select auth.uid()))
  with check (public.eh_admin(org) or public.eh_noc(org) or (uid = (select auth.uid()) and status = any (array['aberto', 'cancelado'])));

-- tecnicos
drop policy if exists tec_inserir on public.tecnicos; create policy tec_inserir on public.tecnicos for insert to authenticated with check (uid = (select auth.uid()) and public.eh_membro(org));
drop policy if exists desp_tec_ler on public.tecnicos; drop policy if exists tec_ler on public.tecnicos;
create policy tec_ler on public.tecnicos for select to authenticated using (uid = (select auth.uid()) or public.eh_despacho(org));
drop policy if exists tec_editar on public.tecnicos; create policy tec_editar on public.tecnicos for update to authenticated using (uid = (select auth.uid())) with check (uid = (select auth.uid()));

-- treinamentos
drop policy if exists tr_admin on public.treinamentos; drop policy if exists tr_ler on public.treinamentos;
create policy tr_ler on public.treinamentos for select to authenticated using (uid = (select auth.uid()) or public.eh_admin(org));
create policy tr_inserir on public.treinamentos for insert to authenticated with check (public.eh_admin(org));
create policy tr_editar on public.treinamentos for update to authenticated using (public.eh_admin(org)) with check (public.eh_admin(org));
create policy tr_apagar on public.treinamentos for delete to authenticated using (public.eh_admin(org));

-- storage: fotos (troca só do dono)
drop policy if exists fotos_trocar on storage.objects;
create policy fotos_trocar on storage.objects for update to authenticated using (bucket_id = 'fotos' and owner = (select auth.uid()) and public.eh_membro((storage.foldername(name))[1]));
commit;
-- v58: funções internas (agendamentos e gatilhos) não podem ser chamadas pelo app
revoke execute on function public.arquivar_medidas() from public, anon, authenticated;
revoke execute on function public.arquivar_rotina() from public, anon, authenticated;
revoke execute on function public.calcula_log() from public, anon, authenticated;
revoke execute on function public.trava_corretiva() from public, anon, authenticated;
revoke execute on function public.verificar_escada() from public, anon, authenticated;
do $$ begin execute 'revoke execute on function public.resgatar_cadastro(text) from public, anon, authenticated'; exception when others then null; end $$;
grant execute on function public.arquivar_medidas(), public.arquivar_rotina(), public.verificar_escada() to service_role;

notify pgrst, 'reload schema';
