import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { gotItCopy } from "../../../lib/copy/i-got-it";

const { loadPrintingChoices, markBoughtForDecks } = vi.hoisted(() => ({
  loadPrintingChoices: vi.fn(),
  markBoughtForDecks: vi.fn(),
}));
vi.mock("../../../app/collection/edit-actions", () => ({ loadPrintingChoices }));
vi.mock("../../../app/decks/mark-bought-actions", () => ({ markBoughtForDecks, readCartChooser: vi.fn(async () => null), markBought: vi.fn() }));
vi.mock("../../../app/decks/assignment-actions", () => ({ assignCopy: vi.fn() }));
vi.mock("../../../app/collection/history-actions", () => ({ previewRevert: vi.fn(), revertCollectionEntry: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { CartView } = await import("./cart-view");
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { exportLinkOutCopy } from "../../../lib/copy/decks-builder";
import { priceCopy } from "../../../lib/copy/price";
import type { CartPayload } from "../../../lib/decks/cart";

vi.mock("next/link", () => ({
  useLinkStatus: () => ({ pending: false }),
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const NOW = "2026-10-11T00:00:00.000Z";
const provenance = { behind: false, when: "Saturday" };

// The Sol Ring case on three brews, plus Omnath (committed) with its unowned commander.
function cart(over: Partial<CartPayload> = {}): CartPayload {
  return {
    totalDecks: 21,
    priced: true,
    newestAsOf: NOW,
    decks: [
      { id: "gishath", name: "HD - Gishath", brew: true, copies: 2, cents: 180, pricedCopies: 2 },
      { id: "omnath", name: "HD - Omnath", brew: false, copies: 1, cents: 400, pricedCopies: 1 },
      { id: "kratos", name: "HD - Kratos", brew: true, copies: 1, cents: 150, pricedCopies: 1 },
    ],
    lines: [
      { oracleId: "omn", name: "Omnath, Locus of All", commander: true, owned: 0, heldElsewhere: 0,
        rows: [{ deckId: "omnath", quantity: 1, cents: 400, state: "priced", commander: true, held: 0, finish: null }] },
      { oracleId: "sol", name: "Sol Ring", commander: false, owned: 17, heldElsewhere: 17,
        rows: [
          { deckId: "gishath", quantity: 1, cents: 150, state: "priced", commander: false, held: 0, finish: null },
          { deckId: "kratos", quantity: 1, cents: 150, state: "priced", commander: false, held: 0, finish: null },
        ] },
      { oracleId: "tower", name: "Command Tower", commander: false, owned: 0, heldElsewhere: 0,
        rows: [{ deckId: "gishath", quantity: 1, cents: 30, state: "priced", commander: false, held: 0, finish: null }] },
    ],
    ...over,
  };
}

const list = () => within(screen.getByRole("region", { name: copy.list.regionAria }));

describe("CartView", () => {
  it("starts with every deck selected and the whole cart (A2)", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    expect(screen.getByRole("heading", { level: 1, name: copy.title })).toBeTruthy();
    expect(screen.getByText(`${copy.page.sub(3, 21)} · ${copy.page.brews}`)).toBeTruthy();
    expect(screen.getByText("$7.30")).toBeTruthy();
    expect(screen.getByText(copy.checkout.copiesLine(4, 3))).toBeTruthy();
    expect(screen.getByText(copy.checkout.sends(3))).toBeTruthy();
    expect(screen.getByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) })).toBeTruthy();
    expect(screen.getAllByText(copy.selections.unselectAll).length).toBeGreaterThan(0);
  });

  it("leads with the commander, then the line most decks need, with full deck names", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    const items = list().getAllByRole("listitem");
    expect(items.map((li) => li.textContent?.split(" ")[0])).toEqual(["Omnath,", "Sol", "Command"]);
    expect(within(items[1]).getByText(copy.list.decks(2, ["HD - Gishath", "HD - Kratos"]))).toBeTruthy();
    expect(within(items[1]).getByText(copy.list.owned(17))).toBeTruthy();
    expect(within(items[2]).queryByText(/you own/)).toBeNull();
  });

  it("reads the cart again when a deck is unselected, and writes nothing (A3)", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    fireEvent.click(screen.getByRole("checkbox", { name: copy.selections.aria("HD - Gishath", true) }));
    const items = list().getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[1]).getByText(copy.list.decks(1, ["HD - Kratos"]))).toBeTruthy();
    expect(screen.getByText("$5.50")).toBeTruthy();
    expect(screen.getByText(copy.checkout.copiesLine(2, 2))).toBeTruthy();
    expect(screen.getAllByText(copy.selections.selectAll).length).toBeGreaterThan(0);
  });

  it("holds the way back when every deck is unselected, with no figure and no link (A4)", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    fireEvent.click(screen.getAllByText(copy.selections.unselectAll)[0]);
    expect(screen.getByText(copy.none.title)).toBeTruthy();
    expect(screen.getByText(copy.checkout.noneSelected)).toBeTruthy();
    expect(screen.queryByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: copy.none.action(3) }));
    expect(screen.getByText(copy.checkout.copiesLine(4, 3))).toBeTruthy();
  });

  it("keeps its rows and its link when the prices could not be read (T2)", () => {
    const unpriced = cart({
      priced: false,
      newestAsOf: null,
      decks: cart().decks.map((d) => ({ ...d, cents: 0, pricedCopies: 0 })),
      lines: cart().lines.map((l) => ({ ...l, rows: l.rows.map((r) => ({ ...r, cents: null, state: null })) })),
    });
    render(<CartView cart={unpriced} provenance={null} />);
    expect(screen.queryByText(/\$\d/)).toBeNull();
    expect(screen.getByText(copy.checkout.unread)).toBeTruthy();
    expect(screen.getByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) })).toBeTruthy();
    expect(list().getAllByRole("listitem")).toHaveLength(3);
  });

  it("draws a deck priced at $0.00 as the tile does, with no figure", () => {
    const free = cart();
    free.decks[0] = { ...free.decks[0], cents: 0, pricedCopies: free.decks[0].copies };
    render(<CartView cart={free} provenance={provenance} />);
    expect(screen.getByText(copy.selections.figureNoPrice(free.decks[0].copies))).toBeTruthy();
    expect(screen.queryByText(copy.selections.figure(free.decks[0].copies, "$0.00"))).toBeNull();
  });

  it("says how many copies a sold-out line leaves unpriced (T1)", () => {
    const soldOut = cart();
    soldOut.lines[2].rows = [{ deckId: "gishath", quantity: 1, cents: null, state: "soldOut", commander: false, held: 0, finish: null }];
    soldOut.decks[0] = { ...soldOut.decks[0], cents: 150, pricedCopies: 1 };
    render(<CartView cart={soldOut} provenance={provenance} />);
    expect(screen.getByText(priceCopy.strip.pricedClause(3, 4))).toBeTruthy();
  });

  it("never calls a line sold out while a copy on it is live at $0.00, and draws no $0.00", () => {
    const zero = cart();
    zero.lines[1].rows = [
      { deckId: "gishath", quantity: 1, cents: 0, state: "priced", commander: false, held: 0, finish: null },
      { deckId: "kratos", quantity: 1, cents: null, state: "soldOut", commander: false, held: 0, finish: null },
    ];
    render(<CartView cart={zero} provenance={provenance} />);
    const sol = list().getAllByRole("listitem").find((li) => li.textContent?.includes("Sol Ring"))!;
    expect(sol.textContent).not.toMatch(/sold out/i);
    expect(sol.textContent).not.toContain("$0.00");
  });

  it("says ManaPool priced a cart whose live copies sum to $0.00, and draws no figure", () => {
    const zero = cart();
    zero.lines = zero.lines.map((l) => ({ ...l, rows: l.rows.map((r) => ({ ...r, cents: 0 })) }));
    zero.decks = zero.decks.map((d) => ({ ...d, cents: 0, pricedCopies: d.copies }));
    render(<CartView cart={zero} provenance={provenance} />);
    expect(screen.queryByText(/\$0\.00/)).toBeNull();
    expect(screen.queryByText(new RegExp(priceCopy.strip.provenanceUnpriced))).toBeNull();
    expect(screen.getByText(new RegExp(priceCopy.strip.provenance))).toBeTruthy();
  });

  it("tags a line whose every priced copy is foil-only as a foil figure, as the deck's own row does", () => {
    const foil = cart();
    foil.lines[2].rows = [{ deckId: "gishath", quantity: 1, cents: 90, state: "foilOnly", commander: false, held: 0, finish: "foil" }];
    render(<CartView cart={foil} provenance={provenance} />);
    const tower = list().getAllByRole("listitem").find((li) => li.textContent?.includes("Command Tower"))!;
    expect(tower.textContent).toMatch(/\$0\.90.*foil/);
  });

  it("tags an etched-only line as etched, and a foil and etched mix with no qualifier", () => {
    const etched = cart();
    etched.lines[1].rows = [
      { deckId: "gishath", quantity: 1, cents: 200, state: "foilOnly", commander: false, held: 0, finish: "etched" },
      { deckId: "kratos", quantity: 1, cents: 200, state: "foilOnly", commander: false, held: 0, finish: "etched" },
    ];
    const { unmount } = render(<CartView cart={etched} provenance={provenance} />);
    const sol = () => list().getAllByRole("listitem").find((li) => li.textContent?.includes("Sol Ring"))!;
    expect(sol().textContent).toMatch(/etched/);
    expect(sol().textContent).not.toMatch(/foil/);
    unmount();
    etched.lines[1].rows[1] = { ...etched.lines[1].rows[1], finish: "foil" };
    render(<CartView cart={etched} provenance={provenance} />);
    expect(sol().textContent).not.toMatch(/foil|etched/);
  });

  it("has nothing to select between with one deck (E1)", () => {
    const one = cart({ decks: [cart().decks[1]], lines: [cart().lines[0]] });
    render(<CartView cart={one} provenance={provenance} />);
    expect(screen.queryByText(copy.selections.unselectAll)).toBeNull();
    expect(screen.getByText(copy.page.sub(1, 21))).toBeTruthy();
  });

  it("draws the empty state when no deck is missing a card (E3)", () => {
    render(<CartView cart={cart({ decks: [], lines: [] })} provenance={provenance} />);
    expect(screen.getByText(copy.empty.title)).toBeTruthy();
    expect(screen.getByText(copy.page.subNone(21))).toBeTruthy();
    expect(screen.getByText(copy.empty.body(21))).toBeTruthy();
    expect(screen.getByRole("link", { name: copy.empty.back }).getAttribute("href")).toBe("/decks");
  });

  it("splits a cart too long for one link into named parts (K3)", () => {
    const long = (id: string) => ({
      oracleId: id, name: `${id} ${"x".repeat(13_000)}`, commander: false, owned: 0, heldElsewhere: 0,
      rows: [{ deckId: "omnath", quantity: 1, cents: 100, state: "priced" as const, commander: false, held: 0, finish: null }],
    });
    render(<CartView cart={cart({ lines: [long("a"), long("b"), long("c")] })} provenance={provenance} />);
    const links = screen.getAllByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) });
    expect(links.length).toBeGreaterThan(1);
    expect(links[0].textContent).toContain(copy.checkout.part(1, links.length, 1));
  });
});

