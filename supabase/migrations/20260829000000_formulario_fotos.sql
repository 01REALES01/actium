-- =============================================================================
-- ACTIUM | Registro fotográfico de formularios SST
-- =============================================================================
-- El cliente pidió adjuntar fotos a cada inspección preoperacional: un hallazgo
-- ("extintor con manómetro en rojo") necesita evidencia visual que lo sostenga
-- frente a una auditoría o la ARL.
--
-- POR QUÉ TABLA PROPIA Y NO EL PAYLOAD JSON:
-- El preoperacional guarda todo su contenido como un .json en Storage, gemelo
-- del PDF (ver 20260823000000_formulario_tipo_preoperacional.sql). Meter ahí los
-- paths de las fotos las volvería inconsultables por SQL e imposibilitaría
-- limpiar Storage al borrar. La tabla se define sobre `formulario_id` genérico,
-- no sobre 'preoperacional', para extenderla a ATS, permisos y entrega de EPP
-- sin volver a migrar.
--
-- POR QUÉ NO HAY BUCKET NUEVO:
-- Se reutiliza `fotos-proyectos` (privado, 20 MiB, image/png|jpeg|webp|heic).
-- Sus políticas resuelven el tenant con path_empresa_id(name), es decir el
-- primer segmento del path, así que mientras el path empiece por {empresa_id}/
-- las políticas existentes ya cubren estos objetos. El prefijo `formularios/`
-- dentro del path evita colisionar con las fotos de obra del mismo proyecto:
--   {empresa_id}/{subempresa_id}/{proyecto_id}/formularios/{formulario_id}/{uuid}.{ext}
-- =============================================================================

CREATE TABLE public.formulario_fotos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id  UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  storage_path   TEXT NOT NULL,   -- bucket: fotos-proyectos
  nombre         TEXT,
  descripcion    TEXT,
  tamano_bytes   BIGINT,
  subido_por     UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_formulario_fotos_formulario
  ON public.formulario_fotos (formulario_id, uploaded_at DESC);

COMMENT ON TABLE public.formulario_fotos IS
  'Registro fotográfico anexo a un formulario SST. Los archivos viven en el bucket fotos-proyectos bajo el prefijo formularios/. No se incrustan en el PDF emitido: el PDF firmado no cambia cuando se agrega una foto.';
COMMENT ON COLUMN public.formulario_fotos.storage_path IS
  'Bucket fotos-proyectos. Formato: {empresa_id}/{subempresa_id}/{proyecto_id}/formularios/{formulario_id}/{uuid}.{ext}. El primer segmento debe ser el empresa_id o las políticas de storage rechazan el objeto.';
COMMENT ON COLUMN public.formulario_fotos.subido_por IS
  'Traza de auditoría: junto con uploaded_at permite saber quién anexó la evidencia y cuándo, incluso si la foto se agregó después de emitido el formulario.';

-- =============================================================================
-- RLS — mismo macro que las demás tablas hijas de formularios
-- =============================================================================
-- El acceso se hereda del formulario padre. Se pasan empresa_id y subempresa_id
-- a auth_tiene_acceso_proyecto para evitar la consulta recursiva a proyectos,
-- por el mismo motivo documentado en 20260623000002_fix_detail_rls.sql.
--
-- SELECT queda abierto a todo el que ve el formulario (el detalle /sst/[id] lee
-- con la sesión del usuario). Las escrituras se acotan a super_admin y sst,
-- según la excepción SST de 20260624230000_lock_writes_super_admin.sql. Las
-- server actions escriben con service role, así que esto es defensa en
-- profundidad, no el único control.
ALTER TABLE public.formulario_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "formulario_fotos_select" ON public.formulario_fotos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id
        AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id)
    )
  );

CREATE POLICY "formulario_fotos_insert" ON public.formulario_fotos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id
        AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id)
    )
    AND (public.auth_es_super_admin() OR public.auth_rol() = 'sst')
  );

CREATE POLICY "formulario_fotos_update" ON public.formulario_fotos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id
        AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id)
    )
    AND (public.auth_es_super_admin() OR public.auth_rol() = 'sst')
  );

CREATE POLICY "formulario_fotos_delete" ON public.formulario_fotos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id
        AND public.auth_tiene_acceso_proyecto(f.proyecto_id, f.empresa_id, f.subempresa_id)
    )
    AND (public.auth_es_super_admin() OR public.auth_rol() = 'sst')
  );
