import {
  TIMING,
  EXTENT,
  panelCount,
  delayOf,
  bulge,
  edgeLight,
  restFilter,
  trail,
  clearAt,
  sampleMove,
} from "@/lib/curtain";

// The curtain's engine: it drives the panels Curtain.jsx renders (in the
// server HTML, idle and hidden). A move works out every frame in advance
// (lib/curtain.js → sampleMove: a panel's position, its edges' curve, the
// edge light and the shadow, on a fixed grid) and hands them to the Web
// Animations API, so the compositor carries the panels through a stall of
// the main thread. Until 2026-10-29 each frame was computed as it came and
// written to the DOM, and when the next page's mount held the main thread
// (150-300 ms on a mid-range phone) the panels froze with it (Damian: "lag
// free regardless of the device"). The label rides the middle panel. The
// root's data-curtain says where it is: idle, covering, covered or lifting.
//
// What the compositor runs on its own: the panels' transforms, the shape's
// clip-path (Chrome composites a path() animation whose commands match from
// frame to frame, which these do), the trail's opacity and transform and the
// edge light's opacity. The trail's blur steps (a few a move) and the edge
// light's curves (SVG `d`) are keyframed too, but the main thread applies
// them, so a stall holds them for its length: a blur a pixel off, a glint
// a frame behind.
//
// PageTransitions builds it when the intro plays, otherwise once the browser
// is idle, or at the first click if that comes sooner. It ships with the
// first-load bundle: as its own chunk, imported after hydration, it cost a
// round trip before the first load could lift (2026-10-29).

const STEP = 1 / 120; // the sample grid, seconds

