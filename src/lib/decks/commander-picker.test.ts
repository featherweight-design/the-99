// The face picker's reads (Social R1 PR A, E2, G13). The deck row's query reads the viewer's own decks,
// newest first; `deckTiles` turns them into tiles; `probe:social` proves both, and the search, on a database.
import { describe, expect, it } from "vitest";
import { canLeadADeck, DECK_COMMANDER_TILES, deckCommandersQuery, deckTiles, searchFaceCommanders } from "./commander-picker";

const VIEWER = "user_viewer";

const LEGEND = { type: "Legendary Creature — Elf Druid", text: "", cost: "{G}", layout: "normal" };
/** A deck row; `banned` names a commander of it that is no longer commander-legal. */
const deck = (lead: string, partner: string | null = null, banned: string[] = []) => ({
  leadId: lead, leadName: `Name ${lead}`, leadArt: `art/${lead}`, leadIdentity: ["G"],
  leadLegal: !banned.includes(lead), leadType: LEGEND.type, leadText: LEGEND.text, leadCost: LEGEND.cost, leadLayout: LEGEND.layout,
  partnerId: partner, partnerName: partner === null ? null : `Name ${partner}`, partnerArt: partner === null ? null : `art/${partner}`,
  partnerIdentity: partner === null ? null : ["U"],
  partnerLegal: partner === null ? null : !banned.includes(partner), partnerType: partner === null ? null : LEGEND.type,
  partnerText: partner === null ? null : LEGEND.text, partnerCost: partner === null ? null : LEGEND.cost,
  partnerLayout: partner === null ? null : LEGEND.layout,
});

describe("deckCommandersQuery", () => {
  it("reads only the viewer's own decks, newest first", () => {
    const q = deckCommandersQuery(VIEWER).toSQL();
    expect(q.sql).toContain(`where "decks"."user_id" = $1`);
    // Every deck, never a window: a run of new decks on one commander must not hide an older commander.
    expect(q.sql).not.toMatch(/\blimit\b/i);
    expect(q.sql).toContain(`order by "decks"."created_at" desc`);
    expect(q.params[0]).toBe(VIEWER);
  });

  it("joins the lead and the partner as two aliased cards", () => {
    const q = deckCommandersQuery(VIEWER).toSQL();
    expect(q.sql).toContain(`inner join "cards" "lead_card" on "lead_card"."oracle_id" = "decks"."commander_oracle_id"`);
    expect(q.sql).toContain(`left join "cards" "partner_card" on "partner_card"."oracle_id" = "decks"."partner_oracle_id"`);
    expect(q.sql).toContain(`"lead_card"."art_crop_uri"`);
    expect(q.sql).toContain(`"lead_card"."color_identity"`);
    expect(q.sql).toContain(`"partner_card"."color_identity"`);
  });
});

describe("deckTiles", () => {
  it("keeps the decks' order and draws a partner pair as two tiles, lead first", () => {
    expect(deckTiles([deck("a", "b"), deck("c")]).map((t) => t.oracleId)).toEqual(["a", "b", "c"]);
  });

  it("draws each commander once, where it first appears", () => {
    expect(deckTiles([deck("a"), deck("b", "a"), deck("a")]).map((t) => t.oracleId)).toEqual(["a", "b"]);
  });

  it("stops at eight tiles, even mid-pair", () => {
    // One solo deck first, so the eighth tile is the LEAD of the fourth pair and its partner is cut.
    const rows = [deck("solo"), ...Array.from({ length: 5 }, (_, i) => deck(`l${i}`, `p${i}`))];
    const tiles = deckTiles(rows);
    expect(tiles).toHaveLength(DECK_COMMANDER_TILES);
    expect(tiles.at(-1)?.oracleId).toBe("l3");
  });

  it("leaves out a commander that can no longer be a face, keeping its eligible partner, before the count", () => {
    expect(deckTiles([deck("a", "b", ["a"]), deck("c")]).map((t) => t.oracleId)).toEqual(["b", "c"]);
    const rows = [deck("x", null, ["x"]), ...Array.from({ length: 8 }, (_, i) => deck(`k${i}`))];
    expect(deckTiles(rows).map((t) => t.oracleId)).toEqual(Array.from({ length: 8 }, (_, i) => `k${i}`));
  });

  it("carries the name, the art crop and the colour identity", () => {
    expect(deckTiles([deck("a", "b")])).toEqual([
      { oracleId: "a", name: "Name a", artCropUri: "art/a", colorIdentity: ["G"] },
      { oracleId: "b", name: "Name b", artCropUri: "art/b", colorIdentity: ["U"] },
    ]);
  });
});

describe("searchFaceCommanders", () => {
  it("asks for nothing on a query too short to run, or not a string", async () => {
    await expect(searchFaceCommanders("a")).resolves.toEqual([]);
    await expect(searchFaceCommanders(7)).resolves.toEqual([]);
  });
});

const legend = { commanderLegal: true, typeLine: "Legendary Creature — Elf Druid", oracleText: "", manaCost: "{G}", layout: "normal" };

describe("canLeadADeck", () => {
  it("takes a commander-legal legendary creature", () => {
    expect(canLeadADeck(legend)).toBe(true);
  });
  it("refuses a card that is not commander-legal", () => {
    expect(canLeadADeck({ ...legend, commanderLegal: false })).toBe(false);
  });
  it("refuses a card that cannot lead a deck", () => {
    expect(canLeadADeck({ ...legend, typeLine: "Basic Land — Forest" })).toBe(false);
    expect(canLeadADeck({ ...legend, typeLine: "Legendary Land" })).toBe(false);
  });
  it("refuses a token", () => {
    expect(canLeadADeck({ ...legend, layout: "token" })).toBe(false);
  });
  it("takes a card whose text says it can be your commander", () => {
    expect(canLeadADeck({ ...legend, typeLine: "Planeswalker — Teferi", oracleText: "Teferi can be your commander." })).toBe(true);
  });
});
