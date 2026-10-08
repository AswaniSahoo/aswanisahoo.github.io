import type { Link, Metric, Project, Station } from './types';

const GH = 'https://github.com/AswaniSahoo';
const GW = 'https://github.com/openclimatefix/graph_weather';
const CRA = `${GH}/climate-risk-agent`;
const IEC = `${GH}/Incident-evidence-compiler`;
const IEC_CI_RUN = `${IEC}/actions/runs/33744139090`;
// Latest CI run on main (2026-08-10), pytest summary line: "235 passed, 2 skipped".
const FCR_CI_RUN = `${GH}/fairness-credit-risk/actions/runs/31434373846`;
const CRA_LIVE = 'https://climate-risk-agent-714882950125.us-central1.run.app/';
const CRA_IMAGE = 'ghcr.io/aswanisahoo/climate-ipcc-rag-mcp:0.1.0';
// The repo-scoped /pkgs/container/ path returns 404; the user-scoped package page resolves (2026-10-04).
// The image index holds one linux/amd64 image plus a build attestation, so it is not multi-arch.
const CRA_IMAGE_PAGE = 'https://github.com/users/AswaniSahoo/packages/container/package/climate-ipcc-rag-mcp';
const CRA_REGISTRY = 'https://registry.modelcontextprotocol.io/v0/servers?search=climate-ipcc-rag';

/* ------------------------------------------------------------------ */
/* Forecast: the atmosphere                                            */
/* ------------------------------------------------------------------ */

export const meshSeries = {
  name: 'Adaptive and stretched mesh series, graph_weather',
  repo: GW,
  issue: `${GW}/issues/3`,
  summary:
    'Open Climate Fix\'s graph_weather is a graph-neural-network weather model. The original 2022 vision for it was an adaptive mesh: a coarse global graph with high-resolution regional patches. I picked that thread up in May 2026 and shipped it as a series of small upstream PRs.',
  arc: [
    { range: '#166, #171, #181', when: 'Aug to Dec 2025', what: 'ThermalizerLayer for inference-time denoising, NNJA-AI observation loader, Thermalizer diffusion-step and positional-encoding channel-mismatch fix.' },
    { range: '#218 to #221', when: 'Jun 2026', what: 'H3 v4 migration, runtime bipartite graph builder, RegionalForecaster for movable regional prediction.' },
    { range: '#223 to #229', when: 'Jun to Jul 2026', what: 'Boundary nudging layer, RegionalDataset with global context, variable-resolution H3 mesh, latent graph and point assignment for mixed resolution.' },
    { range: '#233 to #239', when: 'Jul 2026', what: 'Stretched-grid regional forecaster, region-weighted loss, stretched dataset with global and regional observations, decoder observation features.' },
  ],
  finding: {
    title: 'the decoder was forecasting persistence',
    text:
      'Regional forecasts stalled at the persistence baseline no matter the processor depth. The decoder seeded its observation nodes with zeros and threw away the per-observation features the encoder had just computed, so an observation\'s own values reached the output only through the fixed residual. The fix is a zero-parameter skip connection, shipped in #237 for the stretched model and #239 for the regional one.',
    metric: {
      label: 'held-out skill over persistence on unseen regions, before and after the fix',
      // PR #237 body: "the fix reaches 0.171 held-out region-weighted MSE against 0.206 for the old zeros seed
      // and 0.214 for persistence, so it beats persistence by about 20% on unseen regions where the old model
      // managed about 4%." The "about" is kept as ≈.
      value: '≈ 4% → ≈ 20%',
      note: 'region-weighted MSE 0.206 → 0.171 against 0.214 for persistence',
      verifiedAt: '2026-09-30',
      source: `${GW}/pull/237`,
    } satisfies Metric,
  },
  metrics: [
    { label: 'merged PRs in graph_weather', value: '19', verifiedAt: '2026-09-03', source: `${GW}/pulls?q=is%3Apr+author%3AAswaniSahoo+is%3Amerged` },
  ] satisfies Metric[],
};

