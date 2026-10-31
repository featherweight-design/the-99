import { describe, expect, it } from "vitest";
import { flyerAdminCopy } from "../copy/admin";
import { flyersView, flyerState, type FlyerCodeRead, type FlyersRead } from "./flyers-rule";

// The Flyer codes section (flyer trial PR 4a; boards Admin-Desktop A1): the board's own four codes.
const now = new Date("2026-10-30T12:00:00Z");
const day = (d: number, m = 10) => new Date(Date.UTC(2026, m - 1, d, 9));
const code = (over: Partial<FlyerCodeRead>): FlyerCodeRead => ({
  id: "c", code: "MOX4QK", label: "Mox Boston", groupName: "mox-boston", capacity: 50, createdAt: day(30), revokedAt: null, taken: 12, listed: 0, ...over,
});
const read: FlyersRead = {
  codes: [
    code({ id: "pza", code: "PZA9TC", label: "Pizza Pod test", groupName: "pizza-pod", taken: 2, listed: 4, revokedAt: day(2, 11) }),
    code({ id: "knt", code: "KNT3HZ", label: "Knight Moves Cafe", groupName: "knight-moves", taken: 50, listed: 19, createdAt: day(31) }),
    code({ id: "mox" }),
    code({ id: "pdm", code: "PDM7RW", label: "Pandemonium Books", groupName: "pandemonium", taken: 31 }),
  ],
  listed: 23,
  held: 40,
  open: [],
  // Three claims holding on his codes: his 40 stock reads 37 left.
  holds: [day(31), day(31), day(31)],
};

describe("flyersView", () => {
  it("reads n of 50, the full state and the bar", () => {
    const rows = flyersView(read, now).rows;
    expect(rows.find((r) => r.id === "mox")).toMatchObject({ figure: "12", of: "of 50", percent: 24, state: "live", made: "Oct 30", revoked: null });
    expect(rows.find((r) => r.id === "pdm")).toMatchObject({ figure: "31", of: "of 50", percent: 62 });
    expect(rows.find((r) => r.id === "knt")).toMatchObject({ figure: "50", of: "of 50 · full", percent: 100, state: "full" });
  });

  it("keeps a revoked row, last and dated, the live ones newest first, with its group and no state of a live one", () => {
    const rows = flyersView(read, now).rows;
    expect(rows.map((r) => r.code)).toEqual(["KNT3HZ", "MOX4QK", "PDM7RW", "PZA9TC"]);
    expect(rows.at(-1)).toMatchObject({ state: "revoked", revoked: "revoked Nov 2", group: "pizza-pod", made: "Oct 30" });
  });

  it("writes the meta line: live codes (revoked excluded), the viewer's invites left, the launch list", () => {
    // The hold rows read as Hugh's waiting invites, as every count of them does; the claims past their hold do not.
    expect(flyersView(read, now).meta).toBe(flyerAdminCopy.meta(3, 37, 23));
    expect(flyersView({ ...read, holds: [day(1)] }, now).meta).toBe(flyerAdminCopy.meta(3, 40, 23));
  });

  it("writes the launch-list card: the total, then each code that brought addresses, most first", () => {
    expect(flyersView(read, now).launch).toEqual({
      title: "Launch list · 23",
      meta: "emails left on used-up and ended flyers · Knight Moves Cafe 19 · Pizza Pod test 4",
    });
    expect(flyersView({ ...read, codes: [], listed: 0 }, now).launch).toEqual({ title: "Launch list · 0", meta: "no emails yet · a used-up or ended flyer asks for one" });
  });

  it("writes the zero-code meta: none yet, the invites left, nothing about the launch list", () => {
    expect(flyersView({ ...read, codes: [], listed: 0 }, now).meta).toBe("none yet · from your invites, 37 left");
  });

  it("states: revoked beats full, full is the capacity", () => {
    expect(flyerState({ capacity: 50, taken: 50, revokedAt: day(2, 11) })).toBe("revoked");
    expect(flyerState({ capacity: 50, taken: 49, revokedAt: null })).toBe("live");
    expect(flyerState({ capacity: 50, taken: 50, revokedAt: null })).toBe("full");
  });
});
