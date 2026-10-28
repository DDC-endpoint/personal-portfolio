"use client";
import { useEffect, useRef } from "react";
import { DECODE, cellThreshold, cellPhase, stepProgress } from "@/lib/cardDecode";
import { noiseChar, TICK_MS } from "@/lib/decode";

// Drives one card's skeleton → screenshot decode on its canvas (cell maths in
// lib/cardDecode.js). The card's root carries the state as data-decode:
//   skeleton → decoding → shot → dissolving → skeleton
//   scrambling (upcoming cards: noise passes over and leaves the skeleton)
//   static (reduced motion: the screenshot shows, nothing runs)
// The rAF loop runs only while progress moves. Becoming inactive waits
// DISSOLVE_DELAY_MS before dissolving; re-activating inside it cancels the
// dissolve. Colours are read at the start of every run, so a theme change
// mid-decode is picked up next run. A screenshot that fails to load leaves
// the skeleton.

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useCardDecode({ active, rootRef, canvasRef, imgRef, hasShot }) {
  const run = useRef(null);

  // One controller per card, created on mount.
  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current, img = imgRef.current;
    if (!root || !canvas) return;
    if (reducedMotion()) {
      root.dataset.decode = "static";
      return;
    }
    root.dataset.decode = "skeleton";
    const ctx = canvas.getContext("2d");
    const seed = (Math.random() * 1e6) | 0;
    let W = 0, H = 0, cols = 0, rows = 0, thresholds = null, glyphs = [];
    let progress = 0, target = 0, raf = 0, last = 0, lastTick = 0, delay = 0;
    let failed = false, wanted = false, disposed = false, colours = null;

    // Sized from the observer entry, so it never forces a layout of its own.
    const resize = ([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = entry.contentRect.width;
      H = entry.contentRect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / DECODE.CELL_PX);
      rows = Math.ceil(H / DECODE.CELL_PX);
      thresholds = new Float32Array(cols * rows);
      for (let r2 = 0; r2 < rows; r2++)
        for (let c = 0; c < cols; c++) thresholds[r2 * cols + c] = cellThreshold(c, r2, cols, seed);
      glyphs = Array.from({ length: cols * rows }, () => noiseChar());
      if (progress > 0 && progress < 1) draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const readColours = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (n) => `rgb(${s.getPropertyValue(n).trim().split(/\s+/).join(",")})`;
      colours = { mist: v("--c-mist"), electric: v("--c-electric"), font: getComputedStyle(canvas).fontFamily };
    };

    const showShot = (on) => {
      if (img) img.dataset.on = on ? "true" : "false";
    };

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const cs = DECODE.CELL_PX;
      const sx = img && img.naturalWidth ? img.naturalWidth / W : 1;
      const sy = img && img.naturalHeight ? img.naturalHeight / H : 1;
      ctx.font = `700 ${cs - 2}px ${colours.font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let r2 = 0; r2 < rows; r2++) {
        for (let c = 0; c < cols; c++) {
          const i = r2 * cols + c;
          const phase = cellPhase(progress, thresholds[i]);
          if (phase === "skeleton") continue;
          const x = c * cs, y = r2 * cs;
          if (phase === "shot") {
            if (hasShot) ctx.drawImage(img, x * sx, y * sy, cs * sx, cs * sy, x, y, cs, cs);
            continue;
          }
          ctx.fillStyle = colours.mist;
          ctx.fillRect(x, y, cs, cs);
          ctx.fillStyle = colours.electric;
          ctx.fillText(glyphs[i], x + cs / 2, y + cs / 2 + 1);
        }
      }
    }

    function settle() {
      raf = 0;
      ctx.clearRect(0, 0, W, H);
      if (progress >= 1 && hasShot) {
        showShot(true);
        root.dataset.decode = "shot";
      } else {
        root.dataset.decode = "skeleton";
      }
    }

    function frame(now) {
      const dt = last ? now - last : 16;
      last = now;
      progress = stepProgress(progress, target, dt);
      if (now - lastTick >= TICK_MS) {
        lastTick = now;
        for (let i = 0; i < glyphs.length; i++) if (Math.random() < 0.5) glyphs[i] = noiseChar();
      }
      draw();
      if (!hasShot && progress >= 1) target = 0; // upcoming: the noise passes and leaves the skeleton
      if (progress === target) return settle();
      raf = requestAnimationFrame(frame);
    }

    function go(t) {
      target = t;
      readColours();
      if (hasShot) showShot(false); // the canvas takes over from the <img> while it runs
      root.dataset.decode = !hasShot ? "scrambling" : t === 1 ? "decoding" : "dissolving";
      if (progress === target) return settle();
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    }

    async function activate() {
      wanted = true;
      clearTimeout(delay);
      if (!hasShot) return go(1);
      if (failed) return;
      try {
        img.loading = "eager";
        await img.decode();
      } catch {
        failed = true; // no screenshot: the card stays its skeleton
        return;
      }
      if (wanted && !disposed) go(1);
    }

    function deactivate() {
      wanted = false;
      clearTimeout(delay);
      if (!hasShot || (progress === 0 && target === 0)) return;
      delay = setTimeout(() => go(0), DECODE.DISSOLVE_DELAY_MS);
    }

    run.current = { activate, deactivate };
    return () => {
      disposed = true;
      run.current = null;
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(delay);
    };
  }, [rootRef, canvasRef, imgRef, hasShot]);

  useEffect(() => {
    if (active) run.current?.activate();
    else run.current?.deactivate();
  }, [active]);
}
