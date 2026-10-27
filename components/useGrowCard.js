"use client";
import { useEffect } from "react";
import { useScroll } from "framer-motion";
import { growInset, growProgress } from "@/lib/contact";

const FULL = "inset(0px 0px 0px 0px round 8px)";

// The growing electric card (Contact, and /services "Start a project"): a
// small tile in the card's top-left corner grows right and down into the full
// card as you scroll, and shrinks back as you scroll up (lib/contact.js
// growProgress). It's a clip-path written here, so the server HTML is the
// full card (no JS, reduced motion) and the layout never reflows; the
// content fades in over the last 40% of the growth. Keyboard focus inside
// the card holds it fully open. The card's size comes from its
// ResizeObserver entry; its page position and the page's scroll range are
// re-measured whenever the card or the page resizes. Both styles are removed
// on unmount.
export function useGrowCard({ cardRef, contentRef, reduce, tile = 96 }) {
  const { scrollY } = useScroll();

  useEffect(() => {
    const card = cardRef.current, content = contentRef.current;
    if (!card || !content || reduce) return;
    let W = 0, H = 0, held = false, geo = null;
    const measure = () => {
      const root = document.documentElement;
      geo = {
        cardTop: card.getBoundingClientRect().top + window.scrollY,
        vh: window.innerHeight,
        maxScroll: root.scrollHeight - window.innerHeight,
      };
    };
    const apply = () => {
      if (!W || !geo) return;
      const p = growProgress(scrollY.get(), geo);
      card.style.clipPath = held ? FULL : growInset(p, { W, H, tile });
      content.style.opacity = held ? "1" : String(Math.min(1, Math.max(0, (p - 0.6) / 0.4)));
    };
    const ro = new ResizeObserver(([entry]) => {
      W = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      H = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      measure();
      apply();
    });
    ro.observe(card);
    const pageRo = new ResizeObserver(() => {
      measure();
      apply();
    });
    pageRo.observe(document.body);
    const onResize = () => {
      measure();
      apply();
    };
    window.addEventListener("resize", onResize);
    const unsub = scrollY.on("change", apply);
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
      pageRo.disconnect();
      window.removeEventListener("resize", onResize);
      unsub();
      card.removeEventListener("focusin", onFocusIn);
      card.removeEventListener("focusout", onFocusOut);
      card.style.clipPath = "";
      content.style.opacity = "";
    };
  }, [cardRef, contentRef, reduce, tile, scrollY]);
}
