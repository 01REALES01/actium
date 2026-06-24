-- =============================================================================
-- ACTIUM | Bloqueo de escritura: solo super_admin ingresa información
-- =============================================================================
-- Por pedido del cliente, el único rol que puede INGRESAR información (cualquier
-- cosa que no sea mera visualización) es `super_admin`. Los demás roles quedan
-- como solo-lectura.
--
-- ÚNICA EXCEPCIÓN: los permisos SST (formularios ATS, permiso de altura y
-- permiso de caliente, con sus tablas hijas) también puede diligenciarlos el
-- rol `sst`, acotado a su empresa/proyecto por `auth_tiene_acceso_proyecto`.
--
-- Esta migración endurece SOLO las políticas de escritura (INSERT/UPDATE/DELETE)
-- de tablas y storage, y los RPCs de mutación. Las políticas SELECT NO se tocan:
-- la visualización para todos los roles queda intacta.
--
-- No se tocan escrituras de sistema (auditoria_logs append-only, triggers
-- handle_new_user/audit_* que corren SECURITY DEFINER, ni formulario_secuencias,
-- contador interno del numerado de formularios).
-- =============================================================================

-- =============================================================================
-- 1. TABLAS — super_admin only
-- =============================================================================

-- EMPRESAS
DROP POLICY IF EXISTS "empresas_insert" ON public.empresas;
CREATE POLICY "empresas_insert" ON public.empresas
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "empresas_update" ON public.empresas;
CREATE POLICY "empresas_update" ON public.empresas
  FOR UPDATE USING (public.auth_es_super_admin());

DROP POLICY IF EXISTS "empresas_delete" ON public.empresas;
CREATE POLICY "empresas_delete" ON public.empresas
  FOR DELETE USING (public.auth_es_super_admin());

-- SUBEMPRESAS
DROP POLICY IF EXISTS "subempresas_insert" ON public.subempresas;
CREATE POLICY "subempresas_insert" ON public.subempresas
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "subempresas_update" ON public.subempresas;
CREATE POLICY "subempresas_update" ON public.subempresas
  FOR UPDATE USING (public.auth_es_super_admin());

DROP POLICY IF EXISTS "subempresas_delete" ON public.subempresas;
CREATE POLICY "subempresas_delete" ON public.subempresas
  FOR DELETE USING (public.auth_es_super_admin());

-- USUARIOS (el alta automática sigue por handle_new_user, SECURITY DEFINER)
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
CREATE POLICY "usuarios_insert" ON public.usuarios
  FOR INSERT WITH CHECK (
    public.auth_es_super_admin()
    OR id = auth.uid()   -- alta vía trigger (se ejecuta como el propio usuario)
  );

DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;
CREATE POLICY "usuarios_update" ON public.usuarios
  FOR UPDATE USING (public.auth_es_super_admin());

DROP POLICY IF EXISTS "usuarios_delete" ON public.usuarios;
CREATE POLICY "usuarios_delete" ON public.usuarios
  FOR DELETE USING (public.auth_es_super_admin());

-- PROYECTOS
DROP POLICY IF EXISTS "proyectos_insert" ON public.proyectos;
CREATE POLICY "proyectos_insert" ON public.proyectos
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "proyectos_update" ON public.proyectos;
CREATE POLICY "proyectos_update" ON public.proyectos
  FOR UPDATE USING (public.auth_es_super_admin());

DROP POLICY IF EXISTS "proyectos_delete" ON public.proyectos;
CREATE POLICY "proyectos_delete" ON public.proyectos
  FOR DELETE USING (public.auth_es_super_admin());

-- PROYECTO_USUARIOS
DROP POLICY IF EXISTS "proyecto_usuarios_insert" ON public.proyecto_usuarios;
CREATE POLICY "proyecto_usuarios_insert" ON public.proyecto_usuarios
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "proyecto_usuarios_update" ON public.proyecto_usuarios;
CREATE POLICY "proyecto_usuarios_update" ON public.proyecto_usuarios
  FOR UPDATE USING (public.auth_es_super_admin());

DROP POLICY IF EXISTS "proyecto_usuarios_delete" ON public.proyecto_usuarios;
CREATE POLICY "proyecto_usuarios_delete" ON public.proyecto_usuarios
  FOR DELETE USING (public.auth_es_super_admin());

-- PROYECTO_AVANCES
DROP POLICY IF EXISTS "avances_insert" ON public.proyecto_avances;
CREATE POLICY "avances_insert" ON public.proyecto_avances
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "avances_update" ON public.proyecto_avances;
CREATE POLICY "avances_update" ON public.proyecto_avances
  FOR UPDATE USING (public.auth_es_super_admin());

