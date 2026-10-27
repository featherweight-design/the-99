import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const open = vi.hoisted(() => vi.fn());
vi.mock("../cards/card-detail-provider", () => ({ useCardDetailIfAny: () => ({ open }) }));

import { FeedItemRow } from "./feed-item";
import type { FeedView } from "../../lib/feed/home";

const NOW = "2026-10-22T12:00:00.000Z";
const view = (o: Partial<FeedView>): FeedView => ({
  key: "k", kind: "new-set", at: "2026-10-22T07:00:00Z", unseen: true, card: { oracleId: "c", name: "Sai, Master Thopterist", image: "sai.jpg", art: null, colorIdentity: ["U"] },
  friend: null, href: null, opens: null, name: null, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false, ...o,
});
const list = (node: React.ReactNode) => render(<ul>{node}</ul>);

describe("FeedItemRow", () => {
  it("draws the kicker, the age, the title and the line, with the accent diamond while unseen", () => {
    const { container } = list(<FeedItemRow item={view({ name: "Secrets of Strixhaven", setSize: 288, href: "/collection/sets/sos" })} now={NOW} />);
    expect(screen.getByText("New set")).toBeInTheDocument();
    expect(screen.getByText("5h ago")).toBeInTheDocument();
    expect(screen.getByText("Secrets of Strixhaven is out")).toBeInTheDocument();
    expect(screen.getByText("288 cards.")).toBeInTheDocument();
    expect(container.querySelector("[data-feed-unseen]")).not.toBeNull();
    expect(screen.getByRole("link", { name: "See the set ›" })).toHaveAttribute("href", "/collection/sets/sos");
    // The card at card shape, never the art crop.
    expect(container.querySelector('[data-commander-thumb="feed"]')).not.toBeNull();
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

  it("lifts the picture above the stretched press so it can be hovered, and passes a press on it to the row's press", () => {
    const { container } = list(<FeedItemRow item={view({ kind: "price-drop", opens: "c", drop: { fromCents: 500, toCents: 300 } })} now={NOW} />);
    open.mockClear();
    const picture = container.querySelector<HTMLElement>("[data-feed-picture]")!;
    expect(picture.className).toContain("z-[1]");
    fireEvent.click(picture);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("hints the art only for the card that opens", () => {
    open.mockClear();
    list(<FeedItemRow item={view({ kind: "price-drop", opens: "c", drop: { fromCents: 500, toCents: 300 } })} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: /Open the card/ }));
    expect(open).toHaveBeenCalledWith("c", undefined, undefined, expect.objectContaining({ art: "sai.jpg" }));
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
    unmount();
    list(<FeedItemRow item={view({ kind: "price-drop", opens: "c", drop: { fromCents: 500, toCents: 300 } })} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: /Open the card/ }));
    expect(open.mock.lastCall?.[3]).not.toHaveProperty("combo");
  });

  it("reads 'just now' for an item under an hour old", () => {
    list(<FeedItemRow item={view({ at: "2026-10-22T11:30:00Z", href: "/x" })} now={NOW} />);
    expect(screen.getByText("just now")).toBeInTheDocument();
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
