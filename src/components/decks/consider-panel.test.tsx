// ConsiderPanel — discovery is a room.
//
// What the old suggestion list got wrong and these tests hold: a flat list that
// never said what the deck was short of, a card claiming "0% of decks" when the
// truth was that we had no figure, and a role printed on every row that the
// heading above already said.
import { useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shelfFoldKey } from "../../lib/decks/shelf-fold";
import type { SortKey } from "./consider-toolbar";
import type { DeckSuggestionWithFacts } from "../../lib/decks/suggest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { recommendedMix } from "../../lib/decks/mix";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

const addCardToDeck = vi.fn(async () => ({ ok: true as const }));
vi.mock("../../app/decks/actions", () => ({ addCardToDeck }));

// The degraded banner's Try again re-fetches the page rather than owning a
// retry of its own, so the panel needs a router even in the happy path.
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { ConsiderPanel, SHELF_CAP, rolesWithShelves } = await import("./consider-panel");
const { CardDetailProvider } = await import("../cards/card-detail-provider");
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();

const suggestion = (over: Partial<DeckSuggestionWithFacts> & { name: string }): DeckSuggestionWithFacts => ({
  facts: null,
  oracleId: over.name.toLowerCase().replace(/\W+/g, "-"),
  reason: "edhrec",
  reasonType: "edhrec",
  reasonLabel: "EDHREC staple",
  owned: true,
  inDeck: false,
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "ramp",
  imageUri: "https://cards.example/art.jpg",
  manaCost: "{2}{G}",
  manaValue: 3,
  inclusionPct: 40,
  lift: null,
  synergyFigure: null,
  ...over,
});

const deckCard = (role: DeckDetailCard["role"], quantity = 1) =>
  ({ role, quantity }) as DeckDetailCard;

// Sort lives in the shell now, so the harness supplies the state the shell
// would: without it, changing the control would leave the shelves as they were.
function Harness(props: Partial<React.ComponentProps<typeof ConsiderPanel>>) {
  const [sort, setSort] = useState<SortKey>("gaps");
  return (
    <ConsiderPanel mix={TEST_MIX}
      deckId="deck-1"
      declaredBracket={null}
      noteCounts={{ gameChanger: 0, extraTurns: 0, tutor: 0 }}
      suggestions={[suggestion({ name: "Sol Ring" })]}
      deckCards={[]}
      deckOracleIds={[]}
      commanderShortName="Korvold"
      commanderOracleId="cmd-korvold"
      degraded={false}
      newestAsOf={null}
      sort={sort}
      onSortChange={setSort}
      {...props}
    />
  );
}

function mount(props: Partial<React.ComponentProps<typeof ConsiderPanel>> = {}) {
  return render(
    <CardDetailProvider fetchCard={async () => null}>
      <Harness {...props} />
    </CardDetailProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("ConsiderPanel — shelves", () => {
  // A shelf's coverage figure counts the slot the card was picked against, so
  // shelving a multi-role card by what it *is* would put it under a heading
  // whose n-of-m never moved for it.
  it("shelves a role pick by the slot it fills, not the card's own role", () => {
    mount({
      suggestions: [
        suggestion({ name: "Sol Ring", reasonType: "role", reason: "ramp", role: "removal" }),
      ],
      deckCards: [],
    });

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("Ramp");
  });

  // An EDHREC pick was chosen for no slot at all, so the card's own role is
  // the only thing that can place it.
  it("shelves an EDHREC pick by the card's own role", () => {
    mount({
      suggestions: [suggestion({ name: "Sol Ring", reasonType: "edhrec", role: "removal" })],
      deckCards: [],
    });

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Removal");
  });

  // The whole reason for shelves rather than one list: the first thing on
  // screen is what the deck most lacks.
  it("orders shelves by how far under target the deck is", () => {
    mount({
      suggestions: [
        suggestion({ name: "Cultivate", role: "ramp" }),
        suggestion({ name: "Swords", role: "removal" }),
      ],
      // Ramp is 9 of 10; removal is 1 of 10. Removal leads.
      deckCards: [deckCard("ramp", 9), deckCard("removal", 1)],
    });

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.querySelector('[data-testid="shelf-label"]')?.textContent))
      .toEqual(["Removal", "Ramp"]);
  });

  // "Threats & synergy" has no target, so it cannot be short of anything and
  // must not win the "most lacking" sort by default.
  it("sorts the targetless shelf last and gives it no n-of-m", () => {
    mount({
      suggestions: [
        suggestion({ name: "Villain", role: "other" }),
        suggestion({ name: "Cultivate", role: "ramp" }),
      ],
      deckCards: [deckCard("ramp", 10)],
    });

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.querySelector('[data-testid="shelf-label"]')?.textContent))
      .toEqual(["Ramp", "Threats & synergy"]);
    expect(screen.getByText(/no target · this is the deck’s plan/)).toBeInTheDocument();
  });

  it("quotes the same figures the coverage strip does", () => {
    mount({
      suggestions: [suggestion({ name: "Cultivate", role: "ramp" })],
      deckCards: [deckCard("ramp", 4)],
    });
    expect(screen.getByText(/you have 4 of 10 · 1 to consider/)).toBeInTheDocument();
  });

  it("anchors each shelf so a coverage cell can link to it", () => {
    mount({ suggestions: [suggestion({ name: "Cultivate", role: "ramp" })] });
    const shelf = screen.getByRole("region", { name: "Ramp" });
    expect(within(shelf).getByRole("heading", { level: 3 })).toHaveAttribute("id", "shelf-ramp");
  });

  it("caps a shelf until Show all, then collapses again", () => {
    const many = Array.from({ length: SHELF_CAP + 3 }, (_, i) =>
      suggestion({ name: `Ramp Card ${i}` }),
    );
    mount({ suggestions: many });

    expect(screen.getAllByRole("listitem")).toHaveLength(SHELF_CAP);
    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(`show all ${SHELF_CAP + 3} ramp suggestions`, "i"),
      }),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(SHELF_CAP + 3);

    fireEvent.click(screen.getByRole("button", { name: /show fewer/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(SHELF_CAP);
  });
});

