# V3: SEO and GEO upgrade

Damian added this track on 2026-10-27, when he approved Phase 4. It ships as Task 11 of [`plan-phase-4.md`](plan-phase-4.md). This file holds what the audit found, what Damian decided, what we build in the repo, and what he does himself outside it.

## The audit (2026-10-27)

Five parallel audits ran with the `seo-geo-audit` skill against the live site and the local `v3` branch: on-page and content, technical, schema and AI access, off-page, and GEO (AI answers). The full agent reports were kept out of the repo because they quote server headers; this is the summary.

**What could not be measured**, and what would measure it:
- Core Web Vitals field data and INP: the PageSpeed Insights API was over quota and CrUX had no data. A Search Console Core Web Vitals report, once there's traffic.
- Search Console: index status, queries and which page ranks, and the "Search generative AI" setting. Damian checks these himself.
- Backlink metrics: no link tool is connected. Search Console and Bing Webmaster link reports fill this in.
- Answers from ChatGPT, Perplexity, Gemini, Claude and Copilot: run the prompt set below by hand.
- LinkedIn and Instagram contents (both blocked scripted requests).

**Scores** (rubric judgements, 0–10, not Google data):

| Category | Score | Headline |
|---|---|---|
| On-Page SEO | 6 | Unique titles and clean structure; the `/services` H1 has no service or place, descriptions bury the price, and v3 regressed every image to `alt=""`. |
| Technical SEO | 8 | Indexable, clean canonicals, CLS 0, lab LCP about 2 s. `www` serves a duplicate instead of redirecting; sitemap dates are build time. |
| Content & E-E-A-T | 5 | Transparent prices and policies, real photos, a named author. No testimonials, no case studies, no privacy notice. |
| Schema | 5 | Valid and honest, but no `@id` graph and no WebSite node; Offers show LKR only, call the retainer one-off, and `alumniOf` is wrong. |
| Off-Page SEO | 2 | One independent backlink (aloys-travels.com), no reviews anywhere, the business under four names. |
| GEO (AI answers) | 4 | Every fact is in the server HTML and AI crawlers get a 200, but no third-party source names him; damiandc.com appeared in 0 of 8 buyer searches. |

**What's already good:** robots.txt allows every search and AI crawler, and they all get the same 200 page a browser does. Prices, FAQ and contact details are in the server HTML. Prices are published in LKR and USD, below every competitor found. http→https is a single 301; 404s are real 404s. The FAQ markup matches the page word for word.

