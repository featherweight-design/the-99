// The marker on a collection row (#43, Addendum 2 §1). `/collection` is the
// count-only vantage: the row never names the deck holding a card, and it
// never passes `selfExcluded`, because only a decklist is somewhere to stand.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Availability } from "../../lib/decks/availability";
import type { BrowseCard } from "../../lib/collection/browse";
import { RowsView } from "./rows-view";

const card: BrowseCard = {
  oracleId: "o1",
  name: "Smothering Tithe",
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
  oracleText: "",
  keywords: [],
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: null,
  quantity: 1,
  printings: [],
  setCodes: ["RVR"],
  primarySetCode: "RVR",
  preferredPrinting: null,
};

// `/collection` reads from off every decklist, so `free` really is `owned − hard`
// here. Fixtures for a deck's own list must set `free` explicitly instead.
const avail = (
  owned: number,
  hard: number,
  soft = 0,
  hardDeckNames: string[] = [],
): Availability => ({
  owned,
  hard,
  soft,
  free: owned - hard,
  claims: hardDeckNames.map((n, i) => ({ id: `d${i + 1}`, name: n, quantity: 1, mature: true })),
});

function renderRows(c: BrowseCard) {
  return render(
    <RowsView cards={[c]} totalCards={1} onShowMore={() => {}} onOpen={() => {}} />,
  );
}

describe("RowsView availability marker", () => {
  // The single most important assertion in the feature: three of five rows in
  // any real collection are free, and a free row must be untouched.
  it("renders nothing at all for a free card", () => {
    renderRows({ ...card, quantity: 2, availability: avail(2, 0) });
    expect(screen.queryByText(/free|in a brew|short/)).toBeNull();
  });

  it("renders nothing when the availability read failed", () => {
    renderRows({ ...card, quantity: 2, availability: null });
    expect(screen.queryByText(/free|in a brew|short/)).toBeNull();
  });

  it("is count-only — the deck name never reaches a collection row", () => {
    renderRows({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.getByText("none free")).toBeInTheDocument();
    expect(screen.queryByText(/Atraxa/)).toBeNull();
  });

  it("gives a free row exactly today's accessible name, with no clause", () => {
    renderRows({ ...card, availability: avail(1, 0) });
    expect(
      screen.getByRole("button", {
        name: "Smothering Tithe, Enchantment, 1 copy, RVR, rare",
      }),
    ).toBeInTheDocument();
  });

  it("appends the availability clause last on a committed row", () => {
    renderRows({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(
      screen.getByRole("button", {
        name: "Smothering Tithe, Enchantment, 1 copy, RVR, rare, no free copies",
      }),
    ).toBeInTheDocument();
  });

  // The over glyph's seam is whatever sits behind it, and this row swaps its
  // background on hover. Pinned to a colour the seam paints a visible hairline
  // through the glyph the moment the pointer lands, so it reads through a
  // variable the row redefines on hover — the decklist row's arrangement.
  it("points the over glyph's seam at the row background the hover redefines", () => {
    const { container } = renderRows({ ...card, quantity: 1, availability: avail(1, 3) });
    const row = screen.getByRole("button");
    expect(row.className).toContain("[--row-bg:var(--surface)]");
    expect(row.className).toContain("hover:[--row-bg:var(--surface-raised)]");
    const seamed = [...container.querySelectorAll("span")].filter(
      (s) => (s as HTMLElement).style.borderLeft !== "",
    );
    expect(seamed).toHaveLength(1);
    expect((seamed[0] as HTMLElement).style.borderLeft).toBe("1px solid var(--row-bg)");
  });
});

// R5 §1: five spaced pips measure 67px against a 40px track, so from four the
// pips fan instead. A browser run confirmed the five-pip case at both widths;
// four is the boundary the collection fixture has no card for.
describe("RowsView colour pips", () => {
  const pipsOf = (container: HTMLElement) =>
    [...(container.querySelector("button")!.children[1].children as HTMLCollectionOf<HTMLElement>)];

  it("leaves three pips spaced", () => {
    const { container } = renderRows({ ...card, colorIdentity: ["W", "U", "B"] });
    const pips = pipsOf(container);
    expect(pips).toHaveLength(3);
    expect(pips.every((p) => p.style.marginLeft === "")).toBe(true);
    expect(pips.every((p) => p.style.zIndex === "")).toBe(true);
  });

  it("fans from four, in WUBRG order with the left edge on top", () => {
    const { container } = renderRows({ ...card, colorIdentity: ["W", "U", "B", "R"] });
    const pips = pipsOf(container);
    expect(pips.map((p) => p.style.marginLeft)).toEqual(["", "-5px", "-5px", "-5px"]);
    expect(pips.map((p) => p.style.zIndex)).toEqual(["4", "3", "2", "1"]);
  });

  it("rings every pip against the row background, not a pinned colour", () => {
    const { container } = renderRows({ ...card, colorIdentity: ["W", "U", "B", "R", "G"] });
    for (const pip of pipsOf(container)) {
      expect(pip.style.boxShadow).toBe(
        "0 0 0 1px var(--row-bg), inset 0 0 0 1px rgba(0,0,0,0.35)",
      );
    }
  });
});
