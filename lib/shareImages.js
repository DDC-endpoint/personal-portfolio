// Share cards (og:image / twitter:image), 1200×630, rendered from
// docs/v3/spike/og-cards.html by og-cards.cjs. Static files in public/ only:
// a dynamic /opengraph-image route gave 502s behind nginx + PM2
// (HANDOFF.md → "DO NOT RE-BREAK" 2).
const card = (url, alt) => ({ url, width: 1200, height: 630, alt });

export const SHARE = {
  home: card("/og.jpg", "Damian De Cruz, creative technologist and freelance web designer in Colombo, Sri Lanka"),
  services: card("/og-services.jpg", "DDC Web Services by Damian De Cruz: clean, fast websites built in days, from LKR 18,000"),
};
