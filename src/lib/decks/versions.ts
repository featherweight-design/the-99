// Reading and writing a deck's committed versions.
//
// The vocabulary is deliberate: `committed.ts` in this same directory already
// means "which deck is this card already in", so nothing here says "committed
// cards". A VERSION is a snapshot; the DRAFT is `deck_cards`.

import { and, count, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { permitsDeclaration } from "../bracket/declaration";
import { db } from "../../db";
import {
  cards, deckCards, deckGames, deckUnresolvedRows, deckVersionCards, deckVersions, decks,
} from "../../db/schema";
import type { Bracket } from "../profile/types";
import { type CardQty, draftDiff } from "./draft-diff";
import { touchDeck } from "./touch";
import { averageManaValue } from "./mana-value";
import { pruneOrphanProxies } from "./prune-proxies";
import { clearDormantLocks, pruneOrphanLocks, reviveDormantLocks } from "./locks";
import { pruneOrphanAssignments } from "./prune-assignments";
import { clearPullReleases } from "./pull-release";
import { commanderMoved } from "../commander-change/pending";
import { resolveOwnedPrintings } from "../collection/owned-printings";
import { loadPrices } from "./price-query";
import {
  assembleVersionRows, pricedIds, type VersionDiffBase, type VersionDiffCard,
} from "./version-rows";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type DeckVersion = {
  id: string;
  number: number;
  committedAt: Date;
  note: string | null;
  commanderOracleId: string;
  partnerOracleId: string | null;
  commanderSince: Date;
  partnerSince: Date | null;
};

/**
 * The version a deck is currently sleeved as, or null for a brew.
 *
 * Ordered by `number` rather than `committed_at`. The unique key makes number
 * strictly increasing per deck, whereas two versions committed in the same
 * millisecond would tie on the timestamp.
 *
 * Pass `tx` to read inside a caller's transaction, so a decision made from
 * this row is taken under the same lock as the write it leads to.
 */
export async function newestVersion(deckId: string, tx?: Tx): Promise<DeckVersion | null> {
  const [row] = await (tx ?? db).select()
    .from(deckVersions)
    .where(eq(deckVersions.deckId, deckId))
    .orderBy(desc(deckVersions.number))
    .limit(1);
  return row ?? null;
}

/**
 * The version a deck was sleeved as at a given moment.
 *
 * A game can be logged with a `played_at` in the past, and the stamp is meant
 * to say which list was on the table that night — not which one is on it now.
 * Null when the deck had committed nothing yet, which is the accurate answer:
 * that game was played by a list nobody recorded.
 *
 * `number` breaks a `committed_at` tie for the same reason `newestVersion`
 * orders by it: two versions can share a millisecond.
 */
export async function versionLiveAt(deckId: string, at: Date): Promise<DeckVersion | null> {
  const [row] = await db.select()
    .from(deckVersions)
    .where(and(eq(deckVersions.deckId, deckId), lte(deckVersions.committedAt, at)))
    .orderBy(desc(deckVersions.committedAt), desc(deckVersions.number))
    .limit(1);
  return row ?? null;
}

export async function versionCards(versionId: string, tx?: Tx): Promise<CardQty[]> {
  return (tx ?? db).select({
    oracleId: deckVersionCards.oracleId,
    quantity: deckVersionCards.quantity,
  }).from(deckVersionCards).where(eq(deckVersionCards.versionId, versionId));
}

/**
 * Freeze the draft as the next version.
 *
 * One transaction, because a version row without its cards is a deck that
 * claims nothing — every copy it holds would read as free across the whole
 * application until someone noticed.
 *
 * The commander columns are read inside the transaction rather than passed in,
 * so a commander swap committed concurrently cannot be snapshotted stale.
 *
 * The deck row is locked `for update` before the number is computed. `max + 1`
 * is otherwise a read-then-write race: two commits landing together would
 * collide on `deck_versions_deck_number_key` with a 23505 nobody catches.
 *
 * Every `since` is inherited from the predecessor when it held the same card,
 * and set to this version's committed_at when it did not. This is the one place
 * card-level seniority is decided; see the column comment in schema.ts.
 *
 * Pass `tx` to run inside a caller's transaction, so the commit lands or fails
 * together with whatever the caller wrote before it.
 */
/**
 * What the deck's verdict said at the moment of the commit.
 *
 * COMPUTED BY THE CALLER, never here. Building a profile is six reads and a slot — measured
 * at 630ms median and 2.2s on the largest deck — and this function runs inside a transaction
 * holding `for update` on the deck row. Doing it here would hold that lock across the whole
 * gather.
 *
 * Omitted means the version records no declaration and no permits, which is a legitimate
 * state rather than a failure: every version committed before these columns existed is in it,
 * and so is any commit made from a surface that has no profile to hand.
 */
export type CommitSnapshot = {
  /** The deck's live declaration, as it stands. */
  declared: Bracket | null;
  /** What the cards being committed permit. */
  permits: Bracket[];
};

export async function commitVersion(
  deckId: string,
  note: string | null,
  tx?: Tx,
  snapshot?: CommitSnapshot,
): Promise<{ version: DeckVersion; cardCount: number }> {
  return tx
    ? commitVersionIn(tx, deckId, note, snapshot)
    : db.transaction((t) => commitVersionIn(t, deckId, note, snapshot));
}

async function commitVersionIn(
  tx: Tx,
  deckId: string,
  note: string | null,
  snapshot?: CommitSnapshot,
): Promise<{ version: DeckVersion; cardCount: number }> {
  const [deck] = await tx.select().from(decks)
    .where(eq(decks.id, deckId))
    .for("update");
  if (!deck) throw new Error("deck not found");

  const [previous] = await tx.select()
    .from(deckVersions)
    .where(eq(deckVersions.deckId, deckId))
    .orderBy(desc(deckVersions.number))
    .limit(1);

  // What the predecessor held, and since when. Empty on a first commit, which
  // is what makes every `since` fall through to the new committed_at.
  const inherited = new Map<string, Date>(
    previous
      ? (await tx.select({
          oracleId: deckVersionCards.oracleId,
          since: deckVersionCards.since,
        }).from(deckVersionCards).where(eq(deckVersionCards.versionId, previous.id)))
          .map((r) => [r.oracleId, r.since] as const)
      : [],
  );

  const [inserted] = await tx.insert(deckVersions).values({
    deckId,
    number: (previous?.number ?? 0) + 1,
    note,
    commanderOracleId: deck.commanderOracleId,
    partnerOracleId: deck.partnerOracleId,
    // THE DECLARATION IS CARRIED ONLY WHEN THE VERSION'S OWN CARDS PERMIT IT.
    //
    // A player who declared cEDH and then tuned the deck down is committing a version whose
    // cards no longer reach it. Copying the answer anyway would have the version assert a
    // bracket it contradicts; the version records none instead, and the deck keeps its live
    // answer — stated, not deleted — so the surface can say the reading moved.
    // Through `permitsDeclaration`, which the declaration action asks the same question of.
    // This was the second copy of that membership test, and the action's own header argues
    // against exactly that: a resolution written twice is free to drift once.
    declaredBracket:
      snapshot && permitsDeclaration(snapshot.permits, snapshot.declared)
        ? snapshot.declared
        : null,
    // Sorted, so two versions' ranges compare as arrays without either reader sorting first.
    permits: snapshot ? [...snapshot.permits].sort((a, b) => a - b) : null,
    // `clock_timestamp()` rather than the column's `now()` default, and for the
    // reason `touchDeck` takes it: `now()` is the TRANSACTION's start, read
    // before this commit waited for the deck row's lock above. A commit that
    // queued behind an edit would otherwise carry a timestamp from before the
    // edit it followed, and Home would call the deck `edited` when the commit
    // came later. The two columns are compared against each other, so they have
    // to be read off the same clock.
    committedAt: sql`clock_timestamp()`,
  }).returning();

  // Every `since` below flows from this one value, so the whole version — its
  // commit instant, its commander's tenure and each card's — is stamped at one
  // instant rather than mixing the statement's clock with the transaction's.
  // Read back off the inserted row rather than guessing at a client clock.
  const now = inserted.committedAt;
  const commanderSince =
    previous && previous.commanderOracleId === deck.commanderOracleId
      ? previous.commanderSince
      : now;
  const partnerSince = deck.partnerOracleId === null
    ? null
    : previous && previous.partnerOracleId === deck.partnerOracleId
      ? previous.partnerSince
      : now;
  await tx.update(deckVersions)
    .set({ commanderSince, partnerSince })
    .where(eq(deckVersions.id, inserted.id));

  // `for update` on the draft rows, not merely the deck row above. Most of the
  // paths that edit `deck_cards` — a quantity decrement, an auto-fill sweep —
  // never touch the deck row, so its lock does not serialize them. A row lock
  // does, because their own UPDATE takes the same one.
  const rows = await tx.select({
    oracleId: deckCards.oracleId,
    quantity: deckCards.quantity,
  }).from(deckCards).where(eq(deckCards.deckId, deckId)).for("update");

  if (rows.length > 0) {
    await tx.insert(deckVersionCards).values(
      rows.map((r) => ({
        versionId: inserted.id,
        oracleId: r.oracleId,
        quantity: r.quantity,
        since: inherited.get(r.oracleId) ?? now,
      })),
    );
  }
  // A RESERVATION DIES WITH THE CLAIM IT WAS MADE ABOUT — the same reconcile the proxy path
  // runs, and for the same reason. This commit has just decided what the deck claims, so a
  // reservation for a card the new version does not list has nothing left to be about.
  await pruneOrphanAssignments(tx, deckId);
  // A pull's release subtracts from the committed claim this commit just replaced. The new version
  // lists what the draft does, the pulled card absent, so there is nothing left to subtract from.
  await clearPullReleases(tx, deckId);
  // A COMMIT ENDS A REMOVED CARD'S LOCK: the removal stayed (L1), so nothing may revive it now.
  // A live lock on a card the version holds is untouched: locks are not versioned.
  await clearDormantLocks(tx, deckId);
  // A COMMIT RETIRES `auto`. The flag marks a card the app placed and the player has not yet
  // confirmed, and committing the list is that confirmation, whole: every card in it is now one the
  // player chose to keep. So the chips, Keep all and Clear all auto go with it, on the first commit
  // and every later one (Hugh, 2026-09-28). After the snapshot above, so the rows it locked are the
  // rows this clears.
  await tx.update(deckCards)
    .set({ auto: false })
    .where(and(eq(deckCards.deckId, deckId), eq(deckCards.auto, true)));

  // Counted off the rows this just snapshotted, and returned rather than left to
  // the caller's own read of `deck_cards`. A path that INSERTS a card the deck
  // did not hold cannot be serialized by row locks — there is no row to lock —
  // so a caller counting its own earlier read could print a figure the version
  // does not hold.
  return {
    version: { ...inserted, commanderSince, partnerSince },
    cardCount: rows.reduce((n, r) => n + r.quantity, 0),
  };
}

/**
 * Throw the draft away and put the version's list back.
 *
 * Destructive and unrecoverable: the draft is not itself versioned, so what
 * this deletes is gone. The confirmation belongs at the call site, on the same
 * bar the bulk keep took in #476.
 *
 * `auto` is deliberately reset to false on every restored row. A version is a
 * list the player committed to, so nothing in it is an unclaimed suggestion,
 * and leaving the flag set would let a later sweep delete cards out of a
 * committed deck.
 *
 * `versionId` is what the caller believes the newest version to be, and it is
 * re-checked under the lock rather than trusted. A commit landing between the
 * caller's read and this transaction moves the deck on: restoring the older
 * list then would overwrite a version's own cards with the one behind it and
 * leave the deck reading as a draft against a version nobody edited. "moved"
 * is that case, and nothing is written — the caller sends the reader back to a
 * page that now says something different. A deck holding no version at all is
 * the same answer: there is nothing behind the draft to land on, and emptying
 * it would delete a whole brew.
 */
export async function restoreDraftFromVersion(
  deckId: string,
  versionId: string,
  /** Told which decks the discarded draft's pulls were for, read under this function's own lock,
   *  so a pull landing just before the restore is still among them. Only on "restored". */
  onReleased?: (askingDeckIds: string[]) => void,
): Promise<"restored" | "moved"> {
  return db.transaction(async (tx) => {
    // The same `for update` commitVersion takes, and for the same reason: this
    // reads a list and then replaces `deck_cards` wholesale, so an add landing
    // from another tab in between is thrown away without a trace.
    const [deck] = await tx.select().from(decks).where(eq(decks.id, deckId)).for("update");
    // Checked rather than discarded: a deck deleted underneath this would
    // otherwise fail as "version not found", which sends the reader looking
    // for a missing version of a deck that is itself gone.
    if (!deck) throw new Error("deck not found");

    // `for update` on the draft rows, not merely the deck row above. The paths
    // that edit `deck_cards` mostly never touch the deck row, so its lock does
    // not serialize them; a row lock does, because their own UPDATE takes the
    // same one. Without it an edit landing mid-restore is deleted below with no
    // trace, which is the one loss this whole function is careful to bound.
    await tx.select({ oracleId: deckCards.oracleId })
      .from(deckCards).where(eq(deckCards.deckId, deckId)).for("update");

    // Read under the lock, and compared rather than fetched by id: the question
    // is not whether the caller's version exists but whether it is still the
    // one the draft sits on top of.
    const newest = await newestVersion(deckId, tx);
    if (!newest || newest.id !== versionId) return "moved";

    const rows = await tx.select({
      oracleId: deckVersionCards.oracleId,
      quantity: deckVersionCards.quantity,
    }).from(deckVersionCards).where(eq(deckVersionCards.versionId, versionId));

    // A DISCARD BRINGS A REMOVED LOCKED CARD BACK LOCKED (Hugh, 2026-09-25): it undoes the removal,
    // so the lock never ended. Woken BEFORE the reinsert, or the insert trigger deletes the dormant
    // row in the insert's own statement and there is nothing left to wake.
    await reviveDormantLocks(tx, deckId, rows.map((r) => r.oracleId));
    await tx.delete(deckCards).where(eq(deckCards.deckId, deckId));
    // The live commander columns are the draft's commander (change commander), so a discard puts
    // the version's back. Compared first, so a deck whose commander never moved issues no write.
    // Before the prunes below: commander proxies and locks key on these columns.
    if (commanderMoved(newest, deck)) {
      await tx.update(decks).set({
        commanderOracleId: newest.commanderOracleId,
        partnerOracleId: newest.partnerOracleId,
      }).where(eq(decks.id, deckId));
    }
    // Unresolved paste lines go with the draft. They are not `deck_cards` rows,
    // so the delete above does not reach them, and no version stores them — a
    // commit refuses to cut v1 while any exist. Left behind, a discard would
    // land the deck on its committed list and still draw the banner asking the
    // player to resolve lines from an edit that no longer exists.
    await tx.delete(deckUnresolvedRows).where(eq(deckUnresolvedRows.deckId, deckId));
    if (rows.length > 0) {
      await tx.insert(deckCards).values(
        rows.map((r) => ({
          deckId, oracleId: r.oracleId, quantity: r.quantity, auto: false,
        })),
      );
    }
    // AFTER the rewrite, not beside the delete above: this path replaces the
    // whole list, so a card the version still holds has left and come back
    // within one transaction. Reconciling against the restored list keeps that
    // card's proxy and drops only the ones whose slot the discard really cut.
    await pruneOrphanProxies(tx, deckId);
    await pruneOrphanLocks(tx, deckId);
    // What is still dormant now names a card the version does not hold (added and locked in the
    // draft, then removed), and the discard does not bring it back, so its lock is over.
    await clearDormantLocks(tx, deckId);
    // A discard rewrites `deck_cards` wholesale, so the draft's contents have
    // changed even though the deck now matches a version rather than diverging
    // from one. `commitVersionIn` above deliberately does NOT stamp: a commit
    // has its own column, and folding it into this one would leave every deck
    // reading `edited` forever.
    await touchDeck(tx, deckId);
    // The pulled cards are back in the draft, so their copies are claimed again: a discard undoes the
    // pull, release included (Hugh, 2026-09-27), and the deck they were pulled for buys again.
    const askers = await clearPullReleases(tx, deckId);
    onReleased?.(askers);
    return "restored";
  });
}

/** One row of the version rail: the snapshot, plus what it changed and how long
 *  it was on the table. */
export type VersionSummary = DeckVersion & {
  cardCount: number;
  /** Cards whose count went up against the predecessor. Nought on a v1, which
   *  renders as `initial` rather than `+99`. */
  adds: number;
  removes: number;
  manaValue: number | null;
  gamesHeld: number;
  /** Resolved so the detail can say `Korvold → Prosper` rather than two uuids.
   *  Null when the catalog no longer describes that commander. */
  commanderName: string | null;
  partnerName: string | null;
  /**
   * What the player declared FOR this version, copied at commit only when its own cards
   * permitted it, and the range those cards permitted. Both null on a version committed before
   * the snapshot columns existed — "recorded nothing", which is not the same as a reading.
   * Optional because a hand-built summary (the About page's specimens) need not carry them, and
   * an absent value reads exactly as a null one does.
   */
  declaredBracket?: Bracket | null;
  permits?: Bracket[] | null;
};

/** The owner-scoped first read of `listVersions`, apart so a test can render its SQL. */
export function versionsQuery(deckId: string, userId: string) {
  return db.select({ version: deckVersions })
    .from(deckVersions)
    .innerJoin(decks, eq(decks.id, deckVersions.deckId))
    .where(and(eq(deckVersions.deckId, deckId), eq(decks.userId, userId)))
    .orderBy(desc(deckVersions.number));
}

/**
 * Every version of a deck, newest first.
 *
 * Four queries for the whole history, never four per version: a ten-version
 * deck read one version at a time is thirty round trips to Neon for a page that
 * draws ten rows. The per-version arithmetic is then pure — `draftDiff` and
 * `averageManaValue`, the same two functions the review page folds — so the rail
 * and the review page cannot disagree about what a change is.
 *
 * OWNER-SCOPED IN ITS OWN SQL: the first read joins `decks` on the reader, so a deck they
 * do not own reads as no versions and nothing further is asked. The deck page starts this
 * beside its ownership guard rather than after it, and authorization has to come before data
 * access either way.
 */
export async function listVersions(deckId: string, userId: string): Promise<VersionSummary[]> {
  const versions = (await versionsQuery(deckId, userId)).map((r) => r.version);
  if (versions.length === 0) return [];
  const ids = versions.map((v) => v.id);

  const rows = await db.select({
    versionId: deckVersionCards.versionId,
    oracleId: deckVersionCards.oracleId,
    quantity: deckVersionCards.quantity,
    cmc: cards.cmc,
    typeLine: cards.typeLine,
  }).from(deckVersionCards)
    .innerJoin(cards, eq(cards.oracleId, deckVersionCards.oracleId))
    .where(inArray(deckVersionCards.versionId, ids));

  // Grouped in the database rather than counted per row, and by version id
  // rather than by deck: a game's stamp is the version that was live the night
  // it was played, so the tally is already per-version in the column. The deck id
  // is redundant against those version ids and is in the predicate anyway, because
  // `deck_games` is indexed on `(deck_id, played_at)` and a filter on the
  // unindexed `version_id` alone cannot use it.
  const games = await db.select({ versionId: deckGames.versionId, n: count() })
    .from(deckGames)
    .where(and(eq(deckGames.deckId, deckId), inArray(deckGames.versionId, ids)))
    .groupBy(deckGames.versionId);

  // The distinct commanders across every version, resolved once: a deck that has
  // never swapped commander asks for one name, and one that has swapped twice
  // asks for three — never one query per version.
  const commanderIds = [...new Set(
    versions.flatMap((v) => [v.commanderOracleId, v.partnerOracleId]),
  )].filter((id): id is string => id !== null);
  const named = await db.select({ oracleId: cards.oracleId, name: cards.name })
    .from(cards)
    .where(inArray(cards.oracleId, commanderIds));
  const nameBy = new Map(named.map((c) => [c.oracleId, c.name]));

  const byVersion = new Map<string, typeof rows>(ids.map((id) => [id, []]));
  for (const row of rows) byVersion.get(row.versionId)!.push(row);
  const gamesBy = new Map(games.map((g) => [g.versionId!, Number(g.n)]));

  // Ascending, so each version's predecessor is the one before it in the walk.
  const ascending = [...versions].reverse();
  return ascending.map((version, i) => {
    const mine = byVersion.get(version.id)!;
    // A v1 has no predecessor, so it has no diff — never a diff against the
    // empty list, which would report ninety-nine decisions nobody took.
    const diff = i === 0 ? null : draftDiff(mine, byVersion.get(ascending[i - 1]!.id)!);
    return {
      ...version,
      cardCount: mine.reduce((n, r) => n + r.quantity, 0),
      adds: diff?.adds.length ?? 0,
      removes: diff?.removes.length ?? 0,
      manaValue: averageManaValue(mine),
      gamesHeld: gamesBy.get(version.id) ?? 0,
      commanderName: nameBy.get(version.commanderOracleId) ?? null,
      partnerName: version.partnerOracleId === null
        ? null
        : nameBy.get(version.partnerOracleId) ?? null,
      // The check constraints hold both to 1-5, so the narrowing is a type fact, not a guess.
      declaredBracket: (version.declaredBracket as Bracket | null) ?? null,
      permits: (version.permits as Bracket[] | null) ?? null,
    };
  }).reverse();
}

export type { VersionDiffCard } from "./version-rows";

/** One version's diff, with the date of the newest price the rows were judged against. */
export type VersionDiffPayload = {
  in: VersionDiffCard[];
  out: VersionDiffCard[];
  /** `max(printing_prices.as_of)`: what `BuyTag` compares a card's own `asOf` to. */
  newestAsOf: Date | null;
};

/**
 * What one version changed against the version before it, with TODAY's figures on each
 * row: what the reader owns now and what a copy costs now (H31, Hugh 2026-10-03). The
 * cards are the version's; the ownership and the price are today's, and the tab's
 * `todayNote` says so. Pull offers stay off these rows: a pull is an offer about the deck
 * as it is now, and this list is the deck as it was.
 *
 * `previousVersionId` is null for a v1, which returns two empty lists rather
 * than diffing against nothing — the caller draws the initial arm instead.
 *
 * Read on open rather than with the rail: a ten-version deck would otherwise pay
 * ten diffs to draw ten closed rows.
 */
export async function loadVersionDiff(
  versionId: string,
  previousVersionId: string | null,
  userId: string,
): Promise<VersionDiffPayload> {
  if (previousVersionId === null) return { in: [], out: [], newestAsOf: null };

  const rows = await db.select({
    versionId: deckVersionCards.versionId,
    oracleId: deckVersionCards.oracleId,
    quantity: deckVersionCards.quantity,
    name: cards.name,
    typeLine: cards.typeLine,
    manaCost: cards.manaCost,
    imageUri: cards.imageUri,
  }).from(deckVersionCards)
    .innerJoin(cards, eq(cards.oracleId, deckVersionCards.oracleId))
    .where(inArray(deckVersionCards.versionId, [versionId, previousVersionId]));

  const describe = new Map(rows.map((r) => [r.oracleId, r]));
  const { adds, removes } = draftDiff(
    rows.filter((r) => r.versionId === versionId),
    rows.filter((r) => r.versionId === previousVersionId),
  );
  const card = (change: { oracleId: string; from: number; to: number }): VersionDiffBase | null => {
    const described = describe.get(change.oracleId);
    // A card the catalog no longer describes. Dropping it is the only honest
    // rendering — a row with no name and no type is not a row.
    if (!described) return null;
    return {
      oracleId: change.oracleId,
      name: described.name,
      typeLine: described.typeLine,
      manaCost: described.manaCost,
      imageUri: described.imageUri,
      from: change.from,
      to: change.to,
    };
  };
  const ins = adds.map(card).filter((c): c is VersionDiffBase => c !== null);
  const outs = removes.map(card).filter((c): c is VersionDiffBase => c !== null);
  const all = [...ins, ...outs];
  // Both reads are scoped to the diff's own cards: a version moves a handful, and
  // neither the collection nor the price table is read whole for them.
  const [owned, priced] = await Promise.all([
    resolveOwnedPrintings(userId, all.map((c) => c.oracleId)),
    loadPrices(pricedIds(all)),
  ]);
  return {
    in: assembleVersionRows(ins, owned, priced),
    out: assembleVersionRows(outs, owned, priced),
    newestAsOf: priced.newestAsOf,
  };
}

/**
 * The average mana value of a version's list — the strip's `was 7`.
 *
 * A join rather than a second query over `versionCards`: the snapshot stores
 * quantities only, and the figure needs each card's cost and type line. Null
 * when the version was all land, which `averageManaValue` decides.
 */
export async function versionManaValue(versionId: string): Promise<number | null> {
  const rows = await db.select({
    cmc: cards.cmc,
    quantity: deckVersionCards.quantity,
    typeLine: cards.typeLine,
  })
    .from(deckVersionCards)
    .innerJoin(cards, eq(cards.oracleId, deckVersionCards.oracleId))
    .where(eq(deckVersionCards.versionId, versionId));
  return averageManaValue(rows);
}
