// /services copy and data, verbatim from docs/v3/copy.md. One source for the
// page and its structured data, so the FAQ JSON-LD can't drift from the FAQ
// visitors read. Titles, "includes" lists and turnarounds are unchanged from
// the live site. Prices follow the October 2026 market research (Damian
// approved; docs/v3/decisions.md): USD is about LKR ÷ 100. /services is the business page: Damian
// trades as DDC Web Services (docs/v3/seo-geo.md), so the hero names it.

export const BUSINESS = { name: "DDC Web Services", by: "by Damian De Cruz" };

export const SERVICES_HERO = {
  // Inside the H1, so the heading names the service and the place.
  kicker: "Freelance web designer · Colombo, Sri Lanka",
  heading: ["Clean, fast websites, ", "built in days", "."], // the middle part is italic
  lead: "I’m Damian, a creative technologist and freelance web designer in Colombo, working as DDC Web Services. I design and build custom websites for businesses and creatives that load quickly, look sharp on every screen and are ready for Google. Most projects ship within days.",
};

export const SERVICES = [
  {
    n: "01",
    title: "Web design & development",
    desc: "A clean, fast, custom website built from scratch: landing pages, personal sites and one-pagers that load quickly and look sharp on every screen.",
    includes: ["Custom responsive design", "Fast, hand-built code", "Basic on-page SEO"],
    fromLKR: "LKR 30,000",
    fromUSD: "$300",
    turnaround: "~2–3 days",
  },
  {
    n: "02",
    title: "Business & portfolio sites",
    desc: "Multi-page sites that give a business or creative a proper home online, with services, about, gallery and contact pages wired for search and enquiries.",
    includes: ["Up to ~5 pages", "Contact form & socials", "SEO + analytics setup"],
    fromLKR: "LKR 60,000",
    fromUSD: "$600",
    turnaround: "~1 week",
  },
  {
    n: "03",
    title: "Booking & scheduling sites",
    desc: "Let clients book you online. Appointment calendars, reservations and payment-ready scheduling, built into a polished, branded site.",
    includes: ["Calendar / booking flow", "Payment gateway integration", "Email confirmations"],
    fromLKR: "LKR 120,000",
    fromUSD: "$1,200",
    turnaround: "1–2 weeks",
  },
  {
    n: "04",
    title: "Redesigns & speed fixes",
    desc: "Already have a site? I’ll modernise the look or fix what’s slow: Core Web Vitals, mobile layout and the rough edges that quietly lose visitors.",
    includes: ["Performance & speed tuning", "Visual refresh", "Mobile & accessibility fixes"],
    fromLKR: "LKR 30,000",
    fromUSD: "$300",
    turnaround: "1–3 days",
  },
  {
    n: "05",
    title: "SEO & AI visibility audit",
    desc: "A full audit of how your site performs on Google and in AI answers (ChatGPT, Perplexity, Google AI Overviews). You get a plain-English report of what’s holding you back and a prioritised plan to fix it.",
    includes: ["On-page & technical SEO", "GEO / AI answer visibility score", "Priority recommendations report"],
    fromLKR: "LKR 40,000",
    fromUSD: "$400",
    turnaround: "2–4 days",
  },
  {
    n: "06",
    title: "SEO & GEO implementation",
    desc: "The audit scopes the work, so I quote the final price once I know exactly what your site needs. Then I implement what the report found: technical fixes, schema markup, content restructuring and AI snippet optimisation.",
    includes: ["Technical & on-page fixes", "Schema & structured data", "AI snippet optimisation"],
    fromLKR: "LKR 75,000",
    fromUSD: "$750",
    turnaround: "1–2 weeks",
  },
  {
    n: "07",
    title: "Ongoing SEO & GEO retainer",
    desc: "For clients who want ongoing management: monthly health checks, content updates and AI visibility monitoring across Google, ChatGPT and Perplexity, with a performance report every month.",
    includes: ["Monthly SEO health checks", "GEO monitoring & updates", "Monthly performance report"],
    fromLKR: "LKR 45,000",
    fromUSD: "$400",
    turnaround: "Monthly",
  },
];

export const PRICING_NOTE =
  "All figures are starting points; the final quote depends on scope. Larger, fully custom builds start from around LKR 250,000. Domain and hosting are billed separately, at cost.";

// Shown under the pricing note; update it whenever a price changes.
export const PRICES_UPDATED = "Prices updated October 2026.";

export const STEPS = [
  { n: "01", title: "Brief", desc: "You tell me what you need in a few messages or a quick call. I send back a clear scope and a fixed starting price." },
  { n: "02", title: "Design", desc: "I shape the look and structure and share previews early, so you can steer before anything is locked in." },
  { n: "03", title: "Build", desc: "I build it fast and clean: responsive, quick to load and ready for search engines from day one." },
  { n: "04", title: "Launch", desc: "We go live on your domain. I hand everything over and stay around for tweaks and support." },
];

// "Recent work" cards. Each slug is a card in lib/projects.js, which supplies
// the title, year, screenshot and skeleton.
export const WORK = [
  { slug: "portfolio", tag: "Portfolio", note: "Personal portfolio built with Next.js, Tailwind and Framer Motion. The full body of work lives here.", href: "/" },
  { slug: "spades-solutions", tag: "Client design · not launched", note: "A sharp, professional web presence for a growing solutions company.", href: "https://ddc-endpoint.github.io/spades-solutions/index.html" },
  { slug: "aloys-travels", tag: "Travel site", note: "Website for a travel company, with clean booking flows and a journey-led design.", href: "https://aloys-travels.com/" },
  { slug: "danella-de-cruz", tag: "Artist site", note: "Portfolio and booking site for a Colombo cover artist.", href: "https://danelladc.com" },
];

export const FAQS = [
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
];

export const START_TEXT =
  "Tell me what you have in mind and I’ll come back with a scope, a fixed starting price and a timeline, usually within a day. No obligation.";

export const faqJsonLd = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
});
