/** @type {import('next').NextConfig} */
const nextConfig = {
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
