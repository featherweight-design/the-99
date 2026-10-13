// Resolving an unresolved import line.
//
// The contract worth pinning here is the disclosure — seeded, one at a time,
// Esc returns focus — plus the two mutations landing in the deck's own numbers
// before the server answers, and the sentence the live region reads out.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { SearchResult } from "../../app/decks/[id]/search-action";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckCounts, type DeckDetailCard, type DeckUnresolvedRow } from "../../lib/decks/grouping";
import { recommendedMix } from "../../lib/decks/mix";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

// Typed, so a hand-built result that leaves out a required field fails typecheck rather than
// reaching the row as `undefined` — which is how a stand-in with no `facts` draws no note.
const searchCards = vi.fn<(...args: unknown[]) => Promise<SearchResult[]>>();
const resolveUnresolvedRow = vi.fn(async () => ({ ok: true as const }));
const deleteUnresolvedRow = vi.fn(async () => ({ ok: true as const }));

vi.mock("../../app/decks/[id]/search-action", () => ({ searchCards }));
vi.mock("../../app/decks/import-actions", () => ({
  resolveUnresolvedRow,
  deleteUnresolvedRow,
}));

const { ResolutionExpander } = await import("./resolution-expander");
const { AddOptimisticCardProvider, useOptimisticDeckCards } = await import("./optimistic-deck");
const { Decklist } = await import("./decklist");
const { CardDetailProvider } = await import("../cards/card-detail-provider");
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();

const copy = deckImportCopy.resolve;
const unresolvedCopy = deckImportCopy.unresolved;

const result = (over: Partial<SearchResult> & { name: string }): SearchResult => ({
  oracleId: over.name.toLowerCase(),
  typeLine: "Enchantment",
  cmc: 2,
  owned: true,
  ownedQty: 1,
  cardTypeGroup: "Enchantments",
  role: "draw",
  imageUri: null,
  manaCost: null,
  flavorName: null,
  facts: null,
  ...over,
});

const rhystic = result({ name: "Rhystic Study" });
const mystic = result({ name: "Mystic Remora", owned: false, ownedQty: 0 });
const commander = result({ name: "Muldrotha", oracleId: "cmdr" });

const solRing: DeckDetailCard = {
  oracleId: "sol-ring",
  name: "Sol Ring",
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "ramp",
  cmc: 2,
  owned: true,
  quantity: 1,
  auto: false,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
};

const line = (over: Partial<DeckUnresolvedRow> = {}): DeckUnresolvedRow => ({
  id: "r1",
  rawName: "Rystic Studie",
  quantity: 1,
  sourceLine: 41,
  ...over,
});

/**
 * The counts are rendered here rather than asserted off the toolbar because the
 * point of the test is the deck-wide optimistic list, and `built` / `total` are
 * derived from it in exactly the way the builder derives them.
 */
function Harness({
  cards = [solRing],
  rows = [line()],
}: {
  cards?: DeckDetailCard[];
  rows?: DeckUnresolvedRow[];
}) {
  const deck = useOptimisticDeckCards(cards, rows);
  const [, setExpanded] = useState(false);
  const counts = deckCounts(deck.cards, deck.unresolvedCount);
  return (
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <AddOptimisticCardProvider
        value={{
          add: deck.addOptimisticCard,
          remove: (card) => deck.removeOptimisticCard(card.oracleId),
          markSpent: vi.fn(),
          announceUndo: vi.fn(),
          reportRemoveFailure: vi.fn(),
          resolveRow: deck.resolveOptimisticRow,
          deleteRow: deck.deleteOptimisticRow,
          keep: deck.keepOptimisticCard,
        }}
      >
        <p>{`built ${counts.built} total ${counts.total}`}</p>
        <Decklist mix={TEST_MIX}
          deckId="deck-1"
          commanderOracleId="cmdr"
        deckOracleIds={[]}
          cards={deck.cards}
          unresolvedRows={deck.unresolvedRows}
          built={counts.built}
          bodySize={99}
          filter="all"
          grouping="type"
          onFilterChange={vi.fn()}
          onGroupingChange={vi.fn()}
          onUnresolvedExpandedChange={setExpanded}
         newestAsOf={null}/>
      </AddOptimisticCardProvider>
    </CardDetailProvider>
  );
}

