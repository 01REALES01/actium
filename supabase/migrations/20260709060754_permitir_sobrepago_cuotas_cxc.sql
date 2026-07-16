-- =============================================================================
-- ACTIUM | Fix — permitir sobrepago de cuotas CxC
-- =============================================================================
-- Un abono puede ser mayor al saldo pendiente de la cuota (sobrepago /
-- adelanto del cliente). Se quita el CHECK que lo bloqueaba en ambas tablas
-- y el IF de la RPC que rechazaba el exceso — la cuota simplemente queda
-- 'pagada' con monto_cobrado > monto cuando eso ocurre.
-- =============================================================================
ALTER TABLE public.cuentas_por_cobrar_cuotas DROP CONSTRAINT cuentas_por_cobrar_cuotas_check;
ALTER TABLE public.cuentas_por_cobrar DROP CONSTRAINT cuentas_por_cobrar_check;

CREATE OR REPLACE FUNCTION public.registrar_cobro_cuota_cxc(
  p_cuota_id UUID,
  p_monto    NUMERIC,
  p_fecha    DATE DEFAULT CURRENT_DATE
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_cxc_id            UUID;
  v_proyecto_id       UUID;
  v_rubro_id          UUID;
  v_monto_cuota       NUMERIC(15,2);
  v_monto_cobrado     NUMERIC(15,2);
  v_estado_cuota      factura_estado;
  v_numero_cuota      SMALLINT;
  v_numero_factura    TEXT;
  v_cxc_monto_total   NUMERIC(15,2);
  v_nuevo_cobrado     NUMERIC(15,2);
  v_mov_id            UUID;
  v_cxc_total_cobrado NUMERIC(15,2);
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Solo super_admin puede registrar cobros';
  END IF;

  IF p_monto <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El monto del cobro debe ser mayor a cero';
  END IF;

  SELECT cq.cxc_id, cq.proyecto_id, cq.monto, cq.monto_cobrado, cq.estado, cq.numero_cuota,
         c.rubro_id, c.numero_factura, c.monto_total
    INTO v_cxc_id, v_proyecto_id, v_monto_cuota, v_monto_cobrado, v_estado_cuota, v_numero_cuota,
         v_rubro_id, v_numero_factura, v_cxc_monto_total
  FROM public.cuentas_por_cobrar_cuotas cq
  JOIN public.cuentas_por_cobrar c ON c.id = cq.cxc_id
  WHERE cq.id = p_cuota_id;

  IF v_cxc_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Cuota no encontrada';
  END IF;

  IF v_estado_cuota IN ('pagada', 'anulada') THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('La cuota %s de la factura %s ya esta %s', v_numero_cuota, v_numero_factura, v_estado_cuota);
  END IF;

  -- El abono puede superar el saldo pendiente de la cuota (sobrepago).
  v_nuevo_cobrado := v_monto_cobrado + p_monto;

  INSERT INTO public.movimientos (
    proyecto_id, rubro_destino_id, tipo, monto, justificacion, estado, solicitado_por, fecha_efectiva
  ) VALUES (
    v_proyecto_id, v_rubro_id, 'gasto', p_monto,
    format('Cobro CxC factura %s cuota %s', v_numero_factura, v_numero_cuota),
    'solicitado', auth.uid(), p_fecha
  )
  RETURNING id INTO v_mov_id;

  UPDATE public.movimientos
     SET estado = 'ejecutado', aprobado_por = auth.uid(), aprobado_at = NOW(), ejecutado_at = NOW()
   WHERE id = v_mov_id;

  UPDATE public.cuentas_por_cobrar_cuotas
     SET monto_cobrado = v_nuevo_cobrado,
         estado = CASE WHEN v_nuevo_cobrado >= v_monto_cuota THEN 'pagada' ELSE 'parcial' END
   WHERE id = p_cuota_id;

  SELECT COALESCE(SUM(monto_cobrado), 0) INTO v_cxc_total_cobrado
  FROM public.cuentas_por_cobrar_cuotas
  WHERE cxc_id = v_cxc_id;

  UPDATE public.cuentas_por_cobrar
     SET monto_cobrado = v_cxc_total_cobrado,
         estado = CASE WHEN v_cxc_total_cobrado >= v_cxc_monto_total THEN 'pagada' ELSE 'parcial' END
   WHERE id = v_cxc_id;

  RETURN v_mov_id;
END;
$$;
