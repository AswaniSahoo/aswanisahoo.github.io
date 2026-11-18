import type { Link, Metric, Project, Station } from './types';

const GH = 'https://github.com/AswaniSahoo';
const GW = 'https://github.com/openclimatefix/graph_weather';
const CRA = `${GH}/climate-risk-agent`;
const IEC = `${GH}/Incident-evidence-compiler`;
const IEC_CI_RUN = `${IEC}/actions/runs/33744139090`;
// Latest CI run on main (2026-08-10), pytest summary line: "235 passed, 2 skipped".
const FCR_CI_RUN = `${GH}/fairness-credit-risk/actions/runs/31434373846`;
const CRA_LIVE = 'https://climate-risk-agent-714882950125.us-central1.run.app/';
// The registry entry points at a GHCR image that is private for now: an anonymous pull is refused
// (README, "Published on the official MCP registry"; manifest request answered 403 on 2026-11-18).
const CRA_REGISTRY = 'https://registry.modelcontextprotocol.io/v0/servers?search=climate-ipcc-rag';
// The held-out run behind the README's results (fenced prompt, 2026-11-11).
const CRA_HELDOUT = `${CRA}/blob/main/evals/results/e2e-test-gemini-2.5-flash-2026-11-11.json`;
// CI on main at 12f5119 (2026-11-14). pytest -q prints no summary line here, so the counts are its
// progress marks: 1,145 tests, 1,138 passed (.), 7 skipped (s), none failed.
const CRA_CI_RUN = `${CRA}/actions/runs/43568814844`;
const EG = `${GH}/earthgym`;

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
  name: 'Weather Transformer from Scratch',
  repo: `${GH}/weather-transformer-scratch`,
  role: 'Solo',
  // Checked 2026-10-08 against the repo at 595f010: src/models/attention.py, src/training/physics_loss.py,
  // results/metrics.json and notebooks/03_results_analysis.ipynb. The README's own figures are off in places
  // (sample counts, best epoch), so the evidence links point at the results file and the notebook.
  summary:
    'A vision transformer with 4.8 million parameters that forecasts four ERA5 fields six hours ahead, with attention written by hand instead of nn.MultiheadAttention. Its loss adds two penalties to the error: one for jagged fields and one for a wrong global mean.',
  bullets: [
    'Every block implemented and unit-tested on its own: patch embedding, positional encoding, attention, transformer block and loss. A test checks that nn.MultiheadAttention is never used.',
    'Tested on all 1,463 six-hour steps of 2020, a year held out from training, against two baselines: persistence, which assumes nothing changes in six hours, and anomaly persistence, which carries the current departure from the seasonal average forward. Scores are latitude-weighted and in physical units. On 10 m wind the model beats both. On 850 hPa temperature and 500 hPa geopotential it does not beat anomaly persistence: 1.24 K against 1.02 K, and 213 against 191 m²/s². Over India it is level with persistence on wind and behind it on temperature and geopotential.',
  ],
  metrics: [
    // results/metrics.json (retrained baseline, repo PR #17), physical units, latitude-weighted: u10 1.165 against
    // 1.491 m/s for persistence (21.8% lower), v10 1.183 against 1.807 m/s (34.5% lower). README: 129 tests.
    { label: 'lower error (RMSE) than a no-change forecast on 10 m east-west wind (u10), 2020 test year', value: '22%', note: '1.17 against 1.49 m/s, latitude-weighted', verifiedAt: '2026-11-18', source: `${GH}/weather-transformer-scratch/blob/main/results/metrics.json`, evidence: 'results file' },
    { label: 'lower error (RMSE) than a no-change forecast on 10 m north-south wind (v10)', value: '35%', note: '1.18 against 1.81 m/s, latitude-weighted', verifiedAt: '2026-11-18', source: `${GH}/weather-transformer-scratch/blob/main/results/metrics.json`, evidence: 'results file' },
    { label: 'unit tests', value: '129', verifiedAt: '2026-11-18', source: `${GH}/weather-transformer-scratch/tree/main/tests` },
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
    'Two MCP servers ship with it, weather and ipcc-rag, on protocol revision 2026-07-28 with ToolAnnotations. The IPCC server is indexed on the official MCP registry; its container image is private for now, so run it from a clone.',
    'Both eval sets are SHA-256 frozen. The 105-question held-out set was written after the dev set existed and never used to tune anything.',
  ],
  metrics: [
    // CRA_HELDOUT (checked 2026-11-18): matrix correct_answer 52, correct_refuse 35, false_refuse 18, no
    // false_answer cell; citation_validity 50 of 52. The README's Evaluation section gives the same figures.
    { label: 'on 105 held-out questions', value: '0 false answers', note: 'all 35 out-of-scope questions refused; 18 answerable ones refused too', verifiedAt: '2026-11-18', source: CRA_HELDOUT, evidence: 'held-out run' },
    { label: 'citation validity: held-out answers citing the right page', value: '96%', note: '50 of 52', verifiedAt: '2026-11-18', source: CRA_HELDOUT, evidence: 'held-out run' },
    // README (commit 7816673) line 98: "Held-out results (second exposure, on the exact configuration deployed):".
    // The cited JSON's HEADLINE (answer) row: n 70, recall@3 0.8714, @5 0.9143, @10 0.9571.
    { label: 'right page retrieved in the top 3 / 5 / 10', value: '87 / 91 / 96%', note: '70 questions', verifiedAt: '2026-09-30', source: `${CRA}/blob/main/evals/results/retrieval-test-2026-09-07.json` },
    { label: 'tests passed in the CI run on main', value: '1,138', note: '7 skipped', verifiedAt: '2026-11-18', source: CRA_CI_RUN },
    // CRA_HELDOUT telemetry.generate: est_cost_usd 0.258801 for the 105 questions, which the README gives as
    // "about $0.0025 per question", and p50_ms 4091.83 over 95 model calls. The README's "p50 generation
    // latency 3.2 s" does not match that file, so the page quotes the file (checked 2026-11-18).
    { label: 'per question for the IPCC answer step; p50 4.1 s per model call', value: '≈ $0.0025', verifiedAt: '2026-11-18', source: CRA_HELDOUT, evidence: 'held-out run' },
  ],
  stack: ['LangGraph', 'Gemini', 'FastAPI', 'MCP', 'scipy', 'Docker', 'Cloud Run'],
  links: [
    { label: 'live app', url: CRA_LIVE },
    { label: 'MCP registry', url: CRA_REGISTRY },
  ],
};

