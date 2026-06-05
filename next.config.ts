import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // No standalone output — Vercel handles this automatically
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
