import { describe, expect, it } from "vitest";
import { receiptEntryQuery } from "./add-receipt-read";

// The `added` param is a claim off the URL, so the entry it names is read by id AND the signed-in reader's id:
// another reader's entry id answers with no row. Rendered against the real builder, not a stand-in.
describe("receiptEntryQuery", () => {
  const { sql, params } = receiptEntryQuery("reader-1", "7d0a1c1e-4d1a-4b9a-8d3c-2f7a5a9e1b11").toSQL();

  it("stands on the entry id and the reader's user id together", () => {
    expect(sql).toMatch(/"collection_history"\."id" = \$\d+ and "collection_history"\."user_id" = \$\d+/);
    expect(params).toEqual(["7d0a1c1e-4d1a-4b9a-8d3c-2f7a5a9e1b11", "reader-1"]);
  });
});
