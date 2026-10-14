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

describe("newPreconFiles", () => {
  it("keeps the precons listed in the last 14 days", () => {
    expect(newPreconFiles([arrival("a", daysAgo(1)), arrival("b", daysAgo(13.9)), arrival("c", daysAgo(14))], now)).toEqual(["a", "b"]);
  });
});
