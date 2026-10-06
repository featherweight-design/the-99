"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "../../db";
import { cards, collectionItems, deckCards, deckUnresolvedRows, decks } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { loadMatchInputs } from "../../lib/collection/import";
import { validateDeckName } from "../../lib/decks/deck-name";
import {
  buildDeckImport, resolveDeckListInput, type DeckImport, type ImportNote,
} from "../../lib/decks/import";
import { isBasicLand } from "../../lib/decks/grouping";
import { canPair, partnerAbility } from "../../lib/decks/partner";
import { deckSurfaces } from "../../lib/decks/revalidate";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import { touchDeck } from "../../lib/decks/touch";
import { isCommanderCandidate } from "../../lib/recs/score";
import {
  deckImportMaxBytes,
  deckImportTooLargeMessage,
  type DeckImportSource,
} from "../../lib/upload-limits";

const INSERT_BATCH = 500;

export type ImportDeckInput = {
  /** The decklist exactly as the player gave it — pasted text or file text. */
  text: string;
  /**
   * Which entry point produced `text`, and therefore which cap applies. A paste is
   * typed by hand and stays small; a file can carry far more and gets the 2 MB
   * deck-import cap. Without this the file cap would be enforced nowhere and a
   * valid 200 KB export would be rejected as an oversized paste.
   */
  source: DeckImportSource;
  name: string;
  /** Set only once the player has picked one; a declared commander needs no pick. */
  commanderOracleId?: string;
  /** The second commander of a pair, when the picker offered one and it was taken. */
  partnerOracleId?: string | null;
};

/**
 * One row of the commander picker (state 11). Everything but `owned` comes straight
 * from the pure pipeline; `owned` is resolved here because it is a fact about a user
 * and the pipeline touches no database. It follows `listOwnedLegalCommanders`' notion
 * of ownership — a row in `collection_items` for this user — so "you own it" means the
 * same thing here as it does on /decks/new.
 */
export type ImportCommanderCandidate = {
  oracleId: string;
  name: string;
  sourceLine: number;
  colorIdentity: string[];
  imageUri: string | null;
  /** Read for the Partner ability, which decides who may fill the second slot. */
  oracleText: string | null;
  owned: boolean;
};

/**
 * Every variant carries `notes`, failures included. A `parseError` note is often the only
 * thing that explains *why* nothing parsed, and dropping it on the failure paths would
 * leave state 10 with no account of itself — the one place the explanation matters most.
 */
export type ImportDeckResult =
  | { ok: true; deckId: string; unresolvedCount: number; notes: ImportNote[] }
  /** States 11–12: the source named no commander, so the picker runs before any write. */
  | {
      ok: false;
      reason: "commanderNeeded";
      candidates: ImportCommanderCandidate[];
      /** State 12's copy renders the total it found no commander among. */
      lineCount: number;
      notes: ImportNote[];
    }
  /** State 10: nothing parsed at all. */
  | { ok: false; reason: "noRows"; notes: ImportNote[] }
  /** State 9: lines parsed, none of them matched a card. */
  | { ok: false; reason: "noneMatched"; lineCount: number; notes: ImportNote[] }
  /**
   * The file was CSV-shaped (a recognized Name + Quantity header) but failed
   * to parse cleanly. Nothing was written: a CSV, unlike a paste, carries no
   * convention for a line the player meant to skip, so any parse error here
   * is a column problem rather than a benign section header.
   */
  | { ok: false; reason: "csvInvalid"; detail: string; notes: ImportNote[] };

/**
 * Marks each candidate as owned or not. A file-scope helper rather than an export:
 * "use server" turns every export into a callable endpoint, and this takes a userId.
 *
 * One query over the candidates only — a decklist rarely holds more than a handful
 * of legendary creatures, so this never approaches the id-chunking territory the
 * collection loaders need.
 */
async function withOwnership(
  userId: string,
  candidates: DeckImport["legendaryCandidates"],
): Promise<ImportCommanderCandidate[]> {
  if (candidates.length === 0) return [];
  const ownedRows = await db
    .selectDistinct({ oracleId: collectionItems.oracleId })
    .from(collectionItems)
    .where(
      and(
        eq(collectionItems.userId, userId),
        inArray(collectionItems.oracleId, candidates.map((c) => c.oracleId)),
      ),
    );
  const owned = new Set(ownedRows.map((r) => r.oracleId));
  return candidates.map((c) => ({ ...c, owned: owned.has(c.oracleId) }));
}

