import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartEntry } from "./cart-entry";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";

vi.mock("next/link", () => ({
  useLinkStatus: () => ({ pending: false }),
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

describe("CartEntry (A1)", () => {
  it("names the cart, its copies, its cost and its decks, and opens the cart", () => {
    render(<CartEntry total={{ copies: 307, cents: 84399, pricedCopies: 307 }} deckCount={7} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/decks/shopping");
    expect(link.textContent).toContain(copy.entry.label);
    expect(link.textContent).toContain(copy.entry.figure(307, "$843.99", 7));
  });

  it("drops the cost rather than drawing $0.00 when nothing is priced (A1-np)", () => {
    render(<CartEntry total={{ copies: 307, cents: 0, pricedCopies: 0 }} deckCount={7} />);
    expect(screen.getByRole("link").textContent).toContain(copy.entry.figureNoPrice(307, 7));
    expect(screen.getByRole("link").textContent).not.toContain("$");
  });

  it("draws the phone's short title and figure beside the full ones when paired (P1)", () => {
    render(<CartEntry total={{ copies: 307, cents: 84399, pricedCopies: 307 }} deckCount={7} paired />);
    const text = screen.getByRole("link").textContent;
    expect(text).toContain(copy.entry.titlePhone);
    expect(text).toContain(copy.entry.figurePhone(307, "$843.99"));
  });

  it("draws the phone figure without a cost when nothing is priced", () => {
    render(<CartEntry total={{ copies: 307, cents: 0, pricedCopies: 0 }} deckCount={7} paired />);
    expect(screen.getByRole("link").textContent).toContain(copy.entry.figurePhoneNoPrice(307));
  });

  it("is the shipped line at every width when it is alone (P4)", () => {
    render(<CartEntry total={{ copies: 307, cents: 84399, pricedCopies: 307 }} deckCount={7} />);
    expect(screen.getByRole("link").textContent).not.toContain(copy.entry.titlePhone);
  });

  it("draws a total that sums to $0.00 as the no-price form, as the tile does", () => {
    render(<CartEntry total={{ copies: 3, cents: 0, pricedCopies: 3 }} deckCount={1} />);
    expect(screen.getByRole("link").textContent).toContain(copy.entry.figureNoPrice(3, 1));
  });
});