const rowButton = (raw: string, qty = 1) =>
  screen.getByRole("button", { name: unresolvedCopy.rowAria(raw, qty) });
const field = () => screen.getByRole("combobox");

async function open(raw = "Rystic Studie", qty = 1) {
  fireEvent.click(rowButton(raw, qty));
  await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(0));
}

beforeEach(() => {
  vi.clearAllMocks();
  searchCards.mockResolvedValue([rhystic, mystic]);
});

describe("the resolution expander as a disclosure", () => {
  it("seeds the search with the raw line and selects it", async () => {
    render(<Harness />);
    fireEvent.click(rowButton("Rystic Studie"));

    const input = field() as HTMLInputElement;
    expect(input).toHaveValue("Rystic Studie");
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe("Rystic Studie".length);
    await waitFor(() => expect(searchCards).toHaveBeenCalledWith("Rystic Studie", null, false, "deck-1"));
  });

  it("keeps one row open at a time", async () => {
    render(
      <Harness
        rows={[line(), line({ id: "r2", rawName: "Cultivat", sourceLine: 42 })]}
      />,
    );
    fireEvent.click(rowButton("Rystic Studie"));
    expect(screen.getAllByRole("combobox")).toHaveLength(1);

    fireEvent.click(rowButton("Cultivat"));
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(field()).toHaveValue("Cultivat");
    expect(rowButton("Rystic Studie")).toHaveAttribute("aria-expanded", "false");
  });

  it("collapses on Esc and hands focus back to the row", async () => {
    render(<Harness />);
    fireEvent.click(rowButton("Rystic Studie"));
    fireEvent.keyDown(field(), { key: "Escape" });

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(rowButton("Rystic Studie")).toHaveFocus();
  });

  // Matching ran against all of Scryfall, so a card the player doesn't own is a
  // valid answer to "what was this line?".
  it("defaults the owned filter off and resets it when the row closes", async () => {
    render(<Harness />);
    await open();
    const toggle = screen.getByRole("checkbox", { name: copy.ownedToggleLabel });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    await waitFor(() => expect(searchCards).toHaveBeenCalledWith("Rystic Studie", null, true, "deck-1"));

    fireEvent.keyDown(field(), { key: "Escape" });
    fireEvent.click(rowButton("Rystic Studie"));
    expect(screen.getByRole("checkbox", { name: copy.ownedToggleLabel })).not.toBeChecked();
  });

  it("shows its own dead end rather than the collection's when nothing matches", async () => {
    searchCards.mockResolvedValue([]);
    render(<Harness />);
    fireEvent.click(rowButton("Rystic Studie"));

    await waitFor(() => expect(screen.getByText(copy.noResultsHeading)).toBeInTheDocument());
    expect(screen.getByText(copy.noResultsBody)).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  // The keyboard hint lives in the results row, which the dead end replaces, so
  // an unguarded aria-describedby would point a screen reader at nothing.
  it("stops describing the field once the hint it named has gone", async () => {
    searchCards.mockResolvedValue([]);
    render(<Harness />);
    fireEvent.click(rowButton("Rystic Studie"));

    await waitFor(() => expect(screen.getByText(copy.noResultsHeading)).toBeInTheDocument());
    expect(field()).not.toHaveAttribute("aria-describedby");
  });
});

describe("resolving and deleting a line", () => {
  it("takes the line out and puts the card in before the server answers", async () => {
    render(<Harness />);
    await open();
    expect(screen.getByText("built 1 total 2")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("option")[0]);

    // Both in one wait: the mocked action resolves with no revalidation, so
    // React drops the prediction a tick later and the numbers return to the
    // server's. The prediction is what this asserts, not what survives it.
    await waitFor(() => {
      expect(screen.getByText("built 2 total 2")).toBeInTheDocument();
      expect(screen.queryByText(unresolvedCopy.groupLabel)).toBeNull();
    });
    expect(resolveUnresolvedRow).toHaveBeenCalledWith("deck-1", "r1", "rhystic study");
  });

  it("drops the line out of the deck's total when it is deleted", async () => {
    render(<Harness rows={[line({ quantity: 3 })]} />);
    fireEvent.click(rowButton("Rystic Studie", 3));
    expect(screen.getByText("built 1 total 4")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: copy.delete }));

    await waitFor(() => expect(screen.getByText("built 1 total 1")).toBeInTheDocument());
    expect(deleteUnresolvedRow).toHaveBeenCalledWith("deck-1", "r1");
  });

  it("says the card is on the shopping list when the player does not own it", async () => {
    render(<Harness />);
    await open();

    fireEvent.click(screen.getAllByRole("option")[1]);

    await waitFor(() =>
      expect(screen.getByText(copy.resolvedUnownedMobile("Mystic Remora"))).toBeInTheDocument(),
    );
  });

  it("counts what's built when the player does own it", async () => {
    render(<Harness />);
    await open();

    fireEvent.click(screen.getAllByRole("option")[0]);

    await waitFor(() =>
      expect(screen.getByText(copy.resolvedMobile("Rhystic Study", "2"))).toBeInTheDocument(),
    );
  });

  // Chosen in JS rather than drawn twice behind `md:hidden`, or a screen reader
  // at desktop width would read both sentences.
  it("spends the desktop's room on how many lines are left", async () => {
    const mobile = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      ...mobile(query),
      matches: true,
    })) as typeof window.matchMedia;

    render(<Harness />);
    await open();
    fireEvent.click(screen.getAllByRole("option")[0]);

    await waitFor(() =>
      expect(
        screen.getByText(copy.resolved("Rhystic Study", "2", 0, copy.roleClause("Draw", 1, 10))),
      ).toBeInTheDocument(),
    );
    window.matchMedia = mobile;
  });

  it("narrates a delete against the deck's total", async () => {
    render(<Harness rows={[line({ quantity: 3 })]} />);
    fireEvent.click(rowButton("Rystic Studie", 3));

    fireEvent.click(screen.getByRole("button", { name: copy.delete }));

    await waitFor(() =>
      expect(screen.getByText(copy.deletedMobile("Rystic Studie", "1"))).toBeInTheDocument(),
    );
  });

  // The region is mounted from the first render — one that arrives carrying its
  // message is not reliably announced — so it is polite and empty until then.
  it("keeps one polite region that replaces its own text", async () => {
    render(<Harness rows={[line(), line({ id: "r2", rawName: "Cultivat", sourceLine: 42 })]} />);
    const group = screen.getByRole("region");
    const regions = () => group.querySelectorAll('[aria-live="polite"]');
    expect(regions()).toHaveLength(1);
    expect(regions()[0]).toHaveTextContent("");

    await open();
    fireEvent.click(screen.getAllByRole("option")[0]);

    await waitFor(() => expect(regions()[0]).toHaveTextContent(/Rhystic Study/));
    expect(regions()).toHaveLength(1);
  });
});

