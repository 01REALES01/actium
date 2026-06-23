-- Agregar campos para la gráfica del proyecto
ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS etiqueta_eje_y TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_total_cantidad NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.proyectos.etiqueta_eje_y IS 'Nombre descriptivo del eje Y de la gráfica (ej: Acero fabricado, Excavación realizada)';
COMMENT ON COLUMN public.proyectos.meta_total_cantidad IS 'Meta total en unidades del proyecto (ej: 500 si la unidad es MT)';
