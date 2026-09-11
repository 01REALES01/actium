-- =============================================================================
-- ACTIUM | Reemisión de un documento de soldadura ya emitido
-- =============================================================================
-- Un WPS, un PQR o un WPQ emitido con una errata solo podía corregirse creando
-- otro documento desde cero, con consecutivo nuevo, y dejando el equivocado en
-- el archivo sin que nada indicara cuál era el vigente.
--
-- Al reabrir un documento firmado se reutiliza guardarPdfSoldaduraAction
-- (src/lib/actions/soldadura.ts), que siempre sella estado='firmado' y
-- firmado_at=now(). Reutilizarla tal cual para reemitir destruiría la fecha
-- real de la firma: un documento de hace ocho meses aparecería firmado hoy.
--
-- Estas dos columnas separan "cuándo se firmó" (firmado_at, intacto) de
-- "cuándo se reemplazó el archivo" (pdf_regenerado_at), igual que ya se hizo
-- para los formatos SST en 20260831000001_formularios_pdf_regenerado.sql. El
-- pie del PDF estampa la reemisión para que una versión reemplazada nunca se
-- confunda con la original.
-- =============================================================================

ALTER TABLE public.documentos_soldadura
  ADD COLUMN pdf_regenerado_at  TIMESTAMPTZ,
  ADD COLUMN pdf_regenerado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.documentos_soldadura.pdf_regenerado_at IS
  'Última vez que se reemitió el documento y se reemplazó su PDF. NULL si nunca se reemitió. No debe confundirse con firmado_at, que conserva la fecha original de la firma.';
COMMENT ON COLUMN public.documentos_soldadura.pdf_regenerado_por IS
  'Quién disparó la última reemisión del documento.';
