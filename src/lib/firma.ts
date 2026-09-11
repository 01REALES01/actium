/**
 * Preparación de firmas antes de incrustarlas en un PDF.
 *
 * Existe por dos problemas medidos en los PDFs emitidos:
 *
 * 1. El lienzo de firma se captura entero, así que la tinta ocupa una fracción
 *    de su bitmap. Los PDFs dibujan la firma con `objectFit: "contain"` dentro
 *    de una caja fija (120x42 pt en soldadura, 150x64 en los formatos SST), y
 *    `contain` ajusta el BITMAP, no la tinta: una firma trazada en el centro
 *    del lienzo acaba impresa a un tercio del tamaño de su caja. Recortar el
 *    vacío es lo que hace que la firma llene el espacio que le corresponde.
 *
 * 2. La firma escaneada del usuario viene como tinta oscura sobre papel blanco
 *    OPACO. Incrustada tal cual, tapa la línea de firma con un recuadro blanco.
 *
 * No usa dependencias externas: canvas y createImageBitmap están en todos los
 * navegadores que soporta la aplicación, igual que en `imagen.ts`.
 */

/**
 * Alfa mínimo para que un píxel cuente al calcular la caja de recorte. Es más
 * alto que cero a propósito: el ruido de fondo de una foto deja píxeles casi
 * transparentes que inflarían el rectángulo hasta la imagen entera.
 */
const ALFA_CAJA = 32;

/** Por debajo de este lado no hay firma, hay un toque accidental. */
const LADO_MINIMO = 16;

/** Margen transparente alrededor del recorte, como fracción del lado mayor. */
const MARGEN = 0.06;

/**
 * Tope del lado mayor. A 800 px en una caja de 120 pt siguen siendo ~5 veces la
 * resolución de impresión, y el límite importa: en la entrega de EPP viaja una
 * firma por trabajador dentro del mismo cuerpo de Server Action, que Next
 * limita a 1 MB.
 */
const MAX_LADO = 800;

/** Umbrales de la rampa de luminancia: papel por encima, tinta por debajo. */
const LUZ_PAPEL = 235;
const LUZ_TINTA = 120;

/** Si más de esta fracción queda opaca, la imagen no es tinta sobre papel. */
const MAX_FRACCION_OPACA = 0.6;

/**
 * Alfa que le corresponde a un píxel de una firma escaneada, de 0 a 255.
 *
 * Es una rampa y no un umbral duro: un corte seco deja los bordes suavizados en
 * escalera y convierte una firma fina en un trazo dentado.
 *
 * El factor del alfa de ORIGEN es lo que salva al PNG que ya viene transparente:
 * sus píxeles vacíos son rgba(0,0,0,0), cuya luminancia es 0, o sea "tinta
 * negrísima". Sin ese factor el resultado sería un rectángulo negro sólido, que
 * es el fallo clásico de este código.
 */
export function alfaDeFirma(r: number, g: number, b: number, alfaOrigen: number): number {
  const luz = 0.299 * r + 0.587 * g + 0.114 * b;
  const alfaLuz = Math.min(1, Math.max(0, (LUZ_PAPEL - luz) / (LUZ_PAPEL - LUZ_TINTA)));
  return Math.round((alfaOrigen / 255) * alfaLuz * 255);
}

/**
 * Recorta el vacío alrededor de la tinta y devuelve la firma como data URL PNG,
 * o `null` si el lienzo no tiene ningún trazo.
 *
 * El recorte depende de que el fondo sea TRANSPARENTE. El lienzo de firma se
 * monta con `backgroundColor="transparent"`; si alguien le pusiera un fondo
 * opaco, esta función se volvería un no-op silencioso.
 */
