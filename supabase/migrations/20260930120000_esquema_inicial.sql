-- Esquema inicial de Reservas: versión multi-tenant genérica de GyG Taller.
--
-- Decisiones:
--  * El aislamiento de datos es por ORGANIZACIÓN (el negocio), no por usuario individual. Varios
--    usuarios pueden pertenecer a la misma organización (tabla `miembros`) y comparten todos sus
--    datos. Un usuario pertenece a una sola organización.
--  * Cada fila de las tablas de dominio lleva `organizacion_id`, con default `mi_organizacion()`
--    (la organización del usuario autenticado), y las políticas RLS lo exigen.
--  * Al crearse un usuario de Supabase Auth, un trigger le crea una organización nueva (o lo suma
--    a una existente si vino de un link de invitación) automáticamente.
--  * Los precios son enteros en pesos, sin decimales.
--  * El total de un turno no se guarda: sale de la vista v_turnos_total (suma de sus ítems).
--  * Cuando un ítem es un combo se guarda una copia de las categorías que incluía ese día
--    (turno_item_categorias), para que editar el combo después no altere el historial.
--  * Categorías y combos se desactivan, no se borran (activa / activo).
--  * La matrícula del vehículo es opcional: hay autos que llegan sin ella, o clientes de los que
--    no se tiene ese dato al momento de cargarlos.

-- ---------------------------------------------------------------- organización

create table public.organizaciones (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(btrim(nombre)) > 0),
  logo_url    text,
  color_marca text not null default '#f28c1b' check (color_marca ~ '^#[0-9A-Fa-f]{6}$'),
  creado_en   timestamptz not null default now()
);

create table public.miembros (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  organizacion_id uuid not null references public.organizaciones (id) on delete cascade,
  creado_en       timestamptz not null default now()
);
create index miembros_organizacion_idx on public.miembros (organizacion_id);

-- Organización del usuario autenticado. security definer porque RLS de `miembros` no permite leer
-- las filas de otros usuarios, y esta función la necesitan las políticas de TODAS las tablas.
create function public.mi_organizacion() returns uuid
language sql stable security definer
set search_path = ''
as $$
  select organizacion_id from public.miembros where user_id = (select auth.uid())
$$;

revoke execute on function public.mi_organizacion() from public, anon;
grant execute on function public.mi_organizacion() to authenticated;

-- Al crear un usuario: si trae `organizacion_id` en sus metadatos (vino de un link de invitación
-- `/crear-cuenta?org=...`) y esa organización existe, se suma a ella. Si no, se le crea una
-- organización nueva y queda como su único miembro.
create function public.manejar_nuevo_usuario() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_org_meta uuid;
  v_org      uuid;
