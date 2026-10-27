import { padLabel } from "@/lib/timeline";

// One milestone's hardware, rendered first inside its `group` <li>: the P0N
// label (desktop), the track out to the entry, the via at its end and the pad
// ([data-dot], which useCircuit measures). Lit by default (no JS, reduced
// motion); the js:motion-safe:group-data-[lit=false]: classes keep them dark
// until the current reaches the pad. The dark pad fills with bg-paper, the
// background of every section that uses the circuit.
export default function CircuitPad({ index }) {
  return (
    <>
      <span
        data-pad-label
        aria-hidden
        className="absolute right-[calc(100%+14px)] top-[13px] hidden font-mono text-[8px] leading-none tracking-[0.1em] text-electric transition-colors duration-300 md:block js:motion-safe:group-data-[lit=false]:text-ink-faint"
      >
        {padLabel(index)}
      </span>
      {/* the track out to the entry: dark underneath, drawn in electric when lit */}
      <span aria-hidden className="absolute left-[22px] md:left-[6px] top-[16.25px] h-[1.5px] w-[18px] md:w-[50px] bg-rule" />
      <span
        aria-hidden
        className="absolute left-[22px] md:left-[6px] top-[16.25px] h-[1.5px] w-[18px] md:w-[50px] origin-left bg-electric transition-transform duration-300 ease-out js:motion-safe:group-data-[lit=false]:scale-x-0"
      />
      <span
        aria-hidden
        className="absolute left-[39px] md:left-[55px] top-[14px] h-1.5 w-1.5 rounded-full border border-electric bg-electric transition-colors duration-200 delay-300 js:motion-safe:group-data-[lit=false]:border-rule js:motion-safe:group-data-[lit=false]:bg-paper js:motion-safe:group-data-[lit=false]:delay-0"
      />
      <span
        data-dot
        aria-hidden
        className="absolute left-[10px] md:left-[-6px] top-[11px] grid h-3 w-3 place-items-center rounded-full border-2 border-electric bg-electric shadow-[0_0_8px_rgb(var(--c-electric)/0.7)] transition-[background-color,border-color,box-shadow] duration-300 js:motion-safe:group-data-[lit=false]:border-rule js:motion-safe:group-data-[lit=false]:bg-paper js:motion-safe:group-data-[lit=false]:shadow-none"
      >
        <span className="h-[3px] w-[3px] rounded-full bg-paper js:motion-safe:group-data-[lit=false]:bg-rule" />
      </span>
    </>
  );
}
