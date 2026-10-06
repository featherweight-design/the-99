import { describe, expect, it } from "vitest";
import {
  baseSetSizeOf, fingerprintOf, holdingCountOf, orderWithSubsetsAfterParent, placeCells,
  sectionsOf, type BoosterFlagged, type Holding, type SetPrinting,
} from "./completion";

const row = (over: Partial<BoosterFlagged>): BoosterFlagged => ({
  collectorNumber: "1", booster: true, isVariant: false, ...over,
});

describe("baseSetSizeOf", () => {
  it("counts only printings in boosters", () => {
    expect(baseSetSizeOf([
      row({ collectorNumber: "1" }),
      row({ collectorNumber: "276" }),
      row({ collectorNumber: "277", booster: false }),
    ])).toBe(2);
  });

  it("returns null when no printing has been classified yet", () => {
    expect(baseSetSizeOf([
      row({ collectorNumber: "1", booster: null }),
      row({ collectorNumber: "2", booster: null }),
    ])).toBeNull();
  });

  it("does not let an unclassified printing count as an extra", () => {
    // The transform writes null rather than false for an absent flag, so an unclassified
    // printing is neither base nor extra until the ingest says which.
    const cells = placeCells([p("1", { booster: null }), p("2")], []);
    const s = sectionsOf(cells, 1);
    expect(s.baseTotal).toBe(1);
    expect(s.extrasTotal).toBe(0);
  });

  it("counts a partially classified set from what it knows rather than returning null", () => {
    expect(baseSetSizeOf([
      row({ collectorNumber: "1" }),
      row({ collectorNumber: "2", booster: null }),
    ])).toBe(1);
  });

  it("falls back to non-variant printings for a set with no booster cards at all", () => {
    // Every printing in a Commander product is booster:false. Without the fallback the
    // whole product lands in extras behind a denominator of zero.
    expect(baseSetSizeOf([
      row({ collectorNumber: "1", booster: false }),
      row({ collectorNumber: "2", booster: false }),
      row({ collectorNumber: "3", booster: false, isVariant: true }),
    ])).toBe(2);
  });

  it("does not apply the fallback to a set that has booster cards", () => {
    expect(baseSetSizeOf([
      row({ collectorNumber: "1" }),
      row({ collectorNumber: "277", booster: false }),
    ])).toBe(1);
  });

  it("returns null for a set nothing has been classified for, never 0", () => {
    // 0 is a denominator nobody computed, presented as a fact. The SQL mirror must
    // skip these sets rather than write a zero — a probe run found it writing 725 of them.
    expect(baseSetSizeOf([row({ booster: null }), row({ booster: null })])).toBeNull();
  });

  it("ignores unclassified rows when falling back", () => {
    expect(baseSetSizeOf([
      row({ collectorNumber: "1", booster: false }),
      row({ collectorNumber: "2", booster: null }),
    ])).toBe(1);
  });
});

const p = (n: string, over: Partial<SetPrinting> = {}): SetPrinting => ({
  scryfallId: `s-${n}`, oracleId: `o-${n}`, collectorNumber: n, name: `Card ${n}`,
  imageUriSmall: null, colorIdentity: [], rarity: "common", booster: true,
  isVariant: false, ...over,
});
const held = (over: Partial<Holding>): Holding =>
  ({ oracleId: "o-1", collectorNumber: "1", finish: "nonfoil", ...over });

