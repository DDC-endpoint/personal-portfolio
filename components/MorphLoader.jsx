"use client";
import { useEffect, useRef } from "react";
import { N, TARGETS, LOAD, blobPath, stepCount, decodeText, loadKind } from "@/lib/loader";
import { shouldPlayIntro } from "@/lib/motion";

// The morph loader (docs/v3/plan-phase-6.md → "The morph loader"), on the
// curtain's middle panel, so it leaves with it. It's in the server HTML, so
// the first paint is the loader on the covering panels, never a blank page;
// CSS gates (globals.css → .morph-loader) hide it with the curtain for
// reduced motion, forced colours and no JS, with a 5 s failsafe.
//
// A full load: a blob morphs at the centre (an electric stroke, a 7% fill, a
// ghost outline trailing it) with the count inside, "DAMIAN DE CRUZ" decoding
// under it in regular-weight mono, and the coordinates under that. The count
// follows real readiness (lib/loader.js): fonts, and on Home the portrait
// prepared. At 100 the blob settles into a circle and one ring pulses out;
// then `onDone` lifts the curtain. A short load (later loads in the session):
// only the name and coordinates resolve, in about 0.4 s.
//
// Hidden from screen readers: the hero carries the name.

const NAME = "DAMIAN DE CRUZ";
const COORDS = "N 6.9271° / E 79.8612°";
const SETTLE_S = { full: 0.42, short: 0.12 };
const SHORT = { min: 0.25, max: 0.5 };
const NOISE_MS = 55;

// The server's frame (and the first client render's): deterministic.
const seeded = ((i) => () => ((i = (i * 1103515245 + 12345) & 0x7fffffff) % 1000) / 1000)(42);
const FIRST = { name: decodeText(NAME, 0, seeded), coords: decodeText(COORDS, 0, seeded), blob: blobPath(TARGETS[0], null) };

const digits = (p) =>
  String(Math.round(p))
    .split("")
    .map((d) => `<span class="ml-d">${d}</span>`)
    .join("");

// One decision per document: an effect that runs twice (React's dev double
// mount) must not read the flag it has just set.
let documentKind;

// The page is ready: fonts, and (on Home) the portrait prepared or given up.
const pageReady = (fonts) => fonts.done && !document.querySelector("[data-portrait]:not([data-prepared])");

export default function MorphLoader({ onDone }) {
  const rootRef = useRef(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !shouldPlayIntro()) return;
    const kind = (documentKind ??= loadKind(window.sessionStorage));
    root.dataset.kind = kind;
    const full = kind === "full";
    const q = (sel) => root.querySelector(sel);
    const body = q("[data-blob]"), ghost = q("[data-ghost]"), ring = q("[data-ring]");
    const count = q("[data-count]"), name = q("[data-name]"), coords = q("[data-coords]");
    const fonts = { done: false };
    document.fonts.ready.then(() => (fonts.done = true));

    const t0 = performance.now();
    let last = t0, raf = 0, noiseAt = 0;
    let radii = TARGETS[0].slice(), trail = radii.slice(), target = 1, swapAt = 0.8, t = 0;
    let p = 0, speed = 70, phase = "load", phaseAt = 0;

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const el = (now - t0) / 1000;
      if (phase === "load") {
        const ready = pageReady(fonts);
        if (full) {
          const k = 1 - Math.exp(-dt * 4.5), kg = 1 - Math.exp(-dt * 2.2);
          for (let i = 0; i < N; i++) {
            radii[i] += (TARGETS[target][i] - radii[i]) * k;
            trail[i] += (radii[i] - trail[i]) * kg;
          }
          if (t >= swapAt) {
            target = (target + 1 + ((Math.random() * 3) | 0)) % TARGETS.length;
            swapAt = t + 0.55 + Math.random() * 0.4;
            speed = 45 + Math.random() * 60;
          }
          p = stepCount({ p, el, ready, speed, dt });
        } else {
          const finished = (ready && el >= SHORT.min) || el >= SHORT.max;
          p = finished ? 100 : Math.min(LOAD.hold, (el / SHORT.min) * 100);
        }
        if (p >= 100) {
          phase = "settle";
          phaseAt = el;
          root.dataset.phase = "settle";
        }
      } else if (phase === "settle") {
        const k = 1 - Math.exp(-dt * 10);
        for (let i = 0; i < N; i++) {
          radii[i] += (1 - radii[i]) * k;
          trail[i] += (1 - trail[i]) * k * 0.8;
        }
        if (el - phaseAt > SETTLE_S[kind]) {
          phase = "done";
          root.dataset.phase = "done";
          done.current?.();
        }
      }

      const settled = phase !== "load";
      if (full) {
        body.setAttribute("d", blobPath(radii, settled ? null : t));
        ghost.setAttribute("d", blobPath(trail, settled ? null : t - 0.25));
        count.innerHTML = digits(p);
        if (phase !== "load") {
          const rk = Math.min(1, (el - phaseAt) / SETTLE_S.full);
          ring.setAttribute("r", (34 + rk * 16).toFixed(2));
          ring.style.opacity = ((1 - rk) * 0.9).toFixed(2);
        }
      }
      if (now - noiseAt > NOISE_MS || settled) {
        noiseAt = now;
        const k = full ? p / 100 : Math.min(1, el / SHORT.min);
        name.textContent = decodeText(NAME, settled ? 1 : k);
        coords.textContent = decodeText(COORDS, settled ? 1 : Math.max(0, (k - 0.3) / 0.7));
      }
      if (phase !== "done") raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={rootRef} data-nosnippet="" className="morph-loader absolute inset-0 grid place-content-center justify-items-center gap-[22px]">
      <div data-orb className="relative aspect-square w-[clamp(150px,19vw,240px)]">
        <svg viewBox="0 0 100 100" className="absolute -inset-[10%] h-[120%] w-[120%] overflow-visible">
          <path data-ghost d={FIRST.blob} className="fill-none stroke-electric opacity-[0.32] [stroke-width:0.8]" />
          <path data-blob d={FIRST.blob} className="fill-electric/[0.07] stroke-electric [stroke-width:1.3]" />
          <circle data-ring cx="50" cy="50" r="34" className="fill-none stroke-electric opacity-0 [stroke-width:0.9]" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display text-[clamp(44px,5.2vw,72px)] italic leading-none text-ink">
          <span data-count>
            <span className="ml-d">0</span>
          </span>
          <sup className="ml-1 self-start mt-[38%] font-mono text-[11px] not-italic tracking-[0.1em] text-ink-faint">%</sup>
        </div>
      </div>
      <div data-name className="whitespace-pre font-mono text-[clamp(15px,1.5vw,20px)] font-normal tracking-[0.32em] text-ink">
        {FIRST.name}
      </div>
      <div data-coords className="-mt-3 whitespace-pre font-mono text-[11px] tracking-[0.22em] text-ink-faint">
        {FIRST.coords}
      </div>
    </div>
  );
}
