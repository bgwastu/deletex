/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
    missingSuspenseWithCSRBailout: false,
  },
  transpilePackages: ["@electric-sql/pglite-repl", "@electric-sql/pglite"],
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
