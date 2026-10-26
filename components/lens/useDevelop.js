"use client";
import { useEffect } from "react";
import { HALFTONE, dotRadius, developMix, levels, dotTone, inView } from "@/lib/halftone";

// Drives one Lens tile's halftone → colour develop on its canvas (maths in
// lib/halftone.js). The tile's root carries the state as data-develop:
//   halftone → developing → developed → (leaves view) halftone
//   static (reduced motion: the photo shows in colour, nothing runs)
// The canvas sits under the photo and draws an ivory field of electric dots
// sized by tone; the photo fades in over it. A tile develops each time it
// comes 35% into view (a tile taller than the screen: once it fills most of
// it) and drops straight back to halftone when it leaves
// (Damian: replays every time). rAF runs only while a develop runs. The
// photo is hidden from JS, so without JS it simply shows. A photo that fails
// to load leaves the bare mat.

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const RESAMPLE_MS = 150; // resizes settle before the photo is sampled again
// Fine IntersectionObserver steps, so a tile taller than the screen still
// reports the ratio inView() needs (lib/halftone.js).
const STEPS = Array.from({ length: 36 }, (_, i) => i / 100);

export function useDevelop({ rootRef, canvasRef, imgRef }) {
  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current, img = imgRef.current;
    if (!root || !canvas || !img) return;
    if (reducedMotion()) {
      root.dataset.develop = "static";
      return;
    }
    root.dataset.develop = "halftone";
    img.style.opacity = "0";
    const ctx = canvas.getContext("2d");
    const { CELL, DEVELOP_MS } = HALFTONE;
    let W = 0, H = 0, cols = 0, rows = 0, lum = null, colours = null;
    let raf = 0, start = 0, shown = false, failed = false, disposed = false, sampleRun = 0, resample = 0;

    const readColours = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (n) => `rgb(${s.getPropertyValue(n).trim().split(/\s+/).join(",")})`;
      colours = { ivory: v("--c-ivory"), electric: v("--c-electric"), dark: document.documentElement.classList.contains("dark") };
    };

    function paint({ dots, grow }) {
      ctx.clearRect(0, 0, W, H);
      if (!lum) return;
      ctx.globalAlpha = 1;
      ctx.fillStyle = colours.ivory;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = dots;
      ctx.fillStyle = colours.electric;
      ctx.beginPath();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const rad = dotRadius(dotTone(lum[r * cols + c], colours.dark), CELL) * grow;
          if (rad < 0.25) continue;
          const x = (c + 0.5) * CELL, y = (r + 0.5) * CELL;
          ctx.moveTo(x + rad, y);
          ctx.arc(x, y, rad, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Back to the print: cancels any run and redraws the dots at once.
    function rest() {
      cancelAnimationFrame(raf);
      raf = 0;
      root.dataset.develop = "halftone";
      img.style.opacity = "0";
      readColours();
      paint(developMix(0));
    }

    function developFrame(now) {
      const t = (now - start) / DEVELOP_MS;
      const mix = developMix(t);
      paint(mix);
      img.style.opacity = String(mix.photo);
      if (t >= 1) {
        raf = 0;
        root.dataset.develop = "developed";
        ctx.clearRect(0, 0, W, H);
        return;
      }
      raf = requestAnimationFrame(developFrame);
    }

    function startDevelop() {
      if (!lum || raf || root.dataset.develop !== "halftone") return; // unsampled: sample() starts it
      readColours();
      root.dataset.develop = "developing";
      start = performance.now();
      raf = requestAnimationFrame(developFrame);
    }

    function fail() {
      failed = true;
      lum = null;
      ctx.clearRect(0, 0, W, H);
    }

    // Reads one luminance value per dot cell from an object-cover crop of the
    // photo. The downscale happens in createImageBitmap, so the main thread
    // only ever reads a cols × rows bitmap.
    async function sample() {
      if (failed || !W || !H || !img.complete || !img.naturalWidth) return;
      const run = ++sampleRun;
      const nw = img.naturalWidth, nh = img.naturalHeight;
      const scale = Math.max(W / nw, H / nh);
      const sw = W / scale, sh = H / scale;
      const c = Math.ceil(W / CELL), r = Math.ceil(H / CELL);
      let bitmap;
      try {
        bitmap = await createImageBitmap(img, (nw - sw) / 2, (nh - sh) / 2, sw, sh, {
          resizeWidth: c,
          resizeHeight: r,
          resizeQuality: "medium",
        });
      } catch {
        return fail();
      }
      if (disposed || run !== sampleRun) return bitmap.close();
      const off = document.createElement("canvas");
      off.width = c;
      off.height = r;
      const octx = off.getContext("2d", { willReadFrequently: true });
      octx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const px = octx.getImageData(0, 0, c, r).data;
      const next = new Float32Array(c * r);
      for (let i = 0; i < next.length; i++)
        next[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
      cols = c;
      rows = r;
      lum = levels(next);
      if (root.dataset.develop === "halftone") {
        readColours();
        paint(developMix(0));
        if (shown) startDevelop();
      }
    }

    // Sized from the observer entry, so it never forces a layout of its own.
    const ro = new ResizeObserver(([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = entry.contentRect.width;
      H = entry.contentRect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Resizing the canvas clears it: repaint from the last sample at once,
      // then sample again once the resize settles.
      if (!lum) return sample();
      if (root.dataset.develop === "halftone") paint(developMix(0));
      clearTimeout(resample);
      resample = setTimeout(sample, RESAMPLE_MS);
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => {
        const viewH = entry.rootBounds?.height ?? window.innerHeight;
        shown = entry.isIntersecting && inView(entry.intersectionRatio, entry.boundingClientRect.height, viewH);
        if (shown) startDevelop();
        else if (root.dataset.develop !== "halftone") rest();
      },
      { threshold: STEPS }
    );
    io.observe(root);

    // The dots follow a theme change, at rest or mid-develop.
    const mo = new MutationObserver(() => {
      readColours();
      if (root.dataset.develop === "halftone") paint(developMix(0));
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    img.addEventListener("load", sample);
    img.addEventListener("error", fail);
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) fail();

    return () => {
      disposed = true;
      clearTimeout(resample);
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      img.removeEventListener("load", sample);
      img.removeEventListener("error", fail);
    };
  }, [rootRef, canvasRef, imgRef]);
}
