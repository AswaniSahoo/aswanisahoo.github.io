/**
 * "What is different" panels on the flagship reports: a generic pipeline against this agent.
 * Wording comes only from the report page or the project README.
 */
export type Tone = 'ok' | 'warn' | 'accent' | 'muted';

export interface FlowStep {
  t: string;
  s?: string;
  /** Differs from the generic pipeline: drawn in the accent colour. */
  differs?: boolean;
}

export interface FlowOutcome {
  t: string;
  s?: string;
  tone: Tone;
  /** Packet colour, when it should differ from the box. */
  packet?: Tone;
  /** Index of the step it branches from; defaults to the last step. */
  from?: number;
}

export interface Comparison {
  generic: { steps: FlowStep[]; outcome: FlowOutcome };
  agent: { steps: FlowStep[]; outcomes: FlowOutcome[] };
  caption: string;
  /** Read aloud in place of the drawing. */
  description: string;
}

export const comparisons: Record<string, Comparison> = {
  'climate-risk-agent': {
    generic: {
      steps: [{ t: 'question' }, { t: 'retrieve context' }, { t: 'LLM writes' }],
      outcome: { t: 'answers anyway', tone: 'muted' },
    },
    agent: {
      steps: [
        { t: 'question', s: 'free text' },
        { t: 'scope check', s: 'refuses at step one', differs: true },
        { t: 'forecast + AR6', s: 'forecast, IPCC AR6 search' },
        { t: 'citation check', s: 'against the source page', differs: true },
        { t: 'typed report', s: 'skill-weighted confidence', differs: true },
      ],
      outcomes: [
        { t: 'refused', tone: 'accent', from: 1 },
        { t: 'cited typed report', tone: 'ok', packet: 'accent' },
      ],
    },
    caption: 'Red marks what differs. Release gate: any false answer fails the build.',
    description:
      'A generic pipeline goes from question to retrieved context to an LLM that answers anyway. The Climate-Risk Agent checks scope first and can refuse at that step; otherwise it fetches the forecast and searches IPCC AR6, checks every citation against the source page, and returns a typed report whose confidence is weighted by measured forecast skill.',
  },
  'incident-evidence-compiler': {
    generic: {
      steps: [{ t: 'incident' }, { t: 'LLM reads signals' }, { t: 'LLM names a cause' }],
      outcome: { t: 'answers anyway', tone: 'muted' },
    },
    agent: {
      steps: [
        { t: 'incident', s: 'Prometheus telemetry' },
        { t: 'evidence ledger', s: 'content-addressed', differs: true },
        { t: 'LLM proposes', s: 'allow-listed hypotheses', differs: true },
        { t: 'verifier decides', s: 'deterministic code', differs: true },
      ],
      outcomes: [
        { t: 'SUPPORTED', tone: 'ok' },
        { t: 'REFUTED', tone: 'warn' },
        { t: 'UNKNOWN', s: 'abstain', tone: 'accent' },
      ],
    },
    caption: 'Red marks what differs. Scored on a sealed held-out split, opened exactly once.',
    description:
      'A generic pipeline hands the incident to an LLM that names a cause and answers anyway. The Incident Evidence Compiler records evidence in a content-addressed ledger, lets the LLM propose only allow-listed hypotheses, and lets deterministic code decide: SUPPORTED, REFUTED, or UNKNOWN, in which case it abstains.',
  },
};
