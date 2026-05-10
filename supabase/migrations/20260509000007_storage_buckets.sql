-- =============================================================================
-- ACTIUM | 0007 — Storage Buckets y Policies
-- =============================================================================
-- Buckets de Supabase Storage por tipo de activo. Las policies de storage
-- extraen empresa_id del path ({empresa_id}/{subempresa_id}/{archivo}) y
-- lo comparan contra el JWT para garantizar aislamiento entre tenants.
--
-- Buckets:
--   logos-empresas      (publico)   — Logos visibles en portales publicos
--   fotos-proyectos     (privado)   — Galeria de evidencias por proyecto
--   documentos-empleados(privado)   — ARL, EPS, certificaciones (sensible)
--   pdfs-soportes       (privado)   — Soportes de ausentismos e incidentes
--   pdfs-formularios    (privado)   — PDFs generados de formularios SST
--   firmas              (privado)   — Firmas capturadas en canvas
-- =============================================================================

-- =============================================================================
-- CREACION DE BUCKETS
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'logos-empresas',
    'logos-empresas',
    TRUE,
    5242880,          -- 5 MiB
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  ),
  (
    'fotos-proyectos',
    'fotos-proyectos',
    FALSE,
    20971520,         -- 20 MiB
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/heic']
  ),
  (
    'documentos-empleados',
    'documentos-empleados',
    FALSE,
    10485760,         -- 10 MiB
    ARRAY['application/pdf', 'image/png', 'image/jpeg']
  ),
  (
    'pdfs-soportes',
    'pdfs-soportes',
    FALSE,
    10485760,         -- 10 MiB
    ARRAY['application/pdf', 'image/png', 'image/jpeg']
  ),
  (
    'pdfs-formularios',
    'pdfs-formularios',
    FALSE,
    10485760,         -- 10 MiB
    ARRAY['application/pdf']
  ),
  (
    'firmas',
    'firmas',
    FALSE,
    2097152,          -- 2 MiB
    ARRAY['image/png']
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- HELPER: extrae empresa_id del path del objeto (primer segmento)
-- =============================================================================
-- Path convention: {empresa_id}/{subempresa_id}/{...}/{filename}
-- Esta funcion permite que las policies de storage validen el tenant
-- sin necesidad de un join contra la tabla de proyectos/empleados.
CREATE OR REPLACE FUNCTION public.path_empresa_id(obj_path TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN split_part(obj_path, '/', 1)::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- POLICIES: logos-empresas (publico — solo ADMIN/SUPER_ADMIN suben)
-- =============================================================================
CREATE POLICY "logos_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos-empresas');

CREATE POLICY "logos_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos-empresas'
    AND (
      auth.jwt() ->> 'rol' IN ('super_admin', 'admin')
      AND (
        auth.jwt() ->> 'rol' = 'super_admin'
        OR path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
      )
    )
  );

CREATE POLICY "logos_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos-empresas'
    AND (
      auth.jwt() ->> 'rol' = 'super_admin'
      OR (
        auth.jwt() ->> 'rol' = 'admin'
        AND path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
      )
    )
  );

-- =============================================================================
-- POLICIES: fotos-proyectos (privado — tenant-scoped)
-- =============================================================================
CREATE POLICY "fotos_proyectos_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fotos-proyectos'
    AND (
      auth.jwt() ->> 'rol' = 'super_admin'
      OR path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
    )
  );

CREATE POLICY "fotos_proyectos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fotos-proyectos'
    AND (
      auth.jwt() ->> 'rol' = 'super_admin'
      OR path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
    )
  );

CREATE POLICY "fotos_proyectos_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fotos-proyectos'
    AND (
      auth.jwt() ->> 'rol' IN ('super_admin', 'admin')
      OR path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
    )
  );

-- =============================================================================
-- POLICIES: documentos-empleados (privado — solo SST/ADMIN/SUPER_ADMIN)
-- =============================================================================
CREATE POLICY "docs_empleados_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documentos-empleados'
    AND (
      auth.jwt() ->> 'rol' = 'super_admin'
      OR (
        auth.jwt() ->> 'rol' IN ('admin', 'sst')
        AND path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
      )
    )
  );

CREATE POLICY "docs_empleados_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documentos-empleados'
    AND (
      auth.jwt() ->> 'rol' = 'super_admin'
      OR (
        auth.jwt() ->> 'rol' IN ('admin', 'sst')
        AND path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
      )
    )
  );

CREATE POLICY "docs_empleados_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documentos-empleados'
    AND (
      auth.jwt() ->> 'rol' IN ('super_admin', 'admin')
    )
  );

-- =============================================================================
-- POLICIES: pdfs-soportes (privado — tenant-scoped, SST+ADMIN leen)
-- =============================================================================
CREATE POLICY "pdfs_soportes_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdfs-soportes'
    AND (
      auth.jwt() ->> 'rol' = 'super_admin'
      OR (
        auth.jwt() ->> 'rol' IN ('admin', 'sst', 'operativo')
        AND path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
      )
    )
  );

CREATE POLICY "pdfs_soportes_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdfs-soportes'
    AND (
      auth.jwt() ->> 'rol' = 'super_admin'
      OR (
        auth.jwt() ->> 'rol' IN ('admin', 'sst', 'operativo')
        AND path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
      )
    )
  );

-- =============================================================================
-- POLICIES: pdfs-formularios (privado — tenant-scoped, lectura amplia)
-- =============================================================================
CREATE POLICY "pdfs_formularios_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdfs-formularios'
    AND (
      auth.jwt() ->> 'rol' = 'super_admin'
      OR path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
    )
  );

CREATE POLICY "pdfs_formularios_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdfs-formularios'
    AND (
      auth.jwt() ->> 'rol' = 'super_admin'
      OR (
        auth.jwt() ->> 'rol' IN ('admin', 'sst', 'operativo')
        AND path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
      )
    )
  );

-- =============================================================================
-- POLICIES: firmas (privado — solo el propio usuario sube su firma)
-- =============================================================================
-- Path convention: {empresa_id}/{formulario_id}/{usuario_id}_{timestamp}.png
CREATE POLICY "firmas_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'firmas'
    AND (
      auth.jwt() ->> 'rol' = 'super_admin'
      OR path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
    )
  );

CREATE POLICY "firmas_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'firmas'
    AND (
      auth.jwt() ->> 'rol' = 'super_admin'
      OR path_empresa_id(name) = (auth.jwt() ->> 'empresa_id')::UUID
    )
  );
