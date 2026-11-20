/**
 * The deck names Wizards' collecting posts give each announced set (`collecting.ts`, stored by the ingest), by set code.
 * The names only: the post names no commanders, and Scryfall never says which revealed commander is which box, so a
 * name stands for a deck and the set's revealed commanders stay one list beside it.
 */
import { db } from "../../db";
import { wizardsCollectingPosts } from "../../db/schema";
import { collectingMatchesSet } from "./collecting";

type Reader = Pick<typeof db, "select">;

/**
 * Each set's promised deck names: the matching post with names (the latest read when two match), by lowercase set code. A
 * set with no matching post, or whose post lists none, has no key. Pure, for a test.
 */
export function deckNamesBySet(
  posts: readonly { slug: string; deckNames: string[]; lastFetchedAt: Date }[],
  sets: readonly { code: string; name: string }[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const set of sets) {
    const match = posts
      .filter((p) => p.deckNames.length > 0 && collectingMatchesSet(p.slug, set.name))
      .sort((a, b) => b.lastFetchedAt.getTime() - a.lastFetchedAt.getTime())[0];
    if (match) out[set.code.toLowerCase()] = match.deckNames;
  }
  return out;
}

/** The posts' deck names for these upcoming sets. Throws when the read fails. */
export async function loadAnnouncedDeckNames(sets: readonly { code: string; name: string }[], q: Reader = db): Promise<Record<string, string[]>> {
  if (sets.length === 0) return {};
  const posts = await q
    .select({ slug: wizardsCollectingPosts.slug, deckNames: wizardsCollectingPosts.deckNames, lastFetchedAt: wizardsCollectingPosts.lastFetchedAt })
    .from(wizardsCollectingPosts);
  return deckNamesBySet(posts, sets);
}
