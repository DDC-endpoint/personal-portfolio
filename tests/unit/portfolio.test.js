import { PREVIEW, previewPlan, leavePlan, delayFor, filterProjects, easeInOut, positionAt } from "@/lib/portfolio";
import { portfolioGraph, ID, SITE } from "@/lib/structuredData";
import { PAGES } from "@/lib/pageTransition";

const total = (plan) => plan.reduce((t, s) => t + s.ms, 0);

test("the preview's timing (Damian: 1.5× the mock's first, 'more browsable')", () => {
  expect(PREVIEW).toMatchObject({ msPerPx: 13.5, minMs: 3900, maxMs: 13500, holdMs: 1350, backMs: 2100, minTravel: 8 });
});

test("previewPlan: down at 13.5 ms per pixel, a hold, then back up", () => {
  expect(previewPlan(600)).toEqual([
    { to: -600, ms: 8100 },
    { to: -600, ms: 1350 },
    { to: 0, ms: 2100 },
  ]);
});

test("previewPlan clamps the way down to 3.9–13.5 s", () => {
  expect(previewPlan(20)[0].ms).toBe(3900);
  expect(previewPlan(5000)[0].ms).toBe(13500);
  expect(total(previewPlan(5000))).toBe(13500 + 1350 + 2100);
});

test("no preview under 8 px of travel", () => {
  expect(previewPlan(7.9)).toBeNull();
  expect(previewPlan(0)).toBeNull();
  expect(previewPlan(8)).not.toBeNull();
});

test("leaving early eases back, never slower than it needs", () => {
  expect(leavePlan(-1000)).toEqual([{ to: 0, ms: 800 }]);
  expect(leavePlan(-100)).toEqual([{ to: 0, ms: 380 }]);
});

test("positionAt walks a plan, eased, and holds at its end", () => {
  const plan = previewPlan(600);
  expect(positionAt(plan, 0, 0)).toBe(0);
  expect(positionAt(plan, 0, 4050)).toBeCloseTo(-300, 6);
  expect(positionAt(plan, 0, 8100 + 600)).toBe(-600);
  expect(positionAt(plan, 0, 8100 + 1350 + 1050)).toBeCloseTo(-300, 6);
  expect(positionAt(plan, 0, 1e9)).toBe(0);
  // From a part-way start, a leave plan heads home.
  expect(positionAt(leavePlan(-200), -200, 0)).toBe(-200);
  expect(positionAt(leavePlan(-200), -200, 380)).toBe(0);
});

test("easeInOut is symmetric and runs 0 → 1", () => {
  expect(easeInOut(0)).toBe(0);
  expect(easeInOut(1)).toBe(1);
  expect(easeInOut(0.5)).toBeCloseTo(0.5, 9);
  expect(easeInOut(0.2) + easeInOut(0.8)).toBeCloseTo(1, 9);
});

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
