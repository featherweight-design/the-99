"use server";
// The export dialog's data for one deck, read when the dialog opens from the /decks tile menu. Never part of
// /decks' cached payload: a decklist per tile is the weight that page was cut to shed, and only one deck is
// ever exported at a time. Owner-scoped by the deck page's own read (`getDeckDetail` joins `decks` on the
// reader), so another player's deck id reads as no deck.
import { requireUserId } from "../../lib/auth";
import { requestSwitchEnv } from "../../lib/switches/request";
import { loadAvailability } from "../../lib/decks/availability-query";
import { getDeckDetail } from "../../lib/decks/read";
import { deckExportData, type DeckExportData } from "../../lib/decks/export-data";
import { isUuid } from "../../lib/uuid";

export type DeckExportRead = ({ ok: true; deckName: string } & DeckExportData) | { ok: false };

export async function readDeckExport(deckId: string): Promise<DeckExportRead> {
  const userId = await requireUserId();
  if (!isUuid(deckId)) return { ok: false };
  const env = await requestSwitchEnv(userId);
  try {
    // The deck page's own two reads, in its order: the claim model from this deck's vantage, then the detail
    // that reads ownership and spoken-for copies off it, so the Shopping tab bills what the deck page bills.
    const availability = loadAvailability(userId, { excludeDeckId: deckId, env }).catch(() => null);
    const detail = await getDeckDetail(deckId, userId, availability, env);
    if (!detail) return { ok: false };
    return { ok: true, deckName: detail.name, ...deckExportData(detail.commander, detail.partner, detail.cards) };
  } catch {
    return { ok: false };
  }
}