/**
 * A dropped second activation must not reach the parent either. `run` latches on
 * a ref, so the mutation is already safe; what these pin is that the collapse
 * and the narration ride the same latch rather than firing beside it.
 */
describe("a second activation in the same tick", () => {
  const spies = () => ({ onCollapse: vi.fn(), onResolved: vi.fn(), onDeleted: vi.fn() });

  // Delete only. The resolve path takes the same fix, but its options unmount on
  // the first click, so a second one cannot be delivered and a test here would
  // pass against the bug as readily as against the fix.

  it("neither deletes twice nor tells the group twice", async () => {
    const s = spies();
    render(<ResolutionExpander id="x" deckId="deck-1" row={line()} deckOracleIds={[]} {...s} />);

    const button = screen.getByRole("button", { name: copy.delete });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(deleteUnresolvedRow).toHaveBeenCalledTimes(1));
    expect(s.onDeleted).toHaveBeenCalledTimes(1);
  });

  // The two mutations hold separate latches, so neither used to see the other.
  // Both answer the same line, and only one of them can: whichever DELETE
  // reaches the row first claims it, and the loser returns "unresolved row not
  // found" — an error drawn on a row that has already gone.
  it("will not delete a line it has just resolved", async () => {
    const s = spies();
    searchCards.mockResolvedValue([rhystic]);
    render(<ResolutionExpander id="x" deckId="deck-1" row={line()} deckOracleIds={[]} {...s} />);
    await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole("option")[0]);
    fireEvent.click(screen.getByRole("button", { name: copy.delete }));

    await waitFor(() => expect(resolveUnresolvedRow).toHaveBeenCalledTimes(1));
    expect(deleteUnresolvedRow).not.toHaveBeenCalled();
    expect(s.onDeleted).not.toHaveBeenCalled();
  });
});

