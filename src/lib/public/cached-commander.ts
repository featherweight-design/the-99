import { unstable_cache } from "next/cache";
import { cache } from "react";
import { catalogGeneration } from "../cache/catalog-generation";
import { DEPLOYMENT_ID } from "../cache/deployment";
import { loadPublicCommander, type PublicCommanderResult } from "./commander";
import { parsePublicSlug } from "./slug";

/**
 * The commander page's read, cached the way the card page's is (`cached-card.ts`, plan option C): keyed on the catalog
 * generation, the deployment and the 12-hex id part, never the name part as typed. Every commander index copy stamps
 * `catalog_refreshes`, so a rebuilt index moves the generation and the old entry is never asked for again.
 *
 * ONLY A FOUND COMMANDER IS STORED, whatever its support state. `absent` and `degraded` are stored rows of
 * `commander_support`, not live reads of EDHREC: the index build leaves a commander's previous row in place when EDHREC
 * cannot be reached (`seed-index.ts`), and only a build or a copy changes a row, and both move the generation. A
 * `not-found` or `ambiguous` answer is never kept, so a commander the next build adds is not held as missing, and a failed
 * read throws through.
 */
export const PUBLIC_COMMANDER_REVALIDATE_S = 60 * 60 * 24;

/** The cache key's parts, exported so a test can pin that the catalog moving moves the key. */
export function publicCommanderKey(generation: string, hex: string, deployment: string = DEPLOYMENT_ID): string[] {
  return ["public-commander", `gen:${generation}`, `dep:${deployment}`, `id:${hex}`];
}

/** The commander's link-preview image's key (`opengraph-image.tsx`): the page read's parts under the image's own name. */
export function publicCommanderImageKey(generation: string, hex: string, deployment: string = DEPLOYMENT_ID): string[] {
  return ["public-commander-image", ...publicCommanderKey(generation, hex, deployment).slice(1)];
}

class NotStored {
  constructor(readonly result: PublicCommanderResult) {}
}

export const readPublicCommander = cache(async (slug: string): Promise<PublicCommanderResult> => {
  const parsed = parsePublicSlug(slug);
  if (!parsed) return loadPublicCommander(slug);
  const key = publicCommanderKey(await catalogGeneration(), parsed.hex);
  const stored = unstable_cache(async () => {
    const result = await loadPublicCommander(parsed.hex);
    // Thrown, because `unstable_cache` stores whatever is returned and stores nothing that throws.
    if (result.kind !== "ok") throw new NotStored(result);
    return result;
  }, key, { revalidate: PUBLIC_COMMANDER_REVALIDATE_S });
  try {
    return await stored();
  } catch (e) {
    if (e instanceof NotStored) return e.result;
    throw e;
  }
});
