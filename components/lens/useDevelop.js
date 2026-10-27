"use client";
import { useEffect } from "react";
import { HALFTONE, dotRadius, developMix, levels, dotTone, scrollDevelop, dotGrid } from "@/lib/halftone";

// Drives one Lens tile's halftone → colour develop on its canvas (maths in
// lib/halftone.js). The develop is tied straight to scroll (Damian): it starts
// as the tile's top enters the bottom of the screen, is complete when the
// tile's centre reaches the screen's centre, and runs back as you scroll up.
// Above the screen a tile stays developed. The tile's root carries the state
// as data-develop:
//   halftone (0) ↔ developing ↔ developed (1)
//   static (reduced motion: the photo shows in colour, nothing runs)
// The canvas sits under the photo and draws an ivory field of electric dots
// sized by tone; the photo fades in over it. Scroll work is coalesced to one
// read per frame and only repaints when the tile's develop changes. The photo
// is hidden from JS, so without JS it simply shows. A photo that fails to load
// leaves the bare mat.

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const RESAMPLE_MS = 150; // resizes settle before the photo is sampled again

export function useDevelop({ rootRef, canvasRef, imgRef }) {
  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current, img = imgRef.current;
    if (!root || !canvas || !img) return;
    if (reducedMotion()) {
      root.dataset.develop = "static";
      return;
    }
    const ctx = canvas.getContext("2d");
    const { CELL } = HALFTONE;
    let W = 0, H = 0, cols = 0, rows = 0, lum = null, colours = null;
    let t = -1, raf = 0, failed = false, disposed = false, sampleRun = 0, resample = 0;

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
      // Dots sit at the centres of the cells the photo was sampled into,
      // stretched to the tile's current size (a resize repaints before the
      // resample lands), so the print always registers with the photo.
      const cw = W / cols, ch = H / rows, cell = Math.min(cw, ch);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const rad = dotRadius(dotTone(lum[r * cols + c], colours.dark), cell) * grow;
          if (rad < 0.25) continue;
          const x = (c + 0.5) * cw, y = (r + 0.5) * ch;
          ctx.moveTo(x + rad, y);
          ctx.arc(x, y, rad, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Shows the develop at the current t: the photo's opacity, and the print
    // under it until the photo has fully taken over.
    function draw() {
      const mix = developMix(t);
      img.style.opacity = String(mix.photo);
      if (t >= 1) ctx.clearRect(0, 0, W, H);
      else paint(mix);
    }

    function update() {
      raf = 0;
      const r = root.getBoundingClientRect();
      const next = scrollDevelop(r.top, r.height, window.innerHeight);
      if (next === t) return;
      t = next;
      root.dataset.develop = t === 0 ? "halftone" : t === 1 ? "developed" : "developing";
      draw();
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    function fail() {
      failed = true;
      lum = null;
      ctx.clearRect(0, 0, W, H);
    }

    // Reads one luminance value per dot cell from an object-cover crop of the
    // photo. The crop is worked out on the decoded file's own pixels: with
    // srcset, naturalWidth is the photo's CSS size, not the size of the file
    // the screen's density picked, and a crop in those units lands off the
    // photo. The downscale happens in createImageBitmap, so the main thread
    // only ever reads a cols × rows bitmap.
    async function sample() {
      if (failed || !W || !H || !img.complete || !img.naturalWidth) return;
      const run = ++sampleRun;
      const { cols: c, rows: r } = dotGrid(W, H, CELL);
      let full, bitmap;
      try {
        full = await createImageBitmap(img);
        const nw = full.width, nh = full.height;
        const scale = Math.max(W / nw, H / nh);
        const sw = W / scale, sh = H / scale;
        bitmap = await createImageBitmap(full, (nw - sw) / 2, (nh - sh) / 2, sw, sh, {
          resizeWidth: c,
          resizeHeight: r,
          resizeQuality: "medium",
        });
      } catch {
        return fail();
      } finally {
        full?.close();
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
      draw();
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
      draw();
      clearTimeout(resample);
      resample = setTimeout(sample, RESAMPLE_MS);
    });
    ro.observe(canvas);

    // The dots follow a theme change, at any point in the develop.
    const mo = new MutationObserver(() => {
      readColours();
      draw();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    readColours();
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    img.addEventListener("load", sample);
    img.addEventListener("error", fail);
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) fail();

    return () => {
      disposed = true;
      clearTimeout(resample);
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      img.removeEventListener("load", sample);
      img.removeEventListener("error", fail);
    };
  }, [rootRef, canvasRef, imgRef]);
}
