import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Sheet 04, Writing. Posts imported from climate-risk-agent/docs/blog, only the ones
 * docs/BLOG.md marks as published, with the titles and dates it records.
 */
const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    /** Date first published, ISO. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** One line for the index, quoted from the post. */
    summary: z.string(),
    tags: z.array(z.string()),
    series: z.string().optional(),
    part: z.number().int().optional(),
    /** Where the post first appeared, when it did. */
    hashnode: z.url().optional(),
  }),
});

export const collections = { writing };
