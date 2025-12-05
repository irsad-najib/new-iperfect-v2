import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Optimize production builds
  productionBrowserSourceMaps: false,

  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "iperfect-api.479067.my.id",
        port: "",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Optimize for faster rebuilds in development
  experimental: {
    optimizePackageImports: ["antd", "react-icons"],
  },
};

export default nextConfig;
