-- =============================================================================
-- ACTIUM | Finanzas — CxP a cuotas + cuotas con montos/fechas libres (CxC y CxP)
-- =============================================================================
-- 1. Tabla cuentas_por_pagar_cuotas (espejo de las de CxC)
-- 2. Backfill: cada CxP existente pasa a tener 1 cuota
-- 3. crear_cxc_con_cuotas recreada para aceptar cuotas explícitas (JSONB)
-- 4. crear_cxp_con_cuotas + registrar_pago_cuota_cxp
-- Todas las cuotas se generan automáticamente en el frontend (equivalentes por
-- periodicidad) pero el usuario puede editar monto y fecha de cada una antes de
-- guardar — por eso las RPC reciben el arreglo explícito de cuotas.
-- =============================================================================

-- =============================================================================
-- 1. Tabla de cuotas de CxP
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.cuentas_por_pagar_cuotas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cxp_id            UUID NOT NULL REFERENCES public.cuentas_por_pagar(id) ON DELETE CASCADE,
  proyecto_id       UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  numero_cuota      SMALLINT NOT NULL CHECK (numero_cuota > 0),
  monto             NUMERIC(15,2) NOT NULL CHECK (monto > 0),
  monto_pagado      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (monto_pagado >= 0),
  fecha_vencimiento DATE NOT NULL,
  estado            factura_estado NOT NULL DEFAULT 'pendiente',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cxp_id, numero_cuota),
  CHECK (monto_pagado <= monto)
);

CREATE INDEX IF NOT EXISTS idx_cxp_cuotas_cxp ON public.cuentas_por_pagar_cuotas (cxp_id, numero_cuota);
CREATE INDEX IF NOT EXISTS idx_cxp_cuotas_proyecto_estado ON public.cuentas_por_pagar_cuotas (proyecto_id, estado, fecha_vencimiento);

DROP TRIGGER IF EXISTS trg_cxp_cuotas_updated_at ON public.cuentas_por_pagar_cuotas;
CREATE TRIGGER trg_cxp_cuotas_updated_at
  BEFORE UPDATE ON public.cuentas_por_pagar_cuotas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.cuentas_por_pagar_cuotas IS
  'Plan de pagos de una CxP. Toda factura tiene al menos 1 cuota. El pago se registra por cuota via registrar_pago_cuota_cxp.';

ALTER TABLE public.cuentas_por_pagar_cuotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cxp_cuotas_select" ON public.cuentas_por_pagar_cuotas;
CREATE POLICY "cxp_cuotas_select" ON public.cuentas_por_pagar_cuotas
  FOR SELECT USING (public.auth_puede_ver_proyecto(proyecto_id));

DROP POLICY IF EXISTS "cxp_cuotas_insert" ON public.cuentas_por_pagar_cuotas;
CREATE POLICY "cxp_cuotas_insert" ON public.cuentas_por_pagar_cuotas
  FOR INSERT WITH CHECK (public.auth_puede_finanzas());

DROP POLICY IF EXISTS "cxp_cuotas_update" ON public.cuentas_por_pagar_cuotas;
CREATE POLICY "cxp_cuotas_update" ON public.cuentas_por_pagar_cuotas
  FOR UPDATE USING (public.auth_puede_finanzas());

-- =============================================================================
-- 2. Backfill: cada CxP existente sin cuotas obtiene 1 cuota equivalente
-- =============================================================================
INSERT INTO public.cuentas_por_pagar_cuotas (
  cxp_id, proyecto_id, numero_cuota, monto, monto_pagado, fecha_vencimiento, estado
)
SELECT c.id, c.proyecto_id, 1, c.monto_total, c.monto_pagado, c.fecha_vencimiento,
       CASE WHEN c.estado = 'anulada' THEN 'anulada'::factura_estado
            WHEN c.monto_pagado >= c.monto_total THEN 'pagada'::factura_estado
            WHEN c.monto_pagado > 0 THEN 'parcial'::factura_estado
            ELSE 'pendiente'::factura_estado END
FROM public.cuentas_por_pagar c
WHERE NOT EXISTS (
  SELECT 1 FROM public.cuentas_por_pagar_cuotas q WHERE q.cxp_id = c.id
);

