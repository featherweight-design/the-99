import { describe, expect, it } from "vitest";
import { parseStrategyKey } from "./focus";

describe("parseStrategyKey", () => {
  it("accepts a theme, a fixed axis and a known creature type", () => {
    expect(parseStrategyKey("tokens")).toBe("tokens");
    expect(parseStrategyKey("evasion")).toBe("evasion");
    expect(parseStrategyKey("voltron")).toBe("voltron");
    expect(parseStrategyKey("typal:Elf")).toBe("typal:Elf");
    expect(parseStrategyKey("typal:Time Lord")).toBe("typal:Time Lord");
  });

  it("refuses anything the vocabulary does not name", () => {
    for (const v of ["typal:Equipment", "typal:elf", "ramp", "Tokens", "", "typal:", null, 3, ["tokens"]]) {
      expect(parseStrategyKey(v)).toBeNull();
    }
  });
});
