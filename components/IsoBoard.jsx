"use client";
import { useEffect, useRef } from "react";
import { N, LIFT, falloff, ambient, smoothing, settled, aim } from "@/lib/isoBoard";
import { useReducedMotion } from "@/lib/useReducedMotion";

// The 404 page's Isometric Board (Phase 6, from the lab; maths in
// lib/isoBoard.js), re-coloured to the site: faces in paper and ivory, rule
// hairlines, the electric edge light, the shadow in ink. Hovering lifts the
// tile under the pointer and its neighbours with a Gaussian falloff, and
// holds while the pointer rests; idle, a slow diagonal wave drifts. On phones
// a tap lifts the tile under it. Reduced motion: a settled cluster. The loop
// runs only while the board is on screen. Decorative: hidden from screen
// readers.

export default function IsoBoard() {
  const rootRef = useRef(null);
  const faces = useRef([]);
  const edges = useRef([]);
  const shadows = useRef([]);
  const pointer = useRef({ x: 0, y: 0, on: false });
  const reduced = useReducedMotion();

  useEffect(() => {
    const apply = (i, l) => {
      if (!faces.current[i] || !edges.current[i] || !shadows.current[i]) return;
      faces.current[i].style.transform = `translateZ(${(l * LIFT).toFixed(2)}px)`;
      edges.current[i].style.opacity = l.toFixed(3);
      shadows.current[i].style.opacity = (l * 0.8).toFixed(3);
      shadows.current[i].style.transform = `scale(${(1 + l * 0.25).toFixed(3)})`;
    };

    if (reduced) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) apply(r * N + c, settled(r, c));
      return;
    }

    const lift = new Float32Array(N * N);
    let raf = 0, last = 0, t = 0, onScreen = false;
    const tick = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      t += dt;
      const k = smoothing(dt);
      const p = pointer.current;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const i = r * N + c;
          const target = p.on ? falloff(r, c, p.x, p.y) : ambient(r, c, t);
          lift[i] += (target - lift[i]) * k;
          apply(i, lift[i]);
        }
      }
      raf = onScreen ? requestAnimationFrame(tick) : 0;
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen && !raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(rootRef.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const point = (r, c) => (e) => {
    const el = e.currentTarget;
    pointer.current = { ...aim(r, c, e.nativeEvent.offsetX, e.nativeEvent.offsetY, el.offsetWidth, el.offsetHeight), on: true };
  };
  // A tap holds its tile; a mouse lets go when it leaves the board.
  const leave = (e) => {
    if (e.pointerType !== "touch") pointer.current.on = false;
  };

  return (
    <div ref={rootRef} aria-hidden="true" data-iso-board className="flex h-[min(56vw,270px)] items-center justify-center">
      <div style={{ perspective: "1100px" }}>
        <div
          onPointerLeave={reduced ? undefined : leave}
          className="grid w-[min(62vw,300px)] grid-cols-5 gap-[min(0.9vw,5px)]"
          style={{ aspectRatio: "1 / 1", transform: "rotateX(54deg) rotateZ(45deg)", transformStyle: "preserve-3d" }}
        >
          {Array.from({ length: N * N }, (_, i) => {
            const r = Math.floor(i / N);
            const c = i % N;
            const on = reduced ? undefined : point(r, c);
            return (
              <div
                key={i}
                data-tile={i}
                onPointerEnter={on}
                onPointerMove={on}
                onPointerDown={on}
                className="relative"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* the shadow stays on the board, growing as the face lifts */}
                <span
                  ref={(el) => (shadows.current[i] = el)}
                  className="absolute inset-0 rounded-[2px] bg-[radial-gradient(circle,rgb(var(--c-ink)/0.35),transparent_72%)] opacity-0 dark:bg-[radial-gradient(circle,rgb(0_0_0/0.6),transparent_72%)]"
                />
                <div
                  ref={(el) => (faces.current[i] = el)}
                  data-face
                  className={`absolute inset-0 rounded-[2px] border border-rule will-change-transform ${(r + c) % 2 ? "bg-paper" : "bg-ivory"}`}
                >
                  {/* the electric edge light, written per frame */}
                  <span
                    ref={(el) => (edges.current[i] = el)}
                    className="pointer-events-none absolute inset-0 rounded-[2px] bg-[linear-gradient(135deg,rgb(var(--c-electric)/0.3),transparent_55%)] opacity-0 shadow-[inset_0_0_0_1px_rgb(var(--c-electric)/0.8)]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