-- =============================================================================
-- 3. crear_cxc_con_cuotas — ahora recibe cuotas explícitas (JSONB)
-- =============================================================================
DROP FUNCTION IF EXISTS public.crear_cxc_con_cuotas(
  UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, DATE, SMALLINT, cuota_periodicidad, DATE, TEXT
);

CREATE OR REPLACE FUNCTION public.crear_cxc_con_cuotas(
  p_proyecto_id    UUID,
  p_rubro_id       UUID,
  p_cliente_nombre TEXT,
  p_cliente_nit    TEXT,
  p_numero_factura TEXT,
  p_fecha_emision  DATE,
  p_notas          TEXT,
  p_cuotas         JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_cxc_id       UUID;
  v_total        NUMERIC(15,2);
  v_vencimiento  DATE;
  v_num          SMALLINT := 0;
  v_elem         JSONB;
  v_monto        NUMERIC(15,2);
  v_fecha        DATE;
BEGIN
  IF NOT public.auth_puede_finanzas() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene permisos para crear cuentas por cobrar';
  END IF;

  IF p_cuotas IS NULL OR jsonb_array_length(p_cuotas) < 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Debe haber al menos una cuota';
  END IF;

  SELECT COALESCE(SUM((value->>'monto')::NUMERIC), 0), MAX((value->>'fecha')::DATE)
    INTO v_total, v_vencimiento
  FROM jsonb_array_elements(p_cuotas);

  IF v_total <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El monto total debe ser mayor a cero';
  END IF;

  INSERT INTO public.cuentas_por_cobrar (
    proyecto_id, rubro_id, cliente_nombre, cliente_nit, numero_factura,
    monto_total, fecha_emision, fecha_vencimiento, notas, created_by
  ) VALUES (
    p_proyecto_id, p_rubro_id, p_cliente_nombre, p_cliente_nit, p_numero_factura,
    v_total, p_fecha_emision, v_vencimiento, p_notas, auth.uid()
  )
  RETURNING id INTO v_cxc_id;

  FOR v_elem IN SELECT value FROM jsonb_array_elements(p_cuotas) LOOP
    v_num := v_num + 1;
    v_monto := (v_elem->>'monto')::NUMERIC;
    v_fecha := (v_elem->>'fecha')::DATE;
    IF v_monto <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('La cuota %s debe tener un monto mayor a cero', v_num);
    END IF;
    INSERT INTO public.cuentas_por_cobrar_cuotas (cxc_id, proyecto_id, numero_cuota, monto, fecha_vencimiento)
    VALUES (v_cxc_id, p_proyecto_id, v_num, v_monto, v_fecha);
  END LOOP;

  RETURN v_cxc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_cxc_con_cuotas(UUID, UUID, TEXT, TEXT, TEXT, DATE, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.crear_cxc_con_cuotas IS
  'Crea una CxC y su plan de cuotas a partir de un arreglo JSONB [{monto,fecha}]. El monto total es la suma de las cuotas. super_admin o financiero.';

-- =============================================================================
-- 4. crear_cxp_con_cuotas
-- =============================================================================
CREATE OR REPLACE FUNCTION public.crear_cxp_con_cuotas(
  p_proyecto_id      UUID,
  p_rubro_id         UUID,
  p_proveedor_nombre TEXT,
  p_proveedor_nit    TEXT,
  p_numero_factura   TEXT,
  p_fecha_emision    DATE,
  p_notas            TEXT,
  p_cuotas           JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_cxp_id       UUID;
  v_total        NUMERIC(15,2);
  v_vencimiento  DATE;
  v_num          SMALLINT := 0;
  v_elem         JSONB;
  v_monto        NUMERIC(15,2);
  v_fecha        DATE;
BEGIN
  IF NOT public.auth_puede_finanzas() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene permisos para crear cuentas por pagar';
  END IF;

  IF p_cuotas IS NULL OR jsonb_array_length(p_cuotas) < 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Debe haber al menos una cuota';
  END IF;

  SELECT COALESCE(SUM((value->>'monto')::NUMERIC), 0), MAX((value->>'fecha')::DATE)
    INTO v_total, v_vencimiento
  FROM jsonb_array_elements(p_cuotas);

  IF v_total <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El monto total debe ser mayor a cero';
  END IF;

  INSERT INTO public.cuentas_por_pagar (
    proyecto_id, rubro_id, proveedor_nombre, proveedor_nit, numero_factura,
    monto_total, fecha_emision, fecha_vencimiento, notas, created_by
  ) VALUES (
    p_proyecto_id, p_rubro_id, p_proveedor_nombre, p_proveedor_nit, p_numero_factura,
    v_total, p_fecha_emision, v_vencimiento, p_notas, auth.uid()
  )
  RETURNING id INTO v_cxp_id;

  FOR v_elem IN SELECT value FROM jsonb_array_elements(p_cuotas) LOOP
    v_num := v_num + 1;
    v_monto := (v_elem->>'monto')::NUMERIC;
    v_fecha := (v_elem->>'fecha')::DATE;
    IF v_monto <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('La cuota %s debe tener un monto mayor a cero', v_num);
    END IF;
    INSERT INTO public.cuentas_por_pagar_cuotas (cxp_id, proyecto_id, numero_cuota, monto, fecha_vencimiento)
    VALUES (v_cxp_id, p_proyecto_id, v_num, v_monto, v_fecha);
  END LOOP;

  RETURN v_cxp_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_cxp_con_cuotas(UUID, UUID, TEXT, TEXT, TEXT, DATE, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.crear_cxp_con_cuotas IS
  'Crea una CxP y su plan de cuotas a partir de un arreglo JSONB [{monto,fecha}]. El monto total es la suma de las cuotas. super_admin o financiero.';

-- =============================================================================
-- 5. registrar_pago_cuota_cxp — paga una cuota específica (respeta techo/sobregiro)
-- =============================================================================
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
         c.rubro_id, c.numero_factura, c.monto_total
    INTO v_cxp_id, v_proyecto_id, v_monto_cuota, v_monto_pagado, v_estado_cuota, v_numero_cuota,
         v_rubro_id, v_numero_factura, v_cxp_monto_total
  FROM public.cuentas_por_pagar_cuotas cq
  JOIN public.cuentas_por_pagar c ON c.id = cq.cxp_id
  WHERE cq.id = p_cuota_id;

  IF v_cxp_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Cuota no encontrada';
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

  -- Movimiento de gasto: se ejecuta y dispara la validación de techo (que
  -- respeta el sobregiro del proyecto si está autorizado).
  INSERT INTO public.movimientos (
    proyecto_id, rubro_destino_id, tipo, monto, justificacion, estado, solicitado_por, fecha_efectiva
  ) VALUES (
    v_proyecto_id, v_rubro_id, 'gasto', p_monto,
    format('Pago CxP factura %s cuota %s', v_numero_factura, v_numero_cuota),
    'solicitado', auth.uid(), p_fecha
  )
  RETURNING id INTO v_mov_id;

  UPDATE public.movimientos
     SET estado = 'ejecutado', aprobado_por = auth.uid(), aprobado_at = NOW(), ejecutado_at = NOW()
   WHERE id = v_mov_id;

  UPDATE public.cuentas_por_pagar_cuotas
     SET monto_pagado = v_nuevo_pagado,
         estado = CASE WHEN v_nuevo_pagado >= v_monto_cuota THEN 'pagada' ELSE 'parcial' END
   WHERE id = p_cuota_id;

  SELECT COALESCE(SUM(monto_pagado), 0) INTO v_cxp_total_pagado
  FROM public.cuentas_por_pagar_cuotas WHERE cxp_id = v_cxp_id;

  UPDATE public.cuentas_por_pagar
     SET monto_pagado = v_cxp_total_pagado,
         estado = CASE WHEN v_cxp_total_pagado >= v_cxp_monto_total THEN 'pagada' ELSE 'parcial' END
   WHERE id = v_cxp_id;

  RETURN v_mov_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_pago_cuota_cxp(UUID, NUMERIC, DATE) TO authenticated;

COMMENT ON FUNCTION public.registrar_pago_cuota_cxp IS
  'Registra el pago (total o parcial) de una cuota de CxP: crea un movimiento ejecutado y recalcula monto_pagado/estado de la cuota y de la factura. super_admin o financiero.';
