import { sql } from "drizzle-orm";
import {
  pgTable, text, integer, real, timestamp, jsonb, boolean, primaryKey, uuid, index, check, date,
  unique, foreignKey, uniqueIndex, bigint, bigserial, type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { FINISHES } from "../lib/collection/key";
import type { Job } from "../lib/labels/types";
import type { EdhrecTag } from "../lib/edhrec/parse";
import type { CommanderEngine } from "../lib/recs/engine";
import type { DeckProfile } from "../lib/profile/types";
import type { CheckedSynopsis } from "../lib/synopsis/types";
import type { ToolCountSummary } from "../lib/tuning/history";
import type { ValidationReport } from "../lib/tuning/validate";
import type { CutCite } from "../lib/tuning/cuts-schema";
import type { FitsDropReason } from "../lib/swaps/fits-read";
import type { StoredFitsPick } from "../lib/swaps/fits-read-state";

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
  /**
   * Count of this set's base-run printings — the denominator every completion figure
   * divides by. Written by a post-load pass over `printings`, never by the sets ingest,
   * because it is a fact about printings. NULL means "not indexed yet".
   */
  baseSetSize: integer("base_set_size"),
  digital: boolean("digital").notNull().default(false),
  iconSvgUri: text("icon_svg_uri"),
  /**
   * Scryfall's own `parent_set_code`, lowercase — present on a subset (a bonus sheet, a
   * promo insert tied to one release) and null on a standalone product. No foreign key: the
   * sets ingest upserts in one batch with no ordering guarantee between a subset and its
   * parent, and Postgres would refuse a row that named a parent not yet written.
   */
  parentSetCode: text("parent_set_code"),
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
  // The frame-free 626×457 crop. `imageUri` carries Magic's own printed name and
  // type line, which collide with our labels wherever art sits behind text.
  artCropUri: text("art_crop_uri"),
  rarity: text("rarity").notNull(),
  /**
   * Scryfall's own layout word — `normal`, `transform`, `modal_dfc`, `split`,
   * `adventure`. Stored because it is the only reliable answer to "does this
   * card have a back": the `//` in a name, in a type line or in the joined
   * oracle text is shared with split and adventure cards, which have nothing
   * to turn over. Defaults to `normal`, so a row written before the re-seed
   * under-claims — a missing mark, never a mark promising a flip the modal
   * cannot deliver.
   */
  layout: text("layout").notNull().default("normal"),
  /** The second face's art. Null for every layout with one face or one image. */
  backImageUri: text("back_image_uri"),
  /**
   * WotC's Game Changers list, as Scryfall's own boolean on the card object.
   *
   * A column rather than a transcribed list, and that is the whole point: the list is
   * maintained by WotC, republished by Scryfall, and refreshed here by the weekly catalog
   * job, so it maintains itself. A copy checked into this repository would go stale
   * silently, and the failure mode is a deck slotted into a bracket it has outgrown.
   *
   * Defaults false, so a row written before the re-seed UNDER-claims — it loses a mark
   * rather than inventing one. Same reasoning as `layout` above.
   */
  gameChanger: boolean("game_changer").notNull().default(false),
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
  /**
   * THIS printing's frame-free 626×457 crop — `cards.art_crop_uri` is the same crop stored
   * once per oracle id, taken from one arbitrary printing, which is what drew another
   * printing's art behind a commander the player owns in a different one.
   *
   * Null on every row written before this column existed, and Scryfall's docs forbid
   * constructing the URL, so a reader falls back to the oracle-level crop until the next
   * catalog refresh fills it — which is exactly where it stood before.
   */
  artCropUri: text("art_crop_uri"),
  /**
   * THIS printing's back face, for the layouts that have one. `cards.back_image_uri` is the
   * same art stored once per oracle id, which is why a flip on a picked printing used to
   * show a back belonging to another printing entirely — Secret Lair and the borderless
   * treatments redraw both faces.
   *
   * Null on every single-faced printing, and on a row written before this column existed:
   * the reader falls back to the oracle-level image, which is where it stood before.
   */
  backImageUri: text("back_image_uri"),
  finishes: text("finishes").array().notNull(),          // nonfoil | foil | etched
  isVariant: boolean("is_variant").notNull().default(false),
  // Computed by a post-load pass (see setRepresentativePrintings) so reads are a plain
  // `where is_representative` instead of a natural-sort DISTINCT ON on every query.
  isRepresentative: boolean("is_representative").notNull().default(false),
  // The name printed on this printing when it is not its oracle card's — Secret Lair's renames
  // (#467). Null on all but a few hundred printings, which is why its index is partial.
  flavorName: text("flavor_name"),
  /**
   * Scryfall's booster flag — the base-run boundary a set page divides by. NULLABLE on
   * purpose: a row written before the re-seed has no answer, and `false` would be a lie
   * that reads as "this is an extra". A set whose rows are all null is not indexed yet,
   * which is a state the index draws rather than a percentage it invents.
   */
  booster: boolean("booster"),
  /**
   * This printing's rarity, as opposed to `cards.rarity`, which is oracle-level and taken
   * from one arbitrary printing: Sacred Foundry is rare in `eoe` and mythic in `exp`.
   * Nullable for the same reason as `booster`.
   */
  rarity: text("rarity"),
}, (t) => [
  index("printings_oracle_set_idx").on(t.oracleId, t.setCode),
  // Set-first, because every set-collection read filters on set_code alone and the
  // oracle-first index above cannot serve that: without this each set page, and each
  // owned-set index build, scans the whole printing catalogue.
  index("printings_set_code_idx").on(t.setCode),
  index("printings_oracle_idx").on(t.oracleId),
  // Partial, and that is the whole point of it: both readers want every row that has a flavor
  // name and none of the millions that do not. Neither can use it to find one name — the import
  // reads the set whole, and the card search's `%q%` ILIKE cannot be accelerated by a btree at
  // all — so what this buys is a few-hundred-row scan in place of a full one.
  index("printings_flavor_name_idx")
    .on(t.flavorName)
    .where(sql`${t.flavorName} is not null`),
]);

/**
 * Ledger of printings that are not cards (`NON_GAME_LAYOUTS` in `lib/cards/game-card.ts`). The
 * FK on `printings.oracle_id` means these can never live in `printings` (they have no row in
 * `cards`). Upload reads the TOKEN_LAYOUTS rows to tell "this ID is a token" from "this ID is
 * genuinely unknown" without a network call; the rest (theme fronts, planes, schemes) are kept
 * out of that read and report as unresolved.
 */
export const skippedPrintings = pgTable("skipped_printings", {
  scryfallId: uuid("scryfall_id").primaryKey(),
  layout: text("layout").notNull(),   // one of NON_GAME_LAYOUTS
  name: text("name").notNull(),
});

/**
 * The tokens Scryfall relates to cards (plan `2026-10-11-tokens-for-my-deck.md`), built by the
 * printings ingest from the `default_cards` bytes it already reads: no new fetch, no `cards` row,
 * and NOT part of the catalog fingerprint, which exists for products built once and copied. Each
 * database builds these from the same bytes, like `printings`.
 *
 * A token's identity is its own `oracle_id`, never its name: Scryfall gives distinct tokens of one
 * name their own ids (six different Goblin tokens), and Hugh's 21 decks make 80 distinct tokens
 * under 61 names. Emblems and art-series cards are layouts of their own and stay out.
 *
 * Upserted and never deleted, like `printings`: a player's ownership will reference these ids, and
 * a withdrawn token costs one stale row. `card_tokens` is the exception, an exact replace per run.
 */
export const tokens = pgTable("tokens", {
  oracleId: uuid("oracle_id").primaryKey(),
  name: text("name").notNull(),
  typeLine: text("type_line").notNull(),
  colors: text("colors").array().notNull(),
  // Text, not integer: a token's power can be `*` or `1+*`. Null for a token with none.
  power: text("power"),
  toughness: text("toughness"),
  // `token`, `double_faced_token` or `reversible_card` (a token Scryfall files under that layout).
  layout: text("layout").notNull(),
  // Where two tokens of one name, colors and stats can only be told apart (two red 1/1 Goblins).
  oracleText: text("oracle_text"),
});

/** Every non-digital printing of a token. Prices and ownership key on these ids. */
export const tokenPrintings = pgTable("token_printings", {
  scryfallId: uuid("scryfall_id").primaryKey(),
  tokenOracleId: uuid("token_oracle_id").notNull().references(() => tokens.oracleId),
  setCode: text("set_code").notNull(),                   // lowercase
  collectorNumber: text("collector_number").notNull(),   // TEXT, as on `printings`
  imageUri: text("image_uri"),
  imageUriSmall: text("image_uri_small"),
  artCropUri: text("art_crop_uri"),
  backImageUri: text("back_image_uri"),
  finishes: text("finishes").array().notNull(),
}, (t) => [
  index("token_printings_token_idx").on(t.tokenOracleId),
]);

/**
 * Mana Pool's price for each TOKEN printing, from the same singles feed and the same run as
 * `printing_prices` (plan `2026-10-11-tokens-for-my-deck.md`, PR 2). A table of its own rather than
 * a relaxed foreign key on `printing_prices`: every reader of that table assumes a card printing,
 * and the change that cannot surprise any of them is the one that touches none of them.
 *
 * Everything `printing_prices` documents holds here, unchanged: the feed omits out-of-stock
 * printings, the ingest upserts and never deletes, a row behind the newest `as_of` is a last-known
 * price and not a live one, and a null `price_cents` beside a set foil price is stocked in foil only.
 */
export const tokenPrintingPrices = pgTable("token_printing_prices", {
  scryfallId: uuid("scryfall_id").primaryKey(),
  priceCents: integer("price_cents"),
  priceCentsNm: integer("price_cents_nm"),
  priceCentsFoil: integer("price_cents_foil"),
  priceCentsEtched: integer("price_cents_etched"),
  availableQuantity: integer("available_quantity").notNull(),
  buyUrl: text("buy_url"),
  asOf: timestamp("as_of").notNull(),
  /**
   * Mana Pool's OWN name, set code and collector number for the product this row prices, as the
   * feed gives them. A token link names these, not Scryfall's: 42% of priced token printings differ
   * (a double-faced token card is `Soldier // Eldrazi`, number `1-17`, under the single token's
   * Scryfall id), and a line that does not match the product is not placed exactly.
   */
  productName: text("product_name"),
  productSet: text("product_set"),
  productNumber: text("product_number"),
}, (t) => [
  // Named by hand: the generated name (`token_printing_prices_scryfall_id_token_printings_scryfall_id_fk`)
  // is 64 bytes and Postgres keeps 63, so the constraint would be stored under a name the schema
  // does not say (`scripts/lib/constraints.test.mts`).
  foreignKey({ name: "token_prices_printing_fk", columns: [t.scryfallId], foreignColumns: [tokenPrintings.scryfallId] })
    .onDelete("cascade"),
]);

/**
 * The tokens a player holds (plan `2026-10-11-tokens-for-my-deck.md`, PR 3). Keyed by the token's own
 * oracle id: any printing counts, and one Treasure on the shelf is owned in every deck that makes one.
 * `collection_items` cannot hold a token (its `oracle_id` is a foreign key to `cards`), so this is the
 * record, and it starts EMPTY: until a player's next upload, nothing here says they own none.
 *
 * Two sources, and they are not interchangeable. An `upload` row is what the last confirmed upload
 * read; the next upload replaces them all (Replace) or adds to them (Add). A `manual` row is the
 * player's own `I have one` (quantity 1) and an upload NEVER removes it, because a CSV may simply leave
 * tokens out; only the player unmarks it. If an upload reads a token the player had marked, the row
 * becomes an upload row and keeps no manual flag.
 */
export const tokenOwnership = pgTable("token_ownership", {
  userId: text("user_id").notNull(),
  tokenOracleId: uuid("token_oracle_id").notNull().references(() => tokens.oracleId),
  quantity: integer("quantity").notNull(),
  source: text("source", { enum: ["upload", "manual"] }).notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.tokenOracleId] }),
  check("token_ownership_quantity_positive", sql`${t.quantity} > 0`),
  check("token_ownership_source_check", sql`${t.source} in ('upload', 'manual')`),
]);

/**
 * That a player's tokens have been READ: one row per account, written in the same transaction as every
 * confirmed upload, INCLUDING one that read no token. It is what tells "not owned" from "not known": an
 * empty `token_ownership` beside a row here means the upload was read and held no tokens, and beside no
 * row it means nobody has looked. A manual mark never writes it, or one mark would turn every unmarked
 * token on the account from "not known" into "not owned".
 */
export const tokenReads = pgTable("token_reads", {
  userId: text("user_id").primaryKey(),
  uploadId: uuid("upload_id"),
  readAt: timestamp("read_at").notNull().defaultNow(),
});

/**
 * A token a player has put on ONE deck's Shopping list (plan `2026-10-11-tokens-for-my-deck.md`, PR 4).
 * Per deck, because Shopping is per deck; the token's own `oracle_id` is the identity. Holding a token
 * (an ownership row) is also drawn as not joined by the READERS, and the two writers of ownership (the hand
 * mark and an upload that reads the token) delete the player's joins for it in the same transaction, so
 * owned means off every deck's list and an unmark restores none. `user_id` is carried so no
 * read needs a join to `decks` to scope by player.
 */
export const deckTokenJoins = pgTable("deck_token_joins", {
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  tokenOracleId: uuid("token_oracle_id").notNull().references(() => tokens.oracleId),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.deckId, t.tokenOracleId] }),
  index("deck_token_joins_user_idx").on(t.userId),
]);

/** Which card makes which token: `all_parts` entries with `component: "token"`, nothing else. */
export const cardTokens = pgTable("card_tokens", {
  cardOracleId: uuid("card_oracle_id").notNull().references(() => cards.oracleId, { onDelete: "cascade" }),
  tokenOracleId: uuid("token_oracle_id").notNull().references(() => tokens.oracleId),
}, (t) => [
  primaryKey({ columns: [t.cardOracleId, t.tokenOracleId] }),
  // The primary key serves "which tokens does this card make"; a deck's tokens read the other way.
  index("card_tokens_token_idx").on(t.tokenOracleId),
]);

/**
 * ManaPool's price for each printing. Refreshed weekly by its own workflow —
 * price is the one field that genuinely moves, and tying it to the monthly
 * catalog cadence would make the number wrong more often than right.
 *
 * A printing absent from this table has never been stocked at ManaPool in any
 * run so far; the feed omits out-of-stock cards rather than listing them at
 * zero. **Presence is not the same as being stocked now.** The ingest upserts
 * and never deletes, so a printing that sells out keeps its last row with a
 * frozen `as_of` — deleting it would blank the price for the length of every
 * load and lose the last known figure. A reader that needs "stocked now" must
 * compare the row's `as_of` to the newest `as_of` in the table; a row behind
 * that mark is a last-known price, not a live one.
 *
 * A row with a null `price_cents` but a set `price_cents_foil` is stocked in
 * foil only. None of these are "free" or "unknown" — they are distinct states,
 * and rendering them as one another is the mistake this comment exists to stop.
 */
