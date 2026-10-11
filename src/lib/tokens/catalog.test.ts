import { describe, expect, it } from "vitest";
import {
  classifyTokenEntry,
  TOKEN_FLOORS,
  TokenCatalogBuilder,
  tokenFloorFailure,
  tokenPartIds,
  type TokenCatalogStats,
} from "./catalog";

const T1 = "11111111-1111-4111-8111-111111111111";
const T2 = "22222222-2222-4222-8222-222222222222";
const P1 = "aaaaaaa1-0000-4000-8000-000000000001";
const P2 = "aaaaaaa2-0000-4000-8000-000000000002";
const P3 = "aaaaaaa3-0000-4000-8000-000000000003";
const C1 = "cccccccc-0000-4000-8000-000000000001";
const C2 = "cccccccc-0000-4000-8000-000000000002";

const token = (over: Record<string, unknown> = {}) => ({
  id: P1, oracle_id: T1, layout: "token", name: "Treasure", type_line: "Token Artifact — Treasure",
  colors: [], oracle_text: "Sacrifice this artifact: Add one mana of any color.",
  set: "TLA", collector_number: "9", finishes: ["nonfoil", "foil"],
  image_uris: { normal: "n", small: "s", art_crop: "a" }, ...over,
});
const maker = (oracle: string, parts: unknown[], over: Record<string, unknown> = {}) => ({
  id: `p-${oracle}`, oracle_id: oracle, layout: "normal", name: "Maker", all_parts: parts, ...over,
});
const part = (id: string, component = "token") => ({ id, component, name: "x", type_line: "x" });

describe("classifyTokenEntry", () => {
  it("reads a token and its printing, lowercasing the set", () => {
    const r = classifyTokenEntry(token({ power: "1", toughness: "1", colors: ["W"] }));
    expect(r?.token).toMatchObject({ oracleId: T1, name: "Treasure", colors: ["W"], power: "1", toughness: "1", layout: "token" });
    expect(r?.printing).toMatchObject({ scryfallId: P1, tokenOracleId: T1, setCode: "tla", collectorNumber: "9", imageUri: "n" });
  });

  it("reads a double-faced token from its faces", () => {
    const r = classifyTokenEntry({
      id: P2, oracle_id: T2, layout: "double_faced_token", name: "A // B", set: "x", collector_number: "1",
      card_faces: [
        { name: "A", type_line: "Token Creature", colors: ["R"], power: "2", toughness: "2", oracle_text: "a", image_uris: { normal: "f0" } },
        { name: "B", type_line: "Token Artifact", oracle_text: "b", image_uris: { normal: "f1" } },
      ],
    });
    expect(r?.token).toMatchObject({ name: "A // B", typeLine: "Token Creature // Token Artifact", colors: ["R"], power: "2", oracleText: "a\n//\nb" });
    expect(r?.printing).toMatchObject({ imageUri: "f0", backImageUri: "f1" });
  });

  it("keeps a token Scryfall files as a reversible card (the sld/1969 case)", () => {
    const r = classifyTokenEntry({
      id: P3, layout: "reversible_card", name: "Mechtitan", set: "sld", collector_number: "1969",
      card_faces: [
        { oracle_id: T2, name: "Mechtitan", type_line: "Token Legendary Artifact Creature — Construct", colors: [] },
        { oracle_id: T2, name: "Mechtitan", type_line: "Token Legendary Artifact Creature — Construct", colors: [] },
      ],
    });
    expect(r?.token.oracleId).toBe(T2);
  });

  it("names a reversible token by its face, not the doubled top-level name", () => {
    const r = classifyTokenEntry({
      id: P3, layout: "reversible_card", name: "Mechtitan // Mechtitan", set: "sld", collector_number: "1969",
      card_faces: [
        { oracle_id: T2, name: "Mechtitan", type_line: "Token Legendary Artifact Creature — Construct" },
        { oracle_id: T2, name: "Mechtitan", type_line: "Token Legendary Artifact Creature — Construct" },
      ],
    });
    expect(r?.token.name).toBe("Mechtitan");
  });

  it("is not fooled by a reversible card of a real card", () => {
    expect(classifyTokenEntry({
      id: P3, layout: "reversible_card", name: "X", set: "sld", collector_number: "1",
      card_faces: [{ oracle_id: C1, type_line: "Enchantment" }, { oracle_id: C1, type_line: "Enchantment" }],
    })).toBeNull();
  });

  it("leaves emblems, art series and digital printings out", () => {
    expect(classifyTokenEntry(token({ layout: "emblem" }))).toBeNull();
    expect(classifyTokenEntry(token({ layout: "art_series" }))).toBeNull();
    expect(classifyTokenEntry(token({ digital: true }))).toBeNull();
  });

  it("refuses an entry with no oracle id rather than guessing one", () => {
    expect(classifyTokenEntry(token({ oracle_id: undefined }))).toBeNull();
    expect(classifyTokenEntry(token({ oracle_id: "" }))).toBeNull();
  });
});

