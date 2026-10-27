// The page transition's drawing engine (no React): a full-screen canvas of
// electric-blue characters. cover() sweeps a band of noise down the screen and
// leaves the page covered by a dim character ramp; reveal() sweeps down again
// and clears it. While covered, the characters flicker slowly so a slow
// network never shows a frozen screen. Drawing code from the prototype,
// docs/v3/spike/page-transition.html. The maths is in lib/pageTransition.js.
//
// The state is written to canvas[data-veil]: idle → covering → covered →
// revealing → idle. The rAF loop only runs while the state isn't idle.

import { TIMING, sweepAt, arrivalAt, cellAt } from "@/lib/pageTransition";
import { NOISE } from "@/lib/decode";

const RAMP = ".·:;-=+*#%@";
const FLICKER = 1 / 200; // share of covered cells that change glyph per frame

const noise = () => NOISE[(Math.random() * NOISE.length) | 0];

export function createVeil(canvas) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, cw = 0, ch = 0, cols = 0, rows = 0;
  let jit = new Float32Array(0); // per-cell randomness, fixed for one run
  let colour = { ivory: "#F6F6F1", electric: "#2563EB" };
  let raf = 0;
  let destroyed = false;

  const setState = (s) => {
    canvas.dataset.veil = s;
  };

  // Size the grid from the viewport and read the theme's colours. Done at the
  // start of every run, so a resize or a theme switch in between is picked up.
  function prepare() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const root = getComputedStyle(document.documentElement);
    // next/font hashes the family name, so read the real one from its variable.
    const family = root.getPropertyValue("--font-jetbrains-mono").trim() || "monospace";
    const size = W < 768 ? 11 : 13;
    ctx.font = `700 ${size}px ${family}`;
    ctx.textBaseline = "top";
    cw = Math.ceil(ctx.measureText("M").width) || 8;
    ch = Math.ceil(size * 1.35);
    cols = Math.ceil(W / cw);
    rows = Math.ceil(H / ch);
    jit = Float32Array.from({ length: cols * rows }, () => Math.random());
    colour = {
      ivory: `rgb(${root.getPropertyValue("--c-ivory").trim()})`,
      electric: `rgb(${root.getPropertyValue("--c-electric").trim()})`,
    };
  }

  const ramp = (i) => RAMP[(jit[i] * RAMP.length) | 0];

  function cell(x, y, bg, glyph, alpha) {
    ctx.globalAlpha = bg;
    ctx.fillStyle = colour.ivory;
    ctx.fillRect(x * cw, y * ch, cw, ch);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour.electric;
    ctx.fillText(glyph, x * cw, y * ch + 1);
  }

  // One frame of a phase at time t (s into it).
  function frame(phase, t, span) {
    ctx.clearRect(0, 0, W, H);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const at = arrivalAt(sweepAt(x, y, cols, rows), jit[i], span);
        const { state, k } = cellAt(phase, t, at);
        if (state === "page") continue;
        if (state === "covered") cell(x, y, 1, ramp(i), 0.35 + 0.4 * jit[i]);
        else if (phase === "cover") cell(x, y, Math.min(1, k * 1.6), noise(), 1);
        else cell(x, y, 1 - k, noise(), 1 - k * 0.6);
      }
    }
    ctx.globalAlpha = 1;
  }

  function fill() {
    ctx.clearRect(0, 0, W, H);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      cell(x, y, 1, ramp(i), 0.35 + 0.4 * jit[i]);
    }
    ctx.globalAlpha = 1;
  }

  // While covered: a few cells change glyph each frame, until reveal().
  function flicker() {
    const n = cols * rows;
    const step = () => {
      const count = Math.max(1, Math.round(n * FLICKER));
      for (let c = 0; c < count; c++) {
        const i = (Math.random() * n) | 0;
        jit[i] = Math.random();
        cell(i % cols, (i / cols) | 0, 1, ramp(i), 0.35 + 0.4 * jit[i]);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function run(phase, span) {
    return new Promise((done) => {
      const start = performance.now();
      const step = (now) => {
        if (destroyed) return done();
        const t = Math.min(span, (now - start) / 1000);
        frame(phase, t, span);
        if (t < span) raf = requestAnimationFrame(step);
        else done();
      };
      raf = requestAnimationFrame(step);
    });
  }

  const stop = () => cancelAnimationFrame(raf);

  return {
    // Sweep down and cover the page. Resolves once it's fully covered.
    async cover() {
      stop();
      prepare();
      setState("covering");
      await run("cover", TIMING.cover);
      if (destroyed) return;
      fill();
      setState("covered");
      flicker();
    },
    // Fully covered at once (Back and Forward: the browser has already
    // switched pages, so there's nothing to sweep over).
    async coverNow() {
      stop();
      prepare();
      fill();
      setState("covered");
      flicker();
    },
    // Sweep down again and uncover the page. Resolves once it's idle.
    async reveal() {
      stop();
      setState("revealing");
      await run("reveal", TIMING.reveal);
      ctx.clearRect(0, 0, W, H);
      setState("idle");
    },
    // Drop everything at once: clear the canvas and go idle.
    clear() {
      stop();
      ctx.clearRect(0, 0, W, H);
      setState("idle");
    },
    destroy() {
      destroyed = true;
      stop();
    },
  };
}
