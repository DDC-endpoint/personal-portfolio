import { SERVICES_HERO, SERVICES, PRICING_NOTE, PRICES_UPDATED, BUSINESS, STEPS, WORK, FAQS, START_TEXT, faqJsonLd } from "@/lib/services";
import { PROJECTS } from "@/lib/projects";
import { ldJson } from "@/lib/jsonld";

// Expected strings are docs/v3/copy.md → /services, verbatim (with
// typographic apostrophes).

test("hero", () => {
  expect(SERVICES_HERO).toEqual({
    kicker: "Freelance web designer · Colombo, Sri Lanka",
    heading: ["Clean, fast websites, ", "built in days", "."],
    lead: "I’m Damian, a creative technologist and freelance web designer in Colombo, working as DDC Web Services. I design and build custom websites for businesses and creatives that load quickly, look sharp on every screen and are ready for Google. Most projects ship within days.",
  });
});

test("service descriptions", () => {
  expect(SERVICES.map((s) => s.desc)).toEqual([
    "A clean, fast, custom website built from scratch: landing pages, personal sites and one-pagers that load quickly and look sharp on every screen.",
    "Multi-page sites that give a business or creative a proper home online, with services, about, gallery and contact pages wired for search and enquiries.",
    "Let clients book you online. Appointment calendars, reservations and payment-ready scheduling, built into a polished, branded site.",
    "Already have a site? I’ll modernise the look or fix what’s slow: Core Web Vitals, mobile layout and the rough edges that quietly lose visitors.",
    "A full audit of how your site performs on Google and in AI answers (ChatGPT, Perplexity, Google AI Overviews). You get a plain-English report of what’s holding you back and a prioritised plan to fix it.",
    "The audit scopes the work, so I quote the final price once I know exactly what your site needs. Then I implement what the report found: technical fixes, schema markup, content restructuring and AI snippet optimisation.",
    "For clients who want ongoing management: monthly health checks, content updates and AI visibility monitoring across Google, ChatGPT and Perplexity, with a performance report every month.",
  ]);
});

test("titles, prices, turnarounds and includes (prices from the October 2026 research)", () => {
  expect(SERVICES.map(({ n, title, fromLKR, fromUSD, turnaround, includes }) => [n, title, fromLKR, fromUSD, turnaround, includes])).toEqual([
    ["01", "Web design & development", "LKR 30,000", "$300", "~2–3 days", ["Custom responsive design", "Fast, hand-built code", "Basic on-page SEO"]],
    ["02", "Business & portfolio sites", "LKR 60,000", "$600", "~1 week", ["Up to ~5 pages", "Contact form & socials", "SEO + analytics setup"]],
    ["03", "Booking & scheduling sites", "LKR 120,000", "$1,200", "1–2 weeks", ["Calendar / booking flow", "Payment gateway integration", "Email confirmations"]],
    ["04", "Redesigns & speed fixes", "LKR 30,000", "$300", "1–3 days", ["Performance & speed tuning", "Visual refresh", "Mobile & accessibility fixes"]],
    ["05", "SEO & AI visibility audit", "LKR 40,000", "$400", "2–4 days", ["On-page & technical SEO", "GEO / AI answer visibility score", "Priority recommendations report"]],
    ["06", "SEO & GEO implementation", "LKR 75,000", "$750", "1–2 weeks", ["Technical & on-page fixes", "Schema & structured data", "AI snippet optimisation"]],
    ["07", "Ongoing SEO & GEO retainer", "LKR 45,000", "$400", "Monthly", ["Monthly SEO health checks", "GEO monitoring & updates", "Monthly performance report"]],
  ]);
});

test("the business on the page: DDC Web Services, by Damian", () => {
  expect(BUSINESS).toEqual({ name: "DDC Web Services", by: "by Damian De Cruz" });
  expect(PRICES_UPDATED).toBe("Prices updated October 2026.");
});

test("Spades is a client design that hasn't launched", () => {
  expect(WORK.find((w) => w.slug === "spades-solutions").tag).toBe("Client design · not launched");
});

test("pricing note and start text", () => {
  expect(PRICING_NOTE).toBe(
    "All figures are starting points; the final quote depends on scope. Larger, fully custom builds start from around LKR 250,000. Domain and hosting are billed separately, at cost."
  );
  expect(START_TEXT).toBe(
    "Tell me what you have in mind and I’ll come back with a scope, a fixed starting price and a timeline, usually within a day. No obligation."
  );
});

