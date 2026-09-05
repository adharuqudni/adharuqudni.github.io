import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(root, path), 'utf8');
const index = read('index.html');
const styles = read('styles.css');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const tags = name => [...index.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => match[0]);
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
const hasAttribute = (tag, name) => new RegExp(`\\s${name}(?:\\s|=|>)`, 'i').test(tag);
const stripMarkup = value => value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const content = stripMarkup(index);
const ids = [...index.matchAll(/\bid\s*=\s*(["'])(.*?)\1/g)].map(match => match[2]);
const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);

check(/<html\b[^>]*\blang=["']en["']/i.test(index), 'Declare the document language.');
check(/<meta\b[^>]*name=["']viewport["']/i.test(index), 'Include a responsive viewport.');
check(tags('h1').length === 1, 'Use exactly one primary heading.');
check(tags('main').some(tag => attribute(tag, 'id') === 'main-content'), 'Main content needs id="main-content".');
check(tags('a').some(tag => attribute(tag, 'href') === '#main-content'), 'Include a skip link to the main content.');
check(duplicateIds.length === 0, `Duplicate IDs: ${[...new Set(duplicateIds)].join(', ')}`);
for (const id of ['about', 'projects', 'journey', 'skills', 'contact', 'certifications', 'education']) {
  check(tags('section').some(tag => attribute(tag, 'id') === id), `Preserve the ${id} section.`);
}

const imageTags = tags('img');
for (const tag of imageTags) {
  check(attribute(tag, 'alt') !== undefined, `Image missing alt: ${tag}`);
  check(/^\d+$/.test(attribute(tag, 'width') ?? '') && /^\d+$/.test(attribute(tag, 'height') ?? ''), `Image missing dimensions: ${tag}`);
}
for (const tag of tags('a')) {
  const href = attribute(tag, 'href');
  check(href !== undefined && href !== '', `Link missing destination: ${tag}`);
  if (attribute(tag, 'target') === '_blank') check(/\bnoopener\b/.test(attribute(tag, 'rel') ?? ''), `Blank-target link missing noopener: ${tag}`);
  if (href?.startsWith('#') && href.length > 1) check(ids.includes(decodeURIComponent(href.slice(1))), `Broken internal link: ${href}`);
}
for (const tag of [...tags('button'), ...tags('a'), ...tags('summary')]) {
  check(attribute(tag, 'aria-hidden') !== 'true', `Interactive element must not be aria-hidden: ${tag}`);
  check(attribute(tag, 'tabindex') !== '-1', `Static interactive content must remain keyboard-accessible: ${tag}`);
}
for (const match of index.matchAll(/\b(?:aria-controls|aria-labelledby|aria-describedby)\s*=\s*(["'])(.*?)\1/g)) {
  for (const id of match[2].split(/\s+/).filter(Boolean)) check(ids.includes(id), `Missing ARIA reference target: ${id}`);
}

const navButton = tags('button').find(tag => attribute(tag, 'id') === 'nav-toggle');
check(navButton && attribute(navButton, 'aria-controls') === 'primary-links' && attribute(navButton, 'aria-expanded') === 'false', 'Mobile menu must be a button controlling primary-links with aria-expanded="false".');
check(!/\baria-modal\s*=/.test(index), 'The navigation disclosure must not claim modal behavior.');
check(tags('details').length >= 2 && tags('summary').length >= 2, 'Archive and certifications need native disclosures available without JavaScript.');

const filterButtons = tags('button').filter(tag => attribute(tag, 'data-filter') !== undefined);
check(filterButtons.map(tag => attribute(tag, 'data-filter')).sort().join(',') === 'ai,all,games,platform', 'Provide all four archive filters.');
for (const tag of filterButtons) check(['true', 'false'].includes(attribute(tag, 'aria-pressed')), `Project filter needs aria-pressed: ${tag}`);
const projectTags = tags('article').filter(tag => attribute(tag, 'data-category') !== undefined);
check(projectTags.length === 9, `Preserve all 9 archive projects; found ${projectTags.length}.`);
for (const tag of projectTags) {
  check(['ai', 'platform', 'games'].includes(attribute(tag, 'data-category')), `Invalid archive category: ${tag}`);
  check(!hasAttribute(tag, 'hidden'), `Archive projects must be available without JavaScript: ${tag}`);
}

check(tags('button').some(tag => attribute(tag, 'id') === 'copy-email'), 'Provide the copy email action.');
const status = [...index.matchAll(/<[^/!][^>]*>/g)].map(match => match[0]).find(tag => attribute(tag, 'id') === 'contact-status');
check(status && (attribute(status, 'role') === 'status' || attribute(status, 'aria-live') === 'polite'), 'Copy email needs an accessible status message.');
check(tags('a').some(tag => attribute(tag, 'href') === 'mailto:annas.adharuqudni@gmail.com'), 'Preserve the email contact link.');
check(tags('a').some(tag => decodeURIComponent(attribute(tag, 'href') ?? '').split(/[?#]/)[0] === 'Annas Resume.html'), 'Preserve the local resume link.');
for (const destination of ['github.com/adharuqudni', 'linkedin.com/in/adharuqudni']) {
  check(tags('a').some(tag => attribute(tag, 'href')?.includes(destination)), `Preserve the ${destination} profile link.`);
}
for (const fact of [/Samsung R&D/i, /tiket\.com/i, /decorps/i, /Elnusa/i, /Agni/i, /Distributed Data(?:[-\s]Mining| platform)/i, /CCTV/i, /ChaChing/i, /Notula/i, /AI Development Platform/i, /Artle/i, /AKTUDINUS/i, /ComfyUI/i, /Merchandiser/i, /Emulator Farm/i, /Autonomous Ship/i, /Road Hole/i, /UPN Veteran Yogyakarta/i, /3\.86/, /SMA Negeri 4 Semarang/i]) {
  check(fact.test(content), `Preserve factual portfolio content: ${fact}`);
}

check(styles.includes('scroll-margin-top:'), 'Provide an anchor offset for the sticky navigation.');
check(/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(styles), 'Provide a reduced-motion fallback.');
check(/:focus-visible/.test(styles), 'Provide a visible keyboard focus style.');
check(!/transition\s*:\s*all\b/i.test(styles), 'Do not use transition: all.');
check(!/outline\s*:\s*none\b/i.test(styles), 'Do not remove keyboard outlines.');

for (const match of index.matchAll(/\b(?:src|href)\s*=\s*(["'])(.*?)\1/g)) {
  const value = match[2];
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) continue;
  const localPath = decodeURIComponent(value.split(/[?#]/)[0]).replace(/^\//, '');
  check(existsSync(join(root, localPath)), `Missing local asset: ${localPath}`);
}
for (const match of styles.matchAll(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/g)) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(match[2])) continue;
  check(existsSync(join(root, decodeURIComponent(match[2].split(/[?#]/)[0]))), `Missing CSS asset: ${match[2]}`);
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
console.log(`Site audit passed: ${imageTags.length} static images, ${ids.length} unique IDs, 9 archive projects, content and local links preserved, JavaScript syntax clean.`);
