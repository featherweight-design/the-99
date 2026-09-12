import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isUuid } from "../../../lib/uuid";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Every page under `/decks/[id]` reads its id out of the path and hands it to a
 * query keyed on a uuid column, where a malformed value is not a miss but an
 * error: Postgres refuses it, and the reader gets a 500 in place of the
 * not-found the route means to answer. The guard is one line per page, which is
 * exactly why it goes missing when a page is added — so it is asserted here
 * rather than remembered, the same way the loading boundaries are.
 */
function pagesUnder(dir: string, from = ""): string[] {
  const entries = readdirSync(dir);
  const found = entries.includes("page.tsx") ? [join(from, "page.tsx")] : [];
  for (const entry of entries) {
    const path = join(dir, entry);
    if (!statSync(path).isDirectory()) continue;
    found.push(...pagesUnder(path, join(from, entry)));
  }
  return found;
}

describe("the deck id guard", () => {
  it("refuses a malformed segment on every page under /decks/[id]", () => {
    const pages = pagesUnder(HERE);
    expect(pages.length).toBeGreaterThan(1);
    const unguarded = pages.filter(
      (page) => !readFileSync(join(HERE, page), "utf8").includes("if (!isUuid(id)) notFound();"),
    );
    expect(unguarded).toEqual([]);
  });

  it("reads a deck id as a uuid and a path segment as not one", () => {
    expect(isUuid("c7a45011-63b4-4fa6-8686-1e8dd0100262")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});
