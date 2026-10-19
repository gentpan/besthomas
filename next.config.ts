import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle, deployed by deploy/deploy.sh.
  output: "standalone",
  // Content is read from CONTENT_DIR at runtime; the tracer can't tell, so keep project files out of the bundle.
  outputFileTracingExcludes: {
    "**": ["./data/**", "./reference/**", "./deploy/**"],
  },
  // Fonts read at runtime by the share-image routes (src/lib/og.tsx).
  outputFileTracingIncludes: {
    "**": [
      "./node_modules/@fontsource/crimson-pro/files/crimson-pro-latin-400-normal.woff",
      "./node_modules/@fontsource/noto-serif-sc/400.css",
      "./node_modules/@fontsource/noto-serif-sc/files/*-400-normal.woff",
    ],
  },
  experimental: {
    // Turbopack's persisted cache served stale modules/CSS after edits in this project (in dev and in
    // production builds); cold starts are fast enough without it.
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
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
