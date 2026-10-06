/**
 * Sheet 04 helpers: posts from the writing collection plus posts that live only elsewhere
 * (profile.writing), newest first, with a reading time computed from the text.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { profile } from '../data/profile';

export type Post = CollectionEntry<'writing'>;

const WORDS_PER_MINUTE = 200;
export const readingMinutes = (body = ''): number =>
  Math.max(1, Math.ceil(body.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE));

export interface WritingItem {
  title: string;
  date: string;
  summary: string;
  tags: string[];
  href: string;
  /** Lives on another site (the link leaves this one). */
  external: boolean;
  minutes?: number;
  series?: string;
}

export const postHref = (p: Post): string => `/writing/${p.id}/`;

export async function posts(): Promise<Post[]> {
  return (await getCollection('writing')).sort((a, b) => b.data.date.localeCompare(a.data.date));
}

export async function writingIndex(): Promise<WritingItem[]> {
  const own: WritingItem[] = (await posts()).map((p) => ({
    title: p.data.title,
    date: p.data.date,
    summary: p.data.summary,
    tags: p.data.tags,
    href: postHref(p),
    external: false,
    minutes: readingMinutes(p.body),
    series: p.data.series,
  }));
  const elsewhere: WritingItem[] = profile.writing.map((w) => ({
    title: w.title,
    date: w.date,
    summary: w.opening,
    tags: ['career'],
    href: w.url,
    external: true,
  }));
  return [...own, ...elsewhere].sort((a, b) => b.date.localeCompare(a.date));
}
