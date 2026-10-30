import { afterEach, expect, test, vi } from "vitest";

// The map is read once at import, so each case imports a fresh module.
const load = async (map) => {
  vi.resetModules();
  if (map === undefined) delete process.env.ASSET_VERSIONS;
  else process.env.ASSET_VERSIONS = JSON.stringify(map);
  return (await import("../../lib/assets.js")).asset;
};

afterEach(() => {
  delete process.env.ASSET_VERSIONS;
});

test("a versioned image carries its hash; an unknown one and no map stay bare", async () => {
  const asset = await load({ "/hero/portrait.webp": "0123abcd" });
  expect(asset("/hero/portrait.webp")).toBe("/hero/portrait.webp?v=0123abcd");
  expect(asset("/og.jpg")).toBe("/og.jpg");
  const bare = await load(undefined);
  expect(bare("/hero/portrait.webp")).toBe("/hero/portrait.webp");
});
