"use server";

import { refresh, revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { requestSwitchEnv } from "../../lib/switches/request";
import { deckTokensEnabled } from "../../lib/decks/tokens-flag";
import { requireDeck } from "../../lib/decks/read";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { deckMakesTokenIn, heldPrintingByNumber, writeDeckTokenPrintingIn } from "../../lib/tokens/deck-printings";
import { joinToken, leaveToken, markOwnedOnDeck, unmarkOwned } from "../../lib/tokens/joins";
import { isUuid } from "../../lib/uuid";

export type TokenActionResult = { ok: true } | { ok: false; reason: "off" | "notThisDeck" };

/**
 * The deck page and the Shopping surfaces a token press changes. NOT Home and NOT `/decks`: a token
 * never moves a deck's counts, money, status or the roll-up, so those pages have nothing to retire.
 * Invalidated BEFORE the reply, as `markBought` does, so the row the player pressed is current when
 * the press resolves.
 */
function revalidateTokenSurfaces(deckId: string, accountWide: boolean): void {
  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/decks/shopping");
  // A hand mark is the ACCOUNT's, so every other deck that makes the token draws a different row now.
  // `revalidatePath` does nothing for a dynamic route without its second argument.
  if (accountWide) revalidatePath("/decks/[id]", "page");
}

async function guard(rawDeckId: unknown, rawTokenId: unknown, flag: unknown): Promise<
  { off: true } | { off: false; userId: string; deckId: string; tokenId: string }
> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!deckTokensEnabled(env)) return { off: true };
  // A Server Action argument is a runtime value: `"false"` is a string, and truthy.
  if (typeof flag !== "boolean") throw new Error("bad token input");
  if (typeof rawDeckId !== "string" || typeof rawTokenId !== "string" || !isUuid(rawDeckId) || !isUuid(rawTokenId)) {
    throw new Error("bad token input");
  }
  // Lowercased: Postgres hands uuids back lowercase and every comparison is made on what it returned.
  const deckId = rawDeckId.toLowerCase();
  await requireDeck(deckId, userId);
  return { off: false, userId, deckId, tokenId: rawTokenId.toLowerCase() };
}

/** `Add to Shopping` (joined) and its undo (not joined), for one token of one deck. */
export async function setTokenJoined(deckId: string, tokenOracleId: string, joined: boolean): Promise<TokenActionResult> {
  const g = await guard(deckId, tokenOracleId, joined);
  if (g.off) return { ok: false, reason: "off" };
  if (joined) {
    if ((await joinToken(g.userId, g.deckId, g.tokenId)) === "notThisDeck") return { ok: false, reason: "notThisDeck" };
  } else {
    await leaveToken(g.userId, g.deckId, g.tokenId);
  }
  revalidateTokenSurfaces(g.deckId, false);
  return { ok: true };
}

/** `I have one` (held) and its undo, for one token. Holding it takes it off EVERY deck's Shopping list (the player's joins for it all go in the same write). */
export async function setTokenHeld(deckId: string, tokenOracleId: string, held: boolean): Promise<TokenActionResult> {
  const g = await guard(deckId, tokenOracleId, held);
  if (g.off) return { ok: false, reason: "off" };
  if (held) {
    if ((await markOwnedOnDeck(g.userId, g.deckId, g.tokenId)) === "notThisDeck") return { ok: false, reason: "notThisDeck" };
  } else {
    if ((await unmarkOwned(g.userId, g.deckId, g.tokenId)) === "notThisDeck") return { ok: false, reason: "notThisDeck" };
  }
  revalidateTokenSurfaces(g.deckId, true);
  return { ok: true };
}

export type SetDeckTokenPrintingResult =
  | { ok: true }
  /**
   * `off`: the switch is off. `refused`: the wire input is malformed. `notThisDeck`: no card of the deck makes
   * the token. `notHeld`: the player holds no copy of that printing of it; the picker offers only held ones.
   */
  | { ok: false; reason: "off" | "refused" | "notThisDeck" | "notHeld" };

const COLLECTOR_NUMBER = /^[^\s\p{C}]{0,24}$/u;
const SET_CODE = /^[a-z0-9]{2,8}$/;

/**
 * The printing a deck shows for one of its tokens (token printings TP2), from the card details sheet's picker,
 * which names a printing by set and number as it does for a card. The printing is looked up AMONG THAT TOKEN'S
 * OWN, so a set and number belonging to another token names nothing; `writeDeckTokenPrintingIn` checks it again
 * with the holding. The page refreshes itself, as a card's pick does, so the row and its art move together.
 */
export async function setDeckTokenPrinting(
  rawDeckId: unknown,
  rawTokenId: unknown,
  printing: unknown,
): Promise<SetDeckTokenPrintingResult> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!deckTokensEnabled(env)) return { ok: false, reason: "off" };
  if (typeof rawDeckId !== "string" || typeof rawTokenId !== "string" || !isUuid(rawDeckId) || !isUuid(rawTokenId)) {
    return { ok: false, reason: "refused" };
  }
  if (typeof printing !== "object" || printing === null) return { ok: false, reason: "refused" };
  const { setCode, collectorNumber } = printing as Record<string, unknown>;
  if (typeof setCode !== "string" || typeof collectorNumber !== "string") return { ok: false, reason: "refused" };
  const set = setCode.toLowerCase();
  if (!SET_CODE.test(set) || !COLLECTOR_NUMBER.test(collectorNumber)) return { ok: false, reason: "refused" };
  const deckId = rawDeckId.toLowerCase();
  const tokenId = rawTokenId.toLowerCase();
  await requireDeck(deckId, userId);

  const outcome = await db.transaction(async (tx) => {
    // The deck's row first, as a card's pick takes it, and the membership read under it: a deck edit that
    // removes the token's last maker cannot land between the check and the write.
    await tx.execute(sql`select 1 from decks where id = ${deckId} for update`);
    if (!(await deckMakesTokenIn(tx, deckId, userId, tokenId))) return "notThisDeck" as const;
    const p = await heldPrintingByNumber(tx, userId, tokenId, set, collectorNumber);
    if (!p) return "notHeld" as const;
    const w = await writeDeckTokenPrintingIn(tx, { deckId, userId, tokenOracleId: tokenId, tokenPrintingId: p });
    return w === "ok" ? "ok" as const : "notHeld" as const;
  });
  if (outcome !== "ok") return { ok: false, reason: outcome };
  refresh();
  return { ok: true };
}
