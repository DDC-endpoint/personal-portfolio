"use client";
import { useEffect } from "react";
import { heroProgress, drift, metaFade, toStyle, driftKeyframes } from "@/lib/heroDrift";

const REST_MS = 150; // the page's scroll has rested this long: the rise back to a plain style

// The hero's drift as the page scrolls away from it (lib/heroDrift.js): the
// section's [data-drift] children rise and fade, its [data-drift-meta]
// corners fade. Where the browser has scroll timelines both run on the
// page's own, so the compositor draws them in step with the scroll however
// busy the main thread is:
// - the fades always, as framer ran them (on a view timeline), so each part
//   stays a layer and its text is drawn as before;
// - the rise from a scroll's first event until it rests, then as a plain
//   style again: a layer the compositor moves by a fraction of a pixel is
//   resampled (soft text), one placed by a style is drawn at its offset.
// Elsewhere every scroll frame writes them.
export function useHeroDrift(sectionRef) {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const parts = [
      ...[...section.querySelectorAll("[data-drift]")].map((el) => [el, drift]),
      ...[...section.querySelectorAll("[data-drift-meta]")].map((el) => [el, metaFade]),
    ];
    const risers = parts.filter(([, map]) => map === drift);
    const timelines = "ScrollTimeline" in window;
    let geo = null, timeline = null, fades = [], rises = [], rest = 0, raf = 0;

    const measure = () => {
      const root = document.documentElement;
      geo = { top: section.getBoundingClientRect().top + window.scrollY, h: section.offsetHeight, M: root.scrollHeight - window.innerHeight };
    };
    const live = () => timelines && geo.M > 0 && geo.h > 0;
    // The styles for where the page is (all of them, or the rise alone).
    const write = (only) => {
      raf = 0;
      if (!geo?.h) return;
      const p = heroProgress(window.scrollY, geo);
      for (const [el, map] of parts) {
        const st = toStyle(map(p));
        if (only) el.style[only] = st[only] ?? "";
        else Object.assign(el.style, st);
      }
    };
    const animate = (list, prop) => list.map(([el, map]) => el.animate(driftKeyframes(map, geo, prop), { timeline, fill: "both" }));
    const settle = () => {
      write("transform");
      for (const a of rises) a.cancel();
      rises = [];
    };
    const onScroll = () => {
      if (!fades.length) {
        if (!raf) raf = requestAnimationFrame(() => write());
        return;
      }
      if (!rises.length) rises = animate(risers, "transform");
      clearTimeout(rest);
      rest = setTimeout(settle, REST_MS);
    };
    // The keyframes follow the hero's place and the page's scroll range.
    const place = () => {
      measure();
      if (!live()) return write();
      if (fades.length) {
        fades.forEach((a, i) => a.effect.setKeyframes(driftKeyframes(parts[i][1], geo, "opacity")));
        rises.forEach((a, i) => a.effect.setKeyframes(driftKeyframes(risers[i][1], geo, "transform")));
        if (!rises.length) write("transform");
        return;
      }
      timeline = new window.ScrollTimeline({ source: document.documentElement, axis: "block" });
      write();
      fades = animate(parts, "opacity");
    };
    const pageRo = new ResizeObserver(place);
    pageRo.observe(document.body);
    pageRo.observe(section);
    place();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", place);
      pageRo.disconnect();
      clearTimeout(rest);
      cancelAnimationFrame(raf);
      for (const a of [...fades, ...rises]) a.cancel();
      for (const [el] of parts) {
        el.style.transform = "";
        el.style.opacity = "";
      }
    };
  }, [sectionRef]);
}
