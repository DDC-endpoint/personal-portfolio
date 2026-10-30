import { delayFor, filterProjects } from "@/lib/portfolio";
import { portfolioGraph, ID, SITE } from "@/lib/structuredData";
import { PAGES } from "@/lib/pageTransition";

test("the entrance stagger: 110 ms a column, capped at 3", () => {
  expect([0, 1, 2, 3, 4, 9].map(delayFor)).toEqual([0, 110, 220, 330, 330, 330]);
});

test("filterProjects for each chip", () => {
  const titles = (f) => filterProjects(f).map((p) => p.title);
  expect(titles("all")).toHaveLength(8);
  expect(titles("client")).toEqual(["Aloys Travels", "Danella De Cruz", "Spades Solutions", "Interact District 3220"]);
  expect(titles("concept")).toEqual(["Kahatagaha Graphite"]);
  expect(titles("personal")).toEqual(["This Portfolio", "Personal Dashboard", "ai-studio"]);
  expect(titles("upcoming")).toEqual(["Interact District 3220", "ai-studio"]);
});

test("portfolioGraph: a CollectionPage whose ItemList is the six live sites", () => {
  const [page] = portfolioGraph()["@graph"];
  expect(page).toMatchObject({
    "@type": "CollectionPage",
    "@id": ID.portfolioPage,
    url: `${SITE}/portfolio`,
    isPartOf: { "@id": ID.website },
    about: { "@id": ID.person },
  });
  const list = page.mainEntity;
  expect(list["@type"]).toBe("ItemList");
  expect(list.numberOfItems).toBe(6);
  const items = list.itemListElement;
  expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(items.map((i) => i.item.name)).toEqual([
    "Aloys Travels", "Danella De Cruz", "Spades Solutions", "Kahatagaha Graphite", "This Portfolio", "Personal Dashboard",
  ]);
  for (const { item } of items) {
    expect(item["@type"]).toBe("CreativeWork");
    expect(item.url).toMatch(/^https:\/\//);
    expect(item.image).toMatch(new RegExp(`^${SITE}/projects/.+\\.webp$`));
    expect(item.creator).toEqual({ "@id": ID.person });
    expect(item.description.length).toBeGreaterThan(20);
  }
  expect(items[4].item.url).toBe(SITE);
});

test("/portfolio is one of the transition's pages", () => {
  expect(PAGES).toContain("/portfolio");
});
