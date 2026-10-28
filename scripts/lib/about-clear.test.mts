// @vitest-environment node
//
// The repo default is jsdom, which replaces `import.meta.url` with the page
// location — every path here would resolve against `http://localhost/`.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { captureAboutSeen, catalogIds, gateReturn, restoreAboutSeen, markEveryEntrySeen, sheetCookie, variantIds, assertServerReadsEnv, serverMismatch } from "./about-clear.mjs";
import { gateDecision } from "../../src/lib/about/gate";

// A probe's first load can already have been sent to the gate by the time it clears the sheet: the
// helper follows the redirect's `next` back. Built from the gate's own decision, so a change to the
// redirect's shape fails here rather than as a probe timeout.
describe("gateReturn", () => {
  const origin = "http://localhost:3000";
  const redirectFor = (pathname: string, search: string) => {
    const d = gateDecision({ userId: "user_1", pathname, search, version: 2, seen: 1 });
    if (d.kind !== "redirect") throw new Error(`expected a redirect, got ${d.kind}`);
    return `${origin}${d.to}`;
  };

  it("follows the gate's redirect back to the route it interrupted, query included", () => {
    expect(gateReturn(redirectFor("/decks/abc", ""))).toBe(`${origin}/decks/abc`);
    expect(gateReturn(redirectFor("/decks", "?a=1&b=2"))).toBe(`${origin}/decks?a=1&b=2`);
  });

  it("leaves every other page where it is", () => {
    expect(gateReturn(`${origin}/decks/abc`)).toBeNull();
    expect(gateReturn(`${origin}/about?tab=reference`)).toBeNull();
    for (const away of ["//evil.example/x", "/\\evil.example/x", "/\t/evil.example/x", "https://evil.example/x"]) {
      expect(gateReturn(`${origin}/about?tab=reference&next=${encodeURIComponent(away)}`)).toBeNull();
    }
  });
});

describe("sheetCookie", () => {
  it("is the proxy's cookie, bound to the reader and the current version", () => {
    const { version } = JSON.parse(readFileSync(new URL("../../src/lib/copy/about.version.json", import.meta.url), "utf8"));
    const c = sheetCookie("user_1", "http://localhost:3000/decks");
    expect(c.name).toBe("about_sheet");
    expect(c.value).toBe(`user_1.${version}`);
    expect(c.domain).toBe("localhost");
    expect(c.secure).toBe(false);
  });

  it("is secure on https", () => {
    expect(sheetCookie("u", "https://staging.the-99.dev/").secure).toBe(true);
  });
});

describe("every probe that clears the About gate also clears the sheet (E5)", () => {
  const dir = new URL("../", import.meta.url);
  const probes = readdirSync(dir).filter((f) => /^probe-.*\.mjs$/.test(f) && f !== "probe-about.mjs");
  const writers = probes.filter((f) => readFileSync(new URL(f, dir), "utf8").includes("about_version_seen"));

  it("finds the probes it is about", () => {
    expect(writers.length).toBeGreaterThanOrEqual(12);
  });

  it.each(writers)("%s calls clearAboutSheet", (f) => {
    const src = readFileSync(new URL(f, dir), "utf8");
    expect(src).toMatch(/import \{[^}]*\bclearAboutSheet\b[^}]*\} from "\.\/lib\/about-clear\.mjs";/);
    expect(src).toMatch(/await clearAboutSheet\(page, /);
  });
});

describe("catalogIds", () => {
  it("reads exactly the catalog's ids, in order", async () => {
    const { aboutEntries } = await import("../../src/lib/copy/about-entries");
    expect(catalogIds()).toEqual(aboutEntries.map((e) => e.id));
  });
});

describe("variantIds", () => {
  it("reads every entry variant's seen id, in the form isSeen checks", async () => {
    const { aboutEntries } = await import("../../src/lib/copy/about-entries");
    const { variantId } = await import("../../src/lib/about/visible");
    const expected = aboutEntries.flatMap((e) => (e.variant ? [variantId(e.id, e.variant.switch)] : []));
    expect(expected).toContain("upload-choice@COLLECTION_SYNC_ENABLED");
    expect(variantIds()).toEqual(expected);
  });

  it("is marked seen with the catalog's ids, so /about shows nothing new with a variant's switch on", async () => {
    const write = fakeSql();
    await markEveryEntrySeen("user_1", write.sql as never, 9);
    const ids = write.calls[0].values[2] as string[];
    expect(ids).toEqual([...catalogIds(), ...variantIds()]);
    expect(ids).toContain("upload-choice@COLLECTION_SYNC_ENABLED");
  });
});

