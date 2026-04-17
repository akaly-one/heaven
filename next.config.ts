import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict build — échoue si erreurs TS/ESLint (protection deploy Vercel)
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
