// decklist.test.tsx — Shopping-filter grouping (Task 11, #130)
// Tests for the role-grouped Shopping view: group headers, gap clauses, footer
// variants, empty-covered state, row heights, and the EDHREC figure meta line.

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { ROLE_TARGETS } from "../../lib/recs/roles";
import { CardDetailProvider, cardDetailCopy } from "../cards/card-detail-provider";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { viewToggleCopy } from "../../lib/copy/card-surfaces";
import { proxyCopy } from "../../lib/copy/proxies";

// ── Server-action mocks ───────────────────────────────────────────────────────
vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  keepAutoCard: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

// ── Dynamic imports (after mocks are set up) ─────────────────────────────────
const { Decklist } = await import("./decklist");
const { DecklistRow } = await import("./decklist-row");

// ── Shared card factories ─────────────────────────────────────────────────────
function makeCard(overrides: Partial<DeckDetailCard> & { oracleId: string; name: string }): DeckDetailCard {
  return {
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts",
    role: "other",
    cmc: 2,
    owned: true,
    quantity: 1,
    auto: true,
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
    ...overrides,
  };
}

const rampOwned = makeCard({ oracleId: "sol-ring", name: "Sol Ring", role: "ramp", owned: true, auto: true });
const rampUnowned = makeCard({ oracleId: "arcane-signet", name: "Arcane Signet", role: "ramp", owned: false, auto: true });
const drawOwned = makeCard({ oracleId: "rhystic-study", name: "Rhystic Study", role: "draw", owned: true, auto: true });
const drawUnowned = makeCard({ oracleId: "mystic-remora", name: "Mystic Remora", role: "draw", owned: false, auto: true });
const drawUnownedManual = makeCard({ oracleId: "necropotence", name: "Necropotence", role: "draw", owned: false, auto: false });
const basicLand = makeCard({
  oracleId: "forest",
  name: "Forest",
  role: "land",
  typeLine: "Basic Land — Forest",
  cardTypeGroup: "Lands",
  owned: false,
  auto: true,
});

// A Decklist with the Shopping filter active requires the optimistic-deck
// providers. Thread through the minimal BuilderShell context.
const { AddOptimisticCardProvider } = await import("./optimistic-deck");

function renderDecklist(
  cards: DeckDetailCard[],
  opts: {
    shoppingFigures?: Record<string, number> | null;
    filled?: boolean;
    fetchCard?: (oracleId: string) => Promise<unknown>;
    spentSlot?: DeckDetailCard | null;
    filter?: "all" | "shopping";
    grouping?: "type" | "role";
    newestAsOf?: Date | null;
    onAnnounce?: (message: string) => void;
    pendingChanges?: ReadonlyMap<string, { from: number; to: number }>;
  } = {},
) {
  const deckEdits = {
    add: vi.fn(),
    remove: vi.fn(),
    markSpent: vi.fn(),
    announceUndo: vi.fn(),
    reportRemoveFailure: vi.fn(),
    resolveRow: vi.fn(),
    deleteRow: vi.fn(),
    keep: vi.fn(),
  };

  render(
    <CardDetailProvider
      fetchCard={(opts.fetchCard ?? vi.fn().mockResolvedValue(null)) as never}
    >
      <AddOptimisticCardProvider value={deckEdits}>
        <Decklist
          deckId="deck-1"
          cards={cards}
          unresolvedRows={[]}
          commanderOracleId="commander-1"
          deckOracleIds={cards.map((c) => c.oracleId)}
          built={cards.reduce((s, c) => s + c.quantity, 0)}
          bodySize={99}
          filled={opts.filled ?? false}
          spentSlot={opts.spentSlot ?? null}
          filter={opts.filter ?? "shopping"}
          grouping={opts.grouping ?? "role"}
          onFilterChange={vi.fn()}
          onGroupingChange={vi.fn()}
          pendingChanges={opts.pendingChanges}
          shoppingFigures={opts.shoppingFigures === undefined ? {} : opts.shoppingFigures}
          newestAsOf={opts.newestAsOf ?? null}
          onAnnounce={opts.onAnnounce}
        />
      </AddOptimisticCardProvider>
    </CardDetailProvider>,
  );
}

// ── Test suites ───────────────────────────────────────────────────────────────

describe("Shopping's intro claims provenance only where it has it", () => {
  it("says we reached past the collection when every row is the fill's", () => {
    renderDecklist([rampUnowned, drawUnowned]);
    expect(
      screen.getByText(recommendationsCopy.shopping.intro("2")),
    ).toBeInTheDocument();
  });

  it("states the size and nothing more once a row is the player's own", () => {
    renderDecklist([rampUnowned, drawUnownedManual]);
    expect(
      screen.getByText(recommendationsCopy.shopping.introUnfilled("2")),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(recommendationsCopy.shopping.intro("2")),
    ).not.toBeInTheDocument();
  });
});

describe("Shopping groups by role and heads each group with the gap it closes", () => {
  it("renders the role label as a group header for unowned cards", () => {
    renderDecklist([rampOwned, rampUnowned, drawOwned, drawUnowned]);

    // Only the unowned cards appear in Shopping — each role that has unowned cards
    // should have a group header with the role name.
    expect(screen.getByText("Ramp")).toBeInTheDocument();
    expect(screen.getByText("Draw")).toBeInTheDocument();
    // Owned-only roles must NOT appear
    expect(screen.queryByText("Removal")).not.toBeInTheDocument();
  });

  it("does not render owned cards in the Shopping filter", () => {
    renderDecklist([rampOwned, rampUnowned]);
    expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument();
    expect(screen.getByText("Arcane Signet")).toBeInTheDocument();
  });
});

