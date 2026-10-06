---
title: "My favorite number in this project is zero. Twice."
date: "2026-07-17"
summary: "This post is about how a RAG system earns numbers you can defend, instead of the usual \"we implemented retrieval-augmented generation\" with no evidence attached."
tags: ["retrieval","evaluation"]
series: "Building an evaluated climate-risk agent in public"
part: 3
hashnode: "https://aswanisahoo.hashnode.dev/how-i-evaluated-my-climate-risk-rag-system-before-writing-the-retriever"
---
*Building an evaluated climate-risk agent in public, part 3.*

Two zeros showed up in my metrics this week. The first was a 0% that made me genuinely happy. The second is the number I would lead with if I had to pitch this system to an organization tomorrow.

This post is about how a RAG system earns numbers you can defend, instead of the usual "we implemented retrieval-augmented generation" with no evidence attached.

## The benchmark came first, on purpose

Before writing a single line of retrieval code, I authored 45 questions against my corpus (IPCC AR6 WG1: the Summary for Policymakers plus chapters 11 and 12, 439 pages). Each question carries a gold label: the set of PDF pages that answer it, plus the exact supporting sentence, verified verbatim against the extracted text by a test that runs on every commit. The whole file is frozen with a content hash. If I edit a question, the test suite goes red until I deliberately re-freeze.

Why this order? Because if you build the retriever first, you write questions your retriever can already answer. You will not do it consciously. You will do it anyway.

The 45 are not all friendly. There are out-of-scope questions the system must refuse even though the corpus contains the answer. There are questions with a false premise baked in ("Given that the IPCC says X...", where the IPCC says the opposite). And there are two questions I designed specifically to punish sloppy chunking: the IPCC's regional tables put the Tibetan Plateau's row directly above South Asia's on the same page, with different confidence levels, and West Central Asia (WCA) sits one letter away from East Central Asia (ECA) with a 5 °C versus 3.5 °C difference in projected extremes. Mix up either pair and you get a confidently cited wrong answer.

## Zero number one

The BM25 baseline on naive 1200-character chunks scored 76% headline recall@3. Respectable. Then I looked at the trap slice: 0%. At every cutoff. The duplicate-region questions failed completely, because a fixed-size window mixes several regions' table cells, so a query about South Asia retrieves a chunk dominated by the Tibetan Plateau.

That 0% made me happy because I designed the trap before building anything, and it caught exactly the failure it was built to catch. This is what a benchmark is for. It also handed me the cleanest possible justification for the fix: split table pages one region-row per chunk, anchored to the official list of 44 AR6 region names, re-attaching the region label when a long row overflows.

About 60 lines of deterministic code. No ML. Result: the trap slice went from 0% to 100% at recall@5, and the headline moved from 76% to 82%. Same frozen questions, before and after published. The technique earned its place with a delta, which is the only currency I accept in this project now.

## The temptation I refused

The remaining misses had a pattern: vocabulary gaps. The question says "1-day rainfall", the table says "Rx1day". The question says "warm faster, by what factor", the page says "more than two times the rate".

I could have fixed several of these with a hand-written synonym list. It would have been deterministic, free, and it would have quietly destroyed the benchmark, because I would be tuning on my own test set. A synonym map built by staring at failing eval items is just overfitting with extra steps.

The legitimate fix for vocabulary gaps is a general semantic layer. So: dense embeddings (Gemini embedding model, 768 dimensions, asymmetric task types so questions and passages embed differently), fused with BM25 by Reciprocal Rank Fusion. The RRF constant stays at the literature default. I did not tune it. That is the point.

## The surprise in the ablation

Dense retrieval alone scored 71%. Worse than BM25's 82%. If I had swapped BM25 out for embeddings, the system would have gotten worse, and without slice-level numbers I might never have known why.

The slices tell the real story. Dense collapsed on multi-page prose questions (50% recall@3) but dominated exactly where BM25 was blind: regional tables at 80%, the premise-injection slice at 75%, and both duplicate-region traps at rank 1. Two retrievers, blind in opposite eyes.

Fused, they hit 91% headline recall@3, with the regional-table and trap slices at 100% at every cutoff. The progression is now 76 to 82 to 91, every step on the same frozen questions, every step attributable to one change.

## Zero number two

Retrieval numbers are not trust. A system can retrieve the right page and still lie about it. So the last layer is behavioral, and it is enforced by structure, not by prompt-engineering hope:

The model must return JSON matching a schema. Its citations are chunk identifiers, and a validator rejects any citation that does not reference a chunk actually retrieved for that question. A fabricated citation is not discouraged. It is unconstructable.

For scope, I learned the hard way that prompts are suggestions. In the first live smoke test, the model cheerfully answered a tropical-cyclone question despite an explicit rule to refuse. The fix is a guard written in code that runs before the model is called. It cannot be argued with, because it does not read the question's opinion of itself.

Then I ran all 45 frozen questions end to end and scored the refusal behavior as a confusion matrix. The result:

- correct answers: 32
- correct refusals: 11
- false refusals: 2
- false answers: 0

Zero false answers. Across every trap, every false premise, every out-of-scope lure, the system never once invented an answer it should have withheld. Its only two errors are refusals it should have answered, both on questions where lexical retrieval missed a deep table row. (Spoiler for the next post: fixing those refusals turned out to be a stranger story than "use the better retriever", and the zero held the whole way through.)

That asymmetry is designed. In climate-risk communication, a confident wrong answer costs trust permanently; a cautious "my sources do not support that" costs a shrug. Every layer of this system biases errors toward silence. Now I can prove it does.

## What I'd tell you to steal

Freeze a benchmark before you build. Put traps in it. Publish the slices you fail, not just the headline. Make every technique buy its way in with a before/after on identical questions. And measure your system's lies separately from its misses, because they are different failures with different costs.

Everything here is reproducible from the repo, including the eval commands and the frozen question set: github.com/AswaniSahoo/climate-risk-agent

*Part of the series "Building an evaluated climate-risk agent in public."*
