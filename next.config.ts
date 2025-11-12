import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },

  reactCompiler: true,
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        pathname: "/",
        hostname: "ik.imagekit.io",
      },
    ],
  },
};

export default nextConfig;
