import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { originQuery } from "./origin-read";

// v0 is drawn at read and is never a `deck_versions` row (precons R3, lock 4). Every reader of
// committed history (`newestVersion`, the claim model, `versionLiveAt` and game stamping, Home's
// `max(committed_at)`, a commit's `since`, the analysis and synopsis pins, the brew tests) reads
// `deck_versions`, so it skips v0 BY CONSTRUCTION, as long as two things hold, and these pin both:
// the v0 read names no version table, and nothing but a commit writes one.

describe("originQuery", () => {
  const { sql, params } = originQuery("user-1", "deck-1").toSQL();

  it("reads the precon and its list, and never a version", () => {
    expect(sql).not.toMatch(/deck_version/);
    expect(sql).toContain(`from "decks" inner join "precons" on "precons"."file_name" = "decks"."built_from_precon"`);
    expect(sql).toContain(`inner join "precon_cards" on "precon_cards"."file_name" = "precons"."file_name"`);
  });

  it("is owner-scoped in its own SQL", () => {
    expect(sql).toMatch(/where \("decks"\."id" = \$\d+ and "decks"\."user_id" = \$\d+\)/);
    expect(params).toEqual(expect.arrayContaining(["deck-1", "user-1"]));
  });
});

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
  });
}
const WRITE = /\.(insert|update)\((deckVersions|deckVersionCards)\)|(insert\s+into|update)\s+"?deck_version/i;

describe("v0 never becomes a version", () => {
  it("the one writer of the version tables is the commit, in versions.ts", () => {
    const writers = sources(SRC).filter((f) => WRITE.test(readFileSync(f, "utf8"))).map((f) => relative(SRC, f));
    expect(writers).toEqual(["lib/decks/versions.ts"]);
  });

  it("the link and v0's own modules never name a version table", () => {
    for (const f of ["lib/precons/origin.ts", "lib/precons/origin-read.ts", "app/decks/precon-link-actions.ts"]) {
      // Code only: their comments explain what they do not touch.
      const code = readFileSync(join(SRC, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(code, f).not.toMatch(/deckVersion|deck_version/);
    }
  });
});
