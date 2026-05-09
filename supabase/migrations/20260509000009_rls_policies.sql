-- =============================================================================
-- ACTIUM | 0009 — Row Level Security (RLS)
-- =============================================================================
-- Habilita RLS en TODAS las tablas y define policies usando los helpers de
-- 0008. El patron base es tenant-isolation: super_admin ve todo, el resto
-- esta filtrado por empresa_id (y subempresa_id segun el rol).
--
-- auditoria_logs: SELECT solo para admin+; INSERT solo via trigger;
--   UPDATE/DELETE denegado a TODOS (tabla append-only).
-- =============================================================================

-- =============================================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =============================================================================
ALTER TABLE public.empresas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subempresas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_usuarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyecto_avances        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observaciones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleados               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleado_documentos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleado_proyectos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ausentismos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidentes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidente_evidencias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formularios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formulario_secuencias   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_detalles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_trabajadores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_equipos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_analisis_riesgo     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_pasos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.altura_detalles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.altura_personal         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.altura_epp_chequeo      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.altura_lista_chequeo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caliente_detalles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caliente_planeacion     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caliente_area_trabajo   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caliente_epp            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caliente_verificacion   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caliente_cierre         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caliente_firmas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubros                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_logs          ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- EMPRESAS
-- =============================================================================
CREATE POLICY "empresas_select" ON public.empresas
  FOR SELECT USING (
    public.auth_es_super_admin()
    OR (id = public.auth_empresa_id() AND deleted_at IS NULL)
  );

CREATE POLICY "empresas_insert" ON public.empresas
  FOR INSERT WITH CHECK (public.auth_es_super_admin());

CREATE POLICY "empresas_update" ON public.empresas
  FOR UPDATE USING (
    public.auth_es_super_admin()
    OR (id = public.auth_empresa_id() AND public.auth_es_admin_o_superior())
  );

CREATE POLICY "empresas_delete" ON public.empresas
  FOR DELETE USING (public.auth_es_super_admin());

-- =============================================================================
-- SUBEMPRESAS
-- =============================================================================
CREATE POLICY "subempresas_select" ON public.subempresas
  FOR SELECT USING (
    public.auth_tiene_acceso_subempresa(empresa_id, id)
    AND deleted_at IS NULL
  );

CREATE POLICY "subempresas_insert" ON public.subempresas
  FOR INSERT WITH CHECK (
    public.auth_es_super_admin()
    OR (public.auth_es_admin_o_superior() AND empresa_id = public.auth_empresa_id())
  );

CREATE POLICY "subempresas_update" ON public.subempresas
  FOR UPDATE USING (
    public.auth_es_super_admin()
    OR (public.auth_es_admin_o_superior() AND empresa_id = public.auth_empresa_id())
  );

CREATE POLICY "subempresas_delete" ON public.subempresas
  FOR DELETE USING (public.auth_es_super_admin());

-- =============================================================================
-- USUARIOS
-- =============================================================================
-- Cada usuario puede ver su propia fila; admin ve su empresa; super_admin ve todo
CREATE POLICY "usuarios_select" ON public.usuarios
  FOR SELECT USING (
    public.auth_es_super_admin()
    OR id = auth.uid()
    OR (
      public.auth_es_admin_o_superior()
      AND empresa_id = public.auth_empresa_id()
    )
  );

CREATE POLICY "usuarios_insert" ON public.usuarios
  FOR INSERT WITH CHECK (
    -- Solo via trigger handle_new_user (SECURITY DEFINER) o super_admin/admin
    public.auth_es_super_admin()
    OR public.auth_es_admin_o_superior()
    OR id = auth.uid()   -- El trigger se ejecuta como el propio usuario
  );

CREATE POLICY "usuarios_update" ON public.usuarios
  FOR UPDATE USING (
    public.auth_es_super_admin()
    OR id = auth.uid()
    OR (public.auth_es_admin_o_superior() AND empresa_id = public.auth_empresa_id())
  );

CREATE POLICY "usuarios_delete" ON public.usuarios
  FOR DELETE USING (public.auth_es_super_admin());

-- =============================================================================
-- PROYECTOS
-- =============================================================================
CREATE POLICY "proyectos_select" ON public.proyectos
  FOR SELECT USING (
    public.auth_tiene_acceso_proyecto(id)
    AND deleted_at IS NULL
  );

