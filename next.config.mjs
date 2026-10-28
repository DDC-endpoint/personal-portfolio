/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No X-Powered-By: Next.js header (it only advertises the stack).
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};
export default nextConfig;
