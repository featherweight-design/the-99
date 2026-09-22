import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardNote } from "./card-note";
import { SuggestionTile } from "./suggestion-tile";
import { TopOffList } from "./top-off-list";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { cardNote } from "../../lib/copy/card-note";
import type { CandidateFacts } from "../../lib/bracket/delta";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import type { NoteCounts } from "../../lib/bracket/card-note";

// `bulkFillOptions` is asked on mount and its answer is `.then`-ed, so a bare `vi.fn()`
// returning undefined throws inside an effect rather than resolving to no options.
vi.mock("../../app/decks/actions", () => ({
  addCardToDeck: vi.fn().mockResolvedValue({ ok: true }),
  commitTopOff: vi.fn().mockResolvedValue({ ok: true, added: 0, total: 0, passId: "p", boughtDelta: 0 }),
  bulkFillOptions: vi.fn().mockResolvedValue({ ok: true, options: [] }),
  chooseBulkTicks: vi.fn(),
}));

const NONE: NoteCounts = { gameChanger: 0, massLandDenial: 0, extraTurns: 0, tutor: 0 };

const facts = (over: Partial<CandidateFacts>): CandidateFacts => ({
  card: { oracleId: "o-test", name: "Test Card" },
  gameChanger: false,
  massLandDenial: false,
  extraTurn: false,
  tutor: false,
  completesCombos: [],
  ...over,
});

describe("CardNote — the atom", () => {
  it("draws nothing at all for a card with no facts", () => {
    const { container } = render(
      <CardNote facts={null} declared={null} counts={NONE} density="row" />,
    );
    // NOT an empty box: the row must reserve no height for a note it is not drawing,
    // which on a 480-candidate pool is most rows.
    expect(container).toBeEmptyDOMElement();
  });

  it("wears one label, whatever the fact and whatever the density", () => {
    for (const density of ["row", "tile"] as const) {
      const { unmount } = render(
        <CardNote
          facts={facts({ gameChanger: true })}
          declared={null}
          counts={NONE}
          density={density}
        />,
      );
      expect(screen.getByText(cardNote.label)).toBeInTheDocument();
      unmount();
    }
  });

  // The two densities differ in the BODY's type and in nothing else about the slot. Asserted
  // by value rather than by "they differ": a swap would pass a difference check.
  it("sets the body at 12.5px on a row and 11.5px on a tile", () => {
    const { unmount } = render(
      <CardNote facts={facts({ tutor: true })} declared={null} counts={NONE} density="row" />,
    );
    expect(screen.getByText(/A tutor/).className).toContain("text-[12.5px]");
    unmount();

    render(
      <CardNote facts={facts({ tutor: true })} declared={null} counts={NONE} density="tile" />,
    );
    expect(screen.getByText(/A tutor/).className).toContain("text-[11.5px]");
  });

  // `--fg-disabled` fails the text floor at 9px on `--surface` (1.71:1), which the handoff
  // states at the point it binds. A token swap here is invisible in jsdom's layout and
  // perfectly visible on screen.
  it("draws the label in --fg-muted, never --fg-disabled", () => {
    render(
      <CardNote facts={facts({ tutor: true })} declared={null} counts={NONE} density="row" />,
    );
    const label = screen.getByText(cardNote.label);
    expect(label.getAttribute("style")).toContain("var(--fg-muted)");
    expect(label.getAttribute("style")).not.toContain("--fg-disabled");
  });

  // The note is `--fact` ink and body text by ruling: the loudest signal on the least certain
  // claim is the treatment the handoff rejects by name.
  it("paints no warning and no danger anywhere in the slot", () => {
    const { container } = render(
      <CardNote
        facts={facts({ massLandDenial: true })}
        declared={2}
        counts={NONE}
        density="row"
      />,
    );
    expect(container.innerHTML).not.toContain("--warning");
    expect(container.innerHTML).not.toContain("--danger");
  });
});

