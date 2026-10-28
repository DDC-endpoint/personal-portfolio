"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import Availability from "./Availability";
import { NAV_LINKS } from "@/lib/site";
import { EASE } from "@/lib/motion";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const overlayRef = useRef(null);
  const buttonRef = useRef(null);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const logoHref = isHome ? "#top" : "/";
  // The current page: electric, its underline drawn (Phase 6).
  const current = (href) => (href === pathname ? "page" : undefined);

  // Accessibility for the mobile menu: Escape closes it, Tab is trapped inside,
  // focus moves in on open and returns to the toggle on close, and background
  // scroll is locked while it's open.
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
    lockScroll();

    // Hide the page content behind the overlay from assistive tech (browse-mode
    // readers navigate by landmark/heading and can otherwise reach it despite
    // the focus trap). The header (close button) stays interactive.
    const mainEl = document.querySelector("main");
    mainEl?.setAttribute("inert", "");

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
      mainEl?.removeAttribute("inert");
      buttonRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: EASE, delay: 0.2 }}
        // right: --lock-gap keeps it still while a scroll lock hides the
        // scrollbar (lib/scrollLock.js).
        className="fixed top-0 left-0 right-[var(--lock-gap,0px)] z-50 mix-blend-multiply dark:mix-blend-screen"
      >
        <div className="px-6 md:px-10 py-6 flex items-center justify-between">
          {/* Left: logo */}
          <a href={logoHref} className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink">
            <span className="opacity-50">DDC</span> / <span>Damian De Cruz</span>
          </a>

          {/* Centre: the four pages (desktop) */}
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                aria-current={current(l.href)}
                className="font-mono text-[11px] uppercase tracking-[0.18em] [--trail:0.18em] text-ink link-line aria-[current=page]:text-electric"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Right: theme toggle + availability + mobile hamburger */}
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
              aria-controls="mobile-menu"
            >
              <motion.span
                animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="block h-px w-full bg-ink origin-center"
              />
              <motion.span
                animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.2 }}
                className="block h-px w-full bg-ink"
              />
              <motion.span
                animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
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
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed inset-0 z-40 bg-ivory/95 backdrop-blur-xs flex flex-col items-start justify-center px-8 md:hidden"
          >
            <nav className="flex flex-col gap-8">
              {NAV_LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  aria-current={current(l.href)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.4, ease: EASE }}
                  onClick={() => setOpen(false)}
                  className="font-display text-5xl italic text-ink hover:text-electric aria-[current=page]:text-electric transition-colors duration-300"
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
              <Availability className="inline-flex" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
