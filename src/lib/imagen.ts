/**
 * Compresión de imágenes en el navegador, antes de subirlas.
 *
 * Existe por una razón concreta: las fotos viajan al servidor dentro de una
 * Server Action, y Next impone un límite al cuerpo de esas peticiones. Una foto
 * de cámara de celular pesa entre 3 y 8 MB y el uso real de estos formularios
 * es justamente desde el celular en obra. Sin comprimir, la subida falla.
 *
 * Redimensionar a 1600 px de lado mayor con calidad 0.75 deja una foto de ~300 KB
 * en la que todavía se lee la etiqueta de un extintor o la aguja de un manómetro,
 * que es lo que la evidencia necesita mostrar.
 *
 * No usa dependencias externas: createImageBitmap + canvas están en todos los
 * navegadores que soporta la aplicación.
 */

export type OpcionesCompresion = {
  /** Lado mayor máximo en píxeles. */
  maxLado?: number;
  /** Calidad JPEG, de 0 a 1. */
  calidad?: number;
};

/**
 * Devuelve una versión comprimida del archivo, o el archivo original si el
 * navegador no puede decodificarlo.
 *
 * El fallback no es defensivo por gusto: el HEIC de iPhone no se decodifica en
 * canvas en la mayoría de navegadores. En ese caso se sube el original, que el
 * bucket acepta, y es la validación de tamaño la que decide si pasa.
 */
export async function comprimirImagen(
  file: File,
  { maxLado = 1600, calidad = 0.75 }: OpcionesCompresion = {},
): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));

    // Ya es pequeña y está en un formato comprimido: recodificarla solo
    // degradaría la imagen sin ganar bytes.
    if (escala === 1 && file.size <= 1_000_000) return file;

    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // Fondo blanco: un PNG con transparencia queda con fondo negro al pasar a JPEG.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", calidad),
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], nombreJpeg(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

function nombreJpeg(nombre: string): string {
  const base = nombre.replace(/\.[^./\\]+$/, "");
  return `${base || "foto"}.jpg`;
}

/**
 * Reescala una imagen ya subida a un tamaño adecuado para incrustarla en un
 * PDF y la devuelve como data URL.
 *
 * Existe por separado de `comprimirImagen`: esta última prepara el archivo
 * para la subida (1600 px, deja el original si ya es pequeño), pero en el PDF
 * la foto de un equipo se muestra a ~200 pt de ancho — 900 px de fuente sobra,
 * y bajar a ese tamaño es lo que evita que un preoperacional de 19 equipos
 * (el caso real más grande medido en producción) genere un PDF de varios MB.
 * `@react-pdf/renderer` incrusta la imagen a su resolución original sin
 * importar el tamaño con que se dibuja, así que sin este paso el reescalado
 * nunca ocurriría.
 */
export async function aDataUrlParaPdf(
  origen: Blob,
  { maxLado = 900, calidad = 0.7 }: OpcionesCompresion = {},
): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(origen);
  } catch {
    return blobADataUrl(origen);
  }

  try {
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext("2d");
    if (!ctx) return blobADataUrl(origen);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    return canvas.toDataURL("image/jpeg", calidad);
  } catch {
    return blobADataUrl(origen);
  } finally {
    bitmap.close();
  }
}

function blobADataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
