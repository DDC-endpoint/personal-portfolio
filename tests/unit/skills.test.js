import { PROMPT, TOOLS, typingSchedule, typedChars, scheduleEnd } from "@/lib/skills";

test("the stack is copy.md § 03 Stack, verbatim", () => {
  expect(PROMPT).toBe("damian@colombo ~ $");
  expect(TOOLS).toEqual([
    { dir: "code/", items: ["JavaScript", "Python", "Java", "HTML / CSS", "React (learning)", "Git & GitHub"] },
    { dir: "design/", items: ["Figma", "Photoshop", "Type & layout", "Colour systems", "Motion basics"] },
    { dir: "tooling/", items: ["VS Code", "Vercel", "Notion", "Linear", "GitHub Pages"] },
    { dir: "curious-about/", items: ["AI / LLMs", "Generative art", "Web 3D", "Audio & music tech", "Hardware"] },
  ]);
});

const opts = { cmdMs: 45, outMs: 12, gapMs: 120 };

test("columns: the command, then each folder and its items, column by column", () => {
  const s = typingSchedule("columns", opts);
  const keys = s.map((x) => x.key);
  expect(keys.slice(0, 3)).toEqual(["c:p", "c:cmd", "c:dir:0"]);
  expect(keys.slice(3, 9)).toEqual([0, 1, 2, 3, 4, 5].map((i) => `c:item:0:${i}`));
  expect(keys[9]).toBe("c:dir:1");
  expect(keys.at(-1)).toBe("c:end");
  expect(s.find((x) => x.key === "c:cmd").text).toBe("ls tools/");
  // every folder and item appears exactly once
  expect(keys.filter((k) => k.startsWith("c:dir:"))).toHaveLength(4);
  expect(keys.filter((k) => k.startsWith("c:item:"))).toHaveLength(21);
});

test("folders: one listing per folder", () => {
  const s = typingSchedule("folders", opts);
  const cmds = s.filter((x) => x.key.startsWith("f:cmd:")).map((x) => x.text);
  expect(cmds).toEqual(["ls tools/code/", "ls tools/design/", "ls tools/tooling/", "ls tools/curious-about/"]);
  expect(s.filter((x) => x.key.startsWith("f:item:"))).toHaveLength(21);
  expect(s.at(-1).key).toBe("f:end");
  // a folder's items come after its command, before the next command
  const idx = (k) => s.findIndex((x) => x.key === k);
  expect(idx("f:item:1:0")).toBeGreaterThan(idx("f:cmd:1"));
  expect(idx("f:item:1:4")).toBeLessThan(idx("f:cmd:2"));
});

for (const mode of ["columns", "folders"]) {
  test(`${mode}: steps never overlap, and type at their rate`, () => {
    const s = typingSchedule(mode, opts);
    for (let i = 1; i < s.length; i++) expect(s[i].start).toBeGreaterThanOrEqual(s[i - 1].end);
    for (const x of s) {
      expect(x.chars).toBe(x.text.length);
      if (x.key.includes(":p") || x.key.endsWith(":end")) expect(x.end).toBe(x.start); // prompts appear whole
      else if (x.key.includes(":cmd")) expect(x.end - x.start).toBe(x.chars * opts.cmdMs);
      else expect(x.end - x.start).toBe(x.chars * opts.outMs);
    }
  });

  test(`${mode}: typedChars runs from nothing to everything`, () => {
    const s = typingSchedule(mode, opts);
    const at0 = typedChars(s, 0);
    for (const x of s) if (x.start > 0) expect(at0.get(x.key)).toBe(0);
    const atEnd = typedChars(s, scheduleEnd(s));
    for (const x of s) expect(atEnd.get(x.key)).toBe(x.chars);
    for (let t = 0; t <= scheduleEnd(s) + 100; t += 37) {
      const m = typedChars(s, t);
      for (const x of s) {
        expect(m.get(x.key)).toBeGreaterThanOrEqual(0);
        expect(m.get(x.key)).toBeLessThanOrEqual(x.chars);
      }
    }
  });
}

test("the whole thing types in under 4.5 s with the defaults", () => {
  expect(scheduleEnd(typingSchedule("columns"))).toBeLessThan(4500);
  expect(scheduleEnd(typingSchedule("folders"))).toBeLessThan(4500);
});
