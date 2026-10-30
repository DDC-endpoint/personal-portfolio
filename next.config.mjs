import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The image folders served immutable (lib/assets.js → asset adds each
// file's hash to its URL, so a replaced image is a new URL).
const VERSIONED = ["hero", "projects", "photography"];

// { "/hero/portrait.webp": "8-char content hash", … } for every file in them.
function assetVersions() {
  const out = {};
  const walk = (dir, url) => {
    for (const entry of readdirSync(join("public", dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel, `${url}/${entry.name}`);
      else out[`${url}/${entry.name}`] = createHash("md5").update(readFileSync(join("public", rel))).digest("hex").slice(0, 8);
    }
  };
  for (const dir of VERSIONED) walk(dir, `/${dir}`);
  return out;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No X-Powered-By: Next.js header (it only advertises the stack).
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // next/image refuses a local src with a query unless allowed: the
    // gallery's photos carry their version. Everything else stays bare.
    localPatterns: [{ pathname: "/photography/**" }, { pathname: "/**", search: "" }],
  },
  env: {
    ASSET_VERSIONS: JSON.stringify(assetVersions()),
  },
  async headers() {
    return [
      {
        source: `/:dir(${VERSIONED.join("|")})/:path*`,
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  experimental: {
    // app/global-not-found.jsx: with two root layouts, the only way to get a
    // server-rendered 404 inside the site's layout.
    globalNotFound: true,
  },
};
export default nextConfig;
