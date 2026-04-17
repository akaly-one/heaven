import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@heaven/ui", "@heaven/lib"],
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
