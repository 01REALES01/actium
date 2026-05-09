-- =============================================================================
-- ACTIUM | 0006 — Control Presupuestal
-- =============================================================================
-- Rubros por proyecto con monto maximo. Los movimientos siguen un flujo de
-- aprobacion (solicitado -> aprobado -> ejecutado). auditoria_logs es
-- append-only: ningún rol puede hacer UPDATE/DELETE (garantizado en RLS 0009).
-- La view vw_rubro_balance alimenta las alertas de consumo presupuestal.
-- =============================================================================

-- =============================================================================
-- RUBROS
-- =============================================================================
CREATE TABLE public.rubros (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id     UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  monto_maximo    NUMERIC(15,2) NOT NULL CHECK (monto_maximo > 0),
  orden           SMALLINT NOT NULL DEFAULT 0,      -- Para ordenar en la UI
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (proyecto_id, nombre)
);

CREATE INDEX idx_rubros_proyecto ON public.rubros (proyecto_id) WHERE activo;

CREATE TRIGGER trg_rubros_updated_at
  BEFORE UPDATE ON public.rubros
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.rubros IS
  'Partida presupuestal de un proyecto. monto_maximo es el techo; movimientos ejecutados no pueden superarlo.';

-- =============================================================================
-- MOVIMIENTOS
-- =============================================================================
-- Un movimiento de tipo 'gasto' consume del rubro_destino_id.
-- Un 'traslado_entre_rubros' mueve monto de origen a destino.
-- Un 'ajuste' modifica el monto_maximo del rubro (requiere aprobacion ADMIN).
CREATE TABLE public.movimientos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id         UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  rubro_origen_id     UUID REFERENCES public.rubros(id) ON DELETE RESTRICT,
  rubro_destino_id    UUID NOT NULL REFERENCES public.rubros(id) ON DELETE RESTRICT,
  tipo                movimiento_tipo NOT NULL,
  monto               NUMERIC(15,2) NOT NULL CHECK (monto > 0),
  justificacion       TEXT NOT NULL,
  estado              movimiento_estado NOT NULL DEFAULT 'solicitado',
  solicitado_por      UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  aprobado_por        UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  aprobado_at         TIMESTAMPTZ,
  ejecutado_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Traslado requiere origen distinto al destino
  CONSTRAINT chk_traslado_rubros_distintos CHECK (
    tipo <> 'traslado_entre_rubros' OR rubro_origen_id <> rubro_destino_id
  ),
  -- Gasto y ajuste no tienen origen
  CONSTRAINT chk_gasto_sin_origen CHECK (
    tipo = 'traslado_entre_rubros' OR rubro_origen_id IS NULL
  )
);

CREATE INDEX idx_movimientos_proyecto ON public.movimientos (proyecto_id, created_at DESC);
CREATE INDEX idx_movimientos_rubro_destino ON public.movimientos (rubro_destino_id, estado);
CREATE INDEX idx_movimientos_estado ON public.movimientos (estado) WHERE estado IN ('solicitado', 'aprobado');

CREATE TRIGGER trg_movimientos_updated_at
  BEFORE UPDATE ON public.movimientos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.movimientos IS
  'Flujo: solicitado -> aprobado -> ejecutado (o rechazado). La validacion de techo presupuestal ocurre al ejecutar.';

-- Trigger: valida que ejecutar un gasto no supere el monto_maximo del rubro
CREATE OR REPLACE FUNCTION public.validar_techo_presupuestal()
RETURNS TRIGGER AS $$
DECLARE
  v_monto_maximo  NUMERIC(15,2);
  v_ejecutado     NUMERIC(15,2);
