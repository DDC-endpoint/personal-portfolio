const sharp = require('sharp');
// Usage: node process-headshot.cjs <source-headshot.png> <out-dir>
// Needs sharp. Writes <out-dir>/cutout.png (transparent) and cutout-preview.jpg.
const path = require('path');
const [SRC, OUT = '.'] = process.argv.slice(2);
if (!SRC) { console.error('usage: node process-headshot.cjs <source.png> [out-dir]'); process.exit(1); }
(async () => {
  // full width of the photo, scaled to 92% of an 800x1000 frame, centred, so both shoulders sit inside the frame
  const FW = 800, FH = 1000, s = (FW * 0.92) / 1121;
  const SW = Math.round(1121 * s), SH = Math.round(1403 * s), ox = Math.round((FW - SW) / 2), oy = 31;
  const { data, info } = await sharp(SRC).resize(SW, SH).linear(1.1, -10).modulate({ saturation: 1.05 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, px = (i) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
  const samp = []; for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) { samp.push(px(y * W + x)); samp.push(px(y * W + W - 1 - x)); }
  const bg = [0, 1, 2].map((c) => samp.map((q) => q[c]).sort((a, b) => a - b)[samp.length >> 1]);
  const dist = (i) => { const p = px(i); return Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]); };
  // shirt + collar region (original-photo coords x 432–719, y > 666) is never keyed
  const prot = (x, y) => x > 432 * s && x < 719 * s && y > 666 * s;
  const T = 22, mask = new Uint8Array(W * H), stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x); for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const i = stack.pop(); if (mask[i] || dist(i) > T) continue;
    const x = i % W, y = (i / W) | 0; if (prot(x, y)) continue;
    mask[i] = 1;
    if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1); if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W);
  }
  const a = Buffer.alloc(W * H); for (let i = 0; i < W * H; i++) a[i] = mask[i] ? 0 : 255;
  const aB = await sharp(a, { raw: { width: W, height: H, channels: 1 } }).blur(1.2).extractChannel(0).raw().toBuffer();
  const sub = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { sub[i * 4] = data[i * 3]; sub[i * 4 + 1] = data[i * 3 + 1]; sub[i * 4 + 2] = data[i * 3 + 2]; sub[i * 4 + 3] = aB[i]; }
  const subPng = await sharp(sub, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: subPng, left: ox, top: oy }]).png().toFile(path.join(OUT, 'cutout.png'));
  await sharp(path.join(OUT, 'cutout.png')).flatten({ background: '#F6F6F1' }).jpeg().toFile(path.join(OUT, 'cutout-preview.jpg'));
  console.log('subject', W, H, 'at', ox, oy, 'bg', bg);
})();
