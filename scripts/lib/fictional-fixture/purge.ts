// Stage 0 of the fictional fixture: nothing a real person ever held survives on the branch it runs on.
//
// A scratch branch is made from local-dev, which carries real snapshots (`pull:staging`). The earlier fixture built on
// top of one; this one EMPTIES every user-keyed table first, for ALL users, then asserts it, so what the About frames
// and the demo show is only what the generator wrote.
//
// The lists below are pinned to the Drizzle schema by `purge.test.mts`: a new table with a user column fails there
// until it is listed here (purged) or, with a reason, in `KEPT`.

/** Every table with a user-id column and the columns that hold a user id (what the guard reads). */
export const USER_KEYED: Readonly<Record<string, readonly string[]>> = {
  admin_events: ["user_id"],
  card_art_preferences: ["user_id"],
  card_assignments: ["user_id"],
  check_in_state: ["user_id"],
  collection_history: ["user_id"],
  collection_items: ["user_id"],
  commander_scores: ["user_id"],
  credit_grants: ["user_id"],
  csv_uploads: ["user_id"],
  deck_folders: ["user_id"],
  deck_game_opponents: ["friend_user_id"],
  deck_games: ["user_id"],
  deck_notes: ["user_id"],
  deck_profiles: ["user_id"],
  deck_suggestion_runs: ["user_id"],
  deck_swaps: ["user_id"],
  deck_synopses: ["user_id"],
  deck_token_joins: ["user_id"],
  deck_token_printings: ["user_id"],
  deck_tool_counts: ["user_id"],
  decks: ["user_id"],
  feed_dismissals: ["user_id"],
  feed_items: ["user_id", "friend_user_id"],
  feedback: ["user_id"],
  fits_reads: ["user_id"],
  flag_group_members: ["user_id"],
  flag_overrides: ["user_id"],
  flyer_claims: ["user_id"],
  friend_invites: ["inviter_user_id"],
  friend_links: ["user_id", "friend_user_id"],
  hidden_commanders: ["user_id"],
  intake_read_stops: ["user_id"],
  intake_reads: ["user_id"],
  invite_balances: ["user_id"],
  invite_edges: ["inviter_user_id", "invitee_user_id"],
  invite_reservations: ["user_id"],
  mana_trade_applies: ["user_id"],
  model_calls: ["user_id"],
  owned_support_counts: ["user_id"],
  owned_support_stamps: ["user_id"],
  pod_members: ["user_id"],
  pod_spare_shares: ["user_id"],
  pods: ["owner_user_id"],
  pull_releases: ["user_id"],
  push_outbox: ["user_id"],
  push_subscriptions: ["user_id"],
  rate_hits: ["user_id"],
  rule_zero_seats: ["user_id"],
  rule_zero_seen: ["user_id"],
  scan_lab_cadence: ["user_id"],
  scan_lab_results: ["user_id"],
  social_profiles: ["user_id"],
  spare_keep: ["user_id"],
  spare_requests: ["asker_user_id", "holder_user_id"],
  stripe_customers: ["user_id"],
  subscriptions: ["user_id"],
  token_ownership: ["user_id"],
  token_printing_holdings: ["user_id"],
  token_reads: ["user_id"],
  user_data_stamps: ["user_id"],
  user_prefs: ["user_id"],
  wishlist_collected: ["user_id"],
  wishlist_items: ["user_id"],
  account_tombstones: ["clerk_id"],
  // A leftover backup copy of a real collection: not in the Drizzle schema, still a user table, still emptied.
  collection_items_backup_20260915: ["user_id"],
};

/** In the database but not in `src/db/schema.ts`. */
export const NOT_IN_SCHEMA: readonly string[] = ["collection_items_backup_20260915"];

/**
 * Tables with a user column that are NOT truncated, and why. `flag_overrides` holds app-wide switch rows (no user) the
 * app's behavior depends on; only its per-user rows go.
 */
