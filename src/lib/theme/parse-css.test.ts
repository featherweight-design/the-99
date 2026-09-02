import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseThemeBlocks } from "./parse-css";

const CSS = `
:root {
  /* a comment */
  --bg: #14110E;
  --avail-hard: var(--accent);
}
[data-theme="kamigawa"] {
  --bg: #0E0F14;
  --avail-hard: var(--accent);
}
@theme inline {
  --color-bg: var(--bg);
}
@layer base {
  :focus-visible { outline: 2px solid var(--accent); }
}
`;

describe("parseThemeBlocks", () => {
  it("names the :root block amonkhet", () => {
    expect([...parseThemeBlocks(CSS).keys()]).toEqual(["amonkhet", "kamigawa"]);
  });

  it("keeps var() aliases as written rather than resolving them", () => {
    expect(parseThemeBlocks(CSS).get("amonkhet")?.get("avail-hard")).toBe("var(--accent)");
  });

  it("strips the leading -- from token names", () => {
    expect(parseThemeBlocks(CSS).get("kamigawa")?.get("bg")).toBe("#0E0F14");
  });

  it("ignores @theme inline, so --color-* never enters the contract", () => {
    for (const tokens of parseThemeBlocks(CSS).values()) {
      for (const name of tokens.keys()) expect(name.startsWith("color-")).toBe(false);
    }
  });
});

// The fixture above starts with `:root` at index 0 and has no @import, which is
// exactly the shape a broken anchor still parses. Everything the contract suite
// asserts is downstream of this one test, so it reads the real file.
describe("parseThemeBlocks, against the shipped stylesheet", () => {
  // import.meta.url, not __dirname: Vitest runs tests as ESM.
  const REAL = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "..", "app", "globals.css"),
    "utf8",
  );

  it("finds the default theme past the @import line", () => {
    expect(parseThemeBlocks(REAL).has("amonkhet")).toBe(true);
  });

  it("reads a plausible number of tokens out of it", () => {
    expect(parseThemeBlocks(REAL).get("amonkhet")!.size).toBeGreaterThan(20);
  });
});
