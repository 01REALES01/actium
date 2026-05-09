-- =============================================================================
-- ACTIUM | 0002 — Tenant Core (Empresas, Subempresas, Usuarios)
-- =============================================================================
-- Fundacion del modelo multi-tenant. La jerarquia es:
--   Empresa  ->  Subempresa  ->  Usuario  ->  Proyecto (en 0003)
-- El aislamiento se evalua por (empresa_id, subempresa_id) en cada policy de
-- RLS (ver 0009). SUPER_ADMIN tiene empresa_id = NULL.
-- =============================================================================

-- Helper trigger para mantener updated_at en cualquier tabla
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- EMPRESAS
-- =============================================================================
-- Cliente top-level. Cada empresa tiene 1+ subempresas y N usuarios. El logo
-- vive en bucket 'logos-empresas' (publico).
CREATE TABLE public.empresas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  nit         TEXT NOT NULL UNIQUE,
  logo_path   TEXT,                     -- Path en storage.objects
  email       CITEXT,
  telefono    TEXT,
  direccion   TEXT,
  ciudad      TEXT,
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ                -- Soft delete; las RLS filtran NULL
);

CREATE INDEX idx_empresas_activa ON public.empresas (activa) WHERE deleted_at IS NULL;
CREATE INDEX idx_empresas_nombre_trgm ON public.empresas USING GIN (nombre gin_trgm_ops);

CREATE TRIGGER trg_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.empresas IS
  'Cliente top-level del SaaS. Cada empresa contiene N subempresas con aislamiento estricto.';

-- =============================================================================
-- SUBEMPRESAS
-- =============================================================================
-- Particion logica dentro de una empresa. Dos subempresas de la misma empresa
-- NO pueden ver datos entre si (validado en RLS).
CREATE TABLE public.subempresas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nombre      TEXT NOT NULL,
  nit         TEXT,
  descripcion TEXT,
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  UNIQUE (empresa_id, nombre)
);

CREATE INDEX idx_subempresas_empresa ON public.subempresas (empresa_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_subempresas_updated_at
  BEFORE UPDATE ON public.subempresas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.subempresas IS
  'Subdivision de una empresa. SUBCLIENTEs solo ven datos de su subempresa asignada.';

-- =============================================================================
-- USUARIOS
-- =============================================================================
-- Tabla de perfil que extiende auth.users de Supabase. El id es FK 1:1 a
-- auth.users.id; la fila se crea automaticamente via trigger handle_new_user
-- (ver 0008). Los claims JWT (empresa_id, subempresa_id, rol) se setean al
-- login y se leen desde RLS sin tocar esta tabla en cada query.
CREATE TABLE public.usuarios (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id      UUID REFERENCES public.empresas(id) ON DELETE RESTRICT,
  subempresa_id   UUID REFERENCES public.subempresas(id) ON DELETE RESTRICT,
  rol             user_role NOT NULL,
  nombre          TEXT NOT NULL,
  email           CITEXT NOT NULL UNIQUE,
  telefono        TEXT,
  cedula          TEXT,
  cargo           TEXT,
  avatar_path     TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- super_admin: empresa_id puede ser NULL (acceso global).
  -- Cualquier otro rol: empresa_id es obligatorio.
  CONSTRAINT chk_empresa_segun_rol CHECK (
    (rol = 'super_admin') OR (empresa_id IS NOT NULL)
  ),

  -- subempresa_id solo se usa para SUBCLIENTE y OPERATIVO; coherencia con empresa.
  CONSTRAINT chk_subempresa_pertenece_empresa CHECK (
    subempresa_id IS NULL OR empresa_id IS NOT NULL
  )
);

CREATE INDEX idx_usuarios_empresa ON public.usuarios (empresa_id) WHERE activo;
CREATE INDEX idx_usuarios_subempresa ON public.usuarios (subempresa_id) WHERE activo;
CREATE INDEX idx_usuarios_rol ON public.usuarios (rol) WHERE activo;

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.usuarios IS
  'Perfil de usuario espejo de auth.users. La FK a auth.users garantiza que cada login tiene un perfil.';
COMMENT ON COLUMN public.usuarios.empresa_id IS
  'NULL solo para super_admin. Validado por chk_empresa_segun_rol.';
