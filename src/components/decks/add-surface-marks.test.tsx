import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AddSurfaceMarkKey } from "./add-surface-mark-key";
import { ConsiderPanel } from "./consider-panel";
import { SuggestionTile } from "./suggestion-tile";
import { TopOffList } from "./top-off-list";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { CARD_FACTS, cardFactName } from "../../lib/copy/card-mark";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import type { CandidateFacts } from "../../lib/bracket/delta";
import type { DeckSuggestionWithFacts } from "../../lib/decks/suggest";
import type { NoteCounts } from "../../lib/bracket/card-note";
import { recommendedMix } from "../../lib/decks/mix";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

vi.mock("../../app/decks/actions", () => ({
  addCardToDeck: vi.fn().mockResolvedValue({ ok: true }),
  commitTopOff: vi.fn().mockResolvedValue({ ok: true, added: 0, total: 0, passId: "p", boughtDelta: 0 }),
  bulkFillOptions: vi.fn().mockResolvedValue({ ok: true, options: [] }),
}));

const NONE: NoteCounts = { gameChanger: 0, extraTurns: 0, tutor: 0 };

const facts = (over: Partial<CandidateFacts>): CandidateFacts => ({
  card: { oracleId: "o-test", name: "Test Card" },
  gameChanger: false,
  massLandDenial: false,
  extraTurn: false,
  tutor: false,
  completesCombos: [],
  ...over,
});

// ── The key ────────────────────────────────────────────────────────────────

describe("AddSurfaceMarkKey", () => {
  // UNCONDITIONAL, which is the difference from the decklist's key and the whole reason this
  // is a separate component: these surfaces are WINDOWS on a ranked pool, so absence on this
  // screen is not absence among the candidates.
  it("glosses all three facts with no card on screen at all", () => {
    render(<AddSurfaceMarkKey />);
    for (const fact of CARD_FACTS) {
      expect(screen.getByText(cardFactName(fact))).toBeInTheDocument();
    }
  });

  // The lemniscate arrived on both add surfaces with sub-project 3 and nothing glossed it:
  // the clause never contained the word "combo", and since 2026-09-22 it holds no words at
  // all — the lemniscate and the partner's name — so this key is the glyph's only gloss.
  it("glosses the combo glyph these surfaces were already drawing", () => {
    render(<AddSurfaceMarkKey />);
    expect(screen.getByText(comboAwarenessCopy.keyWord)).toBeInTheDocument();
  });

  it("draws the three facts in the vocabulary's own order", () => {
    const { container } = render(<AddSurfaceMarkKey />);
    const words = [...container.querySelectorAll("[data-testid^='card-fact-']")].map(
      (el) => el.getAttribute("data-testid"),
    );
    expect(words).toEqual(CARD_FACTS.map((f) => `card-fact-${f}`));
  });
});

// ── The Consider tile ──────────────────────────────────────────────────────

