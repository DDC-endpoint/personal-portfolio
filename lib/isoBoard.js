// The Isometric Board's maths, shared by the lab demo
// (components/lab/demos/IsometricBoard.jsx) and the 404 page
// (components/IsoBoard.jsx). A 5×5 board of tiles: the tile under the pointer
// lifts, its neighbours rise with a Gaussian falloff, and idle, a slow
// diagonal wave drifts across. Every tile eases towards its target with
// dt-based smoothing. Pure, so it unit-tests in node.

export const N = 5;
export const LIFT = 26; // px translateZ at full lift
export const SIGMA = 0.85; // falloff radius in cells
export const TAU = 0.14; // smoothing time constant (s)

// A tile's lift (0 → 1) for a pointer at board coordinates (fx, fy).
export const falloff = (r, c, fx, fy) => Math.exp(-((c + 0.5 - fx) ** 2 + (r + 0.5 - fy) ** 2) / (2 * SIGMA * SIGMA));

// Idle: a slow wave along the diagonals, t in seconds.
export const ambient = (r, c, t) => Math.max(0, 0.1 + 0.14 * Math.sin(t * 0.9 - (r + c) * 0.7));

// How far a tile moves towards its target in dt seconds.
export const smoothing = (dt) => 1 - Math.exp(-dt / TAU);

// Reduced motion: a settled composition, as if a pointer were parked
// mid-board (a lifted cluster).
export const settled = (r, c) => falloff(r, c, 3.1, 1.6) * 0.9;

// A pointer in tile (r, c) at (offsetX, offsetY) of its w × h box, as
// continuous board coordinates. The browser already maps offsetX/Y into the
// tile's own (3D-transformed) space.
export function aim(r, c, offsetX, offsetY, w, h) {
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  return { x: c + (w ? clamp01(offsetX / w) : 0.5), y: r + (h ? clamp01(offsetY / h) : 0.5) };
}

// Phones (no hover): no pointer to follow, so the board tours on its own, a
// step livelier than the desktop idle. The same diagonal wave, a little
// taller, plus a lifted cluster gliding a figure-eight over the board. One
// loop is LOOP seconds and the wave runs twice per loop (≈ the idle's 7 s),
// so it repeats seamlessly. IsoBoard samples it into keyframes once and hands
// them to the compositor, so no JS runs per frame and touch is untouched.
export const LOOP = 14; // s

// The cluster's centre at t seconds, in board coordinates.
export const glide = (t) => {
  const a = (2 * Math.PI * t) / LOOP;
  return { x: 2.5 + 1.5 * Math.sin(a), y: 2.5 + 1.5 * Math.sin(2 * a) };
};

// A tile's lift (0 → 1) on the tour at t seconds.
export const tour = (r, c, t) => {
  const wave = Math.max(0, 0.12 + 0.16 * Math.sin((4 * Math.PI * t) / LOOP - (r + c) * 0.7));
  const p = glide(t);
  return wave + 0.6 * falloff(r, c, p.x, p.y);
};

// A tile's tour as `samples` + 1 lift values over one loop (first = last).
export const tourLifts = (r, c, samples = 168) =>
  Array.from({ length: samples + 1 }, (_, k) => tour(r, c, (k / samples) * LOOP));
