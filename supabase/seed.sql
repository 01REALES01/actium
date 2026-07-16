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
   '', '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"super_admin","nombre":"Super Admin"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated',
   'admin@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"admin","nombre":"Admin Argos","empresa_id":"ee000000-0000-0000-0000-000000000001"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000003',
   'authenticated', 'authenticated',
   'principal@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"cliente_principal","nombre":"Cliente Principal","empresa_id":"ee000000-0000-0000-0000-000000000001"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000004',
   'authenticated', 'authenticated',
   'ops@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"subcliente","nombre":"Subcliente Operaciones","empresa_id":"ee000000-0000-0000-0000-000000000001","subempresa_id":"5e000000-0000-0000-0000-000000000001"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000005',
   'authenticated', 'authenticated',
   'mant@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"subcliente","nombre":"Subcliente Mantenimiento","empresa_id":"ee000000-0000-0000-0000-000000000001","subempresa_id":"5e000000-0000-0000-0000-000000000002"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000006',
   'authenticated', 'authenticated',
   'sst@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"sst","nombre":"Gestor SST","empresa_id":"ee000000-0000-0000-0000-000000000001"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000007',
   'authenticated', 'authenticated',
   'operativo@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"operativo","nombre":"Tecnico Campo","empresa_id":"ee000000-0000-0000-0000-000000000001","subempresa_id":"5e000000-0000-0000-0000-000000000001"}'::jsonb,
   NOW(), NOW()),

  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000008',
   'authenticated', 'authenticated',
   'financiero@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '', '', '', '', '', '', '', '',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"rol":"financiero","nombre":"Gestor Financiero","empresa_id":"ee000000-0000-0000-0000-000000000001"}'::jsonb,
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- AUTH.IDENTITIES (requerido por signInWithPassword con provider email)
-- =============================================================================
INSERT INTO auth.identities (
  provider_id, user_id, identity_data,
  provider, last_sign_in_at, created_at, updated_at
)
SELECT
  u.email,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  NOW(), NOW(), NOW()
