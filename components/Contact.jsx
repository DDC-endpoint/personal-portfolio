"use client";
import { useEffect, useRef, useState } from "react";
import { useScroll } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { SOCIALS, EMAIL, WHATSAPP_LINK, AVAILABILITY } from "@/lib/site";
import { CONTACT, growInset, colomboClock } from "@/lib/contact";
import { DecodeLabel, ScrambleText } from "./Scramble";

// § 08 Contact — the closing moment (Damian): a small electric tile under the
// label grows right and down into a full-width card as you scroll, and shrinks
// back as you scroll up. The growth is a clip-path written by an effect, so the
// server HTML is the full card (no JS, reduced motion) and the layout never
// reflows. Keyboard focus inside the card holds it fully open.
// "Ivory" text on the card is text-ivory in light mode and text-ink in dark
// mode, because the ivory token turns navy there.

const CLOCK_MS = 15_000;
const FULL = "inset(0px 0px 0px 0px round 8px)";

export default function Contact() {
  const cardRef = useRef(null);
  const contentRef = useRef(null);
  const reduce = useReducedMotion();
  const [clock, setClock] = useState("Colombo · --:--");

  const { scrollYProgress } = useScroll({ target: cardRef, offset: ["start 0.95", "start 0.25"] });

  useEffect(() => {
    const tick = () => setClock(colomboClock(new Date()));
    tick();
    const id = setInterval(tick, CLOCK_MS);
    return () => clearInterval(id);
  }, []);

  // Scroll-scrubbed growth; the card's size comes from its ResizeObserver entry.
  useEffect(() => {
    const card = cardRef.current, content = contentRef.current;
    if (!card || !content || reduce) return;
    let W = 0, H = 0, held = false;
    const apply = () => {
      if (!W) return;
      const p = scrollYProgress.get();
      card.style.clipPath = held ? FULL : growInset(p, { W, H, tile: CONTACT.tile });
      content.style.opacity = held ? "1" : String(Math.min(1, Math.max(0, (p - 0.6) / 0.4)));
    };
    const ro = new ResizeObserver(([entry]) => {
      W = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      H = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      apply();
    });
    ro.observe(card);
    const unsub = scrollYProgress.on("change", apply);
    const onFocusIn = () => {
      held = true;
      apply();
    };
    const onFocusOut = (e) => {
      if (card.contains(e.relatedTarget)) return;
      held = false;
      apply();
    };
    card.addEventListener("focusin", onFocusIn);
    card.addEventListener("focusout", onFocusOut);
    return () => {
      ro.disconnect();
      unsub();
      card.removeEventListener("focusin", onFocusIn);
      card.removeEventListener("focusout", onFocusOut);
      card.style.clipPath = "";
      content.style.opacity = "";
    };
  }, [reduce, scrollYProgress]);

  const [lead, accent, tail] = CONTACT.headline;
  const onCard = "text-ivory dark:text-ink";
  const mono = "font-mono text-[11px] uppercase tracking-[0.18em]";

  return (
    <section id="contact" className="relative px-6 md:px-10 pt-32 md:pt-48 pb-20 md:pb-32 border-t border-rule">
      <DecodeLabel className="section-label">§ 08 — Contact</DecodeLabel>

      <div ref={cardRef} data-contact-card className={`mt-8 md:mt-10 rounded-lg bg-electric ${onCard}`}>
        <div ref={contentRef} data-contact-content className="flex flex-col gap-12 p-7 md:p-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className={`inline-flex items-center gap-2 ${mono}`}>
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ivory dark:bg-ink animate-pulse" />
              <span data-availability>{AVAILABILITY}</span>
            </span>
            <span data-clock className={`${mono} opacity-80`}>
              {clock}
            </span>
          </div>

          <div>
            <h2 className="font-display text-5xl md:text-8xl leading-[0.92] tracking-tight">
              {lead}
              <span className="italic">{accent}</span>
              {tail}
            </h2>
            <p className="mt-6 md:mt-8 max-w-2xl text-lg md:text-xl leading-relaxed opacity-90">{CONTACT.body}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={`mailto:${EMAIL}?subject=Website%20enquiry`}
              data-hover
              className={`group inline-flex items-center justify-between gap-4 rounded-full bg-ivory px-6 py-4 text-ink dark:bg-ink dark:text-ivory font-mono text-[12px] tracking-[0.12em] focus-visible:outline-offset-4`}
            >
              <ScrambleText text={EMAIL} />
              <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">
                →
              </span>
            </a>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              data-hover
              className={`group inline-flex items-center justify-between gap-4 rounded-full border border-current px-6 py-4 ${mono} focus-visible:outline-offset-4`}
            >
              <ScrambleText text="WhatsApp" />
              <span aria-hidden="true" className="transition-transform duration-500 group-hover:translate-x-1">
                ↗
              </span>
            </a>
          </div>

          <ul className="flex flex-wrap gap-x-8 gap-y-3 border-t border-current/30 pt-6">
            {SOCIALS.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-hover
                  data-social
                  className={`group inline-flex items-center gap-2 ${mono} focus-visible:outline-offset-4`}
                >
                  <ScrambleText text={s.label} />
                  <span aria-hidden="true" className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
