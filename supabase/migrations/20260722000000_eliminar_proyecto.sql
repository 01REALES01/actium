-- =============================================================================
-- ACTIUM | Proyectos — borrado definitivo (hard delete) seguro
-- =============================================================================
-- Los proyectos se archivan con deleted_at (borrado lógico, reversible). El
-- borrado definitivo elimina físicamente el proyecto y TODO su historial.
-- Como varias tablas hijas usan ON DELETE RESTRICT, se borran en orden de
-- dependencia dentro de una sola transacción (atómico: si algo falla, no se
-- borra nada). SECURITY DEFINER para saltar RLS de las tablas hijas; el guard
-- de super_admin es interno.
--
-- Dependencias (verificadas):
--   RESTRICT directas: movimientos, cuentas_por_cobrar(+cuotas), cuentas_por_pagar
--     (+cuotas), rubros, formularios(+detalles), incidentes(+evidencias), ausentismos
--   CASCADE directas (se borran solas con el proyecto): empleado_proyectos, fotos,
--     observaciones, partes_diarios_sst, proyecto_avances, proyecto_metas, proyecto_usuarios
--   movimientos/cuentas_por_cobrar/cuentas_por_pagar referencian rubros (RESTRICT)
--     -> rubros se borra al final de ese grupo.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.eliminar_proyecto_definitivo(p_proyecto_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede eliminar proyectos definitivamente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.proyectos WHERE id = p_proyecto_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Proyecto no encontrado';
  END IF;

  -- Finanzas: primero movimientos y facturas (referencian rubros), luego rubros
  DELETE FROM public.movimientos          WHERE proyecto_id = p_proyecto_id;
  DELETE FROM public.cuentas_por_cobrar   WHERE proyecto_id = p_proyecto_id; -- cascada a sus cuotas
  DELETE FROM public.cuentas_por_pagar    WHERE proyecto_id = p_proyecto_id; -- cascada a sus cuotas
  DELETE FROM public.rubros               WHERE proyecto_id = p_proyecto_id;

  -- SST y ausentismos (cascada a sus detalles/evidencias)
  DELETE FROM public.formularios          WHERE proyecto_id = p_proyecto_id;
  DELETE FROM public.incidentes           WHERE proyecto_id = p_proyecto_id;
  DELETE FROM public.ausentismos          WHERE proyecto_id = p_proyecto_id;

  -- El proyecto (cascada al resto: fotos, avances, metas, observaciones,
  -- partes_diarios_sst, proyecto_usuarios, empleado_proyectos)
  DELETE FROM public.proyectos            WHERE id = p_proyecto_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_proyecto_definitivo(UUID) TO authenticated;

COMMENT ON FUNCTION public.eliminar_proyecto_definitivo IS
  'Elimina físicamente un proyecto y todo su historial (finanzas, SST, avances, fotos). Irreversible. Atómico. Solo super_admin.';
