-- =============================================================================
-- ACTIUM | Instrucciones Preoperacionales
-- =============================================================================
-- Agrega el cuarto tipo de formulario SST: la inspección preoperacional de
-- herramientas y equipos (taladro, pulidora, extensiones, máquina de soldar y
-- botiquín en un solo permiso).
--
-- No lleva tabla hija de detalles: igual que en los otros tres tipos, el
-- contenido del formulario vive en el JSON de respaldo que se guarda junto al
-- PDF en el bucket `pdfs-formularios`. La fila de `formularios` conserva los
-- datos consultables (proyecto, área, fecha, estado, consecutivo y ruta del PDF)
-- y las políticas RLS de `formularios` aplican sin cambios.
-- =============================================================================

ALTER TYPE formulario_tipo ADD VALUE IF NOT EXISTS 'preoperacional';

-- El consecutivo usa el prefijo PRE-{AÑO}-{NNNN}. La comparación se hace sobre
-- TEXT y no sobre el enum: usar un valor de enum recién agregado dentro de la
-- misma transacción que lo crea es un error en PostgreSQL.
--
-- La rama de `entrega_epp` (migración 20260824000000) va incluida a propósito,
-- aunque sea posterior: en producción esa migración se aplicó antes que esta, y
-- sin la rama aquí, correr este archivo después le quitaría el prefijo EPP al
-- trigger. Comparando TEXT la rama es inofensiva mientras el valor no exista.
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
