// The marker on a collection row (#43, Addendum 2 §1). `/collection` is the
// count-only vantage: the row never names the deck holding a card, and it
// never passes `selfExcluded`, because only a decklist is somewhere to stand.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Availability } from "../../lib/decks/availability";
import type { BrowseListCard } from "../../lib/collection/browse";
import { RowsView } from "./rows-view";

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

function renderRows(c: BrowseListCard) {
  return render(
    <RowsView cards={[c]} totalCards={1} onShowMore={() => {}} onOpen={() => {}} />,
  );
}

// The card the row opens is fetched on click, so the row itself is the only
// thing on screen that can say the click landed.
describe("RowsView pending row", () => {
  it("marks the row whose card is being fetched, and only that row", () => {
    const other = { ...card, oracleId: "o2", name: "Sol Ring" };
    render(
      <RowsView
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

describe("RowsView availability marker", () => {
  // The single most important assertion in the feature: three of five rows in
  // any real collection are free, and a free row must be untouched.
  it("renders nothing at all for a free card", () => {
    renderRows({ ...card, quantity: 2, availability: avail(2, 0) });
    expect(screen.queryByText(/free|in a draft|in a brew|short/)).toBeNull();
  });

  it("renders nothing when the availability read failed", () => {
    renderRows({ ...card, quantity: 2, availability: null });
    expect(screen.queryByText(/free|in a draft|in a brew|short/)).toBeNull();
  });

  it("is count-only — the deck name never reaches a collection row", () => {
    renderRows({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.getByText("none free")).toBeInTheDocument();
    expect(screen.queryByText(/Atraxa/)).toBeNull();
  });

  it("gives a free row no availability clause at all", () => {
    // The string carries the spoken cost because the pips beside it are
    // `aria-hidden`: the track is
    // visible and was announced to nobody. What this test protects is unchanged — the
    // availability clause lands LAST and a free card produces none.
    renderRows({ ...card, availability: avail(1, 0) });
    expect(
      screen.getByRole("button", {
        name: "Smothering Tithe, Enchantment, 1 copy, RVR, rare, mana cost 3 white",
      }),
    ).toBeInTheDocument();
  });

  it("appends the availability clause last on a committed row", () => {
    renderRows({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(
      screen.getByRole("button", {
        name: "Smothering Tithe, Enchantment, 1 copy, RVR, rare, mana cost 3 white, no free copies",
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

// The printed name (#467 follow-on). The full string rides the row button's own
// `aria-label`, which is a real control; the visible caption is the front face
// and may clip, and the modal one tap away is the recovery path.
describe("RowsView printed name", () => {
  it("names the row by the printing the player owns", () => {
    renderRows({ ...card, name: "World at War", printedName: "Battle of Olympus" });
    expect(screen.getByText("Battle of Olympus")).toBeInTheDocument();
    expect(screen.queryByText("World at War")).not.toBeInTheDocument();
  });

  it("carries the full printed name on the button, and never a title", () => {
    const { container } = renderRows({
      ...card,
      name: "World at War",
      printedName: "Battle of Olympus",
    });
    expect(screen.getByRole("button", { name: /Battle of Olympus/ })).toBeInTheDocument();
    expect(container.querySelector("[title]")).toBeNull();
  });

  it("leaves an ordinary card on its oracle name, byte for byte", () => {
    renderRows({ ...card, name: "Fire // Ice", printedName: null });
    expect(screen.getByText("Fire // Ice")).toBeInTheDocument();
  });
});

describe("RowsView cost track", () => {
  const trackOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('span[class*="w-[76px]"]');
  const pipsOf = (container: HTMLElement) =>
    [...(trackOf(container)?.querySelectorAll<HTMLElement>("span[style*='width: 12px']") ?? [])];

  it("draws the card's own mana cost, one pip per symbol", () => {
    const { container } = renderRows({ ...card, manaCost: "{3}{W}" });
    const pips = pipsOf(container);
    // A coloured pip carries no letter — the colour is the whole signal, and only
    // a generic or hybrid pip prints a numeral.
    expect(pips.map((p) => p.textContent)).toEqual(["3", ""]);
    expect(pips[1].style.background).toBe("var(--w)");
  });

  // The bug this row was reported for. `Abzan Monument` costs `{2}`; its ability
  // costs `{1}{W}{B}{G}`, which colour IDENTITY folds in — so the track drew a 2
  // and three coloured pips and read as a four-colour two-drop.
  it("ignores colour identity, which carries the ability's cost too", () => {
    const { container } = renderRows({
      ...card,
      typeLine: "Artifact",
      manaCost: "{2}",
      colorIdentity: ["W", "B", "G"],
    });
    expect(pipsOf(container).map((p) => p.textContent)).toEqual(["2"]);
  });

  it("draws nothing at all for a land, which has no cost to state", () => {
    const { container } = renderRows({
      ...card,
      typeLine: "Basic Land — Forest",
      manaCost: null,
    });
    expect(trackOf(container)?.textContent).toBe("");
  });

  it("renders one track, not a phone copy beside a desktop copy", () => {
    const { container } = renderRows(card);
    expect(container.querySelectorAll('span[class*="w-[76px]"]')).toHaveLength(1);
  });
});

describe("RowsView cost track accessibility", () => {
  it("speaks every symbol of the cost, which the pips only draw", () => {
    renderRows({ ...card, manaCost: "{3}{W}" });
    expect(screen.getByRole("button", { name: /mana cost 3 white/ })).toBeInTheDocument();
  });

  // Silence is indistinguishable from a missing label, so a land says so.
  it("says a land has no mana cost rather than falling silent", () => {
    renderRows({ ...card, typeLine: "Basic Land — Forest", manaCost: null });
    expect(screen.getByRole("button", { name: /no mana cost/ })).toBeInTheDocument();
  });
});
