import { stations } from './projects';
import type { Metric, Station } from './types';

/** Every project has a case study at this path. */
export const reportHref = (slug: string): string => `/work/${slug}/`;

/**
 * The four flagships, shown first on the home page and the Projects page. Each card says what
 * the thing does in one plain sentence and carries one result. The figures come from the
 * station data, so a number changes in one place; only the label is reworded for a newcomer.
 */
export interface Featured {
  slug: string;
  name: string;
  eyebrow: string;
  outcome: string;
  metric: Metric;
  tags: string[];
  isPrivate?: boolean;
}

const station = (slug: string): Station => {
  const s = stations.find((x) => x.slug === slug);
  if (!s) throw new Error(`work.ts: no station ${slug}`);
  return s;
};
/** A station figure under a plainer label. `value` may restate it in another unit, never change it. */
const figure = (slug: string, startsWith: string, label: string, value?: string): Metric => {
  const m = station(slug).metrics.find((x) => x.label.startsWith(startsWith));
  if (!m) throw new Error(`work.ts: no metric "${startsWith}" on ${slug}`);
  return { ...m, label, value: value ?? m.value, note: undefined };
};

export const featured: Featured[] = [
  {
    slug: 'climate-risk-agent',
    name: 'Climate-Risk Agent',
    eyebrow: 'AI agent · climate risk',
    outcome: 'Answers climate-risk questions for any place with cited reports, and refuses when it cannot check the answer.',
    metric: figure('climate-risk-agent', 'citation validity', 'of citations valid against their source page, held-out set'),
    tags: ['LangGraph', 'MCP', 'Gemini', 'FastAPI'],
  },
  {
    slug: 'incident-evidence-compiler',
    name: 'Incident Evidence Compiler',
    eyebrow: 'AI systems · incident response',
    outcome: 'Finds the root cause of an outage. The LLM only proposes, deterministic checks decide, and "unknown" is a valid answer.',
    // 0.767 in the evaluation file, as a percentage.
    metric: figure('incident-evidence-compiler', 'held-out top-1', 'root cause ranked first, on 90 sealed held-out incidents', '76.7%'),
    tags: ['FastAPI', 'PostgreSQL', 'Prometheus', 'Gemini'],
  },
  {
    slug: 'vera-bot',
    name: 'vera-bot',
    eyebrow: 'LLM product · messaging',
    outcome: 'Merchant-messaging engine for the magicpin Vera AI Challenge. Code decides what is true; the LLM only rewrites checked facts.',
    metric: figure('vera-bot', 'judge-replica', "rank agreement with the organiser's judge (Spearman, 15 cases)"),
    tags: ['FastAPI', 'Vertex AI', 'Cloud Run', 'mypy'],
    isPrivate: true,
  },
  {
    slug: 'fairness-credit-risk',
    name: 'fairness-credit-risk',
    eyebrow: 'Responsible AI · credit risk',
    outcome: 'Fairness interventions tested on identical seeded splits. None improved disparate impact, and I published the null result.',
    metric: figure('fairness-credit-risk', 'German Credit', 'baseline disparate impact (the four-fifths rule asks for 0.8); no intervention improved it'),
    tags: ['AIF360', 'Fairlearn', 'FastAPI', 'Docker'],
  },
];

/** Every other project, listed compactly after the flagships. */
export const others: Station[] = stations.filter((s) => !featured.some((f) => f.slug === s.slug));