FROM auth.users u
WHERE u.id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008'
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- =============================================================================
-- EMPRESA
-- =============================================================================
INSERT INTO public.empresas (id, nombre, nit, email, telefono, ciudad, activa)
VALUES (
  'ee000000-0000-0000-0000-000000000001',
  'Argos S.A.S.',
  '900123456-7',
  'contacto@argos.dev',
  '+57 1 3456789',
  'Bogota',
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SUBEMPRESAS
-- =============================================================================
INSERT INTO public.subempresas (id, empresa_id, nombre, descripcion, activa)
VALUES
  ('5e000000-0000-0000-0000-000000000001',
   'ee000000-0000-0000-0000-000000000001',
   'Argos Operaciones',
   'Unidad de operaciones en campo electrico',
   TRUE),
  ('5e000000-0000-0000-0000-000000000002',
   'ee000000-0000-0000-0000-000000000001',
   'Argos Mantenimiento',
   'Unidad de mantenimiento de infraestructura',
   TRUE)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- USUARIOS (perfiles — el trigger handle_new_user los crea normalmente)
-- =============================================================================
INSERT INTO public.usuarios (id, empresa_id, subempresa_id, rol, nombre, email, activo)
VALUES
  ('00000000-0000-0000-0000-000000000001', NULL,                                         NULL,                                         'super_admin',       'Super Admin',            'superadmin@actium.dev',   TRUE),
  ('00000000-0000-0000-0000-000000000002', 'ee000000-0000-0000-0000-000000000001',        NULL,                                         'admin',             'Admin Argos',            'admin@argos.dev',         TRUE),
  ('00000000-0000-0000-0000-000000000003', 'ee000000-0000-0000-0000-000000000001',        NULL,                                         'cliente_principal', 'Cliente Principal',      'principal@argos.dev',     TRUE),
  ('00000000-0000-0000-0000-000000000004', 'ee000000-0000-0000-0000-000000000001',        '5e000000-0000-0000-0000-000000000001',        'subcliente',        'Subcliente Operaciones', 'ops@argos.dev',           TRUE),
  ('00000000-0000-0000-0000-000000000005', 'ee000000-0000-0000-0000-000000000001',        '5e000000-0000-0000-0000-000000000002',        'subcliente',        'Subcliente Mantenimiento','mant@argos.dev',         TRUE),
  ('00000000-0000-0000-0000-000000000006', 'ee000000-0000-0000-0000-000000000001',        NULL,                                         'sst',               'Gestor SST',             'sst@argos.dev',           TRUE),
  ('00000000-0000-0000-0000-000000000007', 'ee000000-0000-0000-0000-000000000001',        '5e000000-0000-0000-0000-000000000001',        'operativo',         'Tecnico Campo',          'operativo@argos.dev',     TRUE),
  ('00000000-0000-0000-0000-000000000008', 'ee000000-0000-0000-0000-000000000001',        NULL,                                         'financiero',        'Gestor Financiero',      'financiero@argos.dev',    TRUE)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PROYECTOS
-- =============================================================================
INSERT INTO public.proyectos (
  id, empresa_id, subempresa_id, codigo, nombre, descripcion,
  ciudad, fecha_inicio, fecha_fin_proyectada, estado, presupuesto_total, created_by
)
VALUES
  ('a0000000-0000-0000-0000-000000000001',
   'ee000000-0000-0000-0000-000000000001',
   '5e000000-0000-0000-0000-000000000001',
   'PRY-2026-001',
   'Instalacion Linea MT Zona Norte',
   'Instalacion de linea de media tension 13.2kV en zona norte de Bogota',
   'Bogota', '2026-01-15', '2026-06-30', 'en_curso', 850000000.00,
   '00000000-0000-0000-0000-000000000002'),

  ('a0000000-0000-0000-0000-000000000002',
   'ee000000-0000-0000-0000-000000000001',
   '5e000000-0000-0000-0000-000000000002',
   'PRY-2026-002',
   'Mantenimiento Subestacion Puente Aranda',
   'Mantenimiento preventivo y correctivo de subestacion 115kV',
   'Bogota', '2026-02-01', '2026-04-30', 'en_curso', 320000000.00,
   '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- Asignar usuario operativo al proyecto de Operaciones
INSERT INTO public.proyecto_usuarios (proyecto_id, usuario_id, asignado_por)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000002'
) ON CONFLICT DO NOTHING;

-- Avances de ejemplo
INSERT INTO public.proyecto_avances (proyecto_id, fecha, avance_real, avance_proyectado, registrado_por)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '2026-02-01',  8.00, 10.00, '00000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', '2026-03-01', 22.50, 25.00, '00000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', '2026-04-01', 41.00, 45.00, '00000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000002', '2026-02-15', 15.00, 20.00, '00000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000002', '2026-03-15', 55.00, 50.00, '00000000-0000-0000-0000-000000000006')
ON CONFLICT (proyecto_id, fecha) DO NOTHING;

