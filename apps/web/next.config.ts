import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@heaven/ui", "@heaven/lib"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  // Public app (profile pages /m/[slug]) proxies API to the CP app.
  async rewrites() {
    const cpUrl = process.env.CP_INTERNAL_URL || "";
    if (!cpUrl) return [];
    return [{ source: "/api/:path*", destination: `${cpUrl}/api/:path*` }];
  },
};

export default nextConfig;
