// Structured data (JSON-LD) for the site, as one graph of linked nodes with
// stable @ids (docs/v3/seo-geo.md). The layout emits the site graph on every
// page (the WebSite, Damian, and DDC Web Services, the business he trades
// as); each page adds its own nodes and refers back by @id.
//
// Facts come from the same modules the pages render (lib/site.js,
// lib/services.js), so the markup can't drift from what visitors read.
// There's no LocalBusiness or street address on purpose: Google requires an
// address for those, and the home address stays private. The city and
// country are enough. Nothing here claims what the pages don't show (so no
// BreadcrumbList: there's no visible breadcrumb).

import { EMAIL, SOCIALS } from "./site";
import { SERVICES } from "./services";
import { PROJECTS } from "./projects";

export const SITE = "https://damiandc.com";

export const ID = {
  website: `${SITE}/#website`,
  person: `${SITE}/#person`,
  business: `${SITE}/#business`,
  profile: `${SITE}/#profile`,
  servicesPage: `${SITE}/services#webpage`,
  service: `${SITE}/services#service`,
  portfolioPage: `${SITE}/portfolio#webpage`,
};

const ref = (id) => ({ "@id": id });
const graph = (nodes) => ({ "@context": "https://schema.org", "@graph": nodes });

export function siteGraph() {
  return graph([
    {
      "@type": "WebSite",
      "@id": ID.website,
      url: SITE,
      name: "Damian De Cruz",
      alternateName: ["DDC Web Services", "damiandc.com"],
      inLanguage: "en",
      publisher: ref(ID.person),
    },
    {
      "@type": "Person",
      "@id": ID.person,
      name: "Damian De Cruz",
      url: SITE,
      image: `${SITE}/hero/portrait.webp`,
      jobTitle: "Creative Technologist",
      description:
        "Creative technologist and freelance web designer and developer in Colombo, Sri Lanka, trading as DDC Web Services. Second-year BSc (Hons) Computer Science student at the Informatics Institute of Technology.",
      email: EMAIL,
      address: { "@type": "PostalAddress", addressLocality: "Colombo", addressCountry: "LK" },
      worksFor: ref(ID.business),
      knowsAbout: ["Web design", "Web development", "JavaScript", "React", "Next.js", "Search engine optimisation", "Generative engine optimisation"],
      affiliation: [
        {
          "@type": "CollegeOrUniversity",
          name: "Informatics Institute of Technology",
          alternateName: "IIT Sri Lanka",
          url: "https://www.iit.ac.lk",
        },
        { "@type": "CollegeOrUniversity", name: "University of Westminster", url: "https://www.westminster.ac.uk" },
      ],
      alumniOf: { "@type": "HighSchool", name: "St. Joseph's College, Colombo 10" },
      // Discord isn't a public profile page, so it stays out.
      sameAs: SOCIALS.filter((s) => s.label !== "Discord").map((s) => s.href),
    },
    {
      "@type": "Organization",
      "@id": ID.business,
      name: "DDC Web Services",
      alternateName: "DDC",
      url: `${SITE}/services`,
      email: EMAIL,
      founder: ref(ID.person),
      description: "Freelance web design and development, SEO and AI-visibility work, by Damian De Cruz in Colombo, Sri Lanka.",
      areaServed: [{ "@type": "Country", name: "Sri Lanka" }, "Worldwide"],
    },
  ]);
}

export function homeGraph() {
  return graph([
    {
      "@type": "ProfilePage",
      "@id": ID.profile,
      url: SITE,
      name: "Damian De Cruz — Freelance Web Designer & Developer",
      isPartOf: ref(ID.website),
      mainEntity: ref(ID.person),
      about: ref(ID.person),
    },
  ]);
}

// /portfolio: the live sites, newest first, as the page lists them. Upcoming
// cards aren't published work, so they stay out.
export function portfolioGraph() {
  const live = PROJECTS.filter((p) => p.status === "live");
  return graph([
    {
      "@type": "CollectionPage",
      "@id": ID.portfolioPage,
      url: `${SITE}/portfolio`,
      name: "Portfolio: Websites by Damian De Cruz | DDC Web Services",
      isPartOf: ref(ID.website),
      about: ref(ID.person),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: live.length,
        itemListElement: live.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "CreativeWork",
            name: p.title,
            url: p.self ? SITE : p.href,
            description: p.blurb,
            image: `${SITE}${p.shot}`,
            dateCreated: p.year,
            creator: ref(ID.person),
          },
        })),
      },
    },
  ]);
}

const amount = (s) => Number(s.replace(/[^\d]/g, ""));

// Starting prices in both currencies; the retainer is priced per month.
function priceSpecification(s) {
  const monthly = s.turnaround === "Monthly";
  return [
    ["LKR", s.fromLKR],
    ["USD", s.fromUSD],
  ].map(([currency, value]) => ({
    "@type": monthly ? "UnitPriceSpecification" : "PriceSpecification",
    priceCurrency: currency,
    minPrice: amount(value),
    ...(monthly && { unitCode: "MON" }),
  }));
}

export function servicesGraph() {
  return graph([
    {
      "@type": "WebPage",
      "@id": ID.servicesPage,
      url: `${SITE}/services`,
      name: "Web Design Services in Colombo | DDC Web Services",
      isPartOf: ref(ID.website),
      about: ref(ID.service),
    },
    {
      "@type": "Service",
      "@id": ID.service,
      name: "Web design and development",
      serviceType: "Web Design and Development",
      url: `${SITE}/services`,
      provider: ref(ID.business),
      areaServed: [{ "@type": "City", name: "Colombo" }, { "@type": "Country", name: "Sri Lanka" }, "Worldwide"],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Web design, development and SEO services",
        itemListElement: SERVICES.map((s) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: s.title, description: s.desc },
          priceSpecification: priceSpecification(s),
        })),
      },
    },
  ]);
}
