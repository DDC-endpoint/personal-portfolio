"use client";
import { YEAR } from "@/lib/site";
import Reveal from "./Reveal";

// Footer B (Damian, docs/v3/spike/footer-mock.html): the three columns stay,
// the trading name sits under the © line and the page links under the
// tagline. Everything is centred on phones. No page links (Damian, Phase 6
// gate): the nav carries the pages.

const mono = "font-mono text-[11px] uppercase tracking-[0.2em]";

export default function Footer() {
  return (
    <footer className="relative border-t border-rule px-6 md:px-10 py-10">
      <div className="grid grid-cols-12 gap-6 items-center">
        <Reveal y={16} margin="0px" className="col-span-12 md:col-span-4">
          <div data-footer-col className="flex flex-col gap-1.5 text-center md:text-left">
            <span className={`${mono} text-ink-soft`}>© {YEAR} Damian De Cruz</span>
            <span className={`${mono} text-ink-faint`}>Trading as DDC Web Services</span>
          </div>
        </Reveal>
        <Reveal y={16} margin="0px" delay={0.08} className="col-span-12 md:col-span-4">
          <div data-footer-col className="flex flex-col items-center gap-2 text-center">
            <span className="font-display italic text-ink text-xl">Made by hand, in Colombo.</span>
          </div>
        </Reveal>
        <Reveal y={16} margin="0px" delay={0.16} className="col-span-12 md:col-span-4">
          <div data-footer-col className={`${mono} text-ink-soft text-center md:text-right`}>
            v:04 / Always evolving
          </div>
        </Reveal>
      </div>
    </footer>
  );
}
