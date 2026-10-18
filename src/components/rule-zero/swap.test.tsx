// The swap (Rule 0 plan PR 7a; boards S1, S2, S6, W1, W2): the offer on the viewer's own flagged seat only, one press
// seats a deck with no confirm, the shared toast with Undo, the read's own lines, and a refusal said aloud.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ refresh: vi.fn(), seen: vi.fn(async () => true), swap: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("../../app/friends/table/actions", () => ({ markTableSeen: m.seen, swapSeatDeckAction: m.swap }));
vi.mock("../../app/friends/table/setup-actions", () => ({ loadTableSetupAction: vi.fn(), reseatTableAction: vi.fn() }));

import { ruleZeroCopy as copy } from "../../lib/copy/rule-zero";
import { TABLES, VIEWER_DECK_ID } from "../../lib/rule-zero/table-fixtures";
import type { TableView } from "../../lib/social/rule-zero-table";
import { TableBody } from "./table-body";
import { TableLive } from "./table-live";

const AT = new Date("2026-10-16T21:40:00Z");
const s = copy.swap;
// A first look: nothing recorded yet, so the own lines come from the swap the page made, not from `seenAt`.
const S1: TableView = { ...TABLES.S1, seenAt: null };
const seatOf = (name: string) => screen.getByRole("article", { name: name === "You" ? "Your seat" : `${name}’s seat` });
const readCard = () => screen.getByTestId("read-card");

/** The table after the viewer seats Sai Thopters: their seat holds it, changed a moment after the visit looked. */
function swappedTo(view: TableView, name: string, deckId: string): TableView {
  return {
    ...view,
    offer: [],
    viewerDeckId: deckId,
    seats: view.seats.map((x) => (x.you && x.deck ? { ...x, changedAt: new Date(AT.getTime() + 60_000), deck: { ...x.deck, deckId, name } } : x)),
  };
}

