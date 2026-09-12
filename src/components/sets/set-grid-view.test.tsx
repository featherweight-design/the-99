import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SetGridView } from "./set-grid-view";
import { placeCells, type SetPrinting } from "../../lib/sets/completion";

const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

// The delta strip polls a server action on focus; it is covered by its own file.
const deltaProps: { recheckKey?: string } = {};
vi.mock("./delta-strip", () => ({
  DeltaStrip: (props: { recheckKey?: string }) => {
    deltaProps.recheckKey = props.recheckKey;
    return null;
  },
}));

// The grid opens the shipped card modal through its provider; the provider itself is
// covered where it lives.
const openCard = vi.fn();
const setSiblings = vi.fn();
const closeCard = vi.fn();
let openOracleId: string | null = null;
vi.mock("../cards/card-detail-provider", () => ({
  useCardDetail: () => ({
    open: openCard, setSiblings, close: closeCard, openOracleId,
  }),
}));

const p = (n: string, over: Partial<SetPrinting> = {}): SetPrinting => ({
  scryfallId: `s-${n}`, oracleId: `o-${n}`, collectorNumber: n, name: `Card ${n}`,
  imageUriSmall: null, colorIdentity: ["W"], rarity: "common", booster: true,
  isVariant: false, ...over,
});

function view(printings: SetPrinting[], ownedNumbers: string[] = [], name = "Duskmourn") {
  const holdings = ownedNumbers.map((n) => ({
    oracleId: `o-${n}`, collectorNumber: n, finish: "nonfoil" as const,
  }));
  return render(
    <SetGridView
      code="dsk"
      name={name}
      iconSvgUri={null}
      releasedAt="2026-09-01"
      ownedFingerprint=""
      artGeneration={0}
      cells={placeCells(printings, holdings)}
      prices={[]}
      newestAsOf={null}
      baseSetSize={printings.filter((x) => x.booster === true).length || null}
      staleAsOf={null}
    />,
  );
}

/**
 * The rarity trigger is MOUNTED on the breakpoint rather than CSS-hidden — `FilterPanel`
 * holds its own open state and picks popover or sheet off the same hook, so hiding it with
 * `display:none` would keep that state across a resize. JSDOM reports no width, so a test
 * that wants the desktop control has to say so.
 */
function stubDesktop(wide: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: wide, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }),
  );
}

/**
 * Rarity is a trigger and a panel since addendum R2 §28, not four letter buttons: four
 * values, single-select, with an off state is the chassis's own test for a panel dimension.
 * So a test that wants a rarity opens the trigger first.
 */
function pickRarity(label: string) {
  fireEvent.click(screen.getByRole("button", { name: /Filter by rarity/ }));
  fireEvent.click(screen.getByRole("option", { name: new RegExp(`^${label.toLowerCase()},`, "i") }));
}

const replaceState = vi.spyOn(window.history, "replaceState");

beforeEach(() => {
  vi.unstubAllGlobals();
  search = "";
  replaceState.mockClear();
  openCard.mockClear();
  setSiblings.mockClear();
  closeCard.mockClear();
  openOracleId = null;
});

describe("SetGridView — the two sections", () => {
  it("counts the base run in the headline and never folds the extras in", () => {
    view([p("1"), p("2"), p("277", { booster: false })], ["1"]);
    expect(screen.getByText("1 / 2 · 50%")).toBeInTheDocument();
  });

  it("gives the extras section its own ratio", () => {
    view([p("1"), p("277", { booster: false }), p("278", { booster: false })], ["277"]);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("says the figure counts the base run only", () => {
    view([p("1")], []);
    expect(screen.getByText("base run only · extras counted apart")).toBeInTheDocument();
  });

  it("offers the extras jump only when there are extras to jump to", () => {
    view([p("1")], []);
    expect(screen.queryByText("extras ↓")).toBeNull();
    view([p("1"), p("277", { booster: false })], []);
    expect(screen.getByText("extras ↓")).toBeInTheDocument();
  });
});

describe("SetGridView — 0% and 100%", () => {
  it("renders a real grid at 0% rather than an empty state", () => {
    view([p("1"), p("2")], []);
    expect(screen.getByText("0 / 2 · 0%")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /not in your collection/ })).toHaveLength(2);
  });

  it("reads a complete set as sealed rather than as a ratio", () => {
    view([p("1"), p("2")], ["1", "2"]);
    expect(screen.getByText("Duskmourn, complete")).toBeInTheDocument();
    expect(screen.getByText("all 2 of the base run")).toBeInTheDocument();
  });

  it("removes Missing-only at 100 percent rather than greying it", () => {
    // The grey-in-place rule protects a control's STATE; here the population is empty
    // and stays empty until the reader sells a card, so there is no state to lose.
    view([p("1")], ["1"]);
    expect(screen.queryByRole("button", { name: /Showing only cards/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Showing every card/ })).toBeNull();
  });

  it("promotes the extras count into the head at 100 percent", () => {
    view([p("1"), p("277", { booster: false })], ["1"]);
    expect(screen.getByText(/Extras 0 \/ 1/)).toBeInTheDocument();
    expect(screen.getByText(/the only thing left in this set/)).toBeInTheDocument();
  });

  it("closes a complete set with no extras, and never renders 0 / 0", () => {
    const { container } = view([p("1")], ["1"]);
    expect(screen.getByText("Nothing left in this set")).toBeInTheDocument();
    expect(container.textContent).not.toContain("0 / 0");
  });
});

