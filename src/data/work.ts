import { stations } from './projects';

/** Filter chips on the Work sheet. 'all' is the resting state. */
export const areaFilters = [
  { id: 'all', label: 'All' },
  { id: 'agents', label: 'Agents' },
  { id: 'science', label: 'Weather and science' },
  { id: 'retrieval', label: 'Retrieval and NLP' },
  { id: 'mlops', label: 'MLOps and tooling' },
] as const;

export type AreaId = Exclude<(typeof areaFilters)[number]['id'], 'all'>;

/** Which chips each station answers to. A station may sit under more than one. */
const areas: Record<string, AreaId[]> = {
  'climate-risk-agent': ['agents', 'science'],
  'incident-evidence-compiler': ['agents', 'mlops'],
  'vera-bot': ['agents'],
  'fairness-credit-risk': ['mlops'],
  'biodiversity-publication-analyzer': ['science', 'retrieval'],
  'weather-transformer-scratch': ['science'],
  'complaint-intelligence-system': ['retrieval'],
  'llama-task-agent': ['agents'],
  'mlops-batch-signal-task': ['mlops'],
  'krkn-doc-sync-bot': ['mlops'],
};

for (const s of stations) {
  if (!areas[s.slug]) throw new Error(`Station ${s.slug} has no filter area in src/data/work.ts`);
}

export const areasOf = (slug: string): AreaId[] => areas[slug] ?? [];

/** Every station has a report page at this path. */
export const reportHref = (slug: string): string => `/work/${slug}/`;
