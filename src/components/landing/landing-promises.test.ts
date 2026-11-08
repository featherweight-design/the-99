import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { landingCopy } from "../../lib/copy/landing";

// The page's promises that must stay true in code. It asks for no card or payment detail anywhere (the sheet names prices, and
// buying happens inside the product), and the copy never says otherwise.

const dir = join(process.cwd(), "src/components/landing");
const files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f));
const strings = (value: unknown): string[] =>
  typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];

describe("the landing asks for no card or payment detail", () => {
  it("draws no card or payment field: no autocomplete cc-*, no card number, CVC, expiry or billing input in the tree", () => {
    for (const f of files) {
      const text = readFileSync(join(dir, f), "utf8");
      expect(text, f).not.toMatch(/autoComplete=["']cc-|cardnumber|card-number|\bcvc\b|\bcvv\b|billing|@stripe|stripe\.|checkout/i);
    }
  });

  it("the only input in the tree is the launch panel's email field", () => {
    const inputs = files.flatMap((f) => [...readFileSync(join(dir, f), "utf8").matchAll(/<input\b[^>]*>/g)].map((m) => `${f}: ${m[0]}`));
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatch(/^launch-panel\.tsx:/);
    expect(inputs[0]).toMatch(/type="email"|inputMode="email"|autoComplete="email"/);
  });

  it("no string on the page says it asks for, or takes, a card or a payment", () => {
    const all = strings(landingCopy).join("\n");
    expect(all).not.toMatch(/credit card|debit card|card number|enter your card|card details|payment details|billing|pay now|checkout/i);
  });

  it("the copy states no price: the figures live in the sheet and come from the shipped constants", () => {
    expect(strings(landingCopy).join("\n")).not.toMatch(/\$\d/);
  });

  it("uses no em dash and no British spelling in any string (the page is US English)", () => {
    const all = strings(landingCopy).join("\n");
    expect(all).not.toContain("—");
    expect(all).not.toMatch(/\b(colour|favourite|centre|organis|licence)/i);
  });
});
