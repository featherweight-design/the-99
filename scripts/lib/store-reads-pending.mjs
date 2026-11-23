// The calls `check:store-reads` lets through for now: each still prices (or picks art) in Mana Pool whatever store the
// reader chose. Store choice slices 3c-2 and 3c-3 thread the store into them. Each slice deletes only its own entries,
// in its own section, when its PR gives the call a store; the check fails on an entry whose call already passes one,
// so this list only shrinks. Nothing new is ever added here: a new read passes the store from its first commit.
//
// An entry names the file, the function the call sits in (`enclosingName` in store-reads.mjs) and how many of its calls
// leave the store out, not a line, so an unrelated edit above it does not break the check, while a new call in a pending
// function does: the count no longer matches.

/** Slice 3c-2: intake, decks, commander change. */
const SLICE_3C2 = [
];

export const PENDING = [...SLICE_3C2];
