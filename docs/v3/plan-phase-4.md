# V3 Phase 4 Implementation Plan: copy refresh, quiet sections and `/services`

> **Status: planned (2026-10-27), waiting for Damian's approval.** The page transition was split out of this phase at Damian's request; it becomes Phase 5 (see "Decisions made while planning").

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish Home and bring `/services` into the V3 system:
- **Home copy:** the approved `copy.md` text for About, Leadership, Résumé and the footer.
- **Leadership:** role rows whose rules draw, then whose text rises.
- **Skills:** a navy terminal that types out the stack.
- **`/services`:** approved copy, decoding section labels, scrambling mono buttons, a mini circuit for "How it works", skeleton browser cards for "Recent work", and the growing electric card for "Start a project".

**Architecture:** the same split as Phases 1–3.
- **Pure, unit-tested modules** hold copy and maths:
  - `lib/services.js` (new): all `/services` copy and data, so the FAQ JSON-LD and the page can't drift apart.
  - `lib/skills.js` (new): the terminal's contents and typing schedule.
- **Shared pieces are extracted, not copied:**
  - The Timeline's circuit becomes `components/circuit/` and is reused by "How it works".
  - The Contact card's growth becomes `components/useGrowCard.js` and is reused by "Start a project".
  - Each extraction is a refactor guarded by its existing e2e spec.
- **Components are thin:**
  - Per-frame work goes through refs, motion values or CSS custom properties, never React state.
  - Server HTML carries the real text.
  - Reduced motion and no-JS get the finished state from CSS.

**Tech Stack:** Next.js 16.4, React 19.3, Tailwind 4.3, framer-motion 14.6, Vitest, Playwright.

**Spec:**
- [`design.md`](design.md): "2. About", "3. Leadership", "4. Skills", "7. Résumé", "10. Footer", "`/services`", "Global motion system".
- [`copy.md`](copy.md): § 01 About, § 02 Beyond the Code, § 03 Stack, § 06 Résumé, Footer, and all of `/services`.
- [`decisions.md`](decisions.md): "Timeline circuit" (the circuit being reused), "Phase 4 planning (2026-10-27)".

## Decisions made while planning (Damian, 2026-10-27)

- **"How it works" gets a mini circuit:** the four steps sit in one column on the same circuit as the Timeline, with four pads that light as you scroll and flowing current. It replaces the plan to reuse the running stitch, which is gone.
- **The page transition is split out:** it ships as its own Phase 5 after this one, with its own review and gate. That phase moves both pages to client-side navigation, so it touches routing, Lenis, the IntroStamp curtain and the hero portrait.
- **The Skills terminal on phones:** it types each folder as its own listing (`ls tools/code/`, then `design/`, and so on), stacked down the panel.
- **The Résumé line takes the optional fix:** "Education, coursework and current pursuits, on a single page."

## Builder's calls for Damian to confirm with this plan

- **The terminal's accent colour is `#60A5FA`, used on the terminal only.** The folder names and prompt are "electric" per the spec, but neither electric token passes AA on navy (#2563EB gives 3.2:1, #3B82F6 gives 4.2:1). `#60A5FA` gives about 6.4:1. Like the Contact card's `#2563EB`, it's a single, named exception: `--c-term-accent`, defined once in `globals.css`.
- **The terminal panel:** navy `#0B1F3A` in light mode, and the dark paper `#112646` with a rule border in dark mode (a navy panel on the navy page would vanish). Text is `#F6F6F1` in both.
- **The terminal types once per page load,** when it is 40% in view. It's a quiet section, so it doesn't replay on every pass.
- **Leadership keeps today's rules:** rows 2–5 draw their top rule; the first row has none today and still has none. Its text rises on the same stagger.
- **"How it works" keeps the step's big italic number** next to its title. The pads carry `P01`–`P04` labels on desktop, like the Timeline. There is no year counter on `/services`.
- **"Recent work" cards activate like Projects:**
  - **Pointer:** the hovered card decodes.
  - **Keyboard:** the focused card decodes.
  - **Touch:** the card nearest the centre of the screen decodes.
  - **Layout:** two columns from `md`, one below it.
