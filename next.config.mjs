/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  },
  // Allows deploying as a standalone server on Azure App Service / Hostinger VPS (Node).
  output: "standalone",

  // Lets a deploy build into a scratch directory (NEXT_DIST_DIR=.next-new) while
  // the running container keeps serving the current .next, then swap the two and
  // restart. Rebuilding .next in place tears the live site down for the whole
  // build — the new files land under a server that's still reading the old ones,
  // and every route 500s with "Cannot find module .../route.js".
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // upanah.com is canonical. Send www there with a real 301 so search engines
  // consolidate on one hostname instead of seeing duplicate content.
  // (The azurewebsites.net hostname stays reachable for deploys/debugging; its
  // pages carry canonical tags pointing at upanah.com.)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.upanah.com" }],
        destination: "https://upanah.com/:path*",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
