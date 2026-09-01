import { describe, expect, it } from "vitest";
import type { BrowseCard, BrowseFilters } from "./browse";
import { filterCards } from "./browse";
import { buildTypeOptions } from "./type-filter";
import { collectionFilterCopy } from "../copy/collection";
import {
  buildAvailabilityOptions,
  initialAvailability,
  parseAvailabilityParam,
  serializeAvailability,
} from "./availability-filter";

const base: BrowseCard = {
  oracleId: "o",
  name: "Card",
  typeLine: "Artifact",
  manaCost: "{1}",
  oracleText: "",
  keywords: [],
  rarity: "common",
  colorIdentity: [],
  imageUri: null,
  quantity: 1,
  printings: [],
  setCodes: ["ABC"],
  primarySetCode: "ABC",
  preferredPrinting: null,
};

const card = (oracleId: string, owned: number, hard: number, soft: number): BrowseCard => ({
  ...base,
  oracleId,
  quantity: owned,
  availability: { owned, hard, soft, free: owned - hard, hardDeckNames: [] },
});

const cards: BrowseCard[] = [
  card("free1", 2, 0, 0),
  card("free2", 1, 0, 0),
  card("soft1", 2, 0, 1),
  card("hard1", 1, 1, 0),
  card("over1", 1, 2, 0),
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
      "Wanted by a brew",
      "In use",
      "Over-committed",
    ]);
  });

  it("disables a zero-count option rather than dropping it", () => {
    const options = buildAvailabilityOptions([card("free1", 1, 0, 0)], empty);
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

  // A failed read makes every card read as free, so an honoured `?avail=inuse`
  // would draw an empty collection behind a control that cannot clear it.
  it("is ignored when the availability read failed", () => {
    expect(initialAvailability(true, "inuse,over")).toEqual(["hard", "over"]);
    expect(initialAvailability(false, "inuse,over")).toEqual([]);
  });
});

describe("the panel's option aria", () => {
  // FilterPanel formats the count with toLocaleString before handing it over,
  // so the separator is whatever the runtime locale uses. Reading the number
  // back out has to survive all of them or the label announces "NaN cards".
  it("reads the count back out whatever the locale separator is", () => {
    const aria = collectionFilterCopy.availability.optionAria;
    expect(aria("Free", "1,240", false)).toBe("Free, 1240 cards");
    expect(aria("Free", "1.240", false)).toBe("Free, 1240 cards");
    expect(aria("Free", "1\u00A0240", false)).toBe("Free, 1240 cards");
    expect(aria("Free", "1", true)).toBe("Free, 1 card, selected");
  });
});
