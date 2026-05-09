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
-- se000000-0000-0000-0000-000000000001  Argos Operaciones
-- se000000-0000-0000-0000-000000000002  Argos Mantenimiento

-- Usuarios (mismo id que auth.users)
-- uu000000-0000-0000-0000-000000000001  super_admin
-- uu000000-0000-0000-0000-000000000002  admin
-- uu000000-0000-0000-0000-000000000003  cliente_principal
-- uu000000-0000-0000-0000-000000000004  subcliente_ops   (Operaciones)
-- uu000000-0000-0000-0000-000000000005  subcliente_mant  (Mantenimiento)
-- uu000000-0000-0000-0000-000000000006  sst
-- uu000000-0000-0000-0000-000000000007  operativo
-- uu000000-0000-0000-0000-000000000008  financiero

-- Proyectos
-- pp000000-0000-0000-0000-000000000001  Instalacion Linea MT — Operaciones
-- pp000000-0000-0000-0000-000000000002  Mantenimiento Subestacion — Mantenimiento

-- =============================================================================
-- AUTH.USERS (seed directo para entorno local)
-- =============================================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES
  ('uu000000-0000-0000-0000-000000000001', 'superadmin@actium.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '{"rol":"super_admin","nombre":"Super Admin"}', NOW(), NOW()),

  ('uu000000-0000-0000-0000-000000000002', 'admin@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '{"rol":"admin","nombre":"Admin Argos","empresa_id":"ee000000-0000-0000-0000-000000000001"}', NOW(), NOW()),

  ('uu000000-0000-0000-0000-000000000003', 'principal@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '{"rol":"cliente_principal","nombre":"Cliente Principal","empresa_id":"ee000000-0000-0000-0000-000000000001"}', NOW(), NOW()),

  ('uu000000-0000-0000-0000-000000000004', 'ops@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '{"rol":"subcliente","nombre":"Subcliente Operaciones","empresa_id":"ee000000-0000-0000-0000-000000000001","subempresa_id":"se000000-0000-0000-0000-000000000001"}', NOW(), NOW()),

  ('uu000000-0000-0000-0000-000000000005', 'mant@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '{"rol":"subcliente","nombre":"Subcliente Mantenimiento","empresa_id":"ee000000-0000-0000-0000-000000000001","subempresa_id":"se000000-0000-0000-0000-000000000002"}', NOW(), NOW()),

  ('uu000000-0000-0000-0000-000000000006', 'sst@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '{"rol":"sst","nombre":"Gestor SST","empresa_id":"ee000000-0000-0000-0000-000000000001"}', NOW(), NOW()),

  ('uu000000-0000-0000-0000-000000000007', 'operativo@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '{"rol":"operativo","nombre":"Tecnico Campo","empresa_id":"ee000000-0000-0000-0000-000000000001","subempresa_id":"se000000-0000-0000-0000-000000000001"}', NOW(), NOW()),

  ('uu000000-0000-0000-0000-000000000008', 'financiero@argos.dev',
   crypt('seed1234', gen_salt('bf')), NOW(),
   '{"rol":"financiero","nombre":"Gestor Financiero","empresa_id":"ee000000-0000-0000-0000-000000000001"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

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
  ('se000000-0000-0000-0000-000000000001',
   'ee000000-0000-0000-0000-000000000001',
   'Argos Operaciones',
   'Unidad de operaciones en campo electrico',
   TRUE),
  ('se000000-0000-0000-0000-000000000002',
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
  ('uu000000-0000-0000-0000-000000000001', NULL,                                         NULL,                                         'super_admin',       'Super Admin',            'superadmin@actium.dev',   TRUE),
  ('uu000000-0000-0000-0000-000000000002', 'ee000000-0000-0000-0000-000000000001',        NULL,                                         'admin',             'Admin Argos',            'admin@argos.dev',         TRUE),
  ('uu000000-0000-0000-0000-000000000003', 'ee000000-0000-0000-0000-000000000001',        NULL,                                         'cliente_principal', 'Cliente Principal',      'principal@argos.dev',     TRUE),
  ('uu000000-0000-0000-0000-000000000004', 'ee000000-0000-0000-0000-000000000001',        'se000000-0000-0000-0000-000000000001',        'subcliente',        'Subcliente Operaciones', 'ops@argos.dev',           TRUE),
  ('uu000000-0000-0000-0000-000000000005', 'ee000000-0000-0000-0000-000000000001',        'se000000-0000-0000-0000-000000000002',        'subcliente',        'Subcliente Mantenimiento','mant@argos.dev',         TRUE),
  ('uu000000-0000-0000-0000-000000000006', 'ee000000-0000-0000-0000-000000000001',        NULL,                                         'sst',               'Gestor SST',             'sst@argos.dev',           TRUE),
  ('uu000000-0000-0000-0000-000000000007', 'ee000000-0000-0000-0000-000000000001',        'se000000-0000-0000-0000-000000000001',        'operativo',         'Tecnico Campo',          'operativo@argos.dev',     TRUE),
  ('uu000000-0000-0000-0000-000000000008', 'ee000000-0000-0000-0000-000000000001',        NULL,                                         'financiero',        'Gestor Financiero',      'financiero@argos.dev',    TRUE)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- PROYECTOS
-- =============================================================================
INSERT INTO public.proyectos (
  id, empresa_id, subempresa_id, codigo, nombre, descripcion,
  ciudad, fecha_inicio, fecha_fin_proyectada, estado, presupuesto_total, created_by
)
VALUES
  ('pp000000-0000-0000-0000-000000000001',
   'ee000000-0000-0000-0000-000000000001',
   'se000000-0000-0000-0000-000000000001',
   'PRY-2026-001',
   'Instalacion Linea MT Zona Norte',
   'Instalacion de linea de media tension 13.2kV en zona norte de Bogota',
   'Bogota', '2026-01-15', '2026-06-30', 'en_curso', 850000000.00,
   'uu000000-0000-0000-0000-000000000002'),

  ('pp000000-0000-0000-0000-000000000002',
   'ee000000-0000-0000-0000-000000000001',
   'se000000-0000-0000-0000-000000000002',
   'PRY-2026-002',
   'Mantenimiento Subestacion Puente Aranda',
   'Mantenimiento preventivo y correctivo de subestacion 115kV',
   'Bogota', '2026-02-01', '2026-04-30', 'en_curso', 320000000.00,
   'uu000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- Asignar usuario operativo al proyecto de Operaciones
INSERT INTO public.proyecto_usuarios (proyecto_id, usuario_id, asignado_por)
VALUES (
  'pp000000-0000-0000-0000-000000000001',
  'uu000000-0000-0000-0000-000000000007',
  'uu000000-0000-0000-0000-000000000002'
) ON CONFLICT DO NOTHING;

-- Avances de ejemplo
INSERT INTO public.proyecto_avances (proyecto_id, fecha, avance_real, avance_proyectado, registrado_por)
VALUES
  ('pp000000-0000-0000-0000-000000000001', '2026-02-01',  8.00, 10.00, 'uu000000-0000-0000-0000-000000000006'),
  ('pp000000-0000-0000-0000-000000000001', '2026-03-01', 22.50, 25.00, 'uu000000-0000-0000-0000-000000000006'),
  ('pp000000-0000-0000-0000-000000000001', '2026-04-01', 41.00, 45.00, 'uu000000-0000-0000-0000-000000000006'),
  ('pp000000-0000-0000-0000-000000000002', '2026-02-15', 15.00, 20.00, 'uu000000-0000-0000-0000-000000000006'),
  ('pp000000-0000-0000-0000-000000000002', '2026-03-15', 55.00, 50.00, 'uu000000-0000-0000-0000-000000000006')
ON CONFLICT (proyecto_id, fecha) DO NOTHING;

-- =============================================================================
-- EMPLEADOS
-- =============================================================================
INSERT INTO public.empleados (
  id, empresa_id, subempresa_id, cedula, nombre, cargo, profesion,
  telefono, eps, arl, fecha_ingreso, activo
)
VALUES
  ('em000000-0000-0000-0000-000000000001',
   'ee000000-0000-0000-0000-000000000001',
   'se000000-0000-0000-0000-000000000001',
   '1020304050', 'Carlos Garzon', 'Electricista Jefe', 'Tecnologo Electrico',
   '+57 311 1234567', 'Sanitas', 'Sura', '2024-03-01', TRUE),

  ('em000000-0000-0000-0000-000000000002',
   'ee000000-0000-0000-0000-000000000001',
   'se000000-0000-0000-0000-000000000001',
   '1030405060', 'Andres Mora', 'Auxiliar Electrico', 'Bachiller Tecnico',
   '+57 312 2345678', 'Compensar', 'Sura', '2025-01-10', TRUE),

  ('em000000-0000-0000-0000-000000000003',
   'ee000000-0000-0000-0000-000000000001',
   'se000000-0000-0000-0000-000000000002',
   '1040506070', 'Maria Restrepo', 'Ing. Mantenimiento', 'Ingeniera Electrica',
   '+57 313 3456789', 'Famisanar', 'Positiva', '2023-07-15', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Asignaciones de empleados a proyectos
INSERT INTO public.empleado_proyectos (empleado_id, proyecto_id, asignado_por)
VALUES
  ('em000000-0000-0000-0000-000000000001', 'pp000000-0000-0000-0000-000000000001', 'uu000000-0000-0000-0000-000000000006'),
  ('em000000-0000-0000-0000-000000000002', 'pp000000-0000-0000-0000-000000000001', 'uu000000-0000-0000-0000-000000000006'),
  ('em000000-0000-0000-0000-000000000003', 'pp000000-0000-0000-0000-000000000002', 'uu000000-0000-0000-0000-000000000006')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- AUSENTISMO E INCIDENTE DE EJEMPLO
-- =============================================================================
INSERT INTO public.ausentismos (
  empleado_id, proyecto_id, tipo, fecha_inicio, fecha_fin, razon, registrado_por
)
VALUES (
  'em000000-0000-0000-0000-000000000002',
  'pp000000-0000-0000-0000-000000000001',
  'medico', '2026-03-10', '2026-03-12',
  'Incapacidad medica por gripa — EPS Compensar Formula 2026-03-09',
  'uu000000-0000-0000-0000-000000000006'
);

INSERT INTO public.incidentes (
  id, empleado_id, proyecto_id, tipo, severidad, fecha,
  descripcion, acciones_tomadas, reportado_arl, registrado_por
)
VALUES (
  'ic000000-0000-0000-0000-000000000001',
  'em000000-0000-0000-0000-000000000001',
  'pp000000-0000-0000-0000-000000000001',
  'casi_accidente', 'leve',
  '2026-04-05 10:30:00+00',
  'Trabajador resbaló en área de excavación sin lesiones. Uso de EPP completo previno consecuencias.',
  'Señalización reforzada y charla de seguridad con el equipo.',
  FALSE,
  'uu000000-0000-0000-0000-000000000006'
);

-- =============================================================================
-- FORMULARIO ATS DE EJEMPLO
-- =============================================================================
INSERT INTO public.formularios (
  id, empresa_id, subempresa_id, proyecto_id, tipo, estado,
  fecha_inicio, ciudad, ubicacion, area, creado_por
)
VALUES (
  'fo000000-0000-0000-0000-000000000001',
  'ee000000-0000-0000-0000-000000000001',
  'se000000-0000-0000-0000-000000000001',
  'pp000000-0000-0000-0000-000000000001',
  'ats', 'completado',
  '2026-04-06', 'Bogota', 'Calle 80 con Av. Boyaca', 'Zona norte poste 47',
  'uu000000-0000-0000-0000-000000000007'
);

INSERT INTO public.ats_detalles (formulario_id, permiso_altura, permiso_caliente, decision)
VALUES (
  'fo000000-0000-0000-0000-000000000001',
  TRUE, FALSE, 'proceder'
);

INSERT INTO public.ats_trabajadores (formulario_id, empleado_id, cargo)
VALUES
  ('fo000000-0000-0000-0000-000000000001', 'em000000-0000-0000-0000-000000000001', 'Electricista Jefe'),
  ('fo000000-0000-0000-0000-000000000001', 'em000000-0000-0000-0000-000000000002', 'Auxiliar');

INSERT INTO public.ats_pasos (formulario_id, orden, paso, peligros, controles)
VALUES
  ('fo000000-0000-0000-0000-000000000001', 1, 'Aislar el circuito en BT', 'Arco electrico', 'Desenergizar y bloquear con candado personal'),
  ('fo000000-0000-0000-0000-000000000001', 2, 'Verificar ausencia de tension', 'Tension residual', 'Usar multimetro Cat III antes de tocar conductores'),
  ('fo000000-0000-0000-0000-000000000001', 3, 'Reemplazo de proteccion', 'Caida de herramienta', 'Usar porta-herramientas con correa de seguridad');

-- =============================================================================
-- RUBROS Y MOVIMIENTOS PRESUPUESTALES
-- =============================================================================
INSERT INTO public.rubros (id, proyecto_id, nombre, monto_maximo, orden)
VALUES
  ('rb000000-0000-0000-0000-000000000001', 'pp000000-0000-0000-0000-000000000001', 'Mano de Obra',       350000000.00, 1),
  ('rb000000-0000-0000-0000-000000000002', 'pp000000-0000-0000-0000-000000000001', 'Materiales',         300000000.00, 2),
  ('rb000000-0000-0000-0000-000000000003', 'pp000000-0000-0000-0000-000000000001', 'Equipos y Maquinaria',150000000.00, 3),
  ('rb000000-0000-0000-0000-000000000004', 'pp000000-0000-0000-0000-000000000002', 'Mano de Obra',       130000000.00, 1),
  ('rb000000-0000-0000-0000-000000000005', 'pp000000-0000-0000-0000-000000000002', 'Repuestos',          190000000.00, 2)
ON CONFLICT (id) DO NOTHING;

-- Movimientos: uno aprobado, uno solicitado, uno rechazado
INSERT INTO public.movimientos (
  proyecto_id, rubro_destino_id, tipo, monto, justificacion,
  estado, solicitado_por, aprobado_por, aprobado_at, ejecutado_at
)
VALUES
  -- Gasto aprobado y ejecutado en Materiales
  ('pp000000-0000-0000-0000-000000000001',
   'rb000000-0000-0000-0000-000000000002',
   'gasto', 45000000.00,
   'Compra de cable calibre 4/0 AWG para fase norte — OC #2026-0041',
   'ejecutado',
   'uu000000-0000-0000-0000-000000000008',
   'uu000000-0000-0000-0000-000000000002',
   '2026-03-05 14:00:00+00',
   '2026-03-08 09:00:00+00'),

  -- Gasto solicitado (pendiente aprobacion)
  ('pp000000-0000-0000-0000-000000000001',
   'rb000000-0000-0000-0000-000000000003',
   'gasto', 28000000.00,
   'Alquiler grua telescopica 30 toneladas para izaje de transformador — 15 dias',
   'solicitado',
   'uu000000-0000-0000-0000-000000000008',
   NULL, NULL, NULL),

  -- Gasto rechazado
  ('pp000000-0000-0000-0000-000000000001',
   'rb000000-0000-0000-0000-000000000001',
   'gasto', 15000000.00,
   'Subcontratacion personal adicional mes de marzo',
   'rechazado',
   'uu000000-0000-0000-0000-000000000008',
   'uu000000-0000-0000-0000-000000000002',
   '2026-03-02 11:00:00+00',
   NULL);

-- Restaurar comportamiento de replicacion
SET session_replication_role = DEFAULT;
