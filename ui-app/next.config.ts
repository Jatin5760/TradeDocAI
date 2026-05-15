import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only use 'export' for production builds (Nginx)
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  
  images: {
    unoptimized: true,
  },
};

export default nextConfig;