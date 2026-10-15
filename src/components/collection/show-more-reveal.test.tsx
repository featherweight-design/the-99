// E9 on /collection: the cards a Show more adds fade in one after another, and nothing else does.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { BrowseListCard } from "../../lib/collection/browse";
import { GridView } from "./grid-view";
import { RowsView } from "./rows-view";

afterEach(cleanup);

const cards = (n: number, start = 0): BrowseListCard[] =>
  Array.from({ length: n }, (_, i) => ({
    oracleId: `o${start + i}`, name: `Card ${start + i}`, typeLine: "Enchantment", manaCost: "{3}{W}", rarity: "rare" as const,
    colorIdentity: ["W"], imageUri: null, printedName: null, quantity: 1, setCounts: [], primarySetCode: "RVR",
  }));

const props = { totalCards: 600, onShowMore: () => {}, onOpen: () => {} };
const buttons = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>("button")].filter((b) => b.textContent?.includes("Card "));
const reveals = (c: HTMLElement) => buttons(c).map((b) => (b.classList.contains("anim-reveal") ? b.style.getPropertyValue("--reveal-n") : null));

describe.each([
  ["the grid", (list: BrowseListCard[], pending: string | null = null) => <GridView cards={list} pendingOracleId={pending} {...props} />],
  ["the rows", (list: BrowseListCard[], pending: string | null = null) => <RowsView cards={list} pendingOracleId={pending} {...props} />],
])("%s", (_name, draw) => {
  it("draws the first window with no reveal, and fades in only what a Show more added, stepped and capped", () => {
    const { container, rerender } = render(draw(cards(20)));
    expect(reveals(container).every((r) => r === null)).toBe(true);
    rerender(draw(cards(40)));
    const r = reveals(container);
    expect(r.slice(0, 20).every((x) => x === null)).toBe(true);
    expect(r[20]).toBe("0");
    expect(r[25]).toBe("5");
    expect(r[31]).toBe("11");
    expect(r[39]).toBe("11");
  });

  it("reveals nothing for a different list (a filter or a sort), even a longer one", () => {
    const { container, rerender } = render(draw(cards(20)));
    rerender(draw(cards(60, 100)));
    expect(reveals(container).every((x) => x === null)).toBe(true);
  });

  it("keeps a pending card's own dimming beside its place in the reveal", () => {
    const { container, rerender } = render(draw(cards(20)));
    rerender(draw(cards(40), "o25"));
    const tile = buttons(container)[25];
    expect(tile.style.opacity).toBe("0.55");
    expect(tile.style.getPropertyValue("--reveal-n")).toBe("5");
    // And one that is already on screen keeps only its dimming.
    rerender(draw(cards(40), "o3"));
    expect(buttons(container)[3].style.opacity).toBe("0.55");
    expect(buttons(container)[3].style.getPropertyValue("--reveal-n")).toBe("");
  });
});
