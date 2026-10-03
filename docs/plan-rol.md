# Plan: roles, permisos y reservas online

> Estado: **solo diseño**. No hay código escrito. Este documento fija lo acordado y lo que sigue abierto.

## 1. Situación actual

- `miembros(user_id PK, organizacion_id)` no tiene rol: todo miembro ve y edita todo lo de su organización. Un usuario pertenece a una sola organización.
- El aislamiento es solo por organización. Todas las tablas usan la misma policy: `organizacion_id = mi_organizacion()`. Las funciones del dominio son `security invoker`, así que RLS aplica.
- `clientes` es una ficha que carga el negocio (nombre, teléfono, notas). No está asociada a `auth.users`, así que un cliente no puede loguearse.
- `Nav` muestra las 5 secciones (Agenda, Registro, Clientes, Reportes, Ajustes) a todos. Las Server Actions solo llaman a `requireUser()`, que verifica sesión pero no rol.
- El trigger `manejar_nuevo_usuario` toma `organizacion_id` de `raw_user_meta_data`, que el usuario controla al registrarse. Hoy lo contiene `ALTA_ABIERTA = false` (`src/lib/alta.ts`). Con roles hay que reemplazarlo por invitaciones firmadas antes de reabrir el alta.

## 2. Actores

| Actor | Qué es | Tabla |
|---|---|---|
| **Staff** | Dueño, admin o empleado de un negocio | `miembros` + columna `rol` |
| **Cliente final** | Persona que reserva en un negocio | `cliente_cuentas`, nueva |

Los clientes finales **no** entran a `miembros`: esa tabla implica "ve todo el negocio" y mezclarlos obligaría a reescribir todas las policies.

## 3. Roles de staff

`miembros.rol` como enum: `owner`, `admin`, `empleado`. Si más adelante cada negocio quiere definir sus roles, se agregan tablas `roles` y `permisos`.

| Recurso | owner | admin | empleado |
|---|---|---|---|
| Agenda (ver y tomar turnos) | ✅ | ✅ | ✅ (alcance por definir, ver §9) |
| Registro (historial) | ✅ | ✅ | ✅ sin montos |
| Clientes | ✅ | ✅ | ✅ nombre y teléfono, sin facturación |
| Reportes y facturación | ✅ | ✅ | ❌ |
| Ajustes: catálogo, precios y combos | ✅ | ✅ | ❌ |
| Ajustes: empresa, equipo y reservas online | ✅ | ❌ | ❌ |

Si el empleado ve solo lo suyo, hace falta `turnos.asignado_a`, que hoy no existe.

## 4. Dónde se impone

Dos capas:

- **Base de datos (RLS), la capa real.** `mi_rol()` junto a `mi_organizacion()` y policies partidas por rol. Ojo con las vistas y funciones que exponen montos (`v_turnos_total`, `v_clientes_resumen`, `reporte_detalle`): hoy las lee cualquier miembro. Se restringen a admin y owner, o se crean variantes sin importes para el empleado.
- **Aplicación, la capa de UX.** `requireRol()` en `src/lib/auth.ts` para páginas y Server Actions, `getUser()` devolviendo el rol, `Nav` filtrando `SECTIONS`, y `/reportes` y `/ajustes` con `redirect` si el rol no alcanza. Ocultar el menú no es seguridad por sí solo.

## 5. Reservas online del cliente

### Interruptores del negocio

Los controla **solo el owner**, desde Ajustes → Empresa. Ambos viven en `organizaciones`.

| Columna | Default | Qué hace |
|---|---|---|
| `reservas_online boolean not null default false` | **apagado** | Habilita que los clientes agenden por su cuenta. |
| `reservas_requieren_aprobacion boolean not null default true` | **pendiente** | Si está activo, la reserva entra como `pendiente` y el negocio la confirma. Si no, entra directamente `agendado`. |

Decisiones:

- **Apagado por defecto.** Ningún negocio recibe reservas de desconocidos hasta que su dueño lo active.
- **Aprobación por defecto activa.** Mientras no se decida otra cosa, al encender las reservas online lo más conservador es que el negocio confirme cada una. El owner puede pasar a confirmación automática.
- `reservas_requieren_aprobacion` solo tiene efecto si `reservas_online` está encendido.
- Apagar `reservas_online` frena reservas nuevas. No borra cuentas, historial ni turnos ya reservados.

### Estado nuevo en turnos

Agregar `pendiente` al `check` de `turnos.estado` (hoy: `agendado`, `realizado`, `cancelado`). Flujo con aprobación:

`pendiente` → (el negocio confirma) → `agendado` → `realizado`
`pendiente` → (el negocio rechaza o el cliente cancela) → `cancelado`

Hay que decidir si un turno `pendiente` bloquea el horario en la agenda (ver §9).

### Cómo se hace cumplir

El cliente no escribe en `turnos` directamente. Una función `reservar_turno(p_org, p_inicio, p_servicios)` con `security definer`:

