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
      'Regional forecasts stalled at the level of a no-change forecast (persistence) no matter the processor depth. The decoder seeded its observation nodes with zeros and threw away the per-observation features the encoder had just computed, so an observation\'s own values reached the output only through the fixed residual. The fix is a zero-parameter skip connection, shipped in #237 for the stretched model and #239 for the regional one.',
    metric: {
      label: 'lower forecast error on unseen regions after the fix',
      // PR #237 body: "the fix reaches 0.171 held-out region-weighted MSE against 0.206 for the old zeros seed
      // and 0.214 for persistence, so it beats persistence by about 20% on unseen regions where the old model
      // managed about 4%." The "about" is kept as ≈.
      value: '17%',
      note: 'error 0.206 → 0.171; a no-change forecast scores 0.214',
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
  // Checked 2026-10-08 against the repo at 595f010: src/models/attention.py, src/training/physics_loss.py,
  // results/metrics.json and notebooks/03_results_analysis.ipynb. The README's own figures are off in places
  // (sample counts, best epoch), so the evidence links point at the results file and the notebook.
  summary:
    'A vision transformer with 4.8 million parameters that forecasts four ERA5 fields six hours ahead, with attention written by hand instead of nn.MultiheadAttention. Its loss adds two penalties to the error: one for jagged fields and one for a wrong global mean.',
  bullets: [
    'Every block implemented and unit-tested on its own: patch embedding, positional encoding, attention, transformer block and loss. A test checks that nn.MultiheadAttention is never used.',
    'Tested on all 1,463 six-hour steps of 2020, a year held out from training, against persistence: a forecast that assumes nothing changes in six hours. The error is pooled over four standardised fields on a 5.625° grid without latitude weighting, so it does not compare with WeatherBench2 scores. Almost all of the gain is in wind; for temperature the model is slightly worse than persistence.',
  ],
  metrics: [
    // results/metrics.json: rmse 0.19598 (model) against 0.26805 (persistence), a 26.9% reduction.
    { label: 'lower error (RMSE) than a no-change forecast, on the 2020 test year', value: '27%', note: '0.196 against 0.268 in standardised units, pooled over four fields', verifiedAt: '2026-10-08', source: `${GH}/weather-transformer-scratch/blob/main/results/metrics.json`, evidence: 'results file' },
    { label: 'unit tests', value: '74', verifiedAt: '2026-10-08', source: `${GH}/weather-transformer-scratch/tree/main/tests` },
  ],
  stack: ['PyTorch', 'xarray', 'zarr', 'ERA5 / WeatherBench2'],
};

