/**
 * The atlas: five sheets, one job each. Nav labels are plain English for the reader;
 * the sheet number and chart name carry the theme.
 */
export type SheetId = '01' | '02' | '03' | '04' | '05';

export interface Sheet {
  n: SheetId;
  /** Plain-English nav label. */
  label: string;
  /** Chart name, printed in banners and the footer strip. */
  name: string;
  href: string;
}

export const sheets: Sheet[] = [
  { n: '01', label: 'Chart', name: 'Surface analysis', href: '/' },
  { n: '02', label: 'Work', name: 'Station reports', href: '/work/' },
  { n: '03', label: 'Open source', name: 'Upstream', href: '/open-source/' },
  { n: '04', label: 'Writing', name: 'Writing', href: '/writing/' },
  { n: '05', label: 'About', name: 'About', href: '/about/' },
];

export const sheetById = (n: SheetId): Sheet => {
  const s = sheets.find((x) => x.n === n);
  if (!s) throw new Error(`Unknown sheet ${n}`);
  return s;
};
