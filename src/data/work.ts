import { stations } from './projects';
import type { Metric, Station } from './types';

/** Every project has a case study at this path. */
export const reportHref = (slug: string): string => `/work/${slug}/`;

/**
 * The four flagships, shown first on the home page and the Projects page. Each card says what
 * the thing does in one plain sentence and carries one result. The figures and the eyebrow come
 * from the station data, so they change in one place; only the label is reworded for a newcomer.
 */
export interface Featured {
  slug: string;
  name: string;
  eyebrow: string;
  outcome: string;
  metric: Metric;
  tags: string[];
  isPrivate?: boolean;
  /** A public demo, linked from the card beside the case study. */
  live?: string;
}

const station = (slug: string): Station => {
  const s = stations.find((x) => x.slug === slug);
  if (!s) throw new Error(`work.ts: no station ${slug}`);
  return s;
};
/** A station figure under a plainer label. `value` may restate the same finding from its other side. */
const figure = (slug: string, startsWith: string, label: string, value?: string): Metric => {
  const m = station(slug).metrics.find((x) => x.label.startsWith(startsWith));
  if (!m) throw new Error(`work.ts: no metric "${startsWith}" on ${slug}`);
  return { ...m, label, value: value ?? m.value, note: undefined };
};
const card = (slug: string, rest: Omit<Featured, 'slug' | 'eyebrow'>): Featured => ({ slug, eyebrow: station(slug).domain, ...rest });

export const featured: Featured[] = [
  card('climate-risk-agent', {
    name: 'Climate-Risk Agent',
    outcome: 'Answers climate-risk questions for any place with cited reports, and refuses when it cannot check the answer.',
    metric: figure('climate-risk-agent', 'false answers', 'on 105 held-out questions; 18 answerable ones refused'),
    tags: ['LangGraph', 'MCP', 'Gemini'],
    live: station('climate-risk-agent').links.find((l) => l.label === 'live app')?.url,
  }),
  card('incident-evidence-compiler', {
    name: 'Incident Evidence Compiler',
    outcome: 'Finds the root cause of an outage. The LLM only proposes, deterministic checks decide, and “unknown” is a valid answer.',
    metric: figure('incident-evidence-compiler', 'held-out top-1', 'root cause ranked first on 90 unseen incidents, by the deterministic engine'),
    tags: ['FastAPI', 'PostgreSQL', 'Prometheus'],
  }),
  card('weather-transformer-scratch', {
    name: 'Weather Transformer from Scratch',
    outcome: 'Forecasts four ERA5 weather fields six hours ahead. Every block, attention included, is written and unit-tested by hand.',
    // Pooled over four fields; the per-field split is on the case study, and the caption says where the gain is.
    metric: figure('weather-transformer-scratch', 'lower wind RMSE than persistence (u10 / v10)', 'lower 10 m wind error than a no-change forecast over 2020; temperature and geopotential still trail anomaly persistence'),
    tags: ['PyTorch', 'xarray', 'ERA5'],
  }),
  card('earthgym', {
    name: 'Earthgym',
    outcome: 'Weather and climate tasks for training and testing AI models, scored by code. The forecast, cyclone and heat graders reproduce published results before they score anything.',
    metric: figure('earthgym', 'ClimaQA Gold test questions', 'validated ClimaQA test questions that also appear, word for word, in the set its paper fine-tunes on'),
    tags: ['Inspect AI', 'verifiers', 'ERA5'],
  }),
];

/** Every other project, listed compactly after the flagships. */
export const others: Station[] = stations.filter((s) => !featured.some((f) => f.slug === s.slug));

/** The one figure a listed project shows, in plain words, where it has one. */
export const listFigure: Record<string, Metric> = {
  // The figure its flagship card used to carry, now that Earthgym holds that slot.
  'complaint-intelligence-system': figure('complaint-intelligence-system', 'vector search p95', '95th-percentile search time over 200K complaints, including encoding the query'),
  // The same finding as the case study's "0 of 4": three fairness fixes and a tabular foundation model.
  'fairness-credit-risk': figure('fairness-credit-risk', 'alternatives beat', 'methods beat the tuned baseline by more than noise'),
  // README, Testing: "81 comprehensive tests across 6 test files".
  'biodiversity-publication-analyzer': { ...station('biodiversity-publication-analyzer').tests!, label: 'tests across 6 test files' },
};