describe("tokenPartIds", () => {
  it("takes component token and nothing else", () => {
    const raw = maker(C1, [part(P1), part(C1, "combo_piece"), part(P2, "meld_part"), part(P3, "meld_result"), part(P2)]);
    expect(tokenPartIds(raw)).toEqual([P1, P2]);
  });

  it("never reads a token printing's own parts", () => {
    expect(tokenPartIds(token({ all_parts: [part(P2)] }))).toEqual([]);
  });

  it("is empty without all_parts", () => {
    expect(tokenPartIds(maker(C1, undefined as never))).toEqual([]);
  });
});

describe("TokenCatalogBuilder", () => {
  it("resolves a part id whichever side of its token the maker sits in the file", () => {
    const before = new TokenCatalogBuilder();
    before.add(maker(C1, [part(P1)]));
    before.add(token());
    const after = new TokenCatalogBuilder();
    after.add(token());
    after.add(maker(C1, [part(P1)]));
    const known = new Set([C1]);
    expect(before.finish(known).links).toEqual([{ cardOracleId: C1, tokenOracleId: T1 }]);
    expect(after.finish(known).links).toEqual(before.finish(known).links);
  });

  it("links through any printing of the token, once per card and token", () => {
    const b = new TokenCatalogBuilder();
    b.add(token());
    b.add(token({ id: P2, set: "m20", collector_number: "3" }));
    b.add(maker(C1, [part(P1), part(P2)]));
    b.add(maker(C1, [part(P2)], { id: "other-printing" }));
    const c = b.finish(new Set([C1]));
    expect(c.links).toHaveLength(1);
    expect(c.printings).toHaveLength(2);
    expect(c.stats).toMatchObject({ tokens: 1, tokenPrintings: 2, links: 1, makers: 1, partRefs: 2, resolvedRefs: 2 });
  });

  it("drops a maker the catalog does not hold, and says so", () => {
    const b = new TokenCatalogBuilder();
    b.add(token());
    b.add(maker(C2, [part(P1)]));
    const c = b.finish(new Set([C1]));
    expect(c.links).toEqual([]);
    expect(c.stats.unknownMakers).toBe(1);
  });

  it("counts a part id that matches no token printing as unresolved", () => {
    const b = new TokenCatalogBuilder();
    b.add(token());
    b.add(maker(C1, [part(P1), part(P3)]));
    const c = b.finish(new Set([C1]));
    expect(c.stats).toMatchObject({ partRefs: 2, resolvedRefs: 1 });
  });

  it("builds a token's record from its lowest-id printing, whatever the file order", () => {
    const one = token({ oracle_text: "from P1" });
    const two = token({ id: P2, oracle_text: "from P2" });
    const fwd = new TokenCatalogBuilder(); fwd.add(one); fwd.add(two);
    const rev = new TokenCatalogBuilder(); rev.add(two); rev.add(one);
    expect(fwd.finish(new Set()).tokens[0].oracleText).toBe("from P1");
    expect(rev.finish(new Set()).tokens[0].oracleText).toBe("from P1");
  });

  it("keeps two tokens of one name apart by oracle id", () => {
    const b = new TokenCatalogBuilder();
    b.add(token({ name: "Goblin", colors: ["R"], power: "1", toughness: "1" }));
    b.add(token({ id: P2, oracle_id: T2, name: "Goblin", colors: ["R"], power: "1", toughness: "1", oracle_text: "Haste" }));
    expect(b.finish(new Set()).tokens.map((t) => t.oracleId)).toEqual([T1, T2]);
  });
});

describe("tokenFloorFailure", () => {
  const ok: TokenCatalogStats = {
    tokenPrintings: 3163, tokens: 1006, links: 4165, makers: 3966, partRefs: 7306, resolvedRefs: 7256, unknownMakers: 0,
  };
  it("passes the measured run", () => expect(tokenFloorFailure(ok)).toBeNull());
  it.each([
    ["tokenPrintings", { tokenPrintings: TOKEN_FLOORS.tokenPrintings - 1 }],
    ["tokens", { tokens: TOKEN_FLOORS.tokens - 1 }],
    ["links", { links: TOKEN_FLOORS.links - 1 }],
    ["makers", { makers: TOKEN_FLOORS.makers - 1 }],
    ["resolved share", { resolvedRefs: 1000, partRefs: 7306 }],
    ["no refs at all", { partRefs: 0, resolvedRefs: 0 }],
  ])("refuses under the %s floor", (_name, over) => {
    expect(tokenFloorFailure({ ...ok, ...over })).toMatch(/not published/);
  });
  it("names every floor it missed", () => {
    const msg = tokenFloorFailure({ ...ok, tokens: 1, links: 1 })!;
    expect(msg).toContain("1 tokens");
    expect(msg).toContain("1 card-to-token links");
  });
});
