import { shouldPlayLoader, resetLoaderDecision, LOADER_KEY } from "@/lib/motion";

function stubWindow({ reduced = false, forced = false, storage = new Map(), throws = false } = {}) {
  globalThis.window = {
    matchMedia: (q) => ({ matches: (reduced && q.includes("reduce")) || (forced && q.includes("forced-colors")) }),
    sessionStorage: {
      getItem: (k) => {
        if (throws) throw new Error("blocked");
        return storage.has(k) ? storage.get(k) : null;
      },
      setItem: (k, v) => {
        if (throws) throw new Error("blocked");
        storage.set(k, v);
      },
    },
  };
  return storage;
}

beforeEach(() => resetLoaderDecision());
afterEach(() => delete globalThis.window);

test("first visit in a session plays and marks the session", () => {
  const storage = stubWindow();
  expect(shouldPlayLoader()).toBe(true);
  expect(storage.get(LOADER_KEY)).toBe("1");
});

test("later loads in the same session don't play", () => {
  stubWindow({ storage: new Map([[LOADER_KEY, "1"]]) });
  expect(shouldPlayLoader()).toBe(false);
});

test("reduced motion never plays and leaves the session unmarked", () => {
  const storage = stubWindow({ reduced: true });
  expect(shouldPlayLoader()).toBe(false);
  expect(storage.has(LOADER_KEY)).toBe(false);
});

test("blocked storage plays", () => {
  stubWindow({ throws: true });
  expect(shouldPlayLoader()).toBe(true);
});

test("one decision per page load", () => {
  stubWindow();
  expect(shouldPlayLoader()).toBe(true);
  expect(shouldPlayLoader()).toBe(true);
});

test("SSR is undecided", () => {
  expect(shouldPlayLoader()).toBe(false);
  stubWindow();
  expect(shouldPlayLoader()).toBe(true);
});

test("forced colours never plays and leaves the session unmarked", () => {
  const storage = stubWindow({ forced: true });
  expect(shouldPlayLoader()).toBe(false);
  expect(storage.has(LOADER_KEY)).toBe(false);
});
