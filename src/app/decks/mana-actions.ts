"use server";

import { requireUserId } from "../../lib/auth";
import { shortCommanderName } from "../../lib/copy/decks-builder";
import { chainArt } from "../../lib/cards/chain-art";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { getDeckDetail, type DeckDetail } from "../../lib/decks/read";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import { manaBalanceEnabled } from "../../lib/tuning/flag";
import { BALANCE_COLORS, type BalanceColor } from "../../lib/tuning/mana-balance";
import { loadManaBalance } from "../../lib/tuning/mana-balance-load";
import { reviewHelp, type ManaHelp } from "../../lib/tuning/mana-help";
import { isManaHelpSummary } from "../../lib/tuning/history";
import { db } from "../../db";
import { deckToolCounts } from "../../db/schema";
import { helpReadWhere } from "../../lib/tuning/mana-help-read";
import { listKeyOf } from "../../lib/tuning/list-key";
import { loadManaHelp } from "../../lib/tuning/mana-help-load";
import { applyTrade, undoTrade } from "../../lib/tuning/mana-trade";
import { manaCountSummary, toClientBalance, type ManaPanelData } from "../../lib/tuning/mana-view";
import { recordToolCount } from "../../lib/tuning/tool-counts";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { isUuid } from "../../lib/uuid";

/** The list the count read (`listKeyOf`). */
function listFingerprintOf(deck: Pick<DeckDetail, "commander" | "partner" | "cards">): string {
  return listKeyOf({ commanderOracleId: deck.commander.oracleId, partnerOracleId: deck.partner?.oracleId ?? null, cards: deck.cards });
}

/**
 * Mana Balance's free count (tier 1): the evidence for one of the reader's decks, read fresh on
 * every open. No credit and no model call. Null when the switch is off, the deck is not the
 * reader's, or a catalog read failed: the panel draws its count-failed state.
 *
 * A count that lands is recorded once per version of the LIST for History (`deck_tool_counts`),
 * keyed on `listFingerprint` of the very deck read it counted, so a record can never file one
 * list's figures under another's key. Non-fatal: History is a record of the count, never a reason
 * it fails to draw.
 */
export async function readManaBalance(deckId: string): Promise<ManaPanelData | null> {
  const userId = await requireUserId();
  if (!manaBalanceEnabled() || !isUuid(deckId)) return null;
  const deck = await getDeckDetail(deckId, userId);
  if (!deck) return null;
  const balance = await loadManaBalance(deck);
  if (!balance) return null;

  await recordToolCount({ deckId, userId, tool: "mana_balance", listFingerprint: listFingerprintOf(deck), readVersion: null, summary: manaCountSummary(balance) });

  const commanders = [deck.commander, ...(deck.partner ? [deck.partner] : [])];
  // Only the names a pattern row draws: they are what a press opens card detail on.
  const byName = new Map([...deck.cards, ...commanders].map((c) => [c.name, c.oracleId] as const));
  const artOf = new Map([...deck.cards, ...commanders].flatMap((c) => (c.imageUri ? [[c.oracleId, c.imageUri] as const] : [])));
  const ids: Record<string, string> = {};
  const art: Record<string, string> = {};
  for (const color of balance.colors) {
    for (const p of color.patterns) for (const c of p.cards) {
      const id = byName.get(c.name);
      if (!id) continue;
      ids[c.name] = id;
      const uri = artOf.get(id);
      if (uri) art[id] = uri;
    }
  }
  return {
    balance: toClientBalance(balance),
    // Every commander, by its front face (`Avatar Aang // Aang` reads `Avatar Aang`): the figure
    // "without" them leaves out each commander row, a partner's included.
    commander: commanders.map((c) => shortCommanderName(c.name.split(" // ")[0])).join(" and "),
    commanders: commanders.length,
    cards: deck.cards.reduce((a, c) => a + c.quantity, 0) + commanders.length,
    ids,
    art,
  };
}

/**
 * "Improve my mana" for one color the player picked: basics that could swap to it and staples the
 * commander's decks run, owned first. Free and asked for; never prefetched. A read in the
 * commander's identity is recorded for History once per list and color (a `mana_help` count, the
 * help as shown), so History can reopen it. A PUBLIC ENDPOINT: any color outside the five, or outside the commander's identity, is
 * refused. Null on a refusal or a failed read; the panel draws its help-failed state.
 */
export async function readManaHelpFor(deckId: string, color: string): Promise<ManaHelp | null> {
  const userId = await requireUserId();
  const read = await helpFor(deckId, color, userId);
  if (!read) return null;
  const { deckId: id, listKey, ...help } = read;
  // `listKey` is the write's precondition and History's key, never sent to the client.
  // The row, its hover preview and the card details it opens draw one printing: the deck's pick, then the
  // one the player owns, else the catalog's (`chainArt`, as Suggested changes and Proposed cuts do).
  const art = await chainArt(userId, id, help.staples.map((s) => s.oracleId));
  const shown = art.size === 0 ? help : { ...help, staples: help.staples.map((s) => (art.has(s.oracleId) ? { ...s, imageUri: art.get(s.oracleId) } : s)) };
  // History's row for this help, once per list and color: it reopens with exactly what was shown here.
  if (shown.inIdentity) {
    await recordToolCount({ deckId: id, userId, tool: "mana_help", listFingerprint: `${listKey}:${shown.color}`, readVersion: null, summary: { color: shown.color, help: shown } });
  }
  return shown;
}

