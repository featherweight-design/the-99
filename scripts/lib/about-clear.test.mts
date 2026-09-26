// @vitest-environment node
//
// The repo default is jsdom, which replaces `import.meta.url` with the page
// location — every path here would resolve against `http://localhost/`.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { captureAboutSeen, catalogIds, restoreAboutSeen, sheetCookie } from "./about-clear.mjs";

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
    const { aboutEntries } = await import("../../src/lib/copy/about");
    expect(catalogIds()).toEqual(aboutEntries.map((e) => e.id));
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

  it.each(probes)("%s never restores the version on its own", (f) => {
    const src = readFileSync(new URL(f, dir), "utf8");
    // A restore written by hand is where the ids column gets forgotten; the helper writes both.
    expect(src).not.toMatch(/update user_prefs set about_version_seen = [^,`]*(`|where)/);
  });

  it.each(probes.filter((f) => readFileSync(new URL(f, dir), "utf8").includes("captureAboutSeen(")))(
    "%s restores what it captured",
    (f) => {
      expect(readFileSync(new URL(f, dir), "utf8")).toMatch(/restoreAboutSeen\(/);
    },
  );
});
