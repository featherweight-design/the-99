import {
  pgTable, text, integer, real, timestamp, jsonb, boolean, primaryKey, uuid, index,
} from "drizzle-orm/pg-core";

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

export const collectionItems = pgTable("collection_items", {
  userId: text("user_id").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  quantity: integer("quantity").notNull(),
  setCode: text("set_code").notNull(),
  foil: boolean("foil").notNull().default(false),
  condition: text("condition"),
}, (t) => [primaryKey({ columns: [t.userId, t.oracleId, t.setCode, t.foil] })]);

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

export const csvUploads = pgTable("csv_uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  filename: text("filename").notNull(),
  rowCount: integer("row_count").notNull(),
  unmatchedCount: integer("unmatched_count").notNull(),
  // Full preview payload: { unmatched, parseErrors, pendingItems } — pendingItems are
  // compact aggregated (oracleId,setCode,foil) totals that confirm reads back.
  previewPayload: jsonb("preview_payload").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Set when the preview is confirmed into the collection; null = abandoned preview.
  confirmedAt: timestamp("confirmed_at"),
});
