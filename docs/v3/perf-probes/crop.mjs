// Side-by-side 3x crops of the same region from two screenshots.
import { createRequire } from "node:module";
const sharp = createRequire(import.meta.url)("sharp");
const [a, b, out, x, y, w, h] = process.argv.slice(2);
const r = { left: +x, top: +y, width: +w, height: +h };
const [ca, cb] = await Promise.all([a, b].map((f) => sharp(f).extract(r).resize({ width: +w * 3, kernel: "nearest" }).png().toBuffer()));
await sharp({ create: { width: +w * 6 + 12, height: +h * 3, channels: 3, background: "#ff00ff" } })
  .composite([{ input: ca, left: 0, top: 0 }, { input: cb, left: +w * 3 + 12, top: 0 }]).png().toFile(out);
