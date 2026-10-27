"use client";
import { useEffect, useRef } from "react";
import { PROMPT, TOOLS, typingSchedule, typedChars, scheduleEnd } from "@/lib/skills";

// § 03 Stack as a terminal that types out the stack once, when it is 40% in
// view. Every string is real text in the server HTML; typing only un-clips it
// (globals.css → .term-t, driven by --n). The panel's data-term goes
// idle → typing → done, and "done" un-clips everything, so anything that
// interrupts the run (a resize across lg, which swaps layouts; a hidden tab
// that stalls rAF) just ends it finished. Both layouts are in the DOM and CSS
// shows one: four columns from lg (they need about 950 px), one `ls` per
// folder below it.

const ACCENT = "text-[rgb(var(--c-term-accent))]";

function T({ k, className = "", children }) {
  return (
    <span data-k={k} className={`term-t ${className}`}>
      {children}
    </span>
  );
}

// A command line: the prompt appears whole, then the command types.
function Command({ p, k, children }) {
  return (
    <div className="flex flex-wrap gap-x-[1ch]">
      <T k={p} className={ACCENT}>{PROMPT}</T>
      <T k={k}>{children}</T>
    </div>
  );
}

function EndPrompt({ k }) {
  return (
    <div className="flex gap-x-[1ch]">
      <T k={k} className={ACCENT}>{PROMPT}</T>
      {/* A drawn block, not "▍": the mono face's latin subset has no
          block elements. */}
      <span data-cursor aria-hidden="true" className="mt-[0.3em] inline-block h-[1.1em] w-[0.6ch] bg-[rgb(var(--c-term-accent))]" />
    </div>
  );
}

export default function Terminal() {
  const ref = useRef(null);

  useEffect(() => {
    const panel = ref.current;
    const wide = window.matchMedia("(min-width: 64rem)");
    let raf = 0;
    let timer = 0;
    let started = false;

    const finish = () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      panel.dataset.term = "done";
    };

    const start = () => {
      started = true;
      const mode = wide.matches ? "columns" : "folders";
      const steps = typingSchedule(mode);
      const end = scheduleEnd(steps);
      const els = new Map(
        [...panel.querySelectorAll(`[data-layout="${mode}"] [data-k]`)].map((el) => [el.dataset.k, el])
      );
      panel.dataset.term = "typing";
      const t0 = performance.now();
      const shown = new Map(); // last --n written, so unchanged spans aren't touched
      const tick = (now) => {
        const t = now - t0;
        for (const [k, n] of typedChars(steps, t)) {
          if (shown.get(k) === n) continue;
          shown.set(k, n);
          els.get(k)?.style.setProperty("--n", n);
        }
        if (t >= end) return finish();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      // rAF stalls in a hidden tab; this ends the run regardless.
      timer = setTimeout(finish, end + 1000);
    };

    // "40% in view", or 40% of the screen for a panel taller than it.
    const io = new IntersectionObserver(
      ([e]) => {
        if (started || !e.isIntersecting) return;
        if (e.intersectionRatio >= 0.4 || e.intersectionRect.height >= window.innerHeight * 0.4) {
          io.disconnect();
          start();
        }
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1] }
    );

    const onLayoutChange = () => {
      io.disconnect();
      finish();
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      panel.dataset.term = "done";
    } else {
      io.observe(panel);
      wide.addEventListener("change", onLayoutChange);
    }
    panel.dataset.armed = "";

    return () => {
      io.disconnect();
      wide.removeEventListener("change", onLayoutChange);
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-terminal
      data-term="idle"
      className="overflow-hidden rounded-lg bg-[#0B1F3A] text-[#F6F6F1] font-mono text-[12px] leading-[1.7] md:text-[14px] dark:border dark:border-rule dark:bg-[#112646]"
    >
      <div className="relative flex items-center border-b border-[#F6F6F1]/15 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-[#F6F6F1]/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#F6F6F1]/25" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#F6F6F1]/25" />
        </div>
        <div className="absolute inset-x-0 text-center text-[11px] text-[#F6F6F1]/70">damian@colombo: ~</div>
      </div>

      <div data-layout="columns" className="hidden px-8 py-7 lg:block">
        <Command p="c:p" k="c:cmd">ls tools/</Command>
        <div className="grid grid-cols-4 gap-x-6">
          {TOOLS.map(({ dir, items }, c) => (
            <ul key={dir}>
              <li>
                <T k={`c:dir:${c}`} className={ACCENT}>{dir}</T>
              </li>
              {items.map((it, i) => (
                <li key={it}>
                  <T k={`c:item:${c}:${i}`}>{it}</T>
                </li>
              ))}
            </ul>
          ))}
        </div>
        <EndPrompt k="c:end" />
      </div>

      <div data-layout="folders" className="px-4 py-5 md:px-8 md:py-7 lg:hidden">
        {TOOLS.map(({ dir, items }, c) => (
          <div key={dir} className="mb-3">
            <Command p={`f:p:${c}`} k={`f:cmd:${c}`}>{`ls tools/${dir}`}</Command>
            <ul>
              {items.map((it, i) => (
                <li key={it}>
                  <T k={`f:item:${c}:${i}`}>{it}</T>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <EndPrompt k="f:end" />
      </div>
    </div>
  );
}
