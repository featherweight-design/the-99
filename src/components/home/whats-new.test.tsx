import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const nav = vi.hoisted(() => ({ refresh: vi.fn() }));
const save = vi.hoisted(() => vi.fn());
const closeOffer = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: nav.refresh, push: vi.fn() }), usePathname: () => "/" }));
vi.mock("../../app/settings/feed-actions", () => ({ saveFeedKinds: save, closeFeedOfferAction: closeOffer }));
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
  closeOffer.mockReset();
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

describe("WhatsNew, nothing in the window and something to offer (small items 5, Offer-Empty)", () => {
  const o = feedCopy.home.offer;
  const OFFER = ["new-set", "new-precon", "price-drop", "trade-match", "combo"] as const;
  // A reader who never chose, with default-on kinds on; and one with every kind off.
  const empty: HomeFeed = { chosen: false, offer: [...OFFER], on: ["secret-lair", "spare-request"] };
  const allOff: HomeFeed = { chosen: false, offer: [...OFFER], on: [] };
  const line = (container: HTMLElement) => container.querySelector("[data-feed-offer]");
  const pick = () => fireEvent.click(screen.getByRole("button", { name: /Pick/ }));

  it("draws the quiet line naming the kinds on, then the offer line under its rule, and no opt-in panel", () => {
    const { container } = render(<WhatsNew feed={empty} now={NOW} />);
    expect(container.querySelector("[data-whats-new=quiet]")).not.toBeNull();
    expect(container.querySelector("[data-feed-quiet]")!.textContent).toBe(
      `${feedCopy.home.quietLead} You hear about Secret Lair drops and friends asking for your spares here.`,
    );
    expect(line(container)?.getAttribute("data-feed-offer")).toBe("closed");
    expect(line(container)?.className).toContain("border-top");
    // The quiet line first, the offer line last in the box.
    expect(line(container)?.previousElementSibling).toBe(container.querySelector("[data-feed-quiet]"));
    expect(line(container)?.parentElement?.lastElementChild).toBe(line(container));
    expect(container.querySelector("[data-feed-opt-in]")).toBeNull();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryByRole("link", { name: /Choose what shows/ })).toBeNull();
  });

  it("with no kind on, draws the offer line alone, with no quiet line and no rule", () => {
    const { container } = render(<WhatsNew feed={allOff} now={NOW} />);
    expect(container.querySelector("[data-whats-new=offer]")).not.toBeNull();
    expect(container.querySelector("[data-feed-quiet]")).toBeNull();
    expect(line(container)?.getAttribute("data-feed-offer")).toBe("closed");
    expect(line(container)?.className ?? "").not.toContain("border-top");
  });

  it("after its ✕, the quiet line alone", async () => {
    closeOffer.mockResolvedValue({ ok: true, changed: true });
    const { container } = render(<WhatsNew feed={empty} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: o.closeAria }));
    expect(line(container)).toBeNull();
    expect(container.querySelector("[data-feed-quiet]")!.textContent).toContain("Secret Lair drops");
    await waitFor(() => expect(closeOffer).toHaveBeenCalledTimes(1));
  });

  it("after its ✕ with no kind on, the quiet line's lead alone: nothing to name", async () => {
    closeOffer.mockResolvedValue({ ok: true, changed: true });
    const { container } = render(<WhatsNew feed={allOff} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: o.closeAria }));
    expect(line(container)).toBeNull();
    expect(container.querySelector("[data-feed-quiet]")!.textContent).toBe(feedCopy.home.quietLead);
    await waitFor(() => expect(closeOffer).toHaveBeenCalledTimes(1));
  });

  it("puts the line back, and takes the lead-alone quiet line away, when the ✕'s write throws", async () => {
    closeOffer.mockRejectedValue(new Error("down"));
    const { container } = render(<WhatsNew feed={allOff} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: o.closeAria }));
    expect(await screen.findByRole("alert")).toHaveTextContent(feedCopy.news.failed);
    expect(line(container)).not.toBeNull();
    expect(container.querySelector("[data-feed-quiet]")).toBeNull();
  });

  it("Pick opens every kind unchecked, and Show these waits for a choice", () => {
    render(<WhatsNew feed={empty} now={NOW} />);
    pick();
    expect(screen.getAllByRole("checkbox")).toHaveLength(OFFER.length);
    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeChecked();
    expect(screen.getByRole("button", { name: o.save })).toBeDisabled();
  });

  it("saves the chosen kinds through Settings' action, then refreshes Home", async () => {
    save.mockResolvedValue({ ok: true, changed: true });
    render(<WhatsNew feed={allOff} now={NOW} />);
    pick();
    fireEvent.click(screen.getByRole("checkbox", { name: /New sets/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Combos you can make/ }));
    fireEvent.click(screen.getByRole("button", { name: o.save }));
    await waitFor(() => expect(nav.refresh).toHaveBeenCalled());
    // With the kinds the page offered, so a kind that came available since keeps what it had.
    expect(save).toHaveBeenCalledWith(["new-set", "combo"], [...OFFER]);
  });

  it("says so when the save fails, and stays", async () => {
    save.mockResolvedValue({ ok: false, reason: "invalid" });
    render(<WhatsNew feed={empty} now={NOW} />);
    pick();
    fireEvent.click(screen.getByRole("checkbox", { name: /New sets/ }));
    fireEvent.click(screen.getByRole("button", { name: o.save }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t save that. Try again.");
    // A refusal redraws the page, so the boxes offered are the current ones.
    expect(nav.refresh).toHaveBeenCalled();
  });

  it("holds the boxes while a save is in flight, so the visible choice is the saved one", async () => {
    let finish!: (v: unknown) => void;
    save.mockReturnValue(new Promise((r) => (finish = r)));
    render(<WhatsNew feed={empty} now={NOW} />);
    pick();
    fireEvent.click(screen.getByRole("checkbox", { name: /New sets/ }));
    fireEvent.click(screen.getByRole("button", { name: o.save }));
    await waitFor(() => expect(screen.getByRole("checkbox", { name: /Combos you can make/ })).toBeDisabled());
    finish({ ok: true, changed: true });
  });

  it("starts over when the offer changes: a box the page no longer offers leaves, and nothing comes back ticked", () => {
    const { rerender } = render(<WhatsNew feed={empty} now={NOW} />);
    pick();
    fireEvent.click(screen.getByRole("checkbox", { name: /Combos you can make/ }));
    rerender(<WhatsNew feed={{ ...empty, offer: ["new-set", "new-precon", "price-drop", "trade-match"] }} now={NOW} />);
    pick();
    expect(screen.queryByRole("checkbox", { name: /Combos you can make/ })).toBeNull();
    rerender(<WhatsNew feed={empty} now={NOW} />);
    pick();
    expect(screen.getByRole("checkbox", { name: /Combos you can make/ })).not.toBeChecked();
  });
});

