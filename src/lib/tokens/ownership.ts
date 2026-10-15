import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckTokenJoins, tokenOwnership, tokenPrintingHoldings, tokenReads } from "../../db/schema";
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

/**
 * What an upload (or a precon add) read of one token: the token, summed over its printings, which is
 * all ownership asks (any printing counts), and the printings it was read at, which the deck's
 * printing picker offers (token printings TP1). `printings` is absent on a payload or an entry from
 * before that, which then names no printing: never an empty list standing for one.
 */
export type TokenPrintingCount = { tokenPrintingId: string; quantity: number };
export type TokenHolding = { tokenOracleId: string; quantity: number; printings?: TokenPrintingCount[] };

/** Sums rows of the same token (a Treasure in four printings is one holding of the four), keeping each printing's count. */
export function aggregateTokenRows(rows: { tokenOracleId: string; tokenPrintingId?: string | null; quantity: number }[]): TokenHolding[] {
  const sums = new Map<string, { quantity: number; printings: Map<string, number> }>();
  for (const r of rows) {
    if (!Number.isInteger(r.quantity) || r.quantity < 1) continue;
    const at = sums.get(r.tokenOracleId) ?? { quantity: 0, printings: new Map<string, number>() };
    at.quantity += r.quantity;
    if (r.tokenPrintingId) at.printings.set(r.tokenPrintingId, (at.printings.get(r.tokenPrintingId) ?? 0) + r.quantity);
    sums.set(r.tokenOracleId, at);
  }
  const byId = (a: string, b: string) => (a < b ? -1 : 1);
  return [...sums].map(([tokenOracleId, s]) => ({
    tokenOracleId,
    quantity: s.quantity,
    // Absent, not empty, when no row named a printing: the form the type documents.
    ...(s.printings.size > 0
      ? { printings: [...s.printings].map(([tokenPrintingId, quantity]) => ({ tokenPrintingId, quantity }))
        .sort((a, b) => byId(a.tokenPrintingId, b.tokenPrintingId)) }
      : {}),
  })).sort((a, b) => byId(a.tokenOracleId, b.tokenOracleId));
}

/** Every printing count across holdings, summed per printing: what one source's holding rows hold. */
export function printingCounts(holdings: readonly TokenHolding[]): TokenPrintingCount[] {
  const sums = new Map<string, number>();
  for (const h of holdings) {
    for (const p of h.printings ?? []) {
      if (!Number.isInteger(p.quantity) || p.quantity < 1) continue;
      sums.set(p.tokenPrintingId, (sums.get(p.tokenPrintingId) ?? 0) + p.quantity);
    }
  }
  return [...sums].map(([tokenPrintingId, quantity]) => ({ tokenPrintingId, quantity }))
    .sort((a, b) => (a.tokenPrintingId < b.tokenPrintingId ? -1 : 1));
}

/**
 * How an upload's tokens meet the recorded ones: `replace` (a Replace, and a Sync under Everything or
 * Only its tokens), `add` (an Add: accumulate), `additive` (a Sync under Only what it adds: the greater).
 */
export type TokenWriteMode = "replace" | "add" | "additive";

/** The rows a token write reads before it writes, for `planTokenWrite`. */
export type TokenState = {
  /** Every ownership row the player has, any source. `entryId` is a precon row's add. */
  owned: { tokenOracleId: string; quantity: number; source: string; entryId?: string | null }[];
  /** The player's `upload` printing rows. */
  uploadPrintings: TokenPrintingCount[];
  /** The player's `precon` printing rows (absent: none). */
  preconPrintings?: TokenPrintingCount[];
  /**
   * The precon adds whose cards still stand, oldest first, with the tokens each read (`standingPreconAdds`):
   * what `syncPreconTokens` re-derives the precon rows from after a Replace (absent: none).
   */
  preconAdds?: readonly { id: string; tokens: readonly TokenHolding[] }[];
  /** Whether the account has a read marker. */
  read: boolean;
};

/** One row a token write would change: `to` null is a removal; `source` is the row's source after it (token rows). */
export type TokenChange = {
  kind: "token" | "printing" | "preconPrinting" | "read";
  id: string;
  from: number | null;
  to: number | null;
  source?: string | null;
};

/** The token rows as a write would LEAVE them: ownership per token, and printing rows per source. */
export type TokenFinal = {
  owned: Map<string, { quantity: number; source: string; entryId: string | null }>;
  uploadPrintings: Map<string, number>;
  preconPrintings: Map<string, number>;
};

/**
 * The precon claim the standing adds make, per token: counted over every add, attributed to the OLDEST.
 * `syncPreconTokens` writes it and `planTokenWrite` plans it, so the two cannot disagree.
 */