describe("the Shopping list reads dearest first", () => {
  // The order the reader decides on. Asserted through the RENDERED rows rather
  // than through the comparator — `price.test.ts` proves the ranking, and what
  // this has to prove is that the list is actually built through it.
  const NEWEST = new Date("2026-09-01T09:00:00.000Z");
  const OLDER = new Date("2026-08-25T09:00:00.000Z");
  const priced = (cents: number | null, asOf = NEWEST) => ({
    cents, foilCents: null, etchedCents: null, asOf,
  });

  const buyable = (oracleId: string, name: string, price: unknown, over: object = {}) =>
    makeCard({ oracleId, name, owned: false, auto: false, price, ...over } as never);

  // One role, so the order under test is the order inside a group rather than
  // the order of the groups themselves.
  const rampRows = [
    buyable("signet", "Arcane Signet", priced(85), { role: "ramp" }),
    buyable("crypt", "Mana Crypt", priced(18999), { role: "ramp" }),
    buyable("sol", "Sol Ring", priced(3410), { role: "ramp" }),
  ];

  // Document order, read off the DOM rather than off the array handed in: the
  // rows are what the list drew, so the assertion has to come from the page.
  const renderedOrder = (wanted: string[]) => {
    const text = [...document.querySelectorAll("*")].map((el) => el.textContent?.trim());
    return wanted
      .map((name) => ({ name, at: text.findIndex((t) => t === name) }))
      .sort((a, b) => a.at - b.at)
      .map((r) => r.name);
  };

  it("orders a role group by price, dearest first", () => {
    renderDecklist(rampRows, { newestAsOf: NEWEST });

    expect(renderedOrder(["Arcane Signet", "Mana Crypt", "Sol Ring"]))
      .toEqual(["Mana Crypt", "Sol Ring", "Arcane Signet"]);
  });

  it("orders a type group the same way", () => {
    renderDecklist(rampRows, { grouping: "type", newestAsOf: NEWEST });

    expect(renderedOrder(["Arcane Signet", "Mana Crypt", "Sol Ring"]))
      .toEqual(["Mana Crypt", "Sol Ring", "Arcane Signet"]);
  });

  // The rows the feed has nothing for. A sold-out row keeps a stale figure and
  // a never-stocked row has none at all; neither is cheap, and both sort last.
  // The spent slot draws the undo receipt rather than a row, and the receipt has
  // no buy tag on it — so a dear card whose slot has just been spent shows no
  // figure while still carrying one. Ranked on its price it would sit at the top
  // of the group with nothing on it.
  it("ranks a spent slot as the figure-less row it draws", () => {
    const spent = buyable("crypt", "Mana Crypt", priced(18999), { role: "ramp" });
    renderDecklist([
      buyable("signet", "Arcane Signet", priced(85), { role: "ramp" }),
      buyable("sol", "Sol Ring", priced(3410), { role: "ramp" }),
    ], { spentSlot: spent, newestAsOf: NEWEST });

    // Dearest first among the rows that draw a figure, and the receipt after
    // the 85c row it would otherwise outrank by a hundredfold.
    const seen = [...document.querySelectorAll("*")]
      .filter((el) => el.children.length === 0)
      .map((el) => el.textContent?.trim() ?? "");
    const at = (needle: string) => seen.findIndex((t) => t.includes(needle));
    expect(at("Sol Ring")).toBeLessThan(at("Arcane Signet"));
    expect(at("Arcane Signet")).toBeLessThan(at("Mana Crypt"));
  });

  it("puts the rows with no live figure at the end of their group", () => {
    renderDecklist([
      buyable("soldout", "Zuran Orb", priced(9999, OLDER), { role: "ramp" }),
      buyable("nostock", "Lotus Petal", null, { role: "ramp" }),
      buyable("signet", "Arcane Signet", priced(85), { role: "ramp" }),
    ], { newestAsOf: NEWEST });

    expect(renderedOrder(["Zuran Orb", "Lotus Petal", "Arcane Signet"]))
      .toEqual(["Arcane Signet", "Lotus Petal", "Zuran Orb"]);
  });
});

