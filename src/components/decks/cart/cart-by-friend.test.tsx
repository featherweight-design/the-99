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
import { named } from "../../../lib/person-name/mint";
import { plain } from "../../../lib/person-name/testing";

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

const friend = (name: string, pods = ["Thursday pod"]) => ({ publicId: `p-${name}`, displayName: named(name), commander: null, pods: pods.map((pod) => named(pod)) });
const spare = (oracleId: string, name: string, n = 1, pods?: string[]) => ({ oracleId, friend: friend(name, pods), spare: n });
const ask = (oracleId: string, name: string, state: AskStateLine["state"]): AskStateLine => ({
  id: `req-${name}-${oracleId.slice(0, 2)}-${state}`, oracleId, holder: { publicId: `p-${name}`, displayName: named(name) }, state,
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
    expect(groups.map((g) => [plain(g.friend.displayName), g.spares])).toEqual([["Zed", 3], ["Ana", 2], ["Bo", 1]]);
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
    expect(head("Colin").getAttribute("aria-label")).toBe(plain(copy.byFriend.foldAria("Colin", true)));
    fireEvent.click(head("Colin"));
    expect(head("Colin").getAttribute("aria-expanded")).toBe("false");
    expect(head("Colin").getAttribute("aria-label")).toBe(plain(copy.byFriend.foldAria("Colin", false)));
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
    expect(press.getAttribute("aria-label")).toBe(plain(r.askAria("Colin", "Brainstorm")));
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

describe("the Friend filter (v2 PR 9)", () => {
  // Sol Ring: a card no friend has a spare of, so Any friend has something to leave out.
  const SOL = "55555555-5555-4555-8555-555555555555";
  const withSol = () => cart({ lines: [...cart().lines, { oracleId: SOL, name: "Sol Ring", commander: false, owned: 0, heldElsewhere: 0, heldBy: [], rows: [row("thopter", 150)] }] });
  const cardNames = () => list().getAllByRole("listitem").map((li) => li.textContent?.match(/Jace|Brainstorm|Ghoulcaller Gisa|Command Tower|Sol Ring/)?.[0]);
  const resultLine = () => document.querySelector("[data-chassis-row='result'] p")?.textContent;
  const original = window.matchMedia;
  const wide = () => Object.defineProperty(window, "matchMedia", {
    writable: true, configurable: true,
    value: (query: string) => ({ matches: true, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
  });
  afterEach(() => Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: original }));

  it("offers Any friend and each friend with a spare and their counts; a pick narrows every view, and its chip turns it off", async () => {
    served = { spares: BOARD, asks: [] };
    wide();
    await mount({}, withSol());
    fireEvent.click(screen.getByRole("button", { name: "Friend filter" }));
    // Most cards first, then by name: Colin holds two of the drawn cards, the others one each.
    expect(screen.getAllByRole("option").map((o) => o.getAttribute("aria-label"))).toEqual([
      "Any friend, 4 cards", "Colin, 2 cards", "Chris, 1 card", "Max, 1 card", "Peter, 1 card",
    ]);
    // Each friend's row draws their face.
    expect(screen.getAllByRole("option").slice(1).every((o) => o.querySelector("[data-face]"))).toBe(true);
    // Max holds a spare of Jace, which Colin holds one of too.
    fireEvent.click(screen.getByRole("option", { name: "Max, 1 card" }));
    expect(cardNames()).toEqual(["Jace"]);
    expect(resultLine()).toBe(copy.result.filtered(1, 5));
    expect(window.location.search).toBe("?friend=p-Max");
    expect(screen.getByRole("button", { name: /^Friend options, Max/ }).textContent).toContain(`${copy.filters.friend}: Max`);
    // Carried to By friend (D4), where only Max's panel is left, not Colin's over the same card (Controls C2).
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byFriend }));
    expect(panels().map((p) => p.getAttribute("data-friend"))).toEqual(["p-Max"]);
    // The one chip's ✕ turns the filter off: every panel, every line.
    fireEvent.click(screen.getByRole("button", { name: `Remove filter: ${copy.filters.chipFriend} Max` }));
    expect(panels()).toHaveLength(4);
    expect(window.location.search).toBe("?view=friend");
  });

  it("opens on ?friend=any: the lines some friend has a spare of, with the Any friend chip", async () => {
    served = { spares: BOARD, asks: [] };
    window.history.replaceState(null, "", "/decks/shopping?friend=any");
    await mount({ initialFriend: "any" }, withSol());
    expect(cardNames()).not.toContain("Sol Ring");
    expect(cardNames()).toHaveLength(4);
    expect(screen.getByRole("button", { name: `Remove filter: ${copy.filters.chipFriend} ${copy.filters.anyFriend}` })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Filter cards, 1 on" })).toBeTruthy();
    expect(window.location.search).toBe("?friend=any");
  });

  it("drops a named id no friend with a spare answers to, from the filter and the address", async () => {
    served = { spares: BOARD, asks: [] };
    window.history.replaceState(null, "", "/decks/shopping?friend=p-Chris,p-Nobody");
    await mount({ initialFriend: "p-Chris,p-Nobody" }, withSol());
    expect(window.location.search).toBe("?friend=p-Chris");
    expect(cardNames()).toEqual(["Command Tower"]);
    cleanup();
    window.history.replaceState(null, "", "/decks/shopping?friend=p-Nobody");
    await mount({ initialFriend: "p-Nobody" }, withSol());
    expect(window.location.search).toBe("");
    expect(cardNames()).toHaveLength(5);
  });

  const chipsRow = () => document.querySelector("[data-chassis-row='chips']") as HTMLElement;

  it("never shows a public id: a named filter's chip is name-free while the read is out, and named once it lands", async () => {
    let land: (v: unknown) => void = () => {};
    fetchMock.mockImplementation((url: string) =>
      url.startsWith("/api/spare-requests")
        ? Promise.resolve({ ok: true, json: async () => ({ asks: [] }) })
        : new Promise((resolve) => { land = resolve; }));
    window.history.replaceState(null, "", "/decks/shopping?friend=p-Chris");
    await mount({ initialFriend: "p-Chris" });
    expect(chipsRow().textContent).not.toContain("p-Chris");
    expect(within(chipsRow()).getByRole("button", { name: `Remove filter: ${copy.filters.chipFriend} ${copy.filters.friendReading}` })).toBeTruthy();
    await act(async () => { land({ ok: true, json: async () => ({ spares: BOARD }) }); });
    expect(within(chipsRow()).getByRole("button", { name: `Remove filter: ${copy.filters.chipFriend} Chris` })).toBeTruthy();
    expect(chipsRow().textContent).not.toContain("p-Chris");
  });

  it("cuts a Friend chip naming long or many friends for the eye, so its ✕ stays on a phone, and speaks every name", async () => {
    const long = (n: string) => ({ oracleId: TOWER, friend: { ...friend(n), publicId: `p-${n.replace(/ /g, "_")}` }, spare: 1 });
    served = { spares: [long("Bartholomew Featherstonehaugh"), long("Wilhelmina Cholmondeley")], asks: [] };
    window.history.replaceState(null, "", "/decks/shopping?friend=p-Bartholomew_Featherstonehaugh,p-Wilhelmina_Cholmondeley");
    await mount({ initialFriend: "p-Bartholomew_Featherstonehaugh,p-Wilhelmina_Cholmondeley" });
    const whole = "Bartholomew Featherstonehaugh, Wilhelmina Cholmondeley";
    const remove = within(chipsRow()).getByRole("button", { name: `Remove filter: ${copy.filters.chipFriend} ${whole}` });
    const label = remove.parentElement?.querySelector("[aria-hidden='true']:not([class*='fg-muted'])")?.textContent ?? "";
    expect(label.length).toBeLessThanOrEqual(25);
    expect(label.endsWith("…")).toBe(true);
    expect(within(chipsRow()).getByText(`${copy.filters.chipFriend} ${whole}`, { selector: ".sr-only" })).toBeTruthy();
  });

  it("disables a friend pill with none of the drawn cards, as the desktop panel's unavailable rows", async () => {
    served = { spares: BOARD, asks: [] };
    await mount();
    fireEvent.change(screen.getByRole("searchbox", { name: copy.filters.search }), { target: { value: "brainstorm" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter cards" }));
    const pill = (label: string) => within(document.querySelector("[data-friend-pills]") as HTMLElement).getByRole("checkbox", { name: label });
    expect((pill("Colin, 1 card") as HTMLButtonElement).disabled).toBe(false);
    const max = pill("Max, 0 cards") as HTMLButtonElement;
    expect(max.disabled).toBe(true);
    expect(max.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(max);
    expect(max.getAttribute("aria-checked")).toBe("false");
    expect(window.location.search).toBe("?q=brainstorm");
  });

  describe("a purchase under the filter", () => {
    const buyProps = { provenance, socialFriends: true, spareAsks: true, buyEnabled: true };
    async function buyJaceAndReread(initialFriend: string, wideView = false) {
      if (wideView) wide();
      bought.loadPrintingChoices.mockResolvedValue([{
        scryfallId: "a0000000-0000-4000-8000-000000000000", setCode: "cmm", setName: "Commander Masters",
        collectorNumber: "400", releasedAt: "2023-08-04", imageUri: null, flavorName: null,
        finishes: ["nonfoil"], owned: { nonfoil: 0 },
      }]);
      bought.markBoughtForDecks.mockResolvedValue({ applied: { id: "e1", receipt: { covered: [], still: [] } } });
      served = { spares: BOARD, asks: [] };
      window.history.replaceState(null, "", `/decks/shopping?friend=${initialFriend}`);
      let view!: ReturnType<typeof render>;
      await act(async () => { view = render(<CartView cart={cart()} {...buyProps} initialFriend={initialFriend} />); });
      fireEvent.click(list().getByRole("button", { name: gotItCopy.row.tagAria("Jace, Multiverse Architect") }));
      const add = await screen.findByRole("button", { name: /^Add/ });
      await act(async () => { fireEvent.click(add); });
      const after = cart();
      after.lines = after.lines.filter((l) => l.oracleId !== JACE);
      // The next read asks for the lines left, so Jace's spares (Colin's and Max's) are no longer in it.
      served = { spares: BOARD.filter((x) => x.oracleId !== JACE), asks: [] };
      await act(async () => { view.rerender(<CartView cart={after} {...buyProps} initialFriend={initialFriend} />); });
      // Let the purchase's own follow-ups (the receipt, the re-read) settle inside this test.
      await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    }
    const held = () => list().getAllByRole("listitem").filter((li) => li.hasAttribute("data-held-slot"));

    it("keeps a one-friend filter whose last card was bought: its held slot, and no unrelated card back", async () => {
      await buyJaceAndReread("p-Max");
      expect(window.location.search).toBe("?friend=p-Max");
      expect(within(chipsRow()).getByRole("button", { name: `Remove filter: ${copy.filters.chipFriend} Max` })).toBeTruthy();
      expect(held()).toHaveLength(1);
      expect(list().getAllByRole("listitem")).toHaveLength(1);
    });

    // Jace is owned by no one here, so under Max's filter the held slot is a `None` card and the only one drawn.
    it("counts the held slot in Owned's desktop panel, so None stays offered while the slot shows", async () => {
      await buyJaceAndReread("p-Max", true);
      expect(held()).toHaveLength(1);
      fireEvent.click(screen.getByRole("button", { name: /^Owned options, Any, collapsed$/ }));
      expect(screen.getAllByRole("option").map((o) => o.getAttribute("aria-label"))).toEqual(["Any, 1 card", "You own some, no cards", "None, 1 card"]);
      expect(screen.getByRole("option", { name: "None, 1 card" }).getAttribute("aria-disabled")).toBeNull();
      // The result line counts the slot the list draws, against the selected cards and the slot.
      expect(resultLine()).toBe(copy.result.filtered(1, 4));
    });

    it("counts the held slot in the phone sheet's figure and its Show press, through an Owned pick", async () => {
      await buyJaceAndReread("p-Max");
      fireEvent.click(screen.getByRole("button", { name: "Filter cards, 1 on" }));
      const sheet = screen.getByRole("dialog", { name: "Filters" });
      expect(within(sheet).getByText(copy.filters.sheetMatch(1, 4))).toBeTruthy();
      fireEvent.click(within(sheet).getByRole("radio", { name: copy.filters.ownedNone }));
      expect(within(sheet).getByText(copy.filters.sheetMatch(1, 4))).toBeTruthy();
      expect(within(sheet).getByRole("button", { name: copy.filters.show(1) })).toBeTruthy();
      expect(held()).toHaveLength(1);
    });

    it("counts the held slot in no match's way out: dropping the search gives the lines and the slot", async () => {
      await buyJaceAndReread("");
      fireEvent.change(screen.getByRole("searchbox", { name: copy.filters.search }), { target: { value: "zzz" } });
      expect(screen.getByText(copy.noMatch.body("zzz", 4))).toBeTruthy();
      expect(resultLine()).toBe(copy.result.filtered(0, 4));
    });

    // Max's last card (Jace) bought under his filter: By card draws its held slot, By deck no row (a slot has no group),
    // By friend Max's panel holding the slot. Every figure is a count of the rows the view on screen draws (`viewRows`).
    const VIEWS = [
      { view: "card", radio: copy.view.byCard, rows: 1, of: 4, line: copy.result.filtered(1, 4) },
      { view: "deck", radio: copy.view.byDeck, rows: 0, of: 3, line: copy.result.filtered(0, 3) },
      { view: "friend", radio: copy.view.byFriend, rows: 1, of: 4, line: copy.result.byFriend(1, 1) },
    ] as const;
    const drawnRows = (view: string) => {
      if (document.querySelector("[data-cart-no-match]")) return 0;
      if (view === "friend") return new Set(panels().flatMap((p) => p.getAttribute("data-friend") ? within(p).getAllByRole("listitem").map((li) => li.textContent) : [])).size;
      return list().getAllByRole("listitem").length;
    };
    for (const width of ["phone", "desktop"] as const) {
      for (const c of VIEWS) {
        it(`agrees with the rows By ${c.view} draws after the purchase, at ${width} width`, async () => {
          await buyJaceAndReread("p-Max", width === "desktop");
          fireEvent.click(screen.getByRole("radio", { name: c.radio }));
          expect(drawnRows(c.view)).toBe(c.rows);
          expect(resultLine()).toBe(c.line);
          const none = (n: number) => (n === 0 ? "no cards" : n === 1 ? "1 card" : `${n} cards`);
          if (width === "desktop") {
            fireEvent.click(screen.getByRole("button", { name: /^Owned options, Any, collapsed$/ }));
            expect(screen.getAllByRole("option").map((o) => o.getAttribute("aria-label"))).toEqual([
              `Any, ${c.rows === 1 ? "1 card" : `${c.rows} cards`}`, "You own some, no cards", `None, ${none(c.rows)}`,
            ]);
          } else {
            fireEvent.click(screen.getByRole("button", { name: "Filter cards, 1 on" }));
            const sheet = screen.getByRole("dialog", { name: "Filters" });
            expect(within(sheet).getByText(copy.filters.sheetMatch(c.rows, c.of))).toBeTruthy();
            expect(within(sheet).getByRole("button", { name: copy.filters.show(c.rows) })).toBeTruthy();
          }
        });
      }
    }

    it("keeps both friends of a two-friend filter, and the bought card's held slot", async () => {
      await buyJaceAndReread("p-Max,p-Peter");
      expect(window.location.search).toBe("?friend=p-Max%2Cp-Peter");
      expect(within(chipsRow()).getByRole("button", { name: `Remove filter: ${copy.filters.chipFriend} Max, Peter` })).toBeTruthy();
      expect(held()).toHaveLength(1);
      expect(cardNames()).toContain("Ghoulcaller Gisa");
    });
  });

  it("drops a named friend once their spares sit only on unselected decks' lines, rather than naming them by id", async () => {
    served = { spares: BOARD, asks: [] };
    window.history.replaceState(null, "", "/decks/shopping?friend=p-Chris");
    await mount({ initialFriend: "p-Chris" });
    expect(cardNames()).toEqual(["Command Tower"]);
    // Command Tower is Thopter Works' alone, and Chris holds a spare of nothing else.
    fireEvent.click(screen.getByRole("checkbox", { name: copy.selections.aria("Thopter Works", true) }));
    expect(chipsRow().textContent).not.toContain("p-Chris");
    expect(screen.queryByRole("button", { name: /Remove filter: Friend/ })).toBeNull();
    expect(window.location.search).toBe("");
    expect(cardNames()).toEqual(["Brainstorm"]);
  });

  it("draws the desktop trigger dashed, reading…, while the read is out, and the sheet's group the same", async () => {
    fetchMock.mockImplementation((url: string) =>
      url.startsWith("/api/spare-requests") ? Promise.resolve({ ok: true, json: async () => ({ asks: [] }) }) : new Promise(() => {}));
    wide();
    await mount();
    const reading = document.querySelector("[data-friend-reading]") as HTMLElement;
    expect(reading.textContent).toBe(`${copy.filters.friend}${copy.filters.friendReading}`);
    expect(reading.className).toContain("border-dashed");
    expect(screen.queryByRole("button", { name: "Friend filter" })).toBeNull();
    cleanup();
    Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: original });
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Filter cards" }));
    const group = screen.getByRole("group", { name: copy.filters.friendHead });
    expect(within(group).getByText(copy.filters.friendReading)).toBeTruthy();
    expect(within(group).queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("hides the trigger after a failed read, and leaves an arriving ?friend inert rather than claiming no card matches", async () => {
    served = { spares: [], asks: [], fail: true };
    window.history.replaceState(null, "", "/decks/shopping?friend=p-Chris");
    wide();
    await mount({ initialFriend: "p-Chris" });
    expect(document.querySelector("[data-friend-reading]")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Friend/ })).toBeNull();
    expect(cardNames()).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /Remove filter: Friend/ })).toBeNull();
    // Kept for a Try again that lands.
    expect(window.location.search).toBe("?friend=p-Chris");
  });

  it("has no trigger and no sheet group when no friend has a spare", async () => {
    served = { spares: [], asks: [] };
    wide();
    await mount();
    expect(screen.queryByRole("button", { name: /^Friend/ })).toBeNull();
    expect(document.querySelector("[data-friend-reading]")).toBeNull();
    cleanup();
    Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: original });
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Filter cards" }));
    expect(screen.queryByRole("group", { name: copy.filters.friendHead })).toBeNull();
  });

  it("draws the phone sheet's friends as equal pills two to a row under Any friend, which spans it (R1b)", async () => {
    served = { spares: BOARD, asks: [] };
    await mount({}, withSol());
    fireEvent.click(screen.getByRole("button", { name: "Filter cards" }));
    const grid = document.querySelector("[data-friend-pills]") as HTMLElement;
    expect(grid.className).toContain("grid-cols-[repeat(2,minmax(0,1fr))]");
    const pills = within(grid).getAllByRole("checkbox");
    expect(pills.map((p) => p.getAttribute("aria-label"))).toEqual([copy.filters.anyFriend, "Colin, 2 cards", "Chris, 1 card", "Max, 1 card", "Peter, 1 card"]);
    expect(pills[0].className).toContain("col-span-full");
    expect(pills.slice(1).every((p) => !p.className.includes("col-span-full") && p.querySelector("[data-face]"))).toBe(true);
    fireEvent.click(pills[1]);
    expect(pills[1].getAttribute("aria-checked")).toBe("true");
    expect(cardNames()).toEqual(["Brainstorm", "Jace"]);
    expect(window.location.search).toBe("?friend=p-Colin");
    // Any friend replaces the named friends.
    fireEvent.click(pills[0]);
    expect(pills.map((p) => p.getAttribute("aria-checked"))).toEqual(["true", "false", "false", "false", "false"]);
    expect(window.location.search).toBe("?friend=any");
    expect(cardNames()).toHaveLength(4);
  });
});

