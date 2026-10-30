import { describe, expect, it } from "vitest";
import { announcedProps, newPreconFiles } from "./announced";
import type { PreconArrival } from "./arrivals-read";
import type { UpcomingSet } from "./upcoming";

const now = new Date("2026-10-14T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const set = (code: string, over: Partial<UpcomingSet> = {}): UpcomingSet => ({
  code, name: code.toUpperCase(), releasesOn: "2026-11-13", released: false, cardCount: 40, parentName: null,
  arrivedAt: null, seen: false, ...over,
});
const arrival = (fileName: string, arrivedAt: Date): PreconArrival => ({
  fileName, name: fileName, setCode: "trc", setName: "Star Trek Commander", releasesOn: "2026-11-13", arrivedAt, listsSeen: false,
});

describe("announcedProps", () => {
  it("tags as new only an unseen set that arrived in the window, never a baseline set", () => {
    const props = announcedProps({
      sets: [set("trc", { arrivedAt: daysAgo(2) }), set("mdc"), set("old", { arrivedAt: daysAgo(40) }), set("saw", { arrivedAt: daysAgo(1), seen: true })],
      commanders: {},
      arrivals: [],
    }, now);
    expect(props.newCodes).toEqual(["trc"]);
    expect(props.opensByItself).toBe(true);
    expect(props.today).toBe("2026-10-14");
  });

  it("stays closed when nothing in it is news", () => {
    expect(announcedProps({ sets: [set("mdc")], commanders: {}, arrivals: [] }, now).opensByItself).toBe(false);
  });
});

describe("announcedProps: early lists (announcements G2)", () => {
  const tile = (n: number) => ({ href: `/decks/precons/early/p/${n}`, name: `List ${n}`, commanders: [], identity: [], identityKnown: true, owned: 0, of: 99 });
  const early = (count: number) => ({ fdc: { lists: Array.from({ length: count }, (_, i) => tile(i)), promised: 5 } });

  it("marks a set new while the reader has not been shown its lists at their count, and opens the group", () => {
    const props = announcedProps({ sets: [set("fdc")], commanders: {}, arrivals: [], early: early(3), earlySeen: [] }, now);
    expect(props.newCodes).toEqual(["fdc"]);
    expect(props.opensByItself).toBe(true);
    expect(props.early?.fdc.lists).toHaveLength(3);
  });

  it("is quiet once `early:<code>:<count>` is held, and lights again when a further list lands (3 → 5)", () => {
    const seen = { sets: [set("fdc")], commanders: {}, arrivals: [], earlySeen: ["early:fdc:3"] };
    expect(announcedProps({ ...seen, early: early(3) }, now).newCodes).toEqual([]);
    expect(announcedProps({ ...seen, early: early(3) }, now).opensByItself).toBe(false);
    expect(announcedProps({ ...seen, early: early(5) }, now).newCodes).toEqual(["fdc"]);
  });

  it("counts released lists in the news check: seen at 3, one released and a fourth posted is still news", () => {
    const seen = { sets: [set("fdc")], commanders: {}, arrivals: [], earlySeen: ["early:fdc:3"] };
    const shifted = { fdc: { lists: [tile(0), tile(1), tile(2)], promised: 5, releasedLists: 1 } };
    expect(announcedProps({ ...seen, early: shifted }, now).newCodes).toEqual(["fdc"]);
    // Every list released: no early list left to show, so no early news.
    const gone = { fdc: { lists: [], promised: 5, releasedLists: 4 } };
    expect(announcedProps({ ...seen, earlySeen: [], early: gone }, now).newCodes).toEqual([]);
  });

  it("keeps the early key apart from `lists:<code>`: neither says anything about the other", () => {
    // Holding the release lists' key never hides the early lists...
    const listsSeen = announcedProps({ sets: [set("fdc")], commanders: {}, arrivals: [], early: early(2), earlySeen: ["lists:fdc", "fdc"] }, now);
    expect(listsSeen.newCodes).toEqual(["fdc"]);
    // ...and the early key never marks the set itself seen: an unseen arrival is still new.
    const arrived = announcedProps({
      sets: [set("fdc", { arrivedAt: daysAgo(1) })], commanders: {}, arrivals: [], early: {}, earlySeen: ["early:fdc:3"],
    }, now);
    expect(arrived.newCodes).toEqual(["fdc"]);
  });

  it("reads an entry cached before early lists existed as none", () => {
    const props = announcedProps({ sets: [set("fdc")], commanders: {}, arrivals: [] }, now);
    expect(props.newCodes).toEqual([]);
    expect(props.early).toEqual({});
  });
});

describe("newPreconFiles", () => {
  it("keeps the precons listed in the last 14 days", () => {
    expect(newPreconFiles([arrival("a", daysAgo(1)), arrival("b", daysAgo(13.9)), arrival("c", daysAgo(14))], now)).toEqual(["a", "b"]);
  });
});
