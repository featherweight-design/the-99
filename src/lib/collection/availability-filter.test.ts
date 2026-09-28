import { describe, expect, it } from "vitest";
import type { BrowseListCard, BrowseFilters } from "./browse";
import { filterCards } from "./browse";
import { buildTypeOptions } from "./type-filter";
import { collectionFilterCopy } from "../copy/collection";
import {
  buildAvailabilityOptions,
  initialAvailability,
  parseAvailabilityParam,
  serializeAvailability,
  toggleAvailability,
} from "./availability-filter";

const base: BrowseListCard = {
  oracleId: "o",
  name: "Card",
  typeLine: "Artifact",
  manaCost: "{1}",
  rarity: "common",
  colorIdentity: [],
  imageUri: null,
  printedName: null,
  quantity: 1,
  setCounts: [],
  primarySetCode: "ABC",
};

// `free` is given, never derived: the query computes it from a vantage the
// fixture cannot see, and `owned − hard` is right only off a deck's own
// decklist. Deriving it here would encode the one shape the contract on
// Availability.free warns against.
const card = (
  oracleId: string,
  owned: number,
  hard: number,
  soft: number,
  free: number,
): BrowseListCard => ({
  ...base,
  oracleId,
  quantity: owned,
  availability: { owned, hard, soft, free, claims: [] },
});

const cards: BrowseListCard[] = [
  card("free1", 2, 0, 0, 2),
  card("free2", 1, 0, 0, 1),
  card("soft1", 2, 0, 1, 2),
  card("hard1", 1, 1, 0, 0),
  card("over1", 1, 2, 0, -1),
  { ...base, oracleId: "unread", availability: null },
];

const empty = { search: "", colors: [], types: [], setCodes: [] };

describe("buildAvailabilityOptions", () => {
  it("counts distinct cards and partitions the collection", () => {
    const options = buildAvailabilityOptions(cards, empty);
    expect(options.map((o) => [o.code, o.count])).toEqual([
      ["free", 3], // free1, free2 and the unread card
      ["soft", 1],
      ["hard", 1],
      ["over", 1],
    ]);
    expect(options.reduce((n, o) => n + o.count, 0)).toBe(cards.length);
  });

  it("labels the options in the design's words", () => {
    expect(buildAvailabilityOptions(cards, empty).map((o) => o.label)).toEqual([
      "Free",
      "Wanted by a draft",
      "In use",
      "Over-committed",
    ]);
  });

  it("disables a zero-count option rather than dropping it", () => {
    const options = buildAvailabilityOptions([card("free1", 1, 0, 0, 1)], empty);
    expect(options).toHaveLength(4);
    expect(options.filter((o) => o.disabled).map((o) => o.code)).toEqual(["soft", "hard", "over"]);
  });

  it("counts under the other active filters", () => {
    const options = buildAvailabilityOptions(cards, { ...empty, types: ["Artifact"] });
    expect(options.find((o) => o.code === "hard")?.count).toBe(1);
    expect(
      buildAvailabilityOptions(cards, { ...empty, types: ["Creature"] }).every((o) => o.count === 0),
    ).toBe(true);
  });
});

describe("the sibling option builders", () => {
  // The counting convention runs both ways: an availability selection has to
  // narrow the Type/Set/Color counts, exactly as those narrow availability's.
  it("count under an active availability selection", () => {
    const artifacts = (f: BrowseFilters) =>
      buildTypeOptions(cards, f).find((o) => o.code === "Artifact")?.count;
    expect(artifacts(empty)).toBe(8);
    expect(artifacts({ ...empty, availability: ["hard"] })).toBe(1);
  });
});

describe("filterCards with availability", () => {
  it("ORs the selected states internally", () => {
    const kept = filterCards(cards, { ...empty, availability: ["hard", "over"] });
    expect(kept.map((c) => c.oracleId)).toEqual(["hard1", "over1"]);
  });

  it("treats an unread card as free", () => {
    expect(filterCards(cards, { ...empty, availability: ["free"] }).map((c) => c.oracleId)).toEqual([
      "free1",
      "free2",
      "unread",
    ]);
  });

  it("ANDs with every other filter", () => {
    expect(filterCards(cards, { ...empty, availability: ["free"], setCodes: ["ZZZ"] })).toEqual([]);
  });

  it("is a no-op when nothing is selected", () => {
    expect(filterCards(cards, empty)).toHaveLength(cards.length);
    expect(filterCards(cards, { ...empty, availability: [] })).toHaveLength(cards.length);
  });
});

