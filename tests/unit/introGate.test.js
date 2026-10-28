import { shouldPlayIntro, resetIntroDecision, whenRevealed, onReveal, markRevealed, coverStarts, isRevealed } from "@/lib/motion";

function stubWindow({ reduced = false } = {}) {
  globalThis.window = { matchMedia: (q) => ({ matches: reduced && q.includes("reduce") }) };
}

beforeEach(() => resetIntroDecision());
afterEach(() => delete globalThis.window);

const tick = () => new Promise((r) => setTimeout(r, 0));

test("plays on every load", () => {
  stubWindow();
  expect(shouldPlayIntro()).toBe(true);
  resetIntroDecision(); // a reload
  expect(shouldPlayIntro()).toBe(true);
});

test("reduced motion never plays", () => {
  stubWindow({ reduced: true });
  expect(shouldPlayIntro()).toBe(false);
});

test("one decision per page load", () => {
  stubWindow();
  expect(shouldPlayIntro()).toBe(true);
  window.matchMedia = () => ({ matches: true });
  expect(shouldPlayIntro()).toBe(true);
});

test("SSR is undecided", () => {
  expect(shouldPlayIntro()).toBe(false);
  stubWindow();
  expect(shouldPlayIntro()).toBe(true);
});

describe("the reveal (entrances wait for the curtain to clear)", () => {
  test("a load starts covered: whenRevealed waits for markRevealed", async () => {
    let done = false;
    whenRevealed().then(() => (done = true));
    await tick();
    expect(isRevealed()).toBe(false);
    expect(done).toBe(false);
    markRevealed();
    await tick();
    expect(done).toBe(true);
  });

  test("resolves at once when no curtain plays (already revealed)", async () => {
    markRevealed();
    let done = false;
    whenRevealed().then(() => (done = true));
    await tick();
    expect(done).toBe(true);
  });

  test("once per arrival: a page change covers again, and the next reveal fires", async () => {
    markRevealed();
    coverStarts();
    expect(isRevealed()).toBe(false);
    const seen = [];
    onReveal(() => seen.push("a"));
    markRevealed();
    await tick();
    markRevealed(); // a second call for the same arrival does nothing new
    await tick();
    expect(seen).toEqual(["a"]);
  });

  test("onReveal can be called off", async () => {
    const seen = [];
    const off = onReveal(() => seen.push("x"));
    off();
    markRevealed();
    await tick();
    expect(seen).toEqual([]);
  });
});
