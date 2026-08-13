-- =============================================================================
-- ACTIUM | Empleados — borrado definitivo (hard delete) seguro
-- =============================================================================
-- Los empleados se archivan con deleted_at (borrado lógico, reversible). El
-- borrado definitivo elimina físicamente el empleado y TODO su historial.
-- Como ausentismos e incidentes usan ON DELETE RESTRICT, se borran primero
-- dentro de una sola transacción (atómico: si algo falla, no se borra nada).
-- SECURITY DEFINER para saltar RLS de las tablas hijas; el guard de
-- super_admin es interno. Molde: eliminar_proyecto_definitivo.
--
-- Dependencias (verificadas en 20260509000004_sst_empleados.sql):
--   RESTRICT directas: ausentismos, incidentes (+ incidente_evidencias en CASCADE)
--   CASCADE directas (se borran solas con el empleado): empleado_documentos,
--     empleado_proyectos
--   SET NULL: formularios_sst (varias tablas) — no requieren borrado explícito.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.eliminar_empleado_definitivo(p_empleado_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede eliminar empleados definitivamente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.empleados WHERE id = p_empleado_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Empleado no encontrado';
  END IF;

  -- Historial SST que referencia al empleado con RESTRICT
  DELETE FROM public.incidentes   WHERE empleado_id = p_empleado_id; -- cascada a incidente_evidencias
  DELETE FROM public.ausentismos  WHERE empleado_id = p_empleado_id;

  -- El empleado (cascada al resto: empleado_documentos, empleado_proyectos)
  DELETE FROM public.empleados    WHERE id = p_empleado_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_empleado_definitivo(UUID) TO authenticated;

COMMENT ON FUNCTION public.eliminar_empleado_definitivo IS
  'Elimina físicamente un empleado y todo su historial (documentos, asignaciones, ausentismos, incidentes). Irreversible. Atómico. Solo super_admin.';
