// By friend on the all-decks cart (spare requests PR 3c; handoff `design_handoff_the99_spare_requests`, board
// `Cart-By-Friend`): the segment's presence rule, the panels and their order, the line's one element in each state
// (the modal's own `rowAsk`), Ask and Ask instead through the provider's one action path, the failure toast, the key,
// and the fallback to By card.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AskStateLine } from "../../../lib/social/spare-requests";

const actions = vi.hoisted(() => ({ askSpareAction: vi.fn(), askInsteadAction: vi.fn() }));
vi.mock("../../../app/friends/spare-actions", () => actions);
const bought = vi.hoisted(() => ({ loadPrintingChoices: vi.fn(), markBoughtForDecks: vi.fn() }));
vi.mock("../../../app/collection/edit-actions", () => ({ loadPrintingChoices: bought.loadPrintingChoices }));
vi.mock("../../../app/decks/mark-bought-actions", () => ({ markBoughtForDecks: bought.markBoughtForDecks, readCartChooser: vi.fn(async () => null), markBought: vi.fn() }));
vi.mock("../../../app/decks/assignment-actions", () => ({ assignCopy: vi.fn() }));
vi.mock("../../../app/collection/history-actions", () => ({ previewRevert: vi.fn(), revertCollectionEntry: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", () => ({
  useLinkStatus: () => ({ pending: false }),
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("../../cards/card-detail-provider", async () => {
  const React = await import("react");
  return {
    CardDetailProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    CardDetailTrigger: ({ children, name }: { children: React.ReactNode; name: string }) => <button type="button" aria-label={name}>{children}</button>,
    useCardDetail: () => ({ registerSheet: () => () => {}, openOracleId: null, revealing: false, close: () => {} }),
  };
});

const { CartView } = await import("./cart-view");
const { byFriendStatus, groupByFriend } = await import("./cart-by-friend");
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { spareCopy } from "../../../lib/copy/social";
import { gotItCopy } from "../../../lib/copy/i-got-it";
import type { CartPayload } from "../../../lib/decks/cart";

const r = spareCopy.request;
const NOW = "2026-10-20T00:00:00.000Z";
const provenance = { behind: false, when: "Tuesday" };

// Jace for Thopter Works, Brainstorm twice (Wizards and Tarkir), Gisa and Command Tower: the board's cart, cut down.
const JACE = "11111111-1111-4111-8111-111111111111";
const BRAIN = "22222222-2222-4222-8222-222222222222";
const GISA = "33333333-3333-4333-8333-333333333333";
const TOWER = "44444444-4444-4444-8444-444444444444";
const row = (deckId: string, cents = 100) => ({ deckId, quantity: 1, cents, state: "priced" as const, commander: false, held: 0, finish: null });
function cart(over: Partial<CartPayload> = {}): CartPayload {
  return {
    totalDecks: 5,
    priced: true,
    newestAsOf: NOW,
    holders: [],
    decks: [
      { id: "thopter", name: "Thopter Works", brew: false, copies: 3, cents: 1435, pricedCopies: 3 },
      { id: "wizards", name: "HD - Wizards", brew: true, copies: 1, cents: 55, pricedCopies: 1 },
      { id: "tarkir", name: "Dragons of Tarkir", brew: false, copies: 1, cents: 55, pricedCopies: 1 },
    ],
    lines: [
      { oracleId: JACE, name: "Jace, Multiverse Architect", commander: false, owned: 0, heldElsewhere: 0, heldBy: [], rows: [row("thopter", 840)] },
      { oracleId: BRAIN, name: "Brainstorm", commander: false, owned: 0, heldElsewhere: 0, heldBy: [], rows: [row("wizards", 55), row("tarkir", 55)] },
      { oracleId: GISA, name: "Ghoulcaller Gisa", commander: false, owned: 0, heldElsewhere: 0, heldBy: [], rows: [row("thopter", 475)] },
      { oracleId: TOWER, name: "Command Tower", commander: false, owned: 0, heldElsewhere: 0, heldBy: [], rows: [row("thopter", 120)] },
    ],
    ...over,
  };
}

const friend = (name: string, pods = ["Thursday pod"]) => ({ publicId: `p-${name}`, displayName: name, commander: null, pods });
const spare = (oracleId: string, name: string, n = 1, pods?: string[]) => ({ oracleId, friend: friend(name, pods), spare: n });
const ask = (oracleId: string, name: string, state: AskStateLine["state"]): AskStateLine => ({
  id: `req-${name}-${oracleId.slice(0, 2)}-${state}`, oracleId, holder: { publicId: `p-${name}`, displayName: name }, state,
  daysLeft: state === "open" ? 12 : null, createdAt: "2026-10-18T00:00:00Z", answeredAt: null,
});

// The board's four friends: Colin (Jace, Brainstorm), Peter (Gisa), Chris (Tower, two pods), Max (Jace).
const BOARD = [
  spare(JACE, "Colin"), spare(BRAIN, "Colin"), spare(GISA, "Peter"),
  spare(TOWER, "Chris", 1, ["Thursday pod", "Cube night"]), spare(JACE, "Max", 1, ["Cube night"]),
];

const fetchMock = vi.fn();
let served: { spares: unknown[]; asks: AskStateLine[] } = { spares: [], asks: [] };
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) =>
    url.startsWith("/api/spare-requests")
      ? { ok: true, json: async () => ({ asks: served.asks }) }
      : { ok: true, json: async () => ({ spares: served.spares }) });
  actions.askSpareAction.mockReset();
  actions.askInsteadAction.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

async function mount(props: Partial<React.ComponentProps<typeof CartView>> = {}, c = cart()) {
  await act(async () => {
    render(<CartView cart={c} provenance={provenance} socialFriends spareAsks buyEnabled {...props} />);
  });
}
const list = () => within(screen.getByRole("region", { name: copy.list.regionAria }));
const panels = () => screen.queryAllByTestId("friend-panel");
const panel = (name: string) => within(panels().find((p) => p.getAttribute("data-friend") === `p-${name}`)!);
const lineIn = (name: string, card: string) => panel(name).getAllByRole("listitem").find((li) => li.textContent?.startsWith(card))!;
/** A row's fact count: `need`, `spare` or `own`. */
const factCount = (li: HTMLElement, fact: string) => li.querySelector(`[data-fact="${fact}"] b`)?.textContent ?? null;
const head = (name: string) => panels().find((p) => p.getAttribute("data-friend") === `p-${name}`)!.querySelector("[data-panel-head] button") as HTMLElement;

describe("By friend's segment", () => {
  it("is drawn once a selected line has a friend's spare, with spare requests on", async () => {
    served = { spares: BOARD, asks: [] };
    await mount();
    expect(screen.getByRole("radio", { name: copy.view.byFriend })).toBeTruthy();
  });

  it("is not drawn while no line has a spare", async () => {
    served = { spares: [], asks: [] };
    await mount();
    expect(screen.queryByRole("radio", { name: copy.view.byFriend })).toBeNull();
    expect(screen.getByRole("radio", { name: copy.view.byDeck })).toBeTruthy();
  });

  it("is not drawn with spare requests off, nor with friends off", async () => {
    served = { spares: BOARD, asks: [] };
    await mount({ spareAsks: false });
    expect(screen.queryByRole("radio", { name: copy.view.byFriend })).toBeNull();
    cleanup();
    await mount({ socialFriends: false });
    expect(screen.queryByRole("radio", { name: copy.view.byFriend })).toBeNull();
  });

  it("leaves with the last selected line that had a spare, and the view falls back to By card", async () => {
    served = { spares: [spare(GISA, "Peter")], asks: [] };
    await mount({ initialView: "friend" });
    expect(panels()).toHaveLength(1);
    // Gisa is Thopter Works' alone: unselecting it leaves no line with a spare.
    fireEvent.click(screen.getByRole("checkbox", { name: copy.selections.aria("Thopter Works", true) }));
    expect(screen.queryByRole("radio", { name: copy.view.byFriend })).toBeNull();
    expect(panels()).toHaveLength(0);
    expect(screen.getByRole("radio", { name: copy.view.byCard }).getAttribute("aria-checked")).toBe("true");
  });

  it("is drawn with one deck too, beside By card alone", async () => {
    served = { spares: [spare(GISA, "Peter")], asks: [] };
    await mount({}, cart({ decks: [cart().decks[0]], lines: [cart().lines[2]] }));
    expect(screen.getByRole("radio", { name: copy.view.byFriend })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: copy.view.byDeck })).toBeNull();
  });

  it("mirrors `?view=friend`, keeping what it does not own", async () => {
    served = { spares: BOARD, asks: [] };
    window.history.replaceState(null, "", "/?utm=x");
    await mount();
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byFriend }));
    expect(window.location.search).toBe("?utm=x&view=friend");
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byCard }));
    expect(window.location.search).toBe("?utm=x");
  });
});

