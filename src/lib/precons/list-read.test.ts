import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { openPreconLines } from "./open-read";
import { ownedPreconCards, preconArt, preconCardFacts } from "./list-read";

describe("ownedPreconCards", () => {
  // The correlated subquery must compare the precon card to the COLLECTION row, never to itself.
  it("qualifies the collection's oracle id inside the subquery", () => {
    const { sql } = ownedPreconCards("user_1").toSQL();
    expect(sql).toContain(`pc.oracle_id = "collection_items"."oracle_id"`);
  });
});

describe("preconArt", () => {
  const ART = `coalesce("printings"."image_uri", "cards"."image_uri")`;
  const PRINTING = `left join "printings" on "printings"."scryfall_id" = "precon_cards"."scryfall_id"`;

  it("is the precon's own printing first, the card's art only where the catalog lacks it", () => {
    expect(new PgDialect().sqlToQuery(preconArt).sql).toBe(ART);
  });

  // Every precon surface reads its art through it: the list's thumbs, and the open precon's.
  it("is what the list and the open precon read, beside the precon's printing", () => {
    for (const { sql } of [preconCardFacts().toSQL(), openPreconLines(db, "X").toSQL()]) {
      expect(sql).toContain(ART);
      expect(sql).toContain(PRINTING);
    }
  });
});
