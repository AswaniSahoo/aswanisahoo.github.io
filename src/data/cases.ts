/**
 * Report pages under /work/<slug>/, one per station. Each case is assembled from the audited
 * objects in projects.ts, negative.ts and profile.ts; nothing here introduces a number.
 * Sections are optional: a project with little audited material gets a short page, not padding.
 */
import type { Link, Metric, Station } from './types';
import { climateRiskAgent, hazardStats, iec, instruments, llamaTaskAgent, retrievalLatency, stations, veraBot, weatherTransformer } from './projects';
import { negativeResults } from './negative';
import { profile } from './profile';

export interface Readout {
  text: string;
  source: string;
  verifiedAt: string;
}

export interface CaseNote {
  title: string;
  text: string;
  metrics?: Metric[];
  readout?: Readout;
}

/** One entry under "What failed and what changed": labelled rows, optionally a stamped number. */
export interface CaseBlock {
  title: string;
  rows: [string, string][];
  metric?: Metric;
  source?: Link;
}

export interface CaseTable {
  caption: string;
  head: string[];
  rows: (string | number)[][];
  /** Column drawn as a bar scaled to its maximum. */
  barColumn?: number;
  verifiedAt: string;
  source: string;
}

export interface CaseStudy {
  slug: string;
  station: Station;
  name: string;
  /** One line under the name. */
  summary: string;
  status: {
    label: string;
    kind: Station['status']['kind'];
    detail?: string;
    /** The status claim that decays (for example "live"), stamped where it was checked. */
    check?: { label: string; verifiedAt: string; source: string };
  };
  /** At most five, stamped, under the banner. */
  metrics: Metric[];
  problem?: string[];
  how?: { diagram?: 'cra-flow' | 'control-loop'; lead?: string; notes?: CaseNote[] };
  evaluation?: { text?: string[]; metrics?: Metric[]; readouts?: Readout[]; table?: CaseTable; artifacts?: Link[] };
  changes?: CaseBlock[];
  stack: { chips: string[]; proofs: { tool: string; proof: string }[] };
  links: Link[];
  command?: string;
  /** Posts in this series are listed under Related writing. */
  relatedSeries?: string;
}

const need = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new Error(`cases.ts: missing ${what} in the audited data`);
  return value;
};
const metric = (list: Metric[], prefix: string) => need(list.find((m) => m.label.startsWith(prefix)), `metric "${prefix}"`);
const station = (slug: string) => need(stations.find((s) => s.slug === slug), `station ${slug}`);
const readout = (prefix: string): Readout =>
  need(instruments.flatMap((p) => p.items).find((i) => i.text.startsWith(prefix)), `readout "${prefix}"`);
const proofs = (pattern: RegExp) => profile.stack.filter((s) => pattern.test(s.proof)).map((s) => ({ tool: s.tool, proof: s.proof }));
const repoLink = (url: string): Link => ({ label: 'repository', url });

/** Negative results render as a block: the claim, what happened, why it matters. The numbers
 * are already stamped in the page's headline row, so the block does not stamp them twice. */
const negative = (title: string): CaseBlock => {
  const r = need(negativeResults.find((n) => n.title === title), `negative result "${title}"`);
  return {
    title: r.title,
    rows: [
      ['Claim tested', r.claimTested],
      ['What happened', r.whatHappened],
      ['Why it matters', r.whyItMatters],
    ],
  };
};

/* ------------------------------------------------------------------ */
/* Climate-Risk Agent                                                  */
/* ------------------------------------------------------------------ */

const craStation = station('climate-risk-agent');
const CRA = climateRiskAgent.repo;
const craLive = need(craStation.links.find((l) => l.label === 'live app'), 'CRA live app link');
const craRecall = metric(climateRiskAgent.metrics, 'recall@3');

