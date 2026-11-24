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
    more: (n: number) => `+${n} more`,
  },
  readOnly: { kind: "read only" },
};
