// QuickAddBar — retrieval is a bar, not a room.
//
// The tests that matter here are the keyboard contract and the two states the
// old SearchPane got wrong: a filter that hides results without saying so, and
// an in-deck row that looks actionable.
import { EMPTY_NOTE_COUNTS } from "../../lib/bracket/card-note";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import type { SearchResult } from "../../app/decks/[id]/search-action";
import type { BrowseCard } from "../../lib/collection/browse";

// Typed, so a hand-built result that leaves out a required field fails typecheck rather than
// reaching the row as `undefined` — which is how a stand-in with no `facts` draws no note.
const searchCards = vi.fn<(...args: unknown[]) => Promise<SearchResult[]>>();
const addCardToDeck = vi.fn(async () => ({ ok: true as const }));

vi.mock("../../app/decks/[id]/search-action", () => ({ searchCards }));
vi.mock("../../app/decks/actions", () => ({ addCardToDeck }));
// The card detail's sheet reaches these; the grid tests below open it.
vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { QuickAddBar } = await import("./quick-add-bar");
const { CardDetailProvider, cardDetailCopy, warmCardModal } = await import("../cards/card-detail-provider");
// The modal is loaded on demand; loaded here, a press draws it in the same tick.
await warmCardModal();
const { addPanelCopy } = await import("../../lib/copy/decks-builder");
const { cardCarouselCopy } = await import("../../lib/copy/card-carousel");
const { BasicCountsProvider } = await import("./basic-counts");

