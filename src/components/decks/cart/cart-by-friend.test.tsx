// By friend on the all-decks cart (spare requests PR 3c; handoff `design_handoff_the99_spare_requests`, board
// `Cart-By-Friend`): the segment's presence rule, the panels and their order, the line's one element in each state
// (the modal's own `rowAsk`), Ask and Ask instead through the provider's one action path, the failure toast, the key,
// the fallback to By card with spare requests off, and v2's reading, empty and failed states (PR 7).
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
const { byFriendStatus, groupByFriend, spareReadStatus } = await import("./cart-by-friend");
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { socialCopy, spareCopy } from "../../../lib/copy/social";
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
/** `fail`: the spares route answers 500, a failed read (addendum R2 B2). */
let served: { spares: unknown[]; asks: AskStateLine[]; fail?: boolean } = { spares: [], asks: [] };
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) =>
    url.startsWith("/api/spare-requests")
      ? { ok: true, json: async () => ({ asks: served.asks }) }
      : served.fail ? { ok: false, json: async () => null } : { ok: true, json: async () => ({ spares: served.spares }) });
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

  it("is drawn from first paint, before the read lands and when it lands with no spare (v2 G2)", async () => {
    fetchMock.mockImplementation((url: string) =>
      url.startsWith("/api/spare-requests") ? Promise.resolve({ ok: true, json: async () => ({ asks: [] }) }) : new Promise(() => {}));
    await mount();
    expect(screen.getByRole("radio", { name: copy.view.byFriend })).toBeTruthy();
    cleanup();
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("/api/spare-requests") ? { ok: true, json: async () => ({ asks: [] }) } : { ok: true, json: async () => ({ spares: [] }) });
    await mount();
    expect(screen.getByRole("radio", { name: copy.view.byFriend })).toBeTruthy();
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

  it("stays when the last selected line with a spare is unselected, and the view says none (Empty-One B)", async () => {
    served = { spares: [spare(GISA, "Peter")], asks: [] };
    await mount({ initialView: "friend" });
    expect(panels()).toHaveLength(1);
    // Gisa is Thopter Works' alone: unselecting it leaves no line with a spare.
    fireEvent.click(screen.getByRole("checkbox", { name: copy.selections.aria("Thopter Works", true) }));
    expect(screen.getByRole("radio", { name: copy.view.byFriend }).getAttribute("aria-checked")).toBe("true");
    expect(panels()).toHaveLength(0);
    expect(screen.getByTestId("cart-by-friend-empty").getAttribute("data-kind")).toBe("none");
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
    expect(lineIn("Colin", "Brainstorm").className.split(/\s+/)).toContain("px-[14px]");
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

  it("keeps focus clear of the stuck header, and the folded header's focus ring inside its clipped panel", async () => {
    served = { spares: BOARD, asks: [] };
    await mount({ initialView: "friend" });
    // The list box reserves the header's 53px for focus scrolling, so a tabbed-to row never parks beneath it.
    const box = screen.getByRole("region", { name: copy.list.regionAria });
    expect(box.className.split(/\s+/)).toContain("md:scroll-pt-[53px]");
    // The panel clips, so the header's ring draws inside the button rather than past its edge.
    expect(head("Colin").className.split(/\s+/)).toContain("focus-visible:-outline-offset-2");
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
  it("draws By friend's own reading state, never By card, before the read lands (Loading C)", async () => {
    fetchMock.mockImplementation((url: string) =>
      url.startsWith("/api/spare-requests") ? Promise.resolve({ ok: true, json: async () => ({ asks: [] }) }) : new Promise(() => {}));
    await mount({ initialView: "friend" });
    expect(screen.getByRole("radio", { name: copy.view.byFriend }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getAllByTestId("friend-panel-skeleton")).toHaveLength(2);
    expect(list().queryAllByText("Brainstorm")).toHaveLength(0);
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

// v2 PR 7: Loading A to D, Empty-One B and C, and addendum R2's failed read (B2), By card's, By deck's and By friend's.
describe("reading, empty and failed states (PR 7)", () => {
  /** The spares read never lands; the asks do. */
  const hold = () => fetchMock.mockImplementation((url: string) =>
    url.startsWith("/api/spare-requests") ? Promise.resolve({ ok: true, json: async () => ({ asks: [] }) }) : new Promise(() => {}));
  const sparesCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/friend-spares")).length;
  const rows = () => list().getAllByRole("listitem").filter((li) => li.hasAttribute("data-cart-row"));

  it("By card while reading: every row's spare cell is the breathing bar, the column keeps its width, buy is live (Loading A, B)", async () => {
    hold();
    await mount();
    expect(rows()).toHaveLength(4);
    for (const li of rows()) {
      const bar = within(li).getByTestId("spare-skeleton");
      expect(bar.className.split(/\s+/)).toEqual(expect.arrayContaining(["anim-skeleton", "bg-[color:var(--elevated)]", "w-[74px]", "xl:w-[58px]"]));
      expect(li.querySelector('[data-fact="spare"]')!.getAttribute("aria-hidden")).toBe("true");
    }
    expect(document.querySelector('[data-cart-columns="card"]')!.textContent).toContain(copy.columns.spares);
    // The result line's reading clause, Loading A's `.rln .rd`: mono 11, a 7px gap, the 6px `--fact` dot at .8.
    const cluster = screen.getByText(copy.result.reading);
    expect(cluster.className.split(/\s+/)).toEqual(expect.arrayContaining(["gap-[7px]", "text-[11px]", "text-[color:var(--fg-faint)]"]));
    expect(cluster.querySelector("[aria-hidden]")!.className.split(/\s+/)).toEqual(expect.arrayContaining(["h-[6px]", "bg-[color:var(--fact)]", "opacity-80"]));
    // Buy works from the first paint: every row's tag is a press.
    expect(screen.getAllByRole("button", { name: gotItCopy.row.tagAria("Brainstorm") })).toHaveLength(1);
  });

  it("By card: a row's bar gives way to its spare, or to nothing, as the read lands", async () => {
    served = { spares: [spare(GISA, "Peter")], asks: [] };
    await mount();
    expect(screen.queryAllByTestId("spare-skeleton")).toHaveLength(0);
    expect(rows().filter((li) => li.querySelector('[data-fact="spare"]'))).toHaveLength(1);
    expect(screen.queryByText(copy.result.reading)).toBeNull();
  });

  it("By friend while reading: skeleton panels in the panel's shape, under its column header, the sentence its own (Loading C, D)", async () => {
    hold();
    await mount({ initialView: "friend" });
    const skeletons = screen.getAllByTestId("friend-panel-skeleton");
    expect(skeletons.map((p) => p.querySelectorAll("li").length)).toEqual([3, 2]);
    expect(screen.getByTestId("cart-by-friend-reading").className).toContain("anim-skeleton");
    expect(screen.getByTestId("cart-by-friend-reading").getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector('[data-cart-columns="friend"]')).toBeTruthy();
    expect(screen.getByText(copy.result.readingByFriend)).toBeTruthy();
    expect(screen.queryByText(copy.result.reading)).toBeNull();
  });

  it("By friend, none: the dashed block says what a spare is, with no press and no column header (Empty-One B)", async () => {
    served = { spares: [], asks: [] };
    await mount({ initialView: "friend" });
    const block = screen.getByTestId("cart-by-friend-empty");
    expect(block.getAttribute("data-kind")).toBe("none");
    expect(within(block.parentElement!).getByRole("heading", { name: copy.byFriend.noneTitle })).toBeTruthy();
    expect(within(block.parentElement!).getByText(copy.byFriend.noneBody(4))).toBeTruthy();
    expect(within(block.parentElement!).queryAllByRole("button")).toHaveLength(0);
    expect(within(block.parentElement!).queryAllByRole("link")).toHaveLength(0);
    expect(document.querySelector("[data-cart-columns]")).toBeNull();
    expect(screen.getByText(copy.result.byFriend(0, 0))).toBeTruthy();
  });

  it("By friend with no friends: one press, Go to Friends, decided by the friend count, reading or not (Empty-One C)", async () => {
    served = { spares: [], asks: [] };
    await mount({ initialView: "friend", hasFriends: false });
    const block = screen.getByTestId("cart-by-friend-empty").parentElement!;
    expect(within(block).getByRole("heading", { name: socialCopy.friends.emptyTitle })).toBeTruthy();
    expect(within(block).getByText(copy.byFriend.noFriendsBody)).toBeTruthy();
    expect(within(block).getByRole("link", { name: copy.byFriend.toFriends }).getAttribute("href")).toBe("/friends");
    cleanup();
    hold();
    await mount({ initialView: "friend", hasFriends: false });
    expect(screen.queryAllByTestId("friend-panel-skeleton")).toHaveLength(0);
    expect(screen.getByTestId("cart-by-friend-empty").getAttribute("data-kind")).toBe("noFriends");
    // The sentence follows the block: `0 friends`, never the reading sentence over Empty-One C.
    expect(screen.getByText(copy.result.byFriend(0, 0))).toBeTruthy();
    expect(screen.queryByText(copy.result.readingByFriend)).toBeNull();
  });

  it("By card, failed: the toast with Try again, the spare column closed, no key item, no spare clause (R2 A, B)", async () => {
    served = { spares: [], asks: [], fail: true };
    await mount();
    expect(screen.getByRole("alert").textContent).toContain(copy.failedRead.toast);
    expect(within(screen.getByRole("alert")).getByRole("button", { name: copy.failedRead.retry })).toBeTruthy();
    const columns = document.querySelector('[data-cart-columns="card"]')!;
    expect(columns.className).toContain("xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.75fr)_0px_minmax(0,1.3fr)_100px]");
    expect(columns.textContent).not.toContain(copy.columns.spares);
    for (const li of rows()) {
      expect(li.className).toContain("xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.75fr)_0px_minmax(0,1.3fr)_100px]");
      expect(li.querySelector('[data-fact="spare"]')).toBeNull();
    }
    expect(screen.queryByTestId("spare-key")).toBeNull();
    expect(screen.getByText(copy.result.byCardNoSpare(4))).toBeTruthy();
    expect(screen.queryByText(copy.result.reading)).toBeNull();
  });

  it("By card, one batch of the read failed: the column closes for every row, a landed spare included, and says nothing of it", async () => {
    // Past one batch (200 cards): Gisa's batch lands with Peter's spare, the next one fails.
    const extra = Array.from({ length: 201 }, (_, i) => ({
      oracleId: `9${String(i).padStart(7, "0")}-0000-4000-8000-000000000000`, name: `Filler ${i}`, commander: false, owned: 0,
      heldElsewhere: 0, heldBy: [], rows: [row("thopter", 10)],
    }));
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("/api/spare-requests")
        ? { ok: true, json: async () => ({ asks: [] }) }
        : url.includes(GISA) ? { ok: true, json: async () => ({ spares: [spare(GISA, "Peter")] }) } : { ok: false, json: async () => null });
    await mount({}, cart({ lines: [...cart().lines, ...extra] }));
    expect(screen.getByRole("alert").textContent).toContain(copy.failedRead.toast);
    expect(rows().filter((li) => li.querySelector('[data-fact="spare"]'))).toHaveLength(0);
    expect(screen.queryByTestId("spare-key")).toBeNull();
    expect(screen.getByText(copy.result.byCardNoSpare(205))).toBeTruthy();
    // 205 rows: past the suite's 5s under a full run's load.
  }, 20_000);

  it("By card, failed: Try again reads again, back to the bars, and the column returns once it lands", async () => {
    served = { spares: [], asks: [], fail: true };
    await mount();
    const before = sparesCalls();
    hold();
    await act(async () => { fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: copy.failedRead.retry })); });
    expect(sparesCalls()).toBe(before + 1);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getAllByTestId("spare-skeleton")).toHaveLength(4);
    expect(document.querySelector('[data-cart-columns="card"]')!.textContent).toContain(copy.columns.spares);
    cleanup();
    served = { spares: [], asks: [], fail: true };
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("/api/spare-requests")
        ? { ok: true, json: async () => ({ asks: [] }) }
        : served.fail ? { ok: false, json: async () => null } : { ok: true, json: async () => ({ spares: served.spares }) });
    await mount();
    served = { spares: [spare(GISA, "Peter")], asks: [] };
    await act(async () => { fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: copy.failedRead.retry })); });
    expect(rows().filter((li) => li.querySelector('[data-fact="spare"]'))).toHaveLength(1);
    expect(screen.getByTestId("spare-key")).toBeTruthy();
    expect(screen.getByText(copy.result.byCard(4, 1))).toBeTruthy();
  });

  it("By deck, failed: the same toast, and each open group's header and rows close the spare column", async () => {
    served = { spares: [], asks: [], fail: true };
    await mount({ initialView: "deck", focusDeckId: "thopter" });
    expect(screen.getByRole("alert").textContent).toContain(copy.failedRead.toast);
    const closed = "xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.75fr)_0px_minmax(0,1.3fr)_100px]";
    expect(document.querySelector('[data-cart-columns="deck"]')!.className).toContain(closed);
    // The open group's rows close it too: the closed grid, never the spare column's, and no spare cell.
    const deckRows = [...document.querySelectorAll("[data-cart-row]")];
    expect(deckRows.length).toBeGreaterThan(0);
    for (const li of deckRows) {
      expect(li.className).toContain(closed);
      expect(li.className).not.toContain("xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.55fr)_minmax(0,1.1fr)_minmax(0,1.15fr)_100px]");
      expect(li.querySelector('[data-fact="spare"]')).toBeNull();
    }
  });

  it("By friend, failed: the dashed block with Try again in the list's place, and no toast (R2 C, D)", async () => {
    served = { spares: [], asks: [], fail: true };
    await mount({ initialView: "friend" });
    expect(screen.queryByRole("alert")).toBeNull();
    const block = screen.getByTestId("cart-by-friend-empty");
    expect(block.getAttribute("data-kind")).toBe("failed");
    expect(within(block.parentElement!).getByRole("heading", { name: copy.failedRead.title })).toBeTruthy();
    expect(within(block.parentElement!).getByText(copy.failedRead.body)).toBeTruthy();
    expect(screen.getByRole("radio", { name: copy.view.byFriend }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(copy.result.failedByFriend)).toBeTruthy();
    // Try again goes back to the reading state, and the panels draw once the read lands.
    served = { spares: BOARD, asks: [] };
    await act(async () => { fireEvent.click(within(block.parentElement!).getByRole("button", { name: copy.failedRead.retry })); });
    expect(panels()).toHaveLength(4);
  });

  it("says one failure once: the toast in By card is not repeated after By friend, nor raised by By friend's block", async () => {
    served = { spares: [], asks: [], fail: true };
    await mount();
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byFriend }));
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byCard }));
    expect(screen.queryByRole("alert")).toBeNull();
    cleanup();
    await mount({ initialView: "friend" });
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byCard }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("the spares read as a whole (B2)", () => {
  it("is reading while any card's read is out, failed once all landed and one failed, landed otherwise", () => {
    expect(spareReadStatus(["a", "b"], new Set(["a"]), new Set(["a"]))).toBe("reading");
    expect(spareReadStatus(["a", "b"], new Set(["a", "b"]), new Set(["b"]))).toBe("failed");
    expect(spareReadStatus(["a", "b"], new Set(["a", "b"]), new Set(["c"]))).toBe("landed");
  });
});