describe("By friend's panels", () => {
  it("draws one panel per friend, most spares first, a card two friends hold under both", async () => {
    served = { spares: BOARD, asks: [] };
    await mount({ initialView: "friend" });
    expect(panels().map((p) => p.getAttribute("data-friend"))).toEqual(["p-Colin", "p-Chris", "p-Max", "p-Peter"]);
    expect(screen.getByText(copy.result.byFriend(4, 5))).toBeTruthy();
    expect(screen.getByText("4 friends · 5 spares")).toBeTruthy();
    // The head's figure: the panel's cards, then this friend's spares of them, both inflected (addendum R2).
    expect(panel("Colin").getByTestId("friend-panel-figure").textContent).toBe("2 cards · 2 spares");
    expect(panel("Peter").getByTestId("friend-panel-figure").textContent).toBe("1 card · 1 spare");
    expect(panel("Chris").getByText("shares with Thursday pod, Cube night")).toBeTruthy();
    // A panel's lines keep the by-card order (commanders, then most selected decks, then A to Z).
    expect(panel("Colin").getAllByRole("listitem").map((li) => ["Brainstorm", "Jace, Multiverse Architect"].find((n) => li.textContent?.startsWith(n)))).toEqual([
      "Brainstorm", "Jace, Multiverse Architect",
    ]);
    expect(panel("Max").getAllByRole("listitem")).toHaveLength(1);
    // v2's row: the need fact (the count and its decks), this friend's spare as a bare count, and no own fact with none owned.
    const brain = lineIn("Colin", "Brainstorm");
    expect(factCount(brain, "need")).toBe("2");
    expect(brain.querySelector('[data-fact="need"] [data-fact-names]')?.textContent).toBe("HD - Wizards, Dragons of Tarkir");
    expect(factCount(brain, "spare")).toBe("1");
    expect(brain.querySelector('[data-fact="spare"] [data-fact-names]')?.textContent).toBe("");
    expect(brain.querySelector('[data-fact="own"]')).toBeNull();
  });

  it("names each friend's own spares of the line's card, not the panel's total", async () => {
    served = { spares: [spare(JACE, "Colin", 3), spare(BRAIN, "Colin"), spare(JACE, "Max", 2, ["Cube night"])], asks: [] };
    await mount({ initialView: "friend" });
    expect(factCount(lineIn("Colin", "Jace, Multiverse Architect"), "spare")).toBe("3");
    expect(factCount(lineIn("Colin", "Brainstorm"), "spare")).toBe("1");
    expect(factCount(lineIn("Max", "Jace, Multiverse Architect"), "spare")).toBe("2");
    expect(panel("Colin").getByTestId("friend-panel-figure").textContent).toBe("2 cards · 4 spares");
  });

  it("orders by spares in copies, then by name", () => {
    const line = (oracleId: string) => ({ ...cart().lines[0], oracleId, selectedRows: [], copies: 1, cents: 0, pricedCopies: 0 });
    const byCard = new Map([[JACE, [spare(JACE, "Zed", 3), spare(JACE, "Ana", 1)]], [BRAIN, [spare(BRAIN, "Bo", 1), spare(BRAIN, "Ana", 1)]]]);
    const groups = groupByFriend([line(JACE), line(BRAIN)] as never, byCard);
    expect(groups.map((g) => [g.friend.displayName, g.spares])).toEqual([["Zed", 3], ["Ana", 2], ["Bo", 1]]);
    expect(Object.fromEntries(groups[1].spareOf)).toEqual({ [JACE]: 1, [BRAIN]: 1 });
    expect(Object.fromEntries(groups[0].spareOf)).toEqual({ [JACE]: 3 });
  });

  it("draws no spare glyph on a line and keeps only the buy item in the key", async () => {
    served = { spares: BOARD, asks: [] };
    await mount({ initialView: "friend" });
    expect(list().queryByTestId("other-ways")).toBeNull();
    expect(screen.queryByTestId("spare-key")).toBeNull();
    expect(screen.getByText(/press to add/)).toBeTruthy();
  });
});

