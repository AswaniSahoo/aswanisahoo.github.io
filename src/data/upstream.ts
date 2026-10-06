import ledger from './prs.json';
import type { PrLedger } from './types';

const data = ledger as PrLedger;

/**
 * The upstream headline is frozen (wiki/state.md). Raised from 33 to 34 on 2026-09-30 after
 * krkn-chaos/krkn-ai #481 merged on 2026-09-29, checked with gh. It is never
 * recomputed from a GitHub is:merged query, which under-counts the bot-merged PyTorch,
 * ExecuTorch and MalariaGEN PRs. If a ledger refresh ever disagrees, the build stops here
 * so the change is made on purpose, in this file and in the wiki, not silently.
 */
export const upstreamHeadline = {
  merged: 34,
  orgs: 5,
  text: '34 merged upstream PRs across 5 orgs',
  verifiedAt: '2026-09-30',
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
