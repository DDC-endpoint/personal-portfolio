import { FALLBACK_MS, PAGES, intercept, pageOf } from "@/lib/pageTransition";

const here = { origin: "https://damiandc.com", pathname: "/" };
const left = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
const link = (href, extra = {}) => {
  const url = new URL(href, here.origin);
  return { href: url.href, origin: url.origin, target: "", download: false, raw: href, ...extra };
};

describe("the fallback and the pages", () => {
  test("the fallback is 4 s", () => {
    expect(FALLBACK_MS).toBe(4000);
  });
  test("the pages are Home, /portfolio, /services and /privacy", () => {
    expect(PAGES).toEqual(["/", "/portfolio", "/services", "/privacy"]);
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

describe("pageOf", () => {
  test("names one of the pages, with or without a trailing slash", () => {
    expect(pageOf("/")).toBe("/");
    expect(pageOf("/services/")).toBe("/services");
  });
  test("is null for anything else", () => {
    expect(pageOf("/no-such-page")).toBeNull();
    expect(pageOf("/lab")).toBeNull();
  });
});