export const printingPrices = pgTable("printing_prices", {
  scryfallId: uuid("scryfall_id").primaryKey()
    .references(() => printings.scryfallId, { onDelete: "cascade" }),
  // Cheapest non-foil listing. Null means the only stock is foil or etched —
  // 13,738 of 102,587 feed rows on 2026-08-29. Never defaulted to 0: a zero
  // would render a real price of nothing.
  priceCents: integer("price_cents"),
  priceCentsNm: integer("price_cents_nm"),
  priceCentsFoil: integer("price_cents_foil"),
  priceCentsEtched: integer("price_cents_etched"),
  // NOT NULL with no DEFAULT. The feed sets this on every row and never sends
  // null or zero, so a default could only ever fire for a row the feed did not
  // describe — and would be indistinguishable from real out-of-stock data.
  availableQuantity: integer("available_quantity").notNull(),
  buyUrl: text("buy_url"),
  // From the payload's meta.as_of, not ingest wall-clock. Recording when
  // ManaPool computed the price is what makes a staleness claim truthful.
  asOf: timestamp("as_of").notNull(),
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

/**
 * One collection row's state on one side of a ledger entry: what `collection_items` held for
 * that key, or `null` when the row did not exist.
 */
export type HistoryRowState = { quantity: number; scryfallId: string | null; condition: string | null };

/**
 * One row a ledger entry changed. `name` is the card's name AT WRITE TIME, so an entry still
 * names its card after the catalog drops it (a revert of that card then fails by name).
 */
export type HistoryRow = {
  oracleId: string;
  setCode: string;
  collectorNumber: string;
  finish: string;
  name: string;
  before: HistoryRowState | null;
  after: HistoryRowState | null;
  /**
   * Where an added copy went, on the card a purchase's pick reserved, and only when the press WROTE
   * that reservation: `deckId` is the deck it went to, `displaced` the other deck's reservation the
   * move deleted, as it stood. A retry reads it to answer as the first request did, and the undo
   * reads it to know what it may put back. Absent on every other row and entry.
   */
  placed?: { deckId: string; createdAt?: string; displaced?: { deckId: string; copies: number; createdAt: string } };
};

/**
 * The collection ledger (collection foundation, sub-project 1; plan
 * `2026-10-09-collection-write-path.md`). One entry per collection write made through
 * `applyCollectionChange`, holding the before and after of every row it changed.
 *
 * `id` is the CALLER's idempotency id, minted once per action and reused on retry, so a second
 * submit of the same action finds its own committed entry instead of applying again. `seq` is
 * the collection half of the score generation (`recs/store.ts`); it only ever grows, because
 * retention PRUNES an entry's `rows` and never deletes the entry.
 *
 * It carries the `user_data_touch` trigger (migration 0083): Home's score compute reads the
 * generation off it, and `check:list-cache` requires every per-user table Home reads to move the
 * reader's stamp.
 */
export const collectionHistory = pgTable("collection_history", {
  id: uuid("id").primaryKey(),
  seq: bigserial("seq", { mode: "number" }).notNull().unique(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  kind: text("kind", { enum: ["upload_replace", "upload_add", "add", "edit", "revert"] }).notNull(),
  // 'csv_uploads:<id>' | 'shopping:<deck id>' | null
  source: text("source"),
  // Null while the entry is being written inside its own transaction, and once pruned.
  rows: jsonb("rows").$type<HistoryRow[]>(),
  prunedAt: timestamp("pruned_at"),
  raised: integer("raised").notNull(),
  lowered: integer("lowered").notNull(),
  revertsId: uuid("reverts_id").unique().references((): AnyPgColumn => collectionHistory.id),
  revertedBy: uuid("reverted_by").references((): AnyPgColumn => collectionHistory.id),
}, (t) => [
  index("collection_history_user_created_idx").on(t.userId, t.createdAt.desc()),
  check(
    "collection_history_kind_check",
    sql`${t.kind} in ('upload_replace', 'upload_add', 'add', 'edit', 'revert')`,
  ),
]);

/**
 * Which printing of a card the user chose to represent it (#105). One row per card per user,
 * so re-picking is an upsert on the primary key and (set_code, collector_number) is the value.
 *
 * Keyed on (set_code, collector_number) rather than scryfall_id because bare `Name,Qty` exports
 * carry no Scryfall ID at all, and collector number is the granularity the picker offers.
 *
 * There is deliberately NO foreign key to collection_items. replaceCollection deletes and
 * re-inserts every holding on each upload, so a FK — cascading or not — would wipe every pick
 * on every re-import. A pick whose printing is no longer owned lies dormant instead, and
 * re-acquiring the card reactivates it.
 */
export const cardArtPreferences = pgTable("card_art_preferences", {
  userId: text("user_id").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  setCode: text("set_code").notNull(),                              // lowercase, as stored everywhere
  collectorNumber: text("collector_number").notNull().default(""),  // TEXT — "31", "12a", "★", ""
}, (t) => [primaryKey({ columns: [t.userId, t.oracleId] })]);

/**
 * A shelf the player files decks on. One deck lives in exactly one folder, or
 * in none — chosen deliberately over tags, which answer a different question
 * (what is this deck like) than the one being asked here (where do I keep it).
 * One folder per deck is why this is a column on `decks` and not a join table:
 * a join table would make "two folders" representable, and then something
 * would have to decide which one a deck belongs to at read time.
 *
 * Scoped to `user_id` like every other player-owned table, and named uniquely
 * within that scope — two shelves called "Commander night" are not a state
 * worth being able to reach, and the constraint is in the database rather than
 * in a check the create path could forget.
 */
export const deckFolders = pgTable("deck_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  // This unique index is also the read index: its leading `user_id` serves the
  // per-player filter and the name ordering `listFolders` asks for, so a second
  // index on `user_id` alone would cost writes and storage and buy nothing.
  unique("deck_folders_user_name_key").on(t.userId, t.name),
]);

export const decks = pgTable("decks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  commanderOracleId: uuid("commander_oracle_id").notNull().references(() => cards.oracleId),
  // The pair's order is the column order: `commander_oracle_id` is always the
  // primary. A position field would be a second source of truth for a fact
  // two columns already carry.
  partnerOracleId: uuid("partner_oracle_id").references(() => cards.oracleId),
  notes: text("notes"),
  /**
   * The shelf this deck is filed on, or null for unfiled. NULLABLE because
   * every deck that exists today is unfiled and must stay valid — a required
   * folder would need a fabricated one to migrate into.
   *
   * `set null`, NOT cascade: deleting a shelf must never delete the decks on
   * it. They return to unfiled, which is where they started. Enforced here
   * rather than by the delete query, so no future caller can delete a folder
   * by another route and take its decks with it.
   */
  folderId: uuid("folder_id").references(() => deckFolders.id, { onDelete: "set null" }),
  /**
   * The bracket the PLAYER declared for this deck, 1-5.
   *
   * NEVER INFERRED AND NEVER DEFAULTED. `slotDeck` computes which brackets a deck is
   * permitted and reports a declaration outside that range as DRIFT — a finding of its own —
   * rather than correcting it. Writing a computed value here would collapse the two into one
   * and make the drift unreportable, because there would be nothing left to disagree with.
   *
   * Null is the honest state for every deck that exists today, and stays the state until a
   * player says otherwise. No surface writes it yet.
   */
  declaredBracket: integer("declared_bracket"),
  /**
   * The not-legal cards the player last saw in the deck notices, sorted (readiness F11). Legality
   * is derived live from the deck's cards and has no log sequence to be read against when a card
   * came in by import, so its read state is the SET: a notice is unread while the deck's current
   * offending cards differ from this one. Null until the notices are first opened.
   */
  noticesLegalSeen: uuid("notices_legal_seen").array(),
  /**
   * What the player says this deck is for, in their words (H35) — read by Suggested changes and
   * the deck overview, quoted verbatim, never paraphrased. Null until stated. Up to 240 code
   * points (was 120, widened for H35).
   */
  intent: text("intent"),
  /**
   * DEAD WEIGHT since H35 (ruling 3): a fill no longer seeds a line, and nothing writes true
   * here any more. Kept for now rather than dropped — the column's future is engineering's call
   * — but every seeded row was migrated to null when this stopped.
   */
  intentSeeded: boolean("intent_seeded").notNull().default(false),
  /**
   * The Shopping view's per-card limit, in cents (swap tools, ruling 4): a Shopping row whose card
   * costs more is marked, and its cheaper stand-ins are a press away. Remembered per deck. Null is
   * the $10 default, never "off": the limit always applies. Whole dollars of at least 1, which is
   * what the field accepts.
   */
  shoppingLimitCents: integer("shopping_limit_cents"),
  /**
   * "Kept for this deck" (H35, PR 2): what Suggested changes' own swaps stay inside, held per
   * deck rather than per run. All three null until the player sets them — NO SEEDING, unlike
   * `shoppingLimitCents`'s $10 default, because an unset limit here means "no limit" rather than
   * a value the box still has to show. Read, folded into `tuningFingerprint`, and validated the
   * same way `answerBudgetCents` validates the fill's.
   */
  tuningCapCents: integer("tuning_cap_cents"),
  /** Lower-case set codes, or null for every set. Same shape as `SetsField`'s picker. */
  tuningSets: text("tuning_sets").array(),
  /** Only cards the player owns. Null reads as false — "Any card" — same as `answerOwnedOnly`'s
   *  own default, but nullable here because this one is never seeded at creation. */
  tuningOwnedOnly: boolean("tuning_owned_only"),
  /**
   * What the player asked for in Help me choose, when the deck was started from it (F1): the budget
   * cap in whole dollars as cents, the bracket, and the card to build around. Stored as data, so a
   * fill that failed at creation has them when its retry (`fillDeck`) runs: the same budget and
   * bracket gates, and the card placed first. All null for a deck started any other way.
   */
  answerBudgetCents: integer("answer_budget_cents"),
  answerBracket: integer("answer_bracket"),
  answerCardOracleId: uuid("answer_card_oracle_id").references(() => cards.oracleId),
  /** Help me choose's *Only cards I own* (three answers §3): the 99 is filled from the player's
   *  own cards, at the create and again by a retry. False for every other deck. */
  answerOwnedOnly: boolean("answer_owned_only").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  /**
   * When this deck's contents last changed — a card added or removed, basics
   * set, a fill or a sweep run, a rename, a commander swapped. Home's resume
   * block sorts on it, and the row's stamp names it: `edited 2h ago`.
   *
   * NOT NULL with a default, so no reader branches on null and no backfill can
   * be forgotten, and the migration seeds it from `created_at` rather than
   * `now()` — stamping every existing deck with the deploy instant would order
   * the whole list by an event that never happened.
   *
   * Three things deliberately do not write it. A commit has its own column
   * (`deck_versions.committed_at`) and a game has its own row, so touching here
   * would fold both into "edited" and the other two verbs would never print.
   * Filing a deck on a shelf is not work on the deck. And an open is not
   * recorded at all — a sort keyed on glances fills the block with whatever was
   * looked at rather than what was done.
   */
  lastEditedAt: timestamp("last_edited_at").notNull().defaultNow(),
  // True once a fill has run against this deck — including a fill that found
  // nothing to add, because a collection thin enough to plan zero rows still
  // answers the question this column exists to answer. Never reset by a sweep:
  // the swept-empty copy branches on "was this ever filled", not "is it filled".
  filled: boolean("filled").notNull().default(false),
  // The precon (`precons.file_name`) a deck was started from, by "Start a deck from this". A link
  // the deck keeps, not a key: no foreign key, because the precon ingest replaces its tables whole,
  // and a precon a later feed drops must not take the deck's record of where it began with it.
  builtFromPrecon: text("built_from_precon"),
},
  (t) => [
    // 1-5 or nothing. A 0 or a 6 is not a bracket, and a column that accepts one would put a
    // value on screen that WotC's system has no name for.
    check(
      "decks_declared_bracket_range",
      sql`${t.declaredBracket} is null or ${t.declaredBracket} between 1 and 5`,
    ),
    // Code points, as Postgres's char_length counts them — the app's cap counts the same way.
    // 240, up from 120 (H35): the description is read by two model readers now, not one.
    check("decks_intent_length_check", sql`${t.intent} is null or char_length(${t.intent}) <= 240`),
    check("decks_answer_budget_check", sql`${t.answerBudgetCents} is null or (${t.answerBudgetCents} >= 100 and ${t.answerBudgetCents} % 100 = 0)`),
    check("decks_answer_bracket_range", sql`${t.answerBracket} is null or ${t.answerBracket} between 1 and 5`),
    check(
      "decks_shopping_limit_check",
      sql`${t.shoppingLimitCents} is null or (${t.shoppingLimitCents} >= 100 and ${t.shoppingLimitCents} % 100 = 0)`,
    ),
    check(
      "decks_tuning_cap_check",
      sql`${t.tuningCapCents} is null or (${t.tuningCapCents} >= 100 and ${t.tuningCapCents} % 100 = 0)`,
    ),
    check(
      "decks_partner_distinct",
      sql`${t.partnerOracleId} is null or ${t.partnerOracleId} <> ${t.commanderOracleId}`,
    ),
    // The deck grid groups by folder within one player's decks, which is this
    // index.
    index("decks_user_folder_idx").on(t.userId, t.folderId),
    // And this one, keyed on `folder_id` alone, is for the lookups that have no
    // user to narrow by: the foreign key's own `on delete set null` scan when a
    // folder is deleted. A composite index led by `user_id` cannot serve it.
    index("decks_folder_idx").on(t.folderId),
    // `notBuiltBy` is a CORRELATED `not exists`, so it is evaluated once per
    // candidate row — ~3,100 of them on the discover lane, and one per stored
    // score on the detail page's rank window. Unindexed, each of those probes is
    // a scan of every user's decks. One index per column the predicate reads,
    // both led by `user_id` so the probe lands on one player's rows first.
    index("decks_user_commander_idx").on(t.userId, t.commanderOracleId),
    index("decks_user_partner_idx").on(t.userId, t.partnerOracleId),
  ],
);

export const deckCards = pgTable("deck_cards", {
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  quantity: integer("quantity").notNull().default(1),
  // A row the fill added that the player has not claimed. Cleared by the keep
  // control and by every commit (Hugh, 2026-09-28: committing a list claims all of
  // it). Re-sorting, regrouping, or opening the card detail must leave it set, or
  // the sweep would silently spare cards the player only looked at.
  auto: boolean("auto").notNull().default(false),
}, (t) => [primaryKey({ columns: [t.deckId, t.oracleId] })]);

/**
 * One deck's statement that its copy of a card is printed rather than owned.
 *
 * A side table rather than a column on `deck_cards`, for two reasons that each
 * decide it alone. Neither commander is a `deck_cards` row — both are columns on
 * `decks` — so a column there could not express a proxied commander at all. And
 * proxy state sits OUTSIDE versioning: a column would have to be either absent
 * from `deck_version_cards`, an asymmetry between the two lists waiting to be
 * read wrong, or present and deliberately ignored.
 *
 * No quantity. A proxy covers the deck's whole ask for the card; Commander is a
 * singleton format and the multi-copy exceptions would be printed as a set.
 *
 * A REMOVED SLOT TAKES ITS PROXY WITH IT. `pruneOrphanProxies` reconciles this
 * deck's rows against current membership, and all six writes that can shrink a
 * list call it inside their own transaction. That — not the reads — is what
 * stops a card returning to a deck silently already proxied: an orphan row that
 * merely went unread would match again the moment the card came back.
 *
 * The reads are membership-scoped as well, as defence in depth behind the
 * prune. Note that a committed deck's claims come from `deck_version_cards`
 * rather than `deck_cards`, so read-side scoping alone would not even cover a
 * draft removal from a sleeved deck.
 *
 * `created_at` is not decoration: `/collection/proxies` orders on it, and it is
 * the only record of when a printed copy entered a deck.
 */
export const deckProxies = pgTable("deck_proxies", {
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.deckId, t.oracleId] }),
  // The primary key's order serves the claim anti-join, which always knows the
  // deck. The card detail receipt asks the opposite question — every deck
  // proxying THIS card — and would scan the table for it.
  index("deck_proxies_oracle_idx").on(t.oracleId, t.deckId),
]);

/**
 * The printing a deck means for one card the player owns in more than one printing (deck
 * printings, collection home sub-project 3). The deck shows, prices and exports it.
 *
 * Shaped like `deck_proxies`, and for the same reasons: a statement about one slot, outside
 * versioning (a pick is not a deck edit), keyed per deck so a commander, which is not a
 * `deck_cards` row, can carry one. Membership-scoped on every read, and pruned with the proxies
 * when its card leaves the deck.
 *
 * A pick names a printing the player held when it was made. A printing that later leaves the
 * Collection is IGNORED by the reads rather than deleted: a Replace upload deletes and re-adds
 * the whole collection in one transaction, and deleting on that would wipe every deck's picks.
 *
 * `set_code` is lowercase and `collector_number` is text, matching `card_art_preferences`.
 */
export const deckPrintings = pgTable("deck_printings", {
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  setCode: text("set_code").notNull(),
  collectorNumber: text("collector_number").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.deckId, t.oracleId] })]);

/**
 * A player's "never cut this" on one card in one deck (Locked, sub-project 5.1). The tools that
 * cut cards (tuning's suggestions, the swaps, the sweeps) read it as a FILTER inside their own
 * transaction; the lock is never an instruction a model is trusted to follow.
 *
 * Shaped like `deck_proxies`, and for the same reason: a statement about one slot, not versioned,
 * membership-scoped on every read. Membership is `deck_cards` ALONE: a commander is never cut, so
 * it is never offered a lock.
 *
 * `removed_at` is the one thing a proxy does not have. A removal leaves the row DORMANT rather
 * than deleting it (`pruneOrphanLocks`), because the lock ends only if the removal STAYS (L1):
 * Undo, Put back and a discard bring the card back locked, and the review screen's Put back runs
 * sessions after the removal, with nothing but this row to remember the lock by. A commit deletes
 * the dormant rows (the removal stayed). Every OTHER way a card comes back arrives unlocked, and
 * that is an `after insert` trigger on `deck_cards` (migration `never_cut`), which deletes a
 * dormant row for the inserted card and never a live one: one place every add passes through.
 */
export const deckLocks = pgTable("deck_locks", {
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  removedAt: timestamp("removed_at"),
}, (t) => [
  primaryKey({ columns: [t.deckId, t.oracleId] }),
  // Pull it asks about every deck holding a card, the opposite order to the key's.
  index("deck_locks_oracle_idx").on(t.oracleId, t.deckId),
]);

/**
 * One committed state of a deck: what was sleeved, when, and why.
 *
 * A version stores the FULL list rather than a diff from its predecessor.
 * Roughly 99 rows per commit costs nothing, whereas a diff chain would make
 * "what is sleeved right now" a fold over history — and that read runs inside
 * the claim model on every availability query in the application.
 *
 * Both commander columns are snapshotted because changing a commander is a
 * version boundary like any other, and the claim model unions those columns
 * alongside the decklist. Without them the claim query would have to read the
 * live `decks` row for part of its answer, mixing draft truth and committed
 * truth in the one query that must never mix them.
 *
 * There is deliberately NO `is_draft` column anywhere. Draft state is
 * `deck_cards` differing from the newest version, so no flag can go stale
 * against the rows it describes. A deck with no row here is a brew.
 */
