import { db } from "../../db";
import { deckToolCounts } from "../../db/schema";
import type { MixRole } from "../decks/mix";
import type { CutFacts } from "./cuts";
import type { CountTool, CutsCountSummary, ToolCountSummary } from "./history";

/** History's short role words, as the canvas's summary writes them (`ramp 4 over, draw 2 over`). */
const ROLE_WORD: Record<MixRole, string> = {
  ramp: "ramp", draw: "draw", removal: "removal", wipes: "board wipes", land: "lands",
};

/**
 * Proposed cuts' free count as History stores it: how far over 100 the deck is, and each role
 * running over its target by how many. Null when the deck is not over, since a count that offers
 * nothing is not a run of the tool.
 */
export function cutsCountSummary(facts: Pick<CutFacts, "over" | "roles">): CutsCountSummary | null {
  if (facts.over <= 0) return null;
  return {
    over: facts.over,
    roles: facts.roles
      .filter((r) => r.have > r.target)
      .map((r) => ({ role: r.role, label: ROLE_WORD[r.role], over: r.have - r.target })),
  };
}

export type ToolCountRow = {
  deckId: string;
  userId: string;
  tool: CountTool;
  listFingerprint: string;
  readVersion: number | null;
  summary: ToolCountSummary;
};

/** The insert, built apart from running it so its conflict clause is unit tested. */
export function toolCountInsert(row: ToolCountRow) {
  return db.insert(deckToolCounts).values(row).onConflictDoNothing({
    target: [deckToolCounts.deckId, deckToolCounts.tool, deckToolCounts.listFingerprint],
  });
}

/**
 * Records a free count once per tool per list version: a second read of the same list writes
 * nothing. NON-FATAL: History is a record of the count, never a reason the count fails to draw.
 */
export async function recordToolCount(row: ToolCountRow): Promise<void> {
  try {
    await toolCountInsert(row);
  } catch (error) {
    console.warn("[tuning] free count not recorded", { tool: row.tool, error: error instanceof Error ? error.message : String(error) });
  }
}
