/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Las fotos de obra viajan al servidor dentro de Server Actions y el
      // default de Next es 1 MB, por debajo de lo que pesa cualquier foto de
      // cámara de celular. El cliente comprime antes de subir (src/lib/imagen.ts);
      // este límite es la red de seguridad para cuando la compresión no aplique,
      // por ejemplo un HEIC que el navegador no puede decodificar.
      bodySizeLimit: "8mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vtksbnctdrszpodntyfw.supabase.co",
      },
    ],
  },
};

export default nextConfig;
