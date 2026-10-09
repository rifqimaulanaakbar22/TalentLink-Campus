import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 adalah modul native; jangan di-bundle.
  serverExternalPackages: ["better-sqlite3"],
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
