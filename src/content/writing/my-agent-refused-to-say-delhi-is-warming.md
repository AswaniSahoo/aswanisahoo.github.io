---
title: "My agent refused to say Delhi is warming"
date: "2026-09-18"
summary: "Non-stationary GEV, likelihood-ratio tests, and the engineering discipline of refusing to hallucinate climate trends."
tags: ["statistics"]
series: "Building an evaluated climate-risk agent in public"
part: 8
---
*Building an evaluated climate-risk agent in public, part 8.*

Every hazard number in this project, up to this point, came from a stationary model: fit one Generalized Extreme Value (GEV) distribution to sixty-odd years of annual maxima and treat every year in that window as interchangeable. That's a defensible baseline. It's also quietly wrong in a specific way for a climate-risk tool: it treats 1962 and 2022 as draws from the same distribution, when the entire premise of the project is that the climate is not standing still.

## Gating the trend with a likelihood-ratio test

The fix is a drifting-location GEV: the same distribution, except its location parameter is allowed to move linearly with year instead of staying fixed:

$$\mu(x) = \mu_0 + \text{slope} \cdot (x - \bar{x})$$

We fit both models: the 3-parameter stationary model and the 4-parameter drifting model (`c`, `mu0`, `slope`, `log_sigma`). Then we run a nested likelihood-ratio test to ask whether the drift earns its extra degree of freedom or whether it is just fitting background noise.

Because the models are nested, the test statistic collapses to a chi-squared distribution with one degree of freedom ($df = 1$), yielding a clean p-value:

```python
# Nested MLE and Likelihood-Ratio Test (tools/gev_trend.py)
c0, loc0, scale0 = _fit(y)
stationary_ll = float(genextreme.logpdf(y, c0, loc=loc0, scale=scale0).sum())

# Warm-start Nelder-Mead on the likelihood ridge at slope=0
params, trend_ll = _mle(y, xc, [c0, loc0, 0.0, np.log(scale0)])
c, mu0, slope, log_sigma = params

lr = max(0.0, 2.0 * (trend_ll - stationary_ll))
p_value = float(chi2.sf(lr, df=1))
```

I did not invent the reporting convention here. Before wiring anything into production, I checked how the extreme-value literature handles a confirmed trend: Katz et al. (2002) and standard toolkits (`extRemes`, `NEVA`) report an **"effective return level"**: the return level implied by the fitted trend evaluated at the most recent year, rather than an average smeared across sixty years of a changing climate.

In our climatology engine, the decision gate is strict and binary:

```python
# Gating return levels behind statistical significance (tools/climatology.py)
if fit.significant:  # p < 0.05
    levels = trend_return_levels(
        fit, at=years[-1], return_periods=return_periods, n_boot=_TREND_N_BOOT
    )
else:
    levels = return_levels_with_ci(maxima, return_periods, n_boot=_N_BOOT)
```

If $p < 0.05$, report the return level effective at the latest year ("today's 100-year event"). If $p \ge 0.05$, keep the stationary baseline and state the p-value. Either way, the report records the slope and the exact p-value so the reader can verify the test ran.

## What it said about two cities

Berlin: +0.76 °C per decade, p < 0.0001. Unambiguous. The report switches to effective-at-2022 return levels and states the trend in the summary.

Delhi: p = 0.56. Not significant, by the same test, on the same kind of data, at the same significance threshold. The report keeps the stationary fit and says the climate signal there wasn't statistically distinguishable from noise over the observed record.

That split isn't an assumption I hardcoded. It's the same likelihood-ratio test applied identically to two different daily temperature series, landing on two different answers because the underlying data actually differ. And it happens to match a real result in the published climate literature: European heat trends show up cleanly in station records, while South Asian heat trends are partly masked by regional aerosol pollution, a well-documented effect that dampens the warming signal a naive trend line would otherwise show. My test didn't know that literature existed. It just measured the two series and got the same shape of answer anyway.

## The part that made me actually trust it

A system built around never overclaiming has an obligation to apply that same discipline to the warming signal itself, not just to citations and hazard numbers. It would have been easy to report a trend everywhere, decorated with the same "effective return level" language for both cities, and nobody reading the UI would have questioned it. Instead the system looked at Delhi's data and said, honestly, I can't tell you this is warming faster than chance, here's the stationary number instead.

That's a harder sentence to write into a product than "everything is getting worse everywhere." It's also the more scientifically defensible one, and it's the sentence the data actually supported.

## The unglamorous part: warm-starting a bootstrap

The trend fit needs its own confidence intervals, via parametric bootstrap, same technique as the stationary return levels from an earlier post. Refitting a 4-parameter non-stationary model (`c`, `mu0`, `slope`, `log_sigma`) 300 times from a cold start took 16.0 seconds per request:

```python
# Warm-starting Nelder-Mead bootstrap refits from parent MLE parameters (tools/gev_trend.py)
parent = [fit.c, fit.mu0, fit.slope, np.log(fit.sigma)]
for _ in range(n_boot):
    sample = genextreme.rvs(
        fit.c,
        loc=fit.mu0 + fit.slope * xc,
        scale=fit.sigma,
        size=x_grid.size,
        random_state=rng,
    )
    (bc, bmu0, bslope, blog_sigma), _ = _mle(sample, xc, parent)
    bloc = bmu0 + bslope * at_c
    for t, q in quantiles.items():
        boot[t].append(
            float(genextreme.ppf(q, bc, loc=bloc, scale=float(np.exp(blog_sigma))))
        )
```

Warm-starting each bootstrap refit at the parent fit's MLE parameters brought 300 iterations down to 10.5 seconds. Production defaults to 200 iterations (`_TREND_N_BOOT = 200`). That 10-line optimization turned an interactive latency blocker into a sub-second component.

## What to steal from this build

1. **Gate derived signals behind formal tests**: If your system reports a trend, test whether it earns its degrees of freedom before surfacing it.
2. **Follow established domain conventions**: When a trend is real, use established standards (like Katz et al. 2002 effective return levels) rather than inventing ad-hoc metrics.
3. **Warm-start iterative numerical loops**: In bootstrap or MCMC refits, starting from the parent MLE parameters often eliminates the bottleneck without needing complex parallelization.

Repo and the trend-fitting code are public: github.com/AswaniSahoo/climate-risk-agent

Next: I write 105 new benchmark questions specifically so they can't be tuned to, and two of my own subagents burn a quarter-million tokens each trying to avoid actually writing them.

*Part of the series "Building an evaluated climate-risk agent in public."*