describe("ConsiderPanel — shelf fold (STATES-consider-tiles.md s1–s5)", () => {
  // A disclosure button, inside the h3, carries `aria-expanded` and toggles
  // the shelf's own grid. Found by its accessible name, which — unlike the
  // region's — carries the label AND the count clause (handoff: chevron,
  // label, count clause, all inside the one button).
  function disclosureFor(label: string) {
    return screen.getByRole("button", { name: new RegExp(`^${label}`) });
  }

  it("folds a shelf shut — grid gone, Show all hidden, aria-expanded false", () => {
    const many = Array.from({ length: SHELF_CAP + 2 }, (_, i) => suggestion({ name: `Ramp Card ${i}` }));
    mount({ suggestions: many });

    const button = disclosureFor("Ramp");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("listitem")).toHaveLength(SHELF_CAP);
    expect(screen.getByRole("button", { name: /show all/i })).toBeInTheDocument();

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /show all/i })).toBeNull();
  });

  // The `<ul id={bodyId}>` is unmounted when folded, not hidden — a bare
  // `aria-controls={bodyId}` would then name an id no element in the document
  // carries, the dangling-reference defect this codebase's other disclosures
  // (builder-tabs.tsx, unresolved-row.tsx, combo-partners-detail.tsx,
  // issue-inspector.tsx) already guard against (pre-open review).
  it("drops aria-controls when folded rather than pointing at an unmounted id", () => {
    mount({ suggestions: [suggestion({ name: "Cultivate", role: "ramp" })] });
    const button = disclosureFor("Ramp");
    expect(button).toHaveAttribute("aria-controls");

    fireEvent.click(button);
    expect(button).not.toHaveAttribute("aria-controls");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-controls");
  });

  it("unfolds back to the capped grid", () => {
    mount({ suggestions: [suggestion({ name: "Cultivate", role: "ramp" })] });
    const button = disclosureFor("Ramp");

    fireEvent.click(button);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    fireEvent.click(button);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("plays the tiles' arrival only when the reader unfolds the shelf, not when Consider mounts", () => {
    mount({ suggestions: [suggestion({ name: "Cultivate", role: "ramp" })] });
    const button = disclosureFor("Ramp");
    const grid = () => document.getElementById(button.getAttribute("aria-controls")!)!;
    expect(grid().classList.contains("anim-gentle-in")).toBe(false);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(grid().classList.contains("anim-gentle-in")).toBe(true);
  });

  it("clears the expansion on fold — reopening shows the cap again, not what was expanded", () => {
    const many = Array.from({ length: SHELF_CAP + 2 }, (_, i) => suggestion({ name: `Ramp Card ${i}` }));
    mount({ suggestions: many });

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`show all ${SHELF_CAP + 2} ramp`, "i") }));
    expect(screen.getAllByRole("listitem")).toHaveLength(SHELF_CAP + 2);

    const foldButton = disclosureFor("Ramp");
    fireEvent.click(foldButton); // fold
    fireEvent.click(foldButton); // unfold

    expect(screen.getAllByRole("listitem")).toHaveLength(SHELF_CAP);
    expect(screen.getByRole("button", { name: /show all/i })).toBeInTheDocument();
  });

  // The fold can arrive from ANY writer to the shared storage key, not only this
  // tab's own click — `useFoldedShelves` subscribes to `storage` the same way a
  // second browser tab's write would reach it. The expansion still has to clear
  // (Copilot round 1, medium): a shelf expanded here and folded by another tab
  // must reopen capped, not resuming an expansion that write knows nothing about.
  it("clears the expansion on an externally-written fold, not only a local click", async () => {
    const { writeRaw } = await import("../ui/local-store");
    const many = Array.from({ length: SHELF_CAP + 2 }, (_, i) => suggestion({ name: `Ramp Card ${i}` }));
    mount({ suggestions: many });

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`show all ${SHELF_CAP + 2} ramp`, "i") }));
    expect(screen.getAllByRole("listitem")).toHaveLength(SHELF_CAP + 2);

    // Simulates a second tab folding this shelf: a write to the same key, through
    // the same store, with no click on this tab's own button.
    await act(() => {
      writeRaw(shelfFoldKey("deck-1"), JSON.stringify(["ramp"]));
    });
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);

    fireEvent.click(disclosureFor("Ramp")); // this tab reopens it
    expect(screen.getAllByRole("listitem")).toHaveLength(SHELF_CAP);
    expect(screen.getByRole("button", { name: /show all/i })).toBeInTheDocument();
  });

  // A flex-wrap item that wraps starts at the CONTAINER's edge — under the
  // chevron, not under the preceding sibling — so label and clause must share
  // their OWN group, separate from the chevron, for "the clause wraps under
  // the label" (handoff) to hold (Copilot round 2, medium).
  it("groups the label and clause together, apart from the chevron", () => {
    mount({ suggestions: [suggestion({ name: "Cultivate", role: "ramp" })] });
    const labelSpan = screen.getByTestId("shelf-label");
    const group = labelSpan.parentElement!;
    const button = group.parentElement!;
    expect(button.tagName).toBe("BUTTON");
    // The clause sits beside the label inside that same group…
    expect(group.textContent).toContain(addPanelCopy.shelf.count(1));
    // …and the chevron is the BUTTON's own direct child, a sibling of the
    // group rather than a member of it.
    expect([...button.children]).not.toContain(labelSpan);
    expect([...group.children]).toHaveLength(2); // label span + clause span
  });

  it("persists per deck in localStorage, survives a remount, and defaults open", () => {
    const { unmount } = mount({ suggestions: [suggestion({ name: "Cultivate", role: "ramp" })] });
    fireEvent.click(disclosureFor("Ramp"));
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    unmount();

    mount({ suggestions: [suggestion({ name: "Cultivate", role: "ramp" })] });
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(disclosureFor("Ramp")).toHaveAttribute("aria-expanded", "false");
  });

  it("does not leak fold state across decks", () => {
    const { unmount } = mount({
      deckId: "deck-a",
      suggestions: [suggestion({ name: "Cultivate", role: "ramp" })],
    });
    fireEvent.click(disclosureFor("Ramp"));
    unmount();

    mount({ deckId: "deck-b", suggestions: [suggestion({ name: "Cultivate", role: "ramp" })] });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(disclosureFor("Ramp")).toHaveAttribute("aria-expanded", "true");
  });

  // `BuilderShell` is retained across a deck-to-deck navigation — the SAME
  // component instance re-renders with a new `deck` prop rather than
  // unmounting — so the `unmount()`-based case above cannot exercise this
  // path. `rerender` keeps the same React tree, the way a client navigation
  // actually does (Copilot round 3, medium "previously missed").
  it("does not carry an expanded Show-all into a different deck's same-key shelf, on a retained shell", () => {
    const many = Array.from({ length: SHELF_CAP + 2 }, (_, i) => suggestion({ name: `Ramp Card ${i}` }));
    const { rerender } = mount({ deckId: "deck-a", suggestions: many });

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`show all ${SHELF_CAP + 2} ramp`, "i") }));
    expect(screen.getAllByRole("listitem")).toHaveLength(SHELF_CAP + 2);

    rerender(
      <CardDetailProvider fetchCard={async () => null}>
        <Harness deckId="deck-b" suggestions={many} />
      </CardDetailProvider>,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(SHELF_CAP);
    expect(screen.getByRole("button", { name: /show all/i })).toBeInTheDocument();
  });

  it("ignores an unknown stored shelf key rather than erroring", () => {
    localStorage.setItem(shelfFoldKey("deck-1"), JSON.stringify(["wipes", "not-a-real-key"]));
    mount({ suggestions: [suggestion({ name: "Cultivate", role: "ramp" })] });

    // The only rendered shelf (ramp) is unaffected by stray keys for shelves
    // this render never built.
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(disclosureFor("Ramp")).toHaveAttribute("aria-expanded", "true");
  });
});

