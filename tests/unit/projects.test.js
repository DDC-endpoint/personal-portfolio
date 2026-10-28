import {
  PROJECTS,
  END_CARD,
  HOME_STRIP,
  homeStrip,
  FILTERS,
  countFor,
  liveCount,
  upcomingCount,
} from "@/lib/projects";

// Newest first (Damian, 2026-10-28: decisions.md → "Phase 6 planning").
const ORDER = [
  "Aloys Travels",
  "Danella De Cruz",
  "Spades Solutions",
  "Kahatagaha Graphite",
  "This Portfolio",
  "Personal Dashboard",
  "Interact District 3220",
  "ai-studio",
];

// Verbatim from docs/v3/copy.md → § 04 Selected Work, in ORDER.
const BLURBS = [
  "Website for a travel company: clean booking flows and a design that sells the journey.",
  "Portfolio and booking site for a Colombo cover artist, putting her music, story and performance schedule on one clean stage.",
  "Website for a growing solutions company, built to look sharp and turn visitors into enquiries.",
  "Two homepage concepts for a Sri Lankan crystalline graphite producer, one dark and technical, one light and editorial, built from the same content and eleven material grades.",
  "The site you're on: Next.js, Tailwind and Framer Motion, kept as a living journal of my work.",
  "A self-updating homepage I open every morning, with RSS feeds, a reading queue and quick links.",
  "New website for Interact District 3220, in progress.",
  "In the works · 2026",
];

const byTitle = (t) => PROJECTS.find((p) => p.title === t);

test("cards run newest first, numbered 01–08", () => {
  expect(PROJECTS.map((p) => p.title)).toEqual(ORDER);
  expect(PROJECTS.map((p) => p.n)).toEqual(["01", "02", "03", "04", "05", "06", "07", "08"]);
  expect(PROJECTS.every((p) => p.year === "2026")).toBe(true);
});

test("blurbs match the approved copy", () => {
  expect(PROJECTS.map((p) => p.blurb)).toEqual(BLURBS);
});

test("Home's strip is Damian's five, strongest first, numbered by the strip", () => {
  expect(HOME_STRIP).toEqual([
    "aloys-travels",
    "danella-de-cruz",
    "kahatagaha-graphite",
    "spades-solutions",
    "personal-dashboard",
  ]);
  const strip = homeStrip();
  expect(strip.map((p) => p.slug)).toEqual(HOME_STRIP);
  expect(strip.map((p) => p.n)).toEqual(["01", "02", "03", "04", "05"]);
  // The strip's numbering never leaks back into PROJECTS.
  expect(byTitle("Kahatagaha Graphite").n).toBe("04");
});

test("categories, as in the demo", () => {
  const cats = Object.fromEntries(PROJECTS.map((p) => [p.title, p.cats]));
  expect(cats).toEqual({
    "Aloys Travels": ["client"],
    "Danella De Cruz": ["client"],
    "Spades Solutions": ["client"],
    "Kahatagaha Graphite": ["concept"],
    "This Portfolio": ["personal"],
    "Personal Dashboard": ["personal"],
    "Interact District 3220": ["client", "upcoming"],
    "ai-studio": ["personal", "upcoming"],
  });
});

test("filters and their counts", () => {
  expect(FILTERS).toEqual([
    { id: "all", label: "All" },
    { id: "client", label: "Client" },
    { id: "concept", label: "Concept" },
    { id: "personal", label: "Personal" },
    { id: "upcoming", label: "In progress" },
  ]);
  expect(FILTERS.map((f) => countFor(f.id))).toEqual([8, 4, 1, 3, 2]);
  expect(liveCount).toBe(6);
  expect(upcomingCount).toBe(2);
});

test("Aloys Travels points at its own domain", () => {
  const aloys = byTitle("Aloys Travels");
  expect(aloys.href).toBe("https://aloys-travels.com/");
  expect(aloys.domain).toBe("aloys-travels.com");
});

test("upcoming cards have no link, screenshot or full capture", () => {
  const upcoming = PROJECTS.filter((p) => p.status === "upcoming");
  expect(upcoming.map((p) => p.title)).toEqual(["Interact District 3220", "ai-studio"]);
  for (const p of upcoming) {
    expect(p.href).toBeNull();
    expect(p.shot).toBeNull();
    expect(p.full).toBeNull();
    expect(p.skeleton).toBe("generic");
    expect(p.cats).toContain("upcoming");
  }
  expect(byTitle("ai-studio").tags).toEqual([]);
  expect(byTitle("Interact District 3220").domain).toBe("interactdistrict3220.org");
  expect(byTitle("ai-studio").domain).toBe("ai-studio");
});

test("live cards link out over https, except This Portfolio, which goes Home", () => {
  const self = byTitle("This Portfolio");
  expect(self).toMatchObject({ self: true, href: "/", domain: "damiandc.com", skeleton: "portfolio" });
  for (const p of PROJECTS.filter((p) => p.status === "live" && !p.self)) {
    expect(p.href).toMatch(/^https:\/\//);
    expect(p.self).toBe(false);
  }
});

test("live cards carry a screenshot and a full-page capture named after their slug", () => {
  const live = PROJECTS.filter((p) => p.status === "live");
  expect(live.map((p) => p.slug)).toEqual([
    "aloys-travels", "danella-de-cruz", "spades-solutions", "kahatagaha-graphite", "portfolio", "personal-dashboard",
  ]);
  for (const p of live) {
    expect(p.shot).toBe(`/projects/${p.slug}.webp`);
    expect(p.full).toBe(`/projects/full/${p.slug}.webp`);
    expect(p.cats).not.toContain("upcoming");
  }
});

test("Coursework Archive is gone", () => {
  expect(PROJECTS.some((p) => p.title === "Coursework Archive")).toBe(false);
});

test("end card copy", () => {
  expect(END_CARD).toEqual({
    domain: "your-site.com",
    line: "Your project next.",
    cta: "Start a project", // the arrow sits beside it, outside the scramble
    href: "#contact",
  });
});
