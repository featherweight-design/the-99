import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { COMMITTED } from "./__fixtures__/draft-state";
import type { DraftState } from "../../lib/decks/draft-shape";
import { CommanderSection } from "./change-commander-review";

const row = (oracleId: string, name: string, side: "from" | "to") =>
  ({ oracleId, name, artCropUri: null, side, buy: false, price: null });
const pairState = (over: Partial<DraftState> = {}): DraftState => ({
  ...COMMITTED,
  commander: {
    from: { commanderOracleId: "thrasios", partnerOracleId: "tymna" },
    to: { commanderOracleId: "ishai", partnerOracleId: "reyhan" },
  },
  commanderRows: {
    rows: [
      row("thrasios", "Thrasios, Triton Hero", "from"), row("tymna", "Tymna the Weaver", "from"),
      row("ishai", "Ishai, Ojutai Dragonspeaker", "to"), row("reyhan", "Reyhan, Last of the Abzan", "to"),
    ],
    newestAsOf: null,
  },
  ...over,
});

describe("the review page's Commander note", () => {
  it("names the half-trade's two fates, one clause each", () => {
    render(<CommanderSection state={pairState({
      addChanges: [{ oracleId: "thrasios", from: 0, to: 1 }],
      removes: [{ oracleId: "reyhan", from: 1, to: 0 }],
    })} />);
    const note = screen.getByText(/trade places ·/).parentElement!;
    expect(note.textContent).toBe("Thrasios and Reyhan trade places · Tymna the Weaver goes back in the pool when you commit");
    // Two inline blocks, so a narrow note breaks at the middot and not inside a clause.
    expect(note.querySelectorAll(":scope > .inline-block")).toHaveLength(2);
  });

  it("keeps the pair's pool note for an ordinary pair swap, where nothing comes out of the 98", () => {
    render(<CommanderSection state={pairState()} />);
    expect(screen.getByText("Thrasios and Tymna the Weaver go back in the pool when you commit")).toBeTruthy();
  });

  it("is not a half-trade when an old half was added back by hand but nothing came out of the 98", () => {
    render(<CommanderSection state={pairState({ addChanges: [{ oracleId: "thrasios", from: 0, to: 1 }] })} />);
    expect(screen.queryByText(/trade places ·/)).toBeNull();
  });
});
