// Renders the link preview image (Open Graph and X card), public/og.jpg, from the built home
// page: the hero chart as a still frame, with the availability line, the name, the one-line
// pitch and the projects that merged PRs (documentation work labelled as such), all read from
// the page so the image says what the site says.
// No counts go on the image: they change, and an image cannot link to its evidence.
// 1200x630 at 2x, the 1.91:1 shape LinkedIn, Facebook and X large cards use.
// Usage (after npm run build): node scripts/og-image.mjs
// Rerun when the availability, the pitch or the set of projects changes. Set CHROME_PATH if needed.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
const outFile = join(here, '..', 'public', 'og.jpg');
const W = 1200;
const H = 630;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (!existsSync(join(dist, 'index.html'))) throw new Error('No dist/index.html: run npm run build first');

// ---------------------------------------------------------------- static server
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(dist, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404).end();
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
const profile = mkdtempSync(join(tmpdir(), 'og-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
  '--no-default-browser-check', '--hide-scrollbars', 'about:blank',
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
const evaluate = async (s, expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, s);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const shutdown = () => {
  try { ws.close(); } catch {}
  chrome.kill();
  server.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
};
process.on('uncaughtException', (e) => { console.error(e); shutdown(); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error(e); shutdown(); process.exit(1); });

// ---------------------------------------------------------------- render
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId: s } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, s);
await send('Runtime.enable', {}, s);
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false }, s);
// Lamp theme, still chart: reduced motion draws one finished frame.
await send('Emulation.setEmulatedMedia', {
  features: [
    { name: 'prefers-color-scheme', value: 'dark' },
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ],
}, s);
const loaded = new Promise((resolve) => {
  const l = (m) => {
    if (m.method === 'Page.loadEventFired' && m.sessionId === s) {
      listeners.delete(l);
      resolve();
    }
  };
  listeners.add(l);
});
await send('Page.navigate', { url: `${origin}/` }, s);
await Promise.race([loaded, sleep(15000)]);
await evaluate(s, 'document.fonts.ready.then(() => true)');

// The card is built from the page's own text. The chart is moved into a 1200x630 frame and
// drawn wider than the frame, so the low (Baliapal) lands in the open right third, clear of
// the card. The hero's resize observer redraws it at the new size.
const facts = await evaluate(s, `(() => {
  const text = (sel) => document.querySelector(sel)?.textContent.trim() ?? '';
  const facts = {
    status: text('.hero .status'),
    name: text('.hero .name'),
    pitch: text('.hero .pitch'),
    orgs: [...document.querySelectorAll('#upstream .orgs li')].map((li) => {
      const org = li.querySelector('.org')?.textContent.trim() ?? '';
      const kind = li.querySelector('.kind')?.textContent.trim() ?? '';
      return kind ? org + '\u00a0(' + kind + ')' : org;
    }),
  };
  if (!facts.status || !facts.name || !facts.pitch || !facts.orgs.length || facts.orgs.some((o) => !o)) {
    throw new Error('og-image: the home page no longer has the hero or ledger markup this script reads: ' + JSON.stringify(facts));
  }
  const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const chart = document.querySelector('[data-chart]');
  const frame = document.createElement('div');
  frame.className = 'og';
  const card = document.createElement('div');
  card.className = 'og-card';
  card.innerHTML =
    '<p class="og-eyebrow"><i></i>' + esc(facts.status) + '</p>' +
    '<p class="og-h1"><span>' + esc(facts.name) + '</span></p>' +
    '<p class="og-pitch">' + esc(facts.pitch) + '</p>' +
    '<p class="og-label">Merged open-source PRs</p>' +
    '<p class="og-orgs">' + facts.orgs.map(esc).join(' · ') + '</p>';
  frame.append(chart, card);
  document.body.replaceChildren(frame);
  const style = document.createElement('style');
  style.textContent = \`
    html, body { margin: 0; background: var(--bg); overflow: hidden; }
    .og { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
    .og [data-chart] { position: absolute !important; left: 0; top: 0; width: 1750px !important; height: ${H}px !important; min-height: 0 !important; }
    .og .corner, .og .motion { display: none !important; }
    .og-card { position: absolute; left: 56px; top: 50%; transform: translateY(-50%); width: 790px; box-sizing: border-box;
      padding: 40px 44px 38px; background: var(--card); border: 1px solid var(--text); box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.35); }
    .og-card p { margin: 0; }
    .og-eyebrow { display: flex; align-items: center; gap: 12px; font-family: var(--font-mono); font-size: 16px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
    .og-eyebrow i { width: 10px; height: 10px; border-radius: 50%; background: var(--ok); flex: none; }
    .og-h1 { margin-top: 20px !important; font-family: var(--font-mono); font-weight: 600; font-size: 54px; line-height: 1.08; letter-spacing: -0.02em; color: var(--text); }
    .og-h1 span { display: block; white-space: nowrap; }
    .og-pitch { margin-top: 16px !important; font-family: var(--font-sans); font-size: 25px; line-height: 1.4; color: var(--text); }
    .og-label { margin-top: 30px !important; padding-top: 20px; border-top: 1px solid var(--line); font-family: var(--font-mono); font-size: 14px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
    .og-orgs { margin-top: 8px !important; font-family: var(--font-sans); font-size: 22px; color: var(--text); }
  \`;
  document.head.append(style);
  return facts;
})()`);
await evaluate(s, `document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 900)))`);

// The headline must not wrap or overflow the card at this size.
const fit = await evaluate(s, `(() => {
  const card = document.querySelector('.og-card').getBoundingClientRect();
  const lines = [...document.querySelectorAll('.og-h1 span')].map((b) => b.getBoundingClientRect());
  return { cardRight: Math.round(card.right), widest: Math.round(Math.max(...lines.map((l) => l.right))), cardBottom: Math.round(card.bottom) };
})()`);
if (fit.widest > fit.cardRight - 40 || fit.cardBottom > H) throw new Error(`og-image: the text does not fit the card: ${JSON.stringify(fit)}`);

const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } }, s);
writeFileSync(outFile, Buffer.from(shot.data, 'base64'));
console.log(`${outFile}  ${W * 2}x${H * 2}  ${Math.round(Buffer.from(shot.data, 'base64').length / 1024)} KB`);
console.log(`status: ${facts.status}\nname: ${facts.name}\npitch: ${facts.pitch}\norgs: ${facts.orgs.join(', ')}`);

await send('Target.closeTarget', { targetId });
await send('Browser.close').catch(() => {});
shutdown();