export const weatherTransformer: Project = {
  slug: 'weather-transformer-scratch',
  name: 'Weather transformer, from scratch',
  repo: `${GH}/weather-transformer-scratch`,
  role: 'Solo',
  summary:
    'A physics-aware vision transformer for 6-hour ERA5 prediction, with attention written by hand instead of nn.MultiheadAttention, and a physics-informed loss.',
  bullets: [
    'Every block implemented and unit-tested individually: patch embedding, positional encoding, attention, transformer block, physics loss.',
    'Evaluated on a 2020 ERA5 test slice against a persistence baseline, the honest floor for short-range forecasts.',
  ],
  metrics: [
    { label: 'RMSE improvement over persistence', value: '27%', verifiedAt: '2026-07-19', source: `${GH}/weather-transformer-scratch` },
    { label: 'parameters', value: '4,805,440', verifiedAt: '2026-09-30', source: `${GH}/weather-transformer-scratch` },
    { label: 'unit tests', value: '74', verifiedAt: '2026-09-30', source: `${GH}/weather-transformer-scratch` },
  ],
  stack: ['PyTorch', 'xarray', 'zarr', 'ERA5 / WeatherBench2'],
};

export const hazardStats = {
  name: 'ERA5 extreme-value hazard statistics',
  repo: CRA,
  summary:
    'Inside the Climate-Risk Agent: 60+ years of ERA5 fitted with stationary and non-stationary GEV distributions, a likelihood-ratio trend test, and 90% bootstrap confidence intervals. Since September the agent also measures its own forecast skill per lead day and weights report confidence by it.',
  metrics: [
    { label: 'Berlin warming trend (non-stationary GEV)', value: '+0.76 °C / decade', note: 'p < 0.0001', verifiedAt: '2026-09-19', source: `${CRA}#readme` },
    { label: 'Delhi trend test', value: 'stationary', note: 'p = 0.56', verifiedAt: '2026-09-19', source: `${CRA}#readme` },
    // README (commit 7816673) line 140: "| Hazard | MAE, day 1 | MAE, day 7 | Extreme days caught, day 1 → day 7 |"
    // and line 142: "| Daily max temperature | 0.70 °C | 1.93 °C | 85% → 47% |". 85% → 47% is extreme days caught.
    { label: 'daily max temperature forecast MAE, day 1 → day 7', value: '0.70 → 1.93 °C', note: 'extreme days caught, day 1 → day 7: 85% → 47%; 13 cities, about 9,200 city-days per lead day', verifiedAt: '2026-09-30', source: `${CRA}#forecast-skill` },
  ] satisfies Metric[],
};

/* ------------------------------------------------------------------ */
/* Regulate: agents under constraint                                   */
/* ------------------------------------------------------------------ */

