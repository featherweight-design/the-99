"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, collectionItems, deckCards, deckUnresolvedRows, decks } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { loadMatchInputs } from "../../lib/collection/import";
import type { DetailedCatalogCard } from "../../lib/collection/match";
import type { Availability } from "../../lib/decks/availability";
import { loadAvailability } from "../../lib/decks/availability-query";
import { buildDeckImport, type ImportNote } from "../../lib/decks/import";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import { planDeckUpdate, type DeckUpdatePlan, type DeckUpdateRow } from "../../lib/decks/update";
import { touchDeck } from "../../lib/decks/touch";
import { newestVersion } from "../../lib/decks/versions";
import { pruneOrphanProxies } from "../../lib/decks/prune-proxies";
import { liveLockedIds, lockedOracleIds, pruneOrphanLocks } from "../../lib/decks/locks";
import { neverCutEnabled } from "../../lib/decks/never-cut-flag";
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

/** A row of either changed group — `out` as well as `in` — widened with the
 *  facts the pipeline cannot know. `availability` is null both for a card the
 *  player does not own and for every row when the rollup fails; in neither case
 *  is an availability marker drawn, though an unowned row draws the buy tag in
 *  that slot instead. A card nothing competes for is a different thing again:
 *  a real rollup, which the marker itself renders as nothing. */
export type DeckUpdateChangedRow = DeckUpdateRow & {
  owned: boolean;
  availability: Availability | null;
};

export type DeckUpdatePreview = {
  ok: true;
  deckName: string;
  /** The body count the deck stands at now, which the provenance line prints. */
  built: number;
  lineCount: number;
  notes: ImportNote[];
  /** Rows this deck is carrying now, whose count the unnamed group's copy prints. */
  existingUnresolvedCount: number;
  out: DeckUpdateChangedRow[];
  /**
   * The `out` rows the player has LOCKED (Locked, never cut). The review starts them KEPT (Hugh,
   * 2026-09-25, Q2): a locked card stays unless the player unticks it, and one they untick is
   * removed and its lock goes dormant like any other removal. Empty while `NEVER_CUT_ENABLED` is off.
   */
  lockedOut: string[];
  in: DeckUpdateChangedRow[];
  unchanged: DeckUpdateRow[];
  /** The cards the list keeps but asks for a different number of, straight from
   *  the planner. The landing figure has to carry them: it is compared to 99,
   *  so it is the one number that cannot be off, while the group counts stay
   *  row counts. */
  recounted: DeckUpdatePlan["recounted"];
  unresolved: DeckUpdatePlan["unresolved"];
  noChange: boolean;
  /** The version the deck is sleeved as, or null for a brew. A versioned deck's
   *  paste lands in the DRAFT and nothing it says about the deck's claims is true
   *  until the player commits, so the preview has to say which version it is
   *  drafting against; a brew has nothing to say and renders no notice. */
  version: number | null;
};

export type DeckUpdateResult =
  | DeckUpdatePreview
  /** State 13. The list declares a commander that is not this deck's. */
  | { ok: false; reason: "commanderConflict"; listCommander: string; deckCommander: string }
  /** State 10, reused verbatim from the import flow. */
  | { ok: false; reason: "noRows"; notes: ImportNote[] }
  /** State 9, likewise. */
  | { ok: false; reason: "noneMatched"; lineCount: number; notes: ImportNote[] };

/** The deck row itself, and the ownership check. Throws rather than returning a
 *  reason: a deck the caller does not own is not a state the flow draws, it is a
 *  request that should never have been made. */
async function loadDeckMeta(userId: string, deckId: string) {
  const [deck] = await db
    .select({
      id: decks.id,
      name: decks.name,
      commanderOracleId: decks.commanderOracleId,
      // The pair's second half: the planner refuses a list declaring a
      // different one, and drops this deck's own from the 99.
      partnerOracleId: decks.partnerOracleId,
    })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck) throw new Error("deck not found");
  return deck;
}

/** The deck and its cards, as the preview needs them. The apply path calls
 *  `loadDeckMeta` alone: it re-reads the cards inside the transaction under the
 *  row lock, so a read out here would be a join it throws away. */
