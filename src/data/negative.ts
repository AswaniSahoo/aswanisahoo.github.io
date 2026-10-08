import type { NegativeResult } from './types';

const GH = 'https://github.com/AswaniSahoo';

/** Results published even though they went against the work. */
export const negativeResults: NegativeResult[] = [
  {
    title: 'I tested my own mesh claim, and it did not hold',
    claimTested: 'That message passing over the mesh adds forecasting skill beyond what the encoder, decoder and per-cell embeddings already provide.',
    whatHappened:
      'My first test compared the mesh with a graph-free per-node MLP. In issue #238 I retracted it myself: the MLP was never a valid control, I had picked the best of about 11 held-out evaluations, and my train and eval windows touched. The fixed test changes only the graph: the same model and 2,267,775 parameters, the latent graph either full (about 35k cell-to-cell edges) or cut to self-loops, 5 seeds, final epoch, an 8-sample buffer on each side of the eval window. Message passing added no measurable skill; both arms still beat persistence by about 22%. The maintainer called it "really nice and helpful" and chose the next step: rework how observations couple to the mesh.',
    number: { label: 'held-out loss with the full graph against no graph at all; the seeds alone vary by 0.0006', value: '0.1662 vs 0.1658', verifiedAt: '2026-09-30', source: 'https://github.com/openclimatefix/graph_weather/issues/238#issuecomment-5150272270' },
    whyItMatters: 'An architecture claim that has not survived a proper control is a guess, even when the guess is mine. I retracted the flawed test in public and replaced it with one that isolates the graph.',
    where: '/open-source/#graph-weather',
  },
  {
    title: 'No intervention improved fairness',
    claimTested: 'That standard bias-mitigation methods reduce disparate impact in credit scoring.',
    whatHappened:
      'On German Credit the baseline disparate impact was 0.7263 and every confidence interval spanned the 0.8 four-fifths line; the 200-row test block, with 62 women, was underpowered. On the Taiwan set the baseline was already 0.9767; reweighing and ExponentiatedGradient moved it by under 0.004, and group-specific thresholds made it worse. The README says it in four words.',
    number: { label: 'alternatives beat the tuned baseline by more than noise', value: '0 of 4', note: 'three fairness fixes and a tabular foundation model', verifiedAt: '2026-10-07', source: `${GH}/fairness-credit-risk#readme`, evidence: 'README' },
    whyItMatters: 'Many published fairness improvements rest on samples too small to support them. Reporting the null result is the finding.',
    where: '/work/fairness-credit-risk/#changes',
  },
  {
    title: 'The held-out score is lower than the development score',
    claimTested: 'That the engine\'s accuracy on the development incidents would hold on a sealed held-out set.',
    whatHappened:
      'On the development incidents the engine ranked the true root cause first 93.2% of the time. On the sealed held-out set, opened once against a frozen commit, it was 76.7%. Both are published side by side, with the protocol.',
    number: { label: 'root cause ranked first, development set to sealed held-out set', value: '93.2% → 76.7%', verifiedAt: '2026-08-18', source: `${GH}/Incident-evidence-compiler` },
    whyItMatters: 'Publishing the drop is what makes either number believable.',
    where: '/work/incident-evidence-compiler/#changes',
  },
];
