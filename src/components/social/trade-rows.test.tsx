// The Trades rows' diamond (boards L1 and RH): it marks an offer to answer, Trade offer and Countered, and no other row,
// not even the rows that wait on the reader (Needs a look, Accepted, Traded by them), which carry their own kicker ink.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { named } from "../../lib/person-name/mint";
import type { TradeListRow } from "../../lib/social/trade-reads";
import type { RowState } from "../../lib/social/trade-rules";
import { TradeRows } from "./trade-rows";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../app/friends/trade-actions", () => ({ clearTradeAction: vi.fn(), markTradedAction: vi.fn() }));
vi.mock("../../app/friends/spare-actions", () => ({}));

const NOW = new Date("2026-11-27T12:00:00Z");
const STATES: [RowState, boolean][] = [
  ["offer", true], ["countered", true], ["look", true], ["accepted", true], ["themMarked", true],
  ["offered", false], ["youMarked", false], ["traded", false], ["declined", false], ["withdrawn", false], ["rescinded", false], ["expired", false],
];
const row = (state: RowState, waitsOnYou: boolean): TradeListRow => ({
  id: state, friend: { publicId: `f-${state}`, displayName: named("Colin"), commander: null },
  row: { state, waitsOnYou, byYou: false }, status: "open" as TradeListRow["status"],
  theirs: ["Ghalta"], yours: ["Lathliss"], theirImage: null, yourImage: null, goneName: "Giada",
  daysLeft: 9, createdAt: NOW, at: NOW,
} as TradeListRow);

afterEach(cleanup);

describe("TradeRows", () => {
  it("draws the diamond on Trade offer and Countered only", () => {
    render(<TradeRows rows={STATES.map(([s, w]) => row(s, w))} now={NOW} onOpen={() => {}} />);
    const marked = screen.getAllByTestId("trade-row").filter((li) => li.querySelector(".rotate-45")).map((li) => li.dataset.rowState);
    expect(marked).toEqual(["offer", "countered"]);
  });
});