- **The `/services` metadata descriptions and Offer JSON-LD stay as they are.** They aren't in `copy.md`, and the copy refresh adds no new claims. The FAQ JSON-LD is built from the same data as the visible FAQ.

## Global Constraints

- **Copy is verbatim from `copy.md`.** Prices, turnarounds, "includes" lists and policies on `/services` don't change by a character.
- **Section labels keep their text:** Home `§ 01 — About`, `§ 02 — Beyond the Code`, `§ 03 — Stack`, `§ 06 — Résumé`; `/services` `§ 01 — What I do` to `§ 05 — Start a project`. Every `§` label uses `DecodeLabel`.
- **Palette:** tokens only (`--c-electric`, `--c-ivory`, `--c-paper`, `--c-ink`, `--c-ink-soft`, `--c-ink-faint`, `--c-mist`, `--c-rule`, `--c-sky`). The exceptions are:
  - The electric cards' `#2563EB` in both themes (Contact, and now "Start a project").
  - The terminal's `--c-term-accent` (`#60A5FA`) and panel colours above.
- **"Ivory text" on an electric card** is `text-ivory dark:text-ink`, because the ivory token turns navy in dark mode.
- **Hover rules:**
  - Mono buttons scramble their letters only; arrows sit outside `ScrambleText` (Damian, Phase 2).
  - Links with the underline draw (`link-line`) don't scramble (Damian, Phase 1).
  - Hover works with a stationary pointer (Damian).
- **Reduced motion:** the finished state everywhere:
  - The terminal is fully typed.
  - Leadership rows are drawn and shown.
  - The mini circuit is lit with no moving current.
  - The start card is full width.
  - The recent-work cards show their screenshots.
- **No-JS:** nothing starts hidden or clipped in server HTML. Hidden start states are gated on `js:motion-safe:`.
- **Class names are literal.** Tailwind only generates classes it can read in the source; never build a class from a variable (`${PREFIX}:bg-paper`).
- **Public repo:** scan the staged diff before every commit. The business email and WhatsApp number in `lib/site.js` are deliberately public.
- **Build safety:** never run `npm run build` while `next dev` runs. Lighthouse runs on production builds in scratchpad worktrees (see `README.md` → Testing).
- **Branch:** `v3-phase-4`, cut from `v3`, merged into `v3` locally on Damian's approval. No push.

## Review Focus

1. **The terminal interrupted.** It is scrolled away mid-typing, the theme is toggled, or the window is resized across `md` (which swaps the four-column and per-folder layouts). It must finish typing, or show finished, and never leave text hidden. Tested in Task 4.
2. **Recent-work cards from the keyboard.** Tab reaches every card in order, focus decodes the card, and Enter opens it. External sites open in a new tab; the portfolio card goes to `/` in the same tab. Tested in Task 8.
3. **FAQ JSON-LD drifting from the page.** Every `acceptedAnswer.text` equals the visible answer, and every `name` equals its question. Tested in Task 2.
4. **The start card focused before it has grown.** Tabbing to a button while the card is still a small tile opens the card fully, with the button visible. Tested in Task 9.
5. **The mini circuit at the page's end.** "How it works" sits mid-page, but on a tall screen the end of the page might come before the circuit's end offset. All four pads must still light by the bottom of the page. Tested in Task 7.

---

### Task 1: Home copy refresh

**Files:**
- Modify: `components/About.jsx`, `components/Leadership.jsx` (intro paragraph only), `components/Resume.jsx`, `components/Footer.jsx`
- Test: `e2e/copy.spec.js` (new)

**Interfaces:**
- Produces: nothing shared.