// README at 2ed5f18, main, and the reports it links (checked 2026-11-18): four environments with 648, 300,
// 300 and 350 items; the forecast grader reproduces WeatherBench 2's IFS HRES MSLP 72 h RMSE to within
// 3.2e-8 Pa (reports/era5/2026-10-30-wb2-reproduction.md); 43 validated Gold test questions appear word for
// word in Silver (reports/climaqa/SUMMARY.md, leak.gold_in_silver: 9 cloze, 17 ffq, 17 mcq). GRPO,
// reports/grpo/2026-11-13-resample.md: held-out 0.750 before, 0.774 after, two-sided sign test p 0.541.
export const earthgym: Project = {
  slug: 'earthgym',
  name: 'Earthgym',
  repo: EG,
  role: 'Solo, MIT',
  summary:
    'Each environment is a verifiers taskset with an Inspect task beside it, and both score through one contract module. Code computes every reward: forecast skill over persistence and climatology, an exact answer, or an exact match.',
  bullets: [
    'In era5-forecast-v1 the model forecasts ERA5 pressure or temperature from one grid cell’s history. In ibtracs-storm-v1 it computes a storm’s accumulated cyclone energy or peak category from the track, and in heat-basis-v1 it counts a heat policy’s trigger days from station data. The fourth, climaqa-v1, asks ClimaQA multiple-choice and cloze questions, with the leaked items taken out.',
    'The forecast grader reproduces WeatherBench 2’s published IFS HRES scores for mean sea level pressure, the cyclone grader NOAA NCEI’s North Atlantic figures, and the heat grader NWS Phoenix’s counts.',
    'The ClimaQA audit found validated Gold test questions word for word in Silver, the set the paper fine-tunes on. Only exact matches count, so the figure is a lower bound.',
    'A small GRPO run of Qwen3.5-2B on the ClimaQA multiple-choice items showed no measurable transfer: held-out reward went from 0.750 to 0.774, which is not significant (two-sided sign test, p 0.541).',
  ],
  metrics: [
    { label: 'validated ClimaQA Gold test questions found word for word in Silver, the set the paper fine-tunes on', value: '43', note: 'exact matches, so a lower bound', verifiedAt: '2026-11-18', source: `${EG}/blob/main/reports/climaqa/SUMMARY.md`, evidence: 'audit report' },
    { label: 'difference between its forecast grader and WeatherBench 2’s published IFS HRES MSLP 72 h RMSE', value: '3.2e-8 Pa', verifiedAt: '2026-11-18', source: `${EG}/blob/main/reports/era5/2026-10-30-wb2-reproduction.md`, evidence: 'reproduction report' },
    { label: 'task sets: era5-forecast-v1, ibtracs-storm-v1, heat-basis-v1 and climaqa-v1', value: '4', note: '648, 300, 300 and 350 items', verifiedAt: '2026-11-18', source: `${EG}#readme`, evidence: 'README' },
  ],
  stack: ['Python', 'Inspect AI', 'verifiers', 'TRL', 'ERA5', 'IBTrACS', 'GHCN-Daily'],
};

