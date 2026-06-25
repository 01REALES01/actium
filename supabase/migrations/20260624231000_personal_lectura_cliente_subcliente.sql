-- =============================================================================
-- ACTIUM | Lectura de Personal para cliente_principal y subcliente
-- =============================================================================
-- Habilita la VISUALIZACION (solo lectura) del modulo Personal a los roles
-- cliente_principal y subcliente. El RLS de filas (empleados/empleado_documentos)
-- ya permite a estos roles leer los metadatos via auth_tiene_acceso_subempresa;
-- lo que faltaba era el acceso a los ARCHIVOS en Storage, ya que el visor genera
-- un signed URL con el cliente del usuario.
--
-- Alcance acordado:
--   cliente_principal -> toda su empresa
--   subcliente        -> solo su subempresa
--
-- La ESCRITURA permanece bloqueada: no se tocan policies *_insert / *_delete.
-- =============================================================================

-- Helper: extrae subempresa_id del path del objeto (segundo segmento)
-- Path convention: {empresa_id}/{subempresa_id}/{...}/{filename}
CREATE OR REPLACE FUNCTION public.path_subempresa_id(obj_path TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN split_part(obj_path, '/', 2)::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- documentos-empleados (ARL, EPS, certificaciones)
-- =============================================================================
DROP POLICY IF EXISTS "docs_empleados_select" ON storage.objects;
CREATE POLICY "docs_empleados_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documentos-empleados'
    AND (
      (auth.jwt() ->> 'rol') = 'super_admin'
      OR (
        (auth.jwt() ->> 'rol') IN ('admin', 'sst', 'cliente_principal')
        AND path_empresa_id(name) = ((auth.jwt() ->> 'empresa_id')::UUID)
      )
      OR (
        (auth.jwt() ->> 'rol') = 'subcliente'
        AND path_empresa_id(name) = ((auth.jwt() ->> 'empresa_id')::UUID)
        AND path_subempresa_id(name) = ((auth.jwt() ->> 'subempresa_id')::UUID)
      )
    )
  );

-- =============================================================================
-- pdfs-soportes (soportes de ausentismos e incidentes)
-- =============================================================================
DROP POLICY IF EXISTS "pdfs_soportes_select" ON storage.objects;
CREATE POLICY "pdfs_soportes_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdfs-soportes'
    AND (
      (auth.jwt() ->> 'rol') = 'super_admin'
      OR (
        (auth.jwt() ->> 'rol') IN ('admin', 'sst', 'operativo', 'cliente_principal')
        AND path_empresa_id(name) = ((auth.jwt() ->> 'empresa_id')::UUID)
      )
      OR (
        (auth.jwt() ->> 'rol') = 'subcliente'
        AND path_empresa_id(name) = ((auth.jwt() ->> 'empresa_id')::UUID)
        AND path_subempresa_id(name) = ((auth.jwt() ->> 'subempresa_id')::UUID)
      )
    )
  );