describe("the fact marks on the Consider tile", () => {
  const suggestion = (over: Partial<DeckSuggestionWithFacts>): DeckSuggestionWithFacts =>
    ({
      oracleId: "o-test",
      name: "Test Card",
      reason: "edhrec",
      reasonType: "edhrec",
      reasonLabel: "40% of decks",
      owned: true,
      inDeck: false,
      typeLine: "Sorcery",
      cardTypeGroup: "Sorceries",
      role: "removal",
      manaCost: "{2}{B}",
      manaValue: 3,
      imageUri: null,
      inclusionPct: null,
      lift: null,
      synergyFigure: null,
      facts: null,
      ...over,
    }) as DeckSuggestionWithFacts;

  const mount = (over: Partial<DeckSuggestionWithFacts>) =>
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <SuggestionTile
          suggestion={suggestion(over)}
          deckId="d1"
          declaredBracket={null}
          noteCounts={NONE}
          inDeck={false}
          selfClaimed={false}
          siblings={["o-test"]}
          commanderShortName="Korvold"
          newestAsOf={null}
        />
      </CardDetailProvider>,
    );

  it("draws one glyph per fact the card carries", () => {
    mount({ facts: facts({ gameChanger: true, extraTurn: true }) });
    expect(screen.getByTestId("card-fact-gameChanger")).toBeInTheDocument();
    expect(screen.getByTestId("card-fact-extraTurns")).toBeInTheDocument();
    expect(screen.queryByTestId("card-fact-massLandDenial")).toBeNull();
  });

  // ABSENCE IS THE DESIGN, and it is also most of the shelf: 110 of 35,572 catalog cards
  // carry mass land denial. A reserved line would be the commonest rendering on the surface.
  it("draws nothing for a card with no facts", () => {
    const { container } = mount({ facts: facts({}) });
    expect(container.querySelector("[data-testid^='card-fact-']")).toBeNull();
  });

  it("draws nothing when the facts read failed", () => {
    const { container } = mount({ facts: null });
    expect(container.querySelector("[data-testid^='card-fact-']")).toBeNull();
  });

  // §C2 puts the marks ABOVE the name. Asserted by document order rather than by geometry,
  // which is `probe:card-note`'s job — here what would regress is the JSX, not the layout.
  it("puts the marks before the card's name", () => {
    const { container } = mount({ facts: facts({ gameChanger: true }) });
    const mark = container.querySelector("[data-testid='card-fact-gameChanger']")!;
    // The tile draws TWO triggers for the same card — the art and the name — so the name is
    // taken as the LAST of them rather than by its label, which both share.
    const triggers = screen.getAllByRole("button", { name: /Test Card/ });
    const name = triggers[triggers.length - 1];
    expect(mark.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // The mark is not silent here: the tile composes no accessible name of its own, so each
  // glyph carries its own, exactly as it does on the decklist row.
  it("speaks each mark, because the tile composes no name of its own", () => {
    mount({ facts: facts({ massLandDenial: true }) });
    expect(
      screen.getByRole("img", { name: cardFactName("massLandDenial") }),
    ).toBeInTheDocument();
  });
});

// ── The Consider panel mounts the key ──────────────────────────────────────

describe("the Consider panel's key", () => {
  // The REAL default mix rather than a hand-built object: `buildShelves` reads
  // `mix.cells[role].target`, so a plausible-looking shape throws on the first shelf.
  const TEST_MIX = recommendedMix(null, false);

  it("mounts the gloss with no marked card in the list", () => {
    render(
      <CardDetailProvider fetchCard={async () => null}>
        <ConsiderPanel
          mix={TEST_MIX}
          deckId="deck-1"
          declaredBracket={null}
          noteCounts={NONE}
          suggestions={[
            {
              oracleId: "o-1",
              name: "Plain Card",
              reason: "edhrec",
              reasonType: "edhrec",
              reasonLabel: "40%",
              owned: true,
              inDeck: false,
              typeLine: "Sorcery",
              cardTypeGroup: "Sorceries",
              role: "removal",
              manaCost: "{1}",
              manaValue: 1,
              imageUri: null,
              inclusionPct: null,
              lift: null,
              synergyFigure: null,
              facts: null,
            } as DeckSuggestionWithFacts,
          ]}
          deckCards={[]}
          deckOracleIds={[]}
          commanderOracleId="cmd-1"
          commanderShortName="Korvold"
          degraded={false}
          sort="gaps"
          onSortChange={() => {}}
          newestAsOf={null}
        />
      </CardDetailProvider>,
    );
    expect(screen.getByText(cardFactName("gameChanger"))).toBeInTheDocument();
    expect(screen.getByText(comboAwarenessCopy.keyWord)).toBeInTheDocument();
  });
});

// ── The top-off row ────────────────────────────────────────────────────────

describe("the fact marks on the top-off row", () => {
  const candidate = (over: Record<string, unknown> = {}) => ({
    oracleId: "o-test",
    name: "Test Card",
    typeLine: "Sorcery",
    facet: "removal",
    owned: true,
    quantity: 1,
    committedTo: null,
    manaCost: "{2}{B}",
    manaValue: 3,
    synergyPts: 4,
    inclusionPct: 40,
    imageUri: null,
    price: null,
    availability: null,
    facts: null,
    comboPartner: null,
    ...over,
  });

  /**
   * The ROWS, not the whole tree. The key above them draws the same three glyphs as its own
   * samples, with the same `data-testid` — which is the point of a key — so a screen-wide
   * query for a mark finds the gloss and reports a row that draws nothing as drawing one.
   */
  const rows = () => within(document.querySelector("[data-top-off-rows]") as HTMLElement);

  const mount = (over: Record<string, unknown>) =>
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <TopOffList
          deckId="deck-1"
          listId="list-1"
          openSlots={3}
          bodySize={99}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          candidates={[candidate(over)] as any}
          deckOracleIds={new Set()}
          ticked={new Set()}
          onTickedChange={() => {}}
          declined={new Set()}
          onDeclinedChange={() => {}}
          newestAsOf={null}
          declaredBracket={null}
          noteCounts={NONE}
          onAnnounce={() => {}}
          onInflight={() => {}}
          onCommitted={() => {}}
          onClose={() => {}}
          onBarHeight={() => {}}
        />
      </CardDetailProvider>,
    );

  it("draws one glyph per fact", () => {
    mount({ facts: facts({ gameChanger: true, massLandDenial: true }) });
    expect(rows().getAllByTestId("card-fact-gameChanger").length).toBeGreaterThan(0);
    expect(rows().getAllByTestId("card-fact-massLandDenial").length).toBeGreaterThan(0);
    expect(rows().queryAllByTestId("card-fact-extraTurns")).toHaveLength(0);
  });

  it("draws nothing for a card with no facts", () => {
    mount({ facts: null });
    expect(rows().queryAllByTestId("card-fact-gameChanger")).toHaveLength(0);
  });

  // Every visual atom on this row is aria-hidden, so the tick's one accessible name is the
  // only place any of it is heard. A mark drawn but not spoken is a row a screen reader is
  // told LESS about than the build before it.
  it("hides the drawn marks and speaks them in the row's accessible name", () => {
    mount({ facts: facts({ gameChanger: true }) });
    for (const mark of rows().getAllByTestId("card-fact-gameChanger")) {
      expect(mark.getAttribute("aria-hidden")).toBe("true");
    }
    expect(screen.getAllByRole("checkbox")[0].getAttribute("aria-label")).toContain(
      cardFactName("gameChanger"),
    );
  });

  // The mark says WHICH kind; the note says how many and what the rules make of it. A reader
  // hearing the word twice learns nothing the second time, so the order is mark then note.
  it("speaks the mark before the note that elaborates it", () => {
    mount({ facts: facts({ massLandDenial: true }) });
    const label = screen.getAllByRole("checkbox")[0].getAttribute("aria-label") ?? "";
    expect(label.indexOf(cardFactName("massLandDenial"))).toBeLessThan(
      label.indexOf("We read this as"),
    );
  });

  // WHERE it sits is `probe:card-note`'s, which reads it laid out. This asserts the gloss is
  // mounted at all — the half that regresses when a panel is refactored.
  it("mounts the gloss, with no marked row in the list", () => {
    mount({ facts: null });
    const key = screen.getByRole("group", { name: /mark/i });
    expect(within(key).getByText(cardFactName("extraTurns"))).toBeInTheDocument();
  });
});
