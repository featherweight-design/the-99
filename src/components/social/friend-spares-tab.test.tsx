// A friend's Spares tab with spare requests on (signature card calls 8 and 9; handoff `design_handoff_the99_avatar`,
// board Spares): the line's suffix, a tile press opening the spares-only modal with the page's friend first and the
// wishlist kicker, the tile's count line carrying THIS friend's ask, the `?spare=` landing (open on a card still
// offered, the toast and no modal on one gone, the parameter stripped through `mirrorUrl`), and SparesSheet's two new
// props with their defaults unchanged. Off (`asks` absent), the tab is as shipped.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AskStateLine } from "../../lib/social/spare-requests";
import type { FriendSpareList } from "../../lib/social/spares";
import { socialCopy, spareCopy } from "../../lib/copy/social";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { FriendSparesTab, type FriendSparesAsks } from "./friend-spares-tab";
import { SparesSheet } from "./spare-markers";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";

const m = vi.hoisted(() => ({ mirrorUrl: vi.fn(), refresh: vi.fn(), ask: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: vi.fn(), replace: vi.fn() }) }));
vi.mock("../../lib/url/mirror", () => ({ mirrorUrl: m.mirrorUrl }));
vi.mock("../../app/friends/spare-actions", () => ({ askSpareAction: m.ask, askInsteadAction: vi.fn() }));

const p = socialCopy.friendPage.spares;
const GHALTA = "00000000-0000-4000-8000-0000000000c1";
const SAI = "00000000-0000-4000-8000-0000000000c2";
const GONE = "00000000-0000-4000-8000-0000000000c9";
const COLIN = { publicId: "00000000-0000-4000-8000-000000000002", displayName: "Colin", commander: null };
const SPARES: FriendSpareList = {
  pods: [named("Thursday pod")],
  friend: { ...COLIN, displayName: named("Colin"), pods: [named("Thursday pod")] },
  wishlist: true,
  lines: [
    { oracleId: GHALTA, name: "Ghalta, Primal Hunger", imageUri: null, spare: 1, onWishlist: true },
    { oracleId: SAI, name: "Sai, Master Thopterist", imageUri: null, spare: 2, onWishlist: false },
  ],
};
const friend = (name: string, publicId: string) => ({ publicId, displayName: named(name), commander: null, pods: [named("Cube night")] });
// Ana holds more spares than Colin, so the shipped order would put her first.
const READ = [
  { oracleId: GHALTA, friend: friend("Ana", "p-ana"), spare: 3 },
  { oracleId: GHALTA, friend: { ...COLIN, displayName: named("Colin"), pods: [named("Thursday pod")] }, spare: 1 },
];
const ask = (oracleId: string, holder: string, state: AskStateLine["state"]): AskStateLine => ({
  id: `req-${oracleId}-${holder}`, oracleId, holder: { publicId: holder, displayName: named(holder) }, state,
  daysLeft: state === "open" ? 12 : null, createdAt: "2026-10-20T00:00:00Z", answeredAt: null,
});

const fetchMock = vi.fn();
let asks: AskStateLine[] = [];
let read: typeof READ = READ;
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) =>
    url.startsWith("/api/spare-requests")
      ? { ok: true, json: async () => ({ asks }) }
      : { ok: true, json: async () => ({ spares: read }) });
  m.mirrorUrl.mockReset();
  m.ask.mockReset();
  m.ask.mockResolvedValue({ ok: true, id: "req-new" });
  asks = [];
  read = READ;
  window.history.replaceState(null, "", "/friends/x");
});
afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  // A sheet's close goes back through history (the dialog's own entry); let that POP land here, before the next test
  // sets its address, or it restores an earlier test's `?spare=` into the next one.
  await new Promise((r) => setTimeout(r, 0));
});

const AS_OF = new Date("2026-10-26T00:00:00Z");
// Ghalta is priced (the page's `loadPrices`); Sai has no row, so its tag stays bare.
const PRICES = { [GHALTA]: { cents: 210, foilCents: null, etchedCents: null, asOf: AS_OF } } as unknown as FriendSparesAsks["prices"];
const ON = (extra: Partial<FriendSparesAsks> = {}): FriendSparesAsks => ({
  friend: COLIN, spare: null, goneName: null, prices: PRICES, newestAsOf: AS_OF, ...extra,
});
async function mount(a: FriendSparesAsks | undefined) {
  await act(async () => {
    render(<FriendSparesTab name="Colin" spares={SPARES} asks={a} />);
  });
}

