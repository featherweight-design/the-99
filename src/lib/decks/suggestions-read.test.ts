import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const { rowsRef, select } = vi.hoisted(() => {
  const rowsRef = { rows: [] as unknown[] };
  return { rowsRef, select: vi.fn(() => ({ from: () => ({ where: async () => rowsRef.rows }) })) };
});
vi.mock("../../db", () => ({ db: { select } }));

import { OWNED_POOL_PROJECTION, STAPLE_PROJECTION, topCardCut, topPickNames, unownedAppend, unownedTopCards } from "./suggestions-read";
import { SHELF_CAP } from "./shelf-cap";

/**
 * `layout` decides whether a card can take a land drop (`playableAsLand`), and its absence is
 * SILENT: a pool query that drops the column leaves every `FillCandidate.layout` undefined,
 * every modal land invisible to the land count, and every other test green. The required field
 * on `FillCandidate` catches a dropped mapping; only this catches a dropped column.
 */
describe("the fill's pool projections", () => {
  it("selects layout for owned cards", () => {
    expect(Object.keys(OWNED_POOL_PROJECTION)).toContain("layout");
  });

  it("selects layout for unowned staples", () => {
    // Both halves, because the fill reads one pool for cards you own and another for the
    // staples it would buy, and a modal land can arrive through either.
    expect(Object.keys(STAPLE_PROJECTION)).toContain("layout");
  });
});

// #391: the loader used to trim this to five while every shelf drew six, so the Top
// picks shelf was the one shelf that never reached the cap.
describe("unownedAppend", () => {
  it("offers the Top picks shelf the same cap as every other shelf", () => {
    const ranked = Array.from({ length: SHELF_CAP + 4 }, (_, i) => `staple-${i}`);
    expect(unownedAppend(ranked)).toEqual(ranked.slice(0, SHELF_CAP));
    expect(SHELF_CAP).toBe(6);
  });

  it("keeps the ranking order and a short list whole", () => {
    expect(unownedAppend(["a", "b"])).toEqual(["a", "b"]);
  });
});

// EDHREC's commander page lists New Cards first. In list order Windgrace's Top picks shelf
// led with Through the Forest Gate (5.6% of decks) ahead of The Gitrog Monster (78%).
describe("topPickNames", () => {
  const windgrace = {
    topCards: ["Through the Forest Gate", "Field of the Dead", "The Gitrog Monster", "Sol Ring"],
    inclusionByName: { "through the forest gate": 5.6, "field of the dead": 41, "the gitrog monster": 78 },
  };

  it("ranks the shelf by inclusion, not by EDHREC's list order", () => {
    expect(topPickNames(windgrace.topCards, windgrace.inclusionByName)).toEqual([
      "The Gitrog Monster", "Field of the Dead", "Through the Forest Gate", "Sol Ring",
    ]);
  });

  it("ranks before the 100-name cut, so a well-played card listed late still reaches the shelf", () => {
    const late = [...Array.from({ length: 120 }, (_, i) => `New ${i}`), "The Gitrog Monster"];
    const ranked = topPickNames(late, { "the gitrog monster": 78 });
    expect(ranked.slice(0, 100)).toContain("The Gitrog Monster");
  });

  // The loader is too wide to run in a unit test, so this reads its source: the shelf's
  // `unownedTopCards` call takes the ranked names, never `topCards` as listed.
  it("is what the Top picks loader hands unownedTopCards", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/decks/suggestions-read.ts"), "utf8");
    const loader = src.slice(src.indexOf("export async function loadDeckSuggestions"));
    const call = loader.slice(loader.indexOf("await unownedTopCards("), loader.indexOf("ownedByOracleId, excludeIds"));
    // Ranked either way: the chosen build's page (engine plan A4) or the commander page.
    expect(call).toContain("topPickNames(build.topCards, build.inclusionByName)");
    expect(call).toContain("topPickNames(topCards, inclusionByName)");
  });
});

// Ranked by inclusion, EDHREC's basics (90%+) lead the list, so Windgrace's shelf offered Forest,
// Swamp and Mountain to a player whose collection holds no basics (#2975).
describe("unownedTopCards", () => {
  const card = (oracleId: string, name: string, typeLine: string) => ({
    oracleId, name, typeLine, oracleText: null, keywords: [], imageUri: null, manaCost: null, manaValue: 0, layout: "normal",
  });

  it("never offers a basic land, snow basics included", async () => {
    rowsRef.rows = [
      card("forest", "Forest", "Basic Land — Forest"),
      card("snow", "Snow-Covered Swamp", "Basic Snow Land — Swamp"),
      card("gitrog", "The Gitrog Monster", "Legendary Creature — Frog Horror"),
      card("tower", "Command Tower", "Land"),
    ];
    const got = await unownedTopCards(
      [{ oracleId: "windgrace", colorIdentity: ["B", "R", "G"] }],
      ["Forest", "Snow-Covered Swamp", "Command Tower", "The Gitrog Monster"],
      new Set(), new Set(),
    );
    expect(got.map((c) => c.name)).toEqual(["Command Tower", "The Gitrog Monster"]);
  });
});

describe("topCardCut", () => {
  it("drops the basics before the 100-name cut, so none takes a real card's slot", () => {
    const basics = ["Forest", "Swamp", "Mountain", "Snow-Covered Island", "Wastes"];
    const real = Array.from({ length: 100 }, (_, i) => `Card ${i}`);
    const cut = topCardCut([...basics, ...real]);
    expect(cut).toHaveLength(100);
    expect(cut).toContain("card 99");
    expect(cut.some((n) => basics.map((b) => b.toLowerCase()).includes(n))).toBe(false);
  });

  it("keeps a nonbasic land whose name holds a basic's", () => {
    expect(topCardCut(["Forest of the Dead", "Snow-Covered Wastes", "Command Tower"])).toEqual(["forest of the dead", "command tower"]);
  });
});
