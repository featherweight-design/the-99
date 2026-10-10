import { describe, expect, it } from "vitest";
import journal from "../../../drizzle/meta/_journal.json";
import { historyShipDate } from "./history-ship";

describe("historyShipDate", () => {
  it("is the ledger migration's own journal time, not a constant", () => {
    const when = journal.entries.find((e) => e.tag === "0083_collection_history")!.when;
    expect(historyShipDate().getTime()).toBe(when);
    expect(historyShipDate().getTime()).toBeGreaterThan(Date.UTC(2026, 8, 1));
  });
});
