-- =============================================================================
-- ACTIUM | Finanzas — nuevo estado 'anulado' para movimientos
-- =============================================================================
-- Va en su propia migración a propósito: Postgres no permite usar un valor de
-- enum recién agregado dentro de la misma transacción que lo agrega, y la
-- migración siguiente sí lo usa en sentencias DML (backfill retroactivo).
--
-- Semántica: 'rechazado' es "no se aprobó la solicitud"; 'anulado' es "se
-- ejecutó y luego se revirtió" (la factura que lo originó fue anulada). Las
-- vistas de flujo y balance filtran por estado = 'ejecutado', así que un
-- movimiento anulado deja de sumar sin borrar la fila del ledger.
-- =============================================================================

ALTER TYPE public.movimiento_estado ADD VALUE IF NOT EXISTS 'anulado';