/**
 * Parses a decklist and creates the deck it describes, unresolved lines included.
 *
 * There is deliberately **no dedupe**: importing the same list twice creates two
 * decks. Updating a deck in place is `updateDeckFromList` (src/app/decks/update-actions.ts),
 * reached from the deck itself and never from here — it shows a diff and writes
 * nothing until the player applies it. This action always creates. An import that
 * silently updated an existing deck would delete cards nobody was shown.
 */
export async function importDeck(input: ImportDeckInput): Promise<ImportDeckResult> {
  const userId = await requireUserId();
  const name = validateDeckName(input.name);
  const maxBytes = deckImportMaxBytes(input.source);
  if (Buffer.byteLength(input.text, "utf8") > maxBytes) {
    throw new Error(deckImportTooLargeMessage(input.source));
  }

  // A CSV-shaped upload carries real Scryfall ids once parsed, which `matchRows`
  // resolves against before falling back to name — exactly like the collection
  // upload's own CSV rows, and precision a name-only paste never has. A plain
  // paste or text file parses to no rows here, and `loadMatchInputs` returns the
  // same empty indexes for an empty row list that it always has, so this costs
  // nothing on the path that cannot use it.
  const resolved = resolveDeckListInput(input.text);
  if (resolved.kind === "rejected") {
    return { ok: false, reason: "csvInvalid", detail: resolved.detail, notes: [] };
  }
  const { catalog, indexes } = await loadMatchInputs(
    resolved.kind === "rows" ? resolved.rows : [],
    { detailed: true },
  );
  const result =
    resolved.kind === "rows"
      ? buildDeckImport({ rows: resolved.rows, catalog, indexes })
      : buildDeckImport({ text: resolved.text, catalog, indexes });

  // Both counts come from the import's own cleaned line count, never from `rows`.
  // parsePasteList turns any non-blank line into a row, so a `SIDEBOARD:` header
  // counts as a card there — a list of nothing but section headers would read as
  // state 9, and state 9's copy would render a total that includes the headers.
  if (result.lineCount === 0) return { ok: false, reason: "noRows", notes: result.notes };

  // Order matters, and the guard is on `cards` alone. Every line that fails to match
  // becomes an unresolved row, so "nothing matched" is an empty `cards` beside a full
  // `unresolved` — never two empty arrays. Checking after the commander gate would
  // report state 9 as an empty commander picker instead.
  //
  // A declared commander is excluded from `cards`, so a list naming only its commander
  // has an empty `cards` and has still matched something. Reporting that as "we couldn't
  // find any of these cards" would contradict the deck we are about to build.
  if (result.cards.length === 0 && !result.declaredCommander) {
    return { ok: false, reason: "noneMatched", lineCount: result.lineCount, notes: result.notes };
  }

  const commanderOracleId = input.commanderOracleId ?? result.declaredCommander?.oracleId;
  if (!commanderOracleId) {
    // decks.commander_oracle_id is notNull, so a commander-less deck is a schema
    // impossibility as well as a product one. Nothing is written either way.
    return {
      ok: false,
      reason: "commanderNeeded",
      candidates: await withOwnership(userId, result.legendaryCandidates),
      lineCount: result.lineCount,
      notes: result.notes,
    };
  }

  // `undefined` is "the caller did not answer" — the first pass, before the
  // picker has been shown — and only that falls back to the paste. An explicit
  // `null` is the picker's answer that this deck has one commander, so a player
  // who removed the pair the paste declared does not get it put back.
  const partnerOracleId =
    input.partnerOracleId !== undefined
      ? input.partnerOracleId
      : (result.declaredPartner?.oracleId ?? null);
  const notes = [...result.notes];

  // Shape first: a crafted request can put any string here, and a malformed uuid
  // reaching `inArray` is rejected by Postgres rather than by this action — the
  // player would see a 500 where the refusal below reads as one.
  if (!isUuid(commanderOracleId)) throw new Error("commander not found");
  if (partnerOracleId !== null && !isUuid(partnerOracleId)) {
    throw new Error("partner not found");
  }

  // A deck's two commanders are two different cards — the schema says so with a
  // check constraint, and reaching it would surface as an opaque write failure.
  if (partnerOracleId === commanderOracleId) {
    throw new Error("a deck's two commanders must be different cards");
  }

  // Server actions are reachable via crafted requests — re-validate the commanders
  // rather than trusting the ids the picker sent back. One query over both ids: a
  // second round trip to read the partner would say nothing this one cannot.
  const commanderIds =
    partnerOracleId !== null ? [commanderOracleId, partnerOracleId] : [commanderOracleId];
  const commanderCards = await db
    .select()
    .from(cards)
    .where(inArray(cards.oracleId, commanderIds));
  const commander = commanderCards.find((c) => c.oracleId === commanderOracleId);
  if (!commander) throw new Error("commander not found");
  if (!commander.commanderLegal || !isCommanderCandidate(commander)) {
    throw new Error("card is not a legal commander");
  }

  if (partnerOracleId !== null) {
    const partner = commanderCards.find((c) => c.oracleId === partnerOracleId);
    // Named for the partner rather than reusing the primary's wording: the two
    // ids fail for different reasons and a shared message hides which one did.
    if (!partner) throw new Error("partner not found");
    if (!partner.commanderLegal || !isCommanderCandidate(partner)) {
      throw new Error("partner is not a legal commander");
    }
    if (
      !canPair(
        { name: commander.name, ability: partnerAbility(commander.oracleText) },
        { name: partner.name, ability: partnerAbility(partner.oracleText) },
      )
    ) {
      // A pair the *player* picked is refused, because the picker never offered
      // it — only a crafted request reaches that. A pair the *paste* declared is
      // kept with a note, because the paste is the record of a deck that exists,
      // and refusing the import would lose the list rather than correct it.
      // Presence, not truthiness: an empty string is a partner the request
      // supplied, and treating it as absent would route a crafted pair down the
      // paste-declared path that keeps it.
      if (input.partnerOracleId != null) throw new Error("commanders cannot be paired");
      notes.push({
        kind: "illegalPairDeclared",
        primary: commander.name,
        partner: partner.name,
      });
    }
  }

  // A commander the player picked from the 99 must not also sit in the 99.
  const deckCardValues = result.cards.filter(
    (c) => c.oracleId !== commanderOracleId && c.oracleId !== partnerOracleId,
  );

  // One transaction: a deck that exists without its unresolved rows is a deck that
  // silently lost the player's data, and there is no second chance to write them.
  const deckId = await db.transaction(async (tx) => {
    const [deck] = await tx
      .insert(decks)
      .values({ userId, name, commanderOracleId, partnerOracleId })
      .returning({ id: decks.id });

    for (let i = 0; i < deckCardValues.length; i += INSERT_BATCH) {
      await tx.insert(deckCards).values(
        deckCardValues.slice(i, i + INSERT_BATCH).map((c) => ({
          deckId: deck.id,
          oracleId: c.oracleId,
          quantity: c.quantity,
        })),
      );
    }

    for (let i = 0; i < result.unresolved.length; i += INSERT_BATCH) {
      await tx.insert(deckUnresolvedRows).values(
        result.unresolved.slice(i, i + INSERT_BATCH).map((r) => ({
          deckId: deck.id,
          rawName: r.rawName,
          quantity: r.quantity,
          sourceLine: r.sourceLine,
        })),
      );
    }

    return deck.id;
  });

  revalidateClaims(deckId, userId);
  return { ok: true, deckId, unresolvedCount: result.unresolved.length, notes };
}

