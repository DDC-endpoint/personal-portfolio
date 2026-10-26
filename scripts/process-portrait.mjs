// Hero portrait pipeline — turns Damian's studio headshot into the keyed,
// EXIF-free cutout the ASCII portrait samples (public/hero/portrait.webp).
// Ported from docs/v3/spike/process-headshot.cjs; constants are locked in
// docs/v3/hero-portrait.md → Source image.
//
// Usage: node scripts/process-portrait.mjs "<path to the studio headshot PNG>"
// The original stays OUTSIDE the repo — never copy it in. sharp strips all
// metadata unless withMetadata() is called, so the output carries none.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = process.argv[2];
if (!SRC) {
  console.error('usage: node scripts/process-portrait.mjs "<source.png>"');
  process.exit(1);
}
const OUT = "public/hero/portrait.webp";

// Source is 1121×1403. Its full width is scaled to 92% of an 800×1000 frame
// and centred, so both shoulders sit inside the frame (the photo's own cut
// edges land in the portrait's fade zone).
const FW = 800, FH = 1000, SRC_W = 1121, SRC_H = 1403;
const s = (FW * 0.92) / SRC_W;
const SW = Math.round(SRC_W * s), SH = Math.round(SRC_H * s);
const ox = Math.round((FW - SW) / 2), oy = 31;

const { data, info } = await sharp(SRC)
  .resize(SW, SH)
  .linear(1.1, -10)
  .modulate({ saturation: 1.05 })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const px = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];

// Background colour = median of the two top 30×30 corners.
const samples = [];
for (let y = 0; y < 30; y++) {
  for (let x = 0; x < 30; x++) samples.push(px(y * W + x), px(y * W + W - 1 - x));
}
const bg = [0, 1, 2].map((c) => samples.map((q) => q[c]).sort((a, b) => a - b)[samples.length >> 1]);
const dist = (i) => {
  const p = px(i);
  return Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]);
};

// Flood-fill the background from the frame border. The shirt/collar region
// (original-photo coords x 432–719, y > 666) is never keyed: the light-blue
// collar is too close to the grey backdrop.
const protectedArea = (x, y) => x > 432 * s && x < 719 * s && y > 666 * s;
const T = 22;
const mask = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const i = stack.pop();
  if (mask[i] || dist(i) > T) continue;
  const x = i % W, y = (i / W) | 0;
  if (protectedArea(x, y)) continue;
  mask[i] = 1;
  if (x > 0) stack.push(i - 1);
  if (x < W - 1) stack.push(i + 1);
  if (y > 0) stack.push(i - W);
  if (y < H - 1) stack.push(i + W);
}

// Feather the mask by 1.2 px, then assemble RGBA.
const alpha = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) alpha[i] = mask[i] ? 0 : 255;
const feathered = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } })
  .blur(1.2)
  .extractChannel(0)
  .raw()
  .toBuffer();
const rgba = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  rgba[i * 4] = data[i * 3];
  rgba[i * 4 + 1] = data[i * 3 + 1];
  rgba[i * 4 + 2] = data[i * 3 + 2];
  rgba[i * 4 + 3] = feathered[i];
}
const subject = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();

await mkdir("public/hero", { recursive: true });
await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: subject, left: ox, top: oy }])
  .webp({ quality: 85, alphaQuality: 90 })
  .toFile(OUT);
console.log(`${OUT}: subject ${W}×${H} at ${ox},${oy}, background ${bg.join(",")}`);
