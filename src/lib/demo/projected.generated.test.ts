import { describe, expect, it } from "vitest";

import { demoScanRules } from "../../../scripts/lib/demo-scan-rules";
import { scanNames } from "./name-scan";
import { projected } from "./projected";
import { projectedJson } from "./projected.generated";

// The committed file is shown to every visitor, so it is checked as committed. Until the export has run it is null and the
// shape checks have nothing to hold; the name scan always runs.
describe("the committed projected data", () => {
  it("names no real person, email, handle, account id or profile URL", () => {
    expect(scanNames(projectedJson, demoScanRules)).toEqual([]);
  });

  const data = projected();
  it.skipIf(data === null)("holds both steps, in the shapes the drawing halves take", () => {
    expect(data!.format).toBe(1);
    expect(data!.collection.cards.length).toBeGreaterThan(0);
    expect(data!.collection.totalCards).toBeGreaterThanOrEqual(data!.collection.uniqueCards);
    expect(data!.commanders.rows.length).toBeGreaterThan(0);
    expect(data!.commanders.rankBySlug).toBeInstanceOf(Map);
    for (const r of data!.commanders.rows) expect(data!.commanders.rankBySlug.get(r.slug)).toBeGreaterThan(0);
  });
});
