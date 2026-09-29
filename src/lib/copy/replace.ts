// Replace-flow copy: the calm replace confirm, the replace note on the upload entry and the
// review's phone exit (first-run redesign, D9 to D11). Keys follow the handoff's
// `first-run-onboarding · copy strings.ts`; the words are the ones /copy-review settled, which
// differ from the handoff's placeholders where a pasted list is not a "file" and a collection is
// not "rebuilt". Callers hand over RAW COUNTS and this module formats them, as collection.ts does,
// so no sentence can say "1 cards" and no figure picks up a browser's separators.

const count = (n: number) => n.toLocaleString("en-US");
const cards = (n: number) => (n === 1 ? "1 card" : `${count(n)} cards`);

export const replaceCopy = {
  /** `/collection/replace`'s title. With nothing to replace, the page is how a collection starts. */
  pageTitle: (current: number) => (current === 0 ? "Add your collection" : "Replace collection"),

  review: {
    /** The phone exit (D11), left of Continue; it does what the retired ‹ did. */
    cancel: "Cancel",
  },

  /** The replace confirm (D9). No typed token, and nothing here says it cannot be undone. */
  confirm: {
    title: "Replace your collection?",
    now: "Now",
    after: "After",
    figure: (n: number) => count(n),
    nowCaption: (n: number) => (n === 1 ? "card in your collection" : "cards in your collection"),
    afterCaption: (n: number, file: string) => `${n === 1 ? "card" : "cards"} from ${file}`,
    /** The phone's pair is narrower and draws the captions short (4b). */
    nowCaptionShort: (n: number) => (n === 1 ? "card" : "cards"),
    afterCaptionShort: (file: string) => `from ${file}`,
    body: "Your deck lists stay as they are; recommendations and availability update from the new collection. To go back, replace it again with your previous list.",
    bodyShort: "Deck lists stay as they are. To go back, replace it again with your previous list.",
    keep: "Keep current",
    /** N is what the player GETS, the matched count; the old button counted what they lost. */
    replace: (matched: number) => `Replace with ${cards(matched)}`,
    replacing: "Replacing…",
  },

  /**
   * The same dialog when a FIRST import failed and is retried from it (#1097): the only road to
   * it with nothing to replace. Its words are the ones that variant already said.
   */
  importConfirm: {
    title: "Import this collection?",
    keep: "Go back",
    confirm: (matched: number) => `Import ${cards(matched)}`,
    importing: "Importing…",
  },

  /** The upload entry's note (D10), drawn only over a collection that exists. */
  note: {
    before: "A new list replaces your current ",
    count: (current: number) => cards(current),
    after: "; nothing is merged. You’ll see every match before anything changes.",
  },
} as const;
