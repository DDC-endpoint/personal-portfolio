"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import WorkCard from "./WorkCard";
import { filterProjects } from "@/lib/portfolio";
import { EASE } from "@/lib/motion";

// /portfolio's work: every project, newest first, as a 3-column grid (2 from
// md, 1 on phones) or as rows (View Morph). A filter fades the cards that
// leave and glides the rest to their new places; cards that come back fade
// in. Reduced motion: filter and view changes are instant.

const VIEW = {
  grid: "grid grid-cols-1 gap-[7vh] md:grid-cols-2 md:gap-x-[2.6vw] md:gap-y-[9vh] lg:grid-cols-3",
  list: "grid grid-cols-1 border-t border-rule",
};

export default function WorkGrid({ filter, view, reduced }) {
  const gridRef = useRef(null);
  const [ready, setReady] = useState(false);
  const projects = filterProjects(filter);

  useEffect(() => setReady(true), []);

  // A card's column in its row, for the entrance stagger.
  const columnOf = useCallback((el) => {
    const grid = gridRef.current;
    if (!grid || grid.dataset.view === "list") return 0;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length;
    return [...grid.children].indexOf(el.closest("li")) % cols;
  }, []);

  const fade = reduced ? { duration: 0 } : { duration: 0.52, ease: EASE, delay: 0.12 };

  return (
    <section aria-label="All work" className="px-6 pb-[8vh] pt-[4vh] md:px-10">
      <LayoutGroup>
        <ul ref={gridRef} data-work data-view={view} data-ready={String(ready)} className={VIEW[view]}>
          <AnimatePresence mode="popLayout" initial={false}>
            {projects.map((p, i) => (
              <motion.li
                key={p.slug}
                layout="position"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: fade }}
                exit={{ opacity: 0, scale: 0.97, transition: reduced ? { duration: 0 } : { duration: 0.18, ease: "easeIn" } }}
                transition={{ layout: reduced ? { duration: 0 } : { duration: 0.62, ease: EASE } }}
                className="min-w-0"
              >
                <WorkCard project={p} index={i} view={view} columnOf={columnOf} reduced={reduced} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </LayoutGroup>
    </section>
  );
}
