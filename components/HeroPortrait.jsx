"use client";
import { useEffect, useRef, useState } from "react";
import {
  RAMP, cellSize, fadeAt, glyphIndex, buildField, density, shadeRGB, glyphAlpha,
  scanBand, bandWeight, flickerCount, FACE,
} from "@/lib/portrait";
import { noiseChar } from "@/lib/decode";

// The V3 hero: Damian's studio headshot redrawn as an electric-blue ASCII
// portrait on a canvas. Spec: docs/v3/hero-portrait.md. All maths lives in
// lib/portrait.js — this file only samples pixels, draws, and runs the loop.
//
// The finished portrait is pre-rendered once into an offscreen "rest" canvas;
// each idle frame blits it, then adds the scan band and the flicker on top.
// The loop pauses while the portrait is off-screen or the tab is hidden.
// Reduced motion: drawn once, no loop.

const SRC = "/hero/portrait.webp";
const SUPERSAMPLE = 3;

const rgbVar = (styles, name) => styles.getPropertyValue(name).trim().split(/\s+/).map(Number);
const css = ([r, g, b]) => `rgb(${r},${g},${b})`;

function createPortrait({ wrapper, canvas, img, family, onLayout }) {
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { font, cw, ch } = cellSize();
  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, n = 0;
  let field = null, fade = null, rest = null;
  let electric, bg, dark;
  const flickUntil = new Map(); // cell → [expiry ms, glyph]
  let idleStart = performance.now();
  let raf = 0, running = false, onScreen = true;

  const setFont = (c) => {
    c.font = `700 ${font}px ${family}`;
    c.textBaseline = "top";
  };

  function readTheme() {
    const styles = getComputedStyle(document.documentElement);
    electric = rgbVar(styles, "--c-electric");
    bg = rgbVar(styles, "--c-ivory");
    dark = document.documentElement.classList.contains("dark");
  }

  // Samples the image at SUPERSAMPLE× the cell grid and builds the field.
  function layout() {
    const r = wrapper.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cols = Math.floor(W / cw);
    rows = Math.floor(H / ch);
    n = cols * rows;
    const sample = document.createElement("canvas");
    sample.width = cols * SUPERSAMPLE;
    sample.height = rows * SUPERSAMPLE;
    const sx = sample.getContext("2d", { willReadFrequently: true });
    sx.imageSmoothingQuality = "high";
    sx.drawImage(img, 0, 0, sample.width, sample.height);
    field = buildField(sx.getImageData(0, 0, sample.width, sample.height).data, cols, rows, SUPERSAMPLE);
    fade = new Float32Array(n);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) fade[y * cols + x] = fadeAt(x / cols, y / rows);
    flickUntil.clear();
    onLayout(cols, rows);
    buildRest();
  }

  // One cell of the finished portrait.
  function mark(c, i, d, alpha, x, y) {
    if (alpha < 0.01) return;
    c.fillStyle = css(shadeRGB(d, electric, bg));
    c.globalAlpha = alpha;
    c.fillText(RAMP[glyphIndex(d)], x * cw, y * ch);
  }

  function buildRest() {
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

  function blitRest() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(rest, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setFont(ctx);
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

  function drawFrame(now) {
    drawIdle(now);
  }

  const tick = (now) => {
    drawFrame(now);
    raf = requestAnimationFrame(tick);
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
  // Redraw now (theme or size changed); the loop picks up from here.
  const redraw = () => (running ? drawFrame(performance.now()) : blitRest());

  // ---- lifecycle ------------------------------------------------------------
  readTheme();
  layout();
  blitRest();

  let pending = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      layout();
      redraw();
    });
  });
  ro.observe(wrapper);
  const mo = new MutationObserver(() => {
    readTheme();
    buildRest();
    redraw();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    sync();
  });
  io.observe(wrapper);
  document.addEventListener("visibilitychange", sync);
  idleStart = performance.now();
  sync();

  return {
    faceViewportPoint() {
      const r = wrapper.getBoundingClientRect();
      return { x: r.left + r.width * FACE.u, y: r.top + r.height * FACE.v };
    },
    destroy() {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pending);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    },
  };
}

export default function HeroPortrait({ className = "" }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const [state, setState] = useState("loading");
  const [grid, setGrid] = useState(null);

  useEffect(() => {
    let portrait = null;
    let cancelled = false;
    const img = new Image();
    img.src = SRC;
    // next/font hashes the family name, so read the real one from its variable.
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains-mono").trim() || "monospace";
    Promise.all([img.decode(), document.fonts.load(`700 6px ${family}`)])
      .then(() => {
        if (cancelled) return;
        portrait = createPortrait({
          wrapper: wrapperRef.current,
          canvas: canvasRef.current,
          img,
          family,
          onLayout: (cols, rows) => setGrid(`${cols} × ${rows}`),
        });
        setState("static");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
      portrait?.destroy();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      data-portrait
      data-lens
      data-state={state}
      role="img"
      aria-label="ASCII portrait of Damian De Cruz"
      className={`relative h-full w-full ${className}`}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full touch-none" />
      <div data-portrait-label className="section-label absolute left-0 -top-6">
        {grid && `Portrait · ${grid} cells`}
      </div>
    </div>
  );
}
