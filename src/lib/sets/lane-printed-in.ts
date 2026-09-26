import { laneOracleIds } from "../commanders/printed-in-lane";
import { lanePrintedIn, type CommanderPrintings, type LanePrintedIn } from "./printed-in";
import { loadCommanderPrintings } from "./printed-in-read";

export { loadCommanderPrintings };

/**
 * A lane page's `Printed in ▾` index for the rows it ships, aligned to `laneOracleIds(rows)`.
 *
 * Undefined when the read fails: the lane then draws no `Printed in` control and applies no
 * `?p=`, rather than taking the whole page down for one filter.
 */
export async function lanePrintedInFor(
  rows: readonly { oracleId: string }[],
  // Started by the caller beside its own reads, so the index costs no extra round trip.
  printings: Promise<CommanderPrintings> = loadCommanderPrintings(),
): Promise<LanePrintedIn | undefined> {
  try {
    return lanePrintedIn(laneOracleIds(rows), await printings);
  } catch (error) {
    console.error("printed-in index unavailable", error);
    return undefined;
  }
}
