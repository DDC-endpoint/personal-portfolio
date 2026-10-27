// § 05 Timeline — oldest first, so the circuit runs forward through time
// (Damian). Copy is verbatim from docs/v3/copy.md; ranges use an en dash.
// The Head Prefect entry was added in Phase 3 planning (Damian, 2026-10-27).

const IIT = "IIT · University of Westminster";

export const ENTRIES = [
  {
    year: "2018",
    title: "Where it began",
    place: "Self-taught · Scratch, Micro:bit & Arduino",
    detail: "My first taste of making things: block-coding in Scratch, then wiring up a Micro:bit and an Arduino.",
  },
  {
    year: "2020",
    title: "Video games as a hobby",
    place: "Curiosity",
    detail:
      "Fell deep into video games, half for the play and half out of curiosity about how the worlds behind the screen were built.",
  },
  {
    year: "2022–2024",
    title: "Edexcel A-Levels",
    place: "St. Joseph's College, Colombo 10",
    detail:
      "Pearson Edexcel IAL in Mathematics, Physics and Chemistry, alongside serving as Senior Prefect and Interact Club President.",
  },
  {
    year: "2024–2025",
    title: "Head Prefect",
    place: "St. Joseph's College, Colombo 10",
    detail: "Led the student body as Head Prefect in the year after my A-Levels.",
  },
  {
    year: "2024",
    title: "First lines of code",
    place: "Self-taught · web development",
    detail:
      "Taught myself web development (HTML, CSS, then JavaScript) and started collecting small projects on GitHub.",
  },
  {
    year: "Sep 2025",
    title: "Began BSc (Hons) Computer Science",
    place: IIT,
    detail: "The formal start of turning a self-taught hobby into a craft.",
  },
  {
    year: "2025–2026",
    title: "Completed first year",
    place: IIT,
    detail: "Finished the first year of my degree, with the fundamentals in programming, systems and problem-solving.",
  },
  {
    year: "Sep 2026",
    title: "Began second year",
    place: IIT,
    detail: "Started the second year of my BSc (Hons) Computer Science.",
  },
  {
    year: "2026",
    title: "Personal Dashboard",
    place: "Side project",
    detail: "A self-updating homepage I open every morning: RSS, a reading queue and quick links.",
  },
  {
    year: "2026",
    title: "This portfolio",
    place: "Personal project · Next.js & Framer Motion",
    detail:
      "Designed and built this site as a living journal of my work. I'll keep refining it through the rest of university.",
  },
];

// How many milestones the needle has passed: thresholds are each milestone's
// position as a fraction of the list, progress is the drawn fraction.
export const litCount = (progress, thresholds) => thresholds.filter((t) => t <= progress).length;

// The circuit trace (Damian): [x, y] points, in px, for a rail on x = 0 from
// the list's top to its bottom (h). It meets each pad (ys, top to bottom) on
// the axis, leaves it straight for STEM px, then bends 45° out to a side lane
// and back in before the next pad. Lanes alternate sides. Pads too close for
// a jog are joined straight. y never decreases, so traceAt can walk it.
const STEM = 18;

export function circuitPoints(ys, h, lane) {
  const pts = [[0, 0]];
  ys.forEach((y0, i) => {
    pts.push([0, y0]);
    const y1 = ys[i + 1];
    if (y1 == null || y1 - y0 < 2 * (STEM + lane)) return;
    const x = i % 2 ? -lane : lane;
    pts.push([0, y0 + STEM], [x, y0 + STEM + lane], [x, y1 - STEM - lane], [0, y1 - STEM]);
  });
  pts.push([0, h]);
  return pts;
}

// The trace's x at height y (the head rides it); on the axis past either end.
export function traceAt(pts, y) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (y >= y0 && y <= y1) return y1 === y0 ? x1 : x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
  }
  return 0;
}

// The pinned year counter shows an entry's first year: "2022–2024" → 2022.
export const counterYear = (entry) => entry.year.match(/\d{4}/)[0];

export const padLabel = (i) => `P${String(i + 1).padStart(2, "0")}`;