describe("the tab, spare requests on", () => {
  it("adds the press sentence to the line", async () => {
    await mount(ON());
    expect(screen.getByText(`${p.line(SPARES.pods, true)}${p.pressToAsk}`)).toBeTruthy();
  });

  it("opens the card's modal on a tile press: the page's friend first, the wishlist kicker, the tile ringed", async () => {
    await mount(ON());
    const press = screen.getAllByTestId("spare-tile-press")[0];
    await act(async () => { fireEvent.click(press); });
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(p.onWishlist)).toBeTruthy();
    expect(dialog.queryByText(spareCopy.replacing)).toBeNull();
    // The buy tag carries the card's price, as on the board ("buy $2.10").
    expect(dialog.getByText("$2.10")).toBeTruthy();
    const rows = dialog.getAllByTestId("friend-spare");
    expect(rows.map((r) => r.getAttribute("data-friend"))).toEqual([COLIN.publicId, "p-ana"]);
    expect(press.getAttribute("aria-expanded")).toBe("true");
    expect(press.className).toMatch(/(^|\s)outline-2(\s|$)/);
    expect(press.className).toMatch(/outline-offset-\[3px\]/);
  });

  it("puts focus on the pressed tile before the sheet opens, so ✕ returns there (Safari does not focus a press)", async () => {
    await mount(ON());
    const press = screen.getAllByTestId("spare-tile-press")[0];
    (document.activeElement as HTMLElement | null)?.blur();
    await act(async () => { fireEvent.click(press); });
    await act(async () => { fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /close/i })); });
    expect(document.activeElement).toBe(press);
  });

  it("sends an Ask from the tab as standalone, for no deck", async () => {
    await mount(ON());
    await act(async () => { fireEvent.click(screen.getAllByTestId("spare-tile-press")[0]); });
    const dialog = within(screen.getByRole("dialog"));
    await act(async () => { fireEvent.click(dialog.getAllByRole("button", { name: /^Ask/ })[0]); });
    expect(m.ask).toHaveBeenCalledWith(expect.objectContaining({ oracleId: GHALTA, deckId: null, standalone: true }));
  });

  it("reads a card's spares only when its sheet opens, and once a visit", async () => {
    const sparesReads = () => fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => u.startsWith("/api/friend-spares"));
    await mount(ON());
    expect(sparesReads()).toEqual([]);
    const press = screen.getAllByTestId("spare-tile-press")[0];
    await act(async () => { fireEvent.click(press); });
    expect(sparesReads()).toHaveLength(1);
    expect(sparesReads()[0]).toContain(GHALTA);
    expect(sparesReads()[0]).not.toContain(SAI);
    await act(async () => { fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /close/i })); });
    await act(async () => { fireEvent.click(press); });
    expect(sparesReads()).toHaveLength(1);
  });

  it("draws what the read returned, not the page's offer, once a read for the card lands empty", async () => {
    read = [];
    await mount(ON());
    await act(async () => { fireEvent.click(screen.getAllByTestId("spare-tile-press")[0]); });
    expect(within(screen.getByRole("dialog")).queryAllByTestId("friend-spare")).toHaveLength(0);
  });

  it("draws no kicker on a card not on the reader's wishlist", async () => {
    await mount(ON());
    await act(async () => { fireEvent.click(screen.getAllByTestId("spare-tile-press")[1]); });
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.queryByText(p.onWishlist)).toBeNull();
    expect(dialog.queryByText(spareCopy.replacing)).toBeNull();
    // No price row: the bare tag, no figure.
    expect(dialog.queryByText(/\$\d/)).toBeNull();
  });

  it("carries THIS friend's ask on the count line: Requested, ✓ Accepted, and nothing for another friend's ask", async () => {
    asks = [ask(GHALTA, COLIN.publicId, "open"), ask(SAI, COLIN.publicId, "yes")];
    await mount(ON());
    const [ghalta, sai] = screen.getAllByTestId("spare-count");
    expect(ghalta.textContent).toBe(`${p.count(1)}·${spareCopy.request.requested}`);
    expect(within(ghalta).getByTestId("spare-ask").getAttribute("data-ask")).toBe("requested");
    expect(sai.textContent).toBe(`${p.count(2)}·✓ ${spareCopy.request.accepted}`);
    expect(sai.className).toMatch(/whitespace-nowrap/);
    cleanup();
    asks = [ask(GHALTA, "p-ana", "open")];
    await mount(ON());
    expect(screen.getAllByTestId("spare-count")[0].textContent).toBe(p.count(1));
  });
});

