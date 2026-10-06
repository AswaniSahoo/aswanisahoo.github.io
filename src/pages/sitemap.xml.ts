/** Sitemap of every sheet, report and post, built from the same data as the pages. No dependency. */
import type { APIRoute } from 'astro';
import { sheets } from '../data/sheets';
import { cases } from '../data/cases';
import { posts, postHref } from '../lib/writing';

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://aswanisahoo.github.io');
  const paths = [
    ...sheets.map((s) => s.href),
    ...cases.map((c) => `/work/${c.slug}/`),
    ...(await posts()).map(postHref),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `<url><loc>${new URL(p, base).toString()}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