**Where we followed Google over common advice:** no FAQ schema "for AI" (FAQ rich results are retired; the markup stays because it's accurate). No weight on `llms.txt`. No LocalBusiness or ProfessionalService markup, because Google requires an address and the home address stays private. No Google Business Profile, because Damian works online only and Google excludes online-only businesses. Footer credits on client sites use his name, never keyword anchors.

## Decisions (Damian, 2026-10-27)

- **One business name: "Damian De Cruz, trading as DDC Web Services".** Home stays person-led; `/services` is the business page. Client credits should read "DDC Web Services" (Aloys already does; Spades' "DDC Web Solutions" changes when Damian fixes that site).
- **`/services` carries the trading name:** the hero's identity block reads "DDC Web Services / by Damian De Cruz", the title is "Web Design Services in Colombo | DDC Web Services", and the lead gains ", working as DDC Web Services".
- **Spades Solutions is labelled "Client design · not launched"** until Damian finishes the site.
- **No Google Business Profile** (online only).
- **Build scope:** technical and schema fixes; titles, descriptions and the `/services` H1; a privacy page with footer links; new share images.
- **Footer: option B** from `spike/footer-mock.html`. The three columns stay; the trading name goes under the © line and Home · Services · Privacy go under the tagline. Everything is centred on phones.

## What we build (Task 11)

See [`plan-phase-4.md`](plan-phase-4.md) → Task 11 for the steps and tests. In short:

1. **One structured-data graph** with stable `@id`s:
   - A WebSite node.
   - A Person (with the portrait as `image`, Colombo as locality, and `knowsAbout`), who works for and founded the Organization "DDC Web Services". The Person's `affiliation` is IIT and the University of Westminster; `alumniOf` is St. Joseph's College.
   - A ProfilePage on Home.
   - One Service on `/services`, whose offers are built from `lib/services.js` in LKR and USD, with the retainer priced per month, plus a BreadcrumbList.
   - The site-wide Service leaves the layout, so Home and `/services` stop competing for the same query.
2. **Metadata:**
   - Home title "Damian De Cruz — Freelance Web Designer & Developer".
   - Descriptions that put the price first.
   - Page-level canonicals.
   - `og:url` on Home.
   - Real sitemap dates.
3. **The `/services` H1** holds the "Freelance web designer · Colombo, Sri Lanka" kicker, so the heading names the service and the place, with no visual change. A "Prices updated October 2026" line sits under the pricing note.
4. **Snippet hygiene:** `data-nosnippet` on the scrambled intro curtain, the mini ASCII portrait, the Timeline's odometer digits and the "loading…" lines.
5. **Alt text** on project screenshots and gallery photos (a v3 regression).
6. **Privacy page** (`/privacy`) and footer B.
7. **Share images:** a fresh 1200×630 card for Home and one for `/services`.
8. **Small fixes:**
   - The lab title no longer says "Lab" twice.
   - `poweredByHeader: false`.
   - The FAQ questions become `h3`s inside their `summary`.
   - The hero's H1 reads "De", which CSS uppercases anyway.
   - Spades' label.

## What Damian does outside the repo

**On the server** (the nginx config lives only on the VPS):
- Redirect every `www.damiandc.com` request with a 301 to `https://damiandc.com$request_uri`. Today `www` serves a full duplicate.
- Add `server_tokens off;`.
- Optionally, send a short `Cache-Control` on HTML, and a longer one on `public/` images.
- Give the lab host its own `robots.txt`, and a 404 for `/sitemap.xml`. It currently serves the main site's sitemap.

**Search tools:**
- Verify the site in Google Search Console and Bing Webmaster Tools.
- Submit the sitemap.
- Check the "Search generative AI" setting.
- Pull the link reports.

**Profiles and mentions** (authentic only: no paid links, no seeded mentions):
- **GitHub:** set the bio, website (`https://damiandc.com`) and location, and set the homepage on the `personal-portfolio` repo.
- **LinkedIn:** link the site and use the trading name in the headline or experience.
- **Directories:** create one or two complete freelancer profiles (for example Dribbble or Contra) that link back. Join Clutch only once a client can verify the work.
- **Spades:** when the site is finished, change its credit to "DDC Web Services".
- **Danella:** with Danella's agreement, add a small "Website by DDC Web Services" credit on danelladc.com.

**Proof:**
- Ask each client for a short, attributed testimonial (name, business, project). No incentives, and no filtering out unhappy ones.
- Once there are a few, they go on `/services` next to the buttons.
- Case-study pages per client project are the next content step after V3.

## GEO prompt set (run by hand, monthly)

Score each answer 0–3: 0 = not mentioned, 1 = mentioned without a link, 2 = mentioned with a link, 3 = recommended and cited. Run them in ChatGPT, Gemini (AI Mode), Perplexity, Claude and Copilot.

1. best freelance web designer in Colombo
2. affordable website designer Sri Lanka
3. how much does a website cost in Sri Lanka
4. web designer Colombo prices
5. who can build a booking website in Sri Lanka
6. DDC Web Services
7. Damian De Cruz web designer
8. who built aloys-travels.com
9. SEO audit for a small business in Sri Lanka
10. freelance web designer vs agency Sri Lanka

**Baseline (2026-10-27):** damiandc.com appeared in 0 of 8 web searches. The AI answers were not measured.

**Tracking:** in GA4, add a referral segment for chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com and claude.ai.
