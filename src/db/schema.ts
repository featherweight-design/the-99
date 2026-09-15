import { sql } from "drizzle-orm";
import {
  pgTable, text, integer, real, timestamp, jsonb, boolean, primaryKey, uuid, index, check, date,
  unique,
} from "drizzle-orm/pg-core";
import { FINISHES } from "../lib/collection/key";
import type { EdhrecTag } from "../lib/edhrec/parse";
import type { CommanderEngine } from "../lib/recs/engine";

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
},
  (t) => [
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
  // control alone — re-sorting, regrouping, or opening the card detail must
  // leave it set, or the sweep would silently spare cards the player only looked at.
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
 * A ROW IS INERT UNLESS THE CARD IS IN THE DECK. Every read joins against
 * current membership — a `deck_cards` row, or either commander column — so a row
 * whose card has since left does nothing at all. That is what lets six separate
 * paths delete or replace `deck_cards` wholesale without any of them remembering
 * to prune, and it is why a card returning to a deck is never silently already
 * proxied.
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
}, (t) => [
  unique("deck_versions_deck_number_key").on(t.deckId, t.number),
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
 */
export const SCORE_WRITER_CURRENT = 2;

export const commanderScores = pgTable("commander_scores", {
  userId: text("user_id").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  slug: text("slug").notNull(),
  score: real("score").notNull(),
  // What the list sorts by, and the only thing it is for. `score` is out of 40
  // for a commander EDHREC does not index and out of 100 for every other, so
  // ordering by it demotes the first group for a gap in our data rather than a
  // gap in their fit. This is that same score back on the 0–100 scale; it is
  // never printed and never drawn.
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
 * reserved rather than joining the queue ahead of it (see `claimModel`), because
 * `loadDeckBuyRows` emits no commander row (#470), so a deck left short of its own
 * commander is short in a way no surface can draw.
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
