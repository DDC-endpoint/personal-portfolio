"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FALLBACK_MS, PAGES, TIMING, intercept } from "@/lib/pageTransition";
import { markSoftNavigation } from "@/lib/motion";
import { getLenis } from "@/lib/lenis";

// The page transition (docs/v3/plan-phase-5.md). Mounted once in the site
// layout, which persists across client-side navigations, so the veil (a
// full-screen canvas) stays put while the page beneath it changes.
//
// Links stay plain <a href>: one delegated click listener takes over clicks
// between the site's pages (lib/pageTransition.js says which). The veil
// covers the page, the router swaps the next one in underneath, and the veil
// reveals it. Links to the page you're on scroll instead.
//
// The canvas is in the server HTML but idle and invisible; the drawing engine
// (Veil.js) is split out of the first load and imported once the browser is
// idle, or at the first click if that comes sooner.
// html[data-transitions="ready"] says the controller is live.

const NAV_OFFSET = 80; // the fixed nav, as SmoothScroll's in-page links
const PORTRAIT_WAIT_MS = 400; // the reveal waits this long for Home's portrait

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (n) =>
  new Promise((r) => {
    const tick = () => (--n <= 0 ? r() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });

const whenIdle = (fn) => {
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(fn, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 200);
  return () => clearTimeout(id);
};

// Where the page should sit for `hash` ("" is the top).
function targetTop(hash) {
  const el = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
  return el ? el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET : el === null ? null : 0;
}

// The new page is in: put it where it should be and move focus to it.
function land(hash) {
  window.scrollTo({ top: targetTop(hash) ?? 0, behavior: "instant" });
  const main = document.querySelector("main");
  if (!main) return;
  if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
}

// Home's portrait leaves "loading" once it's drawn; don't uncover an empty
// stage, but never wait long for it.
async function portraitDrawn() {
  const until = performance.now() + PORTRAIT_WAIT_MS;
  while (performance.now() < until) {
    const state = document.querySelector("[data-portrait]")?.getAttribute("data-state");
    if (state !== "loading") return;
    await frames(1);
  }
}

export default function PageTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef(null);
  const veilRef = useRef(null); // a promise of the veil, once loading starts
  const busy = useRef(false);
  const pathRef = useRef(pathname);
  const waiters = useRef([]);

  // Resolve anyone waiting for the router to reach a path.
  useEffect(() => {
    pathRef.current = pathname;
    waiters.current = waiters.current.filter((w) => (w.path === pathname ? (w.resolve(), false) : true));
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const loadVeil = () =>
      (veilRef.current ??= import("./Veil").then(({ createVeil }) => createVeil(canvasRef.current)));
    const waitForPath = (path) =>
      new Promise((resolve) => (pathRef.current === path ? resolve() : waiters.current.push({ path, resolve })));

    async function go(path, hash) {
      busy.current = true;
      markSoftNavigation();
      const veil = await loadVeil();
      await veil.cover();
      const coveredAt = performance.now();
      // Nobody is ever stuck under the veil: if the page doesn't come, load it.
      const fallback = setTimeout(() => window.location.assign(path + hash), FALLBACK_MS);
      router.push(path + hash, { scroll: false });
      await waitForPath(path);
      clearTimeout(fallback);
      await frames(2); // let the new page paint under the veil
      if (path === "/") await portraitDrawn();
      const left = TIMING.hold * 1000 - (performance.now() - coveredAt);
      if (left > 0) await sleep(left);
      land(hash);
      await veil.reveal();
      busy.current = false;
    }

    // A link to the page you're on: scroll there, as an in-page #link does.
    function scrollHere(hash) {
      const top = targetTop(hash);
      if (top === null) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(top);
      else window.scrollTo({ top, behavior: "smooth" });
    }

    function onClick(e) {
      const a = e.target.closest?.("a[href]");
      if (!a || !(a instanceof HTMLAnchorElement)) return;
      const hit = intercept(
        e,
        { href: a.href, origin: a.origin, target: a.target, download: a.hasAttribute("download"), raw: a.getAttribute("href") },
        window.location,
      );
      if (!hit) return;
      e.preventDefault();
      if (busy.current) return; // a second click while the veil runs
      if (hit.kind === "scroll") scrollHere(hit.hash);
      else go(hit.path, hit.hash);
    }

    document.addEventListener("click", onClick);
    const cancelIdle = whenIdle(async () => {
      for (const p of PAGES) if (p !== window.location.pathname) router.prefetch(p);
      await loadVeil();
      if (!cancelled) document.documentElement.dataset.transitions = "ready";
    });
    return () => {
      cancelled = true;
      cancelIdle();
      document.removeEventListener("click", onClick);
      veilRef.current?.then((v) => v.destroy());
      delete document.documentElement.dataset.transitions;
    };
  }, [router]);

  return (
    <canvas
      ref={canvasRef}
      data-veil="idle"
      aria-hidden="true"
      className="page-veil fixed inset-0 z-70 h-full w-full pointer-events-none nojs:hidden"
    />
  );
}
