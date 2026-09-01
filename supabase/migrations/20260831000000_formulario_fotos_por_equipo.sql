-- =============================================================================
-- ACTIUM | Registro fotográfico por equipo (preoperacional v2)
-- =============================================================================
-- La primera entrega de registro fotográfico (20260829000000_formulario_fotos.sql)
-- dejó una galería única por formulario. El cliente pidió, después de verla en
-- uso, algo más exigente: "una pieza, una foto" — cada equipo inspeccionado
-- (taladro 2, extintor 3...) lleva su propia foto, y esa foto sale en el PDF.
--
-- Se agregan dos columnas nullable en vez de crear tabla nueva: la fila ya
-- tiene todo lo que una foto de equipo necesita (formulario_id, storage_path,
-- subido_por, uploaded_at). Ambas en NULL siguen significando "foto general
-- del formulario" — el comportamiento de la primera entrega, que usan hoy la
-- galería general del preoperacional y la charla de seguridad. No se toca.
--
-- `herramienta_id` es el id del catálogo (TEXT, no FK: el catálogo vive en
-- código — src/constants/preoperacional.ts — no en base de datos).
-- `equipo_uid` es el uid que ahora lleva cada EquipoPreop dentro del payload
-- JSON. La relación foto↔equipo no puede vivir en ese JSON (Storage, no
-- Postgres): quedaría inconsultable y no se podría limpiar al borrar.
-- =============================================================================

ALTER TABLE public.formulario_fotos
  ADD COLUMN herramienta_id TEXT,
  ADD COLUMN equipo_uid     TEXT;

COMMENT ON COLUMN public.formulario_fotos.herramienta_id IS
  'Id del catálogo de herramientas del preoperacional (taladro, extintor...). NULL = foto general del formulario, no atada a un equipo.';
COMMENT ON COLUMN public.formulario_fotos.equipo_uid IS
  'Uid del equipo dentro del payload JSON del formulario (EquipoPreop.uid). NULL = foto general del formulario.';

-- "Exactamente una foto por equipo" como invariante de base, no como mera
-- convención de la UI: una segunda foto para el mismo equipo debe reemplazar
-- a la primera (la acción de subida borra antes de insertar), nunca coexistir.
CREATE UNIQUE INDEX uq_formulario_fotos_equipo
  ON public.formulario_fotos (formulario_id, herramienta_id, equipo_uid)
  WHERE equipo_uid IS NOT NULL;

-- Las políticas RLS de la tabla no cambian: siguen heredando el acceso del
-- formulario padre vía el mismo macro (auth_tiene_acceso_proyecto), sin
-- distinguir foto general de foto de equipo.
