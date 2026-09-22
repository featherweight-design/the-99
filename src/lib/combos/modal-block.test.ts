import { describe, expect, it } from "vitest";
import { orderModalPartners, summariseByState } from "./modal-block";
import type { ModalComboPartner } from "./near-miss";

const p = (over: Partial<ModalComboPartner> = {}): ModalComboPartner => ({
  oracleId: "p-1",
  name: "Partner",
  state: "owned",
  popularity: 100,
  ...over,
});

describe("orderModalPartners", () => {
  // THE CAP MUST NEVER HIDE A PARTNER ALREADY ON THE TABLE in favour of one you would have to
  // buy — the one truncation that would actually mislead a reader.
  it("bands by state before it looks at popularity", () => {
    const out = orderModalPartners([
      p({ oracleId: "a", state: "notOwned", popularity: 9999 }),
      p({ oracleId: "b", state: "owned", popularity: 1 }),
      p({ oracleId: "c", state: "inDeck", popularity: 0 }),
    ]);
    expect(out.map((x) => x.oracleId)).toEqual(["c", "b", "a"]);
  });

  it("orders by popularity inside a band", () => {
    const out = orderModalPartners([
      p({ oracleId: "low", state: "owned", popularity: 1 }),
      p({ oracleId: "high", state: "owned", popularity: 900 }),
    ]);
    expect(out.map((x) => x.oracleId)).toEqual(["high", "low"]);
  });

  // STABLE ACROSS RELOADS. Two partners tied on state and popularity must not swap between
  // two reads of a collection that did not move.
  it("breaks a full tie deterministically, both ways round", () => {
    const a = p({ oracleId: "aaa", popularity: 5 });
    const b = p({ oracleId: "bbb", popularity: 5 });
    expect(orderModalPartners([a, b]).map((x) => x.oracleId)).toEqual(["aaa", "bbb"]);
    expect(orderModalPartners([b, a]).map((x) => x.oracleId)).toEqual(["aaa", "bbb"]);
  });

  it("sorts a null popularity below a known one", () => {
    const out = orderModalPartners([
      p({ oracleId: "unknown", popularity: null }),
      p({ oracleId: "known", popularity: 1 }),
    ]);
    expect(out.map((x) => x.oracleId)).toEqual(["known", "unknown"]);
  });
});

describe("summariseByState", () => {
  // THE ORDER IS THE ROW'S: in deck, then owned, then unowned. `in this deck` leads because
  // it is the only part that is ever urgent — it is what decides whether to open the block.
  it("counts in the row's own order", () => {
    const out = summariseByState([
      p({ oracleId: "a", state: "notOwned" }),
      p({ oracleId: "b", state: "inDeck" }),
      p({ oracleId: "c", state: "owned" }),
      p({ oracleId: "d", state: "notOwned" }),
    ]);
    expect(out).toEqual([
      { state: "inDeck", count: 1 },
      { state: "owned", count: 1 },
      { state: "notOwned", count: 2 },
    ]);
  });

  // A STATE WITH A COUNT OF ZERO IS NOT DRAWN: `4 you don't` alone, or
  // `1 in this deck · 4 you don't` — never `0 you own`. A zero is a state the reader does not
  // have, and printing it spends a third of the line saying so.
  it("omits every state it has none of", () => {
    expect(summariseByState([p({ state: "notOwned" })])).toEqual([
      { state: "notOwned", count: 1 },
    ]);
    expect(summariseByState([])).toEqual([]);
  });
});
