"use client";
import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { HOLD_MS, HOLD_SLOP } from "@/lib/portrait";
import { createRenderer } from "@/lib/portraitRenderer";
import { shouldPlayIntro, onReveal, onCover, isRevealed } from "@/lib/motion";
import { ring, customCursorShown } from "@/lib/cursor";
import { asset } from "@/lib/assets";

// The V3 hero: Damian's studio headshot redrawn as an electric-blue ASCII
// portrait on a canvas. Spec: docs/v3/hero-portrait.md. All maths lives in
// lib/portrait.js and the drawing and its loop in lib/portraitRenderer.js,
// which runs in a worker (lib/portrait.worker.js) where the browser can hand
// it the canvas: there its frames don't queue with the page's (on a phone,
// Home's scroll effects ran at ~36 fps behind it, 55 without). This file is
// the page side: the pointer, the observers, the curtain.
//
// The finished portrait is pre-rendered once into an offscreen "rest" canvas;
// each idle frame blits it, then adds the scan band and the flicker on top.
// The loop pauses while the portrait is off-screen or the tab is hidden.
// Reduced motion: drawn once, no loop.
//
// On every arrival on Home (Phase 6: first load, reload or page change) it
// builds itself as the curtain clears (lib/motion.js → onReveal): a 2.4 s
// wave spreads from the face — skeleton blocks, then a noise front, then the
// final glyphs. If image + font arrive later than 2.5 s into the arrival,
// the wave is skipped and the finished portrait shows instead. Once it's
// ready to draw it marks itself data-prepared, which the first-load loader
// waits for (components/MorphLoader.jsx).
//
// Lens: over the portrait the site cursor's ring grows into a lens that shows
// the full-colour photo (same fade mask), with the glyphs under it cleared.
// With the custom cursor the lens sits under the ring (lib/cursor); on touch,
// or without the custom cursor, it follows the pointer and draws its own rim.

const SRC = asset("/hero/portrait.webp");
const LATE_MS = 2500; // an image or font later than this into the arrival skips the wave
const WORKER_MS = 2000; // a worker that hasn't answered by then: the page draws it