describe("placeCells", () => {
  it("fills the cell whose collector number matches", () => {
    const cells = placeCells([p("1"), p("2")], [held({})]);
    expect(cells.map((c) => c.owned)).toEqual([true, false]);
    expect(cells[0].byName).toBe(false);
  });

  it("fills by oracle id when the holding carries no collector number", () => {
    const cells = placeCells([p("1")], [held({ collectorNumber: "" })]);
    expect(cells[0].owned).toBe(true);
    expect(cells[0].byName).toBe(true);
  });

  it("fills the lowest unfilled cell when one oracle has two numbers", () => {
    // EOE's Plains at #262 and #268 share an oracle id.
    const printings = [p("262", { oracleId: "o-plains" }), p("268", { oracleId: "o-plains" })];
    const cells = placeCells(printings,
      [held({ oracleId: "o-plains", collectorNumber: "" })]);
    expect(cells.map((c) => c.owned)).toEqual([true, false]);
  });

  it("collapses unpinned rows of one oracle so two finishes fill one cell, not two", () => {
    // `finish` is in the primary key, so an unpinned card arrives as a foil row and a
    // nonfoil row. Letting each claim a cell would over-claim ownership of a printing
    // the holding says nothing about.
    const printings = [p("262", { oracleId: "o-p" }), p("268", { oracleId: "o-p" })];
    // Foil FIRST on purpose: a collapse that keeps one finish would keep this one and
    // mark the cell foil-only, and the reverse order would hide that by luck.
    const cells = placeCells(printings, [
      held({ oracleId: "o-p", collectorNumber: "", finish: "foil" }),
      held({ oracleId: "o-p", collectorNumber: "", finish: "nonfoil" }),
    ]);
    expect(cells.map((c) => c.owned)).toEqual([true, false]);
    // …and the cell is NOT foil-only: both finishes are carried onto it, so collapsing
    // never turns "I hold this in two finishes" into "I only hold the foil".
    expect(cells[0].foilOnly).toBe(false);
  });

  it("marks an unpinned cell foil-only when foil is genuinely all that is held", () => {
    const cells = placeCells([p("1")], [held({ collectorNumber: "", finish: "foil" })]);
    expect(cells[0].foilOnly).toBe(true);
  });

  it("lets a pinned holding keep its own cell when an unpinned one could have taken it", () => {
    const printings = [p("262", { oracleId: "o-p" }), p("268", { oracleId: "o-p" })];
    const cells = placeCells(printings, [
      held({ oracleId: "o-p", collectorNumber: "268" }),
      held({ oracleId: "o-p", collectorNumber: "" }),
    ]);
    expect(cells.map((c) => c.owned)).toEqual([true, true]);
    expect(cells[1].byName).toBe(false);
    expect(cells[0].byName).toBe(true);
  });

  it("any finish fills the cell, and foil-only is marked", () => {
    const cells = placeCells([p("1")], [held({ finish: "foil" })]);
    expect(cells[0].owned).toBe(true);
    expect(cells[0].foilOnly).toBe(true);
  });

  it("is not foil-only when both finishes are held", () => {
    const cells = placeCells([p("1")],
      [held({ finish: "foil" }), held({ finish: "nonfoil" })]);
    expect(cells[0].foilOnly).toBe(false);
  });

  it("ignores a holding for a card this set does not contain", () => {
    const cells = placeCells([p("1")], [held({ oracleId: "o-elsewhere" })]);
    expect(cells[0].owned).toBe(false);
  });

  it("orders cells by collector number numerically, not lexically", () => {
    const cells = placeCells([p("10"), p("2"), p("1")], []);
    expect(cells.map((c) => c.collectorNumber)).toEqual(["1", "2", "10"]);
  });

  it("sorts a non-numeric collector number last", () => {
    const cells = placeCells([p("★"), p("2")], []);
    expect(cells.map((c) => c.collectorNumber)).toEqual(["2", "★"]);
  });
});