export const deckVersions = pgTable("deck_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  committedAt: timestamp("committed_at").notNull().defaultNow(),
  // Why this version exists, in the player's words. Unrecoverable afterwards,
  // which is why it is offered at commit time and never inferred.
  note: text("note"),
  commanderOracleId: uuid("commander_oracle_id").notNull().references(() => cards.oracleId),
  partnerOracleId: uuid("partner_oracle_id").references(() => cards.oracleId),
  // When this deck first sleeved each commander, in an unbroken run up to now.
  // Not the same as committed_at: see deckVersionCards.since below, which these
  // two mirror for the columns that are not deck_cards rows.
  commanderSince: timestamp("commander_since").notNull().defaultNow(),
  partnerSince: timestamp("partner_since"),
  /**
   * The printing each commander showed when this version was committed (deck printings, PR 2
   * writes them). Commanders are not `deck_version_cards` rows, so their printing lives here, in
   * the same shape as `deck_version_cards.set_code` / `collector_number`. Null on every version
   * committed before the line, which reads as today's resolver: older versions show today's art.
   */
  commanderSetCode: text("commander_set_code"),
  commanderCollectorNumber: text("commander_collector_number"),
  partnerSetCode: text("partner_set_code"),
  partnerCollectorNumber: text("partner_collector_number"),
  /**
   * What the player declared FOR THIS VERSION, copied from the deck at commit.
   *
   * The same shape as `commander_oracle_id` above and for the same reason: the deck carries
   * the live answer while a draft is being worked on, and a version carries the answer that
   * was true when it was committed. That is what lets a version say "Version 1: 4/5 split,
   * chose 4" forever, and it is why nothing ever asks a player to change what they said —
   * the old answer is history rather than a live claim.
   *
   * COPIED ONLY WHEN IT FITS. A declaration outside the permitted range of the version being
   * committed is not carried: the version records no declaration rather than one its own
   * cards contradict. The deck-level answer is left standing — stated, not deleted.
   */
  declaredBracket: integer("declared_bracket"),
  /**
   * What that version's cards permitted, as a sorted list, snapshotted at commit.
   *
   * Stored rather than recomputed because the alternative is building a second whole profile
   * from `deck_version_cards` and slotting it — measured at 630ms median and 2.2s on the
   * largest deck — every time a reader looks at a version comparison. Two column reads
   * instead.
   */
  permits: integer("permits").array(),
}, (t) => [
  unique("deck_versions_deck_number_key").on(t.deckId, t.number),
  // The same guard `decks.declared_bracket` carries. A bracket is 1-5 or unanswered, and a
  // check constraint makes a bad write loud where a bad read can only be defended against.
  check(
    "deck_versions_declared_bracket_range",
    sql`${t.declaredBracket} is null or ${t.declaredBracket} between 1 and 5`,
  ),
  index("deck_versions_deck_number_idx").on(t.deckId, t.number),
  // `max(committed_at)` per deck, which Home's resume block asks for once per
  // deck on every load. The index above is ordered by `number` and cannot answer
  // it, so without this the read walks every version of every deck as histories
  // grow. `deck_games_deck_played_idx` is the same shape for the same reason.
  index("deck_versions_deck_committed_idx").on(t.deckId, t.committedAt),
]);

export const deckVersionCards = pgTable("deck_version_cards", {
  versionId: uuid("version_id").notNull()
    .references(() => deckVersions.id, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  quantity: integer("quantity").notNull(),
  /**
   * When this deck first sleeved this card, in an unbroken run up to this
   * version. Seniority orders on it, and it is why it is not enough to order on
   * the version's own `committed_at`: a deck that has held a card for a year and
   * then commits an unrelated swap would jump to the back of the queue on every
   * card it holds, and be told to buy copies already in its own box.
   *
   * Inherited from the predecessor version when that version held the same card,
   * and set to the new version's committed_at when it did not — so a card
   * dropped in v2 and re-added in v4 starts a fresh run at v4, and the deck that
   * sleeved it in between keeps it. Continuity is decided once, at the rare
   * write, rather than folded out of history by the hot read.
   */
  since: timestamp("since").notNull().defaultNow(),
  /**
   * The printing this card showed when the version was committed (deck printings). Null on
   * every row written before the line, which reads as today's resolver. Never part of the
   * draft-versus-version diff, which compares oracle id and quantity: a pick is not a deck edit.
   */
  setCode: text("set_code"),
  collectorNumber: text("collector_number"),
}, (t) => [
  primaryKey({ columns: [t.versionId, t.oracleId] }),
  // The claim model joins version cards by version and orders by since.
  index("deck_version_cards_oracle_idx").on(t.oracleId),
]);

/**
 * One act of the app putting cards into a deck: the build's seed fill, or one
 * top-off the player committed from the last-31 list.
 *
 * The record is immutable. Nothing updates or deletes a pass or its cards —
 * not the keep controls, not the sweep, not an undo — because it records that
 * an event happened, and the provenance ledger's counts are derived by
 * comparing that record against the deck as it stands now. A pass whose cards
 * have all left the deck simply has no live rows, and renders no line.
 */
export const fillPasses = pgTable("fill_passes", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),                       // 'seed' | 'top_off'
  // Stable per deck AND per kind, so a label is read straight off the row: the
  // seed is ordinal 1 of its kind, and "top-off 3" keeps its name after
  // "top-off 1" is undone. Never recomputed — a label derived from a position
  // in the rendered ledger would renumber every time a line dropped out.
  ordinal: integer("ordinal").notNull(),
  // How many slots stood open when this pass committed. The ledger's sentence
  // reads "27 cards you chose from the last 31", and that 31 is unrecoverable
  // afterwards, because the deck has been written to since.
  openSlots: integer("open_slots").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("fill_passes_kind_check", sql`${t.kind} in ('seed', 'top_off')`),
  unique("fill_passes_deck_kind_ordinal_key").on(t.deckId, t.kind, t.ordinal),
  index("fill_passes_deck_idx").on(t.deckId),
]);

