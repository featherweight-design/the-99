import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { recommendedMix } from "../../lib/decks/mix";

vi.mock("../../app/decks/actions", () => ({
  addCardToDeck: vi.fn(async () => ({ ok: true as const })),
}));
// The degraded banner's Try again re-fetches the page rather than owning a retry of its own,
// so the panel needs a router even in the happy path.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { ConsiderPanel } = await import("./consider-panel");
const { CardDetailProvider } = await import("../cards/card-detail-provider");

const PARTNER = { oracleId: "p-1", name: "Isochron Scepter" };

/** The real panel's own fixture shape, copied rather than invented: a suggestion missing a
 *  field the shelving reads is dropped, and the panel then draws its empty state — which is
 *  what every case here saw on the first run. */
const suggestion = (over: Partial<DeckSuggestion> = {}): DeckSuggestion =>
  ({
    oracleId: "s-1",
    name: "Dramatic Reversal",
    reason: "edhrec",
    reasonType: "edhrec",
    reasonLabel: "EDHREC staple",
    owned: true,
    inDeck: false,
    typeLine: "Instant",
    cardTypeGroup: "Instants",
    role: "ramp",
    imageUri: "https://cards.example/art.jpg",
    manaCost: "{2}{G}",
    manaValue: 3,
    inclusionPct: 40,
    lift: null,
    synergyFigure: null,
    ...over,
  }) as unknown as DeckSuggestion;

function mount(over: Partial<DeckSuggestion> = {}, deckOracleIds: string[] = []) {
  return render(
    <CardDetailProvider fetchCard={async () => null}>
      <ConsiderPanel
        deckId="deck-1"
        suggestions={[suggestion(over)]}
        deckCards={[]}
        deckOracleIds={deckOracleIds}
        commanderShortName="Korvold"
        commanderOracleId="cmd-1"
        degraded={false}
        newestAsOf={null}
        sort="gaps"
        onSortChange={() => {}}
        // Through the real function rather than a hand-built literal, which drifts from the
        // type the moment a field is added.
        mix={recommendedMix(null, false)}
      />
    </CardDetailProvider>,
  );
}

describe("combo awareness on the Consider tile", () => {
  // THE CLAUSE REPLACES THE TYPE LINE. The tile has one line there, and the combo is the
  // fact a reader cannot get from the art, the name or the evidence row below it.
  it("puts the clause where the type line was", () => {
    const { container } = mount({ comboPartner: PARTNER });
    expect(container.textContent).toContain(
      comboAwarenessCopy.clause.completes("Isochron Scepter"),
    );
    expect(container.textContent).not.toContain("Instant");
  });

  // ABSENT WHEN THE CARD IS ALREADY IN THE DECK. `completes` presupposes ADDING it, and a
  // card that is in already completes nothing by being added again — so the tile says
  // `✓ In deck` and the type line comes back.
  it("drops the clause on a card already in the deck", () => {
    const { container } = mount({ comboPartner: PARTNER, oracleId: "s-1" }, ["s-1"]);
    expect(container.querySelector('[data-testid="combo-clause"]')).toBeNull();
    expect(container.textContent).toContain("Instant");
  });

  it("leaves a tile with no combo exactly as it was", () => {
    const { container } = mount({});
    expect(container.querySelector('[data-testid="combo-clause"]')).toBeNull();
    expect(container.textContent).toContain("Instant");
  });

  // READ AS TEXT, not hidden. This tile composes no accessible name of its own — its name is
  // a trigger whose label is the card's name, and the type line this replaces was read in
  // place as content. Hiding the clause here would delete the sentence, not relocate it.
  it("leaves the clause audible, since there is nowhere to relocate it to", () => {
    const { container } = mount({ comboPartner: PARTNER });
    const clause = container.querySelector('[data-testid="combo-clause"]');
    expect(clause).not.toBeNull();
    expect(clause!.closest("[aria-hidden]")).toBeNull();
  });

  // NO COUNT. Detection excludes template-gated variants by design.
  it("prints the sentence and nothing appended to it", () => {
    const { container } = mount({ comboPartner: PARTNER });
    const clause = container.querySelector('[data-testid="combo-clause"]')!;
    expect(clause.textContent).toBe(
      comboAwarenessCopy.clause.completes("Isochron Scepter"),
    );
  });
});
