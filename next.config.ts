import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const _ = initOpenNextCloudflareForDev();
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  allowedDevOrigins: ["development.ferris.love", "127.0.0.1"],
  experimental: {
    useCache: true,
  },
};

export default nextConfig;
