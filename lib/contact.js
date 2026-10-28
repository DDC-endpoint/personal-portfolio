// § 08 Contact — the growing electric card. Copy is from docs/v3/copy.md.
// The card starts as a small square tile under the § 08 label and grows
// right and down into the full card as you scroll (Damian), drawn with a
// clip-path so the layout never reflows and every link stays in the DOM.

export const CONTACT = {
  headline: ["Got something in ", "mind", "?"], // the middle part is italic
  body: "Need a website? I design and build them for businesses and creatives, and many go live within a couple of days. Internships, collaborations and good ideas are welcome too. Pick whichever channel suits you.",
  tile: 96, // px, the starting square
};

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const px = (v) => `${Math.round(v * 100) / 100}px`;

// The card's clip at growth p (0 → 1), anchored top-left.
export function growInset(p, { W, H, tile }) {
  const e = easeInOut(Math.min(1, Math.max(0, p)));
  const r = Math.max(0, W - tile) * (1 - e);
  const b = Math.max(0, H - tile) * (1 - e);
  return `inset(0px ${px(r)} ${px(b)} 0px round 8px)`;
}

const fmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Colombo",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const colomboClock = (date) => `Colombo · ${fmt.format(date)}`;

// Growth progress from the page scroll: 0 when the card's top enters at 95%
// of the viewport, 1 when it reaches 25%, or at the bottom of the page if
// that comes first, so on a tall screen the card still opens fully.
export function growProgress(scrollY, { cardTop, vh, maxScroll }) {
  const y0 = cardTop - 0.95 * vh;
  const y1 = Math.min(cardTop - 0.25 * vh, maxScroll);
  if (y1 <= y0) return 1;
  return Math.min(1, Math.max(0, (scrollY - y0) / (y1 - y0)));
}
