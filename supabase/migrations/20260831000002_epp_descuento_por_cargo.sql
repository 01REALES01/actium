-- =============================================================================
-- ACTIUM | Descuento de inventario EPP al firmar el cargo de entrega
-- =============================================================================
-- Fase 2 anunciada en el comentario de epp_movimientos.formulario_id (ver
-- 20260827000000_inventario.sql): cuando un cargo de entrega de EPP
-- (formularios.tipo = 'entrega_epp') se firma, cada elemento entregado que
-- esté vinculado a un ítem del inventario del proyecto descuenta stock
-- automáticamente. Si el encargado de SST entrega un EPP sin diligenciar el
-- formato, el inventario no se mueve — esa diferencia frente al conteo físico
-- es justo lo que permite auditar los vacíos de dotación.
--
-- Los movimientos con formulario_id no son un ledger independiente: son una
-- PROYECCIÓN DERIVADA del cargo. El registro de auditoría real es el PDF
-- firmado. Por eso aplicar_salidas_epp_formulario reversa y vuelve a aplicar
-- en cada llamada — es lo que hace segura una re-emisión del mismo cargo (el
-- botón "Regenerar cargo en PDF" de entrega-epp-form.tsx llama de nuevo a
-- guardarPdfYDatosFormularioAction sobre el mismo formulario_id). Los
-- movimientos manuales (formulario_id IS NULL) no se tocan: siguen siendo
-- append-only, como el resto del ledger.
--
-- No se valida saldo negativo en esta ruta (a diferencia de
-- registrar_movimiento_epp): la entrega física ya ocurrió cuando el
-- trabajador firma, así que la firma nunca debe bloquearse por falta de
-- stock registrado. Un saldo negativo o un ítem no conciliado es información
-- para auditar, no un error que detener.
-- =============================================================================

-- =============================================================================
-- 1. Vínculo ítem del cargo → ítem de inventario
-- =============================================================================
-- NULL = el elemento entregado no quedó conciliado con ningún ítem del
-- inventario del proyecto (no existe, o el formato no lo especificó). Las
-- filas 'adicional' siempre quedan en NULL: no tienen equivalente en el
-- catálogo ELEMENTOS_EPP y por eso nunca descuentan stock.

ALTER TABLE public.epp_entrega_items
  ADD COLUMN inventario_id UUID REFERENCES public.epp_inventario(id) ON DELETE SET NULL;

CREATE INDEX idx_epp_entrega_items_inventario
  ON public.epp_entrega_items (inventario_id)
  WHERE inventario_id IS NOT NULL;

COMMENT ON COLUMN public.epp_entrega_items.inventario_id IS
  'Ítem de epp_inventario del que se descuenta esta fila al firmar el cargo (ver aplicar_salidas_epp_formulario). NULL = entrega no conciliada: no descuenta y aparece en vw_epp_entregas_no_conciliadas.';

-- =============================================================================
-- 2. Borrar el cargo debe reversar su descuento
-- =============================================================================
-- eliminarFormularioAction (src/lib/actions/sst.ts) borra la fila de
-- `formularios`; con ON DELETE SET NULL el movimiento de salida quedaría
-- huérfano y el stock descontado sin ningún cargo que lo respalde. Con
-- CASCADE, borrar el formulario borra también las salidas que originó.

ALTER TABLE public.epp_movimientos
  DROP CONSTRAINT epp_movimientos_formulario_id_fkey;

ALTER TABLE public.epp_movimientos
  ADD CONSTRAINT epp_movimientos_formulario_id_fkey
  FOREIGN KEY (formulario_id) REFERENCES public.formularios(id) ON DELETE CASCADE;

-- =============================================================================
-- 3. RLS de lectura para el rol sst, acotada a sus proyectos
-- =============================================================================
-- El resto del módulo Inventario sigue siendo exclusivo de super_admin (ver
-- el banner de 20260827000000_inventario.sql). Estas dos policies son la
-- relajación de SELECT que ese mismo archivo anticipaba: el formato de
-- entrega necesita que quien firma pueda ver, del proyecto que le
-- corresponde, qué ítems y saldos hay para elegir de cuál se descuenta.
-- Postgres evalúa policies permisivas del mismo comando con OR, así que estas
-- se suman a las de super_admin ya existentes sin reemplazarlas.