-- =============================================================================
-- EMPLEADOS
-- =============================================================================
INSERT INTO public.empleados (
  id, empresa_id, subempresa_id, cedula, nombre, cargo, profesion,
  telefono, eps, arl, fecha_ingreso, activo
)
VALUES
  ('e0000000-0000-0000-0000-000000000001',
   'ee000000-0000-0000-0000-000000000001',
   '5e000000-0000-0000-0000-000000000001',
   '1020304050', 'Carlos Garzon', 'Electricista Jefe', 'Tecnologo Electrico',
   '+57 311 1234567', 'Sanitas', 'Sura', '2024-03-01', TRUE),

  ('e0000000-0000-0000-0000-000000000002',
   'ee000000-0000-0000-0000-000000000001',
   '5e000000-0000-0000-0000-000000000001',
   '1030405060', 'Andres Mora', 'Auxiliar Electrico', 'Bachiller Tecnico',
   '+57 312 2345678', 'Compensar', 'Sura', '2025-01-10', TRUE),

  ('e0000000-0000-0000-0000-000000000003',
   'ee000000-0000-0000-0000-000000000001',
   '5e000000-0000-0000-0000-000000000002',
   '1040506070', 'Maria Restrepo', 'Ing. Mantenimiento', 'Ingeniera Electrica',
   '+57 313 3456789', 'Famisanar', 'Positiva', '2023-07-15', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Asignaciones de empleados a proyectos
INSERT INTO public.empleado_proyectos (empleado_id, proyecto_id, asignado_por)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- AUSENTISMO E INCIDENTE DE EJEMPLO
-- =============================================================================
INSERT INTO public.ausentismos (
  empleado_id, proyecto_id, tipo, fecha_inicio, fecha_fin, razon, registrado_por
)
VALUES (
  'e0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'medico', '2026-03-10', '2026-03-12',
  'Incapacidad medica por gripa — EPS Compensar Formula 2026-03-09',
  '00000000-0000-0000-0000-000000000006'
) ON CONFLICT DO NOTHING;

INSERT INTO public.incidentes (
  id, empleado_id, proyecto_id, tipo, severidad, fecha,
  descripcion, acciones_tomadas, reportado_arl, registrado_por
)
VALUES (
  '1c000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'casi_accidente', 'leve',
  '2026-04-05 10:30:00+00',
  'Trabajador resbaló en área de excavación sin lesiones. Uso de EPP completo previno consecuencias.',
  'Señalización reforzada y charla de seguridad con el equipo.',
  FALSE,
  '00000000-0000-0000-0000-000000000006'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- FORMULARIO ATS DE EJEMPLO
-- =============================================================================
INSERT INTO public.formularios (
  id, empresa_id, subempresa_id, proyecto_id, tipo, estado,
  fecha_inicio, ciudad, ubicacion, area, creado_por
)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'ee000000-0000-0000-0000-000000000001',
  '5e000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'ats', 'completado',
  '2026-04-06', 'Bogota', 'Calle 80 con Av. Boyaca', 'Zona norte poste 47',
  '00000000-0000-0000-0000-000000000007'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ats_detalles (formulario_id, permiso_altura, permiso_caliente, decision)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  TRUE, FALSE, 'proceder'
) ON CONFLICT (formulario_id) DO NOTHING;

INSERT INTO public.ats_trabajadores (formulario_id, empleado_id, cargo)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Electricista Jefe'),
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'Auxiliar')
ON CONFLICT DO NOTHING;

INSERT INTO public.ats_pasos (formulario_id, orden, paso, peligros, controles)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 1, 'Aislar el circuito en BT', 'Arco electrico', 'Desenergizar y bloquear con candado personal'),
  ('f0000000-0000-0000-0000-000000000001', 2, 'Verificar ausencia de tension', 'Tension residual', 'Usar multimetro Cat III antes de tocar conductores'),
  ('f0000000-0000-0000-0000-000000000001', 3, 'Reemplazo de proteccion', 'Caida de herramienta', 'Usar porta-herramientas con correa de seguridad')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- RUBROS Y MOVIMIENTOS PRESUPUESTALES
-- =============================================================================
INSERT INTO public.rubros (id, proyecto_id, nombre, monto_maximo, orden)
VALUES
  ('ab000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Mano de Obra',       350000000.00, 1),
  ('ab000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Materiales',         300000000.00, 2),
  ('ab000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Equipos y Maquinaria',150000000.00, 3),
  ('ab000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Mano de Obra',       130000000.00, 1),
  ('ab000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Repuestos',          190000000.00, 2)
ON CONFLICT (id) DO NOTHING;

