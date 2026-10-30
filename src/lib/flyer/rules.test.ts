import { describe, expect, it } from "vitest";
import { inviteCount, type HoldingRow } from "../invites/rules";
import { FLYER_ALPHABET, flyerHoldRow, FLYER_CODE_LENGTH, flyerOpenness, holdsPlace, parseFlyerCode, type FlyerClaimRow } from "./rules";

const now = new Date("2026-10-30T12:00:00Z");
const later = new Date(now.getTime() + 60_000);
const earlier = new Date(now.getTime() - 60_000);
const live = (state: FlyerClaimRow["state"]): FlyerClaimRow => ({ state, holdsUntil: later });
const code = { capacity: 3, revokedAt: null };

describe("parseFlyerCode", () => {
  it("accepts a code in either case and trims it", () => {
    expect(parseFlyerCode(" mpx4qk ")).toBe("MPX4QK");
  });
  it("refuses the characters the alphabet leaves out", () => {
    for (const bad of ["MOX0QK", "MOXOQK", "MOX1QK", "MOXIQK"]) expect(parseFlyerCode(bad)).toBeNull();
    expect(FLYER_ALPHABET).not.toMatch(/[01OI]/);
  });
  it("refuses the wrong length and a 43-character invite token", () => {
    expect(parseFlyerCode("MOX4Q")).toBeNull();
    expect(parseFlyerCode("MOX4QKK")).toBeNull();
    expect(parseFlyerCode("A".repeat(43))).toBeNull();
    expect(FLYER_CODE_LENGTH).toBe(6);
  });
});

describe("holdsPlace", () => {
  it("holds while open or proven and not run out", () => {
    expect(holdsPlace(live("open"), now)).toBe(true);
    expect(holdsPlace(live("proven"), now)).toBe(true);
  });
  it("does not hold once the ten minutes ran out, or in a final state", () => {
    expect(holdsPlace({ state: "open", holdsUntil: earlier }, now)).toBe(false);
    expect(holdsPlace({ state: "open", holdsUntil: now }, now)).toBe(false);
    expect(holdsPlace(live("spent"), now)).toBe(false);
    expect(holdsPlace(live("released"), now)).toBe(false);
  });
});

describe("flyerOpenness", () => {
  it("is open with the places left", () => {
    expect(flyerOpenness(code, [live("spent"), live("open")], 5, now)).toEqual({ open: true, places: 1 });
  });
  it("reads revoked before anything else", () => {
    expect(flyerOpenness({ ...code, revokedAt: earlier }, [], 0, now)).toEqual({ open: false, closed: "revoked" });
  });
  it("is full when spent and holding claims fill the capacity, but not when a hold ran out", () => {
    const full = [live("spent"), live("spent"), live("proven")];
    expect(flyerOpenness(code, full, 9, now)).toEqual({ open: false, closed: "full" });
    const lapsed = [live("spent"), live("spent"), { state: "open" as const, holdsUntil: earlier }];
    expect(flyerOpenness(code, lapsed, 9, now)).toEqual({ open: true, places: 1 });
  });
  it("reads used up when Hugh has no invite left", () => {
    expect(flyerOpenness(code, [], 0, now)).toEqual({ open: false, closed: "hugh" });
    expect(flyerOpenness(code, [], 1, now)).toEqual({ open: true, places: 3 });
  });
});

describe("a flyer hold in the invite count", () => {
  const reserved: HoldingRow = { kind: "email", state: "reserved", qrExpiresAt: null, holdsUntil: later };

  it("takes the last invite, so an existing writer reading the count finds none left", () => {
    const count = inviteCount(1, [flyerHoldRow(later)], now);
    expect(count).toMatchObject({ left: 0, waiting: 1, out: true });
  });

  it("with one invite already out, a second holder at the limit is refused", () => {
    expect(inviteCount(2, [reserved, flyerHoldRow(later)], now).left).toBe(0);
    expect(inviteCount(2, [reserved], now).left).toBe(1);
  });

  it("stops counting once its ten minutes run out", () => {
    expect(inviteCount(1, [flyerHoldRow(earlier)], now).left).toBe(1);
  });
});
