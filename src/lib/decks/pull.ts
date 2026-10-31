/**
 * The pull's transaction body (`pullCardFromDeck`), factored out so Suggested changes v2's Apply can run the same pull
 * inside its own set transaction (Small items 4, item 2): one rule for which pulls exist and what one writes, whoever
 * presses it.
 *
 * SERVER-ONLY. `pullInTx` takes the caller's transaction and assumes the caller already holds the row lock of every deck
 * in `lockIds`, taken through `lockDecksInOrder` before anything else is read: the asking deck, the source and every
 * claimant `pullClaimants` named. See `pullCardFromDeck` for why each of them is locked.
 */
import { and, eq, gt, sql } from "drizzle-orm";

import type { db } from "../../db";
import { deckCards, deckPrintings, decks } from "../../db/schema";
import { hardDecks, pullSources } from "./availability";
import { loadAvailability } from "./availability-query";
import { bucketAdds, draftDiff } from "./draft-diff";
import { PULL_REFUSED_LOCKED, isLiveLocked, pruneOrphanLocks } from "./locks";
import { PROXY_READ_FAILED, PULL_REFUSED_PROXIED, proxiedOracleIds } from "./proxies";
import { pruneOrphanProxies } from "./prune-proxies";
import { writePullRelease } from "./pull-release";
import { touchDeck } from "./touch";
import { newestVersion, versionCards } from "./versions";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The source's draft row as the pull found it, null when the draft had already cut the card (the release was the whole
 *  pull). What an undo puts back. */
export type PulledDraftRow = { quantity: number; auto: boolean } | null;

export type PullInTxResult =
  /** `versionId`: the source's newest version when the pull was made. Its commit since (a newer one) is how an undo tells
   *  a commit, which made the removal that deck's list, from a discard, which put the card back. */
  | {
      ok: true; draft: PulledDraftRow; versionId: string;
      /** The release row's `createdAt` as this pull left it (ISO), null when the write did not say. */
      release: string | null;
      /** The source's printing pick for the card when this pull took its last copy (the prune drops it), else null. */
      printing: { setCode: string; collectorNumber: string } | null;
    }
  /** `skip`: why there is nothing to pull, for a caller pulling as part of a larger write, which may treat it as done
   *  (Suggested changes v2's Apply). Absent on every other refusal.
   *  - `covered`: the asking deck already has the copies it needs (a copy came free since the page was drawn).
   *  - `notWaiting`: the asking deck's draft holds no addition of the card over its version: its version already holds
   *    it (an addition that restored a card the draft had cut), so the deck's copy is the one it has. */
  | { ok: false; message: string; skip?: "covered" | "notWaiting" };

/**
 * EVERY party's deck row, locked one statement at a time in sorted id order, deduplicated. Sorted order is what keeps two
 * transactions over overlapping decks from deadlocking: whichever takes the lowest id first takes them all, and the other
 * waits at the first. A statement each, because Postgres does not promise `for update` over `where in (...) order by`
 * takes its locks in that order. Returns the ids in the order locked.
 */
export async function lockDecksInOrder(tx: Tx, ids: readonly string[]): Promise<string[]> {
  const sorted = [...new Set(ids)].sort();
  for (const id of sorted) {
    await tx.select({ id: decks.id }).from(decks).where(eq(decks.id, id)).for("update");
  }
  return sorted;
}

/**
 * Which decks the claim on this card is made of, read BEFORE the transaction and used only to decide what to lock. The
 * authorization inside `pullInTx` re-reads the claim under those locks and is the read that decides; this one just names
 * the parties, because a lock set cannot be chosen from inside a transaction without either locking every deck the
 * player owns or taking locks in an order a concurrent pull could deadlock against.
 *
 * A read that throws answers no claimants, which is still safe: the verification inside the transaction refuses rather
 * than authorizing against an unlocked claimant.
 */
export async function pullClaimants(userId: string, oracleId: string, askingDeckId: string): Promise<string[]> {
  try {
    const seen = await loadAvailability(userId, { oracleIds: [oracleId], excludeDeckId: askingDeckId });
    return hardDecks(seen.get(oracleId) ?? { claims: [] }).map((d) => d.id);
  } catch {
    return [];
  }
}

/**
 * Take one copy of a card out of the source deck's draft for the asking deck, every guard decided under the locks the
 * caller holds (`lockIds`). Writes nothing on a refusal; on success it has edited the source's draft (and touched it) and
 * written the release that frees the copy. Does not revalidate.
 */
