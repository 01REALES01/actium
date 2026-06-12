-- Script para corregir las politicas de Storage de Supabase
-- Explicacion: En Supabase, la data personalizada del usuario ('rol', 'empresa_id') 
-- vive dentro de 'user_metadata' en el JWT, no en el nivel raiz.

-- 1. Arreglar bucket: documentos-empleados
DROP POLICY IF EXISTS "docs_empleados_insert" ON storage.objects;
CREATE POLICY "docs_empleados_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documentos-empleados'
    AND (
      (auth.jwt() -> 'user_metadata' ->> 'rol') = 'super_admin'
      OR (
        (auth.jwt() -> 'user_metadata' ->> 'rol') IN ('admin', 'sst')
        AND path_empresa_id(name) = ((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::UUID)
      )
    )
  );

-- 2. Arreglar bucket: firmas
DROP POLICY IF EXISTS "firmas_insert" ON storage.objects;
CREATE POLICY "firmas_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'firmas'
    AND (
      (auth.jwt() -> 'user_metadata' ->> 'rol') = 'super_admin'
      OR path_empresa_id(name) = ((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::UUID)
    )
  );

-- Opcionalmente: Si solo quieres poder trabajar y probar el flujo sin 
-- preocuparte por la seguridad RLS por el momento, descomenta la siguiente linea:
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
