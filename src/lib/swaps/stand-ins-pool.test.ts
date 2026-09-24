import { describe, expect, it } from "vitest";

import { classifyRoles } from "../recs/roles";
import { ROLE_WORDS } from "./gather";

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

describe("ROLE_WORDS", () => {
  it("admits every text classifyRoles gives a role", () => {
    const words = new RegExp(ROLE_WORDS, "i");
    for (const text of TEXTS) {
      expect(classifyRoles({ typeLine: "Instant", oracleText: text, keywords: [] }).length, text).toBeGreaterThan(0);
      expect(words.test(text), text).toBe(true);
    }
  });
});