// Copilot round 1 on #2349: a purchase while the read is out or after it failed, and a failure By friend's panels hide.
describe("a purchase, a partial failure and a retry (PR 7, round 1)", () => {
  const props = { provenance, socialFriends: true, spareAsks: true, buyEnabled: true };
  async function buyJace() {
    bought.loadPrintingChoices.mockResolvedValue([{
      scryfallId: "a0000000-0000-4000-8000-000000000000", setCode: "cmm", setName: "Commander Masters",
      collectorNumber: "400", releasedAt: "2023-08-04", imageUri: null, flavorName: null,
      finishes: ["nonfoil"], owned: { nonfoil: 0 },
    }]);
    bought.markBoughtForDecks.mockResolvedValue({ applied: { id: "e1", receipt: { covered: [], still: [] } } });
    fireEvent.click(list().getByRole("button", { name: gotItCopy.row.tagAria("Jace, Multiverse Architect") }));
    const add = await screen.findByRole("button", { name: /^Add/ });
    await act(async () => { fireEvent.click(add); });
  }
  const withoutJace = () => {
    const after = cart();
    after.lines = after.lines.filter((l) => l.oracleId !== JACE);
    return after;
  };

  it("a card bought before the read lands never holds By friend on its skeleton", async () => {
    // The first read (every card) never lands; the one after the purchase (the rest) lands with no spare.
    let calls = 0;
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith("/api/spare-requests")) return Promise.resolve({ ok: true, json: async () => ({ asks: [] }) });
      calls += 1;
      return calls === 1 ? new Promise(() => {}) : Promise.resolve({ ok: true, json: async () => ({ spares: [] }) });
    });
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<CartView cart={cart()} {...props} />); });
    await buyJace();
    await act(async () => { view.rerender(<CartView cart={withoutJace()} {...props} />); });
    expect(calls).toBe(2);
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byFriend }));
    expect(screen.queryAllByTestId("friend-panel-skeleton")).toHaveLength(0);
    expect(screen.getByTestId("cart-by-friend-empty").getAttribute("data-kind")).toBe("none");
    expect(screen.queryByText(copy.result.readingByFriend)).toBeNull();
  });

  it("a failed card bought before Try again never holds By friend on its skeleton", async () => {
    served = { spares: [], asks: [], fail: true };
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<CartView cart={cart()} {...props} />); });
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      await buyJace();
      await act(async () => { view.rerender(<CartView cart={withoutJace()} {...props} />); });
      served = { spares: [], asks: [] };
      // The failure waits under the purchase's receipt (round 2): let the receipt close first.
      await act(async () => { vi.advanceTimersByTime(9_000); });
      await act(async () => { fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: copy.failedRead.retry })); });
      fireEvent.click(screen.getByRole("radio", { name: copy.view.byFriend }));
      expect(screen.queryAllByTestId("friend-panel-skeleton")).toHaveLength(0);
      expect(screen.getByTestId("cart-by-friend-empty").getAttribute("data-kind")).toBe("none");
    } finally {
      vi.useRealTimers();
    }
  });

  it("a partial failure behind By friend's panels is said by By card's toast, never marked said by the panels", async () => {
    const extra = Array.from({ length: 201 }, (_, i) => ({
      oracleId: `9${String(i).padStart(7, "0")}-0000-4000-8000-000000000000`, name: `Filler ${i}`, commander: false, owned: 0,
      heldElsewhere: 0, heldBy: [], rows: [row("thopter", 10)],
    }));
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("/api/spare-requests")
        ? { ok: true, json: async () => ({ asks: [] }) }
        : url.includes(GISA) ? { ok: true, json: async () => ({ spares: [spare(GISA, "Peter")] }) } : { ok: false, json: async () => null });
    await mount({ initialView: "friend" }, cart({ lines: [...cart().lines, ...extra] }));
    expect(panels()).toHaveLength(1);
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byCard }));
    expect(screen.getByRole("alert").textContent).toContain(copy.failedRead.toast);
  }, 20_000);

  it("a search that leaves nothing in By friend does not mark the failure said", async () => {
    served = { spares: [], asks: [], fail: true };
    await mount({ initialView: "friend", initialQuery: "zzzz" });
    expect(screen.queryByTestId("cart-by-friend-empty")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byCard }));
    expect(screen.getByRole("alert").textContent).toContain(copy.failedRead.toast);
  });
});

