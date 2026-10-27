// § 03 Stack — the terminal. Contents are docs/v3/copy.md § 03 Stack.
//
// The terminal "types" by un-clipping text that's already in the server HTML,
// so the schedule only says when each string's characters show. Two layouts:
// - "columns" (md and up): `ls tools/`, then the four folders as columns,
//   typed column by column (folder name, then its items).
// - "folders" (phones): one `ls tools/<dir>` listing per folder, stacked.
// Prompts appear whole (zero duration); commands type at cmdMs a character,
// output at outMs; a command is followed by a gapMs pause, as is the last
// output before the final prompt.

export const PROMPT = "damian@colombo ~ $";

export const TOOLS = [
  { dir: "code/", items: ["JavaScript", "Python", "Java", "HTML / CSS", "React (learning)", "Git & GitHub"] },
  { dir: "design/", items: ["Figma", "Photoshop", "Type & layout", "Colour systems", "Motion basics"] },
  { dir: "tooling/", items: ["VS Code", "Vercel", "Notion", "Linear", "GitHub Pages"] },
  { dir: "curious-about/", items: ["AI / LLMs", "Generative art", "Web 3D", "Audio & music tech", "Hardware"] },
];

export function typingSchedule(mode, { cmdMs = 30, outMs = 6, gapMs = 90 } = {}) {
  const steps = [];
  let t = 0;
  const add = (key, text, perChar) => {
    const start = t;
    t += text.length * perChar;
    steps.push({ key, text, chars: text.length, start, end: t });
  };
  const prompt = (key) => add(key, PROMPT, 0);
  const command = (key, text) => {
    add(key, text, cmdMs);
    t += gapMs;
  };

  if (mode === "columns") {
    prompt("c:p");
    command("c:cmd", "ls tools/");
    TOOLS.forEach(({ dir, items }, c) => {
      add(`c:dir:${c}`, dir, outMs);
      items.forEach((it, i) => add(`c:item:${c}:${i}`, it, outMs));
    });
    t += gapMs;
    prompt("c:end");
  } else {
    TOOLS.forEach(({ dir, items }, c) => {
      prompt(`f:p:${c}`);
      command(`f:cmd:${c}`, `ls tools/${dir}`);
      items.forEach((it, i) => add(`f:item:${c}:${i}`, it, outMs));
      t += gapMs;
    });
    prompt("f:end");
  }
  return steps;
}

export const scheduleEnd = (steps) => steps.at(-1).end;

// How many characters of each string show at time t (ms from the start).
export function typedChars(steps, t) {
  const out = new Map();
  for (const { key, chars, start, end } of steps) {
    if (t < start) out.set(key, 0);
    else if (t >= end) out.set(key, chars);
    else out.set(key, Math.min(chars, Math.floor(((t - start) / (end - start)) * chars)));
  }
  return out;
}
