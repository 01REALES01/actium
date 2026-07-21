-- =============================================================================
-- ACTIUM | Finanzas — Trazabilidad de transferencias de presupuesto
-- =============================================================================
-- transferir_presupuesto_rubros ahora deja un registro en la tabla de
-- movimientos (tipo 'ajuste') por cada transferencia de techo entre rubros.
--
-- Se usa tipo 'ajuste' (no 'traslado_entre_rubros') a propósito: los cálculos
-- de balance (vw_rubro_balance), flujo de caja (vw_flujo_caja_quincenal) y el
-- trigger validar_techo_presupuestal solo consideran 'gasto' y
-- 'traslado_entre_rubros'. Así el registro es pura trazabilidad y NO altera
-- ejecutado/disponible/flujo — la transferencia solo mueve el techo.
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
  v_origen_nombre    TEXT;
  v_dest_nombre      TEXT;
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

  SELECT proyecto_id, nombre INTO v_origen_proyecto, v_origen_nombre
  FROM public.rubros WHERE id = p_rubro_origen_id AND activo;
  SELECT proyecto_id, nombre INTO v_dest_proyecto, v_dest_nombre
  FROM public.rubros WHERE id = p_rubro_destino_id AND activo;

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

  -- Trazabilidad: registro tipo 'ajuste' (no afecta ejecutado/flujo)
  INSERT INTO public.movimientos (
    proyecto_id, rubro_destino_id, rubro_origen_id, tipo, monto,
    justificacion, estado, solicitado_por, aprobado_por, aprobado_at, ejecutado_at
  ) VALUES (
    p_proyecto_id, p_rubro_destino_id, p_rubro_origen_id, 'ajuste', p_monto,
    format('Transferencia de presupuesto: %s → %s', v_origen_nombre, v_dest_nombre),
    'ejecutado', auth.uid(), auth.uid(), NOW(), NOW()
  );
END;
$$;

COMMENT ON FUNCTION public.transferir_presupuesto_rubros IS
  'Transfiere monto_maximo de un rubro a otro dentro del mismo proyecto. Valida que el origen tenga capacidad (no baja del ejecutado). Deja un registro tipo ajuste en movimientos para trazabilidad, sin afectar ejecutado/flujo.';