DROP POLICY IF EXISTS "avances_delete" ON public.proyecto_avances;
CREATE POLICY "avances_delete" ON public.proyecto_avances
  FOR DELETE USING (public.auth_es_super_admin());

-- PROYECTO_METAS
DROP POLICY IF EXISTS "Admins pueden crear proyecto_metas" ON public.proyecto_metas;
CREATE POLICY "proyecto_metas_insert" ON public.proyecto_metas
  FOR INSERT TO authenticated WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "Admins pueden actualizar proyecto_metas" ON public.proyecto_metas;
CREATE POLICY "proyecto_metas_update" ON public.proyecto_metas
  FOR UPDATE TO authenticated USING (public.auth_es_super_admin());

DROP POLICY IF EXISTS "Admins pueden eliminar proyecto_metas" ON public.proyecto_metas;
CREATE POLICY "proyecto_metas_delete" ON public.proyecto_metas
  FOR DELETE TO authenticated USING (public.auth_es_super_admin());

-- OBSERVACIONES
DROP POLICY IF EXISTS "observaciones_insert" ON public.observaciones;
CREATE POLICY "observaciones_insert" ON public.observaciones
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "observaciones_update" ON public.observaciones;
CREATE POLICY "observaciones_update" ON public.observaciones
  FOR UPDATE USING (public.auth_es_super_admin());

DROP POLICY IF EXISTS "observaciones_delete" ON public.observaciones;
CREATE POLICY "observaciones_delete" ON public.observaciones
  FOR DELETE USING (public.auth_es_super_admin());

-- FOTOS
DROP POLICY IF EXISTS "fotos_insert" ON public.fotos;
CREATE POLICY "fotos_insert" ON public.fotos
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "fotos_delete" ON public.fotos;
CREATE POLICY "fotos_delete" ON public.fotos
  FOR DELETE USING (public.auth_es_super_admin());

-- EMPLEADOS
DROP POLICY IF EXISTS "empleados_insert" ON public.empleados;
CREATE POLICY "empleados_insert" ON public.empleados
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "empleados_update" ON public.empleados;
CREATE POLICY "empleados_update" ON public.empleados
  FOR UPDATE USING (public.auth_es_super_admin());

DROP POLICY IF EXISTS "empleados_delete" ON public.empleados;
CREATE POLICY "empleados_delete" ON public.empleados
  FOR DELETE USING (public.auth_es_super_admin());

-- EMPLEADO_DOCUMENTOS  (supersede el fix 20260624000001)
DROP POLICY IF EXISTS "emp_docs_insert" ON public.empleado_documentos;
CREATE POLICY "emp_docs_insert" ON public.empleado_documentos
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "emp_docs_delete" ON public.empleado_documentos;
CREATE POLICY "emp_docs_delete" ON public.empleado_documentos
  FOR DELETE USING (public.auth_es_super_admin());

-- EMPLEADO_PROYECTOS  (supersede el fix 20260624000001)
DROP POLICY IF EXISTS "emp_proy_insert" ON public.empleado_proyectos;
CREATE POLICY "emp_proy_insert" ON public.empleado_proyectos
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "emp_proy_update" ON public.empleado_proyectos;
CREATE POLICY "emp_proy_update" ON public.empleado_proyectos
  FOR UPDATE USING (public.auth_es_super_admin());

-- AUSENTISMOS
DROP POLICY IF EXISTS "ausentismos_insert" ON public.ausentismos;
CREATE POLICY "ausentismos_insert" ON public.ausentismos
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "ausentismos_update" ON public.ausentismos;
CREATE POLICY "ausentismos_update" ON public.ausentismos
  FOR UPDATE USING (public.auth_es_super_admin());

-- INCIDENTES
DROP POLICY IF EXISTS "incidentes_insert" ON public.incidentes;
CREATE POLICY "incidentes_insert" ON public.incidentes
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "incidentes_update" ON public.incidentes;
CREATE POLICY "incidentes_update" ON public.incidentes
  FOR UPDATE USING (public.auth_es_super_admin());

-- INCIDENTE_EVIDENCIAS
DROP POLICY IF EXISTS "inc_evidencias_insert" ON public.incidente_evidencias;
CREATE POLICY "inc_evidencias_insert" ON public.incidente_evidencias
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

-- RUBROS
DROP POLICY IF EXISTS "rubros_insert" ON public.rubros;
CREATE POLICY "rubros_insert" ON public.rubros
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "rubros_update" ON public.rubros;
CREATE POLICY "rubros_update" ON public.rubros
  FOR UPDATE USING (public.auth_es_super_admin());

