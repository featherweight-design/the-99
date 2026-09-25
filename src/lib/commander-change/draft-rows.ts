// The moved commanders, as the banner's commander line and the review page's Commander section
// draw them (handoff §4): each side's names and crops, and whether a new one has to be bought.
//
// Read by `readDraft` only when the commander moved, so a draft without a swap pays nothing.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems } from "../../db/schema";
import type { PriceFact } from "../decks/price";
import { loadPrices } from "../decks/price-query";
import type { CommanderPair } from "./pending";

export type CommanderRow = {
  oracleId: string;
  name: string;
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
  userId: string, from: CommanderPair, to: CommanderPair,
): Promise<CommanderRows> {
  const fromIds = members(from);
  const toIds = members(to);
  const ids = [...new Set([...fromIds, ...toIds])];
  const [facts, owned] = await Promise.all([
    db.select({ oracleId: cards.oracleId, name: cards.name, artCropUri: cards.artCropUri })
      .from(cards).where(inArray(cards.oracleId, ids)),
    db.selectDistinct({ oracleId: collectionItems.oracleId }).from(collectionItems)
      .where(and(eq(collectionItems.userId, userId), inArray(collectionItems.oracleId, toIds))),
  ]);
  const ownedIds = new Set(owned.map((o) => o.oracleId));
  const toBuy = buyIds(fromIds, toIds, ownedIds);
  const prices = toBuy.length > 0 ? await loadPrices(toBuy).catch(() => null) : null;
  return {
    rows: commanderRows(fromIds, toIds, ownedIds, facts, prices?.prices ?? null),
    newestAsOf: prices?.newestAsOf ?? null,
  };
}

/** The halves to buy: ARRIVING and unowned. A half a pair keeps already leads the deck. */
export function buyIds(fromIds: readonly string[], toIds: readonly string[], owned: ReadonlySet<string>): string[] {
  return toIds.filter((id) => !fromIds.includes(id) && !owned.has(id));
}

/** The `was` rows, then the `now` rows, each marked to buy by `buyIds`. */
export function commanderRows(
  fromIds: readonly string[], toIds: readonly string[], owned: ReadonlySet<string>,
  facts: readonly { oracleId: string; name: string; artCropUri: string | null }[],
  prices: ReadonlyMap<string, PriceFact> | null,
): CommanderRow[] {
  const buying = new Set(buyIds(fromIds, toIds, owned));
  const byId = new Map(facts.map((f) => [f.oracleId, f]));
  const row = (id: string, side: "from" | "to"): CommanderRow => {
    const buy = side === "to" && buying.has(id);
    return {
      oracleId: id,
      name: byId.get(id)?.name ?? "",
      artCropUri: byId.get(id)?.artCropUri ?? null,
      side,
      buy,
      price: buy ? prices?.get(id) ?? null : null,
    };
  };
  return [...fromIds.map((id) => row(id, "from")), ...toIds.map((id) => row(id, "to"))];
}
