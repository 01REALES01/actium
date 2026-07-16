-- =============================================================================
-- ACTIUM | Finanzas — Mejoras de presupuesto y flujo de caja
-- =============================================================================
-- 1. presupuesto_fijado en proyectos (techo global inamovible)
-- 2. vw_proyectos_finanzas incluye presupuesto_fijado
-- 3. RPC fijar_presupuesto_proyecto
-- 4. RPC transferir_presupuesto_rubros (traslado directo de techo, sin movimiento)
-- 5. ajustar_techo_rubro valida presupuesto_fijado
-- 6. Trigger en rubros INSERT valida presupuesto_fijado
-- =============================================================================

-- =============================================================================
-- 1. presupuesto_fijado
-- =============================================================================
ALTER TABLE public.proyectos
  ADD COLUMN presupuesto_fijado NUMERIC(15,2) NULL;

COMMENT ON COLUMN public.proyectos.presupuesto_fijado IS
  'Presupuesto total fijado por el usuario. Una vez definido, la suma de monto_maximo de los rubros de egreso no puede superarlo. NULL = no fijado aun.';

-- =============================================================================
-- 2. vw_proyectos_finanzas — incluye presupuesto_fijado
-- =============================================================================
-- presupuesto_fijado va al final para no reordenar columnas existentes (PG lo requiere)
CREATE OR REPLACE VIEW public.vw_proyectos_finanzas AS
SELECT
  p.id                 AS proyecto_id,
  p.empresa_id,
  p.nombre             AS proyecto_nombre,
  p.es_interno,
  p.estado,
  COALESCE(SUM(b.monto_maximo), 0) AS presupuesto_total,
  COALESCE(SUM(b.ejecutado), 0)    AS presupuesto_ejecutado,
  COALESCE(SUM(b.comprometido), 0) AS presupuesto_comprometido,
  COALESCE(SUM(b.disponible), 0)   AS presupuesto_disponible,
  ROUND(
    COALESCE(SUM(b.ejecutado), 0)
      / NULLIF(COALESCE(p.presupuesto_fijado, SUM(b.monto_maximo)), 0) * 100,
    2
  ) AS porcentaje_ejecutado,
  p.presupuesto_fijado
FROM public.proyectos p
LEFT JOIN public.vw_rubro_balance b ON b.proyecto_id = p.id AND b.categoria <> 'ingresos'
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.empresa_id, p.nombre, p.es_interno, p.estado, p.presupuesto_fijado;

-- CREATE OR REPLACE VIEW resetea reloptions — reaplicar security_invoker
ALTER VIEW public.vw_proyectos_finanzas SET (security_invoker = true);

COMMENT ON VIEW public.vw_proyectos_finanzas IS
  'Un proyecto por fila con su presupuesto agregado (rubros de egreso). Incluye presupuesto_fijado para mostrar restriccion global.';

