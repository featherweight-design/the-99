import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ABOUT_DECK_IDS, DECK_ROLES } from "./fictional-fixture/rng";
import { STAND_IN } from "./about-identity.mjs";
import { PLAYER_NAME } from "./fictional-fixture/names";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("capture:about consumes the fictional fixture", () => {
  const capture = read("../capture-about.mjs");

  it("names no deleted script and no snapshot lookup", () => {
    for (const f of ["../capture-about.mjs", "./about-page-frames.mjs", "./about-fixture-ids.mjs"]) {
      expect(read(f)).not.toContain("about-fixtures");
    }
    expect(capture).not.toContain("readDeckMarks");
    expect(capture).not.toContain("count(*) desc");
  });

  it("finds every deck role by its deterministic id", () => {
    // The lookup itself, not the import: a deck is read by the role's fixed id.
    expect(capture).toContain("and id = ${ABOUT_DECK_IDS[role]}");
    for (const role of DECK_ROLES) expect(capture).toContain(`byRoleChecked("${role}")`);
    expect(new Set(Object.values(ABOUT_DECK_IDS)).size).toBe(DECK_ROLES.length);
  });

  it("shows the fixture's player, not a different stand-in", () => {
    expect(STAND_IN.name).toBe(PLAYER_NAME);
  });
});
