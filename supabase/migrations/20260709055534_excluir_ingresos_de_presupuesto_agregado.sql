-- =============================================================================
-- ACTIUM | Fix — vw_proyectos_finanzas excluye categoria 'ingresos'
-- =============================================================================
-- Los KPIs de presupuesto (Presupuestado/Ejecutado/Disponible) no deben
-- incluir rubros de categoria 'ingresos' — esa cifra es una meta de cobro,
-- no un techo de gasto, y mezclarla infla el "presupuestado" del proyecto.
-- Ingresos solo se refleja en Cuentas por Cobrar (y en su propia distribucion
-- dentro de vw_rubro_balance, que si sigue incluyendo todas las categorias).
-- =============================================================================
CREATE OR REPLACE VIEW public.vw_proyectos_finanzas AS
SELECT
  p.id            AS proyecto_id,
  p.empresa_id,
  p.nombre        AS proyecto_nombre,
  p.es_interno,
  p.estado,
  COALESCE(SUM(b.monto_maximo), 0) AS presupuesto_total,
  COALESCE(SUM(b.ejecutado), 0)    AS presupuesto_ejecutado,
  COALESCE(SUM(b.comprometido), 0) AS presupuesto_comprometido,
  COALESCE(SUM(b.disponible), 0)   AS presupuesto_disponible,
  ROUND(
    COALESCE(SUM(b.ejecutado), 0) / NULLIF(SUM(b.monto_maximo), 0) * 100,
    2
  ) AS porcentaje_ejecutado
FROM public.proyectos p
LEFT JOIN public.vw_rubro_balance b ON b.proyecto_id = p.id AND b.categoria <> 'ingresos'
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.empresa_id, p.nombre, p.es_interno, p.estado;

-- CREATE OR REPLACE VIEW resetea reloptions — hay que reaplicar
-- security_invoker cada vez que se reemplaza esta vista (ver 20260709053010).
ALTER VIEW public.vw_proyectos_finanzas SET (security_invoker = true);

COMMENT ON VIEW public.vw_proyectos_finanzas IS
  'Un proyecto por fila con su presupuesto agregado (suma de rubros de egreso, excluye categoria ingresos). Alimenta el listado de /finanzas/presupuesto.';
