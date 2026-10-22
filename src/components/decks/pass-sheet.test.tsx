import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { topOffCopy } from "../../lib/copy/top-off";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { FillPassSummary } from "../../lib/decks/fill-passes";

vi.mock("../../app/decks/actions", () => ({ undoFillPass: vi.fn() }));
// The rows are the list's own and are proved with it; this file proves the frame around them.
vi.mock("./decklist-row", () => ({ DecklistRow: () => null }));
vi.mock("./decklist-group-header", () => ({ DecklistGroupHeader: () => null }));
vi.mock("./hover-preview", () => ({ HoverPreviewProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ registerSheet: () => () => {}, openOracleId: null, revealing: false }), CardDetailTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</> }));

const { PassSheet } = await import("./pass-sheet");
const ledger = topOffCopy.ledger;

const card = (id: string): DeckDetailCard =>
  ({ oracleId: id, name: `Card ${id}`, typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp", owned: true, quantity: 1, auto: true, availability: null }) as DeckDetailCard;

const pass = (kind: FillPassSummary["kind"], live: number): FillPassSummary => ({
  id: "p1",
  kind,
  ordinal: 1,
  createdAt: new Date("2026-01-01"),
  live,
  kept: 0,
  removed: 0,
  openSlots: 5,
  liveCards: ["a", "b", "c"].map((oracleId) => ({ oracleId, quantity: 1 })),
});

function draw(p: FillPassSummary) {
  return render(
    <PassSheet
      target={{ kind: "pass", passId: "p1" }}
      deckId="d"
      cards={["a", "b", "c"].map(card)}
      passes={[p]}
      bodySize={99}
      newestAsOf={null}
      onAnnounce={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe("PassSheet (one pass)", () => {
  it("offers Undo on a top-off, and the title and the Undo draw the server's figure", () => {
    // 3 cards still listed, 2 live on the server (a ✕ in flight): one figure, not two.
    draw(pass("top_off", 2));
    expect(screen.getByRole("heading", { name: ledger.sheetTitle(2) })).toBeTruthy();
    expect(screen.getByRole("button", { name: ledger.undoAria("2", ledger.sheetLabel(pass("top_off", 2))) })).toBeTruthy();
    expect(screen.getByRole("button", { name: ledger.sheetDone })).toBeTruthy();
  });

  it("offers Done only on the seed, whose reversal is Clear all auto", () => {
    draw(pass("seed", 3));
    expect(screen.getByRole("button", { name: ledger.sheetDone })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Undo/ })).toBeNull();
  });
});
