// A producer's run is ONE push per reader and kind (plan 2026-10-22-push.md, D1): it makes a batch key when it starts and
// passes it to every item it records, so a run that crosses a 15-minute window edge is not split. The combo writer is tested
// through its mock (`combo-notice.test.ts`); the other two need a database, so this pins their source.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), "src", path), "utf8");

describe.each([
  ["price-drop", "lib/feed/price-drop.ts"],
  ["trade-match", "lib/social/trade-match.ts"],
  ["combo", "lib/feed/combo-writer.ts"],
])("the %s producer", (kind, path) => {
  const src = read(path);

  it("makes ONE batch key per run, before it records anything", () => {
    expect(src).toContain(`const batchKey = newBatchKey("${kind}");`);
    expect(src.indexOf("const batchKey")).toBeLessThan(src.indexOf("recordFeedItem("));
  });

  it("passes that key to every item it records", () => {
    const call = src.slice(src.indexOf("recordFeedItem(", src.indexOf("const batchKey")));
    expect(call.slice(0, call.indexOf("});"))).toMatch(/\bbatchKey\b/);
  });
});