- [ ] **Step 1: Write the failing tests** in `e2e/copy.spec.js` (both projects). Compare `textContent` with whitespace collapsed:
  - `#about` statement: `I’m Damian, a creative technologist and freelance web designer in Colombo, in my second year of BSc (Hons) Computer Science at the Informatics Institute of Technology.` The three phrases `creative technologist`, `BSc (Hons) Computer Science` and `Informatics Institute of Technology` are still in italic elements.
  - "What I build": `Small, sharp websites for businesses and creatives in Colombo and beyond, plus my own tools and generative experiments. Most of it sits at the edge of software and design.`
  - "How I work": `Quietly obsessive about details, and fast. Most client sites go from brief to live in a couple of days. I learn fastest by shipping, and I’m always open to projects worth building.`
  - Leadership intro: `Before the code, there was the council room. Years of student leadership and Rotary Interact service taught me how to organise people, run projects and deliver them for a community.`
  - Résumé: `Education, coursework and current pursuits, on a single page.`
  - Footer: `© 2026 Damian De Cruz` and `v:04 / Always evolving`.
- [ ] **Step 2:** Run `npx playwright test e2e/copy.spec.js`. Expected: FAIL on every string.
- [ ] **Step 3:** Update the four components. The footer keeps `{YEAR}` from `lib/site.js`.
- [ ] **Step 4:** Run it again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(v3): Home copy refresh (About, Leadership, Résumé, footer)`.

### Task 2: `/services` copy as data, and the FAQ JSON-LD built from it

**Files:**
- Create: `lib/services.js`, `lib/jsonld.js`, `tests/unit/services.test.js`
- Modify: `components/Services.jsx` (reads `lib/services.js`; the inline arrays go), `app/(site)/services/page.jsx` (the FAQ JSON-LD), `app/(site)/layout.jsx` (imports `ldJson`)
- Test: `e2e/services.spec.js` (new)

**Interfaces:**
- Produces, from `lib/services.js`:
  - `SERVICES_HERO = { kicker, heading: [lead, accent, tail], lead }`, where the heading parts are `["Clean, fast websites, ", "built in days", "."]`.
  - `SERVICES: { n, title, desc, includes: string[], fromLKR, fromUSD, turnaround }[]` (7).
  - `PRICING_NOTE: string`.
  - `STEPS: { n, title, desc }[]` (4).
  - `WORK: { slug, tag, note, href }[]` (4; Task 8 consumes it).
  - `FAQS: { q, a }[]` (7).
  - `START_TEXT: string`.
- Produces, from `lib/jsonld.js`: `ldJson(data) => string`. It is `JSON.stringify` with `<` escaped as `<` (moved from `layout.jsx`).
- Produces, from `lib/services.js`: `faqJsonLd(faqs) => object`, the `FAQPage` object.

- [ ] **Step 1: Write the failing tests.**
  - **Unit** (`tests/unit/services.test.js`):
    - Every `desc`, every step `desc`, every FAQ `a`, `PRICING_NOTE`, `START_TEXT` and `SERVICES_HERO.lead` equals `copy.md` → `/services` verbatim. Write the expected strings into the test.
    - Prices are unchanged (`fromLKR`, `fromUSD`, `turnaround`):
      - 01: `LKR 18,000`, `$150`, `~2–3 days`
      - 02: `LKR 40,000`, `$500`, `~1 week`
      - 03: `LKR 65,000`, `$800`, `1–2 weeks`
      - 04: `LKR 25,000`, `$200`, `1–3 days`
      - 05: `LKR 50,000`, `$299`, `2–4 days`
      - 06: `LKR 65,000`, `$400`, `1–2 weeks`
      - 07: `LKR 48,000`, `$225`, `Monthly`
    - The `includes` lists are unchanged; copy them from today's `Services.jsx`.
    - `WORK` slugs are `["portfolio", "spades-solutions", "aloys-travels", "danella-de-cruz"]`. Use the slugs `lib/projects.js` really has.
      - The portfolio card's href is `/`.
      - Aloys' href is `https://aloys-travels.com/`.
      - Danella's tag is `Artist site` and her href is `https://danelladc.com`.
    - `faqJsonLd(FAQS).mainEntity[i]` has `name === FAQS[i].q` and `acceptedAnswer.text === FAQS[i].a`.
    - `ldJson({ a: "</script>" })` contains no `<`.
  - **E2e** (`e2e/services.spec.js`, both projects): `FAQ JSON-LD matches the page` (Review Focus 3).
    - Parse the `FAQPage` script on `/services`.
    - For each FAQ, its `name` equals the visible `summary` text, and its answer equals the visible paragraph text.
