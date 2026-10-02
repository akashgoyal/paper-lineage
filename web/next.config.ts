import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  // The repo root has its own lockfile (scripts); the app lives here.
  turbopack: {root: import.meta.dirname},
}

export default nextConfig
