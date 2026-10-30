import { TIMING, EXTENT, panelCount, delayOf, edgeLight, sampleMove, clearAt } from "@/lib/curtain";

// The curtain's engine: it drives the panels Curtain.jsx renders (in the
// server HTML, idle and hidden). A move works out every frame in advance
// (lib/curtain.js → sampleMove: each panel's position and its edge light, on
// a fixed grid) and hands them to the Web Animations API. Transforms and
// opacity are all a move changes, so the compositor runs the whole move on
// its own: no frame of it waits on the main thread, whatever the next page's
// mount is doing (Damian: "60 fps on any device, fast or slow"). The label
// rides the middle panel. The root's data-curtain says where it is: idle,
// covering, covered or lifting.
//
// Until 2026-10-30 the panels had curved edges and shadows, redrawn every
// frame by a rAF loop beside the animations; a mid-range phone showed 35-41
// fps of a page change, and 48-50 with them gone (lib/curtain.js).
//
// PageTransitions builds it when the intro plays, otherwise once the browser
// is idle, or at the first click if that comes sooner. It ships with the
// first-load bundle: as its own chunk, imported after hydration, it cost a
// round trip before the first load could lift (2026-10-29).

const STEP = 1 / 120; // the sample grid, seconds

export function createCurtain(root) {
  const all = [...root.querySelectorAll("[data-panel]")].map((el) => ({
    el,
    edges: [...el.querySelectorAll("[data-edge]")],
    y: EXTENT, // in panel heights: EXTENT below, 0 covering, −EXTENT above
    anims: [], // the running move's animations
    samples: null, // the running move's samples, for a resize
  }));
  const rider = root.querySelector("[data-rider]");
  const label = root.querySelector("[data-label]");
  let panels = all;
  let unit = 0; // a panel's height in px: the unit of its travel (see layout)
  let gen = 0, destroyed = false;
  let riderAnim = null;
  let moving = null; // the running move: { to, dur, t0 (document time, ms) }

  const setState = (s) => (root.dataset.curtain = s);

  // Five panels from md, three below (the outer two sit out). Measured once
  // per move and on resize, never per frame: a layout read while the next
  // page is being built forces a layout of the half-built page (140 ms on a
  // mid-range phone). The panels travel in their own height (100vh, on a
  // phone the largest viewport, the URL bar hidden), not innerHeight (the
  // current one): a panel parked at −innerHeight left a strip of itself on
  // screen under the URL bar (Android Chrome, 2026-10-29).
  const layout = () => {
    const count = panelCount(window.innerWidth);
    panels = count === all.length ? all : all.slice(1, all.length - 1);
    unit = panels[0].el.getBoundingClientRect().height || window.innerHeight;
  };
  const mid = () => panels[Math.floor(panels.length / 2)];
  const at = (y) => `translate3d(0, ${(y * unit).toFixed(2)}px, 0)`;

  // A still frame, as inline styles (the resting place, full cover, and the
  // end of every move).
  function paintAll() {
    for (const p of panels) {
      p.el.style.transform = at(p.y);
      for (const e of p.edges) e.style.opacity = "0";
    }
    rider.style.transform = at(mid().y);
  }

  // A move's animations for one panel, from its samples: its transform and
  // its edge lights' opacity. `delay` in ms; linear between samples.
  function animatePanel(p, samples, dur, delay) {
    const opts = { duration: dur * 1000, delay, fill: "both", easing: "linear" };
    const offset = (s) => (dur > 0 ? s.t / dur : 1);
    const moveFrames = samples.map((s) => ({ offset: offset(s), transform: at(s.y) }));
    const lightFrames = samples.map((s) => ({ offset: offset(s), opacity: edgeLight(s.speed).toFixed(3) }));
    return [p.el.animate(moveFrames, opts), ...p.edges.map((e) => e.animate(lightFrames, opts))];
  }
  function animateRider(dur) {
    const m = mid();
    return rider.animate(
      m.samples.map((s) => ({ offset: dur > 0 ? s.t / dur : 1, transform: at(s.y) })),
      { duration: dur * 1000, delay: delayOf(panels.indexOf(m), panels.length) * 1000, fill: "both", easing: "linear" },
    );
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

  // Move every panel to `to` (panel heights) over `dur` seconds, centre-out.
  // Resolves once every panel has arrived (or at once if called off).
  function move(to, dur) {
    stop();
    const my = gen;
    moving = { to, dur, t0: document.timeline.currentTime };
    const done = [];
    panels.forEach((p, i) => {
      p.samples = sampleMove(p.y, to, dur, STEP);
      p.anims = animatePanel(p, p.samples, dur, delayOf(i, panels.length) * 1000);
      done.push(...p.anims.map((a) => a.finished));
    });
    riderAnim = animateRider(dur);
    done.push(riderAnim.finished);
    return Promise.all(done).then(
      () => {
        if (destroyed || my !== gen) return;
        for (const p of panels) p.y = to;
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
    for (const p of all) for (const a of p.anims) a.cancel();
    riderAnim?.cancel();
    panels.forEach((p, i) => {
      if (!p.samples) p.samples = sampleMove(p.y, to, dur, STEP);
      p.anims = animatePanel(p, p.samples, dur, delayOf(i, panels.length) * 1000);
      for (const a of p.anims) a.startTime = t0;
    });
    riderAnim = animateRider(dur);
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
