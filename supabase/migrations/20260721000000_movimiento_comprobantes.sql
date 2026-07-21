-- =============================================================================
-- ACTIUM | Finanzas — Comprobantes (facturas) adjuntos a movimientos
-- =============================================================================
-- 1. Columnas comprobante_path / comprobante_nombre en movimientos
-- 2. Bucket privado comprobantes-finanzas (PDF/imagen)
-- 3. Policies de storage tenant-scoped (mismo patron que fotos-proyectos)
-- =============================================================================

-- =============================================================================
-- 1. Columnas en movimientos
-- =============================================================================
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS comprobante_path   TEXT NULL,
  ADD COLUMN IF NOT EXISTS comprobante_nombre TEXT NULL;

COMMENT ON COLUMN public.movimientos.comprobante_path IS
  'Ruta en el bucket comprobantes-finanzas del soporte (factura) adjunto al movimiento. NULL = sin soporte.';
COMMENT ON COLUMN public.movimientos.comprobante_nombre IS
  'Nombre original del archivo de comprobante, para mostrar en la UI.';

-- =============================================================================
-- 2. Bucket comprobantes-finanzas (privado)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes-finanzas',
  'comprobantes-finanzas',
  FALSE,
  10485760,          -- 10 MiB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. Policies de storage (tenant-scoped por primer segmento del path)
-- Path convention: {empresa_id}/{subempresa_id}/{proyecto_id}/{uuid}.{ext}
-- =============================================================================
DROP POLICY IF EXISTS "comprobantes_finanzas_select" ON storage.objects;
CREATE POLICY "comprobantes_finanzas_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'comprobantes-finanzas'
    AND (
      auth.jwt() ->> 'rol' = 'super_admin'
      OR path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
    )
  );

DROP POLICY IF EXISTS "comprobantes_finanzas_insert" ON storage.objects;
CREATE POLICY "comprobantes_finanzas_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'comprobantes-finanzas'
    AND auth.jwt() ->> 'rol' = 'super_admin'
  );

DROP POLICY IF EXISTS "comprobantes_finanzas_delete" ON storage.objects;
CREATE POLICY "comprobantes_finanzas_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'comprobantes-finanzas'
    AND auth.jwt() ->> 'rol' = 'super_admin'
  );
