"use client";
import { useEffect, useRef } from "react";

// Velocity Marquee — the drag/momentum ribbon physics from
// the former homepage Marquee (offset + velocity blend, exponential settle),
// evolved: the track shears with its own velocity, so a hard throw puts the
// type visibly under tension before it settles back to cruise.
const WORDS = [
  "GRAB",
  "◆",
  "THROW",
  "◆",
  "SETTLE",
  "◆",
  "MOMENTUM",
  "◆",
  "TENSION",
  "◆",
];

const LOOP_SECONDS = 26;
const SETTLE_TAU = 0.9;

export default function VelocityMarquee({ reducedMotion }) {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    let offset = 0;
    let velocity = 0;
    let single = 0;
    let baseline = 0;
    let skew = 0;
    let dragging = false;
    let lastPointerX = 0;
    let lastMoveT = 0;

    const measure = () => {
      single = track.scrollWidth / 2;
      baseline = reducedMotion ? 0 : -single / LOOP_SECONDS;
    };
    measure();
    document.fonts?.ready?.then(measure);
    velocity = baseline;

    const wrap = () => {
      if (single <= 0) return;
      offset = ((offset % single) + single) % single - single;
    };

    let raf = null;
    let running = false;
    let lastFrame = 0;

    const apply = () => {
      // Shear follows velocity: cruise speed reads as ~0deg, a throw peaks it.
      const targetSkew = Math.max(-18, Math.min(18, (velocity - baseline) / 90));
      skew += (targetSkew - skew) * 0.12;
      track.style.transform = `translate3d(${offset}px,0,0) skewX(${skew}deg)`;
    };

    const frame = (now) => {
      const dt = Math.min((now - lastFrame) / 1000 || 0, 0.05);
      lastFrame = now;
      if (!dragging) {
        const k = 1 - Math.exp(-dt / SETTLE_TAU);
        velocity += (baseline - velocity) * k;
        offset += velocity * dt;
        wrap();
      }
      apply();
      const settled =
        !dragging && baseline === 0 && Math.abs(velocity) < 0.05 && Math.abs(skew) < 0.05;
      if (settled) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onPointerDown = (e) => {
      dragging = true;
      velocity = 0;
      lastPointerX = e.clientX;
      lastMoveT = performance.now();
      try {
        section.setPointerCapture?.(e.pointerId);
      } catch {}
      section.style.cursor = "grabbing";
      start();
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastPointerX;
      const dt = (now - lastMoveT) / 1000;
      offset += dx;
      wrap();
      if (dt > 0) velocity = velocity * 0.7 + (dx / dt) * 0.3;
      apply();
      lastPointerX = e.clientX;
      lastMoveT = now;
    };
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      section.style.cursor = "grab";
      if (e?.pointerId != null) {
        try {
          section.releasePointerCapture?.(e.pointerId);
        } catch {}
      }
      start();
    };

    section.style.cursor = "grab";
    section.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    const ro = new ResizeObserver(() => {
      measure();
      wrap();
      if (!running) start();
    });
    ro.observe(section);
    start();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      section.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      ro.disconnect();
    };
  }, [reducedMotion]);

  return (
    <div className="flex h-full w-full items-center bg-[#07070a]">
      <section
        ref={sectionRef}
        aria-label="Draggable marquee of words about momentum"
        className="w-full select-none touch-pan-y overflow-hidden border-y border-lab-line py-8"
      >
        <div ref={trackRef} className="flex whitespace-nowrap will-change-transform">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex shrink-0 items-center gap-10 pr-10">
              {WORDS.map((w, j) => (
                <span
                  key={`${i}-${j}`}
                  aria-hidden={i === 1}
                  className={`font-lab-display text-4xl font-bold sm:text-6xl ${
                    w === "◆" ? "text-[#3b82f6] text-2xl sm:text-3xl" : "text-lab-text"
                  }`}
                >
                  {w}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
