"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import Reveal from "./Reveal";
import SplitLines from "./SplitLines";
import Parallax from "./Parallax";
import { EASE } from "@/lib/motion";
import { DecodeLabel } from "./Scramble";

// Drop JPEGs into /public/photography/ and fill in src + caption.
// Leave src as null to render a placeholder card.
const photos = [
  {
    n: "01",
    src: "/photography/IMG_20260503_071804386.jpg",
    caption: "Sigiriya, from Pidurangala",
    location: "May 2026",
  },
  {
    n: "02",
    src: "/photography/IMG_20260120_081200993.jpg",
    caption: "Getting lost up Ella Rock",
    location: "Jan 2026",
  },
  {
    n: "03",
    src: "/photography/IMG_20250905_165813446%20(1).jpg",
    caption: "Thalpe, low tide",
    location: "Sep 2025",
  },
  {
    n: "04",
    src: "/photography/IMG_20250511_192659821.jpg",
    caption: "Architecture at nightfall",
    location: "May 2025",
  },
];

const IG_URL = "https://www.instagram.com/nothing._.ddc/";

function Card({ p, i }) {
  const isPlaceholder = !p.src;

  return (
    <Reveal delay={i * 0.08}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="group relative overflow-hidden border border-rule bg-ivory"
      >
        <div className="relative aspect-4/5 overflow-hidden bg-mist">
          {isPlaceholder ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                aria-hidden
                className="absolute inset-0 opacity-60"
                style={{
                  background:
                    "radial-gradient(120% 80% at 30% 20%, rgba(37,99,235,0.18), transparent 60%), radial-gradient(120% 80% at 80% 100%, rgba(11,31,58,0.12), transparent 55%)",
                }}
              />
              <div className="relative font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
                Frame {p.n} · soon
              </div>
            </div>
          ) : (
            <Image
              src={p.src}
              alt={p.caption || `Photograph ${p.n}`}
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover"
            />
          )}
        </div>

        <div className="flex items-baseline justify-between gap-4 px-4 py-4 md:px-5">
          <div className="min-w-0">
            <div className="section-label mb-1">{`Frame ${p.n}`}</div>
            <div className="truncate font-display italic text-lg md:text-xl text-ink">
              {p.caption || "Untitled"}
            </div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint whitespace-nowrap">
            {p.location || "—"}
          </div>
        </div>
      </motion.div>
    </Reveal>
  );
}

export default function Lens() {
  return (
    <section
      id="lens"
      className="relative px-6 md:px-10 py-32 md:py-44 border-t border-rule"
    >
      <div className="grid grid-cols-12 gap-6 mb-16 md:mb-24">
        <div className="col-span-12 md:col-span-3">
          <DecodeLabel className="section-label">§ 07 — Lens</DecodeLabel>
        </div>
        <div className="col-span-12 md:col-span-9 md:col-start-4">
          <SplitLines as="h2" className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-ink">
            Off-duty, <span className="italic text-electric">through glass</span>.
          </SplitLines>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl text-base md:text-lg text-ink-soft">
              Frames shot on a Nothing Phone (3a) Pro — light, geometry, and the
              occasional accident. The feed itself is private; this is the cut I
              share publicly.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {photos.map((p, i) => (
          // Alternating drift distances give the photo row a gentle stagger
          // of depth as it scrolls past.
          <Parallax key={p.n} distance={12 + (i % 2) * 10}>
            <Card p={p} i={i} />
          </Parallax>
        ))}
      </div>

      <div className="mt-12 md:mt-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <Reveal>
          <p className="max-w-md font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
            Private account — request access for the full feed.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-hover
            className="group inline-flex items-center gap-3 link-line font-display italic text-2xl md:text-4xl text-ink"
          >
            @nothing._.ddc
            <span className="font-sans not-italic text-base transition-transform duration-500 group-hover:translate-x-1.5">
              ↗
            </span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
