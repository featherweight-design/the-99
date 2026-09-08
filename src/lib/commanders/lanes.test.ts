// The three properties the two-lane split restores. Each one is a defect that
// came back once already, so each gets a test that fails if it returns. They are
// pinned against the primitives rather than a rendered lane on purpose: a
// component test would also fail for a hundred reasons that are not these.

import { describe, expect, it } from "vitest";
import { filterByColors } from "./filter";
import { clearsFloor } from "@/lib/discovery/novelty";

type Row = { oracleId: string; name: string; colorIdentity: string[] };

const POOL: Row[] = [
  { oracleId: "1", name: "Druid of the Cowl", colorIdentity: ["g"] },
  { oracleId: "2", name: "Druid Class", colorIdentity: ["g"] },
  { oracleId: "3", name: "Grim Druid", colorIdentity: ["b", "g"] },
  { oracleId: "4", name: "Golgari Druid", colorIdentity: ["b", "g"] },
  { oracleId: "5", name: "Sultai Druid", colorIdentity: ["b", "g", "u"] },
  { oracleId: "6", name: "Elvish Mystic", colorIdentity: ["g"] },
  { oracleId: "7", name: "Sol Ring Bearer", colorIdentity: [] },
];

const search = (rows: Row[], q: string) =>
  q === "" ? rows : rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));

describe("arithmetic identity", () => {
  it("printed total minus exclusions equals the rows on screen", () => {
    const total = POOL.length;
    const searched = search(POOL, "druid");
    const shown = filterByColors(searched, ["b", "g"], "exactly");

    const excludedBySearch = total - searched.length;
    const excludedByColour =
      searched.length - filterByColors(searched, ["b", "g"], "contains").length;
    const excludedByMatch =
      filterByColors(searched, ["b", "g"], "contains").length - shown.length;

    expect(total - excludedBySearch - excludedByColour - excludedByMatch).toBe(shown.length);
  });

  it("prints no exclusions at rest, so the lane states rather than divides", () => {
    expect(filterByColors(search(POOL, ""), [], "contains")).toHaveLength(POOL.length);
  });
});

describe("a note counts only its own control", () => {
  it("measures Exactly against Any on the same already-narrowed base", () => {
    const searched = search(POOL, "druid"); // 5 rows
    const any = filterByColors(searched, ["b", "g"], "contains"); // 3: ids 3, 4, 5
    const exactly = filterByColors(searched, ["b", "g"], "exactly"); // 2: ids 3, 4

    // The aside is about the match control alone. The name search narrowed both
    // arms equally, so it cancels — this is the figure defect 2 got wrong.
    expect(any.length - exactly.length).toBe(1);
  });

  it("reports nothing when Exactly costs no rows", () => {
    const searched = search(POOL, "golgari");
    const any = filterByColors(searched, ["b", "g"], "contains");
    const exactly = filterByColors(searched, ["b", "g"], "exactly");
    expect(any.length - exactly.length).toBe(0);
  });
});

describe("membership under a scoring control", () => {
  // Availability is a scoring control. It may reorder the lane and it may
  // change every printed figure. It may not add or remove one row.
  const owned = [
    { oracleId: "a", collectionSupport: 40, freeSupport: 5, edhrecTotal: 100 },
    { oracleId: "b", collectionSupport: 12, freeSupport: 1, edhrecTotal: 100 },
    { oracleId: "c", collectionSupport: 2, freeSupport: 0, edhrecTotal: 100 },
  ];

  const membership = (avail: "all" | "free") =>
    owned
      .filter((c) =>
        clearsFloor({ collectionSupport: c.collectionSupport, edhrecTotal: c.edhrecTotal }),
      )
      .map((c) => ({
        oracleId: c.oracleId,
        // Only the printed figure moves with the mode.
        support: avail === "free" ? c.freeSupport : c.collectionSupport,
      }));

  it("returns the same commanders under either availability mode", () => {
    expect(membership("free").map((c) => c.oracleId)).toEqual(
      membership("all").map((c) => c.oracleId),
    );
  });

  it("still lets the mode change the printed figure", () => {
    expect(membership("free")[0].support).not.toBe(membership("all")[0].support);
  });

  it("keeps a commander below the floor out under either mode", () => {
    expect(membership("all").map((c) => c.oracleId)).not.toContain("c");
    expect(membership("free").map((c) => c.oracleId)).not.toContain("c");
  });
});
