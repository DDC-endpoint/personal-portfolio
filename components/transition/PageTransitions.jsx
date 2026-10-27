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
// sweep reveals the page. A page link clicked meanwhile opens once the stamp
// is done, under the same cover.
//
// Nobody is ever stuck: every wait for a page has the 4 s fallback (a normal
// page load), and anything that fails along the way falls back the same way.
// Back during a transition calls the transition off and reveals the page the
// visitor went back to.
//
// The canvas is in the server HTML but idle and invisible; the drawing engine
// (Veil.js) is split out of the first load. It's imported at once when the
// intro plays, otherwise once the browser is idle, or at the first click if
// that comes sooner. html[data-transitions="ready"] says the controller is
// live.

const NAV_OFFSET = 80; // the fixed nav, as SmoothScroll's in-page links
const PORTRAIT_WAIT_MS = 400; // the reveal waits this long for Home's portrait
const LATE_MS = 2500; // hydration later than this: the page is readable already

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
  const token = useRef(0); // each run's number; a newer run calls older ones off
  const pathRef = useRef(pathname);
  const waiters = useRef([]);
  // Where each page was left (by URL), so Back and Forward return there.
  const positions = useRef(new Map());
  // The first-load intro: the stamp is in the server HTML (active), and shows
  // the glyph field through it once the veil is drawn behind it.
  const [intro, setIntro] = useState({ active: true, glyphs: false });
  // ended: the stamp is done; done: its reveal is too (the intro is over).
  const introRef = useRef({ ended: false, done: false, veil: null, pending: null });
  const goRef = useRef(null); // the controller's go(), for a click made during the intro

  // A failed load isn't kept: the next call tries again.
  const loadVeil = () =>
    (veilRef.current ??= import("./Veil")
      .then(({ createVeil }) => createVeil(canvasRef.current))
      .catch((error) => {
        veilRef.current = null;
        throw error;
      }));

  // The intro is over: the veil takes clicks again while it runs, and a page
  // link clicked during the reveal opens now.
  const introDone = () => {
    const state = introRef.current;
    state.done = true;
    delete canvasRef.current?.dataset.intro;
    const next = state.pending;
    state.pending = null;
    if (next) goRef.current?.(next.path, next.hash);
    else busy.current = false;
  };

  const endIntro = (glyphs) => {
    introRef.current.done = true;
    delete canvasRef.current?.dataset.intro;
    setIntro({ active: false, glyphs });
  };

  // The stamp's name has resolved: fade it and sweep the page in (or, if the
  // veil never got drawn, let the stamp wipe away as the old curtain did).
  // A link clicked during the intro opens now, under the cover.
  const finishIntro = () => {
    const state = introRef.current;
    state.ended = true;
    const next = state.pending;
    state.pending = null;
    if (next) {
      if (state.veil || still()) {
        endIntro(Boolean(state.veil));
        goRef.current?.(next.path, next.hash, { covered: Boolean(state.veil) });
        return;
      }
      // The veil isn't drawn yet: keep the stamp up until it covers, so the
      // stamp never wipes away while a cover sweeps down.
      loadVeil()
        .then((veil) => {
          veil.coverNow();
          endIntro(true);
          goRef.current?.(next.path, next.hash, { covered: true });
        })
        .catch(() => window.location.assign(next.path + next.hash));
      return;
    }
    setIntro({ active: false, glyphs: Boolean(state.veil) });
    if (!state.veil) return introDone();
    // The reveal keeps the intro's rules: the pointer passes through, and a
    // page link clicked meanwhile waits for it to finish.
    state.veil.reveal().then(introDone);
  };

  useEffect(() => {
    if (!shouldPlayIntro()) {
      setIntro({ active: false, glyphs: false });
      return;
    }
    busy.current = true;
    // Canvas colours ignore forced colours: those visitors keep the plain
    // stamp and its wipe. A late hydration does too: the page has been
    // readable for a while, so it isn't covered again.
    if (window.matchMedia("(forced-colors: active)").matches || performance.now() > LATE_MS) return;
    let live = true;
    loadVeil()
      .then((veil) => {
        if (!live || introRef.current.ended) return;
        canvasRef.current.dataset.intro = "";
        veil.coverNow();
        introRef.current.veil = veil;
        setIntro({ active: true, glyphs: true });
      })
      .catch(() => {}); // the stamp wipes away as the old curtain did
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

    // `covered`: the veil already covers the page (a click during the intro).
    async function go(path, hash, { covered = false } = {}) {
      const run = ++token.current;
      const live = () => run === token.current;
      const url = path + hash;
      busy.current = true;
      markSoftNavigation();
      positions.current.set(current, window.scrollY);
      try {
        if (still()) {
          router.push(url, { scroll: false });
          if (!(await arrive(path, run, () => window.location.assign(url)))) return;
          current = url;
          await frames(1);
          land(targetTop(hash) ?? 0);
        } else {
          const veil = await loadVeil();
          if (!live()) return;
          if (!covered) await veil.cover();
          if (!live()) return;
          const coveredAt = performance.now();
          router.push(url, { scroll: false });
          if (!(await arrive(path, run, () => window.location.assign(url)))) return;
          current = url;
          await frames(2); // let the new page paint under the veil
          if (path === "/") await portraitDrawn();
          const left = TIMING.hold * 1000 - (performance.now() - coveredAt);
          if (left > 0) await sleep(left);
          if (!live()) return;
          land(targetTop(hash) ?? 0);
          await veil.reveal();
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
      markSoftNavigation();
      try {
        if (still()) {
          if (!(await arrive(path, run, reload))) return;
          await frames(1);
          land(positions.current.get(current) ?? 0);
        } else {
          const veil = await loadVeil();
          if (!live()) return;
          veil.coverNow();
          if (!(await arrive(path, run, reload))) return;
          await frames(2);
          if (path === "/") await portraitDrawn();
          if (!live()) return;
          land(positions.current.get(current) ?? 0);
          await veil.reveal();
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
      if (!still()) await loadVeil().catch(() => {}); // a click retries it
      if (!cancelled) document.documentElement.dataset.transitions = "ready";
    });
    return () => {
      cancelled = true;
      cancelIdle();
      clearTimeout(fallback);
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPop);
      // Drop the veil, so a remount (React's dev double mount, for one)
      // builds a fresh one instead of reusing a destroyed one.
      const veil = veilRef.current;
      veilRef.current = null;
      veil?.then((v) => v.destroy()).catch(() => {});
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
