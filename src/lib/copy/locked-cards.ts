/**
 * Locked (never cut), sub-project 5.1: every string the lock draws, transcribed from the handoff's
 * `never-cut · copy strings.ts`. This module grows with the feature. The mode, the row's
 * marks and the key line arrived with PR 4a.
 */
export const lockedCardsCopy = {
  /**
   * The Lock cards mode (PR 4a): the toolbar button, the line that stands in the key's place, and
   * the per-card toggle every row's ✕ becomes. No `buttonAria` (audit T6, overriding F11(c)): the
   * button's name is its visible label, `Lock cards` or `Done`, and carries no `aria-pressed`, so
   * entering and leaving the mode are said in the builder's live region instead.
   */
  mode: {
    button: "Lock cards",
    done: "Done",
    /** Stands in the key line's place while the mode is on, followed by `count`. */
    line: "Locked cards are never suggested as cuts.",
    /** Counts locked CARDS, one per oracle id (T3), never copies. */
    count: (n: number) => (n === 1 ? "1 locked" : `${n} locked`),
    /** The per-card toggle's name. `aria-pressed` carries the state; the label names the card. */
    toggleAria: (card: string) => `Lock ${card}`,
    announceLocked: (card: string) => `${card} is locked.`,
    announceUnlocked: (card: string) => `${card} is unlocked. Suggestions can offer to cut it again.`,
    /**
     * T6: entering and leaving the mode, in the builder's live region. Not in the handoff's copy
     * file (T6 postdates it), so new copy, for /copy-review.
     */
    announceEnter: "Lock cards is on. Each remove button is now a lock.",
    announceLeave: "Lock cards is off. The remove buttons are back.",
    /**
     * Any refusal of a lock toggle: a bad id, a card no longer in the deck, the switch off. The
     * house apostrophe (audit F11(b)), not the handoff's straight one.
     */
    refused: "That didn\u2019t save. Try again.",
  },
  /** The review screen's Pull it guard (L2), in the commander guard's shape. */
  pull: {
    /** The tag beside the holding deck's name, which the row already prints. */
    tag: "locked",
    /** Never rendered: the row's accessible description, as `commanderGuardA11y` is. */
    a11y: (deck: string, card: string) => `${card} is locked in ${deck}, so it cannot be pulled.`,
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
    /** Rides the row's trigger `aria-describedby`, after the availability word. */
    a11y: "Locked. Suggestions will not offer to cut it.",
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
