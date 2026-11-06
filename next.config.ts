import type { NextConfig } from "next";

const mediaUrl = process.env.R3_S3_domain ?? "https://media.invalid";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // Exposes the public R2 base URL to client code.
  env: { NEXT_PUBLIC_MEDIA_URL: mediaUrl },
  images: {
    remotePatterns: [new URL(`${mediaUrl}/**`)],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
