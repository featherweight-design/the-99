// Deck printings on import: which printing a newly imported deck picks for each card, and the two
// counts the arrival strip states. Pure: the player's holdings come in as keys.
//
// A line naming a printing the player HOLDS makes it the deck's pick; the first such line wins, as
// the first line wins a quantity. A card whose lines name printings, none of them held, falls to
// the chain like any card and is counted, because the strip says so (`, N not in your Collection`,
// Hugh's ruling a). A line naming no printing is neither.

export type ImportPrintingCandidate = {
  oracleId: string;
  /** Lowercase, as stored. */
  setCode: string;
  collectorNumber: string;
  sourceLine: number;
};

export type ImportPrintingPick = { oracleId: string; setCode: string; collectorNumber: string };

/** The key `heldKeys` is built from: one owned printing of one card. */
export function heldKey(oracleId: string, setCode: string, collectorNumber: string): string {
  return `${oracleId}|${setCode.toLowerCase()}|${collectorNumber}`;
}

export function importPicks(
  candidates: readonly ImportPrintingCandidate[],
  /** `heldKey`s of every printing the player owns a copy of, among the candidates' cards. */
  held: ReadonlySet<string>,
  /** The cards the new deck holds, both commanders included. A line the import dropped is not one. */
  members: ReadonlySet<string>,
): { picks: ImportPrintingPick[]; notOwned: number } {
  const picks = new Map<string, ImportPrintingPick>();
  const named = new Set<string>();
  for (const c of [...candidates].sort((a, b) => a.sourceLine - b.sourceLine)) {
    if (!members.has(c.oracleId)) continue;
    named.add(c.oracleId);
    if (picks.has(c.oracleId)) continue;
    if (held.has(heldKey(c.oracleId, c.setCode, c.collectorNumber))) {
      picks.set(c.oracleId, { oracleId: c.oracleId, setCode: c.setCode.toLowerCase(), collectorNumber: c.collectorNumber });
    }
  }
  return { picks: [...picks.values()], notOwned: [...named].filter((id) => !picks.has(id)).length };
}
