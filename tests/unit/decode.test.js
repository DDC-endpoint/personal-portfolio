import { NOISE, noiseChar, isDecodable, scrambleText, scrambleDigits } from "@/lib/decode";

const zero = () => 0;

test("noise set excludes I and O", () => {
  expect(NOISE).not.toMatch(/[IO]/);
  expect(NOISE).toContain("\\");
});

test("noiseChar draws from the noise set", () => {
  expect(noiseChar(zero)).toBe(NOISE[0]);
  expect(NOISE).toContain(noiseChar());
});

test("scramble keeps whitespace and length", () => {
  const text = "§ 01 — About";
  const out = scrambleText(text, 0, zero);
  expect(out).toHaveLength(12);
  expect([...out].filter((c, i) => /\s/.test(text[i]))).toEqual([" ", " ", " "]);
  expect(out[0]).toBe(NOISE[0]);
});

test("scramble resolves left to right", () => {
  expect(scrambleText("ABCD", 0.5, zero)).toBe("AB" + NOISE[0] + NOISE[0]);
  expect(scrambleText("ABCD", 1)).toBe("ABCD");
});

test("nbsp is not decodable", () => expect(isDecodable(" ")).toBe(false));

test("digit scramble only touches digits, and only into digits", () => {
  expect(scrambleDigits("2022–2024", 0, zero)).toBe("0000–0000");
  expect(scrambleDigits("Sep 2025", 0, zero)).toBe("Sep 0000");
  const out = scrambleDigits("2022–2024", 0);
  expect(out).toMatch(/^\d{4}–\d{4}$/);
});

test("digit scramble resolves left to right", () => {
  expect(scrambleDigits("Sep 2025", 1)).toBe("Sep 2025");
  expect(scrambleDigits("2022–2024", 0.5, zero)).toBe("2022–0000");
});