export const hazardStats = {
  name: 'ERA5 extreme-value hazard statistics',
  repo: CRA,
  summary:
    'Inside the Climate-Risk Agent: 60+ years of ERA5 fitted with stationary and non-stationary GEV distributions, a likelihood-ratio trend test, and 90% bootstrap confidence intervals. Since September the agent also measures its own forecast skill per lead day and weights report confidence by it.',
  metrics: [
    { label: 'Berlin warming trend (non-stationary GEV)', value: '+0.76 °C / decade', note: 'p\u00a0<\u00a00.0001', verifiedAt: '2026-09-19', source: `${CRA}#readme` },
    { label: 'Delhi trend test', value: 'stationary', note: 'p = 0.56', verifiedAt: '2026-09-19', source: `${CRA}#readme` },
    // README (commit 7816673) line 140: "| Hazard | MAE, day 1 | MAE, day 7 | Extreme days caught, day 1 → day 7 |"
    // and line 142: "| Daily max temperature | 0.70 °C | 1.93 °C | 85% → 47% |". 85% → 47% is extreme days caught.
    { label: 'max-temperature forecast error, day 1 → day 7', value: '0.70 → 1.93\u00a0°C', note: '13 cities', verifiedAt: '2026-09-30', source: `${CRA}#forecast-skill` },
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
    'Gemini proposes hypotheses over an allow-list of signals. A verifier tests each one against a content-addressed evidence ledger and returns SUPPORTED, REFUTED or UNKNOWN.',
  bullets: [
    'Two arms on the same incidents from the public RCAEval benchmark: the deterministic engine alone, and Gemini behind the verifier. The held-out set was sealed and opened exactly once, on 2026-07-19, against a frozen commit. No tuning after.',
    'Telemetry arrives through a bounded range-query client against a real Prometheus v3.6.0; five iec_* metrics leave through a dependency-free /metrics endpoint. Every abstention still returns a deterministic ranking.',
    'Hexagonal architecture, PostgreSQL with SKIP LOCKED, mypy strict, 19 ADRs. Untrusted input is capped at 65,536 characters and 32 predicates before it is parsed.',
    // README, Results: "Read those rows as a bracket, not a race"; re2-tt-gemini.json: answered_count 38,
    // top1_accuracy_answered 0.368421, invalid_evidence_id_count 0 (checked 2026-10-07).
    'The Gemini arm is a stress test of the verification gate, not a race with the engine: it sees signal names only, never values, so it is choosing among about 72 signals. On the held-out set it answered 38 of 90 incidents and ranked the cause first on 36.8% of those; it abstained on the rest and cited no invalid evidence.',
  ],
  metrics: [
    // Top-1 and top-3 as percentages of the evaluation files' 0.767 / 0.878 and 0.932 / 0.989.
    { label: 'true root cause ranked first, on 90 sealed held-out incidents (deterministic engine)', value: '76.7%', note: 'in the top three: 87.8%', verifiedAt: '2026-10-07', source: `${IEC}/blob/main/docs/evaluation/re2-tt-baseline.json`, evidence: 'eval report' },
    { label: 'root cause ranked first on the 88 development incidents', value: '93.2%', note: 'in the top three: 98.9%', verifiedAt: '2026-10-07', source: `${IEC}/blob/main/docs/evaluation/re2-ob-baseline.json`, evidence: 'eval report' },
    { label: 'invalid evidence citations across 178 evaluated cases and two model generations', value: '0', verifiedAt: '2026-09-19', source: `${IEC}#readme` },
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
    { label: 'on 105 held-out questions', value: '0 false answers', note: 'all 35 out-of-scope questions refused; 21 answerable ones refused too', verifiedAt: '2026-10-07', source: `${CRA}/blob/main/evals/results/e2e-test-gemini-2.5-flash-2026-07-22.json`, evidence: 'held-out run' },
    { label: 'citation validity: held-out answers citing the right page', value: '96%', note: '47 of 49', verifiedAt: '2026-10-07', source: `${CRA}#readme` },
    // README (commit 7816673) line 98: "Held-out results (second exposure, on the exact configuration deployed):".
    // The cited JSON's HEADLINE (answer) row: n 70, recall@3 0.8714, @5 0.9143, @10 0.9571.
    { label: 'right page retrieved in the top 3 / 5 / 10', value: '87 / 91 / 96%', note: '70 questions', verifiedAt: '2026-09-30', source: `${CRA}/blob/main/evals/results/retrieval-test-2026-09-07.json` },
    { label: 'test functions in the suite, 48 files', value: '490', verifiedAt: '2026-09-19', source: `${CRA}/tree/main/tests` },
    { label: 'per question; median answer in 3.9 s', value: '≈ $0.003', verifiedAt: '2026-09-19', source: `${CRA}#readme` },
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
    // Checked 2026-10-08 at d6ccb67 (docs/evaluation/plan.md, tests/test_replica.py, README "How it was evaluated").
    'A local replica of the organiser\'s LLM judge scores every change before it ships. On the organiser\'s ten published example messages, each scored 15 times, its rank correlation with their scores is 0.830. Those scores all sit between 44 and 50, so the check shows agreement on good messages, not that it can tell good from bad.',
    'On a 100-trigger set generated with the organiser\'s own script, a September 2026 run sent 69 messages and held back 31, and every message carried a fact tied to its trigger. The raw report is not in the repo; CI checks a floor of 55 messages on the template path.',
    'gemini-3.7-flash was measured and rejected: minimal thinking returned HTTP 400 and other settings truncated output.',
  ],
  metrics: [
    { label: 'rank correlation between its offline judge and the organiser\'s published scores, 10 example messages', value: '0.830', note: 'each scored 15 times; the published scores span only 44 to 50', verifiedAt: '2026-10-08', source: `${GH}/vera-bot` },
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
  // data/results/retrieval_benchmark.json (checked 2026-10-08 at 5e608b7): 20 fixed queries, k=5, one run,
  // p50/p95 35.04/41.23 for vector search, whose times include encoding the query; the 200K run and the T4 are
  // logged in notebooks/Full_pipeline_output.ipynb. The repo has no relevance labels, so no quality is claimed.
  summary:
    'Timed on 200K complaints on a T4 GPU in Google Colab: 20 fixed queries, five results each, one run, in milliseconds. Vector search includes encoding the query. There are no relevance labels, so this measures speed, not whether the results are right.',
  source: `${GH}/complaint-intelligence-system/blob/main/data/results/retrieval_benchmark.json`,
  verifiedAt: '2026-10-08',
  rows: [
    { method: 'Vector (FAISS)', p50: 35, p95: 41 },
    { method: 'BM25', p50: 589, p95: 929 },
    { method: 'Hybrid (RRF)', p50: 614, p95: 959 },
    { method: 'Reranked hybrid', p50: 911, p95: 1356 },
  ],
};

/** Complaint Intelligence System: the measured results beyond timing (checked 2026-10-08 at 5e608b7). */
export const complaintFindings: Metric[] = [
  // data/results/cluster_comparison.json: BERTopic n_topics 30, n_outliers 110,456 of 199,999.
  { label: 'topics BERTopic found across the 200K complaints; 55% of them (110,456) fit none', value: '30', verifiedAt: '2026-10-08', source: `${GH}/complaint-intelligence-system/blob/main/data/results/cluster_comparison.json`, evidence: 'results file' },
  // data/results/embedding_benchmark.json: 374.6 against 59.7 texts per second, first 5,000 texts.
  { label: 'faster embedding with MiniLM than with BGE: 374.6 against 59.7 texts a second, on 5,000 texts', value: '6.3×', verifiedAt: '2026-10-08', source: `${GH}/complaint-intelligence-system/blob/main/data/results/embedding_benchmark.json`, evidence: 'results file' },
];

/** Weather transformer, error by field (results/metrics.json; the change against persistence is printed in
 *  notebooks/03_results_analysis.ipynb, the per-variable chart). Standardised units. */
export const weatherByField = {
  rows: [
    { field: '850 hPa temperature', rmse: '0.084', change: '2.8% worse' },
    { field: '500 hPa height', rmse: '0.067', change: '1.3% better' },
    { field: '10 m wind, east–west', rmse: '0.240', change: '20.6% better' },
    { field: '10 m wind, north–south', rmse: '0.291', change: '32.4% better' },
    { field: 'All four, pooled', rmse: '0.196', change: '26.9% better' },
  ],
  verifiedAt: '2026-10-08',
  source: `${GH}/weather-transformer-scratch/blob/main/notebooks/03_results_analysis.ipynb`,
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
    summary: 'Ask about heat, rain or wind risk for any place on Earth. It answers with a report that cites its sources, or refuses when the evidence is not there.',
    repo: CRA,
    status: { label: 'live', kind: 'live' },
    tests: { label: 'test functions', value: '490', verifiedAt: '2026-09-19', source: `${CRA}/tree/main/tests` },
    metrics: [
      { label: 'recall@3 held-out', value: '87%', verifiedAt: '2026-09-19', source: `${CRA}/blob/main/evals/results/retrieval-test-2026-09-07.json` },
      { label: 'citation validity', value: '96%', note: '47 of 49 answers', verifiedAt: '2026-10-07', source: `${CRA}#readme` },
      { label: 'false answers on 105 held-out questions', value: '0 false answers', verifiedAt: '2026-10-07', source: `${CRA}/blob/main/evals/results/e2e-test-gemini-2.5-flash-2026-07-22.json`, evidence: 'held-out run' },
    ],
    stack: ['LangGraph', 'Gemini', 'MCP', 'FastAPI', 'Cloud Run'],
    links: [repoLink(CRA), { label: 'live app', url: CRA_LIVE }, { label: 'container', url: CRA_IMAGE_PAGE }, { label: 'MCP registry', url: CRA_REGISTRY }],
  },
  {
    slug: 'incident-evidence-compiler',
    name: 'Incident Evidence Compiler',
    domain: 'AI systems · incident response',
    summary: 'Finds the root cause of an outage from its metrics. The LLM may only propose causes; deterministic code checks each one against recorded evidence, and UNKNOWN is an allowed answer.',
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
    slug: 'weather-transformer-scratch',
    name: 'Weather Transformer from Scratch',
    domain: 'Scientific ML · forecasting',
    summary: 'Forecasts four ERA5 weather fields six hours ahead with a vision transformer. Every block, attention included, is written and unit-tested by hand.',
    repo: `${GH}/weather-transformer-scratch`,
    status: { label: 'evaluated', kind: 'plain' },
    tests: { label: 'unit tests', value: '74', verifiedAt: '2026-10-08', source: `${GH}/weather-transformer-scratch/tree/main/tests` },
    metrics: [
      { label: 'RMSE over persistence', value: '27%', verifiedAt: '2026-10-08', source: `${GH}/weather-transformer-scratch/blob/main/results/metrics.json`, evidence: 'results file' },
      { label: 'parameters', value: '4,805,440', verifiedAt: '2026-10-08', source: `${GH}/weather-transformer-scratch/blob/main/notebooks/03_results_analysis.ipynb`, evidence: 'notebook' },
    ],
    stack: ['PyTorch', 'xarray', 'ERA5'],
    links: [repoLink(`${GH}/weather-transformer-scratch`)],
  },
  {
    slug: 'complaint-intelligence-system',
    name: 'Complaint Intelligence System',
    domain: 'NLP · retrieval',
    summary: 'Benchmarks search and topic discovery over 200K US consumer complaints from the CFPB database: two embedding models (MiniLM, BGE), KMeans clustering against BERTopic, and four search methods timed against each other.',
    repo: `${GH}/complaint-intelligence-system`,
    status: { label: 'benchmarked', kind: 'plain' },
    // Checked 2026-10-08 at 5e608b7. The 200K run (199,999 complaints sampled from 3.79M, on a Colab T4) is logged in
    // notebooks/Full_pipeline_output.ipynb. The committed data and the Streamlit demo use a 15K sample, so the site
    // says "benchmarks", not "searches". No retrieval-quality metric exists in the repo.
    metrics: [
      { label: 'CFPB complaints processed', value: '200K', verifiedAt: '2026-10-08', source: `${GH}/complaint-intelligence-system/blob/main/notebooks/Full_pipeline_output.ipynb`, evidence: 'notebook' },
      { label: 'vector search p95', value: '41 ms', verifiedAt: '2026-10-08', source: `${GH}/complaint-intelligence-system/blob/main/data/results/retrieval_benchmark.json` },
    ],
    stack: ['FAISS', 'Sentence-Transformers', 'BERTopic', 'Streamlit'],
    links: [repoLink(`${GH}/complaint-intelligence-system`)],
  },
  {
    slug: 'vera-bot',
    name: 'vera-bot',
    domain: 'LLM product · messaging',
    summary: 'A merchant-messaging bot for the magicpin Vera AI Challenge. Code decides what is true; the LLM only rewrites checked facts, and is skipped when it is too slow.',
    repo: `${GH}/vera-bot`,
    isPrivate: true,
    status: { label: 'private', kind: 'private' },
    tests: { label: 'test functions', value: '1,135', verifiedAt: '2026-10-08', source: `${GH}/vera-bot` },
    metrics: [
      { label: 'judge-replica Spearman, 10 example messages', value: '0.830', verifiedAt: '2026-10-08', source: `${GH}/vera-bot` },
      { label: 'actions / silences on 100 triggers', value: '69 / 31', verifiedAt: '2026-09-19', source: `${GH}/vera-bot` },
    ],
    stack: ['Python', 'FastAPI', 'Vertex AI', 'Cloud Run'],
    links: [],
  },
  {
    slug: 'fairness-credit-risk',
    name: 'Fairness-Aware Credit Scoring',
    domain: 'Responsible AI · credit risk',
    summary: 'Tests whether standard fairness fixes make a credit-scoring model fairer, each against a tuned baseline on identical seeded splits. None did by more than noise, and the null result is published.',
    repo: `${GH}/fairness-credit-risk`,
    status: { label: 'negative result, published', kind: 'plain' },
    tests: { label: 'tests', value: '235', verifiedAt: '2026-10-04', source: FCR_CI_RUN },
    metrics: [
      // README, What this measures: T1 reweighing, T2 ExponentiatedGradient, T3 group thresholds, T4 a tabular
      // foundation model, against a tuned control; "No intervention improved fairness", and T4 is "not
      // distinguishable from the tuned baseline" (checked 2026-10-07).
      { label: 'alternatives beat the tuned baseline by more than noise', value: '0 of 4', note: 'three fairness fixes (reweighing, ExponentiatedGradient, group thresholds) and a tabular foundation model', verifiedAt: '2026-10-07', source: `${GH}/fairness-credit-risk#readme`, evidence: 'README' },
      { label: 'baseline disparate impact on German Credit; its interval crosses the 0.8 fairness line', value: '0.7263', verifiedAt: '2026-08-11', source: `${GH}/fairness-credit-risk` },
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
    slug: 'kmesh-mcp-poc',
    name: 'kmesh-mcp-poc',
    domain: 'Agent tooling · service mesh',
    // Checked 2026-10-08 at 9b7cbd4: 26 Go tests (server 13, stateful 2, trace 4, tracectx 7, README line 444),
    // CI green, and a second workflow that runs live tests against real Kmesh daemons on a two-node kind cluster.
    // The README calls it a personal proof of concept, not a proposed change to Kmesh.
    summary: 'An MCP server in Go that gives AI agents three read-only tools over the Kmesh daemon’s admin API. A personal proof of concept; CI also runs it against real Kmesh daemons on a two-node kind cluster.',
    repo: `${GH}/kmesh-mcp-poc`,
    status: { label: 'proof of concept', kind: 'plain' },
    tests: { label: 'Go tests', value: '26', verifiedAt: '2026-10-08', source: `${GH}/kmesh-mcp-poc` },
    metrics: [],
    stack: ['Go', 'MCP', 'Kubernetes'],
    links: [repoLink(`${GH}/kmesh-mcp-poc`)],
  },
  {
    slug: 'krkn-doc-sync-bot',
    name: 'krkn-doc-sync-bot',
    domain: 'Developer tooling',
    summary: 'Compares the inputs of krkn-hub chaos scenarios with the krkn-chaos docs and drafts the missing pages. An independent proof of concept for krkn-chaos/website#320, installed from source; the docs bot krkn-chaos adopted is a separate project.',
    repo: `${GH}/krkn-doc-sync-bot`,
    status: { label: 'proof of concept', kind: 'plain' },
    tests: { label: 'tests', value: '22', verifiedAt: '2026-10-08', source: `${GH}/krkn-doc-sync-bot/tree/main/tests` },
    metrics: [],
    stack: ['Python', 'Markdown'],
    links: [repoLink(`${GH}/krkn-doc-sync-bot`)],
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
    summary: 'A minimal reproducible batch job: price data in, a signal rate out, driven by a validated config, with pinned dependencies, a metrics file and a run log.',
    repo: `${GH}/mlops-batch-signal-task`,
    status: { label: 'reproducible', kind: 'plain' },
    metrics: [],
    stack: ['Docker', 'Python'],
    links: [repoLink(`${GH}/mlops-batch-signal-task`)],
  },
];
