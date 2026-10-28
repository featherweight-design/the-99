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
// A card-details trigger needs the provider the cart view mounts around its list: this stand-in throws without one,
// so a view that forgot the provider fails here instead of in the browser.
vi.mock("../../cards/card-detail-provider", async () => {
  const React = await import("react");
  const Mounted = React.createContext(false);
  return {
    CardDetailProvider: ({ children }: { children: React.ReactNode }) => <Mounted.Provider value>{children}</Mounted.Provider>,
    CardDetailTrigger: ({ children, name }: { children: React.ReactNode; name: string }) => {
      if (!React.useContext(Mounted)) throw new Error("useCardDetail must be used inside a CardDetailProvider");
      return <button type="button" aria-label={name}>{children}</button>;
    },
    // The spares-only modal's chrome registers itself with the provider; the same mount check holds for it.
    useCardDetail: () => {
      if (!React.useContext(Mounted)) throw new Error("useCardDetail must be used inside a CardDetailProvider");
      return { registerSheet: () => () => {}, openOracleId: null, revealing: false, close: () => {} };
    },
  };
});

const { CartView } = await import("./cart-view");
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { exportLinkOutCopy } from "../../../lib/copy/decks-builder";
import { priceCopy } from "../../../lib/copy/price";
import type { CartPayload } from "../../../lib/decks/cart";
import { spareCopy } from "../../../lib/copy/social";

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
    holders: [],
    decks: [
      { id: "gishath", name: "HD - Gishath", brew: true, copies: 2, cents: 180, pricedCopies: 2 },
      { id: "omnath", name: "HD - Omnath", brew: false, copies: 1, cents: 400, pricedCopies: 1 },
      { id: "kratos", name: "HD - Kratos", brew: true, copies: 1, cents: 150, pricedCopies: 1 },
    ],
    lines: [
      { oracleId: "omn", name: "Omnath, Locus of All", commander: true, owned: 0, heldElsewhere: 0, heldBy: [],
        rows: [{ deckId: "omnath", quantity: 1, cents: 400, state: "priced", commander: true, held: 0, finish: null }] },
      { oracleId: "sol", name: "Sol Ring", commander: false, owned: 17, heldElsewhere: 17, heldBy: [],
        rows: [
          { deckId: "gishath", quantity: 1, cents: 150, state: "priced", commander: false, held: 0, finish: null },
          { deckId: "kratos", quantity: 1, cents: 150, state: "priced", commander: false, held: 0, finish: null },
        ] },
      { oracleId: "tower", name: "Command Tower", commander: false, owned: 0, heldElsewhere: 0, heldBy: [],
        rows: [{ deckId: "gishath", quantity: 1, cents: 30, state: "priced", commander: false, held: 0, finish: null }] },
    ],
    ...over,
  };
}

