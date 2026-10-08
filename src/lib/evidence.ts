/**
 * Receipts: every number links to its evidence. The label comes from the data when it names
 * one, otherwise from the shape of the source URL. Fast-moving numbers (test counts, live
 * status) also show the month they were read.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const monthYear = (iso: string): string => {
  const [y, m] = iso.split('-');
  const name = MONTHS[Number(m) - 1];
  if (!y || !name) throw new Error(`Not an ISO date: ${iso}`);
  return `${name} ${y}`;
};

/**
 * Test counts and live status change often; everything else is pinned to its source. Test counts
 * match in the plural only: a result can mention a test ("the 2020 test year", "trend test").
 */
export const isFastMoving = (label: string): boolean => /\btests\b|test functions|\blive\b/i.test(label);

export function evidenceLabel(source: string): string {
  if (!source) throw new Error('Every number needs a source');
  if (!/^https?:/.test(source)) {
    if (/ledger|upstream|open-source/.test(source)) return 'PR ledger';
    return 'details';
  }
  const u = new URL(source);
  const p = u.pathname;
  const pr = p.match(/\/pull\/(\d+)/);
  if (pr) return `PR #${pr[1]}`;
  const issue = p.match(/\/issues\/(\d+)/);
  if (issue) return `issue #${issue[1]}`;
  if (/\/actions\/runs\//.test(p)) return 'CI run';
  if (/\/releases\/tag\//.test(p)) return 'release notes';
  if (/eval/i.test(p) && p.endsWith('.json')) return 'eval report';
  if (/\/tree\/[^/]+\/tests\/?$/.test(p)) return 'test suite';
  if (/\/pulls\/?$/.test(p) && u.search.includes('author')) return 'PR list';
  if (/leaderboard/.test(p)) return 'leaderboard';
  if (u.hostname === 'registry.modelcontextprotocol.io') return 'MCP registry';
  if (/\/pkgs\/container\//.test(p)) return 'container';
  if (u.hostname.endsWith('.run.app')) return 'live app';
  if (/protocol\.md$/.test(p)) return 'protocol';
  if (p.endsWith('.py')) return 'source code';
  if (u.hostname === 'github.com') {
    const parts = p.split('/').filter(Boolean);
    if (parts.length === 2) return 'README';
    if (parts.length === 1) return 'GitHub profile';
  }
  return u.hostname.replace(/^www\./, '');
}