export const llamaTaskAgent: Project = {
  slug: 'llama-task-agent',
  name: 'Llama Task Agent',
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
      // README, Operations: with CRG_CACHE_GCS_BUCKET set, the instance's disk and then that Cloud Storage
      // bucket; otherwise Upstash Redis, with disk as its fallback. DEPLOY.md: the live service sets the
      // bucket, "chosen over Upstash" on 2026-11-11 (checked 2026-11-18).
      { text: 'Records per-request telemetry and cost, with a Cloud Storage cache in production (Redis optional), a disk fallback and a prewarm script for the hazard fits.', source: `${CRA}#operations`, verifiedAt: '2026-11-18' },
    ],
  },
  {
    heading: 'Evaluation discipline',
    items: [
      { text: 'Incident Evidence Compiler: the held-out split was sealed and opened once, against a named commit, with the protocol committed next to the results.', source: `${IEC}/blob/main/docs/evaluation/re2-tt-sealed-protocol.md`, verifiedAt: '2026-09-30' },
      { text: 'Climate-Risk Agent: both eval sets are frozen by SHA-256, so neither can quietly change. Rerankers and query rewriting were measured on the dev set and kept off.', source: `${CRA}#readme`, verifiedAt: '2026-09-30' },
    ],
  },
  {
    heading: 'Resilience',
    items: [
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
  { text: 'I put a proper control under every claim, and retract in public when one fails.', source: `${GW}/issues/238#issuecomment-5150272270`, label: 'issue #238' },
  { text: 'I measure what running it costs: per-request cost and latency, Prometheus metrics, and 3,000 generated hostile inputs.', source: `${IEC}#readme`, label: 'README' },
];

export const retrievalLatency = {
  name: 'Retrieval latency, Complaint Intelligence System',
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

/** Weather transformer, error by field (results/metrics.json, retrained baseline, repo PR #17). Physical units,
 *  latitude-weighted; the change is against persistence. The pooled row is in standardised units. */
export const weatherByField = {
  rows: [
    { field: '850 hPa temperature', rmse: '1.24 K', change: '3.4% worse' },
    { field: '500 hPa geopotential', rmse: '213 m²/s²', change: '3.5% better' },
    { field: '10 m wind, east–west', rmse: '1.17 m/s', change: '21.8% better' },
    { field: '10 m wind, north–south', rmse: '1.18 m/s', change: '34.5% better' },
    { field: 'All four, pooled (standardised)', rmse: '0.185', change: '28.7% better' },
  ],
  verifiedAt: '2026-11-18',
  source: `${GH}/weather-transformer-scratch/blob/main/results/metrics.json`,
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
    tests: { label: 'tests passed in CI', value: '1,138', note: '7 skipped', verifiedAt: '2026-11-18', source: CRA_CI_RUN },
    metrics: [
      { label: 'recall@3 held-out', value: '87%', verifiedAt: '2026-09-19', source: `${CRA}/blob/main/evals/results/retrieval-test-2026-09-07.json` },
      { label: 'citation validity', value: '96%', note: '50 of 52 answers', verifiedAt: '2026-11-18', source: CRA_HELDOUT, evidence: 'held-out run' },
      { label: 'false answers on 105 held-out questions', value: '0 false answers', verifiedAt: '2026-11-18', source: CRA_HELDOUT, evidence: 'held-out run' },
    ],
    stack: ['LangGraph', 'Gemini', 'MCP', 'FastAPI', 'Cloud Run'],
    links: [repoLink(CRA), { label: 'live app', url: CRA_LIVE }, { label: 'MCP registry', url: CRA_REGISTRY }],
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
    tests: { label: 'unit tests', value: '129', verifiedAt: '2026-11-18', source: `${GH}/weather-transformer-scratch/tree/main/tests` },
    metrics: [
      { label: 'lower wind RMSE than persistence (u10 / v10)', value: '22% / 35%', verifiedAt: '2026-11-18', source: `${GH}/weather-transformer-scratch/blob/main/results/metrics.json`, evidence: 'results file' },
      { label: 'parameters', value: '4,805,440', verifiedAt: '2026-10-08', source: `${GH}/weather-transformer-scratch/blob/main/notebooks/03_results_analysis.ipynb`, evidence: 'notebook' },
    ],
    stack: ['PyTorch', 'xarray', 'ERA5'],
    links: [repoLink(`${GH}/weather-transformer-scratch`)],
  },
  {
    slug: 'earthgym',
    name: 'Earthgym',
    // At most about 30 characters: the banner keeps the label on one line, and 320px fits no more.
    domain: 'RL environments · climate',
    summary: 'Weather and climate tasks for training and testing AI models, with rewards a program can check. The forecast, cyclone and heat graders reproduce published numbers before they score anything.',
    repo: EG,
    // README, "Not finished": the author's own review of the decision records and hand checks is still open.
    status: { label: 'in progress', kind: 'plain' },
    metrics: [
      { label: 'ClimaQA Gold test questions found word for word in Silver', value: '43', verifiedAt: '2026-11-18', source: `${EG}/blob/main/reports/climaqa/SUMMARY.md`, evidence: 'audit report' },
      { label: 'grader gap to WeatherBench 2’s IFS HRES MSLP 72 h RMSE', value: '3.2e-8 Pa', verifiedAt: '2026-11-18', source: `${EG}/blob/main/reports/era5/2026-10-30-wb2-reproduction.md`, evidence: 'reproduction report' },
    ],
    stack: ['Python', 'Inspect AI', 'verifiers', 'ERA5'],
    links: [repoLink(EG)],
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
    // requirements.txt: "aif360 is deliberately absent"; fairlearn, xgboost and scikit-learn are pinned there,
    // fastapi in requirements-api.txt, and app.py is the Streamlit demo (checked 2026-11-18).
    stack: ['Fairlearn', 'XGBoost', 'scikit-learn', 'FastAPI', 'Streamlit'],
    links: [repoLink(`${GH}/fairness-credit-risk`)],
  },
  {
    slug: 'biodiversity-publication-analyzer',
    name: 'Biodiversity Publication Analyzer',
    domain: 'AI for science · NLP',
    summary: 'Discovers and classifies biodiversity-genomics papers from Europe PMC with SciBERT and TF-IDF baselines, tested end to end.',
    repo: `${GH}/biodiversity-publication-analyzer`,
    status: { label: 'evaluated', kind: 'plain' },
    // README, Testing: "81 comprehensive tests across 6 test files" (checked 2026-11-18).
    tests: { label: 'tests', value: '81', verifiedAt: '2026-11-18', source: `${GH}/biodiversity-publication-analyzer` },
    metrics: [],
    stack: ['SciBERT', 'scikit-learn', 'Europe PMC API'],
    links: [repoLink(`${GH}/biodiversity-publication-analyzer`)],
  },
  {
    slug: 'krkn-doc-sync-bot',
    name: 'Krkn Doc Sync Bot',
    domain: 'Developer tooling',
    summary: 'Compares the inputs of krkn-hub chaos scenarios with the krkn-chaos docs and drafts the missing pages. An independent proof of concept for krkn-chaos/website#320, installed from source.',
    repo: `${GH}/krkn-doc-sync-bot`,
    status: { label: 'proof of concept', kind: 'plain' },
    tests: { label: 'tests', value: '22', verifiedAt: '2026-10-08', source: `${GH}/krkn-doc-sync-bot/tree/main/tests` },
    metrics: [],
    stack: ['Python', 'Markdown'],
    links: [repoLink(`${GH}/krkn-doc-sync-bot`)],
  },
  {
    slug: 'llama-task-agent',
    name: 'Llama Task Agent',
    domain: 'LLM fine-tuning · agents',
    summary: 'LLaMA-3.1-8B with LoRA in 4-bit, trained to emit tool calls under a strict output contract.',
    repo: `${GH}/llama-task-agent`,
    status: { label: 'demo', kind: 'plain' },
    metrics: [],
    stack: ['PEFT / LoRA', 'Transformers', '4-bit quantization'],
    // The README links this notebook as the demo: "Test the trained model live" (checked 2026-11-18).
    links: [repoLink(`${GH}/llama-task-agent`), { label: 'Kaggle demo notebook', url: 'https://www.kaggle.com/code/aswanisahoo/kaggle-demo135c45d783' }],
  },
  {
    slug: 'vera-bot',
    name: 'Vera Bot',
    domain: 'LLM product · messaging',
    // A private repository with no figures on public record, so it carries a description and nothing else.
    summary: 'A merchant-messaging bot for the magicpin Vera AI Challenge. Code decides what is true; the LLM only rewrites checked facts, and is skipped when it is too slow.',
    repo: `${GH}/vera-bot`,
    isPrivate: true,
    status: { label: 'private', kind: 'private' },
    metrics: [],
    stack: ['Python', 'FastAPI', 'Vertex AI', 'Cloud Run'],
    links: [],
  },
];