export function createCurtain(root) {
  const all = [...root.querySelectorAll("[data-panel]")].map((el) => ({
    el,
    drop: el.querySelector("[data-drop]"),
    shape: el.querySelector("[data-shape]"),
    trail: el.querySelector("[data-trail]"),
    trailShape: el.querySelector("[data-trail-shape]"),
    edges: el.querySelector("[data-edges]"),
    top: el.querySelector("[data-edge-top]"),
    bottom: el.querySelector("[data-edge-bottom]"),
    y: EXTENT, // in screens: EXTENT below, 0 covering, −EXTENT above
    level: 0, // the moving shadow's level, carried from move to move
    filter: "", // the resting shadow last written: rewritten only on a theme change
    anims: [], // the running move's animations
    samples: null, // the running move's samples, for a resize
  }));
  const rider = root.querySelector("[data-rider]");
  const label = root.querySelector("[data-label]");
  let panels = all;
  let width = 0; // the curtain's: the viewport less the scrollbar's room
  let unit = 0; // the px the panels' edges are placed in (see layout)
  let shade = "", shadeDark = null; // the shadow's colour, read per theme
  let gen = 0, destroyed = false;
  let riderAnim = null;
  let moving = null; // the running move: { to, dur, t0 (document time, ms) }

  const setState = (s) => (root.dataset.curtain = s);

  // Five panels from md, three below (the outer two sit out). Measured once
  // per move and on resize, never per frame: a layout read while the next
  // page is being built forces a layout of the half-built page (140 ms on a
  // mid-range phone), and the curtain stalls.
  const layout = () => {
    width = root.clientWidth;
    const count = panelCount(window.innerWidth);
    panels = count === all.length ? all : all.slice(1, all.length - 1);
    // The edges sit 15% in from the panel's top and bottom. The panel is
    // 130vh tall, and on a phone a vh is the largest viewport (the URL bar
    // hidden) while innerHeight is the current one: measured from
    // innerHeight with the bar shown, the bottom edge sat 0.15 × the bar's
    // height above the screen's bottom, and a strip of the page showed under
    // the curtain (Android Chrome, 2026-10-29). So they come from the panel's
    // own height; where that agrees with innerHeight (desktop) the exact
    // innerHeight numbers are kept.
    const vh = window.innerHeight;
    const cssVh = panels[0].el.getBoundingClientRect().height / 1.3;
    unit = Math.abs(cssVh - vh) < 1 ? vh : cssVh;
  };
  const mid = () => panels[Math.floor(panels.length / 2)];

  // The shadow: the ink token in light mode (--c-ink is "r g b"), black on
  // navy. A computed-style read mid-swap forces a style pass, so it's read
  // only when the theme changes.
  const shadeFor = (dark) => {
    if (dark !== shadeDark) {
      shadeDark = dark;
      shade = dark ? "0 0 0" : getComputedStyle(document.documentElement).getPropertyValue("--c-ink").trim() || "11 31 58";
    }
    return shade;
  };

  // What one sample of a move looks like on a panel, as style values.
  function frame(s, theme) {
    const vh = window.innerHeight;
    const w = width / panels.length; // as the CSS's panels
    const ww = Math.ceil(w) + 1;
    const top = unit * 0.15, bot = unit * 1.15;
    const b = bulge(s.speed, vh, w);
    const tq = `${ww / 2} ${(top - 2 * b).toFixed(2)}`, bq = `${ww / 2} ${(bot + 2 * b).toFixed(2)}`;
    const t = trail(s.level, s.speed, theme);
    return {
      transform: `translate3d(0, ${(s.y * vh).toFixed(2)}px, 0)`,
      clip: `path("M0 ${top} Q ${tq} ${ww} ${top} L ${ww} ${bot} Q ${bq} 0 ${bot} Z")`,
      trailOpacity: t.opacity.toFixed(3),
      trailTransform: `translate3d(0, ${t.y.toFixed(1)}px, 0)`,
      trailBlur: t.blur,
      topD: `M0 ${top} Q ${tq} ${ww} ${top}`,
      bottomD: `M0 ${bot} Q ${bq} ${ww} ${bot}`,
      edges: String(edgeLight(s.speed)),
    };
  }

  const theme = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");

  // A still frame, written as inline styles (the resting place, full cover,
  // and the end of every move).
  function paint(p, s, th) {
    const f = frame(s, th);
    p.el.style.transform = f.transform;
    p.shape.style.clipPath = f.clip;
    const rest = restFilter(th, shadeFor(th === "dark"));
    if (p.filter !== rest) p.drop.style.filter = p.filter = rest;
    p.trail.style.opacity = f.trailOpacity;
    if (s.level > 0) {
      p.trailShape.style.clipPath = f.clip;
      p.trail.style.transform = f.trailTransform;
      p.trail.style.filter = `blur(${f.trailBlur}px)`;
    }
    p.top.setAttribute("d", f.topD);
    p.bottom.setAttribute("d", f.bottomD);
    p.edges.style.opacity = f.edges;
  }
  function paintAll() {
    const th = theme();
    for (const p of panels) paint(p, { y: p.y, speed: 0, level: p.level }, th);
    rider.style.transform = `translate3d(0, ${(mid().y * window.innerHeight).toFixed(2)}px, 0)`;
  }

  // The move's keyframes for one panel, from its samples, and their
  // animations. `delay` in ms. The trail's blur gets step keyframes (its
  // value only where it changes), the rest run linearly between samples.
  function animatePanel(p, samples, delay, th) {
    const dur = samples.at(-1).t * 1000;
    const offset = (s) => (dur > 0 ? (s.t * 1000) / dur : 1);
    const frames = samples.map((s) => ({ offset: offset(s), ...frame(s, th) }));
    const opts = { duration: dur, delay, fill: "both", easing: "linear" };
    const anims = [
      p.el.animate(frames.map((f) => ({ offset: f.offset, transform: f.transform })), opts),
      p.shape.animate(frames.map((f) => ({ offset: f.offset, clipPath: f.clip })), opts),
      p.trailShape.animate(frames.map((f) => ({ offset: f.offset, clipPath: f.clip })), opts),
      p.trail.animate(frames.map((f) => ({ offset: f.offset, opacity: f.trailOpacity, transform: f.trailTransform })), opts),
      p.edges.animate(frames.map((f) => ({ offset: f.offset, opacity: f.edges })), opts),
      p.top.animate(frames.map((f) => ({ offset: f.offset, d: `path("${f.topD}")` })), opts),
      p.bottom.animate(frames.map((f) => ({ offset: f.offset, d: `path("${f.bottomD}")` })), opts),
    ];
    const blurs = [];
    for (const f of frames) {
      if (!blurs.length || blurs.at(-1).blur !== f.trailBlur) blurs.push({ offset: f.offset, blur: f.trailBlur });
    }
    blurs.push({ offset: 1, blur: blurs.at(-1).blur });
    anims.push(p.trail.animate(blurs.map((b) => ({ offset: b.offset, filter: `blur(${b.blur}px)`, easing: "step-end" })), opts));
    const rest = restFilter(th, shadeFor(th === "dark"));
    if (p.filter !== rest) p.drop.style.filter = p.filter = rest;
    return anims;
  }

  const stop = () => {
    for (const p of all) {
      for (const a of p.anims) a.cancel();
      p.anims = [];
      p.samples = null;
    }
    riderAnim?.cancel();
    riderAnim = null;
    moving = null;
  };

  // Move every panel to `to` (screens) over `dur` seconds, centre-out.
  // Resolves once every panel has arrived (or at once if called off).
  function move(to, dur) {
    stop();
    const th = theme();
    const my = gen;
    moving = { to, dur, t0: document.timeline.currentTime };
    const vh = window.innerHeight;
    const done = [];
    panels.forEach((p, i) => {
      p.samples = sampleMove(p.y, to, dur, p.level, STEP);
      p.anims = animatePanel(p, p.samples, delayOf(i, panels.length) * 1000, th);
      done.push(...p.anims.map((a) => a.finished));
    });
    const m = mid();
    riderAnim = rider.animate(
      m.samples.map((s) => ({ offset: s.t / dur, transform: `translate3d(0, ${(s.y * vh).toFixed(2)}px, 0)` })),
      { duration: dur * 1000, delay: delayOf(panels.indexOf(m), panels.length) * 1000, fill: "both", easing: "linear" },
    );
    done.push(riderAnim.finished);
    return Promise.all(done).then(
      () => {
        if (destroyed || my !== gen) return;
        for (const p of panels) {
          p.y = to;
          p.level = p.samples.at(-1).level;
        }
        // The still frame, as inline styles; then the animations go.
        stop();
        paintAll();
      },
      () => {}, // cancelled: a newer move or destroy took over
    );
  }

  const place = (y) => {
    for (const p of all) p.y = y;
  };

  // A resize mid-move rebuilds the animations for the new sizes and sets
  // them back to the move's clock.
  const onResize = () => {
    if (root.dataset.curtain === "idle") return;
    layout();
    if (!moving) return paintAll();
    const { to, dur, t0 } = moving;
    const th = theme();
    const vh = window.innerHeight;
    for (const p of all) for (const a of p.anims) a.cancel();
    riderAnim?.cancel();
    panels.forEach((p, i) => {
      if (!p.samples) p.samples = sampleMove(p.y, to, dur, p.level, STEP);
      p.anims = animatePanel(p, p.samples, delayOf(i, panels.length) * 1000, th);
      for (const a of p.anims) a.startTime = t0;
    });
    const m = mid();
    riderAnim = rider.animate(
      m.samples.map((s) => ({ offset: s.t / dur, transform: `translate3d(0, ${(s.y * vh).toFixed(2)}px, 0)` })),
      { duration: dur * 1000, delay: delayOf(panels.indexOf(m), panels.length) * 1000, fill: "both", easing: "linear" },
    );
    riderAnim.startTime = t0;
  };
  window.addEventListener("resize", onResize);

  return {
    // Rise from below and cover the page. Resolves once it's fully covered.
    async cover(name = "") {
      const my = ++gen;
      stop();
      layout();
      label.textContent = name;
      place(EXTENT);
      setState("covering");
      paintAll();
      await move(0, TIMING.in);
      if (destroyed || my !== gen) return;
      setState("covered");
    },
    // Fully covered at once (Back and Forward, the first load).
    coverNow(name = "") {
      ++gen;
      stop();
      layout();
      label.textContent = name;
      place(0);
      paintAll();
      setState("covered");
    },
    // Carry on upwards and reveal the page. `onClear` runs as the page shows
    // (lib/curtain.js → clearAt). Resolves once it's idle.
    async lift({ onClear } = {}) {
      const my = ++gen;
      setState("lifting");
      const clear = setTimeout(() => my === gen && onClear?.(), clearAt(panels.length) * 1000);
      await move(-EXTENT, TIMING.out);
      if (destroyed || my !== gen) return clearTimeout(clear);
      // Parked below again (the CSS's resting place), ready for the next cover.
      place(EXTENT);
      for (const p of all) p.el.style.transform = "";
      rider.style.transform = "";
      label.textContent = "";
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
