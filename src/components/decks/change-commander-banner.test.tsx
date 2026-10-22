import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { COMMITTED } from "./__fixtures__/draft-state";
import type { DraftState } from "../../lib/decks/draft-shape";

vi.mock("../../app/decks/actions", () => ({ discardDeckDraft: vi.fn(), fillDeck: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { PendingRow } = await import("./todo-card");
const { commanderZoneHint } = await import("./change-commander-banner");
const { ChangeCommanderProvider, useChangeCommander } = await import("./change-commander-context");
const { deckVersioningCopy } = await import("../../lib/copy/deck-versioning");

const single = (id: string) => ({ commanderOracleId: id, partnerOracleId: null });
const names = new Map([["korvold", "Korvold, Fae-Cursed King"], ["prosper", "Prosper, Tome-Bound"]]);
const swapped = (over: Partial<DraftState> = {}): DraftState => ({
  ...COMMITTED,
  names,
  commander: { from: single("korvold"), to: single("prosper") },
  commanderRows: { rows: [], newestAsOf: null },
  ...over,
});

// The pending banner's commander line retired with its card: the deck page's pending row counts the
// move as one change, and Review names it. What the sheet still needs from the deck page is somewhere
// for focus to land once its write is announced, and that is the row.
describe("focus after a change lands", () => {
  /** What the sheet does after a write: announce, which raises the focus flag. */
  function Announce() {
    const door = useChangeCommander();
    useEffect(() => { door?.announce("done"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  }
  const mount = (state: DraftState | null) => (
    <ChangeCommanderProvider deckId="d1" deckName="Jund" pair={false} hasVersion>
      <Announce />
      {state && <PendingRow state={state} deckId="d1" next />}
    </ChangeCommanderProvider>
  );
  const title = () => screen.getByText(deckVersioningCopy.pending.since(1, 1));

  it("lands on the pending row's title", () => {
    render(mount(swapped()));
    expect(document.activeElement).toBe(title());
  });

  it("lands on the row when the refreshed state draws it after the announcement", () => {
    // The announcement arrives before the refreshed draft draws the row: the hook runs on mount.
    const { rerender } = render(mount(null));
    rerender(mount(swapped()));
    expect(document.activeElement).toBe(title());
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
