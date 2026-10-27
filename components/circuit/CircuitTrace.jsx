"use client";

const BOX = 80; // the trace's SVG box, centred on the rail's axis, px

// The circuit's trace, drawn inside the list, which carries --d (see
// useCircuit). Without JS the trace can't be measured, so a straight,
// finished line stands in. Then the dark trace, the lit trace over it
// (revealed down to the head) carrying the flowing current, and the head;
// all centred on the pads' axis.
export default function CircuitTrace({ trace, headRef }) {
  const svgBox = trace && {
    width: BOX,
    height: trace.h,
    viewBox: `${-BOX / 2} 0 ${BOX} ${trace.h}`,
    "aria-hidden": true,
  };
  return (
    <>
      <div
        data-trace-fallback
        aria-hidden
        className="absolute left-4 md:left-0 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-electric js:hidden"
      />
      {trace && (
        <>
          <svg {...svgBox} data-trace className="absolute top-0 left-4 md:left-0 -translate-x-1/2 overflow-visible">
            <path d={trace.d} className="fill-none stroke-rule [stroke-width:2] [stroke-linejoin:round] [stroke-linecap:round]" />
          </svg>
          <svg
            {...svgBox}
            data-trace-lit
            className="absolute top-0 left-4 md:left-0 -translate-x-1/2 overflow-visible js:motion-safe:[clip-path:inset(0_0_calc((1_-_var(--d,1))*100%)_0)]"
          >
            <path d={trace.d} className="fill-none stroke-electric [stroke-width:2] [stroke-linejoin:round] [stroke-linecap:round]" />
            <path data-flow d={trace.d} className="circuit-flow fill-none stroke-white [stroke-opacity:0.9] [stroke-width:1]" />
          </svg>
          <span
            ref={headRef}
            data-head
            aria-hidden
            className="absolute top-0 left-4 md:left-0 -ml-[3px] -mt-[3px] hidden h-1.5 w-1.5 bg-electric opacity-0 shadow-[0_0_8px_rgb(var(--c-electric))] js:motion-safe:block"
          />
        </>
      )}
    </>
  );
}
