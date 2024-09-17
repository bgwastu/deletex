/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },
  transpilePackages: ["@electric-sql/pglite-repl", "@electric-sql/pglite"],
};

export default nextConfig;
