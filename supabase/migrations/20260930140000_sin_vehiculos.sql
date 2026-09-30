-- Este producto no modela vehículos: cada turno es directamente de un cliente, sin auto de por
-- medio. Migración limpia (las tablas están vacías en este punto, sin datos que preservar).

-- Las vistas dependen de la columna: hay que sacarlas de en medio antes de tocarla.
drop view public.v_clientes_resumen;
drop view public.v_turnos_total;

alter table public.turnos add column cliente_id bigint references public.clientes (id) on delete restrict;
-- Tabla vacía: no hace falta backfill antes de exigir el not null.
alter table public.turnos alter column cliente_id set not null;
alter table public.turnos drop column vehiculo_id;
create index turnos_cliente_idx on public.turnos (cliente_id);

create view public.v_turnos_total with (security_invoker = true) as
select
  t.id,
  t.cliente_id,
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

-- Resumen por cliente: ya no pasa por vehículos, el join es directo contra el turno.
create view public.v_clientes_resumen with (security_invoker = true) as
select
  c.id as cliente_id,
  coalesce(sum(t.total) filter (where t.estado = 'realizado'), 0)::integer as facturado,
  (count(t.id) filter (where t.estado = 'realizado'))::integer as visitas,
  max(t.fecha) filter (where t.estado = 'realizado') as ultima_visita
from public.clientes c
left join public.v_turnos_total t on t.cliente_id = c.id
group by c.id;

revoke all on public.v_turnos_total, public.v_clientes_resumen from anon;
grant select on public.v_turnos_total, public.v_clientes_resumen to authenticated;

-- Se lleva puesto el índice de matrícula única y las policies RLS de la tabla.
drop table public.vehiculos;

-- Sin vehículo que crear junto al cliente, el alta de cliente es un insert simple: no hace falta
-- una función transaccional.
drop function public.crear_cliente(text, text, text, text, text, text);

-- Postgres no permite renombrar un parámetro con create or replace: hay que borrar y recrear.
drop function public.guardar_turno(bigint, bigint, timestamptz, text, text, jsonb);

create function public.guardar_turno(
  p_id bigint,
  p_cliente_id bigint,
  p_inicio timestamptz,
  p_medio_pago text,
  p_notas text,
  p_items jsonb
) returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id     bigint;
  v_estado text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Un turno necesita al menos un servicio o combo' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.turnos (cliente_id, inicio, medio_pago, notas)
    values (p_cliente_id, p_inicio, p_medio_pago, p_notas)
    returning id into v_id;
  else
    select estado into v_estado from public.turnos where id = p_id for update;
    if not found then
      raise exception 'Turno inexistente' using errcode = 'P0002';
    end if;
    if v_estado = 'cancelado' then
      raise exception 'Un turno cancelado no se edita; volvelo a agendar primero' using errcode = '22023';
    end if;

    update public.turnos
       set cliente_id = p_cliente_id, inicio = p_inicio, medio_pago = p_medio_pago, notas = p_notas
     where id = p_id
    returning id into v_id;

    delete from public.turno_items where turno_id = v_id;
  end if;

  insert into public.turno_items (turno_id, tipo, categoria_id, combo_id, precio_cobrado, nota_ajuste)
  select v_id, x.tipo, x.categoria_id, x.combo_id, x.precio, nullif(btrim(x.nota), '')
  from jsonb_to_recordset(p_items) as x (tipo text, categoria_id bigint, combo_id bigint, precio integer, nota text);

  return v_id;
end;
$$;

revoke execute on function public.guardar_turno(bigint, bigint, timestamptz, text, text, jsonb) from public, anon;
grant execute on function public.guardar_turno(bigint, bigint, timestamptz, text, text, jsonb) to authenticated;
