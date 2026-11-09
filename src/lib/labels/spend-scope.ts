import { eq, or, type SQL } from "drizzle-orm";
import { cardLabelBatches } from "../../db/schema";

/**
 * The ledger rows `readFamilySpend` (`scripts/lib/card-labels-build.ts`) reads before `familySpend`
 * decides which count: this prompt version's rows, AND this run id's rows under ANY version. The second
 * half is what stops a prompt bump (8 to 9, 2026-11-08) handing a resumed run id a second cap; a filter
 * on the version alone would never even read the run's earlier rows. Here, apart from the build, so the
 * emitted SQL is tested.
 */
export function familySpendScope(runId: string, promptVersion: string): SQL {
  return or(eq(cardLabelBatches.promptVersion, promptVersion), eq(cardLabelBatches.runId, runId))!;
}