describe("SetGridView — price staleness", () => {
  // A sold-out printing keeps its last row with an older as_of by design, so on any real
  // set some row always trails the newest. Staleness is measured against the clock.
  const withPrices = (asOf: string, staleAsOf: string | null = null) => render(
    <SetGridView
      code="dsk"
      name="Duskmourn"
      iconSvgUri={null}
      releasedAt="2026-09-01"
      ownedFingerprint=""
      artGeneration={0}
      cells={placeCells([p("1"), p("2")], [])}
      prices={[
        { scryfallId: "s-1", cents: 100, foilCents: null, etchedCents: null, asOf },
        { scryfallId: "s-2", cents: 200, foilCents: null, etchedCents: null,
          asOf: "2026-01-01 09:00:00" },
      ]}
      newestAsOf={asOf}
      baseSetSize={2}
      staleAsOf={staleAsOf}
    />,
  );

  it("stays quiet when a row trails but the feed itself is current", () => {
    const today = new Date().toISOString().slice(0, 10) + " 09:00:00";
    withPrices(today, null);
    expect(screen.queryByText(/prices as of/)).toBeNull();
  });

  it("says so once when the server reports the feed behind", () => {
    withPrices("2026-01-01 09:00:00", "1 January");
    expect(screen.getByText(/prices as of 1 January/)).toBeInTheDocument();
  });
});