CREATE POLICY "proyectos_insert" ON public.proyectos
  FOR INSERT WITH CHECK (
    public.auth_es_super_admin()
    OR (
      public.auth_es_admin_o_superior()
      AND empresa_id = public.auth_empresa_id()
    )
  );

CREATE POLICY "proyectos_update" ON public.proyectos
  FOR UPDATE USING (
    public.auth_es_super_admin()
    OR (
      public.auth_es_admin_o_superior()
      AND empresa_id = public.auth_empresa_id()
    )
  );

CREATE POLICY "proyectos_delete" ON public.proyectos
  FOR DELETE USING (public.auth_es_super_admin());

-- =============================================================================
-- PROYECTO_USUARIOS
-- =============================================================================
CREATE POLICY "proyecto_usuarios_select" ON public.proyecto_usuarios
  FOR SELECT USING (
    public.auth_tiene_acceso_proyecto(proyecto_id)
  );

CREATE POLICY "proyecto_usuarios_insert" ON public.proyecto_usuarios
  FOR INSERT WITH CHECK (
    public.auth_es_super_admin()
    OR public.auth_es_admin_o_superior()
  );

CREATE POLICY "proyecto_usuarios_update" ON public.proyecto_usuarios
  FOR UPDATE USING (
    public.auth_es_super_admin()
    OR public.auth_es_admin_o_superior()
  );

CREATE POLICY "proyecto_usuarios_delete" ON public.proyecto_usuarios
  FOR DELETE USING (
    public.auth_es_super_admin()
    OR public.auth_es_admin_o_superior()
  );

-- =============================================================================
-- PROYECTO_AVANCES, OBSERVACIONES, FOTOS
-- =============================================================================
-- Mismo patron: acceso por proyecto
CREATE POLICY "avances_select" ON public.proyecto_avances
  FOR SELECT USING (public.auth_tiene_acceso_proyecto(proyecto_id));

CREATE POLICY "avances_insert" ON public.proyecto_avances
  FOR INSERT WITH CHECK (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst', 'operativo')
  );

CREATE POLICY "avances_update" ON public.proyecto_avances
  FOR UPDATE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst', 'operativo')
  );

CREATE POLICY "avances_delete" ON public.proyecto_avances
  FOR DELETE USING (public.auth_es_admin_o_superior());

-- Observaciones
CREATE POLICY "observaciones_select" ON public.observaciones
  FOR SELECT USING (public.auth_tiene_acceso_proyecto(proyecto_id));

CREATE POLICY "observaciones_insert" ON public.observaciones
  FOR INSERT WITH CHECK (public.auth_tiene_acceso_proyecto(proyecto_id));

CREATE POLICY "observaciones_update" ON public.observaciones
  FOR UPDATE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND (autor_id = auth.uid() OR public.auth_es_admin_o_superior())
  );

CREATE POLICY "observaciones_delete" ON public.observaciones
  FOR DELETE USING (
    autor_id = auth.uid() OR public.auth_es_admin_o_superior()
  );

-- Fotos
CREATE POLICY "fotos_select" ON public.fotos
  FOR SELECT USING (public.auth_tiene_acceso_proyecto(proyecto_id));

CREATE POLICY "fotos_insert" ON public.fotos
  FOR INSERT WITH CHECK (public.auth_tiene_acceso_proyecto(proyecto_id));

CREATE POLICY "fotos_delete" ON public.fotos
  FOR DELETE USING (
    (autor_id = auth.uid() OR public.auth_es_admin_o_superior())
    AND public.auth_tiene_acceso_proyecto(proyecto_id)
  );

-- =============================================================================
-- EMPLEADOS
-- =============================================================================
CREATE POLICY "empleados_select" ON public.empleados
  FOR SELECT USING (
    public.auth_tiene_acceso_subempresa(empresa_id, subempresa_id)
    AND deleted_at IS NULL
  );

CREATE POLICY "empleados_insert" ON public.empleados
  FOR INSERT WITH CHECK (
    public.auth_es_super_admin()
    OR (
      public.auth_rol() IN ('admin', 'sst')
      AND empresa_id = public.auth_empresa_id()
    )
  );

CREATE POLICY "empleados_update" ON public.empleados
  FOR UPDATE USING (
    public.auth_es_super_admin()
    OR (
      public.auth_rol() IN ('admin', 'sst')
      AND empresa_id = public.auth_empresa_id()
    )
  );

