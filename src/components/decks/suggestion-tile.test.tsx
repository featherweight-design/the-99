// #43 — the availability chip and its caption on a Consider tile.
//
// The chip is count-only at this density (design 6.1), so the caption below the
// type line is the only place a deck gets named and the only per-state text on
// the tile. That makes its colour load-bearing rather than decorative: painted
// one colour, "in use somewhere else" and "two lists want your one copy" are
// the same card.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { availabilityCopy } from "../../lib/copy/availability";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import type { Availability } from "../../lib/decks/availability";
import type { DeckSuggestionWithFacts } from "../../lib/decks/suggest";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { SuggestionTile } from "./suggestion-tile";

vi.mock("../../app/decks/actions", () => ({
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
}));

const suggestion = (availability: Availability | null): DeckSuggestionWithFacts =>
  ({
    oracleId: "o-sol", name: "Sol Ring", reason: "edhrec", reasonType: "edhrec",
    reasonLabel: "98% of decks", owned: true, inDeck: false,
    typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp",
    manaCost: "{1}", manaValue: 1,
    imageUri: null, inclusionPct: null, lift: null,
    availability,
  }) as DeckSuggestionWithFacts;

function mount(availability: Availability | null, selfClaimed = false) {
  render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <SuggestionTile
        suggestion={suggestion(availability)}
        deckId="d1"
        declaredBracket={null}
        noteCounts={{ gameChanger: 0, extraTurns: 0, tutor: 0 }}
        inDeck={false}
        newestAsOf={null}
        siblings={["o-sol"]}
        commanderShortName="Muldrotha"
        selfClaimed={selfClaimed}
      />
    </CardDetailProvider>,
  );
}

// Factory for lift-line and noSynergy tests. Separate from the availability
// factory above — takes partials rather than an Availability object.
function makeSuggestion(over: Partial<DeckSuggestionWithFacts> = {}): DeckSuggestionWithFacts {
  return {
    facts: null,
    oracleId: "o-test",
    name: "Test Card",
    reason: "edhrec",
    reasonType: "edhrec",
    reasonLabel: "EDHREC staple",
    owned: true,
    inDeck: false,
    typeLine: "Instant",
    cardTypeGroup: "Instants",
    role: "other",
    imageUri: null,
    manaCost: null,
    manaValue: 1,
    inclusionPct: null,
    lift: null,
    synergyFigure: null,
    ...over,
  };
}

function mountTile(
  over: Partial<DeckSuggestionWithFacts>,
  tileProps: Partial<React.ComponentProps<typeof SuggestionTile>> = {},
) {
  render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <SuggestionTile
        suggestion={makeSuggestion(over)}
        deckId="d1"
        declaredBracket={null}
        noteCounts={{ gameChanger: 0, extraTurns: 0, tutor: 0 }}
        inDeck={false}
        siblings={["o-test"]}
        commanderShortName="Muldrotha"
        selfClaimed={false}
        newestAsOf={null}
        {...tileProps}
      />
    </CardDetailProvider>,
  );
}

// The art loads lazily: a CSS background, or an eager img, is fetched for every tile of an expanded
// shelf whether or not it is on screen. The browser probe cannot tell the two builds apart here
// (a shelf's first tiles load before its `Show all`), so the attribute is pinned where it lives.
describe("SuggestionTile — art", () => {
  it("draws its art as a lazy img, not a background", () => {
    mountTile({ imageUri: "https://cards.example/test.jpg" });
    const img = document.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://cards.example/test.jpg");
    expect(img?.getAttribute("loading")).toBe("lazy");
    // And no background beside it, which would fetch eagerly whatever the img does.
    const box = img?.parentElement as HTMLElement;
    expect(box.getAttribute("style") ?? "").not.toContain("url(");
  });
});

