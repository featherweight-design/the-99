import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ShortDeck } from "../../lib/collection/write";
import { groupShortDecks, ShortDeckWarning } from "./short-deck-warning";

const line = (deckId: string, oracleId: string, short: number): ShortDeck => ({
  deckId,
  deckName: `Deck ${deckId}`,
  oracleId,
  cardName: `Card ${oracleId}`,
  short,
});

const draw = (decks: ShortDeck[], extra: Partial<React.ComponentProps<typeof ShortDeckWarning>> = {}) =>
  render(<ShortDeckWarning titleId="t" decks={decks} pending={false} onCancel={vi.fn()} onConfirm={vi.fn()} {...extra} />);

describe("groupShortDecks", () => {
  it("makes one row per deck, most short first, keeping the server's order on a tie", () => {
    const rows = groupShortDecks([line("a", "x", 1), line("b", "x", 3), line("c", "x", 1), line("a", "y", 1)]);
    expect(rows.map((r) => [r.deckId, r.short])).toEqual([["b", 3], ["a", 2], ["c", 1]]);
  });
});

describe("ShortDeckWarning", () => {
  it("focuses Cancel, and the confirm is the elevated secondary rather than the accent or red", () => {
    draw([line("a", "x", 1)]);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    const confirm = screen.getByRole("button", { name: "Replace anyway" });
    expect(confirm.className).toContain("--elevated");
    expect(confirm.className).not.toMatch(/accent|danger/);
  });

  it("names each deck with a link that opens in a new tab, apart from the row's expand control", () => {
    draw([line("a", "x", 1), line("a", "y", 2)]);
    const link = screen.getByRole("link", { name: "Deck a" });
    expect(link.getAttribute("href")).toBe("/decks/a");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(screen.getByRole("button", { name: "2 cards short" })).not.toContainElement(link);
  });

  it("one card: each row reads `short N`", () => {
    draw([line("a", "x", 2), line("b", "x", 1)]);
    expect(screen.getByText("short 2")).toBeTruthy();
    expect(screen.getByText("short 1")).toBeTruthy();
  });

  it("several cards: rows read `N cards short` and open onto their cards", () => {
    draw([line("a", "x", 1), line("a", "y", 2), line("b", "x", 1), line("b", "z", 1)]);
    expect(screen.getAllByText("2 cards short")).toHaveLength(2);
    expect(screen.queryByText("Card y")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "2 cards short" })[0]);
    expect(screen.getByText("Card y")).toBeTruthy();
    expect(screen.getByText("short 2")).toBeTruthy();
  });

  it("names three decks and counts the rest behind `and N more`, which opens inline", () => {
    draw(["a", "b", "c", "d", "e"].map((id, i) => line(id, "x", 5 - i)));
    expect(screen.getByRole("heading", { name: "Replacing leaves 5 decks short" })).toBeTruthy();
    expect(screen.queryByText("Deck d")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "and 2 more decks" }));
    expect(screen.getByText("Deck d")).toBeTruthy();
    expect(screen.getByText("Deck e")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /more decks/ })).toBeNull();
  });

  it("pending: both buttons disable and the confirm reads Saving…", () => {
    draw([line("a", "x", 1)], { pending: true });
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("`and N more` hands focus to the first row it reveals", () => {
    draw(["a", "b", "c", "d", "e"].map((id, i) => line(id, "x", 5 - i)));
    fireEvent.click(screen.getByRole("button", { name: "and 2 more decks" }));
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Deck d" }));
  });
});
