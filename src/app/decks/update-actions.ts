"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { cards, collectionItems, deckCards, deckUnresolvedRows, decks } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { loadMatchInputs } from "../../lib/collection/import";
import type { DetailedCatalogCard } from "../../lib/collection/match";
import { buildDeckImport, type ImportNote } from "../../lib/decks/import";
import { claimSurfaces } from "../../lib/decks/revalidate";
import { planDeckUpdate, type DeckUpdatePlan, type DeckUpdateRow } from "../../lib/decks/update";
import {
  deckImportMaxBytes,
  deckImportTooLargeMessage,
  type DeckImportSource,
} from "../../lib/upload-limits";

const INSERT_BATCH = 500;

export type UpdateDeckInput = {
  deckId: string;
  /** The list exactly as the player gave it — pasted text or file text. */
  text: string;
  source: DeckImportSource;
};

/** A row of the `in` group, widened with the fact the pipeline cannot know. */
export type DeckUpdateInRow = DeckUpdateRow & { owned: boolean };

export type DeckUpdatePreview = {
  ok: true;
  deckName: string;
  /** The body count the deck stands at now, which the provenance line prints. */
  built: number;
  lineCount: number;
  notes: ImportNote[];
  /** Rows this deck is carrying now, whose count the unnamed group's copy prints. */
  existingUnresolvedCount: number;
  out: DeckUpdateInRow[];
  in: DeckUpdateInRow[];
  unchanged: DeckUpdateRow[];
  /** Copies the silently-reconciled quantities add or drop, summed. Nine Islands
   *  against a deck's twelve is -3, and the landing figure has to carry it: that
   *  figure is compared to 99, so it is the one number that cannot be off. The
   *  group counts stay row counts, which is what the diff's chips report. */
  unchangedDelta: number;
  unresolved: DeckUpdatePlan["unresolved"];
  handAddedOut: number;
  noChange: boolean;
};

export type DeckUpdateResult =
  | DeckUpdatePreview
  /** State 13. The list declares a commander that is not this deck's. */
  | { ok: false; reason: "commanderConflict"; listCommander: string; deckCommander: string }
  /** State 10, reused verbatim from the import flow. */
  | { ok: false; reason: "noRows"; notes: ImportNote[] }
  /** State 9, likewise. */
  | { ok: false; reason: "noneMatched"; lineCount: number; notes: ImportNote[] };

/** The deck, as both the preview and the apply need it. Throws rather than
 *  returning a reason: a deck the caller does not own is not a state the flow
 *  draws, it is a request that should never have been made. */
async function loadDeck(userId: string, deckId: string) {
  const [deck] = await db
    .select({
      id: decks.id,
      name: decks.name,
      commanderOracleId: decks.commanderOracleId,
    })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck) throw new Error("deck not found");

  const rows = await db
    .select({
      oracleId: deckCards.oracleId,
      quantity: deckCards.quantity,
      auto: deckCards.auto,
      name: cards.name,
      typeLine: cards.typeLine,
    })
    .from(deckCards)
    .innerJoin(cards, eq(cards.oracleId, deckCards.oracleId))
    .where(eq(deckCards.deckId, deckId));

  return { deck, rows };
}

/** One pass over the detailed catalog, handed to the planner as a lookup. Built
 *  here rather than inside the planner so that module stays pure. */
function cardLookup(catalog: DetailedCatalogCard[]) {
  const byId = new Map(catalog.map((c) => [c.oracleId, c]));
  return (oracleId: string) => {
    const card = byId.get(oracleId);
    return { name: card?.name ?? "", typeLine: card?.typeLine ?? "" };
  };
}

/** Parses the list and plans the update against the deck, writing nothing.
 *
 *  The plan this returns is for drawing only. `updateDeckFromList` re-parses and
 *  re-plans from the same text rather than accepting this one back: a
 *  client-supplied plan would let a crafted request delete an arbitrary set of a
 *  deck's cards. */
