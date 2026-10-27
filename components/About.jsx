"use client";
import Reveal from "./Reveal";
import SplitLines from "./SplitLines";
import { DecodeLabel } from "./Scramble";

export default function About() {
  return (
    <section id="about" className="relative px-6 md:px-10 py-32 md:py-48">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-3">
          <Reveal>
            <div>
              <DecodeLabel as="h2" className="section-label mb-3">§ 01 — About</DecodeLabel>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
                Notes on the maker
              </div>
            </div>
          </Reveal>
        </div>

        <div className="col-span-12 md:col-span-9 md:col-start-4">
          <SplitLines as="p" delay={0.1} stagger={0.07} className="font-display text-3xl md:text-5xl leading-[1.15] tracking-tight text-ink">
            I&rsquo;m Damian, a{" "}
            <span className="italic text-electric">creative technologist</span> and freelance
            web designer in Colombo, in my second year of{" "}
            <span className="italic">BSc (Hons) Computer Science</span>{" "}
            at the <span className="italic">Informatics Institute of Technology</span>.
          </SplitLines>

          <div className="mt-12 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
            <Reveal delay={0.15}>
              <h3 className="section-label mb-4">What I build</h3>
              <p className="text-base md:text-lg leading-relaxed text-ink-soft">
                Small, sharp websites for businesses and creatives in Colombo and beyond, plus my
                own tools and generative experiments. Most of it sits at the edge of software and
                design.
              </p>
              <a
                href="/services"
                data-hover
                className="group mt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-electric link-line"
              >
                Services &amp; pricing
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </a>
            </Reveal>
            <Reveal delay={0.25}>
              <h3 className="section-label mb-4">How I work</h3>
              <p className="text-base md:text-lg leading-relaxed text-ink-soft">
                Quietly obsessive about details, and fast. Most client sites go from brief to live
                in a couple of days. I learn fastest by shipping, and I&rsquo;m always open to
                projects worth building.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
