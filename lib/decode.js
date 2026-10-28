// Decode vocabulary — the V3 visual thread. Text resolves out of noise
// characters into its final state. Shared by the portrait's loader front,
// section labels and mono-button hover. Pure: no DOM, so it unit-tests in node.

// A–Z without I and O (they read as 1 and 0), digits, symbols.
export const NOISE = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&@*+=<>/\\";

export const TICK_MS = 45; // how often a scrambling character re-rolls
export const LABEL_MS = 600; // § section label decode
export const LINK_MS = 400; // mono button hover scramble

export const noiseChar = (rand = Math.random) => NOISE[(rand() * NOISE.length) | 0];

// Whitespace (NBSP included) is never scrambled, so words keep their shape.
export const isDecodable = (ch) => !/\s/.test(ch);

// Resolves left to right: the first floor(length × progress) characters are
// final, every later decodable character is noise.
export function scrambleText(text, progress, rand = Math.random) {
  if (progress >= 1) return text;
  const resolved = Math.floor(text.length * progress);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    out += i < resolved || !isDecodable(c) ? c : noiseChar(rand);
  }
  return out;
}

const isDigit = (ch) => ch >= "0" && ch <= "9";

// Timeline years: the same left-to-right resolve, but only digits scramble and
// only into digits, so "2022–2024" keeps its dash and "Sep 2025" its month.
export function scrambleDigits(text, progress, rand = Math.random) {
  if (progress >= 1) return text;
  const resolved = Math.floor(text.length * progress);
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    out += i < resolved || !isDigit(c) ? c : String((rand() * 10) | 0);
  }
  return out;
}