- [ ] **Step 2:** Run `npx vitest run tests/unit/services.test.js` and `npx playwright test e2e/services.spec.js`. Expected: FAIL (the module is missing; the JSON-LD still has the old answers).
- [ ] **Step 3:** Create the modules. `Services.jsx` renders from them, and `page.jsx` builds the FAQ script with `ldJson(faqJsonLd(FAQS))`. `layout.jsx` imports `ldJson` from `lib/jsonld.js`.
- [ ] **Step 4:** Run both again, plus `e2e/home.spec.js` (its structured-data test guards the layout). Expected: PASS.
- [ ] **Step 5:** Commit: `feat(v3): /services copy refresh, one source for the FAQ and its JSON-LD`.

### Task 3: Leadership rows

**Files:**
- Modify: `components/Leadership.jsx`
- Test: `e2e/leadership.spec.js` (new)

**Interfaces:**
- Produces: nothing shared. Each row carries `data-role-row`. Its rule carries `data-role-rule` (rows 2–5 only) and its text wrapper `data-role-text`.

- [ ] **Step 1: Write the failing tests** (desktop unless noted).
  - `rows draw then rise, in order`:
    - Before scrolling, row 3's rule has a computed transform with scaleX 0, and its text opacity is 0.
    - Scroll the list into view.
    - Within 2 s every rule is `matrix(1, 0, 0, 1, 0, 0)` (or `none`) and every text opacity is `1`.
    - Sampled at 100 ms intervals, row 2's text reaches opacity 1 before row 5's.
  - `a rule draws before its text rises`: on row 2, the rule's scaleX passes 0.5 while the text opacity is still below 0.5.
  - `reduced motion shows the finished rows` (both): no transform on rules, text opacity 1, with no scroll.
  - `no-JS shows the finished rows`: same assertions, with JS off.
  - `roles are unchanged` (both): titles in order `Head Prefect`, `District Interact Representative`, `Assistant District Interact Secretary`, `Senior Prefect`, `Club President`.
- [ ] **Step 2:** Run `npx playwright test e2e/leadership.spec.js`. Expected: FAIL (no data attributes).
- [ ] **Step 3:** Implement.
  - One `IntersectionObserver` on the roles list (threshold 0.2, once) sets `data-shown` on it.
  - **Rules:** `origin-left`, `js:motion-safe:scale-x-0`, with `group-data-[shown]` setting `scale-x-100`. 600 ms with `EASE`, delayed `i × 120 ms`.
  - **Text:** `js:motion-safe:opacity-0 js:motion-safe:translate-y-4`, revealed by the same flag. 700 ms, delayed `i × 120 + 250 ms`.
  - Write the delays as inline `transitionDelay` styles, not built class names.
  - Drop `Reveal` from the rows.
- [ ] **Step 4:** Run again. Expected: PASS. Screenshot desktop mid-stagger and finished, mobile, and reduced motion, then Read them.
- [ ] **Step 5:** Commit: `feat(v3): Leadership rows draw and rise`.

### Task 4: Skills terminal

**Files:**
- Create: `lib/skills.js`, `tests/unit/skills.test.js`, `components/skills/Terminal.jsx`
- Modify: `components/Skills.jsx` (heading stays; the grid becomes `<Terminal />`), `app/(site)/globals.css` (`--c-term-accent: 96 165 250` in `:root`, unchanged in `.dark`)
- Test: `e2e/skills.spec.js` (new)

**Interfaces:**
- Produces, from `lib/skills.js`:
  - `PROMPT = "damian@colombo ~ $"`.
  - `TOOLS = [{ dir: "code/", items: [...] }, { dir: "design/", … }, { dir: "tooling/", … }, { dir: "curious-about/", … }]`, in that order. The items are exactly `copy.md` → § 03 Stack, including `Type & layout`, `Colour systems` and `Motion basics`.
  - `typingSchedule(mode, { cmdMs = 45, outMs = 12, gapMs = 120 }) => Step[]`, where `Step = { key: string, chars: number, start: number, end: number }`.
    - `mode` is `"columns"` (desktop) or `"folders"` (phones).
    - It lists, in order, every typed string with its start and end times in ms.
    - **`"columns"`:** the command `ls tools/`, then each column top to bottom (folder name, then items), column by column.
    - **`"folders"`:** for each folder, the command `ls tools/<dir>`, then its items.
    - Both end with the final prompt, which has 0 chars and starts the blinking cursor.
  - `typedChars(schedule, t) => Map<key, number>`: how many characters of each string show at time `t`.