export const iec: Project = {
  slug: 'incident-evidence-compiler',
  name: 'Incident Evidence Compiler',
  repo: IEC,
  role: 'Solo, Apache-2.0',
  summary:
    'Gemini may only hypothesise over an allow-list of signals. A verifier then returns SUPPORTED, REFUTED or UNKNOWN against a content-addressed evidence ledger, and UNKNOWN is a real answer.',
  bullets: [
    'Two-arm A/B design: deterministic baseline versus verifier-gated Gemini, on two RCAEval splits. The held-out split RE2-TT was sealed and opened exactly once, on 2026-07-19, against a frozen commit. No tuning after.',
    'Telemetry arrives through a bounded range-query client against a real Prometheus v3.6.0; five iec_* metrics leave through a dependency-free /metrics endpoint. Every abstention still returns a deterministic ranking.',
    'Hexagonal architecture, PostgreSQL with SKIP LOCKED, mypy strict, 19 ADRs. Untrusted input is capped at 65,536 characters and 32 predicates before it is parsed.',
    // README, Results: "Read those rows as a bracket, not a race"; re2-tt-gemini.json: answered_count 38,
    // top1_accuracy_answered 0.368421, invalid_evidence_id_count 0 (checked 2026-10-07).
    'The Gemini arm is a stress test of the verification gate, not a race with the engine: it sees signal names only, never values, so it is choosing among about 72 signals. On the sealed split it answered 38 of 90 cases, 36.8% top-1 on those, abstained on the rest, and cited no invalid evidence.',
  ],
  metrics: [
    // Top-1 and top-3 as percentages of the evaluation files' 0.767 / 0.878 and 0.932 / 0.989.
    { label: 'root cause ranked first by the deterministic engine, sealed held-out set (90 incidents)', value: '76.7%', note: 'top-3 87.8%, MRR 0.833', verifiedAt: '2026-10-07', source: `${IEC}/blob/main/docs/evaluation/re2-tt-baseline.json`, evidence: 'eval report' },
    { label: 'the same on the development set (88 incidents)', value: '93.2%', note: 'top-3 98.9%, MRR 0.959', verifiedAt: '2026-10-07', source: `${IEC}/blob/main/docs/evaluation/re2-ob-baseline.json`, evidence: 'eval report' },
    { label: 'invalid evidence citations across 178 evaluated cases and two model generations', value: '0', verifiedAt: '2026-09-19', source: `${IEC}#readme` },
    { label: 'held-out cases the Gemini arm answered, given signal names only; 36.8% top-1 on those', value: '38 of 90', verifiedAt: '2026-10-07', source: `${IEC}/blob/main/docs/evaluation/re2-tt-gemini.json`, evidence: 'eval report' },
    { label: 'tests run by the CI gate, no DB, network or credentials', value: '363', note: '10 skipped', verifiedAt: '2026-09-19', source: IEC_CI_RUN },
  ],
  stack: ['Python 3.12', 'FastAPI', 'PostgreSQL', 'Prometheus', 'Gemini', 'unittest', 'mypy --strict'],
  links: [
    { label: 'sealed-run protocol', url: `${IEC}/blob/main/docs/evaluation/re2-tt-sealed-protocol.md` },
    { label: 'CI gate', url: IEC_CI_RUN },
  ],
};

