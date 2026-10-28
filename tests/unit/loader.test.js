import { N, TARGETS, LOAD, blobPath, stepCount, decodeText, splitParts, loadKind, SEEN_KEY } from "@/lib/loader";

const DT = 1 / 60;

// Runs the count frame by frame until `until` seconds, with readiness from
// `readyAt` (Infinity: never ready). Returns every frame's count.
function run({ readyAt = Infinity, until = 3, speed = 70 } = {}) {
  const out = [];
  let p = 0;
  for (let k = 1; k <= Math.round(until / DT); k++) {
    const el = k * DT;
    p = stepCount({ p, el, ready: el >= readyAt, speed, dt: DT });
    out.push([el, p]);
  }
  return out;
}

test("the count's rules: 96 until ready and 1.2 s, done by 2.5 s", () => {
  expect(LOAD).toEqual({ hold: 96, min: 1.2, max: 2.5 });
});

test("never passes 96 before the page is ready", () => {
  for (const [el, p] of run({ readyAt: Infinity, until: 2.49 })) expect(p, `${el}`).toBeLessThanOrEqual(96);
});

test("never passes 96 before 1.2 s, even when ready at once", () => {
  for (const [el, p] of run({ readyAt: 0, until: 1.19, speed: 400 })) expect(p, `${el}`).toBeLessThanOrEqual(96);
});

test("reaches 100 by 2.5 s when never ready", () => {
  const frames = run({ readyAt: Infinity, until: 2.5 });
  expect(frames.at(-1)[1]).toBe(100);
});

test("finishes soon after ready and 1.2 s", () => {
  const frames = run({ readyAt: 0.3, until: 2 });
  const at = frames.find(([, p]) => p === 100)[0];
  expect(at).toBeGreaterThanOrEqual(1.2);
  expect(at).toBeLessThan(1.6);
});

test("is monotonic and never passes 100", () => {
  for (const opts of [{}, { readyAt: 0.5 }, { readyAt: 2, speed: 10 }]) {
    let prev = 0;
    for (const [, p] of run(opts)) {
      expect(p).toBeGreaterThanOrEqual(prev);
      expect(p).toBeLessThanOrEqual(100);
      prev = p;
    }
  }
});

test("blobPath: a constant command count, and it closes", () => {
  expect(TARGETS).toHaveLength(4);
  for (const t of TARGETS) expect(t).toHaveLength(N);
  const count = (d) => (d.match(/[MQZ]/g) || []).length;
  const a = blobPath(TARGETS[0], 0.3), b = blobPath(TARGETS[2], null), c = blobPath(Array(N).fill(1), null);
  expect(count(a)).toBe(1 + N + 1);
  expect(count(b)).toBe(count(a));
  expect(count(c)).toBe(count(a));
  for (const d of [a, b, c]) {
    expect(d.startsWith("M ")).toBe(true);
    expect(d.endsWith(" Z")).toBe(true);
  }
  // Settled (all radii 1, no wobble): a circle of radius 34 round (50, 50).
  const nums = c.match(/-?\d+(\.\d+)?/g).map(Number);
  for (let i = 0; i < nums.length; i += 2) {
    const r = Math.hypot(nums[i] - 50, nums[i + 1] - 50);
    expect(r).toBeLessThanOrEqual(34.01);
  }
});

test("decodeText keeps spaces, then resolves left to right", () => {
  const rand = () => 0;
  const zero = decodeText("DAMIAN DE CRUZ", 0, rand);
  expect(zero).toHaveLength(14);
  expect(zero[6]).toBe(" ");
  expect(zero[9]).toBe(" ");
  expect(zero).not.toBe("DAMIAN DE CRUZ");
  expect(decodeText("DAMIAN DE CRUZ", 1, rand)).toBe("DAMIAN DE CRUZ");
  expect(decodeText("DAMIAN DE CRUZ", 0.5, rand).slice(0, 7)).toBe("DAMIAN ");
});

test("splitParts cuts a decoded text back into its parts", () => {
  expect(splitParts("DAMIAN DE CRUZ", ["DAMIAN", "DE CRUZ"])).toEqual(["DAMIAN", "DE CRUZ"]);
  const coords = ["N 6.9271°", "/", "E 79.8612°"];
  expect(splitParts("N 6.9271° / E 79.8612°", coords)).toEqual(coords);
  // Mid-decode, the noise stays with its part.
  expect(splitParts("DAMIAN X# @RU*", ["DAMIAN", "DE CRUZ"])).toEqual(["DAMIAN", "X# @RU*"]);
});

test("loadKind: the full loader first in a session, then short", () => {
  const store = new Map();
  const session = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  expect(loadKind(session)).toBe("full");
  expect(store.get(SEEN_KEY)).toBe("1");
  expect(loadKind(session)).toBe("short");
  expect(loadKind(session)).toBe("short");
});

test("loadKind: blocked storage always gets the full loader", () => {
  const throws = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  expect(loadKind(throws)).toBe("full");
  expect(loadKind(throws)).toBe("full");
  expect(loadKind(undefined)).toBe("full");
});
