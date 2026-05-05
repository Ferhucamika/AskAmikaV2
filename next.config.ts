import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output produces a self-contained .next/standalone bundle that
  // can run with `node server.js` -- the form Docker images expect.
  output: "standalone",
};

export default nextConfig;
