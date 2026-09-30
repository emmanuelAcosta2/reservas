# Reservas

App de turnos, clientes y facturación para negocios de servicios (talleres, lavaderos, etc.),
multi-tenant: cada negocio es una **organización** con su propio logo, nombre y color de marca, y
sus datos están completamente aislados de los de las demás organizaciones vía RLS en Postgres.

Next.js (App Router) + Supabase (Postgres, Auth, Storage).

## Cómo funciona el multi-tenancy

- Cada usuario de Supabase Auth pertenece a una sola **organización** (tabla `miembros`).
- Al registrarse (`/crear-cuenta`), si no viene de un link de invitación se le crea una organización
  nueva (queda como su único miembro); si viene de `/crear-cuenta?org=<id>` (el link que se comparte
  desde Ajustes → Equipo), se suma a esa organización existente. El alta pública está pausada por
  ahora (ver `src/lib/alta.ts`): las cuentas se crean a mano hasta integrar cobro automático.
- Todas las tablas de dominio (`clientes`, `turnos`, etc.) tienen `organizacion_id`, con RLS que solo
  deja ver/editar filas de la organización del usuario logueado — ver
  `supabase/migrations/..._esquema_inicial.sql`.
- El logo, el nombre y el color de marca se editan en Ajustes → Empresa y se guardan en
  `organizaciones`; `src/app/layout.tsx` los lee en cada request y los aplica como variables CSS.

## Primeros pasos

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Copiá `.env.example` a `.env.local` y completá `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API) y `DATABASE_URL` (Connect → Session
   pooler, con la contraseña codificada como URL).
3. `npm install`
4. `npm run db:push` — aplica las migraciones de `supabase/migrations/`.
5. `npm run dev`, entrá a `/crear-cuenta` y creá la primera cuenta (y organización).
6. Opcional: `npm run db:seed` — carga datos de ejemplo para esa organización.
7. `npm run db:types` — regenera `src/lib/supabase/database.types.ts` desde el esquema real.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint`
- `npm run db:push` / `npm run db:seed` / `npm run db:types` — ver `scripts/db.mjs` (usan
  `DATABASE_URL` de `.env.local`)

## Deploy (AWS Amplify Hosting)

`amplify.yml` en la raíz define el build (Next.js SSR — Server Actions, Server Components y
`src/proxy.ts` necesitan runtime Node, no exportación estática).

1. Amplify Console → **New app → Host web app** → conectar el repo `emmanuelAcosta2/reservas`, rama
   `main`.
2. Variables de entorno de la app (Amplify Console → App settings → Environment variables) — **solo**
   las dos públicas, `DATABASE_URL` no la usa la app en runtime (es solo para `scripts/db.mjs` en
   local) y no debería cargarse acá:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Las migraciones (`npm run db:push`) se corren desde donde ya estén aplicadas hoy — Amplify solo
   construye y sirve la app, no toca la base.
