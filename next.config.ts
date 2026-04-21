// Cloudinary URLs cachées 30j via Next.js Image optimizer + Vercel Edge Network —
// réduit bandwidth Cloudinary de ~95% (cache hit). Phase 8 scaling : profils
// publics (avatar, cover) sont appelés 360k fois/mois en pic post-pub ; sans
// cache on explose les 25 GB/mois du plan Cloudinary free.
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
    // 30 jours — l'optimizer Next ne refetchera la source Cloudinary qu'une
    // fois par mois par variant (taille/format), le reste est servi via Edge.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      {
        // Cache long sur les variants générés par /_next/image — clients +
        // Vercel Edge les gardent 1 an (immutable : l'URL change si la source change).
        source: "/_next/image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