describe("WhatsNew, never chosen: the offer line (announcements call 3)", () => {
  const o = feedCopy.home.offer;
  const OFFER = ["new-set", "price-drop", "combo"] as const;
  const never = (items: FeedView[], extra: Partial<Extract<HomeFeed, { chosen: true }>> = {}) => chosen(items, { offer: [...OFFER], ...extra });
  const line = (container: HTMLElement) => container.querySelector("[data-feed-offer]");

  it("ends the rows with the line, Pick ▾ and a ✕, and draws no boxes until Pick", () => {
    const { container } = render(<WhatsNew feed={never([view(1, 2), view(2, 3)])} now={NOW} />);
    expect(line(container)?.getAttribute("data-feed-offer")).toBe("closed");
    expect(line(container)?.textContent).toContain(o.lead);
    // It names only the kinds this reader can pick, never one they cannot get.
    expect(line(container)?.textContent).toContain("New sets, price drops on your wishlist and combos you can make.");
    expect(line(container)?.textContent).not.toContain("trade matches");
    // Last in the box, under the rows.
    expect(line(container)?.parentElement?.lastElementChild).toBe(line(container));
    expect(screen.getByRole("button", { name: /Pick/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: o.closeAria })).toBeTruthy();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  // The loader answers an empty window `chosen: false` (above), so a `chosen: true` view with no rows never carries it.
  it("follows the rows in an items view: none under a chosen quiet line, and none under a lead with nothing else", () => {
    const { container, rerender } = render(<WhatsNew feed={never([])} now={NOW} />);
    expect(container.querySelector("[data-feed-quiet]")).not.toBeNull();
    expect(line(container)).toBeNull();
    rerender(<WhatsNew feed={never([], { lead: view(9, 1) })} now={NOW} />);
    expect(container.querySelector("[data-whats-new]")).toBeNull();
    expect(line(container)).toBeNull();
  });

  it("draws no line once the reader has chosen (no offer), and none with an empty offer", () => {
    const { container, rerender } = render(<WhatsNew feed={chosen([view(1, 2)])} now={NOW} />);
    expect(line(container)).toBeNull();
    rerender(<WhatsNew feed={chosen([view(1, 2)], { offer: [] })} now={NOW} />);
    expect(line(container)).toBeNull();
  });

  it("Pick opens the shipped boxes in place, every box empty, with Show these, and focuses the first", () => {
    const { container } = render(<WhatsNew feed={never([view(1, 2)])} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: /Pick/ }));
    expect(line(container)?.getAttribute("data-feed-offer")).toBe("open");
    expect(line(container)?.textContent).toContain(o.openRest);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(OFFER.length);
    for (const box of boxes) expect(box).not.toBeChecked();
    expect(document.activeElement).toBe(boxes[0]);
    expect(screen.getByRole("button", { name: "Show these" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Pick/ })).toBeNull();
  });

  it("Show these saves the ticked kinds through Settings' action, scoped to the offer, then refreshes", async () => {
    save.mockResolvedValue({ ok: true, changed: true });
    render(<WhatsNew feed={never([view(1, 2)])} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: /Pick/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Combos you can make/ }));
    fireEvent.click(screen.getByRole("button", { name: "Show these" }));
    await waitFor(() => expect(nav.refresh).toHaveBeenCalled());
    expect(save).toHaveBeenCalledWith(["combo"], [...OFFER]);
    expect(closeOffer).not.toHaveBeenCalled();
  });

  it("✕ saves an empty choice: the line leaves at once, focus goes to the head, and Home refreshes", async () => {
    closeOffer.mockResolvedValue({ ok: true, changed: true });
    const { container } = render(<WhatsNew feed={never([view(1, 2)])} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: o.closeAria }));
    expect(line(container)).toBeNull();
    expect(document.activeElement?.id).toBe("home-whats-new");
    await waitFor(() => expect(nav.refresh).toHaveBeenCalled());
    expect(closeOffer).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it("✕ on the opened boxes saves the empty choice too", async () => {
    closeOffer.mockResolvedValue({ ok: true, changed: true });
    const { container } = render(<WhatsNew feed={never([view(1, 2)])} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: /Pick/ }));
    fireEvent.click(screen.getByRole("button", { name: o.closeAria }));
    expect(line(container)).toBeNull();
    await waitFor(() => expect(closeOffer).toHaveBeenCalledTimes(1));
  });

  it("puts the line back with the reason when the ✕'s write throws", async () => {
    closeOffer.mockRejectedValue(new Error("down"));
    const { container } = render(<WhatsNew feed={never([view(1, 2)])} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: o.closeAria }));
    expect(await screen.findByRole("alert")).toHaveTextContent(feedCopy.news.failed);
    expect(line(container)).not.toBeNull();
    expect(nav.refresh).not.toHaveBeenCalled();
  });
});
