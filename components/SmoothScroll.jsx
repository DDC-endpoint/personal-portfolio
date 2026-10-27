"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import { getLenis, setLenis } from "@/lib/lenis";

export default function SmoothScroll() {
  useEffect(() => {
    // Respect the user's reduced-motion preference — skip the scroll hijack entirely.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    // Shared with the page transition, for links to the page you're on.
    setLenis(lenis);

    // Lenis only smooths wheel events by default — anchor link clicks (#about,
    // #work, etc.) bypass it and cause an instant native browser jump. We
    // intercept those clicks and delegate them to lenis.scrollTo() so the
    // smooth scroll kicks in and whileInView animations trigger properly.
    //
    // Uses a single delegated listener on `document` rather than attaching to a
    // one-time snapshot of anchors. This catches every in-page anchor — including
    // links rendered after mount (e.g. the ServicesNav links and the mobile-menu
    // overlays, which are conditionally rendered) — so all pages behave alike.
    function handleAnchorClick(e) {
      const anchor = e.target.closest?.('a[href^="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      if (href === "#top" || href === "#") {
        e.preventDefault();
        lenis.scrollTo(0);
        return;
      }

      if (href.startsWith("#")) {
        const target = document.getElementById(href.slice(1));
        if (!target) return;
        e.preventDefault();
        // Offset accounts for the fixed nav bar (~72px tall)
        lenis.scrollTo(target, { offset: -80 });
      }
    }

    document.addEventListener("click", handleAnchorClick);

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      document.removeEventListener("click", handleAnchorClick);
      if (getLenis() === lenis) setLenis(null);
      lenis.destroy();
    };
  }, []);
  return null;
}
