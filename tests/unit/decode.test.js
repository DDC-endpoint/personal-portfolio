import {
  NOISE, noiseChar, isDecodable, scrambleText, splitWords, letterDelay, letterPhase,
} from "@/lib/decode";

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

test("splitWords", () =>
  expect(splitWords("Creative Technologist · Web")).toEqual(["Creative", " ", "Technologist", " ", "·", " ", "Web"]));

test("letterDelay", () => {
  expect(letterDelay(0, 1440, zero)).toBe(350);
  expect(letterDelay(720, 1440, () => 1)).toBe(1050);
});

test("letterPhase", () => {
  expect(letterPhase(0, 500)).toBe("faint");
  expect(letterPhase(300, 500)).toBe("scramble");
  expect(letterPhase(500, 500)).toBe("final");
});