describe("the ?avail= param", () => {
  it("round-trips through the design's tokens", () => {
    expect(serializeAvailability(["hard", "over"])).toBe("inuse,over");
    expect(parseAvailabilityParam("inuse,over")).toEqual(["hard", "over"]);
    expect(serializeAvailability(["free", "soft"])).toBe("free,brew");
    expect(parseAvailabilityParam("free,brew")).toEqual(["free", "soft"]);
  });

  it("drops unknown, duplicate and empty tokens", () => {
    expect(parseAvailabilityParam("inuse,INUSE,nonsense,")).toEqual(["hard"]);
    expect(parseAvailabilityParam(null)).toEqual([]);
  });

  // Held in click order, the round trip is not an identity: parse always
  // returns menu order, so a reload reshuffles the URL and the chips with it.
  it("serializes in menu order whatever order the states were picked in", () => {
    expect(serializeAvailability(["over", "hard"])).toBe("inuse,over");
    expect(toggleAvailability(["over"], "hard")).toEqual(["hard", "over"]);
    expect(toggleAvailability(["hard", "over"], "hard")).toEqual(["over"]);
    const picked = toggleAvailability(toggleAvailability([], "over"), "free");
    expect(parseAvailabilityParam(serializeAvailability(picked))).toEqual(picked);
  });

  // A failed read makes every card read as free, so an honoured `?avail=inuse`
  // would draw an empty collection behind a control that cannot clear it.
  it("is ignored when the availability read failed", () => {
    expect(initialAvailability(true, "inuse,over")).toEqual(["hard", "over"]);
    expect(initialAvailability(false, "inuse,over")).toEqual([]);
  });
});

describe("the panel's option aria", () => {
  // The addendum's string pluralises on the count, so the panel hands over the
  // raw number rather than a formatted one: recovering a number from a locale
  // string is not possible under every locale, and a label that announces
  // "NaN cards" is worse than one carrying no thousands separator.
  it("pluralises on the count", () => {
    const aria = collectionFilterCopy.availability.optionAria;
    expect(aria("Free", 1240)).toBe("Free, 1240 cards");
    expect(aria("Free", 1)).toBe("Free, 1 card");
  });

  // The sibling panels take the same raw count. A one-card set is an ordinary
  // state, and these are accessible names, so a reader would say "1 cards".
  it("pluralises the sibling panels' labels too", () => {
    expect(collectionFilterCopy.set.optionAria("Modern Horizons 3", 1)).toBe(
      "Modern Horizons 3, 1 card",
    );
    expect(collectionFilterCopy.type.optionAria("Artifact", 1240)).toBe("Artifact, 1,240 cards");
    expect(collectionFilterCopy.color.optionAria("White", 1)).toBe("White, 1 card");
  });

  // The row already carries aria-selected inside an aria-multiselectable
  // listbox, so a ", selected" tail was the same fact twice in one breath.
  //
  // Arity alone would not hold the line: `(name, count, selected = false)` still
  // reports `.length === 2`, so the output is called with a third argument both
  // ways and asserted identical. That is the property that matters — the copy
  // does not vary on the selection — and it survives a defaulted parameter.
  // Sort keeps its third, because "choose again to reverse" is not something the
  // role announces.
  it("leaves the selected state to the role on every multi-select panel", () => {
    for (const panel of ["set", "type", "availability", "color"] as const) {
      const member = collectionFilterCopy[panel].optionAria;
      const loose = member as (...args: unknown[]) => string;
      expect(member("Anything", 2), panel).not.toMatch(/selected/);
      expect(loose("Anything", 2, true), panel).toBe(loose("Anything", 2, false));
      expect(loose("Anything", 2, true), panel).toBe(member("Anything", 2));
    }
    expect(collectionFilterCopy.sort.optionAria("Name", 0, true)).toBe(
      "Name, current order, choose again to reverse",
    );
  });
});
