import { describe, expect, it } from "vitest";
import { sameHelm, sameList, upgradeGateOpen } from "./deck-gate";

const box = { commanderOracleId: "rootha", partnerOracleId: null, cards: [{ oracleId: "a", quantity: 1 }, { oracleId: "island", quantity: 9 }] };
const live = (over: Partial<typeof box> = {}) => ({ ...box, ...over });

describe("upgradeGateOpen (G16)", () => {
  it("opens on a started deck whose only version is its start version and whose list is the box", () => {
    expect(upgradeGateOpen(box, "v0", ["v0"], live())).toBe(true);
  });
  it("opens on a legacy start whose box is its v1: the start version is the one that counts, not its number", () => {
    // `startVersionId` names the legacy v1; nothing newer than it means the gate is open.
    expect(upgradeGateOpen(box, "v1-legacy", ["v1-legacy"], live())).toBe(true);
  });
  it("opens on a linked deck with no version at all, and closes on a linked deck with any version", () => {
    expect(upgradeGateOpen(box, null, [], live())).toBe(true);
    expect(upgradeGateOpen(box, null, ["v1"], live())).toBe(false);
  });
  it("closes for good once anything is committed after v0", () => {
    expect(upgradeGateOpen(box, "v0", ["v0", "v1"], live())).toBe(false);
  });
  it("closes while the deck holds changes since v0: a card, a count or the commander", () => {
    expect(upgradeGateOpen(box, "v0", ["v0"], live({ cards: [{ oracleId: "b", quantity: 1 }, { oracleId: "island", quantity: 9 }] }))).toBe(false);
    expect(upgradeGateOpen(box, "v0", ["v0"], live({ cards: [{ oracleId: "a", quantity: 1 }, { oracleId: "island", quantity: 8 }] }))).toBe(false);
    expect(upgradeGateOpen(box, "v0", ["v0"], live({ commanderOracleId: "muddle" }))).toBe(false);
  });
  it("closes with no precon origin", () => {
    expect(upgradeGateOpen(null, null, [], live())).toBe(false);
  });
});

describe("sameList and sameHelm", () => {
  it("ignore order, and a pair in either order is one helm", () => {
    expect(sameList([{ oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 2 }], [{ oracleId: "b", quantity: 2 }, { oracleId: "a", quantity: 1 }])).toBe(true);
    expect(sameList([{ oracleId: "a", quantity: 1 }], [{ oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 1 }])).toBe(false);
    expect(sameHelm({ commanderOracleId: "x", partnerOracleId: "y" }, { commanderOracleId: "y", partnerOracleId: "x" })).toBe(true);
    expect(sameHelm({ commanderOracleId: "x", partnerOracleId: null }, { commanderOracleId: "x", partnerOracleId: "y" })).toBe(false);
  });
});
