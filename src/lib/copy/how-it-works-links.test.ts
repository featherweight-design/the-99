import { describe, expect, it } from "vitest";
import { aboutEntries } from "./about";
import { howItWorksRowsCopy } from "./how-it-works";
import { entryRow, HOW_IT_WORKS_ID } from "./how-it-works-links";

describe("entryRow", () => {
  // A renamed entry or row would otherwise leave a link that lands nowhere.
  it("maps only real entries onto real rows", () => {
    const entries = new Set(aboutEntries.map((e) => e.id));
    const rows = new Set(howItWorksRowsCopy.rows.map((r) => r.id));
    for (const [entry, row] of Object.entries(entryRow)) {
      expect(entries, entry).toContain(entry);
      expect(rows, row).toContain(row);
    }
  });

  it("uses an id no entry or row holds for the section", () => {
    expect(aboutEntries.map((e) => e.id)).not.toContain(HOW_IT_WORKS_ID);
    expect(howItWorksRowsCopy.rows.map((r) => r.id)).not.toContain(HOW_IT_WORKS_ID);
  });
});
