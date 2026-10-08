---
title: "Building a climate-risk agent in public, week 1: why I built an agent, not a chatbot"
date: "2026-07-04"
summary: "I'm building a climate-risk analyst agent out in the open, one week at a time."
tags: ["agents"]
series: "Building an evaluated climate-risk agent in public"
part: 1
hashnode: "https://aswanisahoo.hashnode.dev/why-i-built-an-agent-not-a-chatbot"
---
I'm building a climate-risk analyst agent out in the open, one week at a time. This is week one: the decisions I made, why I made them, and what actually runs at the end of it. I'm a self-taught ML developer with a weather-data background, and I'm treating this like a real project: small steps, tests, commits from day one.

## The problem I picked

People who make weather and climate decisions (insurers, farmers, city planners) usually have the data they need. They just can't use it. Live forecast feeds are raw numbers. The IPCC reports run to a thousand pages. Nobody sits down and cross-references a precipitation feed against Chapter 11 of an assessment report by hand.

So here's the goal: turn real weather data and authoritative climate documents into a grounded, cited, structured risk report, for a place, a hazard, and a time window.

## Decision 1: an agent, not a chatbot

My first instinct was the easy one: wrap an LLM, ask it about flood risk, done. I dropped that idea quickly. A chatbot predicts plausible text. Ask it for next week's flood risk and it will hand you a confident number with nothing behind it. For an actual decision, that's worse than useless.

An agent works differently. It makes a plan, goes and fetches real data, and returns a structured answer it can back up. "Grounded" is the whole point. That difference, guessing versus fetching-then-answering, is the thesis of the project.

## Decision 2: design the output before anything else

This is the choice I'm happiest with. I built the *output* first, before writing a single tool.

I wrote a Pydantic model called `RiskReport`, the exact shape every answer has to take: a risk level, the drivers behind it, citations, data provenance, a confidence score, and a refusal field. Then I pushed the rules into the type itself:

```python
class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    SEVERE = "severe"
```

The level can only be one of those four values. Confidence is forced between 0 and 1. And a report has to either give a risk *or* refuse (never both, never neither), enforced by a validator. Bad output can't even be constructed.

Why first? Because the tools and the logic only exist to fill this shape. Design the product before you build the assembly line, and everything downstream has a clear target to aim at.

## The one tool: get_forecast

Week one gets a single sense organ: `get_forecast`, which calls the Open-Meteo API (free, no API key). Give it a latitude and longitude and it returns the next few days of rainfall and max temperature, parsed into a typed result. The raw API hands back a loose JSON blob; I convert it once, at the boundary, so the rest of the code never has to deal with messy dictionary keys.

## Wiring it with LangGraph

Three parts sitting next to each other aren't an agent. I connected them with a small LangGraph state machine, three nodes sharing one state object:

- **plan**: can I answer this hazard with my data? If not, write a refusal and skip to the end.
- **call**: run `get_forecast` and store the result.
- **synthesize**: turn the forecast into a `RiskReport`.

The part that clicked for me: the shared state is a common interface. Every node reads and writes the same clipboard, so adding a node later doesn't mean re-wiring the whole thing. That's how this skeleton grows into the bigger multi-agent design I have planned.

## Testing: I mocked the internet

Every test replaces the HTTP call with a canned response. No test touches the live network. That keeps them fast, offline, and deterministic: a test should only fail when *my* code is wrong, not when Open-Meteo has a blip or the forecast changes tomorrow. One test even proves the refusal path by adding no mock at all: if the agent wrongly called the API, that test breaks.

Sixteen tests, all green.

## It runs

Here's a real report the agent produced from today's forecast for Rourkela:

```json
{
  "location": "Rourkela",
  "hazard": "extreme_precip",
  "risk_level": "low",
  "summary": "Peak daily rainfall of 12.1 mm over 7 days.",
  "confidence": 0.3,
  "provenance": [{ "source": "Open-Meteo", "retrieved_at": "2026-07-04T10:17:26Z" }]
}
```

Low risk, and every number traces back to a real API call.

## What I'm being honest about

The risk thresholds right now are crude placeholders: a rainfall cutoff and a fixed low confidence. The real grounding, climate statistics from ERA5 and page-cited IPCC evidence, is what the next few weeks are for. I'm shipping the spine first, then the intelligence.

## Next week

Week 2 is the Model Context Protocol. I'll figure out what MCP actually is from first principles, then expose these tools as an MCP server so any client (Claude, Cursor) can use them. It's new territory for me, which is exactly why I want to write it down.

The repo is public and built in the open. Follow along.

GitHub:
[GitHub: https://github.com/AswaniSahoo/climate-risk-agent]

I'm documenting every mistake, design choice, and improvement weekly.

Week 2 → Model Context Protocol (MCP)
