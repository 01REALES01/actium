-- =============================================================================
-- ACTIUM | Incidentes — borrado lógico (archivar/restaurar)
-- =============================================================================
-- Mismo patrón que empleados/proyectos: deleted_at reversible. Las lecturas
-- "activas" (KPIs, drill-downs, calendario) filtran deleted_at IS NULL; la
-- página del parte diario es la única que también trae los archivados, para
-- poder restaurarlos desde ahí.
-- =============================================================================

ALTER TABLE public.incidentes ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_incidentes_activos ON public.incidentes (proyecto_id, fecha DESC) WHERE deleted_at IS NULL;
