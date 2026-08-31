-- =============================================================================
-- ACTIUM | Hacer Inventario — conteo físico de herramientas
-- =============================================================================
-- El módulo Inventario (20260827000000_inventario.sql) ya presta y devuelve
-- herramientas a proyectos, pero no existía ninguna forma de verificar en obra
-- que lo que el sistema dice que está asignado sigue realmente ahí. Este
-- archivo agrega ese conteo físico:
--
--   1) El encargado abre un conteo sobre un ÁMBITO: un proyecto concreto (las
--      unidades que ese proyecto tiene hoy prestadas) o la BODEGA
--      (proyecto_id IS NULL: las unidades disponibles o en mantenimiento que
--      deberían estar en el estante). Abrir el conteo TOMA UNA FOTO: congela
--      qué unidades se esperan y sus rótulos, para que un cambio posterior en
--      el catálogo no altere un acta ya firmada.
--   2) Cada unidad se marca Existe / Existe con novedad / No existe, con nota
--      libre. El marcado persiste al instante (no hay autoguardado por
--      intervalo): en obra, con señal intermitente, es más confiable que
--      cualquier temporizador.
--   3) Al cerrar, el conteo es inmutable y queda con firma, responsable y PDF.
--      El conteo SOLO REPORTA — no cambia el estado de ninguna unidad por sí
--      mismo. El ajuste de las unidades faltantes a 'perdida' es una acción
--      aparte y explícita (marcar_faltantes_como_perdidas), para que un
--      marcado erróneo en campo no dé de baja una herramienta que sí existe.
--
-- Mismo régimen de acceso que el resto de Inventario: exclusivo de
-- super_admin, sin empresa_id en ninguna tabla — el aislamiento lo da el
-- acceso al módulo, no el tenant (ver el banner de 20260827000000_inventario).
-- =============================================================================

-- =============================================================================
-- 1. Enums
-- =============================================================================

CREATE TYPE public.conteo_estado AS ENUM ('borrador', 'cerrado');

CREATE TYPE public.conteo_resultado AS ENUM (
  'existe',    -- se verificó físicamente en el ámbito contado
  'novedad',   -- está, pero con algo que anotar (daño, incompleta, etc.)
  'faltante'   -- no se encontró
);

COMMENT ON TYPE public.conteo_estado IS
  'Estado de un conteo de herramientas. borrador = en progreso y editable; cerrado = inmutable, con acta.';
COMMENT ON TYPE public.conteo_resultado IS
  'Resultado del marcado de un ítem de conteo. NULL en la tabla = aún sin marcar.';

-- El préstamo de una unidad que no apareció en el conteo se cierra con una
-- condición de devolución propia: no volvió en mal estado (eso sería 'malo'),
-- no volvió. Es un ADD VALUE sobre un enum existente, así que — a diferencia
-- de los enums nuevos de arriba — no puede usarse dentro de esta misma
-- transacción (ver la nota de 20260823000000_formulario_tipo_preoperacional
-- sobre por qué PostgreSQL lo impide). No hace falta: solo se usa dentro del
-- cuerpo de marcar_faltantes_como_perdidas, que se ejecuta después.
ALTER TYPE public.herramienta_condicion ADD VALUE IF NOT EXISTS 'perdida';

-- =============================================================================
-- 2. herramienta_conteos — cabecera del conteo
-- =============================================================================

CREATE TABLE public.herramienta_conteos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id         UUID REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  estado              public.conteo_estado NOT NULL DEFAULT 'borrador',
  fecha_conteo        DATE NOT NULL DEFAULT CURRENT_DATE,
  responsable_nombre  TEXT,
  responsable_id      UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  observaciones       TEXT,
  cerrado_at          TIMESTAMPTZ,
  pdf_path            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,

  CONSTRAINT chk_conteo_cerrado
    CHECK ((estado = 'cerrado') = (cerrado_at IS NOT NULL))
);

-- PIEZA CLAVE. Un solo conteo abierto por ámbito a la vez, mismo espíritu que
-- uq_herramienta_movimiento_abierto: dos conteos simultáneos del mismo
-- proyecto (o de bodega) duplicarían trabajo y confundirían cuál es el
-- vigente. COALESCE colapsa el ámbito "bodega" (proyecto_id NULL) a un valor
-- fijo porque NULL nunca es igual a NULL para un índice único.
CREATE UNIQUE INDEX uq_conteo_borrador_abierto
  ON public.herramienta_conteos (COALESCE(proyecto_id, '00000000-0000-0000-0000-000000000000'::UUID))
  WHERE estado = 'borrador';