export const climateRiskAgent: Project = {
  slug: 'climate-risk-agent',
  name: 'Climate-Risk Agent',
  repo: CRA,
  role: 'Solo, MIT, v1.0.0 released 2026-09-08',
  // README (commit 7816673) line 40: "From there a five-node LangGraph agent (plan, call, research, project, synthesize)
  // either produces a typed `RiskReport` or refuses."
  summary:
    'An agentic climate-risk analyst that returns typed, cited risk reports or an explicit refusal, for any location. A five-node LangGraph agent (plan, call, research, project, synthesize) over ERA5 hazard statistics, live forecasts, and a page-validated IPCC AR6 retrieval index.',
  bullets: [
    'Hybrid retrieval: BM25 plus dense embeddings fused with reciprocal rank fusion, citations validated against the source page. Two rerankers and a query rewriter were measured on the dev set and kept off: they cost 4 to 38 seconds per query, and none beat the baseline at any k.',
    'Two MCP servers ship with it, weather and ipcc-rag, on protocol revision 2026-07-28 with ToolAnnotations. The IPCC server is indexed on the official MCP registry and published as a public container image.',
    'Both eval sets are SHA-256 frozen. The 105-question held-out set was written after the dev set existed and never used to tune anything.',
  ],
  metrics: [
    // e2e-test-gemini-2.5-flash-2026-07-22.json, the run behind the README's held-out citation validity
    // (47/49): correct_answer 49, correct_refuse 35, false_refuse 21, no false_answer cell (checked 2026-10-07).
    { label: 'false answers on 105 held-out questions', value: '0 of 105', note: 'all 35 out-of-scope questions refused; 49 of 70 answerable answered', verifiedAt: '2026-10-07', source: `${CRA}/blob/main/evals/results/e2e-test-gemini-2.5-flash-2026-07-22.json`, evidence: 'held-out run' },
    { label: 'citation validity, held-out', value: '96%', note: '47 of 49 answers', verifiedAt: '2026-10-07', source: `${CRA}#readme` },
    // README (commit 7816673) line 98: "Held-out results (second exposure, on the exact configuration deployed):".
    // The cited JSON's HEADLINE (answer) row: n 70, recall@3 0.8714, @5 0.9143, @10 0.9571.
    { label: 'recall@3 / @5 / @10, held-out, second exposure', value: '87 / 91 / 96%', note: 'n = 70 answerable', verifiedAt: '2026-09-30', source: `${CRA}/blob/main/evals/results/retrieval-test-2026-09-07.json` },
    { label: 'test functions in the suite, 48 files', value: '490', verifiedAt: '2026-09-19', source: `${CRA}/tree/main/tests` },
    { label: 'cost per question, held-out run', value: '≈ $0.003', note: 'p50 latency 3.9 s', verifiedAt: '2026-09-19', source: `${CRA}#readme` },
  ],
  stack: ['LangGraph', 'Gemini', 'FastAPI', 'MCP', 'scipy', 'Docker', 'Cloud Run'],
  command: `docker pull ${CRA_IMAGE}`,
  links: [
    { label: 'live app', url: CRA_LIVE },
    { label: 'container', url: CRA_IMAGE_PAGE },
    { label: 'MCP registry', url: CRA_REGISTRY },
  ],
};

export const veraBot: Project = {
  slug: 'vera-bot',
  name: 'vera-bot',
  repo: `${GH}/vera-bot`,
  isPrivate: true,
  role: 'Solo, built for the magicpin Vera AI Challenge',
  summary:
    'A merchant-messaging engine that is deterministic first: a resolver decides what is true, a validator gates every outbound body, and a template guarantees a message inside the latency budget. Gemini on Vertex AI rewrites the prose from the same facts when it answers in time, and is dropped when it does not.',
  bullets: [
    'Fabrication is blocked at the type level: a Fact cannot be constructed without a provenance path into merchant, category, trigger or customer data.',
    'A local replica of the organiser\'s LLM judge, validated against their ten published case-study scores, measures every change before it ships.',
    'On a 100-trigger set the bot emits 69 actions and stays silent on 31 by design; every emitted action carries a trigger-connected fact.',
    'gemini-3.7-flash was measured and rejected: minimal thinking returned HTTP 400 and other settings truncated output.',
  ],
  metrics: [
    { label: 'judge-replica agreement with the organiser\'s anchors, Spearman on totals', value: '0.830', note: 'residual MAE 0.763, n = 15, 150 calls', verifiedAt: '2026-09-19', source: `${GH}/vera-bot` },
    { label: 'test functions across 37 files', value: '1,135', verifiedAt: '2026-09-30', source: `${GH}/vera-bot` },
    { label: 'commits in ten days, CI green on each of the last five runs', value: '97', verifiedAt: '2026-09-19', source: `${GH}/vera-bot` },
  ],
  stack: ['Python', 'FastAPI', 'Gemini on Vertex AI', 'Cloud Run', 'mypy --strict', 'pytest'],
};

export const llamaTaskAgent: Project = {
  slug: 'llama-task-agent',
  name: 'LLaMA task agent',
  repo: `${GH}/llama-task-agent`,
  role: 'Solo',
  summary:
    'LLaMA-3.1-8B fine-tuned with LoRA in 4-bit for tool execution under a strict output contract, so downstream code parses the call instead of trusting free text.',
  bullets: [],
  metrics: [],
  stack: ['PyTorch', 'PEFT / LoRA', 'Hugging Face Transformers', '4-bit quantization'],
};

