import { describe, expect, it } from "vitest";

import {
  BANNER_WINDOW_DAYS,
  PRECON_NEW_DAYS,
  announcedOpensByItself,
  arrivalsFor,
  countdown,
  filterAnnounced,
  preconIsNew,
  seenKeysFor,
  visitSeenKeys,
} from "./arrivals";
import type { PreconArrival } from "./arrivals-read";
import type { RevealedCommander } from "./revealed";
import type { UpcomingSet } from "./upcoming";

const NOW = new Date("2026-10-14T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const set = (over: Partial<UpcomingSet>): UpcomingSet => ({
  code: "trc",
  name: "Star Trek Commander",
  releasesOn: "2026-11-13",
  released: false,
  cardCount: 41,
  parentName: null,
  arrivedAt: daysAgo(2),
  seen: false,
  ...over,
});

const precon = (over: Partial<PreconArrival>): PreconArrival => ({
  fileName: "Final_Frontier_TRC",
  name: "Final Frontier",
  setCode: "trc",
  setName: "Star Trek Commander",
  releasesOn: "2026-11-13",
  arrivedAt: daysAgo(1),
  listsSeen: false,
  ...over,
});

const commander = (over: Partial<RevealedCommander>): RevealedCommander => ({
  oracleId: "o",
  name: "Card",
  colorIdentity: [],
  imageUriSmall: null,
  collectorNumber: "1",
  ...over,
});

describe("the windows", () => {
  it("are thirty days for the banner and fourteen for new", () => {
    expect(BANNER_WINDOW_DAYS).toBe(30);
    expect(PRECON_NEW_DAYS).toBe(14);
  });
});

describe("arrivalsFor", () => {
  it("gives a set line for an unseen set that arrived in the window", () => {
    expect(arrivalsFor({ sets: [set({})], preconArrivals: [], now: NOW })).toEqual([
      { kind: "set", code: "trc", name: "Star Trek Commander", releasesOn: "2026-11-13", arrivedAt: daysAgo(2) },
    ]);
  });

  it("never counts a baseline set, a seen set, or one that arrived thirty days ago or more", () => {
    const sets = [
      set({ code: "base", arrivedAt: null }),
      set({ code: "seen", seen: true }),
      set({ code: "old", arrivedAt: daysAgo(30) }),
      set({ code: "edge", arrivedAt: new Date(daysAgo(30).getTime() + 1) }),
    ];
    expect(arrivalsFor({ sets, preconArrivals: [], now: NOW }).map((l) => l.code)).toEqual(["edge"]);
  });

  it("rolls a set's listed decks up into one lists line, counted, at the earliest arrival", () => {
    const lines = arrivalsFor({
      sets: [],
      preconArrivals: [
        precon({ fileName: "a", arrivedAt: daysAgo(1) }),
        precon({ fileName: "b", arrivedAt: daysAgo(3) }),
        precon({ fileName: "c", arrivedAt: daysAgo(2) }),
      ],
      now: NOW,
    });
    expect(lines).toEqual([
      { kind: "lists", code: "trc", name: "Star Trek Commander", releasesOn: "2026-11-13", arrivedAt: daysAgo(3), count: 3 },
    ]);
  });

  it("drops precons outside the window and a set whose lists the reader saw", () => {
    const lines = arrivalsFor({
      sets: [],
      preconArrivals: [
        precon({ fileName: "a", arrivedAt: daysAgo(31) }),
        precon({ fileName: "b", setCode: "drc", setName: "Darkhold Commander", listsSeen: true }),
      ],
      now: NOW,
    });
    expect(lines).toEqual([]);
  });

  it("tells an announced set later listed, unseen, once: the lists line and not two (STATES rule 5)", () => {
    const lines = arrivalsFor({ sets: [set({})], preconArrivals: [precon({})], now: NOW });
    expect(lines.map((l) => l.kind)).toEqual(["lists"]);
    expect(lines[0]).toMatchObject({ code: "trc", count: 1 });
  });

  it("names a lists line from the upcoming set, else from the arrival's set, else by its code", () => {
    const lines = arrivalsFor({
      sets: [set({ code: "trc", name: "From The Set" })],
      preconArrivals: [
        precon({ setCode: "trc", setName: "From The Arrival" }),
        precon({ fileName: "x", setCode: "drc", setName: "Darkhold Commander", releasesOn: "2027-04-09" }),
        precon({ fileName: "y", setCode: "zzz", setName: null, releasesOn: "2027-05-01" }),
      ],
      now: NOW,
    });
    expect(lines.map((l) => l.name)).toEqual(["From The Set", "Darkhold Commander", "ZZZ"]);
  });

  it("orders by soonest release, then by code, a lists line by its set's release", () => {
    const lines = arrivalsFor({
      sets: [
        set({ code: "drc", releasesOn: "2027-04-09", arrivedAt: daysAgo(20) }),
        set({ code: "trb", releasesOn: "2026-11-13", arrivedAt: daysAgo(1) }),
        set({ code: "tra", releasesOn: "2026-11-13", arrivedAt: daysAgo(5) }),
      ],
      preconArrivals: [precon({ setCode: "out", setName: "Out Already", releasesOn: "2026-10-10", arrivedAt: daysAgo(1) })],
      now: NOW,
    });
    expect(lines.map((l) => `${l.kind}:${l.code}`)).toEqual(["lists:out", "set:tra", "set:trb", "set:drc"]);
  });
});