const row = (over: Partial<SearchResult> & { name: string }): SearchResult => ({
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

const rhystic = row({ name: "Rhystic Study" });
const sram = row({ name: "Sram's Study", typeLine: "Land", role: "land" });
const steam = row({ name: "Steam-Core Study", owned: false, ownedQty: 0, typeLine: "Artifact" });

function mount(props: Partial<React.ComponentProps<typeof QuickAddBar>> = {}) {
  return render(
    <QuickAddBar
      deckId="deck-1"
      commanderIdentity={["U"]}
      deckOracleIds={[]}
      commanderShortName="Korvold"
      commanderOracleId="cmd-korvold"
      declaredBracket={null}
      noteCounts={EMPTY_NOTE_COUNTS}
      {...props}
    />,
  );
}

const field = () => screen.getByRole("combobox");
/** A row's two cells, in the board's order: the thumbnail and name, then Add. */
const nameCell = (r: HTMLElement) => within(r).getAllByRole("gridcell")[0];
const addCell = (r: HTMLElement) => within(r).getAllByRole("gridcell")[1];
const toggle = () => screen.getByRole("checkbox", { name: /only cards you own/i });

// The debounce is real, so every test types and then waits for rows to land.
async function search(q = "stu") {
  fireEvent.change(field(), { target: { value: q } });
  await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(0));
}

beforeEach(() => {
  vi.clearAllMocks();
  searchCards.mockResolvedValue([rhystic, sram, steam]);
});

describe("QuickAddBar — combobox contract", () => {
  it("is a combobox owning a grid, not a dialog", async () => {
    mount();
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(field()).toHaveAttribute("aria-haspopup", "grid");
    expect(screen.queryByRole("dialog")).toBeNull();

    await search();
    expect(field()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("grid")).toHaveAttribute(
      "id",
      field().getAttribute("aria-controls"),
    );
  });

  it("moves the active row with the arrows rather than DOM focus", async () => {
    mount();
    await search();

    // The first row is active on arrival, on its Add cell, so Enter adds the top
    // match with no arrowing — which is what the "↵ to add" hint promises.
    const adds = () => screen.getAllByRole("row").map((r) => addCell(r));
    expect(field()).toHaveAttribute("aria-activedescendant", adds()[0].id);

    fireEvent.keyDown(field(), { key: "ArrowDown" });
    expect(field()).toHaveAttribute("aria-activedescendant", adds()[1].id);

    fireEvent.keyDown(field(), { key: "ArrowUp" });
    expect(field()).toHaveAttribute("aria-activedescendant", adds()[0].id);
  });

  // The rows stay on screen through the next debounce so the list does not
  // blank on every keystroke, which is why Enter has to check they still answer
  // the query in the field.
  it("refuses to add a row the user has already typed past", async () => {
    mount();
    await search();

    // A distinct row for the new query, so the wait below is for the rows
    // actually landing rather than merely for the request going out.
    const stuxor = row({ name: "Stuxor, the Late Answer" });
    searchCards.mockResolvedValue([stuxor]);
    fireEvent.change(field(), { target: { value: "stux" } });
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(addCardToDeck).not.toHaveBeenCalled();

    // Once the new results land, Enter works again. Matched by option label
    // rather than by text: the row splits the name around the accent-highlighted
    // run of the query, so no single node holds the whole string. A predicate
    // rather than a RegExp, because a card name is free to contain `(` or `[`.
    expect(
      await screen.findByRole("row", { name: (name) => name.includes(stuxor.name) }),
    ).toBeInTheDocument();
    fireEvent.keyDown(field(), { key: "Enter" });
    await waitFor(() => expect(addCardToDeck).toHaveBeenCalledWith("deck-1", stuxor.oracleId));
  });

  it("adds the active row on Enter", async () => {
    mount();
    await search();

    fireEvent.keyDown(field(), { key: "ArrowDown" });
    fireEvent.keyDown(field(), { key: "Enter" });
    await waitFor(() => expect(addCardToDeck).toHaveBeenCalledWith("deck-1", sram.oracleId));
  });
});

// Small items 2, item 6b (board A): the popup is a grid, each row a name cell that opens the shipped card
// detail and an Add cell, and the field keeps DOM focus throughout.
describe("QuickAddBar — the grid and card details", () => {
  const browse = (r: SearchResult): BrowseCard =>
    ({
      oracleId: r.oracleId, name: r.name, typeLine: r.typeLine, manaCost: null, cmc: r.cmc, oracleText: null,
      keywords: [], rarity: "common", colorIdentity: [], imageUri: null, printedName: null, quantity: 0,
      printings: [], setCodes: [], primarySetCode: "", preferredPrinting: null,
    }) as BrowseCard;

  function mountWithDetail(props: Partial<React.ComponentProps<typeof QuickAddBar>> = {}) {
    const fetchCard = vi.fn(async (id: string) => {
      const hit = [rhystic, sram, steam].find((r) => r.oracleId === id);
      return hit ? browse(hit) : null;
    });
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <QuickAddBar
          deckId="deck-1"
          commanderIdentity={["U"]}
          deckOracleIds={[]}
          commanderShortName="Korvold"
          commanderOracleId="cmd-korvold"
          declaredBracket={null}
          noteCounts={EMPTY_NOTE_COUNTS}
          {...props}
        />
      </CardDetailProvider>,
    );
    return { fetchCard };
  }
  const rows = () => screen.getAllByRole("row");
  const active = () => field().getAttribute("aria-activedescendant");
  const key = (k: string) => fireEvent.keyDown(field(), { key: k });
  const hint = () => screen.getByText(addPanelCopy.quickAdd.keyboardHintMove, { exact: false }).closest("p") as HTMLElement;

  it("draws each row as two cells, the name naming the details it opens", async () => {
    mountWithDetail();
    await search();
    for (const [i, r] of rows().entries()) {
      const cells = within(r).getAllByRole("gridcell");
      expect(cells).toHaveLength(2);
      expect(cells[0]).toHaveAccessibleName(cardDetailCopy.triggerAria([rhystic, sram, steam][i].name));
      expect(cells[1]).toHaveAccessibleName(addPanelCopy.quickAdd.rowAdd);
    }
    // The row keeps the whole sentence the option used to carry.
    expect(rows()[0]).toHaveAccessibleName(expect.stringContaining(rhystic.name));
    // The active descendant is a CELL, row 1's Add on arrival.
    expect(active()).toBe(addCell(rows()[0]).id);
  });

  it("moves to the name on →, back to Add on ←, and keeps the column on ↑↓", async () => {
    mountWithDetail();
    await search();

    key("ArrowRight");
    expect(active()).toBe(nameCell(rows()[0]).id);
    // The name is the last stop: a second → moves nothing.
    key("ArrowRight");
    expect(active()).toBe(nameCell(rows()[0]).id);

    key("ArrowDown");
    expect(active()).toBe(nameCell(rows()[1]).id);
    key("ArrowUp");
    key("ArrowUp");
    expect(active()).toBe(nameCell(rows()[2]).id);

    key("ArrowLeft");
    expect(active()).toBe(addCell(rows()[2]).id);
    key("ArrowDown");
    expect(active()).toBe(addCell(rows()[0]).id);
  });

  it("leaves → and ← to the caret while they would move nothing", async () => {
    mountWithDetail();
    await search();
    // On Add, ← has no cell to go to; on the name, → has none.
    expect(fireEvent.keyDown(field(), { key: "ArrowLeft" })).toBe(true);
    expect(fireEvent.keyDown(field(), { key: "ArrowRight" })).toBe(false);
    expect(fireEvent.keyDown(field(), { key: "ArrowRight" })).toBe(true);
    expect(fireEvent.keyDown(field(), { key: "ArrowLeft" })).toBe(false);
  });

  it("swaps the hint with the active cell", async () => {
    const runs = () => Array.from(hint().children, (el) => el.textContent);
    mountWithDetail();
    await search();
    // Three runs 12px apart (board `.qp .hint`), the middle one the other cell's key.
    expect(hint().className.split(/\s+/)).toEqual(expect.arrayContaining(["flex", "items-center", "gap-[12px]"]));
    expect(runs()).toEqual([
      `${addPanelCopy.quickAdd.keyboardHintMove} ·`,
      addPanelCopy.quickAdd.keyboardHintDetails,
      `· ${addPanelCopy.quickAdd.keyboardHintAdd} · ${addPanelCopy.quickAdd.keyboardHintDismiss}`,
    ]);
    expect(within(hint()).getByText(addPanelCopy.quickAdd.keyboardHintDetails).tagName).toBe("B");

    key("ArrowRight");
    expect(runs()).toEqual([
      `${addPanelCopy.quickAdd.keyboardHintMove} ·`,
      addPanelCopy.quickAdd.keyboardHintBackToAdd,
      `· ${addPanelCopy.quickAdd.keyboardHintOpensDetails} · ${addPanelCopy.quickAdd.keyboardHintDismiss}`,
    ]);
    expect(within(hint()).getByText(addPanelCopy.quickAdd.keyboardHintBackToAdd).tagName).toBe("B");
  });

  it("draws the Add slot as the plain Add once the name is the active cell", async () => {
    mountWithDetail();
    await search();
    expect(addCell(rows()[0])).toHaveTextContent(addPanelCopy.quickAdd.rowAddActive);
    key("ArrowRight");
    expect(addCell(rows()[0])).toHaveTextContent(addPanelCopy.quickAdd.rowAdd);
    expect(addCell(rows()[0])).not.toHaveTextContent(addPanelCopy.quickAdd.rowAddActive);
  });

  it("puts typing back on row 1's Add cell at once, so type-and-↵ adds the top match", async () => {
    mountWithDetail();
    await search();
    key("ArrowDown");
    key("ArrowRight");
    expect(active()).toBe(nameCell(rows()[1]).id);

    searchCards.mockResolvedValue([sram, rhystic]);
    fireEvent.change(field(), { target: { value: "stud" } });
    // Before the new rows land: the old rows are still drawn, and the keyboard is already on row 1's Add.
    expect(active()).toBe(addCell(rows()[0]).id);
    await waitFor(() => expect(rows()[0]).toHaveAccessibleName(expect.stringContaining(sram.name)));
    expect(active()).toBe(addCell(rows()[0]).id);
    key("Enter");
    await waitFor(() => expect(addCardToDeck).toHaveBeenCalledWith("deck-1", sram.oracleId));
  });

  it("opens the shipped card detail on ↵ at the name, with the results as its list, and adds nothing", async () => {
    const { fetchCard } = mountWithDetail();
    await search();
    key("ArrowDown");
    key("ArrowRight");
    await act(async () => {
      key("Enter");
    });

    expect(fetchCard).toHaveBeenCalledWith(sram.oracleId, undefined);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName(sram.name);
    // The results are its siblings: the counter reads its place among them.
    expect(within(dialog).getAllByText(cardCarouselCopy.position(2, 3)).length).toBeGreaterThan(0);
    expect(addCardToDeck).not.toHaveBeenCalled();
  });

  it("opens the card on a press anywhere in the name cell, and adds nothing", async () => {
    const { fetchCard } = mountWithDetail();
    await search();

    await act(async () => {
      fireEvent.click(within(nameCell(rows()[2])).getByText(steam.typeLine, { exact: false }));
    });
    expect(fetchCard).toHaveBeenCalledWith(steam.oracleId, undefined);
    expect(await screen.findByRole("dialog")).toHaveAccessibleName(steam.name);
    expect(addCardToDeck).not.toHaveBeenCalled();
  });

  it("adds from a press on the row outside the name", async () => {
    const { fetchCard } = mountWithDetail();
    await search();
    fireEvent.click(addCell(rows()[1]));
    await waitFor(() => expect(addCardToDeck).toHaveBeenCalledWith("deck-1", sram.oracleId));
    expect(fetchCard).not.toHaveBeenCalled();
  });

  it("keeps focus in the field when the name is pressed", async () => {
    mountWithDetail();
    await search();
    // The row's mousedown is what keeps the caret in the field; the name cell inherits it.
    expect(fireEvent.mouseDown(nameCell(rows()[0]))).toBe(false);
  });

  it("returns focus to the field on close, with the query and the list kept", async () => {
    mountWithDetail();
    await search();
    field().focus();
    key("ArrowRight");
    await act(async () => {
      key("Enter");
    });
    const dialog = await screen.findByRole("dialog");

    // A press inside the card is outside the bar, and must not clear the search the card was opened from.
    const close = within(dialog).getAllByRole("button", { name: "Close card details" })[0];
    fireEvent.pointerDown(close);
    await act(async () => {
      fireEvent.click(close);
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(field()));
    expect(field()).toHaveValue("stu");
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(rows()).toHaveLength(3);
  });

  it("opens an in-deck row's card, though its Add stays inert", async () => {
    searchCards.mockResolvedValue([rhystic]);
    const { fetchCard } = mountWithDetail({ deckOracleIds: [rhystic.oracleId] });
    await search();

    expect(addCell(rows()[0])).toHaveAttribute("aria-disabled", "true");
    expect(addCell(rows()[0])).toHaveAccessibleName(addPanelCopy.quickAdd.rowInDeck);
    expect(nameCell(rows()[0])).not.toHaveAttribute("aria-disabled");
    key("Enter");
    expect(addCardToDeck).not.toHaveBeenCalled();

    key("ArrowRight");
    await act(async () => {
      key("Enter");
    });
    expect(fetchCard).toHaveBeenCalledWith(rhystic.oracleId, undefined);
    expect(addCardToDeck).not.toHaveBeenCalled();
  });

  it("opens nothing on ↵ at the name while the rows on screen answer an older query", async () => {
    const { fetchCard } = mountWithDetail();
    await search();
    fireEvent.change(field(), { target: { value: "stux" } });
    key("ArrowRight");
    expect(active()).toBe(nameCell(rows()[0]).id);
    key("Enter");
    expect(fetchCard).not.toHaveBeenCalled();
  });

  // Board A3: on a phone the two targets are the name cell, the full row's height, and Add at 56 x 44.
  it("gives the phone its two targets: the name at the row's full height, Add at 56 by 44", async () => {
    mountWithDetail();
    await search();
    const name = nameCell(rows()[1]);
    // jsdom lays nothing out, so the classes that make the size are what can be read.
    expect(name.className).toMatch(/\bself-stretch\b/);
    expect(name.className).toContain("-my-[8px]");
    expect(name.className).toContain("py-[8px]");
    const add = addCell(rows()[1]);
    expect(add.className).toContain("min-w-[56px]");
    expect(add.className).toContain("min-h-[44px]");
    expect(within(add).getByText(addPanelCopy.quickAdd.rowAdd).className).toContain("w-[56px] h-[44px]");
  });

  it("underlines the name on hover, as a decklist name does", async () => {
    mountWithDetail();
    await search();
    expect(nameCell(rows()[0]).className).toContain("group/name");
    expect(within(rows()[0]).getByTestId("search-row-name").className).toContain("group-hover/name:underline");
  });

  it("keeps the cell on Add, and the shipped hint, with no card detail to open", async () => {
    mount();
    await search();
    key("ArrowRight");
    expect(active()).toBe(addCell(rows()[0]).id);
    expect(screen.getByText(addPanelCopy.quickAdd.keyboardHint)).toBeInTheDocument();
    expect(nameCell(rows()[0])).toHaveAccessibleName(rhystic.name);
  });
});

// One rule for every pick-from-a-list field (DECK INPUT UX, Hugh 2026-10-12): Escape or a press
// outside clears the text and closes the list in one step, and an add clears it for the next search.
describe("QuickAddBar — dismissing and clearing", () => {
  it("clears the query and closes the list on one Escape", async () => {
    mount();
    await search();

    fireEvent.keyDown(field(), { key: "Escape" });
    expect(screen.queryByRole("grid")).toBeNull();
    expect(field()).toHaveValue("");
  });

  it("clears the query on a press outside the bar", async () => {
    mount();
    await search();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("grid")).toBeNull();
    expect(field()).toHaveValue("");
  });

  // The owned toggle sits beside the field: pressing it is part of the search, not leaving it.
  it("keeps the query when the owned filter is pressed", async () => {
    mount();
    await search();

    fireEvent.pointerDown(toggle());
    fireEvent.click(toggle());
    expect(field()).toHaveValue("stu");
  });

  it("clears the query once an add lands", async () => {
    mount();
    await search();

    fireEvent.click(screen.getAllByRole("row")[0]);
    await waitFor(() => expect(addCardToDeck).toHaveBeenCalled());
    await waitFor(() => expect(field()).toHaveValue(""));
  });

  // Focus stays in the field after a press, so the next search can be typed while the add is in flight.
  it("keeps a search typed while the add was in flight", async () => {
    let land: (r: { ok: true }) => void = () => {};
    addCardToDeck.mockReturnValueOnce(new Promise((res) => { land = res; }) as never);
    mount();
    await search();

    fireEvent.click(screen.getAllByRole("row")[0]);
    fireEvent.change(field(), { target: { value: "rhy" } });
    await act(async () => land({ ok: true }));
    expect(field()).toHaveValue("rhy");
  });

  // The same text typed again is a new search, not the one the add came from.
  it("keeps the same text typed again while the add was in flight", async () => {
    let land: (r: { ok: true }) => void = () => {};
    addCardToDeck.mockReturnValueOnce(new Promise((res) => { land = res; }) as never);
    mount();
    await search();

    fireEvent.click(screen.getAllByRole("row")[0]);
    fireEvent.change(field(), { target: { value: "" } });
    fireEvent.change(field(), { target: { value: "stu" } });
    await act(async () => land({ ok: true }));
    expect(field()).toHaveValue("stu");
  });

  // The row draws the refusal, so the list has to stay up to show it.
  it("keeps the query when the add is refused", async () => {
    addCardToDeck.mockResolvedValueOnce({ ok: false, message: "Nope." } as never);
    mount();
    await search();

    fireEvent.click(screen.getAllByRole("row")[0]);
    expect(await screen.findByText("Nope.")).toBeInTheDocument();
    expect(field()).toHaveValue("stu");
  });
});

