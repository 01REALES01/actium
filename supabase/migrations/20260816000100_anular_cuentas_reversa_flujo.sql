-- =============================================================================
-- ACTIUM | Finanzas — anular una CxC/CxP revierte su efecto en el flujo de caja
-- =============================================================================
-- Hasta ahora anular solo cambiaba el estado de la cabecera. Sus cuotas seguían
-- 'pendiente' (y por tanto seguían proyectando caja) y los movimientos de los
-- abonos ya registrados seguían 'ejecutado' (y por tanto seguían sumando en el
-- flujo real del proyecto y en el consolidado de todos los proyectos).
--
-- A partir de aquí, anular una factura hace las tres cosas en una transacción:
--   1. Revierte los movimientos de sus abonos  -> estado 'anulado'. Salen del
--      flujo real (vw_flujo_caja_quincenal filtra estado = 'ejecutado') y
--      liberan el techo del rubro (vw_rubro_balance usa el mismo filtro).
--   2. Marca sus cuotas como 'anulada'         -> salen del proyectado y ya no
--      admiten cobros/pagos.
--   3. Marca la cabecera como 'anulada'.
--
-- No se borra nada: las filas conservan su historial (monto_cobrado/pagado) y
-- cada transición queda en auditoria_logs — para lo cual la sección 7 corrige el
-- actor que registraba audit_movimientos y agrega los triggers que a las cuotas
-- les faltaban.
--
-- La cabecera se bloquea con FOR UPDATE tanto al anular como al registrar un
-- abono: sin eso, un cobro concurrente podía colarse después de la reversión y
-- dejar la factura anulada con un movimiento ejecutado vivo.
--
-- Para revertir los abonos hay que saber qué movimiento vino de qué factura.
-- El único vínculo era el texto de `justificacion`, así que se agregan FK
-- explícitas, se hace backfill de las existentes y las RPC de cobro/pago pasan
-- a estamparlas.
-- =============================================================================

