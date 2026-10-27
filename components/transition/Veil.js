// The page transition's drawing engine (no React): a full-screen canvas of
// electric-blue characters. cover() sweeps a band of noise down the screen and
// leaves the page covered by a dim character ramp; reveal() sweeps down again
// and clears it. While covered, the characters flicker slowly so a slow
// network never shows a frozen screen. Drawing code from the prototype,
// docs/v3/spike/page-transition.html. The maths is in lib/pageTransition.js.
//
// The state is written to canvas[data-veil]: idle → covering → covered →
// revealing → idle. The rAF loop only runs while the state isn't idle, and an
// idle canvas is 0 × 0, so it holds no memory.
//
// Cost: only the cells that change are drawn each frame (each cell once as it
// settles or clears; a front cell when its fade moves a step or its glyph
// flips), and every glyph is copied from a pre-rendered atlas instead of being
// typeset: about 25k cells on a big screen would otherwise blow the frame
// budget.

import { TIMING, sweepAt, arrivalAt, veilScale } from "@/lib/pageTransition";
import { NOISE } from "@/lib/decode";

const RAMP = ".·:;-=+*#%@";
const GLYPHS = NOISE + RAMP; // the atlas: noise first, then the ramp
const FLICKER = 1 / 200; // share of covered cells that change glyph per frame
const STEPS = 8; // a front cell's fade is drawn in this many steps
const FLIP = 0.3; // chance per frame that a front cell's noise glyph changes
// Optional drawing (front cells that are already drawn, the gradual fill)
// stops for the frame after this many ms, so a frame never blocks the main
// thread for long on a slow phone, even while other animations share it.
const BUDGET_MS = 6;

// What each cell last drew, so a frame only touches the cells that change:
// BLANK, SETTLED, or FRONT + its fade step (1 + 0..STEPS).
const BLANK = 0, SETTLED = 1, FRONT = 2;

