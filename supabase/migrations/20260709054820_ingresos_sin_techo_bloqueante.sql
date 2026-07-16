-- =============================================================================
-- ACTIUM | Fix — rubros de categoria 'ingresos' no tienen techo bloqueante
-- =============================================================================
-- validar_techo_presupuestal (0006) trataba monto_maximo como un tope duro
-- para cualquier rubro, incluidos los de categoria 'ingresos'. Eso bloqueaba
-- registrar_cobro_cxc y movimientos manuales de ingreso apenas se superaba
-- la meta configurada — un comportamiento incorrecto: un ingreso no debe
-- tener techo, monto_maximo alli es solo una meta informativa que alimenta
-- el % en vw_rubro_balance/vw_proyectos_finanzas.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validar_techo_presupuestal()
RETURNS TRIGGER AS $$
DECLARE
  v_monto_maximo  NUMERIC(15,2);
  v_categoria     categoria_flujo;
  v_ejecutado     NUMERIC(15,2);
BEGIN
  -- Solo valida cuando pasa a estado 'ejecutado' y es un gasto
  IF NEW.estado <> 'ejecutado' OR NEW.tipo NOT IN ('gasto', 'traslado_entre_rubros') THEN
    RETURN NEW;
  END IF;
  IF OLD.estado = 'ejecutado' THEN
    RETURN NEW;  -- Idempotente: ya fue validado
  END IF;

  SELECT monto_maximo, categoria INTO v_monto_maximo, v_categoria
  FROM public.rubros
  WHERE id = NEW.rubro_destino_id;

  -- Ingresos: el monto_maximo es una meta, no un techo. Nunca bloquea.
  IF v_categoria = 'ingresos' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(monto), 0) INTO v_ejecutado
  FROM public.movimientos
  WHERE rubro_destino_id = NEW.rubro_destino_id
    AND tipo IN ('gasto', 'traslado_entre_rubros')
    AND estado = 'ejecutado'
    AND id <> NEW.id;

  IF (v_ejecutado + NEW.monto) > v_monto_maximo THEN
    RAISE EXCEPTION
      'El movimiento supera el techo del rubro (disponible: %, solicitado: %)',
      v_monto_maximo - v_ejecutado,
      NEW.monto;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
