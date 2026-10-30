import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const nav = vi.hoisted(() => ({ refresh: vi.fn() }));
const save = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: nav.refresh, push: vi.fn() }), usePathname: () => "/" }));
vi.mock("../../app/settings/feed-actions", () => ({ saveFeedKinds: save }));
vi.mock("../cards/card-detail-provider", () => ({ useCardDetailIfAny: () => null }));

import { FEED_SHOWN, WhatsNew, feedGroups } from "./whats-new";
import type { FeedView, HomeFeed } from "../../lib/feed/home";
import { feedCopy } from "../../lib/copy/feed";

const NOW = "2026-10-22T12:00:00.000Z";
const view = (n: number, hoursAgo: number, o: Partial<FeedView> = {}): FeedView => ({
  key: `k${n}`, kind: "new-set", at: new Date(Date.parse(NOW) - hoursAgo * 3_600_000).toISOString(), unseen: false,
  card: null, friend: null, href: `/collection/sets/s${n}`, opens: null, outbound: null, name: `Set ${n}`, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false, ...o,
});
const chosen = (items: FeedView[], o: Partial<Extract<HomeFeed, { chosen: true }>> = {}): HomeFeed => ({ chosen: true, on: ["new-set"], items, unseen: 0, lead: null, ...o });

beforeEach(() => {
  save.mockReset();
  nav.refresh.mockReset();
});

