import { describe, expect, it } from "vitest";
import {
  capModalPartners,
  MODAL_COMBO_CAP_DESKTOP,
  MODAL_COMBO_CAP_PHONE,
  orderModalPartners,
} from "./modal-block";
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

describe("capModalPartners", () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      p({ oracleId: `p${String(i).padStart(2, "0")}`, popularity: 1000 - i }),
    );

  // THE COMMON CASE HAS NO DISCLOSURE AT ALL: 49% of pieces have exactly one partner, and the
  // median is two.
  it("draws everything and discloses nothing below the cap", () => {
    const out = capModalPartners(many(2), { desktop: true, expanded: false });
    expect(out.shown).toHaveLength(2);
    expect(out.hidden).toBe(0);
  });

  // A list EXACTLY at the cap draws in full rather than showing `+0 more`, which would be a
  // disclosure that discloses nothing.
  it("does not disclose at exactly the cap", () => {
    const out = capModalPartners(many(MODAL_COMBO_CAP_DESKTOP), {
      desktop: true,
      expanded: false,
    });
    expect(out.shown).toHaveLength(MODAL_COMBO_CAP_DESKTOP);
    expect(out.hidden).toBe(0);
  });

  it("caps at six on desktop and four on the phone", () => {
    expect(capModalPartners(many(10), { desktop: true, expanded: false })).toMatchObject({
      hidden: 10 - MODAL_COMBO_CAP_DESKTOP,
    });
    expect(capModalPartners(many(10), { desktop: false, expanded: false })).toMatchObject({
      hidden: 10 - MODAL_COMBO_CAP_PHONE,
    });
  });

  // EXPANDED, THE BLOCK GROWS IN PLACE — it does not scroll inside itself and does not open a
  // second surface.
  it("shows everything once expanded, at either width", () => {
    for (const desktop of [true, false]) {
      const out = capModalPartners(many(20), { desktop, expanded: true });
      expect(out.shown).toHaveLength(20);
      expect(out.hidden).toBe(0);
    }
  });

  // THE CAP IS APPLIED TO THE ORDERED LIST, never to the order it arrived in — otherwise the
  // truncation hides exactly the partners the ordering exists to protect.
  it("keeps the in-deck partner when the cap bites", () => {
    const filler = many(MODAL_COMBO_CAP_DESKTOP + 3).map((x) => ({
      ...x,
      state: "notOwned" as const,
    }));
    const out = capModalPartners(
      [...filler, p({ oracleId: "z-in-deck", state: "inDeck", popularity: 0 })],
      { desktop: true, expanded: false },
    );
    expect(out.shown[0].oracleId).toBe("z-in-deck");
  });
});
