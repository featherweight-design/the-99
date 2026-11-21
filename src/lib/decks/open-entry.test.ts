import { describe, expect, it } from "vitest";
import { OPEN_TTL_MS, parseOpenEntry, type OpenEntry, type OpenFacts } from "./open-entry";

const facts: OpenFacts = {
  id: "d1",
  name: "Scrappy Survivors",
  commander: "Dogmeat, Ever Loyal",
  identity: ["W", "R", "G"],
  artCropUri: null,
  status: "Complete",
  built: 99,
  partner: false,
};
const entry = (over: Partial<OpenEntry> = {}): string => JSON.stringify({ to: "d1", facts, place: { k: 1, n: 20, caption: null }, at: 1000, ...over });

describe("parseOpenEntry", () => {
  it("reads a fresh entry for its deck", () => {
    expect(parseOpenEntry(entry(), 1000 + 5)?.facts.name).toBe("Scrappy Survivors");
  });

  it("drops an entry older than the TTL", () => {
    expect(parseOpenEntry(entry(), 1000 + OPEN_TTL_MS + 1)).toBeNull();
  });

  it("drops an entry whose facts name another deck than `to`", () => {
    expect(parseOpenEntry(entry({ to: "d2" }), 1001)).toBeNull();
  });

  it("drops absent, malformed and shapeless entries", () => {
    expect(parseOpenEntry(null, 0)).toBeNull();
    expect(parseOpenEntry("{nope", 0)).toBeNull();
    expect(parseOpenEntry(JSON.stringify({ to: "d1", at: 1 }), 2)).toBeNull();
  });
});
