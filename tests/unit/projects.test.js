import { PROJECTS, END_CARD } from "@/lib/projects";

const ORDER = [
  "This Portfolio",
  "Personal Dashboard",
  "Aloys Travels",
  "Spades Solutions",
  "Danella De Cruz",
  "Kahatagaha Graphite",
  "Interact District 3220",
  "ai-studio",
];

// Verbatim from docs/v3/copy.md → § 04 Selected Work.
const BLURBS = [
  "The site you're on: Next.js, Tailwind and Framer Motion, kept as a living journal of my work.",
  "A self-updating homepage I open every morning, with RSS feeds, a reading queue and quick links.",
  "Website for a travel company: clean booking flows and a design that sells the journey.",
  "Website for a growing solutions company, built to look sharp and turn visitors into enquiries.",
  "Portfolio and booking site for a Colombo cover artist, putting her music, story and performance schedule on one clean stage.",
  "Two homepage concepts for a Sri Lankan crystalline graphite producer, one dark and technical, one light and editorial, built from the same content and eleven material grades.",
  "New website for Interact District 3220, in progress.",
  "In the works · 2026",
];

const byTitle = (t) => PROJECTS.find((p) => p.title === t);

test("cards run in Damian's order, numbered 01–08", () => {
  expect(PROJECTS.map((p) => p.title)).toEqual(ORDER);
  expect(PROJECTS.map((p) => p.n)).toEqual(["01", "02", "03", "04", "05", "06", "07", "08"]);
  expect(PROJECTS.every((p) => p.year === "2026")).toBe(true);
});

test("blurbs match the approved copy", () => {
  expect(PROJECTS.map((p) => p.blurb)).toEqual(BLURBS);
});

test("Aloys Travels points at its own domain", () => {
  const aloys = byTitle("Aloys Travels");
  expect(aloys.href).toBe("https://aloys-travels.com/");
  expect(aloys.domain).toBe("aloys-travels.com");
});

test("upcoming cards have no link and no screenshot", () => {
  const upcoming = PROJECTS.filter((p) => p.status === "upcoming");
  expect(upcoming.map((p) => p.title)).toEqual(["Interact District 3220", "ai-studio"]);
  for (const p of upcoming) {
    expect(p.href).toBeNull();
    expect(p.shot).toBeNull();
    expect(p.skeleton).toBe("generic");
  }
  expect(byTitle("ai-studio").tags).toEqual([]);
  expect(byTitle("Interact District 3220").domain).toBe("interactdistrict3220.org");
  expect(byTitle("ai-studio").domain).toBe("ai-studio");
});

test("live cards link out over https, except This Portfolio", () => {
  const self = byTitle("This Portfolio");
  expect(self).toMatchObject({ self: true, href: "#top", domain: "damiandc.com", skeleton: "portfolio" });
  for (const p of PROJECTS.filter((p) => p.status === "live" && !p.self)) {
    expect(p.href).toMatch(/^https:\/\//);
    expect(p.self).toBe(false);
  }
});

test("live cards carry a screenshot named after their slug", () => {
  const live = PROJECTS.filter((p) => p.status === "live");
  expect(live.map((p) => p.slug)).toEqual([
    "portfolio", "personal-dashboard", "aloys-travels", "spades-solutions", "danella-de-cruz", "kahatagaha-graphite",
  ]);
  for (const p of live) expect(p.shot).toBe(`/projects/${p.slug}.webp`);
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