describe("SuggestionTile — lift line", () => {
  it("prints the lift line on an unowned tile", () => {
    mountTile({ owned: false, inclusionPct: 40, lift: 0.12 });
    expect(screen.getByText(addPanelCopy.tile.lift("12"))).toBeInTheDocument();
  });

  it("prints the lift line on a card with no inclusion figure", () => {
    mountTile({ inclusionPct: null, lift: 0.12 });
    expect(screen.getByText(addPanelCopy.tile.noInclusion)).toBeInTheDocument();
    expect(screen.getByText(addPanelCopy.tile.lift("12"))).toBeInTheDocument();
  });

  it("says so on the synergy shelf when there is no figure at all", () => {
    mountTile({ inclusionPct: 40, lift: null, synergyFigure: null }, { showNoSynergy: true });
    expect(screen.getByText(synergyCopy.shelf.noSynergy)).toBeInTheDocument();
  });

  it("stays silent about an absent figure everywhere else", () => {
    mountTile({ inclusionPct: 40, lift: null, synergyFigure: null });
    expect(screen.queryByText(synergyCopy.shelf.noSynergy)).not.toBeInTheDocument();
  });

  // A negative synergyFigure is a rank, not an absence — the design table calls
  // the absent-state label for cards with no figure at all, not for low figures.
  it("does not say no-synergy on the synergy shelf when the card has a negative figure", () => {
    mountTile({ inclusionPct: 40, lift: null, synergyFigure: -0.1 }, { showNoSynergy: true });
    expect(screen.queryByText(synergyCopy.shelf.noSynergy)).not.toBeInTheDocument();
  });

  // M5 — a negative synergyFigure must print its figure, not be silent.
  // The design table states the line is always rendered when the figure is present.
  it("prints the negative synergy figure on the synergy shelf", () => {
    mountTile({ inclusionPct: 40, lift: null, synergyFigure: -0.05 }, { showNoSynergy: true });
    // −0.05 → Math.abs(Math.round(-5)) = 5 → "−5 pts"
    expect(screen.getByText(synergyCopy.figure.synergyNegative("5"))).toBeInTheDocument();
  });

  // The singular is a real case on this side of zero too, and the positive
  // formatter already spells it. Asserted as a literal so the test cannot pass
  // by agreeing with a formatter that is itself wrong.
  it("prints a one-point negative figure in the singular", () => {
    mountTile({ inclusionPct: 40, lift: null, synergyFigure: -0.01 }, { showNoSynergy: true });
    expect(screen.getByText("−1 pt")).toBeInTheDocument();
  });

  // A figure that rounds to zero reaches the same branch as a negative one,
  // because `lift` is positive-only. Zero is a real figure of no advantage, and
  // the minus glyph would misstate it as a penalty.
  it("prints a zero synergy figure without a minus sign", () => {
    mountTile({ inclusionPct: 40, lift: null, synergyFigure: 0.004 }, { showNoSynergy: true });
    expect(screen.getByText(synergyCopy.figure.synergy("0"))).toBeInTheDocument();
    expect(screen.queryByText(synergyCopy.figure.synergyNegative("0"))).not.toBeInTheDocument();
  });
});

describe("SuggestionTile availability caption", () => {
  it("paints the in-use caption the hard foreground", () => {
    mount({ owned: 1, hard: 1, soft: 0, free: 0, claims: [{ id: "d1", name: "Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: true }] });

    expect(screen.getByText(availabilityCopy.marker.tileInUse("Atraxa"))).toHaveClass(
      "text-[color:var(--avail-hard-fg)]",
    );
  });

  // The tile names the deck but does not link it: the whole tile is already a
  // control, and card detail is the one surface where the name is a link.
  it("names the deck without linking it", () => {
    mount({ owned: 1, hard: 1, soft: 0, free: 0, claims: [{ id: "d1", name: "Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: true }] });

    expect(screen.queryByRole("link")).toBeNull();
  });

  // The state the caption used to be indistinguishable from the one above.
  it("paints the over-committed caption the over foreground, not accent", () => {
    mount({
      owned: 1,
      hard: 2,
      soft: 0,
      free: -1,
      claims: [
        { id: "d1", name: "Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: true },
        { id: "d2", name: "Kykar", quantity: 1, mature: true, pending: false, commander: false, senior: true },
      ],
    });

    const caption = screen.getByText(availabilityCopy.marker.tileOver(2));
    expect(caption).toHaveClass("text-[color:var(--avail-over-fg)]");
    expect(caption).not.toHaveClass("text-[color:var(--avail-hard-fg)]");
  });

  it("sets the caption to the marker's own type rather than the type line's", () => {
    mount({ owned: 1, hard: 1, soft: 0, free: 0, claims: [{ id: "d1", name: "Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: true }] });

    expect(screen.getByText(availabilityCopy.marker.tileInUse("Atraxa"))).toHaveClass(
      "font-mono",
      "text-[8.5px]",
      "font-semibold",
    );
  });

  // §17. Neither detail trigger wraps the chip, so nothing above it would carry
  // the prose — and the drawn `none free` is written for the eye.
  it("speaks the chip's sentence, count-only as the chip is drawn", () => {
    mount({ owned: 1, hard: 1, soft: 0, free: 0, claims: [{ id: "d1", name: "Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: true }] });

    expect(screen.getByText("no free copies")).toBeInTheDocument();
    expect(screen.getByText(availabilityCopy.marker.hard)).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("draws nothing at all for a free card", () => {
    mount({ owned: 3, hard: 0, soft: 0, free: 3, claims: [] });

    expect(screen.queryByText(/free|in a draft|in a brew|short|in use/)).toBeNull();
  });
});