describe("SetGridView — filters", () => {
  it("writes missing-only to the URL without navigating", () => {
    // Every cell is already loaded, so a toggle is a presentation change over data in
    // hand: routing is the request being avoided.
    view([p("1"), p("2")], ["1"]);
    fireEvent.click(screen.getByRole("button", { name: /Showing every card/ }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?m=1");
  });

  it("serialises a cleared filter as an absence rather than an empty parameter", () => {
    search = "m=1";
    view([p("1"), p("2")], ["1"]);
    fireEvent.click(screen.getByRole("button", { name: /Showing only cards/ }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  it("hides owned cells under missing-only and says the numbers skip", () => {
    search = "m=1";
    view([p("1"), p("2")], ["1"]);
    expect(screen.getByText(/numbers skip/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /not in your collection/ })).toHaveLength(1);
  });

  it("filters by rarity against the printing's own rarity", () => {
    search = "r=mythic";
    view([p("1", { rarity: "mythic" }), p("2", { rarity: "common" })], []);
    expect(screen.getAllByRole("button", { name: /not in your collection/ })).toHaveLength(1);
  });

  it("reads zero under missing-only as good news, not as a dead end", () => {
    // A set that is NOT complete, but whose rares you hold outright: missing-only plus a
    // rarity filter leaves nothing, and that is good news rather than a dead end. (A
    // complete set renders the complete state instead, and drops missing-only with it.)
    search = "m=1&r=rare";
    view([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], ["1"]);
    expect(screen.getByText(/You are not missing any/)).toBeInTheDocument();
  });

  it("offers to clear when the filters simply excluded everything", () => {
    search = "c=U";
    view([p("1", { colorIdentity: ["W"] })], []);
    expect(screen.getByText(/No cards that match in this set/)).toBeInTheDocument();
  });
});

describe("SetGridView — not indexed yet", () => {
  const unindexed = () => render(
    <SetGridView
      code="dsk"
      name="Duskmourn"
      iconSvgUri={null}
      releasedAt="2026-09-01"
      ownedFingerprint=""
      artGeneration={0}
      cells={placeCells([p("1", { booster: null }), p("2", { booster: null })], [])}
      prices={[]}
      newestAsOf={null}
      baseSetSize={null}
      staleAsOf={null}
    />,
  );

  it("says the checklist is not indexed rather than blaming the filters", () => {
    // With nothing classified there is no base run, so every cell falls out of both
    // sections. Without this branch the page read "no cards match", which blames the
    // reader for a catalog that has not been indexed.
    unindexed();
    expect(screen.getByText(/has not been indexed yet/)).toBeInTheDocument();
    expect(screen.queryByText(/No cards that match/)).toBeNull();
  });

  it("prints no ratio and no percentage when there is no denominator", () => {
    const { container } = unindexed();
    expect(container.textContent).not.toContain("0 / 0");
    expect(container.textContent).not.toMatch(/\d%/);
  });
});

describe("SetGridView — a complete base run with m=1 still in the URL", () => {
  it("stops filtering the extras once the control that set it is gone", () => {
    // A reader can complete the base run with missing-only on. The control is removed at
    // 100%, so leaving the parameter applied would go on hiding owned extras with no way
    // to turn it off short of clearing every filter.
    search = "m=1";
    const printings = [p("1"), p("277", { booster: false })];
    render(
      <SetGridView
        code="dsk"
        name="Duskmourn"
        iconSvgUri={null}
        releasedAt="2026-09-01"
        ownedFingerprint=""
        artGeneration={0}
        cells={placeCells(printings, [
          { oracleId: "o-1", collectorNumber: "1", finish: "nonfoil" },
          { oracleId: "o-277", collectorNumber: "277", finish: "nonfoil" },
        ])}
        prices={[]}
        newestAsOf={null}
        baseSetSize={1}
        staleAsOf={null}
      />,
    );
    expect(screen.getByText("Duskmourn, complete")).toBeInTheDocument();
    // The owned extra is visible rather than filtered away by a control that is not there.
    expect(screen.getByRole("button", { name: /Card 277.*in your collection/ }))
      .toBeInTheDocument();
  });
});

describe("SetGridView — the cost strip's scope", () => {
  const priced = (ids: string[]) => ids.map((id) => ({
    scryfallId: id, cents: 100, foilCents: null, etchedCents: null,
    asOf: "2026-09-08 09:00:00",
  }));

  it("costs the base run only while the label says base run", () => {
    // Two missing cards, one base and one extra. "Cost to complete" is the base run, so
    // the button must offer one card and not two.
    render(
      <SetGridView
        code="dsk"
        name="Duskmourn"
        iconSvgUri={null}
        releasedAt="2026-09-01"
        ownedFingerprint=""
        artGeneration={0}
        cells={placeCells([p("1"), p("277", { booster: false })], [])}
        prices={priced(["s-1", "s-277"])}
        newestAsOf="2026-09-08 09:00:00"
        baseSetSize={1}
        staleAsOf={null}
      />,
    );
    expect(screen.getByText("Send 1 to ManaPool")).toBeInTheDocument();
    expect(screen.getByText("over 1 of the 1 missing")).toBeInTheDocument();
  });

  it("re-scopes to the extras once the base run is complete", () => {
    render(
      <SetGridView
        code="dsk"
        name="Duskmourn"
        iconSvgUri={null}
        releasedAt="2026-09-01"
        ownedFingerprint=""
        artGeneration={0}
        cells={placeCells(
          [p("1"), p("277", { booster: false }), p("278", { booster: false })],
          [{ oracleId: "o-1", collectorNumber: "1", finish: "nonfoil" }],
        )}
        prices={priced(["s-277", "s-278"])}
        newestAsOf="2026-09-08 09:00:00"
        baseSetSize={1}
        staleAsOf={null}
      />,
    );
    expect(screen.getByText("Cost to finish the extras")).toBeInTheDocument();
    expect(screen.getByText("Send 2 to ManaPool")).toBeInTheDocument();
  });
});

describe("SetGridView — the cell is the target", () => {
  it("opens the card modal, which the cells could not do at all before", () => {
    // SetCell only opens a card when it is handed onOpen, and the page never handed it
    // one: every button on the grid was inert.
    view([p("1"), p("2")], []);
    fireEvent.click(screen.getAllByRole("button", { name: /not in your collection/ })[0]);
    expect(openCard).toHaveBeenCalledWith(
      "o-1", ["o-1", "o-2"], { setCode: "DSK", collectorNumber: "1", imageUri: null },
    );
  });

  it("pages Prev/Next through the cells in the order they are on screen", () => {
    search = "m=1";
    view([p("1"), p("2"), p("3")], ["2"]);
    fireEvent.click(screen.getAllByRole("button", { name: /not in your collection/ })[0]);
    // #2 is owned and hidden by missing-only, so it is not a sibling to page to.
    expect(openCard).toHaveBeenCalledWith(
      "o-1", ["o-1", "o-3"], { setCode: "DSK", collectorNumber: "1", imageUri: null },
    );
  });
});

describe("SetGridView — phone and desktop are one document", () => {
  it("renders exactly one Missing-only control, not one per breakpoint", () => {
    // Two buttons with one accessible name read as correct at either width alone and
    // wrong in the document that contains both.
    view([p("1"), p("2")], ["1"]);
    expect(screen.getAllByRole("button", { name: /Showing every card/ })).toHaveLength(1);
  });

  it("puts the filters behind a sheet on the phone, with a count badge", () => {
    search = "c=W&r=rare";
    view([p("1"), p("2")], ["1"]);
    expect(screen.getByRole("button", { name: /2 filters on/ })).toBeInTheDocument();
  });

  // Addendum R2 §28: the badge counts DIMENSIONS only. Missing-only is a control on the
  // row beside the badge, so counting it states the same fact twice in one glance — and it
  // put a `1` on `Filters` with nothing behind `Filters`.
  it("leaves missing-only out of the badge, which sits beside it", () => {
    search = "m=1";
    view([p("1"), p("2")], ["1"]);
    expect(screen.queryByRole("button", { name: /filter(s)? on/ })).toBeNull();
  });

  it("keeps the cost strip when the filters match nothing", () => {
    // The handoff draws a zero figure rather than a strip that disappears.
    search = "c=U";
    view([p("1", { colorIdentity: ["W"] })], []);
    expect(screen.getByText("Cost to complete")).toBeInTheDocument();
    expect(screen.queryByText(/Send \d+ to ManaPool/)).toBeNull();
  });

  it("treats rarity as single select rather than a union", () => {
    stubDesktop(true);
    search = "r=common";
    view([p("1", { rarity: "common" }), p("2", { rarity: "rare" })], []);
    pickRarity("Rare");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?r=rare");
  });

  it("announces the result line, which is the only place the count changes", () => {
    view([p("1"), p("2")], ["1"]);
    const status = screen.getAllByRole("status").find((el) => /cells/.test(el.textContent ?? ""));
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("keeps the other filters when correcting an empty missing-only result", () => {
    search = "m=1&r=rare";
    view([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], ["1"]);
    fireEvent.click(screen.getByRole("button", { name: /Show it|Show all/ }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?r=rare");
  });
});

describe("SetGridView — the phone filter sheet is a real dialog", () => {
  const openSheet = () => {
    view([p("1"), p("2")], ["1"]);
    const trigger = screen.getByRole("button", { name: /Filters/ });
    // Focused first: a real pointer or keyboard activation focuses the trigger, and the
    // shared hook returns focus to whatever had it when the dialog opened.
    trigger.focus();
    fireEvent.click(trigger);
    return screen.getByRole("dialog");
  };

  it("is modal, so a reader is not left tabbing through the page behind it", () => {
    expect(openSheet()).toHaveAttribute("aria-modal", "true");
  });

  it("holds the page still behind it", () => {
    // The gap a hand-rolled trap left: focus and Escape were handled and the page went on
    // scrolling under the sheet. (Where focus lands is not assertable here — the shared
    // hook picks the first VISIBLE focusable, and jsdom reports no client rects.)
    openSheet();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("releases the page when it closes", () => {
    openSheet();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("closes on Escape", () => {
    openSheet();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("returns focus to the trigger it came from", () => {
    openSheet();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Filters/ }));
  });
});

describe("SetGridView — the URL wins over a local override", () => {
  it("adopts filters the reader navigated to with Back", () => {
    stubDesktop(true);
    // The local override is keyed on the URL it wrote. Without that key, Back changed the
    // query string while the grid went on rendering the filters just navigated away from.
    const { rerender } = render(
      <SetGridView
        code="dsk"
        name="Duskmourn"
        iconSvgUri={null}
        releasedAt="2026-09-01"
        ownedFingerprint=""
        artGeneration={0}
        cells={placeCells([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], [])}
        prices={[]}
        newestAsOf={null}
        baseSetSize={2}
        staleAsOf={null}
      />,
    );
    pickRarity("Rare");
    expect(screen.getAllByRole("button", { name: /not in your collection/ })).toHaveLength(1);

    // Back to a genuinely different URL. (Setting it to the same string would not be a
    // navigation at all: `replaceState` never changes what `useSearchParams` reports, so
    // an unchanged query string is exactly the case the override must survive.)
    search = "m=1";
    rerender(
      <SetGridView
        code="dsk"
        name="Duskmourn"
        iconSvgUri={null}
        releasedAt="2026-09-01"
        ownedFingerprint=""
        artGeneration={0}
        cells={placeCells([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], [])}
        prices={[]}
        newestAsOf={null}
        baseSetSize={2}
        staleAsOf={null}
      />,
    );
    expect(screen.getAllByRole("button", { name: /not in your collection/ })).toHaveLength(2);
  });
});

describe("SetGridView — the open modal follows the grid", () => {
  it("hands the provider a fresh sibling list when the filters change", () => {
    openOracleId = "o-1";
    search = "m=1";
    view([p("1"), p("2")], []);
    expect(setSiblings).toHaveBeenCalledWith(["o-1", "o-2"]);
  });

  it("closes a card the grid no longer draws rather than stranding it", () => {
    // Prev/Next would otherwise page through cells that are not on the page.
    openOracleId = "o-gone";
    view([p("1"), p("2")], []);
    expect(closeCard).toHaveBeenCalled();
  });

  it("leaves the modal alone when nothing is open", () => {
    openOracleId = null;
    view([p("1"), p("2")], []);
    expect(setSiblings).not.toHaveBeenCalled();
    expect(closeCard).not.toHaveBeenCalled();
  });
});

describe("SetGridView — a pick that settles after the modal closes", () => {
  it("rechecks when the provider reports the write, not only when the modal shuts", () => {
    // revalidatePath does not refresh a mounted client route and same-tab focus never
    // fires, so a reader who closes the modal before the action returns would otherwise
    // be left on a stale grid with nothing saying so.
    const props = {
      code: "dsk", name: "Duskmourn", iconSvgUri: null, releasedAt: "2026-09-01",
      ownedFingerprint: "", cells: placeCells([p("1")], []), prices: [],
      newestAsOf: null, baseSetSize: 1, staleAsOf: null,
    };
    const { rerender } = render(<SetGridView {...props} artGeneration={0} />);
    const first = deltaProps.recheckKey;
    rerender(<SetGridView {...props} artGeneration={1} />);
    expect(deltaProps.recheckKey).not.toBe(first);
  });
});

// Addendum R2 §27 — findings 1 and 2 are one ruling and one constant. The grid gives its
// leftover width to the cells instead of to the right margin, which is the same sentence as
// "the row distributes" read from the other end.
describe("SetGridView — the grid declaration", () => {
  const renderGrid = () => view([p("1"), p("2"), p("3", { booster: false, isVariant: true })], ["1"]);
  const gridOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>("[data-set-grid]");

  it("lays one auto-fill track set with a 146px minimum", () => {
    const { container } = renderGrid();
    const grid = gridOf(container);
    expect(grid).not.toBeNull();
    expect(grid!.style.gridTemplateColumns).toBe("repeat(auto-fill, minmax(146px, 1fr))");
  });

  // One keyword decides the no-reflow constraint: `auto-fit` collapses empty tracks, so a
  // filter leaving three cells would stretch those three across the whole width.
  it("never uses auto-fit", () => {
    const { container } = renderGrid();
    expect(gridOf(container)!.style.gridTemplateColumns).not.toContain("auto-fit");
  });

  it("keeps one declaration across both sections", () => {
    const { container } = renderGrid();
    const declared = [...container.querySelectorAll<HTMLElement>("[data-set-grid]")]
      .map((g) => g.style.gridTemplateColumns);
    expect(new Set(declared).size).toBe(1);
  });
});

describe("SetGridView — a cell opens its own printing", () => {
  it("tells the modal which printing the cell is", () => {
    // A cell IS a printing. Opening by oracle id alone let the modal resolve to whichever
    // printing it liked — so clicking the dashed full-art #239 showed a different one.
    view([p("239")], []);
    fireEvent.click(screen.getByRole("button", { name: /not in your collection/ }));
    expect(openCard).toHaveBeenCalledWith(
      "o-239",
      ["o-239"],
      { setCode: "DSK", collectorNumber: "239", imageUri: null },
    );
  });

  it("names the printing in upper case, which is how printings compare", () => {
    view([p("42")], []);
    fireEvent.click(screen.getByRole("button", { name: /not in your collection/ }));
    const at = openCard.mock.calls[0][2];
    expect(at.setCode).toBe(at.setCode.toUpperCase());
  });
});

// The full-size art is the whole point of the payload change, and every fixture above
// leaves it undefined — so the assertions only ever proved the `null` path. A regression
// dropping `imageUri` from the callback would have passed while the modal fell back to the
// resolver's choice, which is the defect this branch exists to fix.
describe("SetGridView — the cell forwards its full-size art", () => {
  it("hands the modal the exact URL, not just the identity", () => {
    view([p("1", { imageUri: "https://cards.scryfall.io/normal/dsk-1.jpg" })], []);
    fireEvent.click(screen.getByRole("button", { name: /not in your collection/ }));
    expect(openCard).toHaveBeenCalledWith(
      "o-1",
      ["o-1"],
      {
        setCode: "DSK",
        collectorNumber: "1",
        imageUri: "https://cards.scryfall.io/normal/dsk-1.jpg",
      },
    );
  });
});

// Addendum R2 §28 — the rack conforms to the filter chassis. Every state from
// ADDENDUM-STATES §1-5, and what each must NOT do, which is half of what the file says.
describe("SetGridView — the rack, chassis-conformant", () => {
  const chips = () => document.querySelector("[data-set-chips]") as HTMLElement;
  const chipLabels = () =>
    [...chips().querySelectorAll("span")]
      .filter((el) => el.querySelector("button"))
      .map((el) => el.textContent?.replace("×", "").trim());

  // ——— 1 · Rest ———
  it("prints the rest line rather than collapsing row 2", () => {
    view([p("1"), p("2")], ["1"]);
    expect(chips()).toBeInTheDocument();
    expect(screen.getByText("No filters on")).toBeInTheDocument();
  });

  it("offers no Clear at rest", () => {
    view([p("1"), p("2")], ["1"]);
    expect(screen.queryByRole("button", { name: /Clear all filters/ })).toBeNull();
  });

  // The whole reason the line exists: this bar is inside a sticky head, and a height that
  // changed with the filter state would move the grid under the reader's thumb.
  it("reserves the chip row's height whether or not a chip is in it", () => {
    view([p("1"), p("2")], ["1"]);
    expect(chips().style.minHeight).toBe("22px");
  });

  // ——— 2 · One filter on ———
  it("shows the chip but no Clear at one filter, where two shorter routes already exist", () => {
    search = "r=rare";
    view([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], []);
    expect(chipLabels()).toEqual(["Rare"]);
    expect(screen.queryByRole("button", { name: /Clear all filters/ })).toBeNull();
  });

  // ——— 3 · Several filters on ———
  it("orders chips by dimension, never by click order", () => {
    search = "m=1&r=rare&c=W";
    view([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], []);
    expect(chipLabels()).toEqual(["White", "Rare", "Missing only"]);
  });

  it("collapses colour past one pip rather than drawing a chip per hue", () => {
    search = "c=W,U,B";
    view([p("1"), p("2")], []);
    expect(chipLabels()).toContain("3 colours");
    expect(chipLabels()).not.toContain("White");
  });

  it("offers Clear all filters past one active control", () => {
    search = "m=1&c=W";
    view([p("1"), p("2")], []);
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
  });

  it("clears every dimension from that one control", () => {
    search = "m=1&c=W";
    view([p("1"), p("2")], []);
    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  it("removes one dimension from a chip's own ×", () => {
    search = "m=1&c=W";
    view([p("1"), p("2")], []);
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: White" }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?m=1");
  });

  // ——— 4 · The rarity panel ———
  it("mounts rarity as a trigger, not four letter buttons", () => {
    stubDesktop(true);
    view([p("1"), p("2")], []);
    expect(screen.getByRole("button", { name: /Filter by rarity/ })).toBeInTheDocument();
    for (const letter of ["C", "U", "R", "M"]) {
      expect(screen.queryByRole("button", { name: letter })).toBeNull();
    }
  });

  it("carries no search field: four values have nothing to search", () => {
    stubDesktop(true);
    view([p("1"), p("2")], []);
    fireEvent.click(screen.getByRole("button", { name: /Filter by rarity/ }));
    const boxes = screen.queryAllByRole("searchbox");
    expect(boxes.filter((b) => /rarit/i.test(b.getAttribute("aria-label") ?? ""))).toHaveLength(0);
  });

  // Single-select, and picking the lit value is how `all` is reached — the panel's own
  // `single` mode has no off state, so the rule is the caller's.
  it("replaces the lit value rather than unioning, and clears when picked again", () => {
    stubDesktop(true);
    search = "r=rare";
    view([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], []);
    pickRarity("Rare");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  it("counts its rows off the same filtered computation the result line reads", () => {
    stubDesktop(true);
    // One rare and two commons; with no other filter on, the rows say so.
    view([
      p("1", { rarity: "rare" }), p("2", { rarity: "common" }), p("3", { rarity: "common" }),
    ], []);
    fireEvent.click(screen.getByRole("button", { name: /Filter by rarity/ }));
    expect(screen.getByRole("option", { name: /^rare, 1 cell/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /^common, 2 cells/ })).toBeInTheDocument();
  });

  // ——— The pips ———
  it("mounts the chassis pips rather than a dimmed token square", () => {
    const { container } = view([p("1"), p("2")], []);
    const pips = [...container.querySelectorAll<HTMLElement>('[role="switch"]')];
    expect(pips.length).toBeGreaterThanOrEqual(5);
    // An unlit pip carries no opacity, no tint and no rim — the dimming is exactly what
    // the shipped control got wrong, at 1.38:1.
    for (const pip of pips) {
      expect(pip.style.opacity).toBe("");
      expect(pip.className).not.toMatch(/opacity-/);
    }
  });

  it("names each pip by its colour, never by its letter", () => {
    view([p("1"), p("2")], []);
    expect(screen.getAllByRole("switch", { name: "White" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("switch", { name: "Filter by W" })).toBeNull();
  });
});

// Review round 1 on the rack: three states that are reachable and were not covered.
describe("SetGridView — the rack's edges", () => {
  it("keeps the sheet's Clear live for a stale m=1 on a complete set", () => {
    // At 100% missing-only is dropped from what is APPLIED, but the parameter can still be
    // in the URL — a reader completes a set with it set. Gating Clear on the applied value
    // left it with no way out of the UI.
    search = "m=1";
    view([p("1")], ["1"]);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const clear = screen.getAllByRole("button", { name: /Clear all filters/ })
      .find((b) => b.closest('[role="dialog"]'));
    expect(clear).toBeDefined();
    expect(clear).not.toBeDisabled();
    fireEvent.click(clear as HTMLElement);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  // The desktop trigger is mounted on the breakpoint rather than CSS-hidden, so it cannot
  // keep an open state across a resize, hide its mobile dialog inside a display:none
  // ancestor, or hold focus in a panel nobody can see.
  it("mounts the rarity trigger only at desktop", () => {
    stubDesktop(true);
    view([p("1"), p("2")], []);
    expect(screen.getByRole("button", { name: /Filter by rarity/ })).toBeInTheDocument();
  });

  it("does not mount it at phone, where the sheet's chip group is the control", () => {
    stubDesktop(false);
    view([p("1"), p("2")], []);
    expect(screen.queryByRole("button", { name: /Filter by rarity/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(screen.getByRole("button", { name: "Rare" })).toBeInTheDocument();
  });
});

// The control is single-select, so it must SAY single-select. `multi` promised assistive
// technology a second value the caller silently discards.
describe("SetGridView — the rarity panel's semantics", () => {
  it("never announces itself as multi-selectable", () => {
    stubDesktop(true);
    view([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], []);
    fireEvent.click(screen.getByRole("button", { name: /Filter by rarity/ }));
    const list = screen.getByRole("listbox", { name: "Filter by rarity" });
    expect(list).not.toHaveAttribute("aria-multiselectable", "true");
  });

  it("still reaches `all` by picking the lit value again", () => {
    stubDesktop(true);
    search = "r=rare";
    view([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], []);
    pickRarity("Rare");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });
});

// Review round 2 on the rack.
describe("SetGridView — the badge counts dimensions", () => {
  it("counts a multi-pip colour selection once", () => {
    search = "c=W,U";
    view([p("1"), p("2")], []);
    expect(screen.getByRole("button", { name: /1 filter on/ })).toBeInTheDocument();
  });

  it("counts colour and rarity as two", () => {
    search = "c=W,U,B&r=rare";
    view([p("1", { rarity: "rare" }), p("2")], []);
    expect(screen.getByRole("button", { name: /2 filters on/ })).toBeInTheDocument();
  });

  // The breakpoint effect moves focus here when the phone sheet unmounts under a resize.
  it("keeps the desktop rack a focus target", () => {
    const { container } = view([p("1"), p("2")], []);
    const rack = container.querySelector('[class*="md:flex"][tabindex="-1"]');
    expect(rack).not.toBeNull();
  });
});

// Review round 3 on the rack. A filter that is SET but not APPLIED draws no chip, so the
// chip line alone would offer no way out of it — which happens exactly once, and is the
// desktop half of the same defect the sheet's Clear had.
describe("SetGridView — a stale filter a complete set does not apply", () => {
  it("keeps Clear on the chip line with m=1 on a completed set", () => {
    search = "m=1";
    view([p("1")], ["1"]);
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
  });

  it("removes the parameter when it is used", () => {
    search = "m=1";
    view([p("1")], ["1"]);
    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  it("still shows no Clear when nothing at all is on", () => {
    view([p("1")], ["1"]);
    expect(screen.queryByRole("button", { name: "Clear all filters" })).toBeNull();
  });
});

// Review round 4: the chip row promised "the clipped item is a chip and never Clear", and
// nothing delivered it — Clear was the last item inside the scrolling strip, and a phone's
// overflow starts at the LEADING edge, so the only way out of three filters sat off-screen.
describe("SetGridView — Clear is not inside the scrolling strip", () => {
  it("scrolls the chips and leaves Clear outside that scroll", () => {
    search = "m=1&r=rare&c=W";
    const { container } = view([p("1", { rarity: "rare" }), p("2")], []);
    const row = container.querySelector("[data-set-chips]") as HTMLElement;
    const scroller = row.querySelector(".overflow-x-auto") as HTMLElement;
    const clear = screen.getByRole("button", { name: "Clear all filters" });
    expect(scroller).not.toBeNull();
    expect(scroller.querySelectorAll("span > button").length).toBe(3);
    expect(scroller.contains(clear)).toBe(false);
    expect(row.contains(clear)).toBe(true);
  });
});

// The breakpoint effect treats `document.body` as stranded, which is correct after a
// crossing unmounts the focused control — and wrong on a fresh load, where the body holds
// focus because the reader has not touched anything yet.
describe("SetGridView — focus is not stolen on mount", () => {
  // The effect runs inside a `requestAnimationFrame`, so a test that does not flush one
  // asserts about a callback that never fired — it would pass with the guard removed.
  const flushFrame = () =>
    act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });

  it("leaves focus where it was when nothing crossed a breakpoint", async () => {
    stubDesktop(true);
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    view([p("1"), p("2")], []);
    await flushFrame();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it("leaves focus on the body rather than pulling it into the rack", async () => {
    stubDesktop(true);
    view([p("1"), p("2")], []);
    await flushFrame();
    expect(document.activeElement).toBe(document.body);
  });
});

// Review round 7.
describe("SetGridView — the last route out of a stale m=1", () => {
  // `?m=1&c=W` on a complete set draws a White chip, so an "empty chip line" test was false
  // and the hidden `m` had neither a toggle nor a Clear.
  it("keeps Clear beside a chip when m=1 is still set on a completed set", () => {
    search = "m=1&c=W";
    view([p("1")], ["1"]);
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
  });

  it("removes both from it", () => {
    search = "m=1&c=W";
    view([p("1")], ["1"]);
    fireEvent.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  // The accessible name has to contain the visible label, or a voice-control user cannot
  // say the words they can see.
  it("names the control with the words it shows", () => {
    search = "m=1&c=W";
    view([p("1")], ["1"]);
    const clear = screen.getByRole("button", { name: "Clear all filters" });
    expect(clear.textContent).toContain("Clear all filters");
  });
});

// The chassis contract puts the panel's desktop rows at 44px; `FilterPanel` defaults to 40,
// and `/decks` passes the 44 for the same reason.
describe("SetGridView — the rarity panel's rows", () => {
  it("asks for the chassis's 44px rows rather than the panel's default", () => {
    stubDesktop(true);
    view([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], []);
    fireEvent.click(screen.getByRole("button", { name: /Filter by rarity/ }));
    const row = screen.getAllByRole("option")[0] as HTMLElement;
    expect(row.style.minHeight).toBe("44px");
  });
});

// `document.body` alone is not evidence a control was unmounted. A reader who clicked page
// whitespace and then resized would have had focus yanked into a rack they never touched.
describe("SetGridView — focus is rescued only when it was in the rack", () => {
  const flushFrame = () =>
    act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });

  it("leaves focus alone across a resize the reader was not inside the rack for", async () => {
    stubDesktop(false);
    const { rerender, container } = render(
      <SetGridView
        code="dsk" name="Duskmourn" iconSvgUri={null} releasedAt="2026-09-01"
        ownedFingerprint="" artGeneration={0}
        cells={placeCells([p("1"), p("2")], [])} prices={[]} newestAsOf={null}
        baseSetSize={2} staleAsOf={null}
      />,
    );
    // Focus is on the body for an ordinary reason: nothing in the rack was ever touched.
    expect(document.activeElement).toBe(document.body);

    stubDesktop(true);
    rerender(
      <SetGridView
        code="dsk" name="Duskmourn" iconSvgUri={null} releasedAt="2026-09-01"
        ownedFingerprint="" artGeneration={0}
        cells={placeCells([p("1"), p("2")], [])} prices={[]} newestAsOf={null}
        baseSetSize={2} staleAsOf={null}
      />,
    );
    await flushFrame();
    expect(document.activeElement).toBe(document.body);
    expect(container).toBeTruthy();
  });
});

// "Three rows, always all three" — made true rather than argued. The sentence is absent on
// an unindexed set (there is no count to state), but its box is not, so a set that becomes
// indexed under a visible sticky head does not grow the head by a line.
describe("SetGridView — row 3's box is unconditional", () => {
  it("reserves the result row even with no checklist to count", () => {
    const { container } = view([p("1", { booster: null, isVariant: true })], []);
    const row = container.querySelector("[data-set-result]") as HTMLElement;
    expect(row).not.toBeNull();
    // The margin is on the BOX, not on the paragraph inside it — or a wrapped line would
    // need 8 + 2×16 = 40 against a 32px reserve and the head would grow after all.
    expect(row.className).toMatch(/mt-\[8px\] min-h-\[32px\] md:min-h-\[16px\]/);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("and holds the same box once there is one", () => {
    const { container } = view([p("1"), p("2")], ["1"]);
    const row = container.querySelector("[data-set-result]") as HTMLElement;
    expect(row.className).toMatch(/mt-\[8px\] min-h-\[32px\] md:min-h-\[16px\]/);
    const line = screen.getAllByRole("status")[0];
    expect(line.className).not.toMatch(/mt-\[8px\]/);
  });
});

// §28 drew a 34px chip target as a granted exception, and its own open item 3 defers the
// chip line's pixels to the chassis package — which ships 44 (`filter-chassis.tsx`,
// `collection/chip-row.tsx`). The anchoring to the × is what makes 44 safe between chips
// sitting 6px apart, and it is what the chassis relies on too.
describe("SetGridView — chip targets follow the chassis", () => {
  it("gives the chip's × and the Clear control a 44px hit area", () => {
    search = "m=1&r=rare&c=W";
    const { container } = view([p("1", { rarity: "rare" }), p("2")], []);
    const row = container.querySelector("[data-set-chips]") as HTMLElement;
    for (const button of row.querySelectorAll("button")) {
      expect(button.className).toMatch(/after:h-\[44px\]/);
      expect(button.className).not.toMatch(/after:h-\[34px\]/);
    }
  });
});

// `FilterPanel` composes the trigger's accessible name from the option's label, while
// `triggerOne` only styles the visible text — so lowercasing the copy alone announced
// `Uncommon` under a button reading `Rarity · uncommon`. Label-in-name, WCAG 2.5.3.
describe("SetGridView — the rarity trigger says what it shows", () => {
  it("announces the value in the case the button prints it", () => {
    stubDesktop(true);
    search = "r=uncommon";
    view([p("1", { rarity: "uncommon" }), p("2", { rarity: "rare" })], []);
    const trigger = screen.getByRole("button", { name: /Filter by rarity/ });
    expect(trigger.textContent).toContain("Rarity · uncommon");
    expect(trigger.getAttribute("aria-label")).toContain("uncommon");
    expect(trigger.getAttribute("aria-label")).not.toContain("Uncommon");
  });

  // The sheet's chips stay Title Case: §28 amendment 3 — a chip is a control, and the
  // trigger's value is a caption in the register of `042 · uncommon`.
  it("keeps the phone sheet's chips in Title Case", () => {
    stubDesktop(false);
    view([p("1", { rarity: "rare" }), p("2")], []);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(screen.getByRole("button", { name: "Rare" })).toBeInTheDocument();
  });
});

// Label-in-name at REST too: the button reads `Rarity · all`, so its accessible name has to
// carry that. The active state already did, by carrying its value.
describe("SetGridView — the rarity trigger at rest", () => {
  it("announces the value it shows when nothing is selected", () => {
    stubDesktop(true);
    view([p("1", { rarity: "rare" }), p("2")], []);
    const trigger = screen.getByRole("button", { name: /Filter by rarity, all/ });
    expect(trigger.textContent).toContain("Rarity · all");
  });
});

// `overflow-x-auto` makes the OTHER axis scroll too, so a 44px pseudo target centred in a
// 22px row is clipped to 22 and the chip keeps only its small × box. The scroller needs a
// band for the overlay to live in — at phone, where it scrolls; desktop wraps and does not.
describe("SetGridView — the phone chip scroller has room for its targets", () => {
  it("gives the scrolling strip a 44px band", () => {
    search = "m=1&r=rare&c=W";
    const { container } = view([p("1", { rarity: "rare" }), p("2")], []);
    const scroller = container.querySelector("[data-set-chips] .overflow-x-auto") as HTMLElement;
    expect(scroller.className).toMatch(/h-\[44px\] md:h-auto/);
  });
});