/**
 * Puts a card to an unresolved line: the card joins the 99 and the line goes.
 *
 * Deliberately no `validateCardForDeck`. The line is already in the deck and
 * already counted toward the 99, so resolving it grows nothing and can't hit the
 * cap; and the resolution search runs without a colour-identity filter on
 * purpose (matching ran against all of Scryfall, not the player's colours), so
 * rejecting an off-colour answer here would refuse the very rows that search
 * exists to offer.
 */
export async function resolveUnresolvedRow(
  deckId: string,
  rowId: string,
  oracleId: string,
): Promise<void> {
  const userId = await requireUserId();

  await db.transaction(async (tx) => {
    const [deck] = await tx
      .select({
        id: decks.id,
        commanderOracleId: decks.commanderOracleId,
        partnerOracleId: decks.partnerOracleId,
      })
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
      // `for update`, because this path adds a card the deck did not hold. Row
      // locks on `deck_cards` cannot serialize an INSERT of a row that is not
      // there to lock, so a resolve landing mid-commit would otherwise reach the
      // version snapshot without reaching the receipt computed beside it. The
      // deck row is the one lock both paths can share.
      .for("update");
    if (!deck) throw new Error("deck not found");

    // Deleted first, and the delete is what decides whether the rest runs. Read
    // first and two resolves of the same line could both see it before either
    // delete landed — harmless for the singleton insert, but the basic-land
    // branch adds `quantity` and would have added it twice.
    const [row] = await tx
      .delete(deckUnresolvedRows)
      .where(and(eq(deckUnresolvedRows.id, rowId), eq(deckUnresolvedRows.deckId, deckId)))
      .returning({ quantity: deckUnresolvedRows.quantity });
    if (!row) throw new Error("unresolved row not found");

    const [card] = await tx
      .select({ typeLine: cards.typeLine, commanderLegal: cards.commanderLegal })
      .from(cards)
      .where(eq(cards.oracleId, oracleId));
    if (!card) throw new Error("card not found");
    // The search behind the picker already filters to commander-legal cards, so
    // this only ever refuses a crafted request — the same reason importDeck
    // re-validates the commander the picker sent back. Colour identity stays
    // deliberately unchecked; the doc comment above says why.
    if (!card.commanderLegal) throw new Error("card is not commander legal");

    // Neither commander may also sit in the 99 — the same rule importDeck
    // enforces when it filters the parsed rows. The line is still answered, so
    // it goes either way.
    if (oracleId !== deck.commanderOracleId && oracleId !== deck.partnerOracleId) {
      if (isBasicLand(card.typeLine)) {
        await tx
          .insert(deckCards)
          .values({ deckId, oracleId, quantity: row.quantity })
          .onConflictDoUpdate({
            target: [deckCards.deckId, deckCards.oracleId],
            set: { quantity: sql`${deckCards.quantity} + ${row.quantity}` },
          });
      } else {
        // Singleton: a "3 Rhystic Study" line resolves to one copy, exactly as
        // the importer would have brought it over had the name matched.
        await tx.insert(deckCards).values({ deckId, oracleId }).onConflictDoNothing();
      }
    }
    // The line is answered either way — a resolve naming one of the commanders
    // adds no `deck_cards` row but still clears the row from the banner, and the
    // deck the player is left looking at is not the one they had.
    await touchDeck(tx, deckId);
  });

  revalidateClaims(deckId, userId);
}