export function recortarFirma(origen: HTMLCanvasElement): string | null {
  if (origen.width === 0 || origen.height === 0) return null;

  const ctx = origen.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const { width: ancho, height: alto } = origen;
  const datos = ctx.getImageData(0, 0, ancho, alto).data;

  let x0 = ancho;
  let y0 = alto;
  let x1 = -1;
  let y1 = -1;

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (datos[(y * ancho + x) * 4 + 3] <= ALFA_CAJA) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  // Lienzo en blanco: no hay nada que recortar ni que guardar.
  if (x1 < 0) return null;

  let cajaX = x0;
  let cajaY = y0;
  let cajaAncho = x1 - x0 + 1;
  let cajaAlto = y1 - y0 + 1;

  // Un toque suelto deja una caja de pocos píxeles que `objectFit: "contain"`
  // estiraría hasta llenar la caja del PDF: un manchón enorme en lugar de una
  // firma. Mejor devolver el lienzo entero y que se vea el punto pequeño.
  if (Math.max(cajaAncho, cajaAlto) < LADO_MINIMO) {
    cajaX = 0;
    cajaY = 0;
    cajaAncho = ancho;
    cajaAlto = alto;
  }

  // Sin margen la tinta queda pegada a la línea de firma del PDF y parece
  // cortada: las cajas de firma se apoyan directamente sobre el borde.
  const margen = Math.round(Math.max(cajaAncho, cajaAlto) * MARGEN);
  const conMargenAncho = cajaAncho + margen * 2;
  const conMargenAlto = cajaAlto + margen * 2;
  const escala = Math.min(1, MAX_LADO / Math.max(conMargenAncho, conMargenAlto));

  const destino = document.createElement("canvas");
  destino.width = Math.max(1, Math.round(conMargenAncho * escala));
  destino.height = Math.max(1, Math.round(conMargenAlto * escala));

  const destinoCtx = destino.getContext("2d");
  if (!destinoCtx) return null;

  // El rectángulo de origen se sale del lienzo por el margen; lo que queda
  // fuera se dibuja transparente, que es justo el margen que queremos.
  destinoCtx.drawImage(
    origen,
    cajaX - margen,
    cajaY - margen,
    conMargenAncho,
    conMargenAlto,
    0,
    0,
    destino.width,
    destino.height,
  );

  if (process.env.NODE_ENV !== "production") {
    console.assert(destino.width > 0 && destino.height > 0, "recortarFirma: lado cero");
    console.assert(
      destino.width <= MAX_LADO && destino.height <= MAX_LADO,
      "recortarFirma: el recorte excede el tope de lado",
    );
  }

  return destino.toDataURL("image/png");
}

/**
 * Convierte la imagen de una firma escaneada o fotografiada en un PNG con fondo
 * transparente, recortado y a escala de PDF.
 *
 * Lanza un error con mensaje para el usuario si la imagen no sirve.
 */
export async function firmaDesdeArchivo(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    // `from-image` respeta el EXIF: sin esto la foto vertical de un iPhone
    // entra girada. El HEIC no se decodifica en canvas y cae en el catch.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "No fue posible leer la imagen. Use un archivo PNG o JPG: el formato HEIC del iPhone no se puede procesar.",
    );
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("No fue posible procesar la imagen.");
    ctx.drawImage(bitmap, 0, 0);

    const imagen = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imagen.data;
    const totalPixeles = d.length / 4;
    let opacos = 0;

    for (let i = 0; i < d.length; i += 4) {
      const alfa = alfaDeFirma(d[i], d[i + 1], d[i + 2], d[i + 3]);
      d[i + 3] = alfa;
      if (alfa > ALFA_CAJA) opacos++;
    }

    if (opacos === 0) {
      throw new Error("La imagen no tiene trazos legibles. Use un escaneo o una foto nítida de la firma.");
    }
    if (opacos / totalPixeles > MAX_FRACCION_OPACA) {
      // ponytail: umbral fijo 235/120; calibrar con la mediana de los píxeles
      // del borde si empiezan a llegar fotos con sombra o papel amarillento.
      throw new Error("La firma debe ser de tinta oscura sobre fondo claro. Esta imagen sale casi toda oscura.");
    }

    ctx.putImageData(imagen, 0, 0);

    const recortada = recortarFirma(canvas);
    if (!recortada) throw new Error("No fue posible recortar la firma de la imagen.");
    return recortada;
  } finally {
    bitmap.close();
  }
}
