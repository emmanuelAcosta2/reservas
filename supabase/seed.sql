-- Datos de ejemplo SOLO para desarrollo. Se corre con `npm run db:seed`, después de dar de alta el
-- primer usuario (vía /crear-cuenta en la app, o Authentication > Users). Es idempotente: si esa
-- organización ya tiene categorías, no hace nada.
-- Las fechas son relativas a hoy: hace ~8 semanas hasta 1 semana hacia adelante.

do $$
declare
  org        uuid := (select organizacion_id from public.miembros order by creado_en limit 1);
  lav bigint; tap bigint; cer bigint; ali bigint; pol bigint;
  cb1 bigint; cb2 bigint; cb3 bigint;
  cats_w     bigint[];
  combos_a   bigint[];
  clientes   bigint[];
  d          date;
  hs         int[];
  h          int;
  n          int;
  cli        bigint;
  r          float;
  kinds      text[];
  kind       text;
  used       bigint[];
  pick       bigint;
  precio     integer;
  nota       text;
  est        text;
  pago       text;
  turno      bigint;
  hoy_h      int := extract(hour from now() at time zone 'America/Montevideo');
  hoy        date := (now() at time zone 'America/Montevideo')::date;
begin
  if org is null then
    raise exception 'Creá primero una cuenta en /crear-cuenta (o un usuario en Authentication > Users).';
  end if;
  if exists (select 1 from public.categorias where organizacion_id = org) then
    raise notice 'Ya hay datos; no se siembra nada.';
    return;
  end if;

  insert into public.categorias (organizacion_id, nombre, color, precio_referencia) values (org, 'Lavado', '#2F8CFF', 600) returning id into lav;
  insert into public.categorias (organizacion_id, nombre, color, precio_referencia) values (org, 'Tapizado', '#F28C1B', 2200) returning id into tap;
  insert into public.categorias (organizacion_id, nombre, color, precio_referencia) values (org, 'Cerámico', '#A78BFA', 9500) returning id into cer;
  insert into public.categorias (organizacion_id, nombre, color, precio_referencia) values (org, 'Alineación y balanceo', '#F5C400', 1400) returning id into ali;
  insert into public.categorias (organizacion_id, nombre, color, precio_referencia) values (org, 'Polarizado', '#3DD6C4', 3800) returning id into pol;

  insert into public.combos (organizacion_id, nombre, precio_referencia) values (org, 'Lavado + Tapizado', 2500) returning id into cb1;
  insert into public.combos (organizacion_id, nombre, precio_referencia) values (org, 'Full Detailing', 11500) returning id into cb2;
  insert into public.combos (organizacion_id, nombre, precio_referencia) values (org, 'Lavado + Alineación', 1800) returning id into cb3;
  insert into public.combo_categorias (organizacion_id, combo_id, categoria_id) values
    (org, cb1, lav), (org, cb1, tap),
    (org, cb2, lav), (org, cb2, tap), (org, cb2, cer),
    (org, cb3, lav), (org, cb3, ali);

  insert into public.clientes (organizacion_id, nombre, telefono, notas) values
    (org, 'Martín Rodríguez', '099 123 456', 'Prefiere turnos por la mañana.'),
    (org, 'Lucía Fernández', '098 765 432', null),
    (org, 'Diego Pereira', '094 221 908', null),
    (org, 'Camila Techera', '091 334 770', null),
    (org, 'Nicolás Silva', '099 888 210', null),
    (org, 'Valentina Acosta', '096 452 118', 'Cliente frecuente, cada 15 días.'),
    (org, 'Rodrigo Long', '092 610 447', null),
    (org, 'Sofía Martínez', '098 101 332', null);

  select array_agg(id order by id) into clientes from public.clientes where organizacion_id = org;
  cats_w := array[lav, lav, lav, tap, ali, ali, pol, cer];
  combos_a := array[cb1, cb2, cb3];
  perform setseed(0.26);

  for d in select g::date from generate_series(hoy - 55, hoy + 7, interval '1 day') g loop
    continue when extract(isodow from d) = 7;
    n := case when d > hoy then 1 + floor(random() * 3) else 2 + floor(random() * 3) end;
    select array_agg(x order by x) into hs
    from (select unnest(array[9, 10, 11, 12, 14, 15, 16, 17, 18]) as x order by random() limit n) s;

    foreach h in array hs loop
      cli := clientes[1 + floor(random() * array_length(clientes, 1))];

      if d > hoy or (d = hoy and h >= hoy_h) then
        est := 'agendado'; pago := null;
      elsif random() < 0.06 then
        est := 'cancelado'; pago := null;
      else
        est := 'realizado';
        pago := (array['efectivo', 'transferencia', 'debito', 'credito'])[1 + floor(random() * 4)];
      end if;

      insert into public.turnos (organizacion_id, cliente_id, inicio, estado, medio_pago)
      values (org, cli, (d + make_time(h, case when random() < 0.3 then 30 else 0 end, 0)) at time zone 'America/Montevideo', est, pago)
      returning id into turno;

      r := random();
      kinds := case when r < 0.4 then array['s'] when r < 0.62 then array['c']
                    when r < 0.8 then array['c', 's'] else array['s', 's'] end;
      used := array[]::bigint[];

      foreach kind in array kinds loop
        loop
          pick := case when kind = 'c' then combos_a[1 + floor(random() * 3)] else cats_w[1 + floor(random() * 8)] end;
          exit when not (pick = any (used));
        end loop;
        used := used || pick;

        if kind = 'c' then
          select precio_referencia into precio from public.combos where id = pick;
        else
          select precio_referencia into precio from public.categorias where id = pick;
        end if;
        precio := round(precio / 50.0)::integer * 50;
        nota := null;
        if random() < 0.12 then
          precio := round(precio * 0.9 / 50.0)::integer * 50;
          nota := 'Descuento cliente frecuente';
        end if;

        if kind = 'c' then
          insert into public.turno_items (organizacion_id, turno_id, tipo, combo_id, precio_cobrado, nota_ajuste)
          values (org, turno, 'combo', pick, precio, nota);
        else
          insert into public.turno_items (organizacion_id, turno_id, tipo, categoria_id, precio_cobrado, nota_ajuste)
          values (org, turno, 'servicio', pick, precio, nota);
        end if;
      end loop;
    end loop;
  end loop;

  raise notice 'Datos de ejemplo cargados.';
end
$$;
