import { forwardRef } from "react";

// The curtain's panels, in the server HTML (docs/v3/plan-phase-6.md → "The
// curtain"): five full-height columns (three below md), alternating ivory and
// mist (navy and navy-2 in dark mode), each with its shadow, its clipped
// shape and the edge light. The label (and, on a first load, the morph
// loader) rides the middle panel. The server HTML has it covering ("intro")
// for the loader; the engine (./curtain.js) moves it from then on. Hidden
// from screen readers; never in the way of a click while idle. Above every
// layer, the cursor (z-110) included: the cursor stays behind it (Damian).

const PANELS = 5;

const Curtain = forwardRef(function Curtain(props, ref) {
  return (
    <div ref={ref} data-curtain="intro" aria-hidden="true" className="curtain fixed inset-0 z-[120] pointer-events-none nojs:hidden">
      {Array.from({ length: PANELS }, (_, i) => (
        <div key={i} data-panel={i} className="curtain-panel">
          <div data-drop className="absolute inset-0">
            <div data-shape className={`absolute inset-0 overflow-hidden ${i % 2 ? "bg-mist" : "bg-ivory"}`}>
              <div className="absolute inset-y-0 left-0 w-px bg-rule opacity-55" />
            </div>
          </div>
          <svg data-edges className="absolute inset-0 h-full w-full overflow-visible opacity-0">
            <path data-edge-top className="fill-none stroke-electric [stroke-width:1.25] [vector-effect:non-scaling-stroke]" />
            <path data-edge-bottom className="fill-none stroke-electric [stroke-width:1.25] [vector-effect:non-scaling-stroke]" />
          </svg>
        </div>
      ))}
      <div data-rider className="absolute inset-0">
        {/* The destination, in small vertical mono with an electric dot. */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint [writing-mode:vertical-rl] whitespace-nowrap">
          <span data-label />
          <span className="text-electric"> ●</span>
        </div>
        {props.children}
      </div>
    </div>
  );
});

export default Curtain;
