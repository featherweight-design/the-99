// Friends' spares on a deck's rows (Social R2 PR A): the batched read, the spares-only modal a marker opens
// with the swap tools off, the row's one other-ways press (#1875), and the key's item.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { spareCopy } from "../../lib/copy/social";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { ShoppingKey } from "../decks/shopping-key";
import { FriendSparesProvider, OtherWaysPress, SPARES_PAGE_BATCH, fetchSpares } from "./spare-markers";
import { SwapToolsProvider, useSwapTools } from "../../lib/swaps/context";

const asOf = new Date("2026-09-20T00:00:00Z");
const card = (oracleId: string, name: string) =>
  ({ oracleId, name, owned: false, quantity: 1, price: { cents: 500, foilCents: null, etchedCents: null, asOf } }) as unknown as DeckDetailCard;
const POLY = card("poly", "Polyraptor");
const friend = (name: string) => ({ publicId: `p-${name}`, displayName: name, commander: null, pods: ["Thursday pod"] });
const SPARES = [{ oracleId: "poly", friend: friend("Ana"), spare: 2 }];

const STAND_IN_ARIA = "Cheaper stand-ins for Polyraptor, over your $10 limit";
function Press({ standIn = false }: { standIn?: boolean }) {
  // A deck row hands the press its stand-ins opener while the swap tools are on, as DecklistRow does.
  const tools = useSwapTools();
  return (
    <OtherWaysPress
      card={POLY}
      openStandIns={tools ? () => tools.openStandIns(POLY) : undefined}
      standIn={standIn}
      standInAria={STAND_IN_ARIA}
      limitFigure="$10"
    />
  );
}

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const answer = (spares: unknown[]) => ({ ok: true, json: async () => ({ spares }) });

async function mount(ui: React.ReactNode, ids = ["poly"]) {
  await act(async () => {
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <FriendSparesProvider oracleIds={ids} newestAsOf={asOf}>{ui}</FriendSparesProvider>
      </CardDetailProvider>,
    );
  });
}

