// Round 1 (PR 6): the precon page draws its Overview only beside the very list it renders. The page loads
// too much to render here, so this reads its source, as the deck page's boundary tests do.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const text = readFileSync(join(process.cwd(), "src/app/decks/precons/[fileName]/page.tsx"), "utf8");

describe("the precon page's Overview", () => {
  it("is filtered by the rendered list before it reaches the view", () => {
    expect(text).toMatch(/const overview = overviewForList\(await overviewRead, renderedPreconList\(precon\)\);/);
    expect(text).toMatch(/overview=\{overview\}/);
  });
});
