// § 04 Selected Work — the cards, in Damian's order. Copy is from
// docs/v3/copy.md. Live cards carry a screenshot (public/projects/<slug>.webp,
// made by `npm run capture-projects`) and a hand-traced skeleton
// (components/projects/skeletons.jsx). Upcoming cards are generic skeletons
// with no link: nothing of an unreleased client design goes in this public
// repo. When one launches, flip its status to "live" and give it a slug,
// href, shot and skeleton.

const live = (p) => ({ status: "live", self: false, shot: `/projects/${p.slug}.webp`, ...p });
const upcoming = (p) => ({ status: "upcoming", self: false, href: null, shot: null, skeleton: "generic", tags: [], ...p });

export const PROJECTS = [
  live({
    n: "01",
    slug: "portfolio",
    title: "This Portfolio",
    year: "2026",
    blurb: "The site you're on: Next.js, Tailwind and Framer Motion, kept as a living journal of my work.",
    tags: ["Next.js", "Framer Motion", "Design"],
    href: "#top",
    domain: "damiandc.com",
    self: true,
    skeleton: "portfolio",
  }),
  live({
    n: "02",
    slug: "personal-dashboard",
    title: "Personal Dashboard",
    year: "2026",
    blurb: "A self-updating homepage I open every morning, with RSS feeds, a reading queue and quick links.",
    tags: ["HTML/CSS/JS", "Static Site", "GitHub Pages"],
    href: "https://enderguardian25.github.io/personal-dashboard/",
    domain: "enderguardian25.github.io/personal-dashboard",
    skeleton: "dashboard",
  }),
  live({
    n: "03",
    slug: "aloys-travels",
    title: "Aloys Travels",
    year: "2026",
    blurb: "Website for a travel company: clean booking flows and a design that sells the journey.",
    tags: ["Client Work", "Travel", "Design"],
    href: "https://aloys-travels.com/",
    domain: "aloys-travels.com",
    skeleton: "aloys",
  }),
  live({
    n: "04",
    slug: "spades-solutions",
    title: "Spades Solutions",
    year: "2026",
    blurb: "Website for a growing solutions company, built to look sharp and turn visitors into enquiries.",
    tags: ["Client Work", "Business", "Design"],
    href: "https://enderguardian25.github.io/spades-solutions/index.html",
    domain: "enderguardian25.github.io/spades-solutions",
    skeleton: "spades",
  }),
  live({
    n: "05",
    slug: "danella-de-cruz",
    title: "Danella De Cruz",
    year: "2026",
    blurb:
      "Portfolio and booking site for a Colombo cover artist, putting her music, story and performance schedule on one clean stage.",
    tags: ["Next.js", "Client Work", "Music"],
    href: "https://danelladc.com",
    domain: "danelladc.com",
    skeleton: "danella",
  }),
  live({
    n: "06",
    slug: "kahatagaha-graphite",
    title: "Kahatagaha Graphite",
    year: "2026",
    blurb:
      "Two homepage concepts for a Sri Lankan crystalline graphite producer, one dark and technical, one light and editorial, built from the same content and eleven material grades.",
    tags: ["HTML/CSS/JS", "Concept", "Design"],
    href: "https://enderguardian25.github.io/kgll-website/",
    domain: "enderguardian25.github.io/kgll-website",
    skeleton: "kahatagaha",
  }),
  upcoming({
    n: "07",
    slug: "interact-district-3220",
    title: "Interact District 3220",
    year: "2026",
    blurb: "New website for Interact District 3220, in progress.",
    tags: ["Client Work"],
    domain: "interactdistrict3220.org",
  }),
  upcoming({
    n: "08",
    slug: "ai-studio",
    title: "ai-studio",
    year: "2026",
    blurb: "In the works · 2026",
    domain: "ai-studio",
  }),
];

// The strip's last card: an empty window whose address bar types itself out.
export const END_CARD = {
  domain: "your-site.com",
  line: "Your project next.",
  cta: "Start a project →",
  href: "#contact",
};
