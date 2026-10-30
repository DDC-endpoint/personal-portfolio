import { heroProgress, drift, metaFade, toStyle, driftKeyframes } from "@/lib/heroDrift";

test("the drift is framer's: 0 → −100 px over the hero, fading out by 80%, clamped", () => {
  expect(drift(0)).toEqual({ y: -0, opacity: 1 });
  expect(drift(0.4)).toEqual({ y: -40, opacity: 0.5 });
  expect(drift(1)).toEqual({ y: -100, opacity: 0 });
  expect(drift(2)).toEqual({ y: -100, opacity: 0 });
  expect(drift(-1)).toEqual({ y: -0, opacity: 1 });
  expect(metaFade(0.06).opacity).toBeCloseTo(0.5, 9);
  expect(metaFade(0.5).opacity).toBe(0);
});

test("heroProgress: 0 with the hero's top at the top of the screen, 1 with its bottom there", () => {
  expect(heroProgress(0, { top: 0, h: 900 })).toBe(0);
  expect(heroProgress(450, { top: 0, h: 900 })).toBe(0.5);
  expect(heroProgress(1000, { top: 100, h: 900 })).toBe(1);
});

test("driftKeyframes, read between keyframes, is the mapping at every scroll position", () => {
  const read = (ks, q, key) => {
    const j = Math.max(0, ks.findIndex((k) => k.offset >= q) - 1);
    const [a, b] = [ks[j], ks[Math.min(j + 1, ks.length - 1)]];
    const u = b.offset === a.offset ? 0 : (q - a.offset) / (b.offset - a.offset);
    const v = (k) => (key === "y" ? (k.transform === "none" ? 0 : +k.transform.match(/-?[\d.e-]+(?=px)/)[0]) : +k.opacity);
    return v(a) + u * (v(b) - v(a));
  };
  for (const geo of [{ top: 0, h: 900, M: 9000 }, { top: 0, h: 751, M: 12000 }, { top: 40, h: 900, M: 700 }]) {
    for (const map of [drift, metaFade]) {
      const fades = driftKeyframes(map, geo, "opacity"), moves = driftKeyframes(map, geo, "transform");
      for (const ks of [fades, moves]) {
        expect(ks[0].offset).toBe(0);
        expect(ks.at(-1).offset).toBe(1);
      }
      for (let i = 0; i <= 500; i++) {
        const q = i / 500, want = map(heroProgress(q * geo.M, geo));
        expect(read(fades, q, "opacity")).toBeCloseTo(want.opacity, 9);
        if (want.y !== undefined) expect(read(moves, q, "y")).toBeCloseTo(want.y, 9);
      }
    }
  }
});

test("toStyle writes framer's properties", () => {
  expect(toStyle({ y: -12.5, opacity: 0.25 })).toEqual({ transform: "translateY(-12.5px)", opacity: "0.25" });
  expect(toStyle({ opacity: 1 })).toEqual({ opacity: "1" });
  expect(toStyle({ y: -0, opacity: 1 })).toEqual({ transform: "none", opacity: "1" });
});
