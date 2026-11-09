// The name scan's rules for the landing demo's data (`src/lib/demo/name-scan.ts`), built from the fixture's own lists so the
// exporter and the committed-file test cannot disagree. A new exporter step that adds a person-bearing field adds its key here.
import type { ScanRules } from "../../src/lib/demo/name-scan";
import type { Projected } from "../../src/lib/demo/projected";
import { DECK_NAMES, DECK_NOTES, FRIEND_DECK_NAME, FRIEND_NAMES, OPPONENT_LABEL, PLAYED_V1_NOTE, PLAYER_NAME, POD_NAMES, VERSION_NOTES } from "./fictional-fixture/names";

const deckNames = [...Object.values(DECK_NAMES), FRIEND_DECK_NAME];

export const demoScanRules: ScanRules = {
  // A key that holds a person's name. The steps exported so far carry none; the games and friends steps will.
  personKeys: ["player", "owner", "friend", "friends", "opponent", "opponents", "author", "from", "to", "displayName", "publicId"],
  people: [PLAYER_NAME, ...FRIEND_NAMES, OPPONENT_LABEL],
  freeText: {
    deckName: deckNames,
    // A Top off candidate's deck (`SynergyCard.committedTo`): kept on the type, drawn by nothing, and a deck name.
    committedTo: deckNames,
    notes: [...DECK_NOTES, PLAYED_V1_NOTE, ...VERSION_NOTES],
    podName: Object.values(POD_NAMES),
  },
  // Deck names under `name`, a key that holds a card's name everywhere else: a claim on a card's copies (any card's
  // `availability.claims`, a Map's entries included), the decks Which deck lists, holds or rules out (step 8), and the
  // decks a card is proxied in or a combo partner's copies sit in (card details, step 5l-c).
  freeTextAt: [
    { path: /(?:^|\.)claims\[\d+\]\.name$/, allowed: deckNames, what: "deckName" },
    { path: /^fits\..*\.(?:fits|holds|excluded)\[\d+\]\.name$/, allowed: deckNames, what: "deckName" },
    // The decks a card is proxied in (card details' `proxiedBy`, step 5l-c).
    { path: /(?:^|\.)proxiedBy\[\d+\]\.name$/, allowed: deckNames, what: "deckName" },
    // The decks holding a combo partner's copies (`HoldingDeck`, in `cardCombos.combos[].others[].decks` and `where.decks`).
    { path: /^(?:cardDetails|deckCombos)\..*\.decks\[\d+\]\.name$/, allowed: deckNames, what: "deckName" },
  ],
};

/**
 * Where a model wrote the file's free text, step by step, as path prefixes (`cuts.items` covers `cuts.items[0].reason`).
 * Every string under one is scanned for a source deck name INSIDE it, not only equal to it, since a model can quote a deck
 * by name in a sentence. Typed by `Projected`'s steps, so a new step does not compile until it is classified here: a list
 * for a step with model text, `[]` for one with none.
 */
export const MODEL_TEXT: Record<Exclude<keyof Projected, "format">, readonly string[]> = {
  collection: [],
  commanders: [],
  // Help me choose: the stored read's picks and their reasons.
  choose: ["choose"],
  // The reading is computed, never written by a model.
  analysis: [],
  // The stored Overview's text.
  overview: ["overview"],
  // The stored Suggested changes run's lines and their reasons.
  suggested: ["suggested"],
  decks: [],
  // Look deeper's reasons, and the validator's report of the reasons it softened.
  cuts: ["cuts.items", "cuts.itemsReport"],
  mana: [],
  topOff: [],
  // Which deck's stored read: its sentences (`parts[].text`, `parts[].quote`).
  fits: ["fits.panel.view"],
  // Card details: catalog rows and the fixture's collection, decks and prices; no model writes any of it.
  cardDetails: [],
  deckCombos: [],
};

const MODEL_PREFIXES = Object.values(MODEL_TEXT).flat();

/** Whether a string at `path` is a model's free text (`MODEL_TEXT`). */
export function isModelText(path: string): boolean {
  return MODEL_PREFIXES.some((p) => path === p || path.startsWith(`${p}.`) || path.startsWith(`${p}[`));
}

/**
 * The demo's rules plus the source database's own deck names (every `decks.name` it holds), less the fixture's: any string
 * equal to one of them fails, under whatever key it sits, and so does a model's free text that contains one as whole words.
 * The exporter reads the names and passes them in; they stay in memory and a finding prints its path, never its value.
 */
export function withSourceDeckNames(sourceDeckNames: readonly string[]): ScanRules {
  const fixture = new Set(deckNames.map((n) => n.trim().toLowerCase()));
  const texts = [...new Set(sourceDeckNames)].filter((n) => !fixture.has(n.trim().toLowerCase()));
  return { ...demoScanRules, forbidden: { texts, containedWithin: isModelText, what: "deck name from the source database" } };
}
