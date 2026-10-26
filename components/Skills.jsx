"use client";
import Reveal from "./Reveal";
import SplitLines from "./SplitLines";
import { DecodeLabel } from "./Scramble";

const groups = [
  {
    label: "Code",
    items: ["JavaScript", "Python", "Java", "HTML / CSS", "React (learning)", "Git & GitHub"],
  },
  {
    label: "Design",
    items: ["Figma", "Photoshop", "Type & Layout", "Color Systems", "Motion Basics"],
  },
  {
    label: "Curious about",
    items: ["AI / LLMs", "Generative art", "Web 3D", "Audio & music tech", "Hardware"],
  },
  {
    label: "Tooling",
    items: ["VS Code", "Vercel", "Notion", "Linear", "GitHub Pages"],
  },
];

export default function Skills() {
  return (
    <section className="relative px-6 md:px-10 py-32 md:py-44 border-t border-rule">
      <div className="grid grid-cols-12 gap-6 mb-16 md:mb-24">
        <div className="col-span-12 md:col-span-3">
          <DecodeLabel className="section-label">§ 03 — Stack</DecodeLabel>
        </div>
        <div className="col-span-12 md:col-span-9 md:col-start-4">
          <SplitLines as="h2" className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-ink">
            Tools of the <span className="italic text-electric">trade</span>.
          </SplitLines>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-px bg-rule border-y border-rule">
        {groups.map((g, i) => (
          <Reveal key={g.label} delay={i * 0.08} className="col-span-12 md:col-span-3 bg-ivory">
            <div className="p-8 md:p-10 h-full flex flex-col gap-6 min-h-[260px]">
              <div className="flex items-baseline justify-between">
                <span className="section-label">{g.label}</span>
                <span className="font-mono text-[10px] text-ink-faint">
                  0{i + 1}
                </span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {g.items.map((it) => (
                  <li
                    key={it}
                    className="font-display text-2xl md:text-3xl leading-tight text-ink hover:text-electric transition-colors duration-300"
                    data-hover
                  >
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