describe("fetchSpares", () => {
  it("reads a long list in batches of the route's cap, and a batch that fails as none", async () => {
    const ids = Array.from({ length: SPARES_PAGE_BATCH * 2 + 50 }, (_, i) => `id-${i}`);
    fetchMock
      .mockResolvedValueOnce(answer([{ oracleId: "id-1", friend: friend("Ana"), spare: 1 }]))
      .mockResolvedValueOnce({ ok: false, json: async () => ({ spares: [{ oracleId: "id-x", friend: friend("Zed"), spare: 9 }] }) })
      .mockRejectedValueOnce(new Error("down"));
    const rows = await fetchSpares(ids);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const counts = fetchMock.mock.calls.map(([url]) => new URL(url as string, "http://x").searchParams.get("ids")!.split(",").length);
    expect(counts).toEqual([SPARES_PAGE_BATCH, SPARES_PAGE_BATCH, 50]);
    expect(rows.map((r) => r.oracleId)).toEqual(["id-1"]);
  });

  it("asks each card once, and reads again only when the set of cards changes, not its order", async () => {
    fetchMock.mockResolvedValue(answer(SPARES));
    const tree = (ids: string[]) => (
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <FriendSparesProvider oracleIds={ids} newestAsOf={asOf}><Press /></FriendSparesProvider>
      </CardDetailProvider>
    );
    let rerender!: (ui: React.ReactNode) => void;
    await act(async () => { ({ rerender } = render(tree(["poly", "poly", "other"]))); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new URL(fetchMock.mock.calls[0][0] as string, "http://x").searchParams.get("ids")).toBe("other,poly");
    await act(async () => { rerender(tree(["other", "poly"])); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { rerender(tree(["other", "poly", "new"])); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("the spares-only modal", () => {
  it("opens from a marker with the swap tools off: the title, a Replacing box with no deck line, the friends", async () => {
    fetchMock.mockResolvedValue(answer(SPARES));
    await mount(<Press />);
    const marker = screen.getByTestId("other-ways");
    await act(async () => { fireEvent.click(marker); });
    const dialog = screen.getByRole("dialog", { name: spareCopy.modalTitleSpares });
    const sheet = within(dialog).getByTestId("spares-sheet");
    expect(sheet.textContent).toContain(spareCopy.replacing);
    expect(sheet.textContent).not.toMatch(/replacing, in/);
    expect(within(sheet).getAllByTestId("friend-spare")).toHaveLength(1);
    expect(sheet.textContent).toContain(spareCopy.count(2));
    // Nothing of the stand-ins: no lead, no Take.
    expect(within(dialog).queryByRole("button", { name: /^Take/ })).toBeNull();
    expect(marker.getAttribute("aria-expanded")).toBe("true");
    await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: spareCopy.close })); });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the other-ways press", () => {
  const tools = (ui: React.ReactNode) => <SwapToolsProvider deckId="d1" deckName="Deck" storedLimitCents={null}>{ui}</SwapToolsProvider>;

  it("is ⇄ alone with a stand-in and no spare, under the row's own name", async () => {
    fetchMock.mockResolvedValue(answer([]));
    await mount(tools(<Press standIn />));
    const press = screen.getByTestId("other-ways");
    expect(press.getAttribute("aria-label")).toBe(STAND_IN_ARIA);
    expect(press.textContent).toContain("⇄");
    expect(within(press).queryByTestId("spare-glyph")).toBeNull();
  });

  it("is the spare glyph alone with a spare and no stand-in", async () => {
    fetchMock.mockResolvedValue(answer(SPARES));
    await mount(tools(<Press />));
    const press = screen.getByTestId("other-ways");
    expect(press.getAttribute("aria-label")).toBe(spareCopy.markerAria("Polyraptor"));
    expect(press.textContent).not.toContain("⇄");
    expect(within(press).getByTestId("spare-glyph")).toBeInTheDocument();
  });

  it("holds ⇄ then the glyph with both, named for both", async () => {
    fetchMock.mockResolvedValue(answer(SPARES));
    await mount(tools(<Press standIn />));
    const press = screen.getByTestId("other-ways");
    expect(press.getAttribute("aria-label")).toBe(spareCopy.pressBothAria("Polyraptor", "$10"));
    const swap = within(press).getByText("⇄");
    expect(swap.compareDocumentPosition(within(press).getByTestId("spare-glyph")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("is absent with neither, keeping no slot", async () => {
    fetchMock.mockResolvedValue(answer([]));
    await mount(tools(<Press />));
    expect(screen.queryByTestId("other-ways")).toBeNull();
  });

  it("offers no ⇄ without the swap tools, though the row could look for stand-ins", async () => {
    fetchMock.mockResolvedValue(answer([]));
    await mount(<Press standIn />);
    expect(screen.queryByTestId("other-ways")).toBeNull();
  });

  it("opens the stand-ins modal for its card with the swap tools on, and shows pressed", async () => {
    function Probe() {
      return <span data-testid="opened">{useSwapTools()?.standIns?.oracleId ?? ""}</span>;
    }
    fetchMock.mockResolvedValue(answer(SPARES));
    await mount(tools(<><Press /><Probe /></>));
    await act(async () => { fireEvent.click(screen.getByTestId("other-ways")); });
    expect(screen.getByTestId("opened").textContent).toBe("poly");
    expect(screen.getByTestId("other-ways").getAttribute("aria-expanded")).toBe("true");
  });
});

describe("the key's item", () => {
  it("names the marker once a spare is shown, with I got it off too", async () => {
    fetchMock.mockResolvedValue(answer(SPARES));
    await mount(<ShoppingKey shoppingCount={3} />);
    const key = screen.getByTestId("shopping-key");
    expect(within(key).getByTestId("spare-key").textContent).toContain(spareCopy.key);
    // I got it is off: its items stay out, and the spare item is drawn at both widths, as the press is.
    expect(key.textContent).not.toContain(gotItCopy.row.keyBuy);
    // No width hides it: neither the key nor the item carries a `hidden` class, at any breakpoint.
    for (const el of [key, within(key).getByTestId("spare-key")]) expect(el.className).not.toMatch(/(^|\s|:)hidden(\s|$)/);
  });

  it("drops a card's spare as soon as the card leaves the list, the empty list included", async () => {
    fetchMock.mockResolvedValue(answer(SPARES));
    const tree = (ids: string[]) => (
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <FriendSparesProvider oracleIds={ids} newestAsOf={asOf}><ShoppingKey shoppingCount={3} /></FriendSparesProvider>
      </CardDetailProvider>
    );
    let rerender!: (ui: React.ReactNode) => void;
    await act(async () => { ({ rerender } = render(tree(["poly"]))); });
    expect(screen.getByTestId("spare-key")).toBeInTheDocument();
    await act(async () => { rerender(tree([])); });
    expect(screen.queryByTestId("spare-key")).toBeNull();
  });

  it("is absent while no friend has a spare, so the key is too with I got it off", async () => {
    fetchMock.mockResolvedValue(answer([]));
    await mount(<ShoppingKey shoppingCount={3} />);
    expect(screen.queryByTestId("shopping-key")).toBeNull();
  });
});

describe("the friend line's pods", () => {
  it("wraps the pod names rather than truncating them, so every pod reads in full", async () => {
    const long = [{ oracleId: "poly", friend: { ...friend("Ana"), pods: ["Store league", "Thursday pod"] }, spare: 1 }];
    fetchMock.mockResolvedValue(answer(long));
    await mount(<Press />);
    await act(async () => { fireEvent.click(screen.getByTestId("other-ways")); });
    const row = within(screen.getByRole("dialog")).getByTestId("friend-spare");
    const pods = within(row).getByText(spareCopy.via(["Store league", "Thursday pod"]));
    // No ellipsis on the line: it wraps to a second line instead (bb's R2 walk, 390).
    expect(pods.className.split(/\s+/)).not.toContain("truncate");
    expect(pods.className).toContain("[overflow-wrap:anywhere]");
  });
});
