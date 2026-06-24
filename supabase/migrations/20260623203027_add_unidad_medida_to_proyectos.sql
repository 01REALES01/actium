-- Añadir columna unidad_medida a la tabla proyectos
ALTER TABLE public.proyectos 
ADD COLUMN IF NOT EXISTS unidad_medida text NOT NULL DEFAULT 'MT';

-- Actualizar la vista vw_proyecto_resumen para incluir unidad_medida
DROP VIEW IF EXISTS public.vw_proyecto_resumen CASCADE;

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
  p.unidad_medida,
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
