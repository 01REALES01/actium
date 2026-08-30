-- =============================================================================
-- ACTIUM | Registro de Capacitación / Charla de Seguridad
-- =============================================================================
-- Agrega el sexto tipo de formulario SST. A diferencia del cargo de EPP —un
-- formulario por trabajador—, aquí la relación se invierte: una charla, muchos
-- asistentes. Por eso la cabecera `charla_seguridad` es 1:1 con `formularios`
-- (igual que las tablas `*_detalles`) y `charla_asistentes` guarda una fila por
-- persona que asistió.
--
-- Los datos del asistente se congelan en la fila: si el empleado se retira o
-- cambia de cargo, el registro firmado debe seguir diciendo lo que decía cuando
-- se firmó. La firma en sí (PNG en data URL) vive en el JSON junto al PDF, no
-- en la base de datos: aquí solo queda el hecho de haber firmado, que es lo
-- consultable.
-- =============================================================================

ALTER TYPE formulario_tipo ADD VALUE IF NOT EXISTS 'charla_seguridad';

-- El consecutivo usa el prefijo CHA-{AÑO}-{NNNN}. La comparación se hace sobre
-- TEXT y no sobre el enum: usar un valor de enum recién agregado dentro de la
-- misma transacción que lo crea es un error en PostgreSQL. Se repiten todas las
-- ramas porque las migraciones pueden aplicarse fuera del orden de producción.
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

  v_prefijo := CASE NEW.tipo::TEXT
    WHEN 'ats'              THEN 'ATS'
    WHEN 'permiso_altura'   THEN 'ALT'
    WHEN 'permiso_caliente' THEN 'CAL'
    WHEN 'preoperacional'   THEN 'PRE'
    WHEN 'entrega_epp'      THEN 'EPP'
    WHEN 'charla_seguridad' THEN 'CHA'
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

-- =============================================================================
-- Cabecera de la charla (1:1 con formularios, igual que ats_detalles)
-- =============================================================================
CREATE TABLE public.charla_seguridad (
  formulario_id      UUID PRIMARY KEY REFERENCES public.formularios(id) ON DELETE CASCADE,
  tipo_actividad     TEXT,   -- capacitacion | charla | induccion | reinduccion | socializacion
  modalidad          TEXT,   -- presencial | virtual | teorico_practica
  tema               TEXT NOT NULL,
  objetivo           TEXT,
  capacitador_nombre TEXT NOT NULL,
  capacitador_cargo  TEXT,
  lugar              TEXT,
  fecha              DATE NOT NULL,
  hora_inicio        TIME,
  hora_fin           TIME,
  duracion_minutos   INTEGER,
  resultado_general  TEXT,   -- satisfactorio | requiere_refuerzo | reprogramar
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.charla_seguridad IS
  'Cabecera del registro de capacitación / charla de seguridad. 1:1 con formularios donde tipo=charla_seguridad.';

-- =============================================================================
-- Asistentes de esa charla
-- =============================================================================
CREATE TABLE public.charla_asistentes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id  UUID NOT NULL REFERENCES public.charla_seguridad(formulario_id) ON DELETE CASCADE,
  empleado_id    UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  orden          SMALLINT NOT NULL,
  nombre         TEXT NOT NULL,   -- rótulo congelado al firmar
  identificacion TEXT,
  cargo          TEXT,
  empresa        TEXT,
  evaluacion     TEXT,            -- satisfactorio | requiere_refuerzo | no_evaluado
  firmo          BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_charla_asistentes_formulario ON public.charla_asistentes (formulario_id);
CREATE INDEX idx_charla_asistentes_empleado   ON public.charla_asistentes (empleado_id);

COMMENT ON TABLE public.charla_asistentes IS
  'Asistentes a una charla de seguridad. Permite consultar qué capacitaciones recibió un trabajador sin abrir cada PDF. La firma PNG vive en el JSON del formulario; aquí solo el hecho de haber firmado.';

-- =============================================================================
-- RLS — mismo patrón que epp_entregas / epp_entrega_items
-- =============================================================================
ALTER TABLE public.charla_seguridad  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charla_asistentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "charla_seguridad_select" ON public.charla_seguridad
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "charla_seguridad_insert" ON public.charla_seguridad
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
    AND public.auth_rol() IN ('super_admin', 'sst')
  );

CREATE POLICY "charla_seguridad_update" ON public.charla_seguridad
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
    AND public.auth_rol() IN ('super_admin', 'sst')
  );

CREATE POLICY "charla_seguridad_delete" ON public.charla_seguridad
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst')
  );

CREATE POLICY "charla_asistentes_select" ON public.charla_asistentes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id)
    )
  );

CREATE POLICY "charla_asistentes_insert" ON public.charla_asistentes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id)
    )
    AND public.auth_rol() IN ('super_admin', 'sst')
  );

CREATE POLICY "charla_asistentes_update" ON public.charla_asistentes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id)
    )
    AND public.auth_rol() IN ('super_admin', 'sst')
  );

CREATE POLICY "charla_asistentes_delete" ON public.charla_asistentes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id)
    )
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst')
  );
