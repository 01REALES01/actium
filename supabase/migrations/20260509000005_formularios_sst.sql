-- =============================================================================
-- ACTIUM | 0005 — Formularios SST (ATS, Permiso Altura, Permiso Caliente)
-- =============================================================================
-- Modelo de formularios SST con tabla padre comun y tablas hijas por tipo.
-- El codigo_consecutivo se genera automaticamente por trigger en formato
-- {TIPO}-{AÑO}-{NNNN}, reiniciando por (empresa_id, tipo) cada año.
-- Las firmas se guardan como PNGs en bucket 'firmas'; son firmas simples
-- de canvas (no certificadas) — disclaimer se incluye en PDF generado.
-- =============================================================================

-- =============================================================================
-- FORMULARIOS (tabla padre comun a los 3 tipos)
-- =============================================================================
CREATE TABLE public.formularios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  subempresa_id       UUID NOT NULL REFERENCES public.subempresas(id) ON DELETE RESTRICT,
  proyecto_id         UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  tipo                formulario_tipo NOT NULL,
  estado              formulario_estado NOT NULL DEFAULT 'borrador',
  codigo_consecutivo  TEXT,                        -- Generado por trigger: ATS-2026-0001
  creado_por          UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha_inicio        DATE,
  fecha_fin           DATE,
  ciudad              TEXT,
  ubicacion           TEXT,
  area                TEXT,
  pdf_generado_path   TEXT,                        -- bucket: pdfs-formularios
  firmado_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_formulario_fechas CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE INDEX idx_formularios_empresa ON public.formularios (empresa_id);
CREATE INDEX idx_formularios_proyecto ON public.formularios (proyecto_id);
CREATE INDEX idx_formularios_tipo_estado ON public.formularios (tipo, estado);
CREATE INDEX idx_formularios_codigo ON public.formularios (codigo_consecutivo) WHERE codigo_consecutivo IS NOT NULL;

CREATE TRIGGER trg_formularios_updated_at
  BEFORE UPDATE ON public.formularios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.formularios IS
  'Tabla padre para ATS, Permiso Altura y Permiso Caliente. El tipo determina que tabla hija aplica.';
COMMENT ON COLUMN public.formularios.codigo_consecutivo IS
  'Formato: {TIPO_ABREV}-{AÑO}-{NNNN}. Generado por trigger al crear, nunca se modifica.';

-- Secuencia por (empresa_id, tipo, año) via tabla auxiliar de contadores
CREATE TABLE public.formulario_secuencias (
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo        formulario_tipo NOT NULL,
  anio        SMALLINT NOT NULL,
  ultimo_num  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (empresa_id, tipo, anio)
);

-- Trigger: genera codigo_consecutivo al INSERT si no fue provisto
CREATE OR REPLACE FUNCTION public.generar_codigo_formulario()
RETURNS TRIGGER AS $$
DECLARE
  v_anio     SMALLINT;
  v_num      INTEGER;
  v_prefijo  TEXT;
BEGIN
  IF NEW.codigo_consecutivo IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_anio := EXTRACT(YEAR FROM NOW())::SMALLINT;

  v_prefijo := CASE NEW.tipo
    WHEN 'ats'             THEN 'ATS'
    WHEN 'permiso_altura'  THEN 'ALT'
    WHEN 'permiso_caliente' THEN 'CAL'
    ELSE UPPER(NEW.tipo::TEXT)
  END;

  INSERT INTO public.formulario_secuencias (empresa_id, tipo, anio, ultimo_num)
  VALUES (NEW.empresa_id, NEW.tipo, v_anio, 1)
  ON CONFLICT (empresa_id, tipo, anio)
  DO UPDATE SET ultimo_num = formulario_secuencias.ultimo_num + 1
  RETURNING ultimo_num INTO v_num;

  NEW.codigo_consecutivo := v_prefijo || '-' || v_anio::TEXT || '-' || LPAD(v_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_formularios_codigo
  BEFORE INSERT ON public.formularios
  FOR EACH ROW EXECUTE FUNCTION public.generar_codigo_formulario();

-- =============================================================================
-- ATS — Analisis de Trabajo Seguro
-- =============================================================================

-- Detalles globales del ATS (1:1 con formularios)
CREATE TABLE public.ats_detalles (
  formulario_id       UUID PRIMARY KEY REFERENCES public.formularios(id) ON DELETE CASCADE,
  permiso_altura      BOOLEAN NOT NULL DEFAULT FALSE,
  permiso_confinado   BOOLEAN NOT NULL DEFAULT FALSE,
  permiso_caliente    BOOLEAN NOT NULL DEFAULT FALSE,
  permiso_energias    BOOLEAN NOT NULL DEFAULT FALSE,
  permiso_otro        TEXT,                          -- Descripcion libre si aplica otro permiso
  decision            riesgo_decision                -- NULL hasta que se completa el analisis
);

COMMENT ON TABLE public.ats_detalles IS
  'Encabezado del ATS: permisos requeridos y decision final de proceder/detener.';

-- Trabajadores que participan en el ATS (hasta 7 por formulario)
CREATE TABLE public.ats_trabajadores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  empleado_id     UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  nombre_libre    TEXT,                              -- Si no esta en el sistema
  cargo           TEXT,
  firma_path      TEXT                               -- bucket: firmas
);

