// @vitest-environment node
//
// The repo default is jsdom, which replaces `import.meta.url` with the page
// location — every path here would resolve against `http://localhost/`.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sheetCookie } from "./about-clear.mjs";

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
    expect(src).toMatch(/import \{ clearAboutSheet \} from "\.\/lib\/about-clear\.mjs";/);
    expect(src).toMatch(/await clearAboutSheet\(page, /);
  });
});
