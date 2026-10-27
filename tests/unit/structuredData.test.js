import { siteGraph, homeGraph, servicesGraph, ID, SITE } from "@/lib/structuredData";
import { SERVICES } from "@/lib/services";
import { SOCIALS, EMAIL } from "@/lib/site";

const all = () => [...siteGraph()["@graph"], ...homeGraph()["@graph"], ...servicesGraph()["@graph"]];
const byId = () => Object.fromEntries(all().map((n) => [n["@id"], n]));

// Every {"@id": …} reference anywhere in a node.
function refs(v, out = []) {
  if (Array.isArray(v)) v.forEach((x) => refs(x, out));
  else if (v && typeof v === "object") {
    if (Object.keys(v).length === 1 && v["@id"]) out.push(v["@id"]);
    else Object.values(v).forEach((x) => refs(x, out));
  }
  return out;
}

test("each graph is a schema.org @graph", () => {
  for (const g of [siteGraph(), homeGraph(), servicesGraph()]) {
    expect(g["@context"]).toBe("https://schema.org");
    expect(Array.isArray(g["@graph"])).toBe(true);
  }
});

test("every node has a unique absolute @id, and every reference resolves", () => {
  const ids = all().map((n) => n["@id"]);
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) expect(id.startsWith(`${SITE}/`)).toBe(true);
  const known = byId();
  for (const r of refs(all())) expect(known[r], r).toBeTruthy();
});

test("the site: a WebSite, a Person and the business he trades as", () => {
  const n = byId();
  expect(n[ID.website]).toMatchObject({ "@type": "WebSite", url: SITE, name: "Damian De Cruz", publisher: { "@id": ID.person } });
  const person = n[ID.person];
  expect(person).toMatchObject({
    "@type": "Person",
    name: "Damian De Cruz",
    url: SITE,
    image: `${SITE}/hero/portrait.webp`,
    email: EMAIL,
    worksFor: { "@id": ID.business },
    address: { "@type": "PostalAddress", addressLocality: "Colombo", addressCountry: "LK" },
  });
  // A current student: the universities are affiliations, the school is the alma mater.
  expect(JSON.stringify(person.alumniOf)).not.toMatch(/Westminster|Informatics/);
  expect(person.alumniOf.name).toBe("St. Joseph's College, Colombo 10");
  expect(person.affiliation.map((a) => a.name)).toEqual(["Informatics Institute of Technology", "University of Westminster"]);
  expect(person.sameAs).toEqual(SOCIALS.filter((s) => s.label !== "Discord").map((s) => s.href));
  expect(person.knowsAbout.length).toBeGreaterThan(3);
  // No street address anywhere.
  expect(JSON.stringify(all())).not.toMatch(/streetAddress|postalCode/);

  expect(n[ID.business]).toMatchObject({
    "@type": "Organization",
    name: "DDC Web Services",
    url: `${SITE}/services`,
    email: EMAIL,
    founder: { "@id": ID.person },
  });
});

test("home is his profile page", () => {
  const [page] = homeGraph()["@graph"];
  expect(page).toMatchObject({ "@type": "ProfilePage", url: SITE, mainEntity: { "@id": ID.person }, isPartOf: { "@id": ID.website } });
});

// No BreadcrumbList: the page shows no breadcrumb, and markup only states
// what visitors can see.
test("/services: one Service from the business", () => {
  const nodes = servicesGraph()["@graph"];
  expect(nodes.map((n) => n["@type"])).toEqual(["WebPage", "Service"]);
  expect(nodes[1]).toMatchObject({ provider: { "@id": ID.business }, url: `${SITE}/services` });
});

test("each offer matches the visible service and its prices in both currencies", () => {
  const offers = servicesGraph()["@graph"][1].hasOfferCatalog.itemListElement;
  expect(offers).toHaveLength(SERVICES.length);
  const num = (s) => Number(s.replace(/[^\d]/g, ""));
  offers.forEach((o, i) => {
    const s = SERVICES[i];
    expect(o["@type"]).toBe("Offer");
    expect(o.itemOffered).toMatchObject({ "@type": "Service", name: s.title, description: s.desc });
    const specs = Object.fromEntries(o.priceSpecification.map((p) => [p.priceCurrency, p]));
    expect(specs.LKR.minPrice).toBe(num(s.fromLKR));
    expect(specs.USD.minPrice).toBe(num(s.fromUSD));
  });
  // The retainer is per month; the rest are one-off.
  const retainer = offers[SERVICES.findIndex((s) => s.turnaround === "Monthly")];
  for (const p of retainer.priceSpecification) expect(p).toMatchObject({ "@type": "UnitPriceSpecification", unitCode: "MON" });
  expect(offers[0].priceSpecification[0]["@type"]).toBe("PriceSpecification");
});
