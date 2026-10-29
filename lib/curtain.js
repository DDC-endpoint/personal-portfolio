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
export function bulge(speed, vh, panelW) {
  const cap = Math.min(0.09 * vh, 0.3 * panelW);
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
// px. A drop-shadow's blur radius b is a Gaussian of deviation b / 2, which
// is what blur() takes. Off below the threshold the drop-shadow had.
export function trail(level, speed, theme) {
  const { move } = shadow(level, theme);
  if (move.alpha <= 0.004) return { opacity: 0, y: 0, blur: 0 };
  return { opacity: move.alpha, y: -Math.sign(speed || 1) * move.y, blur: Math.round(move.blur / 2) };
}

// A page change, in seconds: cover, hold, lift.
export const coverTime = (count) => maxDelay(count) + TIMING.in;
export const liftTime = (count) => maxDelay(count) + TIMING.out;
export const totalChange = (count) => coverTime(count) + TIMING.hold + liftTime(count);

// When, after the lift starts, the page counts as revealed: 0.45 of the way
// through the out phase after the last panel's delay, while the outer panels
// are still leaving (entrances start here, so there's no empty beat).
export const clearAt = (count) => maxDelay(count) + TIMING.out * 0.45;
