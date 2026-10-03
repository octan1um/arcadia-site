// Render the two rewritten sections (#fold, #widgets) plus an overflow sweep, at the four
// widths every visual change on this site is checked at. See the rendering notes: measure in
// CSS pixels, force .reveal into .in, and use a viewport taller than the section instead of
// element.screenshot() on anything tall.
import { chromium } from '/tmp/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.OUT || '/tmp/site-copy-shots';
const BASE = process.env.BASE || 'http://127.0.0.1:8099/index.html';
const CHROME = '/home/node/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';

const VIEWS = [
  { name: '1920', width: 1920, height: 2200 },
  { name: '1440', width: 1440, height: 2200 },
  { name: '1200x670', width: 1200, height: 670 },
  { name: '412', width: 412, height: 2400 },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });

for (const motion of ['no-preference', 'reduce']) {
  for (const v of VIEWS) {
    const page = await browser.newPage({
      viewport: { width: v.width, height: v.height },
      reducedMotion: motion,
    });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.evaluate(() => {
      document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'));
    });
    await page.waitForTimeout(2600);

    for (const id of ['fold', 'widgets']) {
      const box = await page.evaluate((sel) => {
        const el = document.getElementById(sel);
        const r = el.getBoundingClientRect();
        return { y: r.top + window.scrollY, h: r.height };
      }, id);
      // viewport taller than the section, then clip — never element.screenshot()
      await page.setViewportSize({ width: v.width, height: Math.ceil(box.h) + 80 });
      await page.evaluate((y) => window.scrollTo(0, y - 20), box.y);
      await page.waitForTimeout(400);
      await page.screenshot({
        path: `${OUT}/${id}-${v.name}-${motion}.png`,
        clip: { x: 0, y: 0, width: v.width, height: Math.ceil(box.h) + 60 },
      });
      await page.setViewportSize({ width: v.width, height: v.height });
    }

    const sweep = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const bad = [];
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        const over = r.right > vw + 1 || r.left < -1;
        const scroll = el.scrollWidth > el.clientWidth + 1;
        if (over || scroll) {
          bad.push(
            `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`,
          );
        }
      });
      return { docScroll: document.documentElement.scrollWidth, vw, bad };
    });
    const text = await page.evaluate(() => ({
      foldH2: document.querySelector('#fold h2').textContent.trim(),
      foldLede: document.querySelector('#fold .lede').textContent.replace(/\s+/g, ' ').trim(),
      widgetsH2: document.querySelector('#widgets h2').textContent.trim(),
      caps: [...document.querySelectorAll('#widgets figcaption, #fold figcaption')].map((c) =>
        c.textContent.replace(/\s+/g, ' ').trim(),
      ),
    }));
    console.log(
      JSON.stringify(
        { motion, view: v.name, docScroll: sweep.docScroll, vw: sweep.vw, overflow: sweep.bad.length, items: sweep.bad, text },
        null,
        1,
      ),
    );
    await page.close();
  }
}
await browser.close();
