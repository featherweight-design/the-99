import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listScopeIds, readLabelList } from "./label-list";

const dirWith = (body: string) => {
  const dir = mkdtempSync(join(tmpdir(), "label-list-"));
  writeFileSync(join(dir, "x.json"), body);
  return dir;
};
const ID = "904fdc61-e190-4ba5-8e34-2b18fa0584f2";

describe("readLabelList", () => {
  it("reads the committed v8 trial: the 298 v7 misses and 94 controls, no id twice", () => {
    expect(readLabelList("v8-trial")).toHaveLength(392);
  });

  it("returns the ids in file order", () => {
    expect(readLabelList("x", dirWith(JSON.stringify([{ oracleId: ID, name: "A" }])))).toEqual([ID]);
  });

  it("refuses an empty list, a row with no uuid, and an id named twice", () => {
    expect(() => readLabelList("x", dirWith("[]"))).toThrow(/non-empty/);
    expect(() => readLabelList("x", dirWith(JSON.stringify([{ name: "A" }])))).toThrow(/row 0/);
    expect(() => readLabelList("x", dirWith(JSON.stringify([{ oracleId: "nope" }])))).toThrow(/row 0/);
    expect(() => readLabelList("x", dirWith(JSON.stringify([{ oracleId: ID }, { oracleId: ID }])))).toThrow(/twice/);
  });
});

describe("listScopeIds", () => {
  it("plans exactly the file's ids for list:<name>, and nothing for any other scope", () => {
    const dir = dirWith(JSON.stringify([{ oracleId: ID, name: "A" }]));
    expect(listScopeIds("list:x", dir)).toEqual([ID]);
    expect(listScopeIds("all", dir)).toBeNull();
    expect(listScopeIds("in-use", dir)).toBeNull();
    expect(listScopeIds(`deck:${ID}`, dir)).toBeNull();
  });

  // The build's query takes a trial's ids explicitly and only otherwise asks `scopeCondition`, which
  // refuses a list. So the build has to resolve a list through this, or a trial stops before labelling.
  it("is what the build resolves a list scope through", () => {
    const build = readFileSync(join(process.cwd(), "scripts/lib/card-labels-build.ts"), "utf8");
    expect(build).toMatch(/const trial = deckId !== null \? await labelTrialPool\(deckId\) : listScopeIds\(scope\);/);
    expect(build).toMatch(/where \$\{trial === null \? sql`c\.commander_legal = true \$\{scopeCondition\(scope\)\}` : sql`c\.oracle_id = any\(\$\{sql\.param\(trial\)\}::uuid\[\]\)`\}/);
  });

  // Version-aware freshness (Hugh, 2026-10-04): the stale set is `needsLabel` over each card's own
  // row (its model, version and hash), and a LIST scope alone is the deliberate redo. `needsLabel`'s
  // rule is unit tested in `prompt.test.ts`; this pins that the build calls it with those inputs.
  // The version guard (`inFlightElsewhere`, unit tested in plan.test.ts) runs AFTER the stale set is
  // known, so only an open other-version intent asking for a card this run plans can block it.
  it("checks other-version intents against the planned cards, null-safe, before any submit", () => {
    const build = readFileSync(join(process.cwd(), "scripts/lib/card-labels-build.ts"), "utf8");
    // Read BEFORE the stale snapshot, so a publish between the two reads is seen one way or the other.
    const read = build.indexOf("const otherVersionIntents = ");
    expect(read).toBeGreaterThan(-1);
    expect(read).toBeLessThan(build.indexOf("const all = await cardsNeedingLabels("));
    const query = build.slice(read, build.indexOf("const all = await cardsNeedingLabels("));
    expect(query).toContain("inArray(cardLabelBatches.status, OPEN_STATUSES)");
    // `<>` on purpose: a NULL (pre-migration) version can never be collected, so it never blocks.
    expect(query).toMatch(/sql`\$\{cardLabelBatches\.promptVersion\} <> \$\{LABEL_PROMPT_VERSION\}`/);
    // Matched against `cards`, after the shared-name and in-flight exclusions, and before submit.
    const check = build.indexOf("const elsewhere = inFlightElsewhere(otherVersionIntents, LABEL_PROMPT_VERSION, new Set(cards.map((c) => c.name)));");
    expect(check).toBeGreaterThan(build.indexOf("const cards = stale.filter("));
    expect(check).toBeLessThan(build.indexOf("await submit(opts, wave,"));
  });

  it("plans the stale set with needsLabel, redoing only on a list scope", () => {
    const build = readFileSync(join(process.cwd(), "scripts/lib/card-labels-build.ts"), "utf8");
    expect(build).toMatch(/model: cardLabels\.model, promptVersion: cardLabels\.promptVersion, inputHash: cardLabels\.inputHash,/);
    expect(build).toMatch(/const redo = scopeList\(scope\) !== null;/);
    expect(build).toMatch(/return all\.filter\(\(c\) => needsLabel\(c, stored\.get\(c\.oracleId\), \{ redo, model: MODEL \}\)\);/);
  });
});
