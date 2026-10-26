"use client";
import { motion } from "framer-motion";
import Reveal from "./Reveal";
import SplitLines from "./SplitLines";
import GlitchField from "./GlitchField";
import { EASE } from "@/lib/motion";
import { DecodeLabel } from "./Scramble";

const projects = [
  {
    n: "01",
    title: "This Portfolio",
    year: "2026",
    blurb:
      "The site you're reading now — built with Next.js, Tailwind, and Framer Motion as a living journal of my work.",
    tags: ["Next.js", "Framer Motion", "Design"],
    href: "#top",
    status: "live",
  },
  {
    n: "02",
    title: "Personal Dashboard",
    year: "2026",
    blurb:
      "A self-updating homepage — RSS aggregation, reading queue, and a dashboard I open every morning.",
    tags: ["HTML/CSS/JS", "Static Site", "GitHub Pages"],
    href: "https://enderguardian25.github.io/personal-dashboard/",
    status: "live",
  },
  {
    n: "03",
    title: "Spades Solutions",
    year: "2026",
    blurb:
      "Website for a growing solutions company — a sharp, professional presence built to convert.",
    tags: ["Client Work", "Business", "Design"],
    href: "https://enderguardian25.github.io/spades-solutions/index.html",
    status: "live",
  },
  {
    n: "04",
    title: "Aloys Travels",
    year: "2026",
    blurb:
      "Web presence for a travel company — clean booking flows and an inviting design that sells the journey.",
    tags: ["Client Work", "Travel", "Design"],
    href: "https://aloys-travels.pages.dev/",
    status: "live",
  },
  {
    n: "05",
    title: "Danella De Cruz",
    year: "2026",
    blurb:
      "Portfolio and booking site for a Colombo cover artist — a clean, expressive stage for her music, story, and performance schedule.",
    tags: ["Next.js", "Client Work", "Music"],
    href: "https://danelladc.com",
    status: "live",
  },
  {
    n: "06",
    title: "Kahatagaha Graphite",
    year: "2026",
    blurb:
      "Two home-page concepts for a Sri Lankan crystalline graphite producer — one dark and technical, one light and editorial, drawn from the same content and eleven material grades.",
    tags: ["HTML/CSS/JS", "Concept", "Design"],
    href: "https://enderguardian25.github.io/kgll-website/",
    status: "live",
  },
  {
    n: "07",
    title: "Coursework Archive",
    year: "2026 →",
    blurb:
      "A growing index of university coursework, write-ups, and small lab projects.",
    tags: ["Archive", "Writing"],
    href: "#",
    status: "soon",
  },
];

function Card({ p, i }) {
  const isSoon = p.status === "soon";
  const isExternal = !isSoon && p.href.startsWith("http");

  // Live cards are links; "soon" cards render as a non-interactive, dimmed div.
  const Wrapper = isSoon ? motion.div : motion.a;
  // Both card types share a staggered scroll entrance; the stagger is capped
  // so below-the-fold cards (which trigger on their own scroll entry) don't
  // inherit long queued delays. Soon cards must LAND at 0.75 — the inline
  // opacity framer writes would otherwise override the opacity-75 class and
  // un-dim them.
  const entrance = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: isSoon ? 0.75 : 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.9, ease: EASE, delay: Math.min(i, 2) * 0.08 },
  };
  const wrapperProps = isSoon
    ? { ...entrance, className: "relative overflow-hidden block border-t border-rule py-10 md:py-14 first:border-t-0 opacity-75 cursor-default select-none" }
    : {
        ...entrance,
        href: p.href,
        target: isExternal ? "_blank" : undefined,
        rel: isExternal ? "noopener noreferrer" : undefined,
        "data-hover": true,
        className: "group relative overflow-hidden block border-t border-rule py-10 md:py-14 first:border-t-0",
      };

  return (
    <Wrapper {...wrapperProps}>
      {isSoon && (
        <GlitchField className="absolute inset-0 text-ink-soft" />
      )}
      {!isSoon && (
        // Hover fill: mist sweeps up from the bottom edge. Transform-only —
        // scale, not background transition — so the theme-flicker rule is safe.
        <span
          aria-hidden
          className="absolute inset-0 bg-mist origin-bottom scale-y-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-y-100"
        />
      )}
      <div className="relative z-10 grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 md:col-span-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            ({p.n})
          </span>
        </div>

        <div className="col-span-12 md:col-span-6">
          <h3
            className={`font-display text-5xl md:text-7xl leading-[0.9] tracking-tight text-ink ${
              isSoon ? "" : "transition-colors duration-500 group-hover:text-electric"
            }`}
          >
            {p.title}
            {isSoon && (
              <sup className="ml-3 align-top font-mono text-[10px] tracking-[0.2em] uppercase text-ink-soft not-italic">
                soon
              </sup>
            )}
          </h3>
          <p className="mt-5 md:mt-7 max-w-md text-base md:text-lg leading-relaxed text-ink-soft">
            {p.blurb}
          </p>
        </div>

        <div className="col-span-12 md:col-span-3 md:col-start-8 flex flex-wrap gap-2">
          {p.tags.map((t) => (
            <span
              key={t}
              className="font-mono text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 border border-rule rounded-full text-ink-soft"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="col-span-12 md:col-span-2 md:text-right">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            {p.year}
          </div>
          <div className="mt-2 flex md:justify-end items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSoon ? "bg-ink-soft/30" : "bg-electric animate-pulse"
              }`}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              {isSoon ? "in sketch" : "live"}
            </span>
          </div>
          {!isSoon && (
            <div className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink group-hover:text-electric transition">
              {isExternal ? "Visit" : "You're here"}&nbsp;
              {/* Arrow redraws itself on hover: stroke-dashoffset 1 → 0 over the
                  path, plus a small nudge so motion still reads in forced-colors. */}
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline-block transition-transform duration-500 group-hover:translate-x-0.5"
              >
                <path
                  d={isExternal ? "M3 11 L11 3 M4.5 3 H11 V9.5" : "M7 12 V2 M3 6 L7 2 L11 6"}
                  pathLength="1"
                  className="[stroke-dasharray:1] [stroke-dashoffset:1] group-hover:[stroke-dashoffset:0] [@media(hover:none)]:[stroke-dashoffset:0] transition-[stroke-dashoffset] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

export default function Projects() {
  return (
    <section id="work" className="relative px-6 md:px-10 py-32 md:py-44 border-t border-rule">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-3">
          <div className="md:sticky md:top-32">
            <DecodeLabel className="section-label">§ 04 — Selected Work</DecodeLabel>
          </div>
        </div>

        <div className="col-span-12 md:col-span-9 md:col-start-4">
          <SplitLines as="h2" className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-ink">
            A small but <span className="italic text-electric">growing</span> shelf.
          </SplitLines>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl text-base md:text-lg text-ink-soft">
              Six projects out in the world. One more in motion. This shelf will keep growing
              year over year — bookmark it.
            </p>
          </Reveal>

          <div className="mt-16 md:mt-24">
            {projects.map((p, i) => (
              <Card key={p.n} p={p} i={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
