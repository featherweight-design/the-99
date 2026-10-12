"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { deckTokensEnabled } from "../../lib/decks/tokens-flag";
import { requireDeck } from "../../lib/decks/read";
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
  if (!deckTokensEnabled()) return { off: true };
  const userId = await requireUserId();
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

/** `I have one` (held) and its undo, for one token. Holding it takes it off this deck's Shopping list. */
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
