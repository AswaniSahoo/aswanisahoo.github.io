---
title: "How a Chunking Bug Taught Me More Than a Model Failure"
date: "2026-07-23"
summary: "This post is about how that hypothesis was half wrong, what was actually happening, and why the failure made me trust the system more, not less."
tags: ["retrieval","evaluation"]
series: "Building an evaluated climate-risk agent in public"
part: 4
hashnode: "https://aswanisahoo.hashnode.dev/how-a-chunking-bug-taught-me-more-than-a-model-failure"
---
*Building an evaluated climate-risk agent in public, part 4.*

Last post ended with a confusion matrix I was proud of: over 45 frozen benchmark questions, my climate-risk agent produced zero fabricated answers. Its only errors were three refusals on questions it should have answered, all three about the same kind of content, rows in the IPCC's regional projection tables.

I had a tidy hypothesis for why: the retriever was probably fetching the right pages but the wrong chunks, sibling table rows crowding out the exact row with the answer. This post is about how that hypothesis was half wrong, what was actually happening, and why the failure made me trust the system more, not less. Then we ship the thing.

## Measure before fixing

The rule I keep re-learning: never fix a bug you haven't watched happen. So before touching anything, I printed the actual top-5 retrieved chunks for the three failing questions.

Two of the three answer rows were *already in the top-5*. One was at rank 1. The model had the sentence containing the answer directly in its context ("Median increase of more than 3.5°C in the 50-year TXx and TNn events compared to the 1°C warming level") and it still refused to answer.

My hypothesis was wrong for two of three questions. The retrieval was fine. So why refuse?

## Column-label loss

Look at the question: "At **4 degrees** of global warming, how much are the rarest hot-extreme events in East Central Asia projected to intensify?"

Now look at what the chunk actually says: a number, "more than 3.5°C", followed by "compared to the 1°C warming level". Nowhere in that chunk does it say **4°C**.

That's because the IPCC's tables put the warming level (1.5°C, 2°C, 4°C) in the column *headers*, once, at the top of the table. Every cell below just says "compared to the 1°C warming level", for every column. My row-atomic chunker (the one that took the trap slice from 0% to 100% last post) preserves the *row* identity perfectly and destroys the *column* identity completely.

So the model saw an unlabeled number and refused to attribute it to a specific warming level. Sit with that for a second: given ambiguous evidence, the model declined to guess. The abstention wasn't a bug in the model. It was epistemically correct behavior operating on evidence my pipeline had mutilated. The eval didn't catch a dumb model; it caught a chunker that destroys column semantics.

## The fix that works by accident (measured on purpose)

The A/B was cheap: retrieve 8 chunks instead of 5, on the same frozen benchmark. Two of the three refusals flipped to correct, cited answers.

The mechanism is worth understanding, because it's not "more context = better." At k=8, the table's *header chunk*, the one that says "Table 11.7 | ... projected changes at 1.5°C, 2°C, 4°C", makes it into the context. The header chunk supplies the column semantics that the row chunks lost. The model can finally connect the number to the warming level, so it answers.

Full rerun over all 45 questions to check nothing else broke: 33 correct answers, 11 correct refusals, 1 false refusal, and (the number I actually care about) still **zero** false answers. Citation validity held at 94%. The context-size change didn't leak a single fabrication.

The one survivor is honest too: its row window contains three unlabeled figures (6%, 10%, 25%) and its table's header chunk doesn't reach the top-8. The real fix is at chunk time (append the parent table caption to each row chunk), and it's in my debt ledger with a trigger, not hacked in at 6 p.m. on ship day.

## Citations reach the product

Until this week, the eval pipeline and the actual agent shared retrieval code but not purpose: the agent's `RiskReport` had a placeholder `citations` field since day one.

Now there's a fourth node in the graph: after fetching the forecast, the agent formulates an IPCC question about its hazard and location, retrieves top-8 with the measured hybrid pipeline, and gets an answer whose citations are schema-validated: the LLM structurally cannot cite a chunk that wasn't retrieved. The graph maps those chunk IDs to page-level citations in the final report.

One design detail I like: the retrieval question fuses two vocabularies. Real-world risk screening asks about "extreme heat"; the IPCC writes "hot extremes." The question contains both: the IPCC's exact table terms anchor the lexical retriever, the everyday phrasing gives the dense retriever something to bridge from.

And the degradation path is explicit: no corpus, no LLM auth, or an honest abstention → the report ships without citations and *says so*. It never decorates itself with citations it can't back.

First live run, heatwave, Rourkela, during monsoon week: risk LOW (34°C; correct, it's the rainy season), with citations to Chapter 11 page 44 and page 119. Page 119 is the table header page. The k=8 mechanism, visible in production on the first query.

## Shipping is a feature

The rest of the week was the unglamorous tail that separates a repo from a product:

- **A Streamlit UI** that renders only the report contract. A refusal renders as a refusal. A citation-less report explains why it has no citations. The UI physically cannot render a dishonest state, because the Pydantic contract makes "asserts a risk AND refuses" unrepresentable.
- **Docker**, with the corpus baked in at build. No API key → the retrieval layer loudly falls back to BM25-only (measured: 82% instead of 91%, and it tells you). With a key → the full hybrid pipeline.
- **CI** runs the 128 tests on every push. The evals deliberately do *not* run in CI: they need the corpus, an embedding cache, and paid API auth. Instead they're a documented release gate: run both evals, publish the numbers, then tag. A single fabricated answer blocks the release. That's not a config choice, it's a policy with a number attached.

## What I'd tell you to steal

If you take one thing from this series: **your evaluation's job is to make failures diagnosable, not to make you look good.** A single accuracy number would have told me "93% correct, ship it." The confusion matrix told me *which way* the system fails (toward silence, never invention). The slice breakdown told me *where* (table rows). Printing the actual retrieved chunks told me *why* (column-label loss). Each layer of measurement turned a vague "RAG is flaky" into a one-line root cause.

The agent is live-runnable now: repo, eval commands, Docker image, UI. Every number in this post is reproducible from the frozen benchmark in the repo.

Next: the last false refusal dies at chunk time, and the system gets an observability layer so I can measure cost per report, not just correctness.