CREATE INDEX idx_ats_trabajadores_formulario ON public.ats_trabajadores (formulario_id);

-- Equipos/herramientas utilizados
CREATE TABLE public.ats_equipos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  categoria       TEXT NOT NULL,                     -- ej: 'EPP', 'Herramienta', 'Maquinaria'
  descripcion     TEXT NOT NULL
);

CREATE INDEX idx_ats_equipos_formulario ON public.ats_equipos (formulario_id);

-- Analisis de riesgo: 11 preguntas predefinidas (codigo en catalogo de UI)
CREATE TABLE public.ats_analisis_riesgo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  pregunta_codigo TEXT NOT NULL,                     -- Clave de la pregunta (ej: 'P01'...'P11')
  respuesta       BOOLEAN,                           -- TRUE=Si, FALSE=No, NULL=N/A
  observacion     TEXT,
  UNIQUE (formulario_id, pregunta_codigo)
);

CREATE INDEX idx_ats_analisis_formulario ON public.ats_analisis_riesgo (formulario_id);

-- Pasos de la tarea con analisis de peligros y controles
CREATE TABLE public.ats_pasos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  orden           SMALLINT NOT NULL,
  paso            TEXT NOT NULL,                     -- Descripcion del paso
  peligros        TEXT,
  consecuencias   TEXT,
  controles       TEXT,
  UNIQUE (formulario_id, orden)
);

CREATE INDEX idx_ats_pasos_formulario ON public.ats_pasos (formulario_id, orden);

-- =============================================================================
-- PERMISO DE TRABAJO EN ALTURA
-- =============================================================================

-- Encabezado (1:1 con formularios)
CREATE TABLE public.altura_detalles (
  formulario_id           UUID PRIMARY KEY REFERENCES public.formularios(id) ON DELETE CASCADE,
  vigencia_inicio         TIMESTAMPTZ,
  vigencia_fin            TIMESTAMPTZ,
  tipo_trabajo            TEXT,
  herramientas            TEXT,
  altura_metros           NUMERIC(5,2),
  sistema_andamio         BOOLEAN NOT NULL DEFAULT FALSE,
  sistema_escalera        BOOLEAN NOT NULL DEFAULT FALSE,
  sistema_elevador        BOOLEAN NOT NULL DEFAULT FALSE,
  tar_involucradas        TEXT,                      -- Tareas de Alto Riesgo adicionales
  autorizado_por_nombre   TEXT,
  autorizado_por_cedula   TEXT,
  firma_emisor_path       TEXT                       -- bucket: firmas
);

COMMENT ON TABLE public.altura_detalles IS
  'Cabecera del permiso de trabajo en altura. 1:1 con formularios donde tipo=permiso_altura.';

-- Personal autorizado para el trabajo en altura
CREATE TABLE public.altura_personal (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id           UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  empleado_id             UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  nombre_libre            TEXT,
  constancia_capacitacion BOOLEAN NOT NULL DEFAULT FALSE,
  profesion               TEXT,
  ss_verificada           BOOLEAN NOT NULL DEFAULT FALSE,   -- Seguridad social verificada
  firma_path              TEXT                              -- bucket: firmas
);

CREATE INDEX idx_altura_personal_formulario ON public.altura_personal (formulario_id);

