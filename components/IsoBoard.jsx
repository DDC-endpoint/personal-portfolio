"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { N, LIFT, LOOP, falloff, ambient, smoothing, settled, aim, tourLifts } from "@/lib/isoBoard";
import { useReducedMotion } from "@/lib/useReducedMotion";

// Phones and tablets: no hover. Server and hydration render read `false`
// (the desktop board), then React re-renders with the real value.
const NO_HOVER = "(hover: none)";
const subscribeHover = (onChange) => {
  const media = window.matchMedia(NO_HOVER);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const useNoHover = () =>
  useSyncExternalStore(subscribeHover, () => window.matchMedia(NO_HOVER).matches, () => false);

// The Isometric Board (Phase 6, from the lab; maths in lib/isoBoard.js),
// re-coloured to the site. On the 404 page (tone "page"): faces in paper and
// ivory, rule hairlines, the electric edge light, the shadow in ink. On the
// electric contact cards (tone "glass", Damian's gate pick): translucent
// ivory faces and hairlines, an ivory edge light, a navy shadow. (The cards
// are electric in both themes, so "ivory" and "navy" are the same colours in
// both: the ivory token in light mode is the ink token in dark.) Hovering lifts the
// tile under the pointer and its neighbours with a Gaussian falloff, and
// holds while the pointer rests; idle, a slow diagonal wave drifts. On phones
// (no hover) the board doesn't listen to touch: taps held a tile and the
// per-frame JS loop lagged while scrolling. It tours on its own instead
// (lib/isoBoard.js → tour), sampled once into Web Animations on transform
// and opacity, so the compositor runs it with no JS per frame. Reduced
// motion: a settled cluster. The motion runs only while the board is on
// screen. Decorative: hidden from screen readers.

const TONES = {
  page: {
    shade: "bg-[radial-gradient(circle,rgb(var(--c-ink)/0.35),transparent_72%)] dark:bg-[radial-gradient(circle,rgb(0_0_0/0.6),transparent_72%)]",
    face: "border-rule",
    fill: ["bg-ivory", "bg-paper"],
    edge: "bg-[linear-gradient(135deg,rgb(var(--c-electric)/0.3),transparent_55%)] shadow-[inset_0_0_0_1px_rgb(var(--c-electric)/0.8)]",
  },
  glass: {
    shade: "bg-[radial-gradient(circle,rgb(var(--c-ink)/0.5),transparent_72%)] dark:bg-[radial-gradient(circle,rgb(var(--c-ivory)/0.5),transparent_72%)]",
    face: "border-[rgb(var(--c-ivory)/0.38)] dark:border-[rgb(var(--c-ink)/0.38)]",
    fill: ["bg-[rgb(var(--c-ivory)/0.12)] dark:bg-[rgb(var(--c-ink)/0.12)]", "bg-[rgb(var(--c-ivory)/0.2)] dark:bg-[rgb(var(--c-ink)/0.2)]"],
    edge:
      "bg-[linear-gradient(135deg,rgb(var(--c-ivory)/0.38),transparent_55%)] shadow-[inset_0_0_0_1px_rgb(var(--c-ivory)/0.95)] dark:bg-[linear-gradient(135deg,rgb(var(--c-ink)/0.38),transparent_55%)] dark:shadow-[inset_0_0_0_1px_rgb(var(--c-ink)/0.95)]",
  },
};

// `className` sizes the board's box, `gridClassName` the board itself.
export default function IsoBoard({
  tone = "page",
  className = "h-[min(56vw,270px)]",
  gridClassName = "w-[min(62vw,300px)] gap-[min(0.9vw,5px)]",
}) {
  const t = TONES[tone];
  const rootRef = useRef(null);
  const faces = useRef([]);
  const edges = useRef([]);
  const shadows = useRef([]);
  const pointer = useRef({ x: 0, y: 0, on: false });
  const reduced = useReducedMotion();
  const noHover = useNoHover();

  useEffect(() => {
    // A lift (0 → 1) as each layer's styles, shared by every mode.
    const face = (l) => `translateZ(${(l * LIFT).toFixed(2)}px)`;
    const shadow = (l) => `scale(${(1 + l * 0.25).toFixed(3)})`;
    const apply = (i, l) => {
      if (!faces.current[i] || !edges.current[i] || !shadows.current[i]) return;
      faces.current[i].style.transform = face(l);
      edges.current[i].style.opacity = l.toFixed(3);
      shadows.current[i].style.opacity = (l * 0.8).toFixed(3);
      shadows.current[i].style.transform = shadow(l);
    };

    if (reduced) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) apply(r * N + c, settled(r, c));
      return;
    }

    if (noHover) {
      // The tour, on the compositor: each layer eases up from flat over
      // RISE ms, then loops. Linear between samples (12 a second).
      const RISE = 700;
      const anims = [];
      // `toFrame` turns a lift into one layer's keyframe; lift 0 is at rest.
      const run = (el, toFrame, lifts) => {
        anims.push(el.animate([toFrame(0), toFrame(lifts[0])], { duration: RISE, easing: "ease-out", fill: "forwards" }));
        anims.push(el.animate(lifts.map(toFrame), { duration: LOOP * 1000, delay: RISE, iterations: Infinity, easing: "linear" }));
      };
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const i = r * N + c;
          if (!faces.current[i] || !edges.current[i] || !shadows.current[i]) continue;
          const lifts = tourLifts(r, c);
          run(faces.current[i], (l) => ({ transform: face(l) }), lifts);
          run(edges.current[i], (l) => ({ opacity: +l.toFixed(3) }), lifts);
          run(shadows.current[i], (l) => ({ opacity: +(l * 0.8).toFixed(3), transform: shadow(l) }), lifts);
        }
      }
      // Off screen, pause; back on, resume only what was paused (play() on a
      // finished rise would replay it).
      const io = new IntersectionObserver(([e]) =>
        anims.forEach((a) => {
          if (!e.isIntersecting) a.pause();
          else if (a.playState === "paused") a.play();
        })
      );
      io.observe(rootRef.current);
      return () => {
        io.disconnect();
        anims.forEach((a) => a.cancel());
      };
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
  }, [reduced, noHover]);

  const point = (r, c) => (e) => {
    const el = e.currentTarget;
    pointer.current = { ...aim(r, c, e.nativeEvent.offsetX, e.nativeEvent.offsetY, el.offsetWidth, el.offsetHeight), on: true };
  };
  // Reduced motion and phones ignore the pointer. On a hover device with a
  // touchscreen, a tap holds its tile; a mouse lets go when it leaves.
  const deaf = reduced || noHover;
  const leave = (e) => {
    if (e.pointerType !== "touch") pointer.current.on = false;
  };

  return (
    <div ref={rootRef} aria-hidden="true" data-iso-board className={`flex items-center justify-center ${className}`}>
      <div style={{ perspective: "1100px" }}>
        <div
          onPointerLeave={deaf ? undefined : leave}
          className={`grid grid-cols-5 ${gridClassName}`}
          style={{ aspectRatio: "1 / 1", transform: "rotateX(54deg) rotateZ(45deg)", transformStyle: "preserve-3d" }}
        >
          {Array.from({ length: N * N }, (_, i) => {
            const r = Math.floor(i / N);
            const c = i % N;
            const on = deaf ? undefined : point(r, c);
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
                  className={`absolute inset-0 rounded-[2px] opacity-0 ${t.shade}`}
                />
                <div
                  ref={(el) => (faces.current[i] = el)}
                  data-face
                  className={`absolute inset-0 rounded-[2px] border will-change-transform ${t.face} ${t.fill[(r + c) % 2]}`}
                >
                  {/* the edge light, written per frame */}
                  <span ref={(el) => (edges.current[i] = el)} className={`pointer-events-none absolute inset-0 rounded-[2px] opacity-0 ${t.edge}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
