import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mirrored = vi.hoisted(() => [] as string[]);
vi.mock("../../lib/url/mirror", () => ({ mirrorUrl: (u: URL | string) => { mirrored.push(String(u)); } }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));
import { PreconPickReceipt } from "./precon-pick-receipt";

const receipt = { entryIds: ["e1", "e2", "e3"], names: ["Abzan Armor", "Sultai Arisen", "Temur Roar"], copies: 300, tokens: 31, decks: 3 };

beforeEach(() => {
  window.localStorage.clear();
  mirrored.length = 0;
  window.history.replaceState(null, "", "/?precons=e1,e2,e3");
});

describe("the precon pick's receipt (S5)", () => {
  it("names the boxes, their cards and tokens, and History, as a status", () => {
    render(<PreconPickReceipt receipt={receipt} />);
    const strip = screen.getByRole("status");
    expect(strip).toHaveTextContent("Added 3 decks and their cards to your collection: Abzan Armor, Sultai Arisen and Temur Roar. 300 cards and 31 tokens. History");
    expect(strip).toHaveTextContent("3 decks added · 300 cards · History");
    expect(screen.getAllByRole("link", { name: "History" })[0]).toHaveAttribute("href", "/collection/history");
  });

  it("names four or more boxes by two and a count", () => {
    render(<PreconPickReceipt receipt={{ ...receipt, entryIds: ["a", "b", "c", "d"], names: ["A", "B", "C", "D"], decks: 4 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Added 4 decks and their cards to your collection: A, B and 2 others.");
  });

  it("spends the address's claim once seen and keeps drawing the strip", () => {
    const { rerender } = render(<PreconPickReceipt receipt={receipt} />);
    expect(mirrored).toHaveLength(1);
    expect(new URL(mirrored[0]).searchParams.has("precons")).toBe(false);
    // Held for the visit: a later render handed other figures still draws the receipt the claim named.
    rerender(<PreconPickReceipt receipt={{ ...receipt, names: ["Other"], copies: 1 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Abzan Armor, Sultai Arisen and Temur Roar. 300 cards");
  });

  it("dismisses with the ✕ alone, under its own key and not a deck's", () => {
    const { unmount } = render(<PreconPickReceipt receipt={receipt} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(window.localStorage.getItem("the99:precon-pick-receipt:e1")).toBe("1");
    unmount();
    render(<PreconPickReceipt receipt={receipt} />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("draws a later pick's receipt after an earlier one was dismissed", () => {
    window.localStorage.setItem("the99:precon-pick-receipt:e1", "1");
    render(<PreconPickReceipt receipt={{ ...receipt, entryIds: ["e9"], names: ["Abzan Armor"], decks: 1 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Added 1 deck and its cards to your collection: Abzan Armor. 300 cards and 31 tokens.");
    expect(screen.getAllByRole("link", { name: "History" })[0]).toHaveAttribute("href", "/collection/history?entry=e9");
  });

  // An add made before the pick started decks names no deck, and keeps the line it shipped with.
  it("says only that the precons were added when no box started a deck", () => {
    render(<PreconPickReceipt receipt={{ ...receipt, entryIds: ["e9"], names: ["Abzan Armor"], decks: 0 }} />);
    const strip = screen.getByRole("status");
    expect(strip).toHaveTextContent("1 precon added to your collection: Abzan Armor. 300 cards and 31 tokens.");
    expect(strip).toHaveTextContent("1 precon added · 300 cards · History");
  });
});

// S19: Collection draws this same strip under its tabs, under the same dismiss key, so a receipt dismissed on one page
// is dismissed on the other.
describe("the precon pick's receipt on Collection (S19)", () => {
  it("shares its dismissal with Home's, by the receipt's own entries", () => {
    const home = render(<PreconPickReceipt receipt={receipt} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
    home.unmount();
    window.history.replaceState(null, "", "/collection?precons=e1,e2,e3");
    render(<PreconPickReceipt receipt={receipt} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
