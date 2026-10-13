import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseThemeBlocks } from "./parse-css";

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
  // The web app manifest is JSON a launcher reads, so its colours must be literals. `manifest.test.ts`
  // pins the value to the default theme's `--bg` read out of globals.css, so it cannot drift.
  "app/manifest.ts",
  // The theme library's own tests are about hex values, so they contain them.
  "lib/theme/color.test.ts",
  "lib/theme/parse-css.test.ts",
  "lib/theme/contract.test.ts",
  "lib/theme/no-hex.test.ts",
  // The wash's contrast proof composites the brightest pixel art can contain
  // against each theme's own tokens. `#FFFFFF` there is a worst case being
  // measured, not a surface being painted.
  "lib/theme/wash-contrast.test.ts",
]);

// A theme-aware colour written as rgba() is invisible to a hex scan and stays
// Low Sun under every theme, so the scan looks for both spellings.
const HEX = /#[0-9A-Fa-f]{6}\b/;

// Derived from globals.css rather than listed here. Hand-written triples went
// stale the moment the accent moved: the list still named the pre-rebrand brass
// rgba(201,162,75) and knew nothing of rgba(207,135,69), so the one spelling the
// guard exists to catch was the one it let through. Deriving them means a token
// cannot change without the guard following it.
const CHANNELS = [...parseThemeBlocks(readFileSync(join(SRC, "app/globals.css"), "utf8")).values()]
  .flatMap((tokens) => [...tokens.values()])
  .filter((value) => /^#[0-9A-Fa-f]{6}$/.test(value))
  .map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",\\s*"));

// The trailing comma matters: without it the last channel is a prefix match, so
// rgba(207, 135, 690, …) — a different colour — would trip the guard.
const BRAND_RGBA = new RegExp(`rgba\\(\\s*(${[...new Set(CHANNELS)].join("|")})\\s*,`);

function* sources(dir: string, prefix = ""): Generator<string> {
  for (const entry of readdirSync(join(SRC, dir), { withFileTypes: true })) {
    const rel = prefix + entry.name;
    if (entry.isDirectory()) yield* sources(join(dir, entry.name), rel + "/");
    else if (/\.tsx?$/.test(entry.name)) yield rel;
  }
}

const files = [...sources(".")].filter((f) => !ALLOWED.has(f));

describe("colour comes from tokens", () => {
  it("scans a plausible number of files", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  // A guard that matches nothing passes every file and reports success. These
  // two pin the ends: the live accent must be caught, and a colour one digit
  // away from it must not be.
  it("recognises the accent it is derived from", () => {
    expect(BRAND_RGBA.test("rgba(207, 135, 69, 0.1)")).toBe(true);
    expect(BRAND_RGBA.test("rgba(207, 135, 690, 0.1)")).toBe(false);
  });

  // Every scanned path is src-relative, which is what makes ALLOWED's
  // src-relative entries — lib/shell/clerk-appearance.ts — line up with them.
  it("scans from src, not from this directory", () => {
    expect(files).toContain("components/ui/button.tsx");
  });

  // Both spellings checked in one case per file, off one read. Split across two
  // it.each blocks this opened and line-split all 316 files twice.
  it.each(files)("%s names colour by token", (file) => {
    const lines = readFileSync(join(SRC, file), "utf8").split("\n");
    expect(
      lines.find((l) => HEX.test(l)),
      `${file} still names a colour by hex. Use a Tailwind token utility (bg-surface, text-fg-muted) or var(--token). If the value is genuinely not chrome, add the file to ALLOWED above with a reason.`,
    ).toBeUndefined();
    expect(
      lines.find((l) => BRAND_RGBA.test(l)),
      `${file} tints with a brand rgba(), which no theme can override. Use color-mix(in oklab, var(--accent) 8%, transparent).`,
    ).toBeUndefined();
  });
});
