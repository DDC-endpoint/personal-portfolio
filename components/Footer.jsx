"use client";
import { YEAR } from "@/lib/site";
import Reveal from "./Reveal";

export default function Footer() {
  return (
    <footer className="relative border-t border-rule px-6 md:px-10 py-10">
      <div className="grid grid-cols-12 gap-6 items-center">
        <Reveal y={16} margin="0px" className="col-span-12 md:col-span-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          © {YEAR} Damian De Cruz
        </Reveal>
        <Reveal y={16} margin="0px" delay={0.08} className="col-span-12 md:col-span-4 text-center font-display italic text-ink text-xl">
          Made by hand, in Colombo.
        </Reveal>
        <Reveal y={16} margin="0px" delay={0.16} className="col-span-12 md:col-span-4 text-right font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          v:04 / Always evolving
        </Reveal>
      </div>
    </footer>
  );
}
