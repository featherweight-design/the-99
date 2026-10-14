import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckTokenJoins, tokenOwnership, tokenReads } from "../../db/schema";
import { standingPreconAdds } from "../precons/added";

/**
 * Token ownership (plan `2026-10-11-tokens-for-my-deck.md`, PR 3). Pure rules first, then the writes.
 *
 * THREE STATES, NEVER TWO. `owned`, `not` (owned none, and we looked) and `unknown` (nobody has
 * looked). "Not known" must never be drawn as "not owned", so the state is decided by two facts and
 * not by the table's row count:
 *   - the token has an ownership row                       -> owned
 *   - else, the account has a READ marker                  -> not
 *   - else                                                 -> unknown
 * A manual mark makes ITS token `owned` and never writes the marker, so one mark cannot turn every
 * other token on the account from unknown into not owned.
 */
export type TokenOwnership = "owned" | "not" | "unknown";

export function tokenOwnershipState(held: boolean, read: boolean): TokenOwnership {
  if (held) return "owned";
  return read ? "not" : "unknown";
}

/** What an upload read of one token, summed over its printings: any printing counts. */
export type TokenHolding = { tokenOracleId: string; quantity: number };

/** Sums rows of the same token (a Treasure in four printings is one holding of the four). */
export function aggregateTokenRows(rows: { tokenOracleId: string; quantity: number }[]): TokenHolding[] {
  const sums = new Map<string, number>();
  for (const r of rows) {
    if (!Number.isInteger(r.quantity) || r.quantity < 1) continue;
    sums.set(r.tokenOracleId, (sums.get(r.tokenOracleId) ?? 0) + r.quantity);
  }
  return [...sums].map(([tokenOracleId, quantity]) => ({ tokenOracleId, quantity }))
    .sort((a, b) => (a.tokenOracleId < b.tokenOracleId ? -1 : 1));
}

/** Anything that runs one statement: a transaction or the db. */
type Runner = Pick<typeof db, "execute" | "insert" | "delete" | "select" | "update">;

const BATCH = 500;

/**
 * Whether the ownership tables exist here. The app can run against a database that has not applied
 * this migration (a preview deploy skips migrations), and an upload must not fail for a feature that is
 * dark; it records no tokens there and says nothing.
 */
export async function tokenOwnershipTablesExist(runner: Pick<Runner, "execute"> = db): Promise<boolean> {
  const { rows } = await runner.execute<{ ok: boolean }>(sql`
    select (to_regclass('public.token_ownership') is not null
        and to_regclass('public.token_reads') is not null
        and to_regclass('public.deck_token_joins') is not null
        -- 0117's column: every ownership write and the revert's clear name it.
        and exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'token_ownership' and column_name = 'entry_id')) as ok
  `);
  return rows[0]?.ok === true;
}

/**
 * Records what a confirmed upload read, INSIDE the upload's own transaction (the caller holds the
 * per-user lock and has stamped the upload), so a failure here rolls the whole confirm back and never
 * leaves a replaced collection without its marker.
 *
 *   Replace: every UPLOAD row the player had is removed and the upload's holdings are written. A MANUAL
 *     row is left alone, unless the upload read the same token, in which case it becomes an upload row.
 *   Add: the upload's holdings are added to the upload rows; a manual row the upload also read becomes
 *     an upload row of exactly what the upload read.
 *
 * A token the upload read as HELD leaves every deck's Shopping list in the same transaction: owned means
 * owned for every deck, and nothing restores a join if the token is unmarked later (plan PR 5, audit
 * finding 8). The readers also draw a held token as not joined, so this is the write that agrees with them.
 *
 * The read marker is written either way, including for an upload that held no token at all.
 */