describe("By friend's v2 row and panel (PR 6)", () => {
  it("draws the own fact where the copies are in use, as By card does", async () => {
    served = { spares: [spare(GISA, "Peter")], asks: [] };
    const c = cart();
    c.lines[2] = { ...c.lines[2], owned: 1, heldElsewhere: 1, heldBy: [{ deckId: "elves", held: 1 }] };
    c.holders = [{ id: "elves", name: "HD - Elves" }];
    await mount({ initialView: "friend" }, c);
    const gisa = lineIn("Peter", "Ghoulcaller");
    expect(factCount(gisa, "own")).toBe("1");
    expect(gisa.querySelector('[data-fact="own"] [data-fact-names]')?.textContent).toBe("HD - Elves");
  });

  it("lays the row out in By friend's grid, under By friend's column header", async () => {
    served = { spares: BOARD, asks: [] };
    await mount({ initialView: "friend" });
    const grid = "xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.7fr)_64px_minmax(0,1.25fr)_100px]";
    expect(lineIn("Colin", "Brainstorm").className).toContain(grid);
    // Inside a panel the row keeps 14px across at every width (`.fpn .prw`, `.fpn .nrw`).
    expect(lineIn("Colin", "Brainstorm").className).toContain("px-[14px]");
    const columns = document.querySelector('[data-cart-columns="friend"]')!;
    expect(columns.className).toContain(grid);
    expect(columns.className).toContain("px-[15px]");
    expect([...columns.children].map((c) => c.textContent)).toEqual([
      copy.columns.card, copy.columns.need, copy.columns.spare, copy.columns.own, "",
    ]);
    expect(document.querySelector('[data-cart-columns="card"]')).toBeNull();
  });

  it("stacks the Ask above the tag, at the cart's Ask size, and a status takes the Ask's place", async () => {
    served = { spares: BOARD, asks: [ask(JACE, "Colin", "open")] };
    await mount({ initialView: "friend" });
    const brain = lineIn("Colin", "Brainstorm");
    const press = within(brain).getByTestId("friend-spare-ask");
    const slot = press.closest("[data-cart-ask]")!;
    const tag = within(brain).getByRole("button", { name: gotItCopy.row.tagAria("Brainstorm") });
    // One column, the Ask's row first and the tag's under it.
    expect(slot.parentElement).toBe(tag.parentElement!.parentElement);
    expect(slot.nextElementSibling).toBe(tag.parentElement);
    expect(slot.parentElement!.className).toContain("flex-col");
    expect(slot.parentElement!.className).toContain("gap-[10px]");
    expect(slot.parentElement!.className).toContain("xl:gap-[7px]");
    expect(slot.className).toContain("h-[36px]");
    expect(slot.className).toContain("xl:h-[28px]");
    for (const c of ["h-[36px]", "min-w-[72px]", "rounded-[9px]", "text-[13px]", "xl:h-[28px]", "xl:min-w-[64px]", "xl:rounded-[7px]", "xl:text-[12.5px]"]) {
      expect(press.className).toContain(c);
    }
    // The two coarse hits meet at the gap's midline: the Ask's reaches down to it, the tag's is cut there.
    expect(press.className).toContain("pointer-coarse:after:-bottom-[5px]");
    expect(press.className).toContain("xl:pointer-coarse:after:-bottom-[3.5px]");
    expect(tag.parentElement!.className).toContain("[clip-path:inset(-5px_-100vw_-100vw_-100vw)]");
    expect(tag.parentElement!.className).toContain("xl:[clip-path:inset(-3.5px_-100vw_-100vw_-100vw)]");
    const status = within(lineIn("Colin", "Jace")).getByTestId("friend-spare-status");
    expect(status.closest("[data-cart-ask]")).toBeTruthy();
    expect(status.className).toContain("xl:text-[12.5px]");
  });

  it("folds a panel from its header and keeps the fold for the visit, across a view switch", async () => {
    served = { spares: BOARD, asks: [] };
    await mount({ initialView: "friend" });
    expect(head("Colin").getAttribute("aria-expanded")).toBe("true");
    expect(head("Colin").getAttribute("aria-label")).toBe(copy.byFriend.foldAria("Colin", true));
    fireEvent.click(head("Colin"));
    expect(head("Colin").getAttribute("aria-expanded")).toBe("false");
    expect(head("Colin").getAttribute("aria-label")).toBe(copy.byFriend.foldAria("Colin", false));
    expect(panel("Colin").queryAllByRole("listitem")).toHaveLength(0);
    // Folded, the head keeps its figure and drops its rule.
    expect(panel("Colin").getByTestId("friend-panel-figure").textContent).toBe("2 cards · 2 spares");
    expect(head("Colin").className).not.toContain("border-b");
    expect(head("Max").className).toContain("border-b-[color:var(--border-strong)]");
    expect(panel("Max").getAllByRole("listitem")).toHaveLength(1);
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byCard }));
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byFriend }));
    expect(head("Colin").getAttribute("aria-expanded")).toBe("false");
    expect(panel("Colin").queryAllByRole("listitem")).toHaveLength(0);
    fireEvent.click(head("Colin"));
    expect(panel("Colin").getAllByRole("listitem")).toHaveLength(2);
  });

  it("sticks the open header to the list box top from md, its panel clipped without becoming a scroller", async () => {
    served = { spares: BOARD, asks: [] };
    await mount({ initialView: "friend" });
    const section = panels()[0];
    expect(section.className).toContain("overflow-clip");
    expect(section.className).not.toContain("overflow-hidden");
    const h = section.querySelector("[data-panel-head]")!;
    expect(h.className).toContain("md:sticky");
    expect(h.className).toContain("md:top-0");
    // The phone's header scrolls with its rows: nothing sticks below md.
    expect(h.className.split(" ")).not.toContain("sticky");
    // Stuck, it looks as at rest: its fill and its rule, nothing added.
    expect(head("Colin").className).toContain("bg-[color:var(--elevated)]");
    expect(head("Colin").className).not.toMatch(/shadow/);
  });
});

