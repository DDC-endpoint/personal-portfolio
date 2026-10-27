import { TIMING, FALLBACK_MS, PAGES, intercept, sweepAt, arrivalAt, cellAt } from "@/lib/pageTransition";

const here = { origin: "https://damiandc.com", pathname: "/" };
const left = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
const link = (href, extra = {}) => {
  const url = new URL(href, here.origin);
  return { href: url.href, origin: url.origin, target: "", download: false, raw: href, ...extra };
};

describe("timings", () => {
  test("cover, hold and reveal add up to 1.28 s", () => {
    expect(TIMING.cover + TIMING.hold + TIMING.reveal).toBeCloseTo(1.28, 5);
  });
  test("the fallback is 4 s", () => {
    expect(FALLBACK_MS).toBe(4000);
  });
  test("the pages are Home, /services and /privacy", () => {
    expect(PAGES).toEqual(["/", "/services", "/privacy"]);
  });
});

describe("intercept", () => {
  test("a left click to another page is a transition", () => {
    expect(intercept(left, link("/services"), here)).toEqual({ kind: "transition", path: "/services", hash: "" });
  });
  test("keeps the hash of a link to another page", () => {
    expect(intercept(left, link("/#work"), { ...here, pathname: "/services" })).toEqual({ kind: "transition", path: "/", hash: "#work" });
  });
  test("a link to the current page is a scroll", () => {
    expect(intercept(left, link("/#work"), here)).toEqual({ kind: "scroll", path: "/", hash: "#work" });
    expect(intercept(left, link("/"), here)).toEqual({ kind: "scroll", path: "/", hash: "" });
  });
  test("ignores a non-left click", () => {
    expect(intercept({ ...left, button: 1 }, link("/services"), here)).toBeNull();
  });
  test.each(["metaKey", "ctrlKey", "shiftKey", "altKey"])("ignores a click with %s", (key) => {
    expect(intercept({ ...left, [key]: true }, link("/services"), here)).toBeNull();
  });
  test("ignores an event something else already handled", () => {
    expect(intercept({ ...left, defaultPrevented: true }, link("/services"), here)).toBeNull();
  });
  test("ignores a target other than _self", () => {
    expect(intercept(left, link("/services", { target: "_blank" }), here)).toBeNull();
    expect(intercept(left, link("/services", { target: "_self" }), here)).not.toBeNull();
  });
  test("ignores a download link", () => {
    expect(intercept(left, link("/services", { download: true }), here)).toBeNull();
  });
  test("ignores another origin", () => {
    expect(intercept(left, link("https://example.com/services"), here)).toBeNull();
  });
  test("ignores a path that isn't one of the pages", () => {
    expect(intercept(left, link("/lab"), here)).toBeNull();
    expect(intercept(left, link("/nope"), here)).toBeNull();
  });
  test("ignores bare #… links (SmoothScroll owns them)", () => {
    expect(intercept(left, link("#work"), here)).toBeNull();
  });
  test("a trailing slash still names the page", () => {
    expect(intercept(left, link("/services/"), here)).toEqual({ kind: "transition", path: "/services", hash: "" });
  });
});

describe("sweepAt", () => {
  test("starts at 0 in the top-left corner and stays near 0 along the top row", () => {
    expect(sweepAt(0, 0, 100, 50)).toBe(0);
    expect(sweepAt(99, 0, 100, 50)).toBeLessThan(0.06);
  });
  test("rises down the screen", () => {
    expect(sweepAt(10, 25, 100, 50)).toBeGreaterThan(sweepAt(10, 5, 100, 50));
    expect(sweepAt(10, 49, 100, 50)).toBeGreaterThan(sweepAt(10, 25, 100, 50));
  });
  test("never passes 0.9", () => {
    expect(sweepAt(99, 49, 100, 50)).toBeLessThanOrEqual(0.9);
  });
});

describe("arrivalAt", () => {
  test("every cell's front ends inside its phase", () => {
    for (const span of [TIMING.cover, TIMING.reveal]) {
      const latest = arrivalAt(0.9, 1, span) + TIMING.front;
      expect(latest).toBeLessThanOrEqual(span + 1e-9);
      expect(arrivalAt(0, 0, span)).toBe(0);
    }
  });
});

describe("cellAt", () => {
  const front = TIMING.front;
  test("cover: page, then front, then covered", () => {
    expect(cellAt("cover", 0.1, 0.2, { front }).state).toBe("page");
    const mid = cellAt("cover", 0.2 + front / 2, 0.2, { front });
    expect(mid.state).toBe("front");
    expect(mid.k).toBeCloseTo(0.5, 5);
    expect(cellAt("cover", 0.2 + front, 0.2, { front }).state).toBe("covered");
  });
  test("reveal: covered, then front, then page", () => {
    expect(cellAt("reveal", 0.1, 0.2, { front }).state).toBe("covered");
    expect(cellAt("reveal", 0.2 + front / 2, 0.2, { front }).state).toBe("front");
    expect(cellAt("reveal", 0.2 + front * 1.01, 0.2, { front }).state).toBe("page");
  });
});
