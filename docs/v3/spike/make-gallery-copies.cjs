// Usage (from the repo root): node docs/v3/spike/make-gallery-copies.cjs
// Builds EXIF-free 900px web copies of the 10 gallery photos into docs/v3/spike/gal/ (gitignored)
// so gallery-mockup.html renders. Reads the 4 published photos from public/photography/ and the
// 6 new originals from assets/photography-originals/ (gitignored). Needs sharp (repo dependency).
const sharp = require('sharp'), fs = require('fs'), path = require('path');
const OUT = 'docs/v3/spike/gal';
// f-number = the file order the mockup expects (see design.md → Lens table for frame placement)
const files = [
  'IMG_20260503_071804386', 'IMG_20260415_173730095', 'IMG_20250511_192659821', 'IMG_20250905_165813446 (1)',
  'IMG_20260117_104051821', 'IMG_20260113_070907135', 'IMG_20260117_182647746', 'IMG_20260120_081200993',
  'IMG_20251010_181954209', 'IMG_20260912_173751573',
];
const find = (name) => ['public/photography', 'assets/photography-originals']
  .flatMap((d) => [path.join(d, name + '.jpg'), path.join(d, name + '.jpg.jpeg')]).find((p) => fs.existsSync(p));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [i, name] of files.entries()) {
    const src = find(name); if (!src) { console.error('missing', name); continue; }
    const out = path.join(OUT, 'f' + String(i + 1).padStart(2, '0') + '.jpg');
    await sharp(src).rotate().resize(900).jpeg({ quality: 78 }).toFile(out);   // sharp drops EXIF/GPS by default
    console.log(out, '<-', src);
  }
})();
