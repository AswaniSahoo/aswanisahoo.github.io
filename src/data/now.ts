/**
 * The Now block on the home page, edited by hand.
 * Every line was checked at its source on `checkedAt`; change the date only after checking again.
 * A row is a sentence made of plain text and links, in reading order.
 */
export type NowPart = string | { label: string; url: string };

export interface NowLine {
  label: string;
  rows: NowPart[][];
}

const pr = (repo: string, n: number) => `https://github.com/${repo}/pull/${n}`;

export const now: { checkedAt: string; lines: NowLine[] } = {
  // gh pr view on 2026-09-30: #481 merged 2026-09-29T08:26:47Z; #256 open with zero reviews;
  // #389 and #1310 open. gh release view: v1.0.0 published 2026-09-08.
  checkedAt: '2026-09-30',
  lines: [
    {
      label: 'Open source',
      rows: [
        ['Merged 2026-09-29: ', { label: 'krkn-ai #481', url: pr('krkn-chaos/krkn-ai', 481) }, '.'],
        [
          'Open, newest first: ',
          { label: 'solar-consumer #256', url: pr('openclimatefix/solar-consumer', 256) },
          ' (awaiting first review), ',
          { label: 'krkn-ai #389', url: pr('krkn-chaos/krkn-ai', 389) },
          ', ',
          { label: 'malariagen-data-python #1310', url: pr('malariagen/malariagen-data-python', 1310) },
          '.',
        ],
      ],
    },
    {
      label: 'Shipped',
      rows: [
        [
          { label: 'Climate-Risk Agent v1.0.0', url: 'https://github.com/AswaniSahoo/climate-risk-agent/releases/tag/v1.0.0' },
          ', released 2026-09-08.',
        ],
      ],
    },
  ],
};
