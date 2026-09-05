// Optional browser verification. Reuse an installed Playwright runtime without adding app dependencies:
// node tests/browser-audit.mjs /path/to/playwright-core/index.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, extname, resolve, sep, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runtime = process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright';
const { chromium } = await import(runtime).catch(error => {
  throw new Error('Browser audit needs Playwright. Pass an existing playwright-core/index.mjs path as the first argument.', { cause: error });
});
const screenshots = resolve(root, 'static/qa/minimal');
await mkdir(screenshots, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!target.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const body = await readFile(target);
    response.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream' }).end(body);
  } catch { response.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const errors = [];
const messages = [];
const record = description => messages.push(description);
const contexts = [];
async function newContext(options) {
  const context = await browser.newContext(options);
  context.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(url) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
  });
  contexts.push(context);
  return context;
}
async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  assert.ok(sizes.content <= sizes.viewport + 1, `Horizontal overflow: ${JSON.stringify(sizes)}`);
}
async function loadVisibleImages(page) {
  for (const image of await page.locator('img:visible').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(element => element.decode());
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}
async function assertFilter(page, filter, count) {
  await page.waitForFunction(({ filter, count }) => {
    const projects = [...document.querySelectorAll('[data-category]')];
    const shown = projects.filter(project => !project.hidden && getComputedStyle(project).display !== 'none');
    return shown.length === count && document.querySelector(`[data-filter="${filter}"]`)?.getAttribute('aria-pressed') === 'true' && shown.every(project => filter === 'all' || project.dataset.category === filter);
  }, { filter, count });
  assert.equal(await page.locator('[data-filter][aria-pressed="true"]').count(), 1);
}

try {
  const desktop = await newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await desktop.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copiedEmail = text; } } });
  });
  const page = await desktop.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await noOverflow(page);
  await loadVisibleImages(page);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').getAttribute('href'), '#main-content', 'The first Tab must reach the skip link.');
  await page.locator(':focus').evaluate(element => element.blur());
  assert.equal(await page.locator('#primary-links').isVisible(), true, 'Desktop navigation must be visible.');
  await page.screenshot({ path: join(screenshots, 'desktop-top.png') });
  await page.screenshot({ path: join(screenshots, 'desktop-full.png'), fullPage: true });
  record('Desktop layout, decoded images, skip link, and navigation');

  const archive = page.locator('details').filter({ has: page.locator('[data-category]') });
  assert.equal(await archive.count(), 1, 'Archive projects must share one native disclosure.');
  if (!await archive.evaluate(element => element.open)) await archive.locator('summary').press('Enter');
  await assertFilter(page, 'all', 9);
  await page.locator('[data-filter="platform"]').click();
  await assertFilter(page, 'platform', 4);
  assert.equal(new URL(page.url()).searchParams.get('filter'), 'platform');
  await page.locator('[data-filter="games"]').click();
  await assertFilter(page, 'games', 2);
  await page.goBack();
  await assertFilter(page, 'platform', 4);
  await page.goForward();
  await assertFilter(page, 'games', 2);
  await page.goto(`${url}/?campaign=review&filter=ai#projects`, { waitUntil: 'networkidle' });
  await assertFilter(page, 'ai', 3);
  assert.equal(await archive.evaluate(element => element.open), true, 'A filtered deep link must expose the archive.');
  await page.locator('[data-filter="platform"]').click();
  assert.equal(new URL(page.url()).searchParams.get('campaign'), 'review', 'Filtering must preserve other query parameters.');
  assert.equal(new URL(page.url()).hash, '#projects', 'Filtering must preserve the section hash.');
  await page.goto(`${url}/?filter=invalid#projects`, { waitUntil: 'networkidle' });
  await assertFilter(page, 'all', 9);
  record('All archive filters, deep links, invalid values, and browser back/forward');

  await page.locator('#copy-email').click();
  assert.equal(await page.evaluate(() => window.__copiedEmail), 'annas.adharuqudni@gmail.com');
  assert.match(await page.locator('#contact-status').innerText(), /copied/i);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Clipboard unavailable'); } } });
  });
  await page.locator('#copy-email').click();
  assert.ok((await page.locator('#contact-status').innerText()).trim(), 'Clipboard failure needs feedback.');
  assert.equal(await page.locator('a[href="mailto:annas.adharuqudni@gmail.com"]').first().isVisible(), true);
  record('Copy email success and failure feedback');

  for (const size of [{ width: 390, height: 844 }, { width: 320, height: 740 }]) {
    const mobile = await newContext({ viewport: size, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const small = await mobile.newPage();
    await small.goto(url, { waitUntil: 'networkidle' });
    await noOverflow(small);
    await loadVisibleImages(small);
    const toggle = small.locator('#nav-toggle');
    assert.equal(await toggle.isVisible(), true);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await small.locator('#primary-links').isVisible(), false);
    await small.screenshot({ path: join(screenshots, `mobile-${size.width}-top.png`) });
    await small.screenshot({ path: join(screenshots, `mobile-${size.width}-full.png`), fullPage: true });
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await small.locator('#primary-links').isVisible(), true);
    await small.keyboard.press('Escape');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await small.locator(':focus').getAttribute('id'), 'nav-toggle');
    await toggle.click();
    await small.locator('#primary-links a[href="#projects"]').click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(new URL(small.url()).hash, '#projects');
    await small.setViewportSize({ width: 1280, height: 900 });
    assert.equal(await small.locator('#primary-links').isVisible(), true);
    await small.setViewportSize(size);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await noOverflow(small);
    record(`${size.width}px layout, disclosure navigation, Escape, anchor close, and resize`);
  }

  const noScript = await newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const plain = await noScript.newPage();
  await plain.goto(url, { waitUntil: 'networkidle' });
  await noOverflow(plain);
  assert.equal(await plain.locator('#primary-links a[href="#projects"]').isVisible(), true, 'Navigation must work without JavaScript.');
  const plainArchive = plain.locator('details').filter({ has: plain.locator('[data-category]') });
  if (!await plainArchive.getAttribute('open').then(value => value !== null)) await plainArchive.locator('summary').click();
  assert.equal(await plain.locator('[data-category]:visible').count(), 9, 'All archive projects must be available without JavaScript.');
  const certifications = plain.locator('#certifications');
  const certDetails = certifications.locator('details');
  if (await certDetails.count() && await certDetails.getAttribute('open') === null) await certDetails.locator('summary').click();
  assert.ok((await certifications.innerText()).trim().length > 150, 'Certificates must be server-rendered content.');
  assert.equal(await plain.locator('a[href="mailto:annas.adharuqudni@gmail.com"]').first().isVisible(), true);
  record('No-JavaScript navigation, archive, certifications, and contact');
  assert.equal(await plain.locator('.story-chapter:visible').count(), 3, 'No JavaScript must preserve all chapters.');
  await Promise.all(contexts.map(context => context.close()));
  contexts.length = 0;

  const immersive = await newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await immersive.addInitScript(() => {
    window.__webglDraws = 0;
    for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!type) continue;
      for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
        const original = type.prototype[name];
        if (typeof original !== 'function') continue;
        type.prototype[name] = function(...args) { window.__webglDraws++; return original.apply(this, args); };
      }
    }
  });
  const storyPage = await immersive.newPage();
  await storyPage.goto(url, { waitUntil: 'networkidle' });
  await storyPage.locator('#approach').scrollIntoViewIfNeeded();
  await storyPage.waitForFunction(() => document.querySelector('#approach').classList.contains('is-immersive'), null, { timeout: 15000 });
  const canvas = storyPage.locator('.story-visual canvas');
  assert.equal(await canvas.count(), 1, 'The story must have a real 3D canvas.');
  for (const chapter of [0, 1, 2, 0]) {
    await storyPage.locator('[data-story-jump="' + chapter + '"]').click();
    await storyPage.waitForFunction(chapter => document.querySelector('[data-story-jump="' + chapter + '"]').getAttribute('aria-pressed') === 'true', chapter);
    assert.equal(await storyPage.locator('.story-chapter[data-chapter="' + chapter + '"]').isVisible(), true);
  }
  await storyPage.screenshot({ path: join(screenshots, 'story-fullstack.png') });
  await storyPage.locator('#story-motion').click();
  assert.equal(await storyPage.locator('#story-motion').getAttribute('aria-pressed'), 'true');
  const frozenDrawCount = await storyPage.evaluate(() => window.__webglDraws);
  assert.ok(frozenDrawCount > 0, 'The scene must make real WebGL drawing calls.');
  await storyPage.locator('[data-story-jump="1"]').click();
  await storyPage.waitForFunction(() => document.querySelector('[data-story-jump="1"]').getAttribute('aria-pressed') === 'true');
  assert.equal(await storyPage.evaluate(() => window.__webglDraws), frozenDrawCount, 'Pausing motion must stop WebGL drawing while keeping chapters usable.');
  await storyPage.locator('#story-motion').click();
  await storyPage.locator('[data-story-jump="2"]').click();
  await storyPage.waitForFunction(() => document.querySelector('[data-story-jump="2"]').getAttribute('aria-pressed') === 'true');
  await storyPage.screenshot({ path: join(screenshots, 'story-ai.png') });
  await storyPage.emulateMedia({ reducedMotion: 'reduce' });
  await storyPage.waitForFunction(() => !document.querySelector('#approach').classList.contains('is-immersive'));
  assert.equal(await storyPage.locator('.story-chapter:visible').count(), 3, 'Reduced motion must expose the complete static story.');
  record('Real 3D story, chapter navigation, reverse scrolling, pause, and live reduced-motion fallback');
  await storyPage.emulateMedia({ reducedMotion: 'no-preference' });
  await storyPage.locator('#approach').scrollIntoViewIfNeeded();
  await storyPage.waitForFunction(() => document.querySelector('#approach').classList.contains('is-immersive'));
  for (const size of [{ width: 390, height: 844 }, { width: 320, height: 740 }]) {
    await storyPage.setViewportSize(size);
    for (const chapter of [0, 1, 2]) {
      await storyPage.locator(`[data-story-jump="${chapter}"]`).click();
      await storyPage.waitForFunction(chapter => document.querySelector(`[data-story-jump="${chapter}"]`).getAttribute('aria-pressed') === 'true', chapter);
      const bounds = await storyPage.locator(`[data-chapter="${chapter}"]`).boundingBox();
      const controls = await storyPage.locator('.story-bottom').boundingBox();
      assert.ok(bounds.y >= 60 && bounds.y + bounds.height < controls.y, 'Mobile story text must fit above controls.');
      await noOverflow(storyPage);
      await storyPage.screenshot({ path: join(screenshots, `story-${size.width}-${chapter}.png`) });
    }
  }
  await storyPage.setViewportSize({ width: 844, height: 390 });
  await storyPage.waitForFunction(() => !document.querySelector('#approach').classList.contains('is-immersive'));
  assert.equal(await storyPage.locator('.story-chapter:visible').count(), 3, 'Short viewports must expose all chapters.');
  await storyPage.setViewportSize({ width: 1440, height: 900 });
  await storyPage.locator('#approach').scrollIntoViewIfNeeded();
  await storyPage.waitForFunction(() => document.querySelector('#approach').classList.contains('is-immersive'));
  await canvas.evaluate(element => element.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  assert.equal(await canvas.count(), 0, 'A lost WebGL context must release its canvas.');
  assert.equal(await storyPage.locator('.story-chapter:visible').count(), 3, 'WebGL failure must expose all chapters.');
  record('Motion re-enable, mobile 3D at 390px and 320px, short viewport, and WebGL loss fallback');
  assert.deepEqual(errors, [], 'No page exceptions or failed local requests.');
  console.log(`Browser audit passed (${messages.length} groups):\n${messages.map(message => `- ${message}`).join('\n')}\nScreenshots: ${screenshots}`);
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
