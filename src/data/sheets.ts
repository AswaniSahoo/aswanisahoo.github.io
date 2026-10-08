/**
 * The five pages, one job each. Labels and names are plain English; the weather chart is
 * the look, not the vocabulary.
 */
export type SheetId = '01' | '02' | '03' | '04' | '05';

export interface Sheet {
  n: SheetId;
  /** Nav label. */
  label: string;
  /** Page name, printed in banners and the footer strip. */
  name: string;
  href: string;
}

export const sheets: Sheet[] = [
  { n: '01', label: 'Home', name: 'Home', href: '/' },
  { n: '02', label: 'Projects', name: 'Projects', href: '/work/' },
  { n: '03', label: 'Open source', name: 'Open source', href: '/open-source/' },
  { n: '04', label: 'Writing', name: 'Writing', href: '/writing/' },
  { n: '05', label: 'About', name: 'About', href: '/about/' },
];

export const sheetById = (n: SheetId): Sheet => {
  const s = sheets.find((x) => x.n === n);
  if (!s) throw new Error(`Unknown sheet ${n}`);
  return s;
};
