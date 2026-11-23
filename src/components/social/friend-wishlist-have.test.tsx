// You have it, 3b: a friend's Wishlist tab over the cards the reader can spare. The call-out and its filter, a press on a
// spare tile only, the sheet's Offer (one press, the mark moves, a refusal is the toast and the row stays), and nothing
// drawn when there is no spare.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ offer: vi.fn(), answerSpare: vi.fn(), answerOffer: vi.fn() }));
vi.mock("../../app/friends/spare-actions", () => ({ offerSpareAction: m.offer, answerSpareAction: m.answerSpare, answerOfferAction: m.answerOffer }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));
vi.mock("../cards/card-detail-provider", () => ({
  CardDetailProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  cardDetailCopy: { triggerAria: (name: string) => `View details for ${name}` },
  CardDetailTrigger: ({ name, ariaLabel, children }: { name: string; ariaLabel?: string; children: React.ReactNode }) => (
    <button type="button" aria-label={ariaLabel ?? name}>{children}</button>
  ),
}));

import { FriendWishlist } from "./friend-wishlist";
import { haveItCopy as h } from "../../lib/copy/social";
import { named } from "../../lib/person-name/mint";
import type { HaveItCard } from "../../lib/social/spare-offers";

const COLIN = named("Colin");
const line = (id: string, name: string) => ({ oracleId: id, quantity: 1, name, imageUri: null, layout: "normal", backImageUri: null });
const LINES = [line("a", "Rhystic Study"), line("b", "Sol Ring")];
const HAVE: HaveItCard = { oracleId: "a", spare: 2, mark: null, requestId: null, daysLeft: null, copies: null } as HaveItCard;
const draw = (haves: HaveItCard[] = [HAVE]) =>
  render(<FriendWishlist name={COLIN} friendPublicId="pub-1" lines={LINES} haves={haves} />);

beforeEach(() => { m.offer.mockReset(); m.answerSpare.mockReset(); m.answerOffer.mockReset(); });
afterEach(cleanup);

describe("You have it on a friend's wishlist", () => {
  it("draws nothing extra when the reader has no spare", () => {
    draw([]);
    expect(screen.queryByTestId("have-callout")).toBeNull();
    expect(screen.queryByTestId("have-press")).toBeNull();
  });

  it("draws the call-out and a press on the spare tile only", () => {
    draw();
    expect(screen.getByTestId("have-callout").textContent).toContain(h.callout.title(1));
    expect(screen.getAllByTestId("have-press")).toHaveLength(1);
    expect(screen.getByTestId("have-press").getAttribute("aria-label")).toBe(h.aria("Rhystic Study"));
  });

  it("the filter narrows the tiles to the spare cards and back", () => {
    draw();
    const tiles = () => screen.getAllByRole("button", { name: /View details for/ }).length;
    expect(tiles()).toBe(2);
    fireEvent.click(screen.getByRole("radio", { name: /You can spare/ }));
    expect(tiles()).toBe(1);
    fireEvent.click(screen.getByRole("radio", { name: /All/ }));
    expect(tiles()).toBe(2);
  });

  it("Offer is one press: the row reads Offered and the press carries the mark", async () => {
    m.offer.mockResolvedValue({ ok: true, id: "req-1" });
    draw();
    fireEvent.click(screen.getByTestId("have-press"));
    const sheet = screen.getByTestId("have-sheet");
    await act(async () => { fireEvent.click(within(sheet).getByTestId("have-offer")); });
    expect(m.offer).toHaveBeenCalledWith({ friendPublicId: "pub-1", oracleId: "a" });
    await waitFor(() => expect(screen.getByTestId("have-offered")).toBeTruthy());
    expect(screen.getByTestId("have-press").getAttribute("aria-label")).toBe(h.markAria(h.aria("Rhystic Study"), "offered"));
  });

  it("a refused Offer leaves the row as it was", async () => {
    m.offer.mockResolvedValue({ ok: false, reason: "asked" });
    draw();
    fireEvent.click(screen.getByTestId("have-press"));
    await act(async () => { fireEvent.click(screen.getByTestId("have-offer")); });
    expect(screen.queryByTestId("have-offered")).toBeNull();
    expect(screen.getByTestId("have-offer")).toBeTruthy();
  });

  it("an open ask from the friend carries Yes and No, and a yes reads Accepted", async () => {
    m.answerSpare.mockResolvedValue({ ok: true });
    draw([{ ...HAVE, mark: "asked", requestId: "req-2", daysLeft: 9, copies: 1 } as HaveItCard]);
    fireEvent.click(screen.getByTestId("have-press"));
    expect(screen.getByRole("dialog").textContent).toContain("Colin asked for 1");
    await act(async () => { fireEvent.click(screen.getByTestId("spare-yes")); });
    expect(m.answerSpare).toHaveBeenCalledWith("req-2", "yes");
    await waitFor(() => expect(screen.getByTestId("have-accepted")).toBeTruthy());
  });
  describe("a spare under the reader's threshold (You have it R2)", () => {
    const UNDER: HaveItCard = { oracleId: "b", spare: 1, mark: null, requestId: null, daysLeft: null, copies: null, under: 3 };

    it("draws a muted press, keyed `under your threshold`, with its own aria", () => {
      draw([HAVE, UNDER]);
      const presses = screen.getAllByTestId("have-press");
      expect(presses).toHaveLength(2);
      expect(presses[1].getAttribute("aria-label")).toBe(h.under.aria("Sol Ring", 3));
      expect(screen.getAllByTestId("have-under-glyph").length).toBeGreaterThan(0);
      expect(screen.getByTestId("have-key").textContent).toContain(h.key.under);
      expect(screen.getByTestId("have-callout").textContent).toContain(h.under.more(1));
    });

    it("the filter counts and shows only the offerable spares", () => {
      draw([HAVE, UNDER]);
      expect(screen.getByRole("radio", { name: /You can spare/ }).textContent).toContain("1");
      fireEvent.click(screen.getByRole("radio", { name: /You can spare/ }));
      expect(screen.getAllByRole("button", { name: /View details for/ })).toHaveLength(1);
    });

    it("with only under-threshold spares the call-out says so and draws no filter", () => {
      draw([UNDER]);
      const c = screen.getByTestId("have-callout");
      expect(c.textContent).toContain(h.under.title(1));
      expect(c.textContent).toContain(h.under.body("Sol Ring", 3));
      expect(screen.queryByRole("radio")).toBeNull();
      expect(screen.getByTestId("have-key").textContent).not.toContain(h.key.spare);
    });

    it("the sheet explains the threshold, draws no Offer, and links to Settings › Spares", () => {
      draw([UNDER]);
      fireEvent.click(screen.getByTestId("have-press"));
      const sheet = screen.getByTestId("have-sheet");
      expect(within(sheet).queryByTestId("have-offer")).toBeNull();
      expect(sheet.textContent).toContain(h.under.sub(3));
      expect(within(sheet).getByTestId("have-foot").textContent).toContain(h.under.foot(3));
      const link = within(sheet).getByTestId("have-settings");
      expect(link.getAttribute("href")).toBe("/settings#settings-spares");
      expect(link.textContent).toContain(h.under.settings);
      expect(m.offer).not.toHaveBeenCalled();
    });
  });
});