describe("WhatsNew, kinds on", () => {
  it("shows five, then Show all N expands the list in place", () => {
    const items = Array.from({ length: 9 }, (_, i) => view(i, i + 1));
    render(<WhatsNew feed={chosen(items, { unseen: 3 })} now={NOW} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(FEED_SHOWN);
    expect(screen.getByText("4 more")).toBeInTheDocument();
    expect(screen.getByText("· 3 new")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Choose what shows/ })).toHaveAttribute("href", "/settings");
    fireEvent.click(screen.getByRole("button", { name: "Show all 9" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();
  });

  it("moves focus to the first row Show all reveals, since the press itself leaves", () => {
    const items = Array.from({ length: 7 }, (_, i) => view(i, i + 1));
    render(<WhatsNew feed={chosen(items)} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Show all 7" }));
    const sixth = screen.getAllByRole("listitem")[FEED_SHOWN];
    // The row's named press, never its picture link (aria-hidden, out of the tab order).
    expect(document.activeElement).toBe(sixth.querySelector("[data-feed-press]"));
  });

  it("focuses the row Show all REVEALED when the groups put it ahead of a row already shown", () => {
    // Feed order: an older item first, then five from today. Cut to five: the older one (Earlier) and four of today.
    // Expanded, the fifth of today lands before the older row, which was shown all along.
    const items = [view(9, 48), ...Array.from({ length: 5 }, (_, i) => view(i, i + 1))];
    render(<WhatsNew feed={chosen(items)} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: "Show all 6" }));
    expect(document.activeElement?.closest("li")?.textContent).toContain("Set 4");
  });

  it("draws no footer at five or fewer, and no count with nothing unseen", () => {
    render(<WhatsNew feed={chosen([view(1, 2), view(2, 3)])} now={NOW} />);
    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();
    expect(screen.queryByText(/· \d+ new/)).toBeNull();
  });

  it("labels Today and Earlier only when the shown list holds both", () => {
    const { rerender } = render(<WhatsNew feed={chosen([view(1, 2), view(2, 30)])} now={NOW} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Earlier")).toBeInTheDocument();
    rerender(<WhatsNew feed={chosen([view(1, 2), view(2, 3)])} now={NOW} />);
    expect(screen.queryByText("Today")).toBeNull();
  });

  it("groups only the shown rows", () => {
    const items = [...Array.from({ length: 5 }, (_, i) => view(i, i + 1)), view(9, 40)];
    expect(feedGroups(items, NOW, false)).toMatchObject({ earlier: [], hidden: 1 });
    expect(feedGroups(items, NOW, true).earlier.map((i) => i.key)).toEqual(["k9"]);
  });

  it("says nothing is new and names the kinds that are on, with the Settings link", () => {
    render(<WhatsNew feed={chosen([], { on: ["new-set", "price-drop"] })} now={NOW} />);
    expect(screen.getByText("Nothing new right now.")).toBeInTheDocument();
    expect(screen.getByText(/new sets and price drops on your wishlist/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Choose what shows/ })).toBeInTheDocument();
  });

  it("names Wizards' kinds by their own inline form, never lowercased, and only the kinds still on (G1)", () => {
    const { container } = render(<WhatsNew feed={chosen([], { on: ["new-set", "secret-lair", "wizards-news"] })} now={NOW} />);
    const quiet = container.querySelector("[data-feed-quiet]")!.textContent!;
    expect(quiet).toContain("new sets, Secret Lair drops and Wizards news");
    expect(quiet).not.toMatch(/secret lair|wizards news|Commander decklists/);
    expect(container.querySelector("[data-feed-quiet]")!.textContent).not.toContain("Other Wizards news");
  });

  it("draws nothing under a lead that was the only item", () => {
    const { container } = render(<WhatsNew feed={chosen([], { lead: view(1, 1, { unseen: true }), unseen: 1 })} now={NOW} />);
    expect(container.querySelector("[data-whats-new]")).toBeNull();
  });
});

describe("WhatsNew, nothing chosen: the inline opt-in", () => {
  const offer: HomeFeed = { chosen: false, offer: ["new-set", "new-precon", "price-drop", "trade-match", "combo"], alsoOn: false };

  it("draws every kind unchecked, no count and no Settings link, and Show these waits for a choice", () => {
    render(<WhatsNew feed={offer} now={NOW} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(5);
    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeChecked();
    expect(screen.queryByRole("link", { name: /Choose what shows/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Show these" })).toBeDisabled();
  });

  it("says nothing shows until a choice, unless a default-on kind already shows here", () => {
    const { rerender } = render(<WhatsNew feed={offer} now={NOW} />);
    expect(screen.getByText(feedCopy.home.optIn.line)).toBeTruthy();
    rerender(<WhatsNew feed={{ ...offer, alsoOn: true }} now={NOW} />);
    expect(screen.getByText(feedCopy.home.optIn.lineAlsoOn)).toBeTruthy();
    expect(screen.queryByText(feedCopy.home.optIn.line)).toBeNull();
  });

  it("saves the chosen kinds through Settings' action, then refreshes Home", async () => {
    save.mockResolvedValue({ ok: true, changed: true });
    render(<WhatsNew feed={offer} now={NOW} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /New sets/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Combos you can make/ }));
    fireEvent.click(screen.getByRole("button", { name: "Show these" }));
    await waitFor(() => expect(nav.refresh).toHaveBeenCalled());
    // With the kinds the page offered, so a kind that came available since keeps what it had.
    expect(save).toHaveBeenCalledWith(["new-set", "combo"], offer.offer);
  });

  it("says so when the save fails, and stays", async () => {
    save.mockResolvedValue({ ok: false, reason: "invalid" });
    render(<WhatsNew feed={offer} now={NOW} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /New sets/ }));
    fireEvent.click(screen.getByRole("button", { name: "Show these" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t save that. Try again.");
    // A refusal redraws the page, so the boxes offered are the current ones.
    expect(nav.refresh).toHaveBeenCalled();
  });

  it("holds the boxes while a save is in flight, so the visible choice is the saved one", async () => {
    let finish!: (v: unknown) => void;
    save.mockReturnValue(new Promise((r) => (finish = r)));
    render(<WhatsNew feed={offer} now={NOW} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /New sets/ }));
    fireEvent.click(screen.getByRole("button", { name: "Show these" }));
    await waitFor(() => expect(screen.getByRole("checkbox", { name: /Combos you can make/ })).toBeDisabled());
    finish({ ok: true, changed: true });
  });

  it("drops a selection the page no longer offers when the offer shrinks", () => {
    const { rerender } = render(<WhatsNew feed={offer} now={NOW} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Combos you can make/ }));
    rerender(<WhatsNew feed={{ chosen: false, offer: ["new-set", "new-precon", "price-drop", "trade-match"], alsoOn: false }} now={NOW} />);
    expect(screen.queryByRole("checkbox", { name: /Combos you can make/ })).toBeNull();
    // Back to the full offer: the box the reader had ticked is not ticked behind their back.
    rerender(<WhatsNew feed={offer} now={NOW} />);
    expect(screen.getByRole("checkbox", { name: /Combos you can make/ })).not.toBeChecked();
  });
});
