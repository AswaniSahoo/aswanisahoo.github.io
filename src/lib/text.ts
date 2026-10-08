/**
 * Splits text so that each hyphenated word can sit in a no-break span: a name such as
 * "malariagen-data-python" never breaks at its hyphens, while the spaces around it still wrap.
 */
export const hyphenSafe = (text: string): { text: string; keep: boolean }[] =>
  text
    .split(/(\S*-\S*)/)
    .filter(Boolean)
    .map((t) => ({ text: t, keep: t.includes('-') && !/\s/.test(t) }));