test("steps", () => {
  expect(STEPS).toEqual([
    { n: "01", title: "Brief", desc: "You tell me what you need in a few messages or a quick call. I send back a clear scope and a fixed starting price." },
    { n: "02", title: "Design", desc: "I shape the look and structure and share previews early, so you can steer before anything is locked in." },
    { n: "03", title: "Build", desc: "I build it fast and clean: responsive, quick to load and ready for search engines from day one." },
    { n: "04", title: "Launch", desc: "We go live on your domain. I hand everything over and stay around for tweaks and support." },
  ]);
});

test("recent work", () => {
  expect(WORK.map((w) => w.slug)).toEqual(["portfolio", "spades-solutions", "aloys-travels", "danella-de-cruz"]);
  for (const w of WORK) expect(PROJECTS.some((p) => p.slug === w.slug)).toBe(true);
  const by = Object.fromEntries(WORK.map((w) => [w.slug, w]));
  expect(by.portfolio.href).toBe("/");
  expect(by.portfolio.note).toBe("Personal portfolio built with Next.js, Tailwind and Framer Motion. The full body of work lives here.");
  expect(by["spades-solutions"].note).toBe("A sharp, professional web presence for a growing solutions company.");
  expect(by["aloys-travels"].href).toBe("https://aloys-travels.com/");
  expect(by["aloys-travels"].note).toBe("Website for a travel company, with clean booking flows and a journey-led design.");
  expect(by["danella-de-cruz"]).toMatchObject({
    tag: "Artist site",
    href: "https://danelladc.com",
    note: "Portfolio and booking site for a Colombo cover artist.",
  });
});

test("FAQ answers", () => {
  expect(FAQS).toEqual([
    {
      q: "What’s included in a build?",
      a: "Every site is fully responsive (phones, tablets and desktops), quick to load and set up with basic on-page SEO so Google can find it. Business builds add a contact form, analytics and social links. Anything beyond the agreed scope is quoted up front, so there are no surprises.",
    },
    {
      q: "How fast can you really deliver?",
      a: "A single-page site usually takes 2–3 days, a small business site about a week, and a booking site 1–2 weeks. Those timelines assume your content (text, images, logo) is ready and feedback comes quickly. Speed is a two-way street.",
    },
    {
      q: "What about domain and hosting?",
      a: "Those are small recurring costs paid to the providers, not to me. A domain runs about LKR 3,000 a year and hosting roughly LKR 10,000–20,000 a year. I’ll recommend and set everything up, or build on hosting you already have.",
    },
    {
      q: "How does payment work?",
      a: "Usually 30–40% up front to start, with the balance on delivery. Larger projects can be split across milestones. I’ll confirm the full price before any work starts.",
    },
    {
      q: "What happens to the deposit if the project is cancelled?",
      a: "The deposit covers the scoping and design work done before any code is written, and that time is spent whatever happens next. If you cancel after work has started, the deposit isn’t refundable, but you keep everything produced up to that point: designs, wireframes and any partial build. If I fail to deliver what we agreed, I’ll refund you in full. Either way, the full price is locked in writing before work begins.",
    },
    {
      q: "Do you work with clients outside Sri Lanka?",
      a: "Yes, I work with clients anywhere. International projects are quoted in USD (roughly the figures shown), and we handle everything over email, WhatsApp or a call.",
    },
    {
      q: "What if I need changes after launch?",
      a: "Every build includes a round of revisions, and I’m reachable for small fixes once you’re live. Ongoing maintenance or larger updates can be arranged whenever you need them.",
    },
  ]);
});

test("the FAQ JSON-LD is built from the FAQ", () => {
  const ld = faqJsonLd(FAQS);
  expect(ld["@context"]).toBe("https://schema.org");
  expect(ld["@type"]).toBe("FAQPage");
  expect(ld.mainEntity).toHaveLength(FAQS.length);
  ld.mainEntity.forEach((q, i) => {
    expect(q["@type"]).toBe("Question");
    expect(q.name).toBe(FAQS[i].q);
    expect(q.acceptedAnswer).toEqual({ "@type": "Answer", text: FAQS[i].a });
  });
});

test("ldJson can't close its script tag", () => {
  const out = ldJson({ a: "</script>" });
  expect(out).not.toContain("<");
  expect(JSON.parse(out)).toEqual({ a: "</script>" });
});
