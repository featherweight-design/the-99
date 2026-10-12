"use server";

import { requireUserId } from "../../lib/auth";
import { shortCommanderName } from "../../lib/copy/decks-builder";
import { getDeckDetail, type DeckDetail } from "../../lib/decks/read";
import { listFingerprint } from "../../lib/profile/fingerprint";
import { manaBalanceEnabled } from "../../lib/tuning/flag";
import { BALANCE_COLORS, type BalanceColor } from "../../lib/tuning/mana-balance";
import { loadManaBalance } from "../../lib/tuning/mana-balance-load";
import type { ManaHelp } from "../../lib/tuning/mana-help";
import { loadManaHelp } from "../../lib/tuning/mana-help-load";
import { manaCountSummary, toClientBalance, type ManaPanelData } from "../../lib/tuning/mana-view";
import { recordToolCount } from "../../lib/tuning/tool-counts";
import { isUuid } from "../../lib/uuid";

/** The list the count read, as `listFingerprint` keys a list: copies summed per card, so the key
 *  depends on the list and never on how its rows are split. */
function listFingerprintOf(deck: Pick<DeckDetail, "commander" | "partner" | "cards">): string {
  const copies = new Map<string, number>();
  for (const c of deck.cards) copies.set(c.oracleId, (copies.get(c.oracleId) ?? 0) + c.quantity);
  return listFingerprint({
    commanderOracleId: deck.commander.oracleId,
    partnerOracleId: deck.partner?.oracleId ?? null,
    cards: [...copies].map(([oracleId, quantity]) => ({ oracleId, quantity })),
  });
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
  const ids: Record<string, string> = {};
  for (const color of balance.colors) {
    for (const p of color.patterns) for (const c of p.cards) {
      const id = byName.get(c.name);
      if (id) ids[c.name] = id;
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
  };
}

/**
 * "Improve my mana" for one color the player picked: basics that could swap to it and staples the
 * commander's decks run, owned first. Free and asked for; never prefetched, never recorded in
 * History. A PUBLIC ENDPOINT: any color outside the five, or outside the commander's identity, is
 * refused. Null on a refusal or a failed read; the panel draws its help-failed state.
 */
export async function readManaHelpFor(deckId: string, color: string): Promise<ManaHelp | null> {
  const userId = await requireUserId();
  if (!manaBalanceEnabled() || !isUuid(deckId) || !(BALANCE_COLORS as readonly string[]).includes(color)) return null;
  const deck = await getDeckDetail(deckId, userId);
  if (!deck) return null;
  const identity = [deck.commander, ...(deck.partner ? [deck.partner] : [])].flatMap((c) => c.colorIdentity);
  if (!identity.includes(color)) return null;
  return loadManaHelp(deck, userId, color as BalanceColor);
}
