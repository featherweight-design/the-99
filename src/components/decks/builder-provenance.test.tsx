// The ledger's wiring, exercised through BuilderShell because the shell owns
// it: the header's figure, and the pass sheet its `Show these N` and the foot's
// other drafts open, with the list's own rows inside the deck page's providers.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import type { FillPassSummary } from "../../lib/decks/fill-passes";
import { topOffCopy } from "../../lib/copy/top-off";
import { availabilityCopy } from "../../lib/copy/availability";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { cardSheetCopy } from "../../lib/copy/card-carousel";
import { recommendedMix } from "../../lib/decks/mix";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
  fillDeck: vi.fn(),
  undoFillPass: vi.fn(),
}));

// A row's press opens the card detail, which reads the card from here.
vi.mock("../../app/card-detail-action", () => ({
  getCardDetail: vi.fn(async (oracleId: string) => ({
    oracleId, name: "Card 0", typeLine: "Artifact", manaCost: "{2}", cmc: 2, oracleText: null, keywords: [],
    rarity: "common", colorIdentity: [], imageUri: null, printedName: null, quantity: 0, printings: [],
    setCodes: [], primarySetCode: "", preferredPrinting: null,
  })),
}));

const { BuilderShell } = await import("./builder-shell");
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();

const ledger = topOffCopy.ledger;

function makeDeck(autoCount: number, keptCount: number): DeckDetail {
  const cards = Array.from({ length: autoCount + keptCount }, (_, i) => ({
    oracleId: `card-${i}`,
    name: `Card ${i}`,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts" as const,
    role: "other" as const,
    owned: true,
    quantity: 1,
    auto: i < autoCount,
  }));
  const size = autoCount + keptCount;
  return {
    id: "deck-1",
    name: "Korvold",
    createdAt: new Date("2026-01-01"),
    filled: true,
    commander: {
      oracleId: "korvold",
      name: "Korvold, Fae-Cursed King",
      colorIdentity: ["B", "R", "G"],
      manaCost: "{2}{B}{R}{G}",
      typeLine: "Legendary Creature — Dragon Noble",
      oracleText: null,
      imageUri: null,
    },
    cards,
    built: size,
    ownedCount: size,
    toBuyCount: 0,
    total: size,
    unresolvedRows: [],
  } as unknown as DeckDetail;
}

function makePass(id: string, ordinal: number, oracleIds: string[]): FillPassSummary {
  return {
    id,
    kind: "top_off",
    ordinal,
    createdAt: new Date("2026-01-01"),
    live: oracleIds.length,
    kept: 0,
    removed: 0,
    openSlots: 5,
    liveCards: oracleIds.map((oracleId) => ({ oracleId, quantity: 1 })),
  };
}

async function mount(deck: DeckDetail, fillPasses: FillPassSummary[] = []) {
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(
      <BuilderShell mix={TEST_MIX}
        deck={deck}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        fillPasses={fillPasses}
       newestAsOf={null}/>,
    );
  });
  return view;
}

/** The ledger opens from the to-do card foot's `Where these N cards came from ▾`. */
async function openLedger(total: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: ledger.header(total) }));
  });
}

describe("BuilderShell — the ledger's header", () => {
  it("states the deck's auto count, not the deck's size, on the foot and over the opened lines", async () => {
    await mount(makeDeck(3, 20), [makePass("p1", 1, ["card-0", "card-1", "card-2"])]);
    // Closed for the visit until pressed: the lines are not drawn.
    expect(screen.queryByRole("heading", { name: ledger.header("3") })).not.toBeInTheDocument();
    await openLedger("3");
    expect(screen.getByRole("heading", { name: ledger.header("3") })).toBeInTheDocument();
  });

  it("is absent once the player has kept or swept every auto card", async () => {
    await mount(makeDeck(0, 20), [makePass("p1", 1, [])]);
    expect(screen.queryByText(/came from/)).not.toBeInTheDocument();
  });
});

/** Opens the pass sheet from the ledger line's `Show these N`. */
async function show(n: string, ordinal: string, total: string) {
  await openLedger(total);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: ledger.markAria(n, ledger.passLabel(ordinal)) }));
  });
}

const sheet = () => screen.getByRole("dialog", { name: /cards?$/ });

