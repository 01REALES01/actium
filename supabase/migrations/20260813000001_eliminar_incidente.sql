-- =============================================================================
-- ACTIUM | Incidentes — borrado definitivo (hard delete) seguro
-- =============================================================================
-- Los incidentes se archivan con deleted_at (borrado lógico, reversible). El
-- borrado definitivo elimina físicamente el incidente (cascada a
-- incidente_evidencias). SECURITY DEFINER para saltar RLS; el guard de
-- super_admin es interno. Molde: eliminar_empleado_definitivo.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.eliminar_incidente_definitivo(p_incidente_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede eliminar incidentes definitivamente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.incidentes WHERE id = p_incidente_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Incidente no encontrado';
  END IF;

  DELETE FROM public.incidentes WHERE id = p_incidente_id; -- cascada a incidente_evidencias
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_incidente_definitivo(UUID) TO authenticated;

COMMENT ON FUNCTION public.eliminar_incidente_definitivo IS
  'Elimina físicamente un incidente/accidente y sus evidencias. Irreversible. Solo super_admin.';
