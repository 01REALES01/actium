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

export const metadata: Metadata = {
  title: "ACTIUM",
  description: "Portal de clientes ACTIUM para proyectos, SST y presupuesto.",
  icons: {
    icon: "/logo-actium-mark.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="dark">
      <body className={`${axiforma.variable} ${avenir.variable} font-sans`}>{children}</body>
    </html>
  );
}
