/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep @react-pdf/renderer out of the webpack bundle — it's Node-only and
  // contains native dependencies that break when bundled by Next.js.
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "coverartarchive.org",
      },
      {
        protocol: "http",
        hostname: "coverartarchive.org",
      },
      {
        protocol: "https",
        hostname: "**.archive.org",
      },
      {
        protocol: "http",
        hostname: "**.archive.org",
      },
    ],
  },
};

export default nextConfig;