-- Movimientos: uno aprobado, uno solicitado, uno rechazado
INSERT INTO public.movimientos (
  proyecto_id, rubro_destino_id, tipo, monto, justificacion,
  estado, solicitado_por, aprobado_por, aprobado_at, ejecutado_at
)
VALUES
  -- Gasto aprobado y ejecutado en Materiales
  ('a0000000-0000-0000-0000-000000000001',
   'ab000000-0000-0000-0000-000000000002',
   'gasto', 45000000.00,
   'Compra de cable calibre 4/0 AWG para fase norte — OC #2026-0041',
   'ejecutado',
   '00000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000002',
   '2026-03-05 14:00:00+00',
   '2026-03-08 09:00:00+00'),

  -- Gasto solicitado (pendiente aprobacion)
  ('a0000000-0000-0000-0000-000000000001',
   'ab000000-0000-0000-0000-000000000003',
   'gasto', 28000000.00,
   'Alquiler grua telescopica 30 toneladas para izaje de transformador — 15 dias',
   'solicitado',
   '00000000-0000-0000-0000-000000000008',
   NULL, NULL, NULL),

  -- Gasto rechazado
  ('a0000000-0000-0000-0000-000000000001',
   'ab000000-0000-0000-0000-000000000001',
   'gasto', 15000000.00,
   'Subcontratacion personal adicional mes de marzo',
   'rechazado',
   '00000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000002',
   '2026-03-02 11:00:00+00',
   NULL)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PROYECTO INTERNO (finanzas) — reproduce el ejemplo de referencia FC.xlsx
