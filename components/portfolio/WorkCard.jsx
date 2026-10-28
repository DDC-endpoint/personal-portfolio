"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import BrowserFrame from "../projects/BrowserFrame";
import UpcomingBuild from "./UpcomingBuild";
import { useTyping } from "./useTyping";
import { usePreview } from "./usePreview";
import { delayFor, ENTRANCE } from "@/lib/portfolio";
import { EASE, onReveal } from "@/lib/motion";

// One /portfolio card: a browser frame (status dot, the domain typing in,
// then the screenshot or, for upcoming work, the build loop) over the
// number, name, year, tags and blurb. It rises as its row enters (never
// before the curtain clears), staggered by its column (columnOf, from the
// grid), and types its address as it lands.
// The grid decides when it previews (`previewing`); the full-page capture
// swaps in then, so the page's first load carries only the top shots.
//
// Grid | List (View Morph): the frame animates its size with framer's
// `layout`; the text block animates position only, so its glyphs never
// squash. Live cards are links (a cover link over the whole card); This
// Portfolio goes Home; upcoming cards aren't links.

const GRID = {
  card: "group relative grid content-start gap-3.5",
  meta: "grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1",
  title: "text-[clamp(26px,2.3vw,36px)]",
  tags: "col-start-2 col-span-2 flex flex-wrap gap-x-3 gap-y-1",
  year: "",
  blurb: "col-start-2 col-span-2 mt-1 max-w-[44ch] text-[14.5px] leading-normal text-ink-soft",
};
const LIST = {
  card: "group relative grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 border-b border-rule py-4 md:grid-cols-[132px_minmax(0,1fr)] md:gap-6",
  meta: "grid grid-cols-[30px_minmax(0,1fr)_auto] items-baseline gap-x-3 md:grid-cols-[44px_minmax(0,1fr)_280px_70px]",
  title: "text-[clamp(28px,3vw,44px)] transition-colors duration-300 group-hover:text-electric",
  // One tag per row keeps rows on one line; phones show none.
  tags: "hidden overflow-hidden whitespace-nowrap md:col-start-3 md:row-start-1 md:flex [&>*+*]:hidden",
  year: "col-start-3 row-start-1 justify-self-end md:col-start-4",
  blurb: "hidden",
};
const MONO = "font-mono text-[11px] uppercase tracking-[0.18em]";

export default function WorkCard({ project: p, index, view, previewing, columnOf, reduced }) {
  const rootRef = useRef(null);
  const addressRef = useRef(null);
  const imgRef = useRef(null);
  const [landed, setLanded] = useState(false);
  const [delay, setDelay] = useState(0);
  const [onscreen, setOnscreen] = useState(false);
  const [full, setFull] = useState(false);
  const [fullReady, setFullReady] = useState(false);
  const live = p.status === "live";
  const s = view === "list" ? LIST : GRID;

  // The entrance: once, as the card's row enters.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setLanded(true);
    let off = () => {};
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        off = onReveal(() => {
          setDelay(delayFor(columnOf(el)));
          setLanded(true);
        });
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      off();
    };
  }, [columnOf]);

  // The loops (pulse, build) run only on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnscreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const typed = useTyping(addressRef, p.domain, landed, delay + ENTRANCE.typeAfterMs);

  useEffect(() => {
    if (previewing && live && !reduced) setFull(true);
  }, [previewing, live, reduced]);
  usePreview(imgRef, previewing && !reduced, fullReady);

  // Layout morphs: a capped per-card stagger; instant under reduced motion.
  const layout = reduced ? { duration: 0 } : { duration: 0.62, ease: EASE, delay: Math.min(index, 7) * 0.028 };

  return (
    <div
      ref={rootRef}
      data-work-card=""
      data-slug={p.slug}
      data-onscreen={String(onscreen)}
      data-in={landed ? "" : undefined}
      style={{ "--in-delay": `${delay}ms` }}
      className={s.card}
    >
      {live && (
        <a
          href={p.href}
          target={p.self ? undefined : "_blank"}
          rel={p.self ? undefined : "noopener noreferrer"}
          aria-label={`${p.title}, ${p.year} ${p.self ? "(home)" : "(opens in a new tab)"}`}
          data-hover
          className="absolute inset-0 z-10 rounded-md outline-offset-8 focus-visible:outline-2 focus-visible:outline-electric"
        />
      )}
      <motion.div layout transition={{ layout }} data-frame className="relative min-w-0">
        <BrowserFrame
          domain={p.domain}
          addressRef={addressRef}
          before={
            <span
              data-status
              data-live={String(live)}
              title={live ? "Live" : "In progress"}
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${live ? "live-dot bg-live" : "bg-rule"}`}
            />
          }
          after={<span aria-hidden="true" data-done={typed ? "" : undefined} className="addr-caret h-2.5 w-[5px] shrink-0 bg-electric" />}
        >
          {live ? (
            <img
              ref={imgRef}
              data-preview
              data-full={full ? "" : undefined}
              src={full ? p.full : p.shot}
              onLoad={() => full && setFullReady(true)}
              alt={`${p.title} website, home page`}
              width={1440}
              height={full ? undefined : 900}
              loading={index < 3 ? "eager" : "lazy"}
              decoding="async"
              className={full ? "absolute left-0 top-0 h-auto w-full will-change-transform" : "absolute inset-0 h-full w-full object-cover object-top"}
            />
          ) : (
            <UpcomingBuild />
          )}
        </BrowserFrame>
      </motion.div>
      <motion.div layout="position" transition={{ layout }} data-meta className={`min-w-0 ${s.meta}`}>
        <span className={`${MONO} text-electric`}>{p.n}</span>
        <h3 className={`font-display leading-none text-ink ${s.title}`}>{p.title}</h3>
        <span className={`${MONO} text-ink-faint ${s.year}`}>
          {p.year}{" "}
          <span aria-hidden="true" className="inline-block transition-transform duration-400 group-hover:translate-x-[3px] group-hover:-translate-y-[3px]">
            {live ? "↗" : "…"}
          </span>
        </span>
        <div data-tags className={`font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint ${s.tags}`}>
          {p.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <p data-blurb className={s.blurb}>
          {p.blurb}
        </p>
      </motion.div>
    </div>
  );
}
