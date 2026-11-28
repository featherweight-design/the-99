/**
 * The wishlist sync (cart on your wishlist, call 1): while `user_prefs.wishlist_sync` is on, `wishlist_synced` (and its
 * per-deck rows) equals what Shopping lists for every deck not kept off (`decks.off_wishlist`), less the cards the
 * player took off the synced set (`wishlist_sync_skips`). Lines the player added by hand (`wishlist_items`) are never
 * read or written here.
 *
 * WHEN IT RUNS. `syncWishlistIfDue` is cheap when nothing changed: one statement reads the switch, the player's data
 * stamp (`user_data_stamps`, moved by a trigger on every per-user table a page reads) and the stamp the sync last
 * brought the lines up to (`wishlist_sync_state`). Switch off, or stamp not past it, and it returns. Every Server Action
 * schedules it after its response (`sync-trigger.ts`, from `requireUserId`), and the hourly invite-sweep
 * cron reconciles anyone due or not synced for a day (`reconcileWishlistSyncs`), a backstop for a write that reached the
 * data without an action (a script, a webhook, a Route Handler).
 *
 * HOW IT WRITES. The desired set is computed first, then a transaction takes a per-player advisory lock, re-reads the
 * ledger and writes only the difference: a line inserted, a line deleted, a line updated only where its `quantity` or
 * `held` differs, the same for the deck rows. A recompute that changes nothing writes nothing, so it fires no stamp
 * trigger. The sync's own writes do move the stamp (its tables carry the touch trigger), so a pass that changed lines
 * leaves the player due once more, and the next pass settles with a recompute that writes nothing: one extra read of
 * the desired set per real change, never a loop. The ledger records the stamp read BEFORE the desired set was
 * computed. A pass writes nothing when the ledger is already at or past that stamp (a concurrent pass got there
 * first), or when the stamp moved while it computed (a write landed mid-pass: its set may be stale, and the player
 * stays due). The lock is shared with the collected sweep (`wishlistSyncLock`), so a collection write and a pass
 * never interleave.
 *
 * QUIET ARRIVALS (Q2). A line written by a player's first pass, or by a pass adding more than `QUIET_BATCH` lines, is
 * `quiet`: its trade matches never push. `quiet` is set only when a line is inserted.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { decks, userPrefs, wishlistSynced, wishlistSyncedDecks, wishlistSyncSkips, wishlistSyncState } from "../../db/schema";
import { loadDeckBuyRows } from "../decks/availability-query";
import { listDecksWithStats } from "../decks/read";
import { unfinishedPill } from "../social/deck-visibility-rule";
import { afterCommit } from "../feed/after-commit";
import { captureServerError } from "../sentry/capture";
import { wishlistSyncLock } from "./collected";
import { heldCopies } from "./held";

/** The most copies a line can want (the tables' own check). */
export const MAX_LINE_QUANTITY = 99;

/** A pass adding more lines than this marks them quiet (Q2): switching on, or a large deck import. */
export const QUIET_BATCH = 10;

/** One deck's need for one card: its Shopping deficit, and whether the deck is unfinished (New, Draft, Building). */
export type DeckNeed = { deckId: string; quantity: number; unfinished: boolean };

/** A synced line as the sync wants it, or as it stands. */
export type SyncLine = { oracleId: string; quantity: number; held: number; decks: DeckNeed[] };

export type SyncPlan = {
  insertLines: (SyncLine & { quiet: boolean })[];
  deleteLines: string[];
  updateLines: { oracleId: string; quantity: number; held: number }[];
  insertDecks: (DeckNeed & { oracleId: string })[];
  deleteDecks: { oracleId: string; deckId: string }[];
  updateDecks: (DeckNeed & { oracleId: string })[];
};

/**
 * The lines Shopping implies, pure. `needs` is every (deck, card, deficit) row Shopping bills; `held` the copies of each
 * card held, any printing. Decks kept off and skipped cards are left out. A card's want is what it holds plus every
 * deck's deficit, at most `MAX_LINE_QUANTITY`; a card already held at that cap wants nothing more and gets no line.
 */
