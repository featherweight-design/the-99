import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { tokenOwnership, tokenReads } from "../../db/schema";

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
type Runner = Pick<typeof db, "execute" | "insert" | "delete" | "select">;

const BATCH = 500;

/**
 * Whether the ownership tables exist here. The app can run against a database that has not applied
 * this migration (a preview deploy skips migrations), and an upload must not fail for a feature that is
 * dark; it records no tokens there and says nothing.
 */
export async function tokenOwnershipTablesExist(runner: Pick<Runner, "execute"> = db): Promise<boolean> {
  const { rows } = await runner.execute<{ ok: boolean }>(sql`
    select (to_regclass('public.token_ownership') is not null
        and to_regclass('public.token_reads') is not null) as ok
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
 * The read marker is written either way, including for an upload that held no token at all.
 */
export async function writeUploadTokens(
  tx: Runner,
  userId: string,
  uploadId: string,
  mode: "replace" | "add",
  holdings: TokenHolding[],
): Promise<void> {
  if (mode === "replace") {
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
        updatedAt: sql`now()`,
      },
    });
  }
  await tx.insert(tokenReads).values({ userId, uploadId }).onConflictDoUpdate({
    target: tokenReads.userId,
    set: { uploadId, readAt: sql`now()` },
  });
}

/** The player's own `I have one`. Never writes the read marker; never touches an upload row. */
export async function markTokenOwned(userId: string, tokenOracleId: string): Promise<void> {
  await db.insert(tokenOwnership)
    .values({ userId, tokenOracleId, quantity: 1, source: "manual" })
    .onConflictDoNothing();
}

/** Unmarks a HAND mark. An upload row is the upload's to change, so it is left standing. */
export async function unmarkTokenOwned(userId: string, tokenOracleId: string): Promise<number> {
  const gone = await db.delete(tokenOwnership)
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
}