describe("BuilderShell — the pass sheet (deck messages PR 3)", () => {
  it("draws the pass, its count, its sentence and only its live cards, as the list's own rows", async () => {
    await mount(makeDeck(3, 0), [makePass("p1", 1, ["card-0", "card-1"])]);
    await show("2", "1", "3");
    const dialog = sheet();
    expect(dialog).toHaveAccessibleName(ledger.sheetTitle(2));
    expect(within(dialog).getByText(ledger.sheetLabel({ kind: "top_off", ordinal: 1 }))).toBeInTheDocument();
    expect(within(dialog).getByText(/you chose from the last 5/)).toBeInTheDocument();
    // `DecklistRow` itself: the row's own remove press, named as in the list.
    expect(within(dialog).getByRole("button", { name: addPanelCopy.row.removeAria("Card 0") })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: addPanelCopy.row.removeAria("Card 1") })).toBeInTheDocument();
    // Card 2 is in the deck but not in this pass.
    expect(within(dialog).queryByText("Card 2")).toBeNull();
    expect(within(dialog).getByRole("button", { name: ledger.undoAria("2", ledger.passLabel("1")) })).toBeInTheDocument();
  });

  it("takes a row out and drops the count when its ✕ removes the card", async () => {
    // Held in flight, as a real removal is until the page's next read: the optimistic list is what
    // the sheet draws.
    const { removeCardFromDeck } = await import("../../app/decks/actions");
    vi.mocked(removeCardFromDeck).mockReturnValue(new Promise(() => {}));
    await mount(makeDeck(2, 0), [makePass("p1", 1, ["card-0", "card-1"])]);
    await show("2", "1", "2");
    await act(async () => {
      fireEvent.click(within(sheet()).getByRole("button", { name: addPanelCopy.row.removeAria("Card 0") }));
    });
    expect(sheet()).toHaveAccessibleName(ledger.sheetTitle(1));
    expect(within(sheet()).queryByText("Card 0")).toBeNull();
  });

  it("opens a row's card stacked on the sheet, whose way back names the pass", async () => {
    await mount(makeDeck(2, 0), [makePass("p1", 1, ["card-0"])]);
    await show("1", "1", "2");
    await act(async () => {
      fireEvent.click(within(sheet()).getByText("Card 0").closest("button")!);
    });
    const label = ledger.sheetLabel({ kind: "top_off", ordinal: 1 });
    expect(await screen.findByTestId("card-modal-back-mobile")).toHaveAccessibleName(cardSheetCopy.back.a11y(label));
  });

  it("runs the shipped undo from its foot", async () => {
    const { undoFillPass } = await import("../../app/decks/actions");
    vi.mocked(undoFillPass).mockResolvedValue({ removed: 1, built: 1 } as never);
    await mount(makeDeck(2, 0), [makePass("p1", 1, ["card-0"])]);
    await show("1", "1", "2");
    await act(async () => {
      fireEvent.click(within(sheet()).getByRole("button", { name: ledger.undoAria("1", ledger.passLabel("1")) }));
    });
    expect(undoFillPass).toHaveBeenCalledWith("deck-1", "p1");
  });

  it("closes on Done, and when its pass is gone from the incoming summaries", async () => {
    const deck = makeDeck(2, 0);
    const view = await mount(deck, [makePass("p1", 1, ["card-0"])]);
    await show("1", "1", "2");
    await act(async () => {
      fireEvent.click(within(sheet()).getByRole("button", { name: ledger.sheetDone }));
    });
    expect(screen.queryByRole("dialog", { name: /cards?$/ })).toBeNull();

    // The ledger is still open under the foot: Show these again.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: ledger.markAria("1", ledger.passLabel("1")) }));
    });
    expect(sheet()).toBeInTheDocument();
    await act(async () => {
      view.rerender(
        <BuilderShell mix={TEST_MIX}
          deck={deck}
          suggestions={[]}
          degraded={false}
          firstRun={false}
          commanderIdentity={["B", "R", "G"]}
          arrivedFromImport={false}
          fillPasses={[makePass("p2", 2, ["card-1"])]}
         newestAsOf={null}/>,
      );
    });
    expect(screen.queryByRole("dialog", { name: /cards?$/ })).toBeNull();
  });

  it("groups the cards other drafts want under each draft, with no undo", async () => {
    const deck = makeDeck(3, 0);
    const claim = (id: string, name: string) => ({ id, name, quantity: 1, mature: false, pending: false, commander: false });
    const soft = (...claims: ReturnType<typeof claim>[]) => ({ owned: 1, hard: 0, soft: claims.length, free: 1, claims });
    const cards = deck.cards as unknown as { availability?: unknown }[];
    cards[0].availability = soft(claim("d1", "Elf Tribal"), claim("d2", "Mono-G Stompy"));
    cards[1].availability = soft(claim("d1", "Elf Tribal"));
    await mount(deck);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: availabilityCopy.deckRollup.softFoot(2) }));
    });
    const dialog = sheet();
    expect(dialog).toHaveAccessibleName(ledger.sheetTitle(2));
    expect(within(dialog).getByText(availabilityCopy.deckRollup.sheetEyebrow)).toBeInTheDocument();
    expect(within(dialog).getByText("Elf Tribal")).toBeInTheDocument();
    expect(within(dialog).getByText("Mono-G Stompy")).toBeInTheDocument();
    // Card 0 is under both drafts; Card 2 is wanted by none.
    expect(within(dialog).getAllByRole("button", { name: addPanelCopy.row.removeAria("Card 0") })).toHaveLength(2);
    expect(within(dialog).queryByText("Card 2")).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /^Undo/ })).toBeNull();
    expect(within(dialog).getByRole("button", { name: ledger.sheetDone })).toBeInTheDocument();
  });
});
