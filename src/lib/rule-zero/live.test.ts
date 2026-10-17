import { describe, expect, it } from "vitest";
import type { TableView } from "../social/rule-zero-table";
import { changedLine, reviveTableView, seatChanged, sinceYouLooked } from "./live";

const T = (iso: string) => new Date(`2026-10-17T${iso}Z`);
const seat = (displayName: string, changedAt: Date, opts: { you?: boolean; deck?: string | null } = {}) =>
  ({ displayName, changedAt, you: opts.you ?? false, deck: opts.deck === null ? null : { name: opts.deck ?? `${displayName}'s deck` } }) as unknown as TableView["seats"][number];

describe("seatChanged", () => {
  it("marks a seat changed after the snapshot the viewer last drew", () => {
    expect(seatChanged(seat("Colin", T("21:42:00.001")), T("21:42:00.000"))).toBe(true);
    expect(seatChanged(seat("Colin", T("21:42:00.000")), T("21:42:00.000"))).toBe(false);
    expect(seatChanged(seat("Colin", T("21:41:00")), T("21:42:00"))).toBe(false);
  });

  it("marks nothing before the viewer's first draw, and never the viewer's own seat", () => {
    expect(seatChanged(seat("Colin", T("21:42:00")), null)).toBe(false);
    expect(seatChanged(seat("You", T("21:43:00"), { you: true }), T("21:42:00"))).toBe(false);
  });
});

describe("sinceYouLooked", () => {
  it("names each changed seat holding a deck, in seat order", () => {
    const view = {
      seenAt: T("21:40:00"),
      seats: [
        seat("Peter", T("21:39:00")),
        seat("Colin", T("21:41:00"), { deck: "Sai Thopters" }),
        seat("Rae", T("21:41:30"), { deck: null }),
        seat("You", T("21:41:40"), { you: true }),
        seat("Ana", T("21:41:50"), { deck: "Atraxa" }),
      ],
    };
    expect(sinceYouLooked(view)).toEqual([{ name: "Colin", deck: "Sai Thopters" }, { name: "Ana", deck: "Atraxa" }]);
  });
});

describe("changedLine", () => {
  it("reads as the boards draw it", () => {
    expect(changedLine(T("21:42:00"), T("21:42:59"))).toBe("changed just now");
    expect(changedLine(T("21:42:00"), T("21:43:00"))).toBe("changed 1 min ago");
    expect(changedLine(T("21:42:00"), T("22:41:59"))).toBe("changed 59 min ago");
    expect(changedLine(T("21:42:00"), T("23:42:00"))).toBe("changed 2 hr ago");
  });

  it("never reads a clock skewed ahead of the server as the future", () => {
    expect(changedLine(T("21:42:30"), T("21:42:00"))).toBe("changed just now");
  });
});

describe("reviveTableView", () => {
  it("puts back every date a JSON round trip turned into a string", () => {
    const view = {
      tableId: "t", closesAt: T("23:00:00"), revision: T("21:42:00.123"), seenAt: T("21:40:00"),
      seats: [{ changedAt: T("21:42:00.123") }],
    } as unknown as TableView;
    const back = reviveTableView(JSON.parse(JSON.stringify(view)));
    expect(back.revision).toEqual(view.revision);
    expect(back.closesAt).toEqual(view.closesAt);
    expect(back.seenAt).toEqual(view.seenAt);
    expect(back.seats[0].changedAt).toEqual(view.seats[0].changedAt);
    expect(reviveTableView(JSON.parse(JSON.stringify({ ...view, seenAt: null }))).seenAt).toBeNull();
  });
});