describe("the grouping toggle reaches Shopping", () => {
  // The toggle's own pills sit above this list in both filters, so a Shopping
  // list that answered only to `role` left the reader pressing a control that
  // did nothing.
  const spokenFor = makeCard({
    oracleId: "cultivate",
    name: "Cultivate",
    role: "ramp",
    typeLine: "Sorcery",
    cardTypeGroup: "Sorceries",
    owned: true,
    // `over` from this deck's own vantage: a negative `free` is what makes an
    // owned card a shopping row (isSpokenFor).
    availability: { owned: 1, free: -1, hard: 1, soft: 0, claims: [] },
  });

  it("groups by card type when the reader asks for By type", () => {
    renderDecklist([rampOwned, rampUnowned, drawUnowned, spokenFor], { grouping: "type" });

    // The type groups these rows fall into, and no role heading.
    expect(screen.getByText("Artifacts")).toBeInTheDocument();
    expect(screen.getByText("Sorceries")).toBeInTheDocument();
    expect(screen.queryByText("Ramp")).not.toBeInTheDocument();
    expect(screen.queryByText("Draw")).not.toBeInTheDocument();
  });

  it("still lists the same cards, contested rows included, under By type", () => {
    renderDecklist([rampOwned, rampUnowned, drawUnowned, spokenFor], { grouping: "type" });

    expect(screen.getByText("Arcane Signet")).toBeInTheDocument();
    expect(screen.getByText("Mystic Remora")).toBeInTheDocument();
    // Spoken for: owned, and on the list because its copies are claimed.
    expect(screen.getByText("Cultivate")).toBeInTheDocument();
    // An owned, unclaimed card is not a shopping row under either grouping.
    expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument();
  });

  // The clause is role arithmetic — "closes 1→2" is a statement about a role's
  // target — so a type section carries none rather than one it cannot honour.
  it("draws no gap clause on a type section", () => {
    renderDecklist([rampOwned, rampUnowned], { grouping: "type" });

    expect(
      screen.queryByText(recommendationsCopy.shopping.groupGap("1", "1", "2")),
    ).not.toBeInTheDocument();
  });

  it("keeps the role list, Other and the pinned spoken-for group under By role", () => {
    renderDecklist([rampOwned, rampUnowned, spokenFor], { grouping: "role" });

    expect(screen.getByText("Ramp")).toBeInTheDocument();
    expect(
      screen.getByText(recommendationsCopy.shopping.spokenForGroupLabel),
    ).toBeInTheDocument();
    expect(screen.queryByText("Artifacts")).not.toBeInTheDocument();
  });
});

describe("the gap clause reads '{n} · closes {from}→{to}' against the deck's real counts", () => {
  it("counts only the owned cards as the 'from', not the ones being bought", () => {
    // owned ramp = 1 (Sol Ring), unowned ramp = 1 (Arcane Signet)
    // from = 1 — where the deck stands before the purchase
    // n = 1, so buying the group lands the deck on 2: "1 · closes 1→2"
    renderDecklist([rampOwned, rampUnowned]);

    expect(
      screen.getByText(recommendationsCopy.shopping.groupGap("1", "1", "2")),
    ).toBeInTheDocument();
    // The unowned card must not be credited to the deck's standing count.
    expect(
      screen.queryByText(recommendationsCopy.shopping.groupGap("1", "2", "3")),
    ).not.toBeInTheDocument();
  });

  // The clause promises where buying the group lands the deck, so it reads the
  // group. Against the role baseline it would draw arithmetic the list cannot
  // honour the moment the player adds unowned cards of their own — and past a
  // role they have already covered, a range that runs backwards.
  it("never promises the baseline when the group overshoots it", () => {
    const extras = Array.from({ length: ROLE_TARGETS.ramp + 2 }, (_, i) =>
      makeCard({ oracleId: `extra-${i}`, name: `Extra ${i}`, role: "ramp", owned: false, auto: false }),
    );
    renderDecklist([rampOwned, ...extras]);

    const n = ROLE_TARGETS.ramp + 2;
    expect(
      screen.getByText(recommendationsCopy.shopping.groupGap(String(n), "1", String(n + 1))),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        recommendationsCopy.shopping.groupGap(String(n), "1", String(ROLE_TARGETS.ramp)),
      ),
    ).not.toBeInTheDocument();
  });
});

// The modal's Prev/Next pages an ordered id list the Decklist hands it. Shopping
// renders role-grouped, so a list built from the deck's own order would walk a
// sequence the player is not looking at.
describe("the detail modal pages Shopping in the order the list draws", () => {
  const browseCard = (oracleId: string, name: string) => ({
    oracleId, name, typeLine: "Artifact", manaCost: "{2}", oracleText: null,
    keywords: [], rarity: "rare" as const, colorIdentity: [], imageUri: null,
    quantity: 0, printings: [], setCodes: [], primarySetCode: "abc",
    preferredPrinting: null,
  });

  it("puts a draw card after a ramp card even where the deck holds it first", async () => {
    // Deck order is draw then ramp; Shopping draws ramp first.
    renderDecklist([drawUnowned, rampUnowned], {
      fetchCard: async (id: string) =>
        browseCard(id, id === "mystic-remora" ? "Mystic Remora" : "Arcane Signet"),
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: cardDetailCopy.triggerAria("Mystic Remora") }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("2 of 2")).toBeInTheDocument();
    });
  });
});

describe("a basic land never appears in Shopping", () => {
  it("excludes cards with Basic in the typeLine from Shopping", () => {
    renderDecklist([basicLand, rampUnowned]);
    // Forest is a basic land — must not appear in Shopping even if unowned
    expect(screen.queryByText("Forest")).not.toBeInTheDocument();
    // The ramp card still shows
    expect(screen.getByText("Arcane Signet")).toBeInTheDocument();
  });

  it("excludes a basic land the classifier put in a shopping role", () => {
    // The `land` role is already outside SHOPPING_ROLE_ORDER, so the case above
    // would still pass with the typeLine guard deleted. This one reaches
    // Shopping on its role and can only be stopped by the guard itself.
    const basicInRampRole = makeCard({
      oracleId: "forest-ramp",
      name: "Forest",
      role: "ramp",
      typeLine: "Basic Land — Forest",
      cardTypeGroup: "Lands",
      owned: false,
    });
    renderDecklist([basicInRampRole, rampUnowned]);
    expect(screen.queryByText("Forest")).not.toBeInTheDocument();
    expect(screen.getByText("Arcane Signet")).toBeInTheDocument();
  });
});

