// The moved commanders, as the banner's commander line and the review page's Commander section
// draw them (handoff §4): each side's names and crops, and whether a new one has to be bought.
//
// Read by `readDraft` only when the commander moved, so a draft without a swap pays nothing.

import { resolveOwnedPrintings } from "../collection/owned-printings";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems } from "../../db/schema";
import type { PriceFact } from "../decks/price";
import { loadPrices } from "../decks/price-query";
import type { CommanderPair } from "./pending";

export type CommanderRow = {
  oracleId: string;
  name: string;
  /** The name printed on the owned copy whose crop the row draws, where it has its own; else null. */
  printedName?: string | null;
  artCropUri: string | null;
  side: "from" | "to";
  /** A new commander the collection does not hold: the banner's price tile and the "now" row's
   *  buy tag. Never true on the leaving side. */
  buy: boolean;
  /** Null unless `buy`, and when the feed has no row for it. */
  price: PriceFact | null;
};

export type CommanderRows = { rows: CommanderRow[]; newestAsOf: Date | null };

const members = (p: CommanderPair) =>
  [p.commanderOracleId, p.partnerOracleId].filter((id): id is string => id !== null);

export async function loadCommanderRows(
  userId: string, from: CommanderPair, to: CommanderPair, versionBody: ReadonlySet<string>,
): Promise<CommanderRows> {
  const fromIds = members(from);
  const toIds = members(to);
  const ids = [...new Set([...fromIds, ...toIds])];
  const [rawFacts, owned, ownedArt] = await Promise.all([
    db.select({ oracleId: cards.oracleId, name: cards.name, artCropUri: cards.artCropUri })
      .from(cards).where(inArray(cards.oracleId, ids)),
    db.selectDistinct({ oracleId: collectionItems.oracleId }).from(collectionItems)
      .where(and(eq(collectionItems.userId, userId), inArray(collectionItems.oracleId, toIds))),
    // The crop of the copy the reader owns, the one the card details draw (Hugh, 2026-10-05).
    // Fail-soft through `resolveOwnedPrintings`: a failed read keeps the oracle-level crop.
    resolveOwnedPrintings(userId, ids),
  ]);
  const facts = rawFacts.map((f) => ({
    ...f,
    artCropUri: ownedArt.get(f.oracleId)?.artCropUri ?? f.artCropUri,
    printedName: ownedArt.get(f.oracleId)?.printedName ?? null,
  }));
  // A half traded out of the 99 keeps its own copy, as the sheet's candidates treat it (`inDeck`):
  // the trade buys nothing, whether or not the collection holds it.
  const ownedIds = heldIds(owned.map((o) => o.oracleId), toIds, versionBody);
  const toBuy = buyIds(fromIds, toIds, ownedIds);
  const prices = toBuy.length > 0 ? await loadPrices(toBuy).catch(() => null) : null;
  return {
    rows: commanderRows(fromIds, toIds, ownedIds, facts, prices?.prices ?? null),
    newestAsOf: prices?.newestAsOf ?? null,
  };
}

/** What counts as held for a buy: the collection's copies, plus a new half the version's 99 holds. */
export function heldIds(owned: readonly string[], toIds: readonly string[], versionBody: ReadonlySet<string>): Set<string> {
  return new Set([...owned, ...toIds.filter((id) => versionBody.has(id))]);
}

/** The halves to buy: ARRIVING and unowned. A half a pair keeps already leads the deck. */
export function buyIds(fromIds: readonly string[], toIds: readonly string[], owned: ReadonlySet<string>): string[] {
  return toIds.filter((id) => !fromIds.includes(id) && !owned.has(id));
}

/** The `was` rows, then the `now` rows, each marked to buy by `buyIds`. */
export function commanderRows(
  fromIds: readonly string[], toIds: readonly string[], owned: ReadonlySet<string>,
  facts: readonly { oracleId: string; name: string; printedName?: string | null; artCropUri: string | null }[],
  prices: ReadonlyMap<string, PriceFact> | null,
): CommanderRow[] {
  const buying = new Set(buyIds(fromIds, toIds, owned));
  const byId = new Map(facts.map((f) => [f.oracleId, f]));
  const row = (id: string, side: "from" | "to"): CommanderRow => {
    const buy = side === "to" && buying.has(id);
    return {
      oracleId: id,
      name: byId.get(id)?.name ?? "",
      printedName: byId.get(id)?.printedName ?? null,
      artCropUri: byId.get(id)?.artCropUri ?? null,
      side,
      buy,
      price: buy ? prices?.get(id) ?? null : null,
    };
  };
  return [...fromIds.map((id) => row(id, "from")), ...toIds.map((id) => row(id, "to"))];
}
