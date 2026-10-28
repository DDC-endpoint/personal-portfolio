// Every project, newest first (Damian, 2026-10-28), as /portfolio lists them.
// Home's § 04 strip shows five of them (HOME_STRIP), numbered by the strip.
// Copy is from docs/v3/copy.md. Live cards carry a screenshot
// (public/projects/<slug>.webp) and a full-page capture
// (public/projects/full/<slug>.webp), both made by `npm run capture-projects`,
// and a hand-traced skeleton (components/projects/skeletons.jsx). Upcoming
// cards have no link, screenshot or skeleton (/portfolio shows a build loop):
// nothing of an unreleased client design goes in this public repo. When one
// launches, flip its status to
// "live", drop "upcoming" from its cats and give it a slug, href, shot, full
// capture and skeleton.

const live = (p) => ({
  status: "live",
  self: false,
  shot: `/projects/${p.slug}.webp`,
  full: `/projects/full/${p.slug}.webp`,
  ...p,
});
const upcoming = (p) => ({
  status: "upcoming",
  self: false,
  href: null,
  shot: null,
  full: null,
  skeleton: null,
  tags: [],
  ...p,
  cats: [...p.cats, "upcoming"],
});

export const PROJECTS = [
  live({
    n: "01",
    slug: "aloys-travels",
    title: "Aloys Travels",
    year: "2026",
    cats: ["client"],
    blurb: "Website for a travel company: clean booking flows and a design that sells the journey.",
    tags: ["Client Work", "Travel", "Design"],
    href: "https://aloys-travels.com/",
    domain: "aloys-travels.com",
    skeleton: "aloys",
  }),
  live({
    n: "02",
    slug: "danella-de-cruz",
    title: "Danella De Cruz",
    year: "2026",
    cats: ["client"],
    blurb:
      "Portfolio and booking site for a Colombo cover artist, putting her music, story and performance schedule on one clean stage.",
    tags: ["Next.js", "Client Work", "Music"],
    href: "https://danelladc.com",
    domain: "danelladc.com",
    skeleton: "danella",
  }),
  live({
    n: "03",
    slug: "spades-solutions",
    title: "Spades Solutions",
    year: "2026",
    cats: ["client"],
    blurb: "Website for a growing solutions company, built to look sharp and turn visitors into enquiries.",
    // Not launched yet (Damian): the client design lives on GitHub Pages.
    tags: ["Client design · not launched", "Business", "Design"],
    href: "https://enderguardian25.github.io/spades-solutions/index.html",
    domain: "enderguardian25.github.io/spades-solutions",
    skeleton: "spades",
  }),
  live({
    n: "04",
    slug: "kahatagaha-graphite",
    title: "Kahatagaha Graphite",
    year: "2026",
    cats: ["concept"],
    blurb:
      "Two homepage concepts for a Sri Lankan crystalline graphite producer, one dark and technical, one light and editorial, built from the same content and eleven material grades.",
    tags: ["HTML/CSS/JS", "Concept", "Design"],
    href: "https://enderguardian25.github.io/kgll-website/",
    domain: "enderguardian25.github.io/kgll-website",
    skeleton: "kahatagaha",
  }),
  live({
    n: "05",
    slug: "portfolio",
    title: "This Portfolio",
    year: "2026",
    cats: ["personal"],
    blurb: "The site you're on: Next.js, Tailwind and Framer Motion, kept as a living journal of my work.",
    tags: ["Next.js", "Framer Motion", "Design"],
    href: "/",
    domain: "damiandc.com",
    self: true,
    skeleton: "portfolio",
  }),
  live({
    n: "06",
    slug: "personal-dashboard",
    title: "Personal Dashboard",
    year: "2026",
    cats: ["personal"],
    blurb: "A self-updating homepage I open every morning, with RSS feeds, a reading queue and quick links.",
    tags: ["HTML/CSS/JS", "Static Site", "GitHub Pages"],
    href: "https://enderguardian25.github.io/personal-dashboard/",
    domain: "enderguardian25.github.io/personal-dashboard",
    skeleton: "dashboard",
  }),
  upcoming({
    n: "07",
    slug: "interact-district-3220",
    title: "Interact District 3220",
    year: "2026",
    cats: ["client"],
    blurb: "New website for Interact District 3220, in progress.",
    tags: ["Client Work"],
    domain: "interactdistrict3220.org",
  }),
  upcoming({
    n: "08",
    slug: "ai-studio",
    title: "ai-studio",
    year: "2026",
    cats: ["personal"],
    blurb: "In the works · 2026",
    domain: "ai-studio",
  }),
];

// Home § 04: Damian's five, strongest first, then the end card.
export const HOME_STRIP = [
  "aloys-travels",
  "danella-de-cruz",
  "kahatagaha-graphite",
  "spades-solutions",
  "personal-dashboard",
];

// The strip's cards, numbered 01–05 in strip order.
export const homeStrip = () =>
  HOME_STRIP.map((slug, i) => ({
    ...PROJECTS.find((p) => p.slug === slug),
    n: String(i + 1).padStart(2, "0"),
  }));

// /portfolio's filter chips. "In progress" cards also count under their own
// category.
export const FILTERS = [
  { id: "all", label: "All" },
  { id: "client", label: "Client" },
  { id: "concept", label: "Concept" },
  { id: "personal", label: "Personal" },
  { id: "upcoming", label: "In progress" },
];

export const inFilter = (p, filter) => filter === "all" || p.cats.includes(filter);
export const countFor = (filter) => PROJECTS.filter((p) => inFilter(p, filter)).length;
export const liveCount = PROJECTS.filter((p) => p.status === "live").length;
export const upcomingCount = PROJECTS.filter((p) => p.status === "upcoming").length;

// The strip's last card: an empty window whose address bar types itself out.
export const END_CARD = {
  domain: "your-site.com",
  line: "Your project next.",
  cta: "Start a project", // the button draws its arrow beside it, outside the scramble
  href: "#contact",
};
