/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'mdx'],
  experimental: {
    mdxRs: true,
  },
  async rewrites() {
    return [
      {
        source: '/write',
        destination: '/write',
      }
    ]
  },
  // Disable the deprecated export command for Next.js 14
  output: 'export'
}

module.exports = nextConfig