const climateRiskAgentCase: CaseStudy = {
  slug: 'climate-risk-agent',
  station: craStation,
  name: climateRiskAgent.name,
  summary: 'Cited, typed climate-risk reports or an explicit refusal, for any location.',
  status: {
    label: craStation.status.label,
    kind: craStation.status.kind,
    detail: climateRiskAgent.role,
    // HTTP 200 from the live app, checked 2026-09-29.
    check: { label: 'live app', verifiedAt: '2026-09-29', source: craLive.url },
  },
  metrics: climateRiskAgent.metrics,
  problem: [
    'A question about heat, extreme rain or wind at one place needs three kinds of evidence at once: a live forecast, the local record of extremes from ERA5, and what IPCC AR6 assesses for that region.',
    'The agent returns a typed report whose citations are validated against the page they came from, or an explicit refusal. A question it cannot check gets the refusal, not a guess.',
  ],
  how: {
    diagram: 'cra-flow',
    lead: 'The question is parsed, geocoded and mapped to its IPCC AR6 region before the agent sees it. The agent can refuse at its first step; otherwise it fetches the forecast, searches AR6, reads the regional projection and writes the report. The flow follows the diagram in the repository README.',
    notes: [
      {
        title: 'Hybrid retrieval',
        text: 'BM25 plus dense embeddings fused with reciprocal rank fusion, with every citation validated against the source page.',
      },
      {
        title: 'Hazard statistics',
        text: '60+ years of ERA5 fitted with stationary and non-stationary GEV distributions, a likelihood-ratio trend test, and 90% bootstrap confidence intervals.',
        metrics: [metric(hazardStats.metrics, 'Berlin'), metric(hazardStats.metrics, 'Delhi')],
      },
      { title: 'Two MCP servers', text: need(climateRiskAgent.bullets[1], 'CRA MCP bullet') },
      { title: 'Operations', text: readout('Climate-Risk Agent records').text, readout: readout('Climate-Risk Agent records') },
    ],
  },
  evaluation: {
    text: [
      need(climateRiskAgent.bullets[2], 'CRA eval bullet'),
      'Refusals are scored with the answers: correct answer, correct refusal, false refusal, false answer. Any false answer fails the build.',
      'The agent also measures its own forecast skill per lead day and weights the confidence of every report by it.',
    ],
    metrics: [metric(hazardStats.metrics, 'daily max temperature forecast MAE')],
    artifacts: [
      { label: 'held-out retrieval run, 2026-09-07 (JSON)', url: craRecall.source },
      { label: 'evaluation section of the README', url: `${CRA}#evaluation` },
    ],
  },
  changes: [
    {
      title: 'Rerankers and query rewriting',
      rows: [
        ['Failed', 'Two rerankers and a query rewriter were measured on the dev set. They cost 4 to 38 seconds per query, and none beat the baseline at any k.'],
        ['Changed', 'Both stay wired in the code and ship switched off.'],
      ],
      source: { label: 'README', url: `${CRA}#evaluation` },
    },
    {
      title: 'Forecast confidence',
      rows: [
        ['Failed', "A forecast peak far out is a weaker claim than tomorrow's, and the error grows with lead time (see Evaluation)."],
        ['Changed', 'Report confidence is weighted by the measured skill at the lead day asked about.'],
      ],
      source: { label: 'README', url: `${CRA}#forecast-skill` },
    },
    {
      title: 'MCP servers without credentials',
      rows: [
        ['Failed', 'Servers launched by an MCP client started without credentials.'],
        ['Changed', 'Fixed with load_dotenv(override=False).'],
      ],
    },
  ],
  stack: { chips: climateRiskAgent.stack, proofs: proofs(/climate-risk-agent/i) },
  links: [repoLink(CRA), ...(climateRiskAgent.links ?? [])],
  command: climateRiskAgent.command,
  relatedSeries: 'Building an evaluated climate-risk agent in public',
};

/* ------------------------------------------------------------------ */
/* Incident Evidence Compiler                                          */
/* ------------------------------------------------------------------ */

const iecStation = station('incident-evidence-compiler');

const iecCase: CaseStudy = {
  slug: iec.slug,
  station: iecStation,
  name: iec.name,
  summary: iecStation.summary,
  status: { label: iecStation.status.label, kind: iecStation.status.kind, detail: iec.role },
  metrics: iec.metrics,
  how: {
    diagram: 'control-loop',
    lead: iec.summary,
    notes: [
      { title: 'Telemetry', text: readout('Incident Evidence Compiler ingests').text, readout: readout('Incident Evidence Compiler ingests') },
      { title: 'Hostile input', text: readout('Incident Evidence Compiler: 3,000').text, readout: readout('Incident Evidence Compiler: 3,000') },
      { title: 'Architecture', text: need(iec.bullets[2], 'IEC architecture bullet') },
    ],
  },
  evaluation: {
    text: [need(iec.bullets[0], 'IEC evaluation bullet')],
    readouts: [readout('Incident Evidence Compiler: the held-out split')],
    artifacts: iec.links ?? [],
  },
  changes: [negative('The held-out number is lower, on purpose')],
  stack: { chips: iec.stack, proofs: proofs(/Incident Evidence Compiler/) },
  links: [repoLink(iec.repo), ...(iec.links ?? [])],
};

/* ------------------------------------------------------------------ */
/* vera-bot (private)                                                  */
/* ------------------------------------------------------------------ */

const veraStation = station('vera-bot');

const veraCase: CaseStudy = {
  slug: veraBot.slug,
  station: veraStation,
  name: veraBot.name,
  summary: veraStation.summary,
  status: { label: veraStation.status.label, kind: veraStation.status.kind, detail: veraBot.role },
  metrics: veraBot.metrics,
  how: {
    lead: veraBot.summary,
    notes: [{ title: 'Facts need provenance', text: need(veraBot.bullets[0], 'vera-bot provenance bullet') }],
  },
  evaluation: {
    text: [need(veraBot.bullets[1], 'vera-bot judge bullet'), need(veraBot.bullets[2], 'vera-bot trigger bullet')],
  },
  changes: [{ title: 'gemini-3.7-flash', rows: [['Measured', need(veraBot.bullets[3], 'vera-bot model bullet')]] }],
  stack: { chips: veraBot.stack, proofs: proofs(/vera-bot/) },
  links: [],
};

