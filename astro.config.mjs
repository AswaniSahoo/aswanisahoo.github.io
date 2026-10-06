import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://aswanisahoo.github.io',
  output: 'static',
  // Directory output (the default) builds /work/index.html; Astro's docs pair it with 'always'
  // so dev matches GitHub Pages, which serves every sheet at a trailing-slash URL.
  trailingSlash: 'always',
  markdown: {
    // Code blocks take the site's own paper and lamp styling instead of a fixed dark theme.
    syntaxHighlight: false,
  },
});
