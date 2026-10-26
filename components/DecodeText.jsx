"use client";
import { useEffect, useRef } from "react";
import { splitWords, isDecodable, letterDelay, letterPhase, noiseChar, TICK_MS, FAINT_OPACITY } from "@/lib/decode";
import { heroWave } from "@/lib/heroWave";

// Hero text that lands with the portrait's loader wave. The server HTML holds
// the real text, one span per letter, so it paints (and counts for LCP) from
// the first frame. Only if the hero wave starts does each letter drop to
// faint noise, scramble for its last 220 ms and land as the wave front
// reaches it — written straight to the DOM, never through React state.
// Words are nowrap spans, so a line only breaks between words mid-decode.

export default function DecodeText({ as: Tag = "span", text, className = "", ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    let raf = 0;
    const off = heroWave.subscribe(({ t0, origin }) => {
      const letters = [...root.querySelectorAll("[data-ch]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { el, ch: el.textContent, delay: letterDelay(Math.hypot(r.left - origin.x, r.top - origin.y), window.innerWidth), done: false };
      });
      root.setAttribute("aria-busy", "true");
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
              l.el.style.opacity = "";
              l.done = true;
              continue;
            }
            pending++;
            l.el.textContent = noiseChar();
            l.el.style.opacity = phase === "faint" ? FAINT_OPACITY : 1;
          }
          if (!pending) {
            root.removeAttribute("aria-busy");
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
    </Tag>
  );
}
