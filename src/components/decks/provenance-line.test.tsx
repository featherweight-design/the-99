import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { topOffCopy } from "../../lib/copy/top-off";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { FillPassSummary } from "../../lib/decks/fill-passes";

// ── Module mock — the two server actions the ledger and the banner call ──
vi.mock("../../app/decks/actions", () => ({
  fillDeck: vi.fn(),
  undoFillPass: vi.fn(),
}));

const { ProvenanceLedger, FillFailedBanner, FillFailedBannerConnected } = await import(
  "./provenance-line"
);

const ledger = topOffCopy.ledger;

// ── Fixture helpers ──────────────────────────────────────────────────────────

function makeCard(
  id: string,
  opts: { auto?: boolean; owned?: boolean; quantity?: number } = {},
): DeckDetailCard {
  return {
    oracleId: id,
    name: `Card ${id}`,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts",
    role: "ramp",
    owned: opts.owned ?? true,
    quantity: opts.quantity ?? 1,
    auto: opts.auto ?? false,
    availability: null,
  } as DeckDetailCard;
}

function makePass(
  id: string,
  opts: Partial<FillPassSummary> & { oracleIds?: string[] } = {},
): FillPassSummary {
  const oracleIds = opts.oracleIds ?? ["a"];
  return {
    id,
    kind: opts.kind ?? "top_off",
    ordinal: opts.ordinal ?? 1,
    createdAt: new Date("2026-01-01"),
    live: opts.live ?? oracleIds.length,
    kept: opts.kept ?? 0,
    removed: opts.removed ?? 0,
    openSlots: opts.openSlots ?? 5,
    liveCards: opts.liveCards ?? oracleIds.map((oracleId) => ({ oracleId, quantity: 1 })),
  };
}

function mount(
  cards: DeckDetailCard[],
  passes: FillPassSummary[],
  overrides: { markedPassId?: string | null; onMarkChange?: (id: string | null) => void } = {},
) {
  return render(
    <ProvenanceLedger
      deckId="deck-1"
      cards={cards}
      total={cards.filter((c) => c.auto).length}
      built={cards.length}
      passes={passes}
      markedPassId={overrides.markedPassId ?? null}
      onMarkChange={overrides.onMarkChange ?? vi.fn()}
      onAnnounce={vi.fn()}
    />,
  );
}

/** The line's sentences. Read whole rather than through `getByText`, because
 *  the card count is its own element — the sentence is broken up by design. */
function sentences(): string[] {
  return Array.from(document.querySelectorAll("p")).map((p) => p.textContent ?? "");
}

// ── ProvenanceLedger ────────────────────────────────────────────────────────

