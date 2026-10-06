// Builds a single-file preview from dist/ for sharing without a server:
// inlines the CSS and any external scripts, strips the document wrapper so
// the result can be dropped into any host page. Fonts fall back to system
// stacks because their relative URLs will not resolve.
// Usage: node scripts/make-preview.mjs [outFile]

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
const out = process.argv[2] ?? join(here, '..', 'preview.html');

let html = readFileSync(join(dist, 'index.html'), 'utf8');

// Inline stylesheets and external scripts.
html = html.replace(/<link rel="stylesheet" href="(\/_astro\/[^"]+)">/g, (_, href) => {
  const css = readFileSync(join(dist, href), 'utf8');
  return `<style>${css}</style>`;
});
html = html.replace(/<script type="module" src="(\/_astro\/[^"]+)"><\/script>/g, (_, src) => {
  const js = readFileSync(join(dist, src), 'utf8');
  return `<script type="module">${js}</script>`;
});

const head = html.match(/<head>([\s\S]*)<\/head>/)?.[1] ?? '';
const body = html.match(/<body>([\s\S]*)<\/body>/)?.[1] ?? '';

const title = head.match(/<title>[^<]*<\/title>/)?.[0] ?? '';
const keep = [...head.matchAll(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/g)].map((m) => m[0]);

writeFileSync(out, `${title}\n${keep.join('\n')}\n${body}\n`);
console.log(`wrote ${out} (${Buffer.byteLength(readFileSync(out))} bytes, ${keep.length} head blocks kept)`);
