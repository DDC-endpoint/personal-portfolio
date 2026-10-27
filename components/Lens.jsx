"use client";
import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import SplitLines from "./SplitLines";
import LensTile from "./lens/LensTile";
import Viewer from "./lens/Viewer";
import { DecodeLabel } from "./Scramble";
import { FRAMES, LENS_NOTE, LENS_INTRO } from "@/lib/lens";

// § 07 Lens — a compact mixed-size grid (Damian, locked 2026-10-26): six
// columns of 3:4 tiles, two 2×2 heroes and a text tile that closes the grid.
// Reference: docs/v3/spike/gallery-mockup.html. Single tile rows are sized
// from the container width so every single tile stays 3:4.

export default function Lens() {
  const [open, setOpen] = useState(null);
  const [origin, setOrigin] = useState(null);
  const returnTo = useRef(null);

  const openAt = (i) => {
    const photo = document.querySelector(`[data-frame="${FRAMES[i].n}"] [data-photo]`);
    setOrigin(photo?.getBoundingClientRect() ?? null);
    setOpen(i);
  };
  const step = (d) => setOpen((i) => (i + d + FRAMES.length) % FRAMES.length);
  const close = (i) => {
    returnTo.current = i;
    setOpen(null);
  };

  // Focus goes back to the frame the viewer closed on, once the viewer has
  // unmounted and lifted the inert lock off <main>, without scrolling to it:
  // the page stays where the visitor left it (Damian, Phase 5 gate).
  useEffect(() => {
    if (open !== null || returnTo.current === null) return;
    document.querySelector(`[data-frame="${FRAMES[returnTo.current].n}"]`)?.focus({ preventScroll: true });
    returnTo.current = null;
  }, [open]);
  const { col, row } = LENS_NOTE.area;

  return (
    <section id="lens" className="relative px-6 md:px-10 py-32 md:py-44 border-t border-rule">
      <div className="grid grid-cols-12 gap-6 mb-16 md:mb-24">
        <div className="col-span-12 md:col-span-3">
          <DecodeLabel className="section-label">§ 07 — Lens</DecodeLabel>
        </div>
        <div className="col-span-12 md:col-span-9 md:col-start-4">
          <SplitLines as="h2" className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-ink">
            Off-duty, <span className="italic text-electric">through glass</span>.
          </SplitLines>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl text-base md:text-lg text-ink-soft">{LENS_INTRO}</p>
          </Reveal>
        </div>
      </div>

      <div className="@container">
        <div
          data-lens-grid
          className="grid grid-cols-2 gap-2.5 md:grid-cols-6 md:gap-4 md:auto-rows-[calc((100cqw_-_80px)/6*4/3)]"
        >
          {FRAMES.map((f, i) => (
            <LensTile key={f.n} frame={f} index={i} onOpen={openAt} />
          ))}

          <div
            data-lens-note
            style={{ "--col": `${col[0]} / ${col[1]}`, "--row": `${row[0]} / ${row[1]}` }}
            className="col-span-2 flex flex-col justify-between gap-6 border border-rule p-5 md:[grid-column:var(--col)] md:[grid-row:var(--row)]"
          >
            <div className="font-display text-4xl leading-none text-ink">
              {LENS_NOTE.count} <span className="italic text-electric">frames</span>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase leading-[1.6] tracking-[0.14em] text-ink-faint">
                {LENS_NOTE.range}
                <br />
                {LENS_NOTE.note}
              </p>
              <a
                href={LENS_NOTE.href}
                target="_blank"
                rel="noopener noreferrer"
                data-hover
                className="group mt-2 inline-flex items-center gap-2 font-display text-2xl italic text-ink"
              >
                <span className="link-line">{LENS_NOTE.handle}</span>
                <span className="font-sans text-sm not-italic transition-transform duration-500 group-hover:translate-x-1">
                  ↗
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {open !== null && <Viewer index={open} originRect={origin} onClose={close} onStep={step} />}
    </section>
  );
}
