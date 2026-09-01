-- =============================================================================
-- ACTIUM | Marca de regeneración del PDF (preoperacional v2)
-- =============================================================================
-- Con las fotos saliendo en el PDF y siendo agregables después de firmar,
-- surge el caso "agregué una foto tras emitir, regenero el documento". La
-- acción existente para escribir el PDF (guardarPdfYDatosFormularioAction en
-- src/lib/actions/permisos-sst.ts) siempre sella estado='firmado' y
-- firmado_at=now(): reutilizarla tal cual para regenerar destruiría la fecha
-- real de la firma, que es justo el dato que un formulario SST no puede
-- perder.
--
-- Estas dos columnas permiten separar "cuándo se firmó" (firmado_at, intacto)
-- de "cuándo se reemplazó el archivo" (pdf_regenerado_at). El pie del PDF
-- estampa la regeneración para que un documento reemplazado nunca se confunda
-- con el original.
-- =============================================================================

ALTER TABLE public.formularios
  ADD COLUMN pdf_regenerado_at  TIMESTAMPTZ,
  ADD COLUMN pdf_regenerado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.formularios.pdf_regenerado_at IS
  'Última vez que se reemplazó el PDF ya firmado (p. ej. al agregar una foto de equipo después de emitir). NULL si nunca se regeneró. No debe confundirse con firmado_at, que conserva la fecha original de la firma.';
COMMENT ON COLUMN public.formularios.pdf_regenerado_por IS
  'Quién disparó la última regeneración del PDF.';