export function desiredLines(
  needs: readonly { deckId: string; oracleId: string; quantity: number }[],
  opts: { offDecks: ReadonlySet<string>; skipped: ReadonlySet<string>; unfinished: ReadonlySet<string>; held: ReadonlyMap<string, number> },
): SyncLine[] {
  const byCard = new Map<string, DeckNeed[]>();
  for (const n of needs) {
    if (n.quantity < 1 || opts.offDecks.has(n.deckId) || opts.skipped.has(n.oracleId)) continue;
    const list = byCard.get(n.oracleId) ?? [];
    const same = list.find((d) => d.deckId === n.deckId);
    if (same) same.quantity += n.quantity;
    else list.push({ deckId: n.deckId, quantity: n.quantity, unfinished: opts.unfinished.has(n.deckId) });
    byCard.set(n.oracleId, list);
  }
  const lines: SyncLine[] = [];
  for (const [oracleId, deckNeeds] of byCard) {
    const held = opts.held.get(oracleId) ?? 0;
    if (held >= MAX_LINE_QUANTITY) continue;
    const want = held + deckNeeds.reduce((sum, d) => sum + d.quantity, 0);
    lines.push({ oracleId, held, quantity: Math.min(MAX_LINE_QUANTITY, want), decks: deckNeeds });
  }
  return lines;
}

/** The difference between the lines wanted and the lines standing, pure. `firstPass` is a player with no ledger row. */
export function planWishlistSync(desired: readonly SyncLine[], current: readonly SyncLine[], opts: { firstPass: boolean }): SyncPlan {
  const plan: SyncPlan = { insertLines: [], deleteLines: [], updateLines: [], insertDecks: [], deleteDecks: [], updateDecks: [] };
  const standing = new Map(current.map((l) => [l.oracleId, l]));
  const wanted = new Set(desired.map((l) => l.oracleId));
  const added = desired.filter((l) => !standing.has(l.oracleId));
  const quiet = opts.firstPass || added.length > QUIET_BATCH;
  for (const line of desired) {
    const now = standing.get(line.oracleId);
    if (!now) {
      plan.insertLines.push({ ...line, quiet });
      for (const d of line.decks) plan.insertDecks.push({ ...d, oracleId: line.oracleId });
      continue;
    }
    if (now.quantity !== line.quantity || now.held !== line.held) {
      plan.updateLines.push({ oracleId: line.oracleId, quantity: line.quantity, held: line.held });
    }
    const nowDecks = new Map(now.decks.map((d) => [d.deckId, d]));
    const wantDecks = new Set(line.decks.map((d) => d.deckId));
    for (const d of line.decks) {
      const was = nowDecks.get(d.deckId);
      if (!was) plan.insertDecks.push({ ...d, oracleId: line.oracleId });
      else if (was.quantity !== d.quantity || was.unfinished !== d.unfinished) plan.updateDecks.push({ ...d, oracleId: line.oracleId });
    }
    for (const d of now.decks) if (!wantDecks.has(d.deckId)) plan.deleteDecks.push({ oracleId: line.oracleId, deckId: d.deckId });
  }
  // A line that goes takes its deck rows with it (the cascade), so they are not listed.
  for (const line of current) if (!wanted.has(line.oracleId)) plan.deleteLines.push(line.oracleId);
  return plan;
}

export function planIsEmpty(plan: SyncPlan): boolean {
  return Object.values(plan).every((list) => list.length === 0);
}

type DueRow = { on: boolean | null; stamp: number | string | null; synced_stamp: number | string | null };

/** One statement: the switch, the data stamp and the ledger. */
async function readDue(userId: string): Promise<{ on: boolean; stamp: number; syncedStamp: number | null }> {
  const { rows } = await db.execute<DueRow>(sql`
    select (select up.wishlist_sync from user_prefs up where up.user_id = ${userId}) as on,
      (select ds.stamp from user_data_stamps ds where ds.user_id = ${userId}) as stamp,
      (select ss.synced_stamp from wishlist_sync_state ss where ss.user_id = ${userId}) as synced_stamp
  `);
  const row = rows[0];
  return {
    on: row?.on === true,
    stamp: Number(row?.stamp ?? 0),
    syncedStamp: row?.synced_stamp == null ? null : Number(row.synced_stamp),
  };
}

