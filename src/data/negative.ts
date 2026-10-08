import type { NegativeResult } from './types';

const GH = 'https://github.com/AswaniSahoo';

/** Results published even though they went against the work. */
export const negativeResults: NegativeResult[] = [
  {
    title: 'I tested my own mesh claim, and it did not hold',
    claimTested: 'That message passing over the mesh adds forecasting skill beyond what the encoder, decoder and per-cell embeddings already provide.',
    whatHappened:
      'My first test compared the mesh with a graph-free per-node MLP. In issue #238 I retracted it myself: the MLP was never a valid control, I had picked the best of about 11 held-out evaluations, and my train and eval windows touched. The fixed test changes only the graph: the same model and 2,267,775 parameters, the latent graph either full (about 35k cell-to-cell edges) or cut to self-loops, 5 seeds, final epoch, an 8-sample buffer on each side of the eval window. Message passing added no measurable skill; both arms still beat persistence by about 22%. The maintainer called it "really nice and helpful" and chose the next step: rework how observations couple to the mesh.',
    number: { label: 'full graph vs self-loops only, held-out loss, seed spread 0.0006', value: '0.1662 vs 0.1658', verifiedAt: '2026-09-30', source: 'https://github.com/openclimatefix/graph_weather/issues/238#issuecomment-5150272270' },
    whyItMatters: 'An architecture claim that has not survived a proper control is a guess, even when the guess is mine. I retracted the flawed test in public and replaced it with one that isolates the graph.',
  },
  {
    title: 'No intervention improved fairness',
    claimTested: 'That standard bias-mitigation methods reduce disparate impact in credit scoring.',
    whatHappened:
      'On German Credit the baseline disparate impact was 0.7263 and every confidence interval spanned the 0.8 four-fifths line; the 200-row test block, with 62 women, was underpowered. On the Taiwan set the baseline was already 0.9767; reweighing and ExponentiatedGradient moved it by under 0.004, and group-specific thresholds made it worse. The README says it in four words.',
    number: { label: 'fairness treatments that beat the tuned baseline beyond noise', value: '0 of 4', note: 'reweighing, ExponentiatedGradient, group thresholds, a tabular foundation model', verifiedAt: '2026-10-07', source: `${GH}/fairness-credit-risk#readme`, evidence: 'README' },
    whyItMatters: 'Many published fairness improvements rest on samples too small to support them. Reporting the null result is the finding.',
  },
  {
    title: 'The held-out number is lower, on purpose',
    claimTested: 'That Incident Evidence Compiler\'s dev-split accuracy would hold on a sealed split.',
    whatHappened:
      'Dev split RE2-OB: top-1 93.2%. Sealed split RE2-TT, opened once against a frozen commit: top-1 76.7%. Both are published side by side, with the protocol.',
    number: { label: 'dev to held-out top-1', value: '93.2% → 76.7%', verifiedAt: '2026-08-18', source: `${GH}/Incident-evidence-compiler` },
    whyItMatters: 'Publishing the drop is what makes either number believable.',
  },
];
