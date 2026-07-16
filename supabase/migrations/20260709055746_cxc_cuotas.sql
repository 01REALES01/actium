-- =============================================================================
-- ACTIUM | CxC a cuotas — plan de pagos quincenal o mensual
-- =============================================================================
-- Toda cuenta por cobrar nueva se crea con al menos 1 cuota (pago unico =
-- caso particular de 1 cuota). El cobro real se registra siempre contra una
-- cuota especifica, nunca contra la factura completa directamente — eso
-- permite ver que cuotas estan pagadas/pendientes/vencidas de forma
-- independiente dentro de una misma factura.
-- =============================================================================

CREATE TYPE cuota_periodicidad AS ENUM ('quincenal', 'mensual');

CREATE TABLE public.cuentas_por_cobrar_cuotas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cxc_id            UUID NOT NULL REFERENCES public.cuentas_por_cobrar(id) ON DELETE CASCADE,
  proyecto_id       UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  numero_cuota      SMALLINT NOT NULL CHECK (numero_cuota > 0),
  monto             NUMERIC(15,2) NOT NULL CHECK (monto > 0),
  monto_cobrado     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (monto_cobrado >= 0),
  fecha_vencimiento DATE NOT NULL,
  estado            factura_estado NOT NULL DEFAULT 'pendiente',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (cxc_id, numero_cuota),
  CHECK (monto_cobrado <= monto)
);

CREATE INDEX idx_cxc_cuotas_cxc ON public.cuentas_por_cobrar_cuotas (cxc_id, numero_cuota);
CREATE INDEX idx_cxc_cuotas_proyecto_estado ON public.cuentas_por_cobrar_cuotas (proyecto_id, estado, fecha_vencimiento);

CREATE TRIGGER trg_cxc_cuotas_updated_at
  BEFORE UPDATE ON public.cuentas_por_cobrar_cuotas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.cuentas_por_cobrar_cuotas IS
  'Plan de pagos de una CxC. Toda factura tiene al menos 1 cuota. El cobro se registra siempre por cuota via registrar_cobro_cuota_cxc, que recalcula el acumulado de la factura padre.';

ALTER TABLE public.cuentas_por_cobrar_cuotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cxc_cuotas_select" ON public.cuentas_por_cobrar_cuotas
  FOR SELECT USING (public.auth_puede_ver_proyecto(proyecto_id));

CREATE POLICY "cxc_cuotas_insert" ON public.cuentas_por_cobrar_cuotas
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

CREATE POLICY "cxc_cuotas_update" ON public.cuentas_por_cobrar_cuotas
  FOR UPDATE USING (public.auth_es_super_admin());

-- =============================================================================
-- RPC: crear_cxc_con_cuotas — crea la factura y genera su plan de cuotas
-- =============================================================================
CREATE OR REPLACE FUNCTION public.crear_cxc_con_cuotas(
  p_proyecto_id         UUID,
  p_rubro_id            UUID,
  p_cliente_nombre      TEXT,
  p_cliente_nit         TEXT,
  p_numero_factura      TEXT,
  p_monto_total         NUMERIC,
  p_fecha_emision       DATE,
  p_numero_cuotas       SMALLINT,
  p_periodicidad        cuota_periodicidad,
  p_fecha_primera_cuota DATE,
  p_notas               TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_cxc_id           UUID;
  v_monto_cuota      NUMERIC(15,2);
  v_monto_acumulado  NUMERIC(15,2) := 0;
  v_fecha_cuota      DATE;
  v_fecha_ultima     DATE;
  i                  INT;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Solo super_admin puede crear cuentas por cobrar';
  END IF;

  IF p_numero_cuotas < 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El numero de cuotas debe ser al menos 1';
  END IF;

  IF p_monto_total <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El monto total debe ser mayor a cero';
  END IF;

  v_fecha_ultima := CASE p_periodicidad
    WHEN 'quincenal' THEN p_fecha_primera_cuota + ((p_numero_cuotas - 1) * INTERVAL '15 days')
    ELSE p_fecha_primera_cuota + ((p_numero_cuotas - 1) * INTERVAL '1 month')
  END;

  INSERT INTO public.cuentas_por_cobrar (
    proyecto_id, rubro_id, cliente_nombre, cliente_nit, numero_factura,
    monto_total, fecha_emision, fecha_vencimiento, notas, created_by
  ) VALUES (
    p_proyecto_id, p_rubro_id, p_cliente_nombre, p_cliente_nit, p_numero_factura,
    p_monto_total, p_fecha_emision, v_fecha_ultima, p_notas, auth.uid()
  )
  RETURNING id INTO v_cxc_id;

  v_monto_cuota := TRUNC(p_monto_total / p_numero_cuotas, 2);

  FOR i IN 1..p_numero_cuotas LOOP
    v_fecha_cuota := CASE p_periodicidad
      WHEN 'quincenal' THEN p_fecha_primera_cuota + ((i - 1) * INTERVAL '15 days')
      ELSE p_fecha_primera_cuota + ((i - 1) * INTERVAL '1 month')
    END;

    INSERT INTO public.cuentas_por_cobrar_cuotas (
      cxc_id, proyecto_id, numero_cuota, monto, fecha_vencimiento
    ) VALUES (
      v_cxc_id, p_proyecto_id, i,
      CASE WHEN i = p_numero_cuotas THEN p_monto_total - v_monto_acumulado ELSE v_monto_cuota END,
      v_fecha_cuota
    );

    v_monto_acumulado := v_monto_acumulado + v_monto_cuota;
  END LOOP;

  RETURN v_cxc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_cxc_con_cuotas(
  UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, DATE, SMALLINT, cuota_periodicidad, DATE, TEXT
) TO authenticated;

COMMENT ON FUNCTION public.crear_cxc_con_cuotas IS
  'Crea una cuenta por cobrar y su plan de cuotas (quincenal o mensual) en una sola transaccion. La ultima cuota absorbe el remanente del redondeo. Solo super_admin.';

-- =============================================================================
-- RPC: registrar_cobro_cuota_cxc — cobra una cuota especifica
-- =============================================================================
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

GRANT EXECUTE ON FUNCTION public.registrar_cobro_cuota_cxc(UUID, NUMERIC, DATE) TO authenticated;

COMMENT ON FUNCTION public.registrar_cobro_cuota_cxc IS
  'Registra el cobro (total o parcial) de una cuota especifica: crea un movimiento ejecutado y recalcula monto_cobrado/estado de la cuota y de la factura padre. Solo super_admin.';