describe("the spare key while friends' spares are read", () => {
  it("names the spare glyph in By card before the read lands", async () => {
    fetchMock.mockImplementation((url: string) =>
      url.startsWith("/api/spare-requests") ? Promise.resolve({ ok: true, json: async () => ({ asks: [] }) }) : new Promise(() => {}));
    await mount();
    expect(screen.getByTestId("spare-key")).toBeTruthy();
  });

  it("leaves once the read lands with no spare", async () => {
    served = { spares: [], asks: [] };
    await mount();
    expect(screen.queryByTestId("spare-key")).toBeNull();
  });
});

describe("a line bought in By friend", () => {
  it("keeps its held slot in each panel it sat in, and the view stays By friend", async () => {
    bought.loadPrintingChoices.mockResolvedValue([{
      scryfallId: "a0000000-0000-4000-8000-000000000000", setCode: "cmm", setName: "Commander Masters",
      collectorNumber: "400", releasedAt: "2023-08-04", imageUri: null, flavorName: null,
      finishes: ["nonfoil"], owned: { nonfoil: 0 },
    }]);
    bought.markBoughtForDecks.mockResolvedValue({ applied: { id: "e1", receipt: { covered: [], still: [] } } });
    // Jace is the only line with a spare: once it is bought and gone, nothing else holds the view up.
    served = { spares: [spare(JACE, "Colin"), spare(JACE, "Max", 1, ["Cube night"])], asks: [] };
    const props = { provenance, socialFriends: true, spareAsks: true, buyEnabled: true, initialView: "friend" as const };
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<CartView cart={cart()} {...props} />); });
    const tag = within(lineIn("Colin", "Jace")).getByRole("button", { name: gotItCopy.row.tagAria("Jace, Multiverse Architect") });
    fireEvent.click(tag);
    const add = await screen.findByRole("button", { name: /^Add/ });
    await act(async () => { fireEvent.click(add); });
    const after = cart();
    after.lines = after.lines.filter((l) => l.oracleId !== JACE);
    // The next spares read asks for the lines left, so it serves nothing for Jace.
    served = { spares: [], asks: [] };
    await act(async () => { view.rerender(<CartView cart={after} {...props} />); });
    expect(fetchMock.mock.calls.map((c) => String(c[0])).filter((u) => u.startsWith("/api/friend-spares")).length).toBeGreaterThan(1);
    expect(panels().map((p) => p.getAttribute("data-friend"))).toEqual(["p-Colin", "p-Max"]);
    for (const name of ["Colin", "Max"]) {
      const slot = panel(name).getAllByRole("listitem").find((li) => li.hasAttribute("data-held-slot"))!;
      expect(slot.textContent).toContain(gotItCopy.slot.held("Jace, Multiverse Architect"));
    }
  });
});

