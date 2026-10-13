import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryEntry, HistoryListEntry } from "../../lib/collection/history";
import type { HistoryRow } from "../../db/schema";
import { reveal } from "../../lib/ui/reveal";

const loadEntry = vi.fn();
const loadPage = vi.fn();
const previewRevert = vi.fn();
// The jump is `reveal`'s; its eased scroll is `reveal`'s own test.
vi.mock("../../lib/ui/reveal", () => ({ reveal: vi.fn() }));
vi.mock("../../app/collection/history-actions", () => ({
  previewRevert: (...a: unknown[]) => previewRevert(...a),
  revertCollectionEntry: vi.fn(),
  loadCollectionHistoryEntry: (...a: unknown[]) => loadEntry(...a),
  loadCollectionHistory: (...a: unknown[]) => loadPage(...a),
}));

const { HistoryList, HistoryEntryItem } = await import("./history-list");

const NOW = Date.parse("2026-10-09T20:00:00Z");
const entry = (over: Partial<HistoryListEntry>): HistoryListEntry => ({
  id: "e1", seq: 5, createdAt: new Date("2026-10-09T14:02:00Z"), kind: "add", source: null, raised: 1, lowered: 0, rowCount: 1,
  copiesUp: 2, copiesDown: 0, removesOnly: false, revertsId: null, revertedBy: null, revertsVisible: false, revertedByVisible: false,
  uploadFilename: null, firstName: "Sol Ring", shoppingDeck: null, shoppingCart: false, cartDecks: null, wentTo: null, ...over,
});
const row = (name: string, before: number | null, after: number | null): HistoryRow => ({
  oracleId: name, setCode: "lea", collectorNumber: "1", finish: "nonfoil", name,
  before: before === null ? null : { quantity: before, scryfallId: null, condition: null },
  after: after === null ? null : { quantity: after, scryfallId: null, condition: null },
});
const detail = (e: HistoryListEntry, rows: HistoryRow[], rowDecks: Record<string, string> = {}): HistoryEntry => ({ ...e, rows, rowDecks });

function draw(entries: HistoryListEntry[], over: Partial<React.ComponentProps<typeof HistoryList>> = {}) {
  return render(
    <HistoryList
      initial={entries}
      nextBefore={null}
      nowMs={NOW}
      reachesBack={new Date("2026-10-01T00:00:00Z")}
      reachesBackLabel="1 Oct"
      shipLabel="1 Oct"
      {...over}
    />,
  );
}

beforeEach(() => {
  loadEntry.mockReset();
  loadPage.mockReset();
});

