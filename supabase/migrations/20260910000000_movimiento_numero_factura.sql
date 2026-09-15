-- =============================================================================
-- ACTIUM | Número de factura en movimientos
-- =============================================================================
-- El cliente diligencia manualmente el número de factura de cada movimiento
-- (no siempre coincide con el de la CxC/CxP asociada, y muchos movimientos no
-- tienen CxC/CxP). Como a veces aún no se la han emitido, se permite marcarla
-- como pendiente en vez de forzar un número. Editable en cualquier estado del
-- movimiento a través de una acción acotada solo a estas dos columnas.
-- =============================================================================

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS numero_factura TEXT,
  ADD COLUMN IF NOT EXISTS factura_pendiente BOOLEAN NOT NULL DEFAULT FALSE;
