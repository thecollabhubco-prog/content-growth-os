import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    // Silence the multi-lockfile workspace root warning
    root: __dirname,
  },
  experimental: {
    // Ensure all app routes are server-rendered (no static prerender)
    // This prevents build failures when env vars aren't set at build time
  },
}

export default nextConfig
