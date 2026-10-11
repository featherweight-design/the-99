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
});
