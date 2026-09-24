import { describe, expect, it } from "vitest";

import { classifyRoles } from "../recs/roles";
import { ROLE_WORDS, roleWords } from "./gather";

// One text per pattern in `classifyRoles` (roles.ts), each shaped the way the catalog words it. The
// unlisted pool is chosen by `ROLE_WORDS` in SQL before roles are read, so a role the words miss is
// a stand-in that can never be offered, with no error anywhere.
const TEXTS = [
  "{T}: Add {C}{C}.",
  "Mana Crypt adds two colorless mana.",
  "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.",
  "Draw two cards.",
  "Destroy all creatures.",
  "Exile all nonland permanents.",
  "All creatures get -2/-2 until end of turn.",
  "Destroy target creature.",
  "Exile target artifact.",
  "Counter target spell.",
  "Lightning Bolt deals 3 damage to any target.",
  "Target creature gets -3/-3 until end of turn.",
];

// Postgres word boundaries, spelled for a JavaScript test.
const js = (pg: string) => new RegExp(pg.replaceAll("\\m", "\\b").replaceAll("\\M", "\\b"), "i");

describe("ROLE_WORDS", () => {
  it("admits every text classifyRoles gives a role, under that role's own words", () => {
    for (const text of TEXTS) {
      const roles = classifyRoles({ typeLine: "Instant", oracleText: text, keywords: [] }).filter((r) => r !== "land");
      expect(roles.length, text).toBeGreaterThan(0);
      for (const role of roles) expect(js(ROLE_WORDS[role]).test(text), `${role}: ${text}`).toBe(true);
    }
  });

  it("refuses the near misses a bare word admitted", () => {
    for (const text of [
      "Target creature you control gains flying.",
      "As an additional cost to cast this spell, discard a card.",
      "Put a +1/+1 counter on each creature you control.",
    ]) {
      expect(js(roleWords(["ramp", "draw", "removal", "wipes"])).test(text), text).toBe(false);
    }
  });
});
