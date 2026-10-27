// § 05 Timeline — oldest first, so the needle stitches forward through time
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