describe("the footer takes the all-auto branch when every to-buy card is auto", () => {
  it("renders shopping.footer when all unowned cards are auto", () => {
    renderDecklist([rampOwned, rampUnowned]);
    // rampUnowned has auto=true — all to-buy are auto
    const footer = recommendationsCopy.shopping.footer("1", "1");
    expect(screen.getByText(footer)).toBeInTheDocument();
  });
});

describe("the footer takes the mixed branch otherwise", () => {
  it("renders shopping.footerMixed when some unowned cards are not auto", () => {
    // drawUnownedManual has auto=false
    renderDecklist([drawOwned, drawUnowned, drawUnownedManual]);
    const footer = recommendationsCopy.shopping.footerMixed("2", "1");
    expect(screen.getByText(footer)).toBeInTheDocument();
  });
});

describe("the empty-covered state renders when there is nothing to buy", () => {
  it("renders emptyCoveredHeading and emptyCoveredBody when all cards are owned and deck was filled", () => {
    // The compliment is gated on filled=true: a deck the player built by hand
    // that owns everything must not be congratulated on a fill that never ran.
    renderDecklist([rampOwned, drawOwned], { filled: true });
    expect(
      screen.getByText(recommendationsCopy.shopping.emptyCoveredHeading),
    ).toBeInTheDocument();
  });

  it("renders the empty covered body with the open slot count when filled", () => {
    renderDecklist([rampOwned, drawOwned], { filled: true });
    // open = 99 - built(2) = 97
    expect(
      screen.getByText(recommendationsCopy.shopping.emptyCoveredBody("97")),
    ).toBeInTheDocument();
  });

  it("renders emptyUncovered (not the compliment) when the deck was never filled", () => {
    // filled defaults to false in renderDecklist
    renderDecklist([rampOwned, drawOwned]);
    expect(
      screen.getByText(recommendationsCopy.shopping.emptyUncovered),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(recommendationsCopy.shopping.emptyCoveredHeading),
    ).not.toBeInTheDocument();
  });
});

describe("the phone Shopping row is 52px and prints the EDHREC figure on its meta line", () => {
  it("renders the EDHREC figure when shoppingFigure is provided", () => {
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <AddOptimisticCardProvider value={{
          add: vi.fn(), remove: vi.fn(), markSpent: vi.fn(),
          announceUndo: vi.fn(), reportRemoveFailure: vi.fn(),
          resolveRow: vi.fn(), deleteRow: vi.fn(), keep: vi.fn(),
        }}>
          <DecklistRow deckId="d1" card={rampUnowned} shoppingFigure={42} />
        </AddOptimisticCardProvider>
      </CardDetailProvider>,
    );

    expect(screen.getByText(recommendationsCopy.shopping.rowFigure("42"))).toBeInTheDocument();
  });

  it("phone Shopping row has min-h-[52px] class when shoppingFigure is provided", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <AddOptimisticCardProvider value={{
          add: vi.fn(), remove: vi.fn(), markSpent: vi.fn(),
          announceUndo: vi.fn(), reportRemoveFailure: vi.fn(),
          resolveRow: vi.fn(), deleteRow: vi.fn(), keep: vi.fn(),
        }}>
          <DecklistRow deckId="d1" card={rampUnowned} shoppingFigure={42} />
        </AddOptimisticCardProvider>
      </CardDetailProvider>,
    );

    // The row shell should have 52px phone min-height
    const rowShell = container.querySelector(".min-h-\\[52px\\]");
    expect(rowShell).toBeInTheDocument();
  });

  // Addendum C5 puts the count inline after the name. A Shopping row's figure
  // sits on its own line on phone, so a count rendered after the whole name
  // block would land beside the figure instead of beside the name.
  it("keeps a multi-copy count beside the name, not the figure", () => {
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <AddOptimisticCardProvider value={{
          add: vi.fn(), remove: vi.fn(), markSpent: vi.fn(),
          announceUndo: vi.fn(), reportRemoveFailure: vi.fn(),
          resolveRow: vi.fn(), deleteRow: vi.fn(), keep: vi.fn(),
        }}>
          <DecklistRow deckId="d1" card={{ ...rampUnowned, quantity: 4 }} shoppingFigure={42} />
        </AddOptimisticCardProvider>
      </CardDetailProvider>,
    );

    const count = screen.getByText("×4");
    const name = screen.getByRole("button", { name: cardDetailCopy.triggerAria(rampUnowned.name) });
    expect(count.parentElement).toBe(name.parentElement);
    expect(count).toHaveAttribute("aria-hidden");
  });
});

describe("the phone All row stays 44px and prints no figure", () => {
  it("has min-h-[44px] and no EDHREC figure when no shoppingFigure is passed", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <AddOptimisticCardProvider value={{
          add: vi.fn(), remove: vi.fn(), markSpent: vi.fn(),
          announceUndo: vi.fn(), reportRemoveFailure: vi.fn(),
          resolveRow: vi.fn(), deleteRow: vi.fn(), keep: vi.fn(),
        }}>
          <DecklistRow deckId="d1" card={rampUnowned} />
        </AddOptimisticCardProvider>
      </CardDetailProvider>,
    );

    const rowShell = container.querySelector(".min-h-\\[44px\\]");
    expect(rowShell).toBeInTheDocument();

    // No figure text rendered
    expect(screen.queryByText(/edhrec/i)).not.toBeInTheDocument();
  });
});

