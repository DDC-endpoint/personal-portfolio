// lastModified is the date a page's content last changed, set by hand when
// it does: a build-time `new Date()` tells search engines every page changed
// on every deploy. changeFrequency and priority are left out; Google ignores
// both.
const PAGES = [
  { path: "", updated: "2026-10-27" },
  { path: "/services", updated: "2026-10-27" },
  { path: "/privacy", updated: "2026-10-27" },
];

export default function sitemap() {
  return PAGES.map(({ path, updated }) => ({
    url: `https://damiandc.com${path}`,
    lastModified: updated,
  }));
}