DROP POLICY IF EXISTS "rubros_delete" ON public.rubros;
CREATE POLICY "rubros_delete" ON public.rubros
  FOR DELETE USING (public.auth_es_super_admin());

-- MOVIMIENTOS
DROP POLICY IF EXISTS "movimientos_insert" ON public.movimientos;
CREATE POLICY "movimientos_insert" ON public.movimientos
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "movimientos_update" ON public.movimientos;
CREATE POLICY "movimientos_update" ON public.movimientos
  FOR UPDATE USING (public.auth_es_super_admin());

-- PARTES_DIARIOS_SST
DROP POLICY IF EXISTS "partes_insert" ON public.partes_diarios_sst;
CREATE POLICY "partes_insert" ON public.partes_diarios_sst
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

DROP POLICY IF EXISTS "partes_update" ON public.partes_diarios_sst;
CREATE POLICY "partes_update" ON public.partes_diarios_sst
  FOR UPDATE USING (public.auth_es_super_admin());

DROP POLICY IF EXISTS "partes_delete" ON public.partes_diarios_sst;
CREATE POLICY "partes_delete" ON public.partes_diarios_sst
  FOR DELETE USING (public.auth_es_super_admin());

-- =============================================================================
-- 2. PERMISOS SST — super_admin O sst (excepción)
-- =============================================================================

-- FORMULARIOS (padre)
DROP POLICY IF EXISTS "formularios_insert" ON public.formularios;
CREATE POLICY "formularios_insert" ON public.formularios
  FOR INSERT WITH CHECK (
    public.auth_tiene_acceso_proyecto(proyecto_id, empresa_id, subempresa_id)
    AND (public.auth_es_super_admin() OR public.auth_rol() = 'sst')
  );

DROP POLICY IF EXISTS "formularios_update" ON public.formularios;
CREATE POLICY "formularios_update" ON public.formularios
  FOR UPDATE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id, empresa_id, subempresa_id)
    AND (public.auth_es_super_admin() OR public.auth_rol() = 'sst')
  );

DROP POLICY IF EXISTS "formularios_delete" ON public.formularios;
CREATE POLICY "formularios_delete" ON public.formularios
  FOR DELETE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id, empresa_id, subempresa_id)
    AND (public.auth_es_super_admin() OR public.auth_rol() = 'sst')
    AND estado = 'borrador'
  );

-- Tablas hijas SST: se separa lectura (todos los roles con acceso) de escritura
-- (super_admin o sst). El acceso al proyecto se deriva del formulario padre,
-- pasando empresa_id/subempresa_id para evitar la recursión a `proyectos`.
DO $$
DECLARE
  t TEXT;
  hijas TEXT[] := ARRAY[
    'ats_detalles', 'ats_trabajadores', 'ats_equipos', 'ats_analisis_riesgo', 'ats_pasos',
    'altura_detalles', 'altura_personal', 'altura_epp_chequeo', 'altura_lista_chequeo',
    'caliente_detalles', 'caliente_planeacion', 'caliente_area_trabajo', 'caliente_epp',
    'caliente_verificacion', 'caliente_cierre', 'caliente_firmas'
  ];
  old_names TEXT[] := ARRAY[
    'ats_detalles_all', 'ats_trabajadores_all', 'ats_equipos_all', 'ats_analisis_all', 'ats_pasos_all',
    'altura_detalles_all', 'altura_personal_all', 'altura_epp_all', 'altura_chequeo_all',
    'caliente_detalles_all', 'caliente_planeacion_all', 'caliente_area_all', 'caliente_epp_all',
    'caliente_verificacion_all', 'caliente_cierre_all', 'caliente_firmas_all'
  ];
  i INT;
BEGIN
  FOR i IN 1 .. array_length(hijas, 1) LOOP
    t := hijas[i];
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', old_names[i], t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_write', t);

    -- Lectura: cualquier rol con acceso al proyecto del formulario padre.
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.formularios f
            WHERE f.id = formulario_id
              AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id)
          )
        )
    $f$, t || '_select', t);

    -- Escritura (INSERT/UPDATE/DELETE): super_admin o sst con acceso.
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.formularios f
            WHERE f.id = formulario_id
              AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id)
              AND (public.auth_es_super_admin() OR public.auth_rol() = 'sst')
          )
        ) WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.formularios f
            WHERE f.id = formulario_id
              AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id)
              AND (public.auth_es_super_admin() OR public.auth_rol() = 'sst')
          )
        )
    $f$, t || '_write', t);
  END LOOP;
END $$;

