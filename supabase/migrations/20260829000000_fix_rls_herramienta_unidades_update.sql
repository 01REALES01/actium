-- =============================================================================
-- ACTIUM | Fix: soft-delete de herramientas_catalogo / herramienta_unidades
-- =============================================================================
-- Síntoma: "new row violates row-level security policy for table
-- herramienta_unidades" (42501) al eliminar (soft-delete) una unidad, mientras
-- que editar sus demás campos funcionaba con normalidad.
--
-- Causa real (comportamiento documentado de PostgREST + RLS, no un error de
-- las policies): un UPDATE sin `.select()` en supabase-js igual ejecuta
-- `RETURNING *` internamente -- Prefer: return=minimal solo suprime el cuerpo
-- de la respuesta, no la cláusula RETURNING. Esa fila devuelta se valida
-- contra la policy de SELECT, que exige `deleted_at IS NULL`. Al fijar
-- deleted_at = NOW(), la fila resultante deja de cumplir esa policy y Postgres
-- rechaza el UPDATE completo con un error de RLS, aunque la policy de UPDATE
-- en sí lo permitía.
--
-- Editar no lo sufre porque deja deleted_at en NULL; cualquier UPDATE que
-- fije deleted_at SÍ lo sufre. Mismo problema aplica a herramientas_catalogo.
--
-- Solución: mover ambos soft-deletes a RPCs SECURITY DEFINER, igual que
-- asignar_herramienta/devolver_herramienta -- corren con el dueño de la
-- función (postgres), que no está sujeto a RLS.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.eliminar_unidad_herramienta(p_unidad_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_estado herramienta_estado;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene permisos para esta acción';
  END IF;

  SELECT estado INTO v_estado
    FROM public.herramienta_unidades
   WHERE id = p_unidad_id AND deleted_at IS NULL;

  IF v_estado IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Herramienta no encontrada';
  END IF;

  IF v_estado = 'asignada' THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'La herramienta está asignada; debe devolverse antes de eliminarla';
  END IF;

  UPDATE public.herramienta_unidades
     SET deleted_at = NOW()
   WHERE id = p_unidad_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_unidad_herramienta(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.eliminar_catalogo_herramienta(p_catalogo_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene permisos para esta acción';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.herramientas_catalogo WHERE id = p_catalogo_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Catálogo no encontrado';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.herramienta_unidades
   WHERE catalogo_id = p_catalogo_id AND deleted_at IS NULL;

  IF v_count > 0 THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'No es posible eliminar este tipo: todavía tiene unidades registradas';
  END IF;

  UPDATE public.herramientas_catalogo
     SET deleted_at = NOW()
   WHERE id = p_catalogo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_catalogo_herramienta(UUID) TO authenticated;
