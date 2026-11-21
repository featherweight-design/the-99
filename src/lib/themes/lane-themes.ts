import { laneThemes, type LaneThemes } from "./commander-themes";
import { loadCommanderThemes } from "./commander-themes-read";

/**
 * A lane page's `Themes ▾` index for the rows it ships, aligned to `oracleIds`.
 *
 * Undefined when the read fails: the lane then draws no `Themes` control and applies no `?t=`,
 * rather than taking the whole page down for one filter (as `lanePrintedInFor` does).
 */
export async function laneThemesFor(oracleIds: readonly string[]): Promise<LaneThemes | undefined> {
  try {
    return laneThemes(oracleIds, await loadCommanderThemes());
  } catch (error) {
    console.error("theme index unavailable", error);
    return undefined;
  }
}
