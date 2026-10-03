import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckSuggestionWithFacts } from "../../lib/decks/suggest";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { recommendedMix } from "../../lib/decks/mix";

const addCardToDeck = vi.fn(async () => ({ ok: true as const }));
vi.mock("../../app/decks/actions", () => ({ addCardToDeck }));
// The degraded banner's Try again re-fetches the page rather than owning a retry of its own,
// so the panel needs a router even in the happy path.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { ConsiderPanel } = await import("./consider-panel");
const { CardDetailProvider } = await import("../cards/card-detail-provider");

const PARTNER = { oracleId: "p-1", name: "Isochron Scepter" };

/** The real panel's own fixture shape, copied rather than invented: a suggestion missing a
 *  field the shelving reads is dropped, and the panel then draws its empty state — which is
 *  what every case here saw on the first run. */
const suggestion = (over: Partial<DeckSuggestionWithFacts> = {}): DeckSuggestionWithFacts =>
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
  }) as unknown as DeckSuggestionWithFacts;

function mount(over: Partial<DeckSuggestionWithFacts> = {}, deckOracleIds: string[] = []) {
  return render(
    <CardDetailProvider fetchCard={async () => null}>
      <ConsiderPanel
        deckId="deck-1"
        declaredBracket={null}
        noteCounts={{ gameChanger: 0, extraTurns: 0, tutor: 0 }}
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
  // THE SECONDARY LINE REPLACES THE TYPE LINE, and the lemniscate moves onto the meta
  // line beside the fact marks — consider-tiles handoff call 3, the §C2 amendment scoped
  // to this tile. The partner's name rides the secondary line alone.
  it("puts the partner's name where the type line was, and the glyph on the meta line", () => {
    const { container } = mount({ comboPartner: PARTNER });
    const tile = container.querySelector('[data-testid="suggestion-tile"]')!;
    const line = tile.querySelector('[data-testid="consider-combo-line"]')!;
    expect(line.textContent).toContain("Isochron Scepter");
    expect(line.textContent).not.toContain("completes with");
    expect(tile.textContent).not.toContain("Instant");
    // SCOPED TO THE TILE: `AddSurfaceMarkKey`'s legend, mounted once by the panel
    // regardless of any tile's own state, always carries an unconditional sample
    // lemniscate — an unscoped query on `container` finds that one too.
    expect(tile.querySelector('[data-testid="combo-glyph"]')).not.toBeNull();
  });

  // ABSENT WHEN THE CARD IS ALREADY IN THE DECK. `completes` presupposes ADDING it, and a
  // card that is in already completes nothing by being added again — so the tile says
  // `✓ In deck` and the type line comes back, with no glyph on the meta line either.
  it("drops the line and the glyph on a card already in the deck", () => {
    const { container } = mount({ comboPartner: PARTNER, oracleId: "s-1" }, ["s-1"]);
    const tile = container.querySelector('[data-testid="suggestion-tile"]')!;
    expect(tile.querySelector('[data-testid="consider-combo-line"]')).toBeNull();
    expect(tile.querySelector('[data-testid="combo-glyph"]')).toBeNull();
    expect(tile.textContent).toContain("Instant");
  });

  // THE OPTIMISTIC PATH, which is the one a reader actually sees. `applied` flips on the
  // press while `inDeck` stays at the last server-rendered value until revalidation, so a
  // tile gated on the prop says `✓ In deck` and names a combo partner at once for the length
  // of a round trip.
  it("drops the line the moment Add is pressed, not when the server answers", async () => {
    // HELD OPEN. `applied` comes from `useOptimistic`, which holds its value only for the
    // length of the transition — so an action that settles in the same turn reverts before
    // any assertion can see it, and the case would pass on a tile gated the wrong way.
    let release: (v: { ok: true }) => void = () => {};
    addCardToDeck.mockReturnValue(
      new Promise<{ ok: true }>((r) => {
        release = r;
      }),
    );
    const { container } = mount({ comboPartner: PARTNER });
    expect(container.querySelector('[data-testid="consider-combo-line"]')).not.toBeNull();

    const add = screen.getByRole("button", { name: /add/i });
    await act(async () => {
      add.click();
    });

    // Mid-flight: the tile already says it is in the deck, so it must not also say what
    // adding it would complete.
    expect(container.querySelector('[data-testid="consider-combo-line"]')).toBeNull();

    await act(async () => {
      release({ ok: true });
    });
  });

  it("leaves a tile with no combo exactly as it was", () => {
    const { container } = mount({});
    const tile = container.querySelector('[data-testid="suggestion-tile"]')!;
    expect(tile.querySelector('[data-testid="consider-combo-line"]')).toBeNull();
    expect(tile.querySelector('[data-testid="combo-glyph"]')).toBeNull();
    expect(tile.textContent).toContain("Instant");
  });

  // READ AS TEXT, not hidden, for the LINE as a whole: this tile composes no accessible
  // name of its own — its name is a trigger whose label is the card's name, and the type
  // line this replaces was read in place as content. Hiding the line would delete the
  // sentence, not relocate it. The visible halves (the `+` and the bare name) ARE
  // aria-hidden individually — they are punctuation and a name a sighted reader already
  // sees drawn beside the glyph — and the sr-only sentence inside the same line carries
  // the spoken form, so the line as a whole is never hidden from assistive tech.
  it("leaves the sentence audible, since there is nowhere to relocate it to", () => {
    const { container } = mount({ comboPartner: PARTNER });
    const line = container.querySelector('[data-testid="consider-combo-line"]');
    expect(line).not.toBeNull();
    expect(line!.closest("[aria-hidden]")).toBeNull();
  });

  // NO COUNT. Detection excludes template-gated variants by design.
  // Three nodes, in order: the aria-hidden `+ `, the aria-hidden name (both drawn, read by
  // sighted eyes alongside the glyph on the meta line), then the sr-only sentence — which is
  // all a screen reader hears, since `textContent` alone cannot tell a drawn node from a
  // spoken one.
  it("draws the `+` and the name, and speaks the sentence alone", () => {
    const { container } = mount({ comboPartner: PARTNER });
    const line = container.querySelector('[data-testid="consider-combo-line"]')!;
    expect(line.textContent).toBe(
      `+ Isochron Scepter${comboAwarenessCopy.a11y.completes("Isochron Scepter")}`,
    );
    const spoken = [...line.querySelectorAll("*")].filter(
      (el) => !el.hasAttribute("aria-hidden"),
    );
    expect(spoken.map((el) => el.textContent)).toEqual([
      comboAwarenessCopy.a11y.completes("Isochron Scepter"),
    ]);
  });
});
