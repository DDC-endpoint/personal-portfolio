"use client";
import { useEffect, useState } from "react";

// Types `text` into the element at `ref`, a character at a time, once `go`
// turns true and `delay` ms have passed. The server HTML carries the full
// text (no JS sees it); with motion allowed it's cleared on mount and typed
// in. Returns true once the text is complete, for the caret's last blinks.
// Reduced motion keeps the text as rendered and reports done at once.

const CHAR_MS = 22; // plus up to 26 ms of jitter per character, as the mock

export function useTyping(ref, text, go, delay = 0) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }
    el.textContent = "";
    setDone(false);
  }, [ref, text]);

  useEffect(() => {
    const el = ref.current;
    if (!go || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let n = 0;
    let timer = setTimeout(function tick() {
      el.textContent = text.slice(0, ++n);
      if (n < text.length) timer = setTimeout(tick, CHAR_MS + Math.random() * 26);
      else setDone(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [ref, text, go, delay]);

  return done;
}
