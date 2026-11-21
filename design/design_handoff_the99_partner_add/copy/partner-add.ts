/**
 * Add a partner to an existing deck (#491). Proposal copy, for `/copy-review` with the handoff.
 * Vocabulary follows Change commander: "commander", "pair", "command zone", "leads". The card that
 * leaves reuses Suggested changes' Pick line, so its words are that row's.
 */
export type PairKind = "partner" | "with" | "friends" | "background" | "companion" | "doctor";

export const partnerAddCopy = {
  door: {
    // The commander's card details on its own deck page: a box under the oracle text.
    heading: "Second commander",
    body: {
      partner: (short: string) => `${short} has Partner, so this deck can add a second commander.`,
      with: (short: string, other: string) => `${short} partners with ${other}, so this deck can add them.`,
      friends: (short: string) => `${short} has Friends forever, so this deck can add a second commander.`,
      background: (short: string) => `${short} can choose a Background as a second commander.`,
      companion: (short: string) => `${short} is a Doctor’s companion, so this deck can add a Doctor.`,
      doctor: (short: string) => `${short} is a Doctor, so this deck can add a companion.`,
    },
    cta: { partner: "Add a partner", with: "Add a partner", friends: "Add a partner", background: "Add a Background", companion: "Add a Doctor", doctor: "Add a companion" },
  },

  section: {
    title: { partner: "Add a partner", with: "Add a partner", friends: "Add a partner", background: "Add a Background", companion: "Add a Doctor", doctor: "Add a companion" },
    replaceTitle: (short: string) => `Replace ${short}`,
    lede: (short: string) =>
      `${short} stays, and a second commander joins. One from outside the deck takes a slot, so you pick the card that leaves.`,
    // The ability's own rule, said once, where it narrows the list.
    rule: {
      partner: "Any other commander with Partner.",
      with: (other: string) => `Only ${other}: the two name each other.`,
      friends: "Any other commander with Friends forever.",
      background: "Any Background. It leads beside the commander and isn’t a creature.",
      companion: "Any Doctor: a legendary Time Lord Doctor with no other creature types.",
      doctor: "Any commander with Doctor’s companion.",
    },
    inDeckMark: "in this deck · nothing leaves",
    widens: "widens to",
  },

  confirm: {
    stays: "stays",
    sentence: (partner: string, commander: string, cut: string) =>
      `${partner} joins ${commander} in the command zone. ${cut} leaves the deck, so it stays at 100.`,
    sentenceRoom: (partner: string, commander: string, after: number) =>
      `${partner} joins ${commander} in the command zone. The deck has room, so nothing leaves: ${after} of 100.`,
    // The identity block: only when the pair's colors are wider than the deck's.
    widens: (name: string) => `The deck becomes ${name}.`,
    opens: (n: number, colors: string) => `${n} of your ${colors} cards are in their decks`,
    opensAria: (n: number, colors: string) => `${n} of your ${colors} cards are in this pair’s decks. Show them.`,
    opensCaption: (colors: string) => `Your ${colors} cards their decks run`,
    cutHeading: "The card that leaves",
    cutNote: "suggested first",
    reasonLands: (lands: number) => `The deck runs ${lands} lands. With two commanders the usual count is ${lands - 1}.`,
    reasonUnplayed: (pair: string) => `None of the ${pair} decks we read run it.`,
    reasonRare: (pct: number, pair: string) => `In ${pct}% of ${pair} decks.`,
    another: "Cut another card",
    anotherPlaceholder: "Search the 99",
    anotherNone: (q: string) => `No card in the 99 matches “${q}”.`,
    lands: (cut: string, commander: string) =>
      `Lands in your pending changes, not yet a version. Discard puts ${cut} back, and ${commander} leads alone again.`,
    landsRoom: (partner: string, commander: string) =>
      `Lands in your pending changes, not yet a version. Discard takes ${partner} out, and ${commander} leads alone again.`,
    brew: "This deck has no version yet. The Undo that follows is the only way back, since a pair can’t go back to one commander.",
  },

  toast: {
    added: (partner: string, commander: string) => `${partner} joins ${commander}.`,
    cut: (cut: string) => `${cut} left the deck.`,
    undo: "Undo",
    undone: (commander: string) => `${commander} leads alone again.`,
  },
} as const;
