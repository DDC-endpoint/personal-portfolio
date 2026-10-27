"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import Availability from "./Availability";
import { ScrambleText } from "./Scramble";
import { SHORT_YEAR } from "@/lib/site";

// In-page section anchors for the /services route. These resolve on this page
// directly; SmoothScroll.jsx intercepts the clicks and Lenis-scrolls to them.
const SERVICES_LINKS = [
  { href: "#what-i-do", label: "Pricing" },
  { href: "#process", label: "Process" },
  { href: "#recent", label: "Work" },
  { href: "#faq", label: "FAQ" },
];

// PortfolioButton — mirrors the homepage hero's "Services" button exactly
// (electric fill, ivory text, dark-mode token inversion). mix-blend-normal +
// isolate keep it solid inside the multiply-blended header.
function PortfolioButton({ onClick, className = "" }) {
  return (
    <a
      href="/"
      data-hover
      onClick={onClick}
      className={`group inline-flex items-center gap-2 bg-electric text-ivory hover:bg-electric/90 dark:bg-ink dark:text-ivory dark:hover:bg-ink/90 mix-blend-normal isolate px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 ${className}`}
    >
      <ScrambleText text="Portfolio" />
      <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
    </a>
  );
}

// Dedicated navbar for the /services route. Mirrors the homepage nav's shape
// (logo · centred section links · controls) but with services-page anchors and
// a Portfolio button in place of the homepage's hero "Services" button.
export default function ServicesNav() {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef(null);
  const buttonRef = useRef(null);

  // Mirror the homepage mobile-menu a11y: Escape closes, Tab is trapped,
  // focus moves in on open and back to the toggle on close, body scroll locks.
  useEffect(() => {
    if (!open) return;

    const getFocusables = () =>
      overlayRef.current
        ? Array.from(overlayRef.current.querySelectorAll('a[href], button:not([disabled])'))
        : [];

    getFocusables()[0]?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const items = getFocusables();
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Hide the page content behind the overlay from assistive tech (browse-mode
    // readers navigate by landmark/heading and can otherwise reach it despite
    // the focus trap). The header (close button) stays interactive.
    const mainEl = document.querySelector("main");
    mainEl?.setAttribute("inert", "");

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      mainEl?.removeAttribute("inert");
      buttonRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="fixed top-0 left-0 right-0 z-50 mix-blend-multiply dark:mix-blend-screen"
      >
        <div className="px-6 md:px-10 py-6 flex items-center justify-between">
          {/* Left: logo — scrolls back to the top of the services page */}
          <a href="#top" className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">
            <span className="opacity-50">DDC</span> / <span>Services &rsquo;{SHORT_YEAR}</span>
          </a>

          {/* Centre: section links (desktop) */}
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {SERVICES_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink link-line"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Right: theme toggle + mobile hamburger. The desktop Portfolio CTA
              lives in the hero corner (Services.jsx), mirroring the homepage
              hero's Services button — not in the header. */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Availability className="hidden md:inline-flex" />

            {/* Mobile hamburger */}
            <button
              ref={buttonRef}
              className="md:hidden flex flex-col justify-center gap-[5px] w-8 h-8 relative z-50"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="services-mobile-menu"
            >
              <motion.span
                animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="block h-px w-full bg-ink origin-center"
              />
              <motion.span
                animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.2 }}
                className="block h-px w-full bg-ink"
              />
              <motion.span
                animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="block h-px w-full bg-ink origin-center"
              />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={overlayRef}
            id="services-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Services menu"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 bg-ivory/95 backdrop-blur-xs flex flex-col items-start justify-center px-8 md:hidden"
          >
            <nav className="flex flex-col gap-8">
              {SERVICES_LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => setOpen(false)}
                  className="font-display text-5xl italic text-ink hover:text-electric transition-colors duration-300"
                >
                  {l.label}
                </motion.a>
              ))}
            </nav>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-16 flex flex-col items-start gap-8"
            >
              <PortfolioButton onClick={() => setOpen(false)} />
              <Availability className="inline-flex" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
