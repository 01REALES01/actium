-- docs_empleados_insert y firmas_insert leian el rol/empresa_id desde
-- auth.jwt() -> 'user_metadata', pero el custom_access_token_hook (migracion
-- 0010) inyecta esos claims en la raiz del JWT, igual que el resto de
-- politicas de storage (docs_empleados_select, firmas_select, etc).
-- Se corrigen para usar la misma ruta raiz y quedar consistentes.

DROP POLICY IF EXISTS "docs_empleados_insert" ON storage.objects;
CREATE POLICY "docs_empleados_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documentos-empleados'
    AND (
      (auth.jwt() ->> 'rol') = 'super_admin'
      OR (
        (auth.jwt() ->> 'rol') IN ('admin', 'sst')
        AND path_empresa_id(name) = ((auth.jwt() ->> 'empresa_id')::UUID)
      )
    )
  );

DROP POLICY IF EXISTS "firmas_insert" ON storage.objects;
CREATE POLICY "firmas_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'firmas'
    AND (
      (auth.jwt() ->> 'rol') = 'super_admin'
      OR path_empresa_id(name) = ((auth.jwt() ->> 'empresa_id')::UUID)
    )
  );
