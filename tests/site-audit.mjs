import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const index = read('index.html');
const styles = read('styles.css');
const dom = read('js/ui/dom.js');
const hud = read('js/ui/hud.js');
const journey = read('js/three/journey.js');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const imageTags = [...index.matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);
for (const tag of imageTags) {
  check(/\balt="[^"]*"/i.test(tag), `Image missing alt: ${tag}`);
  check(/\bwidth="\d+"/i.test(tag) && /\bheight="\d+"/i.test(tag), `Image missing dimensions: ${tag}`);
}

const blankLinks = [...index.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)].map(match => match[0]);
for (const tag of blankLinks) check(/\brel="[^"]*noopener[^"]*"/i.test(tag), `Blank-target link missing noopener: ${tag}`);

check(/id="journey-stage"[^>]*role="region"[^>]*tabindex="0"/s.test(index), 'Career map must be a keyboard-focusable region.');
check(!/<(?:button|a)\b[^>]*aria-hidden="true"/i.test(index), 'Interactive elements must not be aria-hidden.');
check(/data-d="up"[^>]*aria-label="Move up"/s.test(index), 'D-pad controls need accessible names.');
check(/stage\.addEventListener\('focusin'/.test(journey), 'Career map must activate from keyboard focus.');
check(/e\.key !== 'Tab'/.test(hud) && /aria-modal/.test(hud), 'Quest log must trap focus as a modal dialog.');
check(/buildMarqueeCard\(c, true\)/.test(dom), 'Marquee clones must be hidden from assistive technology.');
check(styles.includes('--coral-text:') && styles.includes('scroll-margin-top:'), 'Accessible text color and anchor offset tokens are required.');
check(styles.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced-motion fallback is required.');
check(!/transition\s*:\s*all\b/i.test(styles), 'Do not use transition: all.');
check(!/outline\s*:\s*none\b/i.test(styles), 'Do not remove outlines without a replacement.');

const ids = [...index.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
check(duplicateIds.length === 0, `Duplicate IDs: ${[...new Set(duplicateIds)].join(', ')}`);

for (const match of index.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
  const value = match[1];
  if (/^(?:https?:|mailto:|#)/i.test(value)) continue;
  const localPath = value.split(/[?#]/)[0];
  check(existsSync(join(root, localPath)), `Missing local asset: ${localPath}`);
}

function collectJavaScript(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectJavaScript(path);
    return extname(entry.name) === '.js' ? [path] : [];
  });
}

for (const file of collectJavaScript(join(root, 'js'))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  check(result.status === 0, `JavaScript syntax error in ${file}: ${result.stderr.trim()}`);
}

if (failures.length) {
  console.error(`Site audit failed (${failures.length}):`);
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Site audit passed: ${imageTags.length} static images, ${ids.length} unique IDs, JavaScript syntax clean.`);