export function createVeil(canvas) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, scale = 1, cw = 0, ch = 0, cols = 0, rows = 0;
  let jit = new Float32Array(0); // per-cell randomness, fixed for one run
  let at = new Float32Array(0); // per-cell arrival time in the running phase
  let drawn = new Uint8Array(0);
  let filled = 0; // cells whose covered glyph is drawn (a gradual fill runs up to all)
  let atlas = null;
  let colour = { ivory: "#F6F6F1", electric: "#2563EB" };
  let raf = 0;
  let settle = null; // resolves the running sweep if it's stopped early
  let gen = 0; // bumped by every public call: a stale run never takes over
  let running = null; // { phase, span } while a sweep runs
  let destroyed = false;

  canvas.width = canvas.height = 0;

  const setState = (s) => {
    canvas.dataset.veil = s;
  };

  // Size the grid from the viewport and read the theme's colours. Done at the
  // start of every run (and on a resize while not idle), so a resize or a
  // theme switch in between is picked up.
  function prepare() {
    W = window.innerWidth;
    H = window.innerHeight;
    scale = veilScale(W, H, window.devicePixelRatio);
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const root = getComputedStyle(document.documentElement);
    // next/font hashes the family name, so read the real one from its variable.
    const family = root.getPropertyValue("--font-jetbrains-mono").trim() || "monospace";
    const size = W < 768 ? 11 : 13;
    const font = `700 ${size}px ${family}`;
    ctx.font = font;
    cw = Math.ceil(ctx.measureText("M").width) || 8;
    ch = Math.ceil(size * 1.35);
    cols = Math.ceil(W / cw);
    rows = Math.ceil(H / ch);
    jit = Float32Array.from({ length: cols * rows }, () => Math.random());
    at = new Float32Array(cols * rows);
    drawn = new Uint8Array(cols * rows);
    colour = {
      ivory: `rgb(${root.getPropertyValue("--c-ivory").trim()})`,
      electric: `rgb(${root.getPropertyValue("--c-electric").trim()})`,
    };
    // Off-screen: the atlas is never shown, only copied from.
    const aw = Math.ceil(GLYPHS.length * cw * scale), ah = Math.ceil(ch * scale);
    atlas = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(aw, ah) : Object.assign(document.createElement("canvas"), { width: aw, height: ah });
    const a = atlas.getContext("2d");
    a.setTransform(scale, 0, 0, scale, 0, 0);
    a.font = font;
    a.textBaseline = "top";
    a.fillStyle = colour.electric;
    for (let g = 0; g < GLYPHS.length; g++) a.fillText(GLYPHS[g], g * cw, 1);
    if (running) arrivals(running.span);
  }

  function arrivals(span) {
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        at[i] = arrivalAt(sweepAt(x, y, cols, rows), jit[i], span);
      }
  }

  const noise = () => (Math.random() * NOISE.length) | 0;
  const ramp = (i) => NOISE.length + ((jit[i] * RAMP.length) | 0);
  const dim = (i) => 0.35 + 0.4 * jit[i];

  function cell(i, bg, glyph, alpha) {
    const x = (i % cols) * cw, y = ((i / cols) | 0) * ch;
    ctx.clearRect(x, y, cw, ch);
    ctx.globalAlpha = bg;
    ctx.fillStyle = colour.ivory;
    ctx.fillRect(x, y, cw, ch);
    ctx.globalAlpha = alpha;
    ctx.drawImage(atlas, glyph * cw * scale, 0, cw * scale, ch * scale, x, y, cw, ch);
  }

  // A glyph alone, on a cell already filled with ivory.
  function glyph(i, g, alpha) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(atlas, g * cw * scale, 0, cw * scale, ch * scale, (i % cols) * cw, ((i / cols) | 0) * ch, cw, ch);
  }

  function blank(i) {
    ctx.clearRect((i % cols) * cw, ((i / cols) | 0) * ch, cw, ch);
  }

  // One frame of a phase at time t (s into it): only the cells that change.
  // The hot loop: cellAt() (lib/pageTransition.js) inlined, with no
  // allocation per cell. k < 0: not reached; 0..1: at the front; > 1: passed.
  // Cells that settle, clear or reach the front are always drawn; redrawing a
  // front cell already drawn (its fade or glyph) waits for spare time.
  function frame(phase, t) {
    const cover = phase === "cover";
    const front = TIMING.front;
    const t0 = performance.now();
    let optional = 0;
    let spare = true;
    for (let i = 0; i < drawn.length; i++) {
      const k = (t - at[i]) / front;
      const atFront = cover ? k >= 0 && k < 1 : k >= 0 && k <= 1;
      if (atFront) {
        const step = FRONT + Math.min(STEPS, (k * STEPS) | 0);
        if (drawn[i] >= FRONT) {
          if (step === drawn[i] && Math.random() > FLIP) continue;
          if ((++optional & 31) === 0) spare = performance.now() - t0 < BUDGET_MS;
          if (!spare) continue;
        }
        const q = (step - FRONT) / STEPS; // the fade, in steps
        if (cover) cell(i, Math.min(1, q * 1.6), noise(), 1);
        else cell(i, 1 - q, noise(), 1 - q * 0.6);
        drawn[i] = step;
      } else if (cover ? k >= 1 : k < 0) {
        if (drawn[i] !== SETTLED) cell(i, 1, ramp(i), dim(i));
        drawn[i] = SETTLED;
      } else if (drawn[i] !== BLANK) {
        blank(i);
        drawn[i] = BLANK;
      }
    }
    ctx.globalAlpha = 1;
  }

  // Cover everything: ivory at once, then the covered glyphs. `gradual` draws
  // the glyphs a few rows per frame within the budget (the flicker loop does
  // it); otherwise all at once.
  function fill(gradual = false) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = colour.ivory;
    ctx.fillRect(0, 0, W, H);
    drawn.fill(SETTLED);
    filled = 0;
    if (!gradual) fillRows(Infinity);
  }

  function fillRows(budget) {
    const t0 = performance.now();
    while (filled < drawn.length && performance.now() - t0 < budget) {
      const end = Math.min(drawn.length, filled + cols);
      for (let i = filled; i < end; i++) glyph(i, ramp(i), dim(i));
      filled = end;
    }
    ctx.globalAlpha = 1;
  }

  // While covered: finish a gradual fill, then a few cells change glyph each
  // frame, until the next call.
  function flicker() {
    const step = () => {
      const n = drawn.length;
      if (filled < n) {
        fillRows(BUDGET_MS);
        raf = requestAnimationFrame(step);
        return;
      }
      const count = Math.max(1, Math.round(n * FLICKER));
      for (let c = 0; c < count; c++) {
        const i = (Math.random() * n) | 0;
        jit[i] = Math.random();
        cell(i, 1, ramp(i), dim(i));
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // Run a sweep. The clock starts at its first frame, so a busy main thread
  // (a page commit, say) never makes it start partway through.
  function run(phase, span) {
    running = { phase, span };
    arrivals(span);
    return new Promise((done) => {
      settle = done;
      let start;
      const step = (now) => {
        start ??= now;
        const t = Math.min(span, (now - start) / 1000);
        frame(phase, t);
        if (t < span) raf = requestAnimationFrame(step);
        else {
          running = null;
          settle = null;
          done();
        }
      };
      raf = requestAnimationFrame(step);
    });
  }

  // Stop whatever is drawing; a sweep in progress resolves (its caller sees
  // a newer generation and stands down).
  function stop() {
    cancelAnimationFrame(raf);
    running = null;
    settle?.();
    settle = null;
  }

  // A resize while not idle: rebuild the grid at the new size. A sweep picks
  // up from its own clock; anything covered is redrawn covered first.
  function onResize() {
    const state = canvas.dataset.veil;
    if (state === "idle") return;
    prepare();
    if (state !== "covering") fill();
  }
  window.addEventListener("resize", onResize);

  return {
    // Sweep down and cover the page. Resolves once it's fully covered.
    async cover() {
      const my = ++gen;
      stop();
      prepare();
      setState("covering");
      await run("cover", TIMING.cover);
      if (destroyed || my !== gen) return;
      // The sweep's last frame has settled every cell: no need to redraw.
      setState("covered");
      flicker();
    },
    // Fully covered at once (Back and Forward: the browser has already
    // switched pages, so there's nothing to sweep over). `gradual`: the
    // glyphs arrive over a few frames (the intro, where the stamp already
    // covers the page), so drawing them is never one long task.
    async coverNow({ gradual = false } = {}) {
      ++gen;
      stop();
      prepare();
      fill(gradual);
      setState("covered");
      flicker();
    },
    // Sweep down again and uncover the page. Resolves once it's idle.
    async reveal() {
      const my = ++gen;
      stop();
      setState("revealing");
      await run("reveal", TIMING.reveal);
      if (destroyed || my !== gen) return;
      canvas.width = canvas.height = 0; // idle: clear it and free its memory
      setState("idle");
    },
    destroy() {
      destroyed = true;
      ++gen;
      stop();
      window.removeEventListener("resize", onResize);
    },
  };
}