export async function pullInTx(tx: Tx, args: {
  userId: string;
  sourceDeckId: string;
  oracleId: string;
  askingDeckId: string;
  /** Every deck the caller locked, sorted: a claimant outside it refuses the pull. */
  lockIds: readonly string[];
}): Promise<PullInTxResult> {
  const { userId, sourceDeckId, oracleId, askingDeckId, lockIds } = args;
  // A deck cannot pull from itself: the source would lose a copy to satisfy a want the same list already holds.
  if (sourceDeckId === askingDeckId) return { ok: false, message: "A deck can’t pull a card from itself." };
  // Scoped to the reader: a caller that has not checked the source's owner (Apply names it from the client) is refused
  // here as a deck it cannot find.
  const [deck] = await tx.select().from(decks).where(and(eq(decks.id, sourceDeckId), eq(decks.userId, userId)));

  // Deleted between the ownership check and this lock. Left to fall through,
  // it reaches commitVersion, which throws rather than refusing.
  if (!deck) return { ok: false, message: "We couldn’t find that deck." };

  // Neither commander is a `deck_cards` row, but both are claims, so a deck
  // can be named as a card's holder on the strength of its commander alone.
  // Without this the pull the reader was offered fails as "doesn't hold it".
  //
  // Ahead of the offer check below, because it is the more specific answer: a
  // commander cannot be pulled by anybody for any reason, and a reader told
  // instead that their deck isn't waiting on the card would go looking for a
  // problem with their own draft.
  if (deck.commanderOracleId === oracleId || deck.partnerOracleId === oracleId) {
    return { ok: false, message: "That card is that deck’s commander." };
  }

  // L2: a card the source deck has LOCKED is never pulled out of it. Under that deck's row lock,
  // taken by the caller, so a lock landing first is honoured and none can land between this and the
  // delete.
  if (await isLiveLocked(tx, sourceDeckId, oracleId)) {
    return { ok: false, message: PULL_REFUSED_LOCKED };
  }

  // Ownership proves the player may act on both decks; it does not prove this
  // is a pull the app ever offered. Without this any two owned decks can be
  // named and the source made to lose a card the asking deck never asked for,
  // so the asking deck's own draft is the authority on which pulls exist.
  //
  // Re-derived here rather than read before the transaction, because that read
  // would be answering for a moment already past by the time the lock is
  // taken. `draftDiff` off a `for update` read of the asking deck's rows is the
  // same derivation `loadDraftState` performs, minus the presentation.
  const askingVersion = await newestVersion(askingDeckId, tx);
  const askingBefore = askingVersion ? await versionCards(askingVersion.id, tx) : [];
  const askingDraft = await tx.select({
    oracleId: deckCards.oracleId, quantity: deckCards.quantity,
  }).from(deckCards).where(eq(deckCards.deckId, askingDeckId)).for("update");
  const add = draftDiff(askingDraft, askingBefore).adds
    .find((a) => a.oracleId === oracleId);
  if (!add) return { ok: false, message: "That deck isn’t waiting on that card.", skip: "notWaiting" };

  // And the claim, read under the same locks. An add the reader was offered a
  // pull for is one whose copies are all spoken for; if a copy has come free
  // since the page was drawn — because another deck released it, or because an
  // earlier pull in this same flow already landed — there is nothing to take
  // out of anybody's box and the draft is already covered.
  //
  // `hardDecks`, not the raw claims, for the reason the commit gives: a BREW
  // "holding" a card holds nothing, and a pull against a list that was never
  // sleeved moves no physical card.
  const askingAvailability = await loadAvailability(
    userId,
    { oracleIds: [oracleId], excludeDeckId: askingDeckId },
    tx,
  );
  const holders = hardDecks(askingAvailability.get(oracleId) ?? { claims: [] });

  // The claim this authorizes against has to be one every party of which is
  // locked, or the read above answers for a moment that can still move: a deck
  // outside the lock set can commit a release between this SELECT and the
  // decrement below, and the source would then give up a copy that was already
  // free. The lock set was chosen from a read taken before the transaction, so
  // a claimant that appeared since is possible — and the honest answer to it is
  // to refuse and let the reader ask again against a page that names it, never
  // to authorize a destructive write on a claim half of which is unlocked.
  const unlocked = holders.find((d) => !lockIds.includes(d.id));
  if (unlocked) {
    return { ok: false, message: "Another deck claimed that card. Open the changes again." };
  }

  // `pullSources` here and `hardDecks` above, deliberately. The guard above asks
  // "is every claimant locked", so it must see every claimant — narrowing it would
  // let an unlocked junior deck move under the write. This asks "would taking a
  // copy relieve the shortfall", and a junior claim is already outside this deck's
  // `free`, so the answer over one is no: the copy would leave that deck's box and
  // the figure would not move. Refused, and the purchase stands.
  const sources = pullSources(askingAvailability.get(oracleId) ?? { claims: [] });
  // FAIL CLOSED here, unlike every rendering caller. This read is part of the
  // authorization for a destructive act — the pull takes a copy out of another
  // deck — and a swallowed failure would say "no proxies", authorize a pull for
  // a card the asking deck is not actually short of, and empty somebody's box.
  let askingProxies: ReadonlySet<string>;
  try {
    askingProxies = await proxiedOracleIds(askingDeckId, userId, "throw");
  } catch {
    return { ok: false, message: PROXY_READ_FAILED };
  }
  const [bucketed] = bucketAdds([add], new Map(
    [...askingAvailability].map(([id, a]) => [id, { free: a.free, claims: pullSources(a) }]),
  ), new Set(), askingProxies);
  // A printed card asks the collection for nothing, so there is nothing to
  // pull FOR — the guard below refuses it on `bucket !== "claimed"`, which is
  // the same refusal a covered add already gets.
  if (bucketed.bucket === "proxied") {
    // Its own refusal, before the generic one. "Already has the copies it
    // needs" would be a claim about the collection, and the whole point of a
    // proxy is that the deck is covered while owning nothing — the app must
    // not close that gap with a sentence.
    return { ok: false, message: PULL_REFUSED_PROXIED };
  }
  if (bucketed.bucket !== "claimed" || bucketed.shortfall <= 0) {
    return { ok: false, message: "That deck already has the copies it needs.", skip: "covered" };
  }

  // The bucket above answers for the CARD: some releasable holder exists. It
  // says nothing about the deck this call named, so on a card with two holders
  // — one senior, one junior — a request naming the junior one would pass on
  // the senior one's strength and decrement a deck whose copy was never this
  // deck's to take. The named source has to be a releasable holder itself.
  if (!sources.some((d) => d.id === sourceDeckId)) {
    return { ok: false, message: "That deck’s copy wouldn’t cover the shortfall." };
  }

  const version = await newestVersion(sourceDeckId, tx);
  if (!version) return { ok: false, message: "That deck isn’t sleeved yet." };
  // The VERSION's commander too, not only the live columns checked above: with a commander change
  // pending, the card can sit in the draft's list while the version still leads with it. A
  // release subtracts from the version's LIST claim only, so that pull would empty the draft and
  // leave the asking deck exactly as short as it was.
  if (version.commanderOracleId === oracleId || version.partnerOracleId === oracleId) {
    return { ok: false, message: "That card is that deck’s commander." };
  }

  const before = await versionCards(version.id, tx);
  // `for update`: the deck row's lock does not stop an edit to `deck_cards`, and the decrement
  // below is only as good as the draft still being what it read.
  const draft = await tx.select({
    oracleId: deckCards.oracleId, quantity: deckCards.quantity, auto: deckCards.auto,
  }).from(deckCards).where(eq(deckCards.deckId, sourceDeckId)).for("update");
  // NO PENDING-CHANGES GUARD (Hugh, 2026-09-27). It existed because the pull committed, and a
  // commit would have swept the source's own draft into a version nobody asked for. Nothing is
  // committed now, so the pull simply joins that draft.
  const row = draft.find((c) => c.oracleId === oracleId);
  const inDraft = row !== undefined;
  // Nothing to release: the version does not list it and the draft does not hold it.
  if (!inDraft && !before.some((c) => c.oracleId === oracleId)) {
    return { ok: false, message: "That deck doesn’t hold that card." };
  }

  // A pull takes ONE copy, matching removeCardFromDeck: a deck holding four
  // Relentless Rats keeps three. Delete only when the decrement would hit 0.
  // Skipped for a card the draft has ALREADY cut: its version is the only thing still claiming
  // the copy, and the release below is the whole pull.
  // The source's printing pick, read before a last copy's delete prunes it, so an undo can put it back.
  let printing: { setCode: string; collectorNumber: string } | null = null;
  if (row && row.quantity <= 1) {
    const [pick] = await tx.select({ setCode: deckPrintings.setCode, collectorNumber: deckPrintings.collectorNumber })
      .from(deckPrintings)
      .where(and(eq(deckPrintings.deckId, sourceDeckId), eq(deckPrintings.oracleId, oracleId)));
    if (typeof pick?.setCode === "string") printing = { setCode: pick.setCode, collectorNumber: pick.collectorNumber ?? "" };
  }
  if (inDraft) {
    const decremented = await tx.update(deckCards)
      .set({ quantity: sql`${deckCards.quantity} - 1` })
      .where(and(
        eq(deckCards.deckId, sourceDeckId),
        eq(deckCards.oracleId, oracleId),
        gt(deckCards.quantity, 1),
      ))
      .returning({ oracleId: deckCards.oracleId });
    if (decremented.length === 0) {
      await tx.delete(deckCards)
        .where(and(eq(deckCards.deckId, sourceDeckId), eq(deckCards.oracleId, oracleId)));
      await pruneOrphanProxies(tx, sourceDeckId);
      await pruneOrphanLocks(tx, sourceDeckId);
    }
    // The source's list changed, so it reads as edited, and pending.
    await touchDeck(tx, sourceDeckId);
  }
  // The copy leaves the source's committed claim, which is what frees it for the asking deck.
  const releasedAt = await writePullRelease(tx, { userId, sourceDeckId, oracleId, askingDeckId });
  return {
    ok: true,
    draft: row ? { quantity: row.quantity, auto: row.auto === true } : null,
    versionId: version.id,
    release: releasedAt instanceof Date ? releasedAt.toISOString() : null,
    printing,
  };
}
