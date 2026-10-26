# V3 — site upgrade

Living record of the V3 redesign of damiandc.com. Everything decided so far is written down here so the work survives a lost session. If you are picking this up cold, read this file, then `decisions.md`, then the spec for whichever part you are working on.

## Status (updated 2026-10-26)

| Track | State |
|---|---|
| Dependencies | **Done.** PR #3 (`upgrade/deps`) merged to `main`. |
| Hero ASCII portrait | **Settled.** Full spec in [`hero-portrait.md`](hero-portrait.md); reference prototype in [`spike/`](spike/). |
| Projects, Timeline, Lens, Contact, quiet sections, `/services` | **Settled** (see `decisions.md`). |
| Copy refresh | **Approved.** Final copy in [`copy.md`](copy.md). |
| Written design → plan → build | Design consolidated in [`design.md`](design.md); builder review running, then approval. Nothing gets built until approved. |

## How V3 ships

1. `v3` is the integration branch, cut from `main` at `8cad99b` (after PR #3).
2. Each phase gets its own branch off `v3` and a PR **into `v3`** (never into `main`).
3. After every merge, test the `v3` branch locally (golden path + mobile + reduced motion).
4. When all phases are in, `v3` merges to `main`; that triggers the site redeploy.

Phases:

1. Motion system + loader + Hero (ASCII portrait) + Marquee removal
2. Projects — diagonal skeleton showcase
3. Timeline + Lens (gallery) + Contact
4. Copy refresh + `/services`

## Files

- [`decisions.md`](decisions.md) — every decision so far, with the reasoning, grouped by area. Also lists what was tried and rejected, and the open questions.
- [`hero-portrait.md`](hero-portrait.md) — the locked spec for the hero portrait: image pipeline, rendering, colour, fade, loader, idle, lens/cursor, touch, dark mode, mobile.
- [`research-reels.md`](research-reels.md) — frame-by-frame notes on the six Instagram reels and the ASCII reference video that shaped V3.
- [`spike/`](spike/) — the throwaway portrait prototype (`portrait-spike.html`) and the headshot processing script. Reference only; not production code.

## Resuming after a lost session

1. `git switch v3` and read this folder.
2. The design conversation was a question-by-question brainstorm. Continue from **Open questions** at the bottom of `decisions.md`.
3. When every area is settled, consolidate into one design doc (`docs/v3/design.md`), get approval, then write the implementation plan.
4. To see the portrait prototype again: follow `spike/README.md`.

## Ground rules (from CLAUDE.md, still in force)

- Public repo: never commit raw photo originals, the CV, infra details, secrets. The original headshot stays out of git; only the processed, EXIF-free cutout gets committed (approved by Damian on 2026-10-26).
- Never run `npm run build` while `next dev` is running.
- Verify UI changes with real screenshots (desktop, mobile, reduced motion) before calling them done.
- Next.js 16 has breaking changes: read `node_modules/next/dist/docs/` before writing framework code.
