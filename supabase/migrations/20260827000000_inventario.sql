-- =============================================================================
-- ACTIUM | Módulo Inventario — Herramientas y EPP
-- =============================================================================
-- Dos inventarios con modelos deliberadamente distintos, porque el negocio es
-- distinto:
--
-- 1) HERRAMIENTAS — inventario maestro, propiedad de ACTIUM. Un catálogo de
--    tipos (`herramientas_catalogo`) y debajo las unidades físicas serializadas
--    (`herramienta_unidades`). Ninguna de las dos lleva `empresa_id`, y es a
--    propósito: la herramienta no pertenece a una empresa cliente, sino a
--    Actium. Los proyectos de los distintos clientes son solo destinos por los
--    que la unidad pasa, de modo que la misma pulidora puede ir hoy a una obra
--    de la Empresa X y mañana a una de la Empresa Y. Colgar el catálogo de
--    `empresa_id` convertiría ese movimiento — el caso de uso principal — en
--    una violación de tenant.
--
-- 2) EPP — inventario por proyecto (`epp_inventario`), que cada obra alimenta
--    según su necesidad.
--
-- El aislamiento que normalmente daría `empresa_id` aquí lo da el acceso: TODO
-- el módulo es exclusivo de `super_admin`, tanto en RLS como en la navegación.
-- Sin eso, un usuario cliente podría ver en qué obra de un competidor está cada
-- unidad. Si más adelante se abre la lectura a roles cliente, el camino es
-- relajar solo las policies de SELECT con `auth_puede_ver_proyecto(proyecto_id)`,
-- nunca reintroducir `empresa_id`.
--
-- La disponibilidad NO se almacena como contador: se deriva del ledger de
-- préstamos (`herramienta_movimientos`), y el invariante "una unidad no puede
-- estar en dos proyectos a la vez" lo garantiza un índice parcial único, no la
-- aplicación.
-- =============================================================================

-- =============================================================================
-- 1. Enums
-- =============================================================================
-- Son tipos nuevos (no `ALTER TYPE ... ADD VALUE`), así que pueden usarse en
-- esta misma transacción sin la restricción de PostgreSQL que sí aplica al
-- agregar valores a un enum existente.

CREATE TYPE public.herramienta_estado AS ENUM (
  'disponible',    -- en bodega, lista para asignar
  'asignada',      -- prestada a un proyecto (tiene movimiento abierto)
  'mantenimiento', -- fuera de servicio temporalmente
  'baja',          -- dada de baja definitivamente
  'perdida'        -- extraviada o no devuelta
);

CREATE TYPE public.herramienta_condicion AS ENUM ('bueno', 'regular', 'malo');

CREATE TYPE public.epp_movimiento_tipo AS ENUM (
  'ingreso',  -- entra stock al proyecto (compra, traslado)
  'salida',   -- sale stock (entrega a trabajador, consumo, baja)
  'ajuste'    -- corrección de conteo; único tipo que admite cantidad negativa
);

COMMENT ON TYPE public.herramienta_estado IS
  'Estado de una unidad física de herramienta. `asignada` implica proyecto_id no nulo (ver chk_unidad_estado_proyecto).';
COMMENT ON TYPE public.herramienta_condicion IS
  'Condición en que una herramienta vuelve de obra. `malo` la envía automáticamente a mantenimiento.';
COMMENT ON TYPE public.epp_movimiento_tipo IS
  'Tipo de movimiento de stock de EPP en un proyecto.';

-- =============================================================================
-- 2. herramientas_catalogo — el TIPO de herramienta
-- =============================================================================
-- Un renglón por modelo de herramienta ("Pulidora Bosch GWS 9\""), no por
-- unidad física. Los KPIs agregados salen de aquí; el detalle, de las unidades.

CREATE TABLE public.herramientas_catalogo (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  categoria     TEXT,
  marca         TEXT,
  descripcion   TEXT,
  unidad_medida TEXT NOT NULL DEFAULT 'UND.',
  foto_path     TEXT,               -- reservado: sin UI de carga en esta fase
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,

  CONSTRAINT chk_catalogo_nombre_no_vacio CHECK (length(trim(nombre)) > 0)
);

