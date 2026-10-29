// Pixel-diff and timing harness for the portrait's drawWave batching.
// usage: node wave-harness.mjs [base-url] [cpuThrottle]
// Runs in the real page (same fonts, same canvas type), with the lib code
// inlined; stubs Math.random so old and new draw the same noise.
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const throttle = Number(process.argv[3] || 1);
const strip = (s) => s.replace(/^export (const|function|let)/gm, "$1").replace(/^export \{[^}]*\};?/gm, "").replace(/^import .*$/gm, "");
const lib = strip(readFileSync("lib/portrait.js", "utf8")) + "\n" + strip(readFileSync("lib/decode.js", "utf8"));

const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 });
const page = await ctx.newPage();
if (throttle > 1) await (await ctx.newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: throttle });
await page.goto(base + "/", { waitUntil: "load" });
await page.waitForFunction(() => /^(static|skipped)$/.test(document.querySelector("[data-portrait]")?.dataset.state || ""), null, { timeout: 60000 });

const result = await page.evaluate(async ({ lib }) => {
  const g = {};
  new Function("g", lib + "\n;Object.assign(g,{RAMP,cellSize,fadeAt,glyphIndex,buildField,density,shadeRGB,glyphAlpha,revealTime,cellPhase,noiseChar,snapRect});")(g);
  const { RAMP, cellSize, fadeAt, glyphIndex, buildField, density, shadeRGB, glyphAlpha, revealTime, cellPhase, noiseChar, snapRect } = g;
  const SUPERSAMPLE = 3;
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains-mono").trim();
  const styles = getComputedStyle(document.documentElement);
  const rgbVar = (name) => styles.getPropertyValue(name).trim().split(/\s+/).map(Number);
  const css = ([r, g, b]) => `rgb(${r},${g},${b})`;
  const electric = rgbVar("--c-electric"), bg = rgbVar("--c-ivory");
  const dark = document.documentElement.classList.contains("dark");
  const { font, cw, ch } = cellSize();
  const r = document.querySelector("[data-portrait]").getBoundingClientRect();
  const W = r.width, H = r.height, dpr = Math.min(2, devicePixelRatio);
  const cols = Math.floor(W / cw), rows = Math.floor(H / ch), n = cols * rows;
  const blob = await (await fetch("/hero/portrait.webp")).blob();
  const bitmap = await createImageBitmap(blob, { resizeWidth: cols * SUPERSAMPLE, resizeHeight: rows * SUPERSAMPLE, resizeQuality: "high" });
  const sample = document.createElement("canvas");
  sample.width = cols * SUPERSAMPLE; sample.height = rows * SUPERSAMPLE;
  const sx = sample.getContext("2d", { willReadFrequently: true });
  sx.drawImage(bitmap, 0, 0);
  const field = buildField(sx.getImageData(0, 0, sample.width, sample.height).data, cols, rows, SUPERSAMPLE);
  const fade = new Float32Array(n), reveal = new Float32Array(n);
  let seed = 1;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 100000) / 100000;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    fade[y * cols + x] = fadeAt(x / cols, y / rows);
    reveal[y * cols + x] = revealTime(x, y, cols, rows, ch / cw, rand());
  }
  const setFont = (c) => { c.font = `700 ${font}px ${family}`; c.textBaseline = "top"; };
  const mark = (c, i, d, alpha, x, y) => {
    if (alpha < 0.01) return;
    c.fillStyle = css(shadeRGB(d, electric, bg)); c.globalAlpha = alpha;
    c.fillText(RAMP[glyphIndex(d)], x * cw, y * ch);
  };
  const rest = document.createElement("canvas");
  rest.width = Math.round(W * dpr); rest.height = Math.round(H * dpr);
  { const c = rest.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); setFont(c);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const i = y * cols + x, d = density(field, i, dark); if (d > 0.02) mark(c, i, d, glyphAlpha(d, fade[i]), x, y); } }
  const mk = () => { const cv = document.createElement("canvas"); cv.width = rest.width; cv.height = rest.height; return [cv, cv.getContext("2d", { willReadFrequently: true })]; };
  const [cvA, A] = mk(), [cvB, B] = mk();
  const blitRest = (ctx) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, rest.width, rest.height);
    ctx.drawImage(rest, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); setFont(ctx);
  };
  // ---- old (verbatim from HeroPortrait.jsx) ----
  function drawWaveOld(ctx, t) {
    blitRest(ctx);
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
  // ---- new: one snapped clear path, then the cells ----
  function drawWaveNew(ctx, t) {
    blitRest(ctx);
    // Clear every unrevealed cell in one path, in whole device pixels, as
    // clearRect (not antialiased) would have cleared each cell.
    // Row by row: clear the row's unrevealed cells in one path, then draw
    // them. A glyph's descender overflows into the row below, which the old
    // per-cell clears erased when they reached that row; clearing a row at a
    // time keeps that.
    const inside = field.inside;
    let k = 0;
    while (k < inside.length) {
      const row = (inside[k] / cols) | 0;
      let end = k;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      let any = false;
      for (; end < inside.length && ((inside[end] / cols) | 0) === row; end++) {
        const i = inside[end];
        if (t >= reveal[i]) continue;
        ctx.rect((i % cols) * cw, row * ch, cw, ch);
        any = true;
      }
      if (any) ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = css(electric);
      for (let j = k; j < end; j++) {
      const i = inside[j];
      const tr = reveal[i];
      if (t >= tr) continue;
      const x = i % cols, y = (i / cols) | 0, px = x * cw, py = y * ch;
      if (cellPhase(t, tr) === "skeleton") {
        ctx.globalAlpha = (0.1 + 0.05 * Math.sin(t * 6 + x * 0.3 + y * 0.2)) * fade[i];
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
  const diff = () => {
    const a = A.getImageData(0, 0, rest.width, rest.height).data, b = B.getImageData(0, 0, rest.width, rest.height).data;
    let px = 0, max = 0; const where = [];
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3]));
      if (d) { px++; if (d > max) max = d; if (where.length < 8) where.push([(i / 4) % rest.width, Math.floor(i / 4 / rest.width), a[i + 3], b[i + 3]]); }
    }
    return { px, max, total: a.length / 4, where };
  };
  const out = { cols, rows, n: field.inside.length, dpr, W, H, diffs: [], times: {} };
  const realRandom = Math.random;
  for (const t of [-1, 0.1, 0.3, 0.5, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.39]) {
    Math.random = (() => { let s = 7; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) % 100000) / 100000; })();
    drawWaveOld(A, t);
    Math.random = (() => { let s = 7; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) % 100000) / 100000; })();
    drawWaveNew(B, t);
    out.diffs.push({ t, ...diff() });
  }
  Math.random = realRandom;
  // timing: ms per frame (median of 30), with the GPU flushed by a readback
  const time = (fn, t) => {
    const d = [];
    for (let k = 0; k < 30; k++) { const s = performance.now(); fn(A, t); A.getImageData(0, 0, 1, 1); d.push(performance.now() - s); }
    d.sort((p, q) => p - q); return +d[15].toFixed(2);
  };
  for (const t of [-1, 0.8, 1.6]) out.times[`old t=${t}`] = time(drawWaveOld, t);
  for (const t of [-1, 0.8, 1.6]) out.times[`new t=${t}`] = time(drawWaveNew, t);
  // breakdown at t=0.8: clears only, rects only, text only (old style)
  const only = (what) => (ctx, t) => {
    blitRest(ctx); ctx.fillStyle = css(electric);
    for (const i of field.inside) { const tr = reveal[i]; if (t >= tr) continue; const x = i % cols, y = (i / cols) | 0, px = x * cw, py = y * ch;
      if (what === "clear") ctx.clearRect(px, py, cw, ch);
      else if (what === "rect" && cellPhase(t, tr) === "skeleton") { ctx.globalAlpha = 0.1 * fade[i]; ctx.fillRect(px + cw * 0.3, py + ch * 0.3, cw * 0.4, ch * 0.4); }
      else if (what === "text" && cellPhase(t, tr) !== "skeleton") { ctx.globalAlpha = 0.9 * fade[i]; ctx.fillText(noiseChar(), px, py); } }
    ctx.globalAlpha = 1;
  };
  out.times["blit only"] = time((c) => blitRest(c), 0);
  for (const w of ["clear", "rect", "text"]) out.times[`${w} only t=0.8`] = time(only(w), 0.8);
  let front = 0; for (const i of field.inside) if (0.8 < reveal[i] && cellPhase(0.8, reveal[i]) !== "skeleton") front++;
  out.frontCells08 = front;
  return out;
}, { lib });
console.log(JSON.stringify(result, null, 1));
await browser.close();
