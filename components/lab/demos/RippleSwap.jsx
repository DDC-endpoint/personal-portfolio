"use client";
import { useEffect, useRef } from "react";

// Ripple Swap (signature). Two sentences occupy the same char cells; a per-cell
// energy field driven by the pointer decides which sentence each cell shows.
// Three forces feed the field: a direct streak along the swept path, a ripple
// ring expanding outward from every path point (distance ÷ speed = delay, so
// the swap propagates instead of popping), and a SUSTAINED source at the live
// hover position — a resting pointer holds its neighborhood swapped to B
// instead of healing out from under the cursor. Energy decays each frame, so
// everything else heals back to sentence A. Cells render CONTINUOUSLY from
// energy (per-frame rotateX/opacity writes, no class toggle) so the wave rolls
// through intermediate flip angles instead of stepping all-or-nothing. All
// per-frame work is direct style mutation via refs — the former homepage Marquee pattern —
// zero React state.

// The two sentences share identical word boundaries (spaces at the same
// indices) so no cell ever pairs a space with a letter — mismatched cells
// read as stray gaps mid-sentence.
const A = "The details are the design.";
const B = "The surface has its system.";

const RIPPLE_SPEED = 640; // px/s wavefront
const RING_WIDTH = 42; // px ripple thickness
const STREAK_RADIUS = 54; // px direct-path glow
// The sustained hover source is an ELLIPSE — wide along the sentence, tight
// vertically — so resting on the letters swaps a broad section, while a
// cursor passing above or below the line stays inert.
const HOVER_RADIUS_X = 170; // px sustained-source reach along the line
const HOVER_RADIUS_Y = 56; // px sustained-source reach above/below the line
const MAX_REACH = 230; // px — the ring dies out past this, it shouldn't cross the stage
const POINT_LIFE = 900; // ms a path point keeps emitting
const HEAL_TAU = 360; // ms energy decay time constant (continuous flips need a slower heal)
const FLIP_LO = 0.12; // energy where a flip starts
const FLIP_HI = 0.67; // energy where a flip completes

