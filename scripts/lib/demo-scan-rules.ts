// The name scan's rules for the landing demo's data (`src/lib/demo/name-scan.ts`), built from the fixture's own lists so the
// exporter and the committed-file test cannot disagree. A new exporter step that adds a person-bearing field adds its key here.
import type { ScanRules } from "../../src/lib/demo/name-scan";
import { DECK_NAMES, DECK_NOTES, FRIEND_DECK_NAME, FRIEND_NAMES, OPPONENT_LABEL, PLAYED_V1_NOTE, PLAYER_NAME, POD_NAMES, VERSION_NOTES } from "./fictional-fixture/names";

export const demoScanRules: ScanRules = {
  // A key that holds a person's name. The two steps exported so far carry none; the deck, games and friends steps do.
  personKeys: ["player", "owner", "friend", "friends", "opponent", "opponents", "author", "from", "to", "displayName", "publicId"],
  people: [PLAYER_NAME, ...FRIEND_NAMES, OPPONENT_LABEL],
  freeText: {
    deckName: [...Object.values(DECK_NAMES), FRIEND_DECK_NAME],
    notes: [...DECK_NOTES, PLAYED_V1_NOTE, ...VERSION_NOTES],
    podName: Object.values(POD_NAMES),
  },
};