CREATE INDEX idx_herramienta_conteos_proyecto
  ON public.herramienta_conteos (proyecto_id, fecha_conteo DESC);

CREATE TRIGGER trg_herramienta_conteos_updated_at
  BEFORE UPDATE ON public.herramienta_conteos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.herramienta_conteos IS
  'Cabecera de un conteo físico de herramientas. proyecto_id NULL = conteo de bodega.';
COMMENT ON COLUMN public.herramienta_conteos.proyecto_id IS
  'Ámbito del conteo: las unidades asignadas a este proyecto, o (si es NULL) las que deberían estar en bodega.';
COMMENT ON COLUMN public.herramienta_conteos.pdf_path IS
  'Ruta en el bucket pdfs-inventario del acta generada al cerrar. NULL mientras el conteo esté en borrador.';
COMMENT ON INDEX public.uq_conteo_borrador_abierto IS
  'Invariante: un solo conteo en borrador por ámbito a la vez. Garantía de base de datos, no de aplicación.';

-- =============================================================================
-- 3. herramienta_conteo_items — una fila por unidad incluida en el conteo
-- =============================================================================
-- unidad_codigo y catalogo_nombre se CONGELAN al abrir el conteo (misma razón
-- que epp_entrega_items con los cargos de EPP): si el tipo se renombra o la
-- unidad se elimina después, el acta ya firmada debe seguir diciendo lo que
-- decía cuando se firmó.

CREATE TABLE public.herramienta_conteo_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conteo_id        UUID NOT NULL REFERENCES public.herramienta_conteos(id) ON DELETE CASCADE,
  unidad_id        UUID NOT NULL REFERENCES public.herramienta_unidades(id) ON DELETE RESTRICT,
  unidad_codigo    TEXT NOT NULL,
  catalogo_nombre  TEXT NOT NULL,
  resultado        public.conteo_resultado,
  nota             TEXT,
  marcado_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_conteo_item_unidad UNIQUE (conteo_id, unidad_id)
);

CREATE INDEX idx_herramienta_conteo_items_conteo
  ON public.herramienta_conteo_items (conteo_id);

COMMENT ON TABLE public.herramienta_conteo_items IS
  'Ítem de un conteo: una unidad esperada en el ámbito, con su resultado de verificación. resultado NULL = aún sin marcar.';
COMMENT ON COLUMN public.herramienta_conteo_items.unidad_codigo IS
  'Código de la unidad congelado al abrir el conteo, para que el acta no cambie si la unidad se renombra o se elimina después.';
COMMENT ON COLUMN public.herramienta_conteo_items.catalogo_nombre IS
  'Nombre del tipo de herramienta congelado al abrir el conteo, por la misma razón que unidad_codigo.';

-- =============================================================================
-- 4. Vista de resumen
-- =============================================================================

CREATE VIEW public.vw_conteos_resumen
WITH (security_invoker = true) AS
SELECT
  c.id            AS conteo_id,
  c.proyecto_id,
  c.estado,
  c.fecha_conteo,
  COUNT(i.id)                                             AS total_items,
  COUNT(i.id) FILTER (WHERE i.resultado = 'existe')        AS existentes,
  COUNT(i.id) FILTER (WHERE i.resultado = 'novedad')       AS novedades,
  COUNT(i.id) FILTER (WHERE i.resultado = 'faltante')      AS faltantes,
  COUNT(i.id) FILTER (WHERE i.resultado IS NULL)           AS sin_marcar
FROM public.herramienta_conteos c
LEFT JOIN public.herramienta_conteo_items i ON i.conteo_id = c.id
GROUP BY c.id, c.proyecto_id, c.estado, c.fecha_conteo;

COMMENT ON VIEW public.vw_conteos_resumen IS
  'Totales por conteo (verificados, con novedad, faltantes, sin marcar), para el historial y los KPI sin recontar en el cliente.';

-- =============================================================================
-- 5. RPCs
-- =============================================================================
-- SECURITY DEFINER con guard interno, molde de asignar_herramienta /
-- devolver_herramienta.

