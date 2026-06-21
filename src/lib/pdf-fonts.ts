// Registro de tipografía y paleta de marca para los PDF (@react-pdf/renderer).
//
// Los PDF se generan en el navegador, así que las fuentes se resuelven contra el
// origen actual (igual que el logo). Manrope es el sustituto libre (OFL) de
// Axiforma usado en toda la app; se auto-hospeda en /public/fonts.
//
// Manrope no tiene variante cursiva. react-pdf lanza error si se solicita un
// estilo no registrado, por lo que registramos los mismos archivos bajo
// fontStyle "italic" (se renderizan rectos, sin inclinación, pero no truena).

import { Font } from "@react-pdf/renderer";

// Paleta Actium (ver CLAUDE.md). Centralizada para que todos los PDF compartan
// el mismo beige y marrón café.
export const ACTIUM_PDF = {
  orange: "#F25C05",
  espresso: "#592C12", // Marrón café — títulos, headers de tabla, texto premium
  saddle: "#8C470B", // Marrón café medio — labels, acentos secundarios
  seashell: "#FFF5EE", // Beige — fondos suaves de paneles y tarjetas
  beigeRow: "#FAF3EC", // Beige más sutil — filas alternas
  beigeBorder: "#E8DCCD", // Borde cálido (reemplaza grises fríos)
  graphite: "#282828",
  gray: "#6B6B6B",
  green: "#16A34A",
  red: "#DC2626",
} as const;

let registered = false;

function fontBase(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function registerActiumFonts(): void {
  if (registered) return;
  registered = true;

  const base = fontBase();
  Font.register({
    family: "Manrope",
    fonts: [
      { src: `${base}/fonts/Manrope-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/fonts/Manrope-Medium.ttf`, fontWeight: 500 },
      { src: `${base}/fonts/Manrope-SemiBold.ttf`, fontWeight: 600 },
      { src: `${base}/fonts/Manrope-Bold.ttf`, fontWeight: 700 },
      // Italic → mismos archivos (Manrope no trae cursiva); evita el crash.
      { src: `${base}/fonts/Manrope-Regular.ttf`, fontWeight: 400, fontStyle: "italic" },
      { src: `${base}/fonts/Manrope-Bold.ttf`, fontWeight: 700, fontStyle: "italic" },
    ],
  });

  // Evita que react-pdf intente partir palabras en guiones de forma agresiva.
  Font.registerHyphenationCallback((word) => [word]);
}
