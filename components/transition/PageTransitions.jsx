"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import MorphLoader from "@/components/MorphLoader";
import Curtain from "./Curtain";
import { createCurtain } from "./curtain";
import { FALLBACK_MS, PAGES, intercept, pageOf } from "@/lib/pageTransition";
import { TIMING } from "@/lib/curtain";
import { NAV_LINKS } from "@/lib/site";
import { coverStarts, markRevealed, shouldPlayIntro } from "@/lib/motion";
import { getLenis } from "@/lib/lenis";

// The page transition (docs/v3/plan-phase-5.md, its look from Phase 6: the
// curtain). Mounted once in the site layout, which persists across
// client-side navigations, so the curtain stays put while the page beneath
// it changes.
//
// Links stay plain <a href>: one delegated click listener takes over clicks
// between the site's pages (lib/pageTransition.js says which). The curtain
// covers the page, the router swaps the next one in underneath at full
// cover, and the curtain lifts. Links to the page you're on scroll instead.
//
// The first load of any page lifts the same curtain: the server HTML starts
// covered, with the morph loader (components/MorphLoader.jsx) on the middle
// panel; once it's done the curtain lifts and the loader rides away. A page
// link clicked meanwhile opens once the loader is done, under the same cover.
//
// Every arrival's above-the-fold entrance waits for the curtain to clear
// (lib/motion.js → whenRevealed): coverStarts() before the swap, and
// markRevealed() as the panels clear (or at once, with no curtain).
//
// Nobody is ever stuck: every wait for a page has the 4 s fallback (a normal
// page load), and anything that fails along the way falls back the same way.
// Back during a transition calls the transition off and reveals the page the
// visitor went back to.
//
// The panels are in the server HTML but idle and invisible; the engine
// (./curtain.js) ships with the first-load bundle and is built once the
// intro plays, otherwise once the browser is idle, or at the first click if
// that comes sooner. (Until 2026-10-29 it was its own chunk, imported after
// hydration: one more round trip before the first load could lift, 350 ms
// at a 300 ms RTT.) html[data-transitions="ready"] says the controller is
// live.

const NAV_OFFSET = 80; // the fixed nav, as SmoothScroll's in-page links
const PORTRAIT_WAIT_MS = 400; // the reveal waits this long for Home's portrait
const FAILSAFE_MS = 15000; // the CSS failsafe has started hiding the curtain (globals.css)
const SMOOTH_MS = 20; // a frame this quick: the main thread is keeping up
const SETTLE_MAX_MS = 1500; // the longest the curtain waits for that

// The destination's name on the curtain's middle panel.
const nameOf = (path) => NAV_LINKS.find((l) => l.href === path)?.label ?? "";

// Reduced motion and forced colours: page changes stay client-side but
// instant, with no curtain.
const still = () => window.matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)").matches;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (n) =>
  new Promise((r) => {
    const tick = () => (--n <= 0 ? r() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });

// The next page is in, but a slow device may still be building it (styles,
// layout, its first paint, its effects starting up). The curtain lifts only
// once the main thread keeps up, two frames in a row, so the panels never
// move over a page still being built and the reveal runs at the screen's
// rate (Damian, 2026-10-30: "60 fps on any device"). A fast device is there
// within the hold; a slow one holds the cover a little longer instead of
// stuttering through the lift.
async function settled() {
  const until = performance.now() + SETTLE_MAX_MS;
  const next = () => new Promise((r) => requestAnimationFrame(r));
  let last = await next(), calm = 0;
  while (calm < 2 && performance.now() < until) {
    const now = await next();
    calm = now - last < SMOOTH_MS ? calm + 1 : 0;
    last = now;
  }
}

const whenIdle = (fn) => {
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(fn, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 200);
  return () => clearTimeout(id);
};

// Where the page should sit for `hash` ("" is the top; null: no such target).
function targetTop(hash) {
  if (!hash) return 0;
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // a malformed escape: look the id up as written
  }
  const el = document.getElementById(id);
  return el ? el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET : null;
}

// The new page is in: put it at `top` and move focus to it.
function land(top) {
  window.scrollTo({ top, behavior: "instant" });
  const main = document.querySelector("main");
  if (!main) return;
  if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
}

// Home's portrait marks itself data-prepared once it can draw (its wave then
// waits for the lift); don't uncover an empty stage, but never wait long.
async function portraitDrawn() {
  const until = performance.now() + PORTRAIT_WAIT_MS;
  while (performance.now() < until) {
    if (document.querySelector("[data-portrait][data-prepared]")) return;
    await frames(1);
  }
}

