-- =============================================================================
-- ACTIUM | 0001 — Extensiones y Enums
-- =============================================================================
-- Establece extensiones de PostgreSQL y enums tipados que se usan en todas las
-- migraciones posteriores. Los enums dan integridad referencial a nivel de tipo
-- (mejor que CHECK constraints sueltos) y rinden mejor en queries.
-- =============================================================================

-- pgcrypto: gen_random_uuid() para PKs UUID v4
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_trgm: busquedas fuzzy en nombres de proyectos/empleados (ILIKE acelerado)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- citext: emails case-insensitive
CREATE EXTENSION IF NOT EXISTS citext;

-- =============================================================================
-- ENUMS DE DOMINIO
-- =============================================================================

-- Roles del sistema. La jerarquia de permisos se evalua en helpers JWT (0008).
CREATE TYPE user_role AS ENUM (
  'super_admin',        -- Admin global de la plataforma Actium
  'admin',              -- Admin de una empresa cliente
  'cliente_principal',  -- Ve todos los proyectos de su empresa
  'subcliente',         -- Aislado a su subempresa
  'sst',                -- Gestor de SST
  'operativo',          -- Personal de campo, solo proyectos asignados
  'financiero'          -- Gestor de presupuesto
);

-- Estados del ciclo de vida de un proyecto
CREATE TYPE proyecto_estado AS ENUM (
  'planificacion',
  'en_curso',
  'pausado',
  'completado',
  'cancelado'
);

-- Estados del ciclo de vida de un formulario SST
CREATE TYPE formulario_estado AS ENUM (
  'borrador',
  'completado',
  'firmado',
  'archivado'
);

-- Tipo de formulario SST
CREATE TYPE formulario_tipo AS ENUM (
  'ats',
  'permiso_altura',
  'permiso_caliente'
);

-- Clasificacion de eventos SST
CREATE TYPE incidente_tipo AS ENUM (
  'incidente',
  'accidente',
  'casi_accidente'
);

CREATE TYPE incidente_severidad AS ENUM (
  'leve',
  'moderado',
  'grave',
  'critico'
);

-- Tipos de ausentismo (con o sin soporte legal)
CREATE TYPE ausentismo_tipo AS ENUM (
  'medico',
  'personal',
  'incapacidad',
  'vacaciones',
  'otro'
);

-- Tipos de documento del empleado para gestion SST
CREATE TYPE documento_empleado_tipo AS ENUM (
  'cedula',
  'arl',
  'eps',
  'certificacion_altura',
  'certificacion_caliente',
  'examen_medico',
  'otro'
);

-- Estados del flujo de aprobacion de movimientos presupuestales
CREATE TYPE movimiento_estado AS ENUM (
  'solicitado',
  'aprobado',
  'rechazado',
  'ejecutado'
);

CREATE TYPE movimiento_tipo AS ENUM (
  'gasto',
  'traslado_entre_rubros',
  'ajuste'
);

-- Decision final del ATS sobre proceder o detener la tarea
CREATE TYPE riesgo_decision AS ENUM (
  'proceder',
  'detener'
);

-- Resultado de cada item de checklist en formularios SST
CREATE TYPE chequeo_resultado AS ENUM (
  'si',
  'no',
  'na'
);

-- Momento de firma en permiso caliente (mismos trabajadores firman al inicio y al final)
CREATE TYPE firma_momento AS ENUM (
  'inicio',
  'fin'
);
