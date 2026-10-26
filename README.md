# Damian De Cruz — Portfolio

Personal portfolio + landing page, plus a freelance **`/services`** page. Built with **Next.js 16** (App Router), **Tailwind CSS 4**, **Framer Motion 12**, and **Lenis** smooth scroll. Live at **[damiandc.com](https://damiandc.com)**.

## Design

- **Aesthetic:** Editorial / Swiss-modern — light, minimalist, professional, with a full **dark mode** (navy palette) toggled from the nav and persisted to `localStorage` (no-flash inline script sets it before first paint).
- **Palette:** Ivory (`#F6F6F1`) + deep ink blue (`#0B1F3A`) + electric blue (`#2563EB`) + sky tint. All colours are CSS-variable-backed tokens, so the whole site re-themes by flipping one class.
- **Typography:** Instrument Serif (display, italic accents) + Manrope (body) + JetBrains Mono (labels). All via `next/font/google`.
- **Motion:** Oversized hero beside an electric-blue ASCII portrait that builds itself on the first visit of a session (the name decodes with it) and turns into a full-colour photo under the cursor lens, section labels and mono links that decode, scroll reveals, a custom dot+ring cursor, an animated canvas "glitch/decrypt" field behind upcoming projects, and Lenis smooth scroll. All motion respects `prefers-reduced-motion`, and above-the-fold content stays SSR-visible so entrances never cost LCP.
- **Lighthouse:** Accessibility / Best Practices / SEO all **100**; Performance **100 on desktop** for both pages (verified on a production build).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 (falls back to 3001 if in use).

> **Never run `npm run build` while `next dev` is running** — they share the `.next` folder and the production manifests clobber the dev ones. If it happens: stop the dev server → `rm -rf .next` → restart.

## Customize

Most site-wide content lives in **`lib/site.js`** (single source of truth) — year, email, WhatsApp, nav links, and socials. Edit there, not in individual components.

- **Résumé:** the CV is **not** committed or served — it contains personal details (address, DOB, referee contacts) and lives in `assets/private/` (gitignored). The Résumé section's "Request CV" button opens a mailto instead. If you ever publish a PDF again, use a sanitized version (no home address, DOB, or referee contact details).
- **Projects:** edit the `projects` array in `components/Projects.jsx` (set `status: "soon"` for an upcoming, dimmed card with the glitch backdrop).
- **Timeline:** edit `entries` in `components/Timeline.jsx`.
- **Skills:** edit `groups` in `components/Skills.jsx`.
- **Photography (Lens):** drop originals in `assets/photography-originals/`, run `npm run optimize-photos`, then add entries to the `photos` array in `components/Lens.jsx`.
- **Contact / socials:** edit `EMAIL`, `WHATSAPP`, and `SOCIALS` in `lib/site.js`.

## Deploy

Hosted on a **Hetzner VPS** (Ubuntu 22.04) behind **nginx**, run by **PM2** (`damiandc-website`, port 3000).

```bash
# main is merged and pushed, then:
# 1. SSH into the VPS and run the deploy script (lives on the server, not in the repo):
~/deploy.sh
#    (git pull origin main → rm -rf .next → npm install → npm run build → pm2 restart damiandc-website)

# 2. Verify at https://damiandc.com — dark-mode toggle, /services, /sitemap.xml, /robots.txt, OG image
#    and https://lab.damiandc.com (lab index + a demo), https://damiandc.com/lab → 404
```

> `sharp` is a production dependency, so the deploy must run a full `npm install` (not `--production`) — `deploy.sh` already does.

### nginx / TLS (one server block, three hostnames)

One nginx server block proxies **`damiandc.com`, `www.damiandc.com`, and `lab.damiandc.com`** to `127.0.0.1:3000`; `proxy.js` does the per-host routing, so nginx just forwards. Requirements:

- `server_name damiandc.com www.damiandc.com lab.damiandc.com;`
- `proxy_set_header Host $host;` in the `location /` block — **required**, or the lab subdomain won't be detected.
- **One TLS cert (SAN) covers all three names**, issued/renewed together. Do **not** run certbot for `lab` alone — that repoints the shared block at a lab-only cert and breaks the main domain. Reissue the combined cert with:
  ```bash
  sudo certbot --nginx --cert-name damiandc.com -d damiandc.com -d www.damiandc.com -d lab.damiandc.com
  ```
- **HTTP/2** is enabled via an `http2 on;` directive in each `listen 443 ssl` server block (nginx ≥ 1.25.1 syntax). Edit config files in `sites-available/` **directly**, never through the `sites-enabled/` symlink (`sed -i` on a symlink replaces it with a regular file), and keep backups **out** of `sites-enabled/` (it's globbed by `include`, so a stray `.bak` there loads as a duplicate server block).

`dos.damiandc.com` is a **separate** app/server block with its own cert — leave it out of the commands above.

## Lab

**The lab is served at [lab.damiandc.com](https://lab.damiandc.com)** — an unlisted (noindex, not in nav/sitemap) reference gallery of 70 live animation/UI demos across 7 categories — hero sections, text animations, carousels, cursor/hover, scroll effects, transitions/loaders, and grids/layout. It runs as a second root layout (`app/(lab)/`, dark-studio theme, Syne + IBM Plex Mono, GSAP + ogl) fully isolated from the portfolio's theme and bundles. To add a demo: one component in `components/lab/demos/`, one data entry in `lib/lab.js`, one import line in `components/lab/registry.jsx`.

**Subdomain routing (`proxy.js`):** the lab lives at the `/lab` path in the app, and `proxy.js` (the Next.js proxy/middleware file) maps the `lab.damiandc.com` host onto it — `/` → `/lab`, clean slugs → `/lab/<slug>`, and `/lab/*` served as-is for internal links. On the main host, `damiandc.com/lab` returns the styled 404 so the lab lives **only** on the subdomain (no redirect — nothing was ever shared under `/lab`). In dev, use `lab.localhost:3000` to exercise the subdomain path; plain `localhost:3000/lab` still works too. The routing depends on nginx passing the real host (`proxy_set_header Host $host;`) — see Deploy.

## Reference

See **[`HANDOFF.md`](HANDOFF.md)** for the full session handoff: architecture, design tokens, per-file notes, content reference, and the "critical design rules — do not re-break" list.

## Roadmap

- Add live links to client project cards as each site ships (Personal Dashboard, etc.)
- Reveal the Coursework Archive project when ready
- Add a testimonial / client outcome to `/services`
- Add a `/blog` route
