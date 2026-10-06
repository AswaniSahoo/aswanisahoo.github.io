// Regenerates src/data/prs.json from live GitHub via the gh CLI.
// Usage: node scripts/refresh-prs.mjs   (requires `gh auth login`)
//
// Merged detection: GitHub reports mergedAt: null on bot-merged PRs
// (PyTorch, ExecuTorch, MalariaGEN), so a PR counts as merged when
// mergedAt is set OR a label matches /merged/i.

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AUTHOR = 'AswaniSahoo';

// `project` is the unit the site counts ("34 merged upstream PRs across 5 orgs").
// PyTorch and ExecuTorch share a GitHub org but are separate projects with
// separate maintainers, so they count separately, matching wiki/oss-prs.md.
const REPOS = [
  { slug: 'openclimatefix/graph_weather', org: 'Open Climate Fix', project: 'graph_weather', domain: 'weather' },
  { slug: 'openclimatefix/open-data-pvnet', org: 'Open Climate Fix', project: 'open-data-pvnet', domain: 'weather' },
  { slug: 'openclimatefix/solar-consumer', org: 'Open Climate Fix', project: 'solar-consumer', domain: 'weather' },
  { slug: 'pytorch/pytorch', org: 'PyTorch', project: 'PyTorch', domain: 'ml-frameworks' },
  { slug: 'pytorch/executorch', org: 'PyTorch', project: 'ExecuTorch', domain: 'ml-frameworks' },
  { slug: 'krkn-chaos/krkn-ai', org: 'CNCF krkn-chaos', project: 'krkn-chaos', domain: 'chaos-engineering' },
  { slug: 'krkn-chaos/website', org: 'CNCF krkn-chaos', project: 'krkn-chaos', domain: 'chaos-engineering' },
  { slug: 'malariagen/malariagen-data-python', org: 'MalariaGEN', project: 'MalariaGEN', domain: 'genomics' },
];

const FIELDS = 'number,title,url,state,mergedAt,closedAt,createdAt,labels';

function pull(slug) {
  const out = execFileSync(
    'gh',
    ['pr', 'list', '--repo', slug, '--author', AUTHOR, '--state', 'all', '--limit', '100', '--json', FIELDS],
    // A hung network call fails the refresh instead of stalling it.
    { encoding: 'utf-8', timeout: 60_000 },
  );
  return JSON.parse(out);
}

const prs = [];
for (const repo of REPOS) {
  for (const p of pull(repo.slug)) {
    const labelMerged = p.labels.some((l) => /merged/i.test(l.name));
    const merged = Boolean(p.mergedAt) || labelMerged;
    const status = merged ? 'merged' : p.state === 'OPEN' ? 'open' : 'closed';
    prs.push({
      repo: repo.slug,
      org: repo.org,
      project: repo.project,
      domain: repo.domain,
      number: p.number,
      title: p.title,
      url: p.url,
      status,
      date: (p.mergedAt || p.closedAt || p.createdAt).slice(0, 10),
      mergedVia: merged && !p.mergedAt ? 'label' : merged ? 'api' : null,
    });
  }
}

prs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.number - a.number));

const summary = {};
for (const p of prs) {
  summary[p.project] ??= { merged: 0, open: 0, closed: 0 };
  summary[p.project][p.status] += 1;
}

// Local calendar date, not UTC: the stamp should match the day the check was run.
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const out = {
  verifiedAt: today,
  author: AUTHOR,
  totals: {
    merged: prs.filter((p) => p.status === 'merged').length,
    open: prs.filter((p) => p.status === 'open').length,
    closed: prs.filter((p) => p.status === 'closed').length,
    projects: new Set(prs.filter((p) => p.status === 'merged').map((p) => p.project)).size,
  },
  byProject: summary,
  prs,
};

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '..', 'src', 'data', 'prs.json');
writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${target}: ${out.totals.merged} merged, ${out.totals.open} open, ${out.totals.closed} closed across ${out.totals.projects} projects`);
