import { describe, expect, it } from "vitest";

import { pushStamp, stillWanted } from "./eligible";

const prefs = (map: Record<string, string> = {}, declined: string[] = []) => ({ map, declined }) as never;
const ALL = ["new-set", "new-precon", "price-drop", "trade-match", "spare-request", "combo"] as never;
const at = (iso: string) => new Date(iso);

describe("a queued push, judged again at the flush", () => {
  it("is wanted while the kind's push is on and the event is newer than its stamp", () => {
    expect(stillWanted(prefs({ combo: "2026-01-01T00:00:00.000Z" }), "combo", at("2026-10-22T00:00:00Z"), ALL)).toBe(true);
  });

  it("is dropped when the kind was unticked while it waited", () => {
    expect(stillWanted(prefs(), "combo", at("2026-10-22T00:00:00Z"), ALL)).toBe(false);
  });

  it("is dropped when an off-and-on cycle stamped the kind AFTER the event", () => {
    expect(stillWanted(prefs({ combo: "2026-10-22T09:00:00.000Z" }), "combo", at("2026-10-22T03:00:00Z"), ALL)).toBe(false);
  });

  it("is dropped when the kind's feature is off for this reader, even with the push on", () => {
    const on = prefs({ "spare-request": "2026-01-01T00:00:00.000Z" });
    expect(stillWanted(on, "spare-request", at("2026-10-22T00:00:00Z"), ["combo"] as never)).toBe(false);
  });

  it("keeps the default-on kind until it is declined, since always", () => {
    expect(pushStamp(prefs(), "spare-request")).toBe(-Infinity);
    expect(stillWanted(prefs(), "spare-request", at("2026-10-22T00:00:00Z"), ALL)).toBe(true);
    expect(stillWanted(prefs({}, ["spare-request"]), "spare-request", at("2026-10-22T00:00:00Z"), ALL)).toBe(false);
  });

  it("reads another kind as off until it is stamped", () => {
    expect(pushStamp(prefs(), "price-drop")).toBeNull();
  });
});