-- Unicidad global e insensible a mayúsculas: el catálogo es uno solo para todo
-- Actium, así que no debe haber "Pulidora Bosch" y "pulidora bosch" a la vez.
CREATE UNIQUE INDEX uq_herramientas_catalogo_nombre
  ON public.herramientas_catalogo (lower(nombre))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_herramientas_catalogo_categoria
  ON public.herramientas_catalogo (categoria)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_herramientas_catalogo_nombre_trgm
  ON public.herramientas_catalogo USING GIN (nombre gin_trgm_ops);

CREATE TRIGGER trg_herramientas_catalogo_updated_at
  BEFORE UPDATE ON public.herramientas_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.herramientas_catalogo IS
  'Catálogo maestro de tipos de herramienta, propiedad de Actium. Sin empresa_id a propósito: las unidades circulan entre proyectos de distintas empresas cliente.';
COMMENT ON COLUMN public.herramientas_catalogo.foto_path IS
  'Reservado para la foto del tipo de herramienta. Sin bucket ni UI en esta fase.';
COMMENT ON COLUMN public.herramientas_catalogo.activo IS
  'FALSE = tipo descontinuado, sigue visible con su historial. Distinto de deleted_at (archivado).';

-- =============================================================================
-- 3. herramienta_unidades — la unidad física serializada
-- =============================================================================
-- `estado` y `proyecto_id` son una CACHÉ del ledger, mantenida exclusivamente
-- por las RPCs asignar_herramienta / devolver_herramienta. La verdad histórica
-- vive en herramienta_movimientos.

CREATE TABLE public.herramienta_unidades (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogo_id       UUID NOT NULL REFERENCES public.herramientas_catalogo(id) ON DELETE CASCADE,
  codigo            TEXT NOT NULL,   -- placa interna, la asigna el cliente (p. ej. HRM-0042)
  serial            TEXT,            -- serial de fábrica
  estado            public.herramienta_estado NOT NULL DEFAULT 'disponible',
  proyecto_id       UUID REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  fecha_adquisicion DATE,
  costo_adquisicion NUMERIC(14,2) CHECK (costo_adquisicion IS NULL OR costo_adquisicion >= 0),
  notas             TEXT,
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,

  CONSTRAINT chk_unidad_codigo_no_vacio CHECK (length(trim(codigo)) > 0),

  -- Coherencia entre la caché y la realidad: una unidad está asignada si y solo
  -- si apunta a un proyecto. Evita el estado imposible "asignada pero en bodega"
  -- y "disponible pero en obra".
  CONSTRAINT chk_unidad_estado_proyecto
    CHECK ((estado = 'asignada') = (proyecto_id IS NOT NULL))
);

-- Código único en todo el inventario (no por empresa: el inventario es uno).
CREATE UNIQUE INDEX uq_herramienta_unidades_codigo
  ON public.herramienta_unidades (lower(codigo))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_herramienta_unidades_catalogo_estado
  ON public.herramienta_unidades (catalogo_id, estado)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_herramienta_unidades_proyecto
  ON public.herramienta_unidades (proyecto_id)
  WHERE proyecto_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_herramienta_unidades_updated_at
  BEFORE UPDATE ON public.herramienta_unidades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.herramienta_unidades IS
  'Unidad física de herramienta, con placa propia. proyecto_id puede apuntar a un proyecto de CUALQUIER empresa: es justamente lo que el modelo debe permitir.';
COMMENT ON COLUMN public.herramienta_unidades.codigo IS
  'Placa interna que asigna el cliente. Las herramientas suelen llegar ya marcadas de bodega, por eso no se genera consecutivo automático.';
COMMENT ON COLUMN public.herramienta_unidades.proyecto_id IS
  'Ubicación actual. NULL = bodega. Caché del movimiento abierto en herramienta_movimientos; solo la escriben asignar_herramienta y devolver_herramienta.';
COMMENT ON COLUMN public.herramienta_unidades.estado IS
  'Caché del ledger. Coherente con proyecto_id por chk_unidad_estado_proyecto.';

-- =============================================================================
-- 4. herramienta_movimientos — ledger de préstamos
-- =============================================================================
-- Un renglón por salida a obra. `fecha_devolucion IS NULL` marca el préstamo
-- abierto (la herramienta está en obra ahora mismo).

