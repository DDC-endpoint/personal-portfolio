// The 404 for every URL no route matches. With two root layouts — (site) and
// (lab) — there's no top-level layout, and a not-found.jsx inside (site) only
// renders client-side: Next sent an empty error shell, so the layout's
// pre-paint script never ran, <html> never got `js` or `dark`, and the curtain
// (nojs:hidden) stayed hidden on every page after it. global-not-found
// (next.config.mjs → experimental.globalNotFound) is Next's answer for
// multiple root layouts: it returns a whole document, so it reuses the site's
// root layout, theme script, curtain and cursor included.
//
// The 404 is its own document tree, so the link home is a full load: the
// curtain covers, the page loads under it, the short loader resolves and the
// curtain lifts (Damian, 2026-10-28). The Isometric Board sits above the
// message (Phase 6).
import RootLayout from "./(site)/layout";
import IsoBoard from "@/components/IsoBoard";

export const metadata = {
  title: "Page not found — Damian De Cruz",
};

export default function GlobalNotFound() {
  return (
    <RootLayout>
      <main className="grid min-h-screen place-items-center px-6">
        <div className="text-center">
          <IsoBoard />
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
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
    </RootLayout>
  );
}
