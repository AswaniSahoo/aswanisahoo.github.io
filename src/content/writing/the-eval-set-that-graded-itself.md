---
title: "The eval set that graded itself"
date: "2026-10-23"
summary: "A held-out set is only doing its job if first exposure costs you something."
tags: ["evaluation"]
series: "Building an evaluated climate-risk agent in public"
part: 9
---
*Building an evaluated climate-risk agent in public, part 9.*

Everything in this series so far was measured on the same 45 questions. I'd been disclosing that in the project's limitations section, but disclosing a problem isn't fixing it. A benchmark you've stared at for weeks, tuning chunkers and retrievers against it, stops being able to embarrass you. You fix what fails until nothing fails, and that tells you the benchmark agrees with you, not that you're right.

The fix is a held-out set: new questions, written after every design decision the dev set had already shaped, frozen by hash, and not looked at until a release gate. Every eval run defaults to the dev set, so an accidental run can't burn the held-out one. It's a second, independent judge, not a bigger copy of the first.

## The subagents that wouldn't write

I tried to delegate the writing. Twice. Each time I sent a fresh AI subagent off to write a batch of the 105 new questions, under the same rules as the original 45: gold pages and supporting quotes that a script can check against the source PDFs.

Each one burned more than 250,000 tokens and banked zero questions. Not slightly under target: zero. The first decided its job was "research" and never wrote a question. The second, given the same task, tried to hand it to its own subagent. Two expensive rounds proved the same thing: "go write benchmark questions" is too open-ended to force output, and an agent facing that much room will find something that looks like productive research instead of doing the writing.

## Removing the choice

I stopped asking an agent to write questions and started running an extraction script. Each question's supporting quote is sliced out of a live call to the PDF text extractor, between two anchor strings I pick by reading the actual page:

```python
# evals/authoring/author_pi.py
def quote(source: str, page: int, start: str, end: str) -> str:
    text = _pages[(source, page)]
    i = text.find(start)
    assert i >= 0, f"start anchor absent {source} p{page}: {start!r}"
    j = text.find(end, i)
    assert j >= 0, f"end anchor absent {source} p{page}: {end!r}"
    q = text[i : j + len(end)]
    assert len(q) < 400, f"quote too long ({len(q)}) {source} p{page}"
    return q
```

The quote is never typed, so a transcription typo can't exist: it is a substring of what the extractor returned. If an anchor isn't on the page, the script stops. That turned "write 105 verified questions" from an open-ended research task into a mechanical one, and I wrote all four batches myself in one session.

Final quotas: 24 single-page, 15 multi-page, 22 regional-table and 9 duplicate-region questions the agent should answer (70), plus 10 out-of-scope-hazard, 8 out-of-corpus and 17 premise-injection questions it should refuse (35). 105 in total, frozen by hash.

One adjustment along the way. The corpus is three IPCC AR6 Working Group I documents, and they only support about 15 distinct multi-page facts on the hazards I cover. Past that, I'd have had to reach into drought or compound flooding, which the agent is built to refuse. So instead of padding multi-page from 15 to 20, I moved those five into premise injection, which has no such ceiling because I construct those questions rather than find them.

## Spending the held-out set for the first time

You only get to spend a held-out set's first exposure once. I ran both evals against it on 18 July, as a release gate, not a tuning loop.

Retrieval: Recall@3 87%, Recall@5 91%, Recall@10 96% on the 70 answerable questions. The dev set had scored 91% Recall@3, a 4-point gap that sits inside the noise band for this sample size.

End to end, first exposure produced 4 false answers. That is the number this project exists to keep at zero, so it got my attention before anything else.

## The two bugs it found

A held-out set is only doing its job if first exposure costs you something. This one cost two bugs, of different kinds.

The first was a real system defect. The scope guard checked for supported hazards before it checked for one exception, so a question about a "marine heatwave" slipped through: the phrase contains "heatwave", which is supported, and the model answered it instead of refusing. The fix was the order of the checks:

```python
# rag/scope.py
_MARINE_HEATWAVE = re.compile(r"\bmarine heat ?waves?\b|\bocean heat ?waves?\b", re.IGNORECASE)


def out_of_scope_hazard(question: str) -> str | None:
    if _MARINE_HEATWAVE.search(question):
        return "marine heatwave"
    if _SUPPORTED.search(question):
        return None
    for pattern, name in _UNSUPPORTED.items():
        if re.search(pattern, question, re.IGNORECASE):
            return name
    return None
```

The second bug was mine. I'd labelled three questions, on snowline elevation, sea ice and glacier mass, as ones the agent should refuse, on the theory that the cryosphere is out of scope. But the corpus treats those as background physical science, the same category as a glacier-commitment question in my dev set that the agent was already allowed to answer. The agent answered all three correctly, with real citations. My label was wrong, not the agent.

I replaced those three with questions on hazards the agent really doesn't cover (drought, sea-level rise, tropical cyclones) and re-froze the set under a new hash. That is the one place I edited the held-out set after seeing it, which is why I report both sides: 4 false answers at first exposure, 0 after one system fix and three label fixes.

After the fixes, gate 1 read: 51 correct answers, 35 correct refusals, 0 false answers, 19 false refusals. Citation validity 94%, numeric provenance 86%.

## The number I haven't fixed

The run my README quotes today is a later one, on 22 July with gemini-2.5-flash: 49 correct answers, 35 correct refusals, 0 false answers, 21 false refusals, and 96% citation validity (47 of 49). The agent still refuses 21 of the 70 questions it should answer. That is the price of the zero, and I haven't paid it down yet.

## What I'd tell you to steal

If you hand an agent an open-ended writing task with no structural constraint, expect it to spend real money finding a way not to do the work. A longer prompt rarely fixes that. Removing the room does: turn "write X" into "run this extraction and package the result".

And hold out a real test set, spend its first exposure on purpose, and expect it to find something wrong with your benchmark as often as with your system. Both are real bugs. Only one of them is comfortable to admit.

Repo, both gold sets and the enforcement tests are public: github.com/AswaniSahoo/climate-risk-agent

Next: the free hosting I'd planned to deploy on stops being free, mid-project, and a live 503 error during a screenshot session teaches me which part of my system actually needed to be resilient.

*Part of the series "Building an evaluated climate-risk agent in public."*