describe("Shopping row figure rendering differs by width", () => {
  it("phone renders rowNoFigure sentence, desktop renders em dash, when no figure in map", () => {
    // The two widths differ deliberately: the sentence has enough space on a
    // dedicated meta line (phone); an em dash reads fine inline (desktop).
    renderDecklist([rampOwned, rampUnowned], { shoppingFigures: {} });

    // Phone sentence is in the DOM (the phone div is not JS-hidden, only CSS-hidden)
    expect(screen.getByText(recommendationsCopy.shopping.rowNoFigure)).toBeInTheDocument();
    // Desktop em dash is also in the DOM (CSS-hidden on phone)
    expect(screen.getByText(recommendationsCopy.shopping.rowNoFigureDesktop)).toBeInTheDocument();
  });

  // An outage says nothing about any one card, so the row prints nothing rather
  // than an absence it cannot vouch for. The degraded banner explains the gap.
  it("prints no figure line at all when EDHREC was unreachable", () => {
    renderDecklist([rampOwned, rampUnowned], { shoppingFigures: null });

    expect(screen.queryByText(recommendationsCopy.shopping.rowNoFigure)).not.toBeInTheDocument();
    expect(
      screen.queryByText(recommendationsCopy.shopping.rowNoFigureDesktop),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/edhrec/i)).not.toBeInTheDocument();
  });

  it("renders rowFigure (phone) and rowFigureDesktop (desktop) when figure present", () => {
    renderDecklist([rampOwned, rampUnowned], {
      shoppingFigures: { "arcane-signet": 67 },
    });

    expect(screen.getByText(recommendationsCopy.shopping.rowFigure("67"))).toBeInTheDocument();
    expect(screen.getByText(recommendationsCopy.shopping.rowFigureDesktop("67"))).toBeInTheDocument();
    expect(screen.queryByText(recommendationsCopy.shopping.rowNoFigure)).not.toBeInTheDocument();
  });
});

// ── Amendment 5 (#281) — a card you own but cannot spare ─────────────────────
// The whole amendment rests on one claim: a deck with no contested card renders
// exactly what it renders today. Everything else is additive.

/** Owned, and every copy already sleeved into a finished list elsewhere.
 *  `free < 0` is what `availabilityState(..., { selfExcluded: true })` reads as
 *  `over`; it is NOT recomputable from `owned - hard` on a deck's own list. */
