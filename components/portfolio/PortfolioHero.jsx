"use client";
import EagerReveal from "../EagerReveal";
import { FILTERS, countFor, liveCount, upcomingCount } from "@/lib/projects";

// /portfolio's compact hero (~45vh): the count, "All work.", one lede line,
// then the filter chips and the Grid | List switch. Both control groups are
// aria-pressed buttons in a labelled group, hidden without JS (every card
// shows then). The filter and the view aren't kept in the URL: a visit always
// starts on All, Grid (Damian's builder's call 7).

const pad = (n) => String(n).padStart(2, "0");
const MONO = "font-mono text-[11px] uppercase tracking-[0.18em]";
const PRESSED = "aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-ivory";

export default function PortfolioHero({ filter, onFilter, view, onView }) {
  return (
    <section className="grid min-h-[45vh] content-end gap-[22px] px-6 pb-[4vh] pt-[16vh] md:px-10 md:pb-[5vh] md:pt-[19vh]">
      <EagerReveal delay={0.1} y={8} duration={0.8} className={`${MONO} text-ink-faint`}>
        <span data-work-count>
          <b className="font-medium text-electric">{pad(liveCount)}</b> live · <b className="font-medium text-electric">{pad(upcomingCount)}</b> on the way
        </span>
      </EagerReveal>
      <h1 className="overflow-hidden pb-[0.06em] font-display text-[clamp(64px,8.5vw,6rem)] leading-[0.9] tracking-[-0.03em] text-ink">
        <EagerReveal as="span" delay={0.15} y={110} className="inline-block">
          All <em className="text-electric">work.</em>
        </EagerReveal>
      </h1>
      <EagerReveal as="p" delay={0.4} y={8} duration={0.8} className="max-w-[46ch] text-[17px] leading-relaxed text-ink-soft">
        Client sites, concepts and my own tools, newest first.
      </EagerReveal>
      <EagerReveal delay={0.55} y={8} duration={0.8} className="hidden flex-wrap items-center justify-between gap-4 pt-2 js:flex">
        <div role="group" aria-label="Filter the work" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => onFilter(f.id)}
              data-hover
              className={`${MONO} inline-flex items-baseline gap-[7px] border border-rule px-3 py-2 text-ink transition-colors duration-200 hover:border-ink-faint ${PRESSED}`}
            >
              {f.label}
              <sup className="text-[9px] opacity-60">{countFor(f.id)}</sup>
            </button>
          ))}
        </div>
        <div role="group" aria-label="View" className="inline-flex border border-rule">
          {["grid", "list"].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => onView(v)}
              data-hover
              className={`${MONO} px-3 py-2 capitalize text-ink transition-colors duration-200 ${PRESSED}`}
            >
              {v === "grid" ? "Grid" : "List"}
            </button>
          ))}
        </div>
      </EagerReveal>
    </section>
  );
}
