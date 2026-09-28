// The commander index copy's spec, shared by `db:copy:index` and `probe:catalog-copy`. See
// copy-index.ts, and plan `2026-09-28-card-data-replicate.md` §3b.
import { getTableColumns, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import {
  commanderPairSupport,
  commanderPairSupportCards,
  commanderSupport,
  commanderSupportCards,
  decks,
  formatStaples,
  identityComposition,
} from "../../src/db/schema";
import { canonicalPair } from "../../src/lib/edhrec/pair";
import { LEGAL_PAIR_FLOOR } from "../../src/lib/edhrec/pair-enumerate";
import { roleTargetsPublishable } from "../../src/lib/edhrec/role-targets";
import { clearPersistedScoresIn } from "../../src/lib/edhrec/seed-index";
import { copyTable, type CopySpec, type CopyTx } from "./catalog-copy";

/**
 * The three prose columns are NOT the index's. `db:copy:prose` installs them, behind an input-hash
 * check this copy does not make, so a row both sides hold keeps the target's sentence.
 */
export const PROSE_COLUMNS = ["prose", "prose_input_hash", "prose_prompt_version"] as const;

type Support = Omit<typeof commanderSupport.$inferSelect, "prose" | "proseInputHash" | "prosePromptVersion">;

export type IndexSnapshot = {
  support: Support[];
  supportCards: (typeof commanderSupportCards.$inferSelect)[];
  pairs: (typeof commanderPairSupport.$inferSelect)[];
  pairCards: (typeof commanderPairSupportCards.$inferSelect)[];
  staples: (typeof formatStaples.$inferSelect)[];
  composition: (typeof identityComposition.$inferSelect)[];
};

/** A table's columns keyed by property, less the ones named by their SQL name. */
function columnsWithout(table: PgTable, exclude: readonly string[]): Record<string, PgColumn> {
  return Object.fromEntries(
    Object.entries(getTableColumns(table)).filter(([, c]) => !exclude.includes(c.name)),
  );
}

/** `set` for an upsert that takes every column but the key and `exclude` from the incoming row. */
function takeIncoming(table: PgTable, key: readonly string[], exclude: readonly string[]): Record<string, SQL> {
  return Object.fromEntries(
    Object.entries(getTableColumns(table))
      .filter(([, c]) => !key.includes(c.name) && !exclude.includes(c.name))
      .map(([k, c]) => [k, sql.raw(`excluded."${c.name}"`)]),
  );
}

/** Insert in statements under Postgres's 65,535-parameter limit. */
async function insertAll<T extends PgTable>(
  tx: CopyTx,
  table: T,
  rows: T["$inferInsert"][],
  onConflict?: { target: PgColumn[]; set: Record<string, SQL> },
): Promise<void> {
  if (rows.length === 0) return;
  const per = Math.max(1, Math.floor(60_000 / Object.keys(rows[0]).length));
  for (let i = 0; i < rows.length; i += per) {
    const q = tx.insert(table).values(rows.slice(i, i + per));
    await (onConflict ? q.onConflictDoUpdate(onConflict) : q);
  }
}

const SUPPORT_KEY = ["commander_oracle_id"];
const PAIR_KEY = ["commander_oracle_id", "partner_oracle_id"];

export const indexCopySpec: CopySpec<IndexSnapshot> = {
  kind: "index",
  tables: [
    copyTable("commander_support", commanderSupport, PROSE_COLUMNS),
    copyTable("commander_support_cards", commanderSupportCards),
    copyTable("commander_pair_support", commanderPairSupport),
    copyTable("commander_pair_support_cards", commanderPairSupportCards),
    copyTable("format_staples", formatStaples),
    copyTable("identity_composition", identityComposition),
  ],
  readSource: async (tx) => ({
    support: (await tx.select(columnsWithout(commanderSupport, PROSE_COLUMNS)).from(commanderSupport)) as unknown as Support[],
    supportCards: await tx.select().from(commanderSupportCards),
    pairs: await tx.select().from(commanderPairSupport),
    pairCards: await tx.select().from(commanderPairSupportCards),
    staples: await tx.select().from(formatStaples),
    composition: await tx.select().from(identityComposition),
  }),
  // The builders' own refusals, on what the snapshot holds: an index with no `ok` commander, role
  // targets reaching under ROLE_TARGET_FLOOR of them, fewer pairs than LEGAL_PAIR_FLOOR, and an
  // empty staples derivation. An empty composition is legitimate (`db:build:staples` publishes
  // one), so it is not a floor.
  floors: (s) => {
    const below: string[] = [];
    const ok = s.support.filter((r) => r.synergyState === "ok");
    if (ok.length === 0) below.push("no ok commander in commander_support");
    const derived = ok.filter((r) => r.avgRamp !== null).length;
    if (!roleTargetsPublishable(derived, ok.length)) below.push(`role targets on ${derived} of ${ok.length} ok commanders`);
    if (s.pairs.length < LEGAL_PAIR_FLOOR) below.push(`pairs ${s.pairs.length} < ${LEGAL_PAIR_FLOOR}`);
    if (s.staples.length === 0) below.push("format_staples is empty");
    return below;
  },
  describe: (s) =>
    `${s.support.length} commanders · ${s.supportCards.length} support cards · ${s.pairs.length} pairs · ` +
    `${s.pairCards.length} pair cards · ${s.staples.length} staples · ${s.composition.length} compositions`,
  publish: async (tx, s) => {
    // 1 · Scores are scored against the index, so the old ones go in the same transaction.
    await clearPersistedScoresIn(tx);

    // 2 · A pair a TARGET deck holds is in the builder's pair list there and not in the source's.
    // Reported, never fatal: the fix is a one-off production index dispatch for that pair.
    const sourcePairs = new Set(s.pairs.map((p) => `${p.commanderOracleId}|${p.partnerOracleId}`));
    const built = await tx
      .selectDistinct({ a: decks.commanderOracleId, b: decks.partnerOracleId })
      .from(decks)
      .where(sql`${decks.partnerOracleId} is not null`);
    const gap = built
      .map((r) => canonicalPair(r.a, r.b!))
      .filter((p) => !sourcePairs.has(`${p.commanderOracleId}|${p.partnerOracleId}`));
    console.log(gap.length === 0
      ? "pairs: every pair the target's decks hold is in the copy"
      : `pairs: ${gap.length} pair(s) the target's decks hold are not in the copy: ` +
        gap.map((p) => `${p.commanderOracleId}+${p.partnerOracleId}`).join(", "));

    // 3 · The card lists are replaced whole, so clear them before their parents move.
    await tx.delete(commanderPairSupportCards);
    await tx.delete(commanderSupportCards);

    // 4 · Headers: delete what the source lacks, upsert the rest, prose left where it is. Exact,
    // because `readIndexGeneration` keys on max(computed_at) and a target-only row could pin it.
    const ids = s.support.map((r) => r.commanderOracleId);
    await tx.delete(commanderSupport)
      .where(sql`not (${commanderSupport.commanderOracleId} = any(${sql.param(ids)}::uuid[]))`);
    await insertAll(tx, commanderSupport, s.support, {
      target: [commanderSupport.commanderOracleId],
      set: takeIncoming(commanderSupport, SUPPORT_KEY, PROSE_COLUMNS),
    });

    const as = s.pairs.map((p) => p.commanderOracleId);
    const bs = s.pairs.map((p) => p.partnerOracleId);
    await tx.delete(commanderPairSupport).where(sql`(${commanderPairSupport.commanderOracleId}, ${commanderPairSupport.partnerOracleId})
      not in (select * from unnest(${sql.param(as)}::uuid[], ${sql.param(bs)}::uuid[]))`);
    await insertAll(tx, commanderPairSupport, s.pairs, {
      target: [commanderPairSupport.commanderOracleId, commanderPairSupport.partnerOracleId],
      set: takeIncoming(commanderPairSupport, PAIR_KEY, []),
    });

    // 5 · Refill the card lists, and replace the two derived tables.
    await insertAll(tx, commanderSupportCards, s.supportCards);
    await insertAll(tx, commanderPairSupportCards, s.pairCards);
    await tx.delete(formatStaples);
    await insertAll(tx, formatStaples, s.staples);
    await tx.delete(identityComposition);
    await insertAll(tx, identityComposition, s.composition);
  },
};
