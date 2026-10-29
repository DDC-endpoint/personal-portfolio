"use client";
import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import {
  RAMP, cellSize, fadeAt, glyphIndex, buildField, density, shadeRGB, glyphAlpha,
  scanBand, bandWeight, flickerCount, revealTime, cellPhase, FACE, LOADER_S,
  LENS_R, LENS_SOLID, FOLLOW, STRENGTH_EASE,
} from "@/lib/portrait";
import { noiseChar } from "@/lib/decode";
import { shouldPlayIntro, onReveal, isRevealed } from "@/lib/motion";
import { ring, customCursorShown } from "@/lib/cursor";
import { asset } from "@/lib/assets";

// The V3 hero: Damian's studio headshot redrawn as an electric-blue ASCII
// portrait on a canvas. Spec: docs/v3/hero-portrait.md. All maths lives in
// lib/portrait.js — this file only samples pixels, draws, and runs the loop.
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
const SUPERSAMPLE = 3;
const LATE_MS = 2500; // an image or font later than this into the arrival skips the wave

const rgbVar = (styles, name) => styles.getPropertyValue(name).trim().split(/\s+/).map(Number);
const css = ([r, g, b]) => `rgb(${r},${g},${b})`;

function createPortrait({ wrapper, canvas, blob, photo, family, onLayout, wave, waveAt, onWaveStart, onWaveEnd }) {
  const ctx = canvas.getContext("2d");
  // Reduced motion and forced colours (high contrast) both get the finished
  // portrait, drawn once: no loop, no lens.
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)").matches;
  const { font, cw, ch } = cellSize();
  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, n = 0;
  let field = null, fade = null, rest = null, reveal = null, fadeMask = null;
  let electric, bg, faint, dark;
  // own: the lens follows the pointer itself (touch / no custom cursor)
  const lens = { x: 0, y: 0, tx: 0, ty: 0, s: 0, on: false, own: true };
  const lensCv = document.createElement("canvas");
  const lensCtx = lensCv.getContext("2d");
  const flickUntil = new Map(); // cell → [expiry ms, glyph]
  let idleStart = performance.now();
  let waveStart = performance.now();
  let waving = wave, waveStarted = false;
  // Before its wave the skeleton is still (time holds at −1), so the loop
  // draws it once, not every frame under the curtain; a new rest canvas (a
  // resize or a theme change) draws it again.
  let stillDrawn = false;
  let raf = 0, running = false, onScreen = true, destroyed = false, layoutToken = 0;

  const setFont = (c) => {
    c.font = `700 ${font}px ${family}`;
    c.textBaseline = "top";
  };

  function readTheme() {
    const styles = getComputedStyle(document.documentElement);
    electric = rgbVar(styles, "--c-electric");
    bg = rgbVar(styles, "--c-ivory");
    faint = rgbVar(styles, "--c-ink-faint");
    dark = document.documentElement.classList.contains("dark");
  }

  // Samples the image at SUPERSAMPLE× the cell grid and builds the field.
  // The downscale happens in createImageBitmap, off the main thread — doing
  // it with drawImage made the pixel readback a ~65 ms task on a slow phone.
  // Resolves false when the stage size hasn't changed or a newer layout won.
  async function layout() {
    const r = wrapper.getBoundingClientRect();
    if (!r.width || !r.height || (r.width === W && r.height === H)) return false;
    const token = ++layoutToken;
    const c = Math.floor(r.width / cw), rw = Math.floor(r.height / ch);
    const bitmap = await createImageBitmap(blob, {
      resizeWidth: c * SUPERSAMPLE,
      resizeHeight: rw * SUPERSAMPLE,
      resizeQuality: "high",
    });
    if (token !== layoutToken || destroyed) {
      bitmap.close();
      return false;
    }
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    fontSet = false; // a resize resets the context's state
    lensCv.width = canvas.width;
    lensCv.height = canvas.height;
    cols = c;
    rows = rw;
    n = cols * rows;
    // Sized to the grid, not the bitmap: a browser that ignores the resize
    // options hands back the full image, which drawImage then scales.
    const sample = document.createElement("canvas");
    sample.width = c * SUPERSAMPLE;
    sample.height = rw * SUPERSAMPLE;
    const sx = sample.getContext("2d", { willReadFrequently: true });
    sx.drawImage(bitmap, 0, 0, sample.width, sample.height);
    bitmap.close();
    field = buildField(sx.getImageData(0, 0, sample.width, sample.height).data, cols, rows, SUPERSAMPLE);
    fade = new Float32Array(n);
    reveal = new Float32Array(n);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        fade[y * cols + x] = fadeAt(x / cols, y / rows);
        reveal[y * cols + x] = revealTime(x, y, cols, rows, ch / cw, Math.random());
      }
    }
    fadeMask = document.createElement("canvas");
    fadeMask.width = cols;
    fadeMask.height = rows;
    const fm = fadeMask.getContext("2d"), fd = fm.createImageData(cols, rows);
    for (let i = 0; i < n; i++) fd.data[i * 4 + 3] = fade[i] * 255;
    fm.putImageData(fd, 0, 0);
    flickUntil.clear();
    onLayout(cols, rows);
    return true;
  }

  // One cell of the finished portrait.
  function mark(c, i, d, alpha, x, y) {
    if (alpha < 0.01) return;
    c.fillStyle = css(shadeRGB(d, electric, bg));
    c.globalAlpha = alpha;
    c.fillText(RAMP[glyphIndex(d)], x * cw, y * ch);
  }

  function buildRest() {
    stillDrawn = false;
    rest = document.createElement("canvas");
    rest.width = canvas.width;
    rest.height = canvas.height;
    const c = rest.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    setFont(c);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x, d = density(field, i, dark);
        if (d > 0.02) mark(c, i, d, glyphAlpha(d, fade[i]), x, y);
      }
    }
  }

  // The context keeps its font between frames; setting it parses the family
  // list each time (measured at a frame's worth of script on a mid-range
  // phone over a page change), so it's set only after a resize or the
  // lens's readout changed it.
  let fontSet = false;
  function blitRest() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (rest?.width && rest.height) ctx.drawImage(rest, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!fontSet) {
      setFont(ctx);
      fontSet = true;
    }
  }

  // Idle: scan band every 6 s (cells in it draw one step denser at up to 0.3
  // opacity) plus a sparse flicker of noise glyphs.
  function drawIdle(now) {
    blitRest();
    const band = scanBand((now - idleStart) / 1000, rows);
    if (band !== null) {
      for (let y = Math.max(0, Math.floor(band - 5)); y < Math.min(rows, band + 5); y++) {
        const k = bandWeight(y, band);
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x, d = density(field, i, dark);
          if (d > 0.02) mark(ctx, i, Math.min(1, d + 0.3 * k), 0.3 * k * fade[i], x, y);
        }
      }
    }
    for (let k = 0; k < flickerCount(cols, rows); k++) {
      const i = (Math.random() * n) | 0;
      if (field.alpha[i] > 0.3) flickUntil.set(i, [now + 90 + Math.random() * 90, noiseChar()]);
    }
    ctx.fillStyle = css(electric);
    for (const [i, [until, glyph]] of flickUntil) {
      if (until <= now) {
        flickUntil.delete(i);
        continue;
      }
      const x = (i % cols) * cw, y = ((i / cols) | 0) * ch;
      ctx.globalAlpha = 1;
      ctx.clearRect(x, y, cw, ch);
      ctx.globalAlpha = 0.85 * fade[i];
      ctx.fillText(glyph, x, y);
    }
    ctx.globalAlpha = 1;
  }

  // Loader: the finished portrait is blitted, then every cell the wave hasn't
  // reached yet is cleared and redrawn as a shimmering skeleton block or, in
  // the last 0.25 s before it lands, a noise glyph.
  function drawWave(t) {
    blitRest();
    ctx.fillStyle = css(electric);
    for (const i of field.inside) {
      const tr = reveal[i];
      if (t >= tr) continue;
      const x = i % cols, y = (i / cols) | 0, px = x * cw, py = y * ch;
      ctx.globalAlpha = 1;
      ctx.clearRect(px, py, cw, ch);
      if (cellPhase(t, tr) === "skeleton") {
        ctx.globalAlpha = (0.1 + 0.05 * Math.sin(t * 6 + x * 0.3 + y * 0.2)) * fade[i];
        ctx.fillRect(px + cw * 0.3, py + ch * 0.3, cw * 0.4, ch * 0.4);
      } else {
        ctx.globalAlpha = 0.9 * fade[i];
        ctx.fillText(noiseChar(), px, py);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Soft-edged disc: solid to LENS_SOLID of the radius, gone at the radius.
  function lensGradient(c) {
    const g = c.createRadialGradient(lens.x, lens.y, 0, lens.x, lens.y, LENS_R);
    g.addColorStop(0, `rgba(0,0,0,${lens.s})`);
    g.addColorStop(LENS_SOLID, `rgba(0,0,0,${lens.s})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    return g;
  }

  function drawLens() {
    // Strength first: with the lens off, nothing below runs (no layout reads).
    // The intro curtain lets the pointer through, so the lens waits for the
    // reveal; a pointer already resting on the portrait gets it then.
    lens.s += ((lens.on && isRevealed() ? 1 : 0) - lens.s) * STRENGTH_EASE;
    if (lens.s < 0.01) return;
    if (lens.own) {
      lens.x += (lens.tx - lens.x) * FOLLOW;
      lens.y += (lens.ty - lens.y) * FOLLOW;
    } else {
      const r = canvas.getBoundingClientRect();
      lens.x = ring.x - r.left;
      lens.y = ring.y - r.top;
    }
    // clear the glyphs under the lens
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = lensGradient(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    // the photo, masked by the portrait fade and the lens disc
    lensCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lensCtx.globalCompositeOperation = "source-over";
    lensCtx.clearRect(0, 0, W, H);
    lensCtx.drawImage(photo, 0, 0, W, H);
    lensCtx.globalCompositeOperation = "destination-in";
    lensCtx.drawImage(fadeMask, 0, 0, W, H);
    lensCtx.fillStyle = lensGradient(lensCtx);
    lensCtx.fillRect(0, 0, W, H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lensCv, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (lens.own) {
      ctx.globalAlpha = 0.5 * lens.s;
      ctx.strokeStyle = css(electric);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(lens.x, lens.y, LENS_R * 0.98, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.8 * lens.s;
    ctx.fillStyle = css(faint);
    ctx.font = `400 9px ${family}`;
    fontSet = false;
    ctx.fillText(`x ${Math.round(lens.x)} · y ${Math.round(lens.y)}`, lens.x + LENS_R * 0.72, lens.y + LENS_R * 0.78);
    ctx.globalAlpha = 1;
  }

  function drawFrame(now) {
    if (!field) return; // no layout yet (e.g. a zero-size stage)
    if (waving) {
      // Before waveStart (curtain still down) every cell is still skeleton.
      // Until the reveal, waveStart is Infinity: hold t at the skeleton
      // phase rather than −∞, where the skeleton's alpha is NaN (ignored by
      // the canvas) and the finished glyphs would show through.
      const t = Math.max(-1, (now - waveStart) / 1000);
      // Still before the wave: nothing moves. The lens waits for the reveal
      // too (drawLens), so there's nothing else to draw.
      if (t < 0) {
        if (!stillDrawn) {
          drawWave(-1);
          stillDrawn = true;
        }
        return;
      }
      if (!waveStarted) {
        waveStarted = true;
        onWaveStart();
      }
      if (t < LOADER_S) drawWave(t);
      else {
        waving = false;
        idleStart = now;
        onWaveEnd();
      }
    }
    if (!waving) drawIdle(now);
    drawLens();
  }

  // Pointer → lens target, in canvas coordinates.
  function aim(e) {
    lens.own = !(e.pointerType === "mouse" && customCursorShown());
    const r = canvas.getBoundingClientRect();
    lens.tx = e.clientX - r.left;
    lens.ty = e.clientY - r.top;
    if (lens.s < 0.01) {
      lens.x = lens.tx;
      lens.y = lens.ty;
    }
  }
  const lensOn = (e) => {
    lens.on = true;
    aim(e);
  };
  const lensOff = () => (lens.on = false);
  const lensUp = (e) => {
    if (e.pointerType !== "mouse") lens.on = false;
  };
  const pointerEvents = { pointerenter: lensOn, pointerdown: lensOn, pointermove: aim, pointerleave: lensOff, pointercancel: lensOff, pointerup: lensUp };

  // The next frame is booked before drawing, so one bad frame can never
  // stop the loop for the rest of the page's life.
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    drawFrame(now);
  };
  function sync() {
    const should = !reduced && onScreen && document.visibilityState === "visible";
    if (should && !running) {
      running = true;
      raf = requestAnimationFrame(tick);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }
  // Before its wave starts, the portrait is skeleton only: the finished
  // glyphs (the rest canvas) must not flash first.
  const beforeWave = () => waving && !waveStarted;
  const drawStill = () => (beforeWave() ? drawWave(-1) : blitRest());
  // Redraw now (theme or size changed); the loop picks up from here.
  const redraw = () => (running ? drawFrame(performance.now()) : drawStill());

  // ---- lifecycle ------------------------------------------------------------
  let pending = 0, restTimer = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(async () => {
      if (!(await layout())) return;
      buildRest();
      redraw();
    });
  });
  // Only a real theme flip rebuilds — other <html> class changes (the
  // cursor's js-cursor) must not.
  const mo = new MutationObserver(() => {
    const wasDark = dark;
    readTheme();
    if (dark === wasDark) return;
    buildRest();
    redraw();
  });
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    sync();
  });

  // First layout, then the rest canvas in a task of its own (a timeout, not a
  // rAF — rAF callbacks share one task with the loop's first frame), so no
  // single task blocks the main thread for long on a slow phone. The loop,
  // observers and pointer listeners only start once there is a field.
  const ready = (async () => {
    readTheme();
    // Watch the theme from the start: a switch during the async first layout
    // must still land in the rest canvas.
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    await layout();
    if (destroyed) return;
    waveStart = Math.max(performance.now(), waveAt);
    restTimer = setTimeout(() => {
      buildRest();
      if (!running) drawStill();
    }, 0);
    ro.observe(wrapper);
    io.observe(wrapper);
    document.addEventListener("visibilitychange", sync);
    if (!reduced) {
      for (const [type, fn] of Object.entries(pointerEvents)) canvas.addEventListener(type, fn);
      // A pointer that came in before the listeners (a slow photo) sent no
      // pointerenter: pick it up now. Only with the custom cursor, whose ring
      // gives the lens its position; without it, the next move does.
      if (canvas.matches(":hover") && customCursorShown()) {
        lens.own = false;
        lens.on = true;
      }
    }
    sync();
  })();

  return {
    ready,
    // The curtain has cleared: the wave starts now.
    startWave() {
      waveStart = performance.now();
      sync();
    },
    destroy() {
      destroyed = true;
      photo.close();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pending);
      clearTimeout(restTimer);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
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
    Promise.all([blob, blob.then((b) => createImageBitmap(b)), font])
      .then(async ([b, photo]) => {
        if (cancelled) {
          photo.close();
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
          onLayout: (cols, rows) => setGrid(`${cols} × ${rows}`),
          wave,
          waveAt: Infinity,
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
      <canvas ref={canvasRef} data-lens aria-hidden="true" className="absolute inset-0 h-full w-full touch-none" />
      <div data-portrait-label className="section-label absolute left-0 -top-6">
        {grid && `Portrait · ${grid} cells`}
      </div>
    </div>
  );
}