CREATE TABLE public.herramienta_movimientos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id            UUID NOT NULL REFERENCES public.herramienta_unidades(id) ON DELETE CASCADE,
  proyecto_id          UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  fecha_salida         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responsable_id       UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  responsable_nombre   TEXT,   -- para responsables que no son usuarios del sistema
  notas_salida         TEXT,
  fecha_devolucion     TIMESTAMPTZ,
  condicion_devolucion public.herramienta_condicion,
  notas_devolucion     TEXT,
  registrado_por       UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_movimiento_fechas
    CHECK (fecha_devolucion IS NULL OR fecha_devolucion >= fecha_salida),

  -- Un movimiento cerrado debe decir en qué condición volvió la herramienta.
  CONSTRAINT chk_movimiento_condicion
    CHECK (
      (fecha_devolucion IS NULL AND condicion_devolucion IS NULL)
      OR (fecha_devolucion IS NOT NULL AND condicion_devolucion IS NOT NULL)
    )
);

-- PIEZA CLAVE DEL MÓDULO. Impide físicamente que una unidad tenga dos préstamos
-- abiertos a la vez. Sin esto, dos asignaciones concurrentes dejarían la misma
-- pulidora "en obra" en dos proyectos y el disponible dejaría de cuadrar; con
-- esto, el invariante no depende de que la aplicación se acuerde de validarlo.
CREATE UNIQUE INDEX uq_herramienta_movimiento_abierto
  ON public.herramienta_movimientos (unidad_id)
  WHERE fecha_devolucion IS NULL;

CREATE INDEX idx_herramienta_movimientos_unidad
  ON public.herramienta_movimientos (unidad_id, fecha_salida DESC);

CREATE INDEX idx_herramienta_movimientos_proyecto
  ON public.herramienta_movimientos (proyecto_id, fecha_salida DESC);

COMMENT ON TABLE public.herramienta_movimientos IS
  'Ledger de préstamos de herramienta a proyectos. fecha_devolucion NULL = préstamo abierto. Nunca se borra: es el historial de la unidad.';
COMMENT ON INDEX public.uq_herramienta_movimiento_abierto IS
  'Invariante del módulo: una unidad no puede estar prestada a dos proyectos a la vez. Garantía de base de datos, no de aplicación.';

-- =============================================================================
-- 5. epp_inventario — stock de EPP por proyecto
-- =============================================================================
-- A diferencia de las herramientas, el EPP es consumible y pertenece a la obra.
-- Por eso cuelga de proyecto_id y se lleva por cantidad, no por unidad.

CREATE TABLE public.epp_inventario (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id   UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  elemento_id   TEXT,   -- id del catálogo ELEMENTOS_EPP (src/constants/entrega-epp.ts)
  nombre        TEXT NOT NULL,
  unidad        TEXT NOT NULL DEFAULT 'UND.' CHECK (unidad IN ('UND.', 'PAR.')),
  talla         TEXT,
  stock_minimo  INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,

  CONSTRAINT chk_epp_nombre_no_vacio CHECK (length(trim(nombre)) > 0)
);

-- Un mismo elemento puede repetirse por talla (botas 40 y botas 42 son filas
-- distintas), pero no duplicarse dentro de la misma talla.
CREATE UNIQUE INDEX uq_epp_inventario_item
  ON public.epp_inventario (proyecto_id, lower(nombre), coalesce(talla, ''))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_epp_inventario_proyecto
  ON public.epp_inventario (proyecto_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_epp_inventario_updated_at
  BEFORE UPDATE ON public.epp_inventario
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.epp_inventario IS
  'Ítem de EPP con stock en un proyecto. El saldo no se guarda: se deriva de epp_movimientos (ver vw_epp_saldos).';
COMMENT ON COLUMN public.epp_inventario.elemento_id IS
  'Id del catálogo ELEMENTOS_EPP cuando la fila corresponde a un elemento del formato SST. Gancho para vincular los cargos de entrega en la fase 2.';
COMMENT ON COLUMN public.epp_inventario.stock_minimo IS
  'Umbral de alerta. 0 = sin alerta.';

-- =============================================================================
-- 6. epp_movimientos — entradas y salidas de EPP
-- =============================================================================

CREATE TABLE public.epp_movimientos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id  UUID NOT NULL REFERENCES public.epp_inventario(id) ON DELETE CASCADE,
  tipo           public.epp_movimiento_tipo NOT NULL,
  cantidad       INTEGER NOT NULL,
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo         TEXT,
  entregado_a    TEXT,
  empleado_id    UUID REFERENCES public.empleados(id) ON DELETE SET NULL,
  formulario_id  UUID REFERENCES public.formularios(id) ON DELETE SET NULL,
  registrado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ingresos y salidas siempre en positivo (el signo lo da el tipo). Solo el
  -- ajuste admite negativo, para corregir un conteo hacia abajo.
  CONSTRAINT chk_epp_movimiento_cantidad
    CHECK (
      (tipo IN ('ingreso', 'salida') AND cantidad > 0)
      OR (tipo = 'ajuste' AND cantidad <> 0)
    )
);