/** Whether a player needs a pass: the switch on, and no ledger row or a data stamp past it. Pure. */
export function isDue(state: { on: boolean; stamp: number; syncedStamp: number | null }): boolean {
  return state.on && (state.syncedStamp === null || state.stamp > state.syncedStamp);
}

/** The desired lines for a player, read from Shopping and the collection. */
async function loadDesired(userId: string): Promise<SyncLine[]> {
  const [needs, deckList, offRows, skipRows] = await Promise.all([
    loadDeckBuyRows(userId),
    // The same pill the deck grid and the friend read draw (`social/decks.ts` reads it this way).
    listDecksWithStats(userId, "newest", { includeProxyStats: true }),
    db.select({ id: decks.id }).from(decks).where(and(eq(decks.userId, userId), eq(decks.offWishlist, true))),
    db.select({ oracleId: wishlistSyncSkips.oracleId }).from(wishlistSyncSkips).where(eq(wishlistSyncSkips.userId, userId)),
  ]);
  const unfinished = new Set(deckList.filter((d) => unfinishedPill(d.statusPill)).map((d) => d.id));
  const cards = [...new Set(needs.map((n) => n.oracleId))];
  const held = new Map<string, number>();
  if (cards.length > 0) {
    const { rows } = await db.execute<{ oracle_id: string; held: number }>(sql`
      select c.oracle_id, ${heldCopies(userId, sql`c.oracle_id`, null)} as held
      from unnest(${sql.param(cards)}::uuid[]) as c(oracle_id)
    `);
    for (const r of rows) held.set(r.oracle_id, Number(r.held));
  }
  return desiredLines(needs, {
    offDecks: new Set(offRows.map((r) => r.id)),
    skipped: new Set(skipRows.map((r) => r.oracleId)),
    unfinished,
    held,
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function loadCurrent(tx: Tx, userId: string): Promise<SyncLine[]> {
  const [lines, deckRows] = await Promise.all([
    tx.select({ oracleId: wishlistSynced.oracleId, quantity: wishlistSynced.quantity, held: wishlistSynced.held })
      .from(wishlistSynced).where(eq(wishlistSynced.userId, userId)),
    tx.select({
      oracleId: wishlistSyncedDecks.oracleId, deckId: wishlistSyncedDecks.deckId,
      quantity: wishlistSyncedDecks.quantity, unfinished: wishlistSyncedDecks.unfinished,
    }).from(wishlistSyncedDecks).where(eq(wishlistSyncedDecks.userId, userId)),
  ]);
  const byCard = new Map<string, DeckNeed[]>();
  for (const d of deckRows) {
    const list = byCard.get(d.oracleId) ?? [];
    list.push({ deckId: d.deckId, quantity: d.quantity, unfinished: d.unfinished });
    byCard.set(d.oracleId, list);
  }
  return lines.map((l) => ({ ...l, decks: byCard.get(l.oracleId) ?? [] }));
}

async function applyPlan(tx: Tx, userId: string, plan: SyncPlan): Promise<void> {
  // Deck rows before lines going: the cascade would take them anyway; deck rows of standing lines are deleted here.
  for (const d of plan.deleteDecks) {
    await tx.delete(wishlistSyncedDecks).where(and(
      eq(wishlistSyncedDecks.userId, userId), eq(wishlistSyncedDecks.oracleId, d.oracleId), eq(wishlistSyncedDecks.deckId, d.deckId),
    ));
  }
  if (plan.deleteLines.length > 0) {
    await tx.execute(sql`delete from wishlist_synced ws where ws.user_id = ${userId}
      and ws.oracle_id = any(${sql.param(plan.deleteLines)}::uuid[])`);
  }
  if (plan.insertLines.length > 0) {
    await tx.insert(wishlistSynced).values(plan.insertLines.map((l) => ({
      userId, oracleId: l.oracleId, quantity: l.quantity, held: l.held, quiet: l.quiet,
    })));
  }
  for (const l of plan.updateLines) {
    await tx.update(wishlistSynced).set({ quantity: l.quantity, held: l.held })
      .where(and(eq(wishlistSynced.userId, userId), eq(wishlistSynced.oracleId, l.oracleId)));
  }
  if (plan.insertDecks.length > 0) {
    await tx.insert(wishlistSyncedDecks).values(plan.insertDecks.map((d) => ({
      userId, oracleId: d.oracleId, deckId: d.deckId, quantity: d.quantity, unfinished: d.unfinished,
    })));
  }
  for (const d of plan.updateDecks) {
    await tx.update(wishlistSyncedDecks).set({ quantity: d.quantity, unfinished: d.unfinished }).where(and(
      eq(wishlistSyncedDecks.userId, userId), eq(wishlistSyncedDecks.oracleId, d.oracleId), eq(wishlistSyncedDecks.deckId, d.deckId),
    ));
  }
}

export type SyncResult = "off" | "not-due" | "raced" | "synced";

/**
 * Brings one player's synced lines up to date when they are due (see the header). Safe to call at any time and from
 * anywhere: it decides for itself whether there is anything to do.
 */
export async function syncWishlistIfDue(userId: string, opts: { force?: boolean } = {}): Promise<SyncResult> {
  const state = await readDue(userId);
  if (!state.on) return "off";
  if (!opts.force && !isDue(state)) return "not-due";
  // The stamp is read BEFORE the desired set: a write after this point moves it past what the ledger records.
  const stampBefore = state.stamp;
  const desired = await loadDesired(userId);
  return db.transaction(async (tx) => {
    await tx.execute(wishlistSyncLock(userId));
    const { rows } = await tx.execute<{ on: boolean | null; synced_stamp: number | string | null; stamp: number | string | null }>(sql`
      select (select up.wishlist_sync from user_prefs up where up.user_id = ${userId}) as on,
        (select ss.synced_stamp from wishlist_sync_state ss where ss.user_id = ${userId}) as synced_stamp,
        (select ds.stamp from user_data_stamps ds where ds.user_id = ${userId}) as stamp
    `);
    // Switched off while the pass computed: the switch's own write has removed the lines; write nothing back.
    if (rows[0]?.on !== true) return "off";
    const ledger = rows[0]?.synced_stamp == null ? null : Number(rows[0].synced_stamp);
    if (!opts.force && ledger !== null && ledger >= stampBefore) return "raced";
    // A write committed while the desired set was computed (a collection write, another pass): that set may be stale,
    // so write nothing. The player stays due, and the write's own pass (or the hourly reconcile) sees it.
    if (Number(rows[0]?.stamp ?? 0) > stampBefore) return "raced";
    const current = await loadCurrent(tx, userId);
    const plan = planWishlistSync(desired, current, { firstPass: ledger === null });
    await applyPlan(tx, userId, plan);
    await tx.insert(wishlistSyncState).values({ userId, syncedStamp: stampBefore })
      .onConflictDoUpdate({ target: wishlistSyncState.userId, set: { syncedStamp: stampBefore, syncedAt: sql`now()` } });
    return "synced";
  });
}

/**
 * Turns the sync on or off (Settings › Wishlist; its action lands with the Settings box). Off removes every synced
 * line and the ledger, quietly (Hugh, 2026-11-27, H2): lines added by hand stay, and so do the skips and each deck's
 * Keep off, so switching back on puts back what Shopping lists without the cards the player took off. On runs the
 * first pass before it returns (`syncWishlistNow`), which marks every line quiet. Writes the preference only when it changes (its stamp trigger).
 */
export async function setWishlistSync(userId: string, on: boolean): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(wishlistSyncLock(userId));
    await tx.insert(userPrefs).values({ userId, wishlistSync: on }).onConflictDoUpdate({
      target: userPrefs.userId,
      set: { wishlistSync: on },
      setWhere: sql`${userPrefs.wishlistSync} is distinct from ${on}`,
    });
    if (!on) {
      await tx.delete(wishlistSynced).where(eq(wishlistSynced.userId, userId));
      await tx.delete(wishlistSyncState).where(eq(wishlistSyncState.userId, userId));
    }
  });
  if (on) await syncWishlistNow(userId);
}

