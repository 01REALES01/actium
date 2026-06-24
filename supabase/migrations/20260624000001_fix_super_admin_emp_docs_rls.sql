-- super_admin tiene empresa_id NULL en el JWT por diseño; estas policies
-- comparaban e.empresa_id = auth_empresa_id() sin el bypass de super_admin
-- (a diferencia del resto de policies del archivo 0009), bloqueando el
-- INSERT/UPDATE/DELETE para ese rol.

DROP POLICY IF EXISTS "emp_docs_insert" ON public.empleado_documentos;
CREATE POLICY "emp_docs_insert" ON public.empleado_documentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.id = empleado_id
        AND (
          public.auth_es_super_admin()
          OR (
            public.auth_rol() IN ('admin', 'sst')
            AND e.empresa_id = public.auth_empresa_id()
          )
        )
    )
  );

DROP POLICY IF EXISTS "emp_docs_delete" ON public.empleado_documentos;
CREATE POLICY "emp_docs_delete" ON public.empleado_documentos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.id = empleado_id
        AND (
          public.auth_es_super_admin()
          OR e.empresa_id = public.auth_empresa_id()
        )
        AND public.auth_es_admin_o_superior()
    )
  );

DROP POLICY IF EXISTS "emp_proy_insert" ON public.empleado_proyectos;
CREATE POLICY "emp_proy_insert" ON public.empleado_proyectos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.id = empleado_id
        AND (
          public.auth_es_super_admin()
          OR (
            public.auth_rol() IN ('admin', 'sst')
            AND e.empresa_id = public.auth_empresa_id()
          )
        )
    )
  );

DROP POLICY IF EXISTS "emp_proy_update" ON public.empleado_proyectos;
CREATE POLICY "emp_proy_update" ON public.empleado_proyectos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.id = empleado_id
        AND (
          public.auth_es_super_admin()
          OR (
            public.auth_rol() IN ('admin', 'sst')
            AND e.empresa_id = public.auth_empresa_id()
          )
        )
    )
  );
