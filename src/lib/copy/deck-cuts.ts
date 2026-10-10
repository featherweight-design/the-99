// Proposed cuts, the model tier's copy. ONE exported object so it can go to /copy-review as a block.
// Everything here is a PLACEHOLDER owed to /copy-review. US English, no em dashes.

export const deckCutsCopy = {
  /** The rules the model is told and the validator holds it to: one text, so the two cannot drift. */
  rules: {
    onlyListed: "Cut only cards in the list below, spelled as the list spells them.",
    noKeyCards: "Never cut a Key card.",
    citeFigures: "Every reason must cite a fact you were given. Add one cites entry for each fact the reason uses.",
    citeExact: "A cited figure must equal the figure given for that card or that deck. A figure that differs is discarded.",
    noBracketClaim: "No reason may name a bracket.",
    noResultClaim: "No reason may promise a result: not that a cut will win, lose, or make the deck stronger.",
    quotedNote: "A quoted part of the player's intent must be byte-identical to the intent as shown, in quotation marks.",
    noInvention: "Do not state what a card does. Use only the names and figures you were given.",
    noOwnershipRanking: "Ownership and price may not affect which cards you cut or their order.",
  },
  prompt: {
    task: (over: number) =>
      `You propose cuts for a Magic: The Gathering Commander deck that is ${over} ${over === 1 ? "card" : "cards"} over 100.`,
    count: (over: number) =>
      `Propose exactly ${over} ${over === 1 ? "cut" : "cuts"}. Propose fewer only if the deck genuinely has fewer defensible cuts.`,
    cites: "Cite with one of six kinds: inclusion (the card's percent), offList, role (role, have, target), curve (cmc, have), flag, intent.",
    reasonLength: "Write each reason in one plain line, 200 characters at most.",
  },
  /** Refusals from the run action. The in-flight, allowance and locked refusals reuse the Suggested
   *  changes copy, which says the same thing in the same words. */
  run: {
    refused: "We couldn\u2019t read that deck.",
    notOver: "This deck isn\u2019t over 100 cards, so there is nothing to cut. No credit is used.",
    tooBig: "This deck is too large for Proposed cuts to read. No credit is used.",
  },
  /** Plain words for what the facts had to go without. */
  missing: {
    inclusion: "No EDHREC list was available, so cards carry no inclusion figure.",
    roleTargets: "Role targets are the defaults, not measured for this commander.",
    curve: "No average curve was available.",
  },
  flags: {
    gameChanger: "Game Changer",
    massLandDenial: "mass land denial",
    extraTurn: "extra turn",
    combo: "combo piece",
  },
  reasonMaxLength: 200,
} as const;

export type CutsRuleKey = keyof typeof deckCutsCopy.rules;