/** The Sentry tag for a failed pass: the site only, never who (`captureServerError` sends the tag and SQLSTATE alone). */
export const SYNC_FAILED_TAG = "cart-sync-failed";

/** A pass after the response, non-fatal (`afterCommit`); run now outside a request. A failure reaches Sentry. */
export function syncWishlistLater(userId: string): Promise<void> {
  return afterCommit("wishlist sync", async () => {
    try {
      await syncWishlistIfDue(userId);
    } catch (error) {
      captureServerError(SYNC_FAILED_TAG, error);
      throw error;
    }
  });
}

/**
 * A pass inside the request, for an action whose whole effect is the synced set (the switch, the Wishlist call-out,
 * a deck's Keep off): the page it refreshes, or the next visit to Wishlist, must read the lines this pass writes, and a
 * pass after the response loses that race (#3441). Non-fatal: a failure reaches Sentry and the action still succeeds;
 * the pass `requireUserId` schedules after every action, and the hourly reconcile, retry it.
 */
export async function syncWishlistNow(userId: string): Promise<void> {
  try {
    // A write that landed while the pass computed leaves it "raced" with nothing written: one more pass picks it up,
    // so the refresh still reads the lines. A second race is left to that write's own pass and the hourly reconcile.
    if ((await syncWishlistIfDue(userId)) === "raced") await syncWishlistIfDue(userId);
  } catch (error) {
    // not a fallback: nothing is drawn from this. The write the player asked for is committed; only its lines lag.
    captureServerError(SYNC_FAILED_TAG, error);
  }
}

