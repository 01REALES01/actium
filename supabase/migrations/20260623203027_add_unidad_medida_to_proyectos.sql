-- Añadir columna unidad_medida a la tabla proyectos
ALTER TABLE public.proyectos 
ADD COLUMN unidad_medida text NOT NULL DEFAULT 'MT';

-- Actualizar la vista vw_proyecto_resumen para incluir unidad_medida
DROP VIEW IF EXISTS public.vw_proyecto_resumen CASCADE;

CREATE OR REPLACE VIEW public.vw_proyecto_resumen AS
SELECT 
    p.id as proyecto_id,
    p.empresa_id,
    p.subempresa_id,
    p.nombre,
    p.estado,
    p.fecha_inicio,
    p.fecha_fin_proyectada,
    p.presupuesto_total,
    p.unidad_medida,
    COALESCE(
        (SELECT SUM(m.monto) FROM movimientos m WHERE m.proyecto_id = p.id AND m.estado = 'aprobado' AND m.tipo = 'ingreso') -
        (SELECT SUM(m.monto) FROM movimientos m WHERE m.proyecto_id = p.id AND m.estado = 'aprobado' AND m.tipo = 'egreso'),
        0
    ) as presupuesto_ejecutado,
    COALESCE(
        (SELECT SUM(m.monto) FROM movimientos m WHERE m.proyecto_id = p.id AND m.estado = 'pendiente' AND m.tipo = 'egreso'),
        0
    ) as presupuesto_comprometido,
    CASE 
        WHEN p.presupuesto_total > 0 THEN 
            ROUND(COALESCE(
                (SELECT SUM(m.monto) FROM movimientos m WHERE m.proyecto_id = p.id AND m.estado = 'aprobado' AND m.tipo = 'ingreso') -
                (SELECT SUM(m.monto) FROM movimientos m WHERE m.proyecto_id = p.id AND m.estado = 'aprobado' AND m.tipo = 'egreso'),
                0
            ) / p.presupuesto_total * 100, 2)
        ELSE 0 
    END as porcentaje_ejecutado,
    (SELECT pa.avance_proyectado FROM proyecto_avances pa WHERE pa.proyecto_id = p.id ORDER BY pa.fecha DESC LIMIT 1) as avance_proyectado,
    (SELECT pa.avance_real FROM proyecto_avances pa WHERE pa.proyecto_id = p.id ORDER BY pa.fecha DESC LIMIT 1) as avance_real,
    (SELECT pa.fecha FROM proyecto_avances pa WHERE pa.proyecto_id = p.id ORDER BY pa.fecha DESC LIMIT 1) as avance_fecha,
    (SELECT COUNT(*) FROM incidentes i WHERE i.proyecto_id = p.id AND i.fecha >= (CURRENT_DATE - INTERVAL '30 days')) as incidentes_30d,
    (SELECT o.created_at FROM observaciones o WHERE o.proyecto_id = p.id ORDER BY o.created_at DESC LIMIT 1) as ultima_observacion_at
FROM 
    public.proyectos p
WHERE 
    p.deleted_at IS NULL;
