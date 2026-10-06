---
title: "I Made My AI Agent Tell Me Exactly What Every Answer Costs"
date: "2026-07-28"
summary: "This one is about something a portfolio project usually skips: whether I actually know what a single answer costs, and whether the thing serving it can hold up under a real HTTP request instead of a notebook cell."
tags: ["observability"]
series: "Building an evaluated climate-risk agent in public"
part: 6
hashnode: "https://aswanisahoo.hashnode.dev/i-made-my-ai-agent-tell-me-exactly-what-every-answer-costs"
---
*Building an evaluated climate-risk agent in public, part 6.*

Every post so far has been about whether the agent's answers are true. This one is about something a portfolio project usually skips: whether I actually know what a single answer costs, and whether the thing serving it can hold up under a real HTTP request instead of a notebook cell.

## Why this, now

I was reading through a job description for an AI-team role and noticed it named the two things this project was missing by name: evaluation of guardrails and safe integrations (which I had) and observability plus a real service boundary (which I didn't). Not a bad prompt. If a system's only interface is `python demo.py`, nobody outside my own terminal can tell what it costs to run or whether it survives concurrent traffic.

## Instrumenting at the chokepoint, not everywhere

The tempting way to add cost tracking is to sprinkle logging calls through every function that might touch the model. The reliable way is to find the one place no call can avoid passing through, and instrument only that.

Every Gemini call in this project, embeddings and generation both, already went through one retry wrapper. That's the seam. I attached a recorder there: a thread-safe span that captures latency, token counts, and an estimated cost per call, written to an in-memory rollup and a daily JSON log. Same philosophy as the citation validator from earlier posts: put the check at the one place fabrication (or, here, an unmeasured call) structurally cannot get through.

One consequence worth stating plainly: a cache hit on a previously-answered question is recorded as a real event with a real cost of zero, not silently skipped. The 56-second to 0.8-second speedup from the disk answer cache, which I'd mentioned anecdotally two posts ago, is now a number in a rollup instead of a claim I'm asking you to trust.

Measured on a real grounded heatwave report: about $0.0013 estimated cost, p50 generation latency 10.6 seconds. A repeated question: cache hit, $0, and the telemetry says so instead of me having to remember to mention it.

## Giving it a front door that isn't Streamlit

The UI is fine for a demo. It's not a service. So the agent got a second interface: an async FastAPI layer, `POST /report`, that runs the (synchronous, blocking) agent pipeline via `asyncio.to_thread` so the event loop never stalls waiting on a network call or a GEV fit. An `x-api-key` header gates access, checked per request so a key rotation doesn't need a restart. `/healthz` stays open for probes. `/metrics` exposes the same telemetry rollups the UI panel reads.

The response isn't just the report. It's the report plus what generating it cost, in the same payload. If you're going to expose a report-generation endpoint, the honest version tells the caller what that call is going to cost them before they've called it ten thousand times and gotten a surprise invoice.

Live smoke test: request without a key, 401. Request with a key, a real cited report comes back with two citations, and a second identical request comes back from cache at zero cost. Structurally the same guarantee that keeps the citation validator honest, applied to money instead of fabrication.

## What this actually proves

None of this is exotic engineering. Thread-safe counters and an async wrapper around a blocking call are not novel ideas. The point isn't novelty. The point is that "this system has observability" is a sentence any README can claim and almost none can back with a live `/metrics` endpoint returning real numbers from real requests. Same rule I've been following the whole series: a claim without a number attached is just a vibe.

## What I'd tell you to steal

Find the one chokepoint every expensive call has to pass through, and put your measurement there instead of scattering it everywhere. Make a cache hit a recorded zero-cost event, not a silent shortcut, so your speedup claims come from data instead of memory. And if you're going to give your agent an API, have it tell every caller what the call cost, in the same response, every time. Trust is cheaper to build at the seam than to bolt on after the fact.

Repo, telemetry module, and the API tests are public: github.com/AswaniSahoo/climate-risk-agent

Next: the agent stops needing hardcoded coordinates and starts reading plain-language questions, right before a real production error hits it mid-demo and the whole resilience design gets tested live, unplanned.

*Part of the series "Building an evaluated climate-risk agent in public."*
