// Issue Inspector — copy strings (verbatim from the hi-fi mock)
// Voice: terse; mono for structured data (line/set/count); no reassurance fluff; no exclamation marks.
// Eng: move to your copy file (likely src/lib/copy/…). {n}/{total}/{file}/{query} are interpolation slots.

export const issueInspectorCopy = {
  header: {
    title: "Import issues",
    subtitle: "{file} · {skipped} of {total} rows skipped",   // e.g. "the-vault.csv · 29 of 2,933 rows skipped"
    help: "Skipped rows are left out of the import — every other row still replaces your collection.",
    closeAriaLabel: "Close",
  },

  tabs: {
    unmatched: "Unmatched",        // + count pill
    parseErrors: "Parse errors",   // + count pill
    ariaLabel: "Issue type",
  },

  filter: {
    placeholderUnmatched: "Filter {n} unmatched names…",
    placeholderErrors: "Filter {n} errors by line or reason…",
    clearAriaLabel: "Clear filter",
    count: "Showing {n} of {total}",           // n = rows passing filter, total = tab total
  },

  // Row sub-text templates. Desktop uses long form; mobile uses the compact form.
  unmatchedRow: {
    metaLong: "line {line} · set {setCode} · no Oracle match",
    metaCompact: "L{line} · {setCode} · no match",
    quantity: "×{quantity}",
  },
  parseErrorRow: {
    lineBadge: "L{line}",
    // reason comes straight from UploadPreview.parseErrors[].reason — render as-is, do not rephrase.
  },

  emptyFilter: {
    title: "No names match “{query}”",
    body: "None of the {total} unmatched names contain that text. Check the spelling, or clear the filter to see the full list.",
    action: "Clear filter",
  },

  // Empty-tab zero-state (tab stays visible + disabled; success-styled callout hoisted to top)
  zeroState: {
    noParseErrors: "No parse errors — every row parsed cleanly. The Parse errors tab is disabled.",
    noUnmatched: "No unmatched names — every card matched the Oracle database. The Unmatched tab is disabled.",
  },

  // Review-page entry point (single CTA, desktop + mobile)
  entry: {
    cta: "View all {total} issues →",
  },
};