describe("seenKeysFor", () => {
  it("writes a set line's code, and a lists line's code with lists:", () => {
    expect(seenKeysFor([
      { kind: "set", code: "drc", name: "", releasesOn: "2027-04-09", arrivedAt: NOW },
      { kind: "lists", code: "trc", name: "", releasesOn: "2026-11-13", arrivedAt: NOW, count: 4 },
    ])).toEqual(["drc", "trc", "lists:trc"]);
  });

  it("writes nothing for no line", () => {
    expect(seenKeysFor([])).toEqual([]);
  });
});

describe("visitSeenKeys", () => {
  it("acknowledges every arrival the banner could show, and no baseline set", () => {
    expect(visitSeenKeys({
      sets: [set({ code: "trc" }), set({ code: "drc", arrivedAt: null }), set({ code: "abc", releasesOn: "2026-12-01" })],
      preconArrivals: [precon({ setCode: "trc" })],
      now: NOW,
    })).toEqual(["trc", "lists:trc", "abc"]);
  });
});

describe("countdown", () => {
  it("is tomorrow one day out", () => {
    expect(countdown("2026-10-15", "2026-10-14")).toEqual({ kind: "tomorrow" });
  });

  it("is in days from 2 to 60", () => {
    expect(countdown("2026-10-16", "2026-10-14")).toEqual({ kind: "days", n: 2 });
    expect(countdown("2026-12-13", "2026-10-14")).toEqual({ kind: "days", n: 60 });
  });

  it("is in months past 60, rounded (Darkhold, 177 days, is 6)", () => {
    expect(countdown("2026-12-14", "2026-10-14")).toEqual({ kind: "months", n: 2 });
    expect(countdown("2027-04-09", "2026-10-14")).toEqual({ kind: "months", n: 6 });
  });

  it("is out on release day and after", () => {
    expect(countdown("2026-10-14", "2026-10-14")).toEqual({ kind: "out" });
    expect(countdown("2026-10-02", "2026-10-14")).toEqual({ kind: "out" });
  });

  it("counts whole UTC days across a month and a year", () => {
    expect(countdown("2027-01-01", "2026-12-31")).toEqual({ kind: "tomorrow" });
    expect(countdown("2026-11-01", "2026-10-30")).toEqual({ kind: "days", n: 2 });
  });
});

describe("preconIsNew", () => {
  it("is true for fourteen days from the arrival, then false", () => {
    expect(preconIsNew(daysAgo(0), NOW)).toBe(true);
    expect(preconIsNew(new Date(daysAgo(14).getTime() + 1), NOW)).toBe(true);
    expect(preconIsNew(daysAgo(14), NOW)).toBe(false);
    expect(preconIsNew(daysAgo(20), NOW)).toBe(false);
  });

  it("is false for a baseline precon", () => {
    expect(preconIsNew(null, NOW)).toBe(false);
  });
});