CREATE INDEX idx_epp_movimientos_inventario
  ON public.epp_movimientos (inventario_id, fecha DESC);

CREATE INDEX idx_epp_movimientos_formulario
  ON public.epp_movimientos (formulario_id)
  WHERE formulario_id IS NOT NULL;

COMMENT ON TABLE public.epp_movimientos IS
  'Ledger de stock de EPP. El saldo de un ítem es la suma con signo de sus movimientos.';
COMMENT ON COLUMN public.epp_movimientos.formulario_id IS
  'Cargo de Entrega de EPP (formularios.tipo = entrega_epp) que originó la salida. Sin uso en esta fase: es el punto de anclaje para que en la fase 2 cada cargo firmado descuente stock automáticamente.';
COMMENT ON COLUMN public.epp_movimientos.cantidad IS
  'Positiva para ingreso y salida (el signo lo da el tipo). Con signo para ajuste.';

-- =============================================================================
-- 7. Vistas de agregación
-- =============================================================================
-- security_invoker = true para que la RLS del usuario aplique dentro de la
-- vista (ver 20260709053010_fix_security_invoker_views.sql).

CREATE VIEW public.vw_herramientas_disponibilidad
WITH (security_invoker = true) AS
SELECT
  c.id                AS catalogo_id,
  c.nombre,
  c.categoria,
  c.marca,
  c.unidad_medida,
  c.activo,
  COUNT(u.id)                                                    AS total,
  COUNT(u.id) FILTER (WHERE u.estado = 'disponible')             AS disponibles,
  COUNT(u.id) FILTER (WHERE u.estado = 'asignada')               AS asignadas,
  COUNT(u.id) FILTER (WHERE u.estado = 'mantenimiento')          AS en_mantenimiento,
  COUNT(u.id) FILTER (WHERE u.estado IN ('baja', 'perdida'))     AS fuera_de_servicio
FROM public.herramientas_catalogo c
LEFT JOIN public.herramienta_unidades u
  ON u.catalogo_id = c.id AND u.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.nombre, c.categoria, c.marca, c.unidad_medida, c.activo;

COMMENT ON VIEW public.vw_herramientas_disponibilidad IS
  'Disponibilidad agregada por tipo de herramienta. El disponible se deriva del estado de las unidades, nunca de un contador almacenado.';

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
  'Saldo de cada ítem de EPP por proyecto, derivado del ledger. bajo_minimo marca los que tocaron o cruzaron su umbral de alerta.';

-- =============================================================================
-- 8. RPCs de mutación
-- =============================================================================
-- SECURITY DEFINER con guard interno, molde de eliminar_incidente_definitivo.
-- Concentran las reglas que no se pueden expresar como constraint: qué estados
-- admiten asignación, a dónde vuelve una herramienta según su condición, y que
-- una salida de EPP no deje saldo negativo.

