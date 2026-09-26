import { describe, expect, it } from "vitest";
import { filePrintedIn, type LanePrintedIn } from "../sets/printed-in";
import { laneOracleIds, mergeSets, printedInOptions } from "./printed-in-lane";

describe("laneOracleIds", () => {
  it("lists every id once, first list first, skipping a missing list", () => {
    expect(
      laneOracleIds([{ oracleId: "a" }, { oracleId: "b" }], null, [{ oracleId: "b" }, { oracleId: "c" }]),
    ).toEqual(["a", "b", "c"]);
  });
});

describe("printedInOptions", () => {
  const shipped: LanePrintedIn = {
    sets: [
      { code: "hob", name: "Hobbits" },
      { code: "cmm", name: "Commander Masters" },
      { code: "one", name: "Elsewhere" },
    ],
    rows: [[0, 1], [1], [0]],
  };
  const filed = filePrintedIn(new Map(), ["a", "b", "c"], shipped);
  const lane = ["a", "b", "c"];

  it("counts the rows the other controls left, per set, newest first", () => {
    expect(printedInOptions(shipped.sets, filed, lane, ["a", "b"], [])).toEqual([
      { code: "hob", label: "Hobbits", hint: "HOB", count: 1, disabled: false },
      { code: "cmm", label: "Commander Masters", hint: "CMM", count: 2, disabled: false },
    ]);
  });

  it("lists only sets a row on the lane was printed in, unless the reader chose one", () => {
    expect(printedInOptions(shipped.sets, filed, lane, lane, []).map((o) => o.code)).toEqual(["hob", "cmm"]);
    expect(printedInOptions(shipped.sets, filed, lane, lane, ["one"]).map((o) => o.code)).toEqual([
      "hob",
      "cmm",
      "one",
    ]);
  });

  it("disables a set the other controls leave nothing in, unless it is already chosen", () => {
    expect(printedInOptions(shipped.sets, filed, lane, ["b"], [])[0]).toMatchObject({ count: 0, disabled: true });
    expect(printedInOptions(shipped.sets, filed, lane, ["b"], ["hob"])[0]).toMatchObject({ count: 0, disabled: false });
  });
});

describe("mergeSets", () => {
  it("keeps the newer order and appends what only the older list named", () => {
    const a = { code: "a", name: "A" };
    const b = { code: "b", name: "B" };
    const c = { code: "c", name: "C" };
    expect(mergeSets([a, c], [a, b, c])).toEqual([a, c, b]);
  });
});
