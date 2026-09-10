-- =============================================================================
-- ACTIUM | Documentos de soldadura (WPS, PQR, WPQ)
-- =============================================================================
-- Tres documentos de calificación de soldadura, cada uno en dos variantes
-- normativas: ASME BPVC Sección IX (formatos QW-482 / QW-483 / QW-484A) y
-- AWS D1.2/D1.2M:2014 (formatos E(a) / E(b) / E(c)).
--
-- POR QUÉ TABLA PROPIA Y NO `formularios`:
-- Un WPS no pertenece a una obra: es un documento de la empresa que se aplica a
-- muchos proyectos y sobrevive a todos ellos. `formularios.proyecto_id` es NOT
-- NULL y TODA su RLS cuelga de `auth_tiene_acceso_proyecto(proyecto_id)`, así
-- que meterlos ahí obligaría a inventar un proyecto para cada procedimiento y a
-- tocar las políticas de los seis formatos SST que ya están en producción. La
-- maquinaria compartida (bucket de PDF, respaldo JSON, borrador, consecutivo)
-- se replica aquí, que es más barato que volver nullable una columna de la que
-- depende la seguridad de todo el módulo SST.
--
-- QUÉ VIVE EN LA FILA Y QUÉ EN EL JSON:
-- El formato en papel tiene entre 40 y 70 campos, y ninguno de ellos se consulta
-- por SQL: se leen abriendo el documento. Lo que sí se busca —y por eso son
-- columnas indexadas— es el número del documento, el proceso, el soldador y las
-- referencias cruzadas (un WPQ cita su WPS y su PQR; un WPS cita los PQR que lo
-- respaldan). Todo lo demás, incluidos croquis y firmas, va en el JSON de
-- respaldo junto al PDF, igual que en los formatos SST.
-- =============================================================================

CREATE TYPE documento_soldadura_tipo AS ENUM ('wps', 'pqr', 'wpq');
CREATE TYPE documento_soldadura_variante AS ENUM ('asme_ix', 'aws_d1_2');

CREATE TABLE public.documentos_soldadura (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  subempresa_id       UUID NOT NULL REFERENCES public.subempresas(id) ON DELETE RESTRICT,
  tipo                documento_soldadura_tipo NOT NULL,
  variante            documento_soldadura_variante NOT NULL,
  estado              formulario_estado NOT NULL DEFAULT 'borrador',
  codigo_consecutivo  TEXT,          -- Generado por trigger: WPS-2026-0001

  -- Campos de búsqueda, copiados del payload en cada guardado.
  numero              TEXT,          -- No. del documento (WPS No., PQR No., identificación del soldador)
  titulo              TEXT,          -- Rótulo humano: descripción del procedimiento o nombre del soldador
  proceso             TEXT,          -- Proceso(s) de soldadura: GTAW, GMAW, SMAW...
  wps_ref             TEXT,          -- WPS que este documento cita (PQR y WPQ)
  pqr_ref             TEXT,          -- PQR que este documento cita (WPS y WPQ)
  fecha               DATE,
  revision            TEXT,

  pdf_generado_path   TEXT,          -- bucket: pdfs-formularios
  creado_por          UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  firmado_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_soldadura_empresa   ON public.documentos_soldadura (empresa_id);
CREATE INDEX idx_doc_soldadura_tipo      ON public.documentos_soldadura (tipo, variante, estado);
CREATE INDEX idx_doc_soldadura_numero    ON public.documentos_soldadura (numero);
CREATE INDEX idx_doc_soldadura_wps_ref   ON public.documentos_soldadura (wps_ref) WHERE wps_ref IS NOT NULL;
CREATE INDEX idx_doc_soldadura_pqr_ref   ON public.documentos_soldadura (pqr_ref) WHERE pqr_ref IS NOT NULL;

COMMENT ON TABLE public.documentos_soldadura IS
  'Documentos de calificación de soldadura (WPS/PQR/WPQ) en variantes ASME IX y AWS D1.2. Los campos del formato viven en el JSON de respaldo junto al PDF; aquí solo lo que se busca.';

CREATE TRIGGER trg_documentos_soldadura_updated_at
  BEFORE UPDATE ON public.documentos_soldadura
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Consecutivo WPS-2026-0001 / PQR-2026-0001 / WPQ-2026-0001
-- =============================================================================
-- Secuencia propia y no `formulario_secuencias`: esa tabla tiene la columna
-- `tipo` tipada como el enum `formulario_tipo`, que no admite estos valores.
CREATE TABLE public.documento_soldadura_secuencias (
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo        documento_soldadura_tipo NOT NULL,
  anio        SMALLINT NOT NULL,
  ultimo_num  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (empresa_id, tipo, anio)
);

ALTER TABLE public.documento_soldadura_secuencias ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.generar_codigo_documento_soldadura()
RETURNS TRIGGER AS $$
DECLARE
  v_anio SMALLINT;
  v_num  INTEGER;
BEGIN
  IF NEW.codigo_consecutivo IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_anio := EXTRACT(YEAR FROM NOW())::SMALLINT;

  INSERT INTO public.documento_soldadura_secuencias (empresa_id, tipo, anio, ultimo_num)
  VALUES (NEW.empresa_id, NEW.tipo, v_anio, 1)
  ON CONFLICT (empresa_id, tipo, anio)
  DO UPDATE SET ultimo_num = documento_soldadura_secuencias.ultimo_num + 1
  RETURNING ultimo_num INTO v_num;

  -- UPPER sobre el TEXT del enum, no sobre el enum: 'wps' -> 'WPS'.
  NEW.codigo_consecutivo :=
    UPPER(NEW.tipo::TEXT) || '-' || v_anio::TEXT || '-' || LPAD(v_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_documentos_soldadura_codigo
  BEFORE INSERT ON public.documentos_soldadura
  FOR EACH ROW EXECUTE FUNCTION public.generar_codigo_documento_soldadura();

-- =============================================================================
-- RLS — sección exclusiva de super_admin, igual que Inventario
-- =============================================================================
ALTER TABLE public.documentos_soldadura ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documentos_soldadura_select" ON public.documentos_soldadura
  FOR SELECT USING (public.auth_es_super_admin());
CREATE POLICY "documentos_soldadura_insert" ON public.documentos_soldadura
  FOR INSERT WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "documentos_soldadura_update" ON public.documentos_soldadura
  FOR UPDATE USING (public.auth_es_super_admin()) WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "documentos_soldadura_delete" ON public.documentos_soldadura
  FOR DELETE USING (public.auth_es_super_admin());
