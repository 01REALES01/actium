-- =============================================================================
-- ACTIUM | Finanzas — Presupuesto interno, CxC/CxP y Flujo de Caja
-- =============================================================================
-- Extiende el modulo de presupuesto (0006) para cubrir:
--   1. Categorizacion de rubros (categoria_flujo) para el Flujo de Caja.
--   2. Proyectos "internos" (operacion propia de una empresa, ej. Actium),
--      visibles solo para super_admin sin importar la empresa del usuario.
--   3. fecha_efectiva en movimientos (fecha contable, distinta de created_at)
--      para poder agrupar por quincena.
--   4. Cuentas por Cobrar y Cuentas por Pagar, ligadas 1:1 a un movimiento
--      cuando se registra un cobro/pago.
--   5. Vista vw_flujo_caja_quincenal que alimenta la tabla tipo Excel FC.
--
-- Contexto de seguridad (post 20260624230000_lock_writes_super_admin.sql):
-- solo super_admin escribe en toda la plataforma. Las RPCs nuevas siguen ese
-- mismo patron (auth_es_super_admin() primero, luego auth_tiene_acceso_proyecto).
--
-- Nota tecnica importante: trg_validar_techo_presupuestal (0006) solo dispara
-- en `BEFORE UPDATE OF estado`, NUNCA en INSERT. Por eso toda RPC de esta
-- migracion que necesita disparar esa validacion inserta el movimiento en
-- estado 'solicitado' y luego hace un UPDATE a 'ejecutado' dentro de la misma
-- transaccion — nunca un INSERT directo en estado 'ejecutado'.
-- =============================================================================

-- =============================================================================
-- 1. ENUMS
-- =============================================================================
CREATE TYPE categoria_flujo AS ENUM (
  'costos_operativos',
  'gastos_administrativos',
  'gastos_financieros',
  'ingresos'
);

CREATE TYPE factura_estado AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida', 'anulada');

-- =============================================================================
-- 2. ALTER RUBROS — categoria + codigo
-- =============================================================================
ALTER TABLE public.rubros
  ADD COLUMN categoria categoria_flujo NOT NULL DEFAULT 'costos_operativos',
  ADD COLUMN codigo TEXT;

CREATE INDEX idx_rubros_categoria ON public.rubros (proyecto_id, categoria) WHERE activo;

COMMENT ON COLUMN public.rubros.categoria IS
  'Categoria del Flujo de Caja (Operativos/Administrativos/Financieros/Ingresos). Determina el signo en vw_flujo_caja_quincenal.';
COMMENT ON COLUMN public.rubros.codigo IS
  'Etiqueta de jerarquia visual opcional (ej. "1", "2.1"), solo para presentacion.';

-- =============================================================================
-- 3. ALTER PROYECTOS — es_interno
-- =============================================================================
ALTER TABLE public.proyectos
  ADD COLUMN es_interno BOOLEAN NOT NULL DEFAULT FALSE;

-- Solo puede haber UN proyecto interno por empresa
CREATE UNIQUE INDEX idx_proyectos_interno_unico
  ON public.proyectos (empresa_id) WHERE es_interno AND deleted_at IS NULL;

COMMENT ON COLUMN public.proyectos.es_interno IS
  'TRUE para el proyecto que representa la operacion propia de la empresa (no facturable a un cliente). Visible solo para super_admin — ver auth_puede_ver_proyecto().';

-- =============================================================================
-- 4. ALTER MOVIMIENTOS — fecha_efectiva
-- =============================================================================
ALTER TABLE public.movimientos
  ADD COLUMN fecha_efectiva DATE NOT NULL DEFAULT CURRENT_DATE;

CREATE INDEX idx_movimientos_fecha ON public.movimientos (proyecto_id, fecha_efectiva DESC);

COMMENT ON COLUMN public.movimientos.fecha_efectiva IS
  'Fecha contable del movimiento (cuando afecta el flujo de caja). Distinta de created_at. Usada para agrupar por quincena en vw_flujo_caja_quincenal.';