- [ ] **Step 1: Write the failing tests.**
  - **Unit:**
    - `TOOLS` matches `copy.md` exactly: 4 folders, 6 + 5 + 5 + 5 items.
    - In `"columns"` order, the first key is the command; then `code/` and its 6 items; then `design/`; and so on.
    - `typingSchedule` steps never overlap (`start >= previous end`).
    - The command types at `cmdMs` per char and outputs at `outMs` per char.
    - `typedChars` is 0 for everything at `t = 0`. It is the full length of every string at the schedule's last `end`. A string's count never exceeds its length.
    - `"folders"` mode has 4 commands, `ls tools/code/` to `ls tools/curious-about/`.
  - **E2e** (`e2e/skills.spec.js`):
    - `server HTML has the whole stack` (no JS): the page text contains the prompt, all 4 folders and all 21 items.
    - `the terminal types once in view and ends on a blinking prompt` (desktop):
      - Before it's in view, the first item is clipped to 0 visible width.
      - Scroll it 40% in; within 4 s every item is fully visible.
      - The final cursor has a running animation.
      - Scroll away and back: no item is clipped again.
    - `phones list one folder at a time` (mobile): 4 visible command lines, `ls tools/code/` to `ls tools/curious-about/`.
    - `interrupted typing still finishes` (desktop, Review Focus 1):
      - Start typing, scroll away after 300 ms, wait 4 s and scroll back: all items fully visible.
      - Start typing, resize to 390 px wide mid-typing: within 4 s all items are fully visible in the folder layout.
      - Toggle the theme mid-typing: all items are fully visible within 4 s.
    - `reduced motion is fully typed` (both): every item fully visible with no scroll wait.
    - `terminal text passes AA` (both themes): the folder names and prompt (accent) and the items (ivory) each reach at least 4.5:1 against the panel background.
- [ ] **Step 2:** Run `npx vitest run tests/unit/skills.test.js` and `npx playwright test e2e/skills.spec.js`. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - **Markup:** `Terminal.jsx` renders every string as real text in the server HTML.
    - **Columns layout (`md` and up):** a four-column grid.
    - **Folders layout (below `md`):** a stacked block per folder.
    - Both layouts are in the DOM; CSS shows one.
    - Each string sits in a span that clips to `calc(var(--n) * 1ch)` with `white-space: pre`, so the text is never removed.
  - **Typing:**
    - Spans start at `--n: 0` only under `js:motion-safe:` and while the panel is `data-term="idle"`.
    - An `IntersectionObserver` (threshold 0.4) starts one rAF loop that writes `--n` from `typedChars`.
    - The loop sets `data-term="done"` at the end, which un-clips everything.
    - A `matchMedia("(min-width: 48rem)")` change, or the loop running past the schedule's end + 1 s, also sets `done`.
  - **Panel:** a title bar with three dots and `damian@colombo: ~`.
    - Colours per "Builder's calls". Folders and the prompt use `rgb(var(--c-term-accent))`; items use `#F6F6F1`.
    - The final prompt ends in `▍`, which blinks via CSS `steps(1)`. It doesn't blink under reduced motion.
- [ ] **Step 4:** Run again. Expected: PASS. Screenshot desktop mid-typing and finished, mobile finished, dark, and reduced motion, then Read them.
- [ ] **Step 5:** Commit: `feat(v3): Skills becomes a typing terminal`.

### Task 5: `/services` motion basics

**Files:**
- Modify: `components/Services.jsx`, `components/ServicesNav.jsx`
- Test: `e2e/services.spec.js`

