"use client";
import { useEffect, useRef } from "react";
import { N, LIFT, falloff, ambient, smoothing, settled, aim as boardAim } from "@/lib/isoBoard";

// Isometric Board — a 5×5 grid tilted into an isometric-feeling plane
// (perspective wrapper → rotateX 54° rotateZ 45°, preserve-3d all the way
// down). The tile under the pointer lifts on translateZ with an accent
// edge-light, neighbors rise with a Gaussian falloff, and a soft shadow stays
// ON the board plane beneath each lifted face (a sibling at z≈0, revealed as
// the face climbs). Targets are POSITION-driven — pointerenter/pointermove
// set a board-space focus that HOLDS while the pointer rests; idle, a slow
// diagonal wave drifts across instead. One rAF smooths every tile toward its
// target with dt-based easing (1 − exp(−dt/τ)) and writes styles via refs.
// Gotcha: offsetX/Y are already inverse-mapped into the tile's local space by
// the browser, so fractional in-tile position works despite the 3D transform.
// The maths is shared with the 404 page's board (lib/isoBoard.js); the look
// here stays the lab's.

export default function IsometricBoard({ reducedMotion }) {
  const faceRefs = useRef([]);
  const edgeRefs = useRef([]);
  const shadowRefs = useRef([]);
  const pointer = useRef({ x: 0, y: 0, on: false });

  useEffect(() => {
    const faces = faceRefs.current;
    const edges = edgeRefs.current;
    const shadows = shadowRefs.current;
    if (faces.length !== N * N) return;

    const apply = (i, l) => {
      // Unmount window: React nulls ref-callback refs synchronously in the
      // commit, but this effect's cleanup (which cancels the rAF) runs
      // deferred — one tick can fire in between. Bail, don't dereference.
      if (!faces[i] || !edges[i] || !shadows[i]) return;
      faces[i].style.transform = `translateZ(${(l * LIFT).toFixed(2)}px)`;
      edges[i].style.opacity = l.toFixed(3);
      shadows[i].style.opacity = (l * 0.8).toFixed(3);
      shadows[i].style.transform = `scale(${(1 + l * 0.25).toFixed(3)})`;
    };
    if (reducedMotion) {
      // Settled composition: a pointer "parked" mid-board — a lifted cluster.
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++) apply(r * N + c, settled(r, c));
      return;
    }

    const l = new Float32Array(N * N);
    let raf = 0;
    let last = performance.now();
    let t = 0;

    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const k = smoothing(dt);
      const p = pointer.current;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const i = r * N + c;
          const target = p.on
            ? falloff(r, c, p.x, p.y)
            : ambient(r, c, t); // ambient drift
          l[i] += (target - l[i]) * k;
          apply(i, l[i]);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  // Per-tile aim: cell index + fractional offset → continuous board coords.
  const aim = (r, c) => (e) => {
    const el = e.currentTarget;
    const at = boardAim(r, c, e.nativeEvent.offsetX, e.nativeEvent.offsetY, el.offsetWidth, el.offsetHeight);
    pointer.current = { ...at, on: true };
  };

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#050507]">
      <div style={{ perspective: "1100px" }}>
        <div
          aria-hidden
          onPointerLeave={reducedMotion ? undefined : () => (pointer.current.on = false)}
          className="grid grid-cols-5 gap-[0.8cqw]"
          style={{
            // 58cqw square: rotated footprint ≈ 82cqw × 48cqw — clears the
            // 4:3 card with margin. cqw only, never cqh.
            width: "min(58cqw, 620px)",
            aspectRatio: "1 / 1",
            transform: "rotateX(54deg) rotateZ(45deg)",
            transformStyle: "preserve-3d",
          }}
        >
          {Array.from({ length: N * N }, (_, i) => {
            const r = Math.floor(i / N);
            const c = i % N;
            return (
              <div
                key={i}
                onPointerEnter={reducedMotion ? undefined : aim(r, c)}
                onPointerMove={reducedMotion ? undefined : aim(r, c)}
                className="relative"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* plane shadow — stays at z≈0, grows/darkens with the lift */}
                <span
                  ref={(el) => (shadowRefs.current[i] = el)}
                  className="absolute inset-0 rounded-[2px]"
                  style={{
                    background: "radial-gradient(circle, rgba(0,0,0,0.6), transparent 72%)",
                    opacity: 0,
                    transform: "scale(1)",
                  }}
                />
                {/* lifting face */}
                <div
                  ref={(el) => (faceRefs.current[i] = el)}
                  className={`absolute inset-0 rounded-[2px] border border-lab-line/70 will-change-transform ${
                    (r + c) % 2 ? "bg-[#0e0e13]" : "bg-[#101016]"
                  }`}
                >
                  {/* accent edge-light — opacity written per frame */}
                  <span
                    className="pointer-events-none absolute inset-0 rounded-[2px]"
                    ref={(el) => (edgeRefs.current[i] = el)}
                    style={{
                      opacity: 0,
                      boxShadow: "inset 0 0 0 1px rgba(59,130,246,0.8)",
                      background:
                        "linear-gradient(135deg, rgba(59,130,246,0.35), transparent 55%)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="pointer-events-none absolute left-4 top-4 font-lab-mono text-[10px] uppercase tracking-[0.3em] text-lab-dim">
        Iso / 5×5
      </p>
      <p className="pointer-events-none absolute bottom-4 left-4 font-lab-mono text-[10px] uppercase tracking-[0.3em] text-lab-dim">
        {reducedMotion
          ? "Settled composition"
          : "Hover — neighbors rise and hold · idle waves drift"}
      </p>
    </div>
  );
}
