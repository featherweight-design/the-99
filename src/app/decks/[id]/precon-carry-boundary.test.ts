// The page end of d9's ruling (small items 5): the arrival visit runs the precon carry-over INLINE, and the
// reads of what it writes (the header's bracket chip and the notices) wait for it, so the bracket shows at
// once. Any other visit runs nothing (`carryOnArrival`'s own test). The page loads too much to render in a
// unit test, so this reads its source, as `landing-boundary.test.ts` does.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PAGE = join(process.cwd(), "src/app/decks/[id]/page.tsx");
const text = readFileSync(PAGE, "utf8");

describe("the deck page's arrival carry-over", () => {
  it("runs it on the precon arrival alone, with the deck, its reader and the reader's switches", () => {
    const calls = text.match(/carryOnArrival\(\s*([\s\S]*?)\)\s*\)/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/arrivedFromPrecon\(query\[PRECON_ARRIVAL_PARAM\]\), id, userId, env/);
  });

  it("holds the stored chip and the notices until it lands", () => {
    // Both always read: the Analysis tab's switch, which gated them, is retired (always on).
    expect(text).toMatch(/const storedPermits = carried\.then\(\(\) => perf\.timed\("storedPermits"/);
    expect(text).toMatch(/const initialNotices = carried\.then\(\(\) => perf\.timed\("notices"/);
  });

  it("starts before either read", () => {
    expect(text.indexOf("const carried = ")).toBeGreaterThan(-1);
    expect(text.indexOf("const carried = ")).toBeLessThan(text.indexOf("const storedPermits = "));
  });
});
