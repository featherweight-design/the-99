// Issue Inspector copy — ported verbatim from
// design/design_handoff_the99_issue_inspector/Issue Inspector - copy strings.js
// Voice: terse; mono for structured data; no reassurance fluff; no exclamation marks.

export const issueInspectorCopy = {
  header: {
    title: "Import issues",
    subtitle: (file: string, skipped: number, total: number) =>
      `${file} · ${skipped.toLocaleString()} of ${total.toLocaleString()} rows skipped`,
    help: "Skipped rows are left out of the import — every other row still replaces your collection.",
    closeAriaLabel: "Close",
  },
  tabs: {
    unmatched: "Unmatched",
    parseErrors: "Parse errors",
    ariaLabel: "Issue type",
  },
  filter: {
    placeholderUnmatched: (n: number) => `Filter ${n.toLocaleString()} unmatched names…`,
    placeholderErrors: (n: number) => `Filter ${n.toLocaleString()} errors by line or reason…`,
    clearAriaLabel: "Clear filter",
    count: (n: number, total: number) =>
      `Showing ${n.toLocaleString()} of ${total.toLocaleString()}`,
  },
  unmatchedRow: {
    metaLong: (line: number, setCode: string) =>
      setCode
        ? `line ${line} · set ${setCode} · no Oracle match`
        : `line ${line} · no Oracle match`,
    metaCompact: (line: number, setCode: string) =>
      setCode ? `L${line} · ${setCode} · no match` : `L${line} · no match`,
    quantity: (quantity: number) => `×${quantity}`,
  },
  parseErrorRow: {
    lineBadge: (line: number) => `L${line}`,
    // reason comes straight from UploadPreview.parseErrors[].reason — render as-is, do not rephrase.
  },
  emptyFilter: {
    title: (query: string) => `No names match “${query}”`,
    body: (total: number) =>
      `None of the ${total.toLocaleString()} unmatched names contain that text. Check the spelling, or clear the filter to see the full list.`,
    action: "Clear filter",
  },
  emptyFilterErrors: {
    body: (total: number) =>
      `None of the ${total.toLocaleString()} errors match that text. Check the spelling, or clear the filter to see the full list.`,
  },
  zeroState: {
    noParseErrors:
      "No parse errors — every row parsed cleanly. The Parse errors tab is disabled.",
    noUnmatched:
      "No unmatched names — every card matched the Oracle database. The Unmatched tab is disabled.",
  },
  entry: {
    cta: (total: number) => `View all ${total.toLocaleString()} issues →`,
  },
};
