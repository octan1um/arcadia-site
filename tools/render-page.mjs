// Render the whole page at the four widths every visual change on this site is checked at, and
// print the numbers that matter: page height, overflow, the largest image as drawn, console
// errors, any request that leaves the local server, images without alt text, heading order, and
// every in-page anchor. Full-page screenshots plus an above-the-fold shot per width go to OUT.
//
//   LD_LIBRARY_PATH=/home/node/.openclaw/browser-libs/lib \
//   BASE=http://127.0.0.1:8099 OUT=tools/renders node tools/render-page.mjs
//
// Renders are evidence for a PR, not source: tools/renders/ is git-ignored.
import { chromium } from '/home/node/.openclaw/workspace/imgtool/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.OUT || 'tools/renders';
const BASE = (process.env.BASE || 'http://127.0.0.1:8099').replace(/\/$/, '');
const LABEL = process.env.LABEL ? process.env.LABEL + '-' : '';
const MOTION = process.env.MOTION || 'no-preference';
const CHROME = '/home/node/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';

const VIEWS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1200x670', width: 1200, height: 670 },
  { name: '412x915', width: 412, height: 915 },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const localHost = new URL(BASE).host;

async function audit(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const overflow = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const over = r.right > vw + 1 || r.left < -1;
      if (over) {
        const cls = typeof el.className === 'string' && el.className.trim()
          ? '.' + el.className.trim().split(/\s+/).join('.') : '';
        overflow.push(`${el.tagName.toLowerCase()}${cls}`);
      }
    });
    let largest = null;
    document.querySelectorAll('img, video').forEach((el) => {
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (!largest || area > largest.area) {
        largest = {
          area,
          tag: el.tagName.toLowerCase(),
          src: (el.currentSrc || el.src || '').split('/').slice(-2).join('/'),
          drawn: `${Math.round(r.width)}x${Math.round(r.height)}`,
          natural: el.naturalWidth ? `${el.naturalWidth}x${el.naturalHeight}` : `${el.videoWidth}x${el.videoHeight}`,
        };
      }
    });
    const noAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt'))
      .map((i) => i.getAttribute('src'));
    const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]));
    const skips = [];
    heads.forEach((lvl, i) => { if (i && lvl > heads[i - 1] + 1) skips.push(`${heads[i - 1]}->${lvl}@${i}`); });
    const anchors = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href'));
    const deadAnchors = anchors.filter((h) => h !== '#' && !document.querySelector(h));
    const todos = [...document.querySelectorAll('[data-todo]')].map((e) => e.getAttribute('data-todo'));
    return {
      vw,
      pageHeight: document.documentElement.scrollHeight,
      docScrollWidth: document.documentElement.scrollWidth,
      overflow,
      largest,
      noAlt,
      h1Count: document.querySelectorAll('h1').length,
      headingSkips: skips,
      anchors: anchors.length,
      deadAnchors,
      todos,
    };
  });
}

for (const v of VIEWS) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, reducedMotion: MOTION });
  const errors = [];
  const external = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => { if (new URL(r.url()).host !== localHost) external.push(r.url()); });
  page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')));
  await page.waitForTimeout(2800);
  const a = await audit(page);
  await page.screenshot({ path: `${OUT}/${LABEL}fold-${v.name}.png` });
  await page.screenshot({ path: `${OUT}/${LABEL}full-${v.name}.png`, fullPage: true });
  console.log(JSON.stringify({ view: v.name, motion: MOTION, ...a, consoleErrors: errors, externalRequests: external }));
  await page.close();
}

// The privacy policy is the URL Play requires; it has to keep working.
for (const v of [VIEWS[1], VIEWS[3]]) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, reducedMotion: MOTION });
  const errors = [];
  const external = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => { if (new URL(r.url()).host !== localHost) external.push(r.url()); });
  await page.goto(`${BASE}/privacy-policy.html`, { waitUntil: 'load' });
  const info = await page.evaluate(() => ({
    title: document.title,
    pageHeight: document.documentElement.scrollHeight,
    docScrollWidth: document.documentElement.scrollWidth,
    vw: document.documentElement.clientWidth,
    h2s: document.querySelectorAll('h2').length,
  }));
  await page.screenshot({ path: `${OUT}/${LABEL}privacy-${v.name}.png`, fullPage: true });
  console.log(JSON.stringify({ page: 'privacy-policy', view: v.name, ...info, consoleErrors: errors, externalRequests: external }));
  await page.close();
}
await browser.close();
