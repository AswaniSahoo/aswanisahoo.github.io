export const profile = {
  name: 'Aswani Kumar Sahoo',
  handle: 'AswaniSahoo',
  // The host the site is served from, read from `site` in astro.config.mjs, so the wordmark and
  // the chart's corner always name an address that opens this site. It becomes aswanisahoo.bio
  // by itself once the custom domain is pointed (README, Deploy).
  domain: new URL(import.meta.env.SITE).host,
  title: 'ML / AI systems engineer',
  // The status tab on the hero card. Keep it short and true; update it when it changes.
  // The school goes here too: the first screen should say where the degree is from.
  availability: 'Open to AI / ML engineer internships · NIT Rourkela ’27',
  // Served from public/. The résumé buttons appear only once this file exists (src/lib/resume.ts).
  resume: '/aswani-kumar-sahoo-resume.pdf',
  // The hero's one-line pitch under the name, also the start of every page's meta description.
  // Plain words first: a first-time reader should know what this person does from it alone.
  tagline: 'ML engineer. I contribute to open-source weather models and build AI agents that say “I don’t know” instead of guessing.',
  location: 'Rourkela, Odisha, India',
  email: 'aswanisahoo227@gmail.com',
  links: {
    github: 'https://github.com/AswaniSahoo',
    linkedin: 'https://linkedin.com/in/aswani-sahoo/',
    x: 'https://x.com/AswaniSahoo2',
    blog: 'https://aswanisahoo.hashnode.dev',
  },
  origin: {
    hometown: 'Baliapal, Balasore district, Odisha',
    coast: 'Bay of Bengal',
    // Aswani's own call (2026-09-03): the coast-to-weather link is "partly" true.
    // So the page states both facts side by side and claims no motive.
    line: 'I grew up on the Bay of Bengal coast. My first upstream code went into a weather model.',
  },
  education: {
    degree: 'B.Tech, Ceramic Engineering',
    school: 'National Institute of Technology Rourkela',
    years: '2023 to 2027',
    cgpa: '8.02',
    note: 'Final year. Machine learning is self-taught, credentialed by upstream merges rather than a degree.',
  },
  /** Tools with the repo that proves each one. Used in About. */
  stack: [
    { tool: 'Python', proof: 'everywhere' },
    { tool: 'PyTorch', proof: 'weather-transformer-scratch, graph_weather' },
    { tool: 'LangGraph', proof: 'Climate-Risk Agent' },
    { tool: 'FastAPI', proof: 'Incident Evidence Compiler, Climate-Risk Agent' },
    { tool: 'PostgreSQL', proof: 'Incident Evidence Compiler' },
    { tool: 'FAISS, BM25, rerankers', proof: 'complaint-intelligence-system' },
    { tool: 'xarray, zarr, H3', proof: 'graph_weather, weather-transformer-scratch' },
    { tool: 'PEFT / LoRA', proof: 'llama-task-agent' },
    { tool: 'Gemini on Vertex AI', proof: 'Climate-Risk Agent, Incident Evidence Compiler, vera-bot' },
    { tool: 'MCP', proof: 'Climate-Risk Agent: 2 servers, registry entry, public container' },
    { tool: 'Prometheus', proof: 'Incident Evidence Compiler: range-query ingestion and /metrics' },
    { tool: 'Docker, Cloud Run, GitHub Actions', proof: 'Climate-Risk Agent, vera-bot, Incident Evidence Compiler' },
    { tool: 'scipy, extreme-value statistics', proof: 'Climate-Risk Agent GEV hazard fits' },
    { tool: 'Kubernetes (learning)', proof: 'krkn-chaos contributions' },
  ],
  writing: [
    {
      title: '5 mistakes that cost me GSoC and LFX',
      url: 'https://aswanisahoo.hashnode.dev/5-mistakes-that-cost-me-gsoc-and-lfx',
      date: '2026-06-14',
      opening: 'It took me five rejections to understand this: I had the merged pull requests.',
      summary:
        'Ranked #1 for one GSoC project, #2 for another, interviewed, and still 0 for 5 across GSoC and LFX. The post is about the decisions made before any code was written.',
      verifiedAt: '2026-09-03',
    },
  ],
} as const;