/**
 * A help History reopened (re-review): the help as it was shown, with each of its trades checked
 * against today's help for that color (`reviewHelp`). Null for an id that is not this reader's help
 * read on this deck. An Apply from it goes through `applyManaTrade`, which checks today's help again.
 */
export async function readManaHelpReview(deckId: string, countId: string): Promise<ManaHelp | null> {
  const userId = await requireUserId();
  if (!manaBalanceEnabled() || !isUuid(deckId) || !isUuid(countId)) return null;
  const [row] = await db.select({ summary: deckToolCounts.summary }).from(deckToolCounts)
    .where(helpReadWhere(countId, deckId, userId)).limit(1);
  if (!row || !isManaHelpSummary(row.summary)) return null;
  // Today's help for that color. A color the commander's identity no longer holds offers nothing,
  // so every stored trade is truly stale; a read that FAILED is not a re-check, so it returns null
  // and the door draws its own failure state rather than calling every trade gone.
  const deck = await getDeckDetail(deckId, userId);
  if (!deck) return null;
  const identity = [deck.commander, ...(deck.partner ? [deck.partner] : [])].flatMap((c) => c.colorIdentity);
  if (!identity.includes(row.summary.color)) return reviewHelp(row.summary.help, null);
  const today = await loadManaHelp(deck, userId, row.summary.color as BalanceColor);
  if (!today) return null;
  return reviewHelp(row.summary.help, today);
}

/** Improve my mana for one of the reader's decks, read fresh, with the key of the list it was read from:
 *  null on any refusal or failed read. */
async function helpFor(deckId: string, color: string, userId: string): Promise<(ManaHelp & { deckId: string; listKey: string }) | null> {
  if (!manaBalanceEnabled() || !isUuid(deckId) || !(BALANCE_COLORS as readonly string[]).includes(color)) return null;
  const deck = await getDeckDetail(deckId, userId);
  if (!deck) return null;
  const identity = [deck.commander, ...(deck.partner ? [deck.partner] : [])].flatMap((c) => c.colorIdentity);
  if (!identity.includes(color)) return null;
  const help = await loadManaHelp(deck, userId, color as BalanceColor);
  return help ? { ...help, deckId: deck.id, listKey: listFingerprintOf(deck) } : null;
}

export type ManaTradeResult = { ok: true; applyId: string } | { ok: false; message: string };

/**
 * Apply one of Improve my mana's trades: one copy of the card it names out (a basic, an off-plan land or a
 * cut the deck's tuning named), one copy of the staple in, into the deck's list, with Undo. A PUBLIC
 * ENDPOINT, so the client names only the color and the staple, and the trade is found in a fresh read of
 * the help for that color: the card it cuts is the server's, never the caller's. `outId` is the card the
 * press named, an untrusted PRECONDITION and never the authority: a fresh offer that would cut a different
 * card is refused, so the trade made is the one the player read.
 * The read is made before the write and keyed on its list (`listKeyOf`); the write re-reads that key under
 * the deck lock and refuses when the list moved between, so a trade the deck being written no longer
 * offers is never made, and the lock is held only for the write.
 */
export async function applyManaTrade(deckId: string, color: string, stapleOracleId: string, outId: string): Promise<ManaTradeResult> {
  const refused = { ok: false as const, message: deckTuningCopy.card.applyRefused };
  const userId = await requireUserId();
  if (!isUuid(stapleOracleId) || !isUuid(outId)) return refused;
  const help = await helpFor(deckId, color, userId);
  const trade = help?.trades.find((t) => t.staple.oracleId === stapleOracleId);
  if (!help || !trade || trade.out.id !== outId) return refused;
  const applyId = await applyTrade(help.deckId, userId, { cutOracleId: trade.out.id, addOracleId: trade.staple.oracleId }, help.listKey);
  if (!applyId) return refused;
  revalidateClaims(deckId, userId);
  return { ok: true, applyId };
}

/** Undo an applied trade: the deck exactly as the apply found it, refused over a deck that has moved since. */
export async function undoManaTrade(applyId: string): Promise<DeckMutationResult> {
  const refused = { ok: false as const, message: deckTuningCopy.card.undoRefused };
  const userId = await requireUserId();
  if (!manaBalanceEnabled() || !isUuid(applyId)) return refused;
  const deckId = await undoTrade(applyId, userId);
  if (!deckId) return refused;
  revalidateClaims(deckId, userId);
  return { ok: true };
}
