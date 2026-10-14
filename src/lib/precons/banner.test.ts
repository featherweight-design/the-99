import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ArrivalLine } from "./arrivals";
import type { PreconArrival } from "./arrivals-read";
import type { UpcomingSet } from "./upcoming";

const stub = vi.hoisted(() => ({
  sets: vi.fn(),
  arrivals: vi.fn(),
  revealed: vi.fn(),
  softFailure: vi.fn(),
}));
vi.mock("./upcoming", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./upcoming")>()),
  loadUpcomingSets: stub.sets,
}));
vi.mock("./arrivals-read", () => ({ loadPreconArrivals: stub.arrivals }));
vi.mock("./revealed", () => ({ loadRevealedCommanders: stub.revealed }));
vi.mock("../cache/soft-failure", () => ({ recordSoftFailure: stub.softFailure }));

const { arrivalsHref, bannerLines, dismissKeys, loadArrivalsBanner } = await import("./banner");

const NOW = new Date("2026-10-14T12:00:00Z");
const DAY = 86_400_000;
const set = (o: Partial<UpcomingSet>): UpcomingSet => ({
  code: "trc", name: "Star Trek Commander", releasesOn: "2026-11-13", released: false, cardCount: 41, parentName: null,
  arrivedAt: new Date(NOW.getTime() - DAY), seen: false, ...o,
});
const precon = (o: Partial<PreconArrival>): PreconArrival => ({
  fileName: "a.json", name: "Deck A", setCode: "frc", setName: "Reality Fracture Commander", releasesOn: "2026-10-02",
  arrivedAt: new Date(NOW.getTime() - DAY), listsSeen: false, ...o,
});
const setLine = (code: string, releasesOn = "2026-11-13"): ArrivalLine => ({ kind: "set", code, name: code, releasesOn, arrivedAt: NOW });
const listsLine = (code: string, releasesOn: string): ArrivalLine => ({ kind: "lists", code, name: code, releasesOn, arrivedAt: NOW, count: 2 });

beforeEach(() => {
  for (const f of Object.values(stub)) f.mockReset();
  stub.revealed.mockResolvedValue({});
});

describe("arrivalsHref", () => {
  it("sends a set announced to the Announced group, explicitly in Newest order", () => {
    expect(arrivalsHref([setLine("trc")])).toBe("/decks/precons?sort=newest#announced");
  });

  it("sends a set's decklists to its year's group", () => {
    expect(arrivalsHref([listsLine("frc", "2026-10-02")])).toBe("/decks/precons?sort=newest#precons-2026");
  });

  it("sends several to the Announced group when any is a set, else to the first line's year", () => {
    expect(arrivalsHref([listsLine("frc", "2026-10-02"), setLine("trc")])).toBe("/decks/precons?sort=newest#announced");
    expect(arrivalsHref([listsLine("aaa", "2027-01-05"), listsLine("bbb", "2026-12-01")])).toBe("/decks/precons?sort=newest#precons-2027");
  });
});

describe("bannerLines", () => {
  it("counts each set's revealed commanders, and each set's decklists", () => {
    expect(bannerLines([setLine("trc"), setLine("mdc"), listsLine("frc", "2026-10-02")], { trc: [1, 2, 3] })).toEqual([
      { kind: "set", code: "trc", name: "trc", revealed: 3 },
      { kind: "set", code: "mdc", name: "mdc", revealed: 0 },
      { kind: "lists", code: "frc", name: "frc", count: 2 },
    ]);
  });
});

describe("dismissKeys", () => {
  const current = ["trc", "frc", "lists:frc"];

  it("keeps what the page drew that the reader's lines still give", () => {
    expect(dismissKeys(["trc", "frc", "lists:frc"], current)).toEqual(["trc", "frc", "lists:frc"]);
  });

  it("never adds a key the reader's lines do not give now", () => {
    expect(dismissKeys(["trc", "mdc", "lists:mdc"], current)).toEqual(["trc"]);
  });

  it("drops malformed keys and anything that is not a list of strings", () => {
    expect(dismissKeys(["TRC", "lists:", "trc; drop table", 7, null, "trc", "trc"], [...current, "TRC"])).toEqual(["trc"]);
    expect(dismissKeys("trc", current)).toEqual([]);
    expect(dismissKeys(undefined, current)).toEqual([]);
  });
});

describe("loadArrivalsBanner", () => {
  it("is the lines, the link and the keys ✕ writes", async () => {
    stub.sets.mockResolvedValue([set({})]);
    stub.arrivals.mockResolvedValue([precon({}), precon({ fileName: "b.json" })]);
    stub.revealed.mockResolvedValue({ trc: new Array(15).fill(null) });
    expect(await loadArrivalsBanner("user_1", NOW)).toEqual({
      lines: [
        { kind: "lists", code: "frc", name: "Reality Fracture Commander", count: 2 },
        { kind: "set", code: "trc", name: "Star Trek Commander", revealed: 15 },
      ],
      href: "/decks/precons?sort=newest#announced",
      keys: ["frc", "lists:frc", "trc"],
    });
    expect(stub.revealed).toHaveBeenCalledWith(["trc"]);
    expect(stub.softFailure).not.toHaveBeenCalled();
  });

  it("is null when nothing is new, and reads no revealed commanders", async () => {
    stub.sets.mockResolvedValue([set({ seen: true }), set({ code: "mdc", arrivedAt: null })]);
    stub.arrivals.mockResolvedValue([precon({ listsSeen: true })]);
    expect(await loadArrivalsBanner("user_1", NOW)).toBeNull();
    expect(stub.revealed).not.toHaveBeenCalled();
  });

  it("is null when a read fails, and records the fallback so that render is not stored", async () => {
    stub.sets.mockRejectedValue(new Error("db down"));
    stub.arrivals.mockResolvedValue([]);
    expect(await loadArrivalsBanner("user_1", NOW)).toBeNull();
    expect(stub.softFailure).toHaveBeenCalledTimes(1);
  });
});
