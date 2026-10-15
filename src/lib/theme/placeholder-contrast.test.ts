import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrast } from "./color";
import { parseThemeBlocks } from "./parse-css";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const THEMES = parseThemeBlocks(readFileSync(join(SRC, "app", "globals.css"), "utf8"));

// WCAG's floor for text. A placeholder is text a reader has to read, and fields sit on --surface-sunken
// (the lightest ground, --surface, is the tuning limits box's, checked too).
const FLOOR = 4.5;

describe("--fg-placeholder", () => {
  it("is declared in every theme", () => {
    expect(THEMES.size).toBeGreaterThanOrEqual(6);
    for (const [name, tokens] of THEMES) expect(tokens.get("fg-placeholder"), name).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it.each([...THEMES.keys()])("clears 4.5:1 on --surface-sunken and --surface in %s", (name) => {
    const t = THEMES.get(name)!;
    const ink = t.get("fg-placeholder")!;
    for (const ground of ["surface-sunken", "surface"]) {
      expect(contrast(ink, t.get(ground)!), `${name} on --${ground}`).toBeGreaterThanOrEqual(FLOOR);
    }
  });

  it("stays a step under entered text, so a typed value never reads as a placeholder", () => {
    for (const [name, t] of THEMES) {
      const ph = t.get("fg-placeholder")!;
      expect(contrast(t.get("fg")!, ph), name).toBeGreaterThanOrEqual(2.2);
    }
  });

  it("is the only ink a placeholder: no class under src paints one in --fg-faint", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(tsx|ts|css)$/.test(entry) && !/\.test\./.test(entry) && /placeholder:text-\[color:var\(--fg-faint\)\]/.test(readFileSync(path, "utf8"))) hits.push(path);
      }
    };
    walk(SRC);
    expect(hits).toEqual([]);
  });
});