/** The most players one cron run reconciles; the rest wait for the next hour. */
export const RECONCILE_LIMIT = 200;

/** The wall-clock budget one cron run spends on passes, well inside the route's time limit; the rest wait an hour. */
export const RECONCILE_BUDGET_MS = 60_000;

/**
 * The hourly backstop (invite-sweep cron): every player with the switch on who is due, or whose last pass is over a day
 * old (forced, so a change no stamp recorded is still picked up). One at a time, inside a time budget, so the cron
 * finishes and pings its heartbeat even with a backlog; in random order, so a backlog drains over runs and a player
 * whose pass keeps failing cannot starve the rest. One player's failure does not stop the rest. Answers the counts (`checked` is the
 * players a pass ran for).
 */
export async function reconcileWishlistSyncs(
  budgetMs = RECONCILE_BUDGET_MS, now: () => number = Date.now,
): Promise<{ checked: number; synced: number; failed: number }> {
  const deadline = now() + budgetMs;
  const { rows } = await db.execute<{ user_id: string; stale: boolean }>(sql`
    select up.user_id, (ss.synced_at is not null and ss.synced_at < now() - interval '24 hours') as stale
    from user_prefs up
    left join wishlist_sync_state ss on ss.user_id = up.user_id
    left join user_data_stamps ds on ds.user_id = up.user_id
    where up.wishlist_sync
      and (ss.user_id is null or coalesce(ds.stamp, 0) > ss.synced_stamp or ss.synced_at < now() - interval '24 hours')
    -- Random, not oldest first: a player whose pass keeps failing never stamps synced_at, and must not hold the front.
    order by random()
    limit ${RECONCILE_LIMIT}
  `);
  let checked = 0;
  let synced = 0;
  let failed = 0;
  for (const r of rows) {
    if (now() >= deadline) break;
    checked += 1;
    try {
      if ((await syncWishlistIfDue(r.user_id, { force: r.stale })) === "synced") synced += 1;
    } catch (error) {
      failed += 1;
      console.error("wishlist sync reconcile failed for one player", error);
      captureServerError(SYNC_FAILED_TAG, error);
    }
  }
  return { checked, synced, failed };
}
