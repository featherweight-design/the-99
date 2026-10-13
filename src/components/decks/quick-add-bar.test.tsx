// QuickAddBar — retrieval is a bar, not a room.
//
// The tests that matter here are the keyboard contract and the two states the
// old SearchPane got wrong: a filter that hides results without saying so, and
// an in-deck row that looks actionable.
import { EMPTY_NOTE_COUNTS } from "../../lib/bracket/card-note";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import type { SearchResult } from "../../app/decks/[id]/search-action";

// Typed, so a hand-built result that leaves out a required field fails typecheck rather than
// reaching the row as `undefined` — which is how a stand-in with no `facts` draws no note.
const searchCards = vi.fn<(...args: unknown[]) => Promise<SearchResult[]>>();
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

// One rule for every pick-from-a-list field (DECK INPUT UX, Hugh 2026-10-12): Escape or a press
// outside clears the text and closes the list in one step, and an add clears it for the next search.
describe("QuickAddBar — dismissing and clearing", () => {
  it("clears the query and closes the list on one Escape", async () => {
    mount();
    await search();

    fireEvent.keyDown(field(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(field()).toHaveValue("");
  });

  it("clears the query on a press outside the bar", async () => {
    mount();
    await search();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
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

    fireEvent.click(screen.getAllByRole("option")[0]);
    await waitFor(() => expect(addCardToDeck).toHaveBeenCalled());
    await waitFor(() => expect(field()).toHaveValue(""));
  });

  // Focus stays in the field after a press, so the next search can be typed while the add is in flight.
  it("keeps a search typed while the add was in flight", async () => {
    let land: (r: { ok: true }) => void = () => {};
    addCardToDeck.mockReturnValueOnce(new Promise((res) => { land = res; }) as never);
    mount();
    await search();

    fireEvent.click(screen.getAllByRole("option")[0]);
    fireEvent.change(field(), { target: { value: "rhy" } });
    await act(async () => land({ ok: true }));
    expect(field()).toHaveValue("rhy");
  });

  // The row draws the refusal, so the list has to stay up to show it.
  it("keeps the query when the add is refused", async () => {
    addCardToDeck.mockResolvedValueOnce({ ok: false, message: "Nope." } as never);
    mount();
    await search();

    fireEvent.click(screen.getAllByRole("option")[0]);
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
    claims: hardDeckNames.map((n, i) => ({ id: `d${i + 1}`, name: n, quantity: 1, mature: true, pending: false, commander: false, senior: true })),
  });

  it("claims an off-list card another committed deck already holds", async () => {
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
    const rhysticRow = await screen.findByRole("option", { name: /Rhystic Study/ });
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

    const sramRow = screen.getByRole("option", { name: /Sram's Study/ });
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
    const rhysticRow = await screen.findByRole("option", { name: /Rhystic Study/ });
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
    const rhysticRow = screen.getByRole("option", { name: /Rhystic Study/ });
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
  const option = () => screen.getByRole("option");

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