**Interfaces:**
- Consumes: `DecodeLabel`, `ScrambleText` from `components/Scramble.jsx`.

- [ ] **Step 1: Write the failing tests** (`e2e/services.spec.js`):
  - `section labels decode` (desktop): all five `§` labels have a `[data-letters]` child. Scrolled into view, each label's text differs from its final text at some 16 ms sample, then settles on it.
  - `mono buttons scramble without moving` (desktop): the hero's "Message on WhatsApp", "Email me" and corner "Portfolio", and the nav's "Portfolio".
    - Hovering each one changes its label text within 200 ms.
    - Its width is identical across 10 samples.
    - Its arrow stays outside the scrambling span.
  - `underlined links don't scramble` (desktop): hovering "See the full portfolio" and the nav section links leaves their text unchanged across 10 samples.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Replace each `§` label `div` with `DecodeLabel`. Wrap the mono button labels in `ScrambleText`, with arrows as siblings.
- [ ] **Step 4:** Run `e2e/services.spec.js` and `e2e/scramble.spec.js`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(v3): /services label decode and button scramble`.

### Task 6: Extract the circuit (refactor)

**Files:**
- Create: `components/circuit/useCircuit.js`, `components/circuit/CircuitTrace.jsx`, `components/circuit/CircuitPad.jsx`
- Modify: `components/Timeline.jsx` (consumes them; behaviour unchanged)
- Test: `e2e/timeline.spec.js` (unchanged; it is the guard)

**Interfaces:**
- Produces: `useCircuit({ listRef, sectionRef, lane = 12 }) => { drawn, lit, trace, headRef }`.
  - `drawn`: the sprung progress, a framer `MotionValue`, from `useScroll` offsets `["start 0.7", "end 0.55"]` and `SPRING.draw`.
  - `lit`: the number of pads at or above the head.
  - `trace`: `{ h, ys, pts, d, thresholds }`, or `null` before the first measure.
  - `headRef`: the ref for the head element.
  - It owns:
    - The measure: after fonts are ready, and debounced 150 ms on a list `ResizeObserver`. It reads `[data-milestone]` and their `[data-dot]`.
    - `--h` on the list.
    - Head placement.
    - The `data-flowing` `IntersectionObserver` on `sectionRef`.
- Produces: `<CircuitTrace trace={trace} headRef={headRef} />`. It renders the no-JS fallback line, the dark and lit SVG layers (with `data-flow`) and the head, all on the rail axis (`left-4 md:left-0`). The list element must carry `style={{ "--d": drawn }}`.
- Produces: `<CircuitPad index={i} />`, rendered first inside each `group` `li`. It is the `P0N` label (desktop), the track, the via and the pad (`data-dot`), with today's geometry and lit and dark classes.
- Timeline keeps its year decode and `YearCounter`, reading `lit`.

- [ ] **Step 1:** Run `npx playwright test e2e/timeline.spec.js` on the current code. Expected: PASS (the baseline).
- [ ] **Step 2:** Extract the three pieces; `Timeline.jsx` uses them.
- [ ] **Step 3:** Run `e2e/timeline.spec.js` again. Expected: PASS with no test edits. Screenshot desktop at progress 0.5 and compare with the pre-refactor screenshot; they should look the same.
- [ ] **Step 4:** Commit: `refactor(v3): extract the circuit for reuse`.

### Task 7: "How it works" mini circuit

**Files:**
- Modify: `components/Services.jsx` (§ 02 only)
- Test: `e2e/services.spec.js`

**Interfaces:**
- Consumes: `useCircuit`, `CircuitTrace`, `CircuitPad` (Task 6); `STEPS` (Task 2).

- [ ] **Step 1: Write the failing tests** (`e2e/services.spec.js`):
  - `steps light as you scroll` (desktop):
    - At the list's start, 0–1 steps are lit (`[data-milestone][data-lit="true"]`).
    - Scrolled to its end, all 4 are, and pad 4's background is `rgb(37, 99, 235)`.
    - Scroll back: at most 1 is lit.
  - `steps are one column` (both): each step's left edge is equal within 1 px.
  - `pad labels P01–P04 on desktop only` (both).
  - `every step lights by the bottom of a tall page` (desktop, 2560×1600, Review Focus 5): scroll to the very bottom; all 4 steps are lit.
  - `reduced motion is the finished circuit` (both): 4 lit, `[data-head]` hidden, `[data-flow]` hidden.
  - `no-JS shows the finished line` (desktop): `[data-trace-fallback]` visible, every pad electric.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - The steps become an `ol` in one column in the content column (`md:col-span-9 md:col-start-4`). Each `li` has `data-milestone`, `data-lit`, `group relative pl-12 md:pl-20` and a `CircuitPad`. The content is the italic electric number, the title and the description.
  - Text is faint until lit, like the Timeline (`js:motion-safe:group-data-[lit=false]:opacity-45`).
  - **For Review Focus 5:** if the page's maximum scroll is reached before the circuit's end offset, `drawn` goes to 1. Add this to `useCircuit` with a test-first change: the end offset is `min(end 0.55, page bottom)`, the same idea as `growProgress`. Rerun `e2e/timeline.spec.js` too.
- [ ] **Step 4:** Run `e2e/services.spec.js` and `e2e/timeline.spec.js`. Expected: PASS. Screenshot desktop mid-scroll, mobile, dark and reduced motion, then Read them.
- [ ] **Step 5:** Commit: `feat(v3): /services How it works on a mini circuit`.

### Task 8: "Recent work" as skeleton browser cards

**Files:**
- Create: `components/services/RecentWork.jsx`
- Modify: `components/Services.jsx` (§ 03 renders `<RecentWork />`), `components/projects/ProjectCard.jsx` (`linkNote`)
- Test: `e2e/services.spec.js`

**Interfaces:**
- Consumes: `ProjectCard` (`project`, `index`, `active`, `onFocusCard`), `PROJECTS` (`lib/projects.js`), `WORK` (Task 2), `nearestToCentre` (`lib/strip.js`).
- Each card's project is `{ ...PROJECTS.find(p => p.slug === w.slug), n: "01"…"04", href: w.href, self: w.href === "/", blurb: w.note, tags: [w.tag] }`.
- Modifies `ProjectCard`: an optional `linkNote` prop overrides the aria-label's suffix. Today `self` always says "(back to top)", which is wrong for a card that goes to `/`. The `/services` portfolio card passes `"(portfolio home)"`.

- [ ] **Step 1: Write the failing tests** (`e2e/services.spec.js`):
  - `four cards in order with the right links` (both):
    - The labels are `01 — This Portfolio — 2026`, `02 — Spades Solutions — 2026`, `03 — Aloys Travels — 2026` and `04 — Danella De Cruz — 2026`.
    - The hrefs are `/`, the Spades URL, `https://aloys-travels.com/` and `https://danelladc.com`.
    - The external cards have `target="_blank"` and `rel` containing `noopener`; the portfolio card has no `target`.
    - The portfolio card's aria-label is `This Portfolio, 2026 (portfolio home)`.
  - `hover decodes the card under a still pointer` (desktop): move the pointer onto card 3 and stop. Within 1.5 s its root has `data-decode="shot"` and its blurb has opacity 1. The other cards don't.
  - `keyboard reaches every card in order` (desktop, Review Focus 2): Tab from "See the full portfolio" focuses cards 1–4 in order, and the focused card decodes. Enter on card 1 navigates to `/`.
  - `on touch the centred card decodes` (mobile): scroll card 2 to the centre of the screen. It decodes, and card 1 doesn't.
  - `reduced motion shows the screenshots` (both): every card's screenshot has opacity 1.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `RecentWork.jsx`.
  - **Layout:** a grid, `md:grid-cols-2`, one column below `md`.
  - **Activation:**
    - Pointer: the hovered card, re-checked on scroll under a resting pointer.
    - Keyboard: the focused card.
    - Touch: the card nearest the centre.
    - Mirror the modality rules in `Projects.jsx`'s header comment, without the strip.
