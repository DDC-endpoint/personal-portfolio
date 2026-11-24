// The ink blot the theme switch reveals the new theme through: a ragged
// body with a few runs (tendrils) and a spatter of droplets ahead of it,
// drawn once as an SVG and used as a CSS mask on ::view-transition-new(root).
//
// Seeded, so every visitor (and every test) gets the same blot. Built on the
// first switch in the browser and kept as a data URI: no asset request, no
// work at page load.

const BOX = 1000; // viewBox side; the blot is centred at BOX / 2
const C = BOX / 2;
const BASE = 300; // body radius before noise and runs

// mulberry32: small, fast, good enough for shapes.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n) => Math.round(n * 10) / 10;

// The body outline: radius per angle = base × (1 + layered sine noise),
// plus narrow Gaussian bumps for the runs. Returns the points and the
// smallest radius, which sets how far the mask must grow to cover the page.
function body(rand) {
  const waves = [];
  for (let k = 3; k <= 44; k += 1) waves.push({ k, a: (k < 20 ? 0.16 / k : 0.012) * (0.5 + rand()), p: rand() * Math.PI * 2 });
  const runs = [];
  for (let i = 0; i < 11; i += 1) runs.push({ at: rand() * Math.PI * 2, w: 0.025 + rand() * 0.05, h: 0.12 + rand() * 0.38 });

  const N = 360;
  const pts = [];
  let minR = Infinity;
  for (let i = 0; i < N; i += 1) {
    const t = (i / N) * Math.PI * 2;
    let r = 1;
    for (const w of waves) r += w.a * Math.sin(w.k * t + w.p);
    for (const run of runs) {
      let d = Math.abs(t - run.at);
      d = Math.min(d, Math.PI * 2 - d);
      r += run.h * Math.exp(-(d * d) / (2 * run.w * run.w));
    }
    r += (rand() - 0.5) * 0.04; // fine ragged edge
    r = Math.min(r * BASE, C - 12);
    minR = Math.min(minR, r);
    pts.push([C + r * Math.cos(t), C + r * Math.sin(t)]);
  }
  return { pts, minR, runs };
}

// Closed smooth path through the points (quadratic curves via midpoints).
function smooth(pts) {
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const n = pts.length;
  const start = mid(pts[n - 1], pts[0]);
  let d = `M${f1(start[0])} ${f1(start[1])}`;
  for (let i = 0; i < n; i += 1) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    d += `Q${f1(p[0])} ${f1(p[1])} ${f1(m[0])} ${f1(m[1])}`;
  }
  return `${d}Z`;
}

// Droplets beyond the body: smaller the further out, some stretched along
// the radius like flicked ink, clustered a little around the runs' tips.
function spatter(rand, runs) {
  let out = "";
  for (let i = 0; i < 90; i += 1) {
    const near = rand() < 0.45 ? runs[Math.floor(rand() * runs.length)] : null;
    const t = near ? near.at + (rand() - 0.5) * 0.35 : rand() * Math.PI * 2;
    const reach = 1.05 + rand() * 0.55; // × BASE
    const dist = Math.min(reach * BASE, C - 14);
    const size = Math.max(1.5, (14 - (reach - 1.05) * 20) * (0.35 + rand()));
    const stretch = rand() < 0.35 ? 1.6 + rand() * 2.2 : 1 + rand() * 0.3;
    const x = C + dist * Math.cos(t);
    const y = C + dist * Math.sin(t);
    const deg = (t * 180) / Math.PI;
    out += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(size * stretch)}" ry="${f1(size)}" transform="rotate(${f1(deg)} ${f1(x)} ${f1(y)})"/>`;
  }
  return out;
}

export function inkSvg(seed = 3220) {
  const rand = rng(seed);
  const { pts, minR, runs } = body(rand);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}"><g fill="#000"><path d="${smooth(pts)}"/>${spatter(rand, runs)}</g></svg>`;
  return { svg, minR };
}

let cached;
/** The blot as a CSS url() and its solid-core fraction (smallest body radius / side). */
export function inkMask() {
  if (!cached) {
    const { svg, minR } = inkSvg();
    cached = { url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, core: minR / BOX };
  }
  return cached;
}

/**
 * Mask side length (px) at which the blot's solid body covers every point
 * within `reach` px of its centre: reach = distance from the toggle to the
 * viewport's furthest corner.
 */
export function inkCoverSize(reach, core = inkMask().core) {
  return Math.ceil(reach / core) + 2;
}
