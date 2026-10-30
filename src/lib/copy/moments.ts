import { numberWord } from "./number-words";

/**
 * The moments' words (discovery R1, plan `2026-10-16-moments.md`; handoff `discovery · copy strings.ts`, through
 * `/copy-review`). Each line is drawn from its tool's own About entry or shipped strings, so it promises nothing the
 * tool does not do. `tool` renders in `--fg` semibold and `line` follows it in `--fg-body`, as one sentence.
 *
 * Copy-review, 2026-10-16 (close-out): M7, M11 and M12 cut to fit the bubble's three lines at desktop's 300px, where
 * each clipped mid-word. M7 leads with the marker's own word, which is `short` (audit resolution 1: the marker never
 * reads `none free`); M13 gains its missing `was`; M15 drops `is new:`, which would go stale on the first day.
 */
export type MomentCopy = { tool: string; line: string };

export const momentsCopy = {
  dismiss: "Dismiss",
  /** The bubble's accessible name. */
  noteName: (tool: string) => `${tool}, a tip`,

  topOff: (open: number): MomentCopy => ({
    tool: "Top off",
    line: `ranks your own cards for the last ${open} slots. Nothing is added until you say so.`,
  }),
  suggestedChanges: {
    tool: "Suggested changes",
    line: "is in Analysis now the deck is full. It reads your games and notes and offers up to five swaps.",
  },
  proposedCuts: (over: number): MomentCopy => ({
    tool: "Proposed cuts",
    line: `counts where this deck runs long, free. A deeper look can name the ${numberWord(over)}.`,
  }),
  manaBalance: {
    tool: "Mana Balance",
    line: "counts every source of each color against what your spells ask for. Free.",
  },
  standIns: (limit: string): MomentCopy => ({
    tool: "Cheaper stand-ins",
    line: `for a card over your ${limit} limit. Press ⇄ to see what does the same job for less.`,
  }),
  friendSpares: { tool: "A friend has a spare", line: "of this card. Press to see who, before you buy." },
  cardAssignments: {
    tool: "Short",
    line: "means another deck holds a copy this one needs. You pick which keeps it when you commit.",
  },
  findADeck: {
    tool: "Find a deck",
    line: "reads your decks for the one this card fits best. You own it and no deck uses it yet.",
  },
  wishlist: { tool: "Wishlist", line: "keeps cards you want outside any deck. A card leaves the list once you own it." },
  matchups: {
    tool: "Matchups",
    line: "splits your games by the commander, colors or friend across the table. Counts, never a rate.",
  },
  friendsAfterGame: {
    tool: "Playing with friends?",
    line: "Add them under Friends in your account menu, then seat them when you log a game.",
  },
  // M11 once Friends is in the bar (the Commanders place, always on): the bubble sits on the slot itself, so it names no menu.
  friendsAfterGameBar: {
    tool: "Playing with friends?",
    line: "Add them here, then seat them when you log a game.",
  },
  helpMeChoose: {
    tool: "Not sure where to start?",
    line: "Help me choose ranks any commander by what you want.",
  },
  lineup: {
    tool: "Stats",
    line: "puts every deck side by side: when each was last played, its bracket and colors, and the cards they share.",
  },
  precons: { tool: "Own a precon?", line: "Start from it. Every precon shows how many of its cards you already own." },
  collectionSync: {
    tool: "Sync",
    line: "merges this file with what you changed here, card by card, and asks only where both moved.",
  },
} as const;