CREATE POLICY "empleados_delete" ON public.empleados
  FOR DELETE USING (public.auth_es_admin_o_superior());

-- =============================================================================
-- EMPLEADO_DOCUMENTOS, EMPLEADO_PROYECTOS
-- =============================================================================
-- Acceso via empleado (join implícito por empresa en helper)
CREATE POLICY "emp_docs_select" ON public.empleado_documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.id = empleado_id
        AND public.auth_tiene_acceso_subempresa(e.empresa_id, e.subempresa_id)
        AND e.deleted_at IS NULL
    )
  );

CREATE POLICY "emp_docs_insert" ON public.empleado_documentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.id = empleado_id
        AND public.auth_rol() IN ('super_admin', 'admin', 'sst')
        AND e.empresa_id = public.auth_empresa_id()
    )
  );

CREATE POLICY "emp_docs_delete" ON public.empleado_documentos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.id = empleado_id
        AND public.auth_es_admin_o_superior()
        AND e.empresa_id = public.auth_empresa_id()
    )
  );

CREATE POLICY "emp_proy_select" ON public.empleado_proyectos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.id = empleado_id
        AND public.auth_tiene_acceso_subempresa(e.empresa_id, e.subempresa_id)
    )
  );

CREATE POLICY "emp_proy_insert" ON public.empleado_proyectos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.id = empleado_id
        AND public.auth_rol() IN ('super_admin', 'admin', 'sst')
        AND e.empresa_id = public.auth_empresa_id()
    )
  );

CREATE POLICY "emp_proy_update" ON public.empleado_proyectos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.empleados e
      WHERE e.id = empleado_id
        AND public.auth_rol() IN ('super_admin', 'admin', 'sst')
        AND e.empresa_id = public.auth_empresa_id()
    )
  );

-- =============================================================================
-- AUSENTISMOS, INCIDENTES, INCIDENTE_EVIDENCIAS
-- =============================================================================
CREATE POLICY "ausentismos_select" ON public.ausentismos
  FOR SELECT USING (public.auth_tiene_acceso_proyecto(proyecto_id));

CREATE POLICY "ausentismos_insert" ON public.ausentismos
  FOR INSERT WITH CHECK (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst', 'operativo')
  );

CREATE POLICY "ausentismos_update" ON public.ausentismos
  FOR UPDATE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst')
  );

CREATE POLICY "incidentes_select" ON public.incidentes
  FOR SELECT USING (public.auth_tiene_acceso_proyecto(proyecto_id));

CREATE POLICY "incidentes_insert" ON public.incidentes
  FOR INSERT WITH CHECK (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst', 'operativo')
  );

CREATE POLICY "incidentes_update" ON public.incidentes
  FOR UPDATE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst')
  );

CREATE POLICY "inc_evidencias_select" ON public.incidente_evidencias
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.incidentes i
      WHERE i.id = incidente_id
        AND public.auth_tiene_acceso_proyecto(i.proyecto_id)
    )
  );

CREATE POLICY "inc_evidencias_insert" ON public.incidente_evidencias
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.incidentes i
      WHERE i.id = incidente_id
        AND public.auth_tiene_acceso_proyecto(i.proyecto_id)
        AND public.auth_rol() IN ('super_admin', 'admin', 'sst', 'operativo')
    )
  );

-- =============================================================================
-- FORMULARIOS Y TABLAS HIJAS SST
-- =============================================================================
CREATE POLICY "formularios_select" ON public.formularios
  FOR SELECT USING (public.auth_tiene_acceso_proyecto(proyecto_id));

CREATE POLICY "formularios_insert" ON public.formularios
  FOR INSERT WITH CHECK (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst', 'operativo')
  );

CREATE POLICY "formularios_update" ON public.formularios
  FOR UPDATE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst', 'operativo')
  );

CREATE POLICY "formularios_delete" ON public.formularios
  FOR DELETE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'sst')
    AND estado = 'borrador'   -- Solo borradores se pueden eliminar
  );

-- Secuencias: solo lectura para roles que crean formularios; insert via trigger
CREATE POLICY "secuencias_select" ON public.formulario_secuencias
  FOR SELECT USING (
    public.auth_es_super_admin()
    OR empresa_id = public.auth_empresa_id()
  );

CREATE POLICY "secuencias_insert" ON public.formulario_secuencias
  FOR INSERT WITH CHECK (
    public.auth_es_super_admin()
    OR empresa_id = public.auth_empresa_id()
  );