describe("ConsiderPanel — sort", () => {
  it("reorders within a shelf without regrouping it", () => {
    mount({
      suggestions: [
        suggestion({ name: "Expensive", manaValue: 6, inclusionPct: 80 }),
        suggestion({ name: "Cheap", manaValue: 1, inclusionPct: 20 }),
      ],
    });
    const names = () => screen.getAllByRole("listitem").map((li) => li.textContent);

    expect(names()[0]).toContain("Expensive");
    fireEvent.change(screen.getByRole("combobox", { name: /sort suggestions/i }), {
      target: { value: "cheapest" },
    });
    expect(names()[0]).toContain("Cheap");

    fireEvent.change(screen.getByRole("combobox", { name: /sort suggestions/i }), {
      target: { value: "edhrec" },
    });
    expect(names()[0]).toContain("Expensive");
  });

  // A card we have no figure for is not the least-played card. It sorts below
  // everything we do have a figure for, rather than tying at zero.
  it("sinks a card with no EDHREC figure under EDHREC sort", () => {
    mount({
      suggestions: [
        suggestion({ name: "Unknown", inclusionPct: null }),
        suggestion({ name: "Known", inclusionPct: 5 }),
      ],
    });
    fireEvent.change(screen.getByRole("combobox", { name: /sort suggestions/i }), {
      target: { value: "edhrec" },
    });
    expect(screen.getAllByRole("listitem")[0].textContent).toContain("Known");
  });
});

