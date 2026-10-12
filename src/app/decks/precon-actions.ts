"use server";

// "Start a deck from this" (handoff `design_handoff_the99_precons`, S1; audit finding 6). Creates
// a DRAFT deck holding the precon's exact list, with counts, through the import's write half: never
// an assumed 99, never a commit. No printing is carried: deck printings picks from the copies the
// reader holds, as for any deck (Q3). A card illegal in Commander is kept, as the import keeps one,
// and the start dialog names it first (orchestrator ruling, 2026-10-11).

import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "../../db";
import { cards, preconCards, precons } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { validateDeckName } from "../../lib/decks/deck-name";
import { canPair, partnerAbility } from "../../lib/decks/partner";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import { writeImportedDeck } from "../../lib/decks/write-imported-deck";
import { PRECON_ARRIVAL_PARAM, PRECON_ARRIVAL_VALUE } from "../../lib/decks/arrival";
import { preconsEnabled } from "../../lib/precons/flag";
import { isCommanderCandidate } from "../../lib/recs/score";

export async function createDeckFromPrecon(fileName: string, rawName: string): Promise<void> {
  if (!preconsEnabled()) throw new Error("precons are off");
  const userId = await requireUserId();
  const name = validateDeckName(rawName);
  if (typeof fileName !== "string" || fileName.length === 0 || fileName.length > 200) throw new Error("precon not found");

  // A twin starts its plain edition's list: the two are the same cards (design call 4).
  const [head] = await db.select({ fileName: precons.fileName, twinOf: precons.twinOf }).from(precons).where(eq(precons.fileName, fileName));
  if (!head) throw new Error("precon not found");
  const source = head.twinOf ?? head.fileName;

  const lines = await db
    .select({ oracleId: preconCards.oracleId, quantity: preconCards.quantity, isCommander: preconCards.isCommander })
    .from(preconCards)
    .where(eq(preconCards.fileName, source))
    // The feed's order, as the open precon reads it, so a pair's lead is the one its page names first.
    .orderBy(preconCards.position);
  const commanderIds = [...new Set(lines.filter((l) => l.isCommander).map((l) => l.oracleId))];
  if (commanderIds.length < 1 || commanderIds.length > 2) throw new Error("precon has no single commander or pair");

  // The same checks `createDeck` makes: the feed is trusted for its list, not for the app's rules.
  const leads = await db.select().from(cards).where(inArray(cards.oracleId, commanderIds));
  for (const id of commanderIds) {
    const c = leads.find((x) => x.oracleId === id);
    if (!c || !c.commanderLegal || !isCommanderCandidate(c)) throw new Error("card is not a legal commander");
  }
  const [a, b] = commanderIds.map((id) => leads.find((x) => x.oracleId === id)!);
  if (b && !canPair(
    { name: a.name, ability: partnerAbility(a.oracleText, a.typeLine) },
    { name: b.name, ability: partnerAbility(b.oracleText, b.typeLine) },
  )) {
    throw new Error("commanders cannot be paired");
  }

  // One row per card: the feed can list one card under two printings.
  const body = new Map<string, number>();
  for (const l of lines) {
    if (l.isCommander) continue;
    body.set(l.oracleId, (body.get(l.oracleId) ?? 0) + l.quantity);
  }

  const deckId = await db.transaction((tx) => writeImportedDeck(tx, {
    userId,
    name,
    commanderOracleId: a.oracleId,
    partnerOracleId: b?.oracleId ?? null,
    cards: [...body].map(([oracleId, quantity]) => ({ oracleId, quantity })),
    builtFromPrecon: source,
  }));
  revalidateClaims(deckId, userId);
  redirect(`/decks/${deckId}?${PRECON_ARRIVAL_PARAM}=${PRECON_ARRIVAL_VALUE}`);
}
