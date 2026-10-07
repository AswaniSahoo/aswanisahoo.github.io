---
title: "My agent learned to read"
date: "2026-08-06"
summary: "The plan step was an if-statement over a hardcoded location. Now a typed pipeline parses, geocodes and maps any question to an IPCC region, or refuses."
tags: ["agents"]
series: "Building an evaluated climate-risk agent in public"
part: 7
hashnode: "https://aswanisahoo.hashnode.dev/my-agent-learned-to-read"
---
*Building an evaluated climate-risk agent in public, part 7.*

An anonymous review of this project scored it 7.5 out of 10 a few weeks back, "strong hire signal," with one line that stuck: the plan node in my LangGraph agent was, functionally, an if-statement over a hardcoded location. You couldn't actually ask it anything. You could only run the demo it was built to run. That's a fair thing to call an agent that isn't one yet.

## The pipeline a question has to survive

The fix is a typed pipeline in front of the graph, not inside it. Free text goes in. Four things have to succeed, in order, or the system refuses instead of guessing at any one of them:

Parse the hazard and horizon out of the sentence, deterministically, no LLM, reusing the same scope lexicons the answer-time guard already used. That reuse matters: a keyword list I already trusted for one purpose is now also injection-proof for a second purpose, because it was never derived from anything an attacker controls.

Geocode the place name to coordinates, through Open-Meteo's geocoding endpoint, host pinned, result cached.

Map those coordinates to an IPCC AR6 region. This is the part I was proudest of getting right: I did not hand-draw region boundaries or eyeball a lookup table. I used the official Iturbide et al. 2020 reference polygons, loaded through `regionmask`, and I probed four known cities against them before writing a line of the mapping code, to make sure Tokyo actually landed in East Asia before I trusted the library for a hundred other cities I'd never check by hand.

Feed the resolved region name into a retrieval question, using the exact same region vocabulary the table-row chunker already indexed by, so the words in the question match the words in the table verbatim, no synonym gap.

Any step that can't resolve produces a typed refusal. Not an exception, not a 500, a valid `RiskReport` whose contract only allows a missing hazard on the refusal path. The pipeline treats "I don't know what you meant" as a first-class output, the same way it's always treated "I don't have evidence for that."

## Watching it work on cities I hadn't tested

Tokyo maps to East Asia. Mumbai maps to South Asia. Both came from the real polygons, not a table I wrote by hand, which means the fortieth city I never explicitly test is exactly as likely to resolve correctly as the first four I did. A wildfire question and a made-up place name both produced clean, typed refusals instead of the agent inventing a location or a hazard it has no evidence for.

## The failure that tested itself

Partway through this smoke-testing session, live, unplanned, the model backend threw a real transient rate-limit error. Not a test double. An actual 429 from Vertex, mid-request.

The degrade path I'd built for exactly this case fired without me touching anything: the report shipped without citations, said so, and honestly dropped its confidence score to reflect the missing grounding. I hadn't scheduled this test. Production scheduled it for me, and the resilience design I'd written weeks earlier, for a scenario I was mostly guessing at, held up against the real thing on the first try.

That's a better validation than anything I could have written into a test file, because I couldn't have faked the conditions that produced it. A rate-limit error you inject yourself proves your code path runs. A rate-limit error that shows up uninvited while you're trying to demo something else proves your assumptions about production were right.

## What I'd tell you to steal

Reuse the security-relevant logic you already trust instead of writing a second version of it for a new feature; a lexicon that's injection-proof for one purpose stays injection-proof for the next one, for free. Never hand-author a geographic or categorical mapping if an authoritative source publishes the real one; probe it against known cases before you trust it for the unknown ones. And when a real production failure hits mid-demo, resist the urge to treat it as bad luck. Watch what your system actually does. Sometimes it's the best test you'll ever run, and you didn't have to write it.

Repo, the NL pipeline, and the region-mapping code are public: github.com/AswaniSahoo/climate-risk-agent

Next: the agent gets asked whether the climate is actually changing at a given location, and it turns out disciplined refusal applies to trend claims too, not just missing evidence.

*Part of the series "Building an evaluated climate-risk agent in public."*