-- =============================================================================
-- 5. HELPER: auth_puede_ver_proyecto (defensa en profundidad para es_interno)
-- =============================================================================
-- auth_tiene_acceso_proyecto (0008) no conoce es_interno: un usuario no
-- super_admin que perteneciera a la MISMA empresa del proyecto interno lo
-- vería igual (caso raro pero cerrable). Este helper compone ambas reglas y
-- es la base de toda policy SELECT nueva de este modulo.
CREATE OR REPLACE FUNCTION public.auth_puede_ver_proyecto(
  p_proyecto_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_es_interno BOOLEAN;
BEGIN
  IF NOT public.auth_tiene_acceso_proyecto(p_proyecto_id) THEN
    RETURN FALSE;
  END IF;

  IF public.auth_es_super_admin() THEN
    RETURN TRUE;
  END IF;

  SELECT es_interno INTO v_es_interno
  FROM public.proyectos
  WHERE id = p_proyecto_id;

  RETURN COALESCE(NOT v_es_interno, FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.auth_puede_ver_proyecto IS
  'auth_tiene_acceso_proyecto + guard de es_interno (solo super_admin ve proyectos internos). Usar en SELECT policies de proyectos, rubros, movimientos y el modulo de finanzas.';

-- Endurece proyectos_select (0009) para ocultar es_interno a no-super_admin
DROP POLICY IF EXISTS "proyectos_select" ON public.proyectos;
CREATE POLICY "proyectos_select" ON public.proyectos
  FOR SELECT USING (
    public.auth_puede_ver_proyecto(id)
    AND deleted_at IS NULL
  );

-- Idem para rubros y movimientos (misma logica, ahora con guard de interno)
DROP POLICY IF EXISTS "rubros_select" ON public.rubros;
CREATE POLICY "rubros_select" ON public.rubros
  FOR SELECT USING (public.auth_puede_ver_proyecto(proyecto_id));

DROP POLICY IF EXISTS "movimientos_select" ON public.movimientos;
CREATE POLICY "movimientos_select" ON public.movimientos
  FOR SELECT USING (public.auth_puede_ver_proyecto(proyecto_id));

-- =============================================================================
-- 6. CUENTAS POR COBRAR
-- =============================================================================
-- rubro_id es obligatorio (a diferencia del borrador inicial del plan): sin
-- el, registrar_cobro_cxc no tendria forma no ambigua de saber a que rubro
-- de categoria 'ingresos' abonar el cobro. Se valida con trigger abajo.
CREATE TABLE public.cuentas_por_cobrar (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id       UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  rubro_id          UUID NOT NULL REFERENCES public.rubros(id) ON DELETE RESTRICT,
  cliente_nombre    TEXT NOT NULL,
  cliente_nit       TEXT,
  numero_factura    TEXT NOT NULL,
  monto_total       NUMERIC(15,2) NOT NULL CHECK (monto_total > 0),
  monto_cobrado     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (monto_cobrado >= 0),
  fecha_emision     DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado            factura_estado NOT NULL DEFAULT 'pendiente',
  notas             TEXT,
  created_by        UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (proyecto_id, numero_factura),
  CHECK (monto_cobrado <= monto_total),
  CHECK (fecha_vencimiento >= fecha_emision)
);

CREATE INDEX idx_cxc_proyecto_estado ON public.cuentas_por_cobrar (proyecto_id, estado, fecha_vencimiento);

CREATE TRIGGER trg_cxc_updated_at
  BEFORE UPDATE ON public.cuentas_por_cobrar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.cuentas_por_cobrar IS
  'Facturas emitidas a clientes. Al registrar un cobro (registrar_cobro_cxc) se crea un movimiento ejecutado sobre rubro_id (debe ser categoria=ingresos).';

-- =============================================================================
-- 7. CUENTAS POR PAGAR
-- =============================================================================
CREATE TABLE public.cuentas_por_pagar (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id       UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  rubro_id          UUID NOT NULL REFERENCES public.rubros(id) ON DELETE RESTRICT,
  proveedor_nombre  TEXT NOT NULL,
  proveedor_nit     TEXT,
  numero_factura    TEXT NOT NULL,
  monto_total       NUMERIC(15,2) NOT NULL CHECK (monto_total > 0),
  monto_pagado      NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (monto_pagado >= 0),
  fecha_emision     DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado            factura_estado NOT NULL DEFAULT 'pendiente',
  notas             TEXT,
  created_by        UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (proyecto_id, proveedor_nit, numero_factura),
  CHECK (monto_pagado <= monto_total),
  CHECK (fecha_vencimiento >= fecha_emision)
);

CREATE INDEX idx_cxp_proyecto_estado ON public.cuentas_por_pagar (proyecto_id, estado, fecha_vencimiento);

CREATE TRIGGER trg_cxp_updated_at
  BEFORE UPDATE ON public.cuentas_por_pagar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.cuentas_por_pagar IS
  'Facturas recibidas de proveedores. Al registrar un pago (registrar_pago_cxp) se crea un movimiento ejecutado sobre rubro_id (debe ser categoria<>ingresos).';

-- =============================================================================
-- 8. VALIDACION: categoria del rubro coherente con CxC/CxP
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validar_categoria_rubro_cxc()
RETURNS TRIGGER AS $$
DECLARE
  v_categoria categoria_flujo;
BEGIN
  SELECT categoria INTO v_categoria FROM public.rubros WHERE id = NEW.rubro_id;
  IF v_categoria IS DISTINCT FROM 'ingresos' THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'El rubro de una cuenta por cobrar debe tener categoria ingresos';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_categoria_rubro_cxc
  BEFORE INSERT OR UPDATE OF rubro_id ON public.cuentas_por_cobrar
  FOR EACH ROW EXECUTE FUNCTION public.validar_categoria_rubro_cxc();

CREATE OR REPLACE FUNCTION public.validar_categoria_rubro_cxp()
RETURNS TRIGGER AS $$
DECLARE
  v_categoria categoria_flujo;
BEGIN
  SELECT categoria INTO v_categoria FROM public.rubros WHERE id = NEW.rubro_id;
  IF v_categoria = 'ingresos' THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'El rubro de una cuenta por pagar no puede tener categoria ingresos';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_categoria_rubro_cxp
  BEFORE INSERT OR UPDATE OF rubro_id ON public.cuentas_por_pagar
  FOR EACH ROW EXECUTE FUNCTION public.validar_categoria_rubro_cxp();

-- =============================================================================
-- 9. AUDITORIA — reutiliza auditoria_logs (append-only, RLS niega UPDATE/DELETE)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.audit_cuentas_finanzas()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.auditoria_logs (tabla, registro_id, accion, actor_id, antes, despues)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_cxc
  AFTER INSERT OR UPDATE ON public.cuentas_por_cobrar
  FOR EACH ROW EXECUTE FUNCTION public.audit_cuentas_finanzas();

CREATE TRIGGER trg_audit_cxp
  AFTER INSERT OR UPDATE ON public.cuentas_por_pagar
  FOR EACH ROW EXECUTE FUNCTION public.audit_cuentas_finanzas();

-- =============================================================================
-- 10. RLS — CxC / CxP (mismo patron que rubros/movimientos post lock-down)
-- =============================================================================
ALTER TABLE public.cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_por_pagar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cxc_select" ON public.cuentas_por_cobrar
  FOR SELECT USING (public.auth_puede_ver_proyecto(proyecto_id));

CREATE POLICY "cxc_insert" ON public.cuentas_por_cobrar
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

CREATE POLICY "cxc_update" ON public.cuentas_por_cobrar
  FOR UPDATE USING (public.auth_es_super_admin());

CREATE POLICY "cxp_select" ON public.cuentas_por_pagar
  FOR SELECT USING (public.auth_puede_ver_proyecto(proyecto_id));

CREATE POLICY "cxp_insert" ON public.cuentas_por_pagar
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

CREATE POLICY "cxp_update" ON public.cuentas_por_pagar
  FOR UPDATE USING (public.auth_es_super_admin());

-- Sin policy de DELETE en ninguna de las dos: no hay borrado fisico, solo
-- "anular" via UPDATE de estado (auditable). RLS deniega DELETE por defecto.

-- =============================================================================
-- 11. VISTA: vw_flujo_caja_quincenal
-- =============================================================================
-- Bucket quincenal fijo en dia 15 / dia 30 (o ultimo dia del mes si tiene
-- menos de 30 dias, ej. febrero), replicando el corte del Excel de origen.
CREATE VIEW public.vw_flujo_caja_quincenal AS
SELECT
  r.proyecto_id,
  r.categoria,
  r.id     AS rubro_id,
  r.nombre AS rubro_nombre,
  r.codigo AS rubro_codigo,
  CASE
    WHEN EXTRACT(DAY FROM m.fecha_efectiva) <= 15
      THEN date_trunc('month', m.fecha_efectiva)::date + 14
    ELSE LEAST(
      date_trunc('month', m.fecha_efectiva)::date + 29,
      (date_trunc('month', m.fecha_efectiva) + INTERVAL '1 month' - INTERVAL '1 day')::date
    )
  END AS quincena,
  SUM(m.monto * CASE WHEN r.categoria = 'ingresos' THEN 1 ELSE -1 END) AS total_periodo
FROM public.rubros r
JOIN public.movimientos m
  ON m.rubro_destino_id = r.id
 AND m.estado = 'ejecutado'
 AND m.tipo IN ('gasto', 'traslado_entre_rubros')
WHERE r.activo
GROUP BY r.proyecto_id, r.categoria, r.id, r.nombre, r.codigo, quincena;

COMMENT ON VIEW public.vw_flujo_caja_quincenal IS
  'Movimientos ejecutados agrupados por rubro y quincena (corte fijo dia 15/30). Solo filas con movimientos reales — el listado completo de rubros activos (incluyendo los de saldo cero) se resuelve en la capa de datos del frontend. Alimenta la tabla tipo Excel FC.';

-- =============================================================================
-- 12. RPC: ajustar_techo_rubro
-- =============================================================================
-- Cambia monto_maximo de un rubro. Nunca UPDATE directo: siempre queda un
-- movimiento tipo 'ajuste' en el ledger (auditoria_logs via audit_movimientos).
-- Bloquea bajar el techo por debajo de lo ya ejecutado.
CREATE OR REPLACE FUNCTION public.ajustar_techo_rubro(
  p_rubro_id      UUID,
  p_nuevo_monto   NUMERIC,
  p_justificacion TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_proyecto_id UUID;
  v_ejecutado   NUMERIC(15,2);
  v_mov_id      UUID;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede ajustar el techo de un rubro';
  END IF;

  IF p_nuevo_monto <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'El nuevo techo debe ser mayor a cero';
  END IF;

  SELECT proyecto_id INTO v_proyecto_id FROM public.rubros WHERE id = p_rubro_id;
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
  'Cambia monto_maximo de un rubro via un movimiento tipo ajuste (auditable). Bloquea bajar el techo por debajo de lo ya ejecutado. Solo super_admin.';

-- =============================================================================
-- 13. RPC: registrar_cobro_cxc
-- =============================================================================
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
  FROM public.cuentas_por_cobrar
  WHERE id = p_cxc_id;

  IF v_proyecto_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Cuenta por cobrar no encontrada';
  END IF;

  IF v_estado IN ('pagada', 'anulada') THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('La factura %s ya esta %s', v_numero, v_estado);
  END IF;

  v_nuevo_cobrado := v_monto_cobrado + p_monto;
  IF v_nuevo_cobrado > v_monto_total THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = format('El cobro supera el saldo pendiente (disponible: %s)', v_monto_total - v_monto_cobrado);
  END IF;

  INSERT INTO public.movimientos (
    proyecto_id, rubro_destino_id, tipo, monto, justificacion, estado, solicitado_por, fecha_efectiva
  ) VALUES (
    v_proyecto_id, v_rubro_id, 'gasto', p_monto,
    format('Cobro CxC factura %s', v_numero), 'solicitado', auth.uid(), p_fecha
  )
  RETURNING id INTO v_mov_id;

  UPDATE public.movimientos
     SET estado = 'ejecutado', aprobado_por = auth.uid(), aprobado_at = NOW(), ejecutado_at = NOW()
   WHERE id = v_mov_id;

  UPDATE public.cuentas_por_cobrar
     SET monto_cobrado = v_nuevo_cobrado,
         estado = CASE WHEN v_nuevo_cobrado >= v_monto_total THEN 'pagada' ELSE 'parcial' END
   WHERE id = p_cxc_id;

  RETURN v_mov_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_cobro_cxc(UUID, NUMERIC, DATE) TO authenticated;

COMMENT ON FUNCTION public.registrar_cobro_cxc IS
  'Registra un cobro (total o parcial) de una CxC: crea un movimiento ejecutado sobre el rubro de ingresos asociado y actualiza monto_cobrado/estado. Solo super_admin.';

-- =============================================================================
-- 14. RPC: registrar_pago_cxp
-- =============================================================================
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
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede registrar pagos';
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

  -- Insertamos en 'solicitado' y luego actualizamos a 'ejecutado' para que
  -- trg_validar_techo_presupuestal (0006) dispare y bloquee si el rubro no
  -- tiene cupo disponible — un pago SI debe respetar el techo del rubro.
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

GRANT EXECUTE ON FUNCTION public.registrar_pago_cxp(UUID, NUMERIC, DATE) TO authenticated;

COMMENT ON FUNCTION public.registrar_pago_cxp IS
  'Registra un pago (total o parcial) de una CxP: crea un movimiento ejecutado sobre el rubro asociado (dispara validar_techo_presupuestal) y actualiza monto_pagado/estado. Solo super_admin.';

-- =============================================================================
-- 15. vw_rubro_balance — agrega categoria/codigo (additivo, no rompe consumidores)
-- =============================================================================
-- CREATE OR REPLACE VIEW no permite reordenar/insertar columnas en medio de
-- la lista existente (solo agregar al final) — por eso categoria/codigo van
-- despues de porcentaje_ejecutado, preservando el orden original exacto.
CREATE OR REPLACE VIEW public.vw_rubro_balance AS
SELECT
  r.id                                                          AS rubro_id,
  r.proyecto_id,
  r.nombre,
  r.monto_maximo,
  COALESCE(SUM(m.monto) FILTER (
    WHERE m.estado = 'ejecutado'
      AND m.tipo IN ('gasto', 'traslado_entre_rubros')
  ), 0)                                                         AS ejecutado,
  COALESCE(SUM(m.monto) FILTER (
    WHERE m.estado = 'aprobado'
      AND m.tipo IN ('gasto', 'traslado_entre_rubros')
  ), 0)                                                         AS comprometido,
  r.monto_maximo
    - COALESCE(SUM(m.monto) FILTER (
        WHERE m.estado IN ('ejecutado', 'aprobado')
          AND m.tipo IN ('gasto', 'traslado_entre_rubros')
      ), 0)                                                     AS disponible,
  ROUND(
    COALESCE(SUM(m.monto) FILTER (
      WHERE m.estado = 'ejecutado'
        AND m.tipo IN ('gasto', 'traslado_entre_rubros')
    ), 0) / NULLIF(r.monto_maximo, 0) * 100,
    2
  )                                                             AS porcentaje_ejecutado,
  r.categoria,
  r.codigo
FROM public.rubros r
LEFT JOIN public.movimientos m ON m.rubro_destino_id = r.id
WHERE r.activo
GROUP BY r.id, r.proyecto_id, r.nombre, r.monto_maximo, r.categoria, r.codigo;

COMMENT ON VIEW public.vw_rubro_balance IS
  'Balance por rubro: ejecutado, comprometido (aprobado aun no ejecutado), disponible y porcentaje. Incluye categoria/codigo para el modulo de Finanzas. Alimenta alertas 80/90/100%.';

-- =============================================================================
-- 16. vw_proyectos_finanzas — listado para el hub de Finanzas
-- =============================================================================
-- Un proyecto por fila con su resumen presupuestal agregado (suma de todos
-- sus rubros activos). Usado en /finanzas y /finanzas/presupuesto para no
-- tener que golpear vw_rubro_balance N veces desde el listado.
CREATE VIEW public.vw_proyectos_finanzas AS
SELECT
  p.id            AS proyecto_id,
  p.empresa_id,
  p.nombre        AS proyecto_nombre,
  p.es_interno,
  p.estado,
  COALESCE(SUM(b.monto_maximo), 0) AS presupuesto_total,
  COALESCE(SUM(b.ejecutado), 0)    AS presupuesto_ejecutado,
  COALESCE(SUM(b.comprometido), 0) AS presupuesto_comprometido,
  COALESCE(SUM(b.disponible), 0)   AS presupuesto_disponible,
  ROUND(
    COALESCE(SUM(b.ejecutado), 0) / NULLIF(SUM(b.monto_maximo), 0) * 100,
    2
  ) AS porcentaje_ejecutado
FROM public.proyectos p
LEFT JOIN public.vw_rubro_balance b ON b.proyecto_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.empresa_id, p.nombre, p.es_interno, p.estado;

COMMENT ON VIEW public.vw_proyectos_finanzas IS
  'Un proyecto por fila con su presupuesto agregado (suma de rubros). Alimenta el listado de /finanzas/presupuesto.';
