// The closed page's Your game cards (log reminder C1, L1): one per game, newest first, each with its own Log this game
// while unlogged; a logged game keeps its result with the check note and no button. The route's JSON turns dates into
// strings, so the cards are drawn from strings as the client receives them.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { named } from "../../lib/person-name/mint";
import type { TableGame } from "../../lib/social/rule-zero-games";
import type { ClosedTable } from "../../lib/social/rule-zero-table";
import { TableClosed } from "./table-closed";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/friends/table/table-1" }));
vi.mock("../../app/friends/table/result-actions", () => ({ gameLoggedAction: vi.fn(async () => null) }));
afterEach(cleanup);

const copy = ruleZeroCopy.expired;
const seats = (win: "you" | "colin"): TableGame["seats"] => [
  { name: win === "you" ? "Hugh" : named("Colin"), you: win === "you", place: 1, artCropUri: null },
  { name: win === "you" ? named("Colin") : "Hugh", you: win !== "you", place: 2, artCropUri: null },
];
const game = (over: Partial<TableGame>): TableGame => ({
  gameMs: Date.parse("2026-11-20T03:00:00Z"),
  startedAt: new Date("2026-11-20T03:00:00Z"),
  deckId: "d1",
  deckName: "Sai Thopters",
  result: { kind: "won", name: named("Colin") },
  seats: seats("colin"),
  loggedAt: null,
  until: new Date("2026-11-27T11:00:00Z"),
  ...over,
});
const closed = (games: TableGame[]): ClosedTable => ({
  tableId: "table-1",
  viewerDeckId: "d1",
  podName: named("Thursday night"),
  setBy: null,
  how: { kind: "morning", at: new Date("2026-11-20T11:00:00Z") },
  faces: [],
  loggedAt: null,
  games,
  viewerDeckName: "Sai Thopters",
  pastKept: false,
  endedAt: new Date("2026-11-20T11:00:00Z"),
});
// What the route's JSON hands the client: every Date a string.
const wire = (c: ClosedTable): ClosedTable => JSON.parse(JSON.stringify(c));

describe("the closed table's Your game cards", () => {
  it("draws an unlogged game with its result, its note and a Log this game that opens the filled-in form", () => {
    render(<TableClosed closed={wire(closed([game({})]))} />);
    const card = screen.getByRole("region", { name: copy.yourGame });
    expect(within(card).getByText(/Colin won/)).toBeTruthy();
    expect(card.textContent).toContain("You haven’t logged it yet. Seats and result are filled in for Sai Thopters until Fri, Nov 27.");
    const link = within(card).getByRole("link", { name: ruleZeroCopy.page.log });
    expect(link.getAttribute("href")).toBe(`/decks/d1?tab=games&table=table-1&game=${Date.parse("2026-11-20T03:00:00Z")}`);
    expect(screen.getByRole("link", { name: copy.back })).toBeTruthy();
  });

  it("draws a logged game with the check note and no Log button", () => {
    render(<TableClosed closed={wire(closed([game({ loggedAt: new Date("2026-11-20T17:14:00Z") })]))} />);
    const card = screen.getByRole("region", { name: copy.yourGame });
    expect(card.textContent).toContain("You logged this game on Fri, Nov 20 at ");
    expect(card.textContent).toContain("It’s on Sai Thopters’ Games tab.");
    expect(within(card).queryByRole("link", { name: ruleZeroCopy.page.log })).toBeNull();
  });

  it("draws one card per game, each with its own link, and a draw or a win for you in the heading", () => {
    const later = game({ gameMs: Date.parse("2026-11-20T05:00:00Z"), startedAt: new Date("2026-11-20T05:00:00Z"), result: { kind: "you" }, seats: seats("you") });
    render(<TableClosed closed={wire(closed([later, game({ result: { kind: "draw" } })]))} />);
    const cards = screen.getAllByRole("region", { name: copy.yourGame });
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText("You won")).toBeTruthy();
    expect(within(cards[1]).getByText("A draw")).toBeTruthy();
    expect(within(cards[0]).getByRole("link", { name: ruleZeroCopy.page.log }).getAttribute("href")).toContain(`game=${Date.parse("2026-11-20T05:00:00Z")}`);
  });

  it("keeps the host-close Log this game over Back to Friends when the viewer has no saved game", () => {
    const host = { kind: "host", byYou: true, by: null, at: new Date("2026-11-20T04:00:00Z"), logOpen: true } as const;
    render(<TableClosed closed={wire({ ...closed([]), how: host })} />);
    expect(screen.queryByRole("region", { name: copy.yourGame })).toBeNull();
    expect(screen.getByRole("link", { name: ruleZeroCopy.page.log }).getAttribute("href")).toBe("/decks/d1?tab=games&table=table-1");
    expect(screen.getByRole("link", { name: copy.back })).toBeTruthy();
  });

  it("C2: past the keep window the page says nothing fills in and offers Log it by hand on a blank form", () => {
    render(<TableClosed closed={wire({ ...closed([]), pastKept: true, endedAt: new Date("2026-11-20T11:00:00Z") })} />);
    expect(screen.getByText(/Logging from this table ended Fri, Nov 20 at 6 am, so nothing is filled in now\. Your game with Sai Thopters can still be logged by hand\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: copy.logByHand }).getAttribute("href")).toBe("/decks/d1?tab=games");
    expect(screen.queryByRole("link", { name: ruleZeroCopy.page.log })).toBeNull();
  });

  it("C2 needs a seated deck: with none, past the keep window draws the shipped page", () => {
    render(<TableClosed closed={wire({ ...closed([]), pastKept: true, viewerDeckId: null, viewerDeckName: null })} />);
    expect(screen.queryByRole("link", { name: copy.logByHand })).toBeNull();
    expect(screen.getByText(copy.title)).toBeTruthy();
  });
});
