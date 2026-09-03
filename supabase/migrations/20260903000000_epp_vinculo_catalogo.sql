-- =============================================================================
-- ACTIUM | Universalidad de nombres: vincular epp_inventario con ELEMENTOS_EPP
-- =============================================================================
-- aplicar_salidas_epp_formulario (20260831000002_epp_descuento_por_cargo.sql)
-- solo descuenta filas del cargo que quedaron conciliadas con un ítem de
-- inventario, y entrega-epp-form.tsx solo ofrece esa conciliación agrupando
-- el inventario del proyecto por epp_inventario.elemento_id. El problema
-- reportado ("Casco" no se descuenta aunque existe en el inventario) es que
-- nunca hubo forma de poblar esa columna: el diálogo de creación de ítems
-- pedía el nombre como texto libre y no la enviaba. Esta migración repara los
-- datos existentes con un backfill conservador; la reparación de la captura
-- (selector de catálogo en el diálogo) va en el código de la aplicación.
-- =============================================================================

-- =============================================================================
-- 1. Backfill: vincular por coincidencia exacta de nombre normalizado
-- =============================================================================
-- Solo toca filas con elemento_id IS NULL. Solo cuando el nombre normalizado
-- (minúsculas, sin espacios sobrantes) coincide exactamente con uno de los 10
-- nombres del catálogo ELEMENTOS_EPP (src/constants/entrega-epp.ts). No
-- reescribe el nombre guardado: el ítem puede tener un rótulo comercial más
-- específico. Lo que no coincida queda igual que hoy (NULL) y aparece con el
-- aviso "Sin vincular al formato" en la UI para corrección manual.

UPDATE public.epp_inventario i
SET elemento_id = c.elemento_id
FROM (VALUES
  ('casco',          'casco'),
  ('barbiquejo',     'barbiquejo'),
  ('lentes',         'lentes de seguridad'),
  ('auditivos',      'protectores auditivos'),
  ('polo',           'polo o camisa manga larga'),
  ('pantalon',       'pantalon naranja con cintas reflectivas'),
  ('pantalon',       'pantalón naranja con cintas reflectivas'),
  ('guantes_cuero',  'guantes de cuero'),
  ('guantes_latex',  'guantes de latex/lana - multiflex'),
  ('guantes_latex',  'guantes de látex/lana - multiflex'),
  ('guantes_nitron', 'guantes de nitron'),
  ('guantes_nitron', 'guantes de nitrón'),
  ('zapato',         'zapato punta de acero')
) AS c(elemento_id, nombre_normalizado)
WHERE i.elemento_id IS NULL
  AND i.deleted_at IS NULL
  AND lower(trim(i.nombre)) = c.nombre_normalizado;

-- =============================================================================
-- 2. Índice de apoyo para el agrupamiento por elemento
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_epp_inventario_elemento
  ON public.epp_inventario (proyecto_id, elemento_id)
  WHERE deleted_at IS NULL AND elemento_id IS NOT NULL;
