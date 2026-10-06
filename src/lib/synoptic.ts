/**
 * Synoptic chart renderer for the hero. A surface analysis sheet over the
 * Bay of Bengal, plotted live on two canvases:
 *
 *   base  - graticule, isobars (marching squares over a drifting synthetic
 *           pressure field), the coarse hex model grid around the low and the
 *           refined aperture-7 patch inside it, the low's track and forecast
 *           cone while it moves, pressure centres, station plots, a locator
 *           globe.
 *   part  - wind particles advected along the field, with fading trails. The
 *           fastest air, round the low, is drawn brightest.
 *
 * The pointer is the low, and holding it deepens it. Idle, the low returns
 * home (Baliapal) and drifts. Motion is timed in 60 Hz frames, so a 120 Hz
 * screen runs at the same speed in smaller steps.
 * The field is synthetic; the chart says so in its corner label.
 * No dependencies. Colours are read from CSS custom properties so the lamp
 * theme needs no second code path.
 */

export interface SynopticOptions {
  base: HTMLCanvasElement;
  part: HTMLCanvasElement;
  /** Element whose computed style carries the colour tokens. */
  themeRoot: Element;
  /** Idle position of the low, [lon, lat]. */
  home: [number, number];
  /** Draw one frame and never animate. */
  reduce: boolean;
}

export interface Synoptic {
  resize(): void;
  start(): void;
  stop(): void;
  once(): void;
  retheme(): void;
  setPointer(x: number, y: number): void;
  clearPointer(): void;
  /** Current position of the low, [lon, lat]. */
  low(): [number, number];
}

interface Colors {
  paper: string;
  ink: string;
  inkRgb: string;
  red: string;
  redRgb: string;
  grat: string;
  muted: string;
}

interface Particle {
  x: number;
  y: number;
  age: number;
  life: number;
}

const TAU = Math.PI * 2;
const LAT0 = 4;
const LAT1 = 30;
const LONC = 82;
const CELL = 12;
const COARSE_R = 36;
const PATCH_R = 84;
const APERTURE7_ROT = Math.atan2(Math.sqrt(3), 5);
/** Depth of the low in hPa, idle and while the pointer holds it. */
const DEPTH_IDLE = 14;
const DEPTH_HELD = 20;
/** Share of each particle trail erased per 60 Hz frame. Lower is longer. */
const FADE = 0.06;
/** Wind speeds (degrees per 60 Hz frame) splitting the particles into three brightness bands. */
const SLOW = 0.06;
const FAST = 0.09;
const BAND_ALPHA = [0.28, 0.5, 0.85];
/** Track: a dot every TRACK_STEP px the low moves, each fading over TRACK_LIFE frames. */
const TRACK_STEP = 14;
const TRACK_LIFE = 200;
const TRACK_MAX = 28;
/** Forecast cone: shown above CONE_FROM px per frame, LEAD frames ahead, at most CONE_MAX px long. */
const CONE_FROM = 0.4;
const LEAD = 40;
const CONE_MAX = 170;

/** Marching-squares edge pairs per 4-bit cell index. */
const CASES: number[][] = [[], [3, 2], [2, 1], [3, 1], [0, 1], [0, 3, 1, 2], [0, 2], [0, 3], [0, 3], [0, 2], [0, 1, 2, 3], [0, 1], [3, 1], [1, 2], [2, 3], []];

/** Station plot positions, [lon, lat]. Real coastal and inland points around the sheet. */
const STATIONS: [number, number][] = [
  [80.5, 14.2], [84.6, 18.4], [91.6, 22.3], [93.6, 15.6], [77.9, 25.4],
  [99.2, 20.3], [86.2, 9.6], [96.4, 8.4], [104.1, 13.1], [72.4, 19.0],
];

function gauss(x: number, y: number, cx: number, cy: number, s: number): number {
  const dx = x - cx;
  const dy = y - cy;
  return Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
}

