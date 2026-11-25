import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The partial index `spellbook_variants_pair_idx` serves a read only when the read's `where` implies the index predicate.
// A query reworded past it (`card_count in (2)`) would silently go back to scanning the whole table, so both texts are pinned.
describe("spellbook_variants_pair_idx", () => {
  const schema = readFileSync(join(process.cwd(), "src/db/schema.ts"), "utf8");
  const queries = readFileSync(join(process.cwd(), "src/lib/combos/near-miss.ts"), "utf8");

  it("is declared on the template-free two-card predicate", () => {
    expect(schema).toContain("${t.cardCount} = 2 and cardinality(${t.requiresTemplateIds}) = 0");
  });

  it("matches the predicate every own-one and own-both read filters on", () => {
    const reads = queries.match(/v\.card_count = 2 and cardinality\(v\.requires_template_ids\) = 0/g) ?? [];
    expect(reads.length).toBeGreaterThanOrEqual(2);
  });
});
