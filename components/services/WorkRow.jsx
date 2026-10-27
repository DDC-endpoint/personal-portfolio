"use client";
import { useId, useRef } from "react";
import BrowserFrame from "../projects/BrowserFrame";
import { SKELETONS } from "../projects/skeletons";
import { useCardDecode } from "../projects/useCardDecode";

// One /services "Recent work" row (Damian's pick of three mock-ups,
// spike/recent-work-mock.html → A): the project's browser frame, holding its
// skeleton, screenshot and decode canvas as on the Projects cards, beside its
// big italic number, title, tag, year, blurb and "Visit the site" link. Rows
// swap sides down the list; phones stack the frame over the text.
// Only two parts are interactive (Damian): the screenshot, which decodes
// while the pointer is over it (the parent picks the active row), and the
// link, which draws its underline and nudges its arrow. Both go to the site;
// the screenshot's link is a duplicate, so it's hidden from keyboards and
// screen readers, and the text link is the keyboard's stop (focusing it
// decodes the row). Nothing lifts or casts a moving shadow. The text side
// always shows. Reduced motion and no JS: the screenshot shows outright.

export default function WorkRow({ project: p, index, active, onFocusCard, linkNote }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const blurbId = useId();
  const Skeleton = SKELETONS[p.skeleton];
  const flip = index % 2 === 1;
  const external = p.self ? {} : { target: "_blank", rel: "noopener noreferrer" };

  useCardDecode({ active, rootRef, canvasRef, imgRef, hasShot: true });

  return (
    <article
      ref={rootRef}
      data-card={index}
      data-active={active ? "true" : "false"}
      className="grid grid-cols-1 items-center gap-y-8 border-t border-rule py-14 first:border-t-0 first:pt-0 md:grid-cols-12 md:gap-x-14 md:py-12"
    >
      <a
        href={p.href}
        {...external}
        tabIndex={-1}
        aria-hidden="true"
        data-row-frame
        className={`block md:col-span-6 ${flip ? "md:order-2 md:col-start-7" : ""}`}
      >
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
      </a>

      <div className={`md:col-span-5 ${flip ? "md:col-start-1 md:row-start-1" : "md:col-start-8"}`}>
        <div data-row-n className="font-display text-6xl md:text-7xl italic leading-none text-electric">
          {p.n}
        </div>
        <h3 data-row-title className="mt-3 font-display text-4xl md:text-5xl leading-[1.05] tracking-tight text-ink">
          {p.title}
        </h3>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {p.tags.map((t) => (
            <span key={t} className="rounded-full border border-rule px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
              {t}
            </span>
          ))}
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">{p.year}</span>
        </div>
        <p id={blurbId} data-row-blurb className="mt-4 max-w-md text-base md:text-lg leading-relaxed text-ink-soft">
          {p.blurb}
        </p>
        <a
          href={p.href}
          {...external}
          data-row-link
          data-hover
          aria-label={`${p.title}, ${p.year} ${linkNote ?? (p.self ? "(back to top)" : "(opens in a new tab)")}`}
          aria-describedby={blurbId}
          onFocus={() => onFocusCard?.(index)}
          className="group/link mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-electric link-line rounded-sm outline-offset-4 focus-visible:outline-2 focus-visible:outline-electric"
        >
          {p.self ? "See the portfolio" : "Visit the site"}
          <span
            data-arrow
            aria-hidden="true"
            className={`transition-transform duration-500 ${p.self ? "group-hover/link:translate-x-1" : "group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"}`}
          >
            {p.self ? "→" : "↗"}
          </span>
        </a>
      </div>
    </article>
  );
}
