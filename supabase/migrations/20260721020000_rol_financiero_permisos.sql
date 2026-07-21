-- =============================================================================
-- ACTIUM | Rol financiero — acceso solo a transacciones de Finanzas
-- =============================================================================
-- Dos usuarios de la empresa dueña del software que operan TODAS las
-- transacciones financieras (CxC, CxP, cobros, pagos, cuotas, comprobantes,
-- autorización de sobregiro) pero NO pueden tocar la estructura de presupuesto
-- (crear/editar rubros, ajustar techos, transferir ni fijar presupuesto).
-- No están ligados a un proyecto: ven las finanzas de todos.
-- =============================================================================

-- =============================================================================
-- 1. Helpers de rol
-- =============================================================================
CREATE OR REPLACE FUNCTION public.auth_es_financiero()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE((auth.jwt() ->> 'rol') = 'financiero', FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.auth_es_financiero IS
  'TRUE si el rol del JWT es financiero (operador de finanzas de la empresa dueña).';

CREATE OR REPLACE FUNCTION public.auth_puede_finanzas()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE((auth.jwt() ->> 'rol') IN ('super_admin', 'financiero'), FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.auth_puede_finanzas IS
  'TRUE si el usuario puede operar transacciones financieras (super_admin o financiero). NO cubre techos/transferencias/fijar presupuesto (solo super_admin).';

-- =============================================================================
-- 2. Visibilidad: financiero ve las finanzas de todos los proyectos
-- =============================================================================
CREATE OR REPLACE FUNCTION public.auth_puede_ver_proyecto(
  p_proyecto_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_es_interno BOOLEAN;
BEGIN
  -- super_admin y financiero ven todo (financiero opera finanzas globales)
  IF public.auth_es_super_admin() OR public.auth_es_financiero() THEN
    RETURN TRUE;
  END IF;

  IF NOT public.auth_tiene_acceso_proyecto(p_proyecto_id) THEN
    RETURN FALSE;
  END IF;

  SELECT es_interno INTO v_es_interno
  FROM public.proyectos
  WHERE id = p_proyecto_id;

  RETURN COALESCE(NOT v_es_interno, FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- 3. RLS: transacciones financieras abiertas a financiero
-- =============================================================================
-- Cuentas por cobrar
DROP POLICY IF EXISTS "cxc_insert" ON public.cuentas_por_cobrar;
CREATE POLICY "cxc_insert" ON public.cuentas_por_cobrar
  FOR INSERT WITH CHECK (public.auth_puede_finanzas());

DROP POLICY IF EXISTS "cxc_update" ON public.cuentas_por_cobrar;
CREATE POLICY "cxc_update" ON public.cuentas_por_cobrar
  FOR UPDATE USING (public.auth_puede_finanzas());

-- Cuotas de CxC
DROP POLICY IF EXISTS "cxc_cuotas_insert" ON public.cuentas_por_cobrar_cuotas;
CREATE POLICY "cxc_cuotas_insert" ON public.cuentas_por_cobrar_cuotas
  FOR INSERT WITH CHECK (public.auth_puede_finanzas());

DROP POLICY IF EXISTS "cxc_cuotas_update" ON public.cuentas_por_cobrar_cuotas;
CREATE POLICY "cxc_cuotas_update" ON public.cuentas_por_cobrar_cuotas
  FOR UPDATE USING (public.auth_puede_finanzas());

-- Cuentas por pagar
DROP POLICY IF EXISTS "cxp_insert" ON public.cuentas_por_pagar;
CREATE POLICY "cxp_insert" ON public.cuentas_por_pagar
  FOR INSERT WITH CHECK (public.auth_puede_finanzas());

DROP POLICY IF EXISTS "cxp_update" ON public.cuentas_por_pagar;
CREATE POLICY "cxp_update" ON public.cuentas_por_pagar
  FOR UPDATE USING (public.auth_puede_finanzas());

-- Movimientos (los RPC de transacción insertan/actualizan aquí como INVOKER)
DROP POLICY IF EXISTS "movimientos_insert" ON public.movimientos;
CREATE POLICY "movimientos_insert" ON public.movimientos
  FOR INSERT WITH CHECK (public.auth_puede_finanzas());

DROP POLICY IF EXISTS "movimientos_update" ON public.movimientos;
CREATE POLICY "movimientos_update" ON public.movimientos
  FOR UPDATE USING (public.auth_puede_finanzas());

-- =============================================================================
-- 4. RPC de transacciones: permitir financiero (techos/transfer/fijar siguen
--    exigiendo super_admin — se dejan intactos)
-- =============================================================================
-- registrar_pago_cxp
CREATE OR REPLACE FUNCTION public.registrar_pago_cxp(
  p_cxp_id UUID,
  p_monto  NUMERIC,
  p_fecha  DATE DEFAULT CURRENT_DATE
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_proyecto_id   UUID;
  v_rubro_id      UUID;
  v_monto_total   NUMERIC(15,2);
  v_monto_pagado  NUMERIC(15,2);
  v_estado        factura_estado;
  v_numero        TEXT;
  v_nuevo_pagado  NUMERIC(15,2);
  v_mov_id        UUID;
BEGIN
  IF NOT public.auth_puede_finanzas() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene permisos para registrar pagos';
  END IF;

  IF p_monto <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El monto del pago debe ser mayor a cero';
  END IF;

  SELECT proyecto_id, rubro_id, monto_total, monto_pagado, estado, numero_factura
    INTO v_proyecto_id, v_rubro_id, v_monto_total, v_monto_pagado, v_estado, v_numero
  FROM public.cuentas_por_pagar
  WHERE id = p_cxp_id;

  IF v_proyecto_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Cuenta por pagar no encontrada';
  END IF;

  IF v_estado IN ('pagada', 'anulada') THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('La factura %s ya esta %s', v_numero, v_estado);
  END IF;

  v_nuevo_pagado := v_monto_pagado + p_monto;
  IF v_nuevo_pagado > v_monto_total THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('El pago supera el saldo pendiente (disponible: %s)', v_monto_total - v_monto_pagado);
  END IF;

  INSERT INTO public.movimientos (
    proyecto_id, rubro_destino_id, tipo, monto, justificacion, estado, solicitado_por, fecha_efectiva
  ) VALUES (
    v_proyecto_id, v_rubro_id, 'gasto', p_monto,
    format('Pago CxP factura %s', v_numero), 'solicitado', auth.uid(), p_fecha
  )
  RETURNING id INTO v_mov_id;

  UPDATE public.movimientos
     SET estado = 'ejecutado', aprobado_por = auth.uid(), aprobado_at = NOW(), ejecutado_at = NOW()
   WHERE id = v_mov_id;

  UPDATE public.cuentas_por_pagar
     SET monto_pagado = v_nuevo_pagado,
         estado = CASE WHEN v_nuevo_pagado >= v_monto_total THEN 'pagada' ELSE 'parcial' END
   WHERE id = p_cxp_id;

  RETURN v_mov_id;
END;
$$;

-- registrar_cobro_cuota_cxc
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
  IF NOT public.auth_puede_finanzas() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene permisos para registrar cobros';
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

  v_nuevo_cobrado := v_monto_cobrado + p_monto;
  IF v_nuevo_cobrado > v_monto_cuota THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('El cobro supera el saldo pendiente de la cuota (disponible: %s)', v_monto_cuota - v_monto_cobrado);
  END IF;

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
