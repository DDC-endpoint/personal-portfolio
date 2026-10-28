"use client";
import { useEffect, useRef } from "react";
import { ring as ringPos } from "@/lib/cursor";
import { isRevealed, whenRevealed } from "@/lib/motion";

export default function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);

  useEffect(() => {
    // Respect accessibility preferences: users who ask for reduced motion or
    // are in a forced-colors / high-contrast mode keep their native cursor.
    // Bail before adding .js-cursor so the cursor:none CSS never applies.
    const noCursor =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(forced-colors: active)").matches;
    if (noCursor) return;

    document.documentElement.classList.add("js-cursor");
    let mx = 0, my = 0, rx = 0, ry = 0;
    const move = (e) => { mx = e.clientX; my = e.clientY; };
    let over = null; // the element under the pointer
    const onOver = (e) => {
      over = e.target;
      restyle();
    };
    const restyle = () => {
      const t = over;
      // Over the hero portrait the ring grows into its lens (the portrait
      // draws the photo inside it from ringPos) and the dot steps aside.
      // Not while the intro curtain covers it (it lets the pointer through):
      // a pointer resting there gets the lens at the reveal.
      const onLens = !!t.closest("[data-lens]");
      const lens = onLens && isRevealed();
      if (onLens && !lens) whenRevealed().then(() => over === t && restyle());
      ring.current?.classList.toggle("is-lens", lens);
      dot.current?.classList.toggle("is-hidden", lens);
      if (lens) {
        ring.current?.style.setProperty("width", "240px");
        ring.current?.style.setProperty("height", "240px");
        ring.current?.style.setProperty("opacity", "1");
      } else if (t.closest("a, button, [data-hover]")) {
        ring.current?.style.setProperty("width", "60px");
        ring.current?.style.setProperty("height", "60px");
        ring.current?.style.setProperty("opacity", "0.6");
      } else {
        ring.current?.style.setProperty("width", "36px");
        ring.current?.style.setProperty("height", "36px");
        ring.current?.style.setProperty("opacity", "1");
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", onOver);
    let raf;
    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ringPos.x = rx;
      ringPos.y = ry;
      if (dot.current) dot.current.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
      if (ring.current) ring.current.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", onOver);
      document.documentElement.classList.remove("js-cursor");
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden />
      <div ref={dot} className="cursor-dot" aria-hidden />
    </>
  );
}