describe("QuickAddBar — the owned filter", () => {
  it("defaults to on, so the first search is of the pile you own", async () => {
    mount();
    expect(toggle()).toBeChecked();

    fireEvent.change(field(), { target: { value: "stu" } });
    await waitFor(() => expect(searchCards).toHaveBeenCalled());
    expect(searchCards).toHaveBeenLastCalledWith("stu", ["U"], true, "deck-1");
  });

  // The note belongs to the filter being OFF: it counts the unowned rows now on
  // screen, rather than rows some other setting would have hidden.
  it("counts the unowned results once the filter is off", async () => {
    mount();
    expect(screen.queryByText(/filter off/i)).toBeNull();

    fireEvent.click(toggle());
    await search();

    expect(await screen.findByText(/filter off · 1 result you don’t own/i)).toBeInTheDocument();
  });

  // A failed request knows nothing about the collection, so it must not borrow
  // the empty state's claim that nothing by that name is owned.
  it("does not report an empty pile when the search itself failed", async () => {
    searchCards.mockRejectedValue(new Error("boom"));
    // Restored, or a later test's unexpected error would be swallowed here.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => errorSpy.mockRestore());
    mount();
    fireEvent.change(field(), { target: { value: "stu" } });

    await waitFor(() => expect(searchCards).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/nothing in the pile/i)).toBeNull());
    expect(screen.queryByRole("grid")).toBeNull();
  });

  // A search that landed empty is a result, so the status line has to say so
  // rather than going quiet the way the idle bar does.
  it("announces a zero count when the search lands empty", async () => {
    searchCards.mockResolvedValue([]);
    mount();
    fireEvent.change(field(), { target: { value: "zzz" } });

    const status = await screen.findByRole("status");
    await waitFor(() => expect(status).toHaveTextContent("0 matches"));
  });

  // The field states the constraint where the player is about to type. It used
  // to stand under the bar as its own line, which said the same thing on every
  // visit whether or not anyone was searching.
  it("names the identity in the field, and in the field's accessible name", () => {
    mount({ commanderIdentity: ["B", "G"] });
    expect(field()).toHaveAttribute("placeholder", "Add a card by name · Golgari only");
    expect(field()).toHaveAccessibleName("Add a card to this deck by name, Golgari only");
  });

  // Empty, not absent: the element is a live region, and a region that mounts
  // with its first value never announces it.
  it("says nothing under the bar until a search lands", () => {
    mount({ commanderIdentity: ["B", "G"] });
    const status = screen.getByRole("status");
    expect(status).toBeEmptyDOMElement();
    expect(status).not.toHaveTextContent("Golgari");
  });

  // The deck header names the identity as a guild, so the bar has to as well.
  // It used to say "BG-legal" a few pixels under a body reading "in Akawalli's
  // colours", which is one constraint wearing two names.
  it("names the identity the way the rest of the deck does", async () => {
    searchCards.mockResolvedValue([]);
    mount({ commanderIdentity: ["B", "G"] });
    fireEvent.change(field(), { target: { value: "zzz" } });

    const status = await screen.findByRole("status");
    await waitFor(() => expect(status).toHaveTextContent("Golgari only"));
    expect(status).not.toHaveTextContent("BG-legal");
  });

  it("offers the escape only while the filter is what stands in the way", async () => {
    searchCards.mockResolvedValue([]);
    mount();
    fireEvent.change(field(), { target: { value: "zzz" } });

    expect(
      await screen.findByRole("button", { name: /search all cards instead/i }),
    ).toBeInTheDocument();

    fireEvent.click(toggle());
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /search all cards instead/i })).toBeNull(),
    );
  });
});