export async function writeUploadTokens(
  tx: Runner,
  userId: string,
  uploadId: string,
  mode: "replace" | "add",
  holdings: TokenHolding[],
): Promise<void> {
  // Joins first, for every token read, before any ownership row is touched: the hand mark takes the join
  // rows and then its ownership row (`markOwnedOnDeck`), so the two cannot each hold what the other waits for.
  for (let i = 0; i < holdings.length; i += BATCH) {
    await tx.delete(deckTokenJoins).where(and(
      eq(deckTokenJoins.userId, userId),
      inArray(deckTokenJoins.tokenOracleId, holdings.slice(i, i + BATCH).map((h) => h.tokenOracleId)),
    ));
  }
  if (mode === "replace") {
    // Replace is about to drop every upload row, held tokens the new upload omits among them. Owned clears
    // joins, so any join on a token the player still holds is from before that rule: by definition it was
    // hidden only by the hold, and it would be drawn as joined the moment the hold goes. Take it with the
    // hold, in the same order (joins, then ownership). A hand mark has no upload row and keeps both its
    // state and the absence of a join.
    await tx.delete(deckTokenJoins).where(and(
      eq(deckTokenJoins.userId, userId),
      inArray(
        deckTokenJoins.tokenOracleId,
        sql`(select ${tokenOwnership.tokenOracleId} from ${tokenOwnership}
          where ${tokenOwnership.userId} = ${userId} and ${tokenOwnership.source} = 'upload')`,
      ),
    ));
    await tx.delete(tokenOwnership).where(and(eq(tokenOwnership.userId, userId), eq(tokenOwnership.source, "upload")));
  }
  for (let i = 0; i < holdings.length; i += BATCH) {
    const rows = holdings.slice(i, i + BATCH).map((h) => ({
      userId, tokenOracleId: h.tokenOracleId, quantity: h.quantity, source: "upload" as const,
    }));
    await tx.insert(tokenOwnership).values(rows).onConflictDoUpdate({
      target: [tokenOwnership.userId, tokenOwnership.tokenOracleId],
      set: {
        // Add accumulates onto an UPLOAD row; anything else (a manual row, or a Replace that left no
        // upload row behind) is replaced by what this upload read.
        quantity: mode === "add"
          ? sql`case when ${tokenOwnership.source} = 'upload' then ${tokenOwnership.quantity} + excluded.quantity else excluded.quantity end`
          : sql`excluded.quantity`,
        source: sql`'upload'`,
        // A precon row the upload reads becomes the upload's, so reverting the precon no longer takes it.
        entryId: sql`null`,
        updatedAt: sql`now()`,
      },
    });
  }
  await tx.insert(tokenReads).values({ userId, uploadId }).onConflictDoUpdate({
    target: tokenReads.userId,
    set: { uploadId, readAt: sql`now()` },
  });
}

/**
 * Re-derives the player's `precon` token rows from the precon adds whose cards still stand
 * (`standingPreconAdds`: an add reverted, or a revert itself reverted, follows its cards), so any
 * order of adds and reverts leaves the tokens agreeing with the collection. Each add's tokens are the
 * ones it read and kept on its entry, never the catalog's current list, which an ingest replaces. Each token a standing add
 * names is owned, attributed to the OLDEST such add and counted over all of them; a precon row no
 * standing add names goes. A token the player holds by any other source is left as it stands and is
 * never taken over; when that other row goes (an unmark, a Replace), this runs again and the precon's
 * claim comes back. Joins first, as every write that makes a token held does (`writeUploadTokens`).
 * Never writes the read marker: a precon says nothing about the tokens it does not hold.
 *
 * Runs under the per-user lock: the ledger's transaction, a Replace's, or an unmark's. Returns the token oracle ids it newly
 * marked owned for entry `entryId`, which is what an add reports.
 */