describe("sectionsOf", () => {
  it("splits on the booster flag and counts each side apart", () => {
    const s = sectionsOf(placeCells(
      [p("1"), p("2"), p("277", { booster: false })],
      [held({})],
    ));
    expect([s.baseOwned, s.baseTotal]).toEqual([1, 2]);
    expect([s.extrasOwned, s.extrasTotal]).toEqual([0, 1]);
    expect(s.percent).toBe(50);
  });

  it("never folds an owned extra into the headline percent", () => {
    const s = sectionsOf(placeCells(
      [p("1"), p("277", { booster: false })],
      [held({ oracleId: "o-277", collectorNumber: "277" })],
    ));
    expect(s.percent).toBe(0);
    expect(s.extrasOwned).toBe(1);
  });

  it("reads a set whose printings are all unclassified as not indexed", () => {
    const s = sectionsOf(placeCells([p("1", { booster: null })], []));
    expect(s.indexed).toBe(false);
    expect(s.percent).toBeNull();
  });

  it("reports 100 percent when every base cell is filled, extras or not", () => {
    const s = sectionsOf(placeCells(
      [p("1"), p("277", { booster: false })],
      [held({})],
    ));
    expect(s.percent).toBe(100);
  });

  it("rounds rather than truncating", () => {
    const s = sectionsOf(placeCells([p("1"), p("2"), p("3")], [held({})]));
    expect(s.percent).toBe(33);
  });

  it("splits a Commander product on isVariant, since none of it is in a booster", () => {
    const s = sectionsOf(placeCells([
      p("1", { booster: false }),
      p("2", { booster: false }),
      p("3", { booster: false, isVariant: true }),
    ], []));
    expect(s.baseTotal).toBe(2);
    expect(s.extrasTotal).toBe(1);
    expect(s.percent).toBe(0);
  });

  it("shows the owned count for a set with no base run at all, not `not indexed`", () => {
    // Every printing in a masterpiece bonus sheet (Edge of Eternities: Stellar Sights) is a
    // variant, so `baseSetSizeOf` has published null for it — not a backlog, a permanent
    // fact about the product — and `baseSetSize` arrives here null. The rows are still
    // classified (`booster` is not null), so the owned count is safe to show.
    const cells = placeCells([
      p("1", { booster: false, isVariant: true }),
      p("2", { booster: false, isVariant: true }),
      p("3", { booster: false, isVariant: true }),
    ], [held({ oracleId: "o-1", collectorNumber: "1" })]);
    const s = sectionsOf(cells, null);
    expect(s.indexed).toBe(false);
    expect(s.percent).toBeNull();
    expect(s.baseTotal).toBe(0);
    expect(s.extrasTotal).toBe(3);
    expect(s.extrasOwned).toBe(1);
  });

  it("still reports nothing extra for a genuinely unclassified set — that stays not-indexed", () => {
    // The booster-eligible default means every row here is "in base" once classified, so
    // there is nothing for the new branch to surface — this is the ordinary not-yet-indexed
    // case, unchanged.
    const cells = placeCells([p("1"), p("2")], [held({})]);
    const s = sectionsOf(cells, null);
    expect(s.indexed).toBe(false);
    expect(s.extrasTotal).toBe(0);
  });

  it("does not drop owned base cards for a normal set mid-refresh with a null denominator", () => {
    // Caught in review (PR #1274 round 1): a set still being classified can have BOTH base
    // and variant rows among what has landed so far, with `base_set_size` not yet written.
    // `extrasOnly` must not fire here — it would populate `extras` from the variant row
    // alone and report that as the owned count, silently dropping the two owned base cards.
    const cells = placeCells([
      p("1"),
      p("2"),
      p("277", { booster: false, isVariant: true }),
    ], [held({ oracleId: "o-1", collectorNumber: "1" }), held({ oracleId: "o-2", collectorNumber: "2" })]);
    const s = sectionsOf(cells, null);
    expect(s.indexed).toBe(false);
    expect(s.baseTotal).toBe(0);
    expect(s.extrasTotal).toBe(0);
    expect(s.extrasOwned).toBe(0);
  });
});

describe("orderWithSubsetsAfterParent", () => {
  const row = (code: string, parentSetCode: string | null = null) => ({ code, parentSetCode });

  it("moves a subset to sit directly after its held parent", () => {
    const rows = [row("eoe"), row("woe"), row("eos", "eoe")];
    expect(orderWithSubsetsAfterParent(rows).map((r) => r.code)).toEqual(["eoe", "eos", "woe"]);
  });

  it("leaves a subset in its newest-first slot when its parent is not held", () => {
    const rows = [row("ptkdf", "dtk"), row("woe")];
    expect(orderWithSubsetsAfterParent(rows).map((r) => r.code)).toEqual(["ptkdf", "woe"]);
  });

  it("keeps every other row exactly where newest-first order put it", () => {
    const rows = [row("a"), row("b"), row("c")];
    expect(orderWithSubsetsAfterParent(rows).map((r) => r.code)).toEqual(["a", "b", "c"]);
  });

  it("groups more than one subset under the same parent, each right after it", () => {
    const rows = [row("eoe"), row("woe"), row("eos", "eoe"), row("otp", "eoe")];
    expect(orderWithSubsetsAfterParent(rows).map((r) => r.code))
      .toEqual(["eoe", "eos", "otp", "woe"]);
  });

  it("never drops or duplicates a row, even with a cycle", () => {
    const rows = [row("a", "b"), row("b", "a")];
    const out = orderWithSubsetsAfterParent(rows);
    expect(out.map((r) => r.code).sort()).toEqual(["a", "b"]);
  });
});

