"use client";
import { useState } from "react";
import PortfolioHero from "./PortfolioHero";
import WorkGrid from "./WorkGrid";
import PortfolioEnd from "./PortfolioEnd";
import { useReducedMotion } from "@/lib/useReducedMotion";

// /portfolio's body: the hero's controls drive the grid below it.
export default function Portfolio() {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("grid");
  const reduced = useReducedMotion();
  return (
    <>
      <PortfolioHero filter={filter} onFilter={setFilter} view={view} onView={setView} />
      <WorkGrid filter={filter} view={view} reduced={reduced} />
      <PortfolioEnd />
    </>
  );
}