export async function syncPreconTokens(tx: Runner, userId: string, entryId?: string): Promise<string[]> {
  if (!(await tokenOwnershipTablesExist(tx))) return [];
  const adds = await standingPreconAdds(userId, tx, { withTokens: true });
  const want = new Map<string, { entryId: string; quantity: number }>();
  for (const add of adds) {
    for (const t of add.tokens) {
      const at = want.get(t.tokenOracleId);
      if (at) at.quantity += t.quantity;
      else want.set(t.tokenOracleId, { entryId: add.id, quantity: t.quantity });
    }
  }

  const have = await tx.select({ id: tokenOwnership.tokenOracleId, entryId: tokenOwnership.entryId, quantity: tokenOwnership.quantity })
    .from(tokenOwnership).where(and(eq(tokenOwnership.userId, userId), eq(tokenOwnership.source, "precon")));
  const held = new Set(have.map((h) => h.id));
  const fresh = [...want].filter(([id]) => !held.has(id));
  // Joins first, before any ownership row is touched (`writeUploadTokens`, `markOwnedOnDeck`, the purge).
  // A token another source already holds has no join left, so clearing its joins here is a no-op.
  if (fresh.length > 0) {
    await tx.delete(deckTokenJoins).where(and(eq(deckTokenJoins.userId, userId), inArray(deckTokenJoins.tokenOracleId, fresh.map(([id]) => id))));
  }
  const gone = have.filter((h) => !want.has(h.id)).map((h) => h.id);
  if (gone.length > 0) {
    await tx.delete(tokenOwnership).where(and(
      eq(tokenOwnership.userId, userId), eq(tokenOwnership.source, "precon"), inArray(tokenOwnership.tokenOracleId, gone),
    ));
  }
  for (const h of have) {
    const w = want.get(h.id);
    if (w && (w.entryId !== h.entryId || w.quantity !== h.quantity)) {
      await tx.update(tokenOwnership).set({ entryId: w.entryId, quantity: w.quantity, updatedAt: sql`now()` })
        .where(and(eq(tokenOwnership.userId, userId), eq(tokenOwnership.tokenOracleId, h.id), eq(tokenOwnership.source, "precon")));
    }
  }
  if (fresh.length === 0) return [];
  const marked = await tx.insert(tokenOwnership)
    .values(fresh.map(([id, w]) => ({ userId, tokenOracleId: id, quantity: w.quantity, source: "precon" as const, entryId: w.entryId })))
    .onConflictDoNothing()
    .returning({ id: tokenOwnership.tokenOracleId, entryId: tokenOwnership.entryId });
  return marked.filter((m) => m.entryId === entryId).map((m) => m.id);
}

/** The player's own `I have one`. Never writes the read marker; never touches an upload row. */
export async function markTokenOwned(
  userId: string,
  tokenOracleId: string,
  runner: Pick<typeof db, "insert"> = db,
): Promise<void> {
  await runner.insert(tokenOwnership)
    .values({ userId, tokenOracleId, quantity: 1, source: "manual" })
    .onConflictDoNothing();
}

/** Unmarks a HAND mark. An upload row is the upload's to change, so it is left standing. */
export async function unmarkTokenOwned(
  userId: string,
  tokenOracleId: string,
  runner: Pick<typeof db, "delete"> = db,
): Promise<number> {
  const gone = await runner.delete(tokenOwnership)
    .where(and(
      eq(tokenOwnership.userId, userId),
      eq(tokenOwnership.tokenOracleId, tokenOracleId),
      eq(tokenOwnership.source, "manual"),
    ))
    .returning({ id: tokenOwnership.tokenOracleId });
  return gone.length;
}

/**
 * The confirm transaction's token step, shared by `replaceCollection` and the ledger's write. `tokens`
 * absent means this confirm never read any (a payload previewed before tokens were read, the seed CLI,
 * the Add cards sheet): nothing is written, and above all not the marker, because a marker with no token
 * behind it would turn every token from "not known" into "not owned". An empty list is a real read.
 */
export async function recordUploadTokens(
  tx: Parameters<typeof writeUploadTokens>[0],
  userId: string,
  uploadId: string | undefined,
  mode: "replace" | "add",
  tokens: TokenHolding[] | undefined,
): Promise<void> {
  if (!uploadId || !tokens || !(await tokenOwnershipTablesExist(tx))) return;
  await writeUploadTokens(tx, userId, uploadId, mode, tokens);
  // A Replace dropped every upload row, and with it any token a standing precon add claims beneath one.
  if (mode === "replace") await syncPreconTokens(tx, userId);
}
