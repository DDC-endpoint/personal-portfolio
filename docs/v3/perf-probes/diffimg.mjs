// Amplified diff image of two screenshots: usage node diffimg.mjs a.png b.png out.png
import { createRequire } from "node:module";
const sharp = createRequire(import.meta.url)("sharp");
const [a, b, out] = process.argv.slice(2);
const [ia, ib] = await Promise.all([a, b].map((f) => sharp(f).raw().toBuffer({ resolveWithObject: true })));
const { width, height, channels } = ia.info;
const o = Buffer.alloc(width * height * 3);
let bbox = [width, height, 0, 0];
for (let p = 0, q = 0; p < ia.data.length; p += channels, q += 3) {
  const d = Math.max(Math.abs(ia.data[p] - ib.data[p]), Math.abs(ia.data[p + 1] - ib.data[p + 1]), Math.abs(ia.data[p + 2] - ib.data[p + 2]));
  const v = Math.min(255, d * 8);
  o[q] = v; o[q + 1] = d ? 40 : 0; o[q + 2] = 0;
  if (d) { const x = (q / 3) % width, y = Math.floor(q / 3 / width); bbox = [Math.min(bbox[0], x), Math.min(bbox[1], y), Math.max(bbox[2], x), Math.max(bbox[3], y)]; }
}
await sharp(o, { raw: { width, height, channels: 3 } }).png().toFile(out);
console.log("bbox of differences:", bbox.join(","));