- [ ] **Step 4:** Run again plus `e2e/projectCard.spec.js` and `e2e/projects.spec.js`. Expected: PASS. Screenshot desktop with one card decoded, mobile, and reduced motion, then Read them.
- [ ] **Step 5:** Commit: `feat(v3): /services recent work as skeleton browser cards`.

### Task 9: "Start a project" as the growing electric card

**Files:**
- Create: `components/useGrowCard.js`
- Modify: `components/Contact.jsx` (uses the hook; behaviour unchanged), `components/Services.jsx` (§ 05), `app/(site)/globals.css` (the card focus rules move from `[data-contact-card]` to `[data-electric-card]`; both cards carry it)
- Test: `e2e/contact.spec.js` (the guard), `e2e/services.spec.js`

**Interfaces:**
- Produces: `useGrowCard({ cardRef, contentRef, reduce, tile = 96 })`.
  - It writes the card's `clip-path` and the content's opacity from `growProgress` and `growInset` (`lib/contact.js`).
  - Keyboard focus inside the card holds it fully open.
  - It cleans both styles up on unmount.
  - This is exactly the effect now inline in `Contact.jsx`.

- [ ] **Step 1:** Run `npx playwright test e2e/contact.spec.js`. Expected: PASS (the baseline). Extract the hook and run it again. Expected: PASS with no test edits.
- [ ] **Step 2: Write the failing tests** (`e2e/services.spec.js`):
  - `start card grows with scroll` (desktop): with the card's top at 90% of the viewport, the right inset is over 500 px. At the bottom of the page the clip is `inset(0px 0px 0px 0px round 8px)`.
  - `focus opens the start card` (desktop, Review Focus 4): with the card small, focus "Message on WhatsApp". The clip is full and the button is within the card's visible box.
  - `start card text passes AA in both themes`: the heading and body colour against `rgb(37, 99, 235)` is at least 4.5:1.
  - `reduced motion and no-JS: full card` (desktop).
  - `the start card keeps the copy` (both): heading `Let’s build your site.` and body `START_TEXT`.