export default function PageTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const curtainRef = useRef(null);
  const engineRef = useRef(null); // a promise of the curtain's engine, once loading starts
  const busy = useRef(false);
  const token = useRef(0); // each run's number; a newer run calls older ones off
  const pathRef = useRef(pathname);
  const waiters = useRef([]);
  // Where each page was left (by URL), so Back and Forward return there.
  const positions = useRef(new Map());
  // The first-load intro: the loader is in the server HTML, on the covering
  // curtain (data-curtain="intro"); it unmounts once the curtain has lifted.
  const [intro, setIntro] = useState(true);
  // loaded: the loader is done; lifting: the lift has started (once only);
  // done: the intro is over.
  const introRef = useRef({ loaded: false, lifting: false, done: false, engine: null, pending: null });
  const goRef = useRef(null); // the controller's go(), for a click made during the intro

  // One engine per mount, built on first use. A failed build isn't kept: the
  // next call tries again.
  const loadCurtain = () =>
    (engineRef.current ??= Promise.resolve()
      .then(() => createCurtain(curtainRef.current))
      .catch((error) => {
        engineRef.current = null;
        throw error;
      }));

  // No curtain after all (reduced motion, forced colours, or its code
  // failed to load): show the page as it is.
  const skipIntro = () => {
    const state = introRef.current;
    state.done = true;
    const root = curtainRef.current;
    if (root) {
      root.dataset.curtain = "idle";
      delete root.dataset.intro;
    }
    setIntro(false);
    markRevealed();
    const next = state.pending;
    state.pending = null;
    if (next) goRef.current?.(next.path, next.hash);
    else busy.current = false;
  };

  // The intro is over: the curtain takes clicks again while it runs, and a
  // page link clicked during the lift opens now. The loader, parked off
  // screen with the curtain, unmounts once the browser is idle, so its
  // teardown never lands in an animation frame.
  const introDone = () => {
    const state = introRef.current;
    state.done = true;
    delete curtainRef.current?.dataset.intro;
    whenIdle(() => setIntro(false));
    const next = state.pending;
    state.pending = null;
    if (next) goRef.current?.(next.path, next.hash);
    else busy.current = false;
  };

  // The loader is done (and the curtain's engine is in): lift the curtain,
  // the loader riding the middle panel away. A link clicked during the
  // intro opens now instead, under the same cover.
  const lift = () => {
    const state = introRef.current;
    if (!state.loaded || !state.engine || state.done || state.lifting) return;
    state.lifting = true;
    const next = state.pending;
    state.pending = null;
    if (next) {
      state.done = true;
      delete curtainRef.current?.dataset.intro;
      setIntro(false);
      state.engine.coverNow(nameOf(next.path));
      goRef.current?.(next.path, next.hash, { covered: true });
      return;
    }
    // The lift keeps the intro's rules: the pointer passes through, and a
    // page link clicked meanwhile waits for it to finish. It waits for the
    // main thread to keep up, as a page change's does (Back meanwhile has
    // ended the intro: it lifts the curtain itself).
    settled().then(() => {
      if (state.done) return;
      state.engine.lift({ onClear: markRevealed }).then(introDone);
    });
  };

  const finishLoader = () => {
    introRef.current.loaded = true;
    lift();
  };

  useEffect(() => {
    // Reduced motion and forced colours: no curtain, no loader (the CSS has
    // already hidden them).
    if (!shouldPlayIntro() || still()) return skipIntro();
    busy.current = true;
    curtainRef.current.dataset.intro = "";
    // A late hydration still waits for the loader to reach 100 (it skips its
    // minimum time instead: lib/loader.js → LOAD.late). Until 2026-10-29 it
    // lifted at once, and the count was still rising on the departing panel.
    let live = true;
    loadCurtain()
      .then((engine) => {
        if (!live) return;
        // The CSS failsafe has already uncovered the page: never cover a
        // readable page again.
        if (performance.now() > FAILSAFE_MS) return skipIntro();
        engine.coverNow();
        introRef.current.engine = engine;
        lift();
      })
      .catch(() => live && skipIntro());
    return () => {
      live = false;
    };
    // Once per document: the layout never remounts on a page change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve anyone waiting for the router to reach a path.
  useEffect(() => {
    pathRef.current = pathname;
    waiters.current = waiters.current.filter((w) => (w.path === pathname ? (w.resolve(true), false) : true));
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    let fallback = 0;

    // Wait for the router to reach `path`. If it hasn't within FALLBACK_MS,
    // `rescue` runs (a normal page load). Resolves false if the run was
    // called off meanwhile.
    const arrive = (path, run, rescue) =>
      new Promise((resolve) => {
        if (pathRef.current === path) return resolve(true);
        fallback = setTimeout(() => run === token.current && rescue(), FALLBACK_MS);
        waiters.current.push({
          path,
          resolve: (ok) => {
            clearTimeout(fallback);
            resolve(ok);
          },
        });
      });

    // Call off the run in progress: its waits resolve (false), its fallback
    // is cleared, and every later step of it stands down.
    function callOff() {
      token.current++;
      clearTimeout(fallback);
      const stale = waiters.current;
      waiters.current = [];
      for (const w of stale) w.resolve(false);
    }

    const here = () => window.location.pathname + window.location.hash;
    let current = here(); // the URL whose page (and scroll) is on screen

    // `covered`: the curtain already covers the page (a click during the intro).
    async function go(path, hash, { covered = false } = {}) {
      const run = ++token.current;
      const live = () => run === token.current;
      const url = path + hash;
      busy.current = true;
      positions.current.set(current, window.scrollY);
      try {
        if (still()) {
          coverStarts();
          router.push(url, { scroll: false });
          if (!(await arrive(path, run, () => window.location.assign(url)))) return;
          current = url;
          await frames(1);
          land(targetTop(hash) ?? 0);
          markRevealed();
        } else {
          const engine = await loadCurtain();
          if (!live()) return;
          if (!covered) await engine.cover(nameOf(path));
          if (!live()) return;
          const coveredAt = performance.now();
          coverStarts();
          router.push(url, { scroll: false });
          if (!(await arrive(path, run, () => window.location.assign(url)))) return;
          current = url;
          await frames(2); // let the new page paint under the curtain
          if (path === "/") await portraitDrawn();
          if (!live()) return;
          land(targetTop(hash) ?? 0);
          await settled();
          const left = TIMING.hold * 1000 - (performance.now() - coveredAt);
          if (left > 0) await sleep(left);
          if (!live()) return;
          await engine.lift({ onClear: markRevealed });
        }
        if (live()) busy.current = false;
      } catch {
        if (live()) window.location.assign(url); // the page still opens
      }
    }

    // Back and Forward: the browser has already switched the URL, so there's
    // nothing to sweep over. Cover at once, wait for the page, and reveal it
    // where the visitor left it. During a transition, this calls it off.
    async function onPop() {
      const inFlight = busy.current;
      // Back during the first-load intro: the intro is over, so the loader
      // can't lift the curtain again later.
      const intro = introRef.current;
      if (!intro.done) {
        intro.done = intro.lifting = true;
        intro.pending = null;
        delete curtainRef.current?.dataset.intro;
        setIntro(false);
      }
      positions.current.set(current, window.scrollY); // the page still on screen
      current = here();
      const path = pageOf(window.location.pathname);
      if (!inFlight && (!path || path === pathRef.current)) return;
      if (inFlight) callOff();
      // Back to somewhere that isn't one of the pages, mid-transition: load it.
      if (!path) return window.location.reload();
      const run = ++token.current;
      const live = () => run === token.current;
      const reload = () => window.location.reload();
      busy.current = true;
      coverStarts();
      try {
        if (still()) {
          if (!(await arrive(path, run, reload))) return;
          await frames(1);
          land(positions.current.get(current) ?? 0);
          markRevealed();
        } else {
          const engine = await loadCurtain();
          if (!live()) return;
          engine.coverNow(nameOf(path));
          if (!(await arrive(path, run, reload))) return;
          await frames(2);
          if (path === "/") await portraitDrawn();
          if (!live()) return;
          land(positions.current.get(current) ?? 0);
          await settled();
          if (!live()) return;
          await engine.lift({ onClear: markRevealed });
        }
        if (live()) busy.current = false;
      } catch {
        if (live()) reload();
      }
    }

    // A link to the page you're on: scroll there, as an in-page #link does.
    function scrollHere(hash) {
      const top = targetTop(hash);
      if (top === null) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(top);
      else window.scrollTo({ top, behavior: still() ? "instant" : "smooth" });
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
        // During the intro, the page opens once the intro allows (the last
        // link clicked wins); a second click during a transition is dropped.
        if (!introRef.current.done && hit.kind === "transition") introRef.current.pending = hit;
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
      if (!still()) await loadCurtain().catch(() => {}); // a click retries it
      if (!cancelled) document.documentElement.dataset.transitions = "ready";
    });
    return () => {
      cancelled = true;
      cancelIdle();
      clearTimeout(fallback);
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPop);
      // Drop the curtain's engine, so a remount (React's dev double mount, for
      // one) builds a fresh one instead of reusing a destroyed one.
      const engine = engineRef.current;
      engineRef.current = null;
      engine?.then((e) => e.destroy()).catch(() => {});
      delete document.documentElement.dataset.transitions;
    };
    // loadCurtain only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <>
      <Curtain ref={curtainRef}>{intro && <MorphLoader onDone={finishLoader} />}</Curtain>
    </>
  );
}