/**
 * Drops a line the player says was never a card. The deck's total shrinks with
 * it — 100 becomes 99 — which is the point, not a side effect.
 */
export async function deleteUnresolvedRow(deckId: string, rowId: string): Promise<void> {
  const userId = await requireUserId();

  await db.transaction(async (tx) => {
    // `for update`, as the resolve path takes it. The two now write the same two
    // tables — the unresolved row and the deck's stamp — and a pair that took
    // them in opposite orders could deadlock with each other.
    const [deck] = await tx
      .select({ id: decks.id })
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
      .for("update");
    if (!deck) throw new Error("deck not found");

    const deleted = await tx
      .delete(deckUnresolvedRows)
      .where(and(eq(deckUnresolvedRows.id, rowId), eq(deckUnresolvedRows.deckId, deckId)))
      .returning({ id: deckUnresolvedRows.id });
    if (deleted.length === 0) throw new Error("unresolved row not found");
    // The symmetric half of `resolveUnresolvedRow`'s stamp. Dropping a line
    // changes what the deck is — its total falls — so the deck the player is
    // left looking at is not the one they had, whether they answered the line
    // or struck it out.
    await touchDeck(tx, deckId);
  });

  // Dropping a line changes the deck's totals but claims nothing, so the
  // availability surfaces stay out of it.
  for (const path of deckSurfaces(deckId)) revalidatePath(path);
}