describe("the ?spare= landing", () => {
  it("opens a card still offered, its tile ringed and focused, and strips the parameter", async () => {
    window.history.replaceState(null, "", `/friends/x?spare=${SAI}`);
    await mount(ON({ spare: SAI }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Sai, Master Thopterist")).toBeTruthy();
    const press = screen.getAllByTestId("spare-tile-press")[1];
    expect(press.getAttribute("aria-expanded")).toBe("true");
    expect(press.className).toMatch(/(^|\s)outline-2(\s|$)/);
    // Focused before the modal opened, so ✕ hands focus back to the tile.
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: spareCopy.close })); });
    expect(document.activeElement).toBe(press);
    expect(m.mirrorUrl).toHaveBeenCalledTimes(1);
    const stripped = new URL(String(m.mirrorUrl.mock.calls[0][0]));
    expect([stripped.pathname, stripped.search]).toEqual(["/friends/x", ""]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("draws the toast and no modal for a spare gone since, and strips the parameter", async () => {
    window.history.replaceState(null, "", `/friends/x?spare=${GONE}`);
    await mount(ON({ spare: GONE, goneName: "Ghalta, Primal Hunger" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(plain(p.gone("Colin", "Ghalta, Primal Hunger")))).toBeTruthy();
    expect(m.mirrorUrl).toHaveBeenCalledTimes(1);
    expect(new URL(String(m.mirrorUrl.mock.calls[0][0])).searchParams.has("spare")).toBe(false);
  });
});

describe("a remount after the landing", () => {
  it("neither reopens the sheet nor replays the toast once ?spare= has left the address", async () => {
    await mount(ON({ spare: SAI }));
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    await mount(ON({ spare: GONE, goneName: "Ghalta, Primal Hunger" }));
    expect(screen.queryByText(plain(p.gone("Colin", "Ghalta, Primal Hunger")))).toBeNull();
    expect(m.mirrorUrl).not.toHaveBeenCalled();
  });
});

describe("the tab, spare requests off", () => {
  it("is as shipped: the line alone, a tile opens card details, no ask on the count line, ?spare= ignored", async () => {
    window.history.replaceState(null, "", `/friends/x?spare=${SAI}`);
    await mount(undefined);
    expect(screen.getByText(plain(p.line(SPARES.pods, true)))).toBeTruthy();
    expect(screen.queryByTestId("spare-tile-press")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByTestId("spare-count")).toBeNull();
    expect(m.mirrorUrl).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("SparesSheet's kicker and first", () => {
  const CARD = { oracleId: GHALTA, name: "Ghalta, Primal Hunger", printedName: null, layout: null, imageUri: null, price: null };
  async function sheet(props: { kicker?: string | null; first?: string }) {
    await act(async () => {
      render(
        <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
          <SparesSheet card={CARD} spares={READ} newestAsOf={null} onClose={() => {}} {...props} />
        </CardDetailProvider>,
      );
    });
    return within(screen.getByRole("dialog"));
  }
  it("keeps the shipped kicker and order by default", async () => {
    const d = await sheet({});
    expect(d.getByText(spareCopy.replacing)).toBeTruthy();
    expect(d.getAllByTestId("friend-spare").map((r) => r.textContent)).toEqual([expect.stringContaining("Ana"), expect.stringContaining("Colin")]);
  });
  it("draws the given kicker, none for null, and lists `first` first", async () => {
    let d = await sheet({ kicker: "on your wishlist", first: COLIN.publicId });
    expect(d.getByText("on your wishlist")).toBeTruthy();
    expect(d.getAllByTestId("friend-spare").map((r) => r.textContent)).toEqual([expect.stringContaining("Colin"), expect.stringContaining("Ana")]);
    cleanup();
    d = await sheet({ kicker: null });
    expect(d.queryByText(spareCopy.replacing)).toBeNull();
  });
});