/* ------------------------------------------------------------------ */
/* Measure: instruments                                                */
/* ------------------------------------------------------------------ */

/** Readouts the case studies quote as notes (cases.ts, readout()), each with its source. */
export const instruments = [
  {
    heading: 'Telemetry',
    items: [
      { text: 'Reads a real Prometheus through a bounded range-query client and exposes five metrics at /metrics: job outcomes, per-stage duration, provider timeouts, tokens and verdicts.', source: `${IEC}#readme`, verifiedAt: '2026-09-19' },
      { text: 'Records per-request telemetry and cost, with a shared Redis cache, a disk fallback and a prewarm script for the hazard fits.', source: `${CRA}/blob/main/tools/cache_backend.py`, verifiedAt: '2026-09-19' },
    ],
  },
  {
    heading: 'Evaluation discipline',
    items: [
      { text: 'Incident Evidence Compiler: the held-out split was sealed and opened once, against a named commit, with the protocol committed next to the results.', source: `${IEC}/blob/main/docs/evaluation/re2-tt-sealed-protocol.md`, verifiedAt: '2026-09-30' },
      { text: 'Model ablations run with 5 seeds and a held-out split before any architecture claim is made.', source: `${GW}/issues/238#issuecomment-5150272270`, verifiedAt: '2026-09-30' },
      { text: 'Climate-Risk Agent: both eval sets are frozen by SHA-256, so neither can quietly change. Rerankers and query rewriting were measured on the dev set and kept off.', source: `${CRA}#readme`, verifiedAt: '2026-09-30' },
    ],
  },
  {
    heading: 'Resilience',
    items: [
      { text: 'CNCF krkn-chaos: fixed the fitness range-query window so chaos runs are scored over the full test duration, synced pinned dev dependencies, corrected scenario docs.', source: 'https://github.com/krkn-chaos/krkn-ai/pulls?q=is%3Apr+author%3AAswaniSahoo', verifiedAt: '2026-09-03' },
      { text: '3,000 generated hostile inputs across two parser boundaries assert that only typed errors escape. Token comparison is constant-time, poison jobs fail closed, and opaque case ids keep fault labels out of the prompt.', source: `${IEC}#readme`, verifiedAt: '2026-09-19' },
    ],
  },
];

/**
 * About, How I work: one line each, in the first person, every line pointing at where it is proven.
 * The project specifics stay on the case studies.
 */
export const principles = [
  { text: 'I freeze evaluation sets before I tune anything: SHA-256 hashes, or a held-out split sealed and opened once against a named commit.', source: `${IEC}/blob/main/docs/evaluation/re2-tt-sealed-protocol.md`, label: 'sealed-run protocol' },
  { text: 'My agents return a typed refusal when they cannot check an answer, and one false answer on the held-out matrix blocks a release.', source: `${CRA}#readme`, label: 'README' },
  { text: 'I put a proper control under a claim before I make it, and I retract in public when one fails.', source: `${GW}/issues/238#issuecomment-5150272270`, label: 'issue #238' },
  { text: 'I measure what running it costs: per-request cost and latency, Prometheus metrics, and 3,000 generated hostile inputs.', source: `${IEC}#readme`, label: 'README' },
];

export const testCounts: Metric[] = [
  { label: 'vera-bot, test functions (private)', value: '1,135', verifiedAt: '2026-09-19', source: `${GH}/vera-bot` },
  { label: 'Climate-Risk Agent, test functions', value: '490', verifiedAt: '2026-09-19', source: `${CRA}/tree/main/tests` },
  { label: 'Incident Evidence Compiler, CI gate', value: '363', verifiedAt: '2026-09-19', source: IEC_CI_RUN },
  { label: 'fairness-credit-risk', value: '235', verifiedAt: '2026-10-04', source: FCR_CI_RUN },
  { label: 'biodiversity-publication-analyzer', value: '81', verifiedAt: '2026-07-19', source: `${GH}/biodiversity-publication-analyzer` },
  { label: 'weather-transformer-scratch', value: '74', verifiedAt: '2026-07-19', source: `${GH}/weather-transformer-scratch` },
];