describe("ConsiderPanel — evidence", () => {
  it("says it has no figure rather than drawing a 0% bar", () => {
    mount({ suggestions: [suggestion({ name: "Sol Ring", inclusionPct: null })] });
    expect(screen.getByText("no EDHREC figure")).toBeInTheDocument();
    expect(screen.queryByText("0%")).toBeNull();
  });

  // reason and role diverge on a multi-role card: this one is classified as
  // removal but was picked to close the ramp gap, and the sentence is about
  // why it is here rather than what it is.
  it("names the slot the card was picked for, not the card's own role", () => {
    mount({
      suggestions: [
        suggestion({
          name: "Sol Ring", reasonType: "role", reason: "ramp", inclusionPct: null, role: "removal",
        }),
      ],
    });
    expect(screen.getByText("fills a ramp slot")).toBeInTheDocument();
  });

  // Synergy arrives as a fraction; the tile states it in points, and only when
  // running it more than average is actually a reason to add the card.
  it("states positive synergy in points and never a negative one", () => {
    const { unmount } = mount({
      suggestions: [suggestion({ name: "Sol Ring", lift: 0.31 })],
    });
    expect(screen.getByText("+31 pts vs. all decks")).toBeInTheDocument();
    unmount();

    mount({ suggestions: [suggestion({ name: "Sol Ring", lift: null })] });
    expect(screen.queryByText(/pts vs\./)).toBeNull();
  });

  // The bar is aria-hidden and the percentage carries its own aria, so the
  // label is decoration for the eye only — it must render beside a figure and
  // stay absent from the honest-omission branch that draws no bar at all.
  it("labels the inclusion bar's source, and only where there is a bar", () => {
    const { unmount } = mount({
      suggestions: [suggestion({ name: "Sol Ring", inclusionPct: 82 })],
    });
    expect(screen.getByText("edhrec")).toBeInTheDocument();
    unmount();

    mount({ suggestions: [suggestion({ name: "Sol Ring", inclusionPct: null })] });
    expect(screen.queryByText("edhrec")).toBeNull();
  });
});

describe("ConsiderPanel — tiles", () => {
  // The shelf heading already says the role; repeating it on every tile is the
  // redundancy the overhaul exists to remove.
  it("never prints the role on a tile", () => {
    mount({ suggestions: [suggestion({ name: "Sol Ring", role: "ramp" })] });
    const tile = screen.getByRole("listitem");
    expect(within(tile).queryByText(/ramp/i)).toBeNull();
  });

  // Consider-tiles handoff call 1: cost pips are deleted from the tile outright, not
  // relocated, matching the card-captions rulings this tile adopts.
  it("draws no cost pips", () => {
    mount({ suggestions: [suggestion({ name: "Sol Ring", manaCost: "{2}{U/B}{2/W}{G/P}" })] });
    const tile = screen.getByRole("listitem");
    expect(tile.querySelectorAll<HTMLElement>("span.rounded-full.font-mono")).toHaveLength(0);
  });

  it("offers exactly three targets — art, name and Add", () => {
    mount({ suggestions: [suggestion({ name: "Sol Ring" })] });
    const tile = screen.getByRole("listitem");
    expect(within(tile).getAllByRole("button")).toHaveLength(3);
  });

  // Removing an added tile reflows the grid under the pointer, so the next
  // click lands on a card the user never chose.
  it("adds on click and holds the tile's slot", async () => {
    mount({ suggestions: [suggestion({ name: "Sol Ring" })] });
    fireEvent.click(screen.getByRole("button", { name: "Add Sol Ring to the deck" }));

    await waitFor(() => expect(addCardToDeck).toHaveBeenCalledWith("deck-1", "sol-ring"));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("draws an already-in-deck card as in-deck from the server list alone", () => {
    mount({
      suggestions: [suggestion({ name: "Sol Ring" })],
      deckOracleIds: ["sol-ring"],
    });
    expect(screen.getByLabelText("Sol Ring is already in this deck")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add sol ring/i })).toBeNull();
  });

  // No row in the live DB has a null imageUri, so this state only ever exists
  // when a test forces it.
  it("says so when a card has no art on file", () => {
    mount({ suggestions: [suggestion({ name: "Sol Ring", imageUri: null })] });
    expect(screen.getByText("no art on file")).toBeInTheDocument();
  });
});

