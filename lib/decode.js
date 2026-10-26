// Decode vocabulary — the V3 visual thread. Text resolves out of noise
// characters into its final state. Shared by the hero loader, section
// labels and link hover. Pure: no DOM, so it unit-tests in node.

// A–Z without I and O (they read as 1 and 0), digits, symbols.
export const NOISE = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&@*+=<>/\\";

export const TICK_MS = 45; // how often a scrambling character re-rolls
export const LABEL_MS = 600; // § section label decode
export const LINK_MS = 400; // nav link / mono button hover scramble
export const LETTER_SCRAMBLE_MS = 220; // hero letter: full-opacity noise before landing
export const FAINT_OPACITY = 0.12; // hero letter: faint noise before the wave reaches it

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

// Alternating word / whitespace tokens — words get white-space:nowrap so a
// line only ever breaks between words while letters are swapped.
export const splitWords = (text) => text.split(/(\s+)/).filter(Boolean);

// Hero letter delay (ms): letters land as the portrait wave reaches them.
export const letterDelay = (dist, viewportWidth, rand = Math.random) =>
  350 + (dist / viewportWidth) * 1100 + rand() * 150;

export function letterPhase(elapsed, delay) {
  if (elapsed >= delay) return "final";
  return elapsed >= delay - LETTER_SCRAMBLE_MS ? "scramble" : "faint";
}