export function preconWant(adds: readonly { id: string; tokens: readonly TokenHolding[] }[]): Map<string, { entryId: string; quantity: number }> {
  const want = new Map<string, { entryId: string; quantity: number }>();
  for (const add of adds) {
    for (const t of add.tokens) {
      const at = want.get(t.tokenOracleId);
      if (at) at.quantity += t.quantity;
      else want.set(t.tokenOracleId, { entryId: add.id, quantity: t.quantity });
    }
  }
  return want;
}

/**
 * What `syncPreconTokens` does to the precon rows `have`, given `want`: the rows no standing add names go, a
 * row whose add or count moved is updated, and a wanted token with no precon row is INSERTED, which the insert
 * skips (`on conflict do nothing`) where another source already holds it.
 */
export function preconSyncWrites(
  have: readonly { id: string; entryId: string | null; quantity: number }[],
  want: ReadonlyMap<string, { entryId: string; quantity: number }>,
) {
  const held = new Set(have.map((h) => h.id));
  return {
    fresh: [...want].filter(([id]) => !held.has(id)),
    gone: have.filter((h) => !want.has(h.id)).map((h) => h.id),
    updates: have.flatMap((h) => {
      const w = want.get(h.id);
      return w && (w.entryId !== h.entryId || w.quantity !== h.quantity) ? [{ id: h.id, ...w }] : [];
    }),
  };
}

/**
 * The FINAL token rows a confirm in `mode` would leave, and the rows that differ from today's (round 3): the
 * upload's own write (`writeUploadTokens`), and after a Replace the precon re-derivation `recordUploadTokens`
 * runs (`syncPreconTokens`, through the same `preconWant` and `preconSyncWrites`), so a precon add's claim that
 * comes back under a dropped upload row is planned, and a change in the standing adds changes the plan. What a
 * Sync's "nothing to sync" and its plan digest read: empty changes when nothing the player can see would move
 * (the marker's upload id moving is not a change).
 */
