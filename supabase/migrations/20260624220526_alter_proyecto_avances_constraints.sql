-- 1. Eliminar la vista que depende de avance_real (usamos CASCADE por si acaso, aunque ya la dropeamos explícitamente)
DROP VIEW IF EXISTS public.vw_proyecto_resumen CASCADE;

-- 2. Eliminar las restricciones de validación "entre 0 y 100" ya que ahora permitimos unidades mayores (KG, Metros, Dinero, etc)
ALTER TABLE public.proyecto_avances DROP CONSTRAINT IF EXISTS proyecto_avances_avance_real_check;
ALTER TABLE public.proyecto_avances DROP CONSTRAINT IF EXISTS proyecto_avances_avance_proyectado_check;

-- 3. Ampliar la precisión numérica de (5,2) a (15,2) para soportar números de hasta miles de millones
ALTER TABLE public.proyecto_avances ALTER COLUMN avance_real TYPE NUMERIC(15,2);
ALTER TABLE public.proyecto_avances ALTER COLUMN avance_proyectado TYPE NUMERIC(15,2);

-- 4. Lo mismo para proyecto_metas por si acaso
ALTER TABLE public.proyecto_metas ALTER COLUMN avance_esperado TYPE NUMERIC(15,2);

-- 5. Recrear la vista vw_proyecto_resumen (usando la misma definición de ayer)
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
