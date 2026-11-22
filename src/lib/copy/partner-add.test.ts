import { describe, expect, it } from "vitest";
import { partnerAddCopy } from "./partner-add";

describe("partnerAddCopy: Add a Background (#491 PR6)", () => {
  const bg = { kind: "chooseBackground" } as const;
  it("titles the section and the rule for a Background", () => {
    expect(partnerAddCopy.section.title("chooseBackground")).toBe("Add a Background");
    expect(partnerAddCopy.section.rule(bg)).toContain("Any Background");
  });
  it("says what the commander can do in the door body", () => {
    expect(partnerAddCopy.door.body("Wilson", bg)).toBe("Wilson can choose a Background as a second commander.");
  });
  it("keeps the partner titles as they were", () => {
    expect(partnerAddCopy.section.title("generic")).toBe("Add a partner");
  });
  it("uses no em-dash in the Background strings", () => {
    const all = [partnerAddCopy.section.title("chooseBackground"), partnerAddCopy.section.rule(bg), partnerAddCopy.door.body("Wilson", bg)];
    for (const text of all) expect(text).not.toContain("—");
  });
});
