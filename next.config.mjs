/** @type {import('next').NextConfig} */
const nextConfig = {
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