const rgbVar = (styles, name) => styles.getPropertyValue(name).trim().split(/\s+/).map(Number);
const firstFamily = (family) => family.split(",")[0].trim().replace(/^['"]|['"]$/g, "");

function readTheme() {
  const styles = getComputedStyle(document.documentElement);
  return {
    electric: rgbVar(styles, "--c-electric"),
    bg: rgbVar(styles, "--c-ivory"),
    faint: rgbVar(styles, "--c-ink-faint"),
    dark: document.documentElement.classList.contains("dark"),
  };
}

// A worker that can draw the portrait (lib/portrait.worker.js), or null: the
// browser can't hand a canvas to a worker, or the worker lacks something the
// portrait needs, or didn't answer in time.
function startWorker() {
  if (!("transferControlToOffscreen" in HTMLCanvasElement.prototype) || typeof Worker !== "function") return Promise.resolve(null);
  let worker;
  try {
    worker = new Worker(new URL("../lib/portrait.worker.js", import.meta.url), { type: "module" });
  } catch {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const done = (ok) => {
      clearTimeout(timer);
      worker.onmessage = worker.onerror = null;
      if (!ok) worker.terminate();
      resolve(ok ? worker : null);
    };
    const timer = setTimeout(() => done(false), WORKER_MS);
    worker.onmessage = ({ data }) => done(data.result === true);
    worker.onerror = () => done(false);
    worker.postMessage({ call: "probe", id: -1 });
  });
}

// The page's @font-face rules for `name`, with absolute URLs, for the worker
// to load the same files (it can't see the page's fonts).
function fontFaces(name) {
  const faces = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // another origin's sheet
    }
    for (const rule of rules) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const get = (k) => rule.style.getPropertyValue(k).trim();
      if (get("font-family").replace(/^['"]|['"]$/g, "") !== name) continue;
      const base = sheet.href || location.href;
      const src = get("src").replace(/url\((['"]?)([^)'"]+)\1\)/g, (_, q, u) => `url("${new URL(u, base).href}")`);
      const descriptors = {};
      for (const [k, d] of [["font-weight", "weight"], ["font-style", "style"], ["font-stretch", "stretch"], ["unicode-range", "unicodeRange"]]) {
        if (get(k)) descriptors[d] = get(k);
      }
      faces.push({ src, descriptors });
    }
  }
  return faces;
}

// The renderer in the worker, called as though it were here. Every call is a
// message, sent once the worker has its canvas; the ones whose answer
// matters (a layout, a snapshot) return a promise of it.
function remoteRenderer(worker, init, emit) {
  let seq = 0;
  const waiting = new Map();
  worker.onmessage = ({ data }) => {
    if (data.event) return emit(data.event, data.data);
    waiting.get(data.id)?.(data.result);
    waiting.delete(data.id);
  };
  const send = (call, args, transfer = []) =>
    new Promise((resolve) => {
      const id = ++seq;
      waiting.set(id, resolve);
      worker.postMessage({ call, args, id }, transfer);
    });
  const ready = send("init", [init], [init.canvas, init.photo]);
  const ask = (call, ...args) => ready.then(() => send(call, args));
  const tell = (call, ...args) => ready.then(() => worker.postMessage({ call, args }));
  return {
    theme: (t) => tell("theme", t),
    layout: (width, height, ratio) => ask("layout", width, height, ratio),
    firstRest: () => tell("firstRest"),
    rebuild: () => tell("rebuild"),
    run: (should) => tell("run", should),
    startWave: () => tell("startWave"),
    lens: (state) => tell("lens", state),
    host: (state) => tell("host", state),
    snapshot: () => ask("snapshot"),
    destroy: () => worker.terminate(),
  };
}

function createPortrait({ wrapper, canvas, blob, photo, family, worker, onLayout, wave, onWaveStart, onWaveEnd }) {
  // Reduced motion and forced colours (high contrast) both get the finished
  // portrait, drawn once: no loop, no lens.
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)").matches;
  const emit = (event, data) => {
    if (event === "layout") onLayout(data.cols, data.rows);
    else if (event === "waveStart") onWaveStart();
    else if (event === "waveEnd") onWaveEnd();
  };
  let theme = readTheme();
  // The drawing (lib/portraitRenderer.js): in a worker where the browser can
  // hand it the canvas, so its frames never wait in the page's queue; else
  // here. In the worker, what it needs of the page (the curtain's reveal,
  // the custom cursor's ring) is sent to it when it changes.
  const r = worker
    ? remoteRenderer(
        worker,
        {
          canvas: canvas.transferControlToOffscreen(),
          faces: fontFaces(firstFamily(family)),
          name: firstFamily(family),
          family,
          blob,
          photo,
          wave,
          theme,
          shown: isRevealed(),
        },
        emit
      )
    : createRenderer({
        canvas,
        makeCanvas: (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h }),
        family,
        blob,
        photo,
        wave,
        host: {
          revealed: isRevealed,
          ringAt: () => {
            const b = canvas.getBoundingClientRect();
            return { x: ring.x - b.left, y: ring.y - b.top };
          },
        },
        emit,
      });
  if (!worker) r.theme(theme);
  // For the tests and the probes: what the stage shows, wherever it's drawn
  // (a canvas handed to a worker can't be read here).
  canvas.portraitSnapshot = () => Promise.resolve(r.snapshot());

  // The worker's copy of the reveal; and the cursor ring's position, sent
  // each frame while the lens follows the ring (and as it fades after).
  const shown = (v) => worker && r.host({ shown: v });
  const lensNow = { on: false, own: true, off: 0 };
  let ringRaf = 0;
  const sendRing = () => {
    ringRaf = 0;
    if (lensNow.own || (!lensNow.on && performance.now() - lensNow.off > 1000)) return;
    const b = canvas.getBoundingClientRect();
    r.host({ ring: { x: ring.x - b.left, y: ring.y - b.top } });
    ringRaf = requestAnimationFrame(sendRing);
  };
  const lens = (state) => {
    if (state.on !== undefined) {
      if (lensNow.on && !state.on) lensNow.off = performance.now();
      lensNow.on = state.on;
    }
    if (state.own !== undefined) lensNow.own = state.own;
    r.lens(state);
    if (worker && !ringRaf) sendRing();
  };

  // Pointer → lens target, in canvas coordinates.
  function aim(e, on) {
    const b = canvas.getBoundingClientRect();
    lens({ on, own: !(e.pointerType === "mouse" && customCursorShown()), tx: e.clientX - b.left, ty: e.clientY - b.top });
  }
  const lensOn = (e) => aim(e, true);
  const lensOff = () => lens({ on: false });
  // Touch (Damian, 2026-10-29): a finger on the portrait must still scroll
  // the page, so the lens opens only after a hold (HOLD_MS) with the finger
  // still. A finger that moves first, or that the browser takes for a
  // scroll (pointercancel), never opens it. Once held, moving the finger
  // drags the lens and the touchmove below keeps the page from scrolling.
  const hold = { timer: 0, x: 0, y: 0, held: false };
  const endHold = () => {
    clearTimeout(hold.timer);
    hold.timer = 0;
    hold.held = false;
  };
  const touchDown = (e) => {
    endHold();
    hold.x = e.clientX;
    hold.y = e.clientY;
    hold.timer = setTimeout(() => {
      hold.timer = 0;
      hold.held = true;
      lensOn(e);
    }, HOLD_MS);
  };
  const touchMove = (e) => {
    if (hold.held) aim(e);
    else if (hold.timer && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > HOLD_SLOP) endHold();
  };
  const touchEnd = () => {
    endHold();
    lens({ on: false });
  };
  const mouse = (e) => e.pointerType === "mouse";
  const pointerEvents = {
    pointerenter: (e) => mouse(e) && lensOn(e),
    pointerdown: (e) => (mouse(e) ? lensOn(e) : touchDown(e)),
    pointermove: (e) => (mouse(e) ? aim(e) : touchMove(e)),
    pointerleave: (e) => mouse(e) && lensOff(),
    pointercancel: (e) => (mouse(e) ? lensOff() : touchEnd()),
    pointerup: (e) => !mouse(e) && touchEnd(),
    // While the lens is held, the finger moves the lens, not the page.
    touchmove: (e) => hold.held && e.cancelable && e.preventDefault(),
    // A long press must not open the browser's menu over the portrait.
    contextmenu: (e) => (hold.timer || hold.held) && e.preventDefault(),
  };

  // Under a full curtain (a page change away from Home, or Back before it
  // cleared) nothing of the portrait shows: the loop stops until the page
  // is revealed again or gone (lib/motion.js → onCover).
  let covered = false, onScreen = true, destroyed = false;
  const offShown = onReveal(() => shown(true));
  const offCover = onCover(() => {
    covered = true;
    shown(false);
    sync();
    onReveal(() => {
      if (destroyed) return;
      covered = false;
      shown(true);
      sync();
    });
  });
  function sync() {
    r.run(!reduced && onScreen && !covered && document.visibilityState === "visible");
  }

  // ---- lifecycle ------------------------------------------------------------
  let pending = 0;
  const layout = () => {
    const b = wrapper.getBoundingClientRect();
    return r.layout(b.width, b.height, window.devicePixelRatio || 1);
  };
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(async () => {
      if (await layout()) r.rebuild();
    });
  });
  // Only a real theme flip rebuilds — other <html> class changes (the
  // cursor's js-cursor) must not.
  const mo = new MutationObserver(() => {
    const wasDark = theme.dark;
    theme = readTheme();
    r.theme(theme);
    if (theme.dark !== wasDark) r.rebuild();
  });
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    sync();
  });

  // First layout, then the rest canvas in a task of its own. The loop,
  // observers and pointer listeners only start once there is a field.
  const ready = (async () => {
    // Watch the theme from the start: a switch during the async first layout
    // must still land in the rest canvas.
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    await layout();
    if (destroyed) return;
    r.firstRest();
    ro.observe(wrapper);
    io.observe(wrapper);
    document.addEventListener("visibilitychange", sync);
    if (!reduced) {
      for (const [type, fn] of Object.entries(pointerEvents)) canvas.addEventListener(type, fn, { passive: false });
      // A pointer that came in before the listeners (a slow photo) sent no
      // pointerenter: pick it up now. Only with the custom cursor, whose ring
      // gives the lens its position; without it, the next move does.
      if (canvas.matches(":hover") && customCursorShown()) lens({ on: true, own: false });
    }
    sync();
  })();

  return {
    ready,
    // The curtain has cleared: the wave starts now.
    startWave() {
      r.startWave();
      sync();
    },
    destroy() {
      destroyed = true;
      r.destroy();
      cancelAnimationFrame(pending);
      cancelAnimationFrame(ringRaf);
      clearTimeout(hold.timer);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      offShown();
      offCover();
      for (const [type, fn] of Object.entries(pointerEvents)) canvas.removeEventListener(type, fn);
    },
  };
}

