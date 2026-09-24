import type { NextConfig } from "next";

const backendOrigin = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");

if (!backendOrigin) {
  throw new Error("Set API_BASE_URL in .env to your backend origin (for example, http://localhost:8080).");
}

const backendUrl = new URL(backendOrigin);
if (
  !["http:", "https:"].includes(backendUrl.protocol) ||
  backendUrl.pathname !== "/" ||
  backendUrl.search ||
  backendUrl.hash ||
  backendUrl.username ||
  backendUrl.password
) {
  throw new Error("API_BASE_URL must be an HTTP(S) origin without a path, query, or credentials. Do not include /api.");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
