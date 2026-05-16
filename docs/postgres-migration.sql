-- Migración Sheets → Postgres para Taller IMIS
-- ============================================================
-- Pegá este SQL en el SQL Editor de Supabase
-- (https://supabase.com/dashboard/project/kszdievqesveluzcnzsh/sql/new)
-- y ejecutá. Es idempotente — se puede correr varias veces.
--
-- Lo que hace:
--  1. Agrega columnas faltantes (modo_registro, fecha en bordados/cuellos).
--  2. Da permisos a anon/authenticated en las 5 tablas vestigiales.
--  3. Reemplaza las policies deny-all por permisivas (la app aún no
--     tiene auth real — abrir como Apps Script hasta agregar login).
--  4. Crea índices para queries frecuentes.
--
-- NO toca:
--  - public.pedido (singular) ni alumno/escuela/trazo*/tendido*/bodega_*
--    — son del otro sistema en producción con 1212 filas reales.

begin;

-- ─── 1. Columnas faltantes ──────────────────────────────────

alter table public.pedidos
  add column if not exists modo_registro text;

-- ─── 2. Permisos ────────────────────────────────────────────

grant select, insert, update, delete on
  public.pedidos,
  public.bordados,
  public.cuellos,
  public.clientes,
  public.catalogo
to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

-- ─── 3. Policies abiertas (transitorio — agregar auth después) ─

-- Pedidos
drop policy if exists pedidos_select on public.pedidos;
drop policy if exists pedidos_insert on public.pedidos;
drop policy if exists pedidos_update on public.pedidos;
drop policy if exists pedidos_delete on public.pedidos;
create policy pedidos_select on public.pedidos for select to anon, authenticated using (true);
create policy pedidos_insert on public.pedidos for insert to anon, authenticated with check (true);
create policy pedidos_update on public.pedidos for update to anon, authenticated using (true) with check (true);
create policy pedidos_delete on public.pedidos for delete to anon, authenticated using (true);

-- Bordados
drop policy if exists bordados_select on public.bordados;
drop policy if exists bordados_insert on public.bordados;
drop policy if exists bordados_update on public.bordados;
drop policy if exists bordados_delete on public.bordados;
create policy bordados_select on public.bordados for select to anon, authenticated using (true);
create policy bordados_insert on public.bordados for insert to anon, authenticated with check (true);
create policy bordados_update on public.bordados for update to anon, authenticated using (true) with check (true);
create policy bordados_delete on public.bordados for delete to anon, authenticated using (true);

-- Cuellos
drop policy if exists cuellos_select on public.cuellos;
drop policy if exists cuellos_insert on public.cuellos;
drop policy if exists cuellos_update on public.cuellos;
drop policy if exists cuellos_delete on public.cuellos;
create policy cuellos_select on public.cuellos for select to anon, authenticated using (true);
create policy cuellos_insert on public.cuellos for insert to anon, authenticated with check (true);
create policy cuellos_update on public.cuellos for update to anon, authenticated using (true) with check (true);
create policy cuellos_delete on public.cuellos for delete to anon, authenticated using (true);

-- Clientes
drop policy if exists clientes_select on public.clientes;
drop policy if exists clientes_insert on public.clientes;
drop policy if exists clientes_update on public.clientes;
drop policy if exists clientes_delete on public.clientes;
create policy clientes_select on public.clientes for select to anon, authenticated using (true);
create policy clientes_insert on public.clientes for insert to anon, authenticated with check (true);
create policy clientes_update on public.clientes for update to anon, authenticated using (true) with check (true);
create policy clientes_delete on public.clientes for delete to anon, authenticated using (true);

-- Catálogo
drop policy if exists catalogo_select on public.catalogo;
drop policy if exists catalogo_insert on public.catalogo;
drop policy if exists catalogo_update on public.catalogo;
drop policy if exists catalogo_delete on public.catalogo;
create policy catalogo_select on public.catalogo for select to anon, authenticated using (true);
create policy catalogo_insert on public.catalogo for insert to anon, authenticated with check (true);
create policy catalogo_update on public.catalogo for update to anon, authenticated using (true) with check (true);
create policy catalogo_delete on public.catalogo for delete to anon, authenticated using (true);

-- ─── 4. Trigger updated_at ───────────────────────────────────

create or replace function public._touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists pedidos_touch on public.pedidos;
create trigger pedidos_touch before update on public.pedidos
  for each row execute function public._touch_updated_at();

drop trigger if exists bordados_touch on public.bordados;
create trigger bordados_touch before update on public.bordados
  for each row execute function public._touch_updated_at();

drop trigger if exists cuellos_touch on public.cuellos;
create trigger cuellos_touch before update on public.cuellos
  for each row execute function public._touch_updated_at();

drop trigger if exists clientes_touch on public.clientes;
create trigger clientes_touch before update on public.clientes
  for each row execute function public._touch_updated_at();

-- ─── 5. Índices ──────────────────────────────────────────────

create index if not exists pedidos_estatus_idx     on public.pedidos (estatus);
create index if not exists pedidos_fecha_idx       on public.pedidos (fecha);
create index if not exists pedidos_cliente_idx     on public.pedidos (cliente);
create index if not exists bordados_estatus_idx    on public.bordados (estatus);
create index if not exists bordados_fecha_idx      on public.bordados (fecha);
create index if not exists cuellos_estatus_idx     on public.cuellos (estatus);
create index if not exists cuellos_fecha_idx       on public.cuellos (fecha);
create index if not exists clientes_nombre_idx     on public.clientes (lower(nombre));

commit;

-- ─── Verificación ────────────────────────────────────────────
-- Después de correr, ejecutá esto para confirmar:
--
-- select tablename, policyname from pg_policies
-- where schemaname = 'public'
--   and tablename in ('pedidos','bordados','cuellos','clientes','catalogo')
-- order by tablename, policyname;
--
-- Deberían aparecer 4 policies por tabla (select/insert/update/delete).
