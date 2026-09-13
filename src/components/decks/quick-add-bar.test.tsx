// QuickAddBar — retrieval is a bar, not a room.
//
// The tests that matter here are the keyboard contract and the two states the
// old SearchPane got wrong: a filter that hides results without saying so, and
// an in-deck row that looks actionable.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import type { SearchResult } from "../../app/decks/[id]/search-action";

const searchCards = vi.fn();
const addCardToDeck = vi.fn(async () => ({ ok: true as const }));

vi.mock("../../app/decks/[id]/search-action", () => ({ searchCards }));
vi.mock("../../app/decks/actions", () => ({ addCardToDeck }));

const { QuickAddBar } = await import("./quick-add-bar");

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

    // Once the new results land, Enter works again. Matched by option label
    // rather than by text: the row splits the name around the accent-highlighted
    // run of the query, so no single node holds the whole string. A predicate
    // rather than a RegExp, because a card name is free to contain `(` or `[`.
    expect(
      await screen.findByRole("option", { name: (name) => name.includes(stuxor.name) }),
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

  // Otherwise the same keystroke means "hide the list" or "clear what I typed"
  // depending only on whether the debounce has fired yet.
  it("dismisses rather than clearing while the search is still in flight", async () => {
    let land: (r: SearchResult[]) => void = () => {};
    searchCards.mockReturnValue(new Promise<SearchResult[]>((res) => { land = res; }));
    mount();
    fireEvent.change(field(), { target: { value: "stu" } });

    fireEvent.keyDown(field(), { key: "Escape" });
    expect(field()).toHaveValue("stu");

    land([rhystic]);
    await waitFor(() => expect(searchCards).toHaveBeenCalled());
    expect(screen.queryByRole("listbox")).toBeNull();
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
    expect(screen.queryByRole("listbox")).toBeNull();
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
    expect(screen.getByRole("option").textContent).toContain(
      "printed as Freya, Queen of the Valkyries · Legendary Creature — God · ×1 owned",
    );
    // The label has to say it too, or a screen reader hears a card the player never typed.
    expect(screen.getByRole("option")).toHaveAttribute(
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
    for (const hit of hits) expect(hit).toHaveStyle({ color: "var(--accent)" });
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
    expect(hit).toHaveStyle({ color: "var(--accent)" });
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

    const option = screen.getByRole("option");
    expect(option).toHaveAttribute("aria-disabled", "true");
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

    const option = screen.getByRole("option");
    expect(option).toHaveAttribute("aria-disabled", "true");
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
    claims: hardDeckNames.map((n, i) => ({ id: `d${i + 1}`, name: n, quantity: 1, mature: true, pending: false, commander: false })),
  });

  it("claims an off-list card another finished deck already holds", async () => {
    searchCards.mockResolvedValue([{ ...rhystic, availability: claimed(["Atraxa"]) }]);
    mount();
    await search();
    expect(screen.getByRole("option")).toHaveTextContent("none free, in Atraxa");
  });

  it("stays silent on a card this deck is already running", async () => {
    searchCards.mockResolvedValue([{ ...rhystic, availability: claimed([]) }]);
    mount({ deckOracleIds: [rhystic.oracleId] });
    await search();
    expect(screen.getByRole("option")).not.toHaveTextContent("none free");
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
    expect(screen.getByRole("option")).not.toHaveTextContent("none free");
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
    for (const el of screen.getByRole("option").querySelectorAll("*")) {
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
    expect(screen.getByRole("option")).not.toHaveTextContent("none free");
  });
});
