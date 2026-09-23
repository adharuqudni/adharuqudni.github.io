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
const screenshots = resolve(root, 'static/qa/aerospace');
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
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
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

  const orbital = await newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await orbital.addInitScript(() => {
    window.__earthDraws = 0;
    for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!type) continue;
      const original = type.prototype.drawElements;
      type.prototype.drawElements = function(...args) { window.__earthDraws++; return original.apply(this, args); };
    }
  });
  const orbitPage = await orbital.newPage();
  orbitPage.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await orbitPage.goto(url, { waitUntil: 'networkidle' });
  assert.equal(await orbitPage.locator('.orbit-map').count(), 0);
  await orbitPage.waitForSelector('.has-earth canvas');
  await orbitPage.waitForFunction(() => window.__earthDraws > 20);
  assert.equal(await orbitPage.locator('#earth-canvas canvas').count(), 1);
  await orbitPage.locator('#earth-pause').click();
  assert.equal(await orbitPage.locator('#earth-pause').getAttribute('aria-pressed'), 'true');
  await orbitPage.waitForTimeout(100);
  const draws = await orbitPage.evaluate(() => window.__earthDraws);
  await orbitPage.waitForTimeout(200);
  assert.equal(await orbitPage.evaluate(() => window.__earthDraws), draws, 'Pause must stop rendering.');
  await orbitPage.locator('#earth-canvas canvas').focus();
  await orbitPage.keyboard.press('ArrowRight');
  assert.ok(await orbitPage.evaluate(() => window.__earthDraws) > draws, 'Keyboard interaction must redraw a paused globe.');
  await orbitPage.locator('#earth-reset').click();
  await orbitPage.screenshot({ path: join(screenshots, 'earth-desktop.png') });
  for (const width of [320,390,768,1024,1440]) {
    await orbitPage.setViewportSize({ width, height: 900 });
    await noOverflow(orbitPage);
    const globe = await orbitPage.locator('#earth-canvas').boundingBox();
    const copy = await orbitPage.locator('.hero-copy').boundingBox();
    assert.ok(globe.width > 250 && globe.height > 250);
    if(width <= 760) assert.ok(globe.y >= copy.y+copy.height, 'Mobile globe must not overlap hero copy.');
    if(width===390) {
      await orbitPage.locator('#earth-canvas').scrollIntoViewIfNeeded();
      await orbitPage.screenshot({ path: join(screenshots, 'earth-mobile.png') });
    }
  }
  await orbitPage.locator('#earth-pause').click();
  const monoText = await orbitPage.locator('body *').evaluateAll(elements => elements.filter(el => el.textContent.trim() && /monospace|JetBrains/i.test(getComputedStyle(el).fontFamily)).map(el => el.tagName));
  assert.deepEqual(monoText, [], 'No monospaced text should remain.');
  assert.equal(await orbitPage.locator('canvas').count(), 1, 'Only the Earth scene should load.');
  assert.equal(await orbitPage.locator('.story-chapter:visible').count(), 3);
  await orbitPage.emulateMedia({ reducedMotion: 'reduce' });
  await orbitPage.waitForFunction(() => !document.querySelector('.has-earth'));
  assert.equal(await orbitPage.locator('canvas').count(), 0);
  assert.match(await orbitPage.locator('.hero').evaluate(el => getComputedStyle(el, '::before').backgroundImage), /space-earth\.webp/);
  assert.equal(await orbitPage.locator('.hero').evaluate(el => getComputedStyle(el).animationName), 'none');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await orbitPage.setViewportSize({ width, height: 900 });
    await noOverflow(orbitPage);
    assert.equal(await orbitPage.locator('.story-chapter:visible').count(), 3);
  }
  await orbitPage.setViewportSize({ width: 1440, height: 900 });
  await orbitPage.locator('#primary-links a[href="#journey"]').click();
  await orbitPage.waitForFunction(() => document.querySelector('#primary-links a[href="#journey"]').getAttribute('aria-current') === 'location');
  await orbitPage.locator('header .wordmark').click();
  await orbitPage.waitForFunction(() => !document.querySelector('#primary-links a[aria-current]'));
  await orbitPage.locator('.trajectory-link').click();
  await assertFilter(orbitPage, 'platform', 4);
  assert.equal(await orbitPage.locator('#project-archive').evaluate(el => el.open), true);
  await orbitPage.emulateMedia({ reducedMotion: 'no-preference' });
  await orbitPage.locator('header .wordmark').click();
  await orbitPage.waitForSelector('.has-earth canvas');
  await orbitPage.locator('#earth-canvas canvas').evaluate(el => el.dispatchEvent(new Event('webglcontextlost', { cancelable:true })));
  await orbitPage.waitForFunction(() => !document.querySelector('.has-earth'));
  assert.equal(await orbitPage.locator('canvas').count(), 0);
  record('3D Earth rendering, pause, keyboard rotation, responsive framing, reduced motion, context loss, and navigation');
  assert.deepEqual(errors, [], 'No page exceptions or failed local requests.');
  console.log(`Browser audit passed (${messages.length} groups):\n${messages.map(message => `- ${message}`).join('\n')}\nScreenshots: ${screenshots}`);
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
