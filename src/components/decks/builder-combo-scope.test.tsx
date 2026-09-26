import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import { recommendedMix } from "../../lib/decks/mix";

/**
 * WHAT THE SHELL ACTUALLY SENDS as the combo block's deck scope.
 *
 * `combo-scope.test.ts` proves the RULE and `card-detail-provider.test.tsx` proves the trip
 * through the provider — and neither reaches this mount site. Removing the prop here leaves
 * both of them green while production sends `undefined` and no deck modal ever says
 * `in this deck`. It is the third link in the same chain and the third place this feature has
 * lost a value silently between two tested ends.
 */
// Typed to the real action's shape, so the scope argument is readable off the call rather
// than indexed out of an empty tuple.
const getCardDetail = vi.fn(
  async (_oracleId: string, _deckOracleIds?: readonly string[]) => null,
);
// A press reads through the action and a prefetch through the route; one stub answers both.
vi.mock("../../app/card-detail-action", () => ({ getCardDetail }));
vi.mock("../../lib/cards/fetch-card-detail", () => ({ fetchCardDetail: getCardDetail }));
vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { BuilderShell } = await import("./builder-shell");

function makeDeck(): DeckDetail {
  return {
    id: "deck-1",
    name: "Korvold",
    createdAt: new Date("2026-01-01"),
    commander: {
      oracleId: "korvold",
      name: "Korvold, Fae-Cursed King",
      colorIdentity: ["B", "R", "G"],
      manaCost: "{2}{B}{R}{G}",
      typeLine: "Legendary Creature — Dragon Noble",
      oracleText: null,
      imageUri: null,
      artCropUri: null,
    },
    partner: null,
    filled: false,
    cards: [
      {
        oracleId: "forest",
        name: "Forest",
        typeLine: "Basic Land — Forest",
        cardTypeGroup: "Lands",
        role: "land",
        cmc: 0,
        owned: true,
        quantity: 1,
        auto: false,
        printedName: null,
        printedSetCode: null,
        printedCollectorNumber: null,
      },
    ],
    built: 1,
    ownedCount: 1,
    coveredCount: 1,
    toBuyCount: 0,
    total: 1,
    unresolvedRows: [],
    declaredBracket: null,
    intent: null,
    intentSeeded: false,
    noteCounts: { gameChanger: 0, extraTurns: 0, tutor: 0 },
  } as DeckDetail;
}

describe("BuilderShell — the combo scope it sends", () => {
  it("sends the 99 AND the commander with a card-detail read", async () => {
    render(
      <BuilderShell
        mix={recommendedMix(null, false)}
        deck={makeDeck()}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        newestAsOf={null}
      />,
    );

    // Any decklist row opens the modal; the row's own trigger is the shipped path.
    const trigger = screen.getAllByRole("button", { name: /View details for/ })[0];
    await act(async () => {
      trigger.focus();
      fireEvent.click(trigger);
    });

    expect(getCardDetail).toHaveBeenCalled();
    const scope = getCardDetail.mock.calls[0][1];
    expect(scope, "the shell sent no combo scope at all").toBeTruthy();
    expect(scope).toContain("forest");
    // §4.3b rule 3: the commander counts as held, and it is a column rather than a row.
    expect(scope, "the commander is missing from the scope").toContain("korvold");
  });
});