/* ------------------------------------------------------------------ */
/* The rest of the stations                                            */
/* ------------------------------------------------------------------ */

const fairness = station('fairness-credit-risk');
const fairnessResult = need(negativeResults.find((n) => n.title === 'No intervention improved fairness'), 'fairness result');
const fairnessCase: CaseStudy = {
  slug: fairness.slug,
  station: fairness,
  name: fairness.name,
  summary: fairness.summary,
  status: { label: fairness.status.label, kind: fairness.status.kind },
  metrics: [...fairness.metrics, ...(fairness.tests ? [fairness.tests] : [])],
  problem: [`Claim tested: ${fairnessResult.claimTested.charAt(0).toLowerCase()}${fairnessResult.claimTested.slice(1)}`],
  evaluation: { text: [fairnessResult.whatHappened] },
  changes: [
    {
      title: fairnessResult.title,
      rows: [
        ['Why it matters', fairnessResult.whyItMatters],
        ['Also measured', 'A 1.6B tabular foundation model did not distinguishably beat a tuned GBDT.'],
      ],
    },
  ],
  stack: { chips: fairness.stack, proofs: [] },
  links: fairness.links,
};

const bio = station('biodiversity-publication-analyzer');
const bioCase: CaseStudy = {
  slug: bio.slug,
  station: bio,
  name: bio.name,
  summary: bio.summary,
  status: { label: bio.status.label, kind: bio.status.kind },
  metrics: [...bio.metrics, ...(bio.tests ? [bio.tests] : [])],
  stack: { chips: bio.stack, proofs: [] },
  links: bio.links,
};

const wt = station('weather-transformer-scratch');
const wtCase: CaseStudy = {
  slug: wt.slug,
  station: wt,
  name: wt.name,
  summary: wt.summary,
  status: { label: wt.status.label, kind: wt.status.kind, detail: weatherTransformer.role },
  metrics: weatherTransformer.metrics,
  how: {
    lead: weatherTransformer.summary,
    notes: [{ title: 'Built block by block', text: need(weatherTransformer.bullets[0], 'transformer blocks bullet') }],
  },
  evaluation: { text: [need(weatherTransformer.bullets[1], 'transformer evaluation bullet')] },
  stack: { chips: weatherTransformer.stack, proofs: proofs(/weather-transformer-scratch/) },
  links: wt.links,
};

const cis = station('complaint-intelligence-system');
const cisCase: CaseStudy = {
  slug: cis.slug,
  station: cis,
  name: cis.name,
  summary: cis.summary,
  status: { label: cis.status.label, kind: cis.status.kind },
  metrics: cis.metrics,
  evaluation: {
    text: [retrievalLatency.summary],
    table: {
      caption: retrievalLatency.name,
      head: ['method', 'p50 (ms)', 'p95 (ms)'],
      rows: retrievalLatency.rows.map((r) => [r.method, r.p50, r.p95]),
      barColumn: 2,
      verifiedAt: retrievalLatency.verifiedAt,
      source: `${retrievalLatency.repo}#retrieval-latency`,
    },
  },
  stack: { chips: cis.stack, proofs: proofs(/complaint-intelligence-system/) },
  links: cis.links,
};

const llama = station('llama-task-agent');
const llamaCase: CaseStudy = {
  slug: llama.slug,
  station: llama,
  name: llama.name,
  summary: llama.summary,
  status: { label: llama.status.label, kind: llama.status.kind, detail: llamaTaskAgent.role },
  metrics: [],
  how: { lead: llamaTaskAgent.summary },
  stack: { chips: llamaTaskAgent.stack, proofs: proofs(/llama-task-agent/) },
  links: llama.links,
};

const plain = (slug: string): CaseStudy => {
  const s = station(slug);
  return {
    slug,
    station: s,
    name: s.name,
    summary: s.summary,
    status: { label: s.status.label, kind: s.status.kind },
    metrics: [...s.metrics, ...(s.tests ? [s.tests] : [])],
    stack: { chips: s.stack, proofs: [] },
    links: s.links,
  };
};

const all: CaseStudy[] = [
  climateRiskAgentCase,
  iecCase,
  veraCase,
  fairnessCase,
  bioCase,
  wtCase,
  cisCase,
  llamaCase,
  plain('mlops-batch-signal-task'),
  plain('krkn-doc-sync-bot'),
];

// Every station on the Work sheet links to /work/<slug>/, so every station needs a case.
for (const s of stations) {
  if (!all.some((c) => c.slug === s.slug)) throw new Error(`cases.ts: no report for station ${s.slug}`);
}

/** In Work-sheet order: flagships first, then by test count. */
export const cases: CaseStudy[] = stations.map((s) => need(all.find((c) => c.slug === s.slug), `case ${s.slug}`));