describe("sectionsOf against the authoritative denominator", () => {
  it("reads a set as not indexed when the column is null, however many rows are classified", () => {
    // A null denominator beside classified rows is a set no run has ever published a base
    // run for — since #704 the column is written by one transaction at the end of the
    // ingest, so a half-finished run leaves the previous figure rather than a null. Either
    // way, inferring from the rows alone would render a partial base run and a percentage
    // computed from it.
    const cells = placeCells([p("1"), p("2")], [held({})]);
    expect(sectionsOf(cells, null).indexed).toBe(false);
    expect(sectionsOf(cells, null).percent).toBeNull();
  });

  it("uses the rows when a denominator is given", () => {
    const cells = placeCells([p("1"), p("2")], [held({})]);
    expect(sectionsOf(cells, 2).percent).toBe(50);
  });
});

describe("placeCells at catalogue scale", () => {
  it("places a large set without scanning per holding", () => {
    // Placement runs for every held set when the index is built, so a linear scan per
    // holding made it printings x holdings. This is a guard against that returning.
    const printings = Array.from({ length: 3000 }, (_, i) => p(String(i + 1)));
    const holdings = Array.from({ length: 1500 }, (_, i) =>
      held({ oracleId: `o-${i + 1}`, collectorNumber: String(i + 1) }));
    const started = performance.now();
    const cells = placeCells(printings, holdings);
    expect(cells.filter((c) => c.owned)).toHaveLength(1500);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe("completion is a count, not a rounding", () => {
  it("does not call 275 of 276 complete, though it displays as 100%", () => {
    // Gating on the rounded percentage hid Missing-only and flipped the cost strip to the
    // extras on a set that was still missing a card.
    const printings = Array.from({ length: 276 }, (_, i) => p(String(i + 1)));
    const holdings = Array.from({ length: 275 }, (_, i) =>
      held({ oracleId: `o-${i + 1}`, collectorNumber: String(i + 1) }));
    const s = sectionsOf(placeCells(printings, holdings), 276);
    expect(s.percent).toBe(100);
    expect(s.complete).toBe(false);
  });

  it("calls a genuinely full base run complete", () => {
    const cells = placeCells([p("1"), p("2")], [
      held({ oracleId: "o-1", collectorNumber: "1" }),
      held({ oracleId: "o-2", collectorNumber: "2" }),
    ]);
    expect(sectionsOf(cells, 2).complete).toBe(true);
  });
});

describe("placeCells honours a chosen printing", () => {
  const plains = [p("262", { oracleId: "o-p" }), p("268", { oracleId: "o-p" })];

  it("fills the cell the reader picked, not the lowest one", () => {
    // Picking #268 in the modal is the reader saying which printing they hold. Without
    // this the fill stayed on #262 and the swap the page exists to show never happened.
    const cells = placeCells(
      plains,
      [held({ oracleId: "o-p", collectorNumber: "" })],
      [{ oracleId: "o-p", collectorNumber: "268" }],
    );
    expect(cells.map((c) => c.owned)).toEqual([false, true]);
  });

  it("does not mark a picked cell by name — the reader chose it", () => {
    const cells = placeCells(
      plains,
      [held({ oracleId: "o-p", collectorNumber: "" })],
      [{ oracleId: "o-p", collectorNumber: "268" }],
    );
    expect(cells[1].byName).toBe(false);
  });

  it("still marks an unpicked fill by name", () => {
    const cells = placeCells(plains, [held({ oracleId: "o-p", collectorNumber: "" })]);
    expect(cells[0].byName).toBe(true);
  });

  it("ignores a pick for a printing this set does not contain", () => {
    const cells = placeCells(
      plains,
      [held({ oracleId: "o-p", collectorNumber: "" })],
      [{ oracleId: "o-p", collectorNumber: "999" }],
    );
    expect(cells.map((c) => c.owned)).toEqual([true, false]);
  });
});

describe("the denominator has to agree with the rows", () => {
  it("reads a set as unindexed when the column and the catalog disagree", () => {
    // Metadata and printings are read in separate statements, so a rebuild can hand back
    // the previous denominator beside a partially rewritten catalog. A ratio from that
    // pairs a numerator and a denominator describing different runs.
    const cells = placeCells([p("1"), p("2")], []);
    expect(sectionsOf(cells, 276).indexed).toBe(false);
    expect(sectionsOf(cells, 276).percent).toBeNull();
  });

  it("reads it as indexed when they agree", () => {
    const cells = placeCells([p("1"), p("2")], []);
    expect(sectionsOf(cells, 2).indexed).toBe(true);
  });

  it("still counts extras apart when base and denominator agree", () => {
    const cells = placeCells([p("1"), p("277", { booster: false })], []);
    const s = sectionsOf(cells, 1);
    expect(s.indexed).toBe(true);
    expect([s.baseTotal, s.extrasTotal]).toEqual([1, 1]);
  });
});

describe("fingerprintOf", () => {
  it("does not move when only the catalog changes", () => {
    // The page's baseline can be an hour-old cached payload, so a fingerprint taken from
    // placed cells would shift under a catalog refresh and the strip would announce an
    // upload the reader never made.
    const holdings = [held({ oracleId: "o-1", collectorNumber: "1" })];
    expect(fingerprintOf(holdings)).toBe(fingerprintOf(holdings));
  });

  it("moves when a holding is added", () => {
    const before = fingerprintOf([held({ oracleId: "o-1", collectorNumber: "1" })]);
    const after = fingerprintOf([
      held({ oracleId: "o-1", collectorNumber: "1" }),
      held({ oracleId: "o-2", collectorNumber: "2" }),
    ]);
    expect(after).not.toBe(before);
  });

  it("moves when a finish changes", () => {
    expect(fingerprintOf([held({ finish: "foil" })]))
      .not.toBe(fingerprintOf([held({ finish: "nonfoil" })]));
  });

  it("moves when a printing is picked", () => {
    const holdings = [held({ oracleId: "o-p", collectorNumber: "" })];
    expect(fingerprintOf(holdings, [{ oracleId: "o-p", collectorNumber: "268" }]))
      .not.toBe(fingerprintOf(holdings));
  });

  it("does not depend on the order rows came back in", () => {
    const a = [held({ oracleId: "o-1", collectorNumber: "1" }), held({ oracleId: "o-2", collectorNumber: "2" })];
    expect(fingerprintOf(a)).toBe(fingerprintOf([...a].reverse()));
  });
});

describe("a zero denominator is not a denominator", () => {
  it("returns null for a classified set whose rows are all variants", () => {
    // 0 reads as an indexed set that is complete and empty at once: the grid renders
    // 0 / 0 and the index applies the success treatment.
    expect(baseSetSizeOf([
      row({ booster: false, isVariant: true }),
      row({ booster: false, isVariant: true }),
    ])).toBeNull();
  });
});

describe("holdingCountOf", () => {
  it("counts holdings and not picks", () => {
    // A pick changes which cell is filled; it is not a card gained or lost, and counting
    // it made the strip say one had been.
    const holdings = [held({ oracleId: "o-1", collectorNumber: "" })];
    const before = fingerprintOf(holdings);
    const after = fingerprintOf(holdings, [{ oracleId: "o-1", collectorNumber: "268" }]);
    expect(after).not.toBe(before);
    expect(holdingCountOf(after)).toBe(holdingCountOf(before));
  });

  it("counts nothing for an empty fingerprint", () => {
    expect(holdingCountOf(fingerprintOf([]))).toBe(0);
  });
});

describe("a zero in the column is still not a denominator", () => {
  it("does not read baseSetSize 0 as indexed, whatever wrote it", () => {
    // The writer stores null for a set with no base run, but the column carries no
    // constraint: a legacy or hand-written zero matched an empty base run and rendered an
    // indexed 0 / 0.
    const cells = placeCells([p("1", { booster: false, isVariant: true })], []);
    expect(sectionsOf(cells, 0).indexed).toBe(false);
    expect(sectionsOf(cells, 0).percent).toBeNull();
  });
});

describe("holdingCountOf counts cells, not rows", () => {
  it("does not call a second finish of an owned card a new card", () => {
    // The grid collapses nonfoil, foil and etched into one owned cell, so counting rows
    // made adding a foil copy report that a card had arrived.
    const one = fingerprintOf([held({ oracleId: "o-1", collectorNumber: "1" })]);
    const both = fingerprintOf([
      held({ oracleId: "o-1", collectorNumber: "1", finish: "nonfoil" }),
      held({ oracleId: "o-1", collectorNumber: "1", finish: "foil" }),
    ]);
    expect(both).not.toBe(one);
    expect(holdingCountOf(both)).toBe(holdingCountOf(one));
  });

  it("still counts two different printings as two", () => {
    const two = fingerprintOf([
      held({ oracleId: "o-1", collectorNumber: "1" }),
      held({ oracleId: "o-2", collectorNumber: "2" }),
    ]);
    expect(holdingCountOf(two)).toBe(2);
  });
});
