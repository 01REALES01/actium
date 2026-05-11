-- =============================================================================
-- ACTIUM | 0012 — Vistas de Resumen (Dashboard)
-- =============================================================================
-- Vistas que consolidan información operativa por proyecto / por empresa
-- para alimentar el home del Portal de Clientes y los KPIs del detalle.
-- Las vistas heredan RLS de las tablas base (proyectos, proyecto_avances,
-- vw_rubro_balance, incidentes), por lo que no requieren policies propias.
-- =============================================================================

-- =============================================================================
-- vw_proyecto_resumen
-- =============================================================================
-- Un row por proyecto con los KPIs del Portal:
--   - avance_real / avance_proyectado del último snapshot
--   - presupuesto_total y presupuesto_ejecutado (suma sobre vw_rubro_balance)
--   - porcentaje_ejecutado (0-100, NULL si no hay rubros)
--   - incidentes_30d (cuenta de incidentes en los últimos 30 días)
--   - ultima_observacion_at
CREATE OR REPLACE VIEW public.vw_proyecto_resumen AS
SELECT
  p.id                                                AS proyecto_id,
  p.empresa_id,
  p.subempresa_id,
  p.nombre,
  p.estado,
  p.fecha_inicio,
  p.fecha_fin_proyectada,
  p.presupuesto_total,
  ult.avance_real,
  ult.avance_proyectado,
  ult.fecha                                           AS avance_fecha,
  COALESCE(bal.ejecutado, 0)                          AS presupuesto_ejecutado,
  COALESCE(bal.comprometido, 0)                       AS presupuesto_comprometido,
  CASE
    WHEN p.presupuesto_total IS NULL OR p.presupuesto_total = 0 THEN NULL
    ELSE ROUND((COALESCE(bal.ejecutado, 0) / p.presupuesto_total) * 100, 2)
  END                                                 AS porcentaje_ejecutado,
  COALESCE(inc.incidentes_30d, 0)                     AS incidentes_30d,
  obs.ultima_observacion_at
FROM public.proyectos p
LEFT JOIN LATERAL (
  SELECT avance_real, avance_proyectado, fecha
    FROM public.proyecto_avances
   WHERE proyecto_id = p.id
   ORDER BY fecha DESC
   LIMIT 1
) ult ON TRUE
LEFT JOIN LATERAL (
  SELECT
    SUM(ejecutado)    AS ejecutado,
    SUM(comprometido) AS comprometido
    FROM public.vw_rubro_balance
   WHERE proyecto_id = p.id
) bal ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS incidentes_30d
    FROM public.incidentes
   WHERE proyecto_id = p.id
     AND fecha >= NOW() - INTERVAL '30 days'
) inc ON TRUE
LEFT JOIN LATERAL (
  SELECT MAX(created_at) AS ultima_observacion_at
    FROM public.observaciones
   WHERE proyecto_id = p.id
) obs ON TRUE
WHERE p.deleted_at IS NULL;

COMMENT ON VIEW public.vw_proyecto_resumen IS
  'KPIs por proyecto para el Portal. Hereda RLS de proyectos.';

-- =============================================================================
-- vw_dashboard_empresa
-- =============================================================================
-- Un row por empresa con totales agregados. Para el home del super_admin/admin.
CREATE OR REPLACE VIEW public.vw_dashboard_empresa AS
SELECT
  e.id                                                            AS empresa_id,
  e.nombre,
  COUNT(p.id) FILTER (WHERE p.estado = 'en_curso')                AS proyectos_en_curso,
  COUNT(p.id) FILTER (WHERE p.estado = 'completado')              AS proyectos_completados,
  COUNT(p.id)                                                     AS proyectos_total,
  COALESCE(SUM(p.presupuesto_total), 0)                           AS presupuesto_total_empresa,
  COALESCE(
    (SELECT SUM(ejecutado)
       FROM public.vw_rubro_balance b
       JOIN public.proyectos pr ON pr.id = b.proyecto_id
      WHERE pr.empresa_id = e.id
        AND pr.deleted_at IS NULL),
    0
  )                                                               AS presupuesto_ejecutado_empresa,
  (SELECT COUNT(*) FROM public.incidentes i
     JOIN public.proyectos pr ON pr.id = i.proyecto_id
    WHERE pr.empresa_id = e.id
      AND i.fecha >= NOW() - INTERVAL '30 days')                  AS incidentes_30d
FROM public.empresas e
LEFT JOIN public.proyectos p
  ON p.empresa_id = e.id AND p.deleted_at IS NULL
WHERE e.activa
GROUP BY e.id, e.nombre;

COMMENT ON VIEW public.vw_dashboard_empresa IS
  'Totales agregados por empresa para el home del Portal. Hereda RLS de empresas/proyectos.';
