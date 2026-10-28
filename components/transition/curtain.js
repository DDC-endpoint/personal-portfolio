import {
  TIMING,
  EXTENT,
  panelCount,
  delayOf,
  ease,
  bulge,
  edgeLight,
  shadowLevel,
  shadow,
  clearAt,
} from "@/lib/curtain";

// The curtain's engine: it drives the panels Curtain.jsx renders (in the
// server HTML, idle and hidden). Each frame writes a panel's position, its
// edges' curve (a clip-path), the edge light and the shadow; the label rides
// the middle panel. Only runs while something moves. The root's data-curtain
// says where it is: idle, covering, covered or lifting.
//
// Split out of the first load, as the veil was: PageTransitions imports it
// once the browser is idle, or at the first click if that comes sooner.

const ink = "11,31,58"; // the light theme's shadow: the ink token, as rgb

export function createCurtain(root) {
  const all = [...root.querySelectorAll("[data-panel]")].map((el) => ({
    el,
    drop: el.querySelector("[data-drop]"),
    shape: el.querySelector("[data-shape]"),
    edges: el.querySelector("[data-edges]"),
    top: el.querySelector("[data-edge-top]"),
    bottom: el.querySelector("[data-edge-bottom]"),
    y: EXTENT, // in screens: EXTENT below, 0 covering, −EXTENT above
    prevY: EXTENT,
    from: EXTENT,
    to: EXTENT,
    t0: 0,
    dur: 1,
    level: 0,
  }));
  const rider = root.querySelector("[data-rider]");
  const label = root.querySelector("[data-label]");
  let panels = all;
  let raf = 0, last = 0, gen = 0, destroyed = false;
  let settle = null; // resolves the current move

  const setState = (s) => (root.dataset.curtain = s);

  // Five panels from md, three below (the outer two sit out).
  const layout = () => {
    const count = panelCount(window.innerWidth);
    panels = count === all.length ? all : all.slice(1, all.length - 1);
  };
  const mid = () => panels[Math.floor(panels.length / 2)];

  function draw(dt) {
    const vh = window.innerHeight;
    const w = window.innerWidth / panels.length;
    const ww = Math.ceil(w) + 1;
    const top = vh * 0.15, bot = vh * 1.15;
    const dark = document.documentElement.classList.contains("dark");
    for (const p of panels) {
      const speed = dt > 0 ? (p.prevY - p.y) / dt : 0; // screens a second, upwards positive
      p.prevY = p.y;
      p.el.style.transform = `translate3d(0, ${(p.y * vh).toFixed(2)}px, 0)`;
      const b = bulge(speed, vh, w);
      const tq = `${ww / 2} ${(top - 2 * b).toFixed(2)}`, bq = `${ww / 2} ${(bot + 2 * b).toFixed(2)}`;
      p.shape.style.clipPath = `path("M0 ${top} Q ${tq} ${ww} ${top} L ${ww} ${bot} Q ${bq} 0 ${bot} Z")`;
      p.level = shadowLevel(p.level, speed, dt);
      const s = shadow(p.level, dark ? "dark" : "light");
      const base = dark ? "0,0,0" : ink;
      const parts = [`drop-shadow(0 0 ${s.rest.blur}px rgba(${base},${s.rest.alpha}))`];
      if (s.move.alpha > 0.004) {
        parts.push(`drop-shadow(0 ${(-Math.sign(speed || 1) * s.move.y).toFixed(1)}px ${s.move.blur.toFixed(1)}px rgba(${base},${s.move.alpha.toFixed(3)}))`);
      }
      p.drop.style.filter = parts.join(" ");
      p.top.setAttribute("d", `M0 ${top} Q ${tq} ${ww} ${top}`);
      p.bottom.setAttribute("d", `M0 ${bot} Q ${bq} ${ww} ${bot}`);
      p.edges.style.opacity = String(edgeLight(speed));
    }
    rider.style.transform = `translate3d(0, ${(mid().y * vh).toFixed(2)}px, 0)`;
  }

  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let moving = false;
    for (const p of panels) {
      if (now < p.t0) moving = true;
      else if (p.y !== p.to) {
        const k = Math.min(1, (now - p.t0) / p.dur);
        p.y = p.from + (p.to - p.from) * ease(k);
        if (k < 1) moving = true;
      }
    }
    draw(dt);
    // One still frame after the move, so the edges settle flat and dark.
    if (moving || panels.some((p) => p.prevY !== p.y)) raf = requestAnimationFrame(step);
    else {
      raf = 0;
      draw(0);
      const done = settle;
      settle = null;
      done?.();
    }
  }

  // Move every panel to `to` (screens) over `dur` seconds, centre-out.
  function move(to, dur) {
    const now = performance.now();
    panels.forEach((p, i) => {
      p.from = p.y;
      p.to = to;
      p.t0 = now + delayOf(i, panels.length) * 1000;
      p.dur = dur * 1000;
    });
    cancelAnimationFrame(raf);
    last = now;
    raf = requestAnimationFrame(step);
    return new Promise((resolve) => (settle = resolve));
  }

  const place = (y) => {
    for (const p of all) p.y = p.prevY = p.from = p.to = y;
  };

  const onResize = () => {
    if (root.dataset.curtain === "idle") return;
    layout();
    draw(0);
  };
  window.addEventListener("resize", onResize);

  return {
    // Rise from below and cover the page. Resolves once it's fully covered.
    async cover(name = "") {
      const my = ++gen;
      cancelAnimationFrame(raf);
      layout();
      label.textContent = name;
      place(EXTENT);
      setState("covering");
      draw(0);
      await move(0, TIMING.in);
      if (destroyed || my !== gen) return;
      setState("covered");
    },
    // Fully covered at once (Back and Forward, the first load).
    coverNow(name = "") {
      ++gen;
      cancelAnimationFrame(raf);
      settle = null;
      layout();
      label.textContent = name;
      place(0);
      draw(0);
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
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    },
  };
}