describe("the note on the Consider tile", () => {
  const suggestion = (over: Partial<DeckSuggestion>): DeckSuggestion =>
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
      ...over,
    }) as DeckSuggestion;

  const mount = (
    over: Partial<DeckSuggestion>,
    counts: NoteCounts = NONE,
    declaredBracket: 1 | 2 | 3 | 4 | 5 | null = null,
    inDeck = false,
  ) =>
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <SuggestionTile
          suggestion={suggestion(over)}
          deckId="d1"
          declaredBracket={declaredBracket}
          noteCounts={counts}
          inDeck={inDeck}
          selfClaimed={false}
          siblings={["o-test"]}
          commanderShortName="Korvold"
          newestAsOf={null}
        />
      </CardDetailProvider>,
    );

  it("draws the clause for a card that carries a fact", () => {
    mount({ facts: facts({ gameChanger: true }) }, { ...NONE, gameChanger: 3 });
    expect(screen.getByText("A game changer, and your 4th.")).toBeInTheDocument();
  });

  it("draws nothing for a card that carries none", () => {
    mount({ facts: null });
    expect(screen.queryByTestId("card-note")).toBeNull();
  });

  // The tile composes no accessible name of its own — its name is a `CardDetailTrigger`
  // carrying the card's name — so hiding the note here would delete the sentence rather than
  // relocate it, and there is nowhere to relocate it to.
  it("leaves the note readable rather than aria-hidden", () => {
    mount({ facts: facts({ tutor: true }) });
    expect(screen.getByTestId("card-note").getAttribute("aria-hidden")).toBeNull();
  });

  // The cap is the rule's and the tile only states its density. Asserted through the tile so
  // a host passing `density="row"` by mistake is caught here rather than on screen.
  it("caps at one fact, where the row would draw two", () => {
    mount({ facts: facts({ gameChanger: true, tutor: true }) });
    expect(screen.getByText("A game changer, and your 1st.")).toBeInTheDocument();
    expect(screen.queryByText(/No bracket limits how many you play/)).toBeNull();
  });

  // Sub-project 3's clause is the one that says a combo completes. Two sentences about one
  // combo on one row is the defect this omission exists to avoid.
  it("says nothing about a combo the candidate completes", () => {
    mount({
      facts: facts({
        completesCombos: [
          {
            variantId: "v1",
            cards: [{ oracleId: "o-p", name: "Partner" }],
            produces: ["Infinite mana"],
            bracketTag: "",
            usesCommander: false,
            manaValueNeeded: null,
            manaNeeded: null,
            steps: null,
            notablePrerequisites: null,
          },
        ],
      }),
    });
    expect(screen.queryByTestId("card-note")).toBeNull();
  });
});

describe("the note on the top-off row", () => {
  const candidate = (over: Record<string, unknown> = {}) => ({
    oracleId: "o-test",
    name: "Test Card",
    typeLine: "Sorcery",
    facet: "removal",
    owned: true,
    quantity: 1,
    committedQuantity: 0,
    manaCost: "{2}{B}",
    manaValue: 3,
    synergyPts: 4,
    inclusionPct: 40,
    imageUri: null,
    price: null,
    availability: null,
    ...over,
  });

  const mount = (over: Record<string, unknown>, counts: NoteCounts = NONE) =>
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
          declaredBracket={3}
          noteCounts={counts}
          onAnnounce={() => {}}
          onInflight={() => {}}
          onCommitted={() => {}}
          onClose={() => {}}
          onBarHeight={() => {}}
        />
      </CardDetailProvider>,
    );

  it("draws the sentence, and quotes the declared bracket's limit", () => {
    mount({ facts: facts({ gameChanger: true }) }, { ...NONE, gameChanger: 3 });
    // The row mounts a phone tree and a desktop tree, so the sentence appears twice. Asserted
    // by `getAllBy` rather than by a count, which would be a fact about the harness.
    expect(
      screen.getAllByText("A game changer, and your 4th. Upgraded allows 3.").length,
    ).toBeGreaterThan(0);
  });

  // Every visual atom on this row is aria-hidden and the tick's one accessible name is where
  // all of it is heard. A note drawn but not spoken is a row a screen reader is told less
  // about than the build before it.
  it("hides the drawn note and speaks it in the row's accessible name instead", () => {
    mount({ facts: facts({ tutor: true }) }, { ...NONE, tutor: 5 });

    for (const note of screen.getAllByTestId("card-note")) {
      expect(note.getAttribute("aria-hidden")).toBe("true");
    }
    const tick = screen.getAllByRole("checkbox")[0];
    expect(tick.getAttribute("aria-label")).toContain(
      "A tutor, and your 6th. No bracket limits how many you play.",
    );
  });

  it("neither draws nor speaks anything for a card with no facts", () => {
    mount({ facts: null });
    expect(screen.queryAllByTestId("card-note")).toHaveLength(0);
    expect(screen.getAllByRole("checkbox")[0].getAttribute("aria-label")).not.toContain(
      cardNote.label,
    );
  });
});
