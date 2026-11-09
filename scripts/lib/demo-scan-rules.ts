// The name scan's rules for the landing demo's data (`src/lib/demo/name-scan.ts`), built from the fixture's own lists so the
// exporter and the committed-file test cannot disagree. A new exporter step that adds a person-bearing field adds its key here.
import type { ScanRules } from "../../src/lib/demo/name-scan";
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
  // `availability.claims`, a Map's entries included) and the decks Which deck lists, holds or rules out (step 8).
  freeTextAt: [
    { path: /(?:^|\.)claims\[\d+\]\.name$/, allowed: deckNames, what: "deckName" },
    { path: /^fits\..*\.(?:fits|holds|excluded)\[\d+\]\.name$/, allowed: deckNames, what: "deckName" },
  ],
};

/** Where a stored model read's sentences sit (Which deck's picks, `parts[].text` and `parts[].quote`): free text a model
 *  wrote, which may name a deck. */
export const SENTENCE_PATH = /\.parts\[\d+\]\.(?:text|quote)$/;

/**
 * The demo's rules plus the source database's own deck names (every `decks.name` it holds), less the fixture's: any string
 * equal to one of them fails, under whatever key it sits, and so does a model's sentence that contains one. The exporter
 * reads the names and passes them in; they stay in memory and a finding prints its path, never its value.
 */
export function withSourceDeckNames(sourceDeckNames: readonly string[]): ScanRules {
  const fixture = new Set(deckNames.map((n) => n.trim().toLowerCase()));
  const texts = [...new Set(sourceDeckNames)].filter((n) => !fixture.has(n.trim().toLowerCase()));
  return { ...demoScanRules, forbidden: { texts, containedAt: SENTENCE_PATH, what: "deck name from the source database" } };
}
