// ConsiderPanel — discovery is a room.
//
// What the old suggestion list got wrong and these tests hold: a flat list that
// never said what the deck was short of, a card claiming "0% of decks" when the
// truth was that we had no figure, and a role printed on every row that the
// heading above already said.
import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SortKey } from "./consider-toolbar";
import type { DeckSuggestion } from "../../lib/decks/suggest";
import type { DeckDetailCard } from "../../lib/decks/grouping";

const addCardToDeck = vi.fn(async () => ({ ok: true as const }));
vi.mock("../../app/decks/actions", () => ({ addCardToDeck }));

// The degraded banner's Try again re-fetches the page rather than owning a
// retry of its own, so the panel needs a router even in the happy path.
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { ConsiderPanel, SHELF_CAP } = await import("./consider-panel");
const { CardDetailProvider } = await import("./card-detail-provider");

const suggestion = (over: Partial<DeckSuggestion> & { name: string }): DeckSuggestion => ({
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
  ...over,
});

const deckCard = (role: DeckDetailCard["role"], quantity = 1) =>
  ({ role, quantity }) as DeckDetailCard;

// Sort lives in the shell now, so the harness supplies the state the shell
// would: without it, changing the control would leave the shelves as they were.
function Harness(props: Partial<React.ComponentProps<typeof ConsiderPanel>>) {
  const [sort, setSort] = useState<SortKey>("gaps");
  return (
    <ConsiderPanel
      deckId="deck-1"
      suggestions={[suggestion({ name: "Sol Ring" })]}
      deckCards={[]}
      deckOracleIds={[]}
      commanderShortName="Korvold"
      degraded={false}
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

beforeEach(() => vi.clearAllMocks());

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
    expect(headings.map((h) => h.textContent)).toEqual(["Removal", "Ramp"]);
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
    expect(headings.map((h) => h.textContent)).toEqual(["Ramp", "Threats & synergy"]);
    expect(screen.getByText(/no target — this is the deck’s plan/)).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /show all 15 ramp suggestions/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(SHELF_CAP + 3);

    fireEvent.click(screen.getByRole("button", { name: /show fewer/i }));
    expect(screen.getAllByRole("listitem")).toHaveLength(SHELF_CAP);
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
    expect(screen.getByText("+31 pts vs. average")).toBeInTheDocument();
    unmount();

    mount({ suggestions: [suggestion({ name: "Sol Ring", lift: null })] });
    expect(screen.queryByText(/pts vs\. average/)).toBeNull();
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

  // A pip is 14px, so a symbol's colours are drawn and never spelled. The one
  // thing that must survive is a numeral: a two-brid pip with no "2" claims a
  // cost the card does not have.
  it("draws colours as fill and keeps a numeral when the symbol has one", () => {
    mount({ suggestions: [suggestion({ name: "Sol Ring", manaCost: "{2}{U/B}{2/W}{G/P}" })] });
    const tile = screen.getByRole("listitem");
    const pips = tile.querySelectorAll("span.rounded-full.w-\\[14px\\]");
    expect([...pips].map((p) => p.textContent)).toEqual(["2", "", "2", ""]);
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
    fireEvent.click(screen.getByRole("button", { name: "Add Sol Ring to deck" }));

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

describe("ConsiderPanel — panel states", () => {
  it("is a tabpanel, not an overlay", () => {
    mount();
    expect(screen.getByRole("tabpanel", { name: "Cards to consider" })).toBeInTheDocument();
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