// loadDeckSuggestions appends up to SHELF_CAP unowned EDHREC staples. They used to
// say so only by the absence of an aria-hidden dot.
describe("ConsiderPanel — unowned staples", () => {
  const unowned = (name: string) => suggestion({ name, owned: false });

  // Queried by its rendered text rather than by label: `getByLabelText` matches
  // the attribute, so it passed while the tag was a bare span whose role
  // discards an `aria-label` outright. The sentence is now real text, swapped in
  // for the word, so no role has to carry it.
  it("marks an unowned tile with a buy tag that says so in words", () => {
    mount({ suggestions: [unowned("Smothering Tithe")] });
    const tag = screen.getByText("Smothering Tithe is not in your collection").parentElement!;
    expect(tag).toHaveTextContent("buy");
  });

  // The art is a button carrying its own aria-label, which replaces every
  // descendant in the accessible name. Nested there the tag was silent and the
  // shelf heading was the only thing left saying the card is unowned.
  it("keeps the tag out of the card-detail button, so its sentence survives", () => {
    mount({ suggestions: [unowned("Smothering Tithe")] });
    const tag = screen.getByText("Smothering Tithe is not in your collection");
    expect(tag.closest("button")).toBeNull();
  });

  // A card with no art renders a placeholder instead of the art branch, which
  // is where the tag used to live.
  it("still marks an unowned tile that has no art", () => {
    mount({ suggestions: [suggestion({ name: "Mana Drain", owned: false, imageUri: null })] });
    expect(
      screen.getByText("Mana Drain is not in your collection").parentElement,
    ).toHaveTextContent("buy");
  });

  // R3.1 §4: the two adds are peers, so they take one geometry and one weight.
  // The consequence that differs is named in the label, never drawn as a style
  // difference nobody can perceive while skimming a panel of tiles.
  it("gives both adds the same pill and puts the difference in the label", () => {
    mount({ suggestions: [unowned("Smothering Tithe"), suggestion({ name: "Sol Ring" })] });

    const unownedAdd = screen.getByRole("button", {
      name: "Add Smothering Tithe to the deck, and to your Shopping list, because you don’t own it",
    });
    const ownedAdd = screen.getByRole("button", { name: "Add Sol Ring to the deck" });

    expect(unownedAdd.className).toBe(ownedAdd.className);
    expect(unownedAdd.className).not.toContain("bg-accent");
    expect(ownedAdd.className).not.toContain("bg-accent");
    expect(unownedAdd).toHaveTextContent("Add · to buy");
    expect(ownedAdd).toHaveTextContent("Add");
  });

  // Design table §8-6 ungates the lift line from ownership so a synergy-ranked
  // tile can show why it ranked where it did, even if the card is unowned.
  it("shows the lift line on an unowned tile", () => {
    mount({
      suggestions: [suggestion({ name: "Mana Drain", owned: false, lift: 0.31 })],
    });
    expect(screen.getByText(/pts vs\./)).toBeInTheDocument();
  });

  // A shelf that says "you have 2 of 10" is about cards you can play tonight.
  it("keeps the unowned five out of every coverage shelf", () => {
    mount({
      suggestions: [suggestion({ name: "Cultivate", role: "ramp" }), unowned("Mana Drain")],
      deckCards: [deckCard("ramp", 4)],
    });

    const ramp = screen.getByRole("region", { name: "Ramp" });
    expect(within(ramp).queryByText("Mana Drain")).toBeNull();
    expect(within(ramp).getByText(/you have 4 of 10 · 1 to consider/)).toBeInTheDocument();
  });

  it("shelves them last, under the existing EDHREC heading", () => {
    mount({
      suggestions: [
        unowned("Mana Drain"),
        suggestion({ name: "Villain", role: "other" }),
        suggestion({ name: "Cultivate", role: "ramp" }),
        suggestion({ name: "Swords", role: "ramp", synergyFigure: 0.4 }),
      ],
      deckCards: [deckCard("ramp", 4)],
    });

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.querySelector('[data-testid="shelf-label"]')?.textContent))
      .toEqual(["Ramp", "Threats & synergy", synergyCopy.shelf.label("Korvold"), "Top picks for Korvold"]);
    expect(screen.getByText("not in your collection")).toBeInTheDocument();
    expect(screen.getByText("· 1 to consider")).toBeInTheDocument();
  });

  it("draws no such shelf when the append produced nothing", () => {
    mount({ suggestions: [suggestion({ name: "Sol Ring" })] });
    expect(screen.queryByText(/top picks for/i)).toBeNull();
    expect(screen.queryByText("not in your collection")).toBeNull();
  });

  it("states both sides of the provenance line, and only when there are two", () => {
    const { unmount } = mount({
      suggestions: [suggestion({ name: "Sol Ring" }), unowned("Mana Drain")],
    });
    expect(screen.getByText("1 owned · 1 you don’t own")).toBeInTheDocument();
    unmount();

    mount({ suggestions: [suggestion({ name: "Sol Ring" })] });
    expect(screen.getByText("1 card you already own")).toBeInTheDocument();
  });
});