function hexToRgb(hex: string): string {
  const h = hex.trim().replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function readColors(el: Element): Colors {
  const cs = getComputedStyle(el);
  const get = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  const ink = get('--text', '#1c1c22');
  const red = get('--accent', '#b8321a');
  return {
    paper: get('--bg', '#e8e5da'),
    ink,
    inkRgb: hexToRgb(ink),
    red,
    redRgb: hexToRgb(red),
    grat: get('--line', '#c7c4b6'),
    muted: get('--muted', '#5a5a62'),
  };
}

function fit(cv: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = cv.getBoundingClientRect();
  cv.width = Math.max(1, Math.round(r.width * dpr));
  cv.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

export function createSynoptic(opts: SynopticOptions): Synoptic {
  const { base, part, themeRoot, home, reduce } = opts;
  let C = readColors(themeRoot);
  let ctx: CanvasRenderingContext2D | null = null;
  let pctx: CanvasRenderingContext2D | null = null;
  let W = 0;
  let H = 0;
  let lonR = 30;
  let nx = 0;
  let ny = 0;
  let vals = new Float32Array(0);
  const parts: Particle[] = [];

  let target: [number, number] = [home[0], home[1]];
  const lowPos: [number, number] = [home[0], home[1]];
  let depth = DEPTH_IDLE;
  /** Smoothed velocity of the low, degrees per 60 Hz frame. */
  const vel: [number, number] = [0, 0];
  const track: { lon: number; lat: number; t: number }[] = [];
  let hover = false;
  let hi: [number, number] = [70, 24];
  let lo2: [number, number] = [100, 9];

  let raf = 0;
  let running = false;
  /** Time in 60 Hz frames. */
  let t = 0;
  let last = 0;
  let baseAt = -Infinity;

  const mono = '"Martian Mono Variable", "Martian Mono", ui-monospace, monospace';

  const projX = (lon: number) => ((lon - (LONC - lonR / 2)) / lonR) * W;
  const projY = (lat: number) => ((LAT1 - lat) / (LAT1 - LAT0)) * H;
  const unproj = (x: number, y: number): [number, number] => [LONC - lonR / 2 + (x / W) * lonR, LAT1 - (y / H) * (LAT1 - LAT0)];
  const inDomain = (lon: number, lat: number) => lon > LONC - lonR / 2 - 1 && lon < LONC + lonR / 2 + 1 && lat > LAT0 - 1 && lat < LAT1 + 1;

  /** Synthetic sea-level pressure, hPa. The base sits between isobar levels (every 4 hPa
   *  from 988): at 1012 the background wave's zero lines, which are straight, drew as isobars. */
  function P(lon: number, lat: number, tt: number): number {
    return (
      1013 +
      6 * Math.sin(lon * 0.22 + tt * 0.004) * Math.cos(lat * 0.31 - tt * 0.003) -
      depth * gauss(lon, lat, lowPos[0], lowPos[1], 4.2) +
      10 * gauss(lon, lat, hi[0], hi[1], 6.5) -
      6 * gauss(lon, lat, lo2[0], lo2[1], 4.5)
    );
  }

  /** Wind as a rotated pressure gradient plus a weak background flow. */
  function wind(lon: number, lat: number, tt: number): [number, number] {
    const h = 0.35;
    const gx = (P(lon + h, lat, tt) - P(lon - h, lat, tt)) / (2 * h);
    const gy = (P(lon, lat + h, tt) - P(lon, lat - h, tt)) / (2 * h);
    return [-gy * 0.05 + 0.012, gx * 0.05 + 0.008];
  }

  function seed(p: Particle): void {
    p.x = LONC - lonR / 2 + Math.random() * lonR;
    p.y = LAT0 + Math.random() * (LAT1 - LAT0);
    p.age = Math.floor(Math.random() * 40);
    p.life = 80 + Math.random() * 120;
  }

  function resize(): void {
    const b = fit(base);
    const p = fit(part);
    ctx = b.ctx;
    pctx = p.ctx;
    W = b.w;
    H = b.h;
    lonR = ((LAT1 - LAT0) * W) / H;
    nx = Math.floor(W / CELL) + 2;
    ny = Math.floor(H / CELL) + 2;
    vals = new Float32Array(nx * ny);
    baseAt = -Infinity;
    parts.length = 0;
    const n = Math.round(Math.min(1300, (W * H) / 700));
    for (let i = 0; i < n; i++) {
      const q: Particle = { x: 0, y: 0, age: 0, life: 0 };
      seed(q);
      parts.push(q);
    }
  }

  function hexPath(c: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
    for (let k = 0; k < 6; k++) {
      const a = rot + Math.PI / 6 + (k * Math.PI) / 3;
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      if (k === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
  }

  function halo(c: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'center'): void {
    c.font = font;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.lineWidth = 4;
    c.strokeStyle = C.paper;
    c.strokeText(text, x, y);
    c.fillStyle = color;
    c.fillText(text, x, y);
  }

  /** The low's speed in canvas pixels per 60 Hz frame, from its smoothed velocity. */
  function speedPx(): number {
    return Math.hypot((vel[0] * W) / lonR, (vel[1] * H) / (LAT1 - LAT0));
  }

  /**
   * The low's recent track and a forecast cone along its motion, drawn the way cyclone
   * advisories draw them: dots where it has been, and ahead a cone that widens with lead
   * time, because a forecast is less certain the further out it goes. Both appear only
   * while the low moves, so the idle chart stays quiet.
   */
  function trackAndCone(c: CanvasRenderingContext2D, lx: number, ly: number, tt: number): void {
    for (const p of track) {
      const a = 1 - (tt - p.t) / TRACK_LIFE;
      if (a <= 0) continue;
      c.beginPath();
      c.arc(projX(p.lon), projY(p.lat), 2, 0, TAU);
      c.fillStyle = `rgba(${C.redRgb},${(0.7 * a).toFixed(3)})`;
      c.fill();
    }

    const speed = speedPx();
    const vis = Math.min(1, Math.max(0, (speed - CONE_FROM) / 1.6));
    if (vis < 0.01) return;
    // Unit vector along the motion (canvas y points down, latitude up) and its normal.
    const ux = ((vel[0] * W) / lonR) / speed;
    const uy = (-(vel[1] * H) / (LAT1 - LAT0)) / speed;
    const qx = -uy;
    const qy = ux;
    const len = Math.min(CONE_MAX, speed * LEAD);
    const spread = (d: number) => 6 + 0.32 * d;
    const w0 = spread(0);
    const w1 = spread(len);
    const ex = lx + ux * len;
    const ey = ly + uy * len;
    const ang = Math.atan2(uy, ux);

    c.save();
    c.globalAlpha = vis;
    c.beginPath();
    c.moveTo(lx + qx * w0, ly + qy * w0);
    c.lineTo(ex + qx * w1, ey + qy * w1);
    c.arc(ex, ey, w1, ang + Math.PI / 2, ang - Math.PI / 2, true);
    c.lineTo(lx - qx * w0, ly - qy * w0);
    c.arc(lx, ly, w0, ang - Math.PI / 2, ang + Math.PI / 2, true);
    c.closePath();
    c.fillStyle = `rgba(${C.redRgb},0.09)`;
    c.fill();
    c.setLineDash([4, 4]);
    c.lineWidth = 1;
    c.strokeStyle = `rgba(${C.redRgb},0.55)`;
    c.stroke();
    c.beginPath();
    c.moveTo(lx, ly);
    c.lineTo(ex, ey);
    c.stroke();
    c.setLineDash([]);
    // Forecast positions at three lead times, labelled when the cone is long enough to hold them.
    for (let i = 1; i <= 3; i++) {
      const d = (len * i) / 3;
      const fx = lx + ux * d;
      const fy = ly + uy * d;
      c.beginPath();
      c.arc(fx, fy, 2.6, 0, TAU);
      c.fillStyle = C.paper;
      c.fill();
      c.lineWidth = 1.2;
      c.strokeStyle = C.red;
      c.stroke();
      if (len > 100) {
        const off = spread(d) + 12;
        halo(c, `+${12 * i}h`, fx + qx * off, fy + qy * off, `8.5px ${mono}`, C.red);
      }
    }
    c.restore();
  }

  /** Orthographic locator globe, hidden hemisphere culled. */
  function globe(c: CanvasRenderingContext2D, tt: number): void {
    if (W < 640) return;
    const cx = W - 118;
    const cy = 118;
    const R = 72;
    const lam0 = tt * 0.006;
    const tilt = 0.38;
    const st = Math.sin(tilt);
    const ct = Math.cos(tilt);
    const to3 = (lon: number, lat: number): [number, number, number] => {
      const la = (lat * Math.PI) / 180;
      const lo = (lon * Math.PI) / 180 - lam0;
      const x = Math.cos(la) * Math.cos(lo);
      const y = Math.sin(la);
      const z = Math.cos(la) * Math.sin(lo);
      return [x, y * ct - z * st, y * st + z * ct];
    };
    c.save();
    c.beginPath();
    c.arc(cx, cy, R + 8, 0, TAU);
    c.fillStyle = `rgba(${hexToRgb(C.paper)},0.92)`;
    c.fill();
    c.beginPath();
    c.arc(cx, cy, R, 0, TAU);
    c.lineWidth = 1;
    c.strokeStyle = C.ink;
    c.stroke();
    c.strokeStyle = `rgba(${C.inkRgb},0.35)`;
    c.lineWidth = 0.8;
    const poly = (pts: [number, number][]) => {
      c.beginPath();
      let pen = false;
      for (const [lon, lat] of pts) {
        const [x, y, z] = to3(lon, lat);
        if (z < 0) {
          pen = false;
          continue;
        }
        const sx = cx + R * x;
        const sy = cy - R * y;
        if (!pen) {
          c.moveTo(sx, sy);
          pen = true;
        } else c.lineTo(sx, sy);
      }
      c.stroke();
    };
    for (let lon = 0; lon < 360; lon += 30) {
      const pts: [number, number][] = [];
      for (let la = -90; la <= 90; la += 4) pts.push([lon, la]);
      poly(pts);
    }
    for (let la = -60; la <= 60; la += 30) {
      const pts: [number, number][] = [];
      for (let lo = 0; lo <= 360; lo += 4) pts.push([lo, la]);
      poly(pts);
    }
    c.fillStyle = `rgba(${C.inkRgb},0.55)`;
    const N = 320;
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = ga * i;
      const lat = (Math.asin(y) * 180) / Math.PI;
      const lon = ((Math.atan2(Math.sin(th) * r, Math.cos(th) * r) * 180) / Math.PI + 360) % 360;
      const [x, yy, z] = to3(lon, lat);
      if (z < 0.05) continue;
      c.globalAlpha = 0.25 + 0.75 * z;
      c.fillRect(cx + R * x - 0.8, cy - R * yy - 0.8, 1.6, 1.6);
    }
    c.globalAlpha = 1;
    const [bx, by, bz] = to3(home[0], home[1]);
    if (bz > 0) {
      c.beginPath();
      c.arc(cx + R * bx, cy - R * by, 3.2, 0, TAU);
      c.fillStyle = C.red;
      c.fill();
      halo(c, `${home[1].toFixed(1)}N ${home[0].toFixed(1)}E`, cx + R * bx, cy - R * by + 12, `9px ${mono}`, C.red);
    }
    halo(c, 'locator', cx, cy + R + 18, `9px ${mono}`, C.muted);
    c.restore();
  }

  function drawBase(tt: number): void {
    const c = ctx;
    if (!c) return;
    hi = [LONC - lonR * 0.3 + 2 * Math.sin(tt * 0.003), 24 + 1.5 * Math.cos(tt * 0.0025)];
    lo2 = [LONC + lonR * 0.36 + 3 * Math.cos(tt * 0.0035), 9.5 + 2 * Math.sin(tt * 0.003)];

    c.fillStyle = C.paper;
    c.fillRect(0, 0, W, H);

    // Graticule, every 5 degrees, labelled every 10.
    c.strokeStyle = C.grat;
    c.lineWidth = 1;
    c.beginPath();
    const lonA = Math.ceil((LONC - lonR / 2) / 5) * 5;
    const lonB = LONC + lonR / 2;
    for (let lon = lonA; lon <= lonB; lon += 5) {
      const x = Math.round(projX(lon)) + 0.5;
      c.moveTo(x, 0);
      c.lineTo(x, H);
    }
    for (let lat = 5; lat <= 30; lat += 5) {
      const y = Math.round(projY(lat)) + 0.5;
      c.moveTo(0, y);
      c.lineTo(W, y);
    }
    c.stroke();
    c.fillStyle = C.muted;
    c.font = `9px ${mono}`;
    c.textBaseline = 'alphabetic';
    c.textAlign = 'center';
    for (let lon = lonA; lon <= lonB; lon += 10) c.fillText(`${lon}E`, projX(lon), H - 6);
    c.textAlign = 'left';
    for (let lat = 10; lat < 30; lat += 10) c.fillText(`${lat}N`, 6, projY(lat) - 4);

    // Coarse hex model grid, drawn only round the low and fading with distance, so the eye
    // goes to the storm and the refined patch inside it rather than to wallpaper.
    const lx = projX(lowPos[0]);
    const ly = projY(lowPos[1]);
    const meshR = PATCH_R * 3.2;
    const meshFade = c.createRadialGradient(lx, ly, PATCH_R, lx, ly, meshR);
    meshFade.addColorStop(0, `rgba(${C.inkRgb},0.16)`);
    meshFade.addColorStop(1, `rgba(${C.inkRgb},0)`);
    c.strokeStyle = meshFade;
    c.lineWidth = 1;
    c.beginPath();
    const r = COARSE_R;
    const w = Math.sqrt(3) * r;
    for (let j = -1; j * 1.5 * r < H + r; j++) {
      for (let i = -1; i * w < W + w; i++) {
        const hx = i * w + ((j & 1) * w) / 2;
        const hy = j * 1.5 * r;
        const d = Math.hypot(hx - lx, hy - ly);
        if (d > PATCH_R - r * 0.5 && d < meshR + r) hexPath(c, hx, hy, r, 0);
      }
    }
    c.stroke();

    // Sample the field.
    for (let j = 0; j < ny; j++) {
      const lat = LAT1 - ((j * CELL) / H) * (LAT1 - LAT0);
      for (let i = 0; i < nx; i++) {
        const lon = LONC - lonR / 2 + ((i * CELL) / W) * lonR;
        vals[j * nx + i] = P(lon, lat, tt);
      }
    }

    // Isobars every 4 hPa by marching squares: strongest round the low, quiet at the edges.
    const isoFade = c.createRadialGradient(lx, ly, 0, lx, ly, Math.max(W, H) * 0.55);
    isoFade.addColorStop(0, `rgba(${C.inkRgb},0.8)`);
    isoFade.addColorStop(0.3, `rgba(${C.inkRgb},0.5)`);
    isoFade.addColorStop(1, `rgba(${C.inkRgb},0.26)`);
    c.strokeStyle = isoFade;
    c.lineWidth = 1;
    c.beginPath();
    const labels: [number, number, number][] = [];
    for (let L = 988; L <= 1036; L += 4) {
      let labeled = false;
      for (let j = 0; j < ny - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
          const a = vals[j * nx + i];
          const b = vals[j * nx + i + 1];
          const cc = vals[(j + 1) * nx + i + 1];
          const d = vals[(j + 1) * nx + i];
          const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (cc > L ? 2 : 0) | (d > L ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          const x0 = i * CELL;
          const y0 = j * CELL;
          const x1 = x0 + CELL;
          const y1 = y0 + CELL;
          const e: [number, number][] = [
            [x0 + (CELL * (L - a)) / (b - a), y0],
            [x1, y0 + (CELL * (L - b)) / (cc - b)],
            [x0 + (CELL * (L - d)) / (cc - d), y1],
            [x0, y0 + (CELL * (L - a)) / (d - a)],
          ];
          const sg = CASES[idx];
          for (let s = 0; s < sg.length; s += 2) {
            const p = e[sg[s]];
            const q = e[sg[s + 1]];
            c.moveTo(p[0], p[1]);
            c.lineTo(q[0], q[1]);
            if (!labeled && L % 8 === 0 && j > ny * 0.3 && j < ny * 0.7 && i > nx * 0.12 && i < nx * 0.9 && Math.hypot(p[0] - lx, p[1] - ly) > 72) {
              labels.push([p[0], p[1], L]);
              labeled = true;
            }
          }
        }
      }
    }
    c.stroke();
    for (const [x, y, L] of labels) halo(c, String(L), x, y, `9.5px ${mono}`, C.ink);

    // Refined patch around the low: aperture-7 rotated fine hexes.
    const rf = r / Math.sqrt(7);
    const wf = Math.sqrt(3) * rf;
    const al = APERTURE7_ROT;
    const a1 = [wf * Math.cos(al), wf * Math.sin(al)];
    const a2 = [wf * Math.cos(al + Math.PI / 3), wf * Math.sin(al + Math.PI / 3)];
    c.strokeStyle = `rgba(${C.inkRgb},0.22)`;
    c.lineWidth = 0.8;
    c.beginPath();
    for (let i = -9; i <= 9; i++) {
      for (let j = -9; j <= 9; j++) {
        const cx = lx + i * a1[0] + j * a2[0];
        const cy = ly + i * a1[1] + j * a2[1];
        if (Math.hypot(cx - lx, cy - ly) < PATCH_R) hexPath(c, cx, cy, rf, al);
      }
    }
    c.stroke();
    c.setLineDash([3, 4]);
    c.strokeStyle = `rgba(${C.redRgb},0.6)`;
    c.beginPath();
    c.arc(lx, ly, PATCH_R + 8, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    halo(c, 'refined patch', lx, ly + PATCH_R + 22, `8.5px ${mono}`, C.red);

    trackAndCone(c, lx, ly, tt);

    // Station plots: circle, wind barb, temperature left, pressure tail right. Half ink, so
    // they read as chart furniture under the low.
    c.save();
    c.globalAlpha = 0.5;
    c.lineWidth = 1.2;
    for (const [slon, slat] of STATIONS) {
      if (!inDomain(slon, slat)) continue;
      const sx = projX(slon);
      const sy = projY(slat);
      const [u, v] = wind(slon, slat, tt);
      const spd = Math.hypot(u, v) / 0.05;
      const fx = -u;
      const fy = v;
      const L = Math.hypot(fx, fy) || 1;
      const dx = (fx / L) * 20;
      const dy = (fy / L) * 20;
      c.strokeStyle = C.ink;
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(sx, sy, 4, 0, TAU);
      c.stroke();
      c.beginPath();
      c.moveTo(sx + dx * 0.2, sy + dy * 0.2);
      c.lineTo(sx + dx, sy + dy);
      const ticks = Math.min(3, Math.max(1, Math.round(spd * 1.5)));
      for (let k = 0; k < ticks; k++) {
        const bx = sx + dx * (1 - k * 0.18);
        const by = sy + dy * (1 - k * 0.18);
        c.moveTo(bx, by);
        c.lineTo(bx - dy * 0.35, by + dx * 0.35);
      }
      c.stroke();
      const temp = Math.round(26 + 4 * Math.sin(slon * 0.7) * Math.cos(slat * 0.5));
      const pr = Math.round((P(slon, slat, tt) % 100) * 10);
      halo(c, String(temp), sx - 9, sy - 7, `8.5px ${mono}`, C.ink, 'right');
      halo(c, String(pr).padStart(3, '0'), sx + 9, sy - 7, `8.5px ${mono}`, C.ink, 'left');
    }
    c.restore();

    // Pressure centres.
    halo(c, 'H', projX(hi[0]), projY(hi[1]), `700 26px ${mono}`, C.ink);
    halo(c, String(Math.round(P(hi[0], hi[1], tt))), projX(hi[0]), projY(hi[1]) + 20, `10px ${mono}`, C.ink);
    halo(c, 'L', lx, ly, `700 26px ${mono}`, C.red);
    halo(c, `${Math.round(P(lowPos[0], lowPos[1], tt))} hPa`, lx, ly + 20, `10px ${mono}`, C.red);
    halo(c, `${lowPos[1].toFixed(1)}N ${lowPos[0].toFixed(1)}E`, lx, ly + 32, `8.5px ${mono}`, C.red);

    globe(c, tt);
  }

  /** Strokes three paths, slow to fast air, faint to bright. */
  function strokeBands(c: CanvasRenderingContext2D, bands: Path2D[]): void {
    c.lineWidth = 1;
    for (let b = 0; b < bands.length; b++) {
      c.strokeStyle = `rgba(${C.inkRgb},${BAND_ALPHA[b]})`;
      c.stroke(bands[b]);
    }
  }

  const band = (u: number, v: number): number => {
    const s = Math.hypot(u, v);
    return s > FAST ? 2 : s > SLOW ? 1 : 0;
  };

  /** One particle step; k is the frame's length in 60 Hz frames. */
  function drawParts(tt: number, k: number): void {
    const c = pctx;
    if (!c) return;
    // Erase the same share of the trails per second at any frame rate.
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = `rgba(0,0,0,${1 - Math.pow(1 - FADE, k)})`;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    const bands = [new Path2D(), new Path2D(), new Path2D()];
    for (const p of parts) {
      const [u, v] = wind(p.x, p.y, tt);
      const x0 = projX(p.x);
      const y0 = projY(p.y);
      p.x += u * k;
      p.y += v * k;
      p.age += k;
      if (p.age > p.life || !inDomain(p.x, p.y)) {
        seed(p);
        continue;
      }
      const path = bands[band(u, v)];
      path.moveTo(x0, y0);
      path.lineTo(projX(p.x), projY(p.y));
    }
    strokeBands(c, bands);
  }

  function drawStaticWind(tt: number): void {
    const c = pctx;
    if (!c) return;
    c.clearRect(0, 0, W, H);
    const bands = [new Path2D(), new Path2D(), new Path2D()];
    for (const p of parts) {
      const [u, v] = wind(p.x, p.y, tt);
      const path = bands[band(u, v)];
      path.moveTo(projX(p.x), projY(p.y));
      path.lineTo(projX(p.x + u * 6), projY(p.y + v * 6));
    }
    strokeBands(c, bands);
  }

  function step(tt: number, animate: boolean, k = 1): void {
    if (!hover) target = [home[0] + 0.9 * Math.sin(tt * 0.004), home[1] + 0.6 * Math.cos(tt * 0.0031)];
    // Easing per 60 Hz frame, compounded over k frames.
    const e = 1 - Math.pow(1 - 0.06, k);
    const was: [number, number] = [lowPos[0], lowPos[1]];
    lowPos[0] += (target[0] - lowPos[0]) * e;
    lowPos[1] += (target[1] - lowPos[1]) * e;
    depth += ((hover ? DEPTH_HELD : DEPTH_IDLE) - depth) * (1 - Math.pow(1 - 0.03, k));
    if (animate) {
      // Velocity for the forecast cone, smoothed so the cone does not twitch with the pointer.
      const sv = 1 - Math.pow(1 - 0.12, k);
      vel[0] += ((lowPos[0] - was[0]) / k - vel[0]) * sv;
      vel[1] += ((lowPos[1] - was[1]) / k - vel[1]) * sv;
      // The track drops a dot each TRACK_STEP px the low travels, only while it really moves.
      const tail = track[track.length - 1];
      const moved = tail ? Math.hypot(projX(lowPos[0]) - projX(tail.lon), projY(lowPos[1]) - projY(tail.lat)) : Infinity;
      if (speedPx() > CONE_FROM && moved >= TRACK_STEP) {
        track.push({ lon: lowPos[0], lat: lowPos[1], t: tt });
        if (track.length > TRACK_MAX) track.shift();
      }
      while (track.length && tt - track[0].t > TRACK_LIFE) track.shift();
    }
    // The chart layer redraws at about 30 Hz, the particles every frame.
    if (!animate || tt - baseAt >= 1.9) {
      drawBase(tt);
      baseAt = tt;
    }
    if (animate) drawParts(tt, k);
    else drawStaticWind(tt);
  }

  const tick = (now: number): void => {
    if (!running) return;
    // k: this frame's length in 60 Hz frames, capped so the first frame after a stall
    // does not jump.
    const k = last ? Math.min(3, (now - last) / (1000 / 60)) : 1;
    last = now;
    t += k;
    step(t, true, k);
    raf = requestAnimationFrame(tick);
  };

  return {
    resize,
    start() {
      if (reduce) {
        step(t, false);
        return;
      }
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    once() {
      step(t, false);
    },
    retheme() {
      C = readColors(themeRoot);
      if (!running) step(t, false);
    },
    setPointer(x, y) {
      target = unproj(x, y);
      hover = true;
    },
    clearPointer() {
      hover = false;
    },
    low() {
      return [lowPos[0], lowPos[1]];
    },
  };
}
