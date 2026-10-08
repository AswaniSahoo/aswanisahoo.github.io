---
title: "When my evaluation reached zero errors, I hired a stricter judge"
date: "2026-07-26"
summary: "A claim-level judge, added next to the citation checker, found the same table-chunking bug a second time. Fixing it took both error cells to zero."
tags: ["evaluation"]
series: "Building an evaluated climate-risk agent in public"
part: 5
hashnode: "https://aswanisahoo.hashnode.dev/when-my-evaluation-reached-zero-errors-i-hired-a-stricter-judge"
---
*Building an evaluated climate-risk agent in public, part 5.*

Last post ended with a confusion matrix over 45 frozen questions: 33 correct answers, 11 correct refusals, 1 false refusal, 0 false answers. Good enough to write a blog post about. Not good enough, it turns out, for the instrument I built to check my own instrument.

## Adding a second, stricter reader

A page-level citation checker asks one question: did the model cite a page that's actually in the gold set? That catches fabrication. It does not catch a subtler failure: citing the right page while making a claim that page doesn't actually support.

So I added a claim-level judge. It decomposes each answer into individual factual claims, then checks each claim against only the excerpts the model cited, nothing else, temperature 0, forced JSON. Not instead of the deterministic checkers. Next to them.

Run on all 45 answers: 95% claim support, 101 of 106 claims. 29 of 33 non-abstaining answers fully supported. The refusal matrix hadn't moved, still 33/11/1/0. But the judge flagged something the matrix couldn't see.

## The same bug, found twice

Two answers claimed a projection was true "at 4 degrees of global warming." The judge marked both unsupported. I already knew why, from the previous post: my table chunker carries row data perfectly and carries column headers not at all, so a chunk can contain the number without the warming-level label that number belongs to.

I'd fixed this once already, sort of, by widening retrieval to top-8 so the header chunk usually rides along in context. The model could read the label. It still hadn't cited it, because the label lived in a chunk that wasn't the one the guard rail measures citations against.

Two completely different instruments, one built to check retrieval and one built to check claims, converged on the same root cause independently. That's what a second layer of evaluation is for. It doesn't find new bugs as often as you'd hope. When it does, you should believe it.

## The actual fix, at last

The real fix wasn't more context. It was giving each row chunk its own memory of which table it came from. Every table page in the corpus states its caption once: "Table 11.7 | ... projected changes at 1.5°C, 2°C, 4°C." I now suffix that caption onto every row chunk cut from that table, carried across continuation pages where the caption itself doesn't reprint, reset the moment the page turns back to prose.

About 30 lines in the chunker. Four new tests: caption present on first table page, carried onto continuation, absent on prose, reset correctly at a table-to-prose boundary.

Retrieval on the same frozen set moved from 91% to 88% recall@3. The caption text is identical across every row in a table, so at k=3 the shared caption tokens act as noise between sibling rows. Recall@5 and recall@10 held at 94%, and my production path answers at k=8, so the number that actually matters didn't move.

The refusal matrix did: **34 correct answers, 11 correct refusals, 0 false refusals, 0 false answers.** Both error cells at zero, for the first time. Citation validity 94%. Claim support up to 93%, 106 of 114 claims across the now-larger answer set.

## Where the judge is still right

I reran the claim judge expecting it to go quiet on the "at 4°C" flags. It didn't. It still marks two answers as citing an unsupported claim, and checking by hand, it's correct both times.

The caption proves the table *has* a 4°C column. It doesn't prove the specific cell the model cited is drawn from that column, not that particular row window. That's genuine information loss from how a two-dimensional table gets linearized into a one-dimensional PDF text stream, and no amount of extra text glued onto a chunk recovers a cell-to-column mapping that was never extracted in the first place. The only real fix is structured table extraction: parsing rows and columns as a grid instead of a stream of characters. That's a bigger, riskier change than anything I've shipped so far, so it goes in the debt ledger with an explicit trigger, not a quiet TODO, and it stays out of scope until a real number demands it.

I like that the judge disagrees with me here. A checker that always agrees with the pipeline that trained it isn't checking anything.

## What I'd tell you to steal

Layer your evals by what they can see, not by how impressive they sound. A retrieval metric tells you if the right page came back. A citation validator tells you if the model is honest about its sources. A claim judge tells you if the claim and the source actually agree. Each layer catches a failure the layer below it is structurally blind to, and the expensive one (an LLM judging an LLM) earns its cost by finding the same bug your cheap deterministic checks already suspected, then finding a second one they never could.

And when your strictest instrument keeps flagging something after the fix looks perfect on paper, go check by hand before you tune it into silence. Sometimes the judge is the thing that's right.

Repo, eval commands, and both instruments are public: github.com/AswaniSahoo/climate-risk-agent

Next: the agent gets an observability layer so I can tell you what a report costs, not just whether it's true.

*Part of the series "Building an evaluated climate-risk agent in public."*
