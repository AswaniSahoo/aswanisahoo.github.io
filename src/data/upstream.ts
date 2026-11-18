import ledger from './prs.json';
import type { PrLedger } from './types';

const data = ledger as PrLedger;

/**
 * The upstream headline is frozen (wiki/state.md). Raised from 33 to 34 on 2026-09-30 after
 * krkn-chaos/krkn-ai #481 merged on 2026-09-29, and from 34 to 35 on 2026-11-18 after
 * brightbandtech/ExtremeWeatherBench #437 merged on 2026-11-16, both checked with gh. It is never
 * recomputed from a GitHub is:merged query, which under-counts the bot-merged PyTorch,
 * ExecuTorch and MalariaGEN PRs. If a ledger refresh ever disagrees, the build stops here
 * so the change is made on purpose, in this file and in the wiki, not silently.
 */
export const upstreamHeadline = {
  merged: 35,
  orgs: 6,
  text: '35 merged upstream PRs across 6 projects',
  verifiedAt: '2026-11-18',
} as const;

if (data.totals.merged !== upstreamHeadline.merged || data.totals.projects !== upstreamHeadline.orgs) {
  throw new Error(
    `prs.json says ${data.totals.merged} merged across ${data.totals.projects}; the frozen headline says ` +
      `${upstreamHeadline.merged} across ${upstreamHeadline.orgs}. Update src/data/upstream.ts and wiki/state.md together.`,
  );
}

/** Merged PRs per org, largest first, straight from the ledger. */
export const mergedByOrg = Object.entries(data.byProject)
  .filter(([, c]) => c.merged > 0)
  .map(([name, c]) => ({ name, merged: c.merged }))
  .sort((a, b) => b.merged - a.merged);

export const ledgerVerifiedAt = data.verifiedAt;

/** The id of a project's group in the ledger on the Open source sheet. */
export const ledgerId = (project: string) => `ledger-${project.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/**
 * What each project is, printed beside its name wherever the orgs are listed. Contributions
 * that were documentation only say so: every PyTorch and ExecuTorch merge so far is a docs PR.
 */
export const projectNote: Record<string, string> = {
  graph_weather: 'Open Climate Fix',
  PyTorch: 'docs',
  ExecuTorch: 'docs',
  'krkn-chaos': 'CNCF',
  MalariaGEN: 'genomics',
  ExtremeWeatherBench: 'Brightband',
};
for (const o of mergedByOrg) {
  if (!projectNote[o.name]) throw new Error(`upstream.ts: ${o.name} has merged PRs but no note in projectNote`);
}