- [ ] **Step 3:** Run. Expected: FAIL.
- [ ] **Step 4:** Implement § 05.
  - The label stays above the card. The card (`data-electric-card`, `rounded-lg bg-electric dark:bg-[#2563EB] text-ivory dark:text-ink`) holds the heading, the text and two buttons.
  - The buttons are styled like the Contact card's email pill and WhatsApp outline, with `ScrambleText` labels "Message on WhatsApp" ↗ and "Email me" →.
  - Drop the section's sky blob.
- [ ] **Step 5:** Run `e2e/services.spec.js` and `e2e/contact.spec.js`. Expected: PASS. Screenshot desktop at three growth points, mobile, dark and reduced motion, then Read them.
- [ ] **Step 6:** Commit: `feat(v3): /services start card grows like Contact`.

### Task 10: Phase verification, docs and merge

- [ ] **Step 1:** `npm test && npm run e2e`. Expected: all pass.
- [ ] **Step 2:** Screenshots:
  - Home: About, Leadership, Skills, Résumé and the footer.
  - All of `/services`.
  - Desktop 1440×900 and mobile 390×844 at 100% and 150% scaling, plus dark and reduced motion.
  - Read every one.
  - Keyboard pass: Tab through `/services` top to bottom with the focus ring visible everywhere, and through the Home sections that changed.
- [ ] **Step 3:** Lighthouse via scratchpad worktrees (`main` and `v3-phase-4`, 3 runs each, mobile and desktop) for `/` and `/services`. Expected: medians no worse than `main`.
- [ ] **Step 4:** One fresh reviewer over `git diff v3...v3-phase-4`, given this plan's Review Focus. Fix the Critical and Important findings test-first, and fix the minors too (Damian's standing preference).
- [ ] **Step 5:** Docs:
  - `README.md`: status, "What Phase 4 built", the next step (Phase 5, the page transition).
  - `decisions.md`: rulings.
  - This plan: a status note.
  - `design.md` → Delivery: Phase 5 added.
- [ ] **Step 6 (gate):** show Damian the screenshots and the dev page. On his approval, run `git switch v3 && git merge --no-ff v3-phase-4` and delete the branch. No push.