async function loadDeck(userId: string, deckId: string) {
  const deck = await loadDeckMeta(userId, deckId);

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

  const existingUnresolved = await db
    .select({ rawName: deckUnresolvedRows.rawName, quantity: deckUnresolvedRows.quantity })
    .from(deckUnresolvedRows)
    .where(eq(deckUnresolvedRows.deckId, input.deckId));

  const plan = planDeckUpdate({
    parsed,
    deckCards: rows,
    commanderOracleId: deck.commanderOracleId,
    partnerOracleId: deck.partnerOracleId,
    deckUnresolved: existingUnresolved,
    cardFor: cardLookup(catalog),
  });

  if ("listCommander" in plan) {
    // The deck's own half that the declaration disagrees with, not always the
    // primary: a list naming a different PARTNER is refused over the partner,
    // and naming the primary here would describe the wrong disagreement.
    const [commander] = await db
      .select({ name: cards.name })
      .from(cards)
      .where(eq(cards.oracleId, plan.deckOracleId));
    return {
      ok: false,
      reason: "commanderConflict",
      listCommander: plan.listCommander,
      deckCommander: commander?.name ?? "",
    };
  }

  const widened = await withFacts(userId, input.deckId, { out: plan.out, in: plan.in });
  const version = await newestVersion(input.deckId);
  // FAIL CLOSED, never the display read's empty set: this read decides what the review starts KEPT,
  // and a locked card that silently starts unticked is deleted by an Apply nobody touched. A failed
  // read fails the preview, which the player can retry; it never offers a destructive default.
  const locked = neverCutEnabled() && plan.out.length > 0
    ? await lockedOracleIds(input.deckId, userId, "throw")
    : new Set<string>();

  return {
    ok: true,
    deckName: deck.name,
    built: rows.reduce((n, r) => n + r.quantity, 0),
    lineCount: parsed.lineCount,
    notes: parsed.notes,
    existingUnresolvedCount: existingUnresolved.length,
    out: widened.out,
    lockedOut: widened.out.filter((r) => locked.has(r.oracleId)).map((r) => r.oracleId),
    in: widened.in,
    unchanged: plan.unchanged,
    recounted: plan.recounted,
    unresolved: plan.unresolved,
    noChange: plan.noChange,
    version: version?.number ?? null,
  };
}

/**
 * Ownership and availability are facts about a user, so they are resolved here
 * rather than in the pure planner — the same split `importDeck`'s commander
 * picker makes.
 *
 * Both groups are widened in one pass rather than one call each, because both
 * facts cost a query and neither is per-group: a card leaving and a card
 * arriving are looked up the same way.
 *
 * `excludeDeckId` is this deck, as on the decklist. The player is standing in
 * the deck they are updating, so its own claim is not competition — without the
 * exclusion every row leaving the deck would report the deck it is leaving.
 */
async function withFacts(
  userId: string,
  deckId: string,
  groups: { out: DeckUpdateRow[]; in: DeckUpdateRow[] },
): Promise<{ out: DeckUpdateChangedRow[]; in: DeckUpdateChangedRow[] }> {
  // Distinct ids, not rows: a basic land stacks, and nothing stops a plan from
  // naming the same card in both groups. Both reads below answer per card, so a
  // repeat only widens the bind list.
  const oracleIds = [...new Set([...groups.out, ...groups.in].map((r) => r.oracleId))];
  if (oracleIds.length === 0) return { out: [], in: [] };

  const ownedRows = await db
    .selectDistinct({ oracleId: collectionItems.oracleId })
    .from(collectionItems)
    .where(
      and(eq(collectionItems.userId, userId), inArray(collectionItems.oracleId, oracleIds)),
    );
  const have = new Set(ownedRows.map((r) => r.oracleId));

  // Owned only: the rollup is driven by the collection and cannot return a card
  // the player does not own. A failed rollup leaves every row markerless rather
  // than failing the preview, which is the same call the decklist makes.
  const ownedIds = oracleIds.filter((id) => have.has(id));
  const availability =
    ownedIds.length > 0
      ? await loadAvailability(userId, { excludeDeckId: deckId, oracleIds: ownedIds }).catch(
          () => null,
        )
      : null;

  const widen = (group: DeckUpdateRow[]): DeckUpdateChangedRow[] =>
    group.map((r) => ({
      ...r,
      owned: have.has(r.oracleId),
      availability: availability?.get(r.oracleId) ?? null,
    }));

  return { out: widen(groups.out), in: widen(groups.in) };
}

export type ApplyDeckUpdateInput = UpdateDeckInput & {
  /** Oracle ids of removals the player chose to keep. The only thing the client
   *  contributes to the write — everything else is re-derived from `text`. */
  keep: string[];
  /** The locked cards the preview SHOWED (its `lockedOut`). The apply re-reads the locks under the
   *  deck row lock and refuses when a card it would remove is locked now but was not shown locked:
   *  a card locked in another tab after the preview must not leave through an untouched Apply. A
   *  shown-locked card the player unticked is theirs to remove. */
  lockedSeen?: string[];
};

