"use client";
import { useEffect, useRef } from "react";
import { splitWords, isDecodable, letterDelay, letterPhase, noiseChar, TICK_MS, FAINT_OPACITY } from "@/lib/decode";
import { heroWave } from "@/lib/heroWave";

// Hero text that lands with the portrait's loader wave. The server HTML holds
// the real text, one span per letter, so it paints (and counts for LCP) from
// the first frame. Only if the hero wave starts does each letter drop to
// faint noise, scramble for its last 220 ms and land as the wave front
// reaches it — written straight to the DOM, never through React state.
// Words are nowrap spans, so a line only breaks between words mid-decode,
// and each letter's box is frozen at its real width while it holds noise —
// serif noise glyphs are wider or narrower than the letter and would reflow
// the line every tick (layout shift).
// While letters hold noise, assistive tech reads a static sr-only copy and
// the letters are aria-hidden. The copy is `hidden` the rest of the time, so
// the accessible text (and what crawlers index) is the real letters, once.

export default function DecodeText({ as: Tag = "span", text, className = "", ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    const letterBox = root.querySelector("[data-letters]");
    const srCopy = root.querySelector("[data-sr-copy]");
    let raf = 0;
    const off = heroWave.subscribe(({ t0, origin }) => {
      const letters = [...root.querySelectorAll("[data-ch]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { el, ch: el.textContent, width: r.width, delay: letterDelay(Math.hypot(r.left - origin.x, r.top - origin.y), window.innerWidth), done: false };
      });
      for (const l of letters) {
        l.el.style.display = "inline-block";
        l.el.style.width = `${l.width}px`;
        l.el.style.textAlign = "center";
      }
      root.setAttribute("aria-busy", "true");
      letterBox.setAttribute("aria-hidden", "true");
      srCopy.hidden = false;
      let last = -Infinity;
      const step = (now) => {
        if (now - last >= TICK_MS) {
          last = now;
          let pending = 0;
          for (const l of letters) {
            if (l.done) continue;
            const phase = letterPhase(now - t0, l.delay);
            if (phase === "final") {
              l.el.textContent = l.ch;
              l.el.style.cssText = "";
              l.done = true;
              continue;
            }
            pending++;
            l.el.textContent = noiseChar();
            l.el.style.opacity = phase === "faint" ? FAINT_OPACITY : 1;
          }
          if (!pending) {
            root.removeAttribute("aria-busy");
            letterBox.removeAttribute("aria-hidden");
            srCopy.hidden = true;
            return;
          }
        }
        raf = requestAnimationFrame(step);
      };
      step(performance.now());
    });
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <Tag ref={ref} className={className} {...rest}>
      <span data-letters>
        {splitWords(text).map((token, i) =>
          isDecodable(token[0]) ? (
            <span key={i} className="whitespace-nowrap">
              {[...token].map((ch, j) => (
                <span key={j} data-ch>
                  {ch}
                </span>
              ))}
            </span>
          ) : (
            token
          )
        )}
      </span>
      <span data-sr-copy className="sr-only" hidden>
        {text}
      </span>
    </Tag>
  );
}
