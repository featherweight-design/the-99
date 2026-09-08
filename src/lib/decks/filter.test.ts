import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  filterDecks,
  filtersFromParams,
  filtersToParams,
  type FilterableDeck,
} from "./filter";

const NOW = new Date("2026-09-07T12:00:00Z");

// Mid-month on both sides, so the calendar-month test states what it means in
// every timezone rather than turning on the machine's UTC offset.
const THIS_MONTH = new Date("2026-09-03T12:00:00Z");
const LAST_MONTH = new Date("2026-08-20T12:00:00Z");

function deck(over: Partial<FilterableDeck> & { id?: string } = {}) {
  return {
    id: "d1",
    name: "Atraxa, Praetors' Voice",
    commanderName: "Atraxa, Praetors' Voice",
    commanderColorIdentity: ["W", "U", "B", "G"],
    statusPill: "Complete" as const,
    lastPlayedAt: THIS_MONTH,
    ...over,
  };
}

describe("filterDecks", () => {
  it("returns everything when nothing is set", () => {
    const decks = [deck(), deck({ id: "d2", statusPill: "Draft" })];
    expect(filterDecks(decks, EMPTY_FILTERS, NOW)).toHaveLength(2);
  });

  it("ORs within status", () => {
    const decks = [
      deck({ id: "a", statusPill: "Draft" }),
      deck({ id: "b", statusPill: "Over" }),
      deck({ id: "c", statusPill: "Complete" }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, statuses: ["Draft", "Over"] }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("ANDs across headings", () => {
    const decks = [
      deck({ id: "a", statusPill: "Draft", commanderColorIdentity: ["R"] }),
      deck({ id: "b", statusPill: "Draft", commanderColorIdentity: ["G"] }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, statuses: ["Draft"], colours: ["R"] }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["a"]);
  });

  it("matches colour identity by containment, not equality", () => {
    const decks = [
      deck({ id: "mono", commanderColorIdentity: ["R"] }),
      deck({ id: "mardu", commanderColorIdentity: ["W", "B", "R"] }),
      deck({ id: "simic", commanderColorIdentity: ["G", "U"] }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, colours: ["R"] }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["mono", "mardu"]);
  });

  it("requires every ticked colour", () => {
    const decks = [
      deck({ id: "mono", commanderColorIdentity: ["R"] }),
      deck({ id: "mardu", commanderColorIdentity: ["W", "B", "R"] }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, colours: ["R", "W"] }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["mardu"]);
  });

  it("reads This month as the calendar month, not thirty days", () => {
    const decks = [
      deck({ id: "sept", lastPlayedAt: THIS_MONTH }),
      deck({ id: "aug", lastPlayedAt: LAST_MONTH }),
      deck({ id: "never", lastPlayedAt: null }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, played: "thisMonth" }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["sept"]);
  });

  it("reads Never as no play at all", () => {
    const decks = [
      deck({ id: "sept", lastPlayedAt: THIS_MONTH }),
      deck({ id: "never", lastPlayedAt: null }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, played: "never" }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["never"]);
  });

  it("searches deck name and commander name, case-insensitively", () => {
    const decks = [
      deck({ id: "a", name: "Weekend brew", commanderName: "Krenko, Mob Boss" }),
      deck({ id: "b", name: "Krenko goblins", commanderName: "Torbran" }),
      deck({ id: "c", name: "Slug", commanderName: "Torbran" }),
    ];
    const kept = filterDecks(decks, { ...EMPTY_FILTERS, search: "  kRenKo " }, NOW);
    expect(kept.map((d) => d.id)).toEqual(["a", "b"]);
  });
});

describe("activeFilterCount", () => {
  it("counts values, not headings", () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(
      activeFilterCount({
        statuses: ["Draft", "Over"],
        colours: ["R"],
        played: "never",
        search: "krenko",
      }),
    ).toBe(5);
  });

  it("ignores whitespace-only search", () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, search: "   " })).toBe(0);
  });
});

describe("URL round trip", () => {
  it("serialises defaults as absences", () => {
    expect(filtersToParams(EMPTY_FILTERS, "lastPlayed").toString()).toBe("");
  });

  it("round trips a full state", () => {
    const params = filtersToParams(
      {
        statuses: ["Draft", "To buy"],
        colours: ["R", "G"],
        played: "never",
        search: "krenko",
      },
      "name",
    );
    const back = filtersFromParams(new URLSearchParams(params.toString()));
    expect(back.filters.statuses).toEqual(["Draft", "To buy"]);
    expect(back.filters.colours).toEqual(["R", "G"]);
    expect(back.filters.played).toBe("never");
    expect(back.filters.search).toBe("krenko");
    expect(back.sort).toBe("name");
  });

  it("drops values it does not recognise instead of throwing", () => {
    const back = filtersFromParams(
      new URLSearchParams("status=Draft,Nonsense&colour=R,X&played=someday&sort=whenever"),
    );
    expect(back.filters.statuses).toEqual(["Draft"]);
    expect(back.filters.colours).toEqual(["R"]);
    expect(back.filters.played).toBeNull();
    expect(back.sort).toBe("lastPlayed");
  });

  it("keeps canonical order regardless of the order given", () => {
    const back = filtersFromParams(new URLSearchParams("status=Complete,Draft&colour=G,W"));
    expect(back.filters.statuses).toEqual(["Draft", "Complete"]);
    expect(back.filters.colours).toEqual(["W", "G"]);
  });
});
