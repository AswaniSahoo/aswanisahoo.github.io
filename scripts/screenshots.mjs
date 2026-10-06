// Full-page screenshots of the built site in both themes at desktop and phone widths.
// No dependencies: a small static server over dist/ (GitHub Pages rules) and headless Chrome
// driven over the DevTools protocol with Node's built-in WebSocket (Node 22+).
// It also reports horizontal overflow per shot, and whether content is visible with
// reduced motion on. Usage (after npm run build):
//   node scripts/screenshots.mjs <outDir> [path ...]        e.g. / /work/ /work/climate-risk-agent/
// Set CHROME_PATH if Chrome is not in a standard location.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
// --top captures only the first viewport (above the fold) instead of the full page.
const top = process.argv.includes('--top');
// --combos=1440-light,390-dark limits the width and theme pairs (default: every pair).
const combosArg = process.argv.find((a) => a.startsWith('--combos='));
const combos = combosArg ? combosArg.slice('--combos='.length).split(',') : null;
const args = process.argv.slice(2).filter((a) => a !== '--top' && !a.startsWith('--combos='));
const outDir = args[0] ?? join(here, '..', 'screenshots');
const paths = args.slice(1).length ? args.slice(1) : ['/', '/work/', '/work/climate-risk-agent/'];
for (const p of paths) {
  // Git Bash rewrites "/work/" into a Windows path unless MSYS_NO_PATHCONV=1 is set.
  if (!p.startsWith('/')) throw new Error(`Path "${p}" must start with "/". In Git Bash, prefix the command with MSYS_NO_PATHCONV=1.`);
}
const widths = [
  { w: 1440, h: 900, mobile: false },
  { w: 390, h: 844, mobile: true },
];
const themes = ['light', 'dark'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- static server
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(dist, path);
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!path.endsWith('/')) {
      res.writeHead(301, { Location: `${path}/` }).end();
      return;
    }
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) {
    res.writeHead(404, { 'Content-Type': types['.html'] }).end(readFileSync(join(dist, '404.html')));
    return;
  }
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

// ---------------------------------------------------------------- chrome
const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chromePath = candidates.find((p) => existsSync(p));
if (!chromePath) throw new Error('No Chrome found; set CHROME_PATH');
const profile = mkdtempSync(join(tmpdir(), 'shots-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
  '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', 'about:blank',
], { stdio: 'ignore' });

let wsPath = '';
for (let i = 0; i < 100 && !wsPath; i++) {
  await sleep(100);
  const f = join(profile, 'DevToolsActivePort');
  if (existsSync(f)) {
    const [port, path] = readFileSync(f, 'utf8').trim().split('\n');
    if (port && path) wsPath = `ws://127.0.0.1:${port}${path}`;
  }
}
if (!wsPath) throw new Error('Chrome did not open a DevTools port');

const ws = new WebSocket(wsPath);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let nextId = 0;
const waiting = new Map();
const listeners = new Set();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && waiting.has(msg.id)) {
    const { resolve, reject } = waiting.get(msg.id);
    waiting.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else for (const l of listeners) l(msg);
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    waiting.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
const once = (method, sessionId) =>
  new Promise((resolve) => {
    const l = (m) => {
      if (m.method === method && m.sessionId === sessionId) {
        listeners.delete(l);
        resolve(m.params);
      }
    };
    listeners.add(l);
  });

async function openPage() {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  return { targetId, sessionId };
}
const evaluate = async (s, expression) =>
  (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, s)).result.value;

async function load(s, url, w, h, mobile, theme, reduce) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile }, s);
  await send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: theme },
      { name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' },
    ],
  }, s);
  // Go through about:blank so a repeat of the same URL with a #fragment is a real load,
  // not a same-document jump that never fires the load event.
  for (const target of ['about:blank', url]) {
    const loaded = Promise.race([once('Page.loadEventFired', s), sleep(15000)]);
    await send('Page.navigate', { url: target }, s);
    await loaded;
  }
  await evaluate(s, 'document.fonts.ready.then(() => true)');
}

// ---------------------------------------------------------------- run
mkdirSync(outDir, { recursive: true });
const name = (p) => (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-'));
const report = [];
const shutdown = () => {
  try { ws.close(); } catch {}
  chrome.kill();
  server.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
};
process.on('uncaughtException', (e) => { console.error(e); shutdown(); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error(e); shutdown(); process.exit(1); });
const { targetId, sessionId: s } = await openPage();

for (const p of paths) {
  for (const { w, h, mobile } of widths) {
    for (const theme of themes) {
      if (combos && !combos.includes(`${w}-${theme}`)) continue;
      await load(s, origin + p, w, h, mobile, theme, false);
      // Scroll through once so every section reveals the way a reader would see it.
      await evaluate(s, `(async () => {
        const step = innerHeight * 0.7;
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 150)); }
        scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }); await new Promise(r => setTimeout(r, 300));
        const anchor = ${top} && location.hash && document.getElementById(location.hash.slice(1));
        if (anchor) anchor.scrollIntoView({ behavior: 'instant' }); else scrollTo({ top: 0, behavior: 'instant' });
        await new Promise(r => setTimeout(r, 1600)); return true; })()`);
      const overflow = await evaluate(s, 'document.documentElement.scrollWidth - document.documentElement.clientWidth');
      const { cssContentSize } = await send('Page.getLayoutMetrics', {}, s);
      const height = top ? h : Math.ceil(cssContentSize.height);
      const shot = top
        ? await send('Page.captureScreenshot', { format: 'png' }, s)
        : await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height, scale: 1 } }, s);
      const file = join(outDir, `${name(p)}-${w}-${theme}${top ? '-top' : ''}.png`);
      writeFileSync(file, Buffer.from(shot.data, 'base64'));
      report.push(`${file}  ${w}x${height}  horizontal overflow ${overflow}px`);
    }
  }
  // Reduced motion: every revealed block must be visible without any scrolling.
  await load(s, origin + p, 390, 844, true, 'light', true);
  const hidden = await evaluate(s, `[...document.querySelectorAll('.reveal')].filter(e => getComputedStyle(e).opacity !== '1').length`);
  report.push(`${p} reduced motion: ${hidden} hidden .reveal elements`);
}

console.log(report.join('\n'));
await send('Target.closeTarget', { targetId });
await send('Browser.close').catch(() => {});
shutdown();
