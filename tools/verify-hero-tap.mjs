// The hero's hold target must sit on the Google Home icon it claims to press.
//
// This has gone wrong twice. The press ring once sat between the dock's two rows and opened
// Google Home's panel from the Android icon below it; and on 2026-10-03 I "fixed" an alignment
// that was already correct, because `.press` and `.hold` carry a negative margin-left that
// already centres them, so subtracting half the width again moved them a whole icon left.
//
// So the icon's position is measured from the screenshot once, written down here, and checked
// against the rendered page. A number in a comment drifts; a number in a check does not.
//
//   assets/home-cover.png is 838x1877. The Google Home icon in the first dock row spans
//   x 339-405 and y 1641-1703, so its centre is x 44.39%, y 89.08% of the screen.
import { chromium } from '/tmp/node_modules/playwright/index.mjs';

const ICON = { cx: 44.39, cy: 89.08 };
const TOLERANCE = 2.0;            // percent of the screen element, about a third of an icon
const BASE = process.env.BASE || 'http://127.0.0.1:8099/index.html';
const CHROME = '/home/node/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';

const browser = await chromium.launch({ executablePath: CHROME });
let failed = 0;

for (const width of [1920, 1440, 1200, 412]) {
  for (const motion of ['no-preference', 'reduce']) {
    const page = await browser.newPage({
      viewport: { width, height: width < 600 ? 900 : 1200 },
      reducedMotion: motion,
    });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')));
    await page.waitForTimeout(1200);

    const seen = await page.evaluate(() => {
      const screen = document.querySelector('.demo .screen');
      if (!screen) return null;
      const sr = screen.getBoundingClientRect();
      const hold = document.querySelector('.demo .hold');
      if (!hold) return null;
      const hr = hold.getBoundingClientRect();
      // A scale transform is about the centre, so the centre of the painted rect is exact even
      // mid-animation. Measuring the edges is what produced a wrong answer before.
      return {
        cx: (hr.left + hr.width / 2 - sr.left) / sr.width * 100,
        cy: (hr.top + hr.height / 2 - sr.top) / sr.height * 100,
        w: hr.width,
      };
    });
    await page.close();

    if (!seen) { console.log(`${width}px ${motion}: hero demo not present`); continue; }
    if (seen.w <= 0) { console.log(`${width}px ${motion}: hold target has no size`); failed++; continue; }
    const dx = Math.abs(seen.cx - ICON.cx);
    const dy = Math.abs(seen.cy - ICON.cy);
    const ok = dx < TOLERANCE && dy < TOLERANCE;
    if (!ok) failed++;
    console.log(
      `${String(width).padStart(4)}px ${motion.padEnd(13)} hold centre ` +
      `${seen.cx.toFixed(2)}%, ${seen.cy.toFixed(2)}%  off ${dx.toFixed(2)}, ${dy.toFixed(2)}  ` +
      (ok ? 'on the icon' : 'MISSES THE ICON'),
    );
  }
}

await browser.close();
console.log(failed ? `\nFAIL: ${failed} placement(s) miss the icon` : '\nPASS: the hold target is on the icon at every width');
process.exit(failed ? 1 : 0);
