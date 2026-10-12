import { sql } from "drizzle-orm";
import { db } from "../../db";
import { cardTokens, tokenPrintings, tokens } from "../../db/schema";
import { tokenFloorFailure, type TokenCatalog, type TokenCatalogStats } from "./catalog";

const BATCH = 1_000;

export type TokenPublishReport =
  | { status: "published"; stats: TokenCatalogStats }
  | { status: "refused"; stats: TokenCatalogStats; reason: string }
  | { status: "skipped"; reason: string };

/**
 * Whether the three token tables exist in this database. The catalog refresh runs on both
 * databases from the same bytes, and production's migrations apply in its next BUILD, so a refresh
 * can reach a database before the schema does. The token step skips cleanly then rather than
 * failing a run whose printings succeeded; the next refresh after the deploy fills the tables.
 */
export async function tokenTablesExist(): Promise<boolean> {
  const { rows } = await db.execute<{ ok: boolean }>(sql`
    select (to_regclass('public.tokens') is not null
        and to_regclass('public.token_printings') is not null
        and to_regclass('public.card_tokens') is not null) as ok
  `);
  return rows[0]?.ok === true;
}

/**
 * Whether token PRICES can be written: the catalog tables AND `token_printing_prices`. The price table
 * arrives in a later migration than the catalog's, so a database can be migrated far enough for the
 * catalog step and not for this one; the price ingest asks this, not `tokenTablesExist`, or it would
 * find token printings and then insert into a table that is not there and roll back the card prices.
 */
export async function tokenPriceTablesExist(): Promise<boolean> {
  if (!(await tokenTablesExist())) return false;
  const { rows } = await db.execute<{ ok: boolean }>(sql`select to_regclass('public.token_printing_prices') is not null as ok`);
  return rows[0]?.ok === true;
}

/**
 * Publishes a built catalog in ONE transaction, or refuses under a floor and leaves every
 * previous row standing. Tokens and their printings are UPSERTED and never deleted (an ownership
 * row will reference them); `card_tokens` is an exact replace, because a link Scryfall withdrew
 * must stop being drawn. The clear and the refill share the transaction, so a reader never sees
 * the links empty.
 */
export async function publishTokenCatalog(catalog: TokenCatalog): Promise<TokenPublishReport> {
  // Tables first: a database that has not migrated has nothing to refuse to publish, so a bulk under
  // a floor must not fail a refresh whose printings succeeded on a schema the feature does not have.
  if (!(await tokenTablesExist())) {
    return { status: "skipped", reason: "the token tables do not exist in this database yet (its migration applies in the next production build)" };
  }
  const refusal = tokenFloorFailure(catalog.stats);
  if (refusal) return { status: "refused", stats: catalog.stats, reason: refusal };
  await db.transaction(async (tx) => {
    for (let i = 0; i < catalog.tokens.length; i += BATCH) {
      await tx.insert(tokens).values(catalog.tokens.slice(i, i + BATCH)).onConflictDoUpdate({
        target: tokens.oracleId,
        set: {
          name: sql`excluded.name`,
          typeLine: sql`excluded.type_line`,
          colors: sql`excluded.colors`,
          power: sql`excluded.power`,
          toughness: sql`excluded.toughness`,
          layout: sql`excluded.layout`,
          oracleText: sql`excluded.oracle_text`,
        },
      });
    }
    for (let i = 0; i < catalog.printings.length; i += BATCH) {
      await tx.insert(tokenPrintings).values(catalog.printings.slice(i, i + BATCH)).onConflictDoUpdate({
        target: tokenPrintings.scryfallId,
        set: {
          tokenOracleId: sql`excluded.token_oracle_id`,
          setCode: sql`excluded.set_code`,
          collectorNumber: sql`excluded.collector_number`,
          imageUri: sql`excluded.image_uri`,
          imageUriSmall: sql`excluded.image_uri_small`,
          artCropUri: sql`excluded.art_crop_uri`,
          backImageUri: sql`excluded.back_image_uri`,
          finishes: sql`excluded.finishes`,
        },
      });
    }
    await tx.delete(cardTokens);
    for (let i = 0; i < catalog.links.length; i += BATCH) {
      await tx.insert(cardTokens).values(catalog.links.slice(i, i + BATCH));
    }
  });
  return { status: "published", stats: catalog.stats };
}
