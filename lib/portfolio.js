// /portfolio's motion, as pure functions (docs/v3/plan-phase-6.md → Task 5;
// the timings are Damian's from docs/v3/spike/portfolio-page.html).

import { PROJECTS, inFilter } from "./projects";

// The row-by-row entrance: a row's cards land 110 ms apart, capped at three.
export const ENTRANCE = { staggerMs: 110, maxColumns: 3, typeAfterMs: 380 };
export const delayFor = (column) => Math.min(column, ENTRANCE.maxColumns) * ENTRANCE.staggerMs;

export const filterProjects = (filter) => PROJECTS.filter((p) => inFilter(p, filter));
