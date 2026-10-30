// The curtain (docs/v3/plan-phase-6.md → "The loader and the curtain";
// Damian's preset in docs/v3/spike/loader-curtain.html). Full-height panels
// rise from below to cover the page, centre-out, hold while the next page
// swaps in, then carry on upwards to reveal it. Their top and bottom edges
// curve with their speed, an electric line glints along them, and a shadow
// sits on the seams. Pure: the timings and the per-frame maths. The DOM lives
// in components/transition/curtain.js.

// Seconds: the lab's timing (Damian: "keep these timings").
export const TIMING = { in: 0.7, hold: 0.22, out: 0.85, stagger: 0.12 };

// Panels travel ±1.3 screens (from below to above), so the bulged edges clear.
export const EXTENT = 1.3;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const clamp01 = (x) => clamp(x, 0, 1);

export const panelCount = (width) => (width < 768 ? 3 : 5);

// Centre-out: the middle panel first, then its neighbours, then the outer two.
export const delayOf = (i, count) => Math.abs(i - Math.floor(count / 2)) * TIMING.stagger;
export const maxDelay = (count) => delayOf(0, count);

// power4 in-out, the lab's GSAP ease.
export const ease = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);

// How far a panel's edges curve (px), from its speed in screens a second
// (upwards positive): up to 9% of the screen height, and never more than
// 0.3 × the panel's width, so narrow phone panels bulge less.
export const bulgeCap = (vh, panelW) => Math.min(0.09 * vh, 0.3 * panelW);
export function bulge(speed, vh, panelW) {
  const cap = bulgeCap(vh, panelW);
  return clamp(speed * 0.011 * vh, -cap, cap);
}

// The edge light's opacity: invisible at rest, brightest at full speed.
export const edgeLight = (speed) => clamp01(Math.abs(speed) / 3.5);

// The moving shadow's level (0 → 1), eased after the panel's speed so it
// grows and fades smoothly (dt in seconds).
export const shadowLevel = (level, speed, dt) => level + (clamp01(Math.abs(speed) / 4) - level) * Math.min(1, dt * 10);

// The shadow at a level: a resting part on the seams, always there (Damian:
// the first mock's shadow was "abrupt"), plus a moving part on the trailing
// side that rises smoothly from 0, with no threshold.
export function shadow(level, theme) {
  const dark = theme === "dark";
  const m = Math.sqrt(ease(clamp01(level)));
  return {
    rest: { alpha: dark ? 0.38 : 0.1, blur: 14 },
    move: { alpha: (dark ? 0.45 : 0.16) * m, y: 14 * m, blur: 8 + 16 * m },
  };
}

// How the shadow is drawn (the look is shadow()'s, unchanged). A filter whose
// parameters change every frame re-blurs the whole panel every frame: on an
// Iris Xe laptop that was 16-22 dropped frames a page change. So the resting
// part is one constant filter (restFilter), and the moving part is a blurred
// copy of the panel's shape behind it (components/transition/Curtain.jsx →
// data-trail): each frame moves its offset and opacity, which are cheap, and
// its blur changes only a few times a move (trail).
export const restFilter = (theme, shade) => {
  const { rest } = shadow(0, theme);
  return `drop-shadow(0 0 ${rest.blur}px rgb(${shade} / ${rest.alpha}))`;
};

// The moving shadow at a level, as the trail draws it: its opacity (the
// shadow's alpha, on a copy filled with the shade), its offset in px against
// the direction of travel (speed upwards positive), and its blur() in whole
// px. drop-shadow()'s third length is the Gaussian's standard deviation, as
// blur()'s is (measured in Chrome: blur(14px) under the shape draws
// drop-shadow(0 0 14px)'s shadow to within 2/255; the trail first halved it, which
// drew it too tight). Off below the threshold the drop-shadow had.
export function trail(level, speed, theme) {
  const { move } = shadow(level, theme);
  if (move.alpha <= 0.004) return { opacity: 0, y: 0, blur: 0 };
  return { opacity: move.alpha, y: -Math.sign(speed || 1) * move.y, blur: Math.round(move.blur) };
}