describe("By friend's line", () => {
  it("reads Requested, Ask instead, Ask, Accepted and Declined by the modal's rule", async () => {
    served = {
      spares: [...BOARD, spare(GISA, "Dee")],
      asks: [ask(JACE, "Colin", "open"), ask(GISA, "Peter", "yes"), ask(GISA, "Dee", "no")],
    };
    await mount({ initialView: "friend" });
    expect(within(lineIn("Colin", "Jace")).getByTestId("friend-spare-status").textContent).toBe(r.requested);
    expect(within(lineIn("Max", "Jace")).getByTestId("friend-spare-ask").textContent).toBe(r.askInstead);
    expect(within(lineIn("Colin", "Brainstorm")).getByTestId("friend-spare-ask").textContent).toBe(r.ask);
    expect(within(lineIn("Peter", "Ghoulcaller")).getByTestId("friend-spare-status").textContent).toBe(`✓${r.accepted}`);
    expect(within(lineIn("Dee", "Ghoulcaller")).getByTestId("friend-spare-status").textContent).toBe(r.declined);
  });

  it("asks for the line's copies, for no one deck, and reads Requested", async () => {
    served = { spares: BOARD, asks: [] };
    actions.askSpareAction.mockResolvedValue({ ok: true, id: "new-1" });
    await mount({ initialView: "friend" });
    const press = within(lineIn("Colin", "Brainstorm")).getByTestId("friend-spare-ask");
    expect(press.getAttribute("aria-label")).toBe(r.askAria("Colin", "Brainstorm"));
    await act(async () => { fireEvent.click(press); });
    expect(actions.askSpareAction).toHaveBeenCalledWith({ friendPublicId: "p-Colin", oracleId: BRAIN, copies: 2, deckId: null, standalone: false });
    expect(within(lineIn("Colin", "Brainstorm")).getByTestId("friend-spare-status").textContent).toBe(r.requested);
    expect(document.activeElement).toBe(within(lineIn("Colin", "Brainstorm")).getByTestId("friend-spare-status"));
  });

  it("moves the open ask with Ask instead, and the other friend's line then offers Ask instead", async () => {
    served = { spares: BOARD, asks: [ask(JACE, "Colin", "open")] };
    actions.askInsteadAction.mockResolvedValue({ ok: true, id: "new-2" });
    await mount({ initialView: "friend" });
    await act(async () => { fireEvent.click(within(lineIn("Max", "Jace")).getByTestId("friend-spare-ask")); });
    expect(actions.askInsteadAction).toHaveBeenCalledWith({
      friendPublicId: "p-Max", oracleId: JACE, copies: 1, deckId: null, standalone: false, fromRequestId: `req-Colin-11-open`,
    });
    expect(within(lineIn("Max", "Jace")).getByTestId("friend-spare-status").textContent).toBe(r.requested);
    expect(within(lineIn("Colin", "Jace")).getByTestId("friend-spare-ask").textContent).toBe(r.askInstead);
  });

  it("toasts a failed ask and leaves the line as it was", async () => {
    served = { spares: BOARD, asks: [] };
    actions.askSpareAction.mockResolvedValue({ ok: false, reason: "gone" });
    await mount({ initialView: "friend" });
    await act(async () => { fireEvent.click(within(lineIn("Peter", "Ghoulcaller")).getByTestId("friend-spare-ask")); });
    expect(screen.getByRole("alert").textContent).toContain("We couldn’t send that. Try again.");
    expect(within(lineIn("Peter", "Ghoulcaller")).getByTestId("friend-spare-ask").textContent).toBe(r.ask);
  });
});