describe("ConsiderPanel — panel states", () => {
  it("is a tabpanel, not an overlay", () => {
    mount();
    // Named by its tab rather than carrying a label of its own, which
    // aria-labelledby would win against anyway. The tab lives in BuilderTabs,
    // so the name resolves only in the shell — the wiring is this panel's half.
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "tab-consider");
    expect(screen.getByRole("tabpanel")).not.toHaveAttribute("aria-label");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sends an out-of-ideas user to their collection, not to a dead end", () => {
    mount({ suggestions: [] });
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(/out of ideas/i);
    expect(screen.getByRole("link", { name: /add to your collection/i }))
      .toHaveAttribute("href", "/collection");
  });

  it("says why the percentages are missing when EDHREC is down", () => {
    mount({ degraded: true });
    expect(screen.getByText(/EDHREC isn’t answering right now/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refresh).toHaveBeenCalled();
  });

  // The provenance line names EDHREC as a source. With EDHREC down it would be
  // claiming a pedigree these shelves do not have.
  it("drops the provenance line while degraded, keeping only Sort", () => {
    const { unmount } = mount();
    expect(screen.getByText(/you already own/i)).toBeInTheDocument();
    unmount();

    mount({ degraded: true });
    expect(screen.queryByText(/you already own/i)).toBeNull();
    expect(screen.getByRole("combobox", { name: /sort suggestions/i })).toBeInTheDocument();
  });
});

