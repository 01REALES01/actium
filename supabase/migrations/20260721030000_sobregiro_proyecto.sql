-- =============================================================================
-- ACTIUM | Finanzas — Autorizar extra presupuesto (sobregiro por proyecto)
-- =============================================================================
-- En la práctica, aunque haya un presupuesto establecido, es probable pasarse.
-- Este flag, una vez activo, permite que CUALQUIER rubro del proyecto supere su
-- techo al ejecutar movimientos (pagos de CxP). La trazabilidad se mantiene:
-- los movimientos se siguen registrando y las barras de rubro pasan de 100%.
-- =============================================================================

-- 1. Columna
ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS permite_sobregiro BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.proyectos.permite_sobregiro IS
  'Si TRUE, los movimientos pueden superar el techo de los rubros (extra presupuesto autorizado). Trazabilidad intacta.';

-- 2. Trigger de techo respeta el sobregiro
CREATE OR REPLACE FUNCTION public.validar_techo_presupuestal()
RETURNS TRIGGER AS $$
DECLARE
  v_monto_maximo  NUMERIC(15,2);
  v_ejecutado     NUMERIC(15,2);
  v_sobregiro     BOOLEAN;
BEGIN
  IF NEW.estado <> 'ejecutado' OR NEW.tipo NOT IN ('gasto', 'traslado_entre_rubros') THEN
    RETURN NEW;
  END IF;
  IF OLD.estado = 'ejecutado' THEN
    RETURN NEW;
  END IF;

  SELECT permite_sobregiro INTO v_sobregiro
  FROM public.proyectos WHERE id = NEW.proyecto_id;

  IF COALESCE(v_sobregiro, FALSE) THEN
    RETURN NEW;  -- extra presupuesto autorizado: no se valida el techo
  END IF;

  SELECT monto_maximo INTO v_monto_maximo
  FROM public.rubros WHERE id = NEW.rubro_destino_id;

  SELECT COALESCE(SUM(monto), 0) INTO v_ejecutado
  FROM public.movimientos
  WHERE rubro_destino_id = NEW.rubro_destino_id
    AND tipo IN ('gasto', 'traslado_entre_rubros')
    AND estado = 'ejecutado'
    AND id <> NEW.id;

  IF (v_ejecutado + NEW.monto) > v_monto_maximo THEN
    RAISE EXCEPTION
      'El movimiento supera el techo del rubro (disponible: %, solicitado: %)',
      v_monto_maximo - v_ejecutado, NEW.monto;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. RPC para activar/desactivar (financiero puede: es una transacción)
-- SECURITY DEFINER: financiero no tiene UPDATE directo sobre proyectos por RLS,
-- pero sí puede autorizar sobregiro. La verificación de permiso es interna.
CREATE OR REPLACE FUNCTION public.set_sobregiro_proyecto(
  p_proyecto_id UUID,
  p_activo      BOOLEAN
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.auth_puede_finanzas() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'No tiene permisos para autorizar extra presupuesto';
  END IF;

  IF NOT public.auth_puede_ver_proyecto(p_proyecto_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene acceso a este proyecto';
  END IF;

  UPDATE public.proyectos SET permite_sobregiro = p_activo WHERE id = p_proyecto_id;
  RETURN p_activo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_sobregiro_proyecto(UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION public.set_sobregiro_proyecto IS
  'Activa/desactiva el sobregiro (extra presupuesto) de un proyecto. Permitido a super_admin y financiero.';

-- 4. vw_proyectos_finanzas expone permite_sobregiro (al final, no reordena)
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
  p.presupuesto_fijado,
  p.permite_sobregiro
FROM public.proyectos p
LEFT JOIN public.vw_rubro_balance b ON b.proyecto_id = p.id AND b.categoria <> 'ingresos'
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.empresa_id, p.nombre, p.es_interno, p.estado, p.presupuesto_fijado, p.permite_sobregiro;

ALTER VIEW public.vw_proyectos_finanzas SET (security_invoker = true);