export async function previewDeckUpdate(input: UpdateDeckInput): Promise<DeckUpdateResult> {
  const userId = await requireUserId();
  const maxBytes = deckImportMaxBytes(input.source);
  if (Buffer.byteLength(input.text, "utf8") > maxBytes) {
    throw new Error(deckImportTooLargeMessage(input.source));
  }

  const { deck, rows } = await loadDeck(userId, input.deckId);
  const { catalog, indexes } = await loadMatchInputs([], { detailed: true });
  const parsed = buildDeckImport({ text: input.text, catalog, indexes });

  if (parsed.lineCount === 0) return { ok: false, reason: "noRows", notes: parsed.notes };
  // The same guard the import uses, and for the same reason: every line that
  // fails to match becomes an unresolved row, so "nothing matched" is an empty
  // `cards` beside a full `unresolved`, never two empty arrays.
  if (parsed.cards.length === 0 && !parsed.declaredCommander) {
    return { ok: false, reason: "noneMatched", lineCount: parsed.lineCount, notes: parsed.notes };
  }

  const plan = planDeckUpdate({
    parsed,
    deckCards: rows,
    commanderOracleId: deck.commanderOracleId,
    cardFor: cardLookup(catalog),
  });

  if ("listCommander" in plan) {
    const [commander] = await db
      .select({ name: cards.name })
      .from(cards)
      .where(eq(cards.oracleId, deck.commanderOracleId));
    return {
      ok: false,
      reason: "commanderConflict",
      listCommander: plan.listCommander,
      deckCommander: commander?.name ?? "",
    };
  }

  const existingUnresolved = await db
    .select({ id: deckUnresolvedRows.id })
    .from(deckUnresolvedRows)
    .where(eq(deckUnresolvedRows.deckId, input.deckId));

  return {
    ok: true,
    deckName: deck.name,
    built: rows.reduce((n, r) => n + r.quantity, 0),
    lineCount: parsed.lineCount,
    notes: parsed.notes,
    existingUnresolvedCount: existingUnresolved.length,
    out: await withOwnership(userId, plan.out),
    in: await withOwnership(userId, plan.in),
    unchanged: plan.unchanged,
    unchangedDelta: quantityDelta(rows, plan.unchanged),
    unresolved: plan.unresolved,
    handAddedOut: plan.handAddedOut,
    noChange: plan.noChange,
  };
}

/** How many copies the reconciled quantities move the deck by. `unchanged` rows
 *  carry the quantity the list asks for, so this is that against what the deck
 *  holds now — the change the diff makes without narrating it. */
function quantityDelta(
  current: { oracleId: string; quantity: number }[],
  unchanged: DeckUpdateRow[],
): number {
  const now = new Map(current.map((r) => [r.oracleId, r.quantity]));
  return unchanged.reduce((n, r) => n + (r.quantity - (now.get(r.oracleId) ?? 0)), 0);
}

/** Ownership is a fact about a user, so it is resolved here rather than in the
 *  pure planner — the same split `importDeck`'s commander picker makes. */
async function withOwnership(userId: string, rows: DeckUpdateRow[]): Promise<DeckUpdateInRow[]> {
  if (rows.length === 0) return [];
  const owned = await db
    .selectDistinct({ oracleId: collectionItems.oracleId })
    .from(collectionItems)
    .where(
      and(
        eq(collectionItems.userId, userId),
        inArray(collectionItems.oracleId, rows.map((r) => r.oracleId)),
      ),
    );
  const have = new Set(owned.map((r) => r.oracleId));
  return rows.map((r) => ({ ...r, owned: have.has(r.oracleId) }));
}

export type ApplyDeckUpdateInput = UpdateDeckInput & {
  /** Oracle ids of removals the player chose to keep. The only thing the client
   *  contributes to the write — everything else is re-derived from `text`. */
  keep: string[];
};

export type ApplyDeckUpdateResult = { in: number; out: number; kept: number };

