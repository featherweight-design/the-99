import { describe, expect, it } from "vitest";
import { MOMENTS, isMomentId, pickMoment } from "./registry";
import { SWITCHES } from "../switches/registry";

const ALL = new Set<string>(MOMENTS.map((m) => m.id));
const none = new Set<string>();

describe("the registry", () => {
  it("holds the fifteen moments, once each, in the handoff's fixed order (M16 is Home's Friends section, not a moment)", () => {
    expect(MOMENTS.map((m) => m.m)).toEqual([
      "M14", "M12", "M1", "M3", "M2", "M4", "M7", "M5", "M6", "M8", "M9", "M15", "M13", "M10", "M11",
    ]);
    expect(new Set(MOMENTS.map((m) => m.id)).size).toBe(15);
  });

  it("names only switches the switch registry has", () => {
    const names = new Set<string>(SWITCHES.map((s) => s.name));
    for (const m of MOMENTS) if (m.tool !== null) expect(names.has(m.tool)).toBe(true);
  });

  it("knows its own ids and nothing else", () => {
    expect(isMomentId("top-off")).toBe(true);
    expect(isMomentId("nope")).toBe(false);
    expect(isMomentId(3)).toBe(false);
  });
});

describe("pickMoment", () => {
  const pick = (onScreen: string[], opts: { spent?: string[]; live?: Set<string>; visitTaken?: boolean } = {}) =>
    pickMoment({
      onScreen,
      live: opts.live ?? ALL,
      spent: new Set(opts.spent ?? []),
      visitTaken: opts.visitTaken ?? false,
    });

  it("shows the one control on screen", () => {
    expect(pick(["lineup"])).toBe("lineup");
  });

  it("breaks a tie by the fixed order, whatever order the controls came on screen", () => {
    // S3: at 99 / 99 with a row over the limit, Suggested changes takes the visit and stand-ins waits.
    expect(pick(["stand-ins", "suggested-changes"])).toBe("suggested-changes");
    expect(pick(["matchups", "top-off", "precons"])).toBe("precons");
  });

  it("shows nothing once the visit's moment is taken", () => {
    expect(pick(["lineup"], { visitTaken: true })).toBeNull();
  });

  it("never shows a spent moment again, and passes to the next in order", () => {
    expect(pick(["top-off"], { spent: ["top-off"] })).toBeNull();
    expect(pick(["top-off", "lineup"], { spent: ["top-off"] })).toBe("lineup");
  });

  it("shows nothing for a moment whose tool is off", () => {
    expect(pick(["lineup"], { live: none })).toBeNull();
    expect(pick(["lineup", "matchups"], { live: new Set(["matchups"]) })).toBe("matchups");
  });

  it("keeps Mana Balance until Suggested changes is spent, so the two never share a visit", () => {
    expect(pick(["mana-balance"])).toBeNull();
    expect(pick(["mana-balance"], { spent: ["suggested-changes"] })).toBe("mana-balance");
  });

  it("ignores an id the registry does not name", () => {
    expect(pick(["nope"])).toBeNull();
  });
});