// Copilot round 2 on #2349: the toast's Try again is the provider's live retry, and the failure waits for the receipt.
describe("the failure toast beside a purchase (PR 7, round 2)", () => {
  const props = { provenance, socialFriends: true, spareAsks: true, buyEnabled: true };
  const failure = () => screen.queryAllByRole("alert").find((el) => el.textContent?.includes(copy.failedRead.toast)) ?? null;
  afterEach(() => { vi.useRealTimers(); });
  async function buyJace() {
    bought.loadPrintingChoices.mockResolvedValue([{
      scryfallId: "a0000000-0000-4000-8000-000000000000", setCode: "cmm", setName: "Commander Masters",
      collectorNumber: "400", releasedAt: "2023-08-04", imageUri: null, flavorName: null,
      finishes: ["nonfoil"], owned: { nonfoil: 0 },
    }]);
    bought.markBoughtForDecks.mockResolvedValue({ applied: { id: "e1", receipt: { covered: [], still: [] } } });
    fireEvent.click(list().getByRole("button", { name: gotItCopy.row.tagAria("Jace, Multiverse Architect") }));
    const add = await screen.findByRole("button", { name: /^Add/ });
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    await act(async () => { fireEvent.click(add); });
  }
  const withoutJace = () => {
    const after = cart();
    after.lines = after.lines.filter((l) => l.oracleId !== JACE);
    return after;
  };

  it("Try again is the provider's live retry: a card whose read failed after the toast went up reads again too", async () => {
    // Past one batch (200 cards): Gisa's batch lands, the next one fails, and the toast goes up.
    const extra = Array.from({ length: 201 }, (_, i) => ({
      oracleId: `9${String(i).padStart(7, "0")}-0000-4000-8000-000000000000`, name: `Filler ${i}`, commander: false, owned: 0,
      heldElsewhere: 0, heldBy: [], rows: [row("thopter", 10)],
    }));
    let reads = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/spare-requests")) return { ok: true, json: async () => ({ asks: [] }) };
      reads += 1;
      // The first read: Gisa's batch lands. Every read after it fails, Gisa's batch too.
      return reads === 1 && url.includes(GISA) ? { ok: true, json: async () => ({ spares: [] }) } : { ok: false, json: async () => null };
    });
    const full = cart({ lines: [...cart().lines, ...extra] });
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<CartView cart={full} {...props} />); });
    expect(failure()).toBeTruthy();
    // A card leaves the list: every card is read again, and this time Gisa's batch fails too, the toast still up.
    await act(async () => { view.rerender(<CartView cart={{ ...full, lines: full.lines.filter((l) => l.oracleId !== JACE) }} {...props} />); });
    expect(failure()).toBeTruthy();
    fetchMock.mockImplementation((url: string) =>
      url.startsWith("/api/spare-requests") ? Promise.resolve({ ok: true, json: async () => ({ asks: [] }) }) : new Promise(() => {}));
    await act(async () => { fireEvent.click(within(failure()!).getByRole("button", { name: copy.failedRead.retry })); });
    expect(screen.getAllByTestId("spare-skeleton")).toHaveLength(204);
  }, 30_000);

  it("a toast up when a purchase lands waits under the receipt, and shows again once the receipt closes", async () => {
    served = { spares: [], asks: [], fail: true };
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<CartView cart={cart()} {...props} />); });
    expect(failure()).toBeTruthy();
    await buyJace();
    await act(async () => { view.rerender(<CartView cart={withoutJace()} {...props} />); });
    const receipt = () => screen.queryAllByRole("status").find((el) => el.textContent?.includes("Jace, Multiverse Architect added")) ?? null;
    expect(receipt()).toBeTruthy();
    expect(failure()).toBeNull();
    await act(async () => { vi.advanceTimersByTime(9_000); });
    expect(receipt()).toBeNull();
    expect(failure()).toBeTruthy();
  });

  it("a failure that landed under the receipt is not counted said by a view switch before it ever showed", async () => {
    let calls = 0;
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith("/api/spare-requests")) return Promise.resolve({ ok: true, json: async () => ({ asks: [] }) });
      calls += 1;
      return calls === 1 ? new Promise(() => {}) : Promise.resolve({ ok: false, json: async () => null });
    });
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<CartView cart={cart()} {...props} />); });
    await buyJace();
    await act(async () => { view.rerender(<CartView cart={withoutJace()} {...props} />); });
    // A search that leaves nothing, so By friend draws its no-match block and says nothing of the failure.
    fireEvent.change(document.querySelector("input[type=search]")!, { target: { value: "zzzz" } });
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byFriend }));
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byCard }));
    await act(async () => { vi.advanceTimersByTime(9_000); });
    expect(failure()).toBeTruthy();
  });

  it("a failure that lands while the receipt is up is said only once the receipt closes", async () => {
    // The first read (every card) never lands; the one after the purchase fails while the receipt is up.
    let calls = 0;
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith("/api/spare-requests")) return Promise.resolve({ ok: true, json: async () => ({ asks: [] }) });
      calls += 1;
      return calls === 1 ? new Promise(() => {}) : Promise.resolve({ ok: false, json: async () => null });
    });
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(<CartView cart={cart()} {...props} />); });
    await buyJace();
    await act(async () => { view.rerender(<CartView cart={withoutJace()} {...props} />); });
    expect(calls).toBe(2);
    expect(failure()).toBeNull();
    await act(async () => { vi.advanceTimersByTime(9_000); });
    expect(failure()).toBeTruthy();
  });
});
