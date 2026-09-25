import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { COMMITTED } from "./__fixtures__/draft-state";
import type { DraftState } from "../../lib/decks/draft-shape";

vi.mock("../../app/decks/actions", () => ({ discardDeckDraft: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { PendingBanner } = await import("./pending-banner");
const { commanderZoneHint } = await import("./change-commander-banner");
const { ChangeCommanderProvider, useChangeCommander } = await import("./change-commander-context");

const single = (id: string) => ({ commanderOracleId: id, partnerOracleId: null });
const names = new Map([["korvold", "Korvold, Fae-Cursed King"], ["prosper", "Prosper, Tome-Bound"]]);
const swapped = (over: Partial<DraftState> = {}): DraftState => ({
  ...COMMITTED,
  names,
  commander: { from: single("korvold"), to: single("prosper") },
  commanderRows: { rows: [], newestAsOf: null },
  ...over,
});

describe("the pending banner's commander line", () => {
  it("draws a lone swap as its own line, with no card figure", () => {
    render(<PendingBanner state={swapped()} deckId="d1" versionCards={99} />);
    const line = screen.getByTestId("banner-commander-line");
    expect(line.textContent).toContain("Korvold, Fae-Cursed King → Prosper, Tome-Bound");
    expect(line.textContent).toContain("commander");
    expect(screen.queryByText(/^\+\d/)).toBeNull();
  });

  it("draws nothing for a draft whose commander did not move", () => {
    render(<PendingBanner state={{ ...COMMITTED, commander: null }} deckId="d1" versionCards={99} />);
    expect(screen.queryByTestId("banner-commander-line")).toBeNull();
    expect(screen.queryByTestId("banner-commander-sentence")).toBeNull();
  });

  it("says the swap in a sentence above the money line when the draft is long", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ oracleId: `c${i}`, from: 0, to: 1 }));
    render(
      <PendingBanner
        state={swapped({
          addChanges: many,
          adds: many.map((c) => ({ ...c, bucket: "free" as const, shortfall: 0, needed: 1, heldBy: [] })),
        })}
        deckId="d1"
        versionCards={99}
      />,
    );
    const sentence = screen.getByTestId("banner-commander-sentence");
    expect(sentence.textContent).toContain("Prosper replaces Korvold as commander.");
    expect(screen.queryByTestId("banner-commander-line")).toBeNull();
    // Above the money line, which this draft draws (every add has a spare copy).
    const money = screen.getByText(/spare cop/);
    expect(sentence.compareDocumentPosition(money) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("focus after a change lands", () => {
  const long = () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ oracleId: `c${i}`, from: 0, to: 1 }));
    return swapped({
      addChanges: many,
      adds: many.map((c) => ({ ...c, bucket: "free" as const, shortfall: 0, needed: 1, heldBy: [] })),
    });
  };
  /** What the sheet does after a write: announce, which raises the focus flag. */
  function Announce() {
    const door = useChangeCommander();
    useEffect(() => { door?.announce("done"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  }
  const mount = (state: DraftState) => (
    <ChangeCommanderProvider deckId="d1" deckName="Jund" pair={false} hasVersion>
      <Announce />
      <PendingBanner state={state} deckId="d1" versionCards={99} />
    </ChangeCommanderProvider>
  );

  it("lands on the counts sentence when the banner draws counts", () => {
    render(mount(long()));
    expect(document.activeElement).toBe(screen.getByTestId("banner-commander-sentence"));
  });

  it("lands on the line when the refreshed state draws it after the announcement", () => {
    // A card change already on the draft, so the banner (and the line's slot in it) is mounted
    // before the swap: the line's hook runs with nothing to focus, then must run again.
    const card = { oracleId: "c1", from: 0, to: 1 };
    const cards = { addChanges: [card], adds: [{ ...card, bucket: "free" as const, shortfall: 0, needed: 1, heldBy: [] }] };
    const { rerender } = render(mount({ ...swapped(cards), commander: null, commanderRows: null }));
    expect(screen.getByText(/pending changes/i)).toBeTruthy();
    expect(screen.queryByTestId("banner-commander-line")).toBeNull();
    rerender(mount(swapped(cards)));
    expect(document.activeElement).toBe(screen.getByTestId("banner-commander-line"));
  });
});

describe("commanderZoneHint", () => {
  it("names which way a traded card moved through the command zone", () => {
    const s = swapped();
    expect(commanderZoneHint(s, "korvold", true)).toBe("from the command zone");
    expect(commanderZoneHint(s, "prosper", false)).toBe("to the command zone");
    expect(commanderZoneHint(s, "other", true)).toBeNull();
    expect(commanderZoneHint({ ...s, commander: null }, "korvold", true)).toBeNull();
  });
});

describe("commanderBackClause", () => {
  it("names the old commander back, and says nothing without a move", async () => {
    const { commanderBackClause } = await import("./change-commander-banner");
    expect(commanderBackClause(swapped())).toBe("Korvold leads it again.");
    expect(commanderBackClause({ ...COMMITTED, commander: null })).toBeNull();
  });
});

describe("Discard on a commander-only draft", () => {
  it("states the version and the commander coming back, with no empty card clause", async () => {
    const { DiscardConfirm } = await import("./discard-draft");
    render(<DiscardConfirm deckId="d1" state={swapped()} versionCards={99} onCancel={() => {}} />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("99 cards. Korvold leads it again.");
    expect(text).not.toContain("not stored anywhere");
    expect(text).not.toMatch(/\.\s{2}/);
  });
});

describe("commanderBackClause for a pair", () => {
  it("takes the plural", async () => {
    const { commanderBackClause } = await import("./change-commander-banner");
    const state = swapped({
      names: new Map([["a", "Tymna the Weaver"], ["b", "Thrasios, Triton Hero"], ["c", "Kraum"], ["d", "Tana"]]),
      commander: {
        from: { commanderOracleId: "a", partnerOracleId: "b" },
        to: { commanderOracleId: "c", partnerOracleId: "d" },
      },
    });
    expect(commanderBackClause(state)).toBe("Tymna the Weaver and Thrasios lead it again.");
  });
});
