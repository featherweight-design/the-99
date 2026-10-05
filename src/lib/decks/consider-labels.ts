/**
 * The deck page's request-time read for the Consider filter (card labels item 7, item 1): the fresh
 * labels of the suggestions it renders.
 *
 * Read AFTER the cached suggestions payload resolves and outside every `cacheForUser` entry: a label
 * publish moves neither the deployment nor the catalog generation that key carries, so a label read
 * inside the cache would serve the previous run's labels for up to its ceiling.
 *
 * Off (`LABEL_SURFACES_ENABLED` anything but `'true'`), nothing is read and the suggestions pass
 * through untouched.
 */
import { filterConsider } from "../labels/consider";
import { labelSurfacesEnabled, readLabels } from "../labels/read";
import type { Job } from "../labels/types";
import type { Suggestion } from "./suggest";

export type ConsiderLabelDeps = {
  enabled: () => boolean;
  readLabels: (oracleIds: readonly string[]) => Promise<Map<string, Job[]>>;
};

export type ConsiderLabels = { labels: ReadonlyMap<string, readonly Job[]> };

export const DEFAULT_DEPS: ConsiderLabelDeps = {
  enabled: () => labelSurfacesEnabled(),
  readLabels,
};

export async function considerLabels(
  args: {
    /** The ids of the suggestions the page renders, and nothing else: never the catalog, never the deck. */
    suggestionIds: readonly string[];
  },
  deps: ConsiderLabelDeps = DEFAULT_DEPS,
): Promise<ConsiderLabels | null> {
  if (!deps.enabled()) return null;
  if (args.suggestionIds.length === 0) return null;
  return { labels: await deps.readLabels(args.suggestionIds) };
}

/** The suggestions the page renders: unchanged when the read is off or failed (null). */
export function applyConsiderLabels<
  T extends { oracleId: string; reason: Suggestion["reason"]; typeLine: string },
>(suggestions: T[], read: ConsiderLabels | null): T[] {
  if (read === null) return suggestions;
  return filterConsider(suggestions, read.labels);
}
