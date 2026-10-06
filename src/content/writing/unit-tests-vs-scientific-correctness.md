---
title: "My hazard numbers passed every test and were still wrong"
date: "2026-07-12"
summary: "Two weeks into this project, my code told me the 100-year heat extreme for Rourkela, an industrial city in Odisha, India, is 38.1 °C."
tags: ["statistics","testing"]
series: "Building an evaluated climate-risk agent in public"
part: 2
hashnode: "https://aswanisahoo.hashnode.dev/unit-tests-vs-scientific-correctness"
---
*Building an evaluated climate-risk agent in public, part 2.*

Two weeks into this project, my code told me the 100-year heat extreme for Rourkela, an industrial city in Odisha, India, is 38.1 °C.

Rourkela crosses 45 °C in a bad May. The record is around 46.

Every test was green. Thirty of them. That number would have shipped.

## Where I was

Part 1 covered the skeleton: a typed `RiskReport` contract, one live weather tool, a three-node LangGraph that either fills the contract or refuses. This phase had two jobs: expose the tools over MCP, and build the first real piece of science, extreme-value statistics from ERA5 reanalysis.

The MCP part was honestly the easy week. FastMCP wraps a typed Python function and generates the tool schema from the signature, so `get_forecast` became a protocol-visible tool in an afternoon, and I could call it from the MCP Inspector with real Open-Meteo data coming back. If you have typed functions already, MCP is cheap. That was the whole point of building the contract first.

Then the hazard statistics. The idea: take 60+ years of daily temperature maxima, reduce each year to its maximum, fit a Generalized Extreme Value distribution, and read off return levels. "The daily-max temperature exceeded once per century here is X." This is standard extreme-value theory, the same family of methods engineers use to size dams and building codes.

I wrote it test-first. GEV round-trips on synthetic data, known quantiles, sign conventions for scipy's `genextreme` (their shape parameter is the negative of the textbook one, which cost me an evening). All green.

For data I used a public ERA5 mirror stored as zarr, on a 5.625-degree grid, 6-hourly. Free, no key, cloud-native. It felt like the responsible choice.

## The number that lied

38.1 °C for a 46 °C city. Three separate biases, all pushing the same direction, none of them visible to a unit test:

1. The grid is so coarse that "nearest cell" for Rourkela was centered 290 km away. Wrong place.
2. Each cell averages temperature over roughly 600 km of terrain. Local extremes get smoothed into the regional mean. Wrong magnitude.
3. The data is 6-hourly: 00:00, 06:00, 12:00, 18:00 UTC. Peak heat in Odisha lands around 15:00 IST, between samples. The dataset never sees the hottest hour of the day. Wrong statistic.

The giveaway was that the fitted 100-year level sat almost exactly at the 63-year record max of that cell (38.3 °C). A healthy GEV fit extrapolates past the record. When the "once per century" value equals "the biggest thing we ever saw", the tail is degenerate and the fit is telling you it has nothing to say.

No test caught this because the tests checked math, not meaning. The GEV fit was correct. The pipeline was correct. The input was wrong for the question, and the code had no way to know.

What actually caught it was a dumb question I now ask on purpose: would someone who lives there believe this number? A person from Rourkela would laugh at 38.1.

## The rescue that failed

My first instinct was to keep the dataset and fix the sampling: the mirror also has hourly data, so read the full hourly series for one cell and take true daily maxima. I profiled it before committing.

One cell, 63 years, hourly: about 200 minutes. The zarr is chunked as full spatial fields per timestep, so reading one location means fetching the whole planet, timestep by timestep. The storage layout was designed for training weather models (read everything at one time), not for climatology at a point (read one place across all time). Twenty minutes of profiling saved me a week of denial.

## The pivot

Open-Meteo, the same provider behind my forecast tool, has an archive endpoint that serves ERA5 as point-interpolated daily aggregates. Native 25 km resolution, true daily maxima, interpolated to the exact coordinates you ask for.

Sixty-three years of daily maxima for Rourkela in 2.5 seconds. Record max: 46.1 °C. Fitted 100-year level: 46.0 °C, with the tail behaving sensibly against the record. A believable number, from the same underlying reanalysis, through a door designed for this question.

The code got simpler too. The zarr path needed xarray, gcsfs, and chunk-alignment care. The archive path is one HTTP call and a pure function from dates and values to annual maxima. All the heavy dependencies left the project.

## What I keep

The scars are now schema fields. Every `HazardStat` carries its statistic definition ("annual maximum of ERA5 daily-maximum 2 m air temperature"), the native resolution, whether it captures the diurnal peak, whether it is bias-corrected against a station (it is not), the record max sitting next to the fitted return levels so a degenerate tail is visible at a glance, and a `representativeness` enum that says plainly: this is point-interpolated reanalysis, not a station observation. ERA5 also underestimates sharp convective wind gusts, so the wind statistic is labeled a lower bound rather than pretending to be the truth.

If a number is a regional signal, the report now says so in a machine-checkable field instead of a footnote I would eventually forget to write.

The bigger change is process. Green tests tell you the code does what you meant. They say nothing about whether what you meant is scientifically sane. For that you need something that can fail loudly against reality: a benchmark with hand-checked answers and metrics that get published, not vibes. Building that benchmark, freezing it with a hash, and watching one of its slices score a perfect 0% against my chunking is the next post. That 0% is my favorite number in the whole project so far.

The repo is public: github.com/AswaniSahoo/climate-risk-agent

*Part of the series "Building an evaluated climate-risk agent in public."*
