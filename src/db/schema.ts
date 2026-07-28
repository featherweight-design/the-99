import { sql } from "drizzle-orm";
import {
  pgTable, text, integer, real, timestamp, jsonb, boolean, primaryKey, uuid, index, check, date,
} from "drizzle-orm/pg-core";
import { FINISHES } from "../lib/collection/key";

/**
 * Scryfall's set catalog (api.scryfall.com/sets). Sourced from /sets rather than derived
 * from the card bulk because only /sets carries release dates and set types, which is what
 * lets the collection filter sort chronologically instead of alphabetically.
 */
export const sets = pgTable("sets", {
  code: text("code").primaryKey(),          // lowercase, e.g. "ecl"
  name: text("name").notNull(),             // "Lorwyn Eclipsed"
  setType: text("set_type").notNull(),      // expansion | commander | token | promo | …
  releasedAt: date("released_at"),          // nullable — undated/unreleased sets exist
  cardCount: integer("card_count").notNull().default(0),
  digital: boolean("digital").notNull().default(false),
  iconSvgUri: text("icon_svg_uri"),
});

export const cards = pgTable("cards", {
  oracleId: uuid("oracle_id").primaryKey(),
  scryfallId: uuid("scryfall_id").notNull(),
  name: text("name").notNull(),
  manaCost: text("mana_cost"),
  cmc: real("cmc").notNull().default(0),
  colorIdentity: text("color_identity").array().notNull(),
  typeLine: text("type_line").notNull(),
  oracleText: text("oracle_text"),
  keywords: text("keywords").array().notNull(),
  commanderLegal: boolean("commander_legal").notNull(),
  imageUri: text("image_uri"),
  rarity: text("rarity").notNull(),
}, (t) => [index("cards_name_idx").on(t.name)]);

/**
 * Every printing in existence, from Scryfall's `default_cards` bulk — as opposed to `cards`,
 * which is oracle-level (one arbitrary printing per oracle_id) and therefore cannot answer
 * "which art does this collection actually own?".
 */
export const printings = pgTable("printings", {
  scryfallId: uuid("scryfall_id").primaryKey(),
  // FK kept; orphans are filtered at ingest by pre-loading the known oracle ids, so the two
  // catalog ingests need integrity without lock-stepping.
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  setCode: text("set_code").notNull(),                   // lowercase
  // TEXT, never an integer — Scryfall uses "31", "12a", "★".
  collectorNumber: text("collector_number").notNull(),
  // Stored, not constructed: Scryfall's docs forbid building image URLs.
  imageUri: text("image_uri"),
  imageUriSmall: text("image_uri_small"),
  finishes: text("finishes").array().notNull(),          // nonfoil | foil | etched
  isVariant: boolean("is_variant").notNull().default(false),
  // Computed by a post-load pass (see setRepresentativePrintings) so reads are a plain
  // `where is_representative` instead of a natural-sort DISTINCT ON on every query.
  isRepresentative: boolean("is_representative").notNull().default(false),
}, (t) => [
  index("printings_oracle_set_idx").on(t.oracleId, t.setCode),
  index("printings_oracle_idx").on(t.oracleId),
]);

/**
 * Token/emblem/art-series ledger. The FK on `printings.oracle_id` means these can never live
 * in `printings` (they have no row in `cards`), but upload needs to tell "this ID is a token"
 * from "this ID is genuinely unknown" without a network call.
 */
export const skippedPrintings = pgTable("skipped_printings", {
  scryfallId: uuid("scryfall_id").primaryKey(),
  layout: text("layout").notNull(),   // token | double_faced_token | emblem | art_series
  name: text("name").notNull(),
});

/**
 * A holding is a *printing*, not an oracle card: `(user, oracle, set, collector number, finish)`.
 *
 * `scryfall_id` is nullable because only ManaBox exports carry one — Moxfield, Archidekt,
 * Deckbox and bare "Name,Qty" lists do not, and `collector_number NOT NULL DEFAULT ''` keeps
 * those imports behaving exactly as they did under the old key.
 *
 * `finish` is text rather than the old `foil boolean` so it matches Scryfall's `finishes`
 * vocabulary exactly (nonfoil | foil | etched) and never needs translating; 285 Scryfall
 * printings carry all three finishes under one collector number, which a boolean would merge.
 *
 * The aggregation key in src/lib/collection/key.ts MUST equal this primary key — confirm is a
 * delete-then-plain-insert with no ON CONFLICT, so a mismatch raises 23505 instead of merging.
 */