CREATE POLICY "epp_inventario_select_sst" ON public.epp_inventario
  FOR SELECT USING (
    deleted_at IS NULL
    AND public.auth_rol() = 'sst'
    AND public.auth_tiene_acceso_proyecto(proyecto_id)
  );

CREATE POLICY "epp_movimientos_select_sst" ON public.epp_movimientos
  FOR SELECT USING (
    public.auth_rol() = 'sst'
    AND EXISTS (
      SELECT 1 FROM public.epp_inventario i
      WHERE i.id = inventario_id AND public.auth_tiene_acceso_proyecto(i.proyecto_id)
    )
  );

-- =============================================================================
-- 4. Vista de entregas sin conciliar
-- =============================================================================
-- Base del panel de vacíos: elementos de un cargo firmado que no quedaron
-- vinculados a ningún ítem del inventario. Excluye 'adicional' porque esas
-- filas nunca se concilian por diseño.

CREATE VIEW public.vw_epp_entregas_no_conciliadas
WITH (security_invoker = true) AS
SELECT
  it.id                  AS item_id,
  f.id                   AS formulario_id,
  f.codigo_consecutivo,
  f.proyecto_id,
  e.empleado_id,
  e.trabajador_nombre,
  e.fecha_entrega,
  it.elemento_id,
  it.elemento,
  it.unidad,
  it.cantidad
FROM public.epp_entrega_items it
JOIN public.epp_entregas e ON e.formulario_id = it.formulario_id
JOIN public.formularios f  ON f.id = it.formulario_id
WHERE it.inventario_id IS NULL
  AND it.elemento_id <> 'adicional'
  AND f.estado = 'firmado';

COMMENT ON VIEW public.vw_epp_entregas_no_conciliadas IS
  'Elementos de un cargo de EPP firmado que no se vincularon a ningún ítem del inventario del proyecto: no descontaron stock. Base del panel de auditoría de vacíos.';

-- =============================================================================
-- 5. vw_epp_saldos: distinguir lo respaldado por cargo de los ajustes manuales
-- =============================================================================

DROP VIEW public.vw_epp_saldos;

CREATE VIEW public.vw_epp_saldos
WITH (security_invoker = true) AS
SELECT
  i.id            AS inventario_id,
  i.proyecto_id,
  i.elemento_id,
  i.nombre,
  i.unidad,
  i.talla,
  i.stock_minimo,
  COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo = 'ingreso'), 0)::INTEGER AS ingresado,
  COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo = 'salida'), 0)::INTEGER  AS entregado,
  COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo = 'salida' AND m.formulario_id IS NOT NULL), 0)::INTEGER AS entregado_por_cargo,
  COALESCE(SUM(
    CASE m.tipo
      WHEN 'ingreso' THEN m.cantidad
      WHEN 'salida'  THEN -m.cantidad
      WHEN 'ajuste'  THEN m.cantidad
    END
  ), 0)::INTEGER AS saldo,
  (
    i.stock_minimo > 0
    AND COALESCE(SUM(
      CASE m.tipo
        WHEN 'ingreso' THEN m.cantidad
        WHEN 'salida'  THEN -m.cantidad
        WHEN 'ajuste'  THEN m.cantidad
      END
    ), 0) <= i.stock_minimo
  ) AS bajo_minimo
FROM public.epp_inventario i
LEFT JOIN public.epp_movimientos m ON m.inventario_id = i.id
WHERE i.deleted_at IS NULL
GROUP BY i.id, i.proyecto_id, i.elemento_id, i.nombre, i.unidad, i.talla, i.stock_minimo;

