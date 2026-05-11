-- =============================================================================
-- ACTIUM | 0011 — RPCs de Mutación (SECURITY INVOKER)
-- =============================================================================
-- Funciones que centralizan reglas de negocio sensibles. Se invocan desde
-- server actions (`src/lib/actions/*`) en vez de mutaciones SQL directas.
--
-- Por qué INVOKER (no DEFINER): se ejecutan con los permisos del usuario
-- autenticado, por lo que las RLS policies de 0009 siguen aplicando. Si un
-- subcliente llama registrar_avance_proyecto sobre un proyecto que no le
-- pertenece, el SELECT contra `proyectos` dentro de la función ya devuelve
-- 0 filas y la función aborta. Sin esto, la única defensa serían los helpers
-- auth_*, que son trivialmente saltables si la lógica viviera en el cliente.
-- =============================================================================

-- =============================================================================
-- registrar_avance_proyecto
-- =============================================================================
-- UPSERT idempotente del snapshot diario. Quien lo dispara: operativo asignado,
-- sst de la empresa, admin o super_admin. RLS de proyecto_avances + proyectos
-- bloquea cualquier otro caso.
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
  IF NOT public.auth_tiene_acceso_proyecto(p_proyecto_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'No tiene acceso a este proyecto';
  END IF;

  IF p_avance_real NOT BETWEEN 0 AND 100 OR p_avance_proyectado NOT BETWEEN 0 AND 100 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Los avances deben estar entre 0 y 100';
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

GRANT EXECUTE ON FUNCTION public.registrar_avance_proyecto(UUID, DATE, NUMERIC, NUMERIC, TEXT)
  TO authenticated;

-- =============================================================================
-- solicitar_movimiento_rubro
-- =============================================================================
-- INSERT controlado de un movimiento en estado 'solicitado'. La validación de
-- techo (validar_techo_presupuestal en 0006) NO dispara aquí porque solo aplica
-- al pasar a 'ejecutado' — eso es correcto: solo bloqueamos cuando el dinero
-- realmente sale. Roles permitidos: financiero, admin, super_admin.
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
  v_id      UUID;
  v_rol     user_role;
BEGIN
  v_rol := public.auth_rol();
  IF v_rol NOT IN ('financiero', 'admin', 'super_admin') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Solo los roles financiero, admin o super_admin pueden solicitar movimientos';
  END IF;

  IF NOT public.auth_tiene_acceso_proyecto(p_proyecto_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'No tiene acceso a este proyecto';
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

GRANT EXECUTE ON FUNCTION public.solicitar_movimiento_rubro(UUID, UUID, movimiento_tipo, NUMERIC, TEXT, UUID)
  TO authenticated;

-- =============================================================================
-- aprobar_movimiento
-- =============================================================================
-- Transición solicitado → aprobado. Solo admin/super_admin/financiero. El
-- trigger audit_movimientos (0006) genera la fila inmutable en auditoria_logs.
CREATE OR REPLACE FUNCTION public.aprobar_movimiento(
  p_movimiento_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_rol            user_role;
  v_estado_actual  movimiento_estado;
BEGIN
  v_rol := public.auth_rol();
  IF v_rol NOT IN ('admin', 'super_admin', 'financiero') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Solo admin, super_admin o financiero pueden aprobar movimientos';
  END IF;

  -- RLS sobre movimientos garantiza que solo veamos los de nuestra empresa.
  SELECT estado INTO v_estado_actual
    FROM public.movimientos
   WHERE id = p_movimiento_id;

  IF v_estado_actual IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Movimiento no encontrado o sin acceso';
  END IF;

  IF v_estado_actual <> 'solicitado' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Solo se pueden aprobar movimientos en estado solicitado';
  END IF;

  UPDATE public.movimientos
     SET estado       = 'aprobado',
         aprobado_por = auth.uid(),
         aprobado_at  = NOW()
   WHERE id = p_movimiento_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aprobar_movimiento(UUID) TO authenticated;

-- =============================================================================
-- rechazar_movimiento
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rechazar_movimiento(
  p_movimiento_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_rol user_role;
BEGIN
  v_rol := public.auth_rol();
  IF v_rol NOT IN ('admin', 'super_admin', 'financiero') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Solo admin, super_admin o financiero pueden rechazar movimientos';
  END IF;

  UPDATE public.movimientos
     SET estado       = 'rechazado',
         aprobado_por = auth.uid(),
         aprobado_at  = NOW()
   WHERE id = p_movimiento_id
     AND estado = 'solicitado';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Movimiento no encontrado, sin acceso, o no está en estado solicitado';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rechazar_movimiento(UUID) TO authenticated;

-- =============================================================================
-- ejecutar_movimiento
-- =============================================================================
-- Transición aprobado → ejecutado. Es aquí donde dispara
-- validar_techo_presupuestal (trigger en 0006) — si supera el monto_maximo
-- del rubro la transacción aborta.
CREATE OR REPLACE FUNCTION public.ejecutar_movimiento(
  p_movimiento_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_rol user_role;
BEGIN
  v_rol := public.auth_rol();
  IF v_rol NOT IN ('admin', 'super_admin', 'financiero') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Solo admin, super_admin o financiero pueden ejecutar movimientos';
  END IF;

  UPDATE public.movimientos
     SET estado       = 'ejecutado',
         ejecutado_at = NOW()
   WHERE id = p_movimiento_id
     AND estado = 'aprobado';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Movimiento no encontrado, sin acceso, o no está en estado aprobado';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ejecutar_movimiento(UUID) TO authenticated;

-- =============================================================================
-- cerrar_formulario_sst
-- =============================================================================
-- Transición completado → firmado. Valida que existan firmas mínimas según
-- el tipo de formulario:
--   ats              : al menos 1 trabajador con firma_path no nulo
--   permiso_altura   : firma del emisor + al menos 1 personal con firma
--   permiso_caliente : firmas en momento 'inicio' de al menos 1 trabajador
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
  SELECT tipo, estado INTO v_tipo, v_estado
    FROM public.formularios
   WHERE id = p_formulario_id;

  IF v_tipo IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'Formulario no encontrado o sin acceso';
  END IF;

  IF v_estado <> 'completado' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Solo se pueden cerrar formularios en estado completado';
  END IF;

  IF v_tipo = 'ats' THEN
    SELECT COUNT(*) INTO v_count
      FROM public.ats_trabajadores
     WHERE formulario_id = p_formulario_id
       AND firma_path IS NOT NULL;
    IF v_count < 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'El ATS requiere al menos una firma de trabajador';
    END IF;

  ELSIF v_tipo = 'permiso_altura' THEN
    SELECT firma_emisor_path INTO v_emisor_firma
      FROM public.altura_detalles
     WHERE formulario_id = p_formulario_id;
    IF v_emisor_firma IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'El permiso de altura requiere firma del emisor';
    END IF;
    SELECT COUNT(*) INTO v_count
      FROM public.altura_personal
     WHERE formulario_id = p_formulario_id
       AND firma_path IS NOT NULL;
    IF v_count < 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'El permiso de altura requiere al menos una firma de personal';
    END IF;

  ELSIF v_tipo = 'permiso_caliente' THEN
    SELECT COUNT(*) INTO v_count
      FROM public.caliente_firmas
     WHERE formulario_id = p_formulario_id
       AND momento = 'inicio'
       AND firma_path IS NOT NULL;
    IF v_count < 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'El permiso de caliente requiere al menos una firma de inicio';
    END IF;
  END IF;

  UPDATE public.formularios
     SET estado     = 'firmado',
         firmado_at = NOW()
   WHERE id = p_formulario_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cerrar_formulario_sst(UUID) TO authenticated;

-- =============================================================================
-- COMMENT en funciones para descubribilidad desde el dashboard
-- =============================================================================
COMMENT ON FUNCTION public.registrar_avance_proyecto IS
  'UPSERT del snapshot diario de avance. SECURITY INVOKER — respeta RLS.';
COMMENT ON FUNCTION public.solicitar_movimiento_rubro IS
  'Crea un movimiento en estado solicitado. Solo financiero/admin/super_admin.';
COMMENT ON FUNCTION public.aprobar_movimiento IS
  'Transición solicitado → aprobado. Genera entrada inmutable en auditoria_logs.';
COMMENT ON FUNCTION public.rechazar_movimiento IS
  'Transición solicitado → rechazado.';
COMMENT ON FUNCTION public.ejecutar_movimiento IS
  'Transición aprobado → ejecutado. Dispara validar_techo_presupuestal.';
COMMENT ON FUNCTION public.cerrar_formulario_sst IS
  'Transición completado → firmado. Valida firmas mínimas según tipo.';