describe("QuickAddBar — result rows", () => {
  it("draws ownership as a word and a count, never colour alone", async () => {
    searchCards.mockResolvedValue([row({ name: "Rhystic Study", ownedQty: 5 }), steam]);
    mount();
    await search();

    expect(screen.getByText("×5 owned")).toBeInTheDocument();
    expect(screen.getByText("not owned")).toBeInTheDocument();
  });

  // The phone row has no room for four columns, so type and ownership fold into
  // one meta line rather than the type line being dropped — which is what the
  // row did before, losing the only field that separates two same-named cards.
  it("keeps the type line at phone width by folding it into the meta line", async () => {
    searchCards.mockResolvedValue([row({ name: "Rhystic Study", ownedQty: 5 })]);
    mount();
    await search();

    expect(screen.getByText("Enchantment · ×5 owned")).toBeInTheDocument();
  });

  // A row found by its Secret Lair flavor name is titled with the oracle name, which
  // is not what the player typed. Without the printed name on the meta line the row
  // looks like a mis-hit (#467).
  it("names the flavor name a row was found by, ahead of the type line", async () => {
    searchCards.mockResolvedValue([
      row({ name: "Iroas, God of Victory", typeLine: "Legendary Creature — God",
        flavorName: "Freya, Queen of the Valkyries" }),
    ]);
    mount();
    await search("freya");

    // Asserted on the row's text rather than one node: the matched run of the flavor
    // name is its own accent-coloured element, so no single node holds the whole line.
    expect(screen.getByRole("row").textContent).toContain(
      "printed as Freya, Queen of the Valkyries · Legendary Creature — God · ×1 owned",
    );
    // The label has to say it too, or a screen reader hears a card the player never typed.
    expect(screen.getByRole("row")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("printed as Freya, Queen of the Valkyries"),
    );
  });

  it("highlights the flavor name's matched run, since the title cannot carry it", async () => {
    searchCards.mockResolvedValue([
      row({ name: "World at War", flavorName: "Battle of Olympus" }),
    ]);
    mount();
    await search("olymp");

    // Two hits, not one: the row draws its meta line twice — once folded for the phone,
    // once as the desktop type-line cell — exactly as it already does the type line.
    const hits = screen.getAllByText("Olymp");
    expect(hits).toHaveLength(2);
    for (const hit of hits) expect(hit).toHaveStyle({ color: "var(--accent-text)" });
  });

  it("leaves an ordinary row's meta line alone", async () => {
    searchCards.mockResolvedValue([row({ name: "Rhystic Study", ownedQty: 5 })]);
    mount();
    await search();

    expect(screen.getByText("Enchantment · ×5 owned")).toBeInTheDocument();
  });

  it("highlights the run of the name the query matched, wherever it falls", async () => {
    searchCards.mockResolvedValue([row({ name: "Rhystic Study" })]);
    mount();
    await search("stu");

    // "stu" is mid-name here, so a prefix-only highlight would find nothing.
    const hit = screen.getByText("Stu");
    expect(hit).toHaveStyle({ color: "var(--accent-text)" });
    expect(hit.parentElement).toHaveTextContent("Rhystic Study");
  });

  // Enter reaches the row through registerAdd rather than the click handler, so
  // it needs its own proof that a held-open add is not fired twice.
  it("refuses a second Enter while the first add is still in flight", async () => {
    let settle: () => void = () => {};
    addCardToDeck.mockReturnValue(new Promise<{ ok: true }>((res) => {
      settle = () => res({ ok: true });
    }));
    searchCards.mockResolvedValue([rhystic]);
    mount();
    await search();

    fireEvent.keyDown(field(), { key: "Enter" });
    await waitFor(() => expect(addCardToDeck).toHaveBeenCalledTimes(1));

    fireEvent.keyDown(field(), { key: "Enter" });
    expect(addCardToDeck).toHaveBeenCalledTimes(1);
    settle();
  });

  it("makes an in-deck row non-actionable by keyboard and by click alike", async () => {
    searchCards.mockResolvedValue([rhystic]);
    mount({ deckOracleIds: [rhystic.oracleId] });
    await search();

    const option = screen.getByRole("row");
    expect(addCell(option)).toHaveAttribute("aria-disabled", "true");
    // The label carries the state, so it does not rest on the greyscale alone.
    expect(option).toHaveTextContent("✓ In deck");

    fireEvent.keyDown(field(), { key: "Enter" });
    fireEvent.click(option);
    expect(addCardToDeck).not.toHaveBeenCalled();
  });

  // The server refuses the commander outright, so an actionable row here offers
  // an add that can only ever come back as a refusal.
  it("makes this deck's own commander non-actionable, though it is no deck_cards row", async () => {
    const korvold = row({ name: "Korvold Study", oracleId: "cmd-korvold" });
    searchCards.mockResolvedValue([korvold]);
    mount({ deckOracleIds: [] });
    await search();

    const option = screen.getByRole("row");
    expect(addCell(option)).toHaveAttribute("aria-disabled", "true");
    expect(option).toHaveTextContent("✓ In deck");

    fireEvent.keyDown(field(), { key: "Enter" });
    fireEvent.click(option);
    expect(addCardToDeck).not.toHaveBeenCalled();
  });
});

