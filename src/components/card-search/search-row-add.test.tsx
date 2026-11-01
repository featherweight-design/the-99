import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CardSearchRow } from "../../lib/card-search/search";
import { cardSearchCopy } from "../../lib/copy/card-search";
import { SearchRow } from "./search-row";

// Add a card from anywhere, PR 3 (C3, C-D1; READINESS O4, E8): the + at a search row's end.
const row = (over: Partial<CardSearchRow> = {}): CardSearchRow => ({
  oracleId: "o-gh", name: "Ghalta, Primal Hunger", imageUri: null, flavorName: null,
  owned: 0, decks: [], wishlist: false, ...over,
});

function draw(r: CardSearchRow, opts: { onAdd?: () => void; onPick?: () => void; added?: boolean; returned?: boolean } = {}) {
  const { container } = render(
    <SearchRow
      row={r}
      query=""
      id="opt-0"
      first
      active={false}
      returned={opts.returned ?? false}
      added={opts.added}
      onPick={opts.onPick ?? vi.fn()}
      onAdd={opts.onAdd}
    />,
  );
  return { opt: screen.getByRole("option"), plus: container.querySelector<HTMLButtonElement>("[data-card-search-add]") };
}

afterEach(cleanup);

describe("a search row's +", () => {
  it("adds, and the press stops there: the row does not open card details", () => {
    const onAdd = vi.fn();
    const onPick = vi.fn();
    const { plus } = draw(row(), { onAdd, onPick });
    fireEvent.click(plus!);
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("leaves the rest of the row one press for card details", () => {
    const onAdd = vi.fn();
    const onPick = vi.fn();
    const { opt } = draw(row(), { onAdd, onPick });
    fireEvent.click(opt);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("is a pointer target out of the tree and the tab order; the row's name says the add and its keys (O4, E8)", () => {
    const { opt, plus } = draw(row(), { onAdd: vi.fn() });
    expect(plus!.getAttribute("aria-hidden")).toBe("true");
    expect(plus!.tabIndex).toBe(-1);
    // jsdom reports no Mac platform: the keys off a Mac.
    expect(opt.getAttribute("aria-label")).toBe(
      `Ghalta, Primal Hunger, not owned, ${cardSearchCopy.row.addAria(cardSearchCopy.row.addKeysOther)}`,
    );
    expect(opt.getAttribute("aria-keyshortcuts")).toBe("Control+Enter");
  });

  it("comes after the bookmark, at the row's end, 44px on the phone and 34px from md", () => {
    const { opt, plus } = draw(row({ wishlist: true }), { onAdd: vi.fn() });
    expect(opt.lastElementChild).toBe(plus);
    expect(plus!.previousElementSibling?.hasAttribute("data-card-search-wishlist")).toBe(true);
    for (const c of ["h-11", "w-11", "rounded-[10px]", "md:h-[34px]", "md:w-[34px]", "md:rounded-[8px]", "border-[color:var(--border-strong)]"]) {
      expect(plus!.className).toContain(c);
    }
  });

  it("is not drawn where nothing can add, and the row's name stays as shipped (C8)", () => {
    const { opt, plus } = draw(row());
    expect(plus).toBeNull();
    expect(opt.getAttribute("aria-label")).toBe("Ghalta, Primal Hunger, not owned");
    expect(opt.hasAttribute("aria-keyshortcuts")).toBe(false);
  });

  it("reads the saved count in --success on the ringed row (C6, E9), and --fg-body otherwise", () => {
    const saved = draw(row({ owned: 1 }), { onAdd: vi.fn(), added: true, returned: true });
    expect(saved.opt.querySelector("b")!.className).toContain("text-[color:var(--success)]");
    cleanup();
    const plain = draw(row({ owned: 1 }), { onAdd: vi.fn() });
    expect(plain.opt.querySelector("b")!.className).toContain("text-[color:var(--fg-body)]");
  });
});