describe("CartView by deck (A5)", () => {
  it("switches to one group per deck, largest first, every group folded", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    fireEvent.click(screen.getByRole("button", { name: copy.view.byDeck }));
    expect(screen.getByRole("button", { name: copy.view.byDeck }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(copy.list.headByDeck(3, 4))).toBeTruthy();
    const groups = screen.getAllByRole("region", { name: /HD - / });
    expect(groups.map((g) => g.getAttribute("aria-labelledby") && g.textContent?.match(/HD - [A-Za-z]+/)?.[0])).toEqual(["HD - Gishath", "HD - Omnath", "HD - Kratos"]);
    expect(screen.queryByText("Sol Ring")).toBeNull();
  });

  it("opens the ?deck= group on arrival, its cards at that deck's own figure, with the others named", () => {
    render(<CartView cart={cart()} provenance={provenance} initialView="deck" focusDeckId="gishath" />);
    expect(screen.getByText("Sol Ring")).toBeTruthy();
    expect(screen.getByText(copy.list.also(["HD - Kratos"]))).toBeTruthy();
    expect(screen.getByText("Command Tower")).toBeTruthy();
    // Kratos's group stays folded.
    expect(screen.getAllByText("Sol Ring")).toHaveLength(1);
  });

  it("counts another line deck's copies as elsewhere, from the open deck's vantage", () => {
    // Kratos holds 3 Rats and buys 2 more; Gishath holds none. All 3 owned are in another deck.
    const rats = cart();
    rats.lines[1] = {
      oracleId: "rats", name: "Relentless Rats", commander: false, owned: 3, heldElsewhere: 0,
      rows: [
        { deckId: "gishath", quantity: 1, cents: 50, state: "priced", commander: false, held: 0, finish: null },
        { deckId: "kratos", quantity: 2, cents: 100, state: "priced", commander: false, held: 3, finish: null },
      ],
    };
    render(<CartView cart={rats} provenance={provenance} initialView="deck" focusDeckId="gishath" />);
    expect(screen.getByText(copy.list.owned(3))).toBeTruthy();
  });

  it("draws a group whose copies sum to $0.00 without a figure, as DeckSelect does", () => {
    const free = cart();
    free.decks[0] = { ...free.decks[0], cents: 0, pricedCopies: free.decks[0].copies };
    render(<CartView cart={free} provenance={provenance} initialView="deck" />);
    expect(screen.queryByText(copy.selections.figure(free.decks[0].copies, "$0.00"))).toBeNull();
  });

  it("keeps every parameter it does not own when the view changes, and drops the one-time ?deck=", () => {
    window.history.replaceState(null, "", "/?deck=gishath&utm=x");
    render(<CartView cart={cart()} provenance={provenance} initialView="deck" focusDeckId="gishath" />);
    fireEvent.click(screen.getByRole("button", { name: copy.view.byCard }));
    expect(window.location.search).toBe("?utm=x");
    fireEvent.click(screen.getByRole("button", { name: copy.view.byDeck }));
    expect(window.location.search).toBe("?utm=x&view=deck");
    window.history.replaceState(null, "", "/");
  });

  it("opens the ?deck= group on a one-deck cart too, with no switch", () => {
    const one = cart({ decks: cart().decks.slice(0, 1) });
    render(<CartView cart={one} provenance={provenance} initialView="deck" focusDeckId="gishath" />);
    expect(screen.queryByRole("button", { name: copy.view.byDeck })).toBeNull();
    expect(screen.getAllByRole("region", { name: /HD - / })).toHaveLength(1);
    expect(screen.getByText("Command Tower")).toBeTruthy();
  });

  it("folds everything, without an error, when ?deck= names a deck not on the cart (A5-t)", () => {
    render(<CartView cart={cart()} provenance={provenance} initialView="deck" focusDeckId="00000000-0000-0000-0000-000000000000" />);
    expect(screen.queryByText("Sol Ring")).toBeNull();
    expect(screen.getAllByRole("region", { name: /HD - / })).toHaveLength(3);
  });

  it("keeps an unselected deck's group folded and its toggle off", () => {
    render(<CartView cart={cart()} provenance={provenance} initialView="deck" focusDeckId="gishath" />);
    const gishath = screen.getAllByRole("checkbox", { name: copy.selections.aria("HD - Gishath", true) })[0];
    fireEvent.click(gishath);
    expect(screen.queryByText("Command Tower")).toBeNull();
    const toggle = screen.getAllByRole("button", { expanded: false }).find((b) => b.textContent?.includes("HD - Gishath"))!;
    expect(toggle.hasAttribute("disabled")).toBe(true);
  });

  describe("buying from the cart (cart PR 6)", () => {
    it("draws the buy key beside the switch, and nothing to press with buying off", () => {
      const { unmount } = render(<CartView cart={cart()} provenance={provenance} buyEnabled />);
      expect(screen.getByText(gotItCopy.row.keyBuy)).toBeTruthy();
      expect(screen.getAllByRole("button", { name: gotItCopy.row.tagAria("Sol Ring") })).toHaveLength(1);
      unmount();
      render(<CartView cart={cart()} provenance={provenance} />);
      expect(screen.queryByText(gotItCopy.row.keyBuy)).toBeNull();
      expect(screen.queryByRole("button", { name: gotItCopy.row.tagAria("Sol Ring") })).toBeNull();
    });

    it("keeps a bought line the cart no longer lists as a held slot where it was (S3)", async () => {
      loadPrintingChoices.mockResolvedValue([{
        scryfallId: "a0000000-0000-4000-8000-000000000000", setCode: "cmm", setName: "Commander Masters",
        collectorNumber: "400", releasedAt: "2023-08-04", imageUri: null, flavorName: null,
        finishes: ["nonfoil"], owned: { nonfoil: 17 },
      }]);
      markBoughtForDecks.mockResolvedValue({ applied: { id: "e1", receipt: { covered: [], still: [] } } });
      const { rerender } = render(<CartView cart={cart()} provenance={provenance} buyEnabled />);
      fireEvent.click(screen.getByRole("button", { name: gotItCopy.row.tagAria("Sol Ring") }));
      const add = await screen.findByRole("button", { name: gotItCopy.confirm.add(2) });
      await act(async () => { fireEvent.click(add); });
      // The action's revalidation reads the cart again, without the line.
      const after = cart();
      after.lines = after.lines.filter((l) => l.oracleId !== "sol");
      rerender(<CartView cart={after} provenance={provenance} buyEnabled />);
      const slot = list().getAllByRole("listitem").find((li) => li.hasAttribute("data-held-slot"))!;
      expect(slot.textContent).toContain(gotItCopy.slot.held("Sol Ring"));
      expect(slot.textContent).toContain(copy.list.added(2));
    });

    async function buySolRing(view: ReturnType<typeof render>) {
      loadPrintingChoices.mockResolvedValue([{
        scryfallId: "a0000000-0000-4000-8000-000000000000", setCode: "cmm", setName: "Commander Masters",
        collectorNumber: "400", releasedAt: "2023-08-04", imageUri: null, flavorName: null,
        finishes: ["nonfoil"], owned: { nonfoil: 17 },
      }]);
      markBoughtForDecks.mockResolvedValue({ applied: { id: "e1", receipt: { covered: [], still: [] } } });
      fireEvent.click(screen.getByRole("button", { name: gotItCopy.row.tagAria("Sol Ring") }));
      const add = await screen.findByRole("button", { name: gotItCopy.confirm.add(2) });
      await act(async () => { fireEvent.click(add); });
      return view;
    }

    it("keeps the receipt up when the purchase empties the cart", async () => {
      const view = await buySolRing(render(<CartView cart={cart()} provenance={provenance} buyEnabled />));
      view.rerender(<CartView cart={cart({ decks: [], lines: [] })} provenance={provenance} buyEnabled />);
      expect(screen.getByText(copy.empty.title)).toBeTruthy();
      expect(screen.getByText(gotItCopy.receipt.added("Sol Ring", 2))).toBeTruthy();
    });

    it("draws no held slot for a line that is only unselected, not gone from the cart", async () => {
      await buySolRing(render(<CartView cart={cart()} provenance={provenance} buyEnabled />));
      for (const name of ["HD - Gishath", "HD - Kratos"]) {
        fireEvent.click(screen.getAllByRole("checkbox", { name: copy.selections.aria(name, true) })[0]);
      }
      expect(list().queryAllByRole("listitem").some((li) => li.hasAttribute("data-held-slot"))).toBe(false);
    });

    it("keeps the slot for either deck a line was bought for, whichever press the cart remembers", async () => {
      loadPrintingChoices.mockResolvedValue([{
        scryfallId: "a0000000-0000-4000-8000-000000000000", setCode: "cmm", setName: "Commander Masters",
        collectorNumber: "400", releasedAt: "2023-08-04", imageUri: null, flavorName: null,
        finishes: ["nonfoil"], owned: { nonfoil: 17 },
      }]);
      const toggle = (name: string, on: boolean) =>
        fireEvent.click(screen.getAllByRole("checkbox", { name: copy.selections.aria(name, on) })[0]);
      const buyFor = async (entry: string) => {
        markBoughtForDecks.mockResolvedValueOnce({ applied: { id: entry, quantity: 1, receipt: { covered: [], still: [] } } });
        fireEvent.click(screen.getByRole("button", { name: gotItCopy.row.tagAria("Sol Ring") }));
        const add = await screen.findByRole("button", { name: gotItCopy.confirm.add(1) });
        await act(async () => { fireEvent.click(add); });
        await screen.findByRole("button", { name: gotItCopy.receipt.undoAria("Sol Ring") });
      };
      const { rerender } = render(<CartView cart={cart()} provenance={provenance} buyEnabled />);
      toggle("HD - Gishath", true);
      await buyFor("e1");
      toggle("HD - Gishath", false);
      toggle("HD - Kratos", true);
      await buyFor("e2");
      const after = cart();
      after.lines = after.lines.filter((l) => l.oracleId !== "sol");
      rerender(<CartView cart={after} provenance={provenance} buyEnabled />);
      const slots = () => list().queryAllByRole("listitem").filter((li) => li.hasAttribute("data-held-slot"));
      // Gishath alone, then Kratos alone: each deck was bought for in one press, and each keeps the slot.
      expect(slots()).toHaveLength(1);
      toggle("HD - Gishath", true);
      toggle("HD - Kratos", false);
      expect(slots()).toHaveLength(1);
    });

    it("names a deck the purchase finished from the cart as it was when the confirm opened", async () => {
      loadPrintingChoices.mockResolvedValue([{
        scryfallId: "a0000000-0000-4000-8000-000000000000", setCode: "cmm", setName: "Commander Masters",
        collectorNumber: "400", releasedAt: "2023-08-04", imageUri: null, flavorName: null,
        finishes: ["nonfoil"], owned: { nonfoil: 17 },
      }]);
      // The read gives Gishath no name (no claim left), and the next cart no longer lists it.
      markBoughtForDecks.mockResolvedValue({ applied: { id: "e1", receipt: { covered: [{ deckId: "gishath", deckName: "" }], still: [] } } });
      const view = render(<CartView cart={cart()} provenance={provenance} buyEnabled />);
      fireEvent.click(screen.getByRole("button", { name: gotItCopy.row.tagAria("Sol Ring") }));
      const add = await screen.findByRole("button", { name: gotItCopy.confirm.add(2) });
      await act(async () => { fireEvent.click(add); });
      const after = cart();
      after.decks = after.decks.filter((d) => d.id !== "gishath");
      view.rerender(<CartView cart={after} provenance={provenance} buyEnabled />);
      expect(screen.getByText(copy.receipt.covered(["HD - Gishath"]))).toBeTruthy();
    });

    it("never arms the back band with buying off: it would tell the player to press an inert tag", () => {
      render(<CartView cart={cart()} provenance={provenance} />);
      fireEvent.click(screen.getByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) }));
      act(() => { document.dispatchEvent(new Event("visibilitychange")); });
      expect(screen.queryByText(copy.back.title)).toBeNull();
    });

    it("says how to record a purchase when the tab comes back from Mana Pool, once (K1)", () => {
      render(<CartView cart={cart()} provenance={provenance} buyEnabled />);
      expect(screen.queryByText(copy.back.title)).toBeNull();
      fireEvent.click(screen.getByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) }));
      act(() => { document.dispatchEvent(new Event("visibilitychange")); });
      expect(screen.getByText(copy.back.title)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: copy.back.dismiss }));
      expect(screen.queryByText(copy.back.title)).toBeNull();
      act(() => { document.dispatchEvent(new Event("visibilitychange")); });
      expect(screen.queryByText(copy.back.title)).toBeNull();
    });

    it("never shows the back band twice in a visit, even after the list goes and comes back", () => {
      render(<CartView cart={cart()} provenance={provenance} buyEnabled />);
      fireEvent.click(screen.getByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) }));
      act(() => { document.dispatchEvent(new Event("visibilitychange")); });
      fireEvent.click(screen.getByRole("button", { name: copy.back.dismiss }));
      fireEvent.click(screen.getByRole("button", { name: copy.selections.unselectAll }));
      fireEvent.click(screen.getByRole("button", { name: copy.none.action(3) }));
      // Pressed again and back again: a band whose state reset with the list would show here.
      fireEvent.click(screen.getByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) }));
      act(() => { document.dispatchEvent(new Event("visibilitychange")); });
      expect(screen.queryByText(copy.back.title)).toBeNull();
    });

    it("draws the buy key by card only: a deck's group has no press", () => {
      render(<CartView cart={cart()} provenance={provenance} buyEnabled initialView="deck" />);
      expect(screen.queryByText(gotItCopy.row.keyBuy)).toBeNull();
    });
  });
});
