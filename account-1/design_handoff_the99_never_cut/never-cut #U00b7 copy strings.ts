// Production strings for locked cards (R2, LGTM 2026-09-24). Ships as src/lib/copy/locked-cards.ts.
// Adds only. The engineering name stays `neverCut` (column, rule key); the word the player
// reads is "locked".
//
// THE RULE. The lock is the player's, and nothing here may read as the app's opinion of a
// card. No "important", no "core", no "key card", and no copy that suggests locking.
// No em dash anywhere (house rule). For /copy-review.
//
// R1's `control.*` (card-modal switch), `standIns.none`, `tuning.manifest*`, `tuning.readLine`
// and `tuning.dropped*` are WITHDRAWN: the modal gains nothing and Suggested changes treats
// locks implicitly.

export const lockedCardsCopy = {
  // ── The mark at rest (row beside ✕, tile meta line, climb sheet) ──────
  mark: {
    // The mark key under the toolbar. Rendered only when the view holds a locked card.
    key: "locked",
    // Pointer title on the at-rest mark.
    title: "Locked",
    // Rides the row / tile trigger's aria-describedby, after the availability word.
    a11y: "Locked. Suggestions will not offer to cut it.",
  },

  // ── Desktop row hover shortcut (pointer only; tabIndex -1, aria-hidden) ─
  row: {
    titleOff: "Lock",
    titleOn: "Locked · press to unlock",
  },

  // ── Lock cards mode (toolbar, both views, both widths) ────────────────
  mode: {
    button: "Lock cards",
    done: "Done",
    buttonAria: "Lock cards: swap each remove button for a lock",
    line: "Locked cards are never suggested as cuts.",
    count: (n: number) => (n === 1 ? "1 locked" : `${n} locked`),
    // The per-card toggle. aria-pressed carries the state; the label names the card.
    toggleAria: (card: string) => `Lock ${card}`,
    announceLocked: (card: string) => `${card} is locked.`,
    announceUnlocked: (card: string) => `${card} is unlocked. Suggestions can offer to cut it again.`,
    refused: "That didn't save. Try again.",
  },

  // ── Suggested changes (additions to deckTuningCopy) ───────────────────
  tuning: {
    // The no-longer-applies row, third reason beside cutGone / addAlreadyIn.
    cutLocked: (card: string) => `You locked ${card}.`,
    // Ready, when every card but the commander is locked. Primary disabled; no credit used.
    allLocked: (commander: string) =>
      `Every card but ${commander} is locked, so there is nothing we could suggest cutting. Unlock a card and suggestions can run again.`,
    allLockedNote: "No credit is used.",
    // Prompt: the decklist tag, and the system line it extends.
    promptTag: "locked",
    promptRule:
      "Never suggest cutting a card marked as a commander or as locked. The player chose to keep it.",
    // The validator rule, in the suggestionRules voice. Its drops are NOT counted in the lead.
    rule: "The cut is not a card the player locked.",
  },

  // ── The climb's "What would have to go" sheet ─────────────────────────
  climb: {
    listedLast: (cards: string[]) =>
      cards.length === 1
        ? `You locked ${cards[0]}, so it is listed last. It still counts.`
        : `You locked ${cards.length} of these, so they are listed last. They still count.`,
    unreachable: (n: number, total: number, bracket: string) =>
      `${n === total ? `All ${total}` : `${n} of these`} are locked. ${bracket} can’t be reached while they are.`,
  },
} as const;