export const retrievalLatency = {
  name: 'Retrieval latency, complaint-intelligence-system',
  repo: `${GH}/complaint-intelligence-system`,
  // README (commit ea68a72) line 71: "Ran on 200K complaints using a T4 GPU on Google Colab."; the table
  // starts at line 96: "| Vector (FAISS) | 35 | 41 |". No source size is stated, so none is printed.
  summary:
    'CFPB consumer complaints, 200K processed. p50 / p95 in milliseconds. Vector search is fast; BM25 and reranking buy quality at real latency cost.',
  verifiedAt: '2026-09-30',
  rows: [
    { method: 'Vector (FAISS)', p50: 35, p95: 41 },
    { method: 'BM25', p50: 589, p95: 929 },
    { method: 'Hybrid (RRF)', p50: 614, p95: 959 },
    { method: 'Reranked hybrid', p50: 911, p95: 1356 },
  ],
};

export const docathon = {
  title: 'PyTorch Docathon 2026',
  result: 'Honorable Mention, First-timer',
  detail: '7 PRs across pytorch and executorch, 17 points, rank 7 of 33 contributors.',
  source: 'https://docs.pytorch.org/docs/docathons/docathon-leaderboard-2026.html',
  verifiedAt: '2026-08-27',
};

/* ------------------------------------------------------------------ */
/* Observe: station reports, every substantive own repository          */
/* ------------------------------------------------------------------ */

const repoLink = (url: string): Link => ({ label: 'repository', url });