beforeEach(() => {
  // No poll answers: these tests are about the swap.
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("Closer to the table (S1, S6, W1)", () => {
  it("sits under the viewer's own flagged seat, nearest first, and nowhere else", () => {
    render(<TableLive initial={S1} gamesEnabled now={AT} />);
    const offer = within(seatOf("You")).getByRole("region", { name: s.title });
    expect(within(offer).getAllByRole("button", { name: new RegExp(`^${s.swapIn}`) }).map((b) => b.getAttribute("aria-label"))).toEqual([
      `${s.swapIn}: Sai Thopters`,
      `${s.swapIn}: Jace Clones`,
    ]);
    expect(screen.getAllByTestId("seat-offer")).toHaveLength(1);
    expect(within(seatOf("Colin")).queryByTestId("seat-offer")).toBeNull();
  });

  it("closes the read's sentence on the viewer's nearer decks, one or many", () => {
    render(<TableLive initial={S1} gamesEnabled now={AT} />);
    expect(readCard().textContent).toContain(copy.read.closer(2));
    cleanup();
    render(<TableLive initial={{ ...TABLES.S6, seenAt: AT }} gamesEnabled now={AT} />);
    expect(readCard().textContent).toContain(copy.read.closer(1));
  });

  it("draws an unanswered range's marks alone on a phone, with its name for a screen reader", () => {
    const [first, ...rest] = S1.offer;
    render(<TableLive initial={{ ...S1, offer: [{ ...first, permits: [1, 2], answered: null }, ...rest] }} gamesEnabled now={AT} />);
    const row = within(screen.getByTestId("seat-offer")).getByRole("button", { name: `${s.swapIn}: ${first.name}` }).parentElement!;
    expect(within(row).getByTestId("offer-chip-marks").textContent).toBe("");
    expect(within(row).getAllByText("Exhibition or Core").length).toBe(2);
  });

  it("draws nothing when no deck is nearer, and the flag stays", () => {
    render(<TableLive initial={{ ...S1, offer: [] }} gamesEnabled now={AT} />);
    expect(screen.queryByTestId("seat-offer")).toBeNull();
    expect(within(seatOf("You")).getByText(copy.seat.above)).toBeTruthy();
    expect(readCard().textContent).not.toContain(copy.read.closer(2));
  });
});

describe("Swap in (S2, W2)", () => {
  it("seats it with one press, redraws from the answer, says so, and Undo puts the old deck back", async () => {
    m.swap.mockResolvedValueOnce({ ok: true, view: swappedTo(S1, "Sai Thopters", "deck-viewer-sai") });
    render(<TableLive initial={S1} gamesEnabled now={AT} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: `${s.swapIn}: Sai Thopters` })));
    expect(m.swap).toHaveBeenCalledWith(S1.tableId, "deck-viewer-sai");
    // The read says it in place of its sentence; the seat carries this visit's change; the offer is gone.
    expect(readCard().textContent).toContain(copy.read.youSwapped("Sai Thopters"));
    expect(within(seatOf("You")).getByTestId("changed")).toBeTruthy();
    expect(screen.queryByTestId("seat-offer")).toBeNull();
    const toast = screen.getByRole("status");
    expect(toast.textContent).toContain(s.toast("Sai Thopters"));
    m.swap.mockResolvedValueOnce({ ok: true, view: S1 });
    await act(async () => fireEvent.click(within(toast).getByRole("button", { name: s.undo })));
    expect(m.swap).toHaveBeenLastCalledWith(S1.tableId, VIEWER_DECK_ID);
    expect(screen.queryByRole("status")).toBeNull();
    // Undone: the seat and the read are as they were.
    expect(within(seatOf("You")).queryByTestId("changed")).toBeNull();
    expect(readCard().textContent).not.toContain(copy.read.youSwapped("Sai Thopters"));
  });

  it("drops a check that was in flight when the swap landed, so the old deck never draws again", async () => {
    let answer: (r: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((r) => (answer = r))));
    m.swap.mockResolvedValueOnce({ ok: true, view: swappedTo(S1, "Sai Thopters", "deck-viewer-sai") });
    render(<TableLive initial={S1} gamesEnabled now={AT} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: `${s.swapIn}: Sai Thopters` })));
    // The arrival check, started before the swap, answers with the table as it was.
    await act(async () => answer(new Response(JSON.stringify({ kind: "open", view: S1 }), { status: 200 })));
    expect(within(seatOf("You")).getByText("Sai Thopters")).toBeTruthy();
    expect(screen.queryByTestId("seat-offer")).toBeNull();
    // The swap stood in for the dropped check: the visit's baseline is set and what it shows is recorded as seen.
    expect(m.seen).toHaveBeenCalledWith(S1.tableId, S1.revision.toISOString());
  });

  it("holds an older toast's Undo while a newer swap is still in flight", async () => {
    // The first swap lands on a deck that still leaves the seat flagged, so the offer stays.
    const first = { ...swappedTo(S1, "Jace Clones", "deck-viewer-jace"), offer: S1.offer };
    m.swap.mockResolvedValueOnce({ ok: true, view: first });
    render(<TableLive initial={S1} gamesEnabled now={AT} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: `${s.swapIn}: Jace Clones` })));
    const undo = within(screen.getByRole("status")).getByRole("button", { name: s.undo });
    m.swap.mockImplementationOnce(() => new Promise(() => {}));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: `${s.swapIn}: Sai Thopters` })));
    await act(async () => fireEvent.click(undo));
    expect(m.swap).toHaveBeenCalledTimes(2);
  });

  it("says the swap on a read that leaves a seat out, and keeps what it leaves out", () => {
    // T8 leaves two seats out (86 and 101 cards); the viewer's own seat swapped this visit.
    const deck = TABLES.T8.viewerDeckId!;
    render(<TableBody view={TABLES.T8} gamesEnabled now={AT} swappedTo={deck} />);
    const said = readCard().querySelector("p")?.textContent ?? "";
    const you = TABLES.T8.seats.find((x) => x.you)!.deck!.name;
    expect(said.startsWith(copy.read.youSwapped(you))).toBe(true);
    expect(said).toContain("87 of 100");
  });

  it("says the swap above Since you looked", async () => {
    const colinMoved: TableView = {
      ...S1,
      seenAt: AT,
      seats: S1.seats.map((x) => (x.displayName === "Colin" ? { ...x, changedAt: new Date(AT.getTime() + 30_000) } : x)),
    };
    m.swap.mockResolvedValueOnce({ ok: true, view: { ...swappedTo(colinMoved, "Sai Thopters", "deck-viewer-sai") } });
    render(<TableLive initial={colinMoved} gamesEnabled now={AT} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: `${s.swapIn}: Sai Thopters` })));
    expect(within(readCard()).getByTestId("since")).toBeTruthy();
    expect(readCard().textContent).toContain(copy.read.youSwapped("Sai Thopters"));
  });

  it("says a refused swap aloud and keeps the table as it was", async () => {
    m.swap.mockResolvedValueOnce({ ok: false });
    render(<TableLive initial={S1} gamesEnabled now={AT} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: `${s.swapIn}: Jace Clones` })));
    expect(screen.getByRole("alert").textContent).toContain(s.failed);
    expect(screen.getByTestId("seat-offer")).toBeTruthy();
  });

});
