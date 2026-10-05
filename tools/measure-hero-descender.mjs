// Find gradient-filled text whose descenders are not painted.
//
// Text filled with `background-clip:text` is painted into the element's border box and then
// clipped to the glyph shapes, so any part of a glyph outside that box is simply not drawn. A
// block or inline-block box is line-height tall, and this site sets line-height below 1 on its
// display headings - so the tail of a "g" falls outside the box and vanishes, while the plain
// white words beside it, painted normally, overflow the same box quite happily and look fine.
//
// This walks every background-clip:text element that establishes its own box and prints the room
// it has below the baseline against the ink its glyphs actually need. Need > room means cut off.
import { chromium } from '/tmp/node_modules/playwright/index.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:8099/index.html';
const CHROME = '/home/node/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';
const VIEWS = [
  { name: '1920', width: 1920, height: 1080 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1200x670', width: 1200, height: 670 },
  { name: '412', width: 412, height: 915 },
];

const browser = await chromium.launch({ executablePath: CHROME });
let clipped = 0;

for (const v of VIEWS) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')));
  const rows = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const clip = cs.webkitBackgroundClip || cs.backgroundClip;
      if (clip !== 'text') continue;
      if (cs.display === 'inline') continue; // an inline box is font-sized, not line-height-sized
      const text = (el.textContent || '').trim();
      if (!text) continue;

      const box = el.getBoundingClientRect();
      const c = document.createElement('canvas').getContext('2d');
      c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

      // Only the last line can run past the bottom of the box, so measure that line: its own
      // rect from a Range, and the ink of its own text.
      const range = document.createRange();
      range.selectNodeContents(el);
      const lines = [...range.getClientRects()].filter((r) => r.height > 0);
      if (!lines.length) continue;
      const last = lines[lines.length - 1];
      // Worst-case ink over the whole string: which glyph lands on the last line depends on
      // wrapping, and over-estimating the descent can only ever raise a false alarm, never hide
      // a real one.
      const m = c.measureText(text);

      // Half-leading places the baseline this far below the top of the last line box.
      const baseline =
        last.top -
        box.top +
        (last.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 +
        m.fontBoundingBoxAscent;

      out.push({
        label: `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(/\s+/)[0] : ''} "${text.slice(0, 22)}"`,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        paddingBottom: cs.paddingBottom,
        room: +(box.height - baseline).toFixed(2),
        ink: +m.actualBoundingBoxDescent.toFixed(2),
      });
    }
    return out;
  });

  console.log(`\n── ${v.name} ──`);
  for (const r of rows) {
    const short = +(r.ink - r.room).toFixed(2);
    if (short > 0.5) clipped++;
    console.log(
      `  ${r.label.padEnd(44)} font ${r.fontSize.padEnd(8)} lh ${r.lineHeight.padEnd(9)} pb ${r.paddingBottom.padEnd(7)} ` +
        `room ${String(r.room).padEnd(7)} ink ${String(r.ink).padEnd(7)} -> ${short > 0.5 ? `CLIPPED by ${short}px` : 'ok'}`,
    );
  }
  await page.close();
}

await browser.close();
console.log(clipped ? `\n${clipped} clipped element/width pairs.` : '\nNo gradient text is clipped at any width.');
process.exit(clipped ? 1 : 0);
