// Checks every internal href and src in dist/ the way GitHub Pages serves them:
// "/work/" -> work/index.html, files by path, and "#id" fragments against the target page.
// Links to sheets that are planned but not built yet are reported as pending, not broken.
// Usage: node scripts/check-links.mjs   (after npm run build). Exit 1 on any broken link.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
const ORIGIN = 'https://aswanisahoo.github.io';

// Pages linked before they are built. Every sheet exists now, so the list is empty and a
// link to a missing page counts as broken.
const PENDING = [];

const pages = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) pages.push(p);
  }
};
walk(dist);

const urlOf = (file) => {
  const rel = relative(dist, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
};

const fileFor = (pathname) => {
  const p = decodeURIComponent(pathname);
  if (p.endsWith('/')) return join(dist, p, 'index.html');
  return join(dist, p);
};

const idCache = new Map();
const idsOf = (file) => {
  if (!idCache.has(file)) {
    const html = readFileSync(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\s(?:id|name)="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
};

let resolved = 0;
let external = 0;
const pending = new Map();
const broken = [];

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const base = new URL(urlOf(page), ORIGIN);
  for (const m of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    const raw = m[2];
    if (!raw || /^(mailto:|tel:|data:|javascript:)/i.test(raw)) continue;
    const url = new URL(raw.replace(/&amp;/g, '&'), base);
    if (url.origin !== ORIGIN) {
      external++;
      continue;
    }
    const file = fileFor(url.pathname);
    const where = `${urlOf(page)} -> ${raw}`;
    if (!url.pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(url.pathname)) {
      broken.push(`${where} (no trailing slash: GitHub Pages would redirect)`);
      continue;
    }
    if (!existsSync(file)) {
      if (PENDING.some((re) => re.test(url.pathname))) {
        pending.set(url.pathname, (pending.get(url.pathname) ?? 0) + 1);
        continue;
      }
      broken.push(`${where} (no file ${relative(dist, file)})`);
      continue;
    }
    if (url.hash && file.endsWith('.html')) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!idsOf(file).has(id)) {
        broken.push(`${where} (no element with id "${id}")`);
        continue;
      }
    }
    resolved++;
  }
}

console.log(`pages checked: ${pages.length}`);
console.log(`internal links resolved: ${resolved}`);
console.log(`internal links to pages not built yet (planned): ${[...pending.values()].reduce((a, b) => a + b, 0)} across ${pending.size} targets`);
for (const [p, n] of [...pending.entries()].sort()) console.log(`  pending ${p} (${n})`);
console.log(`external links skipped: ${external}`);
console.log(`broken: ${broken.length}`);
for (const b of broken) console.log(`  BROKEN ${b}`);
process.exitCode = broken.length ? 1 : 0;
