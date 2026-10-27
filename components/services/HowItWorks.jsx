"use client";
import { motion } from "framer-motion";
import { useRef } from "react";
import SplitLines from "../SplitLines";
import { DecodeLabel } from "../Scramble";
import { useCircuit } from "../circuit/useCircuit";
import CircuitTrace from "../circuit/CircuitTrace";
import CircuitPad from "../circuit/CircuitPad";
import StepCounter from "./StepCounter";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { STEPS } from "@/lib/services";

// /services § 02 How it works: the four steps in one column on the
// Timeline's circuit (Damian). Pads light as the current reaches them and
// each step goes from faint to full ink; the big italic step number stays.
// Laid out like the Timeline: the label column spans the section, so the
// § label and the current step's title (StepCounter) pin beside the steps,
// md and up. Phones pin nothing here. Only these two sections pin.
// No JS and reduced motion: the finished circuit.
export default function HowItWorks() {
  const sectionRef = useRef(null);
  const listRef = useRef(null);
  const reduce = useReducedMotion();
  const { drawn, lit, trace, headRef } = useCircuit({ listRef, sectionRef });
  const litNow = reduce ? STEPS.length : lit;

  return (
    <section ref={sectionRef} id="process" className="relative px-6 md:px-10 py-24 md:py-36 border-t border-rule bg-paper">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-3">
          <div className="md:sticky md:top-32">
            <DecodeLabel className="section-label">§ 02 — How it works</DecodeLabel>
            <StepCounter index={litNow - 1} reduce={reduce} />
          </div>
        </div>

        <div className="col-span-12 md:col-span-9 md:col-start-4">
          <SplitLines as="h2" className="mb-12 md:mb-16 font-display text-4xl md:text-6xl leading-tight tracking-tight text-ink">
            From idea to live in <span className="italic text-electric">four steps</span>.
          </SplitLines>

          <motion.div
            ref={listRef}
            data-circuit-list
            data-flowing="false"
            style={{ "--d": drawn }}
            className="relative"
          >
            <CircuitTrace trace={trace} headRef={headRef} />
            <ol className="flex flex-col gap-12 md:gap-16">
              {STEPS.map((st, i) => (
                <li key={st.n} data-milestone data-lit={i < litNow} className="group relative pl-12 md:pl-20">
                  <CircuitPad index={i} />
                  <div className="flex gap-5 transition-opacity duration-500 js:motion-safe:group-data-[lit=false]:opacity-45">
                    <div className="font-display text-4xl md:text-5xl italic text-electric leading-none">{st.n}</div>
                    <div>
                      <h3 className="font-display text-2xl md:text-3xl text-ink">{st.title}</h3>
                      <p className="mt-2 max-w-md text-base text-ink-soft leading-relaxed">{st.desc}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
