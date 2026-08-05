// QuickAddBar — retrieval is a bar, not a room.
//
// The tests that matter here are the keyboard contract and the two states the
// old SearchPane got wrong: a filter that hides results without saying so, and
// an in-deck row that looks actionable.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchResult } from "../../app/decks/[id]/search-action";

const searchCards = vi.fn();
const addCardToDeck = vi.fn(async () => ({ ok: true as const }));

vi.mock("../../app/decks/[id]/search-action", () => ({ searchCards }));
vi.mock("../../app/decks/actions", () => ({ addCardToDeck }));

const { QuickAddBar } = await import("./quick-add-bar");

const row = (over: Partial<SearchResult> & { name: string }): SearchResult => ({
  oracleId: over.name.toLowerCase(),
  typeLine: "Enchantment",
  owned: true,
  ownedQty: 1,
  cardTypeGroup: "Enchantments",
  role: "draw",
  imageUri: null,
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
      {...props}
    />,
  );
}

const field = () => screen.getByRole("combobox");
const toggle = () => screen.getByRole("checkbox", { name: /only cards you own/i });

// The debounce is real, so every test types and then waits for rows to land.
async function search(q = "stu") {
  fireEvent.change(field(), { target: { value: q } });
  await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(0));
}

beforeEach(() => {
  vi.clearAllMocks();
  searchCards.mockResolvedValue([rhystic, sram, steam]);
});

describe("QuickAddBar — combobox contract", () => {
  it("is a combobox owning a listbox, not a dialog", async () => {
    mount();
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).toBeNull();

    await search();
    expect(field()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toHaveAttribute(
      "id",
      field().getAttribute("aria-controls"),
    );
  });

  it("moves the active option with the arrows rather than DOM focus", async () => {
    mount();
    await search();

    // The first row is active on arrival, so Enter adds the top match with no
    // arrowing — which is what the "↵ adds the top match" hint promises.
    const options = screen.getAllByRole("option");
    expect(field()).toHaveAttribute("aria-activedescendant", options[0].id);

    fireEvent.keyDown(field(), { key: "ArrowDown" });
    expect(field()).toHaveAttribute("aria-activedescendant", options[1].id);

    fireEvent.keyDown(field(), { key: "ArrowUp" });
    expect(field()).toHaveAttribute("aria-activedescendant", options[0].id);
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

    // Once the new results land, Enter works again.
    expect(await screen.findByText(stuxor.name)).toBeInTheDocument();
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

// Escape is two-stage on purpose: a user who mistypes wants the list gone, not
// the eight characters they just typed.
describe("QuickAddBar — the two-stage Escape", () => {
  it("dismisses the list on the first Escape and keeps the query", async () => {
    mount();
    await search();

    fireEvent.keyDown(field(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(field()).toHaveValue("stu");
  });

  // Widening the search is a request to see results, so it must not re-search
  // into a list Escape left closed.
  it("reopens the list when the owned filter is toggled after a dismissal", async () => {
    mount();
    await search();
    fireEvent.keyDown(field(), { key: "Escape" });

    fireEvent.click(toggle());
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  it("clears the query on a second Escape", async () => {
    mount();
    await search();

    fireEvent.keyDown(field(), { key: "Escape" });
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(field()).toHaveValue("");
  });
});

describe("QuickAddBar — the owned filter", () => {
  it("defaults to on, so the first search is of the pile you own", async () => {
    mount();
    expect(toggle()).toBeChecked();

    fireEvent.change(field(), { target: { value: "stu" } });
    await waitFor(() => expect(searchCards).toHaveBeenCalled());
    expect(searchCards).toHaveBeenLastCalledWith("stu", ["U"], true);
  });

  // The note belongs to the filter being OFF: it counts the unowned rows now on
  // screen, rather than rows some other setting would have hidden.
  it("counts the unowned results once the filter is off", async () => {
    mount();
    expect(screen.queryByText(/filter off/i)).toBeNull();

    fireEvent.click(toggle());
    await search();

    expect(await screen.findByText(/filter off — 1 result you don’t own/i)).toBeInTheDocument();
  });

  // A failed request knows nothing about the collection, so it must not borrow
  // the empty state's claim that nothing by that name is owned.
  it("does not report an empty pile when the search itself failed", async () => {
    searchCards.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    mount();
    fireEvent.change(field(), { target: { value: "stu" } });

    await waitFor(() => expect(searchCards).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/nothing in the pile/i)).toBeNull());
    expect(screen.queryByRole("listbox")).toBeNull();
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

  it("makes an in-deck row non-actionable by keyboard and by click alike", async () => {
    searchCards.mockResolvedValue([rhystic]);
    mount({ deckOracleIds: [rhystic.oracleId] });
    await search();

    const option = screen.getByRole("option");
    expect(option).toHaveAttribute("aria-disabled", "true");
    // The label carries the state, so it does not rest on the greyscale alone.
    expect(option).toHaveTextContent("✓ In deck");

    fireEvent.keyDown(field(), { key: "Enter" });
    fireEvent.click(option);
    expect(addCardToDeck).not.toHaveBeenCalled();
  });
});
