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

/** The Climate-Risk Agent report draws its own flow (CraFlow), so it has no panel here. */
export const comparisons: Record<string, Comparison> = {
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
