import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardSearchRow } from "../../lib/card-search/search";
import { SEARCH_LIMIT } from "../../lib/card-search/search";
import { cardSearchCopy } from "../../lib/copy/card-search";
import { RESULTS_LIMIT } from "./search-layer";
import { Matched, SearchRow } from "./search-row";

const row = (over: Partial<CardSearchRow> = {}): CardSearchRow => ({
  oracleId: "o-ash", name: "Ashling, the Limitless", imageUri: null, flavorName: null,
  owned: 2, decks: ["HD - Elementals", "Flamekin"], wishlist: true, ...over,
});

function draw(r: CardSearchRow, query = "in", onPick = vi.fn()) {
  render(
    <SearchRow row={r} query={query} id="opt-0" first active={false} returned={false} onPick={onPick} />,
  );
  return screen.getByRole("option");
}

afterEach(cleanup);

describe("Matched", () => {
  it("lights every run of the query, whatever its case, and treats it as literal text", () => {
    const { container } = render(<Matched text="Infinite Inning" query="in" />);
    expect([...container.querySelectorAll("em")].map((e) => e.textContent)).toEqual(["In", "in", "In", "in"]);
    const odd = render(<Matched text="Sol (Ring)" query="(r" />);
    expect(odd.container.querySelector("em")?.textContent).toBe("(R");
  });
});

describe("the result row", () => {
  it("is one option named by one sentence", () => {
    const opt = draw(row());
    expect(opt.getAttribute("aria-label")).toBe("Ashling, the Limitless, 2 owned, in HD - Elementals and 1 more deck, on your wishlist");
  });

  it("draws ownership, the first deck and how many more", () => {
    const opt = draw(row());
    expect(opt.textContent).toContain("×2 owned");
    expect(opt.textContent).toContain("in HD - Elementals");
    expect(opt.textContent).toContain("+1");
  });

  it("says not owned rather than nothing, and keeps the bookmark's room when it is off the wishlist", () => {
    const opt = draw(row({ owned: 0, decks: [], wishlist: false }));
    expect(opt.textContent).toContain("not owned");
    expect(opt.querySelector("svg")?.parentElement?.className).toContain("invisible");
  });

  it("puts a flavor match on its own line, under the card's own name", () => {
    const opt = draw(row({ name: "Captain America", flavorName: "Steve Rogers" }), "ste");
    expect(opt.textContent).toContain("printed as Steve Rogers");
  });

  it("opens on a press", () => {
    const onPick = vi.fn();
    fireEvent.click(draw(row(), "in", onPick));
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it("names the read's limit for the foot line", () => {
    expect(RESULTS_LIMIT).toBe(SEARCH_LIMIT);
    expect(cardSearchCopy.limitReached).toContain(String(SEARCH_LIMIT));
  });
});
