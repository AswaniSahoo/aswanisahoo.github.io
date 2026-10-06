/**
 * Build-time isobars for the static header strip on inner sheets. Marching squares over a
 * synthetic pressure field, segments joined into lines, then smoothed with quadratic midpoints.
 * Pure functions, no DOM: the output is SVG path data baked into the HTML.
 */
export type Field = (x: number, y: number) => number;
type Pt = [number, number];

const r1 = (v: number) => Math.round(v * 10) / 10;
const fmt = (p: Pt) => `${r1(p[0])} ${r1(p[1])}`;

/** Marching squares for one level: a list of segments on a (dx, dy) grid covering w by h. */
function segments(g: number[][], level: number, dx: number, dy: number): [Pt, Pt][] {
  const out: [Pt, Pt][] = [];
  for (let j = 0; j < g.length - 1; j++) {
    for (let i = 0; i < g[0].length - 1; i++) {
      const a = g[j][i];
      const b = g[j][i + 1];
      const c = g[j + 1][i + 1];
      const d = g[j + 1][i];
      const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const x0 = i * dx;
      const y0 = j * dy;
      const t = (p: number, q: number) => (level - p) / (q - p);
      const top: Pt = [x0 + dx * t(a, b), y0];
      const right: Pt = [x0 + dx, y0 + dy * t(b, c)];
      const bottom: Pt = [x0 + dx * t(d, c), y0 + dy];
      const left: Pt = [x0, y0 + dy * t(a, d)];
      const centreHigh = (a + b + c + d) / 4 > level;
      switch (idx) {
        case 1: case 14: out.push([left, bottom]); break;
        case 2: case 13: out.push([bottom, right]); break;
        case 3: case 12: out.push([left, right]); break;
        case 4: case 11: out.push([top, right]); break;
        case 6: case 9: out.push([top, bottom]); break;
        case 7: case 8: out.push([left, top]); break;
        case 5:
          if (centreHigh) out.push([left, top], [bottom, right]);
          else out.push([left, bottom], [top, right]);
          break;
        case 10:
          if (centreHigh) out.push([top, right], [left, bottom]);
          else out.push([left, top], [bottom, right]);
          break;
      }
    }
  }
  return out;
}

/** Join segments that share endpoints into polylines. Shared edges produce identical points. */
function join(segs: [Pt, Pt][]): Pt[][] {
  const key = (p: Pt) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const at = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (const p of s) at.set(key(p), [...(at.get(key(p)) ?? []), i]);
  });
  const used = new Array<boolean>(segs.length).fill(false);
  const grow = (line: Pt[]) => {
    for (;;) {
      const end = line[line.length - 1];
      const next = (at.get(key(end)) ?? []).find((i) => !used[i]);
      if (next === undefined) return;
      used[next] = true;
      const [p, q] = segs[next];
      line.push(key(p) === key(end) ? q : p);
    }
  };
  const lines: Pt[][] = [];
  segs.forEach((s, i) => {
    if (used[i]) return;
    used[i] = true;
    const line: Pt[] = [s[0], s[1]];
    grow(line);
    line.reverse();
    grow(line);
    lines.push(line);
  });
  return lines;
}

/** Smooth a polyline: quadratic curves through the midpoints, vertices as control points. */
function smooth(pts: Pt[]): string {
  if (pts.length < 3) return `M${fmt(pts[0])}L${fmt(pts[pts.length - 1])}`;
  let d = `M${fmt(pts[0])}`;
  for (let k = 1; k < pts.length - 1; k++) {
    const m: Pt = [(pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2];
    d += `Q${fmt(pts[k])} ${fmt(m)}`;
  }
  return `${d}L${fmt(pts[pts.length - 1])}`;
}

/** One SVG path string per isobar level, every `step` hPa across the field's range. */
export function isobarPaths(P: Field, w: number, h: number, dx: number, dy: number, step = 4): string[] {
  const nx = Math.ceil(w / dx) + 1;
  const ny = Math.ceil(h / dy) + 1;
  const g: number[][] = [];
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < ny; j++) {
    g.push([]);
    for (let i = 0; i < nx; i++) {
      const v = P(i * dx, j * dy);
      g[j].push(v);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  const paths: string[] = [];
  for (let level = Math.ceil(lo / step) * step; level < hi; level += step) {
    const lines = join(segments(g, level, dx, dy));
    if (lines.length) paths.push(lines.map(smooth).join(''));
  }
  return paths;
}