export function planTokenWrite(mode: TokenWriteMode, state: TokenState, holdings: readonly TokenHolding[]): { final: TokenFinal; changes: TokenChange[] } {
  const owned: TokenFinal["owned"] = new Map(state.owned.map((o) => [o.tokenOracleId, { quantity: o.quantity, source: o.source, entryId: o.entryId ?? null }]));
  const uploadPrintings = new Map(state.uploadPrintings.map((p) => [p.tokenPrintingId, p.quantity]));
  const preconPrintings = new Map((state.preconPrintings ?? []).map((p) => [p.tokenPrintingId, p.quantity]));

  // The upload's own write.
  if (mode === "replace") {
    for (const [id, o] of owned) if (o.source === "upload") owned.delete(id);
    uploadPrintings.clear();
  }
  for (const h of holdings) {
    const o = owned.get(h.tokenOracleId);
    if (mode === "additive") {
      // Never below ANY row's count: a row at or above the file stands exactly as it is.
      if (!o || h.quantity > o.quantity) owned.set(h.tokenOracleId, { quantity: h.quantity, source: "upload", entryId: null });
      continue;
    }
    const quantity = mode === "add" && o?.source === "upload" ? o.quantity + h.quantity : h.quantity;
    owned.set(h.tokenOracleId, { quantity, source: "upload", entryId: null });
  }
  for (const p of printingCounts(holdings)) {
    const held = uploadPrintings.get(p.tokenPrintingId) ?? 0;
    uploadPrintings.set(p.tokenPrintingId, mode === "additive" ? Math.max(held, p.quantity) : held + p.quantity);
  }

  // After a Replace, the precon rows re-derived from the standing adds.
  if (mode === "replace") {
    const adds = state.preconAdds ?? [];
    const have = [...owned].filter(([, o]) => o.source === "precon").map(([id, o]) => ({ id, entryId: o.entryId, quantity: o.quantity }));
    const { fresh, gone, updates } = preconSyncWrites(have, preconWant(adds));
    for (const id of gone) owned.delete(id);
    for (const u of updates) owned.set(u.id, { quantity: u.quantity, source: "precon", entryId: u.entryId });
    for (const [id, w] of fresh) if (!owned.has(id)) owned.set(id, { quantity: w.quantity, source: "precon", entryId: w.entryId });
    preconPrintings.clear();
    for (const p of printingCounts(adds.flatMap((a) => a.tokens))) preconPrintings.set(p.tokenPrintingId, p.quantity);
  }

  const changes: TokenChange[] = [];
  const before = new Map(state.owned.map((o) => [o.tokenOracleId, o]));
  for (const id of new Set([...before.keys(), ...owned.keys()])) {
    const b = before.get(id);
    const a = owned.get(id);
    if (b?.quantity !== a?.quantity || b?.source !== a?.source) {
      changes.push({ kind: "token", id, from: b?.quantity ?? null, to: a?.quantity ?? null, source: a?.source ?? null });
    }
  }
  const diff = (kind: "printing" | "preconPrinting", was: readonly TokenPrintingCount[], now: Map<string, number>) => {
    const w = new Map(was.map((p) => [p.tokenPrintingId, p.quantity]));
    for (const id of new Set([...w.keys(), ...now.keys()])) {
      if (w.get(id) !== now.get(id)) changes.push({ kind, id, from: w.get(id) ?? null, to: now.get(id) ?? null });
    }
  };
  diff("printing", state.uploadPrintings, uploadPrintings);
  diff("preconPrinting", state.preconPrintings ?? [], preconPrintings);
  if (!state.read) changes.push({ kind: "read", id: "", from: null, to: null });
  const order = { read: 0, token: 1, printing: 2, preconPrinting: 3 } as const;
  changes.sort((a, b) => order[a.kind] - order[b.kind] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { final: { owned, uploadPrintings, preconPrintings }, changes };
}

/** `planTokenWrite`'s changes alone. */
export function tokenWritePlan(mode: TokenWriteMode, state: TokenState, holdings: readonly TokenHolding[]): TokenChange[] {
  return planTokenWrite(mode, state, holdings).changes;
}

/** A final state as plain sorted entries, for a digest. */
export function tokenFinalEntries(final: TokenFinal) {
  const sorted = <V>(m: Map<string, V>) => [...m].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return {
    owned: sorted(final.owned).map(([id, o]) => [id, o.quantity, o.source, o.entryId] as const),
    uploadPrintings: sorted(final.uploadPrintings),
    preconPrintings: sorted(final.preconPrintings),
  };
}

/** The rows `planTokenWrite` starts from, read inside the caller's transaction. Null where the tables do not exist. */
export async function readTokenState(runner: Runner, userId: string): Promise<TokenState | null> {
  if (!(await tokenOwnershipTablesExist(runner))) return null;
  const owned = await runner.select({
    tokenOracleId: tokenOwnership.tokenOracleId, quantity: tokenOwnership.quantity, source: tokenOwnership.source, entryId: tokenOwnership.entryId,
  }).from(tokenOwnership).where(eq(tokenOwnership.userId, userId));
  const printings = await runner.select({
    tokenPrintingId: tokenPrintingHoldings.tokenPrintingId, quantity: tokenPrintingHoldings.quantity, source: tokenPrintingHoldings.source,
  }).from(tokenPrintingHoldings).where(eq(tokenPrintingHoldings.userId, userId));
  const read = await runner.select({ userId: tokenReads.userId }).from(tokenReads).where(eq(tokenReads.userId, userId));
  const adds = await standingPreconAdds(userId, runner, { withTokens: true });
  const of = (source: string) => printings.filter((p) => p.source === source).map(({ tokenPrintingId, quantity }) => ({ tokenPrintingId, quantity }));
  return {
    owned,
    uploadPrintings: of("upload"),
    preconPrintings: of("precon"),
    preconAdds: adds.map((a) => ({ id: a.id, tokens: a.tokens })),
    read: read.length > 0,
  };
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
        -- 0118's per-printing detail: written beside every ownership write.
        and to_regclass('public.token_printing_holdings') is not null
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
 *   Additive (a Sync under **Only what it adds**, plan `2026-10-15-collection-sync.md`, ruling 2): the
 *     file is a whole export, so it is IDEMPOTENT rather than Add's accumulate, and it never LOWERS a row of
 *     any source. A token row (upload, manual or precon) at or above what the file reads stands exactly as it
 *     is; one below it becomes an upload row of what the file read, `greatest(held, file)`. Each upload printing
 *     row takes the greater too. Nothing is deleted, and an unchanged re-sync changes nothing.
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
  mode: TokenWriteMode,
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
    await tx.delete(tokenPrintingHoldings).where(and(eq(tokenPrintingHoldings.userId, userId), eq(tokenPrintingHoldings.source, "upload")));
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
          : mode === "additive"
            ? sql`greatest(${tokenOwnership.quantity}, excluded.quantity)`
            : sql`excluded.quantity`,
        source: sql`'upload'`,
        // A precon row the upload reads becomes the upload's, so reverting the precon no longer takes it.
        entryId: sql`null`,
        updatedAt: sql`now()`,
      },
      // Additive never lowers a row of ANY source (round 2): a row at or above the file is left exactly as it is,
      // its source and its precon entry included, and only a row the file exceeds becomes the upload's, at the
      // file's count. So an unchanged re-sync updates nothing. `tokenWritePlan` holds the same rule.
      ...(mode === "additive" ? { setWhere: sql`excluded.quantity > ${tokenOwnership.quantity}` } : {}),
    });
  }
  // The printings beside the tokens, the same way round: Replace starts from none, Add accumulates, Additive
  // takes the greater (each row is already the upload's own source, so no case is needed).
  const counts = printingCounts(holdings);
  for (let i = 0; i < counts.length; i += BATCH) {
    await tx.insert(tokenPrintingHoldings)
      .values(counts.slice(i, i + BATCH).map((c) => ({ userId, tokenPrintingId: c.tokenPrintingId, source: "upload" as const, quantity: c.quantity })))
      .onConflictDoUpdate({
        target: [tokenPrintingHoldings.userId, tokenPrintingHoldings.tokenPrintingId, tokenPrintingHoldings.source],
        set: {
          quantity: mode === "additive"
            ? sql`greatest(${tokenPrintingHoldings.quantity}, excluded.quantity)`
            : sql`${tokenPrintingHoldings.quantity} + excluded.quantity`,
          updatedAt: sql`now()`,
        },
        ...(mode === "additive" ? { setWhere: sql`excluded.quantity > ${tokenPrintingHoldings.quantity}` } : {}),
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
  // The rule is `preconWant` and `preconSyncWrites`, which `planTokenWrite` plans a Sync's tokens with too.
  const want = preconWant(adds);

  const have = await tx.select({ id: tokenOwnership.tokenOracleId, entryId: tokenOwnership.entryId, quantity: tokenOwnership.quantity })
    .from(tokenOwnership).where(and(eq(tokenOwnership.userId, userId), eq(tokenOwnership.source, "precon")));
  const { fresh, gone, updates } = preconSyncWrites(have, want);
  // Joins first, before any ownership row is touched (`writeUploadTokens`, `markOwnedOnDeck`, the purge).
  // A token another source already holds has no join left, so clearing its joins here is a no-op.
  if (fresh.length > 0) {
    await tx.delete(deckTokenJoins).where(and(eq(deckTokenJoins.userId, userId), inArray(deckTokenJoins.tokenOracleId, fresh.map(([id]) => id))));
  }
  if (gone.length > 0) {
    await tx.delete(tokenOwnership).where(and(
      eq(tokenOwnership.userId, userId), eq(tokenOwnership.source, "precon"), inArray(tokenOwnership.tokenOracleId, gone),
    ));
  }
  for (const u of updates) {
    await tx.update(tokenOwnership).set({ entryId: u.entryId, quantity: u.quantity, updatedAt: sql`now()` })
      .where(and(eq(tokenOwnership.userId, userId), eq(tokenOwnership.tokenOracleId, u.id), eq(tokenOwnership.source, "precon")));
  }
  const marked = fresh.length === 0 ? [] : await tx.insert(tokenOwnership)
    .values(fresh.map(([id, w]) => ({ userId, tokenOracleId: id, quantity: w.quantity, source: "precon" as const, entryId: w.entryId })))
    .onConflictDoNothing()
    .returning({ id: tokenOwnership.tokenOracleId, entryId: tokenOwnership.entryId });
  // Printings LAST, after every join and ownership write: the order uploads and the purge lock in
  // (joins, then ownership, then printings), so two of them never wait on each other the other way round.
  await syncPreconPrintings(tx, userId, adds);
  return marked.filter((m) => m.entryId === entryId).map((m) => m.id);
}

/**
 * The `precon` printing rows, re-derived whole from the standing adds' recorded printings: every precon
 * row goes and the standing adds' sums come back, so an add reverted takes its printings and a revert
 * reverted brings them back, with nothing to reconcile. Unlike ownership, a printing another source also
 * holds is not deferred to it: the rows are per source, and each is real copies on the shelf.
 */
async function syncPreconPrintings(tx: Runner, userId: string, adds: readonly { tokens: readonly TokenHolding[] }[]): Promise<void> {
  await tx.delete(tokenPrintingHoldings).where(and(eq(tokenPrintingHoldings.userId, userId), eq(tokenPrintingHoldings.source, "precon")));
  const counts = printingCounts(adds.flatMap((a) => a.tokens));
  for (let i = 0; i < counts.length; i += BATCH) {
    await tx.insert(tokenPrintingHoldings)
      .values(counts.slice(i, i + BATCH).map((c) => ({ userId, tokenPrintingId: c.tokenPrintingId, source: "precon" as const, quantity: c.quantity })));
  }
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
  mode: TokenWriteMode,
  tokens: TokenHolding[] | undefined,
): Promise<void> {
  if (!uploadId || !tokens || !(await tokenOwnershipTablesExist(tx))) return;
  await writeUploadTokens(tx, userId, uploadId, mode, tokens);
  // A Replace dropped every upload row, and with it any token a standing precon add claims beneath one.
  if (mode === "replace") await syncPreconTokens(tx, userId);
}
