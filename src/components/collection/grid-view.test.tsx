// The chip on a collection tile (#43, Addendum 2 §2). Same count-only vantage
// as the row: the chip carries a number and never a deck name. The fixtures are
// deliberately a copy of rows-view.test.tsx's — the two files are read side by
// side, and a shared module for six lines would cost more than it saves.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Availability } from "../../lib/decks/availability";
import type { BrowseListCard } from "../../lib/collection/browse";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { availabilityCopy } from "../../lib/copy/availability";
import { GRID_EAGER_TILES, GridView } from "./grid-view";

const card: BrowseListCard = {
  oracleId: "o1",
  name: "Smothering Tithe",
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: null,
  printedName: null,
  quantity: 1,
  setCounts: [],
  primarySetCode: "RVR",
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
  claims: hardDeckNames.map((n, i) => ({ id: `d${i + 1}`, name: n, quantity: 1, mature: true, pending: false, commander: false, senior: true })),
});

function renderTiles(c: BrowseListCard) {
  return render(
    <GridView cards={[c]} totalCards={1} onShowMore={() => {}} onOpen={() => {}} />,
  );
}

// The card the tile opens is fetched on click, so the tile itself is the only
// thing on screen that can say the click landed.
describe("GridView pending tile", () => {
  it("marks the tile whose card is being fetched, and only that tile", () => {
    const other = { ...card, oracleId: "o2", name: "Sol Ring" };
    render(
      <GridView
        cards={[card, other]}
        totalCards={2}
        onShowMore={() => {}}
        onOpen={() => {}}
        pendingOracleId="o1"
      />,
    );
    const [first, second] = screen.getAllByRole("button").slice(0, 2);
    expect(first).toHaveAttribute("aria-busy", "true");
    expect(first.style.opacity).toBe("0.55");
    expect(second).toHaveAttribute("aria-busy", "false");
    expect(second.style.opacity).toBe("");
  });
});

