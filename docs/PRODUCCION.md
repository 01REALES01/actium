# ACTIUM — Base de datos de producción

El proyecto Supabase **`vtksbnctdrszpodntyfw`** es producción. No existe un proyecto
de desarrollo separado: por decisión explícita (límite de proyectos gratuitos en la
organización), se reutilizó el único proyecto existente, eliminando todos los datos
de prueba y dejando el esquema intacto.

> Cualquier prueba o desarrollo futuro debe hacerse contra una **branch de Supabase**
> o una instancia **local** (`npx supabase start`) — nunca insertando datos de prueba
> directamente aquí.

El esquema vive como migraciones en [`supabase/migrations/`](../supabase/migrations/).
Este documento cubre la configuración que **no** viaja en las migraciones y el
procedimiento para mantener la base al día.

---

## 0. Requisitos

- Supabase CLI instalada como devDependency (`npm install`). Se usa vía `npx supabase`.
- Cuenta de Supabase con acceso a la organización `Actium`.
- Cuenta de Vercel con el proyecto de la app conectado.

## 1. Estado actual (referencia)

- Proyecto: `actium` — ref `vtksbnctdrszpodntyfw` — región `us-east-1`.
- Esquema desplegado: 36 tablas, 23 triggers, 47 políticas RLS, 97 funciones, 6 buckets de Storage.
- Datos de negocio: **ninguno** (limpieza ejecutada — ver sección 6).
- Custom Access Token Hook: **habilitado**, apunta a `public.custom_access_token_hook`.

## 2. Enlazar el repo localmente (para futuras migraciones)

```bash
npx supabase login
npx supabase link --project-ref vtksbnctdrszpodntyfw   # pide la db-password del proyecto
```

Si no se tiene la contraseña de la base, puede restablecerse desde el Dashboard
(Project Settings → Database → Reset database password). Esto no afecta a la app,
que se conecta vía API con las llaves `anon`/`service_role`, no con esa contraseña.

## 3. Custom Access Token Hook

Ya está habilitado en este proyecto (`hook_custom_access_token_enabled = true`,
apuntando a `public.custom_access_token_hook`, creada por la migración
[20260510000001_jwt_hook.sql](../supabase/migrations/20260510000001_jwt_hook.sql)).
Sin este hook, el JWT no llevaría `rol`, `empresa_id`, `subempresa_id` y **todas las
políticas RLS fallarían**. Verificar tras cualquier recreación de proyecto:

Dashboard → **Authentication → Hooks → Customize Access Token (JWT) Claims**.

### Bug crítico encontrado y corregido: `search_path` en triggers de Auth

Al crear el primer super admin se detectó que **toda alta de usuario fallaba**
(`Database error creating new user` / en logs de Postgres: `type "user_role" does
not exist`). Causa: `handle_new_user()` es `SECURITY DEFINER` pero no fija su propio
`search_path`; al ser invocada por el rol interno `supabase_auth_admin` (que no
tiene `public` en su `search_path`), el cast `(v_meta ->> 'rol')::user_role` no podía
resolver el tipo `user_role`.

Corregido en la migración
[20260621000001_fix_search_path_auth_triggers.sql](../supabase/migrations/20260621000001_fix_search_path_auth_triggers.sql),
que fija `SET search_path = public, pg_temp` en `handle_new_user`,
`sync_ultimo_login` y `custom_access_token_hook` (las tres funciones invocadas por
`supabase_auth_admin` vía triggers en `auth.users` o el JWT hook). Ya aplicada en
este proyecto. **Si se crea un proyecto nuevo desde cero, esta migración debe estar
incluida en `db push` — sin ella, ningún usuario puede registrarse.**

## 4. Configurar Auth para el dominio de producción [pendiente]

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: actualmente `http://localhost:3000` — cambiar a la URL real de
  producción en Vercel (p. ej. `https://actium.vercel.app` o dominio propio) en
  cuanto exista el despliegue.
- **Redirect URLs**: añadir esa misma URL (y los previews `*.vercel.app` si se usarán).

## 5. Crear el primer super admin — ✅ hecho

Ya existe un super admin real en este proyecto (creado tras el fix de la sección 3).
Procedimiento usado, para referencia futura (p. ej. si se recrea el proyecto):

Con las variables de este proyecto (ya están en `.env.local`):

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL  = "https://vtksbnctdrszpodntyfw.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service_role_key de .env.local>"
$env:SUPERADMIN_EMAIL          = "admin@tudominio.com"
$env:SUPERADMIN_PASSWORD       = "<password_fuerte>"
$env:SUPERADMIN_NOMBRE         = "Nombre Apellido"
node scripts/create-superadmin.mjs
```

El trigger `handle_new_user` crea el perfil en `public.usuarios` con `rol=super_admin`
y `empresa_id=NULL`. El script verifica que quedó bien. Es de **un solo uso** por base
virgen (falla si el email ya existe).

## 6. Limpieza ejecutada (referencia histórica)

El día del corte a producción se eliminó, en este orden:

1. Archivos reales en Storage (`fotos-proyectos`, `documentos-empleados`) vía
   `storage.from(bucket).remove(...)` con la llave `service_role` — preserva los
   buckets y sus policies, solo borra los objetos.
2. Usuarios de `auth.users` vía `admin.auth.admin.deleteUser()` — cascada automática
   a `public.usuarios` por la FK `ON DELETE CASCADE`.
3. `TRUNCATE` de las 35 tablas de negocio en `public` (datos de seed/pruebas:
   empresa demo "Argos", 8 usuarios, proyectos, formularios SST, etc.).

Verificado después: 0 filas en las 36 tablas, 0 usuarios en Auth, 0 objetos en
Storage, y el esquema (tablas/triggers/políticas RLS/funciones/buckets) intacto.

## 7. Variables de entorno en Vercel

Vercel → Project → **Settings → Environment Variables** (entorno **Production**),
con los mismos valores de `.env.local`:

| Variable | Notas |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública |
| `SUPABASE_SERVICE_ROLE_KEY` | **secreta**, solo server |

Redeploy para que tomen efecto.

## 8. Tipos TypeScript

El script `db:types` en `package.json` ya apunta a este proyecto:

```bash
npm run db:types     # regenera src/types/database.types.ts
```

---

## Mantenimiento: aplicar nuevas migraciones

1. Crear la migración nueva en `supabase/migrations/` (probar localmente con `npx supabase db reset`, que sí corre `seed.sql` — solo en local).
2. `npx supabase db push` contra el proyecto enlazado.
3. `npm run db:types` y commitear los tipos actualizados.

## Verificación end-to-end

1. `npx supabase migration list` → todas aplicadas en remoto.
2. SQL editor: `select count(*) from public.usuarios` = solo el super admin.
3. Login del super admin en la app; inspeccionar el JWT → debe incluir `rol`,
   `empresa_id`, `subempresa_id`.
4. Crear una empresa de prueba desde el panel admin y confirmar que persiste.
5. Subir un archivo a un bucket para validar las policies de Storage.