-- =============================================================================
-- 1. Vínculo explícito movimiento -> factura de origen
-- =============================================================================
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS cxc_id UUID NULL REFERENCES public.cuentas_por_cobrar(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cxp_id UUID NULL REFERENCES public.cuentas_por_pagar(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.movimientos.cxc_id IS
  'Factura CxC que originó este movimiento (abono de cobro). NULL si el movimiento no viene de una CxC.';
COMMENT ON COLUMN public.movimientos.cxp_id IS
  'Factura CxP que originó este movimiento (abono de pago). NULL si el movimiento no viene de una CxP.';

CREATE INDEX IF NOT EXISTS idx_movimientos_cxc ON public.movimientos (cxc_id) WHERE cxc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movimientos_cxp ON public.movimientos (cxp_id) WHERE cxp_id IS NOT NULL;

-- =============================================================================
-- 2. Backfill del vínculo desde la justificación generada por las RPC
-- =============================================================================
-- Los textos son literales generados por el sistema. Se usa starts_with (no
-- LIKE) para que un '%' o '_' dentro del número de factura no actúe como
-- comodín, y se acota por proyecto y rubro. Si un movimiento empata con más de
-- una factura (mismo proyecto, mismo rubro y mismo número de factura en dos
-- proveedores distintos) se deja sin vincular en vez de adivinar: es preferible
-- que no se revierta a que se revierta el abono equivocado.

WITH candidatos AS (
  SELECT m.id AS mov_id,
         c.id AS factura_id,
         COUNT(*) OVER (PARTITION BY m.id) AS coincidencias
    FROM public.movimientos m
    JOIN public.cuentas_por_cobrar c
      ON c.proyecto_id = m.proyecto_id
     AND c.rubro_id = m.rubro_destino_id
     AND (
           starts_with(m.justificacion, 'Cobro CxC factura ' || c.numero_factura || ' cuota ')
           -- Formato anterior a las cuotas: cobro de la factura completa.
           OR m.justificacion = 'Cobro CxC factura ' || c.numero_factura
         )
   WHERE m.cxc_id IS NULL
)
UPDATE public.movimientos m
   SET cxc_id = k.factura_id
  FROM candidatos k
 WHERE m.id = k.mov_id
   AND k.coincidencias = 1;

WITH candidatos AS (
  SELECT m.id AS mov_id,
         c.id AS factura_id,
         COUNT(*) OVER (PARTITION BY m.id) AS coincidencias
    FROM public.movimientos m
    JOIN public.cuentas_por_pagar c
      ON c.proyecto_id = m.proyecto_id
     AND c.rubro_id = m.rubro_destino_id
     AND (
           starts_with(m.justificacion, 'Pago CxP factura ' || c.numero_factura || ' cuota ')
           -- Formato anterior a las cuotas: pago de la factura completa.
           OR m.justificacion = 'Pago CxP factura ' || c.numero_factura
         )
   WHERE m.cxp_id IS NULL
)
UPDATE public.movimientos m
   SET cxp_id = k.factura_id
  FROM candidatos k
 WHERE m.id = k.mov_id
   AND k.coincidencias = 1;

-- =============================================================================
-- 3. RPC: anular_cxc
-- =============================================================================
CREATE OR REPLACE FUNCTION public.anular_cxc(p_cxc_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_proyecto_id     UUID;
  v_estado          factura_estado;
  v_numero          TEXT;
  v_abonos          INT;
  v_monto_revertido NUMERIC(15,2);
BEGIN
  IF NOT public.auth_puede_finanzas() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'No tiene permisos para anular cuentas por cobrar';
  END IF;

  SELECT proyecto_id, estado, numero_factura
    INTO v_proyecto_id, v_estado, v_numero
  FROM public.cuentas_por_cobrar
  WHERE id = p_cxc_id
  FOR UPDATE;

  IF v_proyecto_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Cuenta por cobrar no encontrada';
  END IF;

  IF NOT public.auth_puede_ver_proyecto(v_proyecto_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene acceso a este proyecto';
  END IF;

  IF v_estado = 'anulada' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('La factura %s ya esta anulada', v_numero);
  END IF;

  -- 1. Los abonos dejan de afectar el flujo real y liberan el rubro.
  SELECT COALESCE(SUM(monto), 0) INTO v_monto_revertido
  FROM public.movimientos
  WHERE cxc_id = p_cxc_id
    AND estado = 'ejecutado';

  UPDATE public.movimientos
     SET estado = 'anulado'
   WHERE cxc_id = p_cxc_id
     AND estado = 'ejecutado';

  GET DIAGNOSTICS v_abonos = ROW_COUNT;

  -- 2. Las cuotas dejan de proyectar caja y de admitir cobros.
  UPDATE public.cuentas_por_cobrar_cuotas
     SET estado = 'anulada'
   WHERE cxc_id = p_cxc_id
     AND estado <> 'anulada';

  -- 3. La cabecera. Se conserva monto_cobrado como historial de lo que
  --    alcanzó a cobrarse antes de anular.
  UPDATE public.cuentas_por_cobrar
     SET estado = 'anulada'
   WHERE id = p_cxc_id;

  RETURN jsonb_build_object(
    'abonos_revertidos', v_abonos,
    'monto_revertido',   v_monto_revertido
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.anular_cxc(UUID) TO authenticated;

COMMENT ON FUNCTION public.anular_cxc IS
  'Anula una CxC: revierte los movimientos de sus abonos (estado anulado), anula sus cuotas y la cabecera. La factura deja de afectar el flujo de caja del proyecto y el consolidado. super_admin o financiero.';

-- =============================================================================
-- 4. RPC: anular_cxp
-- =============================================================================
CREATE OR REPLACE FUNCTION public.anular_cxp(p_cxp_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_proyecto_id     UUID;
  v_estado          factura_estado;
  v_numero          TEXT;
  v_abonos          INT;
  v_monto_revertido NUMERIC(15,2);
BEGIN
  IF NOT public.auth_puede_finanzas() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'No tiene permisos para anular cuentas por pagar';
  END IF;

  SELECT proyecto_id, estado, numero_factura
    INTO v_proyecto_id, v_estado, v_numero
  FROM public.cuentas_por_pagar
  WHERE id = p_cxp_id
  FOR UPDATE;

  IF v_proyecto_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Cuenta por pagar no encontrada';
  END IF;

  IF NOT public.auth_puede_ver_proyecto(v_proyecto_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene acceso a este proyecto';
  END IF;

  IF v_estado = 'anulada' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('La factura %s ya esta anulada', v_numero);
  END IF;

  SELECT COALESCE(SUM(monto), 0) INTO v_monto_revertido
  FROM public.movimientos
  WHERE cxp_id = p_cxp_id
    AND estado = 'ejecutado';

  UPDATE public.movimientos
     SET estado = 'anulado'
   WHERE cxp_id = p_cxp_id
     AND estado = 'ejecutado';

  GET DIAGNOSTICS v_abonos = ROW_COUNT;

  UPDATE public.cuentas_por_pagar_cuotas
     SET estado = 'anulada'
   WHERE cxp_id = p_cxp_id
     AND estado <> 'anulada';

  UPDATE public.cuentas_por_pagar
     SET estado = 'anulada'
   WHERE id = p_cxp_id;

  RETURN jsonb_build_object(
    'abonos_revertidos', v_abonos,
    'monto_revertido',   v_monto_revertido
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.anular_cxp(UUID) TO authenticated;

COMMENT ON FUNCTION public.anular_cxp IS
  'Anula una CxP: revierte los movimientos de sus abonos (estado anulado), anula sus cuotas y la cabecera. La factura deja de afectar el flujo de caja del proyecto y el consolidado. super_admin o financiero.';

-- =============================================================================
-- 5. Las RPC de cobro/pago estampan el vínculo y rechazan facturas anuladas
-- =============================================================================
-- Sin el vínculo, un abono registrado desde hoy no podría revertirse al anular.
-- El chequeo del estado de la CABECERA es defensa en profundidad: tras el paso
-- 3/4 las cuotas de una factura anulada ya quedan 'anulada', pero así una
-- factura anulada por cualquier otra vía tampoco admite abonos.

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
  v_estado_factura    factura_estado;
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
         c.rubro_id, c.numero_factura, c.monto_total, c.estado
    INTO v_cxc_id, v_proyecto_id, v_monto_cuota, v_monto_cobrado, v_estado_cuota, v_numero_cuota,
         v_rubro_id, v_numero_factura, v_cxc_monto_total, v_estado_factura
  FROM public.cuentas_por_cobrar_cuotas cq
  JOIN public.cuentas_por_cobrar c ON c.id = cq.cxc_id
  WHERE cq.id = p_cuota_id
  FOR UPDATE;
  IF v_cxc_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Cuota no encontrada';
  END IF;
  IF v_estado_factura = 'anulada' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('La factura %s esta anulada: no admite cobros', v_numero_factura);
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
    proyecto_id, rubro_destino_id, tipo, monto, justificacion, estado, solicitado_por, fecha_efectiva, cxc_id
  ) VALUES (
    v_proyecto_id, v_rubro_id, 'gasto', p_monto,
    format('Cobro CxC factura %s cuota %s', v_numero_factura, v_numero_cuota),
    'solicitado', auth.uid(), p_fecha, v_cxc_id
  ) RETURNING id INTO v_mov_id;
  UPDATE public.movimientos
     SET estado = 'ejecutado', aprobado_por = auth.uid(), aprobado_at = NOW(), ejecutado_at = NOW()
   WHERE id = v_mov_id;
  UPDATE public.cuentas_por_cobrar_cuotas
     SET monto_cobrado = v_nuevo_cobrado,
         estado = (CASE WHEN v_nuevo_cobrado >= v_monto_cuota THEN 'pagada' ELSE 'parcial' END)::factura_estado
   WHERE id = p_cuota_id;
  SELECT COALESCE(SUM(monto_cobrado), 0) INTO v_cxc_total_cobrado
  FROM public.cuentas_por_cobrar_cuotas WHERE cxc_id = v_cxc_id;
  UPDATE public.cuentas_por_cobrar
     SET monto_cobrado = v_cxc_total_cobrado,
         estado = (CASE WHEN v_cxc_total_cobrado >= v_cxc_monto_total THEN 'pagada' ELSE 'parcial' END)::factura_estado
   WHERE id = v_cxc_id;
  RETURN v_mov_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_pago_cuota_cxp(
  p_cuota_id UUID,
  p_monto    NUMERIC,
  p_fecha    DATE DEFAULT CURRENT_DATE
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_cxp_id            UUID;
  v_proyecto_id       UUID;
  v_rubro_id          UUID;
  v_monto_cuota       NUMERIC(15,2);
  v_monto_pagado      NUMERIC(15,2);
  v_estado_cuota      factura_estado;
  v_estado_factura    factura_estado;
  v_numero_cuota      SMALLINT;
  v_numero_factura    TEXT;
  v_cxp_monto_total   NUMERIC(15,2);
  v_nuevo_pagado      NUMERIC(15,2);
  v_mov_id            UUID;
  v_cxp_total_pagado  NUMERIC(15,2);
BEGIN
  IF NOT public.auth_puede_finanzas() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene permisos para registrar pagos';
  END IF;
  IF p_monto <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El monto del pago debe ser mayor a cero';
  END IF;
  SELECT cq.cxp_id, cq.proyecto_id, cq.monto, cq.monto_pagado, cq.estado, cq.numero_cuota,
         c.rubro_id, c.numero_factura, c.monto_total, c.estado
    INTO v_cxp_id, v_proyecto_id, v_monto_cuota, v_monto_pagado, v_estado_cuota, v_numero_cuota,
         v_rubro_id, v_numero_factura, v_cxp_monto_total, v_estado_factura
  FROM public.cuentas_por_pagar_cuotas cq
  JOIN public.cuentas_por_pagar c ON c.id = cq.cxp_id
  WHERE cq.id = p_cuota_id
  FOR UPDATE;
  IF v_cxp_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Cuota no encontrada';
  END IF;
  IF v_estado_factura = 'anulada' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('La factura %s esta anulada: no admite pagos', v_numero_factura);
  END IF;
  IF v_estado_cuota IN ('pagada', 'anulada') THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('La cuota %s de la factura %s ya esta %s', v_numero_cuota, v_numero_factura, v_estado_cuota);
  END IF;
  v_nuevo_pagado := v_monto_pagado + p_monto;
  IF v_nuevo_pagado > v_monto_cuota THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('El pago supera el saldo pendiente de la cuota (disponible: %s)', v_monto_cuota - v_monto_pagado);
  END IF;
  INSERT INTO public.movimientos (
    proyecto_id, rubro_destino_id, tipo, monto, justificacion, estado, solicitado_por, fecha_efectiva, cxp_id
  ) VALUES (
    v_proyecto_id, v_rubro_id, 'gasto', p_monto,
    format('Pago CxP factura %s cuota %s', v_numero_factura, v_numero_cuota),
    'solicitado', auth.uid(), p_fecha, v_cxp_id
  ) RETURNING id INTO v_mov_id;
  UPDATE public.movimientos
     SET estado = 'ejecutado', aprobado_por = auth.uid(), aprobado_at = NOW(), ejecutado_at = NOW()
   WHERE id = v_mov_id;
  UPDATE public.cuentas_por_pagar_cuotas
     SET monto_pagado = v_nuevo_pagado,
         estado = (CASE WHEN v_nuevo_pagado >= v_monto_cuota THEN 'pagada' ELSE 'parcial' END)::factura_estado
   WHERE id = p_cuota_id;
  SELECT COALESCE(SUM(monto_pagado), 0) INTO v_cxp_total_pagado
  FROM public.cuentas_por_pagar_cuotas WHERE cxp_id = v_cxp_id;
  UPDATE public.cuentas_por_pagar
     SET monto_pagado = v_cxp_total_pagado,
         estado = (CASE WHEN v_cxp_total_pagado >= v_cxp_monto_total THEN 'pagada' ELSE 'parcial' END)::factura_estado
   WHERE id = v_cxp_id;
  RETURN v_mov_id;
END;
$$;

-- registrar_cobro_cxc (cobro de factura completa, formato anterior a las cuotas)
-- Sigue expuesta por PostgREST, así que también debe estampar el vínculo: si no,
-- un cobro registrado por esta vía quedaría sin cxc_id y anular la factura no lo
-- revertiría nunca.
CREATE OR REPLACE FUNCTION public.registrar_cobro_cxc(
  p_cxc_id UUID,
  p_monto  NUMERIC,
  p_fecha  DATE DEFAULT CURRENT_DATE
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_proyecto_id   UUID;
  v_rubro_id      UUID;
  v_monto_total   NUMERIC(15,2);
  v_monto_cobrado NUMERIC(15,2);
  v_estado        factura_estado;
  v_numero        TEXT;
  v_nuevo_cobrado NUMERIC(15,2);
  v_mov_id        UUID;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede registrar cobros';
  END IF;
  IF p_monto <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El monto del cobro debe ser mayor a cero';
  END IF;
  SELECT proyecto_id, rubro_id, monto_total, monto_cobrado, estado, numero_factura
    INTO v_proyecto_id, v_rubro_id, v_monto_total, v_monto_cobrado, v_estado, v_numero
  FROM public.cuentas_por_cobrar WHERE id = p_cxc_id FOR UPDATE;
  IF v_proyecto_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Cuenta por cobrar no encontrada';
  END IF;
  IF v_estado IN ('pagada', 'anulada') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('La factura %s ya esta %s', v_numero, v_estado);
  END IF;
  v_nuevo_cobrado := v_monto_cobrado + p_monto;
  IF v_nuevo_cobrado > v_monto_total THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('El cobro supera el saldo pendiente (disponible: %s)', v_monto_total - v_monto_cobrado);
  END IF;
  INSERT INTO public.movimientos (
    proyecto_id, rubro_destino_id, tipo, monto, justificacion, estado, solicitado_por, fecha_efectiva, cxc_id
  ) VALUES (
    v_proyecto_id, v_rubro_id, 'gasto', p_monto,
    format('Cobro CxC factura %s', v_numero), 'solicitado', auth.uid(), p_fecha, p_cxc_id
  ) RETURNING id INTO v_mov_id;
  UPDATE public.movimientos
     SET estado = 'ejecutado', aprobado_por = auth.uid(), aprobado_at = NOW(), ejecutado_at = NOW()
   WHERE id = v_mov_id;
  UPDATE public.cuentas_por_cobrar
     SET monto_cobrado = v_nuevo_cobrado,
         estado = (CASE WHEN v_nuevo_cobrado >= v_monto_total THEN 'pagada' ELSE 'parcial' END)::factura_estado
   WHERE id = p_cxc_id;
  RETURN v_mov_id;
END;
$$;

-- registrar_pago_cxp (pago de factura completa, formato anterior a las cuotas)
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
  FROM public.cuentas_por_pagar WHERE id = p_cxp_id FOR UPDATE;
  IF v_proyecto_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Cuenta por pagar no encontrada';
  END IF;
  IF v_estado IN ('pagada', 'anulada') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('La factura %s ya esta %s', v_numero, v_estado);
  END IF;
  v_nuevo_pagado := v_monto_pagado + p_monto;
  IF v_nuevo_pagado > v_monto_total THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('El pago supera el saldo pendiente (disponible: %s)', v_monto_total - v_monto_pagado);
  END IF;
  INSERT INTO public.movimientos (
    proyecto_id, rubro_destino_id, tipo, monto, justificacion, estado, solicitado_por, fecha_efectiva, cxp_id
  ) VALUES (
    v_proyecto_id, v_rubro_id, 'gasto', p_monto,
    format('Pago CxP factura %s', v_numero), 'solicitado', auth.uid(), p_fecha, p_cxp_id
  ) RETURNING id INTO v_mov_id;
  UPDATE public.movimientos
     SET estado = 'ejecutado', aprobado_por = auth.uid(), aprobado_at = NOW(), ejecutado_at = NOW()
   WHERE id = v_mov_id;
  UPDATE public.cuentas_por_pagar
     SET monto_pagado = v_nuevo_pagado,
         estado = (CASE WHEN v_nuevo_pagado >= v_monto_total THEN 'pagada' ELSE 'parcial' END)::factura_estado
   WHERE id = p_cxp_id;
  RETURN v_mov_id;
END;
$$;

-- =============================================================================
-- 6. Retroactivo: facturas anuladas antes de esta migración
-- =============================================================================
-- Quedaron con cuotas vivas (proyectando caja) y abonos ejecutados (sumando al
-- flujo real). Se les aplica la misma regla para que el histórico sea coherente
-- con el comportamiento nuevo.

UPDATE public.movimientos m
   SET estado = 'anulado'
  FROM public.cuentas_por_cobrar c
 WHERE m.cxc_id = c.id
   AND c.estado = 'anulada'
   AND m.estado = 'ejecutado';

UPDATE public.cuentas_por_cobrar_cuotas q
   SET estado = 'anulada'
  FROM public.cuentas_por_cobrar c
 WHERE q.cxc_id = c.id
   AND c.estado = 'anulada'
   AND q.estado <> 'anulada';

UPDATE public.movimientos m
   SET estado = 'anulado'
  FROM public.cuentas_por_pagar c
 WHERE m.cxp_id = c.id
   AND c.estado = 'anulada'
   AND m.estado = 'ejecutado';

UPDATE public.cuentas_por_pagar_cuotas q
   SET estado = 'anulada'
  FROM public.cuentas_por_pagar c
 WHERE q.cxp_id = c.id
   AND c.estado = 'anulada'
   AND q.estado <> 'anulada';

-- =============================================================================
-- 7. Auditoría: actor correcto y cobertura de las cuotas
-- =============================================================================
-- audit_movimientos atribuía la fila a NEW.aprobado_por, que en una reversión
-- sigue siendo quien registró el abono original — no quien anuló. Se pasa a
-- auth.uid() (el usuario de la sesión que ejecuta el cambio) con los campos del
-- movimiento como respaldo. De paso se corrige el acceso a NEW en el camino
-- DELETE, que es el que recorre eliminar_proyecto_definitivo.
CREATE OR REPLACE FUNCTION public.audit_movimientos()
RETURNS TRIGGER AS $$
DECLARE
  v_actor      UUID;
  v_registro   UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_actor    := COALESCE(auth.uid(), OLD.aprobado_por, OLD.solicitado_por);
    v_registro := OLD.id;
  ELSE
    v_actor    := COALESCE(auth.uid(), NEW.aprobado_por, NEW.solicitado_por);
    v_registro := NEW.id;
  END IF;

  INSERT INTO public.auditoria_logs (tabla, registro_id, accion, actor_id, antes, despues)
  VALUES (
    'movimientos',
    v_registro,
    TG_OP,
    v_actor,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Las cuotas no tenían auditoría: solo la tenían las cabeceras y movimientos.
-- Sin esto, la transición cuota -> 'anulada' no quedaba registrada en ningún
-- lado. Se reutiliza el trigger genérico ya existente para las cuentas.
DROP TRIGGER IF EXISTS trg_audit_cxc_cuotas ON public.cuentas_por_cobrar_cuotas;
CREATE TRIGGER trg_audit_cxc_cuotas
  AFTER INSERT OR UPDATE ON public.cuentas_por_cobrar_cuotas
  FOR EACH ROW EXECUTE FUNCTION public.audit_cuentas_finanzas();

DROP TRIGGER IF EXISTS trg_audit_cxp_cuotas ON public.cuentas_por_pagar_cuotas;
CREATE TRIGGER trg_audit_cxp_cuotas
  AFTER INSERT OR UPDATE ON public.cuentas_por_pagar_cuotas
  FOR EACH ROW EXECUTE FUNCTION public.audit_cuentas_finanzas();
