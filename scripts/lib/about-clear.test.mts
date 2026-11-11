// @vitest-environment node
//
// The repo default is jsdom, which replaces `import.meta.url` with the page
// location — every path here would resolve against `http://localhost/`.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { captureAboutSeen, legacyIds, restoreAboutSeen, markEveryEntrySeen } from "./about-clear.mjs";

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

describe("legacyIds", () => {
  it("reads exactly the legacy ids the pages' units name", async () => {
    const { ABOUT_SECTIONS, ABOUT_RULES } = await import("../../src/lib/copy/about-pages");
    const named = [
      ...ABOUT_SECTIONS.flatMap((s) => s.labels.flatMap((l) => l.legacy)),
      ...Object.values(ABOUT_RULES).flatMap((r) => r.legacy),
    ];
    expect(named.length).toBeGreaterThan(50);
    expect([...legacyIds()].sort()).toEqual([...new Set(named)].sort());
  });

  it("includes a variant's seen id, so /about shows nothing new with that switch on", async () => {
    expect(legacyIds().some((id) => id.includes("@"))).toBe(true);
  });

  it("is what markEveryEntrySeen writes", async () => {
    const write = fakeSql();
    await markEveryEntrySeen("user_1", write.sql as never, 9);
    expect(write.calls[0].values[2]).toEqual(legacyIds());
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
  it("captures the About columns and the spent moments and puts them back as read", async () => {
    const read = fakeSql([{ about_version_seen: 7, about_seen_ids: ["browse", "import"], moments_spent: ["m1"] }]);
    const capture = await captureAboutSeen("user_1", read.sql as never);
    expect(read.calls[0].text).toMatch(/select about_version_seen, about_seen_ids, moments_spent from user_prefs/);
    expect(capture).toEqual({ userId: "user_1", existed: true, version: 7, ids: ["browse", "import"], spent: ["m1"] });

    const write = fakeSql();
    await restoreAboutSeen(capture, write.sql as never);
    expect(write.calls).toHaveLength(1);
    expect(write.calls[0].text).toMatch(/about_version_seen = \$, about_seen_ids = \$, moments_spent = \$/);
    expect(write.calls[0].values).toEqual(["user_1", 7, ["browse", "import"], ["m1"], 7, ["browse", "import"], ["m1"]]);
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
