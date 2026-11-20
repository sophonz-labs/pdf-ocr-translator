import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML for GitHub Pages: every route is /en/... or /ko/..., built ahead of time.
  output: "export",
  trailingSlash: true,
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