const list = () => within(screen.getByRole("region", { name: copy.list.regionAria }));
/** A row's fact (`need`, `spare`, `own`), or null when the row draws none. */
const factOf = (li: HTMLElement, kind: string) => li.querySelector<HTMLElement>(`[data-fact="${kind}"]`);
/** What a fact reads aloud of its names: every name in full, whatever fits on the line. */
const readNames = (fact: HTMLElement | null) => fact?.querySelector(".sr-only")?.textContent ?? null;

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
    const need = factOf(items[1], "need")!;
    expect(need.querySelector("b")?.textContent).toBe("2");
    expect(readNames(need)).toBe("HD - Gishath, HD - Kratos");
    // Seventeen owned, held by decks the read did not name: G1's fallback, with no pill.
    const own = factOf(items[1], "own")!;
    expect(own.querySelector("b")?.textContent).toBe("17");
    expect(within(own).getByText(copy.facts.inOther)).toBeTruthy();
    expect(own.querySelector("[data-fact-pill]")).toBeNull();
    expect(factOf(items[2], "own")).toBeNull();
  });

  it("reads the cart again when a deck is unselected, and writes nothing (A3)", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    fireEvent.click(screen.getByRole("checkbox", { name: copy.selections.aria("HD - Gishath", true) }));
    const items = list().getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(readNames(factOf(items[1], "need"))).toBe("HD - Kratos");
    expect(factOf(items[1], "need")?.querySelector("b")?.textContent).toBe("1");
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
    const gishath = screen.getByRole("checkbox", { name: copy.selections.aria("HD - Gishath", true) }).closest("label")!;
    expect(within(gishath).getByText(copy.selections.figureNoPrice(free.decks[0].copies))).toBeTruthy();
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

  // Hugh, 2026-10-13: on the phone the page scrolls as one and the switch stays pinned; the list's own
  // scroll box (and the page's fixed height) are desktop's alone.
  it("scrolls the phone's page as one, pinning the controls, and keeps the list's own box for desktop", () => {
    const { container } = render(<CartView cart={cart()} provenance={provenance} />);
    const controls = container.querySelector("[data-cart-controls]") as HTMLElement;
    expect(controls.className).toContain("sticky");
    // Under a returned phone header (card search plan PR B), which publishes the room it takes.
    expect(controls.className).toContain("top-[var(--header-offset,0px)]");
    expect(controls.className).toContain("md:static");
    // The switch and the chassis (search, sort, the result line that replaced the list heading) are the pinned block's members.
    expect(within(controls).getByRole("radiogroup", { name: copy.view.label })).toBeTruthy();
    expect(controls.querySelector("[data-chassis-row='result']")).toBeTruthy();
    expect(within(controls).getByRole("searchbox", { name: copy.filters.search })).toBeTruthy();
    const box = screen.getByRole("region", { name: copy.list.regionAria });
    // Desktop keeps what the phone gave up: positive assertions first, so dropping a class outright fails too.
    for (const c of ["md:overflow-y-auto", "md:flex-1", "md:min-h-[120px]"]) expect(box.className).toContain(c);
    expect((container.firstElementChild as HTMLElement).className).toContain("md:min-h-[420px]");
    // `md:h-dvh` before the top is measured, `md:h-[calc(100dvh-var(--cart-top))]` after.
    expect((container.firstElementChild as HTMLElement).className).toMatch(/md:h-(dvh|\[calc\(100dvh-var\(--cart-top\)\)\])/);
    for (const c of box.className.split(/\s+/)) {
      if (/overflow|flex-1|min-h-/.test(c)) expect(c.startsWith("md:"), c).toBe(true);
    }
    const page = container.firstElementChild as HTMLElement;
    for (const c of page.className.split(/\s+/)) {
      if (/^(min-)?h-/.test(c)) expect(c.startsWith("md:"), c).toBe(true);
    }
  });

  it("splits a cart too long for one link into named parts (K3)", () => {
    const long = (id: string) => ({
      oracleId: id, name: `${id} ${"x".repeat(13_000)}`, commander: false, owned: 0, heldElsewhere: 0, heldBy: [],
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
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byDeck }));
    expect(screen.getByRole("radio", { name: copy.view.byDeck }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(copy.result.byDeck(3, 4))).toBeTruthy();
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
      oracleId: "rats", name: "Relentless Rats", commander: false, owned: 3, heldElsewhere: 0, heldBy: [],
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
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byCard }));
    expect(window.location.search).toBe("?utm=x");
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byDeck }));
    expect(window.location.search).toBe("?utm=x&view=deck");
    window.history.replaceState(null, "", "/");
  });

  it("opens the ?deck= group on a one-deck cart too, with no switch", () => {
    const one = cart({ decks: cart().decks.slice(0, 1) });
    render(<CartView cart={one} provenance={provenance} initialView="deck" focusDeckId="gishath" />);
    expect(screen.queryByRole("radiogroup", { name: copy.view.label })).toBeNull();
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

    it("holds a search to the held slot too: one matching only the bought card still draws it, another drops it", async () => {
      const view = await buySolRing(render(<CartView cart={cart()} provenance={provenance} buyEnabled />));
      const after = cart();
      after.lines = after.lines.filter((l) => l.oracleId !== "sol");
      view.rerender(<CartView cart={after} provenance={provenance} buyEnabled />);
      const search = screen.getByRole("searchbox", { name: copy.filters.search });
      // Only the bought card matches: its slot is the list, not a no-match block.
      fireEvent.change(search, { target: { value: "sol" } });
      expect(list().getAllByRole("listitem").some((li) => li.hasAttribute("data-held-slot"))).toBe(true);
      expect(screen.queryByText(copy.noMatch.title)).toBeNull();
      // A search the bought card does not match takes its slot out with the other lines.
      fireEvent.change(search, { target: { value: "tower" } });
      expect(list().getAllByRole("listitem").some((li) => li.hasAttribute("data-held-slot"))).toBe(false);
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

// Social R2 PR B (S5): the spare glyph on the cart's lines, the key's spare item, and the spares-only modal.
describe("CartView, friends' spares", () => {
  const spareAnswer = {
    ok: true,
    json: async () => ({
      spares: [{ oracleId: "tower", friend: { publicId: "p", displayName: "Ana", commander: null, pods: ["Thursday pod"] }, spare: 1 }],
    }),
  };
  const withFetch = async (run: (fetchMock: ReturnType<typeof vi.fn>) => Promise<void>) => {
    const fetchMock = vi.fn().mockResolvedValue(spareAnswer);
    vi.stubGlobal("fetch", fetchMock);
    try {
      await run(fetchMock);
    } finally {
      vi.unstubAllGlobals();
    }
  };

  it("draws the glyph on the line a friend holds a spare of, and on no other", async () => {
    await withFetch(async () => {
      await act(async () => { render(<CartView cart={cart()} provenance={provenance} socialFriends />); });
      const items = list().getAllByRole("listitem");
      const tower = items.find((li) => li.textContent?.startsWith("Command Tower"))!;
      expect(within(tower).getByRole("button", { name: spareCopy.markerAria("Command Tower") })).toBeTruthy();
      expect(list().getAllByTestId("other-ways")).toHaveLength(1);
      // v2: the press leads the spare fact at the one-line 26px size, its coarse pointer's 44px hit drawn past it, so it
      // never makes the fact line taller; the friend's name and count follow it.
      const classes = within(tower).getByTestId("other-ways").className.split(/\s+/);
      expect(classes).toEqual(expect.arrayContaining(["relative", "pointer-coarse:after:h-[max(44px,100%)]"]));
      expect(classes).not.toContain("h-[44px]");
      const spare = factOf(tower, "spare")!;
      expect(spare.contains(within(tower).getByTestId("other-ways"))).toBe(true);
      expect(spare.querySelector("b")?.textContent).toBe("1");
      expect(readNames(spare)).toBe("Ana");
      expect(items.filter((li) => factOf(li, "spare") !== null)).toHaveLength(1);
    });
  });

  it("names the glyph in the key, with I got it off and one deck, and opens the spares-only modal", async () => {
    await withFetch(async () => {
      const one = cart({ decks: [cart().decks[0]], lines: [cart().lines[2]] });
      await act(async () => { render(<CartView cart={one} provenance={provenance} socialFriends />); });
      expect(screen.getByTestId("spare-key").textContent).toContain(spareCopy.key);
      await act(async () => { fireEvent.click(screen.getByRole("button", { name: spareCopy.markerAria("Command Tower") })); });
      const dialog = screen.getByRole("dialog", { name: spareCopy.modalTitleSpares });
      expect(within(dialog).getAllByTestId("friend-spare")).toHaveLength(1);
    });
  });

  it("reads nothing and draws nothing with the switch off", async () => {
    await withFetch(async (fetchMock) => {
      await act(async () => { render(<CartView cart={cart()} provenance={provenance} />); });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(screen.queryByTestId("other-ways")).toBeNull();
      expect(screen.queryByTestId("spare-key")).toBeNull();
    });
  });
});

describe("CartView, friends' spares by deck and on selection", () => {
  const spareAnswer = {
    ok: true,
    json: async () => ({
      spares: [{ oracleId: "tower", friend: { publicId: "p", displayName: "Ana", commander: null, pods: [] }, spare: 1 }],
    }),
  };
  it("draws the glyph on a deck group's line too", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(spareAnswer));
    try {
      await act(async () => { render(<CartView cart={cart()} provenance={provenance} socialFriends initialView="deck" focusDeckId="gishath" />); });
      expect(list().getByRole("button", { name: spareCopy.markerAria("Command Tower") })).toBeTruthy();
      expect(screen.getByTestId("spare-key")).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("names no spare in the key while every group holding one is folded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(spareAnswer));
    try {
      await act(async () => { render(<CartView cart={cart()} provenance={provenance} socialFriends initialView="deck" />); });
      expect(list().queryByTestId("other-ways")).toBeNull();
      expect(screen.queryByTestId("spare-key")).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("drops the key's spare item when the only deck needing that card is unselected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(spareAnswer));
    try {
      await act(async () => { render(<CartView cart={cart()} provenance={provenance} socialFriends />); });
      expect(screen.getByTestId("spare-key")).toBeTruthy();
      fireEvent.click(screen.getByRole("checkbox", { name: copy.selections.aria("HD - Gishath", true) }));
      expect(screen.queryByTestId("spare-key")).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// A two-faced card's line prints its front face beside the `//` mark, by card and by deck (d9, 2026-10-16); the press keeps
// the whole name, and so does the Mana Pool line the checkout builds.
describe("CartView, a two-faced card's line", () => {
  const mdfc = cart({
    lines: [
      { oracleId: "reidane", name: "Reidane, God of the Worthy // Valkmira, Protector's Shield", layout: "modal_dfc",
        commander: false, owned: 0, heldElsewhere: 0, heldBy: [],
        rows: [{ deckId: "gishath", quantity: 1, cents: 90, state: "priced", commander: false, held: 0, finish: null }] },
    ],
  });

  it("prints the front face and the mark by card", () => {
    render(<CartView cart={mdfc} provenance={provenance} />);
    const [item] = list().getAllByRole("listitem");
    expect(within(item).getByText("Reidane, God of the Worthy")).toBeTruthy();
    expect(within(item).queryByText(/Valkmira/)).toBeNull();
    expect(within(item).getByText("two-faced card")).toBeTruthy();
  });

  it("prints the front face and the mark by deck", () => {
    render(<CartView cart={mdfc} provenance={provenance} initialView="deck" focusDeckId="gishath" />);
    expect(screen.getAllByText("Reidane, God of the Worthy").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Valkmira/)).toBeNull();
    expect(screen.getAllByText("two-faced card").length).toBeGreaterThan(0);
  });
});

// v2 call 1: By card's row draws need, spare and own as facts under one column header.
describe("CartView, By card's row facts (v2 PR 4)", () => {
  // Sol Ring: Kratos (on the line) and two decks outside the cart hold the seventeen owned copies.
  const held = cart({
    holders: [{ id: "thorin", name: "HD - Thorin" }, { id: "elves", name: "HD - Elves" }],
    lines: cart().lines.map((l) => (l.oracleId === "sol"
      ? { ...l, heldElsewhere: 15, heldBy: [{ deckId: "thorin", held: 10 }, { deckId: "elves", held: 5 }],
        rows: l.rows.map((r) => (r.deckId === "kratos" ? { ...r, held: 2 } : r)) }
      : l)),
  });
  const sol = () => list().getAllByRole("listitem").find((li) => li.textContent?.includes("Sol Ring"))!;

  it("names where the owned copies are in use: the cart's decks first, then the decks outside it", () => {
    render(<CartView cart={held} provenance={provenance} />);
    const own = factOf(sol(), "own")!;
    expect(own.querySelector("b")?.textContent).toBe("17");
    expect(within(own).getByText(copy.facts.in)).toBeTruthy();
    expect(readNames(own)).toBe("HD - Thorin, HD - Elves");
    // Unselect Kratos: its two copies are in use elsewhere now, and it leads as the cart's own deck.
    fireEvent.click(screen.getByRole("checkbox", { name: copy.selections.aria("HD - Kratos", true) }));
    expect(readNames(factOf(sol(), "own"))).toBe("HD - Kratos, HD - Thorin, HD - Elves");
  });

  it("falls back to `in other decks` when a holding deck has no name", () => {
    render(<CartView cart={{ ...held, holders: [held.holders[0]] }} provenance={provenance} />);
    const own = factOf(sol(), "own")!;
    expect(within(own).getByText(copy.facts.inOther)).toBeTruthy();
    expect(readNames(own)).toBeNull();
  });

  it("draws no own fact and no spare fact on a row with nothing owned and no friend's spare", () => {
    render(<CartView cart={held} provenance={provenance} />);
    const tower = list().getAllByRole("listitem").find((li) => li.textContent?.includes("Command Tower"))!;
    expect(factOf(tower, "need")).not.toBeNull();
    expect(factOf(tower, "own")).toBeNull();
    expect(factOf(tower, "spare")).toBeNull();
  });

  it("heads By card's list with its columns, outside the scroll box, and By deck's with none", () => {
    const { unmount } = render(<CartView cart={held} provenance={provenance} />);
    const columns = document.querySelector("[data-cart-columns]")!;
    expect([...columns.children].map((c) => c.textContent)).toEqual([
      copy.columns.card, copy.columns.need, copy.columns.spares, copy.columns.own, "",
    ]);
    expect(screen.getByRole("region", { name: copy.list.regionAria }).contains(columns)).toBe(false);
    unmount();
    render(<CartView cart={held} provenance={provenance} initialView="deck" />);
    expect(document.querySelector("[data-cart-columns]")).toBeNull();
  });

  it("draws no columns over the no-match block", () => {
    render(<CartView cart={held} provenance={provenance} initialQuery="zzzz" />);
    expect(screen.getByText(copy.noMatch.title)).toBeTruthy();
    expect(document.querySelector("[data-cart-columns]")).toBeNull();
  });
});

describe("CartView, By card's spare fact (v2 PR 4)", () => {
  it("counts every friend's spare copies, naming the friend with the most first", async () => {
    const friend = (publicId: string, displayName: string) => ({ publicId, displayName, commander: null, pods: ["Thursday pod"] });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ spares: [
        { oracleId: "tower", friend: friend("a", "Ana"), spare: 1 },
        { oracleId: "tower", friend: friend("c", "Chris"), spare: 3 },
      ] }),
    }));
    try {
      await act(async () => { render(<CartView cart={cart()} provenance={provenance} socialFriends />); });
      const tower = list().getAllByRole("listitem").find((li) => li.textContent?.startsWith("Command Tower"))!;
      const spare = factOf(tower, "spare")!;
      expect(spare.querySelector("b")?.textContent).toBe("4");
      expect(readNames(spare)).toBe("Chris, Ana");
      expect(within(spare).getByText(copy.facts.spare)).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
