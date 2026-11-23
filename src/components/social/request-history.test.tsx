// Request history (#2984): the two tabs, the kicker and line of each state, the month groups, the empty tabs, the ex-friend foot
// line, and "Show older requests" appending the next page. The whole row opens card details.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { named } from "../../lib/person-name/mint";
import { historyCopy as h } from "../../lib/copy/request-history";
import { spareCopy } from "../../lib/copy/social";
import type { HistoryEntry } from "../../lib/social/request-history";

const more = vi.hoisted(() => vi.fn());
vi.mock("../../app/friends/request-history-actions", () => ({ loadMoreHistoryAction: more }));
vi.mock("../cards/card-detail-context", () => ({
  CardDetailTrigger: ({ oracleId, children, className }: { oracleId: string; children: React.ReactNode; className?: string }) => (
    <button type="button" data-oracle={oracleId} className={className}>{children}</button>
  ),
}));

import { RequestHistory } from "./request-history";

const NOW = Date.parse("2026-11-20T12:00:00Z");
const entry = (n: number, over: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: `id-${n}`, oracleId: `o-${n}`, card: { name: `Card ${n}`, imageUri: null }, copies: 1, deckName: null,
  other: { publicId: `p-${n}`, displayName: named("Rosa"), commander: null }, state: "yes",
  createdAt: new Date("2026-11-10T00:00:00Z"), endedAt: new Date("2026-11-12T00:00:00Z"), offer: false, ...over,
});
const side = (entries: HistoryEntry[], next: { createdAt: string; id: string } | null = null) => ({ entries, next });
const view = (asked = side([]), ofYou = side([]), hidden = 0) => render(<RequestHistory asked={asked} ofYou={ofYou} hiddenCount={hidden} nowMs={NOW} />);

beforeEach(() => more.mockReset());
afterEach(cleanup);

