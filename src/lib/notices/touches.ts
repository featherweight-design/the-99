/**
 * Whether a change log entry touches a stored reading (deck notices plan D5 and D8). ONE RULE,
 * used by the notices read and by H1's recompute, so the notice a player sees and the press that
 * clears it can never disagree about which entries count.
 *
 * - A card-scoped entry touches a reading published after it (`seq > seenSeq`) when the reading's
 *   ANALYZED list holds every card it names (a combo needs every piece). A card the player added
 *   since is the dirty flag's to report, not this.
 * - A combo whose piece must be the commander touches only a reading led by that piece.
 * - A `rules` entry names no cards: it touches every reading computed under an older version.
 */

export type ReadingMarks = {
  seenSeq: number;
  rulesVersion: number;
  analyzedOracleIds: readonly string[];
  commanderOracleIds: readonly string[];
};

export type LoggedEntry = {
  seq: number;
  kind: string;
  oracleIds: readonly string[];
  detail: Record<string, unknown>;
};

export function touches(entry: LoggedEntry, reading: ReadingMarks): boolean {
  if (entry.kind === "rules") {
    return Number(entry.detail.rulesVersion) > reading.rulesVersion;
  }
  if (entry.seq <= reading.seenSeq) return false;
  const held = new Set(reading.analyzedOracleIds);
  if (entry.oracleIds.length === 0 || !entry.oracleIds.every((id) => held.has(id))) return false;
  const mustLead = Array.isArray(entry.detail.mustBeCommander) ? (entry.detail.mustBeCommander as string[]) : [];
  return mustLead.every((id) => reading.commanderOracleIds.includes(id));
}
