-- =============================================================================
-- ACTIUM | 0004 — SST: Empleados, Documentos, Ausentismos, Incidentes
-- =============================================================================
-- Personal operativo en campo. Los empleados pertenecen a una subempresa y se
-- asignan a 1+ proyectos. Sus documentos (ARL, EPS, certificaciones) viven en
-- bucket privado 'documentos-empleados'. Los ausentismos e incidentes son
-- inputs para los KPIs del Portal de Clientes (drill-downs interactivos).
-- =============================================================================

-- =============================================================================
-- EMPLEADOS
-- =============================================================================
CREATE TABLE public.empleados (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  subempresa_id   UUID NOT NULL REFERENCES public.subempresas(id) ON DELETE RESTRICT,
  cedula          TEXT NOT NULL,
  nombre          TEXT NOT NULL,
  cargo           TEXT,
  profesion       TEXT,
  telefono        TEXT,
  email           CITEXT,
  eps             TEXT,                              -- Nombre EPS afiliacion
  arl             TEXT,                              -- Nombre ARL afiliacion
  fondo_pension   TEXT,
  fecha_ingreso   DATE,
  fecha_retiro    DATE,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  foto_path       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  UNIQUE (empresa_id, cedula)
);

CREATE INDEX idx_empleados_empresa ON public.empleados (empresa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_empleados_subempresa ON public.empleados (subempresa_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_empleados_activo ON public.empleados (activo) WHERE deleted_at IS NULL;
CREATE INDEX idx_empleados_nombre_trgm ON public.empleados USING GIN (nombre gin_trgm_ops);

CREATE TRIGGER trg_empleados_updated_at
  BEFORE UPDATE ON public.empleados
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reusamos el trigger de coherencia subempresa-empresa (idempotente).
CREATE OR REPLACE FUNCTION public.validar_subempresa_empleado()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id UUID;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM public.subempresas
  WHERE id = NEW.subempresa_id;

  IF v_empresa_id IS NULL OR v_empresa_id <> NEW.empresa_id THEN
    RAISE EXCEPTION 'Subempresa % no pertenece a empresa %', NEW.subempresa_id, NEW.empresa_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_empleados_validar_subempresa
  BEFORE INSERT OR UPDATE OF empresa_id, subempresa_id ON public.empleados
  FOR EACH ROW EXECUTE FUNCTION public.validar_subempresa_empleado();

-- =============================================================================
-- EMPLEADO_DOCUMENTOS
-- =============================================================================
-- Cedula, ARL, EPS, certificados de altura/caliente, examenes medicos, etc.
-- vigencia_hasta permite alertar antes del vencimiento (ej: cert. altura).
CREATE TABLE public.empleado_documentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id     UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  tipo            documento_empleado_tipo NOT NULL,
  nombre          TEXT,                              -- Display name
  storage_path    TEXT NOT NULL,                     -- bucket: documentos-empleados
  vigencia_desde  DATE,
  vigencia_hasta  DATE,                              -- NULL = sin vencimiento
  uploaded_by     UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_empleado_documentos_empleado ON public.empleado_documentos (empleado_id);
CREATE INDEX idx_empleado_documentos_vigencia
  ON public.empleado_documentos (vigencia_hasta)
  WHERE vigencia_hasta IS NOT NULL;

COMMENT ON TABLE public.empleado_documentos IS
  'Documentos legales del empleado. vigencia_hasta dispara alertas antes del vencimiento.';

-- =============================================================================
-- EMPLEADO_PROYECTOS (asignaciones)
-- =============================================================================
-- Un empleado puede estar en varios proyectos a lo largo del tiempo. retirado_at
-- preserva el historial de quien estuvo en cada proyecto y cuando.
CREATE TABLE public.empleado_proyectos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id   UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  proyecto_id   UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  asignado_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retirado_at   TIMESTAMPTZ,
  asignado_por  UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  notas         TEXT,
  -- Un empleado puede tener varios periodos en el mismo proyecto, pero solo uno activo.
  CONSTRAINT chk_periodo_coherente CHECK (retirado_at IS NULL OR retirado_at >= asignado_at)
);

-- Indice parcial: garantiza una sola asignacion ACTIVA por (empleado, proyecto).
CREATE UNIQUE INDEX uq_empleado_proyecto_activo
  ON public.empleado_proyectos (empleado_id, proyecto_id)
  WHERE retirado_at IS NULL;

CREATE INDEX idx_empleado_proyectos_proyecto ON public.empleado_proyectos (proyecto_id);

-- =============================================================================
-- AUSENTISMOS
-- =============================================================================
CREATE TABLE public.ausentismos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id        UUID NOT NULL REFERENCES public.empleados(id) ON DELETE RESTRICT,
  proyecto_id        UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  tipo               ausentismo_tipo NOT NULL,
  fecha_inicio       DATE NOT NULL,
  fecha_fin          DATE NOT NULL,
  razon              TEXT NOT NULL,
  soporte_pdf_path   TEXT,                          -- bucket: pdfs-soportes
  registrado_por     UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_ausentismo_fechas CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX idx_ausentismos_empleado ON public.ausentismos (empleado_id, fecha_inicio DESC);
CREATE INDEX idx_ausentismos_proyecto ON public.ausentismos (proyecto_id, fecha_inicio DESC);

-- =============================================================================
-- INCIDENTES (incluye accidentes y casi-accidentes)
-- =============================================================================
-- Un solo modelo para los tres tipos. La distincion fina es 'tipo' + 'severidad'.
-- Asi reducimos joins y duplicacion de columnas; el frontend filtra por enum.
CREATE TABLE public.incidentes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id        UUID NOT NULL REFERENCES public.empleados(id) ON DELETE RESTRICT,
  proyecto_id        UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  tipo               incidente_tipo NOT NULL,
  severidad          incidente_severidad NOT NULL,
  fecha              TIMESTAMPTZ NOT NULL,
  ubicacion          TEXT,
  lat                NUMERIC(10,7),
  lng                NUMERIC(10,7),
  descripcion        TEXT NOT NULL,
  causas             TEXT,
  acciones_tomadas   TEXT,
  acciones_correctivas TEXT,
  reportado_arl      BOOLEAN NOT NULL DEFAULT FALSE,
  registrado_por     UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidentes_empleado ON public.incidentes (empleado_id, fecha DESC);
CREATE INDEX idx_incidentes_proyecto ON public.incidentes (proyecto_id, fecha DESC);
CREATE INDEX idx_incidentes_tipo_severidad ON public.incidentes (tipo, severidad);

CREATE TRIGGER trg_incidentes_updated_at
  BEFORE UPDATE ON public.incidentes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- INCIDENTE_EVIDENCIAS (fotos, PDFs, declaraciones)
-- =============================================================================
CREATE TABLE public.incidente_evidencias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id  UUID NOT NULL REFERENCES public.incidentes(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,                       -- bucket: pdfs-soportes o fotos-proyectos
  tipo          TEXT,                                -- 'foto' | 'pdf' | 'declaracion' (libre)
  descripcion   TEXT,
  uploaded_by   UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidente_evidencias_incidente ON public.incidente_evidencias (incidente_id);
