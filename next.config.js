/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },
  experimental: { serverComponentsExternalPackages: ['sharp'] },
  unstable_excludeFiles: [],
}

module.exports = nextConfig
