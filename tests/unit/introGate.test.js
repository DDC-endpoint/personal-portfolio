import { shouldPlayIntro, resetIntroDecision } from "@/lib/motion";

function stubWindow({ reduced = false } = {}) {
  globalThis.window = { matchMedia: (q) => ({ matches: reduced && q.includes("reduce") }) };
}

beforeEach(() => resetIntroDecision());
afterEach(() => delete globalThis.window);

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