describe("HistoryList", () => {
  it("draws the day, the kind tag, the title, the figure and the time, and always ends in the foot", () => {
    draw([entry({}), entry({ id: "e2", kind: "upload_replace", uploadFilename: "manabox-oct.csv", copiesUp: 64, copiesDown: 150, rowCount: 412, createdAt: new Date("2026-10-08T21:10:00Z") })]);
    expect(screen.getByRole("heading", { name: "Today · 9 Oct" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Yesterday · 8 Oct" })).toBeTruthy();
    expect(screen.getByText("Added in the app")).toBeTruthy();
    expect(screen.getByText("+2 copies across 1 card")).toBeTruthy();
    expect(screen.getByText("+64 · −150 copies across 412 cards")).toBeTruthy();
    expect(screen.getByText("manabox-oct.csv", { exact: false })).toBeTruthy();
    expect(screen.getByText("14:02")).toBeTruthy();
    expect(screen.getByText(/Changes from before 1 Oct have aged out/)).toBeTruthy();
  });

  it("draws the empty state dated from the ship date, with the foot under it", () => {
    draw([], { shipLabel: "9 Oct" });
    expect(screen.getByText("Nothing’s changed yet")).toBeTruthy();
    expect(screen.getByText(/Uploads and edits since 9 Oct show up here/)).toBeTruthy();
    expect(screen.getByText(/History keeps 90 days/)).toBeTruthy();
  });

  it("opens a short entry in place with every row it changed, read once", async () => {
    const e = entry({ rowCount: 2 });
    loadEntry.mockResolvedValue(detail(e, [row("Sol Ring", 1, 3), row("Arcane Signet", null, 1)]));
    draw([e]);
    const open = screen.getByRole("button", { expanded: false });
    await act(async () => fireEvent.click(open));
    expect(await screen.findByText("Arcane Signet")).toBeTruthy();
    expect(screen.getByText("+2")).toBeTruthy();
    expect(screen.getByText("+1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { expanded: true }));
    await act(async () => fireEvent.click(screen.getByRole("button", { expanded: false })));
    expect(loadEntry).toHaveBeenCalledTimes(1);
  });

  it("opens a long entry on its first group with chips, 8 rows, then Show more", async () => {
    const e = entry({ kind: "upload_replace", uploadFilename: "big.csv", rowCount: 50 });
    const rows = [...Array.from({ length: 40 }, (_, i) => row(`Gone ${i}`, 2, null)), ...Array.from({ length: 10 }, (_, i) => row(`Fresh ${i}`, null, 1))];
    loadEntry.mockResolvedValue(detail(e, rows));
    draw([e]);
    await act(async () => fireEvent.click(screen.getByRole("button", { expanded: false })));
    expect(await screen.findByRole("button", { name: "Left · 40" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "New · 10" })).toBeTruthy();
    expect(screen.getAllByText(/^Gone /)).toHaveLength(8);
    expect(screen.queryByText("Fresh 0")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show 30 more of 32" }));
    expect(screen.getAllByText(/^Gone /)).toHaveLength(38);
    fireEvent.click(screen.getByRole("button", { name: "New · 10" }));
    expect(screen.getAllByText(/^Fresh /)).toHaveLength(8);
  });

  it("lists a row whose printing changed at the same quantity, instead of dropping it", async () => {
    const e = entry({ rowCount: 1 });
    loadEntry.mockResolvedValue(detail(e, [row("Sol Ring", 2, 2)]));
    draw([e]);
    await act(async () => fireEvent.click(screen.getByRole("button", { expanded: false })));
    expect(await screen.findByText("details changed")).toBeTruthy();
  });

  it("offers Revert on an entry that is not reverted, and opens the confirmation from it", async () => {
    previewRevert.mockReturnValue(new Promise(() => {}));
    draw([entry({ id: "rv", revertedBy: "x", revertedByVisible: false, firstName: "Mana Crypt", createdAt: new Date("2026-10-09T10:00:00Z") }), entry({})]);
    expect(screen.getAllByRole("button", { name: /^Revert / })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Revert Sol Ring" }));
    expect(await screen.findByRole("dialog", { name: "Revert “Sol Ring”?" })).toBeTruthy();
    expect(previewRevert).toHaveBeenCalledWith("e1");
  });

  it("states a zero figure and an explicit empty panel for an entry that moved no copies", async () => {
    const e = entry({ kind: "upload_replace", uploadFilename: "same.csv", copiesUp: 0, copiesDown: 0, rowCount: 0 });
    loadEntry.mockResolvedValue(detail(e, []));
    draw([e]);
    expect(screen.getByText("0 copies across 0 cards")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { expanded: false })));
    expect(await screen.findByText(/This change didn’t move anything/)).toBeTruthy();
  });

  it("says a failed read changed nothing and reads again on Try again", async () => {
    const e = entry({});
    loadEntry.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(detail(e, [row("Sol Ring", 1, 3)]));
    draw([e]);
    await act(async () => fireEvent.click(screen.getByRole("button", { expanded: false })));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn’t load that/);
    await act(async () => fireEvent.click(within(alert).getByRole("button", { name: "Try again" })));
    expect(await screen.findByText("+2")).toBeTruthy();
  });

  it("marks a reverted entry and links to the revert that did it when that is on the page", () => {
    draw([
      entry({ id: "rv", kind: "revert", revertsId: "e1", revertsVisible: true, createdAt: new Date("2026-10-09T15:30:00Z"), firstName: null, rowCount: 1 }),
      entry({ id: "e1", revertedBy: "rv", revertedByVisible: true }),
    ]);
    expect(screen.getAllByText(/Reverted/).length).toBeGreaterThan(0);
    const link = screen.getByRole("link", { name: "by the revert at 15:30" });
    expect(link.getAttribute("href")).toBe("#entry-rv");
    // The composed line says "Reverted" once: the status, a separator, then the link.
    expect(link.parentElement?.textContent).toBe("Reverted · by the revert at 15:30");
    expect(screen.getByText("Undid “Sol Ring”")).toBeTruthy();
  });

  it("tags a Shopping purchase From Shopping and links its deck by the name it has now (§D1)", () => {
    const deck = "7284ff0a-6e76-4dc0-8af5-fc630a403b2b";
    draw([entry({ kind: "edit", source: `shopping:${deck}`, firstName: "Swords to Plowshares", shoppingDeck: { id: deck, name: "HD Gishath" } })]);
    expect(screen.getByText("From Shopping")).toBeTruthy();
    const link = screen.getByRole("link", { name: "HD Gishath" });
    expect(link.getAttribute("href")).toBe(`/decks/${deck}`);
    expect(link.closest("p")?.textContent).toBe("From HD Gishath’s Shopping list");
    // The link sits beside the disclosure, never inside it: a link in a button is invalid.
    expect(link.closest("button")).toBeNull();
    expect(screen.getByRole("button", { name: "Revert Swords to Plowshares" })).toBeTruthy();
  });

  it("tags a cart purchase From Shopping and links the cart, never one deck", () => {
    draw([entry({ kind: "edit", source: "shopping:cart:d1,d2", firstName: "Sol Ring", shoppingCart: true })]);
    expect(screen.getByText("From Shopping")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Shopping for all decks" });
    expect(link.getAttribute("href")).toBe("/decks/shopping");
    expect(link.closest("p")?.textContent).toBe("From Shopping for all decks");
    expect(link.closest("button")).toBeNull();
  });

  it("names the decks a cart purchase was bought for, linked, with the overflow counted", () => {
    const cartDecks = { named: [{ id: "d1", name: "Gishath" }, { id: "d2", name: "Omnath" }, { id: "d3", name: "Atraxa" }], more: 2, gone: 1 };
    draw([entry({ kind: "edit", source: "shopping:cart:d1,d2,d3", firstName: "Sol Ring", shoppingCart: true, cartDecks })]);
    const p = screen.getByRole("link", { name: "Shopping for all decks" }).closest("p")!;
    expect(p.textContent).toBe("From Shopping for all decks. Bought for Gishath, Omnath, Atraxa, 2 more and a deck you’ve since deleted.");
    expect(screen.getByRole("link", { name: "Omnath" }).getAttribute("href")).toBe("/decks/d2");
  });

  it("says only that a cart purchase's decks are gone when none survive", () => {
    draw([entry({ kind: "edit", source: "shopping:cart:d1,d2", firstName: "Sol Ring", shoppingCart: true, cartDecks: { named: [], more: 0, gone: 2 } })]);
    expect(screen.getByRole("link", { name: "Shopping for all decks" }).closest("p")?.textContent)
      .toBe("From Shopping for all decks. Bought for 2 decks you’ve since deleted.");
  });

  it("says where an add's copies went under the entry, linked, and Wanted by for a brew's read", () => {
    const decks = { named: [{ id: "d1", name: "Gishath" }, { id: "d2", name: "Omnath" }], more: 1, gone: 0 };
    draw([
      entry({ id: "w1", wentTo: { decks, soft: false } }),
      entry({ id: "w2", wentTo: { decks: { named: [{ id: "b1", name: "Brew" }], more: 0, gone: 0 }, soft: true } }),
      entry({ id: "w3", wentTo: { decks: { named: [], more: 0, gone: 2 }, soft: false } }),
    ]);
    const first = screen.getByRole("link", { name: "Gishath" }).closest("p")!;
    expect(first.textContent).toBe("Went to Gishath, Omnath and 1 more.");
    expect(screen.getByRole("link", { name: "Omnath" }).getAttribute("href")).toBe("/decks/d2");
    expect(screen.getByRole("link", { name: "Brew" }).closest("p")?.textContent).toBe("Wanted by Brew.");
    expect(screen.getAllByText((_, n) => n?.tagName === "P" && n.textContent === "Went to 2 decks you’ve since deleted.")).toHaveLength(1);
  });

  it("repeats it on each row of an entry with several, and not on an entry of one", async () => {
    const wentRow = (name: string, deckId: string): HistoryRow => ({ ...row(name, null, 1), wentTo: { decks: [{ deckId, copies: 1 }] } });
    const e = entry({ id: "m1", rowCount: 2, wentTo: { decks: { named: [{ id: "d1", name: "Gishath" }], more: 0, gone: 0 }, soft: false } });
    loadEntry.mockResolvedValue(detail(e, [wentRow("Sol Ring", "d1"), wentRow("Arcane Signet", "gone")], { d1: "Gishath" }));
    draw([e]);
    await act(async () => fireEvent.click(screen.getByRole("button", { expanded: false })));
    expect(await screen.findByText("Arcane Signet")).toBeTruthy();
    const lines = screen.getAllByText(/^Went to /).map((n) => n.textContent);
    expect(lines).toContain("Went to Gishath.");
    expect(lines).toContain("Went to a deck you’ve since deleted.");
  });

  it("draws no row line for an entry of one row: the entry line already says it", async () => {
    const e = entry({ id: "o1", rowCount: 1, wentTo: { decks: { named: [{ id: "d1", name: "Gishath" }], more: 0, gone: 0 }, soft: false } });
    loadEntry.mockResolvedValue(detail(e, [{ ...row("Sol Ring", null, 1), wentTo: { decks: [{ deckId: "d1", copies: 1 }] } }], { d1: "Gishath" }));
    draw([e]);
    await act(async () => fireEvent.click(screen.getByRole("button", { expanded: false })));
    expect((await screen.findAllByText("Sol Ring")).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, n) => n?.tagName === "P" && /^Went to /.test(n.textContent ?? ""))).toHaveLength(1);
    expect([...document.querySelectorAll("li span")].filter((n) => /^Went to /.test(n.textContent ?? ""))).toHaveLength(0);
  });

  it("lets a single row speak when the entry was listed before its placement was kept", async () => {
    const e = entry({ id: "late", rowCount: 1, wentTo: null });
    loadEntry.mockResolvedValue(detail(e, [{ ...row("Sol Ring", null, 1), wentTo: { decks: [{ deckId: "d1", copies: 1 }] } }], { d1: "Gishath" }));
    draw([e]);
    await act(async () => fireEvent.click(screen.getByRole("button", { expanded: false })));
    expect((await screen.findAllByText("Sol Ring")).length).toBeGreaterThan(0);
    expect(screen.getAllByText((_, n) => n?.tagName === "SPAN" && n.textContent === "Went to Gishath.")).toHaveLength(1);
  });

  it("names a deleted deck without a link and keeps Revert (§D3)", () => {
    draw([entry({ kind: "edit", source: "shopping:x", firstName: "Swords to Plowshares", shoppingDeck: { id: "x", name: null } })]);
    expect(screen.getByText("From the Shopping list of a deck you’ve since deleted")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: "Revert Swords to Plowshares" })).toBeTruthy();
  });

  it("keeps the two-way link between a Shopping purchase and the undo that reverted it (§D2)", () => {
    draw([
      entry({ id: "rv", kind: "revert", revertsId: "e1", revertsVisible: true, createdAt: new Date("2026-10-09T15:30:00Z"), firstName: null }),
      entry({ id: "e1", kind: "edit", source: "shopping:d1", revertedBy: "rv", revertedByVisible: true, shoppingDeck: { id: "d1", name: "Goblins" } }),
    ]);
    expect(screen.getByRole("link", { name: "by the revert at 15:30" }).getAttribute("href")).toBe("#entry-rv");
    expect(screen.getByText("Undid “Sol Ring”")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Goblins" })).toBeTruthy();
    // Reverted, so no Revert control of its own; the revert entry keeps one.
    expect(screen.queryByRole("button", { name: "Revert Sol Ring" })).toBeNull();
  });

  it("draws the deck name unlinked in a specimen drawn without anchors (/about)", () => {
    const e = entry({ kind: "edit", source: "shopping:d1", shoppingDeck: { id: "d1", name: "Goblins" } });
    render(
      <ul>
        <HistoryEntryItem e={e} title="Sol Ring" isOpen={false} detail={undefined} onToggle={() => {}} onRevert={() => {}} onRetry={() => {}} anchor={false} />
      </ul>,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Goblins")).toBeTruthy();
  });

  it("names a revert whose original has aged out, and draws no link to it", () => {
    draw([entry({ id: "rv", kind: "revert", revertsId: "old", revertsVisible: false, firstName: null })]);
    expect(screen.getByText("Undid a change from before 1 Oct")).toBeTruthy();
    expect(screen.getByText("That change has aged out of history.")).toBeTruthy();
  });

  it("pages older entries in, and keeps the list when the page fails", async () => {
    draw([entry({})], { nextBefore: 5 });
    loadPage.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce({ entries: [entry({ id: "e0", seq: 4, firstName: "Mana Crypt", createdAt: new Date("2026-10-02T10:00:00Z") })], nextBefore: null });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Show older changes" })));
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn’t load that/);
    expect(screen.getByText("Sol Ring", { exact: false })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Show older changes" })));
    expect(await screen.findByText("Mana Crypt", { exact: false })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show older changes" })).toBeNull();
    expect(loadPage).toHaveBeenLastCalledWith(5);
  });

  it("opens and reads the entry named by the link into view on arrival", async () => {
    const e = entry({});
    const scroll = vi.mocked(reveal);
    scroll.mockClear();
    loadEntry.mockResolvedValue(detail(e, [row("Sol Ring", 1, 3)]));
    await act(async () => {
      draw([e], { focusId: "e1" });
    });
    expect(loadEntry).toHaveBeenCalledWith("e1");
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith(document.getElementById("entry-e1"), "center");
    expect(screen.getByRole("button", { expanded: true })).toBeTruthy();
  });
});
