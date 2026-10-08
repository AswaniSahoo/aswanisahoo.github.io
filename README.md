# aswanisahoo.bio

Personal site of Aswani Kumar Sahoo. Static, built with [Astro](https://astro.build), no client-side framework.

The one rule of this site: every number links to its evidence, an eval report, a CI run, or the pull request itself. If a figure cannot be sourced, it does not go on the page. `MetricTile` stops the build when a metric has no source.

## Structure

Five pages, listed in `src/data/sheets.ts`. The weather chart is the visual theme only; every label on the page is plain.

| Page | Path | Holds |
|---|---|---|
| Home | `/` | name, one-line pitch and three results over the live chart, the four flagship projects, the open-source record, latest writing, contact |
| Projects | `/work/`, `/work/<slug>/` | the four flagships (`featured` in `src/data/work.ts`), every other project in a list, one case study per project (`src/data/cases.ts`) |
| Open source | `/open-source/` | merged PRs by project, the graph_weather story, every PR listed |
| Writing | `/writing/`, `/writing/<slug>/` | posts from `src/content/writing/`, RSS at `/rss.xml` |
| About | `/about/` | education, experience, how I work, results that went against me, certifications, stack, contact |

```
src/
  pages/       index, work/, open-source/, writing/, about/, rss.xml.ts, sitemap.xml.ts, 404
  layouts/     Base.astro: head, theme, view transitions (ClientRouter), reveal and scroll-progress scripts
               BaseLayout.astro: Base plus header, footer strip, per-page meta
  components/  one component per section; Receipt and MetricTile render evidence links,
               Compare draws the comparison panel, CraFlow the climate agent's flow
  content/     writing/*.md, one file per post (schema in src/content.config.ts)
  data/        audited content: profile, projects, cases, compare, negative results, certifications,
               prs.json, upstream.ts (the frozen upstream headline),
               sheets.ts (the five pages), work.ts (the four flagships), types.ts
  lib/         synoptic.ts (hero canvas), isobars.ts (static strip), resume.ts (résumé check),
               evidence.ts (receipt labels), writing.ts (post helpers)
  styles/      global.css: tokens (colours, the type scale), both themes, motion rules
scripts/
  refresh-prs.mjs   regenerates src/data/prs.json from the GitHub API via gh
  check-links.mjs   checks every internal link and #fragment in dist/
  screenshots.mjs   full-page screenshots in both themes at 1440 and 390 (headless Chrome, no dependencies)
  make-preview.mjs  builds a single-file preview from dist/
  og-image.mjs      renders public/og.jpg, the link preview card, from the built home page
public/
  CNAME        custom domain for GitHub Pages (see Deploy before the first deploy)
  og.jpg       link preview card (Open Graph and X large card), made by og-image.mjs
  robots.txt   points at the sitemap
  aswani-kumar-sahoo-resume.pdf   the résumé, once added (see Updating numbers and posts)
```

## Commands

Astro needs Node 22.12 or newer; it refuses to run on Node 20.

```
npm ci
npm run dev              # local dev server
npm run check            # astro check (types)
npm run build            # static build into dist/
npm run preview          # serve dist/
npm run check-links      # after a build: internal links and fragments
npm run screenshots -- <outDir> [paths]   # after a build; set CHROME_PATH if needed
npm run refresh-prs      # re-pull the PR ledger (needs `gh auth login`)
npm run og-image         # after a build: re-render public/og.jpg; set CHROME_PATH if needed
node scripts/make-preview.mjs             # single-file preview of dist/
```

In Git Bash on Windows, prefix `screenshots` with `MSYS_NO_PATHCONV=1` when passing paths such as `/work/`.

## Updating numbers and posts

- Pull requests: run `npm run refresh-prs`, then rebuild. The script counts a PR as merged when the API says so or when it carries a `Merged` label, because PyTorch, ExecuTorch and MalariaGEN merge through bots and report `mergedAt: null`.
- The upstream headline is frozen in `src/data/upstream.ts`. If a refreshed ledger disagrees with it, the build stops, so the headline changes on purpose, together with the wiki.
- Everything else lives in `src/data/*.ts`. Each metric has `value`, `verifiedAt` and `source`. Change the date only after checking the source again. Pages show the source as a receipt link, not the date.
- Résumé: put the PDF at `public/aswani-kumar-sahoo-resume.pdf` (the path is `resume` in `src/data/profile.ts`). The build checks for the file, so the résumé buttons on the hero and the contact band appear only once it is there, never as a broken link.
- The hero's status tab is `availability` in `src/data/profile.ts`. Update it when your plans change.
- The link preview card `public/og.jpg` shows the availability line, the name, the one-line pitch (`tagline`) and the projects with merged PRs, read from the built home page. It carries no counts, so a new merge does not make it stale. After changing the availability or the pitch, or when a new project appears in the ledger: build, run `npm run og-image`, build again, and commit the new image.
- The four flagship cards are `featured` in `src/data/work.ts`. Each card's figure is read from the project's data, so a number changes in one place.
- Posts: `date` is the original publish date. The optional `hashnode` field links the original and prints "First published on Hashnode"; leave it out when the Hashnode post no longer exists.

## Deploy

Deployed to https://aswanisahoo.github.io by `.github/workflows/deploy.yml` (GitHub Actions, official Astro action), on every push to `main`. The URLs that depend on the domain (listed below) point at the github.io origin for now. The domain shown on the page (header wordmark, chart corner, footer strip, `og:site_name`) is read from `site`, so it always names an address that opens this site.

The custom domain `aswanisahoo.bio` is a free Gravatar domain and still serves the Gravatar profile. Gravatar's documentation (support.gravatar.com/custom-domains, checked 2026-10-06) says DNS management is not available on free domains until they are renewed or were bought for more than a year upfront. The exact lock period is not stated there. Until DNS can be edited:

- `site` in `astro.config.mjs` is `https://aswanisahoo.github.io`;
- `public/CNAME` is absent;
- `public/robots.txt` and `scripts/check-links.mjs` use the github.io origin.

Once the domain can be pointed:

1. Restore `site: 'https://aswanisahoo.bio'`, add `public/CNAME` containing `aswanisahoo.bio`, and update `robots.txt` and `scripts/check-links.mjs`.
2. DNS at the registrar for `aswanisahoo.bio`:
   - A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - AAAA records: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - CNAME `www` pointing to `aswanisahoo.github.io`
3. Pages settings, custom domain `aswanisahoo.bio`, then enforce HTTPS once the certificate is issued.