// A search row's availability figures come from a query given this deck's id,
// but `selfExcluded` is a per-CARD question, not a per-surface one: it may only
// be set where this deck actually held a claim the query dropped. Set blanket,
// `free === 0` resolves to silence and every genuine hard claim by another
// finished deck disappears — which is the whole headline case (design 5.6).
describe("QuickAddBar — availability marker", () => {
  const claimed = (hardDeckNames: string[]) => ({
    owned: 1,
    hard: hardDeckNames.length,
    soft: 0,
    free: 0,
    claims: hardDeckNames.map((n, i) => ({ id: `d${i + 1}`, name: n, quantity: 1, mature: true, pending: false, commander: false, senior: true })),
  });

  it("claims an off-list card another committed deck already holds", async () => {
    searchCards.mockResolvedValue([{ ...rhystic, availability: claimed(["Atraxa"]) }]);
    mount();
    await search();
    expect(screen.getByRole("row")).toHaveTextContent("none free, in Atraxa");
  });

  it("stays silent on a card this deck is already running", async () => {
    searchCards.mockResolvedValue([{ ...rhystic, availability: claimed([]) }]);
    mount({ deckOracleIds: [rhystic.oracleId] });
    await search();
    expect(screen.getByRole("row")).not.toHaveTextContent("none free");
  });

  // `inDeck` carves basic lands out so a second Forest stays addable. That
  // carve-out is about the add guard and has nothing to do with what the
  // availability read excluded: a Forest on the list is a `deck_cards` row like
  // any other, and the query dropped it.
  it("stays silent on a basic land this deck already runs", async () => {
    const forest = row({
      name: "Forest Study",
      oracleId: "basic-forest",
      typeLine: "Basic Land — Forest",
    });
    searchCards.mockResolvedValue([{ ...forest, availability: claimed([]) }]);
    mount({ deckOracleIds: [forest.oracleId] });
    await search();
    expect(screen.getByRole("row")).not.toHaveTextContent("none free");
  });

  // The rollup returns a row for every owned card, unclaimed ones included
  // (availability-query.ts:20), so a free card arrives with figures attached and
  // the marker declines to draw them. The separator must decline with it.
  it("draws no separator on a free card, whose marker draws nothing", async () => {
    searchCards.mockResolvedValue([
      { ...rhystic, availability: { owned: 2, hard: 0, soft: 0, free: 2, claims: [] } },
    ]);
    mount();
    await search();
    for (const el of screen.getByRole("row").querySelectorAll("*")) {
      expect(el.textContent?.trimEnd().endsWith("·")).toBe(false);
    }
  });

  // The commander lives in `decks.commander_oracle_id`, not in `deck_cards`
  // (availability-query.ts:25), so it is absent from `deckOracleIds` while the
  // query still dropped its claim. Keyed on membership alone, a single-copy
  // commander searched from its own deck reads as somebody else's claim.
  it("stays silent on this deck's own commander, which is no deck_cards row", async () => {
    const korvold = row({ name: "Korvold Study", oracleId: "cmd-korvold" });
    searchCards.mockResolvedValue([{ ...korvold, availability: claimed([]) }]);
    mount({ deckOracleIds: [] });
    await search();
    expect(screen.getByRole("row")).not.toHaveTextContent("none free");
  });
});

// THE BOUNDARY, end to end: a map arriving through `loadComboMap` must reach the row it names,
// drawn at both widths, spoken in the row's name, and absent on a card the deck already holds.
// Each component is tested on its own elsewhere; this is the case that fails when the prop is
// dropped at the mount site, which is the one place neither of those can see.
function phoneMetaType(row: HTMLElement): HTMLElement {
  return row.querySelector('[data-testid="combo-partner-inline"]')!.parentElement!
    .firstElementChild as HTMLElement;
}

