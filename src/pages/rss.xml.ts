/** RSS 2.0 feed of the posts on the Writing sheet, newest first. No dependency. */
import type { APIRoute } from 'astro';
import { posts, postHref } from '../lib/writing';
import { profile } from '../data/profile';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('https://aswanisahoo.github.io');
  const url = (path: string) => new URL(path, base).toString();
  const items = (await posts())
    .map((p) => {
      const link = url(postHref(p));
      return [
        '<item>',
        `<title>${esc(p.data.title)}</title>`,
        `<link>${link}</link>`,
        `<guid isPermaLink="true">${link}</guid>`,
        `<pubDate>${new Date(`${p.data.date}T00:00:00Z`).toUTCString()}</pubDate>`,
        `<description>${esc(p.data.summary)}</description>`,
        ...p.data.tags.map((t) => `<category>${esc(t)}</category>`),
        '</item>',
      ].join('');
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(profile.name)} · Writing</title>
<link>${url('/writing/')}</link>
<atom:link href="${url('/rss.xml')}" rel="self" type="application/rss+xml" />
<description>Notes from building an evaluated climate-risk agent in public.</description>
<language>en</language>
${items}
</channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
