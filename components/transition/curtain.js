import {
  TIMING,
  EXTENT,
  panelCount,
  delayOf,
  bulge,
  bulgeCap,
  edgeLight,
  restFilter,
  trail,
  clearAt,
  sampleMove,
  pieces,
  endBoxes,
  shadow,
  SEAM,
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
// What the compositor runs on its own: the panels' transforms. The rest is
// written per frame from the same samples (tick), and drawn so that a frame
// redraws only small pieces (lib/curtain.js → pieces): each panel's straight
// body and its shadow are pictures drawn once that the compositor moves, the
// trail's offset and opacity move a picture redrawn only when its blur steps,
// and only the curved ends, small layers of their own, are redrawn per frame.
// Drawn as one picture, the panel's resting drop-shadow was blurred again
// over all 130vh every frame, and a mid-range phone showed 82 frames of a
// page change where it could show 131.
//
// PageTransitions builds it when the intro plays, otherwise once the browser
// is idle, or at the first click if that comes sooner. It ships with the
// first-load bundle: as its own chunk, imported after hydration, it cost a
// round trip before the first load could lift (2026-10-29).

const STEP = 1 / 120; // the sample grid, seconds
// The blurred pieces are drawn on canvases at PX panel px to the pixel and
// scaled up by the compositor: they are Gaussians of deviation 8 px and more,
// smooth enough that the scaling is within 1/255 of a full-size drawing, at
// a sixteenth of its cost on a 2.75× phone screen. REACH is how far past its
// outline a piece reaches (4 deviations of the widest blur, plus the trail's
// offset).
const PX = 2;
const REACH = 112;

export function createCurtain(root) {
  // A panel's curved end (Curtain.jsx → End): under the body, a canvas with
  // its trail and shadow; over it, its shape and edge light.
  const end = (el, at) => {
    const over = el.querySelector(`[data-end-over="${at}"]`);
    return {
      canvas: el.querySelector(`[data-end-under="${at}"]`),
      over,
      shape: over.querySelector("[data-end-shape]"),
      edges: over.querySelector("[data-edges]"),
      edge: over.querySelector("[data-edge]"),
    };
  };
  const all = [...root.querySelectorAll("[data-panel]")].map((el) => ({
    el,
    drop: el.querySelector("[data-drop]"),
    shape: el.querySelector("[data-shape]"),
    trail: el.querySelector("[data-trail]"),
    trailCanvas: el.querySelector("[data-trail-canvas]"),
    ends: [end(el, "top"), end(el, "bottom")],
    y: EXTENT, // in screens: EXTENT below, 0 covering, −EXTENT above
    level: 0, // the moving shadow's level, carried from move to move
    filter: "", // the resting shadow last written: rewritten only on a theme change
    placed: "", // the layout its pieces were last placed for: redone only on a resize
    trailDrawn: "", // what the trail's canvas holds: redrawn when its blur steps
    anims: [], // the running move's animations
    samples: null, // the running move's samples, for a resize
    frames: null, // the move's frames as style values; `at` the one written last
    at: -1,
  }));
  const rider = root.querySelector("[data-rider]");
  const label = root.querySelector("[data-label]");
  let panels = all;
  let width = 0; // the curtain's: the viewport less the scrollbar's room
  let unit = 0; // the px the panels' edges are placed in (see layout)
  let geo = null; // the panels' pieces, in panel px (see layout)
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
    // The pieces (lib/curtain.js → pieces), in panel px: the edges, the
    // path's width `ww` and the panel's `W` (as the CSS's), each end's box,
    // and the canvases, each its piece's box plus the blur's reach.
    const w = width / panels.length;
    const top = unit * 0.15, bot = unit * 1.15;
    const boxes = endBoxes(top, bot, bulgeCap(vh, w));
    const W = w + 1, ww = Math.ceil(w) + 1;
    const canvas = (y, h) => ({ x: -REACH, y: y - REACH, w: Math.ceil((W + 2 * REACH) / PX), h: Math.ceil((h + 2 * REACH) / PX) });
    geo = {
      top, bot, W, ww, boxes,
      key: `${top} ${bot} ${W} ${boxes.map((b) => `${b.y} ${b.h}`)}`,
      trail: canvas(top + SEAM, bot - top - 2 * SEAM),
      ends: boxes.map((b) => canvas(b.y, b.h)),
    };
    for (const p of panels) {
      if (p.placed === geo.key) continue;
      p.placed = geo.key;
      p.trailDrawn = "";
      p.shape.style.clipPath = pieces(top, bot, ww, 0).body;
      fit(p.trailCanvas, geo.trail);
      p.ends.forEach((e, k) => {
        fit(e.canvas, geo.ends[k]);
        e.over.style.height = `${boxes[k].h}px`;
        e.over.style.bottom = "auto";
        e.over.style.transform = `translate3d(0, ${boxes[k].y}px, 0)`;
      });
    }
  };
  // A canvas over its box, PX panel px to its pixel (setting its size clears it).
  // The pieces are placed by transforms: moved by top or left, the intro's
  // visible curtain counted as a layout shift (CLS 0.7).
  const fit = (el, c) => {
    el.width = c.w;
    el.height = c.h;
    Object.assign(el.style, { transform: `translate3d(${c.x}px, ${c.y}px, 0)`, width: `${c.w * PX}px`, height: `${c.h * PX}px` });
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

  // What one sample of a move looks like on a panel: style values for the
  // panel and its ends' shapes and edges, and the numbers the canvases draw.
  function frame(s, theme) {
    const vh = window.innerHeight;
    const w = width / panels.length; // as the CSS's panels
    const b = bulge(s.speed, vh, w);
    const pc = pieces(geo.top, geo.bot, geo.ww, b, [geo.boxes[0].y, geo.boxes[1].y]);
    const t = trail(s.level, s.speed, theme);
    return {
      transform: `translate3d(0, ${(s.y * vh).toFixed(2)}px, 0)`,
      b,
      ends: [pc.top, pc.bottom].map((e) => ({ ...e, mask: new Path2D(e.mask) })),
      trail: t,
      trailOpacity: t.opacity.toFixed(3),
      trailTransform: `translate3d(0, ${t.y.toFixed(1)}px, 0)`,
      edges: String(edgeLight(s.speed)),
      shade: shadeFor(theme === "dark"),
      rest: shadow(0, theme).rest,
    };
  }

  const theme = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");

  // A blurred fill on a canvas laid over its box `c` (layout → fit): the
  // outline `path` is filled with its shadow alone, a
  // Gaussian of deviation `sigma` in `shade` at `alpha`. The outline itself
  // is drawn far off the canvas and the shadow offset back onto it: a
  // canvas shadow's blur is 2σ (as drop-shadow's is σ) and every browser has
  // it, where a canvas filter isn't everywhere yet.
  const FAR = 8192;
  // `path` is in panel px less `y` (an end's mask is in its box's px), and
  // `dy` offsets it (the trail's offset).
  function blurFill(ctx, c, sigma, shade, alpha, path, y = 0, dy = 0) {
    ctx.setTransform(1 / PX, 0, 0, 1 / PX, -c.x / PX - FAR, (y + dy - c.y) / PX);
    ctx.shadowColor = `rgb(${shade} / ${alpha})`;
    ctx.shadowBlur = (2 * sigma) / PX;
    ctx.shadowOffsetX = FAR;
    ctx.fill(path);
  }

  // A frame's pieces on a panel (all but its transform). The trail's canvas
  // is redrawn only when its blur steps (its offset and opacity are the
  // compositor's); the ends are small and redrawn every frame.
  function write(p, f) {
    const t = f.trail, on = t.opacity > 0;
    p.trail.style.opacity = f.trailOpacity;
    if (on) {
      p.trail.style.transform = f.trailTransform;
      const key = `${t.blur} ${f.shade}`;
      if (p.trailDrawn !== key) {
        p.trailDrawn = key;
        const ctx = p.trailCanvas.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, geo.trail.w, geo.trail.h);
        const body = new Path2D();
        body.rect(0, geo.top + SEAM, geo.W, geo.bot - geo.top - 2 * SEAM);
        blurFill(ctx, geo.trail, t.blur, f.shade, 1, body);
      }
    }
    f.ends.forEach((e, k) => {
      const end = p.ends[k], c = geo.ends[k];
      const ctx = end.canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.w, c.h);
      const y = geo.boxes[k].y;
      if (on) blurFill(ctx, c, t.blur, f.shade, t.opacity, e.mask, y, t.y);
      blurFill(ctx, c, f.rest.blur, f.shade, f.rest.alpha, e.mask, y);
      end.shape.style.clipPath = e.shape;
      end.edge.setAttribute("d", e.edge);
      end.edges.style.opacity = f.edges;
    });
  }

  // A still frame, written as inline styles (the resting place, full cover,
  // and the end of every move).
  function paint(p, s, th) {
    const f = frame(s, th);
    p.el.style.transform = f.transform;
    const rest = restFilter(th, shadeFor(th === "dark"));
    if (p.filter !== rest) p.drop.style.filter = p.filter = rest;
    write(p, f);
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
    // Only the panel's own transform goes to the Web Animations API. The
    // rest (the edges' curves, the trail, the edge light) is written per
    // frame by the loop below, from the same frames. Keyframing those too
    // made the phone worse (57-73 frames shown a change against 83-87 for
    // the per-frame engine): an animated element gets a compositor layer of
    // its own, and the trail's is a panel-sized blurred one, re-blurred by
    // the GPU every frame; a keyframed clip-path costs a mask a frame.
    const anims = [p.el.animate(frames.map((f) => ({ offset: f.offset, transform: f.transform })), opts)];
    p.frames = frames;
    p.at = -1;
    const rest = restFilter(th, shadeFor(th === "dark"));
    if (p.filter !== rest) p.drop.style.filter = p.filter = rest;
    return anims;
  }

  // The per-frame part of a move: each panel's edges, trail and edge light,
  // from the frame nearest the move's clock. Under a stall of the main
  // thread the panels keep moving (the compositor has their transforms) and
  // only these hold until it ends.
  let raf = 0;
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!moving) return;
    const { dur, t0 } = moving;
    panels.forEach((p, i) => {
      if (!p.frames) return;
      const local = (now - t0) / 1000 - delayOf(i, panels.length);
      const at = Math.max(0, Math.min(p.frames.length - 1, Math.round(local / STEP)));
      if (at === p.at) return;
      p.at = at;
      write(p, p.frames[at]);
    });
  }

  const stop = () => {
    for (const p of all) {
      for (const a of p.anims) a.cancel();
      p.anims = [];
      p.samples = null;
      p.frames = null;
    }
    riderAnim?.cancel();
    riderAnim = null;
    moving = null;
    cancelAnimationFrame(raf);
    raf = 0;
  };

  // Move every panel to `to` (screens) over `dur` seconds, centre-out.
  // Resolves once every panel has arrived (or at once if called off).
  function move(to, dur) {
    stop();
    const th = theme();
    const my = gen;
    moving = { to, dur, t0: document.timeline.currentTime };
    raf = requestAnimationFrame(tick);
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