-- =============================================================================
-- Mismo empresa/subempresa de Argos (proyectos.empresa_id es NOT NULL: no se
-- inventa una empresa "Actium" aparte solo para esto). Sirve para QA del
-- Flujo de Caja: los totales por quincena deben coincidir con el Excel de
-- referencia (columnas 15-may, 30-may, 15-jun, 30-jun, 15-jul, 30-jul).
INSERT INTO public.proyectos (
  id, empresa_id, subempresa_id, codigo, nombre, descripcion,
  ciudad, fecha_inicio, estado, es_interno, created_by
)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'ee000000-0000-0000-0000-000000000001',
  '5e000000-0000-0000-0000-000000000001',
  'PRY-2026-INT',
  'Operacion Interna Argos',
  'Presupuesto propio de la operacion (no facturable a cliente). Solo visible para super_admin.',
  'Bogota',
  '2026-05-01',
  'en_curso',
  TRUE,
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.rubros (id, proyecto_id, nombre, categoria, codigo, monto_maximo, orden)
VALUES
  ('ab000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'Costos Operativos',       'costos_operativos',       '1',   30000000.00, 1),
  ('ab000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 'Secretaria',              'gastos_administrativos',  '2.1',  8000000.00, 2),
  ('ab000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 'Jardinero',               'gastos_administrativos',  '2.2',  6000000.00, 3),
  ('ab000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 'Gastos Financieros',      'gastos_financieros',      '3',    5000000.00, 4),
  ('ab000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003', 'Ingresos',                'ingresos',                '4',  100000000.00, 5)
ON CONFLICT (id) DO NOTHING;

-- Movimientos ejecutados por quincena. El signo (ingreso vs egreso) lo aplica
-- vw_flujo_caja_quincenal segun la categoria del rubro — monto siempre > 0.
INSERT INTO public.movimientos (
  proyecto_id, rubro_destino_id, tipo, monto, justificacion,
  estado, solicitado_por, aprobado_por, aprobado_at, ejecutado_at, fecha_efectiva
)
VALUES
  -- Costos Operativos: 2.500.000 / 1.700.000 / 1.200.000 / 18.500.000 / — / 210.000
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000006', 'gasto', 2500000.00,  'Costos operativos quincena', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-05-15 09:00:00+00', '2026-05-15 09:00:00+00', '2026-05-15'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000006', 'gasto', 1700000.00,  'Costos operativos quincena', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-05-30 09:00:00+00', '2026-05-30 09:00:00+00', '2026-05-30'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000006', 'gasto', 1200000.00,  'Costos operativos quincena', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-06-15 09:00:00+00', '2026-06-15 09:00:00+00', '2026-06-15'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000006', 'gasto', 18500000.00, 'Costos operativos quincena — pico de materiales', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-06-30 09:00:00+00', '2026-06-30 09:00:00+00', '2026-06-30'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000006', 'gasto', 210000.00,   'Costos operativos quincena', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-07-30 09:00:00+00', '2026-07-30 09:00:00+00', '2026-07-30'),

  -- Secretaria: 1.000.000 en cada una de las 6 quincenas
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000007', 'gasto', 1000000.00, 'Nomina secretaria', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-05-15 09:00:00+00', '2026-05-15 09:00:00+00', '2026-05-15'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000007', 'gasto', 1000000.00, 'Nomina secretaria', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-05-30 09:00:00+00', '2026-05-30 09:00:00+00', '2026-05-30'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000007', 'gasto', 1000000.00, 'Nomina secretaria', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-06-15 09:00:00+00', '2026-06-15 09:00:00+00', '2026-06-15'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000007', 'gasto', 1000000.00, 'Nomina secretaria', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-06-30 09:00:00+00', '2026-06-30 09:00:00+00', '2026-06-30'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000007', 'gasto', 1000000.00, 'Nomina secretaria', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-07-15 09:00:00+00', '2026-07-15 09:00:00+00', '2026-07-15'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000007', 'gasto', 1000000.00, 'Nomina secretaria', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-07-30 09:00:00+00', '2026-07-30 09:00:00+00', '2026-07-30'),

  -- Jardinero: 800.000 en cada una de las 6 quincenas
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000008', 'gasto', 800000.00, 'Nomina jardinero', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-05-15 09:00:00+00', '2026-05-15 09:00:00+00', '2026-05-15'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000008', 'gasto', 800000.00, 'Nomina jardinero', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-05-30 09:00:00+00', '2026-05-30 09:00:00+00', '2026-05-30'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000008', 'gasto', 800000.00, 'Nomina jardinero', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-06-15 09:00:00+00', '2026-06-15 09:00:00+00', '2026-06-15'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000008', 'gasto', 800000.00, 'Nomina jardinero', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-06-30 09:00:00+00', '2026-06-30 09:00:00+00', '2026-06-30'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000008', 'gasto', 800000.00, 'Nomina jardinero', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-07-15 09:00:00+00', '2026-07-15 09:00:00+00', '2026-07-15'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000008', 'gasto', 800000.00, 'Nomina jardinero', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-07-30 09:00:00+00', '2026-07-30 09:00:00+00', '2026-07-30'),

  -- Gastos Financieros: 1.000.000 solo en los cortes de fin de mes (30)
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000009', 'gasto', 1000000.00, 'Comisiones bancarias', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-05-30 09:00:00+00', '2026-05-30 09:00:00+00', '2026-05-30'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000009', 'gasto', 1000000.00, 'Comisiones bancarias', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-06-30 09:00:00+00', '2026-06-30 09:00:00+00', '2026-06-30'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000009', 'gasto', 1000000.00, 'Comisiones bancarias', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-07-30 09:00:00+00', '2026-07-30 09:00:00+00', '2026-07-30'),

  -- Ingresos: 25.000.000 (5/15) y 45.000.000 (7/15)
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000010', 'gasto', 25000000.00, 'Anticipo contrato cliente', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-05-15 09:00:00+00', '2026-05-15 09:00:00+00', '2026-05-15'),
  ('a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000010', 'gasto', 45000000.00, 'Segundo desembolso contrato cliente', 'ejecutado', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-07-15 09:00:00+00', '2026-07-15 09:00:00+00', '2026-07-15')
ON CONFLICT DO NOTHING;

-- Ejemplo de CxC/CxP asociados a los rubros de arriba (no generan movimientos
-- adicionales — los movimientos ya se insertaron directamente en el bloque
-- anterior; en uso real, registrar_cobro_cxc/registrar_pago_cxp crean ambos
-- atomicamente).
INSERT INTO public.cuentas_por_cobrar (
  proyecto_id, rubro_id, cliente_nombre, numero_factura,
  monto_total, monto_cobrado, fecha_emision, fecha_vencimiento, estado, created_by
)
VALUES (
  'a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000010',
  'Cliente Demo S.A.S.', 'FE-2026-001',
  45000000.00, 45000000.00, '2026-07-01', '2026-07-15', 'pagada',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (proyecto_id, numero_factura) DO NOTHING;

INSERT INTO public.cuentas_por_pagar (
  proyecto_id, rubro_id, proveedor_nombre, numero_factura,
  monto_total, monto_pagado, fecha_emision, fecha_vencimiento, estado, created_by
)
VALUES (
  'a0000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000006',
  'Proveedor Materiales S.A.S.', 'FP-2026-001',
  18500000.00, 18500000.00, '2026-06-20', '2026-06-30', 'pagada',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (proyecto_id, proveedor_nit, numero_factura) DO NOTHING;

-- Restaurar comportamiento de replicacion
SET session_replication_role = DEFAULT;


-- =============================================================================
-- MAS EMPLEADOS
-- =============================================================================
INSERT INTO public.empleados (id, empresa_id, subempresa_id, cedula, nombre, cargo, profesion, telefono, eps, arl, fecha_ingreso, activo)
VALUES
  ('e0000000-0000-0000-0000-000000000004', 'ee000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', '1050607080', 'Lucia Santos', 'Inspectora de Seguridad', 'Ingeniera SST', '+57 314 4567890', 'Sura', 'Sura', '2022-01-15', TRUE),
  ('e0000000-0000-0000-0000-000000000005', 'ee000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', '1060708090', 'Jorge Villamil', 'Lider de Montaje', 'Tecnico Montador', '+57 315 5678901', 'Sanitas', 'Positiva', '2023-05-10', TRUE),
  ('e0000000-0000-0000-0000-000000000006', 'ee000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', '1070809000', 'Karina Blanco', 'Ingeniera Electrica', 'Ingeniera Electrica', '+57 316 6789012', 'Compensar', 'Sura', '2024-02-20', TRUE),
  ('e0000000-0000-0000-0000-000000000007', 'ee000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', '1080900011', 'Luis Fernando Rojas', 'Ayudante', 'Bachiller', '+57 317 7890123', 'Famisanar', 'Positiva', '2025-01-05', TRUE),
  ('e0000000-0000-0000-0000-000000000008', 'ee000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', '1090001122', 'Ana Maria Velez', 'Soldador', 'Tecnico Soldador', '+57 318 8901234', 'Sura', 'Sura', '2024-08-11', TRUE),
  ('e0000000-0000-0000-0000-000000000009', 'ee000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000002', '1100112233', 'Pedro Pablo Leon', 'Operador Maquinaria', 'Operador', '+57 319 9012345', 'Sanitas', 'Positiva', '2023-11-25', TRUE),
  ('e0000000-0000-0000-0000-000000000010', 'ee000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000002', '1110223344', 'Diana Carolina Perea', 'Supervisor de Obra', 'Arquitecta', '+57 320 0123456', 'Compensar', 'Sura', '2022-09-01', TRUE),
  ('e0000000-0000-0000-0000-000000000011', 'ee000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', '1120334455', 'Roberto Carlos Gomez', 'Electricista', 'Tecnico Electrico', '+57 321 1234567', 'Sura', 'Positiva', '2025-02-15', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.empleado_proyectos (empleado_id, proyecto_id, asignado_por)
VALUES
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- DOCUMENTOS SST (para probar Alertas y Vencimientos)
-- =============================================================================
INSERT INTO public.empleado_documentos (empleado_id, tipo, storage_path, vigencia_desde, vigencia_hasta)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'arl', 'url_dummy_arl', '2025-01-01', (CURRENT_DATE + INTERVAL '6 months')::DATE),
  ('e0000000-0000-0000-0000-000000000001', 'certificacion_altura', 'url_dummy_alt', '2025-01-01', (CURRENT_DATE + INTERVAL '6 months')::DATE),
  ('e0000000-0000-0000-0000-000000000001', 'examen_medico', 'url_dummy_med', '2025-01-01', (CURRENT_DATE + INTERVAL '6 months')::DATE),
  ('e0000000-0000-0000-0000-000000000002', 'arl', 'url_dummy_arl', '2025-01-10', (CURRENT_DATE + INTERVAL '8 months')::DATE),
  ('e0000000-0000-0000-0000-000000000002', 'certificacion_altura', 'url_dummy_alt', '2025-01-10', (CURRENT_DATE + INTERVAL '8 months')::DATE),
  ('e0000000-0000-0000-0000-000000000004', 'arl', 'url_dummy_arl', '2025-01-15', (CURRENT_DATE + INTERVAL '10 days')::DATE),
  ('e0000000-0000-0000-0000-000000000004', 'examen_medico', 'url_dummy_med', '2025-01-15', (CURRENT_DATE + INTERVAL '10 days')::DATE),
  ('e0000000-0000-0000-0000-000000000005', 'certificacion_altura', 'url_dummy_alt', '2023-05-10', (CURRENT_DATE - INTERVAL '5 days')::DATE),
  ('e0000000-0000-0000-0000-000000000005', 'arl', 'url_dummy_arl', '2023-05-10', (CURRENT_DATE + INTERVAL '1 year')::DATE),
  ('e0000000-0000-0000-0000-000000000006', 'eps', 'url_dummy_eps', '2024-02-20', (CURRENT_DATE + INTERVAL '3 months')::DATE),
  ('e0000000-0000-0000-0000-000000000006', 'arl', 'url_dummy_arl', '2024-02-20', (CURRENT_DATE + INTERVAL '3 months')::DATE),
  ('e0000000-0000-0000-0000-000000000007', 'examen_medico', 'url_dummy_med', '2024-01-05', (CURRENT_DATE - INTERVAL '1 month')::DATE),
  ('e0000000-0000-0000-0000-000000000007', 'arl', 'url_dummy_arl', '2024-01-05', (CURRENT_DATE + INTERVAL '15 days')::DATE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MAS INCIDENTES Y ACCIDENTES
-- =============================================================================
INSERT INTO public.incidentes (id, empleado_id, proyecto_id, tipo, severidad, fecha, descripcion, causas, acciones_tomadas, registrado_por)
VALUES
  ('1c000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'accidente', 'grave', '2026-05-01 14:00:00+00', 'Caida de altura desde andamio (2m). Fractura de tibia y perone.', 'Falta de aseguramiento en linea de vida', 'Traslado a centro medico, investigacion del accidente, reentrenamiento en alturas', '00000000-0000-0000-0000-000000000006'),
  ('1c000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'casi_accidente', 'moderado', '2026-05-08 09:15:00+00', 'Cortocircuito en tablero temporal, chispas cerca del trabajador.', 'Cableado expuesto y humedad en el ambiente', 'Reemplazo de tablero temporal, instalacion de guardas', '00000000-0000-0000-0000-000000000006'),
  ('1c000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'accidente', 'moderado', '2026-04-20 11:45:00+00', 'Corte profundo en mano derecha operando cortadora.', 'Uso incorrecto del equipo, distraccion', 'Sutura en centro medico (5 puntos), dotacion de guantes anticorte', '00000000-0000-0000-0000-000000000006')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MAS AUSENTISMOS
-- =============================================================================
INSERT INTO public.ausentismos (empleado_id, proyecto_id, tipo, fecha_inicio, fecha_fin, razon, registrado_por)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'vacaciones', '2026-05-15', '2026-05-30', 'Vacaciones anuales programadas', '00000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'incapacidad', '2026-05-02', '2026-06-01', 'Incapacidad por fractura de pierna', '00000000-0000-0000-0000-000000000006'),
  ('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'personal', '2026-05-05', '2026-05-05', 'Calamidad domestica', '00000000-0000-0000-0000-000000000006')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MAS AVANCES DIARIOS PARA GRAFICOS
-- =============================================================================
INSERT INTO public.proyecto_avances (proyecto_id, fecha, avance_real, avance_proyectado, registrado_por)
VALUES
  ('a0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '6 days', 42.0, 45.0, '00000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '5 days', 42.5, 46.0, '00000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '4 days', 44.0, 47.0, '00000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '3 days', 45.5, 48.0, '00000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '2 days', 46.0, 49.0, '00000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '1 days', 48.0, 50.0, '00000000-0000-0000-0000-000000000006'),
  ('a0000000-0000-0000-0000-000000000001', CURRENT_DATE, 49.5, 51.0, '00000000-0000-0000-0000-000000000006')
ON CONFLICT (proyecto_id, fecha) DO UPDATE SET 
  avance_real = EXCLUDED.avance_real, 
  avance_proyectado = EXCLUDED.avance_proyectado;



