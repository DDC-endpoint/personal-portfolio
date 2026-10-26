"use client";
import { useEffect, useRef } from "react";
import BrowserFrame from "./BrowserFrame";
import { SKELETONS } from "./skeletons";
import { ScrambleText } from "../Scramble";
import { END_CARD } from "@/lib/projects";

// The strip's last card: an empty window whose address bar types out
// `your-site.com` when it comes into view, with a link to Contact. The server
// HTML carries the full address; with motion allowed it is cleared on mount
// and typed in. Reduced motion keeps it as rendered.

const TYPE_MS = 70;

export default function EndCard({ style, className = "" }) {
  const rootRef = useRef(null);
  const addressRef = useRef(null);

  useEffect(() => {
    const el = addressRef.current, root = rootRef.current;
    if (!el || !root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.textContent = "";
    let timer = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        let n = 0;
        const type = () => {
          el.textContent = END_CARD.domain.slice(0, ++n);
          if (n < END_CARD.domain.length) timer = setTimeout(type, TYPE_MS);
        };
        type();
      },
      { threshold: 0.6 }
    );
    io.observe(root);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={rootRef} data-end-card="" style={style} className={className}>
      <BrowserFrame domain={END_CARD.domain} addressRef={addressRef}>
        <SKELETONS.empty />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center">
          <p className="font-display text-4xl italic leading-none text-ink md:text-5xl">{END_CARD.line}</p>
          <a
            href={END_CARD.href}
            className="inline-flex items-center gap-2 bg-electric px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ivory transition-colors duration-300 hover:bg-electric/90 dark:bg-ink dark:text-ivory dark:hover:bg-ink/90"
          >
            <ScrambleText text={END_CARD.cta} />
          </a>
        </div>
      </BrowserFrame>
    </div>
  );
}
