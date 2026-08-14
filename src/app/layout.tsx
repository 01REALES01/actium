import type { Metadata } from "next";
import { Manrope, Nunito_Sans } from "next/font/google";
import "./globals.css";

// Axiforma (body, labels, captions) → Manrope: geométrica, muy cercana.
const axiforma = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-axiforma",
  display: "swap",
});

// Avenir Next (subtítulos) → Nunito Sans: humanista, cercana a Avenir.
const avenir = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-avenir",
  display: "swap",
});

// Base absoluta para los metadatos sociales: WhatsApp, LinkedIn y demas exigen
// URL absoluta en og:image y descartan la previsualizacion si es relativa.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://login.actiumingenieria.com";

const descripcion = "Portal de clientes ACTIUM para proyectos, SST y presupuesto.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ACTIUM",
  description: descripcion,
  icons: {
    // Marca naranja: figura solida que se lee en pestana clara y oscura. La
    // marca blanca sobre transparente que habia antes desaparecia en claro.
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    // iOS descarta la transparencia y compone sobre negro: va opaca.
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "ACTIUM",
    title: "ACTIUM — Infraestructura y Activos",
    description: descripcion,
    url: siteUrl,
    locale: "es_CO",
    images: [
      {
        // Opaca a proposito. El logo de marca es blanco sobre transparente y
        // WhatsApp compone las transparencias sobre blanco: se veria vacio.
        url: "/og-actium.png",
        width: 1200,
        height: 630,
        alt: "ACTIUM — Infraestructura y Activos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ACTIUM — Infraestructura y Activos",
    description: descripcion,
    images: ["/og-actium.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="dark">
      <body className={`${axiforma.variable} ${avenir.variable} font-sans`}>{children}</body>
    </html>
  );
}