describe("ConsiderPanel — synergy shelf", () => {
  it("puts the synergy shelf above the unowned append and below the role shelves", () => {
    mount({
      commanderShortName: "Atraxa",
      commanderOracleId: "cmd-atraxa",
      suggestions: [
        suggestion({ name: "Rampant Growth", owned: true, role: "ramp" }),
        suggestion({ name: "Beast Within", owned: true, synergyFigure: 0.4 }),
        suggestion({ name: "Mana Crypt", owned: false }),
      ],
    });
    const headings = screen.getAllByRole("heading", { level: 3 })
      .map((h) => h.querySelector('[data-testid="shelf-label"]')?.textContent);
    expect(headings.indexOf(synergyCopy.shelf.label("Atraxa")))
      .toBeGreaterThan(headings.findIndex((h) => h?.startsWith("Ramp")));
    expect(headings.indexOf(synergyCopy.shelf.label("Atraxa")))
      .toBeLessThan(headings.indexOf(addPanelCopy.shelf.labels.edhrec("Atraxa")));
  });

  it("rests the synergy shelf in synergy order, negatives included", () => {
    mount({
      commanderShortName: "Atraxa",
      commanderOracleId: "cmd-atraxa",
      suggestions: [
        suggestion({ name: "Low Synergy Card", owned: true, synergyFigure: -0.1 }),
        suggestion({ name: "High Synergy Card", owned: true, synergyFigure: 0.9 }),
        suggestion({ name: "Middle Synergy Card", owned: true, synergyFigure: 0.2 }),
      ],
    });
    const shelf = screen.getByRole("region", { name: synergyCopy.shelf.label("Atraxa") });
    // Each tile has two CardDetailTrigger buttons: one for the art (aria-label
    // "View details for <name>") and one for the name (text content is the card
    // name). Use the aria-label on the first button to identify the card.
    expect(within(shelf).getAllByRole("listitem").map((li) => {
      const artBtn = within(li).getAllByRole("button")[0];
      const ariaLabel = artBtn.getAttribute("aria-label") ?? "";
      // aria-label is "View details for <Card Name>"
      return ariaLabel.replace(/^View details for /, "");
    })).toEqual(["High Synergy Card", "Middle Synergy Card", "Low Synergy Card"]);
  });

  // showNoSynergy is wired to isSynergyShelf. A card with a negative synergyFigure
  // (lift is null) lands on the synergy shelf but must not show the absent-figure
  // label — it has a figure; the label means "no data at all". A role-shelf card
  // with no figure must also stay silent — showNoSynergy is false there.
  it("suppresses the absent-figure label on the synergy shelf when the card has a figure", () => {
    mount({
      commanderShortName: "Atraxa",
      commanderOracleId: "cmd-atraxa",
      suggestions: [
        // Negative synergyFigure: on the synergy shelf, lift is null, but the
        // card has a figure — the absent-state label must not appear.
        suggestion({ name: "Negative Card", owned: true, synergyFigure: -0.1, lift: null }),
        // Role shelf: synergyFigure null, lift null, showNoSynergy false — silent.
        suggestion({ name: "Ramp Card", owned: true, role: "ramp", synergyFigure: null, lift: null }),
      ],
    });
    const synergyShelf = screen.getByRole("region", { name: synergyCopy.shelf.label("Atraxa") });
    const rampShelf = screen.getByRole("region", { name: "Ramp" });
    // Scoped to the negative card's own tile: the figureless ramp card also sits
    // on this shelf, and it is supposed to carry the label.
    const negativeTile = within(synergyShelf)
      .getAllByRole("listitem")
      .find((li) => within(li).queryAllByLabelText("View details for Negative Card").length > 0)!;
    expect(within(negativeTile).queryByText(synergyCopy.shelf.noSynergy)).not.toBeInTheDocument();
    expect(within(rampShelf).queryByText(synergyCopy.shelf.noSynergy)).not.toBeInTheDocument();
  });

  // The positive half of the pair above: without it, showNoSynergy could be
  // hardcoded false and every assertion here would still pass.
  it("says so on the synergy shelf for a card with no figure at all", () => {
    mount({
      commanderShortName: "Atraxa",
      commanderOracleId: "cmd-atraxa",
      suggestions: [
        suggestion({ name: "Ranked Card", owned: true, synergyFigure: 0.9 }),
        suggestion({ name: "Figureless Card", owned: true, synergyFigure: null, lift: null }),
      ],
    });
    const synergyShelf = screen.getByRole("region", { name: synergyCopy.shelf.label("Atraxa") });
    expect(within(synergyShelf).getByText(synergyCopy.shelf.noSynergy)).toBeInTheDocument();
  });

  // A role pick was never EDHREC-ranked, so it has no synergy figure by
  // construction. Shelving it here would repeat the coverage shelf above it and
  // bury the ranking under absent-figure rows.
  it("leaves role picks off the synergy shelf", () => {
    mount({
      commanderShortName: "Atraxa",
      commanderOracleId: "cmd-atraxa",
      suggestions: [
        suggestion({ name: "Ranked Card", owned: true, synergyFigure: 0.9 }),
        suggestion({
          name: "Role Pick",
          owned: true,
          reasonType: "role",
          reason: "ramp",
          synergyFigure: null,
          lift: null,
        }),
      ],
    });
    const synergyShelf = screen.getByRole("region", { name: synergyCopy.shelf.label("Atraxa") });
    expect(within(synergyShelf).queryByText("Role Pick")).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Ramp" })).getByText("Role Pick"))
      .toBeInTheDocument();
  });

  // One figureless card among ranked ones is an exception to a ranking and keeps
  // its label (the test above). A shelf where nothing has a figure is not a
  // ranking at all, so the heading that promises one is never drawn.
  it("draws no synergy shelf when not one pick has a figure", () => {
    mount({
      commanderShortName: "Atraxa",
      commanderOracleId: "cmd-atraxa",
      suggestions: [
        suggestion({ name: "Figureless One", owned: true, synergyFigure: null, lift: null }),
        suggestion({ name: "Figureless Two", owned: true, synergyFigure: null, lift: null }),
      ],
    });
    expect(
      screen.queryByRole("region", { name: synergyCopy.shelf.label("Atraxa") }),
    ).not.toBeInTheDocument();
  });
});

// The set the coverage strip gates its cells on. It has to agree with
// buildShelves exactly: a role it reports that the panel does not draw is a
// cell that scrolls nowhere, and a role it omits is a shelf nobody can reach.
describe("rolesWithShelves — which cells have somewhere to go", () => {
  it("reports a role once it has an owned suggestion", () => {
    const roles = rolesWithShelves([
      suggestion({ name: "Sol Ring", role: "ramp" }),
      suggestion({ name: "Rhystic Study", role: "draw" }),
    ]);
    expect([...roles].sort()).toEqual(["draw", "ramp"]);
  });

  it("omits a role whose only suggestions are unowned, because that shelf is dropped", () => {
    const roles = rolesWithShelves([suggestion({ name: "Mana Drain", role: "draw", owned: false })]);
    expect(roles.has("draw")).toBe(false);
  });

  it("omits the targetless role, which the strip has no cell for", () => {
    const roles = rolesWithShelves([suggestion({ name: "Dockside", role: "other" })]);
    expect(roles.size).toBe(0);
  });

  // shelfRoleOf, not `role`: a card offered to close the ramp gap shelves under
  // ramp whatever the card itself is, and the strip has to follow it there.
  it("follows the slot a suggestion was picked for, not the card's own role", () => {
    const roles = rolesWithShelves([
      suggestion({ name: "Cultivate", role: "removal", reason: "ramp", reasonType: "role" }),
    ]);
    expect([...roles]).toEqual(["ramp"]);
  });
});

