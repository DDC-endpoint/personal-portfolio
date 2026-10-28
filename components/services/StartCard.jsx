"use client";
import { useRef } from "react";
import { DecodeLabel, ScrambleText } from "../Scramble";
import { useGrowCard } from "../useGrowCard";
import IsoBoard from "../IsoBoard";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { EMAIL, WHATSAPP_LINK } from "@/lib/site";
import { CONTACT } from "@/lib/contact";
import { START_TEXT } from "@/lib/services";

// /services § 05 Start a project: the growing electric card from Home's
// Contact (useGrowCard). The label stays above the card. Like Contact, the
// card is #2563EB in both themes, and its "ivory" text is text-ivory in light
// mode and text-ink in dark mode, because the ivory token turns navy there.
// The Isometric Board in ivory glass sits beside the text (above it on
// phones), as on Home's Contact (Damian, Phase 6 gate).
export default function StartCard() {
  const cardRef = useRef(null);
  const contentRef = useRef(null);
  const reduce = useReducedMotion();
  useGrowCard({ cardRef, contentRef, reduce, tile: CONTACT.tile });

  const mono = "font-mono text-[11px] uppercase tracking-[0.2em]";

  return (
    <section id="start" className="relative px-6 md:px-10 pt-28 md:pt-40 pb-20 md:pb-32 border-t border-rule">
      <DecodeLabel className="section-label">§ 05 — Start a project</DecodeLabel>

      <div ref={cardRef} data-electric-card className="mt-8 md:mt-10 rounded-lg bg-electric dark:bg-[#2563EB] text-ivory dark:text-ink">
        <div ref={contentRef} className="flex flex-col gap-10 p-7 md:flex-row md:items-center md:gap-12 md:p-14">
          <div className="flex min-w-0 flex-1 flex-col gap-10">
            <div>
              <h2 className="font-display text-5xl md:text-8xl leading-[0.9] tracking-tight">
                Let&rsquo;s build <span className="italic">your</span> site.
              </h2>
              <p className="mt-6 md:mt-8 max-w-2xl text-lg md:text-xl leading-relaxed">{START_TEXT}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                data-hover
                className={`group inline-flex items-center justify-between gap-4 rounded-full bg-ivory px-6 py-4 text-ink transition-[background-color] duration-300 hover:bg-ivory/85 focus-visible:bg-ivory/85 dark:bg-ink dark:text-ivory dark:hover:bg-ink/85 dark:focus-visible:bg-ink/85 ${mono} focus-visible:outline-offset-4`}
              >
                <ScrambleText text="Message on WhatsApp" />
                <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">
                  ↗
                </span>
              </a>
              <a
                href={`mailto:${EMAIL}?subject=Website%20enquiry`}
                data-hover
                className={`group inline-flex items-center justify-between gap-4 rounded-full border border-current px-6 py-4 transition-[background-color] duration-300 hover:bg-ivory/15 focus-visible:bg-ivory/15 dark:hover:bg-ink/15 dark:focus-visible:bg-ink/15 ${mono} focus-visible:outline-offset-4`}
              >
                <ScrambleText text="Email me" />
                <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </a>
            </div>
          </div>
          <IsoBoard
            tone="glass"
            className="order-first h-[220px] md:order-none md:h-[min(28vw,340px)] md:w-[min(30vw,380px)] md:shrink-0"
            gridClassName="w-[200px] gap-[5px] md:w-[min(22vw,270px)] md:gap-[6px]"
          />
        </div>
      </div>
    </section>
  );
}
