// The on-page copy editor's own words (admin only, staging only). The handoff's `copy strings.ts` verbatim for the
// strings it drew; the load and refusal lines it did not draw follow the Failed banner's voice.

export const copyEditorCopy = {
  door: "Edit copy",
  bar: {
    title: "Editing copy",
    env: "staging",
    hintDesktop: "Click any text",
    hintPhone: "Tap any text",
    done: "Done",
    /** The rows are fetching when the mode turns on. */
    loading: "Loading the copy",
    /** The rows did not load; the bar offers `retry`. */
    loadFailed: "The copy did not load.",
    notBuilt: "This deploy has no copy rows yet.",
    retry: "Try again",
    region: "Copy editor",
    shortcuts: "Alt+ArrowDown Alt+ArrowUp",
  },
  tag: {
    desktop: "Click to edit",
    phone: "Tap again to edit",
    /** More than one key has these words: the editor asks which. */
    more: (moreCount: number) => `+${moreCount} more`,
  },
  editor: {
    now: "Now",
    new: "New",
    cancel: "Cancel",
    add: "Add to edits",
    update: "Update edit",
    remove: "Remove edit",
    close: "Close",
    words: (wordCount: number, cap: number | undefined) => (cap === undefined ? `${wordCount} ${wordCount === 1 ? "word" : "words"}` : `${wordCount} of ${cap} words`),
    preview: (text: string) => `Preview: ${text}`,
    /** One note per fill-in in the field: what it reads on this page when the editor can tell, and how to move or remove it. */
    fill: (name: string, value: string | undefined) =>
      value === undefined ? `{${name}} is filled in by the app. Drag it to move it, or select ✕ to take it out.` : `{${name}} reads “${value}” here. Drag it to move it, or select ✕ to take it out.`,
    /** The chip's ✕, read by a screen reader. */
    removeFill: (name: string) => `Remove ${name}`,
    /** The label over the fill-ins a line supplies and its text no longer uses. */
    insert: "Insert at cursor",
    /** An insert button, read by a screen reader. */
    insertLabel: (name: string) => `Insert ${name} at the cursor`,
    /** Announced (polite) when a fill-in leaves or enters the field. */
    removed: (name: string) => `${name} removed`,
    inserted: (name: string) => `${name} inserted`,
    whichKey: "These words are used in two places. Which one is this?",
    /** The kind line under the key: the name of the leaf, its word cap when it has one, or how many variations. */
    kind: (leaf: string, cap: number | undefined) => (cap === undefined ? leaf : `${leaf} · up to ${cap} words`),
    variations: (variationCount: number) => `${variationCount} variations`,
    /** A variation's label from its condition; `otherwise` stands for any negation. */
    when: (cond: string) => `When ${cond}`,
    otherwise: "Otherwise",
    variationN: (variationNumber: number) => `Variation ${variationNumber}`,
    nowIs: (text: string) => `now “${text}”`,
    fieldLabel: "New wording",
  },
  readOnly: {
    kind: "read only",
    copyKey: "Copy key",
    copied: "Copied",
  },
  /** The count that opens the tray, and the bar's line once a pull request is on its way. */
  barTray: {
    edits: (editCount: number) => `${editCount} ${editCount === 1 ? "edit" : "edits"} ›`,
    sent: "Submitted, PR on its way",
    open: (prNumber: number) => `PR #${prNumber} open`,
  },
  tray: {
    region: "Copy edits",
    title: (editCount: number) => `Copy edits · ${editCount}`,
    sub: "One pull request for all of them. Staging doesn’t change until it merges.",
    empty: "No edits yet. Click any text to change it.",
    edit: "Edit",
    remove: "Remove",
    clear: "Clear all",
    submit: "Open pull request",
    submitting: "Opening pull request…",
    working: "Checking the rules, then pushing a branch",
    close: "Close",
    doneTitle: "Submitted",
    opened: (prNumber: number) => `Pull request #${prNumber} opened`,
    openedBody: (editCount: number, branch: string) => `${editCount} ${editCount === 1 ? "edit" : "edits"} on ${branch}. Staging shows the new wording once it merges; until then this page keeps today’s text.`,
    onItsWay: "Pull request on its way",
    onItsWayBody: (editCount: number, branch: string) => `${editCount} ${editCount === 1 ? "edit" : "edits"} on ${branch}. The pull request appears here when it opens.`,
    noPr: "No pull request yet. Check the Copy edit run on GitHub.",
    github: "Open on GitHub ↗",
    run: "Open the run ↗",
    done: "Done",
    retry: "Try again",
    /** The banner: no pull request, and the edits are kept. */
    failed: {
      stale: (editCount: number) => (editCount === 1 ? "No pull request opened. One edit is out of date; your edits are kept." : `No pull request opened. ${editCount} edits are out of date; your edits are kept.`),
      rule: "No pull request opened. The copy rules refused an edit; your edits are kept.",
      /** The server refused the submission itself; `reason` is its own phrase ("an edit cannot leave a line empty"), empty when it sent none. */
      invalid: (reason: string) => (reason ? `No pull request opened. The server refused the edits: ${reason}. Your edits are kept.` : "No pull request opened. The server refused the edits; your edits are kept."),
      limit: "No pull request opened. One a minute; wait a moment and try again. Your edits are kept.",
      unavailable: "No pull request opened. GitHub or the server did not take it; your edits are kept.",
      network: "No pull request opened. The request did not get through; your edits are kept.",
      run: "The edits weren’t sent: the pull request run failed. Your edits are kept.",
    },
    stale: "This line changed on main after your edit. Remove the edit and make it again once staging updates.",
    unknown: "This key is not in the copy any more. Remove it.",
    rule: "The copy rules refused this one. Edit it.",
  },
};
