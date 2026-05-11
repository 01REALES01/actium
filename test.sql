-- =============================================================================
-- ACTIUM | seed.sql — Datos de prueba para desarrollo local
-- =============================================================================
-- Valida aislamiento multi-tenant: dos subempresas de la misma empresa no
-- deben verse entre si. Se crean usuarios de prueba con passwords 'seed1234'.
-- NOTA: En Supabase local los usuarios auth se crean via Admin API o el CLI;
-- aqui se insertan directamente para el entorno de supabase db reset.
-- =============================================================================

-- Desactivar triggers de sync durante el seed para evitar conflictos
SET session_replication_role = replica;

-- =============================================================================
-- IDs FIJOS (para referencias cruzadas predecibles en tests)
-- =============================================================================
-- Empresa
-- ee000000-0000-0000-0000-000000000001  Argos S.A.S.

-- Subempresas
-- 5e000000-0000-0000-0000-000000000001  Argos Operaciones
-- 5e000000-0000-0000-0000-000000000002  Argos Mantenimiento

-- Usuarios (mismo id que auth.users)
-- 00000000-0000-0000-0000-000000000001  super_admin
-- 00000000-0000-0000-0000-000000000002  admin
-- 00000000-0000-0000-0000-000000000003  cliente_principal
-- 00000000-0000-0000-0000-000000000004  subcliente_ops   (Operaciones)
-- 00000000-0000-0000-0000-000000000005  subcliente_mant  (Mantenimiento)
-- 00000000-0000-0000-0000-000000000006  sst
-- 00000000-0000-0000-0000-000000000007  operativo
-- 00000000-0000-0000-0000-000000000008  financiero

-- Proyectos
-- a0000000-0000-0000-0000-000000000001  Instalacion Linea MT — Operaciones
-- a0000000-0000-0000-0000-000000000002  Mantenimiento Subestacion — Mantenimiento

-- =============================================================================
-- AUTH.USERS (seed directo — incluye campos requeridos por GoTrue)
-- =============================================================================
INSERT INTO auth.users (
  instance_id, id, aud, role,
  email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token,
  reauthentication_token,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated',
   'superadmin@actium.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"super_admin","nombre":"Super Admin"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated',
   'admin@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"admin","nombre":"Admin Argos","empresa_id":"ee000000-0000-0000-0000-000000000001"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000003',
   'authenticated', 'authenticated',
   'principal@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"cliente_principal","nombre":"Cliente Principal","empresa_id":"ee000000-0000-0000-0000-000000000001"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000004',
   'authenticated', 'authenticated',
   'ops@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"subcliente","nombre":"Subcliente Operaciones","empresa_id":"ee000000-0000-0000-0000-000000000001","subempresa_id":"5e000000-0000-0000-0000-000000000001"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000005',
   'authenticated', 'authenticated',
   'mant@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"subcliente","nombre":"Subcliente Mantenimiento","empresa_id":"ee000000-0000-0000-0000-000000000001","subempresa_id":"5e000000-0000-0000-0000-000000000002"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000006',
   'authenticated', 'authenticated',
   'sst@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"sst","nombre":"Gestor SST","empresa_id":"ee000000-0000-0000-0000-000000000001"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000007',
   'authenticated', 'authenticated',
   'operativo@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"operativo","nombre":"Tecnico Campo","empresa_id":"ee000000-0000-0000-0000-000000000001","subempresa_id":"5e000000-0000-0000-0000-000000000001"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000008',
   'authenticated', 'authenticated',
   'financiero@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"financiero","nombre":"Gestor Financiero","empresa_id":"ee000000-0000-0000-0000-000000000001"}'::jsonb,
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- AUTH.IDENTITIES (requerido por signInWithPassword con provider email)
-- =============================================================================

