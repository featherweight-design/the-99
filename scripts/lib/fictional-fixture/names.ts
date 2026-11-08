// Every name, note and filename the fictional fixture writes. None is a real person's: the player is invented, the
// friends are first names with no surname, the decks are themed titles.
export const PLAYER_NAME = "Wren Calloway";

/** Kept from the earlier fixture: the capture's locators and docs name these friends. They are invented. */
export const FRIEND_NAMES = ["Alex", "Torin", "Merek", "Varic", "Zev"] as const;
export const POD_NAMES = { base: "About pod", cartBros: "The Bros", cartThursday: "Thursday pod" } as const;
export const OPPONENT_LABEL = "Riley";
export const FRIEND_DECK_NAME = "Alex’s brew";

export const DECK_NAMES = {
  under: "Lanternlight Tinkers",
  over: "Saltmarsh Reclamation",
  played: "Ashen Banner Parade",
  fresh: "Hollow Oak Hours",
  versioned: "Tidewrack Library",
} as const;

export const DECK_NOTES = ["Try a second board wipe over the slow ramp", "Mulligan hands with no early play"] as const;

/** The note on each committed version of the versioned deck, oldest first. */
export const VERSION_NOTES = [
  "First sleeved list: every slot I own, no stand-ins",
  "Trimmed two basics for the card draw I kept wishing I had",
  "Swapped a basic for a land that fixes both colors after a stumbling game three",
] as const;
export const PLAYED_V1_NOTE = "Sleeved for game night";

export const UPLOADS = [
  { filename: "binder-export-2026-08-02.csv", daysAgo: 88 },
  { filename: "binder-export-2026-10-12.csv", daysAgo: 20 },
] as const;