describe("resolving a line to the deck's own commander", () => {
  // The server answers the line but refuses to put the commander in the 99 as
  // well. An optimistic add here would show a `built` the server never reaches.
  it("clears the line without adding to the 99", async () => {
    searchCards.mockResolvedValue([commander]);
    render(<Harness />);
    expect(screen.getByText("built 1 total 2")).toBeInTheDocument();

    await open();
    fireEvent.click(screen.getAllByRole("option")[0]);

    await waitFor(() => expect(screen.getByText("built 1 total 1")).toBeInTheDocument());
    expect(resolveUnresolvedRow).toHaveBeenCalledTimes(1);
  });
});

describe("resolving a line to a non-basic the deck already holds", () => {
  // Singleton: the server's insert hits onConflictDoNothing and the optimistic
  // reducer no-ops to match, so the deck gains nothing and the sentence that
  // narrates the gain must not claim one.
  it("does not count a copy the deck never gains", async () => {
    searchCards.mockResolvedValue([result({ name: "Sol Ring", oracleId: "sol-ring" })]);
    render(<Harness />);

    await open();
    fireEvent.click(screen.getAllByRole("option")[0]);

    await waitFor(() =>
      expect(screen.getByText(copy.resolvedMobile("Sol Ring", "1"))).toBeInTheDocument(),
    );
  });
});

describe("the last line in the group", () => {
  // The row that held focus is gone, so without this focus lands on <body> and
  // a keyboard user restarts from the top of the document.
  it("hands focus to the note it leaves behind", async () => {
    render(<Harness />);
    fireEvent.click(rowButton("Rystic Studie"));
    fireEvent.click(screen.getByRole("button", { name: copy.delete }));

    await waitFor(() => {
      const note = document.querySelector('[aria-live="polite"]');
      expect(document.activeElement).toBe(note);
    });
  });
});

// #43. `useCardSearch` hands this row's search a `deckId`, so every figure comes
// back with this deck's own claim already subtracted. The flag that says so may
// only be set per card, where this deck actually held a claim the query dropped
// — set blanket it silences every genuine hard claim by another finished deck,
// which is the whole headline case (design 5.6).
describe("the resolution row's availability marker", () => {
  const spies = () => ({ onCollapse: vi.fn(), onResolved: vi.fn(), onDeleted: vi.fn() });
  const claimed = (names: string[]) => ({
    owned: 1,
    hard: names.length,
    soft: 0,
    free: 0,
    claims: names.map((n, i) => ({ id: `d${i + 1}`, name: n, quantity: 1, mature: true, pending: false, commander: false, senior: true })),
  });

  const mount = (r: SearchResult, deckOracleIds: string[] = [], commanderOracleId?: string) => {
    searchCards.mockResolvedValue([r]);
    render(
      <ResolutionExpander
        id="x"
        deckId="deck-1"
        row={line()}
        deckOracleIds={deckOracleIds}
        commanderOracleId={commanderOracleId}
        {...spies()}
      />,
    );
    return waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(0));
  };

  it("claims a card another committed deck already holds", async () => {
    await mount(result({ name: "Rhystic Study", availability: claimed(["Atraxa"]) }));

    // Both widths are drawn, so the marker is in the DOM twice.
    expect(screen.getAllByText(/none free, in/)).toHaveLength(2);
  });

  it("stays silent on a duplicate line for a card this deck already runs", async () => {
    await mount(
      result({ name: "Rhystic Study", availability: claimed([]) }),
      ["rhystic study"],
    );

    expect(screen.queryByText(/none free/)).toBeNull();
  });

  // The commander is no `deck_cards` row, so it is absent from `deckOracleIds`
  // while the excluded read drops its claim all the same.
  it("stays silent on this deck's own commander", async () => {
    await mount(
      result({ name: "Muldrotha", oracleId: "cmdr", availability: claimed([]) }),
      [],
      "cmdr",
    );

    expect(screen.queryByText(/none free/)).toBeNull();
  });
});
