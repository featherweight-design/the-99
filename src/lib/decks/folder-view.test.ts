import { describe, expect, it } from "vitest";
import {
  ALL_DECKS,
  FOLDER_PARAM,
  UNFILED,
  narrowToShelf,
  shelfCounts,
  shelfFromParams,
  shelfToParam,
  shelfTotal,
  showsUnfiled,
} from "./folder-view";

const folders = [{ id: "f1" }, { id: "f2" }];
const decks = [
  { id: "d1", folderId: "f1" },
  { id: "d2", folderId: "f1" },
  { id: "d3", folderId: null },
  { id: "d4", folderId: "f2" },
];
const params = (query: string) => new URLSearchParams(query);

describe("shelfFromParams", () => {
  it("is All decks when the parameter is absent", () => {
    expect(shelfFromParams(params(""), folders)).toBe(ALL_DECKS);
  });

  it("reads a folder the player owns", () => {
    expect(shelfFromParams(params(`${FOLDER_PARAM}=f2`), folders)).toBe("f2");
  });

  it("reads Unfiled", () => {
    expect(shelfFromParams(params(`${FOLDER_PARAM}=none`), folders)).toBe(UNFILED);
  });

  it("falls back to All decks for an id nobody owns", () => {
    expect(shelfFromParams(params(`${FOLDER_PARAM}=nope`), folders)).toBe(ALL_DECKS);
  });

  it("falls back to All decks for `none` when no folder exists", () => {
    // No folders means no `Unfiled` segment to show as selected, and a bucket
    // equal to the whole list anyway.
    expect(shelfFromParams(params(`${FOLDER_PARAM}=none`), [])).toBe(ALL_DECKS);
  });

  it("still reads `none` as Unfiled once one folder exists", () => {
    expect(shelfFromParams(params(`${FOLDER_PARAM}=none`), [{ id: "f1" }])).toBe(UNFILED);
  });

  it("reads an id whatever case it arrived in, and returns the canonical one", () => {
    const upper = [{ id: "AAAAAAAA-1111-4111-8111-111111111111" }];
    expect(shelfFromParams(params(`${FOLDER_PARAM}=aaaaaaaa-1111-4111-8111-111111111111`), upper))
      .toBe("AAAAAAAA-1111-4111-8111-111111111111");
  });

  it("treats an empty value as absent", () => {
    expect(shelfFromParams(params(`${FOLDER_PARAM}=`), folders)).toBe(ALL_DECKS);
  });
});

describe("shelfToParam", () => {
  it("writes All decks as an absence", () => {
    expect(shelfToParam(ALL_DECKS)).toBeNull();
  });

  it("writes Unfiled and a folder id as themselves", () => {
    expect(shelfToParam(UNFILED)).toBe("none");
    expect(shelfToParam("f1")).toBe("f1");
  });

  it("round-trips every shelf through the URL", () => {
    for (const shelf of [ALL_DECKS, UNFILED, "f1"]) {
      const value = shelfToParam(shelf);
      const query = value === null ? "" : `${FOLDER_PARAM}=${value}`;
      expect(shelfFromParams(params(query), folders)).toBe(shelf);
    }
  });
});

describe("narrowToShelf", () => {
  it("returns every deck on All decks", () => {
    expect(narrowToShelf(decks, ALL_DECKS)).toHaveLength(4);
  });

  it("returns only unfiled decks on Unfiled", () => {
    expect(narrowToShelf(decks, UNFILED).map((d) => d.id)).toEqual(["d3"]);
  });

  it("returns only that folder's decks on a named shelf", () => {
    expect(narrowToShelf(decks, "f1").map((d) => d.id)).toEqual(["d1", "d2"]);
  });

  it("returns nothing for a folder holding nothing", () => {
    expect(narrowToShelf(decks, "f3")).toEqual([]);
  });

  it("copies rather than handing back the caller's array", () => {
    const out = narrowToShelf(decks, ALL_DECKS);
    out.pop();
    expect(decks).toHaveLength(4);
  });
});

describe("shelfCounts", () => {
  it("counts every shelf in one pass", () => {
    const counts = shelfCounts(decks, folders);
    expect(counts.all).toBe(4);
    expect(counts.unfiled).toBe(1);
    expect(counts.byFolder.get("f1")).toBe(2);
    expect(counts.byFolder.get("f2")).toBe(1);
  });

  it("carries an empty folder at zero rather than omitting it", () => {
    const counts = shelfCounts(decks, [...folders, { id: "f3" }]);
    expect(counts.byFolder.get("f3")).toBe(0);
  });

  it("counts a deck filed under an unknown folder into All decks alone", () => {
    const counts = shelfCounts([{ folderId: "gone" }], folders);
    expect(counts.all).toBe(1);
    expect(counts.unfiled).toBe(0);
    expect([...counts.byFolder.values()]).toEqual([0, 0]);
  });

  it("is all zeroes for no decks", () => {
    const counts = shelfCounts([], folders);
    expect(counts.all).toBe(0);
    expect(counts.unfiled).toBe(0);
    expect(counts.byFolder.get("f1")).toBe(0);
  });
});

describe("shelfTotal", () => {
  it("is the figure the selected segment prints, for every shelf", () => {
    const counts = shelfCounts(decks, folders);
    expect(shelfTotal(counts, ALL_DECKS)).toBe(4);
    expect(shelfTotal(counts, UNFILED)).toBe(1);
    expect(shelfTotal(counts, "f1")).toBe(2);
  });

  it("is zero for a folder the map does not hold", () => {
    expect(shelfTotal(shelfCounts(decks, folders), "f9")).toBe(0);
  });

  it("always equals what narrowToShelf returns — the result line's denominator", () => {
    const counts = shelfCounts(decks, folders);
    for (const shelf of [ALL_DECKS, UNFILED, "f1", "f2"]) {
      expect(shelfTotal(counts, shelf)).toBe(narrowToShelf(decks, shelf).length);
    }
  });
});

describe("showsUnfiled", () => {
  it("is false until the first folder exists", () => {
    expect(showsUnfiled([])).toBe(false);
  });

  it("is true once one does", () => {
    expect(showsUnfiled(folders)).toBe(true);
  });
});