export const collectionItems = pgTable("collection_items", {
  userId: text("user_id").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  quantity: integer("quantity").notNull(),
  setCode: text("set_code").notNull(),                              // lowercase, as Scryfall emits
  // The exact printing owned, when the export tells us. Null when it does not, or when rows
  // that share the rest of the key disagree (same rule as `condition`).
  scryfallId: uuid("scryfall_id"),
  collectorNumber: text("collector_number").notNull().default(""),  // TEXT — "31", "12a", "★"
  finish: text("finish", { enum: FINISHES }).notNull().default("nonfoil"),
  condition: text("condition"),
}, (t) => [
  primaryKey({ columns: [t.userId, t.oracleId, t.setCode, t.collectorNumber, t.finish] }),
  // The column's enum option only narrows the TypeScript type; a text column with a closed
  // vocabulary drifts without a database-level constraint.
  check("collection_items_finish_check", sql`${t.finish} in ('nonfoil', 'foil', 'etched')`),
]);

export const decks = pgTable("decks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  commanderOracleId: uuid("commander_oracle_id").notNull().references(() => cards.oracleId),
  status: text("status", { enum: ["brewing", "built"] }).notNull().default("brewing"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deckCards = pgTable("deck_cards", {
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  quantity: integer("quantity").notNull().default(1),
}, (t) => [primaryKey({ columns: [t.deckId, t.oracleId] })]);

export const edhrecCache = pgTable("edhrec_cache", {
  commanderOracleId: uuid("commander_oracle_id").primaryKey().references(() => cards.oracleId),
  payload: jsonb("payload").notNull(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
});

/** Mirrors the roleCounts shape produced by src/lib/recs/score.ts. */
export type RoleCounts = Record<"ramp" | "draw" | "removal" | "wipes", number>;

export const commanderScores = pgTable("commander_scores", {
  userId: text("user_id").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  slug: text("slug").notNull(),
  score: real("score").notNull(),
  fitPool: real("fit_pool").notNull(),
  fitRoles: real("fit_roles").notNull(),
  // Null iff synergyState !== "ok".
  fitSynergy: real("fit_synergy"),
  // "ok" = real EDHREC data; "absent" = 4xx, genuinely not indexed on EDHREC;
  // "degraded" = 5xx/timeout, must be recomputed on next read.
  synergyState: text("synergy_state", { enum: ["ok", "absent", "degraded"] }).notNull(),
  edhrecOwnedCount: integer("edhrec_owned_count"),
  edhrecTotal: integer("edhrec_total"),
  receipts: text("receipts").notNull(),
  colorPoolSize: integer("color_pool_size").notNull(),
  roleCounts: jsonb("role_counts").$type<RoleCounts>().notNull(),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.oracleId] }),
  // Third key matches the `score desc, oracle_id` tie-break that loadScores and the
  // findScoredCommander rank window both use, so reads need no extra sort step.
  index("commander_scores_rank_idx").on(t.userId, t.score.desc(), t.oracleId),
  // The column's enum option only narrows the TypeScript type; without these the
  // database would accept any text. Both invariants are load-bearing: the Retry
  // button keys off synergyState, and an "ok" row with a null fitSynergy is a row
  // that contradicts itself (it scores as "no synergy" while claiming data).
  check("commander_scores_synergy_state_check", sql`${t.synergyState} in ('ok', 'absent', 'degraded')`),
  check(
    "commander_scores_synergy_null_check",
    sql`(${t.synergyState} = 'ok') = (${t.fitSynergy} is not null)`,
  ),
]);

export const csvUploads = pgTable("csv_uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  filename: text("filename").notNull(),
  rowCount: integer("row_count").notNull(),
  unmatchedCount: integer("unmatched_count").notNull(),
  // Full preview payload: { unmatched, skippedByDesignCount, parseErrors, pendingItems } —
  // pendingItems are compact aggregated (oracleId,setCode,collectorNumber,finish) totals that confirm reads
  // back. A preview written before migration 0008 has no collectorNumber/finish, so confirm
  // coerces both rather than spreading undefined (which would NOT take the column default).
  previewPayload: jsonb("preview_payload").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Set when the preview is confirmed into the collection; null = abandoned preview.
  confirmedAt: timestamp("confirmed_at"),
});
