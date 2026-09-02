import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import type { DeckDetailCard } from "../../lib/decks/grouping";

// ── Module mock — fillDeck action, exercised by the connected banner's retry ──
vi.mock("../../app/decks/actions", () => ({
  fillDeck: vi.fn(),
}));

const { ProvenanceLine, FillFailedBanner, FillFailedBannerConnected } = await import("./provenance-line");

// ── Fixture helpers ──────────────────────────────────────────────────────────

function makeCard(
  id: string,
  opts: {
    auto?: boolean;
    owned?: boolean;
    role?: DeckDetailCard["role"];
    quantity?: number;
  } = {},
): DeckDetailCard {
  return {
    oracleId: id,
    name: `Card ${id}`,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts",
    role: opts.role ?? "ramp",
    owned: opts.owned ?? true,
    quantity: opts.quantity ?? 1,
    auto: opts.auto ?? false,
    availability: null,
  };
}

// ── ProvenanceLine ──────────────────────────────────────────────────────────

describe("ProvenanceLine", () => {
  it("renders only when the deck holds at least one auto card", () => {
    const cards = [
      makeCard("a", { auto: false }),
      makeCard("b", { auto: false }),
    ];
    render(
      <ProvenanceLine
        cards={cards}
        filled={2}
        bought={0}
        open={97}
        width="desktop"
      />,
    );
    // No auto cards — line must not appear
    expect(screen.queryByText(/We filled/)).not.toBeInTheDocument();
  });

  it("names the bought count when something was bought", () => {
    const cards = [
      makeCard("a", { auto: true, owned: false }),
      makeCard("b", { auto: true, owned: true }),
    ];
    render(
      <ProvenanceLine
        cards={cards}
        filled={2}
        bought={1}
        open={97}
        width="desktop"
      />,
    );
    // Should use the provenance (with bought) branch
    expect(
      screen.getByText(
        recommendationsCopy.fill.provenance("2", "1", "97"),
      ),
    ).toBeInTheDocument();
  });

  it("takes the all-owned branch when nothing was bought", () => {
    const cards = [
      makeCard("a", { auto: true, owned: true }),
      makeCard("b", { auto: true, owned: true }),
    ];
    render(
      <ProvenanceLine
        cards={cards}
        filled={2}
        bought={0}
        open={97}
        width="desktop"
      />,
    );
    expect(
      screen.getByText(
        recommendationsCopy.fill.provenanceAllOwned("2", "97"),
      ),
    ).toBeInTheDocument();
  });

  it("takes the short branch and names the role when a role missed its target", () => {
    // shortRole is passed in directly when a role came up short
    const cards = [makeCard("a", { auto: true, owned: true })];
    render(
      <ProvenanceLine
        cards={cards}
        filled={1}
        bought={0}
        open={98}
        shortRole="ramp"
        width="desktop"
      />,
    );
    expect(
      screen.getByText(
        recommendationsCopy.fill.provenanceShort("1", "Ramp", "98"),
      ),
    ).toBeInTheDocument();
  });

  it("renders the mobile copy branch at phone width", () => {
    const cards = [
      makeCard("a", { auto: true, owned: false }),
      makeCard("b", { auto: true, owned: true }),
    ];
    render(
      <ProvenanceLine
        cards={cards}
        filled={2}
        bought={1}
        open={97}
        width="phone"
      />,
    );
    expect(
      screen.getByText(
        recommendationsCopy.fill.provenanceMobile("2", "1", "97"),
      ),
    ).toBeInTheDocument();
  });

  it("still names a short role at phone width, where the mobile copy has no room for it", () => {
    const cards = [
      makeCard("a", { auto: true, owned: false }),
      makeCard("b", { auto: true, owned: true }),
    ];
    render(
      <ProvenanceLine
        cards={cards}
        filled={2}
        bought={1}
        open={97}
        shortRole="ramp"
        width="phone"
      />,
    );
    expect(
      screen.getByText(recommendationsCopy.fill.provenanceShort("2", "Ramp", "97")),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(recommendationsCopy.fill.provenanceMobile("2", "1", "97")),
    ).not.toBeInTheDocument();
  });

  it("takes the all-owned branch at phone width rather than reporting nothing bought", () => {
    const cards = [makeCard("a", { auto: true, owned: true })];
    render(
      <ProvenanceLine cards={cards} filled={1} bought={0} open={98} width="phone" />,
    );
    expect(
      screen.getByText(recommendationsCopy.fill.provenanceAllOwned("1", "98")),
    ).toBeInTheDocument();
  });

  it("leaves when the last auto card does", () => {
    const { rerender } = render(
      <ProvenanceLine
        cards={[makeCard("a", { auto: true, owned: true })]}
        filled={1}
        bought={0}
        open={98}
        width="desktop"
      />,
    );
    expect(screen.getByText(/We filled/)).toBeInTheDocument();

    rerender(
      <ProvenanceLine
        cards={[makeCard("a", { auto: false, owned: true })]}
        filled={1}
        bought={0}
        open={98}
        width="desktop"
      />,
    );
    expect(screen.queryByText(/We filled/)).not.toBeInTheDocument();
  });
});

// ── FillFailedBanner ────────────────────────────────────────────────────────

describe("FillFailedBanner", () => {
  it("renders for an empty unfilled deck (filled=false, no cards)", () => {
    render(
      <FillFailedBanner
        filled={false}
        cardCount={0}
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
        cardCount={0}
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
        cardCount={5}
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

    render(<FillFailedBannerConnected deckId="deck-1" filled={false} cardCount={0} />);

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
