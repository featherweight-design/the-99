/**
 * Locked (never cut), sub-project 5.1: every string the lock draws, transcribed from the handoff's
 * `never-cut · copy strings.ts`. This module grows with the feature. PR 1 ships the one string its
 * action returns; the mode, the marks and the tuning lines land with the PRs that draw them.
 */
export const lockedCardsCopy = {
  mode: {
    /** Any refusal of a lock toggle: a bad id, a card no longer in the deck, the switch off. */
    refused: "That didn't save. Try again.",
  },
  tuning: {
    /** The no-longer-applies row's third reason, beside `cutGone` and `addAlreadyIn`. */
    cutLocked: (card: string) => `You locked ${card}.`,
    /** Ready, when every card but the commander is locked: primary disabled, no credit used. */
    allLocked: (commander: string) =>
      `Every card but ${commander} is locked, so there is nothing we could suggest cutting. Unlock a card and suggestions can run again.`,
    allLockedNote: "No credit is used.",
    /** F10: a run whose every suggestion cut a locked card. New copy, for /copy-review. */
    lockedOnlyBody: "Every swap it found would have cut a card you locked, so none could be shown.",
    /** Its note, in place of `ungrounded`'s "log another game" (Hugh, 2026-09-25). */
    lockedOnlyNote: "Unlock a card to let it be suggested.",
    /** The decklist tag the prompt puts on a locked card, and the system line it extends. */
    promptTag: "locked",
    promptRule: "Never suggest cutting a card marked as a commander or as locked. The player chose to keep it.",
  },
  mark: {
    /** The word beside the mark on a desktop climb candidate (the phone draws the mark alone). */
    key: "locked",
    /** Pointer title on the at-rest mark. */
    title: "Locked",
  },
  /** The climb's *What would have to go* sheet: a locked candidate is listed last and still counts. */
  climb: {
    listedLast: (cards: string[]) =>
      cards.length === 1
        ? `You locked ${cards[0]}, so it is listed last. It still counts.`
        : `You locked ${cards.length} of these, so they are listed last. They still count.`,
    /**
     * The handoff's F11(a) grammar fixed (orchestrator, 2026-09-25): a single lock reads "is" and
     * "it", and an item of one is "It", never "All 1".
     */
    unreachable: (n: number, total: number, bracket: string) => {
      const lead = n === total ? (total === 1 ? "It is locked." : `All ${total} are locked.`) : n === 1 ? "1 of these is locked." : `${n} of these are locked.`;
      return `${lead} ${bracket} can\u2019t be reached while ${n === 1 ? "it is" : "they are"}.`;
    },
  },
} as const;
