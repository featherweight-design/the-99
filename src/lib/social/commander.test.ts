// A face is a commander the catalog lists (Social R1 PR A, E1). `probe:social` proves `setCommander`
// against the catalog; this pins the rule it saves by and the shape every read hands out.
import { describe, expect, it } from "vitest";
import { canBeFace, setCommander, toCommander } from "./commander";

const legend = { commanderLegal: true, typeLine: "Legendary Creature — Elf Druid", oracleText: "", manaCost: "{G}", layout: "normal" };

describe("canBeFace", () => {
  it("takes a commander-legal legendary creature", () => {
    expect(canBeFace(legend)).toBe(true);
  });

  it("refuses a card that is not commander-legal", () => {
    expect(canBeFace({ ...legend, commanderLegal: false })).toBe(false);
  });

  it("refuses a card that cannot lead a deck", () => {
    expect(canBeFace({ ...legend, typeLine: "Basic Land — Forest" })).toBe(false);
    expect(canBeFace({ ...legend, typeLine: "Legendary Land" })).toBe(false);
  });

  it("refuses a token", () => {
    expect(canBeFace({ ...legend, layout: "token" })).toBe(false);
  });

  it("takes a card whose text says it can be your commander", () => {
    expect(canBeFace({ ...legend, typeLine: "Planeswalker — Teferi", oracleText: "Teferi can be your commander." })).toBe(true);
  });
});

describe("toCommander", () => {
  it("is null when the read joined no card", () => {
    expect(toCommander({ commanderOracleId: null, commanderName: null, commanderArt: null })).toBeNull();
  });

  it("carries the oracle id, name and art crop", () => {
    expect(toCommander({ commanderOracleId: "o", commanderName: "N", commanderArt: null })).toEqual({ oracleId: "o", name: "N", artCropUri: null });
  });
});

describe("setCommander", () => {
  it("refuses a malformed id before any query", async () => {
    await expect(setCommander("user_viewer", "not-a-uuid")).resolves.toEqual({ ok: false, reason: "notCommander" });
    await expect(setCommander("user_viewer", 7)).resolves.toEqual({ ok: false, reason: "notCommander" });
  });
});