-- =============================================================================
-- 3. RPC fijar_presupuesto_proyecto
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fijar_presupuesto_proyecto(
  p_proyecto_id UUID,
  p_monto       NUMERIC DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_suma_rubros   NUMERIC(15,2);
  v_monto_final   NUMERIC(15,2);
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede fijar el presupuesto total';
  END IF;

  IF NOT public.auth_puede_ver_proyecto(p_proyecto_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'No tiene acceso a este proyecto';
  END IF;

  SELECT COALESCE(SUM(monto_maximo), 0) INTO v_suma_rubros
  FROM public.rubros
  WHERE proyecto_id = p_proyecto_id AND activo AND categoria <> 'ingresos';

  v_monto_final := COALESCE(p_monto, v_suma_rubros);

  IF v_monto_final <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'El presupuesto total debe ser mayor a cero';
  END IF;

  IF v_monto_final < v_suma_rubros THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format(
        'El monto fijado (%s) no puede ser menor que la suma actual de rubros de egreso (%s)',
        v_monto_final, v_suma_rubros
      );
  END IF;

  UPDATE public.proyectos
     SET presupuesto_fijado = v_monto_final
   WHERE id = p_proyecto_id;

  RETURN v_monto_final;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fijar_presupuesto_proyecto(UUID, NUMERIC) TO authenticated;

COMMENT ON FUNCTION public.fijar_presupuesto_proyecto IS
  'Fija el presupuesto total del proyecto. p_monto opcional: si se omite usa la suma actual de rubros de egreso. Bloquea si p_monto < suma actual. Solo super_admin.';

-- =============================================================================
-- 4. RPC transferir_presupuesto_rubros
-- =============================================================================
CREATE OR REPLACE FUNCTION public.transferir_presupuesto_rubros(
  p_proyecto_id     UUID,
  p_rubro_origen_id UUID,
  p_rubro_destino_id UUID,
  p_monto           NUMERIC
) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_origen_maximo    NUMERIC(15,2);
  v_origen_ejecutado NUMERIC(15,2);
  v_origen_proyecto  UUID;
  v_dest_proyecto    UUID;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede transferir presupuesto entre rubros';
  END IF;

  IF p_monto <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'El monto a transferir debe ser mayor a cero';
  END IF;

  IF p_rubro_origen_id = p_rubro_destino_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'El rubro origen y destino no pueden ser el mismo';
  END IF;

  SELECT proyecto_id INTO v_origen_proyecto FROM public.rubros WHERE id = p_rubro_origen_id AND activo;
  SELECT proyecto_id INTO v_dest_proyecto   FROM public.rubros WHERE id = p_rubro_destino_id AND activo;

  IF v_origen_proyecto IS NULL OR v_dest_proyecto IS NULL
     OR v_origen_proyecto IS DISTINCT FROM p_proyecto_id
     OR v_dest_proyecto   IS DISTINCT FROM p_proyecto_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Los rubros deben pertenecer al proyecto indicado y estar activos';
  END IF;

  IF NOT public.auth_puede_ver_proyecto(p_proyecto_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'No tiene acceso a este proyecto';
  END IF;

  SELECT monto_maximo INTO v_origen_maximo FROM public.rubros WHERE id = p_rubro_origen_id;

  IF p_monto > v_origen_maximo THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('El monto a transferir (%s) supera el techo del rubro origen (%s)', p_monto, v_origen_maximo);
  END IF;

  SELECT COALESCE(SUM(monto), 0) INTO v_origen_ejecutado
  FROM public.movimientos
  WHERE rubro_destino_id = p_rubro_origen_id
    AND tipo IN ('gasto', 'traslado_entre_rubros')
    AND estado = 'ejecutado';

  IF (v_origen_maximo - p_monto) < v_origen_ejecutado THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format(
        'No se puede reducir el techo del rubro origen: ya se ejecutaron %s y el nuevo techo quedaría en %s',
        v_origen_ejecutado, v_origen_maximo - p_monto
      );
  END IF;

  -- Actualiza ambos techos en la misma transaccion
  UPDATE public.rubros SET monto_maximo = monto_maximo - p_monto WHERE id = p_rubro_origen_id;
  UPDATE public.rubros SET monto_maximo = monto_maximo + p_monto WHERE id = p_rubro_destino_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transferir_presupuesto_rubros(UUID, UUID, UUID, NUMERIC) TO authenticated;

COMMENT ON FUNCTION public.transferir_presupuesto_rubros IS
  'Transfiere monto_maximo de un rubro a otro dentro del mismo proyecto. Valida que el origen tenga capacidad (no baja del ejecutado). No genera movimiento — ajuste directo de techo.';

-- =============================================================================
-- 5. ajustar_techo_rubro — ahora valida presupuesto_fijado
-- =============================================================================
CREATE OR REPLACE FUNCTION public.ajustar_techo_rubro(
  p_rubro_id      UUID,
  p_nuevo_monto   NUMERIC,
  p_justificacion TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_proyecto_id         UUID;
  v_categoria           categoria_flujo;
  v_ejecutado           NUMERIC(15,2);
  v_mov_id              UUID;
  v_presupuesto_fijado  NUMERIC(15,2);
  v_suma_otros          NUMERIC(15,2);
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede ajustar el techo de un rubro';
  END IF;

  IF p_nuevo_monto <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El nuevo techo debe ser mayor a cero';
  END IF;

  SELECT proyecto_id, categoria INTO v_proyecto_id, v_categoria
  FROM public.rubros WHERE id = p_rubro_id;

  IF v_proyecto_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Rubro no encontrado';
  END IF;

  IF NOT public.auth_tiene_acceso_proyecto(v_proyecto_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene acceso a este proyecto';
  END IF;

  SELECT COALESCE(SUM(monto), 0) INTO v_ejecutado
  FROM public.movimientos
  WHERE rubro_destino_id = p_rubro_id
    AND tipo IN ('gasto', 'traslado_entre_rubros')
    AND estado = 'ejecutado';

  IF p_nuevo_monto < v_ejecutado THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('El nuevo techo (%s) no puede ser menor a lo ya ejecutado (%s)', p_nuevo_monto, v_ejecutado);
  END IF;

  -- Valida contra presupuesto_fijado solo en rubros de egreso
  IF v_categoria <> 'ingresos' THEN
    SELECT presupuesto_fijado INTO v_presupuesto_fijado
    FROM public.proyectos WHERE id = v_proyecto_id;

    IF v_presupuesto_fijado IS NOT NULL THEN
      SELECT COALESCE(SUM(monto_maximo), 0) INTO v_suma_otros
      FROM public.rubros
      WHERE proyecto_id = v_proyecto_id
        AND activo
        AND id <> p_rubro_id
        AND categoria <> 'ingresos';

      IF (v_suma_otros + p_nuevo_monto) > v_presupuesto_fijado THEN
        RAISE EXCEPTION USING ERRCODE = '22023',
          MESSAGE = format(
            'El nuevo techo supera el presupuesto total fijado. Margen disponible para este rubro: %s',
            v_presupuesto_fijado - v_suma_otros
          );
      END IF;
    END IF;
  END IF;

  INSERT INTO public.movimientos (
    proyecto_id, rubro_destino_id, tipo, monto, justificacion, estado, solicitado_por
  ) VALUES (
    v_proyecto_id, p_rubro_id, 'ajuste', p_nuevo_monto, p_justificacion, 'solicitado', auth.uid()
  )
  RETURNING id INTO v_mov_id;

  UPDATE public.movimientos
     SET estado = 'ejecutado', aprobado_por = auth.uid(), aprobado_at = NOW(), ejecutado_at = NOW()
   WHERE id = v_mov_id;

  UPDATE public.rubros SET monto_maximo = p_nuevo_monto WHERE id = p_rubro_id;

  RETURN v_mov_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ajustar_techo_rubro(UUID, NUMERIC, TEXT) TO authenticated;

COMMENT ON FUNCTION public.ajustar_techo_rubro IS
  'Cambia monto_maximo via movimiento tipo ajuste (auditable). Bloquea bajar del ejecutado y superar presupuesto_fijado. Solo super_admin.';

-- =============================================================================
-- 6. Trigger en rubros INSERT — valida presupuesto_fijado
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validar_presupuesto_fijado_rubro()
RETURNS TRIGGER AS $$
DECLARE
  v_presupuesto_fijado NUMERIC(15,2);
  v_suma_actual        NUMERIC(15,2);
BEGIN
  -- Ingresos no cuentan contra el presupuesto fijado
  IF NEW.categoria = 'ingresos' THEN
    RETURN NEW;
  END IF;

  SELECT presupuesto_fijado INTO v_presupuesto_fijado
  FROM public.proyectos WHERE id = NEW.proyecto_id;

  IF v_presupuesto_fijado IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(monto_maximo), 0) INTO v_suma_actual
  FROM public.rubros
  WHERE proyecto_id = NEW.proyecto_id
    AND activo
    AND categoria <> 'ingresos'
    AND id <> NEW.id;

  IF (v_suma_actual + NEW.monto_maximo) > v_presupuesto_fijado THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format(
        'El nuevo rubro supera el presupuesto total fijado. Margen disponible: %s',
        v_presupuesto_fijado - v_suma_actual
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_presupuesto_fijado_rubro
  BEFORE INSERT ON public.rubros
  FOR EACH ROW EXECUTE FUNCTION public.validar_presupuesto_fijado_rubro();

COMMENT ON FUNCTION public.validar_presupuesto_fijado_rubro IS
  'Bloquea INSERT de rubros de egreso que harian superar el presupuesto_fijado del proyecto.';