CREATE OR REPLACE FUNCTION public.abrir_conteo_herramientas(p_proyecto_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conteo_id UUID;
  v_insertados INTEGER;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede abrir un conteo de herramientas';
  END IF;

  IF p_proyecto_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.proyectos WHERE id = p_proyecto_id AND deleted_at IS NULL)
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Proyecto no encontrado';
  END IF;

  -- Falla con un mensaje claro antes de tocar el índice único: dos borradores
  -- abiertos del mismo ámbito son un error de operación, no una condición de
  -- carrera esperable aquí (el conteo lo abre una sola persona a la vez).
  IF EXISTS (
    SELECT 1 FROM public.herramienta_conteos
    WHERE estado = 'borrador'
      AND COALESCE(proyecto_id, '00000000-0000-0000-0000-000000000000'::UUID)
        = COALESCE(p_proyecto_id, '00000000-0000-0000-0000-000000000000'::UUID)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Ya hay un conteo en borrador para este ámbito. Ciérralo o retómalo antes de abrir uno nuevo.';
  END IF;

  INSERT INTO public.herramienta_conteos (proyecto_id, created_by)
  VALUES (p_proyecto_id, auth.uid())
  RETURNING id INTO v_conteo_id;

  IF p_proyecto_id IS NOT NULL THEN
    -- Ámbito proyecto: lo que el ledger dice que está prestado ahí ahora mismo.
    INSERT INTO public.herramienta_conteo_items (conteo_id, unidad_id, unidad_codigo, catalogo_nombre)
    SELECT v_conteo_id, u.id, u.codigo, c.nombre
    FROM public.herramienta_unidades u
    JOIN public.herramientas_catalogo c ON c.id = u.catalogo_id
    WHERE u.proyecto_id = p_proyecto_id
      AND u.estado = 'asignada'
      AND u.deleted_at IS NULL;
  ELSE
    -- Ámbito bodega: lo que debería estar en el estante. Lo dado de baja o ya
    -- perdido no se espera ahí, así que no entra al conteo.
    INSERT INTO public.herramienta_conteo_items (conteo_id, unidad_id, unidad_codigo, catalogo_nombre)
    SELECT v_conteo_id, u.id, u.codigo, c.nombre
    FROM public.herramienta_unidades u
    JOIN public.herramientas_catalogo c ON c.id = u.catalogo_id
    WHERE u.proyecto_id IS NULL
      AND u.estado IN ('disponible', 'mantenimiento')
      AND u.deleted_at IS NULL;
  END IF;

  GET DIAGNOSTICS v_insertados = ROW_COUNT;
  IF v_insertados = 0 THEN
    -- Deshace la cabecera: un conteo sin ítems no tiene sentido y dejaría
    -- basura en el historial cada vez que alguien pruebe un ámbito vacío.
    DELETE FROM public.herramienta_conteos WHERE id = v_conteo_id;
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Este ámbito no tiene herramientas para contar en este momento';
  END IF;

  RETURN v_conteo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.abrir_conteo_herramientas(UUID) TO authenticated;

COMMENT ON FUNCTION public.abrir_conteo_herramientas IS
  'Abre un conteo y congela la lista de unidades esperadas en el ámbito (proyecto, o bodega si el argumento es NULL). Solo super_admin.';

CREATE OR REPLACE FUNCTION public.marcar_item_conteo(
  p_item_id   UUID,
  p_resultado public.conteo_resultado,
  p_nota      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_estado public.conteo_estado;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede marcar ítems de un conteo';
  END IF;

  SELECT c.estado INTO v_estado
  FROM public.herramienta_conteo_items i
  JOIN public.herramienta_conteos c ON c.id = i.conteo_id
  WHERE i.id = p_item_id
  FOR UPDATE OF i;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Ítem de conteo no encontrado';
  END IF;

  IF v_estado <> 'borrador' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Este conteo ya está cerrado y no admite cambios';
  END IF;

  UPDATE public.herramienta_conteo_items
  SET resultado = p_resultado, nota = NULLIF(trim(p_nota), ''), marcado_at = NOW()
  WHERE id = p_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_item_conteo(UUID, public.conteo_resultado, TEXT) TO authenticated;

COMMENT ON FUNCTION public.marcar_item_conteo IS
  'Marca el resultado de un ítem de conteo. Persiste al instante: no hay autoguardado por intervalo. Solo sobre conteos en borrador.';

CREATE OR REPLACE FUNCTION public.cerrar_conteo_herramientas(
  p_conteo_id          UUID,
  p_responsable_nombre TEXT,
  p_observaciones      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_estado      public.conteo_estado;
  v_sin_marcar  INTEGER;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede cerrar un conteo de herramientas';
  END IF;

  SELECT estado INTO v_estado FROM public.herramienta_conteos WHERE id = p_conteo_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Conteo no encontrado';
  END IF;
  IF v_estado <> 'borrador' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Este conteo ya está cerrado';
  END IF;

  SELECT COUNT(*) INTO v_sin_marcar
  FROM public.herramienta_conteo_items
  WHERE conteo_id = p_conteo_id AND resultado IS NULL;

  IF v_sin_marcar > 0 THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Aún faltan ' || v_sin_marcar::TEXT || ' herramientas por marcar antes de cerrar el conteo';
  END IF;

  IF trim(COALESCE(p_responsable_nombre, '')) = '' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'El conteo requiere el nombre del responsable';
  END IF;

  UPDATE public.herramienta_conteos
  SET estado             = 'cerrado',
      cerrado_at         = NOW(),
      responsable_nombre = trim(p_responsable_nombre),
      responsable_id     = auth.uid(),
      observaciones      = NULLIF(trim(p_observaciones), '')
  WHERE id = p_conteo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cerrar_conteo_herramientas(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.cerrar_conteo_herramientas IS
  'Cierra un conteo: exige que todos los ítems estén marcados, registra responsable y observaciones. Irreversible. Solo super_admin.';

CREATE OR REPLACE FUNCTION public.marcar_faltantes_como_perdidas(p_conteo_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_estado    public.conteo_estado;
  v_item      RECORD;
  v_afectadas INTEGER := 0;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede dar de baja herramientas faltantes';
  END IF;

  SELECT estado INTO v_estado FROM public.herramienta_conteos WHERE id = p_conteo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Conteo no encontrado';
  END IF;
  IF v_estado <> 'cerrado' THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Solo se pueden dar de baja los faltantes de un conteo ya cerrado';
  END IF;

  -- Idempotente: una unidad que ya quedó 'perdida' (por ejecutar esto dos
  -- veces, o por un ajuste manual entre medias) se salta sin error.
  FOR v_item IN
    SELECT i.unidad_id
    FROM public.herramienta_conteo_items i
    JOIN public.herramienta_unidades u ON u.id = i.unidad_id
    WHERE i.conteo_id = p_conteo_id
      AND i.resultado = 'faltante'
      AND u.estado <> 'perdida'
  LOOP
    UPDATE public.herramienta_movimientos
    SET fecha_devolucion     = NOW(),
        condicion_devolucion = 'perdida',
        notas_devolucion     = 'No apareció en el conteo ' || p_conteo_id::TEXT
    WHERE unidad_id = v_item.unidad_id AND fecha_devolucion IS NULL;

    UPDATE public.herramienta_unidades
    SET estado = 'perdida', proyecto_id = NULL
    WHERE id = v_item.unidad_id;

    v_afectadas := v_afectadas + 1;
  END LOOP;

  RETURN v_afectadas;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marcar_faltantes_como_perdidas(UUID) TO authenticated;

COMMENT ON FUNCTION public.marcar_faltantes_como_perdidas IS
  'Acción explícita y opcional: cierra el préstamo y pasa a perdida cada unidad faltante de un conteo ya cerrado. Idempotente. Solo super_admin.';

-- =============================================================================
-- 6. Storage — bucket pdfs-inventario
-- =============================================================================
-- No se reutiliza pdfs-formularios: su convención de path y sus policies leen
-- el tenant del primer segmento ({empresa_id}/...), y este módulo no tiene
-- empresa_id — un conteo de bodega, en particular, no pertenece a ninguna
-- empresa. El aislamiento aquí es el mismo que en el resto de Inventario:
-- exclusivo de super_admin, sin mirar el path.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pdfs-inventario', 'pdfs-inventario', FALSE, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pdfs_inventario_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdfs-inventario' AND auth.jwt() ->> 'rol' = 'super_admin');

CREATE POLICY "pdfs_inventario_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdfs-inventario' AND auth.jwt() ->> 'rol' = 'super_admin');

-- =============================================================================
-- 7. RLS — módulo exclusivo de super_admin, igual que el resto de Inventario
-- =============================================================================

ALTER TABLE public.herramienta_conteos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.herramienta_conteo_items  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "herramienta_conteos_select" ON public.herramienta_conteos
  FOR SELECT USING (public.auth_es_super_admin());
CREATE POLICY "herramienta_conteos_insert" ON public.herramienta_conteos
  FOR INSERT WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "herramienta_conteos_update" ON public.herramienta_conteos
  FOR UPDATE USING (public.auth_es_super_admin()) WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "herramienta_conteos_delete" ON public.herramienta_conteos
  FOR DELETE USING (public.auth_es_super_admin());

CREATE POLICY "herramienta_conteo_items_select" ON public.herramienta_conteo_items
  FOR SELECT USING (public.auth_es_super_admin());
CREATE POLICY "herramienta_conteo_items_insert" ON public.herramienta_conteo_items
  FOR INSERT WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "herramienta_conteo_items_update" ON public.herramienta_conteo_items
  FOR UPDATE USING (public.auth_es_super_admin()) WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "herramienta_conteo_items_delete" ON public.herramienta_conteo_items
  FOR DELETE USING (public.auth_es_super_admin());
