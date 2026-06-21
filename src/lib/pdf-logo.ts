// URL del logotipo Actium para usar dentro de los PDF (@react-pdf/renderer).
// Los PDF se generan en el navegador (import dinámico al descargar), por lo que
// resolvemos contra el origen actual; con fallback a ruta relativa en SSR.
export function getLogoSrc(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/logo-actium.png`;
  }
  return "/logo-actium.png";
}