/** A stand-in for neon's tagged template: records each statement and answers reads from `rows`. */
function fakeSql(rows: unknown[] = []) {
  const calls: { text: string; values: unknown[] }[] = [];
  const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ text: strings.join("$"), values });
    return Promise.resolve(rows);
  };
  return { sql, calls };
}

describe("captureAboutSeen and restoreAboutSeen", () => {
  it("captures both columns and puts both back as read", async () => {
    const read = fakeSql([{ about_version_seen: 7, about_seen_ids: ["browse", "import"] }]);
    const capture = await captureAboutSeen("user_1", read.sql as never);
    expect(read.calls[0].text).toMatch(/select about_version_seen, about_seen_ids from user_prefs/);
    expect(capture).toEqual({ userId: "user_1", existed: true, version: 7, ids: ["browse", "import"] });

    const write = fakeSql();
    await restoreAboutSeen(capture, write.sql as never);
    expect(write.calls).toHaveLength(1);
    expect(write.calls[0].text).toMatch(/about_version_seen = \$, about_seen_ids = \$/);
    expect(write.calls[0].values).toEqual(["user_1", 7, ["browse", "import"], 7, ["browse", "import"]]);
  });

  it("deletes the row when there was none", async () => {
    const capture = await captureAboutSeen("user_2", fakeSql([]).sql as never);
    expect(capture.existed).toBe(false);
    const write = fakeSql();
    await restoreAboutSeen(capture, write.sql as never);
    expect(write.calls).toEqual([{ text: "delete from user_prefs where user_id = $", values: ["user_2"] }]);
  });
});

describe("every probe that puts the About row back restores both columns (fa, 2026-09-25)", () => {
  const dir = new URL("../", import.meta.url);
  const probes = readdirSync(dir).filter((f) => /^probe-.*\.(mjs|ts|mts)$/.test(f));

  // Every write that SETS the version to a stated value, as an update or an upsert's update
  // clause. Raising it with `greatest(...)` is the gate-clearing write every probe makes and is
  // not a restore; anything else is, and must carry the ids beside it.
  const versionOnly = (src: string) =>
    [...src.matchAll(/set\s+about_version_seen\s*=\s*([^`]*)`/g)]
      .map((m) => m[1])
      .filter((rest) => !/^greatest\(/.test(rest.trim()) && !rest.includes("about_seen_ids"));

  it.each(probes)("%s never restores the version on its own", (f) => {
    // A restore written by hand is where the ids column gets forgotten; the helper writes both.
    expect(versionOnly(readFileSync(new URL(f, dir), "utf8"))).toEqual([]);
  });

  it("reads a version-only restore in every form it has been written", () => {
    expect(versionOnly("sql`update user_prefs set about_version_seen = ${p} where user_id = ${u}`")).toHaveLength(1);
    expect(versionOnly("pool.query(`update user_prefs set about_version_seen = $2 where user_id = $1`")).toHaveLength(1);
    expect(versionOnly("sql`insert into user_prefs (user_id, about_version_seen) values (${u}, ${p}) on conflict (user_id) do update set about_version_seen = ${p}`")).toHaveLength(1);
    expect(versionOnly("sql`update user_prefs set about_version_seen = coalesce(${p}, 0) where user_id = ${u}`")).toHaveLength(1);
    expect(versionOnly("sql`insert into user_prefs (user_id, about_version_seen) values (${u}, ${v}) on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, ${v})`")).toEqual([]);
    expect(versionOnly("sql`update user_prefs set about_version_seen = ${v}, about_seen_ids = ${ids} where user_id = ${u}`")).toEqual([]);
  });

  it.each(probes.filter((f) => readFileSync(new URL(f, dir), "utf8").includes("captureAboutSeen(")))(
    "%s restores what it captured",
    (f) => {
      expect(readFileSync(new URL(f, dir), "utf8")).toMatch(/restoreAboutSeen\(/);
    },
  );
});

describe("the About write goes where the server reads (2026-10-28)", () => {
  it("refuses when .env.local points the server at another database, and passes otherwise", () => {
    expect(serverMismatch("postgres://a", null)).toBeNull();
    expect(serverMismatch("postgres://a", {})).toBeNull();
    expect(serverMismatch("postgres://a", { DATABASE_URL: "postgres://a" })).toBeNull();
    expect(serverMismatch("postgres://a", { DATABASE_URL: "postgres://scratch" })).toMatch(/nothing written/);
  });
});

describe("the refusal comes before any read or write (round 3)", () => {
  it("throws from the shared check whatever connection a caller passed", () => {
    expect(() => assertServerReadsEnv({ DATABASE_URL: "postgres://elsewhere" })).toThrow(/nothing written/);
    expect(() => assertServerReadsEnv(null)).not.toThrow();
  });
});
