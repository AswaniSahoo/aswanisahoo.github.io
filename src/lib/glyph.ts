/**
 * Station-plot glyph maths, shared by the Work grid and its legend line.
 * Cloud cover encodes the size of the test suite in oktas; barb ticks count public surfaces.
 */
import type { Station } from '../data/types';

export const oktas = (s: Station): number => {
  if (!s.tests) return 0;
  const n = Number(s.tests.value.replace(/,/g, ''));
  if (n <= 0) return 0;
  if (n <= 50) return 2;
  if (n <= 100) return 3;
  if (n <= 250) return 4;
  if (n <= 400) return 6;
  if (n <= 800) return 7;
  return 8;
};

/** Cloud-cover sector path for k oktas on a circle of radius r at (cx, cy). */
export const cover = (k: number, cx: number, cy: number, r: number): string => {
  if (k <= 0) return '';
  if (k >= 8) return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
  const a = (k / 8) * Math.PI * 2;
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  const large = a > Math.PI ? 1 : 0;
  return `M${cx},${cy}L${cx},${cy - r}A${r},${r} 0 ${large},1 ${x.toFixed(2)},${y.toFixed(2)}Z`;
};

/** Public surfaces: repository, live app, container, registry. At most four ticks. */
export const ticks = (s: Station): number => Math.min(4, s.links.length);
