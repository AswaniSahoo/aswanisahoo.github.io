/** A number that is allowed on the page only with the date it was checked and where. */
export interface Metric {
  label: string;
  value: string;
  /** ISO date the figure was last confirmed at its source. */
  verifiedAt: string;
  /** URL of the source: README, leaderboard, issue, GitHub API result. */
  source: string;
  /** Optional one-line caveat, e.g. "dev split" or "held-out, opened once". */
  note?: string;
  /** Receipt label, when the source URL's shape does not name the evidence well. */
  evidence?: string;
  /** Fast-moving number: the receipt shows the month it was read. Derived from the label if unset. */
  fast?: boolean;
}

export interface Link {
  label: string;
  url: string;
}

export interface Project {
  slug: string;
  name: string;
  repo: string;
  role: string;
  summary: string;
  bullets: string[];
  metrics: Metric[];
  stack: string[];
  command?: string;
  /** Extra public surfaces: live app, container image, registry entry. */
  links?: Link[];
  /** The repository is private: metrics render stamped but unlinked. */
  isPrivate?: boolean;
}

/** One entry in the Station reports grid: every substantive own repository. */
export interface Station {
  slug: string;
  name: string;
  /** Domain label shown as the eyebrow, e.g. "Agentic AI / climate risk". */
  domain: string;
  summary: string;
  repo: string;
  isPrivate?: boolean;
  /** Short state label and how to colour it. */
  status: { label: string; kind: 'live' | 'private' | 'plain' };
  /** Test count drives the station glyph's cloud cover. Optional: some repos have no suite. */
  tests?: Metric;
  metrics: Metric[];
  stack: string[];
  links: Link[];
}

export interface NegativeResult {
  title: string;
  claimTested: string;
  whatHappened: string;
  number: Metric;
  whyItMatters: string;
}

export interface Certification {
  name: string;
  issuer: string;
  issued: string;
  validTo: string;
  verifiedAt: string;
}

export interface PullRequest {
  repo: string;
  org: string;
  project: string;
  domain: string;
  number: number;
  title: string;
  url: string;
  status: 'merged' | 'open' | 'closed';
  date: string;
  mergedVia: 'api' | 'label' | null;
}

export interface PrLedger {
  verifiedAt: string;
  author: string;
  totals: { merged: number; open: number; closed: number; projects: number };
  byProject: Record<string, { merged: number; open: number; closed: number }>;
  prs: PullRequest[];
}
