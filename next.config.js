/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose'],
  images: {
    domains: ['localhost', 'cdn.discordapp.com']
  }
}

module.exports = nextConfig