CREATE OR REPLACE FUNCTION public.asignar_herramienta(
  p_unidad_id          UUID,
  p_proyecto_id        UUID,
  p_responsable_id     UUID DEFAULT NULL,
  p_responsable_nombre TEXT DEFAULT NULL,
  p_notas              TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_estado        public.herramienta_estado;
  v_movimiento_id UUID;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede asignar herramientas';
  END IF;

  -- FOR UPDATE serializa dos asignaciones concurrentes de la misma unidad; el
  -- índice único parcial es la red de seguridad si aun así se colaran.
  SELECT estado INTO v_estado
  FROM public.herramienta_unidades
  WHERE id = p_unidad_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Herramienta no encontrada';
  END IF;

  IF v_estado <> 'disponible' THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'La herramienta no está disponible para asignar (estado actual: ' || v_estado::TEXT || ')';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.proyectos WHERE id = p_proyecto_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Proyecto no encontrado';
  END IF;

  INSERT INTO public.herramienta_movimientos (
    unidad_id, proyecto_id, responsable_id, responsable_nombre, notas_salida, registrado_por
  ) VALUES (
    p_unidad_id, p_proyecto_id, p_responsable_id, NULLIF(trim(p_responsable_nombre), ''),
    NULLIF(trim(p_notas), ''), auth.uid()
  )
  RETURNING id INTO v_movimiento_id;

  UPDATE public.herramienta_unidades
  SET estado = 'asignada', proyecto_id = p_proyecto_id
  WHERE id = p_unidad_id;

  RETURN v_movimiento_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.asignar_herramienta(UUID, UUID, UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.asignar_herramienta IS
  'Presta una unidad a un proyecto: abre el movimiento y actualiza la caché de la unidad. El proyecto puede ser de cualquier empresa. Solo super_admin.';

CREATE OR REPLACE FUNCTION public.devolver_herramienta(
  p_unidad_id UUID,
  p_condicion public.herramienta_condicion,
  p_notas     TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_movimiento_id UUID;
  v_nuevo_estado  public.herramienta_estado;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede registrar devoluciones';
  END IF;

  SELECT id INTO v_movimiento_id
  FROM public.herramienta_movimientos
  WHERE unidad_id = p_unidad_id AND fecha_devolucion IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002',
      MESSAGE = 'La herramienta no tiene un préstamo abierto que devolver';
  END IF;

  UPDATE public.herramienta_movimientos
  SET fecha_devolucion     = NOW(),
      condicion_devolucion = p_condicion,
      notas_devolucion     = NULLIF(trim(p_notas), '')
  WHERE id = v_movimiento_id;

  -- Una herramienta que vuelve en mal estado no puede volver a salir sin pasar
  -- por taller; el sistema lo impone en vez de confiar en que alguien lo marque.
  v_nuevo_estado := CASE WHEN p_condicion = 'malo' THEN 'mantenimiento'::public.herramienta_estado
                         ELSE 'disponible'::public.herramienta_estado END;

  UPDATE public.herramienta_unidades
  SET estado = v_nuevo_estado, proyecto_id = NULL
  WHERE id = p_unidad_id;

  RETURN v_movimiento_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.devolver_herramienta(UUID, public.herramienta_condicion, TEXT) TO authenticated;

COMMENT ON FUNCTION public.devolver_herramienta IS
  'Cierra el préstamo abierto de una unidad. Vuelve a disponible, o a mantenimiento si la condición es mala. Solo super_admin.';

CREATE OR REPLACE FUNCTION public.registrar_movimiento_epp(
  p_inventario_id UUID,
  p_tipo          public.epp_movimiento_tipo,
  p_cantidad      INTEGER,
  p_fecha         DATE DEFAULT NULL,
  p_motivo        TEXT DEFAULT NULL,
  p_entregado_a   TEXT DEFAULT NULL,
  p_empleado_id   UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_saldo         INTEGER;
  v_delta         INTEGER;
  v_movimiento_id UUID;
BEGIN
  IF NOT public.auth_es_super_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo super_admin puede registrar movimientos de EPP';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.epp_inventario WHERE id = p_inventario_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Elemento de EPP no encontrado';
  END IF;

  v_delta := CASE WHEN p_tipo = 'salida' THEN -p_cantidad ELSE p_cantidad END;

  SELECT COALESCE(SUM(
    CASE tipo WHEN 'ingreso' THEN cantidad WHEN 'salida' THEN -cantidad ELSE cantidad END
  ), 0)
  INTO v_saldo
  FROM public.epp_movimientos
  WHERE inventario_id = p_inventario_id;

  IF v_saldo + v_delta < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'El movimiento dejaría el saldo en negativo. Saldo disponible: ' || v_saldo::TEXT;
  END IF;

  INSERT INTO public.epp_movimientos (
    inventario_id, tipo, cantidad, fecha, motivo, entregado_a, empleado_id, registrado_por
  ) VALUES (
    p_inventario_id, p_tipo, p_cantidad, COALESCE(p_fecha, CURRENT_DATE),
    NULLIF(trim(p_motivo), ''), NULLIF(trim(p_entregado_a), ''), p_empleado_id, auth.uid()
  )
  RETURNING id INTO v_movimiento_id;

  RETURN v_movimiento_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_movimiento_epp(UUID, public.epp_movimiento_tipo, INTEGER, DATE, TEXT, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION public.registrar_movimiento_epp IS
  'Registra un ingreso, salida o ajuste de EPP validando que el saldo no quede negativo. Solo super_admin.';

-- =============================================================================
-- 9. RLS — módulo exclusivo de super_admin
-- =============================================================================
-- Una sola condición en las cinco tablas. Es la contrapartida de no tener
-- empresa_id: como el inventario no está segmentado por tenant, no puede
-- exponerse a usuarios de un tenant. Si algún día se abre la lectura a roles
-- cliente, se relajan SOLO los SELECT con auth_puede_ver_proyecto(proyecto_id),
-- que limita a las unidades que están en obras suyas.

ALTER TABLE public.herramientas_catalogo   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.herramienta_unidades    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.herramienta_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epp_inventario          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epp_movimientos         ENABLE ROW LEVEL SECURITY;

-- herramientas_catalogo
CREATE POLICY "herramientas_catalogo_select" ON public.herramientas_catalogo
  FOR SELECT USING (public.auth_es_super_admin() AND deleted_at IS NULL);
CREATE POLICY "herramientas_catalogo_insert" ON public.herramientas_catalogo
  FOR INSERT WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "herramientas_catalogo_update" ON public.herramientas_catalogo
  FOR UPDATE USING (public.auth_es_super_admin()) WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "herramientas_catalogo_delete" ON public.herramientas_catalogo
  FOR DELETE USING (public.auth_es_super_admin());

-- herramienta_unidades
CREATE POLICY "herramienta_unidades_select" ON public.herramienta_unidades
  FOR SELECT USING (public.auth_es_super_admin() AND deleted_at IS NULL);
CREATE POLICY "herramienta_unidades_insert" ON public.herramienta_unidades
  FOR INSERT WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "herramienta_unidades_update" ON public.herramienta_unidades
  FOR UPDATE USING (public.auth_es_super_admin()) WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "herramienta_unidades_delete" ON public.herramienta_unidades
  FOR DELETE USING (public.auth_es_super_admin());

-- herramienta_movimientos (sin deleted_at: el historial no se archiva)
CREATE POLICY "herramienta_movimientos_select" ON public.herramienta_movimientos
  FOR SELECT USING (public.auth_es_super_admin());
CREATE POLICY "herramienta_movimientos_insert" ON public.herramienta_movimientos
  FOR INSERT WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "herramienta_movimientos_update" ON public.herramienta_movimientos
  FOR UPDATE USING (public.auth_es_super_admin()) WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "herramienta_movimientos_delete" ON public.herramienta_movimientos
  FOR DELETE USING (public.auth_es_super_admin());

-- epp_inventario
CREATE POLICY "epp_inventario_select" ON public.epp_inventario
  FOR SELECT USING (public.auth_es_super_admin() AND deleted_at IS NULL);
CREATE POLICY "epp_inventario_insert" ON public.epp_inventario
  FOR INSERT WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "epp_inventario_update" ON public.epp_inventario
  FOR UPDATE USING (public.auth_es_super_admin()) WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "epp_inventario_delete" ON public.epp_inventario
  FOR DELETE USING (public.auth_es_super_admin());

-- epp_movimientos
CREATE POLICY "epp_movimientos_select" ON public.epp_movimientos
  FOR SELECT USING (public.auth_es_super_admin());
CREATE POLICY "epp_movimientos_insert" ON public.epp_movimientos
  FOR INSERT WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "epp_movimientos_update" ON public.epp_movimientos
  FOR UPDATE USING (public.auth_es_super_admin()) WITH CHECK (public.auth_es_super_admin());
CREATE POLICY "epp_movimientos_delete" ON public.epp_movimientos
  FOR DELETE USING (public.auth_es_super_admin());