describe("ProvenanceLedger", () => {
  it("renders only when the deck holds at least one auto card", () => {
    mount([makeCard("a"), makeCard("b")], [makePass("p1")]);
    expect(screen.queryByText(ledger.header("2"))).not.toBeInTheDocument();
  });

  it("counts the deck's auto cards in the header, not the passes' cards", () => {
    // Two auto cards, one pass that placed only one of them: the header states
    // what the deck holds, the line states what the pass did.
    mount(
      [makeCard("a", { auto: true }), makeCard("b", { auto: true })],
      [makePass("p1", { oracleIds: ["a"] })],
    );
    expect(screen.getByText(ledger.header("2"))).toBeInTheDocument();
  });

  it("names the seed and each top-off in order, oldest first", () => {
    mount(
      [makeCard("a", { auto: true }), makeCard("b", { auto: true })],
      [
        makePass("seed", { kind: "seed", ordinal: 0, oracleIds: ["a"] }),
        makePass("p1", { ordinal: 1, oracleIds: ["b"] }),
      ],
    );
    const labels = screen
      .getAllByText(new RegExp(`^(${ledger.seedLabel}|${ledger.passLabel("1")})$`))
      .map((el) => el.textContent);
    expect(labels).toEqual([ledger.seedLabel, ledger.passLabel("1")]);
  });

  it("counts a pass's unowned cards as its buy figure", () => {
    mount(
      [makeCard("a", { auto: true, owned: false }), makeCard("b", { auto: true })],
      [makePass("p1", { oracleIds: ["a", "b"], openSlots: 5 })],
    );
    expect(sentences()).toContain(ledger.passLine("2", "5", "1"));
  });

  it("counts copies, not cards, in a stacked pass's buy figure", () => {
    // Four copies of one unowned card is four to buy, not one.
    mount(
      [makeCard("a", { auto: true, owned: false, quantity: 4 })],
      [makePass("p1", {
        oracleIds: ["a"],
        live: 4,
        openSlots: 5,
        liveCards: [{ oracleId: "a", quantity: 4 }],
      })],
    );
    expect(sentences()).toContain(ledger.passLine("4", "5", "4"));
  });

  it("drops the buy clause when the pass bought nothing", () => {
    mount(
      [makeCard("a", { auto: true }), makeCard("b", { auto: true })],
      [makePass("p1", { oracleIds: ["a", "b"], openSlots: 5 })],
    );
    expect(sentences()).toContain(ledger.passLineNoBuy("2", "5"));
  });

  it("states the recount instead of the base sentence once cards have moved", () => {
    mount(
      [makeCard("a", { auto: true })],
      [makePass("p1", { oracleIds: ["a"], live: 1, kept: 1, removed: 1 })],
    );
    // Leads with 3 — what the pass placed — not the 1 it still holds.
    expect(sentences()).toContain(ledger.passRecountedBoth("3", "1", "1"));
    expect(sentences().join(" ")).not.toContain("you chose from the last");
  });

  it("says so when the deck predates the ledger", () => {
    mount([makeCard("a", { auto: true })], []);
    expect(screen.getByText(/built before we started keeping this record/)).toBeInTheDocument();
  });

  it("offers the sweep as the seed's reversal rather than an undo of its own", () => {
    mount(
      [makeCard("a", { auto: true })],
      [makePass("seed", { kind: "seed", ordinal: 0, oracleIds: ["a"] })],
    );
    // Two spans, one per width — the line is mounted once and the widths hide
    // each other's copy, which is how every other responsive split here works.
    expect(screen.getAllByText(ledger.seedReversal)).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: ledger.undoAria("1", ledger.seedLabel) }),
    ).not.toBeInTheDocument();
  });

  it("marks a pass through the callback, and reports the mark as pressed", () => {
    const onMarkChange = vi.fn();
    mount([makeCard("a", { auto: true })], [makePass("p1", { oracleIds: ["a"] })], {
      onMarkChange,
    });
    const mark = screen.getByRole("button", {
      name: ledger.markAria("1", ledger.passLabel("1")),
    });
    expect(mark).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(mark);
    expect(onMarkChange).toHaveBeenCalledWith("p1");
  });

  it("clears the mark when the marked pass's own control is pressed again", () => {
    const onMarkChange = vi.fn();
    mount([makeCard("a", { auto: true })], [makePass("p1", { oracleIds: ["a"] })], {
      markedPassId: "p1",
      onMarkChange,
    });
    const mark = screen.getByRole("button", {
      name: ledger.unmarkAria(ledger.passLabel("1")),
    });
    expect(mark).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(mark);
    expect(onMarkChange).toHaveBeenCalledWith(null);
  });

  it("keeps the line and states the refusal when an undo rejects", async () => {
    const { undoFillPass } = await import("../../app/decks/actions");
    vi.mocked(undoFillPass).mockRejectedValue(new Error("network"));

    mount([makeCard("a", { auto: true })], [makePass("p1", { oracleIds: ["a"] })]);
    fireEvent.click(
      screen.getByRole("button", { name: ledger.undoAria("1", ledger.passLabel("1")) }),
    );

    await waitFor(() => {
      expect(screen.getByText(ledger.undoFailed)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: ledger.undoAria("1", ledger.passLabel("1")) }),
      ).not.toBeDisabled();
    });
  });

  it("leaves when the last auto card does", () => {
    const passes = [makePass("p1", { oracleIds: ["a"] })];
    const { rerender } = mount([makeCard("a", { auto: true })], passes);
    expect(screen.getByText(ledger.header("1"))).toBeInTheDocument();

    rerender(
      <ProvenanceLedger
        deckId="deck-1"
        cards={[makeCard("a", { auto: false })]}
        total={0}
        built={1}
        passes={passes}
        markedPassId={null}
        onMarkChange={vi.fn()}
        onAnnounce={vi.fn()}
      />,
    );
    expect(screen.queryByText(ledger.header("1"))).not.toBeInTheDocument();
  });
});

// ── FillFailedBanner ────────────────────────────────────────────────────────

describe("FillFailedBanner", () => {
  it("renders for an empty unfilled deck (filled=false, no cards)", () => {
    render(
      <FillFailedBanner
        filled={false}
        hasCards={false}
        onRetry={vi.fn()}
        pending={false}
      />,
    );
    expect(
      screen.getByText(recommendationsCopy.fill.failedHeading),
    ).toBeInTheDocument();
    expect(
      screen.getByText(recommendationsCopy.fill.failedBody),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: recommendationsCopy.fill.failedRetryAria,
      }),
    ).toBeInTheDocument();
  });

  it("does not render for an empty swept deck (filled=true, no cards)", () => {
    render(
      <FillFailedBanner
        filled={true}
        hasCards={false}
        onRetry={vi.fn()}
        pending={false}
      />,
    );
    // A swept deck (filled=true) must not offer to fill again
    expect(
      screen.queryByText(recommendationsCopy.fill.failedHeading),
    ).not.toBeInTheDocument();
  });

  it("does not render when the deck has cards", () => {
    render(
      <FillFailedBanner
        filled={false}
        hasCards
        onRetry={vi.fn()}
        pending={false}
      />,
    );
    expect(
      screen.queryByText(recommendationsCopy.fill.failedHeading),
    ).not.toBeInTheDocument();
  });
});

// ── FillFailedBannerConnected ────────────────────────────────────────────────

describe("FillFailedBannerConnected", () => {
  it("keeps the banner and re-enables Retry when the fill action rejects", async () => {
    // An escaped rejection reaches an error boundary and takes the retry
    // affordance away with it — the one control the banner exists to offer.
    const { fillDeck } = await import("../../app/decks/actions");
    vi.mocked(fillDeck).mockRejectedValue(new Error("network"));

    render(<FillFailedBannerConnected deckId="deck-1" filled={false} hasCards={false} />);

    fireEvent.click(
      screen.getByRole("button", { name: recommendationsCopy.fill.failedRetryAria }),
    );

    await waitFor(() => {
      expect(fillDeck).toHaveBeenCalledWith("deck-1");
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: recommendationsCopy.fill.failedRetryAria }),
      ).not.toBeDisabled();
    });
    expect(screen.getByText(recommendationsCopy.fill.failedHeading)).toBeInTheDocument();
  });
});
