import { DEMOS } from "@/lib/lab";
import LabGrid from "@/components/lab/LabGrid";

export const metadata = {
  // absolute: the lab index is "Lab", so the layout's "%s · Lab" template
  // would say it twice.
  title: { absolute: "Lab — Damian De Cruz" },
};

export default function LabPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <header className="mb-12 border-b border-lab-line pb-8">
        <p className="text-[11px] uppercase tracking-[0.25em] text-lab-dim">
          DDC / LAB — {String(DEMOS.length).padStart(2, "0")} interaction
          references
        </p>
        <h1 className="mt-4 font-lab-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-6xl">
          Motion & interaction
          <br />
          <span className="text-lab-dim">reference library.</span>
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-lab-dim">
          Live patterns I build into client work — hover them, drag them, hit
          replay. Tell me which ones you like and we&apos;ll shape your site
          around them.
        </p>
      </header>
      <LabGrid />
    </main>
  );
}
