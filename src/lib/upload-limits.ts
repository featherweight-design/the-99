// Size caps for every user-supplied import, in one place so a check and the copy
// describing it cannot drift apart.
//
// The two file caps are deliberately different numbers. A collection CSV can be
// twenty thousand rows; a hundred-card decklist is a few kilobytes. Standardising
// them on 5 MB would also make the deck-import handoff's own illustration of the
// file-too-large state — a 4.1 MB .xlsx — pass the check.

export const COLLECTION_FILE_MAX_BYTES = 5 * 1024 * 1024;

export const DECK_IMPORT_FILE_MAX_BYTES = 2 * 1024 * 1024;

/** The figure the deck-import copy renders. Kept beside the check it describes. */
export const DECK_IMPORT_FILE_MAX_LABEL = "2 MB";

/** Genuinely shared: a paste is a paste in either flow. */
export const PASTE_MAX_BYTES = 100_000;