describe("combo partner (quick-add, option E / G)", () => {
  const BOND = { rhystic: { oracleId: "sanguine-bond", name: "Sanguine Bond" } };
  // `row()` keys the oracle id off the lower-cased name.
  const RHYSTIC = "rhystic study";

  it("does not read the map until the field is used", async () => {
    const loadComboMap = vi.fn(async () => ({ [RHYSTIC]: BOND.rhystic }));
    mount({ loadComboMap });
    await new Promise((r) => setTimeout(r, 20));
    expect(loadComboMap).not.toHaveBeenCalled();
    fireEvent.focus(field());
    await waitFor(() => expect(loadComboMap).toHaveBeenCalledWith("deck-1"));
  });

  it("draws the partner on the row it names, and on no other", async () => {
    const loadComboMap = vi.fn(async () => ({ [RHYSTIC]: BOND.rhystic }));
    mount({ loadComboMap });
    fireEvent.focus(field());
    await search();
    const rhysticRow = await screen.findByRole("row", { name: /Rhystic Study/ });
    await waitFor(() =>
      expect(
        rhysticRow.querySelector('[data-testid="combo-partner-inline"] span.truncate')?.textContent,
      ).toBe("Sanguine Bond"),
    );
    // Desktop (G): its own line in the name cell, drawn as the glyph and the name alone.
    const desktopClause = rhysticRow.querySelector('[data-testid="combo-clause"]')!;
    expect(
      [...desktopClause.querySelectorAll("span")]
        .filter((el) => !el.classList.contains("sr-only"))
        .map((el) => el.textContent),
    ).toEqual(["Sanguine Bond"]);
    // On the phone line the TYPE has no base size, so the partner is never handed a sub-pixel
    // share while it fits — see card-search-row.
    expect(phoneMetaType(rhysticRow).className).toMatch(/\bbasis-0\b/);
    // Phone (E): the count's short form beside the partner. Read EXACTLY, off the meta line's
    // own first span: `×1` is a prefix of `×1 owned`, so a containment check passes on a build
    // that ignored the short form — which is how the first version of this line read.
    expect(phoneMetaType(rhysticRow).textContent).toBe("Enchantment · ×1");
    // The words the phone draws as a glyph are in the row's spoken name.
    expect(rhysticRow.getAttribute("aria-label")).toMatch(/Sanguine Bond/);

    const sramRow = screen.getByRole("row", { name: /Sram's Study/ });
    expect(sramRow.querySelector('[data-testid="combo-glyph"]')).toBeNull();
    expect(sramRow.textContent).toContain("×1 owned");
  });

  // The phone row's inline glyph hovers like the clause's does — a narrow window with a mouse.
  it("names the combo when the inline glyph is hovered with a fine pointer", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("pointer: fine"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    onTestFinished(() => { vi.unstubAllGlobals(); });
    const loadComboMap = vi.fn(async () => ({ [RHYSTIC]: BOND.rhystic }));
    mount({ loadComboMap });
    fireEvent.focus(field());
    await search();
    const rhysticRow = await screen.findByRole("row", { name: /Rhystic Study/ });
    const inline = await waitFor(() => {
      const el = rhysticRow.querySelector('[data-testid="combo-partner-inline"]');
      expect(el).not.toBeNull();
      return el!;
    });
    fireEvent.pointerEnter(inline.querySelector('[data-testid="combo-glyph"]')!);
    // The bubble is portalled to the body, so it is found in the document, not inside the glyph.
    await waitFor(() =>
      expect(screen.getByTestId("fact-tooltip").textContent).toContain(
        "Completes a two-card combo with Sanguine Bond.",
      ),
    );
  });

  it("a card already in the deck carries no mark", async () => {
    const loadComboMap = vi.fn(async () => ({ [RHYSTIC]: BOND.rhystic }));
    mount({ loadComboMap, deckOracleIds: [RHYSTIC] });
    fireEvent.focus(field());
    await search();
    await waitFor(() => expect(loadComboMap).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    const rhysticRow = screen.getByRole("row", { name: /Rhystic Study/ });
    expect(rhysticRow.querySelector('[data-testid="combo-glyph"]')).toBeNull();
  });

  it("re-reads when the committed deck changes", async () => {
    const loadComboMap = vi.fn(async () => ({}));
    const { rerender } = mount({ loadComboMap });
    fireEvent.focus(field());
    await waitFor(() => expect(loadComboMap).toHaveBeenCalledTimes(1));
    rerender(
      <QuickAddBar
        deckId="deck-1"
        commanderIdentity={["U"]}
        deckOracleIds={[RHYSTIC]}
        commanderShortName="Korvold"
        commanderOracleId="cmd-korvold"
        loadComboMap={loadComboMap}
        declaredBracket={null}
        noteCounts={EMPTY_NOTE_COUNTS}
      />,
    );
    await waitFor(() => expect(loadComboMap).toHaveBeenCalledTimes(2));
  });
});

// PR 8c. The quick-add row is the note's third host, after the Consider tile and the top-off
// row, and its facts come off the search's own row rather than a pool read — so what is pinned
// here is the row's half: what it draws from `result.facts`, where, and what it speaks.
describe("QuickAddBar — the card note and its marks", () => {
  const facts = (over: Partial<NonNullable<SearchResult["facts"]>>) => ({
    gameChanger: false,
    massLandDenial: false,
    extraTurn: false,
    tutor: false,
    ...over,
  });
  const option = () => screen.getByRole("row");

  it("draws the note at row density, inside the option, below the row's line", async () => {
    searchCards.mockResolvedValue([row({ name: "Rhystic Study", facts: facts({ gameChanger: true }) })]);
    mount({ noteCounts: { ...EMPTY_NOTE_COUNTS, gameChanger: 3 } });
    await search();

    const note = within(option()).getByTestId("card-note");
    expect(note).toHaveTextContent("A game changer, and your 4th.");
    // Hidden, because the option's own name speaks it — see the next case.
    expect(note).toHaveAttribute("aria-hidden", "true");
    // The row's line comes first: the note is the option's LAST child but for an error.
    expect(option().lastElementChild).toBe(note);
  });

  it("draws nothing, and reserves nothing, for a card that carries no fact", async () => {
    searchCards.mockResolvedValue([row({ name: "Rhystic Study", facts: null })]);
    mount();
    await search();

    expect(within(option()).queryByTestId("card-note")).toBeNull();
    expect(within(option()).queryByTestId("search-row-marks")).toBeNull();
  });

  it("draws the marks inline after the name, before the note that elaborates them", async () => {
    searchCards.mockResolvedValue([
      row({ name: "Armageddon Study", facts: facts({ gameChanger: true, massLandDenial: true }) }),
    ]);
    mount();
    await search();

    const marks = within(option()).getByTestId("search-row-marks");
    expect(marks).toHaveAttribute("aria-hidden", "true");
    // The name and its marks share one line: the name's span is the marks' sibling.
    expect(marks.previousElementSibling).toHaveTextContent("Armageddon Study");
    expect(within(marks).getAllByTestId(/^card-fact-/).map((m) => m.dataset.testid)).toEqual([
      "card-fact-gameChanger",
      "card-fact-massLandDenial",
    ]);
  });

  it("speaks the marks and then the note in the option's name, in the order they are drawn", async () => {
    searchCards.mockResolvedValue([row({ name: "Rhystic Study", facts: facts({ gameChanger: true }) })]);
    mount({ noteCounts: { ...EMPTY_NOTE_COUNTS, gameChanger: 3 } });
    await search();

    const name = option().getAttribute("aria-label") ?? "";
    const mark = name.indexOf("game changer,");
    const note = name.indexOf("A game changer, and your 4th.");
    expect(mark).toBeGreaterThan(-1);
    expect(note).toBeGreaterThan(mark);
  });

  it("states the declared bracket's limit when the deck has declared one", async () => {
    searchCards.mockResolvedValue([row({ name: "Rhystic Study", facts: facts({ gameChanger: true }) })]);
    mount({ declaredBracket: 2, noteCounts: { ...EMPTY_NOTE_COUNTS, gameChanger: 3 } });
    await search();

    expect(within(option()).getByTestId("card-note")).toHaveTextContent(
      "A game changer, and your 4th. Core allows none.",
    );
  });

  it("reads the ordinal as the card's own place when it is already in the deck", async () => {
    const study = row({ name: "Rhystic Study", facts: facts({ tutor: true }) });
    searchCards.mockResolvedValue([study]);
    mount({ deckOracleIds: [study.oracleId], noteCounts: { ...EMPTY_NOTE_COUNTS, tutor: 3 } });
    await search();

    expect(within(option()).getByTestId("card-note")).toHaveTextContent("A tutor, and your 3rd.");
  });

  // The same trap the Consider tile fell into: `applied` turns true on the press, the deck's
  // counts only when the add lands. Keyed on `applied`, the ordinal would count the card twice
  // for the length of the round trip.
  it("keeps the ordinal where it was while an add is in flight", async () => {
    // THE ACTION MUST NOT SETTLE, or the in-flight state is never observed: `useDeckMutation`
    // holds its override only while the transition is pending.
    let settle: () => void = () => {};
    addCardToDeck.mockReturnValue(new Promise<{ ok: true }>((res) => {
      settle = () => res({ ok: true });
    }));
    searchCards.mockResolvedValue([row({ name: "Rhystic Study", facts: facts({ gameChanger: true }) })]);
    mount({ noteCounts: { ...EMPTY_NOTE_COUNTS, gameChanger: 3 } });
    await search();

    await act(async () => {
      fireEvent.click(option());
    });
    // The row is mid-flight: it already reads as in the deck.
    expect(option()).toHaveTextContent("✓ In deck");
    expect(within(option()).getByTestId("card-note")).toHaveTextContent(
      "A game changer, and your 4th.",
    );
    await act(async () => { settle(); });
  });
});

// An add is one MORE copy and the basics stepper's pending save is an absolute count (round 2 of #1752): the
// add flushes the stepper's queue first, so the stepper's figure cannot land after the add and erase it.
describe("adding a basic while the stepper is settling", () => {
  it("flushes the stepper's queue before adding a basic", async () => {
    const order: string[] = [];
    const counts = {
      flush: vi.fn(async () => { order.push("flush"); return true; }),
      set: vi.fn(), takeOver: vi.fn(() => null), base: vi.fn(() => null), subscribe: vi.fn(() => () => {}), configure: vi.fn(),
    };
    addCardToDeck.mockImplementation(async () => { order.push("add"); return { ok: true as const }; });
    const island = row({ name: "Island Study", oracleId: "basic-island", typeLine: "Basic Land — Island", role: "land" });
    searchCards.mockResolvedValue([rhystic, island]);
    render(
      <BasicCountsProvider value={counts}>
        <QuickAddBar deckId="deck-1" commanderIdentity={["U"]} deckOracleIds={[]} commanderShortName="Korvold"
          commanderOracleId="cmd-korvold" declaredBracket={null} noteCounts={EMPTY_NOTE_COUNTS} />
      </BasicCountsProvider>,
    );
    await search();
    fireEvent.keyDown(field(), { key: "ArrowDown" });
    fireEvent.keyDown(field(), { key: "Enter" });
    await waitFor(() => expect(order).toEqual(["flush", "add"]));
  });
});


// Small items 2, item 8 (`Quick-Add-Failed`): a rejected search says so in the deck toast, with Try again, and the bar
// draws nothing new.
const { gameSeatsCopy } = await import("../../lib/copy/game-seats");
const { DeckRefusalToast } = await import("./token-refusal-toast");
const { DECK_TOAST_CLAIM } = await import("../collection/edit-toast");

describe("QuickAddBar — a failed search", () => {

  function quietErrors() {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => errorSpy.mockRestore());
  }
  const toast = () => screen.queryByRole("alert");
  const retryButton = () => within(screen.getByRole("alert")).getByRole("button", { name: addPanelCopy.quickAdd.searchRetry });

  it("says the seat picker's words, split, and leaves the bar as it was", async () => {
    // The two halves are the seat picker's one line, not new words.
    expect(`${addPanelCopy.quickAdd.searchFailed} ${addPanelCopy.quickAdd.searchRetry}.`).toBe(gameSeatsCopy.picker.failed);
    expect(addPanelCopy.quickAdd.searchFailed).toBe("Couldn’t search just now.");

    quietErrors();
    searchCards.mockRejectedValue(new Error("boom"));
    mount();
    field().focus();
    fireEvent.change(field(), { target: { value: "sw" } });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(addPanelCopy.quickAdd.searchFailed);
    expect(retryButton()).toBeInTheDocument();
    expect(field()).toHaveValue("sw");
    expect(field()).toHaveFocus();
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.queryByText(/nothing in the pile/i)).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("says nothing for a query the bar would not search", async () => {
    quietErrors();
    searchCards.mockRejectedValue(new Error("boom"));
    mount();
    fireEvent.change(field(), { target: { value: "s" } });
    await new Promise((r) => setTimeout(r, 250));
    expect(searchCards).not.toHaveBeenCalled();
    expect(toast()).toBeNull();
  });

  it("says nothing when a request the reader typed past fails", async () => {
    quietErrors();
    let rejectOld!: (e: Error) => void;
    searchCards.mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject; }));
    mount();
    fireEvent.change(field(), { target: { value: "st" } });
    await waitFor(() => expect(searchCards).toHaveBeenCalledTimes(1));

    searchCards.mockResolvedValue([rhystic]);
    fireEvent.change(field(), { target: { value: "stu" } });
    await waitFor(() => expect(screen.getAllByRole("row").length).toBe(1));

    await act(async () => rejectOld(new Error("late")));
    expect(toast()).toBeNull();
    expect(screen.getAllByRole("row").length).toBe(1);
  });

  it("goes when a search for the field's text lands", async () => {
    quietErrors();
    searchCards.mockRejectedValueOnce(new Error("boom"));
    mount();
    fireEvent.change(field(), { target: { value: "st" } });
    await screen.findByRole("alert");

    // Typing on is no news by itself: the toast stays until a search lands.
    searchCards.mockResolvedValue([rhystic]);
    fireEvent.change(field(), { target: { value: "stu" } });
    expect(toast()).not.toBeNull();
    await waitFor(() => expect(screen.getAllByRole("row").length).toBe(1));
    expect(toast()).toBeNull();
  });

  it("goes when the field is cleared", async () => {
    quietErrors();
    searchCards.mockRejectedValue(new Error("boom"));
    mount();
    fireEvent.change(field(), { target: { value: "sw" } });
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: addPanelCopy.quickAdd.clear }));
    await waitFor(() => expect(toast()).toBeNull());
  });

  it("goes when the field's text is no longer a query the bar would search", async () => {
    quietErrors();
    searchCards.mockRejectedValue(new Error("boom"));
    mount();
    fireEvent.change(field(), { target: { value: "sw" } });
    await screen.findByRole("alert");

    // Backspaced under two characters: Try again would have nothing to run.
    fireEvent.change(field(), { target: { value: "s" } });
    await waitFor(() => expect(toast()).toBeNull());

    fireEvent.change(field(), { target: { value: "sw" } });
    await screen.findByRole("alert");
    // Past the hundred-character cap, likewise.
    fireEvent.change(field(), { target: { value: "s".repeat(101) } });
    await waitFor(() => expect(toast()).toBeNull());
  });

  it("runs the same query once more on Try again, keeps the text, and keeps focus on the field", async () => {
    quietErrors();
    searchCards.mockRejectedValueOnce(new Error("boom"));
    mount();
    field().focus();
    fireEvent.change(field(), { target: { value: "sw" } });
    await screen.findByRole("alert");
    expect(searchCards).toHaveBeenCalledTimes(1);
    const firstArgs = searchCards.mock.calls[0];

    searchCards.mockResolvedValue([rhystic]);
    const press = retryButton();
    // The press starts outside the bar's root (the toast is portalled), and must not read as a press outside the field.
    fireEvent.pointerDown(press);
    // A pointer press must not take focus off the field. jsdom moves no focus on a press, so the proof is that the
    // mousedown, whose default action is the focus move, is cancelled (fireEvent returns false when it is).
    expect(fireEvent.mouseDown(press)).toBe(false);
    fireEvent.mouseUp(press);
    fireEvent.click(press);

    // The toast leaves as the request starts.
    expect(toast()).toBeNull();
    expect(field()).toHaveFocus();
    expect(field()).toHaveValue("sw");
    await waitFor(() => expect(screen.getAllByRole("row").length).toBe(1));
    expect(searchCards).toHaveBeenCalledTimes(2);
    expect(searchCards.mock.calls[1]).toEqual(firstArgs);
  });

  it("hands focus back to the field after a keyboard press on Try again", async () => {
    quietErrors();
    searchCards.mockRejectedValueOnce(new Error("boom"));
    mount();
    fireEvent.change(field(), { target: { value: "sw" } });
    await screen.findByRole("alert");

    searchCards.mockResolvedValue([rhystic]);
    const press = retryButton();
    // A keyboard press moves focus onto the button; `onRetry` hands it back.
    press.focus();
    fireEvent.click(press);
    expect(field()).toHaveFocus();
    await waitFor(() => expect(screen.getAllByRole("row").length).toBe(1));
  });

  it("comes back when Try again fails too", async () => {
    quietErrors();
    searchCards.mockRejectedValue(new Error("boom"));
    mount();
    fireEvent.change(field(), { target: { value: "sw" } });
    await screen.findByRole("alert");

    fireEvent.click(retryButton());
    expect(toast()).toBeNull();
    expect(await screen.findByRole("alert")).toHaveTextContent(addPanelCopy.quickAdd.searchFailed);
    expect(searchCards).toHaveBeenCalledTimes(2);
  });

  it("draws into the deck toast stack as an alert, out of the bar, and is never lifted", async () => {
    quietErrors();
    searchCards.mockRejectedValue(new Error("boom"));
    const { container } = mount();
    fireEvent.change(field(), { target: { value: "sw" } });
    const alert = await screen.findByRole("alert");
    // Small items 3, item 8: the stack stands above the dock, so the toast measures nothing and carries no lift.
    expect(container.contains(alert)).toBe(false);
    expect(alert.parentElement!.hasAttribute("data-deck-toast-stack")).toBe(true);
    expect(alert.getAttribute("data-toast-kind")).toBe("quick-add-failed");
    expect(alert.className).toContain("order-1");
    expect(alert.style.translate).toBe("");
  });

  it("is one alert with the refusals: a refusal replaces it, and it replaces a refusal", async () => {
    quietErrors();
    searchCards.mockRejectedValue(new Error("boom"));
    mount();
    fireEvent.change(field(), { target: { value: "sw" } });
    await screen.findByRole("alert");
    // A refusal arrives: the failed search leaves, and the field keeps its query.
    const refusal = render(<DeckRefusalToast title="We couldn’t remove that." detail="Badgermole" onDone={() => {}} />);
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1));
    expect(screen.getByRole("alert")).toHaveTextContent("Badgermole");
    expect(field()).toHaveValue("sw");
    refusal.unmount();
    // And the other way round: a refusal up when the search fails again leaves for it.
    const refusalDone = vi.fn();
    render(<DeckRefusalToast title="We couldn’t remove that." detail="Badgermole" onDone={refusalDone} />);
    fireEvent.change(field(), { target: { value: "swo" } });
    await waitFor(() => expect(refusalDone).toHaveBeenCalled());
  });

  it("stays when a receipt claims the stack, since the field still holds its query", async () => {
    quietErrors();
    searchCards.mockRejectedValue(new Error("boom"));
    mount();
    fireEvent.change(field(), { target: { value: "sw" } });
    await screen.findByRole("alert");
    act(() => { window.dispatchEvent(new Event(DECK_TOAST_CLAIM)); });
    expect(toast()).toHaveTextContent(addPanelCopy.quickAdd.searchFailed);
  });
});

