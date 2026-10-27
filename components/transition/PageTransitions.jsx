"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import IntroStamp from "@/components/IntroStamp";
import { FALLBACK_MS, PAGES, TIMING, intercept, pageOf } from "@/lib/pageTransition";
import { markSoftNavigation, shouldPlayIntro } from "@/lib/motion";
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
// The first load of any page plays the same reveal (Damian, during the
// build): the server HTML starts covered by the IntroStamp, the veil is drawn
// fully covered behind it, the name resolves over the glyph field, and the
// sweep reveals the page. The veil is busy meanwhile, so clicks wait.
//
// The canvas is in the server HTML but idle and invisible; the drawing engine
// (Veil.js) is split out of the first load. It's imported at once when the
// intro plays, otherwise once the browser is idle, or at the first click if
// that comes sooner. html[data-transitions="ready"] says the controller is
// live.

const NAV_OFFSET = 80; // the fixed nav, as SmoothScroll's in-page links
const PORTRAIT_WAIT_MS = 400; // the reveal waits this long for Home's portrait

// Reduced motion and forced colours: page changes stay client-side but
// instant, with no veil.
const still = () => window.matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)").matches;

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

// The new page is in: put it at `top` and move focus to it.
function land(top) {
  window.scrollTo({ top, behavior: "instant" });
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
  // Where each page was left (by URL), so Back and Forward return there.
  const positions = useRef(new Map());
  // The first-load intro: the stamp is in the server HTML (active), and shows
  // the glyph field through it once the veil is drawn behind it.
  const [intro, setIntro] = useState({ active: true, glyphs: false });
  const introRef = useRef({ ended: false, veil: null, pending: null });
  const goRef = useRef(null); // the controller's go(), for a click made during the intro

  const loadVeil = () =>
    (veilRef.current ??= import("./Veil").then(({ createVeil }) => createVeil(canvasRef.current)));

  // The stamp's name has resolved: fade it and sweep the page in (or, if the
  // veil never got drawn, let the stamp wipe away as the old curtain did).
  // A link clicked during the intro opens now, under the cover already there.
  const finishIntro = () => {
    const state = introRef.current;
    state.ended = true;
    setIntro((s) => ({ ...s, active: false }));
    if (state.pending) {
      delete canvasRef.current?.dataset.intro;
      goRef.current?.(state.pending.path, state.pending.hash, { covered: Boolean(state.veil) });
      return;
    }
    if (!state.veil) {
      busy.current = false;
      return;
    }
    state.veil.reveal().then(() => {
      delete canvasRef.current.dataset.intro;
      busy.current = false;
    });
  };

  useEffect(() => {
    if (!shouldPlayIntro()) {
      setIntro({ active: false, glyphs: false });
      return;
    }
    busy.current = true;
    // Canvas colours ignore forced colours: those visitors keep the plain
    // stamp and its wipe.
    if (window.matchMedia("(forced-colors: active)").matches) return;
    let live = true;
    loadVeil().then((veil) => {
      if (!live || introRef.current.ended) return;
      canvasRef.current.dataset.intro = "";
      veil.coverNow();
      introRef.current.veil = veil;
      setIntro({ active: true, glyphs: true });
    });
    return () => {
      live = false;
    };
    // Once per document: the layout never remounts on a page change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve anyone waiting for the router to reach a path.
  useEffect(() => {
    pathRef.current = pathname;
    waiters.current = waiters.current.filter((w) => (w.path === pathname ? (w.resolve(), false) : true));
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const waitForPath = (path) =>
      new Promise((resolve) => (pathRef.current === path ? resolve() : waiters.current.push({ path, resolve })));

    // Swap the page in client-side. Nobody is ever stuck waiting: if the page
    // doesn't come, the browser loads it the normal way.
    async function swap(path, hash) {
      const fallback = setTimeout(() => window.location.assign(path + hash), FALLBACK_MS);
      router.push(path + hash, { scroll: false });
      await waitForPath(path);
      clearTimeout(fallback);
    }

    const here = () => window.location.pathname + window.location.hash;
    let current = here(); // the URL whose scroll position is on screen

    // `covered`: the veil already covers the page (a click during the intro).
    async function go(path, hash, { covered = false } = {}) {
      busy.current = true;
      markSoftNavigation();
      positions.current.set(current, window.scrollY);
      current = path + hash;
      if (still()) {
        await swap(path, hash);
        await frames(1);
        land(targetTop(hash) ?? 0);
        busy.current = false;
        return;
      }
      const veil = await loadVeil();
      if (!covered) await veil.cover();
      const coveredAt = performance.now();
      await swap(path, hash);
      await frames(2); // let the new page paint under the veil
      if (path === "/") await portraitDrawn();
      const left = TIMING.hold * 1000 - (performance.now() - coveredAt);
      if (left > 0) await sleep(left);
      land(targetTop(hash) ?? 0);
      await veil.reveal();
      busy.current = false;
    }

    // Back and Forward: the browser has already switched the URL, so there's
    // nothing to sweep over. Cover at once, wait for the page, and reveal it
    // where the visitor left it.
    async function onPop() {
      positions.current.set(current, window.scrollY); // still the old page's
      current = here();
      const path = pageOf(window.location.pathname);
      if (!path || path === pathRef.current || busy.current) return;
      busy.current = true;
      markSoftNavigation();
      if (still()) {
        await waitForPath(path);
        await frames(1);
        land(positions.current.get(current) ?? 0);
        busy.current = false;
        return;
      }
      const veil = await loadVeil();
      veil.coverNow();
      await waitForPath(path);
      await frames(2);
      if (path === "/") await portraitDrawn();
      land(positions.current.get(current) ?? 0);
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
      if (busy.current) {
        // During the intro, the page opens once the stamp is done (the last
        // link clicked wins); a second click during a transition is dropped.
        if (!introRef.current.ended && hit.kind === "transition") introRef.current.pending = hit;
        return;
      }
      if (hit.kind === "scroll") scrollHere(hit.hash);
      else go(hit.path, hit.hash);
    }

    goRef.current = go;
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPop);
    const cancelIdle = whenIdle(async () => {
      for (const p of PAGES) if (p !== window.location.pathname) router.prefetch(p);
      if (!still()) await loadVeil();
      if (!cancelled) document.documentElement.dataset.transitions = "ready";
    });
    return () => {
      cancelled = true;
      cancelIdle();
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPop);
      // Drop the veil, so a remount (React's dev double mount, for one)
      // builds a fresh one instead of reusing a destroyed one.
      const veil = veilRef.current;
      veilRef.current = null;
      veil?.then((v) => v.destroy());
      delete document.documentElement.dataset.transitions;
    };
    // loadVeil only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <>
      <canvas
        ref={canvasRef}
        data-veil="idle"
        aria-hidden="true"
        className="page-veil fixed inset-0 z-70 h-full w-full pointer-events-none nojs:hidden"
      />
      <IntroStamp active={intro.active} glyphs={intro.glyphs} onDone={finishIntro} />
    </>
  );
}