describe("GridView availability chip", () => {
  it("renders nothing at all for a free card", () => {
    renderTiles({ ...card, quantity: 2, availability: avail(2, 0) });
    expect(screen.queryByText(/free|in a draft|in a brew|short/)).toBeNull();
  });

  it("renders nothing when the availability read failed", () => {
    renderTiles({ ...card, quantity: 2, availability: null });
    expect(screen.queryByText(/free|in a draft|in a brew|short/)).toBeNull();
  });

  // Collection surfaces, Call 3, below `md` only: the phone tile's chip drops its word; the
  // desktop tile (`hidden md:inline-flex`, from `md`) keeps the exact pre-round chip. Both
  // mount together — the breakpoint is CSS, which jsdom does not evaluate — so the probe
  // reads each by its OWN class rather than by a single query across the whole caption.
  it("carries two chips: glyph-only below md, the worded chip from md, never neither", () => {
    renderTiles({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    const tile = screen.getByRole("button");
    const phoneChip = tile.querySelector(".md\\:hidden")!;
    const desktopChip = tile.querySelector(".md\\:inline-flex")!;
    // Its only text is the sr-only sentence — no visible word of its own.
    expect(phoneChip.textContent).toBe("no free copies");
    expect(phoneChip.querySelector(".sr-only")?.textContent).toBe("no free copies");
    expect(desktopChip.textContent).toBe("none freeno free copies");
    expect(desktopChip.textContent).not.toContain("Atraxa");
    // Found by Copilot's round-4 review: the desktop chip kept its word but dropped `spoken`,
    // so its accessible name regressed from the full sentence to the bare visible word.
    expect(desktopChip.querySelector(".sr-only")?.textContent).toBe("no free copies");
  });

  it("leaves the set · rarity caption untouched", () => {
    renderTiles({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.getByText("RVR · rare")).toBeInTheDocument();
  });

  // Unconditional (Hugh, 2026-10-03): ONE key, carrying the availability entries at every
  // width, rather than a phone instance that has them and a separate desktop one that does not.
  it("gives the one key the availability entries, at every width", () => {
    renderTiles({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.getAllByRole("group")).toHaveLength(1);
    const key = screen.getByRole("group");
    expect(key.textContent).toContain(availabilityCopy.collection.filterSoft);
  });
});

// The printed name (#467 follow-on). `/collection` lists only what the player
// owns, so the unowned fallback cannot occur on this surface by construction.
describe("GridView printed name", () => {
  it("captions a tile with the name printed on the copy the player owns", () => {
    renderTiles({ ...card, name: "World at War", printedName: "Battle of Olympus" });
    // Twice over: the visible caption and the sr-only string the button is
    // named from. The oracle name appears in neither.
    expect(screen.getAllByText("Battle of Olympus")).toHaveLength(2);
    expect(screen.queryByText("World at War")).not.toBeInTheDocument();
  });

  it("leaves an ordinary card on its oracle name, byte for byte", () => {
    renderTiles({ ...card, name: "Fire // Ice", printedName: null });
    expect(screen.getAllByText("Fire // Ice")).toHaveLength(2);
  });

  // The tile's accessible name is its text content, so the clipped caption alone
  // would announce a renamed two-faced card as its front face and lose the back.
  it("speaks both faces of a renamed two-faced card, while the caption shows one", () => {
    renderTiles({
      ...card,
      name: "Delver of Secrets // Insectile Aberration",
      printedName: "Battle of Olympus // Aftermath",
      layout: "transform",
    });
    expect(screen.getByText("Battle of Olympus")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Battle of Olympus \/\/ Aftermath/ }),
    ).toBeInTheDocument();
  });

  it("announces an ordinary card by exactly the name on its caption", () => {
    renderTiles({ ...card, name: "Sol Ring", printedName: null });
    expect(screen.getByRole("button", { name: /Sol Ring/ })).toBeInTheDocument();
  });
});

/** The combo tooltip is pointer-fine only. */
function stubPointer(fine: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("pointer: fine") ? fine : false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("GridView combo mark", () => {
  // The glyph is `ComboMark`, which the meta line hands `comboOtherPartners` straight through:
  // a card with more than one partner must read the same way here as on `rows-view.tsx`.
  it("counts the partners the tooltip is not naming, not just the one it is", async () => {
    stubPointer(true);
    renderTiles({
      ...card,
      comboPartner: { name: "Thrasios, Triton Hero" },
      comboOtherPartners: 2,
    });
    // Scoped to the tile's own button: `CollectionMarkKey` above it carries its own
    // `combo-glyph` sample (same `data-testid`), which an unscoped query would also find.
    fireEvent.pointerEnter(within(screen.getByRole("button")).getByTestId("combo-glyph"));
    await waitFor(() =>
      expect(
        screen.getByText(
          comboAwarenessCopy.markerTooltip.ownBothMore("Thrasios, Triton Hero", 2),
        ),
      ).toBeTruthy(),
    );
  });
});

// Collection surfaces, Call 3: past three glyphs (facts plus the combo lemniscate), the meta
// line draws the first two and then `+N` rather than a fourth.
describe("GridView mark overflow", () => {
  const comboPartner = { name: "Thrasios, Triton Hero" };

  it("draws every mark up to the budget of three, with no +N", () => {
    renderTiles({
      ...card,
      facts: ["gameChanger", "massLandDenial"],
      comboPartner,
    });
    expect(screen.queryByText(/^\+\d/)).toBeNull();
  });

  it("collapses a fourth mark to +N, keeping the first two", () => {
    renderTiles({
      ...card,
      facts: ["gameChanger", "massLandDenial", "extraTurns"],
      comboPartner,
    });
    // 3 facts + 1 combo = 4 marks: the first two facts draw, the rest collapse to +2.
    const more = screen.getByText("+2");
    expect(more).toBeInTheDocument();
    // STATES-collection-head.md: `--fg-faint`, never `--fact` — the count is subordinate to
    // the marks it stands in for, not a fourth fact in its own right.
    expect(more.style.color).toBe("var(--fg-faint)");
  });
});

describe("GridView count", () => {
  it("says nothing on a single copy", () => {
    renderTiles({ ...card, quantity: 1 });

    // `×1` was the tile's only figure when the badge sat alone on the art, so
    // stating it at least said the count was known. On the meta line it sits
    // beside a chip and a set code and is the one figure there that tells the
    // reader nothing — said loudest on the most ordinary card they own.
    expect(screen.queryByText("×1")).toBeNull();
  });

  it("states a count the reader could not have assumed", () => {
    renderTiles({ ...card, quantity: 3 });

    expect(screen.getByText("×3")).toBeInTheDocument();
  });
});

// The server HTML asks for the first screen's art and no more (PR 4's measurement on
// `?view=grid`: ~2.4MB of `normal` images landing before hydration held the page at ~20s).
// Read as SERVER markup on purpose: jsdom has no IntersectionObserver, so a client render
// grants every tile its art once hydrated and could not tell an eager tile from a waiting one.
describe("GridView art in the server HTML", () => {
  it("names art for the first GRID_EAGER_TILES tiles and withholds the rest", async () => {
    const { renderToString } = await import("react-dom/server");
    const { GRID_EAGER_TILES } = await import("./grid-view");
    const cards = Array.from({ length: GRID_EAGER_TILES + 3 }, (_, i) => ({
      ...card,
      oracleId: `o${i}`,
      name: `Card ${i}`,
      imageUri: `https://cards.scryfall.io/normal/front/a/b/art-${i}.jpg`,
    }));
    const html = renderToString(
      <GridView cards={cards} totalCards={cards.length} onShowMore={() => {}} onOpen={() => {}} />,
    );
    const asked = [...html.matchAll(/src="[^"]*art-(\d+)\.jpg"/g)].map((m) => Number(m[1]));
    expect(asked).toEqual(Array.from({ length: GRID_EAGER_TILES }, (_, i) => i));
    // Every tile still draws its art box, so nothing moves when the art arrives.
    expect(html.match(/<img/g)?.length).toBe(cards.length);
  });
});

// /collection's first visit draws both views and lets CSS pick one. The grid copy may be hidden,
// and a browser fetches a plain <img> under display:none but never a lazy one, so the eager tiles
// of THAT copy carry `loading="lazy"` and no other copy does. Read against the export, not a
// literal: the eager count is tuned in a browser slot.
describe("GridView when it may be hidden", () => {
  const many = Array.from({ length: GRID_EAGER_TILES + 4 }, (_, i) =>
    ({ ...card, oracleId: `o${i}`, name: `Card ${i}`, imageUri: `https://cards.scryfall.io/normal/front/${i}.jpg` }),
  );
  const loadings = (container: HTMLElement) =>
    [...container.querySelectorAll("img")].map((img) => img.getAttribute("loading"));

  it("marks exactly the eager tiles lazy", () => {
    const { container } = render(
      <GridView cards={many} totalCards={many.length} onShowMore={() => {}} onOpen={() => {}} mayBeHidden />,
    );
    const got = loadings(container);
    expect(got.slice(0, GRID_EAGER_TILES).every((l) => l === "lazy")).toBe(true);
    expect(got.slice(GRID_EAGER_TILES).every((l) => l === null)).toBe(true);
  });

  it("leaves every tile as it was without the prop", () => {
    const { container } = render(
      <GridView cards={many} totalCards={many.length} onShowMore={() => {}} onOpen={() => {}} />,
    );
    expect(loadings(container).every((l) => l === null)).toBe(true);
  });
});

// The price clause is the LAST thing the tile's name says while sorted by price: the name is the
// button's text in order, and the set and rarity sub-line comes after the name line.
describe("GridView price clause", () => {
  it("speaks the price after the set and rarity, and only while sorted by price", () => {
    const priced = { ...card, price: 2000 * 8 };
    const { rerender } = render(
      <GridView cards={[priced]} totalCards={1} onShowMore={() => {}} onOpen={() => {}} showPrice />,
    );
    const name = screen.getByRole("button", { name: /Smothering Tithe/ }).textContent ?? "";
    expect(name.endsWith("$20.00 at Mana Pool")).toBe(true);
    expect(name.indexOf("RVR")).toBeLessThan(name.indexOf("$20.00 at Mana Pool"));
    rerender(<GridView cards={[priced]} totalCards={1} onShowMore={() => {}} onOpen={() => {}} />);
    expect(screen.getByRole("button", { name: /Smothering Tithe/ }).textContent).not.toContain("Mana Pool");
  });
});
