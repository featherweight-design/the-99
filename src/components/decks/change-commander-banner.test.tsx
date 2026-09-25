import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { COMMITTED } from "./__fixtures__/draft-state";
import type { DraftState } from "../../lib/decks/draft-shape";

vi.mock("../../app/decks/actions", () => ({ discardDeckDraft: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { PendingBanner } = await import("./pending-banner");
const { commanderZoneHint } = await import("./change-commander-banner");

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
    expect(screen.getByTestId("banner-commander-sentence").textContent).toContain("Prosper replaces Korvold as commander.");
    expect(screen.queryByTestId("banner-commander-line")).toBeNull();
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