describe("RequestHistory", () => {
  it("draws From you first, with each state's kicker, its day and its line, grouped by month", () => {
    view(side([
      entry(1, { state: "yes" }),
      entry(2, { state: "no", deckName: "Thopter Factory" }),
      entry(3, { state: "withdrawn", endedAt: null }),
      entry(4, { state: "expired", endedAt: new Date("2026-11-24T00:00:00Z") }),
      entry(5, { state: "open", endedAt: null, createdAt: new Date("2026-11-18T00:00:00Z") }),
      entry(6, { createdAt: new Date("2026-10-30T00:00:00Z"), endedAt: new Date("2026-10-31T00:00:00Z") }),
    ]));
    for (const k of [h.kind.yes, h.kind.no, h.kind.withdrawn, h.kind.expired, h.kind.open]) expect(screen.getAllByText(k).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /^November 2026/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /^October 2026/ })).toBeTruthy();
    expect(screen.getAllByText("Nov 12").length).toBeGreaterThan(0);
    expect(screen.getByText("Nov 24")).toBeTruthy();
    expect(screen.getByText(h.asked("Thopter Factory", "Nov 10"))).toBeTruthy();
    expect(screen.getByText(h.openMine(null, 12))).toBeTruthy();
  });

  it("claims no date for a withdrawal from before withdrawn_at existed", () => {
    view(side([entry(3, { state: "withdrawn", endedAt: null })]));
    const kicker = screen.getByText(h.kind.withdrawn);
    expect(within(kicker.parentElement!).queryByText(/^[A-Z][a-z]{2} \d+$/)).toBeNull();
  });

  it("opens card details from the whole row", () => {
    view(side([entry(1)]));
    expect(screen.getByRole("button", { name: /Card 1/ }).getAttribute("data-oracle")).toBe("o-1");
  });

  it("switches to To you, where an open ask says where to act and a Yes says the handover is theirs", () => {
    view(side([entry(1)]), side([entry(7, { state: "open", endedAt: null, createdAt: new Date("2026-11-18T00:00:00Z") }), entry(8, { state: "yes" })]));
    fireEvent.click(screen.getByRole("tab", { name: h.tabs.ofYou }));
    expect(screen.getByText(h.ofYouOpen)).toBeTruthy();
    expect(screen.getByText(h.openTheirs(12))).toBeTruthy();
    expect(screen.getByText(h.theirsYes)).toBeTruthy();
  });

  it("From you draws an offer with the ask's kickers, `Offered` while open, and its own title and line", () => {
    view(side([
      entry(1, { offer: true, state: "open", endedAt: null, createdAt: new Date("2026-11-18T00:00:00Z"), copies: 2 }),
      entry(2, { offer: true, state: "yes" }),
      entry(3, { offer: true, state: "no" }),
      entry(4, { offer: true, state: "withdrawn", endedAt: new Date("2026-11-13T00:00:00Z") }),
    ]));
    expect(screen.getByText(h.offer.open)).toBeTruthy();
    expect(screen.getByText("You offered 2 Card 1 to Rosa")).toBeTruthy();
    expect(screen.getByText("Rosa said yes to Card 2")).toBeTruthy();
    expect(screen.getByText("Rosa passed on Card 3")).toBeTruthy();
    expect(screen.getByText("You withdrew your offer of Card 4 to Rosa")).toBeTruthy();
    expect(screen.getByText("12 days left. Withdraw it from Rosa’s Wishlist tab.")).toBeTruthy();
    expect(screen.getAllByText(h.offer.offered("Nov 10")).length).toBe(3);
  });

  it("To you draws an offer as Waiting on you with the ask's lines, and an offer is not drawn as an ask", () => {
    view(side([]), side([entry(1, { offer: true, state: "open", endedAt: null, createdAt: new Date("2026-11-18T00:00:00Z") }), entry(2, { offer: true, state: "yes" })]));
    fireEvent.click(screen.getByRole("tab", { name: h.tabs.ofYou }));
    expect(screen.getByText(h.ofYouOpen)).toBeTruthy();
    expect(screen.getByText("Rosa offered you Card 1")).toBeTruthy();
    expect(screen.getByText(h.openTheirs(12))).toBeTruthy();
    expect(screen.getByText(h.theirsYes)).toBeTruthy();
    expect(screen.queryByText(/asked you for/)).toBeNull();
  });

  it("an offer's answered words are the ones Home and Friends already use", () => {
    const f = named("Rosa");
    expect(JSON.stringify(h.offer.mine.yes(f, "X"))).toBe(JSON.stringify(spareCopy.request.offer.answered.yes(f, "X")));
    expect(JSON.stringify(h.offer.mine.no(f, "X"))).toBe(JSON.stringify(spareCopy.request.offer.answered.no(f, "X")));
    expect(JSON.stringify(h.offer.mine.expired(f, "X"))).toBe(JSON.stringify(h.mine.expired(f, "X")));
  });

  it("draws each empty tab's title and where requests come from", () => {
    view();
    expect(screen.getByText(h.emptyAsked.title)).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: h.tabs.ofYou }));
    expect(screen.getByText(h.emptyOfYou.title)).toBeTruthy();
  });

  it("draws the ex-friend foot line only when some requests are hidden", () => {
    const { unmount } = view(side([entry(1)]), side([]), 0);
    expect(screen.queryByText(h.exFriends)).toBeNull();
    unmount();
    view(side([entry(1)]), side([]), 2);
    expect(screen.getByText(h.exFriends)).toBeTruthy();
  });

  it("appends the next page on Show older requests, skips a repeated row, and says when it fails", async () => {
    more.mockResolvedValueOnce(side([entry(1), entry(2, { createdAt: new Date("2026-09-02T00:00:00Z") })]));
    view(side([entry(1)], { createdAt: "2026-11-10T00:00:00.000000Z", id: "id-1" }));
    fireEvent.click(screen.getByRole("button", { name: h.older }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /^September 2026/ })).toBeTruthy());
    expect(more).toHaveBeenCalledWith("asked", { createdAt: "2026-11-10T00:00:00.000000Z", id: "id-1" });
    expect(screen.getAllByRole("button", { name: /Card 1/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: h.older })).toBeNull();
  });

  it("keeps the button and says so when the next page fails", async () => {
    more.mockRejectedValueOnce(new Error("down"));
    view(side([entry(1)], { createdAt: "2026-11-10T00:00:00.000000Z", id: "id-1" }));
    fireEvent.click(screen.getByRole("button", { name: h.older }));
    await waitFor(() => expect(screen.getByText(h.olderFailed)).toBeTruthy());
    expect(screen.getByRole("button", { name: h.older })).toBeTruthy();
  });
});