/**
 * Applies an update in one transaction. The refusal copy says "your deck is
 * exactly as it was", and the transaction is what makes that sentence sayable.
 *
 * The plan is recomputed here from `text` rather than accepted from the client.
 * The diff the player saw and the diff this writes are computed by the same pure
 * function over the same input, so they agree; but trusting the client's copy
 * would make the `out` list a request parameter, and a crafted one could delete
 * any card in the deck.
 */
export async function updateDeckFromList(
  input: ApplyDeckUpdateInput,
): Promise<ApplyDeckUpdateResult> {
  const userId = await requireUserId();
  const maxBytes = deckImportMaxBytes(input.source);
  if (Buffer.byteLength(input.text, "utf8") > maxBytes) {
    throw new Error(deckImportTooLargeMessage(input.source));
  }

  const { deck, rows } = await loadDeck(userId, input.deckId);
  const { catalog, indexes } = await loadMatchInputs([], { detailed: true });
  const parsed = buildDeckImport({ text: input.text, catalog, indexes });
  const plan = planDeckUpdate({
    parsed,
    deckCards: rows,
    commanderOracleId: deck.commanderOracleId,
    // The apply path draws nothing, so the names it would look up are unused.
    cardFor: () => ({ name: "", typeLine: "" }),
  });
  if ("listCommander" in plan) throw new Error("list names a different commander");

  const keep = new Set(input.keep);
  const removing = plan.out.filter((r) => !keep.has(r.oracleId));
  const kept = plan.out.length - removing.length;

  await db.transaction(async (tx) => {
    if (removing.length > 0) {
      await tx.delete(deckCards).where(
        and(
          eq(deckCards.deckId, input.deckId),
          inArray(deckCards.oracleId, removing.map((r) => r.oracleId)),
        ),
      );
    }

    for (let i = 0; i < plan.in.length; i += INSERT_BATCH) {
      await tx.insert(deckCards).values(
        plan.in.slice(i, i + INSERT_BATCH).map((r) => ({
          deckId: input.deckId,
          oracleId: r.oracleId,
          quantity: r.quantity,
        })),
      );
    }

    // A card the list names is a card the player chose, so it stops being the
    // app's. This is what makes `Clear all auto` unable to take it afterwards.
    const named = plan.unchanged.map((r) => r.oracleId);
    if (named.length > 0) {
      await tx
        .update(deckCards)
        .set({ auto: false })
        .where(and(eq(deckCards.deckId, input.deckId), inArray(deckCards.oracleId, named)));
    }

    // The quantities the diff reconciled silently. Without this the list does
    // not become the deck: nine Islands against the deck's twelve would leave
    // twelve, and the landing figure the player was shown would be a lie.
    // Grouped by target because the distinct quantities in a real list are the
    // singleton one and a handful of basic counts, never a row each.
    const now = new Map(rows.map((r) => [r.oracleId, r.quantity]));
    const byQuantity = new Map<number, string[]>();
    for (const r of plan.unchanged) {
      if (now.get(r.oracleId) === r.quantity) continue;
      const ids = byQuantity.get(r.quantity);
      if (ids) ids.push(r.oracleId);
      else byQuantity.set(r.quantity, [r.oracleId]);
    }
    for (const [quantity, ids] of byQuantity) {
      await tx
        .update(deckCards)
        .set({ quantity })
        .where(and(eq(deckCards.deckId, input.deckId), inArray(deckCards.oracleId, ids)));
    }

    // Replaced wholesale rather than merged: the list is the deck now, so a line
    // the new list does not carry is not a line the deck is still missing.
    await tx.delete(deckUnresolvedRows).where(eq(deckUnresolvedRows.deckId, input.deckId));
    for (let i = 0; i < plan.unresolved.length; i += INSERT_BATCH) {
      await tx.insert(deckUnresolvedRows).values(
        plan.unresolved.slice(i, i + INSERT_BATCH).map((r) => ({
          deckId: input.deckId,
          rawName: r.rawName,
          quantity: r.quantity,
          sourceLine: r.sourceLine,
        })),
      );
    }
  });

  for (const path of claimSurfaces(input.deckId)) revalidatePath(path);
  return { in: plan.in.length, out: removing.length, kept };
}
