// Build the Glass and Hue pictures for #looks from the two Home screenshots (16 Nov 2026,
// unfolded inner screen, 1923x2048 JPEG). Scaled only: no crop, no blur, no mask, so the
// screen keeps its own aspect. AVIF and WebP at 720 and 1440 wide (1x and 2x of the frame), with
// a JPEG fallback at the same widths. The originals stay out of the repo.
//
//   node tools/build-looks.mjs GLASS.jpg HUE.jpg
import { createRequire } from 'node:module';
const sharp = createRequire('/home/node/.openclaw/workspace/imgtool/')('sharp');
const [glass, hue] = process.argv.slice(2);
if (!glass || !hue) { console.error('usage: build-looks.mjs GLASS.jpg HUE.jpg'); process.exit(1); }
for (const [name, src] of [['glass', glass], ['hue', hue]]) {
  const meta = await sharp(src).metadata();
  for (const w of [720, 1440]) {
    const h = Math.round(w * meta.height / meta.width);
    const base = sharp(src).rotate().resize(w, h, { fit: 'fill', kernel: 'lanczos3' });
    await base.clone().avif({ quality: 58, effort: 6 }).toFile(`assets/w48/look-${name}-${w}.avif`);
    await base.clone().webp({ quality: 80, effort: 6 }).toFile(`assets/w48/look-${name}-${w}.webp`);
    await base.clone().jpeg({ quality: 80, mozjpeg: true, progressive: true }).toFile(`assets/w48/look-${name}-${w}.jpg`);
    console.log(name, `${meta.width}x${meta.height} -> ${w}x${h}`);
  }
}
