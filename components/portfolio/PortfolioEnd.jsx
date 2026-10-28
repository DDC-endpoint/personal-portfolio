"use client";
import { useEffect, useRef, useState } from "react";
import { ScrambleText } from "../Scramble";
import { useTyping } from "./useTyping";
import { END_CARD } from "@/lib/projects";

// /portfolio's last card: a wide empty window whose address bar types
// "your-site.com" as it comes into view, "Your project next." and a link to
// Contact on Home.

export default function PortfolioEnd() {
  const rootRef = useRef(null);
  const addressRef = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setSeen(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const typed = useTyping(addressRef, END_CARD.domain, seen, 200);

  return (
    <section
      ref={rootRef}
      data-portfolio-end
      className="mx-6 mb-[10vh] mt-[2vh] border border-rule bg-paper bg-[radial-gradient(ellipse_at_50%_20%,rgb(var(--c-sky)),transparent_60%)] md:mx-10 md:mb-[12vh]"
    >
      <div aria-hidden="true" className="flex h-[30px] items-center gap-2.5 border-b border-rule px-2.5">
        <span className="flex gap-[5px]">
          <span className="h-[7px] w-[7px] rounded-full bg-rule" />
          <span className="h-[7px] w-[7px] rounded-full bg-rule" />
          <span className="h-[7px] w-[7px] rounded-full bg-rule" />
        </span>
        <span className="flex h-[18px] min-w-0 flex-1 items-center gap-[7px] overflow-hidden rounded bg-mist px-2 font-mono text-[10px] text-ink-faint">
          <span ref={addressRef} data-address className="truncate">
            {END_CARD.domain}
          </span>
          <span data-done={typed ? "" : undefined} className="addr-caret h-2.5 w-[5px] shrink-0 bg-electric" />
        </span>
      </div>
      <div className="grid justify-items-center gap-[22px] px-[6vw] py-[9vh] text-center">
        <h2 className="font-display text-[clamp(44px,6vw,6rem)] italic leading-[0.95] text-ink">{END_CARD.line}</h2>
        <a
          href={`/${END_CARD.href}`}
          className="group inline-flex items-center gap-2 bg-electric px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ivory transition-colors duration-300 hover:bg-electric/90 dark:bg-ink dark:text-ivory dark:hover:bg-ink/90"
        >
          <ScrambleText text={END_CARD.cta} />
          {/* Outside the scramble, so the button never changes width. */}
          <span data-arrow aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </a>
      </div>
    </section>
  );
}
