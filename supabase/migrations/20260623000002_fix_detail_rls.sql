-- Recrear políticas de RLS para tablas hijas de formularios SST pasando empresa_id y subempresa_id
-- para evitar la consulta recursiva a la tabla de proyectos y solucionar el error de RLS.

-- ATS
DROP POLICY IF EXISTS "ats_detalles_all" ON public.ats_detalles;
CREATE POLICY "ats_detalles_all" ON public.ats_detalles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "ats_trabajadores_all" ON public.ats_trabajadores;
CREATE POLICY "ats_trabajadores_all" ON public.ats_trabajadores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "ats_equipos_all" ON public.ats_equipos;
CREATE POLICY "ats_equipos_all" ON public.ats_equipos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "ats_analisis_all" ON public.ats_analisis_riesgo;
CREATE POLICY "ats_analisis_all" ON public.ats_analisis_riesgo
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "ats_pasos_all" ON public.ats_pasos;
CREATE POLICY "ats_pasos_all" ON public.ats_pasos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

-- Permiso Altura
DROP POLICY IF EXISTS "altura_detalles_all" ON public.altura_detalles;
CREATE POLICY "altura_detalles_all" ON public.altura_detalles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "altura_personal_all" ON public.altura_personal;
CREATE POLICY "altura_personal_all" ON public.altura_personal
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "altura_epp_all" ON public.altura_epp_chequeo;
CREATE POLICY "altura_epp_all" ON public.altura_epp_chequeo
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "altura_chequeo_all" ON public.altura_lista_chequeo;
CREATE POLICY "altura_chequeo_all" ON public.altura_lista_chequeo
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

-- Permiso Caliente
DROP POLICY IF EXISTS "caliente_detalles_all" ON public.caliente_detalles;
CREATE POLICY "caliente_detalles_all" ON public.caliente_detalles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "caliente_planeacion_all" ON public.caliente_planeacion;
CREATE POLICY "caliente_planeacion_all" ON public.caliente_planeacion
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "caliente_area_all" ON public.caliente_area_trabajo;
CREATE POLICY "caliente_area_all" ON public.caliente_area_trabajo
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "caliente_epp_all" ON public.caliente_epp;
CREATE POLICY "caliente_epp_all" ON public.caliente_epp
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "caliente_verificacion_all" ON public.caliente_verificacion;
CREATE POLICY "caliente_verificacion_all" ON public.caliente_verificacion
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "caliente_cierre_all" ON public.caliente_cierre;
CREATE POLICY "caliente_cierre_all" ON public.caliente_cierre
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );

DROP POLICY IF EXISTS "caliente_firmas_all" ON public.caliente_firmas;
CREATE POLICY "caliente_firmas_all" ON public.caliente_firmas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id))
  );