1. Rechaza si `organizaciones.reservas_online` es falso. Es la validación real, un POST directo con el interruptor apagado también falla.
2. Valida que el horario esté libre (hoy no hay modelo de horarios ni disponibilidad, ver §7).
3. Toma `cliente_id` de `auth.uid()` (vía `cliente_cuentas`), nunca del input.
4. Impone los precios del catálogo.
5. Crea el turno en `pendiente` o `agendado` según `reservas_requieren_aprobacion`.

Además:

- La página pública `/{slug}/reservar` muestra "Este negocio no recibe reservas online" si el interruptor está apagado.
- Se agrega `organizaciones.slug` (único) para armar la URL.
- Los datos públicos del negocio (nombre, logo, color, si acepta reservas) se exponen con una función `security definer` por `slug`, sin abrir la tabla a `anon`.
- Policies del cliente: `select` de sus propios turnos y `update` solo para cancelar los suyos.
- Alternativa más simple: reserva pública sin cuenta (sin "mis turnos" ni cancelación segura).

### Quién confirma

Confirmar o rechazar un turno `pendiente`: owner y admin. Si el empleado también puede hacerlo se define en §9.

## 6. Invitaciones

Reemplazan el link `?org=<id>` por `invitaciones(token, organizacion_id, rol, email, expira_en, usada_en)`. El trigger consume el token y toma el rol de ahí, no de metadata editable. El owner decide qué rol recibe cada persona.

## 7. Pendientes de modelado

- Horarios de atención y disponibilidad por negocio.
- Duración de los servicios.
- Margen de agenda: anticipación mínima y máximo hacia adelante.
- Notificación al negocio cuando entra una reserva `pendiente`, y al cliente cuando se confirma o rechaza.

## 8. Impacto en usuarios actuales y despliegue

El cambio se puede hacer sin cortar a nadie si se respeta el orden. El riesgo es el desfase entre código y base durante el deploy: las migraciones se aplican con `npm run db:push` y el código se despliega aparte en Amplify.

**Migraciones aditivas, seguras para el código viejo:**

- `miembros.rol` con `default 'owner'` y `not null`: los miembros existentes conservan exactamente lo que ven hoy. En organizaciones con varios miembros todos quedan como `owner`, y el dueño real debería revisarlo después.
- `organizaciones.reservas_online default false` y `reservas_requieren_aprobacion default true`: las organizaciones existentes no cambian de comportamiento.
- `slug`: generarlo para las filas existentes (desde `nombre`, con sufijo si hay duplicados) **antes** de ponerle `unique` y `not null`.
- Tablas nuevas (`cliente_cuentas`, `invitaciones`): no afectan lo existente.
- Cambiar el trigger `manejar_nuevo_usuario` solo afecta cuentas nuevas.

**Lo que sí puede cambiar el acceso:** las policies y vistas por rol. Si un miembro queda con rol `null` o con un valor que la policy no contempla, pierde acceso en silencio. Por eso `rol` va con `default` y `not null`, y se prueba con un usuario de cada rol.

Otros puntos:

- `src/proxy.ts` hoy redirige a `/login` todo lo que no sea `/login` o `/crear-cuenta`. Hay que dejar pasar las rutas públicas del portal.
- Agregar `pendiente` al `check` de `turnos.estado` cambia una constraint existente: revisar las funciones y vistas que filtran por estado.

**Orden de despliegue:**

1. Migraciones aditivas (columnas con default, tablas nuevas).
2. Código que usa `rol` y los interruptores, con la base ya migrada.
3. Policies y vistas restrictivas, cuando el código ya las espera.

**Precauciones:** probar en un proyecto de Supabase de staging o una branch de base de datos, y hacer backup antes de `db:push`.

Para el usuario actual no cambia nada al principio: mismos permisos y pantallas. Lo único nuevo, visible solo para el owner, es en Ajustes la gestión de roles y los interruptores.

## 9. Preguntas abiertas

1. ¿El empleado ve todos los turnos del negocio o solo los asignados a él?
2. ¿Los clientes necesitan cuenta, o alcanza con reservar sin login?
3. ¿Los roles son fijos (owner, admin, empleado) o los define cada negocio?
4. ¿Una misma cuenta de cliente puede estar en varios negocios?
5. Con las reservas online apagadas, ¿los clientes con cuenta pueden seguir cancelando sus turnos ya agendados?
6. ¿Un turno `pendiente` bloquea el horario en la agenda mientras espera confirmación?
7. ¿Puede el empleado confirmar o rechazar turnos pendientes, o solo owner y admin?
8. ¿Hay que avisar al cliente por correo (o WhatsApp) cuando su reserva se confirma o se rechaza?

## 10. Orden de implementación

1. Migración: enum `rol`, `miembros.rol` (existentes = owner), `mi_rol()` e `invitaciones`.
2. Policies y vistas por rol, `requireRol()` y filtrado del `Nav`.
3. UI de Ajustes → Equipo: cambiar rol e invitar con rol.
4. `slug`, `reservas_online`, `reservas_requieren_aprobacion` y sus toggles (solo owner) en Ajustes → Empresa.
5. Horarios y disponibilidad por negocio.
6. Estado `pendiente`, bandeja de confirmación y `reservar_turno()`.
7. Cuentas de cliente final y portal de reserva.
