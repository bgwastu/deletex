/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },
  transpilePackages: ["@electric-sql/pglite"],
};

export default nextConfig;