describe("a `?view=friend` arrival", () => {
  it("draws By card until a line has a spare to draw", async () => {
    served = { spares: [], asks: [] };
    await mount({ initialView: "friend" });
    expect(panels()).toHaveLength(0);
    expect(screen.getByText(copy.result.byCardNoSpare(4))).toBeTruthy();
    expect(list().getAllByRole("listitem")).toHaveLength(4);
  });

  it("draws By card with spare requests off", async () => {
    served = { spares: BOARD, asks: [] };
    await mount({ initialView: "friend", spareAsks: false });
    expect(panels()).toHaveLength(0);
    expect(list().getAllByTestId("other-ways").length).toBeGreaterThan(0);
  });
});

describe("By friend's status (v2 G2, G5)", () => {
  const lines = [{ oracleId: "a" }, { oracleId: "b" }] as never[];
  const group = [{}] as never[];
  it("is groups whenever a line has a spare, even with a read still out or failed", () => {
    expect(byFriendStatus(group, lines, new Set(["a"]), new Set(["a"]))).toBe("groups");
  });
  it("is reading while a drawn line's spares have not landed", () => {
    expect(byFriendStatus([], lines, new Set(["a"]), new Set())).toBe("reading");
  });
  it("is failed, never none, once every read landed and one failed", () => {
    expect(byFriendStatus([], lines, new Set(["a", "b"]), new Set(["b"]))).toBe("failed");
  });
  it("is none only when every read landed and none failed", () => {
    expect(byFriendStatus([], lines, new Set(["a", "b"]), new Set())).toBe("none");
  });
});
