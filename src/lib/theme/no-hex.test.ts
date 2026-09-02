import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Every exemption is a decision, and every decision states its reason here.
const ALLOWED = new Set([
  // Clerk's appearance API derives hover and disabled shades from these, so it
  // needs real colours and rejects custom properties. Driven from the token
  // values by hand; see the follow-up note in the plan.
  "lib/shell/clerk-appearance.ts",
  "lib/shell/clerk-appearance.test.ts",
  // Card-art placeholder gradients, sampled from card art rather than chrome.
  // These are art, not theme surface, and do not move between themes.
  "lib/collection/gradients.ts",
  "lib/collection/gradients.test.ts",
  // The theme library's own tests are about hex values, so they contain them.
  "lib/theme/color.test.ts",
  "lib/theme/parse-css.test.ts",
  "lib/theme/contract.test.ts",
  "lib/theme/no-hex.test.ts",
]);

// Dead by design — kept so a per-theme creature can return without re-plumbing
// ten surfaces. Not swept, because nothing renders it.
const ALLOWED_DIRS = ["components/character/"];

// The brand hexes, as RGB triples. A theme-aware colour written as rgba() is
// invisible to a hex scan and stays Gilded Stone in all six themes, so the
// scan looks for both spellings.
const HEX = /#[0-9A-Fa-f]{6}\b/;
const BRAND_RGBA =
  /rgba\(\s*(201,\s*162,\s*75|111,\s*163,\s*104|198,\s*83,\s*63|224,\s*145,\s*60|237,\s*230,\s*216)/;

function* sources(dir: string, prefix = ""): Generator<string> {
  for (const entry of readdirSync(join(SRC, dir), { withFileTypes: true })) {
    const rel = prefix + entry.name;
    if (entry.isDirectory()) yield* sources(join(dir, entry.name), rel + "/");
    else if (/\.tsx?$/.test(entry.name)) yield rel;
  }
}

const files = [...sources(".")].filter(
  (f) => !ALLOWED.has(f) && !ALLOWED_DIRS.some((d) => f.startsWith(d)),
);

describe("colour comes from tokens", () => {
  it("scans a plausible number of files", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(files)("%s has no hex literal", (file) => {
    const line = readFileSync(join(SRC, file), "utf8")
      .split("\n")
      .find((l) => HEX.test(l));
    expect(
      line,
      `${file} still names a colour by hex. Use a Tailwind token utility (bg-surface, text-fg-muted) or var(--token). If the value is genuinely not chrome, add the file to ALLOWED above with a reason.`,
    ).toBeUndefined();
  });

  it.each(files)("%s has no brand-tinted rgba()", (file) => {
    const line = readFileSync(join(SRC, file), "utf8")
      .split("\n")
      .find((l) => BRAND_RGBA.test(l));
    expect(
      line,
      `${file} tints with a brand rgba(), which no theme can override. Use color-mix(in oklab, var(--accent) 8%, transparent).`,
    ).toBeUndefined();
  });
});
