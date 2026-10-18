import { unstable_cache } from "next/cache";
import { cache } from "react";
import { catalogGeneration } from "../cache/catalog-generation";
import { DEPLOYMENT_ID } from "../cache/deployment";
import { loadPublicCard, type PublicCardResult } from "./card";
import { parsePublicSlug } from "./slug";

/**
 * The card page's read, cached (plan option C: a data cache, no CDN). The pages stay dynamic; the database sees about one
 * read per card per catalog refresh.
 *
 * THE KEY is the catalog generation, the deployment and the CARD: the address's 12-hex id part, the only part that
 * resolves. The name part is cosmetic (a wrong one 308s to the canonical address), so keying on the address as typed would
 * let any number of misspelled names each store a copy of the same card. Every ingest and every commander index copy stamps
 * `catalog_refreshes`, so a refresh moves the generation and the old entry is simply never asked for again; the deployment
 * retires an entry whose shape a new build changed. The generation is itself held for 60 seconds (`catalogGeneration`), so a
 * refresh reaches a page within a minute.
 *
 * ONLY A FOUND CARD IS STORED. A `not-found` or `ambiguous` answer is served and never kept, so a card the next refresh adds
 * is not held as missing, and a failed read throws through rather than being cached.
 *
 * Wrapped in `React.cache` too, so one request reads once however many of its parts ask (the page and its metadata).
 */
export const PUBLIC_CARD_REVALIDATE_S = 60 * 60 * 24;

/** The cache key's parts, exported so a test can pin that the catalog moving moves the key. */
export function publicCardKey(generation: string, hex: string, deployment: string = DEPLOYMENT_ID): string[] {
  return ["public-card", `gen:${generation}`, `dep:${deployment}`, `id:${hex}`];
}

/**
 * The link-preview image's key (`opengraph-image.tsx`, F3 PR 2b): the same parts as the read's, under its own name, so a
 * catalog refresh or a new build retires a card's PNG exactly when it retires the card.
 */
export function publicCardImageKey(generation: string, hex: string, deployment: string = DEPLOYMENT_ID): string[] {
  return ["public-card-image", ...publicCardKey(generation, hex, deployment).slice(1)];
}

class NotStored {
  constructor(readonly result: PublicCardResult) {}
}

export const readPublicCard = cache(async (slug: string): Promise<PublicCardResult> => {
  const parsed = parsePublicSlug(slug);
  // An address with no id part cannot resolve: answered by the loader, never stored.
  if (!parsed) return loadPublicCard(slug);
  const key = publicCardKey(await catalogGeneration(), parsed.hex);
  const stored = unstable_cache(async () => {
    // The bare id resolves to the same card, and its answer carries the canonical address the page compares against.
    const result = await loadPublicCard(parsed.hex);
    // Thrown, because `unstable_cache` stores whatever is returned and stores nothing that throws.
    if (result.kind !== "ok") throw new NotStored(result);
    return result;
  }, key, { revalidate: PUBLIC_CARD_REVALIDATE_S });
  try {
    return await stored();
  } catch (e) {
    if (e instanceof NotStored) return e.result;
    throw e;
  }
});
