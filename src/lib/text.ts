/**
 * Splits text so that each hyphenated word can sit in a no-break span: a name such as
 * "malariagen-data-python" never breaks at its hyphens, while the spaces around it still wrap.
 */
export const hyphenSafe = (text: string): { text: string; keep: boolean }[] =>
  text
    .split(/(\S*-\S*)/)
    .filter(Boolean)
    .map((t) => ({ text: t, keep: t.includes('-') && !/\s/.test(t) }));

/** Splits text on backticks: the odd parts are code, set as <code> by the caller. */
export const codeSpans = (text: string): { text: string; code: boolean }[] =>
  text.split('`').map((t, i) => ({ text: t, code: i % 2 === 1 })).filter((t) => t.text);