export const KEPT: Readonly<Record<string, string>> = {
  flag_overrides: "app-wide and group switch rows decide the app's behavior; only rows naming a user are deleted",
};

/** Tables with no user column that hold per-user data through a foreign key to a user table (child rows). */
export const FK_CHILDREN: readonly string[] = [
  "deck_cards", "deck_cut_items", "deck_game_axes", "deck_locks", "deck_printings", "deck_proxies",
  "deck_suggestion_items", "deck_unresolved_rows", "deck_version_cards", "deck_version_synopses", "deck_versions",
  "fill_pass_cards", "fill_passes", "model_call_parts", "rule_zero_tables",
];

/** Per-user data with no user column and no foreign key: payments, webhooks, the waitlist. */
export const NO_KEY_PERSONAL: readonly string[] = [
  "payment_records", "payment_disputes", "stripe_events", "launch_list",
];

const IDENT = /^[a-z_][a-z0-9_]*$/;
const quote = (name: string): string => {
  if (!IDENT.test(name)) throw new Error(`refusing identifier ${JSON.stringify(name)}`);
  return `"${name}"`;
};

/** Every table the purge empties, in a stable order. */
export function purgedTables(): string[] {
  return [...Object.keys(USER_KEYED).filter((t) => !(t in KEPT)), ...FK_CHILDREN, ...NO_KEY_PERSONAL].sort();
}

/**
 * ONE statement: Postgres refuses to truncate a table another table references unless that one is in the same
 * statement, so a table missing from the lists fails the purge rather than being silently skipped or cascaded into.
 */
export function truncateStatement(tables: readonly string[]): string {
  if (tables.length === 0) throw new Error("truncateStatement: no tables");
  return `truncate table ${tables.map(quote).join(", ")} restart identity`;
}

/** Deletes the per-user rows of every KEPT table (never the app-wide ones). */
export function keptDeleteStatements(): string[] {
  return Object.keys(KEPT).map((t) => {
    const cols = USER_KEYED[t];
    return `delete from ${quote(t)} where ${cols.map((c) => `${quote(c)} is not null`).join(" or ")}`;
  });
}

/** `$1` is the array of user ids the fixture owns. Returns the rows NOT owned by them. */
export function guardStatement(table: string): string {
  const cols = USER_KEYED[table];
  if (!cols) throw new Error(`guardStatement: ${table} is not a user-keyed table`);
  return `select count(*)::int as n from ${quote(table)} where ${cols.map((c) => `(${quote(c)} is not null and ${quote(c)} <> all($1::text[]))`).join(" or ")}`;
}

export type Query = (text: string, params?: unknown[]) => Promise<unknown[]>;

export async function purgeEverything(query: Query): Promise<void> {
  await query(truncateStatement(purgedTables()));
  for (const s of keptDeleteStatements()) await query(s);
}

/** Throws unless every user-keyed table holds only rows owned by `fixtureIds`. Returns the per-table counts of rows held. */
export async function assertOnlyFixtureRows(query: Query, fixtureIds: readonly string[]): Promise<Record<string, number>> {
  const bad: string[] = [];
  for (const table of Object.keys(USER_KEYED)) {
    const [{ n }] = (await query(guardStatement(table), [fixtureIds])) as { n: number }[];
    if (n > 0) bad.push(`${table}: ${n}`);
  }
  if (bad.length) throw new Error(`rows not owned by the fixture remain: ${bad.join(", ")}`);
  const held: Record<string, number> = {};
  for (const table of [...FK_CHILDREN, ...NO_KEY_PERSONAL]) {
    const [{ n }] = (await query(`select count(*)::int as n from ${quote(table)}`)) as { n: number }[];
    held[table] = n;
  }
  // Rows with no owner column may only exist for decks the fixture made; the personal tables hold nothing at all.
  for (const t of NO_KEY_PERSONAL) if (held[t] > 0) throw new Error(`${t} holds ${held[t]} rows after the purge`);
  return held;
}