export const stations: Station[] = [
  {
    slug: 'climate-risk-agent',
    name: 'Climate-Risk Agent',
    domain: 'AI agent · climate risk',
    summary: 'Cited, typed climate-risk reports or an explicit refusal, for any location. LangGraph, hybrid IPCC retrieval, two MCP servers, frozen evals.',
    repo: CRA,
    status: { label: 'live', kind: 'live' },
    tests: { label: 'test functions', value: '490', verifiedAt: '2026-09-19', source: `${CRA}/tree/main/tests` },
    metrics: [
      { label: 'recall@3 held-out', value: '87%', verifiedAt: '2026-09-19', source: `${CRA}/blob/main/evals/results/retrieval-test-2026-09-07.json` },
      { label: 'citation validity', value: '96%', note: '47 of 49 answers', verifiedAt: '2026-10-07', source: `${CRA}#readme` },
      { label: 'false answers on 105 held-out questions', value: '0 of 105', verifiedAt: '2026-10-07', source: `${CRA}/blob/main/evals/results/e2e-test-gemini-2.5-flash-2026-07-22.json`, evidence: 'held-out run' },
    ],
    stack: ['LangGraph', 'Gemini', 'MCP', 'FastAPI', 'Cloud Run'],
    links: [repoLink(CRA), { label: 'live app', url: CRA_LIVE }, { label: 'container', url: CRA_IMAGE_PAGE }, { label: 'MCP registry', url: CRA_REGISTRY }],
  },
  {
    slug: 'incident-evidence-compiler',
    name: 'Incident Evidence Compiler',
    domain: 'AI systems · incident response',
    summary: 'Incident root cause where the LLM proposes and deterministic code decides. Content-addressed evidence, allow-listed hypotheses, sealed RCAEval evaluation.',
    repo: IEC,
    status: { label: 'evaluated', kind: 'plain' },
    tests: { label: 'tests in the CI gate', value: '363', verifiedAt: '2026-09-19', source: IEC_CI_RUN },
    metrics: [
      { label: 'held-out top-1', value: '76.7%', verifiedAt: '2026-10-07', source: `${IEC}/blob/main/docs/evaluation/re2-tt-baseline.json`, evidence: 'eval report' },
      { label: 'invalid citations, 178 cases', value: '0', verifiedAt: '2026-09-19', source: `${IEC}#readme` },
      { label: 'held-out cases the Gemini arm answered', value: '38 of 90', verifiedAt: '2026-10-07', source: `${IEC}/blob/main/docs/evaluation/re2-tt-gemini.json`, evidence: 'eval report' },
    ],
    stack: ['Python 3.12', 'PostgreSQL', 'Prometheus', 'FastAPI', 'Gemini'],
    links: [repoLink(IEC), { label: 'sealed-run protocol', url: `${IEC}/blob/main/docs/evaluation/re2-tt-sealed-protocol.md` }],
  },
  {
    slug: 'vera-bot',
    name: 'vera-bot',
    domain: 'LLM product · messaging',
    summary: 'Merchant-messaging engine for the magicpin Vera AI Challenge. A resolver decides what is true, a validator gates every body, the LLM only rewrites resolved facts.',
    repo: `${GH}/vera-bot`,
    isPrivate: true,
    status: { label: 'private', kind: 'private' },
    tests: { label: 'test functions', value: '1,135', verifiedAt: '2026-09-19', source: `${GH}/vera-bot` },
    metrics: [
      { label: 'judge-replica Spearman', value: '0.830', verifiedAt: '2026-09-19', source: `${GH}/vera-bot` },
      { label: 'actions / silences on 100 triggers', value: '69 / 31', verifiedAt: '2026-09-19', source: `${GH}/vera-bot` },
    ],
    stack: ['Python', 'FastAPI', 'Vertex AI', 'Cloud Run'],
    links: [],
  },
  {
    slug: 'fairness-credit-risk',
    name: 'fairness-credit-risk',
    domain: 'Responsible AI · credit risk',
    summary: 'Five tracks that differ only in the intervention, on shared seeded splits. The published result is a null: no intervention improved disparate impact, and a 1.6B tabular foundation model did not distinguishably beat a tuned GBDT.',
    repo: `${GH}/fairness-credit-risk`,
    status: { label: 'negative result, published', kind: 'plain' },
    tests: { label: 'tests', value: '235', verifiedAt: '2026-10-04', source: FCR_CI_RUN },
    metrics: [
      // README, What this measures: T1 reweighing, T2 ExponentiatedGradient, T3 group thresholds, T4 a tabular
      // foundation model, against a tuned control; "No intervention improved fairness", and T4 is "not
      // distinguishable from the tuned baseline" (checked 2026-10-07).
      { label: 'fairness treatments that beat the tuned baseline beyond noise', value: '0 of 4', note: 'reweighing, ExponentiatedGradient, group thresholds, a tabular foundation model', verifiedAt: '2026-10-07', source: `${GH}/fairness-credit-risk#readme`, evidence: 'README' },
      { label: 'German Credit baseline disparate impact', value: '0.7263', note: 'all CIs span the 0.8 line', verifiedAt: '2026-08-11', source: `${GH}/fairness-credit-risk` },
    ],
    stack: ['AIF360', 'Fairlearn', 'FastAPI', 'Docker', 'Streamlit'],
    links: [repoLink(`${GH}/fairness-credit-risk`)],
  },
  {
    slug: 'biodiversity-publication-analyzer',
    name: 'biodiversity-publication-analyzer',
    domain: 'AI for science · NLP',
    summary: 'Discovers and classifies biodiversity-genomics papers from Europe PMC with SciBERT and TF-IDF baselines, tested end to end.',
    repo: `${GH}/biodiversity-publication-analyzer`,
    status: { label: 'evaluated', kind: 'plain' },
    tests: { label: 'tests', value: '81', verifiedAt: '2026-09-30', source: `${GH}/biodiversity-publication-analyzer` },
    metrics: [],
    stack: ['SciBERT', 'scikit-learn', 'Europe PMC API'],
    links: [repoLink(`${GH}/biodiversity-publication-analyzer`)],
  },
  {
    slug: 'weather-transformer-scratch',
    name: 'weather-transformer-scratch',
    domain: 'Scientific ML · forecasting',
    summary: 'Physics-aware vision transformer for 6-hour ERA5 prediction, every block written and tested by hand.',
    repo: `${GH}/weather-transformer-scratch`,
    status: { label: 'evaluated', kind: 'plain' },
    tests: { label: 'unit tests', value: '74', verifiedAt: '2026-09-30', source: `${GH}/weather-transformer-scratch` },
    metrics: [
      { label: 'RMSE over persistence', value: '27%', verifiedAt: '2026-07-19', source: `${GH}/weather-transformer-scratch` },
      { label: 'parameters', value: '4,805,440', verifiedAt: '2026-09-30', source: `${GH}/weather-transformer-scratch` },
    ],
    stack: ['PyTorch', 'xarray', 'ERA5'],
    links: [repoLink(`${GH}/weather-transformer-scratch`)],
  },
  {
    slug: 'complaint-intelligence-system',
    name: 'complaint-intelligence-system',
    domain: 'LLM · retrieval',
    summary: 'RAG and NLP benchmark over CFPB consumer complaints: MiniLM against BGE embeddings, KMeans against BERTopic, and four retrieval modes timed against each other.',
    repo: `${GH}/complaint-intelligence-system`,
    status: { label: 'benchmarked', kind: 'plain' },
    // README (commit ea68a72) line 3: "An NLP pipeline that processes 200K consumer complaints from the CFPB database".
    // The earlier "200K+" and "15M+ source" are not in the repo, so both went on 2026-09-30.
    metrics: [
      { label: 'CFPB complaints processed', value: '200K', verifiedAt: '2026-09-30', source: `${GH}/complaint-intelligence-system#readme` },
      { label: 'vector search p95', value: '41 ms', verifiedAt: '2026-09-30', source: `${GH}/complaint-intelligence-system#retrieval-latency` },
    ],
    stack: ['FAISS', 'Sentence-Transformers', 'BERTopic', 'Streamlit'],
    links: [repoLink(`${GH}/complaint-intelligence-system`)],
  },
  {
    slug: 'llama-task-agent',
    name: 'llama-task-agent',
    domain: 'LLM fine-tuning · agents',
    summary: 'LLaMA-3.1-8B with LoRA in 4-bit, trained to emit tool calls under a strict output contract.',
    repo: `${GH}/llama-task-agent`,
    status: { label: 'demo', kind: 'plain' },
    metrics: [],
    stack: ['PEFT / LoRA', 'Transformers', '4-bit quantization'],
    links: [repoLink(`${GH}/llama-task-agent`)],
  },
  {
    slug: 'mlops-batch-signal-task',
    name: 'mlops-batch-signal-task',
    domain: 'MLOps',
    summary: 'Minimal reproducible batch job: OHLCV data in, signal out, config-driven, pinned dependencies, metrics.json and a run log.',
    repo: `${GH}/mlops-batch-signal-task`,
    status: { label: 'reproducible', kind: 'plain' },
    metrics: [],
    stack: ['Docker', 'Python'],
    links: [repoLink(`${GH}/mlops-batch-signal-task`)],
  },
  {
    slug: 'krkn-doc-sync-bot',
    name: 'krkn-doc-sync-bot',
    domain: 'Developer tooling',
    summary: 'Detects documentation drift against krknctl input schemas and generates Hugo docs for krkn-chaos. pip-installable CLI.',
    repo: `${GH}/krkn-doc-sync-bot`,
    status: { label: 'tool', kind: 'plain' },
    metrics: [],
    stack: ['Python', 'Hugo'],
    links: [repoLink(`${GH}/krkn-doc-sync-bot`)],
  },
];
