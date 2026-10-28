"use client";
import { useId, useRef } from "react";
import BrowserFrame from "./BrowserFrame";
import { SKELETONS } from "./skeletons";
import { useCardDecode } from "./useCardDecode";

// One Projects card: a browser window holding the site's skeleton, its
// screenshot and the decode canvas, then a mono label `NN — Title — Year`
// and a reveal row (tags + blurb) that shows while the card is active. The
// parent decides which card is active (the centred one); this card only
// plays it. Every card is a live site and a link (Home's strip shows only
// those). Reduced motion shows the screenshot (over the skeleton, which shows
// through if the image fails) and the reveal row outright (CSS only).

export default function ProjectCard({ project: p, index, active, onFocusCard, style, className = "" }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const blurbId = useId();
  const Skeleton = SKELETONS[p.skeleton];

  useCardDecode({ active, rootRef, canvasRef, imgRef, hasShot: true });

  const body = (
    <>
      <BrowserFrame domain={p.domain}>
        {/* the skeletons hold decorative text (the ASCII mini portrait) */}
        <div data-nosnippet="" className="contents">
          <Skeleton />
        </div>
        <img
          ref={imgRef}
          src={p.shot}
          alt={`${p.title} website, home page`}
          width={1440}
          height={900}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-top opacity-0 data-[on=true]:opacity-100 motion-reduce:opacity-100 nojs:opacity-100"
        />
        <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full font-mono motion-reduce:hidden" />
      </BrowserFrame>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <span data-card-label className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink">
          {`${p.n} — ${p.title} — ${p.year}`}
        </span>
        <span
          data-reveal
          className="flex flex-wrap gap-1.5 opacity-0 transition-opacity duration-500 group-data-[active=true]:opacity-100 group-data-[decode=shot]:opacity-100 motion-reduce:opacity-100 nojs:opacity-100"
        >
          {p.tags.map((t) => (
            <span key={t} className="rounded-full border border-rule px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-soft">
              {t}
            </span>
          ))}
        </span>
      </div>
      <p id={blurbId} className="mt-2 max-w-xl text-[13px] leading-snug text-ink-soft opacity-0 transition-opacity duration-500 group-data-[active=true]:opacity-100 group-data-[decode=shot]:opacity-100 motion-reduce:opacity-100 nojs:opacity-100">
        {p.blurb}
      </p>
    </>
  );

  return (
    <a
      ref={rootRef}
      data-card={index}
      data-active={active ? "true" : "false"}
      style={style}
      href={p.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${p.title}, ${p.year} (opens in a new tab)`}
      aria-describedby={blurbId}
      onFocus={() => onFocusCard?.(index)}
      className={`group block ${className} rounded-md outline-offset-8 focus-visible:outline-2 focus-visible:outline-electric`}
    >
      {body}
    </a>
  );
}
