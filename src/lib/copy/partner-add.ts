/**
 * Add a partner to an existing deck (#491): the sheet's Add a partner section and its confirm. Vocabulary
 * follows Change commander ("commander", "pair", "command zone", "leads"); the card that leaves reuses
 * Suggested changes' Pick line, so its words are that row's. The undo toast's words live in
 * `changeCommanderCopy.partnerUndo`.
 */
import type { PartnerAbility } from "../decks/partner";

export const partnerAddCopy = {
  section: {
    title: (kind: PartnerAbility["kind"]): string =>
      kind === "doctorsCompanion" ? "Add a Doctor" : kind === "doctor" ? "Add a companion" : "Add a partner",
    replaceTitle: (short: string) => `Replace ${short}`,
    lede: (short: string) =>
      `${short} stays, and a second commander joins. One from outside the deck takes a slot, so you pick the card that leaves.`,
    // The ability's own rule, said once, where it narrows the list.
    rule: (ability: PartnerAbility): string => {
      switch (ability.kind) {
        case "with": return `Only ${ability.name}: the two name each other.`;
        case "friendsForever": return "Any other commander with Friends forever.";
        case "doctorsCompanion": return "Any Doctor: a legendary Time Lord Doctor with no other creature types.";
        case "doctor": return "Any commander with Doctor’s companion.";
        case "restricted": return `Any other commander with ${ability.label}.`;
        default: return "Any other commander with Partner.";
      }
    },
    inDeckMark: "in this deck · nothing leaves",
    widens: "widens to",
    chooseAria: (name: string) => `Choose ${name}`,
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
    opensLoading: "Looking through your cards.",
    opensNone: (colors: string) => `You own no ${colors} cards their decks run.`,
    cutHeading: "The card that leaves",
    cutNote: "suggested first",
    reasonLands: (lands: number) => `The deck runs ${lands} lands. With two commanders the usual count is ${lands - 1}.`,
    // Said only for a pair EDHREC holds a list for; any other pair reads the two commanders' own lists.
    reasonUnplayed: (pair: string) => `None of the ${pair} decks we read run it.`,
    reasonUnplayedEither: (commander: string, partner: string) =>
      `None of the ${commander} or ${partner} decks we read run it.`,
    reasonPicked: "Your pick.",
    another: "Cut another card",
    anotherPlaceholder: "Search the 99",
    anotherNone: (q: string) => `No card in the 99 matches “${q}”.`,
    lands: (cut: string, commander: string) =>
      `Lands in your pending changes, not yet a version. Discard puts ${cut} back, and ${commander} leads alone again.`,
    landsRoom: (partner: string, commander: string) =>
      `Lands in your pending changes, not yet a version. Discard takes ${partner} out, and ${commander} leads alone again.`,
    brew: "This deck has no version yet. The Undo that follows is the only way back, since a pair can’t go back to one commander.",
    announced: (partner: string, commander: string) => `${partner} joins ${commander}.`,
  },
} as const;
