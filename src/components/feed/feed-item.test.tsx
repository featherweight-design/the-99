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
    // The age once, after the kind on the kicker line at both widths (small items R1b: `New set · 5h ago`).
    const age = screen.getByText("5h ago");
    expect(age.previousElementSibling?.textContent).toBe("New set");
    expect(age.className).toContain("before:content-['·']");
    expect(age.className).not.toMatch(/(^|\s)(md:)?hidden(\s|$)/);
    expect(screen.getByText("Secrets of Strixhaven is out")).toBeInTheDocument();
    expect(screen.getByText("288 cards.")).toBeInTheDocument();
    expect(container.querySelector("[data-feed-unseen]")).not.toBeNull();
    expect(screen.getByRole("link", { name: "See the set ›" })).toHaveAttribute("href", "/collection/sets/sos");
    // The card at card shape, never the art crop.
    expect(container.querySelector('[data-commander-thumb="feed"]')).not.toBeNull();
  });

  it("ends the action line with the ✕, after the press: under the text on a phone, the third column from desktop", () => {
    const { container } = list(<FeedItemRow item={view({ href: "/x" })} now={NOW} onDismiss={() => {}} />);
    const line = container.querySelector("[data-feed-actions]")!;
    expect(line.className).toMatch(/(^|\s)col-start-2(\s|$)/);
    expect(line.className).toMatch(/md:col-start-3/);
    expect(line.className).toMatch(/flex-nowrap/);
    expect([...line.children].map((c) => c.textContent)).toEqual(["See the set ›", "✕"]);
    expect(line.lastElementChild!.className).toMatch(/(^|\s)ml-auto(\s|$)/);
  });

  it("keeps the action line for the ✕ alone on a row with no press, and draws none with neither", () => {
    const item = view({ kind: "spare-request", friend: { publicId: "p", displayName: "Peter" } });
    const { container, unmount } = list(<FeedItemRow item={item} now={NOW} onDismiss={() => {}} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect([...container.querySelector("[data-feed-actions]")!.children].map((c) => c.textContent)).toEqual(["✕"]);
    unmount();
    const bare = list(<FeedItemRow item={item} now={NOW} />);
    expect(bare.container.querySelector("[data-feed-actions]")).toBeNull();
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

  it("draws an answer to the reader's own ask as Your request: who spares it, the buy line, a press to /friends off Home, no accent", () => {
    const colin = { publicId: "p3", displayName: "Colin" };
    list(<FeedItemRow item={view({ kind: "spare-request", friend: colin, answer: "yes", href: "/friends", answerDetail: { canBuy: true, others: [] } })} now={NOW} />);
    expect(screen.getByText("Your request").className).not.toContain("--accent-text");
    expect(screen.getByText("Colin can spare Sai, Master Thopterist")).toBeTruthy();
    expect(screen.getByText("The handover is between you. Once it’s yours, press buy on it in Shopping or add it to your collection.")).toBeTruthy();
    // Outside What's new (no answer sheet to open) the press still goes to /friends, as it shipped.
    expect(screen.getByRole("link", { name: "Your request ›" }).getAttribute("href")).toBe("/friends");
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
    // The link-out icon, bound to the label's last word in one no-wrap run, never a flex item of its own.
    expect(press.textContent).toBe("Buy at Mana Pool (opens in a new tab)");
    const icon = press.querySelector("svg[data-link-out]")!;
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.parentElement!.textContent).toBe("Pool");
    expect(icon.parentElement!.className).toContain("whitespace-nowrap");
    const picture = container.querySelector("[data-feed-picture]")!;
    expect(picture.getAttribute("href")).toBe(url);
    expect(picture.getAttribute("target")).toBe("_blank");
    fireEvent.click(press);
    expect(open).not.toHaveBeenCalled();
  });

  it("draws no press for a price drop whose card the catalog no longer holds", () => {
    const { container } = list(<FeedItemRow item={view({ kind: "price-drop", card: null, outbound: null, drop: { fromCents: 500, toCents: 300 } })} now={NOW} />);
    expect(document.querySelector("[data-feed-press]")).toBeNull();
    // No press and no ✕, so the action line is not drawn either (no empty, spaced wrapper under the line on a phone).
    expect(container.querySelector("[data-feed-actions]")).toBeNull();
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
    list(<FeedItemRow item={view({ kind: "combo", opens: "a", combo: { pieces: ["Thassa’s Oracle", "Demonic Consultation"], added: "Demonic Consultation" } })} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: /See the combo/ }));
    expect(open).toHaveBeenLastCalledWith("a", undefined, undefined, expect.objectContaining({ combo: true }));
    expect(open).toHaveBeenLastCalledWith("a", undefined, undefined, expect.objectContaining({ art: null }));
  });

  it("reads 'just now' for an item under an hour old", () => {
    list(<FeedItemRow item={view({ at: "2026-10-22T11:30:00Z", href: "/x" })} now={NOW} />);
    expect(screen.getAllByText("just now")).toHaveLength(1);
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

describe("a Wizards post's row (announcements boards Home-Rows and Row-States)", () => {
  const URL_OK = "https://magic.wizards.com/en/news/announcements/x";
  const post = (o: Partial<FeedView> = {}, p: Partial<NonNullable<FeedView["post"]>> = {}) =>
    view({
      kind: "secret-lair", card: null, outbound: URL_OK,
      post: { title: "Secret Lair x JAWS is live", summary: "Five full-art cards: the shark, the boat and the beach.", hero: "https://images.ctfassets.net/jaws.jpg", lists: null, ...p },
      ...o,
    });

  it("draws the kicker, the title, the summary clamped at two lines, and Read on Wizards out in a new tab", () => {
    const { container } = list(<FeedItemRow item={post()} now={NOW} />);
    expect(screen.getByText("Secret Lair")).toBeInTheDocument();
    const title = screen.getByText("Secret Lair x JAWS is live");
    // The title never clamps.
    expect(title.className).not.toContain("line-clamp");
    expect(screen.getByText("Five full-art cards: the shark, the boat and the beach.").className).toMatch(/(^|\s)line-clamp-2(\s|$)/);
    const press = container.querySelector("[data-feed-press]")!;
    expect(press).toHaveAttribute("href", URL_OK);
    expect(press).toHaveAttribute("target", "_blank");
    expect(press.textContent).toMatch(/^Read on Wizards\u00a0↗/);
    expect(press.querySelector(".sr-only")!.textContent).toMatch(/opens in a new tab/);
    // No card: not the card thumb, no card shadow.
    expect(container.querySelector('[data-commander-thumb="feed"]')).toBeNull();
  });

  it("clamps only a post's line, never another kind's", () => {
    list(<FeedItemRow item={view({ name: "Secrets", setSize: 288, href: "/x" })} now={NOW} />);
    expect(screen.getByText("288 cards.").className).not.toContain("line-clamp");
  });

  it("crops the hero into the 46x64 slot, radius 4, and swaps in the plate with the post glyph when it fails", () => {
    const { container } = list(<FeedItemRow item={post()} now={NOW} />);
    const picture = container.querySelector("[data-feed-picture]")!;
    expect(picture.className).toMatch(/h-\[64px\] w-\[46px\]/);
    expect(picture.className).toContain("rounded-[4px]");
    expect(picture.className).toContain("overflow-hidden");
    expect(picture).toHaveAttribute("href", URL_OK);
    const img = container.querySelector("[data-feed-hero]")!;
    expect(img.className).toContain("object-cover");
    expect(container.querySelector("[data-feed-post-plate]")).toBeNull();
    fireEvent.error(img);
    expect(container.querySelector("[data-feed-hero]")).toBeNull();
    const plate = container.querySelector("[data-feed-post-plate]")!;
    expect(plate.className).toContain("text-[color:var(--fact)]");
    expect(plate.querySelector("svg")).not.toBeNull();
  });

  it("draws the plate for a post with no hero, never a broken image", () => {
    const { container } = list(<FeedItemRow item={post({}, { hero: null })} now={NOW} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-feed-post-plate]")).not.toBeNull();
  });

  it("gives a decklists post its mono lists line, some then all, and Read the post", () => {
    const some = list(<FeedItemRow item={post({ kind: "commander-decklists" }, { lists: { n: 3, of: 5 } })} now={NOW} />);
    expect(some.container.querySelector("[data-feed-lists]")!.textContent).toBe("3 of 5 lists so far");
    expect(some.container.querySelector("[data-feed-lists]")!.className).toContain("font-mono");
    expect(some.container.querySelector("[data-feed-press]")!.textContent).toMatch(/^Read the post/);
    some.unmount();
    const all = list(<FeedItemRow item={post({ kind: "commander-decklists" }, { lists: { n: 5, of: 5 } })} now={NOW} />);
    expect(all.container.querySelector("[data-feed-lists]")!.textContent).toBe("All 5 lists");
  });

  it("names Wizards news by its kicker and draws no lists line on it", () => {
    const { container } = list(<FeedItemRow item={post({ kind: "wizards-news" })} now={NOW} />);
    expect(screen.getByText("Wizards news")).toBeInTheDocument();
    expect(container.querySelector("[data-feed-lists]")).toBeNull();
  });

  it("draws no press for a post whose address is not a magic.wizards.com page", () => {
    const { container } = list(<FeedItemRow item={post({ outbound: null })} now={NOW} />);
    expect(container.querySelector("[data-feed-press]")).toBeNull();
    expect(container.querySelector("a[data-feed-picture]")).toBeNull();
  });
});

describe("a Wizards post and its ✕", () => {
  it("draws no ✕ yet: feed_dismissals' key check refuses post: keys", () => {
    const item = view({ kind: "secret-lair", card: null, outbound: "https://magic.wizards.com/en/news/x", post: { title: "T", summary: null, hero: null, lists: null } });
    const { container } = list(<FeedItemRow item={item} now={NOW} onDismiss={() => {}} />);
    expect(screen.queryByRole("button", { name: /Hide/ })).toBeNull();
    expect([...container.querySelector("[data-feed-actions]")!.children].map((c) => c.textContent?.slice(0, 15))).toEqual(["Read on Wizards"]);
  });
});