-- =============================================================================
-- 3. STORAGE — super_admin only (excepción sst en pdfs-formularios y firmas)
-- =============================================================================

-- logos-empresas
DROP POLICY IF EXISTS "logos_insert_admin" ON storage.objects;
CREATE POLICY "logos_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos-empresas'
    AND (auth.jwt() ->> 'rol') = 'super_admin'
  );

DROP POLICY IF EXISTS "logos_delete_admin" ON storage.objects;
CREATE POLICY "logos_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos-empresas'
    AND (auth.jwt() ->> 'rol') = 'super_admin'
  );

-- fotos-proyectos
DROP POLICY IF EXISTS "fotos_proyectos_insert" ON storage.objects;
CREATE POLICY "fotos_proyectos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fotos-proyectos'
    AND (auth.jwt() ->> 'rol') = 'super_admin'
  );

DROP POLICY IF EXISTS "fotos_proyectos_delete" ON storage.objects;
CREATE POLICY "fotos_proyectos_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fotos-proyectos'
    AND (auth.jwt() ->> 'rol') = 'super_admin'
  );

-- documentos-empleados  (supersede el fix 20260624220600)
DROP POLICY IF EXISTS "docs_empleados_insert" ON storage.objects;
CREATE POLICY "docs_empleados_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documentos-empleados'
    AND (auth.jwt() ->> 'rol') = 'super_admin'
  );

DROP POLICY IF EXISTS "docs_empleados_delete" ON storage.objects;
CREATE POLICY "docs_empleados_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documentos-empleados'
    AND (auth.jwt() ->> 'rol') = 'super_admin'
  );

-- pdfs-soportes
DROP POLICY IF EXISTS "pdfs_soportes_insert" ON storage.objects;
CREATE POLICY "pdfs_soportes_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdfs-soportes'
    AND (auth.jwt() ->> 'rol') = 'super_admin'
  );

-- pdfs-formularios  (excepción: sst sube el PDF del permiso que diligencia)
DROP POLICY IF EXISTS "pdfs_formularios_insert" ON storage.objects;
CREATE POLICY "pdfs_formularios_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdfs-formularios'
    AND (
      (auth.jwt() ->> 'rol') = 'super_admin'
      OR (
        (auth.jwt() ->> 'rol') = 'sst'
        AND path_empresa_id(name) = ((auth.jwt() ->> 'empresa_id')::UUID)
      )
    )
  );

-- firmas  (excepción: sst registra las firmas del permiso, supersede 20260624220600)
DROP POLICY IF EXISTS "firmas_insert" ON storage.objects;
CREATE POLICY "firmas_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'firmas'
    AND (
      (auth.jwt() ->> 'rol') = 'super_admin'
      OR (
        (auth.jwt() ->> 'rol') = 'sst'
        AND path_empresa_id(name) = ((auth.jwt() ->> 'empresa_id')::UUID)
      )
    )
  );

-- =============================================================================
-- 4. RPCs de mutación (SECURITY INVOKER) — guard de rol al inicio
-- =============================================================================