COMMENT ON VIEW public.vw_epp_saldos IS
  'Saldo de cada ítem de EPP por proyecto, derivado del ledger. entregado_por_cargo aísla las salidas que vienen de un cargo firmado (trazables a un trabajador y un PDF) de los ajustes manuales. bajo_minimo marca los que tocaron o cruzaron su umbral de alerta.';

-- =============================================================================
-- 6. RPC aplicar_salidas_epp_formulario — el descuento en sí
-- =============================================================================
-- SECURITY DEFINER con guard interno, molde de marcar_faltantes_como_perdidas.
-- A diferencia de las RPC de Inventario existentes (exclusivas de
-- super_admin), esta también la ejecuta el rol sst: es quien firma el cargo,
-- y epp_entregas/epp_entrega_items ya lo permiten (ver RLS de
-- 20260824000000_formulario_tipo_entrega_epp.sql).

CREATE OR REPLACE FUNCTION public.aplicar_salidas_epp_formulario(p_formulario_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tipo      public.formulario_tipo;
  v_estado    public.formulario_estado;
  v_item      RECORD;
  v_afectadas INTEGER := 0;
BEGIN
  IF NOT (public.auth_es_super_admin() OR public.auth_rol() = 'sst') THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'No tiene permisos para aplicar descuentos de EPP';
  END IF;

  SELECT tipo, estado INTO v_tipo, v_estado
  FROM public.formularios
  WHERE id = p_formulario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Formulario no encontrado';
  END IF;

  IF v_tipo <> 'entrega_epp' THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Solo un cargo de entrega de EPP puede descontar inventario';
  END IF;

  IF v_estado <> 'firmado' THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Solo un cargo firmado puede descontar inventario';
  END IF;

  -- Serializa contra movimientos manuales concurrentes sobre los mismos ítems.
  PERFORM 1
  FROM public.epp_inventario i
  WHERE i.id IN (
    SELECT inventario_id FROM public.epp_entrega_items
    WHERE formulario_id = p_formulario_id AND inventario_id IS NOT NULL
  )
  FOR UPDATE;

  -- Reversa: hace la operación idempotente y resuelve la re-emisión (cambiar
  -- cantidades y volver a firmar el mismo cargo) en un solo camino, sin dejar
  -- movimientos duplicados.
  DELETE FROM public.epp_movimientos WHERE formulario_id = p_formulario_id;

  FOR v_item IN
    SELECT it.inventario_id, it.cantidad, it.fecha_recepcion,
           e.empleado_id, e.trabajador_nombre, f.codigo_consecutivo
    FROM public.epp_entrega_items it
    JOIN public.epp_entregas e ON e.formulario_id = it.formulario_id
    JOIN public.formularios f  ON f.id = it.formulario_id
    WHERE it.formulario_id = p_formulario_id
      AND it.inventario_id IS NOT NULL
  LOOP
    INSERT INTO public.epp_movimientos (
      inventario_id, tipo, cantidad, fecha, motivo, entregado_a, empleado_id, formulario_id, registrado_por
    ) VALUES (
      v_item.inventario_id,
      'salida',
      -- El cargo admite decimales (NUMERIC(6,2), p. ej. medio par no aplica
      -- en la práctica pero el campo lo permite); el ledger es entero.
      GREATEST(CEIL(v_item.cantidad)::INTEGER, 1),
      v_item.fecha_recepcion,
      'Cargo de entrega ' || COALESCE(v_item.codigo_consecutivo, p_formulario_id::TEXT),
      v_item.trabajador_nombre,
      v_item.empleado_id,
      p_formulario_id,
      auth.uid()
    );

    v_afectadas := v_afectadas + 1;
  END LOOP;

  RETURN v_afectadas;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aplicar_salidas_epp_formulario(UUID) TO authenticated;

COMMENT ON FUNCTION public.aplicar_salidas_epp_formulario IS
  'Descuenta del inventario del proyecto los elementos conciliados de un cargo de EPP firmado. Reversa y vuelve a aplicar en cada llamada (idempotente ante re-emisión). Sin validación de saldo negativo: la entrega física ya ocurrió. Solo super_admin o sst.';
