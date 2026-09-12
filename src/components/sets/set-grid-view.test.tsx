import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const replaceState = vi.spyOn(window.history, "replaceState");

beforeEach(() => {
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
    search = "c=W&m=1";
    view([p("1"), p("2")], ["1"]);
    expect(screen.getByRole("button", { name: /2 filters on/ })).toBeInTheDocument();
  });

  it("keeps the cost strip when the filters match nothing", () => {
    // The handoff draws a zero figure rather than a strip that disappears.
    search = "c=U";
    view([p("1", { colorIdentity: ["W"] })], []);
    expect(screen.getByText("Cost to complete")).toBeInTheDocument();
    expect(screen.queryByText(/Send \d+ to ManaPool/)).toBeNull();
  });

  it("treats rarity as single select rather than a union", () => {
    search = "r=common";
    view([p("1", { rarity: "common" }), p("2", { rarity: "rare" })], []);
    fireEvent.click(screen.getByRole("button", { name: "Rare" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Rare" }));
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
