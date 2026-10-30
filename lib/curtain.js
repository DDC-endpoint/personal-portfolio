// The curtain (docs/v3/plan-phase-6.md → "The loader and the curtain";
// Damian's preset in docs/v3/spike/loader-curtain.html). Full-height panels
// rise from below to cover the page, centre-out, hold while the next page
// swaps in, then carry on upwards to reveal it. An electric line glints along
// their top and bottom edges with their speed. Pure: the timings and the
// motion's maths. The DOM lives in components/transition/curtain.js.
//
// Flat since 2026-10-30 (Damian: "lift the curtain without the liquid edge
// and flat, just like the lab's curtain-transition; remove the shadows as
// well, as clean as the lab"). The curved edges and the shadows were each
// redrawn every frame of a move, and a mid-range phone showed 35-41 fps of a
// page change; flat panels are pictures the compositor only moves.

// Seconds: the lab's timing (Damian: "keep these timings").
export const TIMING = { in: 0.7, hold: 0.22, out: 0.85, stagger: 0.12 };

// Panels travel one of their own heights either side of covering (from below
// to above), as the lab's do.
export const EXTENT = 1;

const clamp01 = (x) => Math.min(1, Math.max(0, x));

export const panelCount = (width) => (width < 768 ? 3 : 5);

// Centre-out: the middle panel first, then its neighbours, then the outer two.
export const delayOf = (i, count) => Math.abs(i - Math.floor(count / 2)) * TIMING.stagger;
export const maxDelay = (count) => delayOf(0, count);

// power4 in-out, the lab's GSAP ease.
export const ease = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);

// The edge light's opacity: invisible at rest, brightest at full speed (in
// panel heights a second).
export const edgeLight = (speed) => clamp01(Math.abs(speed) / 3.5);

// A move's frames, worked out in advance and handed to the Web Animations
// API, so the compositor moves the panels and fades their edge lights through
// any stall of the main thread (2026-10-29, Damian: "lag free regardless of
// the device"). The eased travel on a fixed grid; the speed (upwards
// positive) is the difference between samples. The last sample is the still
// frame after the move (speed 0). `step` in seconds.
export function sampleMove(from, to, dur, step = 1 / 120) {
  const n = Math.max(1, Math.ceil(dur / step - 1e-9));
  const out = [];
  let prev = from, prevT = 0;
  for (let i = 0; i <= n; i++) {
    const t = Math.min(dur, i * step);
    const y = from + (to - from) * ease(dur > 0 ? t / dur : 1);
    const dt = t - prevT;
    out.push({ t, y, speed: dt > 0 ? (prev - y) / dt : 0 });
    prev = y;
    prevT = t;
  }
  out.push({ t: dur, y: to, speed: 0 });
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