export type ApplyDeckUpdateResult = {
  in: number;
  out: number;
  kept: number;
  /** The deck has a version, so the caller declines the arrival param. */
  versioned: boolean;
};

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

  const deck = await loadDeckMeta(userId, input.deckId);
  const { catalog, indexes } = await loadMatchInputs([], { detailed: true });
  const parsed = buildDeckImport({ text: input.text, catalog, indexes });

  // The same two guards the preview applies, repeated rather than assumed. A
  // server action is callable directly, so reaching here means nothing about
  // having passed through the diff — and a list that parsed to nothing plans
  // every card in the deck as a removal. The preview turns those parses into
  // screens; here they are simply refused, and the refusal copy the player sees
  // ("your deck is exactly as it was") stays true.
  if (parsed.lineCount === 0) throw new Error("list had no lines");
  if (parsed.cards.length === 0 && !parsed.declaredCommander) {
    throw new Error("no line in the list matched a card");
  }

  const keep = new Set(input.keep);

  const { plan, removing, kept, versioned } = await db.transaction(async (tx) => {
    // Lock the deck row and plan inside it, the way every other deck mutation
    // in this file's neighbour does. The plan is a statement about the deck as
    // it stands, and its `out` group is a delete list: a card added by hand in
    // another tab between the read and the write is a card the list cannot have
    // named, so an unlocked plan would delete a card nobody was shown.
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${input.deckId} for update`);
    const rows = await tx
      .select({
        oracleId: deckCards.oracleId,
        quantity: deckCards.quantity,
        auto: deckCards.auto,
        name: cards.name,
        typeLine: cards.typeLine,
      })
      .from(deckCards)
      .innerJoin(cards, eq(cards.oracleId, deckCards.oracleId))
      .where(eq(deckCards.deckId, input.deckId));

    const plan = planDeckUpdate({
      parsed,
      deckCards: rows,
      commanderOracleId: deck.commanderOracleId,
      partnerOracleId: deck.partnerOracleId,
      // Only `noChange` reads this, and the apply path does not: it replaces the
      // unnamed rows unconditionally a few lines below. Passing nothing keeps
      // the write off a query it would not consult.
      deckUnresolved: [],
      // The apply path draws nothing, so the names it would look up are unused.
      cardFor: () => ({ name: "", typeLine: "" }),
    });
    if ("listCommander" in plan) throw new Error("list names a different commander");

    const removing = plan.out.filter((r) => !keep.has(r.oracleId));
    const kept = plan.out.length - removing.length;

    // Locked (never cut), Hugh's Q2: re-checked here, under the deck row lock taken above, never
    // trusted to the preview. A removal of a card locked NOW that the preview did not show locked
    // is refused, and the whole update with it: the refusal leaves the deck exactly as it was.
    if (neverCutEnabled() && removing.length > 0) {
      const seen = new Set(input.lockedSeen ?? []);
      const lockedNow = await liveLockedIds(tx, input.deckId);
      if (removing.some((r) => lockedNow.has(r.oracleId) && !seen.has(r.oracleId))) {
        throw new Error("a card was locked after the preview");
      }
    }

    if (removing.length > 0) {
      await tx.delete(deckCards).where(
        and(
          eq(deckCards.deckId, input.deckId),
          inArray(deckCards.oracleId, removing.map((r) => r.oracleId)),
        ),
      );
      await pruneOrphanProxies(tx, input.deckId);
      await pruneOrphanLocks(tx, input.deckId);
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
    let unclaimed = 0;
    if (named.length > 0) {
      // Narrowed to the rows still marked `auto`, and read back. Reapplying a
      // list to a deck whose cards the player has already claimed changes
      // neither the contents nor the provenance, and an unnarrowed UPDATE would
      // report work done on every row it rewrote to the value it already held —
      // which is what the stamp below would then claim.
      const rows = await tx
        .update(deckCards)
        .set({ auto: false })
        .where(and(
          eq(deckCards.deckId, input.deckId),
          inArray(deckCards.oracleId, named),
          eq(deckCards.auto, true),
        ))
        .returning({ oracleId: deckCards.oracleId });
      unclaimed = rows.length;
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
    const clearedLines = await tx.delete(deckUnresolvedRows)
      .where(eq(deckUnresolvedRows.deckId, input.deckId))
      .returning({ id: deckUnresolvedRows.id });
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

    // A committed deck has its own account of what is pending, one scroll below
    // where this strip would sit — and that account survives the next navigation
    // while the strip does not. Two diffs for one deck, one of them transient, is
    // the overlap R2 ruled on: the strip is the one that goes.
    //
    // Read inside the transaction, and under it: after the commit the rows are
    // already written, so a failed read there would reject an action that had
    // already applied the list — the caller would draw the refusal state and a
    // retry would apply it twice.
    const versioned = (await newestVersion(input.deckId, tx)) !== null;

    // Every write this transaction could have made — asked of the plan where the
    // plan decides, and of the statement's own RETURNING where the database
    // does. A list can reconcile to nothing at all — an empty deck
    // accepting a list naming only its own commander deletes no row, inserts
    // none, requantifies none and clears no line — and stamping that would
    // claim an edit the player did not make. `clearedLines` is read from the
    // delete's own RETURNING for the same reason: the statement runs
    // unconditionally, but on a deck with no unresolved lines it writes nothing.
    const wrote =
      removing.length > 0 ||
      plan.in.length > 0 ||
      unclaimed > 0 ||
      byQuantity.size > 0 ||
      clearedLines.length > 0 ||
      plan.unresolved.length > 0;
    if (wrote) await touchDeck(tx, input.deckId);

    return { plan, removing, kept, versioned };
  });

  revalidateClaims(input.deckId, userId);
  return { in: plan.in.length, out: removing.length, kept, versioned };
}
