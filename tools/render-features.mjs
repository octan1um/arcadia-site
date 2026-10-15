// The three explained features (#features) are CSS animations that app.js pauses while they
// are off screen, so a full-page render of the page shows their first frame, which is an
// empty wallpaper. This scrolls them into view, checks that the observer lets them run, and
// then captures exact frames of the 7-second loop by pausing every animation in the grid and
// setting its current time, so the sequence can be read rather than reasoned about. Also
// captures the reduced-motion still, which has to be the fully open state.
//
//   LD_LIBRARY_PATH=/home/node/.openclaw/browser-libs/lib \
//   BASE=http://127.0.0.1:8099 OUT=tools/renders node tools/render-features.mjs
import { chromium } from '/home/node/.openclaw/workspace/imgtool/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.OUT || 'tools/renders';
const BASE = (process.env.BASE || 'http://127.0.0.1:8099').replace(/\/$/, '');
const CHROME = '/home/node/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';
// seconds into the loop: arriving, pressing, opening, open, panning, closing, reset
const FRAMES = [0.5, 1.0, 1.6, 3.0, 4.6, 5.9, 6.6];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });

async function open(view, motion) {
  const page = await browser.newPage({ viewport: view, reducedMotion: motion });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')));
  // the page scrolls smoothly, which would leave the grid mid-flight when it is measured
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelector('#features .explain-grid').scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  await page.waitForTimeout(1000);
  const idle = await page.evaluate(() => [...document.querySelectorAll('[data-anim]')].map((e) => e.classList.contains('idle')));
  return { page, errors, idle };
}

async function seek(page, seconds) {
  return page.evaluate((s) => {
    const grid = document.querySelector('#features .explain-grid');
    let n = 0;
    document.getAnimations().forEach((a) => {
      const t = a.effect && a.effect.target;
      if (!t || !grid.contains(t)) return;
      a.pause(); a.currentTime = s * 1000; n++;
    });
    return n;
  }, seconds);
}

// desktop: the whole grid fits the viewport, one clip per frame
{
  const { page, errors, idle } = await open({ width: 1440, height: 900 }, 'no-preference');
  const box = await page.locator('#features .explain-grid').boundingBox();
  const counts = {};
  for (const s of FRAMES) {
    counts[s] = await seek(page, s);
    await page.waitForTimeout(80);
    await page.screenshot({ path: `${OUT}/features-1440-t${s.toFixed(1)}s.png`, clip: box });
  }
  console.log(JSON.stringify({ view: '1440x900', idleAfterScroll: idle, animationsSeeked: counts, grid: box, consoleErrors: errors }));
  await page.close();
}
// phone: each stage on its own, fully open
{
  const { page, errors, idle } = await open({ width: 412, height: 915 }, 'no-preference');
  const stages = page.locator('[data-anim]');
  const n = await stages.count();
  await seek(page, 4.0);
  for (let i = 0; i < n; i++) {
    await stages.nth(i).scrollIntoViewIfNeeded();
    await stages.nth(i).screenshot({ path: `${OUT}/features-412-stage${i + 1}.png` });
  }
  console.log(JSON.stringify({ view: '412x915', idleAfterScroll: idle, stages: n, consoleErrors: errors }));
  await page.close();
}
// reduced motion: the still each stage becomes
{
  const { page, errors } = await open({ width: 1440, height: 900 }, 'reduce');
  const box = await page.locator('#features .explain-grid').boundingBox();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/features-1440-reduced.png`, clip: box });
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  console.log(JSON.stringify({ view: '1440x900', motion: 'reduce', runningAnimations: running, consoleErrors: errors }));
  await page.close();
}
await browser.close();