export default function RippleSwap({ reducedMotion }) {
  const wrapRef = useRef(null);
  const lineRef = useRef(null);

  useEffect(() => {
    if (reducedMotion) return; // CSS hover crossfade handles it (see styles)

    const wrap = wrapRef.current;
    const line = lineRef.current;
    if (!wrap || !line) return;

    const cells = Array.from(line.children);
    const glyphAs = cells.map((c) => c.firstElementChild);
    const glyphBs = cells.map((c) => c.lastElementChild);
    let centers = [];
    const energy = new Float32Array(cells.length);
    const shown = new Float32Array(cells.length); // last written flip progress
    const points = []; // recent pointer path {x, y, t}
    let hover = null; // live pointer position — sustained energy source
    let raf = null;

    // Hidden probe: sentence B laid out at its OWN natural flow, one span per
    // char. Centering B glyphs inside A-width cells reflowed B with A's letter
    // widths — narrow chars swallowed by wide cells and vice versa — so the
    // swapped sentence read as mangled. Each glyph-b is instead pinned at B's
    // true offset (centered as a whole line), measured from this probe.
    const bProbe = document.createElement("span");
    bProbe.setAttribute("aria-hidden", "true");
    bProbe.style.cssText =
      "position:absolute;left:0;top:0;visibility:hidden;white-space:pre;pointer-events:none;";
    for (let i = 0; i < cells.length; i++) {
      const s = document.createElement("span");
      s.textContent = (B[i] ?? " ") === " " ? " " : B[i];
      bProbe.appendChild(s);
    }
    line.appendChild(bProbe);

    const measure = () => {
      // Shrink-to-fit the single line, then cache cell centers.
      line.style.fontSize = "100px";
      const natural = line.scrollWidth;
      const target = wrap.clientWidth * 0.92;
      line.style.fontSize = `${Math.max(18, Math.min(100 * (target / natural), wrap.clientHeight * 0.38))}px`;
      const wr = wrap.getBoundingClientRect();
      centers = cells.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2 };
      });
      // Pin each glyph-b at sentence B's natural offset (B centered on the line).
      const lr = line.getBoundingClientRect();
      const spans = bProbe.children;
      const firstL = spans[0].getBoundingClientRect().left;
      const bWidth = spans[spans.length - 1].getBoundingClientRect().right - firstL;
      const startX = (lr.width - bWidth) / 2;
      for (let i = 0; i < cells.length; i++) {
        const bx = startX + (spans[i].getBoundingClientRect().left - firstL);
        const cellX = cells[i].getBoundingClientRect().left - lr.left;
        glyphBs[i].style.setProperty("--bx", `${bx - cellX}px`);
        glyphBs[i].style.setProperty("--btx", "0px");
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    document.fonts?.ready?.then(measure);

    const onPointerMove = (e) => {
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      hover = { x, y }; // tracks every move — the sustained source must not lag
      const last = points[points.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > 8) {
        points.push({ x, y, t: performance.now() });
        if (points.length > 40) points.shift();
      }
      start();
    };
    // pointerleave fires after touch end too — releases the held swap so the
    // line heals back to A.
    const onPointerLeave = () => {
      hover = null;
    };
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);

    // Continuous render: energy → eased flip progress → direct style writes.
    // Mid-wave cells sit at intermediate rotateX angles, so the swap reads as
    // one surface rolling across the line, and the heal is equally gradual.
    const renderCell = (i, p) => {
      if (Math.abs(p - shown[i]) < 0.003) return;
      shown[i] = p;
      // A fades out over the first ~60% of the flip, B fades in over the last
      // ~60% — they cross mid-flip like the old CSS transition pair did.
      const aOp = Math.max(0, 1 - p * 1.66);
      const bOp = Math.max(0, Math.min(1, (p - 0.4) * 1.66));
      glyphAs[i].style.transform = `rotateX(${(-88 * p).toFixed(2)}deg)`;
      glyphAs[i].style.opacity = aOp.toFixed(3);
      glyphBs[i].style.transform = `translateX(var(--btx, -50%)) rotateX(${(88 * (1 - p)).toFixed(2)}deg)`;
      glyphBs[i].style.opacity = bOp.toFixed(3);
    };

    let prevTick = null;
    const tick = () => {
      const now = performance.now();
      // Time-based decay — a per-frame retention factor would heal ~2.4x
      // faster on a 144Hz display than on 60Hz.
      const dt = prevTick == null ? 16.7 : Math.min(50, now - prevTick);
      prevTick = now;
      const decay = Math.exp(-dt / HEAL_TAU);
      while (points.length && now - points[0].t > POINT_LIFE) points.shift();

      let alive = points.length > 0 || hover != null;
      for (let i = 0; i < cells.length; i++) {
        let target = 0;
        for (let p = 0; p < points.length; p++) {
          const pt = points[p];
          const age = now - pt.t;
          const d = Math.hypot(centers[i].x - pt.x, centers[i].y - pt.y);
          const fade = 1 - age / POINT_LIFE;
          // Direct streak under the swept path.
          const streak = Math.exp((-d * d) / (2 * STREAK_RADIUS * STREAK_RADIUS)) * fade;
          // Expanding ripple ring: cells farther away light up later, and the
          // ring loses power with distance so it settles before the stage edge.
          const front = (age / 1000) * RIPPLE_SPEED;
          const off = d - front;
          const reach = Math.max(0, 1 - d / MAX_REACH);
          const ring =
            Math.exp((-off * off) / (2 * RING_WIDTH * RING_WIDTH)) * fade * 0.9 * reach;
          const v = Math.max(streak, ring);
          if (v > target) target = v;
        }
        if (hover) {
          // Sustained source: no age, no fade — a resting pointer keeps its
          // neighborhood swapped until it moves away or leaves.
          const nx = (centers[i].x - hover.x) / HOVER_RADIUS_X;
          const ny = (centers[i].y - hover.y) / HOVER_RADIUS_Y;
          const hv = Math.exp(-(nx * nx + ny * ny) / 2);
          if (hv > target) target = hv;
        }
        const e = Math.max(energy[i] * decay, target);
        energy[i] = e > 0.001 ? e : 0;
        if (energy[i] > 0) alive = true;
        let p = (e - FLIP_LO) / (FLIP_HI - FLIP_LO);
        p = p < 0 ? 0 : p > 1 ? 1 : p;
        renderCell(i, p * p * (3 - 2 * p)); // smoothstep ease
      }

      raf = alive ? requestAnimationFrame(tick) : null;
      if (!alive) {
        // Field fully decayed — make sure everything healed back to A.
        for (let i = 0; i < cells.length; i++) {
          energy[i] = 0;
          renderCell(i, 0);
        }
      }
    };
    const start = () => {
      if (raf == null) raf = requestAnimationFrame(tick);
    };

    return () => {
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      ro.disconnect();
      bProbe.remove();
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  const len = Math.max(A.length, B.length);
  const pairs = Array.from({ length: len }, (_, i) => [
    A[i] ?? " ",
    B[i] ?? " ",
  ]);

  return (
    <div
      ref={wrapRef}
      className={`ripple-swap flex h-full w-full items-center justify-center ${
        reducedMotion ? "reduced" : ""
      }`}
    >
      {/* The real sentence for AT; the animated cells are decoration. */}
      <span className="sr-only">{A}</span>
      <div
        ref={lineRef}
        aria-hidden
        className="whitespace-nowrap font-lab-display font-bold leading-none tracking-tight"
      >
        {/* Spaces render as literal NBSP (U+00A0) inside the ternaries below —
            whitespace-only text nodes don't generate grid items and would
            collapse the cell to zero width. Don't "fix" them to plain spaces. */}
        {pairs.map(([a, b], i) => (
          <span key={i} className="cell">
            <span className="glyph-a">{a === " " ? " " : a}</span>
            <span className="glyph-b">{b === " " ? " " : b}</span>
          </span>
        ))}
      </div>

      <style jsx>{`
        /* The cell takes glyph-a's natural width, so the resting sentence
           keeps its true letter spacing. glyph-b is pinned at sentence B's own
           measured flow offset (--bx, set from the JS probe) so the swapped
           sentence keeps ITS true spacing too; the 50%/-50% defaults only
           serve the no-JS / reduced-motion fallback. */
        .cell {
          position: relative;
          display: inline-block;
          perspective: 400px;
        }
        /* No transitions on the JS path — every frame writes the exact flip
           angle from the energy field, so a CSS transition would only smear
           and lag the wave. The static values below are the p = 0 state and
           the no-JS fallback. */
        .cell > span {
          backface-visibility: hidden;
        }
        .glyph-a {
          display: inline-block;
          color: rgb(232 232 230);
          transform: rotateX(0deg);
          opacity: 1;
        }
        .glyph-b {
          position: absolute;
          left: var(--bx, 50%);
          top: 0;
          color: rgb(59 130 246);
          transform: translateX(var(--btx, -50%)) rotateX(88deg);
          opacity: 0;
        }
        /* Reduced motion: plain crossfade of the whole line on hover. */
        .reduced .glyph-a {
          transition: opacity 0.2s ease;
          transform: none;
        }
        .reduced .glyph-b {
          transition: opacity 0.2s ease;
          transform: translateX(-50%);
        }
        .reduced:hover .glyph-a {
          opacity: 0;
        }
        .reduced:hover .glyph-b {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
