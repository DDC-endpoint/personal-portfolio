// The morph loader (docs/v3/plan-phase-6.md → "The morph loader"; Damian's
// preset in docs/v3/spike/loader-curtain.html). A first load shows a blob
// morphing at the centre with the count inside it, "DAMIAN DE CRUZ" decoding
// under it and the coordinates under that, on the covering curtain. Later
// loads in the same browser session show only the name resolving. Pure: the
// blob's shape, the count's rules, the decode and the session flag.

// The blob: N points round a circle, their radii easing between TARGETS.
export const N = 10;
export const TARGETS = [
  [1, 0.78, 1.06, 0.9, 1.12, 0.8, 1, 0.86, 1.1, 0.76],
  [0.82, 1.1, 0.9, 1.14, 0.84, 1.02, 0.78, 1.12, 0.88, 1.04],
  [1.12, 0.86, 0.8, 1.06, 0.94, 1.14, 0.9, 0.78, 1.02, 0.88],
  [0.9, 1.02, 1.12, 0.8, 1.08, 0.88, 1.14, 0.94, 0.78, 1.06],
];
const R = 34; // in the 100 × 100 viewBox

// A smooth closed path through the radii (quadratic curves between the
// midpoints), in a 100 × 100 box. `wob` (seconds) adds a slight wobble; null
// for none. Always the same commands, so it morphs cleanly.
export function blobPath(radii, wob) {
  const pts = radii.map((rv, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const r = R * rv * (1 + (wob === null ? 0 : 0.035 * Math.sin(wob * 2.1 + i * 1.7)));
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  });
  const f = (n) => n.toFixed(2);
  const mid = (i) => {
    const p = pts[i % N], q = pts[(i + 1) % N];
    return `${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`;
  };
  let d = `M ${mid(0)}`;
  for (let i = 1; i <= N; i++) {
    const v = pts[i % N];
    d += ` Q ${f(v[0])} ${f(v[1])} ${mid(i % N)}`;
  }
  return `${d} Z`;
}

// The count follows real readiness: it climbs unevenly, can't pass `hold`
// until the page is ready and `min` seconds have gone, and finishes by `max`
// whatever happens (both from when the loader's script starts). A late load
// (scripts later than `late` seconds after the navigation) has waited long
// enough already: it skips `min`, and the curtain holds until 100 all the
// same (Damian, 2026-10-29: "the curtain will stay closed with the
// percentage going up while the page loads").
export const LOAD = { hold: 96, min: 1.2, max: 2.5, late: 2.5 };

// One frame of the count: `p` the count so far, `el` seconds since the load
// began, `ready` whether the page is, `speed` the current climb (per second),
// `dt` the frame (seconds), `late` whether the scripts came late.
export function stepCount({ p, el, ready, speed, dt, late = false }) {
  if (el >= LOAD.max) return 100;
  const done = ready && (late || el >= LOAD.min);
  return Math.min(done ? 100 : LOAD.hold, p + dt * (done ? Math.max(speed, 160) : speed));
}

// Before the scripts arrive (2026-10-29): the server HTML's count rises from
// the first paint, so a slow link never shows a frozen 0. An inline script
// in the layout runs this (stringified, so it uses nothing outside itself);
// the loader takes over its count when it starts (window.__ddcCount). It
// climbs unevenly like the loader's, slowing as it nears `hold`, so a long
// wait still creeps and never sits at the cap. Not on a short load (the
// count isn't shown) or with reduced motion (no loader).
export function firstPaintCount(hold) {
  try {
    if (document.documentElement.classList.contains("ddc-seen") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (e) {
    return;
  }
  var s = (window.__ddcCount = { p: 0, taken: false });
  var last = 0, speed = 0, swap = 0, shown = 0;
  function frame(t) {
    if (s.taken) return;
    var dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (t >= swap) {
      speed = 22 + Math.random() * 30;
      swap = t + 550 + Math.random() * 400;
    }
    s.p = Math.min(hold, s.p + dt * speed * (1 - s.p / hold));
    var n = Math.round(s.p), el = document.querySelector(".morph-loader [data-count]");
    if (el && n !== shown) {
      shown = n;
      el.innerHTML = String(n).split("").map(function (d) { return '<span class="ml-d">' + d + "</span>"; }).join("");
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

const NOISE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@*+=<>/";

// The text with its first k (0 → 1) resolved; the rest is noise, except the
// spaces.
export function decodeText(text, k, rand = Math.random) {
  const n = Math.floor(text.length * k);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    out += i < n || c === " " ? c : NOISE[(rand() * NOISE.length) | 0];
  }
  return out;
}

// The decoded text cut back into the parts it was joined from (with single
// spaces): the name's two lines, the coordinates' halves and their slash, so
// a narrow panel can stack them.
export function splitParts(text, parts) {
  let i = 0;
  return parts.map((part) => text.slice(i, (i += part.length + 1) - 1));
}

// The browser tab's session (builder's call 2): the first load gets the full
// loader, later ones the short one. Blocked storage: always the full one.
// The layout's pre-paint script reads the same key, so the server HTML's blob
// never flashes on a short load.
export const SEEN_KEY = "ddc-loaded";
export function loadKind(session) {
  try {
    if (session.getItem(SEEN_KEY)) return "short";
    session.setItem(SEEN_KEY, "1");
    return "full";
  } catch {
    return "full";
  }
}
