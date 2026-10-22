import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const open = vi.hoisted(() => vi.fn());
vi.mock("../cards/card-detail-provider", () => ({ useCardDetailIfAny: () => ({ open }) }));

import { FeedItemRow } from "./feed-item";
import type { FeedView } from "../../lib/feed/home";

const NOW = "2026-10-22T12:00:00.000Z";
const view = (o: Partial<FeedView>): FeedView => ({
  key: "k", kind: "new-set", at: "2026-10-22T07:00:00Z", unseen: true, card: { oracleId: "c", name: "Sai, Master Thopterist", image: "sai.jpg", art: null },
  friend: null, href: null, opens: null, name: null, setSize: null, owned: null, drop: null, combo: null, ...o,
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
    expect(open).toHaveBeenCalledWith("a", undefined, undefined, expect.objectContaining({ art: "sai.jpg" }));
  });

  it("puts the friend's face on a trade match's card and links to their spares", () => {
    const { container } = list(
      <FeedItemRow
        item={view({ kind: "trade-match", card: { oracleId: "g", name: "Ghalta, Primal Hunger", image: "g.jpg", art: null }, friend: { publicId: "p1", displayName: "Colin" }, href: "/friends/p1" })}
        now={NOW}
        face={{ artCropUri: "colin.jpg" }}
      />,
    );
    expect(screen.getByText("Colin has a spare Ghalta, Primal Hunger")).toBeInTheDocument();
    expect(container.querySelector("[data-feed-face] [data-face=art]")).not.toBeNull();
    expect(screen.getByRole("link", { name: "See Colin’s spares ›" })).toHaveAttribute("href", "/friends/p1");
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

  it("lifts the picture above the stretched press so it can be hovered, and passes a press on it to the row's press", () => {
    const { container } = list(<FeedItemRow item={view({ kind: "price-drop", opens: "c", drop: { fromCents: 500, toCents: 300 } })} now={NOW} />);
    open.mockClear();
    const picture = container.querySelector<HTMLElement>("[data-feed-picture]")!;
    expect(picture.className).toContain("z-[1]");
    fireEvent.click(picture);
    expect(open).toHaveBeenCalledTimes(1);
  });
});