function spokenForCard(overrides: Partial<DeckDetailCard> & { oracleId: string; name: string }) {
  return makeCard({
    owned: true,
    availability: { owned: 1, hard: 2, soft: 0, free: -1, claims: [{ id: "d2", name: "Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: true }] },
    ...overrides,
  });
}

/** Owned with a spare copy — free > 0 reads `free`, so this stays off Shopping. */
const rampOwnedSpare = makeCard({
  oracleId: "mana-crypt",
  name: "Mana Crypt",
  role: "ramp",
  owned: true,
  availability: { owned: 3, hard: 1, soft: 0, free: 2, claims: [] },
});

const rampSpokenFor = spokenForCard({ oracleId: "smothering-tithe", name: "Smothering Tithe", role: "ramp" });
const drawSpokenFor = spokenForCard({ oracleId: "esper-sentinel", name: "Esper Sentinel", role: "draw" });

describe("Shopping's predicate: unowned, or owned and over-committed", () => {
  it("lists an owned card whose every copy is spoken for elsewhere", () => {
    renderDecklist([rampOwned, rampSpokenFor]);

    expect(screen.getByText("Smothering Tithe")).toBeInTheDocument();
    // An owned card with no availability read is untouched by the amendment.
    expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument();
  });

  it("leaves an owned card with a spare copy off the list", () => {
    renderDecklist([rampOwnedSpare, rampUnowned]);

    expect(screen.queryByText("Mana Crypt")).not.toBeInTheDocument();
    expect(screen.getByText("Arcane Signet")).toBeInTheDocument();
  });

  it("never lists a basic land, contested or not", () => {
    const contestedBasic = makeCard({
      ...basicLand,
      owned: true,
      availability: { owned: 1, hard: 2, soft: 0, free: -1, claims: [] },
    });
    renderDecklist([contestedBasic, rampUnowned]);

    expect(screen.queryByText("Forest")).not.toBeInTheDocument();
  });

  // `availabilityState`'s first guard is `owned <= 0 -> free`, so an unowned
  // card can never read `over`. The two halves of the list are disjoint by
  // construction, and a card is counted once.
  it("counts a card in exactly one half of the split", () => {
    renderDecklist([rampUnowned, rampSpokenFor, drawSpokenFor]);

    expect(
      screen.getByText(recommendationsCopy.shopping.introSplit("3", "1", "2")),
    ).toBeInTheDocument();
  });

  it("pins the spoken-for group after the role groups, with no gap arithmetic", () => {
    renderDecklist([rampUnowned, rampSpokenFor]);

    expect(
      screen.getByText(recommendationsCopy.shopping.spokenForGroupLabel),
    ).toBeInTheDocument();
    expect(
      screen.getByText(recommendationsCopy.shopping.spokenForGroupClause("1")),
    ).toBeInTheDocument();
  });

  it("speaks only of second copies when nothing on the list is unowned", () => {
    renderDecklist([rampOwned, rampSpokenFor, drawSpokenFor]);

    expect(
      screen.getByText(recommendationsCopy.shopping.introOnlySpokenFor("2")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(recommendationsCopy.shopping.footerOnlySpokenFor("2")),
    ).toBeInTheDocument();
  });

  // With EDHREC unreachable every figure is `undefined`, which is also the All
  // view's value. A row that read the view off the figure would drop the plate
  // from the one kind of row whose presence on this list is not self-evident:
  // the player owns the card, so without the plate the row looks like a mistake.
  it("still marks a second copy when EDHREC is unreachable", () => {
    renderDecklist([rampUnowned, rampSpokenFor], { shoppingFigures: null });

    expect(
      screen.getByText(recommendationsCopy.shopping.rowSecondCopyTagAria),
    ).toBeInTheDocument();
  });

  // The plate says `buy` on a contested row, the same as on an unowned one: the
  // heading above it and the marker beside it already say which kind of row it
  // is, and `2nd copy` said it a third time. Only the spoken form still
  // distinguishes them, which the test above covers.
  it("draws the same word on a contested row as on an unowned one", () => {
    renderDecklist([rampUnowned, rampSpokenFor]);

    expect(screen.queryByText(/2nd copy/)).not.toBeInTheDocument();
    // Two ROWS carry the word. The third occurrence in the DOM is the mark key's
    // sample, which is the same component drawn as a legend and is `aria-hidden`
    // for exactly that reason — so the count is taken over the rows rather than
    // over the whole render.
    const key = screen.queryByRole("group", { name: proxyCopy.key.regionAria });
    const rows = screen.getAllByText(addPanelCopy.unowned.tag)
      .filter((el) => !key || !key.contains(el));
    expect(rows).toHaveLength(2);
  });

  // Count-only is the list's own ruling, not a side effect of having a figure to
  // sit beside. A claiming deck's name surfacing only during an EDHREC outage
  // would make the ruling look like a rendering accident.
  it.each([
    ["with figures", { "smothering-tithe": 42 }],
    ["with EDHREC unreachable", null],
  ] as const)("never names the claiming deck on a row, %s", (_label, shoppingFigures) => {
    renderDecklist([rampUnowned, rampSpokenFor], { shoppingFigures });

    expect(screen.queryByText(/Atraxa/)).not.toBeInTheDocument();
  });
});

// The regression the amendment's safety rests on. Not "an equivalent sentence"
// — the shipped strings, unchanged, whenever no card is contested.
describe("A deck with nothing contested renders today's Shopping list", () => {
  it("keeps the shipped intro and footer byte-for-byte", () => {
    renderDecklist([rampOwned, rampUnowned, drawUnowned]);

    expect(screen.getByText(recommendationsCopy.shopping.intro("2"))).toBeInTheDocument();
    expect(
      screen.queryByText(recommendationsCopy.shopping.spokenForGroupLabel),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(recommendationsCopy.shopping.rowSecondCopyTagAria),
    ).not.toBeInTheDocument();

    // Not merely "no split sentence": no string this amendment introduced.
    expect(
      screen.queryByText(recommendationsCopy.shopping.introSplit("2", "2", "0")),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(recommendationsCopy.shopping.introOnlySpokenFor("0")),
    ).not.toBeInTheDocument();
  });

  it("leaves the role group's gap arithmetic untouched by a contested card", () => {
    renderDecklist([rampOwned, rampUnowned, rampSpokenFor]);

    // Two owned ramp cards are the baseline and the one unowned card is the
    // gap, so `Ramp` closes 2→3 — exactly what it drew before the contested
    // card was listed. `from` already counts that card, because it is an owned
    // card in this deck; pinning it to its own group is what stops `n` from
    // counting it a second time and over-shooting `to`.
    expect(
      screen.getByText(recommendationsCopy.shopping.groupGap("1", "2", "3")),
    ).toBeInTheDocument();
  });
});

describe("Removing a card from Shopping leaves its undo row in place", () => {
  it("keeps a spoken-for row mounted after its slot is spent", () => {
    // A spoken-for card is owned, so the pre-amendment `!spentSlot.owned` test
    // would have dropped it from the list outright and taken the only undo
    // affordance with it. #185 exists to stop exactly that.
    renderDecklist([rampUnowned, drawSpokenFor], { spentSlot: rampSpokenFor });

    expect(
      screen.getByText(addPanelCopy.undo.removed(rampSpokenFor.name)),
    ).toBeInTheDocument();
  });

  it("counts the deck as it now stands, not as the undo row makes it look", () => {
    renderDecklist([rampOwned, rampUnowned, drawSpokenFor], {
      spentSlot: rampSpokenFor,
    });

    // One unowned card and one spoken-for card remain on the list. The spent row
    // is drawn among them but is out of the deck already, so every figure on the
    // surface has to read as though it were gone — including `Spoken for`'s own
    // clause, which the row drawn inside it would otherwise inflate to two.
    expect(
      screen.getByText(recommendationsCopy.shopping.introSplit("2", "1", "1")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(recommendationsCopy.shopping.spokenForGroupClause("1")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(recommendationsCopy.shopping.groupGap("1", "1", "2")),
    ).toBeInTheDocument();
  });

  it("holds the list open when the spent card was the last thing to buy", () => {
    renderDecklist([], { spentSlot: rampUnowned, filled: true });

    expect(
      screen.getByText(addPanelCopy.undo.removed(rampUnowned.name)),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(recommendationsCopy.shopping.emptyCoveredHeading),
    ).not.toBeInTheDocument();
  });
});

// Both pending notes promise a visual mapping: the caption says the brass rule
// marks the changed rows, and the group note says how many of a heading's rows the
// draft changed. Only `decklist-row.tsx` draws that rule — `DeckCardTile` carries
// no pending mark at all — so in card view each sentence would point at a marker
// the reader cannot find. `toolbarNote` states a count and no marker, so it
// stays in both views; the test below holds that distinction in place.
describe("the pending-change notes are the row view's, because the mark is", () => {
  const pendingChanges = new Map([["sol-ring", { from: 0, to: 1 }]]);

  it("captions the list and heads the group in list view", () => {
    renderDecklist([rampOwned, drawOwned], { filter: "all", pendingChanges });

    expect(
      screen.getByText(deckVersioningCopy.pending.changeListCaption(1)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(deckVersioningCopy.pending.groupChangeNote(1)),
    ).toBeInTheDocument();
  });

  // Shopping's rows are the same `DecklistRow`, so they carry the same brass
  // rule and need the same sentence. The figure is the marks on screen, not the
  // whole draft: this list is a subset, and a caption counting rows the reader
  // cannot see would be a caption about nothing.
  it("captions Shopping over the marked rows it actually shows", () => {
    renderDecklist([rampUnowned, drawUnowned], {
      filter: "shopping",
      pendingChanges: new Map([
        [rampUnowned.oracleId, { from: 0, to: 1 }],
        // In the draft, not in this list — an owned add is nothing to buy.
        ["sol-ring", { from: 0, to: 1 }],
      ]),
    });

    expect(
      screen.getByText(deckVersioningCopy.pending.changeListCaption(1)),
    ).toBeInTheDocument();
  });

  it("says nothing in Shopping when none of its rows is a changed one", () => {
    renderDecklist([rampUnowned, drawUnowned], {
      filter: "shopping",
      pendingChanges: new Map([["sol-ring", { from: 0, to: 1 }]]),
    });

    expect(
      screen.queryByText(deckVersioningCopy.pending.changeListCaption(1)),
    ).not.toBeInTheDocument();
  });

  // A spent slot draws the undo receipt instead of the row, and the receipt
  // carries no brass rule — so its change is real in the draft and invisible in
  // the list. Counting it would promise a mark the reader can hunt for and never
  // find, in the one moment the list is already mid-edit.
  it("leaves a spent slot's change out of both figures", () => {
    renderDecklist([drawOwned], {
      filter: "all",
      spentSlot: rampOwned,
      pendingChanges: new Map([
        [drawOwned.oracleId, { from: 0, to: 1 }],
        [rampOwned.oracleId, { from: 1, to: 0 }],
      ]),
    });

    expect(
      screen.getByText(deckVersioningCopy.pending.changeListCaption(1)),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(deckVersioningCopy.pending.changeListCaption(2)),
    ).not.toBeInTheDocument();
    // The spent card's own group heading — Ramp holds nothing else here, so a
    // note there would be a note over a group with no marked row in it.
    expect(
      screen.queryByText(deckVersioningCopy.pending.groupChangeNote(1)),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(deckVersioningCopy.pending.groupChangeNote(2)),
    ).not.toBeInTheDocument();
  });

  it("says neither in card view, where no tile draws the rule", () => {
    renderDecklist([rampOwned, drawOwned], { filter: "all", pendingChanges });

    fireEvent.click(
      screen.getAllByRole("button", { name: viewToggleCopy.deck.card })[0],
    );

    expect(
      screen.queryByText(deckVersioningCopy.pending.changeListCaption(1)),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(deckVersioningCopy.pending.groupChangeNote(1)),
    ).not.toBeInTheDocument();
  });
});

// ── The view is a reading preference, and it keeps ────────────────────────────
//
// It used to reset to list on every mount, so a player who reads decks as cards
// re-chose cards each time they opened one. localStorage rather than the URL:
// a deck link that carried a view would hand the recipient this reader's habit.
describe("view preference", () => {
  const cardSegment = () => screen.getAllByRole("button", { name: viewToggleCopy.deck.card })[0];
  const listSegment = () => screen.getAllByRole("button", { name: viewToggleCopy.deck.list })[0];

  it("opens in list view when this browser has never chosen", () => {
    renderDecklist([rampOwned], { filter: "all" });
    expect(listSegment()).toHaveAttribute("aria-pressed", "true");
  });

  it("opens in the view the last visit chose", () => {
    renderDecklist([rampOwned], { filter: "all" });
    fireEvent.click(cardSegment());
    expect(cardSegment()).toHaveAttribute("aria-pressed", "true");
    cleanup();

    renderDecklist([rampOwned], { filter: "all" });
    expect(cardSegment()).toHaveAttribute("aria-pressed", "true");
  });

  it("forgets it again when the reader goes back to list", () => {
    renderDecklist([rampOwned], { filter: "all" });
    fireEvent.click(cardSegment());
    fireEvent.click(listSegment());
    cleanup();

    renderDecklist([rampOwned], { filter: "all" });
    expect(listSegment()).toHaveAttribute("aria-pressed", "true");
  });
});

// The sort control, mounted in the list's toolbar. `FilterPanel` in
// single-select, the same component `/collection`'s Sort ▾ is.
describe("the deck list's sort control", () => {
  const NEWEST = new Date("2026-09-01T09:00:00.000Z");
  const priced = (cents: number) => ({
    cents, foilCents: null, etchedCents: null, asOf: NEWEST,
  });
  const unowned = (oracleId: string, name: string, over: object = {}) =>
    makeCard({ oracleId, name, owned: false, auto: false, ...over } as never);

  const openPanel = () => {
    fireEvent.click(screen.getByRole("button", { name: /Sort the deck list/ }));
    return screen.getByRole("dialog");
  };

  const rows = [
    unowned("crypt", "Mana Crypt", { price: priced(18999), cmc: 0, role: "ramp" }),
    unowned("signet", "Arcane Signet", { price: priced(85), cmc: 2, role: "ramp" }),
    unowned("sol", "Sol Ring", { price: priced(3410), cmc: 1, role: "ramp" }),
  ];

  const renderedOrder = (wanted: string[]) => {
    const text = [...document.querySelectorAll("*")]
      .filter((el) => el.children.length === 0)
      .map((el) => el.textContent?.trim() ?? "");
    return wanted
      .map((name) => ({ name, at: text.findIndex((t) => t === name) }))
      .sort((a, b) => a.at - b.at)
      .map((r) => r.name);
  };

  // The one departure from `/collection`'s block: no `Sort:` prefix. It costs
  // 38px, which is the view well's place on the phone's arrangement line.
  it("reads the whole order with no prefix", () => {
    renderDecklist(rows, { newestAsOf: NEWEST });
    expect(screen.getByRole("button", { name: /Sort the deck list/ }).textContent)
      .toContain("Price · Highest");
    expect(screen.getByRole("button", { name: /Sort the deck list/ }).textContent)
      .not.toContain("Sort:");
  });

  it("offers three orders under Shopping and two under All", () => {
    renderDecklist(rows, { newestAsOf: NEWEST });
    openPanel();
    expect(screen.getAllByRole("option")).toHaveLength(3);
    cleanup();

    renderDecklist(rows, { filter: "all", newestAsOf: NEWEST });
    openPanel();
    const options = screen.getAllByRole("option").map((o) => o.textContent ?? "");
    expect(options).toHaveLength(2);
    expect(options.join(" ")).not.toContain("Price");
  });

  it("re-orders the rows when a key is picked", () => {
    renderDecklist(rows, { newestAsOf: NEWEST });
    // Shopping opens on Price · Highest, which #629 shipped.
    expect(renderedOrder(["Mana Crypt", "Sol Ring", "Arcane Signet"]))
      .toEqual(["Mana Crypt", "Sol Ring", "Arcane Signet"]);

    openPanel();
    fireEvent.click(screen.getByRole("option", { name: /^Name/ }));
    expect(renderedOrder(["Mana Crypt", "Sol Ring", "Arcane Signet"]))
      .toEqual(["Arcane Signet", "Mana Crypt", "Sol Ring"]);
  });

  // The re-pick IS the direction control. Nothing else on screen offers one.
  it("reverses the order when the chosen key is picked again", () => {
    renderDecklist(rows, { newestAsOf: NEWEST });
    openPanel();
    fireEvent.click(screen.getByRole("option", { name: /^Name/ }));
    openPanel();
    fireEvent.click(screen.getByRole("option", { name: /^Name/ }));

    expect(screen.getByRole("button", { name: /Sort the deck list/ }).textContent)
      .toContain("Name · Z–A");
    expect(renderedOrder(["Mana Crypt", "Sol Ring", "Arcane Signet"]))
      .toEqual(["Sol Ring", "Mana Crypt", "Arcane Signet"]);
  });

  it("sorts by mana value up the curve", () => {
    renderDecklist(rows, { newestAsOf: NEWEST });
    openPanel();
    fireEvent.click(screen.getByRole("option", { name: /^Mana value/ }));
    expect(renderedOrder(["Mana Crypt", "Sol Ring", "Arcane Signet"]))
      .toEqual(["Mana Crypt", "Sol Ring", "Arcane Signet"]);

    openPanel();
    fireEvent.click(screen.getByRole("option", { name: /^Mana value/ }));
    expect(renderedOrder(["Mana Crypt", "Sol Ring", "Arcane Signet"]))
      .toEqual(["Arcane Signet", "Sol Ring", "Mana Crypt"]);
  });

  it("announces the order it moved to", () => {
    const onAnnounce = vi.fn();
    renderDecklist(rows, { newestAsOf: NEWEST, onAnnounce });
    openPanel();
    fireEvent.click(screen.getByRole("option", { name: /^Name/ }));
    expect(onAnnounce).toHaveBeenCalledWith("Sorted by Name · A–Z.");
  });

  // This bar says selection with the bone-on-elevated skin, never a coloured
  // ground — and the panel's borrowed `selected.length > 0` branch broke that
  // on arrival, because single-select always has one row chosen.
  it("draws no accent border on the resting trigger", () => {
    renderDecklist(rows, { newestAsOf: NEWEST });
    expect(screen.getByRole("button", { name: /Sort the deck list/ }).className)
      .not.toContain("border-[color:var(--accent)]");
  });
});
