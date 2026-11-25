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
  editor: {
    now: "Now",
    new: "New",
    cancel: "Cancel",
    add: "Add to edits",
    update: "Update edit",
    remove: "Remove edit",
    close: "Close",
    words: (n: number, cap: number | undefined) => (cap === undefined ? `${n} ${n === 1 ? "word" : "words"}` : `${n} of ${cap} words`),
    preview: (text: string) => `Preview: ${text}`,
    fill: (name: string) => `{${name}} is filled in by the app. Drag it to move it; it can’t be deleted.`,
    whichKey: "These words are used in two places. Which one is this?",
    /** The kind line under the key: the name of the leaf, its word cap when it has one, or how many variations. */
    kind: (leaf: string, cap: number | undefined) => (cap === undefined ? leaf : `${leaf} · up to ${cap} words`),
    variations: (n: number) => `${n} variations`,
    /** A variation's label from its condition; `otherwise` stands for any negation. */
    when: (cond: string) => `When ${cond}`,
    otherwise: "Otherwise",
    variationN: (n: number) => `Variation ${n}`,
    nowIs: (text: string) => `now “${text}”`,
    fieldLabel: "New wording",
  },
  readOnly: {
    kind: "read only",
    copyKey: "Copy key",
    copied: "Copied",
  },
};
