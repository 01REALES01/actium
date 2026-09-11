-- =============================================================================
-- ACTIUM | Firma digital del usuario
-- =============================================================================
-- Las firmas se trazaban siempre con el dedo. Quien ya tiene su firma escaneada
-- en una imagen tenía que volver a dibujarla en cada documento, y el trazo
-- hecho con el dedo en obra nunca iguala a la firma real en un documento
-- controlado como un WPS.
--
-- Se guarda como data URL en columna y no en Storage a propósito: el generador
-- de PDF (@react-pdf/renderer) ya consume data URLs y los formatos guardan sus
-- firmas así dentro del JSON de respaldo. En Storage habría que firmar una URL
-- y salir a la red para dibujar un PNG de decenas de kilobytes. La imagen se
-- recorta y se limita a 800 px de lado en el navegador antes de llegar aquí
-- (src/lib/firma.ts), y la acción que la escribe la topa en 200 KB.
--
-- Sin política nueva de RLS: la escritura pasa por el service role después de
-- resolver la sesión, y el id sale de auth.getUser(), nunca del cliente
-- (src/lib/actions/perfil.ts).
-- =============================================================================

ALTER TABLE public.usuarios
  ADD COLUMN firma_png TEXT;

COMMENT ON COLUMN public.usuarios.firma_png IS
  'Firma del usuario como data URL PNG con fondo transparente, para estamparla en los documentos que él mismo firma. NULL si no ha cargado ninguna. No es firma electrónica certificada según la Ley 527 de 1999.';
