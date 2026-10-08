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
/** A station figure under a plainer label. */
const figure = (slug: string, startsWith: string, label: string): Metric => {
  const m = station(slug).metrics.find((x) => x.label.startsWith(startsWith));
  if (!m) throw new Error(`work.ts: no metric "${startsWith}" on ${slug}`);
  return { ...m, label, note: undefined };
};
const card = (slug: string, rest: Omit<Featured, 'slug' | 'eyebrow'>): Featured => ({ slug, eyebrow: station(slug).domain, ...rest });

export const featured: Featured[] = [
  card('climate-risk-agent', {
    name: 'Climate-Risk Agent',
    outcome: 'Answers climate-risk questions for any place with cited reports, and refuses when it cannot check the answer.',
    metric: figure('climate-risk-agent', 'false answers', 'on 105 held-out questions. It refused all 35 out-of-scope ones, and 21 it could have answered.'),
    tags: ['LangGraph', 'MCP', 'Gemini'],
    live: station('climate-risk-agent').links.find((l) => l.label === 'live app')?.url,
  }),
  card('incident-evidence-compiler', {
    name: 'Incident Evidence Compiler',
    outcome: 'Finds the root cause of an outage. The LLM only proposes, deterministic checks decide, and "unknown" is a valid answer.',
    metric: figure('incident-evidence-compiler', 'held-out top-1', 'true root cause ranked first, on 90 sealed held-out incidents it had never seen (deterministic engine)'),
    tags: ['FastAPI', 'PostgreSQL', 'Prometheus'],
  }),
  card('vera-bot', {
    name: 'vera-bot',
    outcome: 'Merchant-messaging engine for the magicpin Vera AI Challenge. Code decides what is true; the LLM only rewrites checked facts.',
    metric: figure('vera-bot', 'judge-replica', "agreement between its offline judge and the organiser's official scores (Spearman, 15 cases), so every change was scored before it shipped"),
    tags: ['FastAPI', 'Vertex AI', 'Cloud Run'],
    isPrivate: true,
  }),
  card('fairness-credit-risk', {
    name: 'Fairness-Aware Credit Scoring',
    outcome: 'Credit scoring with standard fairness fixes, each tested against a tuned baseline on identical seeded splits. The result was a null, and I published it.',
    metric: figure('fairness-credit-risk', 'alternatives beat', 'alternatives, three fairness fixes and a foundation model, beat the tuned baseline by more than noise. With 62 women in the 200-row test set, no interval was narrow enough to tell.'),
    tags: ['AIF360', 'Fairlearn', 'FastAPI'],
  }),
];

/** Every other project, listed compactly after the flagships. */
export const others: Station[] = stations.filter((s) => !featured.some((f) => f.slug === s.slug));
