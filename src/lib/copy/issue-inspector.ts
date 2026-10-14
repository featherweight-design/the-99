// Issue Inspector copy — wording ported from
// design/design_handoff_the99_issue_inspector/Issue Inspector - copy strings.js
// Voice: terse; mono for structured data; no reassurance fluff; no exclamation marks.

export const issueInspectorCopy = {
  header: {
    title: "Import issues",
    subtitle: (file: string, skipped: number, total: number) =>
      `${file} · ${skipped.toLocaleString()} of ${total.toLocaleString()} rows skipped`,
    // Branched on initial-import vs replace to match the review-screen sticky
    // bar's copy branching (added in #48's confirm-modal work and extended in
    // this PR to the review-screen sticky bar). "Replaces your collection" is
    // wrong when there's no existing collection to replace.
    help: "Skipped rows are left out of the import. Every other row still replaces your collection.",
    helpInitial: "Skipped rows are left out of the import. Every other row still gets imported.",
    closeAriaLabel: "Close",
  },
  tabs: {
    unmatched: "Not in catalog",
    parseErrors: "Unreadable lines",
    ariaLabel: "Issue type",
  },
  filter: {
    placeholderUnmatched: (n: number) => `Filter ${n.toLocaleString()} names not in the card catalog…`,
    placeholderErrors: (n: number) => `Filter ${n.toLocaleString()} errors by line or reason…`,
    clearAriaLabel: "Clear filter",
    count: (n: number, total: number) =>
      `Showing ${n.toLocaleString()} of ${total.toLocaleString()}`,
  },
  unmatchedRow: {
    metaLong: (line: number, setCode: string) =>
      setCode
        ? `line ${line} · set ${setCode} · no match`
        : `line ${line} · no match`,
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
      `None of the ${total.toLocaleString()} names contain that text. Check the spelling.`,
    // The escape hatch these two used to spell out ("or clear the filter to see
    // the full list") is the button rendered directly beneath them.
    action: "Clear filter",
  },
  emptyFilterErrors: {
    body: (total: number) =>
      `None of the ${total.toLocaleString()} errors match that text. Check the spelling.`,
  },
  // The note sits directly above the tab strip, where the empty tab is already
  // visibly disabled and printing its 0. It states the good news once and does
  // not narrate the control underneath it.
  zeroState: {
    noParseErrors: "Every line was readable.",
    noUnmatched: "Every card found a match.",
  },
  // Richness pass §Non-safety-critical error moment — the copy gets to be funny
  // here because nothing was lost. Transcribed from Surfaces v2 §Collection.
  // Singular forms are derived, not mocked: a one-row import is reachable.
  entry: {
    heading: "That CSV put up a fight.",
    body: (total: number) =>
      `${total.toLocaleString("en-US")} row${total === 1 ? "" : "s"} couldn’t be read: quantity columns, mostly. Nothing fatal. Want to see the carnage?`,
    cta: (total: number) => `View ${total.toLocaleString("en-US")} issue${total === 1 ? "" : "s"}`,
  },
};