export default function HeroPortrait({ className = "" }) {
  // The image is fetched from the effect below, after hydration: on a slow
  // connection that was seconds after the HTML. A preload in the server
  // HTML starts it with the page (same mode and credentials as the fetch,
  // or the browser fetches it twice).
  preload(SRC, { as: "fetch", crossOrigin: "anonymous" });
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const [state, setState] = useState("loading");
  const [grid, setGrid] = useState(null);

  useEffect(() => {
    let portrait = null;
    let cancelled = false;
    // The wave waits for the curtain to clear, as the hero's entrance does.
    const arrivedAt = performance.now();
    let offReveal = () => {};
    // next/font hashes the family name, so read the real one from its variable.
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains-mono").trim() || "monospace";
    // Fetched as a blob so every decode and resize runs in createImageBitmap,
    // off the main thread. `photo` is the full-colour image for the lens.
    const blob = fetch(SRC).then((r) => {
      if (!r.ok) throw new Error(`portrait ${r.status}`);
      return r.blob();
    });
    // A face that can't load must not stop the portrait: next/font's fallback
    // face is src: local(Arial), which Android doesn't have, and then
    // fonts.load() rejects for the whole list (every Android phone showed a
    // blank stage). The canvas falls back down the family list on its own.
    const font = document.fonts.load(`700 6px ${family}`).catch(() => []);
    // The worker starts with the fetch, so it's ready by the time they are.
    const worker = startWorker();
    Promise.all([blob, blob.then((b) => createImageBitmap(b)), font, worker])
      .then(async ([b, photo, , w]) => {
        if (cancelled) {
          photo.close();
          w?.terminate();
          return;
        }
        // Nobody would see the wave from a background tab or a landing below
        // the hero (/#work): show the finished portrait instead.
        const r = wrapperRef.current.getBoundingClientRect();
        const seen = document.visibilityState === "visible" && r.bottom > 0 && r.top < window.innerHeight;
        // Forced colours still gets the curtain, but its portrait is static.
        const still = window.matchMedia("(forced-colors: active)").matches;
        const play = seen && !still && shouldPlayIntro();
        const wave = play && performance.now() - arrivedAt <= LATE_MS;
        portrait = createPortrait({
          wrapper: wrapperRef.current,
          canvas: canvasRef.current,
          blob: b,
          photo,
          family,
          worker: w,
          onLayout: (cols, rows) => setGrid(`${cols} × ${rows}`),
          wave,
          onWaveStart: () => setState("wave"),
          onWaveEnd: () => setState("static"),
        });
        await portrait.ready;
        if (cancelled) return;
        wrapperRef.current.dataset.prepared = "";
        if (wave) {
          offReveal = onReveal(() => portrait.startWave());
          return; // the wave reports its own states
        }
        setState(play ? "skipped" : "static");
      })
      .catch(() => {
        if (cancelled) return;
        wrapperRef.current.dataset.prepared = "";
        setState("error");
      });
    return () => {
      cancelled = true;
      offReveal();
      portrait?.destroy();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      data-portrait
      data-state={state}
      role="img"
      aria-label="ASCII portrait of Damian De Cruz"
      className={`relative h-full w-full ${className}`}
    >
      {/* data-lens on the canvas only — the label above it must not grow the cursor ring */}
      <canvas ref={canvasRef} data-lens aria-hidden="true" className="absolute inset-0 h-full w-full select-none [-webkit-touch-callout:none]" />
      <div data-portrait-label className="section-label absolute left-0 -top-6">
        {grid && `Portrait · ${grid} cells`}
      </div>
    </div>
  );
}