BEGIN
  -- Solo valida cuando pasa a estado 'ejecutado' y es un gasto
  IF NEW.estado <> 'ejecutado' OR NEW.tipo NOT IN ('gasto', 'traslado_entre_rubros') THEN
    RETURN NEW;
  END IF;
  IF OLD.estado = 'ejecutado' THEN
    RETURN NEW;  -- Idempotente: ya fue validado
  END IF;

  SELECT monto_maximo INTO v_monto_maximo
  FROM public.rubros
  WHERE id = NEW.rubro_destino_id;

  SELECT COALESCE(SUM(monto), 0) INTO v_ejecutado
  FROM public.movimientos
  WHERE rubro_destino_id = NEW.rubro_destino_id
    AND tipo IN ('gasto', 'traslado_entre_rubros')
    AND estado = 'ejecutado'
    AND id <> NEW.id;

  IF (v_ejecutado + NEW.monto) > v_monto_maximo THEN
    RAISE EXCEPTION
      'El movimiento supera el techo del rubro (disponible: %, solicitado: %)',
      v_monto_maximo - v_ejecutado,
      NEW.monto;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_techo_presupuestal
  BEFORE UPDATE OF estado ON public.movimientos
  FOR EACH ROW EXECUTE FUNCTION public.validar_techo_presupuestal();

-- =============================================================================
-- AUDITORIA_LOGS (append-only)
-- =============================================================================
-- Registra INSERT/UPDATE en movimientos. El RLS (0009) niega UPDATE/DELETE
-- a cualquier rol — esta tabla es inmutable una vez escrita.
CREATE TABLE public.auditoria_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla       TEXT NOT NULL,
  registro_id UUID NOT NULL,
  accion      TEXT NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id    UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  antes       JSONB,
  despues     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_registro ON public.auditoria_logs (tabla, registro_id, created_at DESC);
CREATE INDEX idx_auditoria_actor ON public.auditoria_logs (actor_id, created_at DESC);

COMMENT ON TABLE public.auditoria_logs IS
  'Log inmutable. RLS niega UPDATE/DELETE a todos los roles, incluido admin. Solo INSERT via trigger.';

-- Trigger de auditoria en movimientos
CREATE OR REPLACE FUNCTION public.audit_movimientos()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.auditoria_logs (tabla, registro_id, accion, actor_id, antes, despues)
  VALUES (
    'movimientos',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    COALESCE(NEW.aprobado_por, NEW.solicitado_por),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_movimientos
  AFTER INSERT OR UPDATE OR DELETE ON public.movimientos
  FOR EACH ROW EXECUTE FUNCTION public.audit_movimientos();

-- =============================================================================
-- VIEW: vw_rubro_balance
-- =============================================================================
-- Alimenta las alertas de consumo: 80% (warning), 90% (critical), 100% (blocked).
-- 'comprometido' = movimientos aprobados pendientes de ejecucion.
CREATE VIEW public.vw_rubro_balance AS
SELECT
  r.id                                                          AS rubro_id,
  r.proyecto_id,
  r.nombre,
  r.monto_maximo,
  COALESCE(SUM(m.monto) FILTER (
    WHERE m.estado = 'ejecutado'
      AND m.tipo IN ('gasto', 'traslado_entre_rubros')
  ), 0)                                                         AS ejecutado,
  COALESCE(SUM(m.monto) FILTER (
    WHERE m.estado = 'aprobado'
      AND m.tipo IN ('gasto', 'traslado_entre_rubros')
  ), 0)                                                         AS comprometido,
  r.monto_maximo
    - COALESCE(SUM(m.monto) FILTER (
        WHERE m.estado IN ('ejecutado', 'aprobado')
          AND m.tipo IN ('gasto', 'traslado_entre_rubros')
      ), 0)                                                     AS disponible,
  ROUND(
    COALESCE(SUM(m.monto) FILTER (
      WHERE m.estado = 'ejecutado'
        AND m.tipo IN ('gasto', 'traslado_entre_rubros')
    ), 0) / NULLIF(r.monto_maximo, 0) * 100,
    2
  )                                                             AS porcentaje_ejecutado
FROM public.rubros r
LEFT JOIN public.movimientos m ON m.rubro_destino_id = r.id
WHERE r.activo
GROUP BY r.id, r.proyecto_id, r.nombre, r.monto_maximo;

COMMENT ON VIEW public.vw_rubro_balance IS
  'Balance por rubro: ejecutado, comprometido (aprobado aun no ejecutado), disponible y porcentaje. Alimenta alertas 80/90/100%.';
