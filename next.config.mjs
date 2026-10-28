/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No X-Powered-By: Next.js header (it only advertises the stack).
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // app/global-not-found.jsx: with two root layouts, the only way to get a
    // server-rendered 404 inside the site's layout.
    globalNotFound: true,
  },
};
export default nextConfig;
