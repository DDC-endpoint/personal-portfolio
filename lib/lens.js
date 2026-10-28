// § 07 Lens — the gallery, in reading order. Placement, captions and months
// are from docs/v3/design.md → Lens. Photos live in public/photography/,
// made EXIF-free by `npm run optimize-photos`. `area` gives desktop grid
// lines on the 6×3 grid: [start, end) per axis, so a 2×2 hero spans 2 of each.

const photo = (file) => `/photography/${encodeURIComponent(file)}.jpg`;

const frame = (n, file, caption, month, col, row, hero = false) => ({
  n,
  src: photo(file),
  caption,
  month,
  hero,
  area: { col, row },
});

export const FRAMES = [
  frame("01", "IMG_20260503_071804386", "Sigiriya, from Pidurangala", "May 2026", [1, 3], [1, 3], true),
  frame("02", "IMG_20260415_173730095", "Small tenant", "Apr 2026", [3, 4], [1, 2]),
  frame("03", "IMG_20250511_192659821", "Architecture at nightfall", "May 2025", [4, 5], [1, 2]),
  frame("04", "IMG_20260912_173751573", "Storm light", "Sep 2026", [5, 7], [1, 3], true),
  frame("05", "IMG_20260117_104051821", "Pink in the green", "Jan 2026", [3, 4], [2, 3]),
  frame("06", "IMG_20250905_165813446 (1)", "Thalpe, low tide", "Sep 2025", [4, 5], [2, 3]),
  frame("07", "IMG_20260117_182647746", "A dahlia after dark, Nuwara Eliya", "Jan 2026", [1, 2], [3, 4]),
  frame("08", "IMG_20260113_070907135", "Above the mist, Sigiriya", "Jan 2026", [2, 3], [3, 4]),
  frame("09", "IMG_20251010_181954209", "Colombo skyline, blue hour", "Oct 2025", [3, 4], [3, 4]),
  frame("10", "IMG_20260120_081200993", "Getting lost up Ella Rock", "Jan 2026", [4, 5], [3, 4]),
];

// The text tile that closes the grid (row 3, cols 5–6).
export const LENS_NOTE = {
  count: "10",
  range: "2025 – 2026 · Sri Lanka",
  note: "Private account. Request access for the full feed.",
  handle: "@nothing._.ddc",
  href: "https://www.instagram.com/nothing._.ddc/",
  area: { col: [5, 7], row: [3, 4] },
};

export const LENS_INTRO =
  "Shot on a Nothing Phone (3a) Pro: light, geometry and the occasional accident. The feed is private; this is the cut I share.";
