"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useDevelop } from "./useDevelop";

// One framed photo in the § 07 grid: a hairline border, an ivory mat and the
// photo, with a highlighter that traces the frame clockwise on hover or
// keyboard focus (Damian). The whole tile is a button that opens the viewer.
// Captions are a hover overlay on md+ with a real hover, an always-on overlay
// on touch tablets, and sit under the photo, in the mat, on phones.

const TAP_MS = 350; // touch: the quick trace runs, then the viewer opens

export default function LensTile({ frame, index, onOpen }) {
  const ref = useRef(null);
  const pointer = useRef("");
  const timers = useRef([]);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  useDevelop({ rootRef: ref, canvasRef, imgRef });

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const onClick = () => {
    if (pointer.current !== "touch") return onOpen(index);
    const el = ref.current;
    el.setAttribute("data-tapped", "");
    timers.current.push(
      setTimeout(() => onOpen(index), TAP_MS),
      setTimeout(() => el.removeAttribute("data-tapped"), TAP_MS + 550)
    );
  };

  const { n, caption, month, hero, area } = frame;
  return (
    <button
      ref={ref}
      type="button"
      data-frame={n}
      aria-label={`Frame ${n}: ${caption}, ${month}. Open viewer`}
      onPointerDown={(e) => (pointer.current = e.pointerType)}
      onKeyDown={() => (pointer.current = "")}
      onClick={onClick}
      style={{ "--col": `${area.col[0]} / ${area.col[1]}`, "--row": `${area.row[0]} / ${area.row[1]}` }}
      className={`group relative flex flex-col cursor-pointer border border-rule bg-ivory text-left md:[grid-column:var(--col)] md:[grid-row:var(--row)] ${
        hero ? "col-span-2 p-2.5" : "p-2"
      }`}
    >
      <div data-photo className="relative aspect-3/4 w-full overflow-hidden bg-mist md:aspect-auto md:min-h-0 md:flex-1">
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
        <Image
          ref={imgRef}
          src={frame.src}
          alt={`${caption}, ${month}`}
          fill
          sizes={hero ? "(min-width: 768px) 34vw, 100vw" : "(min-width: 768px) 17vw, 50vw"}
          className="object-cover"
        />
      </div>
      <Caption frame={frame} />
      <svg
        data-highlight
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px h-[calc(100%+2px)] w-[calc(100%+2px)] overflow-visible"
      >
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          pathLength="1"
          className="fill-none stroke-electric [stroke-dasharray:1_1] [stroke-dashoffset:1] [stroke-width:1.5] [transition:stroke-dashoffset_.6s_cubic-bezier(.65,0,.35,1)] [vector-effect:non-scaling-stroke] group-hover:[stroke-dashoffset:0] group-focus-visible:[stroke-dashoffset:0] group-data-tapped:[stroke-dashoffset:0] group-data-tapped:[transition-duration:.35s]"
        />
      </svg>
    </button>
  );
}

// One caption, placed per breakpoint: in the mat under the photo on phones;
// on md+ an overlay across the photo's foot, clipped to the photo so its
// slide-up never spills onto the mat. The overlay is light on a navy wash in
// both themes, so ink and ivory swap in dark mode, like the Contact card.
function Caption({ frame: { n, caption, month, hero } }) {
  return (
    <div className={`pointer-events-none md:absolute md:overflow-hidden ${hero ? "md:inset-x-2.5 md:bottom-2.5" : "md:inset-x-2 md:bottom-2"}`}>
      <div
        data-caption
        aria-hidden="true"
        className={`flex items-end justify-between gap-2 pt-2 pb-0.5 font-mono uppercase leading-[1.4] tracking-[0.12em] text-ink-faint md:bg-linear-to-t md:from-ink/72 md:to-transparent md:text-ivory md:dark:from-ivory/72 md:dark:text-ink ${
          hero ? "text-[10px] md:px-3.5 md:pb-3 md:pt-12" : "text-[9px] md:px-3 md:pb-2.5 md:pt-9"
        } transition-[opacity,translate] duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)] can-hover:translate-y-2.5 can-hover:opacity-0 can-hover:group-hover:translate-y-0 can-hover:group-hover:opacity-100 can-hover:group-focus-visible:translate-y-0 can-hover:group-focus-visible:opacity-100`}
      >
        <span>
          <b className="block font-medium text-ink-soft md:text-inherit md:opacity-75">Frame {n}</b>
          {caption}
        </span>
        <span className="shrink-0">{month}</span>
      </div>
    </div>
  );
}