// TASK 20. The `gaps` order is the pass-through today, so within one shelf the player is shown
// whatever the pool happened to produce. Role floors and type targets are different axes that
// collide through the cards satisfying both — so of two cards that close the same role, the one
// closing the larger TYPE gap is the better slot, and `gaps` is where that belongs.
//
// The OTHER branches keep their meaning: `cheapest` is a promise about mana value and synergy
// is a promise about EDHREC's figure. Neither is "the deck's shape", and quietly re-ordering
// them by type would break a control the player is using to answer a different question.
describe("ordering within a shelf", () => {
  // Two ramp cards, identical but for type. The composition wants creatures and has all the
  // artifacts it needs, so the creature closes the larger gap.
  const creature = suggestion({
    name: "Elf", typeLine: "Creature — Elf", cardTypeGroup: "Creatures",
    // THE TWO ORDERS MUST DISAGREE, or neither case below measures anything. With the
    // creature both the larger type gap AND the cheaper card, `cheapest` and `gaps` produce
    // the same list and the "leaves `cheapest` alone" guard passes whether or not the type
    // sort leaked into it. The creature is the dearer card now, so `gaps` puts it first and
    // `cheapest` puts it second.
    role: "ramp", reason: "ramp", manaValue: 3,
  });
  const artifact = suggestion({
    name: "Rock", typeLine: "Artifact", cardTypeGroup: "Artifacts",
    role: "ramp", reason: "ramp", manaValue: 2,
  });
  const wantsCreatures = recommendedMix({
    composition: {
      of: "commander",
      targets: { land: 35, basic: 20, nonbasic: 15, creature: 40, instant: 0,
        sorcery: 0, artifact: 0, enchantment: 0, planeswalker: 0, battle: 0 },
      averageCurve: null,
    },
    roleTargets: { of: "commander", targets: { ramp: 10, draw: 10, removal: 8, wipes: 3 } },
    condition: "G", thinCondition: false, staples: [], commanderDeckCount: 1000,
  }, false);

  const tiles = () =>
    screen.getAllByTestId("suggestion-tile").map((el) => el.getAttribute("data-oracle-id"));

  it("offers the larger type gap first under `gaps`", () => {
    mount({ mix: wantsCreatures, sort: "gaps", suggestions: [artifact, creature] });
    expect(tiles()[0]).toBe("elf");
  });

  // Its own render, deliberately: a second assertion inside the first test would read a DOM
  // the first render left behind, and the case is about two independent orderings.
  // THE SYNERGY SHELF IS EXEMPT FROM `gaps`, and this needs a mix carrying TYPES to reach.
  // With no composition `typeDeficits` is empty and `sortWithin` returns early, so the
  // existing synergy-order case passes over a build that reorders the shelf — it did,
  // while this was broken. A commander with a measured composition is exactly the state
  // this sub-project creates, and `gaps` is the DEFAULT sort, so the reader would have met
  // a shelf ordered by type under a heading reading `ranked by synergy`.
  it("leaves the synergy shelf in synergy order under `gaps`", () => {
    mount({
      mix: wantsCreatures,
      sort: "gaps",
      commanderShortName: "Atraxa",
      commanderOracleId: "cmd-atraxa",
      suggestions: [
        // The artifact carries the HIGHER synergy and the SMALLER type gap, so the two
        // rules disagree and the case can tell them apart.
        suggestion({
          name: "Rocky", typeLine: "Artifact", cardTypeGroup: "Artifacts",
          owned: true, synergyFigure: 0.9,
        }),
        suggestion({
          name: "Elfie", typeLine: "Creature — Elf", cardTypeGroup: "Creatures",
          owned: true, synergyFigure: 0.1,
        }),
      ],
    });
    const shelf = screen.getByRole("region", { name: synergyCopy.shelf.label("Atraxa") });
    const names = within(shelf).getAllByRole("listitem").map((li) => (
      within(li).getAllByRole("button")[0].getAttribute("aria-label") ?? ""
    ).replace(/^View details for /, ""));
    expect(names).toEqual(["Rocky", "Elfie"]);
  });

  it("leaves `cheapest` alone", () => {
    mount({ mix: wantsCreatures, sort: "cheapest", suggestions: [artifact, creature] });
    // The artifact is the cheaper card and the deck wants creatures, so the two rules
    // disagree — which is what makes this a guard rather than a coincidence. `gaps` would
    // answer ["elf","rock"]; `cheapest` must answer the question its own control asks.
    expect(tiles()).toEqual(["rock", "elf"]);
  });
});