-- registrar_avance_proyecto → super_admin only
CREATE OR REPLACE FUNCTION public.registrar_avance_proyecto(
  p_proyecto_id        UUID,
  p_fecha              DATE,
  p_avance_real        NUMERIC,
  p_avance_proyectado  NUMERIC,
  p_notas              TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede registrar avances';
  END IF;

  IF NOT public.auth_tiene_acceso_proyecto(p_proyecto_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene acceso a este proyecto';
  END IF;

  IF p_avance_real NOT BETWEEN 0 AND 100 OR p_avance_proyectado NOT BETWEEN 0 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Los avances deben estar entre 0 y 100';
  END IF;

  INSERT INTO public.proyecto_avances (
    proyecto_id, fecha, avance_real, avance_proyectado, notas, registrado_por
  ) VALUES (
    p_proyecto_id, p_fecha, p_avance_real, p_avance_proyectado, p_notas, auth.uid()
  )
  ON CONFLICT (proyecto_id, fecha) DO UPDATE SET
    avance_real        = EXCLUDED.avance_real,
    avance_proyectado  = EXCLUDED.avance_proyectado,
    notas              = EXCLUDED.notas,
    registrado_por     = EXCLUDED.registrado_por
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- solicitar_movimiento_rubro → super_admin only
CREATE OR REPLACE FUNCTION public.solicitar_movimiento_rubro(
  p_proyecto_id        UUID,
  p_rubro_destino_id   UUID,
  p_tipo               movimiento_tipo,
  p_monto              NUMERIC,
  p_justificacion      TEXT,
  p_rubro_origen_id    UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede solicitar movimientos';
  END IF;

  IF NOT public.auth_tiene_acceso_proyecto(p_proyecto_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No tiene acceso a este proyecto';
  END IF;

  INSERT INTO public.movimientos (
    proyecto_id, rubro_origen_id, rubro_destino_id, tipo, monto,
    justificacion, estado, solicitado_por
  ) VALUES (
    p_proyecto_id, p_rubro_origen_id, p_rubro_destino_id, p_tipo, p_monto,
    p_justificacion, 'solicitado', auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- aprobar_movimiento → super_admin only
CREATE OR REPLACE FUNCTION public.aprobar_movimiento(
  p_movimiento_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_estado_actual movimiento_estado;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede aprobar movimientos';
  END IF;

  SELECT estado INTO v_estado_actual
    FROM public.movimientos
   WHERE id = p_movimiento_id;

  IF v_estado_actual IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Movimiento no encontrado o sin acceso';
  END IF;

  IF v_estado_actual <> 'solicitado' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Solo se pueden aprobar movimientos en estado solicitado';
  END IF;

  UPDATE public.movimientos
     SET estado = 'aprobado', aprobado_por = auth.uid(), aprobado_at = NOW()
   WHERE id = p_movimiento_id;
END;
$$;

-- rechazar_movimiento → super_admin only
CREATE OR REPLACE FUNCTION public.rechazar_movimiento(
  p_movimiento_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede rechazar movimientos';
  END IF;

  UPDATE public.movimientos
     SET estado = 'rechazado', aprobado_por = auth.uid(), aprobado_at = NOW()
   WHERE id = p_movimiento_id
     AND estado = 'solicitado';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Movimiento no encontrado, sin acceso, o no está en estado solicitado';
  END IF;
END;
$$;

-- ejecutar_movimiento → super_admin only
CREATE OR REPLACE FUNCTION public.ejecutar_movimiento(
  p_movimiento_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede ejecutar movimientos';
  END IF;

  UPDATE public.movimientos
     SET estado = 'ejecutado', ejecutado_at = NOW()
   WHERE id = p_movimiento_id
     AND estado = 'aprobado';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'Movimiento no encontrado, sin acceso, o no está en estado aprobado';
  END IF;
END;
$$;

-- cerrar_formulario_sst → super_admin O sst (excepción permisos SST)
CREATE OR REPLACE FUNCTION public.cerrar_formulario_sst(
  p_formulario_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_tipo            formulario_tipo;
  v_estado          formulario_estado;
  v_count           INTEGER;
  v_emisor_firma    TEXT;
BEGIN
  IF NOT (public.auth_es_super_admin() OR public.auth_rol() = 'sst') THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin o sst pueden cerrar permisos SST';
  END IF;

  SELECT tipo, estado INTO v_tipo, v_estado
    FROM public.formularios
   WHERE id = p_formulario_id;

  IF v_tipo IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Formulario no encontrado o sin acceso';
  END IF;

  IF v_estado <> 'completado' THEN
    RAISE EXCEPTION USING ERRCODE = '22023',
      MESSAGE = 'Solo se pueden cerrar formularios en estado completado';
  END IF;

  IF v_tipo = 'ats' THEN
    SELECT COUNT(*) INTO v_count
      FROM public.ats_trabajadores
     WHERE formulario_id = p_formulario_id AND firma_path IS NOT NULL;
    IF v_count < 1 THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'El ATS requiere al menos una firma de trabajador';
    END IF;

  ELSIF v_tipo = 'permiso_altura' THEN
    SELECT firma_emisor_path INTO v_emisor_firma
      FROM public.altura_detalles WHERE formulario_id = p_formulario_id;
    IF v_emisor_firma IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'El permiso de altura requiere firma del emisor';
    END IF;
    SELECT COUNT(*) INTO v_count
      FROM public.altura_personal
     WHERE formulario_id = p_formulario_id AND firma_path IS NOT NULL;
    IF v_count < 1 THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'El permiso de altura requiere al menos una firma de personal';
    END IF;

  ELSIF v_tipo = 'permiso_caliente' THEN
    SELECT COUNT(*) INTO v_count
      FROM public.caliente_firmas
     WHERE formulario_id = p_formulario_id AND momento = 'inicio' AND firma_path IS NOT NULL;
    IF v_count < 1 THEN
      RAISE EXCEPTION USING ERRCODE = '22023',
        MESSAGE = 'El permiso de caliente requiere al menos una firma de inicio';
    END IF;
  END IF;

  UPDATE public.formularios
     SET estado = 'firmado', firmado_at = NOW()
   WHERE id = p_formulario_id;
END;
$$;
