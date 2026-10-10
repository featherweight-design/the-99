"use server";

import { refresh } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { requireDeck } from "../../lib/decks/read";
import { proxiedMembership } from "../../lib/decks/proxies";
import { deckPrintingsEnabled } from "../../lib/decks/printings-flag";
import { readDeckPrintings, type DeckPrinting } from "../../lib/decks/printings";

export type SetDeckPrintingResult =
  | { ok: true; printing: DeckPrinting }
  /**
   * `off`: the switch is off. `refused`: the wire input is malformed. `notInDeck`: the card is not
   * this deck's (a Consider tile or a search result opens under the same provider). `notHeld`: the
   * player does not hold that printing; a pick is always an owned printing.
   */
  | { ok: false; reason: "off" | "refused" | "notInDeck" | "notHeld" };

/**
 * A collector number as the catalog stores it ("31", "12a", "★", "a1_2007", ""): bounded, with no
 * whitespace or control characters. Never trusted beyond that: it is bound as a parameter, and the
 * ownership check is what decides whether it names a printing the player holds.
 */
const COLLECTOR_NUMBER = /^[^\s\p{C}]{0,24}$/u;
const SET_CODE = /^[a-z0-9]{2,8}$/;

/**
 * Choose the printing this deck shows for one card (deck printings, plan PR 1).
 *
 * Not a deck edit (handoff ruling 1): no commit, no pending state, no History line, no `touchDeck`.
 * It takes effect at once, like `setCardProxied`, whose wire this follows.
 *
 * THE LOCK IS LOAD-BEARING, for the reason it is in `setCardProxied`: this write against a
 * concurrent removal, whose `pruneOrphanProxies` also prunes picks. The deck row is locked before
 * the membership check, in the order every other deck write uses, so the validate-upsert pair
 * cannot straddle a prune.
 *
 * MEMBERSHIP is `proxiedMembership`, commander-inclusive: a commander is not a `deck_cards` row and
 * takes a pick in its own details. OWNERSHIP of the exact printing is checked too, because a pick is
 * always a printing the player holds.
 *
 * Nothing is revalidated. The deck page moves the one row from this answer; Home and `/decks` read
 * deck tiles' commander art through the list cache, whose stamp the `user_data_touch` trigger on
 * `deck_printings` moves at commit.
 */
export async function setDeckPrinting(
  deckId: string,
  oracleId: string,
  printing: { setCode: string; collectorNumber: string },
): Promise<SetDeckPrintingResult> {
  const userId = await requireUserId();
  if (!deckPrintingsEnabled()) return { ok: false, reason: "off" };
  if (!isUuid(deckId) || !isUuid(oracleId)) return { ok: false, reason: "refused" };
  if (typeof printing !== "object" || printing === null) return { ok: false, reason: "refused" };
  const { setCode: rawSet, collectorNumber } = printing;
  if (typeof rawSet !== "string" || typeof collectorNumber !== "string") return { ok: false, reason: "refused" };
  // Stored lowercase everywhere; the picker hands back the display form.
  const setCode = rawSet.toLowerCase();
  if (!SET_CODE.test(setCode) || !COLLECTOR_NUMBER.test(collectorNumber)) return { ok: false, reason: "refused" };
  await requireDeck(deckId, userId);

  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from decks where id = ${deckId} for update`);
    const { rows: [member] } = await tx.execute<{ held: boolean }>(
      sql`select ${proxiedMembership(deckId, oracleId)} as held`,
    );
    if (!member?.held) return "notInDeck" as const;

    const { rows: [owned] } = await tx.execute<{ held: boolean }>(sql`
      select exists (
        select 1 from collection_items ci
        where ci.user_id = ${userId}
          and ci.oracle_id = ${oracleId}
          -- lower() on the stored side too: older holdings carry an uppercase set code, and the
          -- Collection's resolver and setCardArtPreference both accept them.
          and lower(ci.set_code) = ${setCode}
          and ci.collector_number = ${collectorNumber}
          and ci.quantity > 0
      ) as held
    `);
    if (!owned?.held) return "notHeld" as const;

    await tx.execute(sql`
      insert into deck_printings (deck_id, oracle_id, set_code, collector_number)
      values (${deckId}, ${oracleId}, ${setCode}, ${collectorNumber})
      on conflict (deck_id, oracle_id) do update
        set set_code = excluded.set_code,
            collector_number = excluded.collector_number,
            updated_at = now()
    `);
    return "ok" as const;
  });

  if (outcome !== "ok") return { ok: false, reason: outcome };
  // Every surface on the deck page moves with a pick (the rows, the commanders, the prices and
  // the Money card), and the page is not cached, so a re-render is the one way to move them all
  // together. The modal keeps its own optimistic pick until the refreshed page arrives.
  refresh();
  // The answer the deck now shows, read through the same chain every surface reads, so the client
  // patches its row with exactly what a reload would draw.
  const { printings } = await readDeckPrintings(userId, deckId, [oracleId], { usePicks: true });
  const resolved = printings.get(oracleId);
  // Unreachable while the player holds the printing just checked; a concurrent removal in between
  // is the one way here, and then the card resolves down the chain like any lapsed pick.
  if (!resolved) return { ok: false, reason: "notHeld" };
  return { ok: true, printing: resolved };
}