describe("announcedOpensByItself", () => {
  it("opens for an unseen arrival", () => {
    expect(announcedOpensByItself([set({ seen: true }), set({ code: "drc" })], "", NOW)).toBe(true);
  });

  it("stays closed when every set is seen, or only baseline or old sets are unseen", () => {
    expect(announcedOpensByItself([set({ seen: true })], "", NOW)).toBe(false);
    expect(announcedOpensByItself([set({ arrivedAt: null }), set({ code: "old", arrivedAt: daysAgo(40) })], "", NOW)).toBe(false);
    expect(announcedOpensByItself([], "", NOW)).toBe(false);
  });

  it("opens for #announced whatever the sets", () => {
    expect(announcedOpensByItself([], "#announced", NOW)).toBe(true);
    expect(announcedOpensByItself([set({ seen: true })], "#other", NOW)).toBe(false);
  });
});

describe("filterAnnounced", () => {
  const trc = set({ code: "trc", name: "Star Trek Commander" });
  const drc = set({ code: "drc", name: "Darkhold Commander", releasesOn: "2027-04-09" });
  const empty = set({ code: "emp", name: "Empty Commander" });
  const chapel = commander({ oracleId: "chapel", name: "Christine Chapel", colorIdentity: ["W", "U"], collectorNumber: "78" });
  const kirk = commander({ oracleId: "kirk", name: "James T. Kirk", colorIdentity: ["R", "W"], collectorNumber: "2" });
  const wanda = commander({ oracleId: "wanda", name: "Wanda Maximoff", colorIdentity: ["B", "R"], collectorNumber: "1" });
  const byCode = { trc: [kirk, chapel], drc: [wanda] };

  it("keeps every set and every commander with no filter on, a set with none revealed included", () => {
    const out = filterAnnounced([trc, drc, empty], byCode, { q: "", colours: [] });
    expect(out.map((m) => [m.set.code, m.matched, m.revealed])).toEqual([["trc", 2, 2], ["drc", 1, 1], ["emp", 0, 0]]);
  });

  it("matches a revealed commander's name: chapel keeps Star Trek with one card, and Darkhold leaves (T6)", () => {
    const out = filterAnnounced([trc, drc, empty], byCode, { q: "  CHAPEL ", colours: [] });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ set: trc, matched: 1, revealed: 2 });
    expect(out[0].commanders.map((c) => c.oracleId)).toEqual(["chapel"]);
  });

  it("keeps all a set's commanders when its name or code matches", () => {
    expect(filterAnnounced([trc, drc], byCode, { q: "star trek", colours: [] }).map((m) => [m.set.code, m.matched])).toEqual([["trc", 2]]);
    expect(filterAnnounced([trc, drc], byCode, { q: "DRC", colours: [] }).map((m) => [m.set.code, m.matched])).toEqual([["drc", 1]]);
  });

  it("matches colours by containment, per commander", () => {
    const out = filterAnnounced([trc, drc], byCode, { q: "", colours: ["W"] });
    expect(out.map((m) => [m.set.code, m.commanders.map((c) => c.oracleId)])).toEqual([["trc", ["kirk", "chapel"]]]);
    const two = filterAnnounced([trc, drc], byCode, { q: "", colours: ["W", "U"] });
    expect(two.map((m) => [m.set.code, m.commanders.map((c) => c.oracleId)])).toEqual([["trc", ["chapel"]]]);
  });

  it("takes both: a name match on the set still holds its commanders to the colours, and leaves with none", () => {
    expect(filterAnnounced([trc], byCode, { q: "trek", colours: ["U"] })[0].commanders.map((c) => c.oracleId)).toEqual(["chapel"]);
    expect(filterAnnounced([trc], byCode, { q: "trek", colours: ["B"] })).toEqual([]);
  });

  it("keeps a set with none revealed only when its name or code matches the search", () => {
    expect(filterAnnounced([empty], byCode, { q: "kirk", colours: [] })).toEqual([]);
    expect(filterAnnounced([empty], byCode, { q: "", colours: ["W"] })).toEqual([]);
    expect(filterAnnounced([empty], byCode, { q: "empty", colours: [] })).toMatchObject([{ set: empty, matched: 0, revealed: 0 }]);
  });
});
