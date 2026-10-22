/**
 * A friend's decks, for the friend page's Decks tab (menu and Home plan, PR 7; handoff G4). A friend sees the
 * name, the commander, the status and the count of each deck, and never the list: no card, no id (so no press
 * can reach a deck page), no note, no folder, no bracket, no play date.
 *
 * The grant is the viewer's own friendship row, read in `resolveFriend`'s statement: a public id that is not
 * the viewer's current friend resolves to nothing, whoever it names, and nothing is read for it. The decks are
 * then read under the FRIEND's resolved switches (as `loadFriendSpares` reads a claim model), by the same
 * `listDecksWithStats` the friend's own `/decks` draws its pills from, so the status a friend sees on their
 * own tile is the status the viewer sees here. It derives from the friend's collection, which a count of
 * spares already shows more of (product call 1 of the plan).
 *
 * The figure beside `To buy` is the copies the friend's Shopping would buy for that deck (`loadDeckBuyRows`, the
 * roll-up their own deck tile draws), never `toBuyCount`: that one counts basics and knows nothing of seniority.
 *
 * The reads after the grant run on their own snapshots, so the grant is read AGAIN after them: a friendship
 * removed while they ran returns nothing rather than what was read past its end.
 */
import { loadDeckBuyRows } from "../decks/availability-query";
import { listDecksWithStats } from "../decks/read";
import { deckBodySize } from "../decks/deck-size";
import type { StatusPill } from "../decks/status";
import { resolveSwitchEnv } from "../switches/snapshot";
import { resolveFriend } from "./access";

export type FriendDeck = {
  name: string;
  commanderName: string;
  /** The second commander of a pair, or null. */
  partnerName: string | null;
  colorIdentity: string[];
  /** The commander's art for the tile's wash, or null. */
  artCropUri: string | null;
  status: StatusPill;
  /** Cards matched to the catalog. */
  built: number;
  /** 99, or 98 for a pair: the count the figure reads against. */
  bodySize: number;
  /** Copies the friend's Shopping would buy for this deck; the tile names it beside `To buy` only. */
  toBuy: number;
};

/** The friend's decks, newest first, or null when `publicId` is not the viewer's current friend. */
export async function loadFriendDecks(viewerId: string, publicId: unknown): Promise<FriendDeck[] | null> {
  const friendId = await resolveFriend(viewerId, publicId);
  if (friendId === null) return null;
  const env = await resolveSwitchEnv(friendId);
  const [rows, buys] = await Promise.all([
    listDecksWithStats(friendId, "newest", { env, includeProxyStats: true }),
    loadDeckBuyRows(friendId, undefined, undefined, env),
  ]);
  if ((await resolveFriend(viewerId, publicId)) !== friendId) return null;
  const toBuy = new Map<string, number>();
  for (const b of buys) toBuy.set(b.deckId, (toBuy.get(b.deckId) ?? 0) + b.quantity);
  return rows.map((d) => ({
    name: d.name,
    commanderName: d.commanderName,
    partnerName: d.partnerName,
    colorIdentity: d.commanderColorIdentity,
    artCropUri: d.commanderArtCropUri,
    status: d.statusPill,
    built: d.built,
    bodySize: deckBodySize(d.partnerName !== null),
    toBuy: toBuy.get(d.id) ?? 0,
  }));
}
