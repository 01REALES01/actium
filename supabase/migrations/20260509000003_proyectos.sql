-- =============================================================================
-- ACTIUM | 0003 — Modulo de Proyectos
-- =============================================================================
-- Tablas centrales del Portal de Clientes. Cada proyecto pertenece a una
-- subempresa especifica (denormalizamos empresa_id para acelerar RLS y evitar
-- joins en cada query). Los avances (real vs proyectado) se almacenan como
-- snapshots diarios para alimentar las graficas de tendencia.
-- =============================================================================

-- =============================================================================
-- PROYECTOS
-- =============================================================================
CREATE TABLE public.proyectos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  subempresa_id           UUID NOT NULL REFERENCES public.subempresas(id) ON DELETE RESTRICT,
  codigo                  TEXT NOT NULL,                      -- ej: PRY-2026-001
  nombre                  TEXT NOT NULL,
  descripcion             TEXT,
  ubicacion               TEXT,
  ciudad                  TEXT,
  fecha_inicio            DATE,
  fecha_fin_proyectada    DATE,
  fecha_fin_real          DATE,
  estado                  proyecto_estado NOT NULL DEFAULT 'planificacion',
  presupuesto_total       NUMERIC(15,2),                       -- Vista resumen; detalle vive en rubros (0006)
  cliente_contacto        TEXT,
  cliente_telefono        TEXT,
  notas                   TEXT,
  created_by              UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ,

  UNIQUE (empresa_id, codigo),

  -- Coherencia: la subempresa pertenece a la empresa declarada (validado por trigger abajo).
  CONSTRAINT chk_fechas_proyecto CHECK (
    fecha_fin_proyectada IS NULL OR fecha_inicio IS NULL OR fecha_fin_proyectada >= fecha_inicio
  )
);

CREATE INDEX idx_proyectos_empresa ON public.proyectos (empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_proyectos_subempresa ON public.proyectos (subempresa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_proyectos_estado ON public.proyectos (estado) WHERE deleted_at IS NULL;
CREATE INDEX idx_proyectos_nombre_trgm ON public.proyectos USING GIN (nombre gin_trgm_ops);

CREATE TRIGGER trg_proyectos_updated_at
  BEFORE UPDATE ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger de coherencia: la subempresa debe pertenecer a la empresa declarada.
-- Sin esto, un cliente podria insertar un proyecto con empresa_id=A, subempresa_id=B
-- (donde B pertenece a otra empresa) y romper el aislamiento.
CREATE OR REPLACE FUNCTION public.validar_subempresa_proyecto()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM public.subempresas
  WHERE id = NEW.subempresa_id;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Subempresa % no existe', NEW.subempresa_id;
  END IF;

  IF v_empresa_id <> NEW.empresa_id THEN
    RAISE EXCEPTION 'Subempresa % no pertenece a la empresa %', NEW.subempresa_id, NEW.empresa_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proyectos_validar_subempresa
  BEFORE INSERT OR UPDATE OF empresa_id, subempresa_id ON public.proyectos
  FOR EACH ROW EXECUTE FUNCTION public.validar_subempresa_proyecto();

COMMENT ON TABLE public.proyectos IS
  'Proyecto operativo. Pertenece a una subempresa especifica. empresa_id se denormaliza para acelerar RLS.';

-- =============================================================================
-- PROYECTO_USUARIOS (asignacion de personal OPERATIVO)
-- =============================================================================
-- Tabla pivot. Un usuario OPERATIVO solo ve los proyectos donde esta asignado.
-- Roles superiores (admin, cliente_principal) no necesitan estar aqui.
CREATE TABLE public.proyecto_usuarios (
  proyecto_id   UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  usuario_id    UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  asignado_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  asignado_por  UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  retirado_at   TIMESTAMPTZ,
  PRIMARY KEY (proyecto_id, usuario_id)
);

CREATE INDEX idx_proyecto_usuarios_usuario ON public.proyecto_usuarios (usuario_id) WHERE retirado_at IS NULL;

COMMENT ON TABLE public.proyecto_usuarios IS
  'Asignacion explicita de usuarios OPERATIVO a proyectos. Los demas roles tienen acceso por jerarquia.';

-- =============================================================================
-- PROYECTO_AVANCES (snapshots diarios)
-- =============================================================================
-- Snapshots de avance real vs proyectado para alimentar charts. Un registro por
-- (proyecto, fecha). Los porcentajes son 0-100 con 2 decimales.
CREATE TABLE public.proyecto_avances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id         UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  fecha               DATE NOT NULL,
  avance_real         NUMERIC(5,2) NOT NULL CHECK (avance_real BETWEEN 0 AND 100),
  avance_proyectado   NUMERIC(5,2) NOT NULL CHECK (avance_proyectado BETWEEN 0 AND 100),
  notas               TEXT,
  registrado_por      UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (proyecto_id, fecha)
);

CREATE INDEX idx_avances_proyecto_fecha ON public.proyecto_avances (proyecto_id, fecha DESC);

COMMENT ON TABLE public.proyecto_avances IS
  'Snapshot diario de avance. Source of truth para charts real vs proyectado.';

-- =============================================================================
-- OBSERVACIONES
-- =============================================================================
-- Notas operativas, bloqueos, hitos. Texto libre con autor y timestamp.
CREATE TABLE public.observaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  autor_id    UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  contenido   TEXT NOT NULL,
  importante  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_observaciones_proyecto ON public.observaciones (proyecto_id, created_at DESC);

CREATE TRIGGER trg_observaciones_updated_at
  BEFORE UPDATE ON public.observaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- FOTOS (galeria de evidencias)
-- =============================================================================
-- Fotos con metadatos probatorios (lat/lng/timestamp). Mitigacion del riesgo
-- "Fotos sin metadatos probatorios" en la PRD: lat/lng/capturada_at deben
-- llenarse en el upload (validar en frontend; aqui son nullable para tolerar
-- fotos viejas/sin permisos GPS).
CREATE TABLE public.fotos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id     UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  autor_id        UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  storage_path    TEXT NOT NULL,                            -- bucket: fotos-proyectos
  nombre          TEXT,
  descripcion     TEXT,
  lat             NUMERIC(10,7),
  lng             NUMERIC(10,7),
  capturada_at    TIMESTAMPTZ,                              -- EXIF DateTimeOriginal
  exif_json       JSONB,                                    -- EXIF completo para auditoria
  tamano_bytes    BIGINT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fotos_proyecto ON public.fotos (proyecto_id, uploaded_at DESC);

COMMENT ON COLUMN public.fotos.exif_json IS
  'EXIF completo serializado. Permite recuperar metadatos no migrados a columnas dedicadas.';