/** What a pass placed, at the quantity it placed. Written once, with the pass. */
export const fillPassCards = pgTable("fill_pass_cards", {
  passId: uuid("pass_id").notNull().references(() => fillPasses.id, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  quantity: integer("quantity").notNull().default(1),
}, (t) => [primaryKey({ columns: [t.passId, t.oracleId] })]);

/**
 * One logged Commander game against one deck.
 *
 * user_id is denormalised off decks so the read path can filter by owner
 * without a join. It is written from the session, never from the caller, and
 * the action still loads the deck through requireDeck first — the column is a
 * query convenience, not the authorisation boundary.
 *
 * played_at is when the game happened and is what the history sorts on;
 * created_at is when the row was written and exists only to break ties between
 * two games logged for the same day.
 */
export const deckGames = pgTable("deck_games", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  result: text("result").notNull(),
  podSize: integer("pod_size").notNull(),
  // The version live when the game was played. NULLABLE and `set null`, not
  // cascade: games logged before versioning shipped were played by a list
  // nobody recorded, and null is the accurate value — a backfill would be a
  // fabricated claim. Deleting a version must never delete its games.
  versionId: uuid("version_id").references(() => deckVersions.id, { onDelete: "set null" }),
  playedAt: timestamp("played_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // What happened, in the player's own words — the column #10's deck-tuning
  // handoff specifies, landing ahead of the rest of that feature.
  //
  // SINGULAR. `decks.notes` (plural) already exists and is a different thing;
  // the plan calls that collision out by name. 140 characters is the handoff's
  // cap and the reason the history line needs no truncation: it wraps to three
  // lines at 390px and two at 900px, and that is the whole design.
  //
  // The log form writes it and `logGame` enforces the same cap in code points,
  // so this check is the backstop rather than the only gate. A game ALREADY
  // logged is the exception: #9 ships no edit action, so a note added to one
  // afterwards is written by hand, and then this check is all there is.
  note: text("note"),
}, (t) => [
  check("deck_games_result_check", sql`${t.result} in ('win', 'loss', 'draw')`),
  check("deck_games_note_length_check", sql`${t.note} is null or char_length(${t.note}) <= 140`),
  check("deck_games_pod_size_check", sql`${t.podSize} between 2 and 8`),
  index("deck_games_deck_played_idx").on(t.deckId, t.playedAt),
]);

/**
 * A deck's notes: short one-line reminders ("try a second sweeper") the player keeps WITH the deck.
 *
 * Keyed on the deck, not a version, because a note spans commits and a draft has no version at all.
 * `on delete cascade` from `decks`, as `deck_games` is.
 *
 * `body` holds the player's text with each card tag stored as `[[<oracle uuid>|<name then>]]` (see
 * `lib/decks/notes-body.ts`), so the stored text is LONGER than what draws: the action caps the RENDERED
 * length at 140 code points and this check is only the loose backstop. The 100-notes-per-deck cap is not
 * a check (a row count cannot be one); `insertNote` (called by `addNote`) enforces it under a lock on the deck row.
 *
 * `done_at` is null while the note is open. `created_at` is the date drawn; an edit never moves it and
 * `updated_at` is null until the first edit. No ordering column, no reminder, no due date, no sharing.
 *
 * No `user_data_touch` trigger: only the deck page reads this table (Home and `/decks` do not), so
 * `check:list-cache` stays green.
 */
export const deckNotes = pgTable("deck_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  body: text("body").notNull(),
  doneAt: timestamp("done_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (t) => [
  check("deck_notes_body_length_check", sql`char_length(${t.body}) between 1 and 1000`),
  index("deck_notes_deck_created_idx").on(t.deckId, t.createdAt),
]);

/**
 * What worked and what hurt in one game.
 *
 * The composite primary key on (game_id, axis) is the whole point of the
 * table: it makes "mana worked AND mana hurt in the same game" unrepresentable
 * in the database rather than something the aggregation has to reconcile. The
 * form enforces the same rule as a move — ticking an axis on one side unticks
 * it on the other — so a violation reaching Postgres means someone called the
 * action directly.
 *
 * axis is intentionally unconstrained by a check(). Retiring an axis from the
 * vocabulary must not invalidate the games that used it; src/lib/decks/game-axes.ts
 * is the vocabulary, and the action validates against it.
 */
export const deckGameAxes = pgTable("deck_game_axes", {
  gameId: uuid("game_id").notNull().references(() => deckGames.id, { onDelete: "cascade" }),
  axis: text("axis").notNull(),
  polarity: text("polarity").notNull(),
}, (t) => [
  primaryKey({ columns: [t.gameId, t.axis] }),
  check("deck_game_axes_polarity_check", sql`${t.polarity} in ('worked', 'hurt')`),
]);

/**
 * Lines an import could not match to a card, kept alongside the deck they came from.
 *
 * There is deliberately NO foreign key to cards — the whole point of a row here is that no
 * oracle_id was found. There is also no unique key on (deck_id, raw_name): the same
 * unmatched name can legitimately appear on two source lines, and source_line is what the
 * resolution UI shows the player to locate it in their original list.
 */
export const deckUnresolvedRows = pgTable("deck_unresolved_rows", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  rawName: text("raw_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  sourceLine: integer("source_line").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("deck_unresolved_rows_deck_idx").on(t.deckId)]);

export const edhrecCache = pgTable("edhrec_cache", {
  commanderOracleId: uuid("commander_oracle_id").primaryKey().references(() => cards.oracleId),
  payload: jsonb("payload").notNull(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
});

/** Mirrors the roleCounts shape produced by src/lib/recs/score.ts. */
export type RoleCounts = Record<"ramp" | "draw" | "removal" | "wipes", number>;

/**
 * The `rank_score` a row carries when nothing wrote one. See the column below.
 *
 * Migration 0017 hardcodes this value; changing it here alone would leave the two
 * disagreeing and the sentinel unrecognisable.
 */
export const RANK_SCORE_UNWRITTEN = -1;

/**
 * Which writer produced a `commander_scores` row.
 *
 * A second sentinel, of the same shape and for the same reason as
 * `RANK_SCORE_UNWRITTEN`: the column's DEFAULT is what the *previous*
 * deployment's inserts land with, because that code does not know the column
 * exists, and every insert from this schema names it. So a row carrying
 * anything below `SCORE_WRITER_CURRENT` was written by an older writer, and the
 * reader can say so without a timestamp or a deploy marker.
 *
 * Version 2 is the first writer that scores built commanders. Version 1's sets
 * have them deleted — `persistScores` removes every row its compute does not
 * name — and such a set is neither empty nor degraded, so without this the read
 * would serve it as warm and the commander would never come back. It also closes
 * the deployment window: migrations run before the new build goes live, so the
 * old writer can repopulate the table in between, and a one-off `DELETE` would
 * be undone by it. Rows written in that window carry the default and are refused
 * like any other stale row.
 *
 * Version 3 is the first writer whose SYNERGY comes from the stored commander
 * index rather than the live EDHREC payload — Ruling D of the commander-row
 * spec. This is the case the mechanism was built for and the least visible: the
 * rows are the same SHAPE and a different MEANING, so nothing about a version-2
 * row looks stale. `probe:fit-parity` measured the two sources disagreeing on 20
 * of 95 commanders, which is how far a warm version-2 set would have been out.
 * The deployment window argument applies unchanged.
 *
 * Version 4 is the first writer that takes `SCORE_INDEX_LOCK` and checks the
 * index generation, and it is bumped for the DEPLOYMENT WINDOW alone — the two
 * writers read synergy from the same place and produce identical rows. A
 * version-3 writer calls `persistScores` with three arguments, so it takes no
 * lock and compares no fingerprint: during this rollout it can insert after a
 * rebuild's clear and mark those rows 3, and a version-3 row written safely
 * before the rollout is indistinguishable from one written into that gap. So
 * the whole version is refused rather than the unsafe subset, which is the only
 * distinction the column can draw. The cost is one recompute per reader, which
 * is what every bump here costs.
 *
 * Version 5 is the first writer that orders by the printed figure. Version 4 — the only one
 * that ever wrote a meaningful `rank_score`, since migration 0017 added the column after
 * versions 1-3 and they can only have left its sentinel — rescaled a no-synergy score from
 * 40 back to 100, which put untracked commanders at the top of every list. Version 5 stores
 * `score` itself. The rows are the
 * same shape and one column's MEANING moved, so a version-4 row looks perfectly current
 * while sorting an untracked commander above everything — exactly the blindness this
 * mechanism exists for. The deployment-window argument applies unchanged.
 *
 * Version 6 is the first writer that refuses a melded card as a commander (#712). A
 * version-5 set can hold Brisela or Hanweir, scored and ranked, and nothing about the
 * row says it should not be there: the same rows, a different verdict on which of
 * them may exist. Refusing version 5 makes the next read recompute, and
 * `persistScores` deletes every row it does not name.
 *
 * Version 7 grades the role component against each commander's MEASURED role targets rather
 * than the flat `ROLE_TARGETS` (brief 2026-09-28 §5.4): the same `pickRoleTargets` answer the
 * deck's strip and the fill read. `fit_roles`, `score` and `rank_score` all move, over rows of
 * the same shape — the blindness this mechanism exists for — so a version-6 set is refused and
 * recomputed on its next read. A warm cached payload built from one needs no bump of its own:
 * the deployment rides in every cache key (`cache/deployment.ts`).
 *
 * Version 8 is the collection ledger (plan 2026-10-09, Decision 4). What makes a score current
 * moved: the collection generation is now a token over `max(collection_history.seq)` AND
 * `max(csv_uploads.confirmed_at)`, because a hand edit moves only the first. A previous
 * deployment compares the timestamp alone and could put back scores a ledger write just
 * cleared, so its rows are refused.
 *
 * Version 9 is the label role reader's tightening (draw for opponents, land-to-hand and narrow
 * discounts no longer count). Rows counted by labels under version 8 hold role counts the reader
 * no longer produces, so they are refused and recomputed.
 *
 * Version 10 is the unlabeled-card rule (labels-everywhere PR 9): a card with no fresh label now
 * falls back to the classifier for that card, where version 9 counted it toward no role. Rows
 * counted by labels under version 9 hold role counts the reader no longer produces.
 */
export const SCORE_WRITER_CURRENT = 10;

export const commanderScores = pgTable("commander_scores", {
  userId: text("user_id").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  slug: text("slug").notNull(),
  score: real("score").notNull(),
  // What the list sorts by, and the only thing it is for. It used to be `score` rescaled
  // to a 0-100 axis when the commander had no synergy read, on the argument that a gap in
  // OUR data should not demote anyone — but the weights are 15 + 25 + 60, so that rescale
  // reached untracked commanders alone and multiplied them by 2.5, handing them the top of
  // every list with a perfect 40/40. Writer 5 stores `score` verbatim instead.
  //
  // It keeps its own column rather than being folded into `score`: `loadScores` orders by
  // it in SQL, Home reads it as the ready-to-build floor, and the negative sentinel below
  // rides on it.
  //
  // The default exists for the deployment window alone: 0017 adds this column while the
  // previous deployment is still inserting rows without it. Every insert from this schema
  // writes the column, so the default is never the value that lands — which is what makes
  // it usable as a sentinel. It is negative because a computed rank score cannot be, so
  // `loadScores` can tell a row this code wrote from one it did not.
  rankScore: real("rank_score").notNull().default(RANK_SCORE_UNWRITTEN),
  // See `SCORE_WRITER_CURRENT`. The default is the sentinel: it is what the
  // deployment that does not know this column writes.
  writerVersion: integer("writer_version").notNull().default(1),
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
  // Third key matches the `rank_score desc, oracle_id` tie-break that loadScores
  // and the findScoredCommander rank window both use, so reads need no extra
  // sort step.
  index("commander_scores_rank_idx").on(t.userId, t.rankScore.desc(), t.oracleId),
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

/**
 * One player's decision that a particular deck gets a particular copy of a card,
 * overriding seniority.
 *
 * Seniority (`deckVersionCards.since`) is the DEFAULT and stays the default: when
 * two committed decks want a card the collection has one of, the deck that
 * committed it first gets it. This table is what the player writes when they
 * disagree, and it is deliberately the smallest thing that can express that.
 *
 * WHAT IT DOES NOT DO, and why the alternatives were rejected:
 *
 * - It does not edit the losing deck's list, and no version is cut. Giving a copy
 *   away is not a change to what that deck is trying to be — it still lists the
 *   card and still bills the purchase. `pullCardFromDeck` is the act that DOES
 *   edit a list, and the two must never be confused.
 * - It does not rewrite `since`. That column means "when this card entered this
 *   deck's committed version", and every other reader of it would inherit the lie.
 *
 * A reservation is INERT without a shortage: with enough copies for everyone, NO DECK
 * BUYS ANYTHING, before or after. That is why it needs no expiry.
 *
 * Purchases, precisely — not every figure. `free` is a deck's SURPLUS, and a copy
 * reserved to another deck is not this deck's spare, so a reservation does move a
 * covered deck's `free` from 1 to 0. That is the same reading seniority already gives
 * (a junior claim does not reduce your surplus; a reservation makes one senior for a
 * copy), and `reserved_others` is subtracted unconditionally for that reason. Do not
 * "fix" it by making the subtraction conditional — see probe:claims, which holds a
 * live reservation across the transition and asserts both buy rows and both surpluses. It is deleted when the deck's
 * newest committed version no longer lists the card — a deck that drops a card and
 * adds it back must not resurrect a decision made about a different list — and it
 * cascades when the deck is deleted.
 *
 * Commander copies are never reservable. A commander claim bounds what may be
 * reserved rather than joining the queue ahead of it (see `claimModel`). That was
 * decided while `loadDeckBuyRows` emitted no commander row (#470), when a deck left
 * short of its own commander was short in a way no surface could draw. Since H28 the
 * Shopping list draws it, and the rule stands unchanged: no surface offers to reserve
 * a commander copy.
 */
export const cardAssignments = pgTable("card_assignments", {
  userId: text("user_id").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  /**
   * How many copies this deck is reserved. One assignment is one copy by default,
   * and the chooser writes no other value today — the column exists because the
   * allocation arithmetic is a quantity model rather than a queue position, and a
   * deck asking for four copies of a card can legitimately be handed two.
   */
  copies: integer("copies").notNull().default(1),
  /**
   * Orders reservations against each other when they compete for the same copies,
   * `deckId` breaking the tie. Not decoration: two reservations for one copy are
   * resolved by this, and without a total order the loser would change between two
   * reads of unchanged data.
   */
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  // The natural key IS the key. A surrogate id would allow two rows for a pair the
  // model treats as one reservation.
  primaryKey({ columns: [t.userId, t.oracleId, t.deckId] }),
  // The cascade's own lookup, and the only index this table needs beyond its key. The
  // primary key leads with user_id and oracle_id, so the claim model's read — every
  // reservation this player holds — already uses it; a second index on that same
  // prefix would be pure write cost. What the key cannot answer is "which rows
  // reference this deck", so a deck deletion would scan the whole table without this.
  index("card_assignments_deck_idx").on(t.deckId),
  // A zero or negative value would be a durable row that reduces or inverts the
  // supply arithmetic, and a caller-side guard does not survive the next caller.
  check("card_assignments_copies_positive", sql`${t.copies} > 0`),
]);

/**
 * A copy a `Pull it` took out of a sleeved deck for another deck (Hugh's ruling, 2026-09-27).
 *
 * A pull no longer commits the deck it takes from: it edits that deck's DRAFT, which leaves the
 * source's committed version still listing the card, and a committed version claims its cards
 * against every other deck. This row is what lets the copy go anyway: the claim model subtracts
 * `copies` from the source's committed claim on the card (`all_claims` in availability-query.ts,
 * which both `loadAvailability` and `loadDeckBuyRows` read), so the asking deck finds it free at
 * once and the source reads pending with the card going out.
 *
 * It lives exactly as long as the source's draft does. The source's COMMIT deletes it (the new
 * version no longer lists the card, so there is nothing left to subtract from); its DISCARD deletes
 * it (the card is back, so the copy is claimed again and the asking deck's buy tag returns). No
 * add deletes it, Put back included: `all_claims` never subtracts more than the version lists
 * beyond the draft, so a card back in the draft cancels its own release there, and removing it
 * again before the commit makes the release count once more.
 */
export const pullReleases = pgTable("pull_releases", {
  userId: text("user_id").notNull(),
  sourceDeckId: uuid("source_deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  /** The deck the copy was pulled for, which is who has to be told when the release changes.
   *  Deleting that deck deletes the release: the copy stays out of the source's draft, and the
   *  source's version claims it again, as for any removal nobody has committed. */
  askingDeckId: uuid("asking_deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  copies: integer("copies").notNull().default(1),
  /** When this row was last TOUCHED, not merely created: `writePullRelease`'s conflict path
   *  bumps this on a second pull of the same card from the same source for the same asker, same
   *  as the insert path. `latestReleaseSources` (`pull-release.ts`) orders by this to find which
   *  source a reader's most recent pull on a card came from — without the bump, a conflict-path
   *  update left this at the row's FIRST pull, so a later re-pull from the same source could read
   *  older than a different source's pull made in between, naming the wrong deck. */
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  // One row per card per source PER ASKER, so undoing the release can tell every deck it freed a
  // copy for. A second pull of the same card for the same deck adds a copy to that row; the claim
  // model sums the rows.
  primaryKey({ columns: [t.sourceDeckId, t.oracleId, t.askingDeckId] }),
  // The claim model reads every release a player holds.
  index("pull_releases_user_idx").on(t.userId),
  check("pull_releases_copies_positive", sql`${t.copies} > 0`),
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
  //
  // Also the CONFIRM'S OWN LOCK. `replaceCollection` stamps it with a conditional
  // update — `where confirmed_at is null returning id` — and aborts when no row comes
  // back, so a double submit or a retried request cannot replace the collection twice.
  // A read-then-write check here would not close that: two confirms both read null.
  confirmedAt: timestamp("confirmed_at"),
  /**
   * What the confirm did to the decks: what stopped being a purchase, what started,
   * and which arrived cards more committed decks want than there are copies.
   *
   * WRITTEN AFTER `confirmedAt`, in its own statement, and that is a limitation rather
   * than a choice: two of the three inputs to the diff are queries over the collection
   * the replace has just written, so they cannot run inside the transaction that writes
   * it. A null on a CONFIRMED row therefore means "the receipt did not survive", and the
   * route renders the nothing-to-report state — which is the state the design already
   * draws for an import that moved nothing. The invalidations run BEFORE this write for
   * the same reason: a failed receipt must not also leave stale caches behind.
   *
   * What must never happen is a recompute on a later confirm. It would diff the new
   * collection against itself, find nothing, and overwrite a real receipt with an empty
   * one — so `confirmUpload` returns early on any already-stamped row.
   *
   * Shape: `ArrivalsSummary` in `src/lib/collection/arrivals.ts`, carrying its own
   * version. Frozen on purpose: it is a receipt for one import, and its names are stored
   * so a later rename or a deleted deck cannot rewrite history. The contested section is
   * the exception and stores ids only — a reservation can be made or moved after this is
   * written, so that row's allocation is read live.
   *
   * Null for an abandoned preview, and for any upload confirmed before this column
   * existed.
   */
  summaryPayload: jsonb("summary_payload"),
});

/**
 * Precomputed EDHREC support data for every commander-legal legendary, not just
 * the ones a user owns. #213/#214/#215 all need to score against the whole
 * candidate universe, and a per-request fetch across ~3,000 commanders is not
 * something a request can do — hence an offline index.
 */
export const commanderSupport = pgTable("commander_support", {
  commanderOracleId: uuid("commander_oracle_id").primaryKey().references(() => cards.oracleId),
  // Same three-value distinction commander_scores preserves, and for the same
  // reason: "absent" is a settled fact about a commander EDHREC does not index,
  // "degraded" is an outage worth retrying. Collapsing them loses the retry signal.
  synergyState: text("synergy_state", { enum: ["ok", "absent", "degraded"] }).notNull(),
  // Null iff synergyState !== "ok". Size of the support list, before unresolvable
  // names are dropped — so an unresolvable name reduces measured overlap rather
  // than silently shrinking the denominator.
  edhrecTotal: integer("edhrec_total"),
  tags: jsonb("tags").$type<EdhrecTag[]>().notNull(),
  bracketCounts: jsonb("bracket_counts").$type<Record<string, number>>().notNull(),
  budgetCounts: jsonb("budget_counts").$type<Record<string, number>>().notNull(),
  // EDHREC's own commander-adjacency graph, resolved to ids. Unresolvable names dropped.
  similarOracleIds: uuid("similar_oracle_ids").array().notNull(),
  deckCount: integer("deck_count"),
  rank: integer("rank"),
  saltScore: real("salt_score"),
  // Null when the commander has no rules text to classify.
  engine: text("engine", { enum: ["etb", "triggered", "activated", "tap", "static"] })
    .$type<CommanderEngine>(),
  // The one accepted sentence about how this commander's decks tend to play, or null
  // when none has been accepted. A generated string that fails the prose contract is
  // not stored at all: a missing paragraph reads as missing, a truncated one does not.
  prose: text("prose"),
  // Hash of the inputs the sentence was generated from (oracle id, tag list, prompt
  // version), so a regeneration run can tell a stale sentence from a current one
  // without re-reading the generator.
  proseInputHash: text("prose_input_hash"),
  prosePromptVersion: integer("prose_prompt_version"),
  /**
   * The per-commander composition EDHREC publishes and this app discarded until 2026-09-20 —
   * the average deck for this commander, by type.
   *
   * NULLABLE, every one: a commander whose payload predates the widened parse has no
   * composition, and NULL READS AS ABSENT where a zero would read as "this commander's decks
   * run no lands". The reader falls back down §4A.6b's chain and reports which rung it used.
   *
   * `avgBasic + avgNonbasic = avgLand` — they are a BREAKDOWN of the land count, not two
   * further types. The eight real types sum to exactly 99 on every live payload measured,
   * which is the invariant that makes these trustworthy as a target rather than a statistic.
   */
  avgLand: integer("avg_land"),
  avgBasic: integer("avg_basic"),
  avgNonbasic: integer("avg_nonbasic"),
  avgCreature: integer("avg_creature"),
  avgInstant: integer("avg_instant"),
  avgSorcery: integer("avg_sorcery"),
  avgArtifact: integer("avg_artifact"),
  avgEnchantment: integer("avg_enchantment"),
  avgPlaneswalker: integer("avg_planeswalker"),
  avgBattle: integer("avg_battle"),
  /** `panels.mana_curve` — counts per mana value. Null on the same terms. */
  avgCurve: jsonb("avg_curve").$type<Record<string, number>>(),
  /**
   * Expected count of each functional role in a deck for this commander, MEASURED.
   *
   * Derived as sum(inclusion) over `commander_support_cards` filtered by the app's own
   * `classifyRoles` — never a second copy of those patterns — reading the FRONT FACE only, via
   * `castFaceText`. `oracle_text` holds both faces, so without that split a land-backed MDFC's
   * `{T}: Add {R}` reads as ramp: the mean ramp target is 8.5 on whole text against 7.8 on the
   * front face, and the commanders measuring exactly zero wipes rise from 369 to 390.
   *
   * NULLABLE, because a row written by an index build older than this derivation carries no
   * figure and the basis chain must fall through rather than read a fabricated zero.
   *
   * UNSCALED, deliberately. EDHREC's list covers 45.2 of the 63.5 non-land cards in an average
   * deck, a ratio of 0.711 — but scaling by it is NOT earned: measured against 19 human-built
   * decks, derived beats scaled on three roles of four and removal is the lone exception by
   * 0.11, which is inside the noise of that sample. Ship the number that was measured.
   */
  avgRamp: real("avg_ramp"),
  avgDraw: real("avg_draw"),
  avgRemoval: real("avg_removal"),
  avgWipes: real("avg_wipes"),
  /**
   * The same four targets derived from `card_labels` instead of `classifyRoles` (plan
   * `2026-10-10-labels-everywhere.md`): nonland cards only, a card with no fresh label counting
   * toward no role, and `counterspell` not counted as removal. That is the rule a deck's own
   * label count follows, so a reader counting a deck by label compares against these and never
   * against `avg_*`. They stand BESIDE `avg_*` until every reader of those has moved, because
   * a classifier count measured against a label target reads short on every deck. Nullable for
   * the same reason as `avg_*`.
   */
  labelRamp: real("label_ramp"),
  labelDraw: real("label_draw"),
  labelRemoval: real("label_removal"),
  labelWipes: real("label_wipes"),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (t) => [
  // The enum options above only narrow the TypeScript type; without these the
  // database would accept any text. Same reasoning as commander_scores.
  check("commander_support_synergy_state_check", sql`${t.synergyState} in ('ok', 'absent', 'degraded')`),
  check(
    "commander_support_total_null_check",
    sql`(${t.synergyState} = 'ok') = (${t.edhrecTotal} is not null)`,
  ),
  check(
    "commander_support_engine_check",
    sql`${t.engine} is null or ${t.engine} in ('etb', 'triggered', 'activated', 'tap', 'static')`,
  ),
  // A stored sentence without its provenance cannot be regenerated or audited, and
  // provenance without a sentence describes nothing.
  check(
    "commander_support_prose_check",
    sql`(${t.prose} is null) = (${t.proseInputHash} is null) and (${t.prose} is null) = (${t.prosePromptVersion} is null)`,
  ),
]);

/**
 * Normalised rather than a uuid[] on the header: every consuming query is
 * "intersect this support list with the oracle ids a user has", which is a join
 * Postgres does well and an array containment check does badly at ~700-900k rows.
 */
export const commanderSupportCards = pgTable("commander_support_cards", {
  commanderOracleId: uuid("commander_oracle_id").notNull()
    .references(() => commanderSupport.commanderOracleId, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  // Null when upstream carried none. Never 0 — a 0 draws a real bar for no data.
  inclusion: real("inclusion"),
  synergy: real("synergy"),
}, (t) => [
  primaryKey({ columns: [t.commanderOracleId, t.oracleId] }),
  // #218 traverses this relation in the opposite direction: one card, which
  // commanders support it. The PK's leading column cannot serve that query.
  index("commander_support_cards_oracle_idx").on(t.oracleId),
]);

/**
 * A partner PAIR's own EDHREC page, which neither commander's page describes.
 *
 * `commander_support` is keyed per oracle id and `edhrec_cache` carries an FK to `cards`, so
 * a pair row cannot exist in either without a migration — an earlier draft of the spec said
 * "neither is new machinery" and was wrong on both counts.
 *
 * Verified live 2026-09-20 against `atreus-impulsive-son-kratos-stoic-father`: a real 99,794
 * byte page carrying its own composition, its own `bracket_counts`, `num_decks: 13332` and
 * `rank: 159`. A pair DOES have a joint rank and a joint deck count, which is what makes this
 * table worth having rather than approximating.
 *
 * THE BODY IS 98, NOT 99. Its type counts sum to 100 minus two commanders, so every invariant
 * check must use `deckBodySize(hasPartner)` rather than a literal — measured, not assumed.
 */
export const commanderPairSupport = pgTable("commander_pair_support", {
  commanderOracleId: uuid("commander_oracle_id").notNull().references(() => cards.oracleId),
  partnerOracleId: uuid("partner_oracle_id").notNull().references(() => cards.oracleId),
  synergyState: text("synergy_state", { enum: ["ok", "absent", "degraded"] }).notNull(),
  edhrecTotal: integer("edhrec_total"),
  deckCount: integer("deck_count"),
  rank: integer("rank"),
  bracketCounts: jsonb("bracket_counts").$type<Record<string, number>>().notNull(),
  avgLand: integer("avg_land"),
  avgBasic: integer("avg_basic"),
  avgNonbasic: integer("avg_nonbasic"),
  avgCreature: integer("avg_creature"),
  avgInstant: integer("avg_instant"),
  avgSorcery: integer("avg_sorcery"),
  avgArtifact: integer("avg_artifact"),
  avgEnchantment: integer("avg_enchantment"),
  avgPlaneswalker: integer("avg_planeswalker"),
  avgBattle: integer("avg_battle"),
  /**
   * The four role targets for the PAIR, derived from `commander_pair_support_cards`.
   *
   * Here because the basis chain's pair rung is read BEFORE the commander rung, so without
   * them a partner deck resolves `of: "pair"` and gets measured types with no roles beside
   * them — which is the precise disagreement these columns exist to prevent, arriving through
   * the one rung that had been left out.
   *
   * Nullable for the same reason as the commander rung's: a pair row written before this
   * derivation existed carries no figure, and the chain must fall through rather than read a
   * fabricated zero.
   */
  avgRamp: real("avg_ramp"),
  avgDraw: real("avg_draw"),
  avgRemoval: real("avg_removal"),
  avgWipes: real("avg_wipes"),
  /** The pair's label-derived targets, as `commander_support.label_*` are the commander's. */
  labelRamp: real("label_ramp"),
  labelDraw: real("label_draw"),
  labelRemoval: real("label_removal"),
  labelWipes: real("label_wipes"),
  avgCurve: jsonb("avg_curve").$type<Record<string, number>>(),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.commanderOracleId, t.partnerOracleId] }),
  // CANONICAL ORDER IS THE SCHEMA, not a convention a writer might remember: the
  // lexicographically smaller oracle id is always first, so (A,B) and (B,A) cannot both
  // exist. `decks` stores the pair in a MEANINGFUL order — the primary is first — so every
  // read has to normalise before looking here, and this constraint is what makes forgetting
  // that a loud failure rather than a silent miss.
  check("commander_pair_support_order_check",
    sql`${t.commanderOracleId} < ${t.partnerOracleId}`),
  check("commander_pair_support_total_null_check",
    sql`(${t.synergyState} = 'ok') = (${t.edhrecTotal} is not null)`),
]);

/** A pair's own support list — the cards people actually play with THAT pairing. */
export const commanderPairSupportCards = pgTable("commander_pair_support_cards", {
  commanderOracleId: uuid("commander_oracle_id").notNull(),
  partnerOracleId: uuid("partner_oracle_id").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  inclusion: real("inclusion"),
  synergy: real("synergy"),
  /**
   * The card's place in EDHREC's own ordering.
   *
   * Stored because `suggestions-read` ranks by LIST POSITION (`rankOf`), not by inclusion —
   * so a table holding only the two figures could not rebuild `topCards` without silently
   * changing what "top" means.
   */
  position: integer("position").notNull(),
}, (t) => [
  // BOTH constraints are named explicitly, and that is not tidiness.
  //
  // Drizzle derives a name from the table plus every column, and on a composite key over a
  // table with this name that runs to 130 characters. POSTGRES TRUNCATES AN IDENTIFIER AT 63
  // BYTES, and the primary key and the foreign key here truncate to the SAME 63 — so the
  // second `ADD CONSTRAINT` failed with "already exists" and took the whole migration down.
  //
  // Nothing in the repository catches that. `drizzle-kit check` compares its own snapshots,
  // typecheck and lint never see SQL, and the generated file reads perfectly. It surfaces
  // only when the migration RUNS — which, on a real deployment, is the Vercel production
  // build. `pnpm check:constraints` now fails on any generated name over 63 bytes.
  primaryKey({ name: "commander_pair_support_cards_pk",
    columns: [t.commanderOracleId, t.partnerOracleId, t.oracleId] }),
  foreignKey({
    name: "commander_pair_support_cards_pair_fk",
    columns: [t.commanderOracleId, t.partnerOracleId],
    foreignColumns: [commanderPairSupport.commanderOracleId, commanderPairSupport.partnerOracleId],
  }).onDelete("cascade"),
  // Sub-project 3 asks the opposite question — one card, which pairs play it.
  index("commander_pair_support_cards_oracle_idx").on(t.oracleId),
]);

/**
 * The demand cache for a pair nobody has built yet.
 *
 * A separate table rather than re-keying `edhrec_cache`: that one's primary key is a single
 * oracle id with an FK to `cards`, so a pair row cannot exist in it, and re-keying it would
 * rewrite every existing row for the sake of the dozens of pairs anyone has actually played.
 */
export const edhrecPairCache = pgTable("edhrec_pair_cache", {
  commanderOracleId: uuid("commander_oracle_id").notNull().references(() => cards.oracleId),
  partnerOracleId: uuid("partner_oracle_id").notNull().references(() => cards.oracleId),
  payload: jsonb("payload").notNull(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.commanderOracleId, t.partnerOracleId] }),
  check("edhrec_pair_cache_order_check", sql`${t.commanderOracleId} < ${t.partnerOracleId}`),
]);

/**
 * The measured format staples, per condition.
 *
 * A card is in a condition's floor when it is recommended for at least 50% of that
 * condition's commanders AND played, on average, in at least 20% of their decks. Both axes
 * earn their place and each was defended against a named case rather than an aggregate:
 *
 *   · BREADTH alone admits cards nobody plays. `Temple of the False God` is recommended for
 *     2,296 of 3,279 commanders and played in 12.2% of their decks; a breadth-only floor
 *     puts it beside Sol Ring and tells a new player to run it.
 *   · INCLUSION alone is meaningless globally. `Swords to Plowshares` reads 35.8% breadth
 *     computed across every commander and is a 60.8% white staple — so a global floor
 *     systematically demotes every colour-specific card, and there is NO `all` condition.
 *
 * The 20% bar replaced 25% because 25 discriminated nothing it was defended on: its named
 * case was Temple at 12.2%, which any bar above ~13% excludes. What 25 actually did at the
 * boundary was admit `Swiftfoot Boots` at 32.3% and refuse `Lightning Greaves` at 23.0% —
 * the same card under two names — while dropping a Game Changer from the floor of the
 * identity that plays it most. At 20 the boundary discriminates in both directions:
 * `Teferi's Protection` (20.3%) and `Akroma's Will` (21.0%) admitted, `Cut a Deal` (19.7%)
 * and `Flowering of the White Tree` (19.9%) refused.
 *
 * Basic lands are excluded BY TYPE, never by threshold: `Plains` and `Mountain` top the
 * inclusion ranking at 95%, which is an artifact of appearing only for their own colour.
 */
export const formatStaples = pgTable("format_staples", {
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  /** Exact identity ('C','W','UW',…) or a 'count:N' fallback. See `identityCondition`. */
  condition: text("condition").notNull(),
  /** How many commanders in this condition recommend it. */
  commanders: integer("commanders").notNull(),
  /** The denominator, stored rather than inferred — every figure carries its own. */
  commanderTotal: integer("commander_total").notNull(),
  /** 0-100, the second axis. */
  avgInclusion: real("avg_inclusion").notNull(),
  /**
   * `deck_count`-weighted DISPLAY ORDER only, NEVER a membership test.
   *
   * The distinction is real rather than bookkeeping. Unweighted membership asks "is this
   * recommended for most commanders in this condition" — one commander, one vote. Weighted
   * asks "is it in most decks", which a handful of mega-popular commanders dominate. A floor
   * wants the stable question; a presentation order is free to use the other.
   */
  weightedRank: integer("weighted_rank").notNull(),
}, (t) => [
  primaryKey({ columns: [t.oracleId, t.condition] }),
  // The reader asks "what is the floor for this condition", always.
  index("format_staples_condition_idx").on(t.condition),
]);

/**
 * The composition fallback for a commander with no page of its own.
 *
 * A `GROUP BY` over the same `avg_*` columns — the mean of each count across an identity's
 * commanders, UNWEIGHTED. Each commander in the bucket counts once whatever its deck count,
 * so the target describes the typical ARCHETYPE in those colours rather than the typical
 * DECK: a 50,000-deck commander and a 50-deck one contribute equally. Weighting by
 * `deck_count` would let a handful of popular commanders set the standard for their whole
 * identity, which is the opposite of what a fallback is for.
 *
 * (An earlier draft of this comment said "weighted by `deck_count`" while the derivation
 * never weighted anything — `weight_total` was computed and never read. Corrected rather
 * than implemented: unweighted is the right answer here, and the claim was the drift.)
 *
 * It is an AVERAGE OF AVERAGES either way, and the profile labels it the weaker claim it is:
 * a commander's own page describes decks built with that commander, this describes decks in
 * those colours generally.
 *
 * It matters for two populations. 105 of 3,384 commander-eligible cards are not in the index
 * at all (3.1%) — overwhelmingly newly printed commanders, which is exactly when someone is
 * most eager to build and least able to be told anything. And it covers every deck in the
 * window before a widened index run has populated the per-commander columns.
 */
export const identityComposition = pgTable("identity_composition", {
  /** Same vocabulary as `format_staples`, so one bucket serves the floor and the target. */
  condition: text("condition").primaryKey(),
  avgLand: real("avg_land").notNull(),
  avgBasic: real("avg_basic").notNull(),
  avgNonbasic: real("avg_nonbasic").notNull(),
  avgCreature: real("avg_creature").notNull(),
  avgInstant: real("avg_instant").notNull(),
  avgSorcery: real("avg_sorcery").notNull(),
  avgArtifact: real("avg_artifact").notNull(),
  avgEnchantment: real("avg_enchantment").notNull(),
  avgPlaneswalker: real("avg_planeswalker").notNull(),
  avgBattle: real("avg_battle").notNull(),
  avgCurve: jsonb("avg_curve").$type<Record<string, number>>(),
  /**
   * The same four role targets, for the identity and count rungs of the basis chain.
   *
   * A rung that delivered a type composition with no roles beside it would put measured types
   * next to flat roles on one deck — the exact disagreement §4A.6 of the foundation spec names
   * as the bug.
   *
   * `.default(0)` IS REQUIRED, not cosmetic: `ALTER TABLE ... ADD COLUMN real NOT NULL` with no
   * default FAILS on a populated table, and this one is populated by the time the migration
   * runs. Zero is safe because the very next `db:build:staples` overwrites every row.
   */
  avgRamp: real("avg_ramp").notNull().default(0),
  avgDraw: real("avg_draw").notNull().default(0),
  avgRemoval: real("avg_removal").notNull().default(0),
  avgWipes: real("avg_wipes").notNull().default(0),
  /**
   * The bucket's means of `commander_support.label_*`. NULLABLE, unlike `avg_*` beside them: a
   * bucket none of whose commanders carries a label figure (a database the labelling job has not
   * reached, where the build writes no `label_*`) has no measurement, and a zero there would read as
   * "this identity plays no ramp" to a reader taking the labels basis.
   */
  labelRamp: real("label_ramp"),
  labelDraw: real("label_draw"),
  labelRemoval: real("label_removal"),
  labelWipes: real("label_wipes"),
  /** The bucket's size — the sample bar's own witness. */
  commanders: integer("commanders").notNull(),
  /** How many of them actually carried a composition. The denominator behind the TYPE
   *  averages, and only those. */
  withComposition: integer("with_composition").notNull(),
  /**
   * How many carried ROLE figures — the denominator behind `avg_ramp` and its three siblings.
   *
   * Its own column rather than sharing `with_composition`, because the two populations are
   * genuinely different until one index run has covered both: a commander row written before
   * the role pass existed carries a composition and no roles. Sharing the denominator would
   * publish a mean over ten commanders while the row claimed two hundred.
   */
  withRoles: integer("with_roles").notNull().default(0),
  /**
   * This row was derived from FEWER commanders than a ratified floor requires, and a reader
   * showing its figures owes the player that context.
   *
   * EXACTLY THREE BUCKETS carry it, and the rule selecting them is narrower than "every bucket
   * under the bar": a commander whose exact identity does not clear `MIN_COMMANDERS_PER_CONDITION`
   * AND whose colour-COUNT key does not either. Measured on staging 2026-09-21 over the 3,380
   * commanders that index carries with `synergy_state = 'ok'`: colourless 58, four-colour 16,
   * five-colour 60 — 134 commanders
   * that resolve to no composition row at all today, which is their sum. That measurement
   * filtered on `synergy_state = 'ok'`; the derivation does not, because `build-staples`
   * applies no state filter anywhere by design. The two agree exactly while every row is
   * `ok`, which is true of staging and local-dev today. The 46 quoted for
   * colourless in `countCondition` above is the SAME bucket on the smaller index the
   * ratified floors were measured against; both are true of their own corpus, and neither
   * is a correction of the other.
   *
   * A three-colour identity is deliberately EXCLUDED even though every one of the ten is under
   * the bar, because `count:3` is a ratified row that already serves them — and the basis chain
   * reads the identity rung BEFORE the count rung, so publishing thin exact-identity rows would
   * SHADOW that ratified row for the largest orphan group in the table. A silent basis change,
   * from a measured bucket to a below-bar one, for every three-colour commander.
   *
   * A single global row was rejected on the same measurement: the three differ from each other
   * far more than any of them differs from its own members.
   */
  thin: boolean("thin").notNull().default(false),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (t) => [
  // An average over nothing is not an average. A bucket where no commander carried a
  // composition must not be written at all, rather than written as a row of zeros that a
  // reader would take for a measured target.
  check("identity_composition_witness_check", sql`${t.withComposition} > 0`),
]);

/** The id of the one row. Named so the reader and the writer cannot disagree about it. */
export const CATALOG_ROW_ID = 1;

/**
 * When the card catalog last changed, as one row.
 *
 * Every cached list payload is derived from `cards`, `printings` and `sets` — the browse
 * list carries names and art, the set grid carries a checklist, the rankings carry colour
 * identities — and the catalog refresh writes all three. It cannot invalidate those
 * payloads the way a reader's own write does: `revalidateUserLists` needs a user id, and a
 * weekly job has no list of readers to fan out over. Before this, a refresh's result was up
 * to an hour late for anyone holding a warm entry, which on 2026-09-16 meant a repaired
 * database and a page still drawing the damage (#705).
 *
 * So the generation goes in the cache KEY instead: one row, stamped by each ingest, read
 * through a short-lived cache of its own, and an entry filed under the previous value is
 * never asked for again. A single row rather than a sequence because nothing needs to know
 * how many refreshes there have been — only whether this is the same catalog the entry was
 * built from.
 */
export const catalogRefreshes = pgTable("catalog_refreshes", {
  // One row, forever, and the constraint below is what makes that a fact rather than a
  // convention: a second row would make "the current generation" a question with two
  // answers, and the reader would take whichever Postgres handed back first.
  id: integer("id").primaryKey(),
  refreshedAt: timestamp("refreshed_at").notNull().defaultNow(),
}, (t) => [
  check("catalog_refreshes_single_row_check", sql`${t.id} = 1`),
]);

/**
 * One row per staging BUILD of a replicated catalog job — the commander index or the combo
 * refresh — so a copy to production can refuse a build that did not succeed, or whose catalog
 * moved under it (plan `2026-09-28-card-data-replicate.md`, §3 item 7).
 *
 * The source's own tables cannot answer that: an index build that clears the pair and staples
 * floors can still have refused its role pass or degraded past its 5% ceilings. So a build is
 * bracketed by `db:catalog-build start` before it and `finish` after it, `ok` only on its own
 * success path; a row left with `ok` null or false is a build a copy must never publish. Until the
 * build workflows call it (plan PR 3), no row exists and every copy refuses with "no build".
 *
 * `catalog_fingerprint` is the catalog INPUT fingerprint taken at the START of the build
 * (`src/lib/catalog/fingerprint.ts`). A copy compares it with both catalogs' current one, so a
 * catalog refresh that landed mid-build refuses the copy rather than shipping facts derived from
 * two different catalogs.
 */
export const catalogBuilds = pgTable("catalog_builds", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  ok: boolean("ok"),
  catalogFingerprint: text("catalog_fingerprint").notNull(),
  report: text("report"),
}, (t) => [
  check("catalog_builds_kind_check", sql`${t.kind} in ('index', 'combos')`),
  // A finished build says whether it succeeded; an unfinished one says nothing yet.
  check("catalog_builds_finished_check", sql`(${t.finishedAt} is null) = (${t.ok} is null)`),
  index("catalog_builds_kind_started_idx").on(t.kind, t.startedAt),
]);

/**
 * What this database last ingested of each upstream catalog source, when a `Catalog refresh` leg
 * ingested it from the files its `fetch` job saved (plan `2026-09-28-card-data-replicate.md`,
 * §4a). A leg refuses an artifact whose source is OLDER than the row here, so a re-run of an old
 * artifact cannot roll back what an artifact ingest recorded, while a retry of the same artifact
 * (same date, same hash) goes through as the no-op it is. An ingest that did not come through an
 * artifact (a `Price refresh` dispatch, a local seed) records nothing here. Our own `catalog_refreshes` stamp cannot answer that: it moves
 * on every ingest and every copy, and says nothing about how new upstream's data was.
 */
export const catalogSources = pgTable("catalog_sources", {
  source: text("source").primaryKey(),
  updatedAt: timestamp("updated_at").notNull(),
  sha256: text("sha256").notNull(),
  ingestedAt: timestamp("ingested_at").notNull().defaultNow(),
}, (t) => [
  check("catalog_sources_source_check", sql`${t.source} in ('sets', 'oracle_cards', 'default_cards', 'prices', 'precons')`),
]);

/**
 * The deck notices change log (sub-project 9): one row per bracket-relevant change the weekly
 * ingests publish under the catalog, on its OWN sequence. `catalog_refreshes` cannot key it: it
 * is one overwritten row, and most of its six writers move nothing a verdict reads.
 *
 * A deck's notices are the entries past its reading's `deck_profiles.seen_seq` whose
 * `oracle_ids` its analyzed list wholly holds (`oracle_ids <@ analyzed_oracle_ids`, hence the
 * GIN index), plus `rules` entries past its reading's `rules_version`. A `rules` entry names no
 * cards, and the unique index on its version means it can be written only once however many
 * deploys try.
 *
 * Writers today: the card ingest (`gameChanger`, `notLegal`). The Combo refresh's flag and combo
 * entries and the deploy's `rules` entry are the deck notices plan's PR 3; the kinds are declared
 * here now so the table does not change shape under them. `detail` carries what the entry needs to be read after the row it describes is gone: a
 * removed combo's card names and result (readiness F16), a rule's name and what it now reads.
 *
 * Written only by the ingests and the deploy, never by a player, and never the reason an ingest
 * fails: every write is non-fatal (`src/lib/notices/log.ts`).
 */
export const deckDataChanges = pgTable("deck_data_changes", {
  seq: bigserial("seq", { mode: "number" }).primaryKey(),
  kind: text("kind").notNull(),
  direction: text("direction").notNull(),
  oracleIds: uuid("oracle_ids").array().notNull(),
  detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
}, (t) => [
  check("deck_data_changes_kind_check",
    sql`${t.kind} in ('gameChanger', 'massLandDenial', 'extraTurns', 'combo', 'rules', 'notLegal')`),
  check("deck_data_changes_direction_check", sql`${t.direction} in ('added', 'removed', 'moved')`),
  index("deck_data_changes_oracle_ids_idx").using("gin", t.oracleIds),
  uniqueIndex("deck_data_changes_rules_version_idx")
    .on(sql`(${t.detail}->>'rulesVersion')`)
    .where(sql`${t.kind} = 'rules'`),
]);

/**
 * Per-account preferences that are not a reading habit. A reading habit —
 * which view, which order — lives in localStorage, because it belongs to the
 * device and re-prompting on a second one costs nothing. This does not: the
 * About page follows the account, and a version marker that lived per device
 * would put the page in front of the same reader on every browser they use.
 *
 * Named for what it is rather than for its one column. A second per-account
 * preference is a column here, not a second table — but it gains none
 * speculatively.
 *
 * `about_version_seen` is the highest ABOUT_VERSION this account has
 * acknowledged by pressing the page's dismiss. 0 is the default and means
 * "never seen", which is every account at launch. A row is written on first
 * dismiss; its absence reads as 0 rather than as an error.
 *
 * `about_seen_ids` records the About entries this reader has seen BY ID, for the
 * entries tied to a feature switch (Hugh, 2026-09-25). Switches flip in any order, so
 * a version number cannot say which of them a reader has met: switch B on and read
 * it, switch A on later, and A must still read as new. `about_version_seen` stays the
 * floor for every entry with no switch, so no row needs a backfill.
 */
export const userPrefs = pgTable(
  "user_prefs",
  {
    userId: text("user_id").primaryKey(),
    aboutVersionSeen: integer("about_version_seen").notNull().default(0),
    aboutSeenIds: text("about_seen_ids").array().notNull().default(sql`'{}'::text[]`),
    /**
     * The mode `/commanders` last opened in by the reader's own choice: `all` (All my cards) or
     * `free` (Free cards only). Null until they first choose, which reads as `all`. Kept per
     * account rather than per browser (Hugh, 2026-09-27), and never backfilled.
     */
    commandersAvail: text("commanders_avail"),
  },
  (t) => [
    check("user_prefs_commanders_avail_check", sql`${t.commandersAvail} in ('all', 'free')`),
  ],
);

/**
 * Commander Spellbook's combo index, projected to what a bracket verdict needs.
 *
 * Resolved at INGEST, never during a page render: a render must not depend on a third
 * party's uptime or a shared 80 req/min budget, and the per-deck API response is enormous
 * (every card carries six image URLs). So the bulk is walked weekly and slotting becomes a
 * SQL question — the same treatment Scryfall and ManaPool already get.
 */
export const spellbookVariants = pgTable("spellbook_variants", {
  /** Upstream's own id, e.g. "4067-8192". Templates appear in it as a double dash. */
  variantId: text("variant_id").primaryKey(),
  /**
   * Spellbook's opinion about which table a combo suits. STORED AND REPORTED, NEVER A RULE.
   * The vocabulary deliberately echoes WotC's bracket names, which is what makes it look
   * like the answer; it is not. The bulk's own first record — Gilder Bairn + Agatha's Soul
   * Cauldron + Bloom Tender, producing "Infinite mana of colors among permanents you
   * control" — carries `E`, Exhibition, their gentlest tag. Verified on the live bulk
   * 2026-09-20. Whatever this measures it is not whether a combo is infinite.
   */
  bracketTag: text("bracket_tag").notNull(),
  /**
   * Length of `uses` ONLY — never `uses + requires`. A two-`uses` variant that also requires
   * a TEMPLATE is a three-piece combo the deck may not be able to assemble, and counting it
   * as a two-card infinite over-slots the deck. Measured on the live bulk: 2 of 13 two-use
   * variants carry one, so the distinction is load-bearing rather than theoretical.
   */
  cardCount: integer("card_count").notNull(),
  identity: text("identity").notNull(),
  /** Nullable upstream, and kept null — a 0 reads as "nobody plays this". */
  popularity: integer("popularity"),
  /** Feature names, from `produces[].feature.name`. "Infinite mana …", "Win the game". */
  produces: text("produces").array().notNull(),
  /** Template prerequisites, stored so sub-project 3 can surface a near-miss. */
  requiresTemplateIds: integer("requires_template_ids").array().notNull(),
  /**
   * Upstream's `manaNeeded` — the cost to EXECUTE the combo once both pieces are on the
   * battlefield, not the cost to cast them. A pip string like `{2}`.
   *
   * NULLABLE, AND NULL IS NOT MISSING DATA. Measured across 347 variants on 2026-09-21, this
   * is set on 41% — and `manaValueNeeded > 0` agrees on exactly the same 41%, so the other
   * 59% genuinely need NO mana to go off. A reader must draw that as "no mana needed" rather
   * than as a blank, because a free combo is the more dangerous one and an empty slot loses
   * the very fact worth knowing.
   *
   * Sample the feed from more than its head when re-measuring this: the first 52 records
   * report 3%, which reads as broken upstream data and is an artefact of the file's order.
   */
  manaNeeded: text("mana_needed"),
  /** The same cost as a number. Upstream sets it on every record; 0 means the combo is free. */
  manaValueNeeded: integer("mana_value_needed"),
  /**
   * Upstream's `description` — the ordered steps for executing the combo, newline-separated.
   * Set on 100% of the sample (avg 395 chars, max 754), which is why the modal can rely on it.
   */
  steps: text("steps"),
  /**
   * Upstream's `notablePrerequisites` — what must already be true for the combo to work
   * ("You control at least five creatures with different powers"). Set on 64%.
   *
   * This is the field that answers "does this work in MY deck", and Round 2 never asked for
   * it. `easyPrerequisites` is deliberately NOT stored: upstream's own judgement is that those
   * are usually already true, and a line that is nearly always noise costs the modal more than
   * it returns.
   */
  notablePrerequisites: text("notable_prerequisites"),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (t) => [
  // The enum narrows TypeScript only; without this the database takes any text. Same
  // reasoning as `commander_support.synergy_state`. `check:spellbook` asserts upstream still
  // has exactly these seven — not because an added tag would fail an insert (the transform
  // refuses it first and DROPS the variant), but because that drop is silent and would empty
  // this table behind a green job.
  check("spellbook_variants_bracket_tag_check",
    sql`${t.bracketTag} in ('R', 'S', 'P', 'O', 'C', 'E', 'B')`),
  check("spellbook_variants_card_count_check", sql`${t.cardCount} > 0`),
]);

/**
 * Which cards each variant uses. Normalised for the same reason `commander_support_cards`
 * is: the consuming query is always "intersect this deck's oracle ids with variant
 * membership", which is a join Postgres does well and array containment does badly.
 */
export const spellbookVariantCards = pgTable("spellbook_variant_cards", {
  variantId: text("variant_id").notNull()
    .references(() => spellbookVariants.variantId, { onDelete: "cascade" }),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  /**
   * From `uses[].mustBeCommander`. Some pieces only work from the command zone — the Najeela
   * family is the obvious case — so a deck holding the card in its 99 does not assemble that
   * combo, and the join has to know which is which.
   */
  mustBeCommander: boolean("must_be_commander").notNull().default(false),
}, (t) => [
  primaryKey({ columns: [t.variantId, t.oracleId] }),
  // Sub-project 3 traverses this the other way — one card, which combos it enables — and the
  // primary key's leading column cannot serve that.
  index("spellbook_variant_cards_oracle_idx").on(t.oracleId),
]);

/**
 * Card-level bracket facts that are not on a Scryfall card: mass land denial and extra turns.
 *
 * `banned` is deliberately NOT here. WotC's own text puts the banned list UNDER all five
 * brackets as a legality floor rather than inside the bracket system — a banned card does not
 * move a deck's bracket, it makes the deck illegal — and `cards.commander_legal` already
 * answers that completely and locally, where this table's upstream knows about a quarter of the
 * catalog.
 */
export const cardBracketFlags = pgTable("card_bracket_flags", {
  oracleId: uuid("oracle_id").primaryKey().references(() => cards.oracleId),
  massLandDenial: boolean("mass_land_denial").notNull().default(false),
  /** 'spellbook_sweep' | 'oracle_rule' — per flag, because a card can be one by each. */
  massLandDenialSources: text("mass_land_denial_sources").array().notNull().default(sql`'{}'`),
  extraTurn: boolean("extra_turn").notNull().default(false),
  extraTurnSources: text("extra_turn_sources").array().notNull().default(sql`'{}'`),
  /**
   * A tutor: a library search that can find something other than a land (`isTutor`, ruled
   * 2026-09-22). STORED rather than classified at each read because `/collection`, the largest
   * payload in the app, selects no oracle text, and shipping every owned card's text to decide
   * one boolean costs more than the column. The oracle rule is its only source today; the array
   * exists so the table has one shape for every flag and the same check holds for all three.
   */
  tutor: boolean("tutor").notNull().default(false),
  tutorSources: text("tutor_sources").array().notNull().default(sql`'{}'`),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
}, (t) => [
  // A flag and its provenance cannot disagree: true iff at least one source claims it. The
  // verdict owes a reader WHICH classifier made the claim, and that promise is unkeepable the
  // moment a row can say "true, sources: {}" — which is exactly the row a partial publish or a
  // half-written union would leave behind.
  check("card_bracket_flags_mld_sources_check",
    sql`${t.massLandDenial} = (cardinality(${t.massLandDenialSources}) > 0)`),
  check("card_bracket_flags_et_sources_check",
    sql`${t.extraTurn} = (cardinality(${t.extraTurnSources}) > 0)`),
  check("card_bracket_flags_source_values_check",
    sql`${t.massLandDenialSources} <@ array['spellbook_sweep', 'oracle_rule']::text[]
        and ${t.extraTurnSources} <@ array['spellbook_sweep', 'oracle_rule']::text[]`),
  check("card_bracket_flags_tutor_sources_check",
    sql`${t.tutor} = (cardinality(${t.tutorSources}) > 0)
        and ${t.tutorSources} <@ array['oracle_rule']::text[]`),
]);

/**
 * The last analysis computed for a deck, so it survives a reload.
 *
 * WHY A TABLE AND NOT THE CACHE. `cachedDeckProfile` sits in `unstable_cache`, which computes on
 * a miss — there is no way to ask it "do you already have one?" without paying for the answer —
 * expires within an hour, and is retired by any collection write through the user-list tag. The
 * Analysis tab is on a press (Round 4, ruling 7: no auto-run on tab open), so a reader who
 * refreshed lost the verdict and had to press again. A row read on tab open is a head read and a
 * primary-key lookup; nothing is computed.
 *
 * A reading does not lapse (Hugh, 2026-09-23). It is FRESH when `fingerprint` — the list alone,
 * `listFingerprint` — still matches the deck and `dirty` is clear, and STALE otherwise, and a stale
 * reading is still shown, as stale. The `catalog` generation is kept for the change-notices
 * feature and read by nothing today. See `src/lib/profile/stored.ts`.
 *
 * `permits` is the verdict's permitted range at the time — `slotDeck(profile).permits` — stored
 * beside the document for the header and tile bracket chip, which HOLD the last analyzed bracket
 * over an edit (ruling 4). Sorted ascending, 1–5.
 *
 * One row per deck, replaced on every analysis. Cascades with the deck.
 */
export const deckProfiles = pgTable("deck_profiles", {
  deckId: uuid("deck_id").primaryKey().references(() => decks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  fingerprint: text("fingerprint").notNull(),
  catalog: text("catalog").notNull(),
  profile: jsonb("profile").$type<DeckProfile>().notNull(),
  permits: integer("permits").array().notNull(),
  computedAt: timestamp("computed_at").notNull().defaultNow(),
  /** The `PROFILE_VERSION` the document was built under. A mismatch is not an edit: the next read
   *  recomputes quietly rather than showing the reading as stale. 0 marks a row written before
   *  the column existed, which every version mismatches. */
  profileVersion: integer("profile_version").notNull().default(0),
  /** Set by `touchDeck`, in the edit's own transaction, and cleared by every analysis. */
  dirty: boolean("dirty").notNull().default(false),
  /** The version a commit pinned this analysis to. Null when the reading came from a press. */
  versionId: uuid("version_id").references(() => deckVersions.id, { onDelete: "set null" }),
  /**
   * The deck notices marks (plan D3). `seen_seq` is the change log's head read BEFORE this
   * reading was computed, so an entry published during the compute is still reported.
   * `rules_version` is the bracket-rules version it was computed under. `analyzed_oracle_ids` is
   * the list it analyzed, commanders included: an entry is tested against the cards the reading
   * describes, not the draft (a card added since is `dirty`'s to report). A quiet rebuild keeps
   * all three, and `computed_at`, so it never swallows a notice (brief §6, readiness F4).
   *
   * An EMPTY `analyzed_oracle_ids` marks a legacy row, since every deck holds at least its
   * commander: a pre-0058 deployment still serving during the cutover writes readings with these
   * columns' defaults after the backfill has run. A rebuild fills it rather than carrying it, and
   * the notices read (plan PR 4) takes the deck's current list in its place.
   *
   * `notices_read_seq` is the last entry the player opened the notices at. Reading quiets data
   * notices (the handoff's §3). A re-analysis that RECOMPUTES moves `seen_seq` past them; a press
   * on an unchanged list answers from the store (ruling 5) and moves nothing, until the plan's
   * PR 4 makes such a press recompute when an entry touches the deck (Hugh's H1).
   */
  seenSeq: bigint("seen_seq", { mode: "number" }).notNull().default(0),
  noticesReadSeq: bigint("notices_read_seq", { mode: "number" }).notNull().default(0),
  rulesVersion: integer("rules_version").notNull().default(0),
  analyzedOracleIds: uuid("analyzed_oracle_ids").array().notNull().default(sql`'{}'::uuid[]`),
}, (t) => [
  index("deck_profiles_user_idx").on(t.userId),
  check("deck_profiles_permits_check",
    sql`cardinality(${t.permits}) between 1 and 2 and ${t.permits} <@ array[1,2,3,4,5]`),
]);

/**
 * The per-player model allowance's ledger, shared by every model feature (deck tuning, the
 * deck synopsis). One row per model RUN, never per HTTP attempt.
 *
 * A row is `reserved` when a run starts, `spent` when it ends with an answer the player sees,
 * and `refunded` on any failure or Stop (Hugh, 2026-09-23: only a successful answer spends a
 * unit). `reserved` and `spent` count against the allowance over a rolling 24 hours; a
 * `reserved` row counts because it is a run in flight, which is how two concurrent presses are
 * kept from both taking the last unit. Rows are kept, never deleted: the ledger is also the
 * record of what was spent. `src/lib/model/allowance.ts` is the only reader and writer.
 */
export const modelCalls = pgTable("model_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  feature: text("feature").notNull(),
  // WHO STARTED THE CALL (migration 0082). `player` is a press in the app and the only origin
  // the allowance and the spend cap read; `system` is a batch job (card labels, commander prose)
  // writing ONE summary row per batch so dollars by origin and feature come from one table.
  // Every writer states it; the default only covers a build still serving during a deploy.
  origin: text("origin").notNull().default("player"),
  status: text("status").notNull().default("reserved"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // THE SPEND CAP'S METERS (migration 0057). `model` is written at reserve, so a reservation in
  // flight can be priced at its worst case; the rest by `recordModelUsage` whenever the call
  // returned usage, spent or refunded, including an outcome landing after a Stop or the reaper.
  // Null on every row from before the cap, and on a call that got no response. `cost_micro_usd`
  // is integer micro-dollars from `src/lib/model/prices.ts`; every recorded cost counts toward the
  // month's spend, refunded or not (credits count successes; dollars count everything billed).
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  cacheReadTokens: integer("cache_read_tokens"),
  cacheWriteTokens: integer("cache_write_tokens"),
  model: text("model"),
  costMicroUsd: bigint("cost_micro_usd", { mode: "number" }),
}, (t) => [
  check("model_calls_feature_check", sql`${t.feature} in ('tuning', 'synopsis', 'intake', 'proposed_cuts', 'fits_read', 'labels', 'prose')`),
  check("model_calls_origin_check", sql`${t.origin} in ('player', 'system')`),
  check("model_calls_status_check", sql`${t.status} in ('reserved', 'spent', 'refunded')`),
  // The allowance's only query: this player's calls inside the window.
  index("model_calls_user_created_idx").on(t.userId, t.createdAt),
]);

/**
 * One provider call under a `model_calls` row (admin brief, locked rule 13): its step, model,
 * effort, meters and cost. A run that calls twice (Look deeper's shortlist and judgement, an
 * overview and its repair) records two parts, each on its own model's rates, while the parent row
 * keeps its role as the allowance's reservation and the month's billed total. Written by
 * `recordModelUsage` in the same statement window that records the parent's meters, and only when
 * those were first recorded, so a retried or late write never adds a second set. Rows from before
 * this table have no parts: readers show them by feature, never split by guesswork. A part is
 * detail of its call and goes with it: deleting a `model_calls` row (every probe cleanup does)
 * deletes its parts.
 */
export const modelCallParts = pgTable("model_call_parts", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id").notNull().references(() => modelCalls.id, { onDelete: "cascade" }),
  // Which call in the run: `write`, `repair`, `shortlist`, `judgement`, ... `call` when a
  // single-call feature names none.
  step: text("step").notNull(),
  model: text("model").notNull(),
  // Null when the call set none (the request carried no `effort`): drawn as `not recorded`.
  effort: text("effort"),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  cacheReadTokens: integer("cache_read_tokens").notNull(),
  cacheWriteTokens: integer("cache_write_tokens").notNull(),
  costMicroUsd: bigint("cost_micro_usd", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("model_call_parts_effort_check", sql`${t.effort} is null or ${t.effort} in ('low', 'medium', 'high')`),
  index("model_call_parts_call_idx").on(t.callId),
]);

/**
 * The admin's own figures (brief, locked rule 11): the caps that live outside the code. The account
 * cap is set in Anthropic's console and shared with another app, the system ceiling is a ruling, and
 * `elsewhere` is what this environment's ledger cannot see (the other environment, the other app),
 * entered by hand with the date it was read. One row per key; every change is also an
 * `admin_events` `setting_set` row.
 */
export const adminSettings = pgTable("admin_settings", {
  key: text("key").primaryKey(),
  valueMicroUsd: bigint("value_micro_usd", { mode: "number" }).notNull(),
  // The day the figure was read, for `elsewhere` (STATES C7); the write's own day otherwise.
  asOf: date("as_of", { mode: "string" }).notNull(),
  note: text("note"),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  check("admin_settings_key_check", sql`${t.key} in ('account_cap_usd', 'system_ceiling_usd', 'elsewhere_usd')`),
  check("admin_settings_value_check", sql`${t.valueMicroUsd} >= 0`),
]);

/**
 * The admin's audit trail (brief, locked rule 5, with the audit's finding 7): append-only, never
 * updated or deleted. Every admin write inserts one row in its own transaction. Each kind's
 * required fields are tied to it by a check constraint, so a membership change and a setting are
 * as representable as an override. `group_id` carries no foreign key: a group can be deleted from
 * a later PR's tables while its history stays.
 */
export const adminEvents = pgTable("admin_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  at: timestamp("at").notNull().defaultNow(),
  actorId: text("actor_id").notNull(),
  kind: text("kind").notNull(),
  switchName: text("switch"),
  scope: text("scope"),
  groupId: uuid("group_id"),
  userId: text("user_id"),
  settingKey: text("setting_key"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  note: text("note"),
}, (t) => [
  check("admin_events_kind_check", sql`${t.kind} in ('override_set', 'override_cleared', 'group_created', 'group_renamed', 'group_described', 'member_added', 'member_removed', 'setting_set')`),
  check("admin_events_scope_check", sql`${t.scope} is null or ${t.scope} in ('app', 'group', 'user')`),
  // Each kind names what it changed.
  check("admin_events_fields_check", sql`case ${t.kind}
    when 'override_set' then ${t.switchName} is not null and ${t.scope} is not null and ${t.newValue} is not null
    when 'override_cleared' then ${t.switchName} is not null and ${t.scope} is not null and ${t.oldValue} is not null
    when 'group_created' then ${t.groupId} is not null and ${t.newValue} is not null
    when 'group_renamed' then ${t.groupId} is not null and ${t.oldValue} is not null and ${t.newValue} is not null
    when 'group_described' then ${t.groupId} is not null and (${t.oldValue} is not null or ${t.newValue} is not null)
    when 'member_added' then ${t.groupId} is not null and ${t.userId} is not null
    when 'member_removed' then ${t.groupId} is not null and ${t.userId} is not null
    when 'setting_set' then ${t.settingKey} is not null and ${t.newValue} is not null
  end`),
  // A group-scoped override names its group, a user-scoped one its user, and app-wide neither.
  check("admin_events_scope_target_check", sql`${t.scope} is null
    or (${t.scope} = 'app' and ${t.groupId} is null and ${t.userId} is null)
    or (${t.scope} = 'group' and ${t.groupId} is not null and ${t.userId} is null)
    or (${t.scope} = 'user' and ${t.userId} is not null and ${t.groupId} is null)`),
  index("admin_events_at_idx").on(t.at),
]);

/**
 * One Look deeper read in Help me choose (sub-project 8). It happens before any deck exists, so it
 * cannot hang off a deck's row the way tuning's run and the overview do, and it needs a row of its
 * own because a Stop must refund (F4): written `pending` with its allowance unit BEFORE the model is
 * called, and settled with that unit in one transaction. A Stop cancels it and refunds, and a late
 * answer finds it no longer pending and writes nothing. `words_hash` is what it was asked: the
 * ask's fingerprint (`readFingerprint`, `lib/intake/the-read.ts`), which covers the words, every
 * filter, the prompt version, the commander list's generation, the player's pool, collection and
 * decks. A repeat of an
 * ask already read gets that read back uncharged, so a read is offered once per ask. `chips` is the
 * retired one-call read's answer: rows written before the two-step read keep it, nothing writes it
 * now, and such a row reads as no read (`loadTheRead`).
 */
export const intakeReads = pgTable("intake_reads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  wordsHash: text("words_hash").notNull(),
  model: text("model").notNull(),
  modelCallId: uuid("model_call_id").notNull().references(() => modelCalls.id),
  status: text("status").notNull().default("pending"),
  errorClass: text("error_class"),
  chips: jsonb("chips"),
  /**
   * The read (rework plan, F2): which of its two calls a pending read is in, so the waiting panel
   * can move from the shortlist to the judgement. Null before the first call starts and once the read
   * is settled, however it settled: an outcome, a Stop or the reaper.
   */
  phase: text("phase"),
  /** The read's settled answer (F9e): the picks and their reasons. Null on a row from the retired
   *  one-call read, whose answer is `chips`. */
  result: jsonb("result"),
}, (t) => [
  check("intake_reads_status_check", sql`${t.status} in ('pending', 'ok', 'failed', 'cancelled')`),
  check("intake_reads_phase_check", sql`${t.phase} is null or ${t.phase} in ('shortlist', 'judge')`),
  check(
    "intake_reads_error_class_check",
    sql`${t.errorClass} is null or ${t.errorClass} in ('upstream_busy', 'timeout', 'malformed', 'nothing_valid', 'interrupted')`,
  ),
  // One read in flight per player: a second press while one is pending is refused, not queued.
  uniqueIndex("intake_reads_one_pending_idx").on(t.userId).where(sql`${t.status} = 'pending'`),
  index("intake_reads_user_created_idx").on(t.userId, t.createdAt),
]);

/**
 * A Stop that reached the database before the read it names existed (PR 6, the early Stop). The
 * panel chooses a read's id before its press, so a Stop can name a read whose start has not yet
 * committed; `cancelRead` then finds no row to cancel and leaves this instead, and `startRead`,
 * under the same per-player lock, refuses an id found here before it reserves anything. So a Stop
 * the player pressed never ends in a spent unit, whichever of the two reaches the database first.
 *
 * Keyed by PLAYER and id, never by id alone: the id is chosen by the client, so a key on it alone
 * would let one player's stop stand in for another's, and a Stop told it took would leave the
 * other player's start free to reserve.
 */
export const intakeReadStops = pgTable("intake_read_stops", {
  readId: uuid("read_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.readId] }),
  index("intake_read_stops_user_created_idx").on(t.userId, t.createdAt),
]);

/**
 * One generation of deck-tuning suggestions (#10). Written `pending` in its own transaction
 * BEFORE the model is called, so a run exists as a fact the moment it starts and survives the
 * player navigating away. Runs are kept, never replaced: the history is the record.
 */
export const deckSuggestionRuns = pgTable("deck_suggestion_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  /** The player's own inputs (list, games, notes, intent, collection). No version inside. */
  inputFingerprint: text("input_fingerprint").notNull(),
  /** Which tool wrote this run: the one shared run record for every Tuning tool (roadmap ruling 3).
   *  Every run from before the column is Suggested changes, which the default says. */
  tool: text("tool").notNull().default("suggested_changes"),
  model: text("model").notNull(),
  // Both versions are STORED, never hashed: a bump reopens the gate as its own reason and
  // never reads as the player having changed their deck.
  promptVersion: integer("prompt_version").notNull(),
  profileVersion: integer("profile_version").notNull(),
  /** The allowance unit this run holds; its outcome write settles it. */
  modelCallId: uuid("model_call_id").notNull().references(() => modelCalls.id),
  status: text("status").notNull(),
  errorClass: text("error_class"),
  droppedCount: integer("dropped_count").notNull().default(0),
  /** The deck's newest version number when the run READ the deck, taken in the same snapshot as
   *  the list it read; null for a deck with no version then, and for runs from before the column.
   *  A later version retires the set. Numbers rather than clocks: a commit's `committed_at` is its
   *  transaction's start, so no timestamp can say whether the run saw it. */
  readVersion: integer("read_version"),
  /** "Kept for this deck"'s own measurement (H35, PR 4a): asked/survived/kept counts, and which
   *  hard filter or structural drop caused an empty result, with the card name a refusal
   *  sentence needs. Null for every run from before this column, and additive — nothing reads it
   *  as a status. */
  validationReport: jsonb("validation_report").$type<ValidationReport>(),
}, (t) => [
  check("deck_suggestion_runs_tool_check", sql`${t.tool} in ('suggested_changes', 'proposed_cuts')`),
  check(
    "deck_suggestion_runs_status_check",
    sql`${t.status} in ('pending', 'ok', 'failed', 'cancelled')`,
  ),
  check(
    "deck_suggestion_runs_error_class_check",
    // `locked_only` (Locked, F10): every suggestion cut a card the player locked, so the empty
    // result says that rather than `ungrounded`'s three causes. Refunded like every failure.
    sql`${t.errorClass} is null or ${t.errorClass} in ('upstream_busy', 'timeout', 'malformed', 'ungrounded', 'interrupted', 'locked_only')`,
  ),
  // The constraint that makes a second concurrent run on one deck impossible: the loser of the
  // race gets a unique violation, not a second run. Partial, so a deck accumulates any number
  // of finished runs. Same predicate form as printings_flavor_name_idx.
  uniqueIndex("deck_suggestion_runs_one_pending_tool_idx")
    .on(t.deckId, t.tool)
    .where(sql`${t.status} = 'pending'`),
  index("deck_suggestion_runs_deck_created_idx").on(t.deckId, t.createdAt),
  index("deck_suggestion_runs_user_created_idx").on(t.userId, t.createdAt),
]);

/** What an apply changed, so undo can put back exactly that — not an approximation of it. */
export type ApplySnapshot = {
  /** The cut's row before the apply; null when the suggestion had no cut. */
  cut: { quantity: number; auto: boolean; proxied: boolean } | null;
  /** The add's row before the apply; quantity 0 when the deck did not hold it. Null for a CUT
   *  line (two lists), which adds nothing. */
  add: { quantity: number; auto: boolean } | null;
};

export type TuningCitation = {
  // "notes" (H35, PR 4b): the player's free-text "Additional notes" for that run, distinct from
  // a per-game "note" and from the deck's standing "intent" (description).
  kind: "games" | "note" | "decklist" | "intent" | "mix" | "notes";
  /** Rendered by the card. Never a percentage, never a net figure. */
  value: string;
};

export const deckSuggestionItems = pgTable("deck_suggestion_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => deckSuggestionRuns.id, { onDelete: "cascade" }),
  // uuid, matching cards.oracleId: a suggestion for a card the catalog does not hold cannot
  // be stored at all.
  // Nullable since the two lists (sub-project 8, migration 0089): an ADDITION carries only its add,
  // a CUT only its cut, each with its own rationale. A row from before it carries both, the
  // swap the earlier contract asked for; `deck_suggestion_items_one_card_check` holds that at least
  // one is set.
  addOracleId: uuid("add_oracle_id").references(() => cards.oracleId),
  cutOracleId: uuid("cut_oracle_id").references(() => cards.oracleId),
  rationale: text("rationale").notNull(),
  rationaleShort: text("rationale_short").notNull(),
  evidence: jsonb("evidence").$type<TuningCitation[]>().notNull(),
  position: integer("position").notNull(),
  verdict: text("verdict").notNull().default("pending"),
  verdictAt: timestamp("verdict_at"),
  // The deck's permitted brackets with this swap applied, when that differs from its permits
  // without it; null when the swap moves nothing. Computed by the app through slotDeck, never
  // by the model. A suggestion that moves the bracket is shown, flagged (Hugh, 2026-09-23).
  bracketAfter: integer("bracket_after").array(),
  // Written by the apply, read and cleared by the undo. Null until applied.
  undoSnapshot: jsonb("undo_snapshot").$type<ApplySnapshot>(),
}, (t) => [
  check(
    "deck_suggestion_items_verdict_check",
    sql`${t.verdict} in ('pending', 'accepted', 'dismissed')`,
  ),
  check(
    "deck_suggestion_items_one_card_check",
    sql`${t.addOracleId} is not null or ${t.cutOracleId} is not null`,
  ),
  index("deck_suggestion_items_run_position_idx").on(t.runId, t.position),
]);

/**
 * One proposed cut (Proposed cuts, model tier): a card the model says the deck can spare, with its
 * reason and the validated cites that reason rests on. Written by the run that produced it, in the
 * same transaction that marks the run `ok`. A cut has no add, so it does not share
 * `deck_suggestion_items`, whose `add_oracle_id` is not null.
 */
export const deckCutItems = pgTable("deck_cut_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => deckSuggestionRuns.id, { onDelete: "cascade" }),
  cutOracleId: uuid("cut_oracle_id").notNull().references(() => cards.oracleId),
  reason: text("reason").notNull(),
  /** The cites the validator checked against the facts, as the model stated them. */
  evidence: jsonb("evidence").$type<CutCite[]>().notNull(),
  position: integer("position").notNull(),
  verdict: text("verdict").notNull().default("pending"),
  verdictAt: timestamp("verdict_at"),
  /** The card's row as the cut found it (migration 0087), so Undo puts back exactly that and refuses
   *  over a deck that has moved since. Null until the cut is pressed, and again after an Undo. */
  undoSnapshot: jsonb("undo_snapshot").$type<ApplySnapshot>(),
}, (t) => [
  check(
    "deck_cut_items_verdict_check",
    sql`${t.verdict} in ('pending', 'accepted', 'dismissed')`,
  ),
  index("deck_cut_items_run_position_idx").on(t.runId, t.position),
]);

/**
 * One applied Improve my mana trade: a basic cut for a staple, written by the apply and deleted by its
 * Undo, or by the player's next apply once a day old (`TRADE_SNAPSHOT_RETENTION`): its Undo lives only in
 * the deck visit. It exists only to hold the undo snapshot, as `deck_cut_items` and `deck_suggestion_items` hold
 * theirs; a trade is free and has no run, and both of those tables need one (a run carries a paid
 * `model_call_id`), so neither can hold it. No `user_data_touch` trigger: neither Home nor `/decks`
 * reads it (`check:list-cache`); the deck's own change is stamped by `touchDeck`.
 */
export const manaTradeApplies = pgTable("mana_trade_applies", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  cutOracleId: uuid("cut_oracle_id").notNull().references(() => cards.oracleId),
  addOracleId: uuid("add_oracle_id").notNull().references(() => cards.oracleId),
  /** The two rows as the apply found them, so Undo puts back exactly that. */
  undoSnapshot: jsonb("undo_snapshot").$type<ApplySnapshot>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("mana_trade_applies_deck_idx").on(t.deckId),
  // The retention delete each apply makes (`mana-trade.ts`): the player's rows older than a day.
  index("mana_trade_applies_user_created_idx").on(t.userId, t.createdAt),
]);

/**
 * One FREE Tuning tool pass (tuning hub PR 2, History): what a tool counted for one version of the
 * list, recorded the first time that count is read for that list. Paid runs are already one row
 * each in `deck_suggestion_runs`, whose `model_call_id` is not null and settles an allowance, so a
 * free pass does not belong there. ONE ROW PER TOOL PER LIST VERSION (`list_fingerprint`): a
 * re-read of the same list writes nothing (`on conflict do nothing`), so History draws one free
 * row per list the reader counted, not one per visit. No `user_data_touch` trigger: neither Home
 * nor `/decks` reads it (`check:list-cache`).
 */
export const deckToolCounts = pgTable("deck_tool_counts", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  tool: text("tool").notNull(),
  /** The tool's own input fingerprint for the list it counted. */
  listFingerprint: text("list_fingerprint").notNull(),
  /** The deck's newest version number when the count read the list; null for a deck with none. */
  readVersion: integer("read_version"),
  /** What the count found, in the tool's own shape (`ToolCountSummary`). */
  summary: jsonb("summary").$type<ToolCountSummary>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  check("deck_tool_counts_tool_check", sql`${t.tool} in ('proposed_cuts', 'mana_balance')`),
  unique("deck_tool_counts_deck_tool_fingerprint_key").on(t.deckId, t.tool, t.listFingerprint),
  index("deck_tool_counts_deck_created_idx").on(t.deckId, t.createdAt),
]);

/**
 * One stand-in taken in the Shopping view (swap tools, sub-project 4), so it can be undone.
 *
 * Tuning keeps its undo on the suggestion row it applied, and a Shopping take has no such row, so a
 * take writes one here. It is the same act as tuning's Apply (ruling 7), through the same body
 * (`src/lib/swaps/draft-swap.ts`): cut one copy, add one, and the snapshot of the two rows as they
 * were, which Undo swap restores only over the deck the take left.
 *
 * `add_was_free` is the TAKE's own read of whether the added copy was spare, not the list's: the
 * receipt says "your free copy" about the copy the take actually used.
 */
export const deckSwaps = pgTable("deck_swaps", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  cutOracleId: uuid("cut_oracle_id").notNull().references(() => cards.oracleId),
  addOracleId: uuid("add_oracle_id").notNull().references(() => cards.oracleId),
  addWasFree: boolean("add_was_free").notNull(),
  snapshot: jsonb("snapshot").$type<ApplySnapshot>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  /** Set by Undo swap. A swap undone once cannot be undone again. */
  undoneAt: timestamp("undone_at"),
}, (t) => [
  index("deck_swaps_deck_idx").on(t.deckId),
]);

/**
 * One generation of a deck's synopsis (sub-project 6). Kept, never replaced: the history is the
 * record, and the eval harness counts outcomes from it. The draft's synopsis is the newest `done`
 * run whose content has at least one section that passed checking.
 *
 * Written `pending` in the same transaction that reserves the player's allowance unit
 * (`model_call_id`), BEFORE the model is called, and settled to `done` in the transaction that
 * settles the unit. A pending run older than `SYNOPSIS_REAPER_CUTOFF_MS` was abandoned; the
 * read-time reaper writes it `done` with outcome `interrupted` and refunds its unit, so a crash
 * never locks the deck out.
 *
 * `fingerprint` is `listFingerprint`, the list alone, and REUSE IS KEYED ON IT ALONE (Hugh,
 * ruling B, 2026-09-23): a synopsis written under an older `contract_version` keeps showing until
 * the list changes. The contract version is stored so outcomes under two contracts can be told
 * apart, never to stale a row.
 *
 * `input_tokens` / `output_tokens` are NULLABLE: the model client reports usage only for a reply
 * it returns, so a failed run records none, and after the client's one retry it reports the
 * second attempt alone, so a retried success understates its cost by the first.
 */
export const deckSynopses = pgTable("deck_synopses", {
  id: uuid("id").primaryKey().defaultRandom(),
  deckId: uuid("deck_id").notNull().references(() => decks.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  fingerprint: text("fingerprint").notNull(),
  contractVersion: integer("contract_version").notNull(),
  model: text("model").notNull(),
  /** The allowance unit this run holds; its outcome write settles it. */
  modelCallId: uuid("model_call_id").notNull().references(() => modelCalls.id),
  status: text("status").notNull().default("pending"),
  /** Null while pending. */
  outcome: text("outcome"),
  /** Every section's verdict and the content of those that passed. Null unless the reply parsed. */
  content: jsonb("content").$type<CheckedSynopsis>(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  /** The run a section retry built on: its passing sections are carried over byte for byte. */
  retryOf: uuid("retry_of").references((): AnyPgColumn => deckSynopses.id, { onDelete: "set null" }),
  /**
   * The change log head the analysis this overview was written from had seen (plan D11). A
   * notice-driven re-analysis (Hugh's H1, the plan's PR 4) keeps the list and moves only the data,
   * so the overview is marked
   * possibly out of date when this is below the reading's `seen_seq`. 0 for every overview
   * written before the log existed, which the log's first entry therefore dates correctly.
   */
  seenSeq: bigint("seen_seq", { mode: "number" }).notNull().default(0),
  /**
   * The HTTP status the model call's last attempt failed with, when it failed with one: what tells
   * an overloaded upstream (429, 5xx) from a request it refused (401, 404) on the row itself,
   * without a log. Null for every other outcome and for a failure that carried no status.
   */
  errorStatus: integer("error_status"),
}, (t) => [
  check("deck_synopses_status_check", sql`${t.status} in ('pending', 'done')`),
  check(
    "deck_synopses_outcome_check",
    sql`(${t.status} = 'pending') = (${t.outcome} is null)
        and (${t.outcome} is null or ${t.outcome} in ('survived', 'refused', 'malformed', 'upstream_busy', 'upstream_rejected', 'timeout', 'interrupted'))`,
  ),
  // One run in flight per deck: the loser of a double press gets a unique violation, not a
  // second run and a second charge. Same partial form as deck_suggestion_runs.
  uniqueIndex("deck_synopses_one_pending_idx").on(t.deckId).where(sql`${t.status} = 'pending'`),
  index("deck_synopses_deck_created_idx").on(t.deckId, t.createdAt),
]);

/**
 * A version's synopsis: the one written for exactly the list that version froze, copied at the
 * commit and never after (Hugh, 2026-09-23; `SYNOPSIS-modal.md` §4.4, "written for version 3 when
 * it was committed"). Inserted once, if absent, and never updated, so it never goes stale and a
 * later rewrite of the draft cannot reach it.
 */
export const deckVersionSynopses = pgTable("deck_version_synopses", {
  versionId: uuid("version_id").primaryKey().references(() => deckVersions.id, { onDelete: "cascade" }),
  synopsisId: uuid("synopsis_id").notNull().references(() => deckSynopses.id, { onDelete: "cascade" }),
});

/**
 * Where a label run accumulates before it is allowed to publish.
 *
 * **The staging table is what makes REFUSING possible.** A run must leave the previous
 * labels standing and exit non-zero when its returned-card count falls below the floor —
 * and that is unachievable if each batch upserts into `card_labels` as it lands, because a
 * floor failure at batch 2,600 would have already published 2,599 batches while the plan
 * claims the previous set is untouched. This is the shape #704 arrived at for the printings
 * denominators, after a refused run there blanked every set's `base_set_size` behind a
 * green job.
 *
 * The publish is then `delete` + `insert ... select` in ONE transaction rather than a
 * per-row upsert, so a reader never sees a mixture of two runs.
 *
 * Rows are scoped by `run_id` and are not a cache: a finished run's rows are the evidence
 * of what it published, and the next run clears its own id before staging into it.
 */
export const cardLabelsStaging = pgTable("card_labels_staging", {
  runId: text("run_id").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId, { onDelete: "cascade" }),
  labels: jsonb("labels").$type<Job[]>().notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  inputHash: text("input_hash").notNull(),
  labelledAt: timestamp("labelled_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.runId, t.oracleId] }),
  index("card_labels_staging_run_idx").on(t.runId),
]);

/**
 * One INTENT to submit a chunk of cards, written before `batches.create` is called.
 *
 * **Keyed on a key we choose, not on the provider's `batch_id`, and that is the whole
 * point.** Anthropic assigns `batch_id` only when `create` RETURNS, so a row keyed on it
 * cannot be written first — and a process that dies between a successful `create` and the
 * insert leaves no durable trace at all. The next dispatch sees nothing in flight,
 * re-submits the same work and PAYS TWICE, which is the exact failure this table exists to
 * prevent. The plan says so in Task 2: reconcile INTENTS, not only reservations.
 *
 * **One provider batch holds MANY chunks.** `batches.create({ requests })` takes every
 * chunk for a model at once and returns a single `batch_id` for all of them, so the id is
 * SHARED down the rows of that model's run and cannot be globally unique. `custom_id`
 * carries that role instead: it identifies one request, across every batch AND every run.
 * An earlier version of this table put a global `unique` on `batch_id`, which would have
 * rejected every chunk row after the first and made this table unusable by the submitter it
 * exists for.
 *
 * The row stays per CHUNK rather than per provider batch, because reconciliation is per
 * request: a returned `custom_id` has to map back to the card names that request asked
 * about, and a batch can have some requests succeed while others fail.
 *
 * `intent_key` is `{run_id}:{model}:{chunk}`, deterministic from the run's own plan, so a
 * resumed run computes the same key for the same work and finds its own intent rather than
 * creating a second one.
 *
 * **An intent with a null `batch_id` is AMBIGUOUS, not empty.** The `create` may have
 * succeeded with the id lost, so a resumed run must not simply re-submit: it lists the
 * provider's recent batches and matches on the `custom_id`s it chose, which are recorded
 * here and are globally unique precisely so that match cannot be ambiguous. Only a chunk with no matching provider request is re-submitted; one that cannot be
 * resolved either way is marked `abandoned` and reported, because a silent re-submission is
 * how the double charge happens.
 *
 * In the database rather than a file, because `out/batches.json` does not survive the CI
 * runner that wrote it.
 */
export const cardLabelBatches = pgTable("card_label_batches", {
  intentKey: text("intent_key").primaryKey(),
  runId: text("run_id").notNull(),
  model: text("model").notNull(),
  /**
  * This request's id, as SENT — what a returned result is matched on.
  *
  * **Globally unique, which means it must embed a run token.** The sample sends
  * `${modelKey}-${chunk}` (`sonnet-0`, `sonnet-1`), reused by every run — so a recovery
  * that lists the provider's batches looking for `sonnet-0` finds it in as many batches as
  * there have been runs, and may adopt an older run's result as this run's or re-submit a
  * chunk already paid for. That defeats the double-charge protection this table exists for,
  * so the uniqueness is declared here and 3b must generate ids that satisfy it.
  *
  * Kept SHORT — a run token rather than the full run id, which is a 29-character timestamp
  * — because the provider caps this field's length.
  */
  customId: text("custom_id").notNull().unique(),
  /** The card names this chunk asked about, so a resumed run can reconcile by face. */
  asked: jsonb("asked").$type<string[]>().notNull(),
  /** Null until `batches.create` returns, then SHARED by every chunk in that batch. */
  batchId: text("batch_id"),
  status: text("status").notNull().default("intended"),
  /**
   * The `LABEL_PROMPT_VERSION` the request was built under, written with the intent.
   *
   * Two rules read it. The spend cap sums a whole budget family's batches (`familySpend`), and a
   * row's cost is only comparable within one prompt version; and a run may collect, and plan
   * around, another run's open batch only when it was asked under the prompt this run would ask,
   * or it would stage one prompt's answer under another's hash. Nullable because every row written
   * before it has no record, and such a row counts for nothing in either rule rather than being
   * guessed into one.
   */
  promptVersion: text("prompt_version"),
  /**
   * Each asked card's `labelInputHash` AT REQUEST TIME, by name, written with the intent.
   *
   * A batch can stay pending across a daily catalog refresh, so a card's text may move between
   * the request and its collection. The collect stages a card only while its current hash still
   * equals this one; a card that moved is left for the next plan, because its answer describes
   * text the catalog no longer holds. Null on every row written before it, which the collect
   * reads as "no record" and stages as it always did.
   */
  askedHashes: jsonb("asked_hashes").$type<Record<string, string>>(),
  /**
   * MEASURED token usage, written when the batch collects. Null until then.
   *
   * These exist so the wave sizing can read what a run has ACTUALLY spent rather than what
   * its committed requests could have cost. The difference decides whether the run can
   * finish at all: over 2,653 requests, sizing waves against committed worst case exhausts
   * the budget after the first wave (it books ~$25 against a real ~$6) and leaves 2,253
   * requests unsent, while sizing against measured spend converges in seven waves on the
   * $41 the sample projected.
   *
   * Deriving this from staged card counts at the sample's per-card rate was the alternative
   * and is refused: the whole point of measuring between waves is to catch a run costing MORE
   * than the sample predicted, and an estimate computed from the sample's own rate cannot
   * disagree with the sample by construction.
   */
  inTokens: integer("in_tokens"),
  outTokens: integer("out_tokens"),
  cacheWriteTokens: integer("cache_write_tokens"),
  cacheReadTokens: integer("cache_read_tokens"),
  intendedAt: timestamp("intended_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  collectedAt: timestamp("collected_at", { withTimezone: true }),
}, (t) => [
  index("card_label_batches_run_idx").on(t.runId),
  check(
    "card_label_batches_status_check",
    sql`${t.status} in ('intended', 'submitted', 'in_progress', 'collected', 'expired', 'failed', 'abandoned')`,
  ),
  // A status past `intended` asserts the provider accepted the batch, so it MUST carry the
  // id — otherwise a row could claim to be collected with nothing identifying what was
  // collected. `abandoned` is exempt: it is precisely the case where the id was never
  // learned.
  check(
    "card_label_batches_id_with_status_check",
    sql`${t.status} in ('intended', 'abandoned') or ${t.batchId} is not null`,
  ),
]);

/**
 * What a card DOES, and the limits on each job.
 *
 * NOTHING writes or reads this yet. The build that fills it is Task 2 of
 * `docs/superpowers/plans/2026-09-25-card-labels-run.md` and the stand-in matcher that
 * consumes it is Task 5; the table lands first so the storage can be reviewed alone,
 * and an unused table costs nothing.
 *
 * Keyed on ORACLE ID, not `scryfall_id`: a label is a fact about the card, not the
 * printing, so a reprint must not need relabelling. `on delete cascade` rather than
 * `set null`, so a card leaving the catalog takes its label with it — safe because
 * `src/lib/scryfall/seed.ts` upserts on `cards.oracle_id` and has no deletion path,
 * so a refresh cannot cascade labels away.
 *
 * `input_hash` is `labelInputHash` in `src/lib/labels/prompt.ts`: sha256 over the oracle id,
 * the card AS RENDERED FOR THE MODEL, the prompt version, the model and the SYSTEM prompt's
 * hash for that version (`PROMPT_SYSTEM_SHA256`). Derived from
 * `renderCard` rather than listed beside it, so no field the model is sent can be left out
 * of the freshness check. The name and type line are in it because a
 * card errata'd under its existing oracle id leaves a stored label describing something
 * else. A row is judged under its OWN `prompt_version` and `model` (`labelIsFresh`, Hugh
 * 2026-10-04), so a prompt bump or a model switch stales nothing by itself; only a `list:`
 * build redoes such rows deliberately. A row whose hash still matches its inputs is skipped, so
 * a re-run costs nothing for a card nothing has moved.
 */
export const cardLabels = pgTable("card_labels", {
  oracleId: uuid("oracle_id").primaryKey().references(() => cards.oracleId, { onDelete: "cascade" }),
  labels: jsonb("labels").$type<Job[]>().notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  inputHash: text("input_hash").notNull(),
  labelledAt: timestamp("labelled_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One counter per reader that moves whenever a table Home or `/decks` reads changes for them.
 * Those two pages cache their whole payload keyed on it (`src/lib/cache/user-data-stamp.ts`),
 * so a write invalidates them by construction rather than by remembering to call something.
 *
 * WRITTEN ONLY BY THE DATABASE. Every per-user table the two pages read carries the
 * `user_data_touch` trigger (the migration that adds this table), which bumps the row at COMMIT
 * rather than per statement. That is what keeps it deadlock-free: a transaction takes the stamp
 * after every other lock it will ever hold, so a transaction waiting on a stamp row is always
 * waiting on one that is already committing. `pnpm check:list-cache` fails when a table the
 * pages read lacks the trigger; `pnpm probe:list-stamp` proves each one moves the stamp.
 *
 * No row means no write since the trigger shipped, which reads as stamp 0.
 */
export const userDataStamps = pgTable("user_data_stamps", {
  userId: text("user_id").primaryKey(),
  stamp: bigint("stamp", { mode: "number" }).notNull().default(0),
});

/**
 * MTGJSON's Commander precons (`type === "Commander Deck"`), one row per deck file, replaced whole
 * by `db:seed:precons` from the `Catalog refresh` artifact (plan `2026-10-11-commander-precons.md`).
 * Catalog data: no reader owns a row, so it carries no stamp trigger and a cached page keys on the
 * catalog generation the ingest stamps. `file_name` is the key because names repeat across sets.
 *
 * `twin_of` names the deck whose list this one repeats exactly (a Collector's Edition beside its
 * plain edition), so a reader shows one row for both. `unmapped_count` is the copies the feed lists
 * that the catalog could not hold (brief lock 3): dropped from `precon_cards`, never hidden.
 */
export const precons = pgTable("precons", {
  fileName: text("file_name").primaryKey(),
  name: text("name").notNull(),
  setCode: text("set_code").notNull(),
  releaseDate: date("release_date").notNull(),
  twinOf: text("twin_of"),
  unmappedCount: integer("unmapped_count").notNull().default(0),
}, (t) => [
  check("precons_twin_check", sql`${t.twinOf} is null or ${t.twinOf} <> ${t.fileName}`),
  check("precons_unmapped_check", sql`${t.unmappedCount} >= 0`),
]);

/**
 * A precon's cards, exactly as the feed lists them: one row per (card, printing, commander) with
 * its count, so a deck started from it holds the feed's 100 and never an assumed 99. `scryfall_id`
 * is the precon's own printing, shown read-only; null when the catalog lacks that printing but has
 * the card.
 */
export const preconCards = pgTable("precon_cards", {
  fileName: text("file_name").notNull().references(() => precons.fileName, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  scryfallId: uuid("scryfall_id").references(() => printings.scryfallId, { onDelete: "set null" }),
  quantity: integer("quantity").notNull(),
  isCommander: boolean("is_commander").notNull(),
}, (t) => [
  primaryKey({ columns: [t.fileName, t.position] }),
  check("precon_cards_quantity_check", sql`${t.quantity} > 0`),
  index("precon_cards_oracle_idx").on(t.oracleId),
]);

/**
 * Find a deck read (brief `2026-10-11-find-a-deck-read.md`, locks 4 to 6): one row per press, for
 * one reader and one card. The newest settled row is the card's stored read. It is shown again,
 * free, only while every candidate deck's input hash still matches `candidate_hashes` and the set of
 * candidates is the same set; otherwise it is out of date (lock 6, handoff §6). A no fit is stored
 * like any read (handoff R2 3); a failure is stored too, refunded, and never shown as a result.
 *
 * `pending` is a run in flight, and the partial unique index makes a second one for the same reader
 * and card impossible (lock 5): a double press is shown the run in flight and never charged twice.
 * Every write is guarded on `status = 'pending'`, and the unit settles in the outcome's own
 * transaction, as the Tuning runs do (`tuning/run-store.ts`).
 */
export const fitsReads = pgTable("fits_reads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  status: text("status").notNull(),
  /** `picks` or `noFit` on a `done` row; null while pending and on a failure. */
  outcome: text("outcome"),
  errorClass: text("error_class"),
  /** Whether the unit came back: a failure, a no fit, or a thin read (lock 4). */
  refunded: boolean("refunded").notNull().default(false),
  modelCallId: uuid("model_call_id").notNull().references(() => modelCalls.id),
  model: text("model").notNull(),
  promptVersion: integer("prompt_version").notNull(),
  /** Every candidate deck the read was run over, to its input hash. Its keys are the candidate set. */
  candidateHashes: jsonb("candidate_hashes").$type<Record<string, string>>().notNull(),
  /** The decks that held up, in the read's order, each with the plan source it was read from.
   *  Empty on a no fit. */
  picks: jsonb("picks").$type<StoredFitsPick[]>().notNull().default(sql`'[]'::jsonb`),
  /** How many decks the model named, and each drop by reason. */
  returned: integer("returned"),
  drops: jsonb("drops").$type<Partial<Record<FitsDropReason, number>>>(),
}, (t) => [
  check("fits_reads_status_check", sql`${t.status} in ('pending', 'done', 'failed')`),
  check("fits_reads_outcome_check", sql`${t.outcome} is null or ${t.outcome} in ('picks', 'noFit')`),
  uniqueIndex("fits_reads_one_pending_idx").on(t.userId, t.oracleId).where(sql`${t.status} = 'pending'`),
  index("fits_reads_user_card_idx").on(t.userId, t.oracleId, t.createdAt),
]);
