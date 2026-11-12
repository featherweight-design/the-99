import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hashedUserTag } from "./user-tag";

const KEY = "k".repeat(32);
const ID = "user_3HdjdocERCjunk0zJQFDWyHkTd4";

describe("hashedUserTag", () => {
  it("is a keyed hash: stable for one key, different under another, never the id", () => {
    const a = hashedUserTag(ID, KEY);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(hashedUserTag(ID, KEY)).toBe(a);
    expect(hashedUserTag(ID, "j".repeat(32))).not.toBe(a);
    expect(hashedUserTag("user_other", KEY)).not.toBe(a);
    expect(a).not.toContain("user_");
  });

  it("tags nobody with no key, or a key too short to be secret", () => {
    expect(hashedUserTag(ID, undefined)).toBeNull();
    expect(hashedUserTag(ID, "")).toBeNull();
    expect(hashedUserTag(ID, "short")).toBeNull();
  });
});

describe("the hash key's boundary", () => {
  it("no client module imports user-tag, so the key can never be bundled for the browser", () => {
    const offenders = readdirSync("src", { recursive: true, encoding: "utf8" })
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))
      .map((f) => `src/${f}`)
      .filter((f) => {
        const text = readFileSync(f, "utf8");
        return /^\s*["']use client["']/.test(text) && /from\s+["'][^"']*sentry\/user-tag["']/.test(text);
      });
    expect(offenders).toEqual([]);
  });
});
