import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const open = vi.hoisted(() => vi.fn());
vi.mock("../cards/card-detail-provider", () => ({ useCardDetailIfAny: () => ({ open }) }));

import { FeedItemRow } from "./feed-item";
import type { FeedView } from "../../lib/feed/home";

const NOW = "2026-10-22T12:00:00.000Z";
const view = (o: Partial<FeedView>): FeedView => ({
  key: "k", kind: "new-set", at: "2026-10-22T07:00:00Z", unseen: true, card: { oracleId: "c", name: "Sai, Master Thopterist", image: "sai.jpg", art: null, colorIdentity: ["U"] },
  friend: null, href: null, opens: null, outbound: null, name: null, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false, ...o,
});
const list = (node: React.ReactNode) => render(<ul>{node}</ul>);

describe("FeedItemRow", () => {
  it("draws the kicker, the age, the title and the line, with the accent diamond while unseen", () => {
    const { container } = list(<FeedItemRow item={view({ name: "Secrets of Strixhaven", setSize: 288, href: "/collection/sets/sos" })} now={NOW} />);
    expect(screen.getByText("New set")).toBeInTheDocument();
    // The age twice, one per width: on the kicker line on a phone, beside the press from desktop.
    const ages = screen.getAllByText("5h ago");
    expect(ages).toHaveLength(2);
    expect(ages[0].className).toMatch(/(^|\s)md:hidden(\s|$)/);
    expect(ages[1].className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(ages[1].className).toMatch(/(^|\s)md:inline(\s|$)/);
    expect(screen.getByText("Secrets of Strixhaven is out")).toBeInTheDocument();
    expect(screen.getByText("288 cards.")).toBeInTheDocument();
    expect(container.querySelector("[data-feed-unseen]")).not.toBeNull();
    expect(screen.getByRole("link", { name: "See the set ›" })).toHaveAttribute("href", "/collection/sets/sos");
    // The card at card shape, never the art crop.
    expect(container.querySelector('[data-commander-thumb="feed"]')).not.toBeNull();
  });

  it("puts the desktop age on the press's line, before it, on one baseline", () => {
    const { container } = list(<FeedItemRow item={view({ href: "/x" })} now={NOW} />);
    const age = container.querySelector("[data-feed-age-desktop]")!;
    const line = age.parentElement!;
    expect(line.className).toMatch(/md:items-baseline/);
    expect(line.className).toMatch(/md:col-start-3/);
    expect(line.className).toMatch(/md:flex-nowrap/);
    expect(age.nextElementSibling?.textContent).toBe("See the set ›");
  });

  it("keeps the desktop age in the right column for a row with no press", () => {
    const { container } = list(<FeedItemRow item={view({ kind: "spare-request", friend: { publicId: "p", displayName: "Peter" } })} now={NOW} />);
    const age = container.querySelector("[data-feed-age-desktop]")!;
    expect(age.parentElement!.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(age.parentElement!.className).toMatch(/md:flex(\s|$)/);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("drops the diamond and steps the kicker down once seen", () => {
    const { container } = list(<FeedItemRow item={view({ unseen: false, href: "/x" })} now={NOW} />);
    expect(container.querySelector("[data-feed-unseen]")).toBeNull();
    expect(screen.getByText("New set").className).toContain("--fg-locked");
  });

  it("draws a combo with the shipped two-card-combo mark, not a card, and opens the first piece's detail", () => {
    const { container } = list(
      <FeedItemRow item={view({ kind: "combo", opens: "a", combo: { pieces: ["Thassa’s Oracle", "Demonic Consultation"], added: "Demonic Consultation" } })} now={NOW} />,
    );
    expect(container.querySelector("[data-feed-combo] [data-testid=combo-glyph]")).not.toBeNull();
    expect(container.querySelector("[data-commander-thumb]")).toBeNull();
    expect(screen.getByText("Thassa’s Oracle + Demonic Consultation")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "See the combo ›" }));
    expect(open).toHaveBeenCalledWith("a", undefined, undefined, expect.objectContaining({ art: null }));
    // The shown card is not the one opened (the write added the second piece): no art hint for a card never opened.
  });

  it("puts the friend's face on a trade match's card and links to their spares", () => {
    const { container } = list(
      <FeedItemRow
        item={view({ kind: "trade-match", card: { oracleId: "g", name: "Ghalta, Primal Hunger", image: "g.jpg", art: null, colorIdentity: ["G"] }, friend: { publicId: "p1", displayName: "Colin" }, href: "/friends/p1" })}
        now={NOW}
        face={{ artCropUri: "colin.jpg" }}
      />,
    );
    expect(screen.getByText("Colin has a spare Ghalta, Primal Hunger")).toBeInTheDocument();
    expect(container.querySelector("[data-feed-face] [data-face=art]")).not.toBeNull();
    expect(screen.getByRole("link", { name: "See Colin’s spares ›" })).toHaveAttribute("href", "/friends/p1");
  });

  it("names a trade match's press Ask {friend} when it opens the card's sheet with Ask", () => {
    list(<FeedItemRow item={view({ kind: "trade-match", friend: { publicId: "p1", displayName: "Colin" }, href: "/friends/p1?spare=g", askable: true })} now={NOW} />);
    expect(screen.getByRole("link", { name: "Ask Colin ›" })).toHaveAttribute("href", "/friends/p1?spare=g");
    expect(screen.queryByRole("link", { name: "See Colin’s spares ›" })).toBeNull();
  });

  it("writes a price drop as the struck old price and the new one", () => {
    const { container } = list(<FeedItemRow item={view({ kind: "price-drop", opens: "c", drop: { fromCents: 640, toCents: 310 } })} now={NOW} />);
    expect(container.querySelector("s")?.textContent).toBe("$6.40");
    expect(container.querySelector("[data-feed-drop]")?.textContent).toBe("↓ $3.10");
  });

  it("gives a spare request (the later round) its accent kicker and no press", () => {
    list(<FeedItemRow item={view({ kind: "spare-request", friend: { publicId: "p2", displayName: "Peter" } })} now={NOW} />);
    expect(screen.getByText("Spare request").className).toContain("--accent-text");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("draws an answer to the reader's own ask as Your request: who spares it, the buy line, a press to Your requests, no accent", () => {
    const colin = { publicId: "p3", displayName: "Colin" };
    list(<FeedItemRow item={view({ kind: "spare-request", friend: colin, answer: "yes", href: "/friends", answerDetail: { canBuy: true, others: [] } })} now={NOW} />);
    expect(screen.getByText("Your request").className).not.toContain("--accent-text");
    expect(screen.getByText("Colin can spare Sai, Master Thopterist")).toBeTruthy();
    expect(screen.getByText("The handover is between you. Once it’s yours, press buy on it in Shopping.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Your requests ›" }).getAttribute("href")).toBe("/friends");
  });

  it("a No names who else has a spare, or nobody", () => {
    const chris = { publicId: "p4", displayName: "Chris" };
    const { unmount } = list(<FeedItemRow item={view({ kind: "spare-request", friend: chris, answer: "no", href: "/friends", answerDetail: { canBuy: true, others: ["Max", "Ann"] } })} now={NOW} />);
    expect(screen.getByText("Chris is keeping Sai, Master Thopterist")).toBeTruthy();
    expect(screen.getByText("Max and 1 more have a spare too.")).toBeTruthy();
    unmount();
    list(<FeedItemRow item={view({ kind: "spare-request", friend: chris, answer: "no", href: "/friends", answerDetail: { canBuy: true, others: [] } })} now={NOW} />);
    expect(screen.getByText("Nobody else you know has a spare of it.")).toBeTruthy();
  });

  it("lifts the picture above the stretched press so it can be hovered", () => {
    const { container } = list(<FeedItemRow item={view({ kind: "price-drop", outbound: "https://manapool.com/cards?q=Sai", drop: { fromCents: 500, toCents: 300 } })} now={NOW} />);
    expect(container.querySelector<HTMLElement>("[data-feed-picture]")!.className).toContain("z-[1]");
  });

  // Hugh, 2026-10-27: a price drop opens the card on Mana Pool in a new tab, drawn as card details' link out is, under its own
  // label (Hugh's follow-up the same day: "Buy at Mana Pool").
  it("opens a price drop's card on Mana Pool in a new tab, never its detail", () => {
    open.mockClear();
    const url = "https://manapool.com/cards?q=Sai";
    const { container } = list(<FeedItemRow item={view({ kind: "price-drop", outbound: url, drop: { fromCents: 500, toCents: 300 } })} now={NOW} />);
    const press = screen.getByRole("link", { name: /^Buy at Mana Pool\s*\(opens in a new tab\)$/ });
    expect(press.getAttribute("href")).toBe(url);
    expect(press.getAttribute("target")).toBe("_blank");
    expect(press.getAttribute("rel")).toBe("noopener");
    expect(press.textContent).not.toContain("›");
    // Bound to the label by a no-break space: a plain one collapses at the flex press's edge (shot 2026-10-27).
    expect(press.textContent).toBe("Buy at Mana Pool\u00a0↗ (opens in a new tab)");
    const picture = container.querySelector("[data-feed-picture]")!;
    expect(picture.getAttribute("href")).toBe(url);
    expect(picture.getAttribute("target")).toBe("_blank");
    fireEvent.click(press);
    expect(open).not.toHaveBeenCalled();
  });

  it("draws no press for a price drop whose card the catalog no longer holds", () => {
    const { container } = list(<FeedItemRow item={view({ kind: "price-drop", card: null, outbound: null, drop: { fromCents: 500, toCents: 300 } })} now={NOW} />);
    expect(document.querySelector("[data-feed-press]")).toBeNull();
    // No press text, so the press column is not drawn either (no empty, spaced wrapper under the line on a phone).
    expect(container.querySelector("[data-feed-age-desktop]")!.parentElement!.className).toMatch(/^hidden /);
  });

  it("makes a linked row's picture a real link to the same place, out of the tab order", () => {
    const { container } = list(<FeedItemRow item={view({ href: "/collection/sets/sos", name: "Secrets of Strixhaven", setSize: 288 })} now={NOW} />);
    const picture = container.querySelector("[data-feed-picture]")!;
    expect(picture.tagName).toBe("A");
    expect(picture.getAttribute("href")).toBe("/collection/sets/sos");
    expect(picture.getAttribute("tabindex")).toBe("-1");
    expect(picture.getAttribute("aria-hidden")).toBe("true");
  });

  it("lets a long friend name wrap inside the press instead of overflowing the row", () => {
    list(<FeedItemRow item={view({ kind: "trade-match", friend: { publicId: "p1", displayName: "W".repeat(30) }, href: "/friends/p1" })} now={NOW} />);
    const press = screen.getByRole("link", { name: /spares/ });
    expect(press.className).toContain("[overflow-wrap:anywhere]");
    expect(press.className).toContain("min-w-0");
    expect(press.className).not.toContain("whitespace-nowrap");
  });

  it("opens a combo item for its combo, and no other kind", () => {
    open.mockClear();
    const { unmount } = list(<FeedItemRow item={view({ kind: "combo", opens: "a", combo: { pieces: ["Thassa’s Oracle", "Demonic Consultation"], added: "Demonic Consultation" } })} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: /See the combo/ }));
    expect(open).toHaveBeenLastCalledWith("a", undefined, undefined, expect.objectContaining({ combo: true }));
    expect(open).toHaveBeenLastCalledWith("a", undefined, undefined, expect.objectContaining({ art: null }));
  });

  it("reads 'just now' for an item under an hour old", () => {
    list(<FeedItemRow item={view({ at: "2026-10-22T11:30:00Z", href: "/x" })} now={NOW} />);
    expect(screen.getAllByText("just now")).toHaveLength(2);
    expect(screen.queryByText(/0h ago/)).toBeNull();
  });

  it("draws the card's identity gradient at card shape when it has no art, and the stripes only when its identity is unknown", () => {
    const { container, unmount } = list(<FeedItemRow item={view({ href: "/x", card: { oracleId: "c", name: "Sai", image: null, art: null, colorIdentity: ["R"] } })} now={NOW} />);
    const thumb = () => container.querySelector<HTMLElement>('[data-commander-thumb="feed"]')!;
    const identity = thumb().style.background;
    expect(identity).toContain("gradient");
    unmount();
    const { container: c2 } = list(<FeedItemRow item={view({ href: "/x", card: { oracleId: "c", name: "Sai", image: null, art: null, colorIdentity: null } })} now={NOW} />);
    expect(c2.querySelector<HTMLElement>('[data-commander-thumb="feed"]')!.style.background).not.toBe(identity);
  });
});