// Addendum R3 (`design_handoff_the99_all_decks_cart_v2/addendum-r3`): the failed read said inside the phone's Filters sheet
// (§1), the compact placeholder (§2), the desktop list's fade (§3), and a reader with no friends (§4).
describe("addendum R3", () => {
  const original = window.matchMedia;
  const wide = () => Object.defineProperty(window, "matchMedia", {
    writable: true, configurable: true,
    value: (query: string) => ({ matches: true, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
  });
  afterEach(() => Object.defineProperty(window, "matchMedia", { writable: true, configurable: true, value: original }));
  const sparesCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/friend-spares")).length;
  /** The spares read waits until `land` answers it: a failure (500) or these spares. */
  let land: (spares: unknown[] | "fail") => void = () => {};
  const defer = () => fetchMock.mockImplementation((url: string) =>
    url.startsWith("/api/spare-requests")
      ? Promise.resolve({ ok: true, json: async () => ({ asks: [] }) })
      : new Promise((res) => {
        land = (spares) => res(spares === "fail" ? { ok: false, json: async () => null } : { ok: true, json: async () => ({ spares }) });
      }));
  const failure = () => screen.queryAllByRole("alert").find((el) => el.textContent?.includes(copy.failedRead.toast)) ?? null;
  const openSheet = () => fireEvent.click(screen.getByRole("button", { name: "Filter cards" }));
  const closeSheet = () => fireEvent.click(screen.getByRole("button", { name: copy.filters.show(4) }));
  const friendGroup = () => within(screen.getByRole("group", { name: copy.filters.friendHead }));

  describe("§1 the failed read in the Filters sheet", () => {
    it("says a failure that lands while the sheet is open in its Friend group, with Try again, and raises no toast, then or on close", async () => {
      defer();
      await mount();
      openSheet();
      expect(friendGroup().getByText(copy.filters.friendReading)).toBeTruthy();
      await act(async () => { land("fail"); });
      expect(failure()).toBeNull();
      const line = document.querySelector("[data-friend-failed]") as HTMLElement;
      expect(line.textContent).toContain(copy.result.failedByFriend);
      // Said aloud: the sheet silences the result line behind it and no toast is drawn, so the line is the alert.
      expect(within(line).getByRole("alert").textContent).toBe(copy.result.failedByFriend);
      // The head stays; the pills are gone.
      expect(friendGroup().queryAllByRole("checkbox")).toHaveLength(0);
      // Audit 3: Try again takes the 44px touch target.
      const retry = within(line).getByRole("button", { name: copy.failedRead.retry });
      expect(retry.className).toContain("pointer-coarse:after:h-[max(44px,100%)]");
      // Said once: closing the sheet raises no toast.
      closeSheet();
      expect(failure()).toBeNull();
    });

    it("dismisses a toast already up when the sheet opens, which opens on the failed line, and closing it brings no toast back", async () => {
      served = { spares: [], asks: [], fail: true };
      await mount();
      expect(failure()).toBeTruthy();
      openSheet();
      expect(failure()).toBeNull();
      expect(document.querySelector("[data-friend-failed]")).toBeTruthy();
      closeSheet();
      expect(failure()).toBeNull();
    });

    it("Try again reads again, shows the shipped dashed reading… pill until it lands, then the friend pills", async () => {
      served = { spares: [], asks: [], fail: true };
      await mount();
      openSheet();
      const before = sparesCalls();
      defer();
      await act(async () => {
        fireEvent.click(within(document.querySelector("[data-friend-failed]") as HTMLElement).getByRole("button", { name: copy.failedRead.retry }));
      });
      expect(sparesCalls()).toBe(before + 1);
      // Audit 4: Loading A's shipped pill (44 tall, round, dashed), not the board's small one.
      const reading = friendGroup().getByText(copy.filters.friendReading);
      expect(reading.className.split(/\s+/)).toEqual(expect.arrayContaining(["h-[44px]", "rounded-full", "border-dashed"]));
      expect(document.querySelector("[data-friend-failed]")).toBeNull();
      await act(async () => { land(BOARD); });
      expect(friendGroup().getAllByRole("checkbox").length).toBeGreaterThan(1);
      closeSheet();
      expect(failure()).toBeNull();
    });

    it("still toasts a failure that lands while the sheet is shut", async () => {
      defer();
      await mount();
      await act(async () => { land("fail"); });
      expect(failure()).toBeTruthy();
    });
  });

  describe("§2 the compact placeholder", () => {
    it("shows `Search` below 1000px and `Search cards` from it, named `Search cards` at both", async () => {
      await mount();
      let field = screen.getByRole("searchbox", { name: copy.filters.search });
      expect(field.getAttribute("placeholder")).toBe(copy.filters.searchCompact);
      cleanup();
      wide();
      await mount();
      field = screen.getByRole("searchbox", { name: copy.filters.search });
      expect(field.getAttribute("placeholder")).toBe(copy.filters.search);
    });

    it("draws the cart's compact field at the board's sizes, the empty ✕ out of the row, and leaves the shared field as it was", async () => {
      // 320px with a badge leaves the field 98px: 98 - 2 border - 22 padding - 15 icon - 8 gap = 51px of input, and
      // `Search` measures 49.6px at 16px in IBM Plex Sans. The ✕'s 24px and its gap would leave 19px.
      await mount();
      const field = screen.getByRole("searchbox", { name: copy.filters.search });
      const box = field.closest("[data-search-field]") as HTMLElement;
      const classes = () => box.className.split(/\s+/);
      expect(classes()).toEqual(expect.arrayContaining(["px-[11px]", "gap-[8px]"]));
      expect(classes()).not.toContain("px-[12px]");
      expect(box.querySelector("[data-search-icon]")!.getAttribute("width")).toBe("15");
      // The text keeps 16px: iOS Safari zooms into an input under 16px.
      expect(field.className.split(/\s+/)).toContain("text-[16px]");
      const clear = () => box.querySelector("button") as HTMLElement;
      expect(clear().className.split(/\s+/)).toContain("hidden");
      fireEvent.change(field, { target: { value: "sol" } });
      expect(clear().className.split(/\s+/)).not.toContain("hidden");
      cleanup();
      // Every other caller keeps the shared field's sizes: 12px in, the 18px magnifier, the ✕ held hidden in place.
      const { DeckSearchField } = await import("../deck-filter-column");
      render(<DeckSearchField value="" onChange={() => {}} size="sheet" />);
      const other = document.querySelector("[data-search-field]") as HTMLElement;
      expect(other.className.split(/\s+/)).toEqual(expect.arrayContaining(["px-[12px]", "gap-[9px]"]));
      expect(other.querySelector("[data-search-icon]")!.getAttribute("width")).toBe("18");
    });
  });

  describe("§3 the list's bottom fade", () => {
    const fade = () => document.querySelector("[data-cart-fade]");
    const box = () => screen.getByRole("region", { name: copy.list.regionAria });
    const size = (el: HTMLElement, scrollHeight: number, clientHeight: number, scrollTop: number) => {
      Object.defineProperty(el, "scrollHeight", { configurable: true, value: scrollHeight });
      Object.defineProperty(el, "clientHeight", { configurable: true, value: clientHeight });
      Object.defineProperty(el, "scrollTop", { configurable: true, writable: true, value: scrollTop });
    };

    it("is the one condition: more than 1px below", async () => {
      const { hasMoreBelow } = await import("./cart-view");
      expect(hasMoreBelow({ scrollHeight: 1000, scrollTop: 0, clientHeight: 300 })).toBe(true);
      expect(hasMoreBelow({ scrollHeight: 1000, scrollTop: 699, clientHeight: 300 })).toBe(false);
      expect(hasMoreBelow({ scrollHeight: 300, scrollTop: 0, clientHeight: 300 })).toBe(false);
    });

    it("draws over a list with more below, and goes at its end and over a box that does not overflow", async () => {
      wide();
      await mount();
      // jsdom lays nothing out: a box that does not overflow draws no fade.
      expect(fade()).toBeNull();
      size(box(), 1000, 300, 0);
      fireEvent.scroll(box());
      expect(fade()).toBeTruthy();
      size(box(), 1000, 300, 700);
      fireEvent.scroll(box());
      expect(fade()).toBeNull();
    });

    it("reads again when the box resizes, through one observer on the box", async () => {
      const observers: { cb: () => void; targets: Element[] }[] = [];
      vi.stubGlobal("ResizeObserver", class {
        targets: Element[] = [];
        constructor(cb: () => void) { observers.push({ cb, targets: this.targets }); }
        observe(el: Element) { this.targets.push(el); }
        unobserve() {}
        disconnect() {}
      });
      wide();
      await mount();
      const mine = observers.filter((o) => o.targets.includes(box()));
      expect(mine).toHaveLength(1);
      // The same observer watches the box's auto-height content, which a row's `+N` grows without resizing the box.
      const content = box().querySelector("[data-cart-list-content]")!;
      expect(mine[0].targets).toContain(content);
      size(box(), 1000, 300, 0);
      await act(async () => { mine[0].cb(); });
      expect(fade()).toBeTruthy();
      size(box(), 1000, 1000, 0);
      await act(async () => { mine[0].cb(); });
      expect(fade()).toBeNull();
    });
  });

  describe("§4 a reader with no friends", () => {
    it("makes no spares read, and By card draws no key item, column, clause or toast, whatever the read would say", async () => {
      served = { spares: BOARD, asks: [], fail: true };
      await mount({ hasFriends: false });
      expect(sparesCalls()).toBe(0);
      expect(screen.queryByTestId("spare-key")).toBeNull();
      expect(screen.queryAllByTestId("spare-skeleton")).toHaveLength(0);
      const columns = document.querySelector('[data-cart-columns="card"]')!;
      expect(columns.textContent).not.toContain(copy.columns.spares);
      expect(columns.className).toContain("xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.75fr)_0px_minmax(0,1.3fr)_100px]");
      expect(document.querySelector("[data-chassis-row='result'] p")?.textContent).toBe(copy.result.byCardNoSpare(4));
      expect(document.querySelector("[data-result-reading]")).toBeNull();
      expect(failure()).toBeNull();
      // The phone sheet has no Friend group.
      openSheet();
      expect(screen.queryByRole("group", { name: copy.filters.friendHead })).toBeNull();
    });

    it("draws no desktop Friend trigger, and By deck says decks and copies", async () => {
      wide();
      await mount({ hasFriends: false, initialView: "deck", focusDeckId: "thopter" });
      expect(screen.queryByRole("button", { name: /^Friend/ })).toBeNull();
      expect(document.querySelector("[data-friend-reading]")).toBeNull();
      expect(document.querySelector('[data-cart-columns="deck"]')!.textContent).not.toContain(copy.columns.spares);
      expect(document.querySelector("[data-chassis-row='result'] p")?.textContent).toBe(copy.result.byDeck(3, 5));
      expect(sparesCalls()).toBe(0);
    });

    it("publishes no spare, failure or open sheet once `noFriends` turns on in a provider that stays mounted", async () => {
      const { FriendSparesProvider, usePageSpares } = await import("../../social/spare-markers");
      let ctx: ReturnType<typeof usePageSpares> = null;
      const Probe = () => { ctx = usePageSpares(); return null; };
      const ids = [JACE, BRAIN, GISA, TOWER];
      const tree = (noFriends: boolean) => (
        <FriendSparesProvider oracleIds={ids} newestAsOf={null} hostSheet={false} noFriends={noFriends}><Probe /></FriendSparesProvider>
      );
      served = { spares: BOARD, asks: [] };
      let view!: ReturnType<typeof render>;
      await act(async () => { view = render(tree(false)); });
      expect(ctx!.byCard.size).toBeGreaterThan(0);
      await act(async () => { ctx!.open({ oracleId: JACE, name: "Jace, Multiverse Architect", printedName: null, layout: "normal", imageUri: null, price: null }); });
      expect(ctx!.opened).not.toBeNull();
      await act(async () => { view.rerender(tree(true)); });
      expect(ctx!.byCard.size).toBe(0);
      expect(ctx!.seen.size).toBe(0);
      expect(ctx!.opened).toBeNull();
      cleanup();
      served = { spares: [], asks: [], fail: true };
      await act(async () => { view = render(tree(false)); });
      expect(ctx!.failed.size).toBe(4);
      await act(async () => { view.rerender(tree(true)); });
      expect(ctx!.failed.size).toBe(0);
      expect(ids.every((id) => ctx!.loaded.has(id))).toBe(true);
    });

    it("leaves By friend as Empty-One C", async () => {
      await mount({ hasFriends: false, initialView: "friend" });
      expect(screen.getByTestId("cart-by-friend-empty").getAttribute("data-kind")).toBe("noFriends");
    });
  });
});