// The same failure when the search never answers: a server action cannot be aborted, so a search past the wait is
// called failed and its answer, when it comes, is let in only for the field's own request.
const { SEARCH_TIMEOUT_MS } = await import("./use-card-search");

describe("QuickAddBar — a search that never answers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    onTestFinished(() => { vi.useRealTimers(); });
  });

  const toast = () => screen.queryByRole("alert");
  const options = () => screen.queryAllByRole("row");
  /** Each call to searchCards hangs until the test settles it, in call order. */
  function hangingSearches() {
    const pending: { resolve: (r: SearchResult[]) => void; reject: (e: Error) => void }[] = [];
    searchCards.mockImplementation(() => new Promise((resolve, reject) => { pending.push({ resolve, reject }); }));
    return pending;
  }
  const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
  async function type(q: string) {
    fireEvent.change(field(), { target: { value: q } });
    await advance(150); // the debounce
  }

  it("says the search failed once the wait passes with no answer, and not a moment before", async () => {
    hangingSearches();
    mount();
    await type("sw");
    expect(searchCards).toHaveBeenCalledTimes(1);

    await advance(SEARCH_TIMEOUT_MS - 1);
    expect(toast()).toBeNull();
    await advance(1);
    expect(toast()).toHaveTextContent(addPanelCopy.quickAdd.searchFailed);
    expect(field()).toHaveValue("sw");
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.queryByText(/nothing in the pile/i)).toBeNull();
  });

  it("says nothing when the answer lands just inside the wait", async () => {
    const pending = hangingSearches();
    mount();
    await type("sw");
    await advance(SEARCH_TIMEOUT_MS - 1);
    await act(async () => pending[0].resolve([rhystic]));
    await advance(SEARCH_TIMEOUT_MS);
    expect(toast()).toBeNull();
    expect(options()).toHaveLength(1);
  });

  it("says nothing when a search the reader typed past goes unanswered", async () => {
    const pending = hangingSearches();
    mount();
    await type("st");
    await advance(SEARCH_TIMEOUT_MS / 2);
    await type("stu");
    await act(async () => pending[1].resolve([rhystic]));
    expect(options()).toHaveLength(1);

    // Well past the first search's wait: it is no news.
    await advance(SEARCH_TIMEOUT_MS * 2);
    expect(toast()).toBeNull();
    expect(options()).toHaveLength(1);
  });

  it("lets a late answer for the field's text land, and the toast goes with it", async () => {
    const pending = hangingSearches();
    mount();
    await type("sw");
    await advance(SEARCH_TIMEOUT_MS);
    expect(toast()).not.toBeNull();

    await act(async () => pending[0].resolve([rhystic]));
    expect(toast()).toBeNull();
    expect(options()).toHaveLength(1);
  });

  it("says nothing more when a timed-out search then rejects", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => errorSpy.mockRestore());
    const pending = hangingSearches();
    mount();
    await type("sw");
    await advance(SEARCH_TIMEOUT_MS);
    const first = toast();
    expect(first).not.toBeNull();

    await act(async () => pending[0].reject(new Error("late")));
    // The same toast, not a second failure with its own window.
    expect(toast()).toBe(first);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("raises a rejection inside the wait once, not again when the wait runs out", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => errorSpy.mockRestore());
    const pending = hangingSearches();
    mount();
    await type("sw");
    await act(async () => pending[0].reject(new Error("boom")));
    const first = toast();
    expect(first).not.toBeNull();
    // Held under the pointer, so its own eight seconds do not take it away while the wait runs out.
    fireEvent.pointerEnter(first!);

    await advance(SEARCH_TIMEOUT_MS);
    expect(toast()).toBe(first);
  });

  it("ignores a late answer for a query the reader has typed past", async () => {
    const pending = hangingSearches();
    mount();
    await type("st");
    await advance(SEARCH_TIMEOUT_MS);
    await type("stu");
    await advance(SEARCH_TIMEOUT_MS);
    const failure = toast();
    expect(failure).not.toBeNull();

    // The first query's answer arrives after both waits: it draws no rows and ends no failure.
    await act(async () => pending[0].resolve([sram]));
    expect(options()).toHaveLength(0);
    expect(toast()).toBe(failure);
  });

  it("runs the search once more on Try again, and the first one's late answer is ignored", async () => {
    const pending = hangingSearches();
    mount();
    await type("sw");
    await advance(SEARCH_TIMEOUT_MS);
    const firstArgs = searchCards.mock.calls[0];

    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: addPanelCopy.quickAdd.searchRetry }));
    expect(toast()).toBeNull();
    await advance(0);
    expect(searchCards).toHaveBeenCalledTimes(2);
    expect(searchCards.mock.calls[1]).toEqual(firstArgs);

    await act(async () => pending[0].resolve([sram]));
    expect(options()).toHaveLength(0);
    await act(async () => pending[1].resolve([rhystic]));
    expect(options()).toHaveLength(1);
    expect(screen.getByRole("row")).toHaveTextContent("Rhystic Study");

    await advance(SEARCH_TIMEOUT_MS * 2);
    expect(toast()).toBeNull();
    expect(searchCards).toHaveBeenCalledTimes(2);
  });
});