begin
  v_org_meta := nullif(new.raw_user_meta_data ->> 'organizacion_id', '')::uuid;

  if v_org_meta is not null and exists (select 1 from public.organizaciones where id = v_org_meta) then
    v_org := v_org_meta;
  else
    insert into public.organizaciones (nombre)
    values (coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nombre_empresa'), ''), 'Mi negocio'))
    returning id into v_org;
  end if;

  insert into public.miembros (user_id, organizacion_id) values (new.id, v_org);
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.manejar_nuevo_usuario();

-- Email de cada miembro de la organización del que llama. security definer porque `authenticated`
-- no puede leer auth.users directamente.
create function public.miembros_equipo() returns table (email text, creado_en timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select u.email, m.creado_en
  from public.miembros m
  join auth.users u on u.id = m.user_id
  where m.organizacion_id = public.mi_organizacion()
  order by m.creado_en
$$;

revoke execute on function public.miembros_equipo() from public, anon;
grant execute on function public.miembros_equipo() to authenticated;

-- ---------------------------------------------------------------- tablas de dominio

create table public.clientes (
  id              bigint generated always as identity primary key,
  organizacion_id uuid not null default public.mi_organizacion() references public.organizaciones (id) on delete cascade,
  nombre          text not null check (length(btrim(nombre)) > 0),
  telefono        text,
  notas           text,
  creado_en       timestamptz not null default now()
);

create table public.vehiculos (
  id              bigint generated always as identity primary key,
  organizacion_id uuid not null default public.mi_organizacion() references public.organizaciones (id) on delete cascade,
  cliente_id      bigint not null references public.clientes (id) on delete restrict,
  matricula       text check (matricula is null or length(btrim(matricula)) > 0),
  marca_modelo    text not null default '',
  tamano          text not null default 'mediano' check (tamano in ('chico', 'mediano', 'grande', 'camioneta')),
  creado_en       timestamptz not null default now()
);
-- La matrícula es única sin importar mayúsculas ni espacios ("sab 1234" = "SAB1234"). NULL = sin
-- matrícula: Postgres nunca considera dos NULL iguales, así que varios vehículos sin matrícula de
-- la misma organización no chocan entre sí.
create unique index vehiculos_matricula_uq
  on public.vehiculos (organizacion_id, upper(regexp_replace(matricula, '\s', '', 'g')));
create index vehiculos_cliente_idx on public.vehiculos (cliente_id);

create table public.categorias (
  id                 bigint generated always as identity primary key,
  organizacion_id    uuid not null default public.mi_organizacion() references public.organizaciones (id) on delete cascade,
  nombre             text not null check (length(btrim(nombre)) > 0),
  color              text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  precio_referencia  integer check (precio_referencia >= 0),
  activa             boolean not null default true,
  creado_en          timestamptz not null default now()
);
create unique index categorias_nombre_uq on public.categorias (organizacion_id, lower(nombre));

create table public.combos (
  id                 bigint generated always as identity primary key,
  organizacion_id    uuid not null default public.mi_organizacion() references public.organizaciones (id) on delete cascade,
  nombre             text not null check (length(btrim(nombre)) > 0),
  precio_referencia  integer not null check (precio_referencia >= 0),
  activo             boolean not null default true,
  creado_en          timestamptz not null default now()
);
create unique index combos_nombre_uq on public.combos (organizacion_id, lower(nombre));

create table public.combo_categorias (
  combo_id        bigint not null references public.combos (id) on delete cascade,
  categoria_id    bigint not null references public.categorias (id) on delete restrict,
  organizacion_id uuid not null default public.mi_organizacion() references public.organizaciones (id) on delete cascade,
  primary key (combo_id, categoria_id)
);
create index combo_categorias_categoria_idx on public.combo_categorias (categoria_id);

create table public.turnos (
  id              bigint generated always as identity primary key,
  organizacion_id uuid not null default public.mi_organizacion() references public.organizaciones (id) on delete cascade,
  vehiculo_id     bigint not null references public.vehiculos (id) on delete restrict,
  inicio          timestamptz not null,
  estado          text not null default 'agendado' check (estado in ('agendado', 'realizado', 'cancelado')),
  medio_pago      text check (medio_pago in ('efectivo', 'transferencia', 'debito', 'credito')),
  notas           text,
  creado_en       timestamptz not null default now(),
  -- Un turno realizado siempre dice cómo se cobró.
  constraint turnos_realizado_con_pago check (estado <> 'realizado' or medio_pago is not null)
);
create index turnos_vehiculo_idx on public.turnos (vehiculo_id);
create index turnos_inicio_idx on public.turnos (inicio);

create table public.turno_items (
  id              bigint generated always as identity primary key,
  organizacion_id uuid not null default public.mi_organizacion() references public.organizaciones (id) on delete cascade,
  turno_id        bigint not null references public.turnos (id) on delete cascade,
  tipo            text not null check (tipo in ('servicio', 'combo')),
  categoria_id    bigint references public.categorias (id) on delete restrict,
  combo_id        bigint references public.combos (id) on delete restrict,
  precio_cobrado  integer not null check (precio_cobrado >= 0),
  nota_ajuste     text,
  constraint turno_items_tipo_coherente check (
    (tipo = 'servicio' and categoria_id is not null and combo_id is null) or
    (tipo = 'combo' and combo_id is not null and categoria_id is null)
  )
);
create index turno_items_turno_idx on public.turno_items (turno_id);
create index turno_items_categoria_idx on public.turno_items (categoria_id) where categoria_id is not null;
create index turno_items_combo_idx on public.turno_items (combo_id) where combo_id is not null;

-- Copia de las categorías que incluía el combo al momento de cobrarlo.
create table public.turno_item_categorias (
  item_id         bigint not null references public.turno_items (id) on delete cascade,
  categoria_id    bigint not null references public.categorias (id) on delete restrict,
  organizacion_id uuid not null default public.mi_organizacion() references public.organizaciones (id) on delete cascade,
  primary key (item_id, categoria_id)
);
create index turno_item_categorias_categoria_idx on public.turno_item_categorias (categoria_id);

-- ---------------------------------------------------------------- copia de categorías del combo

create function public.copiar_categorias_del_combo() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.turno_item_categorias where item_id = new.id;
  if new.tipo = 'combo' then
    insert into public.turno_item_categorias (item_id, categoria_id, organizacion_id)
    select new.id, cc.categoria_id, new.organizacion_id
    from public.combo_categorias cc
    where cc.combo_id = new.combo_id;
  end if;
  return new;
end;
$$;

create trigger turno_items_copiar_categorias
  after insert or update of tipo, combo_id on public.turno_items
  for each row execute function public.copiar_categorias_del_combo();

-- ---------------------------------------------------------------- alta de cliente + vehículo

-- Alta de un cliente con su primer vehículo en una sola transacción. Solo crea el vehículo si se
-- cargó matrícula o marca/modelo; si ambos quedan vacíos, el cliente queda sin vehículos. La
-- matrícula vacía se guarda como NULL, nunca como ''.
create function public.crear_cliente(
  p_nombre text,
  p_telefono text,
  p_notas text,
  p_matricula text,
  p_marca_modelo text,
  p_tamano text
) returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into public.clientes (nombre, telefono, notas)
  values (p_nombre, p_telefono, p_notas)
  returning id into v_id;

  if (p_matricula is not null and length(btrim(p_matricula)) > 0)
     or (p_marca_modelo is not null and length(btrim(p_marca_modelo)) > 0) then
    insert into public.vehiculos (cliente_id, matricula, marca_modelo, tamano)
    values (v_id, nullif(btrim(p_matricula), ''), coalesce(p_marca_modelo, ''), coalesce(p_tamano, 'mediano'));
  end if;

  return v_id;
end;
$$;

revoke execute on function public.crear_cliente(text, text, text, text, text, text) from public, anon;
grant execute on function public.crear_cliente(text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------- vistas

-- Un turno con su total y su fecha local (Montevideo).
create view public.v_turnos_total with (security_invoker = true) as
select
  t.id,
  t.vehiculo_id,
  t.inicio,
  (t.inicio at time zone 'America/Montevideo')::date as fecha,
  t.estado,
  t.medio_pago,
  t.notas,
  coalesce(sum(i.precio_cobrado), 0)::integer as total,
  count(i.id)::integer as cantidad_items
from public.turnos t
left join public.turno_items i on i.turno_id = t.id
group by t.id;

-- Un renglón por servicio realizado, sea suelto o venga dentro de un combo.
-- Alimenta el conteo de servicios por categoría de Reportes.
create view public.v_servicios_realizados with (security_invoker = true) as
select
  t.id as turno_id,
  (t.inicio at time zone 'America/Montevideo')::date as fecha,
  i.id as item_id,
  i.categoria_id,
  'suelto'::text as origen,
  null::bigint as combo_id
from public.turnos t
join public.turno_items i on i.turno_id = t.id and i.tipo = 'servicio'
where t.estado = 'realizado'
union all
select
  t.id,
  (t.inicio at time zone 'America/Montevideo')::date,
  i.id,
  ic.categoria_id,
  'combo',
  i.combo_id
from public.turnos t
join public.turno_items i on i.turno_id = t.id and i.tipo = 'combo'
join public.turno_item_categorias ic on ic.item_id = i.id
where t.estado = 'realizado';

-- Resumen por cliente para el listado: cuánto se le facturó, cuántas visitas y la última.
-- Solo cuentan los turnos realizados.
create view public.v_clientes_resumen with (security_invoker = true) as
select
  c.id as cliente_id,
  coalesce(sum(t.total) filter (where t.estado = 'realizado'), 0)::integer as facturado,
  (count(t.id) filter (where t.estado = 'realizado'))::integer as visitas,
  max(t.fecha) filter (where t.estado = 'realizado') as ultima_visita
from public.clientes c
left join public.vehiculos v on v.cliente_id = c.id
left join public.v_turnos_total t on t.vehiculo_id = v.id
group by c.id;

-- ---------------------------------------------------------------- seguridad (RLS) — organización

alter table public.organizaciones enable row level security;
revoke all on public.organizaciones from anon;
grant select, update on public.organizaciones to authenticated;

create policy organizaciones_select on public.organizaciones for select to authenticated
  using (id = public.mi_organizacion());
create policy organizaciones_update on public.organizaciones for update to authenticated
  using (id = public.mi_organizacion()) with check (id = public.mi_organizacion());
-- Sin policy de insert/delete: una organización solo se crea desde el trigger `al_crear_usuario`
-- (security definer, corre con privilegios elevados, no como `authenticated`).

alter table public.miembros enable row level security;
revoke all on public.miembros from anon;
grant select on public.miembros to authenticated;

create policy miembros_select on public.miembros for select to authenticated
  using (organizacion_id = public.mi_organizacion());
-- Sin policy de insert/update/delete: la membresía solo se crea desde el trigger `al_crear_usuario`.

-- ---------------------------------------------------------------- seguridad (RLS) — dominio

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'clientes', 'vehiculos', 'categorias', 'combos', 'combo_categorias',
    'turnos', 'turno_items', 'turno_item_categorias'
  ] loop
    execute format('alter table public.%I enable row level security', tabla);
    execute format('revoke all on public.%I from anon', tabla);
    execute format('grant select, insert, update, delete on public.%I to authenticated', tabla);

    execute format('create policy %I on public.%I for select to authenticated using (organizacion_id = public.mi_organizacion())',
                   tabla || '_select', tabla);
    execute format('create policy %I on public.%I for insert to authenticated with check (organizacion_id = public.mi_organizacion())',
                   tabla || '_insert', tabla);
    execute format('create policy %I on public.%I for update to authenticated using (organizacion_id = public.mi_organizacion()) with check (organizacion_id = public.mi_organizacion())',
                   tabla || '_update', tabla);
    execute format('create policy %I on public.%I for delete to authenticated using (organizacion_id = public.mi_organizacion())',
                   tabla || '_delete', tabla);
  end loop;
end
$$;

revoke all on public.v_turnos_total, public.v_servicios_realizados, public.v_clientes_resumen from anon;
grant select on public.v_turnos_total, public.v_servicios_realizados, public.v_clientes_resumen to authenticated;

-- ---------------------------------------------------------------- storage (logo de la organización)

insert into storage.buckets (id, name, public) values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Convención de ruta: logos/<organizacion_id>/archivo. La lectura es pública (bucket público);
-- solo un miembro de la organización puede subir/reemplazar/borrar sus propios archivos.
create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = public.mi_organizacion()::text);
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.mi_organizacion()::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = public.mi_organizacion()::text);
create policy logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.mi_organizacion()::text);