// A panel's outline, split so the costly parts are drawn once (2026-10-29).
// Each frame of a move changes the panel's curved ends, and while they were
// part of the panel's one picture, the resting drop-shadow over the whole
// 130vh panel was drawn again every frame: on a mid-range phone that was
// most of a page change's dropped frames (82 frames shown against 131 with
// the shadow off). So the straight body, with its shadow, is a picture that
// never changes and only moves; each curved end is a small piece of its own,
// redrawn per frame (components/transition/Curtain.jsx).
//
// In panel px: the edges at `top` and `bot`, the path's width `ww`, and the
// bulge `b` (bulge above; the panels only ever move upwards, so it
// is never negative and the ends only bulge outwards). The body is the rect
// between top + SEAM and bot − SEAM. Each end's `mask` is the rest of the
// outline (the bulge, plus SEAM of straight panel), for its shadow and trail:
// body and ends together are the whole outline, no more, so their shadows
// add up to the outline's. Each end's `shape`, the coloured piece, reaches
// OVERLAP further into the body, so the joint is under solid colour and no
// seam shows; at rest the ends' edges are where the whole outline's were.
// `edge` is the end's curve, for the edge light. Shapes are CSS clip-paths;
// masks and edges are bare SVG path data (a canvas fills the masks).
//
// Each end is drawn in a box of its own just around its bulge (endBoxes, at
// most `cap` = bulgeCap tall): a frame blurs and blends that box and no
// more. Panel-sized, the ends cost the phone as much as the whole panel had.
// The ends' paths are in their boxes' px: `at` is the boxes' tops.
export const SEAM = 2;
export const OVERLAP = 2;
export function endBoxes(top, bot, cap) {
  const t0 = Math.floor(top - cap) - 1, b0 = Math.floor(bot - SEAM - OVERLAP) - 1;
  return [
    { y: t0, h: Math.ceil(top + SEAM + OVERLAP) + 1 - t0 },
    { y: b0, h: Math.ceil(bot + cap) + 1 - b0 },
  ];
}
export function pieces(top, bot, ww, b, at = [0, 0]) {
  const n = (y) => Math.round(y * 100) / 100;
  const t = top + SEAM, u = bot - SEAM;
  // The top end, shifted into its box: the curve over `top`, its control
  // point 2b above (the curve's middle is b above), then down to y.
  const T = (y) => n(y - at[0]), B = (y) => n(y - at[1]);
  const curveTop = `M0 ${T(top)} Q ${ww / 2} ${T(top - 2 * b)} ${ww} ${T(top)}`;
  const curveBot = `M0 ${B(bot)} Q ${ww / 2} ${B(bot + 2 * b)} ${ww} ${B(bot)}`;
  const capTop = (y) => `${curveTop} L ${ww} ${T(y)} L 0 ${T(y)} Z`;
  const capBot = (y) => `M0 ${B(y)} L ${ww} ${B(y)} L ${ww} ${B(bot)} Q ${ww / 2} ${B(bot + 2 * b)} 0 ${B(bot)} Z`;
  return {
    body: `path("M0 ${t} L ${ww} ${t} L ${ww} ${u} L 0 ${u} Z")`,
    top: { mask: capTop(t), shape: `path("${capTop(t + OVERLAP)}")`, edge: curveTop },
    bottom: { mask: capBot(u), shape: `path("${capBot(u - OVERLAP)}")`, edge: curveBot },
  };
}

// A move's frames, worked out in advance (2026-10-29, Damian: "lag free
// regardless of the device"). The engine used to compute each frame as it
// came, from the real time between frames, and write it to the DOM: when
// the next page's mount stalled the main thread, the panels froze with it
// (150-300 ms on a mid-range phone). Instead each move is sampled on a
// fixed grid and handed to the Web Animations API, so the compositor moves
// the panels through a stall. Same maths: the speed is the difference
// between samples, and the shadow level follows it as before. The last
// sample is the still frame after the move (speed 0), as draw(0) was.
// `level` is the shadow level the panel starts at; `step` in seconds.
export function sampleMove(from, to, dur, level = 0, step = 1 / 120) {
  const n = Math.max(1, Math.ceil(dur / step - 1e-9));
  const out = [];
  let prev = from, prevT = 0;
  for (let i = 0; i <= n; i++) {
    const t = Math.min(dur, i * step);
    const y = from + (to - from) * ease(dur > 0 ? t / dur : 1);
    const dt = t - prevT;
    const speed = dt > 0 ? (prev - y) / dt : 0;
    level = shadowLevel(level, speed, dt);
    out.push({ t, y, speed, level });
    prev = y;
    prevT = t;
  }
  out.push({ t: dur, y: to, speed: 0, level });
  return out;
}

// A page change, in seconds: cover, hold, lift.
export const coverTime = (count) => maxDelay(count) + TIMING.in;
export const liftTime = (count) => maxDelay(count) + TIMING.out;
export const totalChange = (count) => coverTime(count) + TIMING.hold + liftTime(count);

// When, after the lift starts, the page counts as revealed: 0.45 of the way
// through the out phase after the last panel's delay, while the outer panels
// are still leaving (entrances start here, so there's no empty beat).
export const clearAt = (count) => maxDelay(count) + TIMING.out * 0.45;
