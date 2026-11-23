// You have it, 3b: a friend's Wishlist tab over the cards the reader can spare. The call-out and its filter, a press on a
// spare tile only, the sheet's Offer (one press, the mark moves, a refusal is the toast and the row stays), and nothing
// drawn when there is no spare.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ offer: vi.fn(), answerSpare: vi.fn(), answerOffer: vi.fn() }));
vi.mock("../../app/friends/spare-actions", () => ({ offerSpareAction: m.offer, answerSpareAction: m.answerSpare, answerOfferAction: m.answerOffer }));
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
const HAVE: HaveItCard = { oracleId: "a", spare: 2, mark: null, requestId: null, daysLeft: null } as HaveItCard;
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
    draw([{ ...HAVE, mark: "asked", requestId: "req-2", daysLeft: 9 } as HaveItCard]);
    fireEvent.click(screen.getByTestId("have-press"));
    await act(async () => { fireEvent.click(screen.getByTestId("spare-yes")); });
    expect(m.answerSpare).toHaveBeenCalledWith("req-2", "yes");
    await waitFor(() => expect(screen.getByTestId("have-accepted")).toBeTruthy());
  });
});
