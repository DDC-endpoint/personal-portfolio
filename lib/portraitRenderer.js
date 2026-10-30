// The hero portrait's drawing and its frame loop (components/HeroPortrait.jsx
// runs the page side: pointer, observers, curtain). It uses only canvas APIs,
// so the same code draws on the page or, with the canvas handed over as an
// OffscreenCanvas, in a worker (lib/portrait.worker.js): there the frames run
// beside the page's own, not in its queue. Whatever it needs of the page
// (the curtain's reveal, the custom cursor's ring) comes through `host`.
import {
  RAMP, cellSize, fadeAt, glyphIndex, buildField, density, shadeRGB, glyphAlpha,
  scanBand, bandWeight, flickerCount, revealTime, cellPhase, LOADER_S,
  LENS_R, LENS_SOLID, FOLLOW, STRENGTH_EASE,
} from "./portrait";
import { noiseChar } from "./decode";

const SUPERSAMPLE = 3;
const css = ([r, g, b]) => `rgb(${r},${g},${b})`;

// canvas: the stage. makeCanvas(w, h): a scratch canvas. blob: the image;
// photo: its decoded bitmap, for the lens. wave: build in with the wave once
// startWave() is called. host.revealed(): the curtain has cleared;
// host.ringAt(): the custom cursor's ring, in canvas coordinates.
// emit(type, data): "layout" {cols, rows}, "waveStart", "waveEnd".
export function createRenderer({ canvas, makeCanvas, family, blob, photo, wave, host, emit }) {
  const ctx = canvas.getContext("2d");
  const { font, cw, ch } = cellSize();
  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, n = 0;
  let field = null, fade = null, rest = null, reveal = null, fadeMask = null;
  let electric, bg, faint, dark;
  // own: the lens follows the pointer itself (touch / no custom cursor)
  const lens = { x: 0, y: 0, tx: 0, ty: 0, s: 0, on: false, own: true };
  let made = 0, sampled = 0, frames = 0; // scratch canvases, pixel readbacks and loop frames, for the tests
  const scratch = (w, h) => {
    made++;
    return makeCanvas(w, h);
  };
  const lensCv = scratch(300, 150);
  const lensCtx = lensCv.getContext("2d");
  const flickUntil = new Map(); // cell → [expiry ms, glyph]
  let idleStart = performance.now();
  // Until the curtain clears (startWave), the wave's clock holds.
  let waveStart = Infinity;
  let waving = wave, waveStarted = false;
  // Before its wave the skeleton is still (time holds at −1), so the loop
  // draws it once, not every frame under the curtain; a new rest canvas (a
  // resize or a theme change) draws it again.
  let stillDrawn = false;
  let raf = 0, running = false, destroyed = false, layoutToken = 0, restTimer = 0;

  const setFont = (c) => {
    c.font = `700 ${font}px ${family}`;
    c.textBaseline = "top";
  };

  function theme(t) {
    ({ electric, bg, faint, dark } = t);
  }

  // Samples the image at SUPERSAMPLE× the cell grid and builds the field.
  // The downscale happens in createImageBitmap, off the main thread — doing
  // it with drawImage made the pixel readback a ~65 ms task on a slow phone.
  // Resolves false when the stage size hasn't changed or a newer layout won.
  async function layout(width, height, ratio) {
    if (!width || !height || (width === W && height === H)) return false;
    const token = ++layoutToken;
    const c = Math.floor(width / cw), rw = Math.floor(height / ch);
    const bitmap = await createImageBitmap(blob, {
      resizeWidth: c * SUPERSAMPLE,
      resizeHeight: rw * SUPERSAMPLE,
      resizeQuality: "high",
    });
    if (token !== layoutToken || destroyed) {
      bitmap.close();
      return false;
    }
    dpr = Math.min(2, ratio || 1);
    W = width;
    H = height;
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
    const sample = scratch(c * SUPERSAMPLE, rw * SUPERSAMPLE);
    const sx = sample.getContext("2d", { willReadFrequently: true });
    sx.drawImage(bitmap, 0, 0, sample.width, sample.height);
    bitmap.close();
    sampled++;
    field = buildField(sx.getImageData(0, 0, sample.width, sample.height).data, cols, rows, SUPERSAMPLE);
    fade = new Float32Array(n);
    reveal = new Float32Array(n);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        fade[y * cols + x] = fadeAt(x / cols, y / rows);
        reveal[y * cols + x] = revealTime(x, y, cols, rows, ch / cw, Math.random());
      }
    }
    fadeMask = scratch(cols, rows);
    const fm = fadeMask.getContext("2d"), fd = fm.createImageData(cols, rows);
    for (let i = 0; i < n; i++) fd.data[i * 4 + 3] = fade[i] * 255;
    fm.putImageData(fd, 0, 0);
    flickUntil.clear();
    emit("layout", { cols, rows });
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
    rest = scratch(canvas.width, canvas.height);
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
  //
  // Row by row: the row's unrevealed cells are cleared in one path, then
  // drawn. One clearRect per cell, interleaved with the draws, broke the
  // GPU's batching on every cell (a wave frame was 18-21 ms of script on a
  // desktop, 7-10 after; Damian approved it 2026-10-29: the GPU's clearRect
  // is antialiased, so a cleared seam keeps a trace of the old glyph that
  // one path doesn't, up to 4/255, invisible). A row at a time keeps what
  // the per-cell order did for a glyph's descender: it spills into the row
  // below, which is cleared before it's drawn.
  function drawWave(t) {
    blitRest();
    const inside = field.inside;
    let k = 0;
    while (k < inside.length) {
      const row = (inside[k] / cols) | 0, py = row * ch;
      let end = k, any = false;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      for (; end < inside.length && ((inside[end] / cols) | 0) === row; end++) {
        const i = inside[end];
        if (t >= reveal[i]) continue;
        ctx.rect((i % cols) * cw, py, cw, ch);
        any = true;
      }
      if (any) ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = css(electric);
      for (let j = k; j < end; j++) {
        const i = inside[j], tr = reveal[i];
        if (t >= tr) continue;
        const x = i % cols, px = x * cw;
        if (cellPhase(t, tr) === "skeleton") {
          ctx.globalAlpha = (0.1 + 0.05 * Math.sin(t * 6 + x * 0.3 + row * 0.2)) * fade[i];
          ctx.fillRect(px + cw * 0.3, py + ch * 0.3, cw * 0.4, ch * 0.4);
        } else {
          ctx.globalAlpha = 0.9 * fade[i];
          ctx.fillText(noiseChar(), px, py);
        }
      }
      k = end;
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
    lens.s += ((lens.on && host.revealed() ? 1 : 0) - lens.s) * STRENGTH_EASE;
    if (lens.s < 0.01) return;
    if (lens.own) {
      lens.x += (lens.tx - lens.x) * FOLLOW;
      lens.y += (lens.ty - lens.y) * FOLLOW;
    } else {
      const p = host.ringAt();
      lens.x = p.x;
      lens.y = p.y;
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
        emit("waveStart");
      }
      if (t < LOADER_S) drawWave(t);
      else {
        waving = false;
        idleStart = now;
        emit("waveEnd");
      }
    }
    if (!waving) drawIdle(now);
    drawLens();
  }

  // The next frame is booked before drawing, so one bad frame can never
  // stop the loop for the rest of the page's life.
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    frames++;
    drawFrame(now);
  };
  // Before its wave starts, the portrait is skeleton only: the finished
  // glyphs (the rest canvas) must not flash first.
  const beforeWave = () => waving && !waveStarted;
  const drawStill = () => (beforeWave() ? drawWave(-1) : blitRest());

  return {
    theme,
    layout,
    // After the first layout, the rest canvas in a task of its own (a
    // timeout, not a rAF — rAF callbacks share one task with the loop's
    // first frame), so no single task blocks for long on a slow phone.
    firstRest() {
      restTimer = setTimeout(() => {
        buildRest();
        if (!running) drawStill();
      }, 0);
    },
    // Redraw now (theme or size changed); the loop picks up from here.
    rebuild() {
      buildRest();
      if (running) drawFrame(performance.now());
      else drawStill();
    },
    run(should) {
      if (should && !running) {
        running = true;
        raf = requestAnimationFrame(tick);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    },
    // The curtain has cleared: the wave starts now.
    startWave() {
      waveStart = performance.now();
    },
    // Pointer → lens target, in canvas coordinates; on/off; own (it follows
    // the pointer itself) or the ring's.
    lens({ on, own, tx, ty }) {
      if (on !== undefined) lens.on = on;
      if (own !== undefined) lens.own = own;
      if (tx === undefined) return;
      lens.tx = tx;
      lens.ty = ty;
      if (lens.s < 0.01) {
        lens.x = tx;
        lens.y = ty;
      }
    },
    // Tests: what's on the stage, how often a layout made a canvas or read
    // pixels back, and the loop's frames so far and whether it runs.
    snapshot() {
      const d = canvas.width && canvas.height ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
      return { width: canvas.width, height: canvas.height, data: d?.data ?? new Uint8ClampedArray(0), canvases: made, samples: sampled, frames, running };
    },
    destroy() {
      destroyed = true;
      photo.close();
      cancelAnimationFrame(raf);
      clearTimeout(restTimer);
    },
  };
}
