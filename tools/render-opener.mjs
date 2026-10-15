// Render the opener illustration at chosen moments of its loop, by seeking every animation on
// the page (document.getAnimations) and screenshotting .opener-art. Evidence for a PR, not source.
//
//   LD_LIBRARY_PATH=/home/node/.openclaw/browser-libs/lib \
//   BASE=http://127.0.0.1:8099 OUT=tools/renders node tools/render-opener.mjs 0.2 1.0 1.6 2.4 4 6.6 7.4
import { chromium } from '/home/node/.openclaw/workspace/imgtool/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
const OUT = process.env.OUT || 'tools/renders';
const BASE = (process.env.BASE || 'http://127.0.0.1:8099').replace(/\/$/, '');
const CHROME = '/home/node/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';
const times = process.argv.slice(2).map(Number);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
for (const [label, vw, vh] of [['1440', 1440, 900], ['412', 412, 915]]) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getAnimations().forEach(a => a.pause()));
  const art = page.locator('.opener-art');
  for (const t of times) {
    await page.evaluate((ms) => document.getAnimations().forEach(a => { a.currentTime = ms; }), t * 1000);
    await art.screenshot({ path: `${OUT}/opener-${label}-t${t}s.png` });
  }
  const n = await page.evaluate(() => document.getAnimations().filter(a => a.animationName && a.animationName.startsWith('opener')).length);
  console.log(JSON.stringify({ view: label, openerAnimations: n, frames: times.length }));
  await page.close();
}
await browser.close();