CREATE POLICY "secuencias_update" ON public.formulario_secuencias
  FOR UPDATE USING (
    public.auth_es_super_admin()
    OR empresa_id = public.auth_empresa_id()
  );

-- Macro para tablas hijas de formularios: acceso si tiene acceso al formulario padre
-- Se aplica a: ats_*, altura_*, caliente_*

-- ATS
CREATE POLICY "ats_detalles_all" ON public.ats_detalles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "ats_trabajadores_all" ON public.ats_trabajadores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "ats_equipos_all" ON public.ats_equipos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "ats_analisis_all" ON public.ats_analisis_riesgo
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "ats_pasos_all" ON public.ats_pasos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

-- Permiso Altura
CREATE POLICY "altura_detalles_all" ON public.altura_detalles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "altura_personal_all" ON public.altura_personal
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "altura_epp_all" ON public.altura_epp_chequeo
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "altura_chequeo_all" ON public.altura_lista_chequeo
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

-- Permiso Caliente
CREATE POLICY "caliente_detalles_all" ON public.caliente_detalles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "caliente_planeacion_all" ON public.caliente_planeacion
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "caliente_area_all" ON public.caliente_area_trabajo
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "caliente_epp_all" ON public.caliente_epp
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "caliente_verificacion_all" ON public.caliente_verificacion
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "caliente_cierre_all" ON public.caliente_cierre
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

CREATE POLICY "caliente_firmas_all" ON public.caliente_firmas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.formularios f WHERE f.id = formulario_id AND public.auth_tiene_acceso_proyecto(f.proyecto_id))
  );

-- =============================================================================
-- RUBROS Y MOVIMIENTOS
-- =============================================================================
CREATE POLICY "rubros_select" ON public.rubros
  FOR SELECT USING (public.auth_tiene_acceso_proyecto(proyecto_id));

CREATE POLICY "rubros_insert" ON public.rubros
  FOR INSERT WITH CHECK (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'financiero')
  );

CREATE POLICY "rubros_update" ON public.rubros
  FOR UPDATE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'financiero')
  );

CREATE POLICY "rubros_delete" ON public.rubros
  FOR DELETE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_es_admin_o_superior()
  );

-- Movimientos: cualquier rol con acceso al proyecto puede SOLICITAR;
-- solo admin/financiero pueden APROBAR/RECHAZAR (via UPDATE de estado)
CREATE POLICY "movimientos_select" ON public.movimientos
  FOR SELECT USING (public.auth_tiene_acceso_proyecto(proyecto_id));

CREATE POLICY "movimientos_insert" ON public.movimientos
  FOR INSERT WITH CHECK (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND public.auth_rol() IN ('super_admin', 'admin', 'financiero', 'operativo', 'sst')
  );

CREATE POLICY "movimientos_update" ON public.movimientos
  FOR UPDATE USING (
    public.auth_tiene_acceso_proyecto(proyecto_id)
    AND (
      -- Solo admin/financiero pueden cambiar el estado de aprobacion
      public.auth_rol() IN ('super_admin', 'admin', 'financiero')
      -- El solicitante puede editar su propio movimiento si aun esta en 'solicitado'
      OR (solicitado_por = auth.uid() AND estado = 'solicitado')
    )
  );

-- =============================================================================
-- AUDITORIA_LOGS — append-only
-- =============================================================================
CREATE POLICY "auditoria_select" ON public.auditoria_logs
  FOR SELECT USING (
    public.auth_es_super_admin()
    OR (
      public.auth_es_admin_o_superior()
      -- El actor_id pertenece a la empresa del usuario autenticado
      AND EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = actor_id
          AND u.empresa_id = public.auth_empresa_id()
      )
    )
  );

-- INSERT solo permitido via el trigger SECURITY DEFINER (audit_movimientos)
-- Para todos los roles la policy de INSERT devuelve FALSE —
-- el trigger bypasea RLS por ser SECURITY DEFINER
CREATE POLICY "auditoria_insert_deny" ON public.auditoria_logs
  FOR INSERT WITH CHECK (FALSE);

-- UPDATE y DELETE denegados a ABSOLUTAMENTE TODOS
CREATE POLICY "auditoria_update_deny" ON public.auditoria_logs
  FOR UPDATE USING (FALSE);

CREATE POLICY "auditoria_delete_deny" ON public.auditoria_logs
  FOR DELETE USING (FALSE);
