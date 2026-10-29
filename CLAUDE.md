# CLAUDE.md

Project guidance for Claude Code. See `README.md` for setup/customize and `HANDOFF.md` for full architecture, design rules, and server/infra notes.

## ⚠️ This is a PUBLIC repository — no personal information

The GitHub repo (`EnderGuardian25/personal-portfolio`) and the `main` branch are public. Anything committed — **including anything in git history** — is world-readable forever. Before committing, make sure none of the following ever lands in a tracked file:

**Never commit:**
- **The full CV/résumé** — it contains home address, date of birth, personal email, and third-party referees' phone numbers/emails. The real PDF lives in `assets/private/` (gitignored). The site's Résumé section uses a `mailto:` "Request CV" button instead of serving a file. If a résumé must be published, publish only a **sanitized** version (no address, no DOB, no referee contact details).
- **Raw photo originals** — phone photos carry **GPS EXIF** (exact coordinates) and camera serials. Keep originals in `assets/` (gitignored); only commit the EXIF-stripped, optimized copies in `public/photography/` (produced by `npm run optimize-photos`). Verify new images have no EXIF/GPS before committing.
- **Server / infrastructure details** — the VPS IP address, SSH config, `deploy.sh`, or any file naming the host. `deploy.sh` lives on the server only, never in the repo.
- **Secrets** — API keys, tokens, passwords, private keys, `.env*` files.
- **Machine/session state** — e.g. `.claude/scheduled_tasks.lock` and other local-only artifacts.

**Deliberately public (do NOT scrub):** the business contact email and WhatsApp number in `lib/site.js`, and the social links in `SOCIALS`. These are intentional public contact info for a freelance site — leave them as-is.

**Before any commit or push to a public branch:** scan the staged diff for the categories above (IPs, emails beyond the intended contact address, phone numbers, addresses, EXIF-bearing images, secrets). If personal data has already reached history, sanitizing the working tree is not enough — the history must be rewritten (e.g. `git filter-repo`) and force-pushed.

The `.gitignore` already excludes `assets/private/`, `assets/photography-originals/`, `.env*.local`, and `.claude/scheduled_tasks.lock` — keep those rules intact.

## V3 redesign

The V3 redesign (Phases 1–6) is merged to `main` (PR #4, `da83fc0`, 2026-10-28), and `v3` sits at the same commit; both are pushed. **Resuming V3 work (the performance pass, the open gate questions)? Start at `docs/v3/README.md`**: it holds the status, the next step, the testing procedure and how Damian likes to work. Remaining V3 work branches off `v3`, merges into `v3`, and reaches `main` by PR.

## Performance and mobile pass (in progress)

**Resuming the lag / Android-portrait / slow-loader work? Start at `docs/v3/perf-2026-10-29.md`.** Branch `perf/curtain-portrait` (pushed, not merged). Damian's rule: a lag-only fix, so nothing in the design or the animations may change; prove "looks the same" with frame-matched screenshots or pixel diffs, not by reasoning. A push to `main` auto-deploys the live site, so merge by PR only after the e2e comparison with `main` and the visual checks in that doc. Probe scripts are in `docs/v3/perf-probes/`. Their `headed` mode opens a visible browser window on the user's screen, so ask before using it.

## Build / verify

- Dev: `npm run dev` (http://localhost:3000). Use `lab.localhost:3000` to exercise the lab subdomain locally.
- Tests: `npm test` (Vitest, `tests/unit/`), `npm run e2e` (Playwright against `next dev`, `e2e/`).
- Never run `npm run build` while `next dev` is running — they share `.next` and clobber each other.
- The lab is served at **lab.damiandc.com** via `proxy.js`; `damiandc.com/lab` returns a 404 by design. Don't "fix" that 404.

## UI self-verification

Before declaring a UI/visual change done, verify it visually rather than by code inspection alone: launch a headless browser (Playwright/Puppeteer) against the local dev server, screenshot the affected view(s) to disk, then use the Read tool on the screenshot file to inspect it — you're multimodal and can view images directly, the same way a person looking at a browser would. Do this for the golden path and any edited screens before reporting success.

## Discord conventions

Inbound messages arrive wrapped in `<channel source="discord" ...>BODY</channel>` envelopes — BODY is what the operator typed. Respond by calling `mcp__mcd__reply` with `{ text, reply_to? }`. Do NOT call `mcp__discord__reply`. Don't print transcript text outside the reply tool — Discord users only see what `mcp__mcd__reply` emits. Keep replies brief; for long output, post the highlights and offer to dig in.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