-- Chequeo EPP para trabajo en altura (12 items — codigos en catalogo UI)
CREATE TABLE public.altura_epp_chequeo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  item_codigo     TEXT NOT NULL,                     -- ej: 'EPP_01'...'EPP_12'
  resultado       chequeo_resultado NOT NULL,
  UNIQUE (formulario_id, item_codigo)
);

CREATE INDEX idx_altura_epp_formulario ON public.altura_epp_chequeo (formulario_id);

-- Lista de chequeo de condiciones (28 items)
CREATE TABLE public.altura_lista_chequeo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  item_codigo     TEXT NOT NULL,                     -- ej: 'CHK_01'...'CHK_28'
  resultado       chequeo_resultado NOT NULL,
  UNIQUE (formulario_id, item_codigo)
);

CREATE INDEX idx_altura_chequeo_formulario ON public.altura_lista_chequeo (formulario_id);

-- =============================================================================
-- PERMISO DE TRABAJO EN CALIENTE
-- =============================================================================

-- Encabezado (1:1 con formularios)
CREATE TABLE public.caliente_detalles (
  formulario_id       UUID PRIMARY KEY REFERENCES public.formularios(id) ON DELETE CASCADE,
  vigencia_inicio     TIMESTAMPTZ,
  vigencia_fin        TIMESTAMPTZ,
  area                TEXT,
  proposito           TEXT,
  bloqueo_electrica   BOOLEAN NOT NULL DEFAULT FALSE,
  bloqueo_neumatica   BOOLEAN NOT NULL DEFAULT FALSE,
  bloqueo_mecanica    BOOLEAN NOT NULL DEFAULT FALSE,
  bloqueo_hidraulica  BOOLEAN NOT NULL DEFAULT FALSE,
  bloqueo_termica     BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.caliente_detalles IS
  'Cabecera del permiso de trabajo en caliente. 1:1 con formularios donde tipo=permiso_caliente.';

-- Listas de chequeo por seccion (codigos en catalogo UI)
-- Planeacion: 4 items
CREATE TABLE public.caliente_planeacion (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  item_codigo     TEXT NOT NULL,
  resultado       chequeo_resultado NOT NULL,
  UNIQUE (formulario_id, item_codigo)
);

CREATE INDEX idx_caliente_planeacion_formulario ON public.caliente_planeacion (formulario_id);

-- Area de trabajo: 2 items
CREATE TABLE public.caliente_area_trabajo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  item_codigo     TEXT NOT NULL,
  resultado       chequeo_resultado NOT NULL,
  UNIQUE (formulario_id, item_codigo)
);

CREATE INDEX idx_caliente_area_formulario ON public.caliente_area_trabajo (formulario_id);

-- EPP requerido: 10 items
CREATE TABLE public.caliente_epp (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  item_codigo     TEXT NOT NULL,
  resultado       chequeo_resultado NOT NULL,
  UNIQUE (formulario_id, item_codigo)
);

CREATE INDEX idx_caliente_epp_formulario ON public.caliente_epp (formulario_id);

-- Verificacion general: 14 items
CREATE TABLE public.caliente_verificacion (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  item_codigo     TEXT NOT NULL,
  resultado       chequeo_resultado NOT NULL,
  UNIQUE (formulario_id, item_codigo)
);

CREATE INDEX idx_caliente_verificacion_formulario ON public.caliente_verificacion (formulario_id);

-- Cierre de permiso: 4 items
CREATE TABLE public.caliente_cierre (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  item_codigo     TEXT NOT NULL,
  resultado       chequeo_resultado NOT NULL,
  UNIQUE (formulario_id, item_codigo)
);

CREATE INDEX idx_caliente_cierre_formulario ON public.caliente_cierre (formulario_id);

-- Firmas del personal: hasta 3 trabajadores x 2 momentos (inicio y fin)
CREATE TABLE public.caliente_firmas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id   UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  empleado_id     UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  nombre_libre    TEXT,
  momento         firma_momento NOT NULL,
  firma_path      TEXT,                              -- bucket: firmas
  firmado_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un mismo empleado no puede firmar dos veces el mismo momento en el mismo permiso
  CONSTRAINT uq_caliente_firma_momento UNIQUE (formulario_id, empleado_id, momento)
);

CREATE INDEX idx_caliente_firmas_formulario ON public.caliente_firmas (formulario_id);
