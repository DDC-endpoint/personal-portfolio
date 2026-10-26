// Hero ASCII portrait maths — every number is from docs/v3/hero-portrait.md
// (locked with Damian against spike/portrait-spike.html). Pure: the canvas
// component (components/HeroPortrait.jsx) feeds it pixels and draws what it
// returns, so all of this unit-tests in node.

export const RAMP = " .·:;-=+*#%@"; // light → dense; a 70-step ramp was rejected
export const CELL = 4; // finest setting, Damian's choice
export const LOADER_S = 2.4; // first-visit wave length
export const FACE = { u: 0.5, v: 0.38 }; // wave origin, as a fraction of the stage
export const LENS_R = 120; // px
export const LENS_SOLID = 0.62; // lens is solid to 62% of its radius, then falls off
export const FOLLOW = 0.18; // lens position easing per frame (matches the cursor ring)
export const STRENGTH_EASE = 0.12; // lens fade in/out per frame

const IN_FIGURE = 0.3; // cells with less alpha are empty

// Glyph geometry: tight rows give the eyes and mouth more vertical detail.
export function cellSize(cell = CELL) {
  const font = cell * 1.5;
  return { font, cw: font * 0.6, ch: font * 0.92 };
}

export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Bottom + shoulder fade: head and shoulders dissolve into the page from
// about chest level. The same mask is applied to the photo inside the lens.
export const fadeAt = (u, v) =>
  (1 - smoothstep(0.5, 0.92, v)) *
  (1 - smoothstep(0.18, 0.46, Math.abs(u - 0.5)) * smoothstep(0.42, 0.75, v));

// Heavy glyphs (#%@) only land in the deepest shadows.
export const glyphIndex = (d) => Math.max(1, Math.round(Math.pow(d, 1.35) * (RAMP.length - 1)));

// Per-cell luminance, alpha and edge strength from an image drawn at
// (cols × ss) × (rows × ss), then smoothed and equalised. The head (top half
// of rows) and the body are equalised separately, or the dark suit washes the
// face out.
export function buildField(rgba, cols, rows, ss = 3) {
  const SW = cols * ss, SH = rows * ss, n = cols * rows, k = ss * ss;
  const L = new Float32Array(SW * SH);
  for (let p = 0; p < SW * SH; p++) {
    L[p] = (0.299 * rgba[p * 4] + 0.587 * rgba[p * 4 + 1] + 0.114 * rgba[p * 4 + 2]) / 255;
  }
  const idx = (x, y) => Math.min(SH - 1, Math.max(0, y)) * SW + Math.min(SW - 1, Math.max(0, x));
  const lum = (x, y) => L[idx(x, y)];
  const alp = (x, y) => rgba[idx(x, y) * 4 + 3] / 255;

  const tone = new Float32Array(n), edge = new Float32Array(n), alpha = new Float32Array(n);
  const inside = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let a = 0, l = 0, e = 0;
      for (let v = 0; v < ss; v++) {
        for (let u = 0; u < ss; u++) {
          const X = x * ss + u, Y = y * ss + v;
          a += alp(X, Y);
          l += lum(X, Y);
          const gx = lum(X + 1, Y) - lum(X - 1, Y) + (alp(X + 1, Y) - alp(X - 1, Y)) * 0.45;
          const gy = lum(X, Y + 1) - lum(X, Y - 1) + (alp(X, Y + 1) - alp(X, Y - 1)) * 0.45;
          e += Math.hypot(gx, gy);
        }
      }
      const i = y * cols + x;
      alpha[i] = a / k;
      tone[i] = l / k;
      edge[i] = e / k;
      if (alpha[i] > IN_FIGURE) inside.push(i);
    }
  }

  // Tone smoothing — 0.55 own + 0.45 mean of in-figure 3×3 neighbours.
  const smoothed = new Float32Array(tone);
  for (const i of inside) {
    const x = i % cols, y = (i / cols) | 0;
    let s = 0, c = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || X >= cols || Y < 0 || Y >= rows) continue;
        const j = Y * cols + X;
        if (alpha[j] > IN_FIGURE) { s += tone[j]; c++; }
      }
    }
    smoothed[i] = 0.55 * tone[i] + 0.45 * (s / c);
  }

  const isHead = (i) => ((i / cols) | 0) < rows * 0.5;
  const ranker = (list) => {
    // Ranks against the raw (unsmoothed) tones, as the locked spike does.
    const sorted = list.map((i) => tone[i]).sort((p, q) => p - q);
    return (val) => {
      let lo = 0, hi = sorted.length - 1;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (sorted[m] < val) lo = m + 1;
        else hi = m;
      }
      return lo / Math.max(1, sorted.length - 1);
    };
  };
  const rankHead = ranker(inside.filter(isHead));
  const rankBody = ranker(inside.filter((i) => !isHead(i)));

  let eMax = 0;
  for (const i of inside) eMax = Math.max(eMax, edge[i]);
  for (const i of inside) {
    const t = smoothed[i];
    tone[i] = 0.5 * (isHead(i) ? rankHead : rankBody)(t) + 0.5 * t;
    edge[i] = eMax > 0 ? Math.min(1, (edge[i] / eMax) * 2.4) : 0;
  }
  return { tone, edge, alpha, inside };
}

// Ink density 0–1. Dark mode reads tone directly (light-on-dark), so the
// image is never inverted.
export function density(field, i, dark) {
  if (field.alpha[i] < IN_FIGURE) return 0;
  const ink = dark ? field.tone[i] : 1 - field.tone[i];
  return Math.min(1, field.edge[i] * 0.18 + Math.pow(ink, 1.2) * 0.95 + 0.05);
}

// Shade by lightness of the blue, not opacity — tiny glyphs at low opacity
// read as grey on a real screen. Light cells are electric tinted halfway
// toward the page colour; dense cells are pure electric.
export function shadeRGB(d, electric, bg) {
  const k = smoothstep(0, 0.7, d);
  return electric.map((e, j) => {
    const lo = e + (bg[j] - e) * 0.5;
    return Math.round(lo + (e - lo) * k);
  });
}

export const glyphAlpha = (d, fade) => Math.min(1, 0.55 + 0.45 * d) * fade;

// Loader: when (s) the wave from the face reaches a cell. Row distance is
// scaled by the cell aspect (ch / cw) so the wave front is round on screen.
export function revealTime(x, y, cols, rows, aspect, jitter) {
  const dist = Math.hypot(x - cols * FACE.u, (y - rows * FACE.v) * aspect);
  return 0.3 + (dist / Math.hypot(cols, rows * aspect)) * 2.6 + jitter * 0.15;
}

export function cellPhase(t, tr) {
  if (t >= tr) return "final";
  return t >= tr - 0.25 ? "front" : "skeleton";
}

// Idle scan: every 6 s a soft band sweeps down over 2.4 s. Returns the band's
// row (it starts 8 rows above and ends 8 below), or null between sweeps.
export function scanBand(tIdle, rows) {
  const c = tIdle % 6;
  return c < 2.4 ? (c / 2.4) * (rows + 16) - 8 : null;
}

export const bandWeight = (y, band) => Math.exp(-((y - band) ** 2) / 8);

// Cells per frame that blink a noise glyph.
export const flickerCount = (cols, rows) => Math.max(1, cols * rows * 0.00015);
