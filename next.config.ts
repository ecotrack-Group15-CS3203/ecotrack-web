import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone: a self-contained server.js plus only the node_modules it
  // needs, which is what the Dockerfile ships.
  output: "standalone",
};

export default nextConfig;
