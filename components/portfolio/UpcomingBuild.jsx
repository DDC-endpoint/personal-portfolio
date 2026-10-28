// An upcoming card's window: a generic skeleton (a nav, two heading lines,
// three blocks) that lays itself out on a 5.2 s loop while on screen
// (globals.css → .build-bar), with "loading… 2026 →". Nothing of an
// unreleased design is shown. Reduced motion: the skeleton, still.

const bar = "build-bar block rounded-[3px] bg-rule";

export default function UpcomingBuild() {
  return (
    <div data-build className="absolute inset-0 grid grid-rows-[auto_auto_auto_1fr] gap-[6%] px-[8%] py-[7%]">
      <div className="flex justify-between">
        <i className={`${bar} h-2 w-[18%]`} style={{ "--k": 0 }} />
        <i className={`${bar} h-2 w-[34%]`} style={{ "--k": 1 }} />
      </div>
      <i className={`${bar} h-4 w-[64%]`} style={{ "--k": 2 }} />
      <i className={`${bar} -mt-[3%] h-4 w-[42%]`} style={{ "--k": 3 }} />
      <div className="grid grid-cols-3 gap-[6%]">
        {[4, 5, 6].map((k) => (
          <i key={k} className={`${bar} h-full min-h-[26px]`} style={{ "--k": k }} />
        ))}
      </div>
      <span data-nosnippet="" className="absolute bottom-[8%] left-[8%] font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
        loading… 2026 →
      </span>
    </div>
  );
}
