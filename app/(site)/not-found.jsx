// 404 for the whole app. With two root layouts — (site) and (lab) — Next 14
// rejects a top-level app/not-found.jsx (no root layout to attach it to), so
// the 404 lives in (site) and unmatched URLs are funneled here by the
// [...notFound] catch-all route. Renders inside the site layout (ivory theme).
// The link home is a plain <a>: the page transition (components/transition/)
// takes it over, as it does every link between the site's pages.
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
          404 — page not found
        </p>
        <h1 className="mt-4 font-display text-5xl tracking-tightest">
          Nothing here.
        </h1>
        <a
          href="/"
          className="link-line mt-6 inline-block font-mono text-sm uppercase tracking-[0.15em]"
        >
          Back to damiandc.com
        </a>
      </div>
    </main>
  );
}
