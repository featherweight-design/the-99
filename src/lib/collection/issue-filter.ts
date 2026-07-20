// Pure client-side filter + highlight helpers for the Issue Inspector modal.
// No React, no DOM — kept testable under vitest's node environment.

export type UnmatchedRow = {
  name: string;
  setCode: string;
  line: number;
  quantity: number;
};

export type ParseErrorRow = { line: number; reason: string };

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function filterUnmatched(
  rows: readonly UnmatchedRow[],
  query: string,
): UnmatchedRow[] {
  const q = normalizedQuery(query);
  if (q === "") return [...rows];
  return rows.filter((r) => r.name.toLowerCase().includes(q));
}

export function filterParseErrors(
  rows: readonly ParseErrorRow[],
  query: string,
): ParseErrorRow[] {
  const q = normalizedQuery(query);
  if (q === "") return [...rows];
  return rows.filter(
    (r) =>
      r.reason.toLowerCase().includes(q) || String(r.line).includes(q),
  );
}

// Returns sorted, non-overlapping [start, end] ranges over `text` for every
// case-insensitive occurrence of `query`. Empty/whitespace query → [].
// Overlapping potential matches (e.g. "aa" in "aaaa") advance past each
// match so ranges never overlap.
export function findMatchRanges(
  text: string,
  query: string,
): [number, number][] {
  const q = query.trim();
  if (q === "") return [];
  const re = new RegExp(escapeRegex(q), "gi");
  const ranges: [number, number][] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    ranges.push([start, end]);
    if (match[0].length === 0) re.lastIndex++;
    else re.lastIndex = end;
  }
  return ranges;
}
