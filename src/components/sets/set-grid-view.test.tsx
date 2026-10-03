import { cloneElement, useLayoutEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { NARROW_HIDE, SetGridView } from "./set-grid-view";
import { placeCells, type SetPrinting } from "../../lib/sets/completion";
import { setPageCopy } from "../../lib/copy/set-collections";

const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

// The delta strip polls a server action on focus; it is covered by its own file. The mock
// still has to be able to FIRE, because §31 rules that the collapse must not hide its
// message — a mock that could only be silent would make that untestable and any assertion
// about it vacuous.
const deltaProps: { recheckKey?: string; firing?: boolean } = {};
vi.mock("./delta-strip", () => ({
  DeltaStrip: ({ recheckKey, onFiring }: {
    recheckKey?: string; onFiring?: (f: boolean) => void;
  }) => {
    deltaProps.recheckKey = recheckKey;
    const firing = deltaProps.firing === true;
    // The CALLBACK, not the whole props object: `props` is a new reference every render, so
    // depending on it reported false and then true again on every parent update.
    useLayoutEffect(() => {
      onFiring?.(firing);
      return () => onFiring?.(false);
    }, [firing, onFiring]);
    return firing ? <div>a card arrived</div> : null;
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

function view(
  printings: SetPrinting[],
  ownedNumbers: string[] = [],
  name = "Duskmourn",
  // A supported catalog state, and the only prop a case here needs to vary beyond the two
  // above — passed rather than duplicating the whole render for one null.
  releasedAt: string | null = "2026-09-01",
) {
  // The address bar holds what the mocked search params say, on this page's own path, as it does
  // in the app: `mirrorUrl` skips a write equal to the live URL or naming another path, so a bar
  // left at another test's URL would turn this page's real writes into skipped ones. `pushState`,
  // so the spy on `replaceState` sees only the component's own writes.
  window.history.pushState(null, "", `/collection/sets/dsk${search ? `?${search}` : ""}`);
  const holdings = ownedNumbers.map((n) => ({
    oracleId: `o-${n}`, collectorNumber: n, finish: "nonfoil" as const,
  }));
  // A re-render of the SAME tree is returned as a FUNCTION, not as the element: React bails
  // out of a subtree re-rendered with an identical element reference, so passing the stored
  // element back to `rerender` silently does nothing and any assertion after it is vacuous.
  const el = (
    <SetGridView
      code="dsk"
      name={name}
      iconSvgUri={null}
      releasedAt={releasedAt}
      ownedFingerprint=""
      artGeneration={0}
      cells={placeCells(printings, holdings)}
      prices={[]}
      newestAsOf={null}
      baseSetSize={printings.filter((x) => x.booster === true).length || null}
      staleAsOf={null}
    />
  );
  return Object.assign(render(el), { again: () => cloneElement(el) });
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
 * Rarity is a trigger and a panel since addendum R2 §28, not four letter buttons, and
 * multi-select since H13. So a test that wants a rarity opens the trigger first. A multi
 * panel stays open after a pick, so call this once per test.
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
    // hand: routing is the request being avoided. `own=missing`, never `m=1`: H10 took
    // `m` for the colour modifier.
    view([p("1"), p("2")], ["1"]);
    fireEvent.click(screen.getByRole("button", { name: /Showing every card/ }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?own=missing");
  });

  it("serialises a cleared filter as an absence rather than an empty parameter", () => {
    // The legacy `m=1` reads as missing-only, and leaves the URL with it.
    search = "m=1";
    view([p("1"), p("2")], ["1"]);
    fireEvent.click(screen.getByRole("button", { name: /Showing only cards/ }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  it("reads own=missing as missing-only", () => {
    search = "own=missing";
    view([p("1"), p("2")], ["1"]);
    expect(screen.getByRole("button", { name: /Showing only cards/ })).toBeInTheDocument();
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
      "o-1", ["o-1", "o-2"], { setCode: "DSK", collectorNumber: "1", imageUri: null, backImageUri: null, scryfallId: "s-1" },
    );
  });

  it("pages Prev/Next through the cells in the order they are on screen", () => {
    search = "m=1";
    view([p("1"), p("2"), p("3")], ["2"]);
    fireEvent.click(screen.getAllByRole("button", { name: /not in your collection/ })[0]);
    // #2 is owned and hidden by missing-only, so it is not a sibling to page to.
    expect(openCard).toHaveBeenCalledWith(
      "o-1", ["o-1", "o-3"], { setCode: "DSK", collectorNumber: "1", imageUri: null, backImageUri: null, scryfallId: "s-1" },
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

  // H13: multi-select, as `/collection`'s Type is.
  it("adds a second rarity rather than replacing the first", () => {
    stubDesktop(true);
    search = "r=common";
    view([p("1", { rarity: "common" }), p("2", { rarity: "rare" })], []);
    pickRarity("Rare");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?r=common%2Crare");
    expect(screen.getAllByRole("button", { name: /not in your collection/ })).toHaveLength(2);
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
    openOracleId = "o-2";
    const r = view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    expect(closeCard).not.toHaveBeenCalled();
    search = "q=plains";
    r.rerender(r.again());
    expect(closeCard).toHaveBeenCalled();
  });

  // A card opened from inside another surface is off the grid by nature: a partner named in Find
  // a deck's reason line, stacked over the picker. The grid has not moved, so nothing closes it.
  it("leaves a card opened from elsewhere open while the grid stands still", () => {
    openOracleId = "o-gone";
    const r = view([p("1"), p("2")], []);
    r.rerender(r.again());
    expect(closeCard).not.toHaveBeenCalled();
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
      { setCode: "DSK", collectorNumber: "239", imageUri: null, backImageUri: null, scryfallId: "s-239" },
    );
  });

  // Both faces or neither. A cell opened at a printing the reader does not own is injected
  // into the modal as a row of its own, and a row with no back falls to the oracle-level
  // image — this printing's front against another printing's back.
  it("hands over the printing's back face with its front", () => {
    view([p("7", {
      imageUri: "https://cards.scryfall.io/normal/dsk-7.jpg",
      backImageUri: "https://cards.scryfall.io/normal/dsk-7-back.jpg",
    })], []);
    fireEvent.click(screen.getByRole("button", { name: /not in your collection/ }));
    expect(openCard.mock.calls[0][2]).toMatchObject({
      imageUri: "https://cards.scryfall.io/normal/dsk-7.jpg",
      backImageUri: "https://cards.scryfall.io/normal/dsk-7-back.jpg",
    });
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
        backImageUri: null,
        // The cell IS this catalog row, so its exact id travels with the open —
        // two printings can share a (set, collector number) pair.
        scryfallId: "s-1",
      },
    );
  });
});

// Addendum R2 §28 — the rack conforms to the filter chassis. Every state from
// ADDENDUM-STATES §1-5, and what each must NOT do, which is half of what the file says.
describe("SetGridView — the rack, chassis-conformant", () => {
  const chips = () => document.querySelector("[data-set-chips]") as HTMLElement;
  // The visible text: a collapsed colour chip splits its count (aria-hidden) from its
  // spoken names (sr-only), so read the aria-hidden half where one exists.
  const chipLabels = () =>
    [...chips().querySelectorAll("span")]
      .filter((el) => el.querySelector("button"))
      .map((el) => {
        // The aria-hidden half that has TEXT: the swatch strip is aria-hidden too, and it
        // comes first.
        const shown = [...el.querySelectorAll('[aria-hidden="true"]')]
          .find((n) => (n.textContent ?? "").trim() !== "");
        return (shown ? shown.textContent : el.textContent?.replace("×", ""))?.trim();
      });

  // ——— 1 · Rest ———
  it("prints the rest line rather than collapsing row 2", () => {
    view([p("1"), p("2")], ["1"]);
    expect(chips()).toBeInTheDocument();
    expect(screen.getByText("No filters on")).toBeInTheDocument();
  });

  // H13: the chassis's Clear, always drawn and inert when nothing is on.
  it("draws Clear inert at rest, at the line's end", () => {
    view([p("1"), p("2")], ["1"]);
    const clear = screen.getByRole("button", { name: /Clear all filters/ });
    expect(clear).toBeDisabled();
    expect(clear.className).toMatch(/ml-auto/);
    expect(clear.className).toMatch(/text-\[color:var\(--fg-locked\)\]/);
  });

  // The whole reason the line exists: this bar is inside a sticky head, and a height that
  // changed with the filter state would move the grid under the reader's thumb.
  it("reserves the chip row's height whether or not a chip is in it", () => {
    view([p("1"), p("2")], ["1"]);
    expect(chips().style.minHeight).toBe("22px");
  });

  // ——— 2 · One filter on ———
  it("shows the chip and a live Clear at one filter", () => {
    search = "r=rare";
    view([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], []);
    expect(chipLabels()).toEqual(["Rare"]);
    expect(screen.getByRole("button", { name: /Clear all filters/ })).toBeEnabled();
  });

  // ——— 3 · Several filters on ———
  it("orders chips by dimension, never by click order", () => {
    search = "m=1&r=rare&c=W";
    view([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], []);
    expect(chipLabels()).toEqual(["White", "Rare", "Missing only"]);
  });

  // H10 and H13: the modifier's own chip after the pips, and one chip per rarity — with
  // missing-only beside an Exactly, which one `m` key could not have carried.
  it("chips Exactly, each rarity and missing-only in dimension order", () => {
    search = "own=missing&r=mythic,rare&m=exact&c=W";
    view([p("1", { rarity: "rare" }), p("2", { rarity: "mythic" })], []);
    expect(chipLabels()).toEqual(["White", "Exactly", "Rare", "Mythic", "Missing only"]);
  });

  it("removes one rarity from its own chip and keeps the other", () => {
    search = "r=rare,mythic";
    view([p("1", { rarity: "rare" }), p("2", { rarity: "mythic" })], []);
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: Rare" }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?r=mythic");
  });

  it("drops Exactly with the colours, as the commander rack's chip does", () => {
    search = "c=W&m=exact";
    view([p("1"), p("2")], []);
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: White" }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  it("collapses colour past one pip rather than drawing a chip per hue", () => {
    search = "c=W,U,B";
    view([p("1"), p("2")], []);
    expect(chipLabels()).toContain("3 colors");
    expect(chipLabels()).not.toContain("White");
  });

  it("offers Clear all filters past one active control", () => {
    search = "m=1&c=W";
    view([p("1"), p("2")], []);
    expect(screen.getByRole("button", { name: /^Clear all filters/ })).toBeInTheDocument();
  });

  it("clears every dimension from that one control", () => {
    search = "m=1&c=W";
    view([p("1"), p("2")], []);
    fireEvent.click(screen.getByRole("button", { name: /^Clear all filters/ }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  it("removes one dimension from a chip's own ×", () => {
    // The legacy `m=1` is rewritten as `own=missing` on the way past.
    search = "m=1&c=W";
    view([p("1"), p("2")], []);
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: White" }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?own=missing");
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

  // A lit value toggles off, which is how `all` is reached.
  it("clears a lit value when it is picked again", () => {
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
    expect(screen.getByRole("option", { name: /^Rare, 1 cell/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /^Common, 2 cells/ })).toBeInTheDocument();
  });

  // ——— The pips ———
  it("mounts the chassis pips rather than a dimmed token square", () => {
    stubDesktop(true);
    // One card of every hue, so no pip is UNAVAILABLE: the chassis dims those at .42 by
    // its own contract, and this test is about the old unlit-but-available dimming that
    // measured 1.49:1.
    const { container } = view(
      ["W", "U", "B", "R", "G"].map((c, i) => p(String(i + 1), { colorIdentity: [c] })),
      [],
    );
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
    // Stubbed deliberately: JSDOM applies no CSS, so `hidden md:flex` hides nothing and
    // this would pass at either width by accident rather than by testing the desktop rack.
    stubDesktop(true);
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
    expect(screen.getByRole("switch", { name: /^Rare/ })).toBeInTheDocument();
  });
});

// H13: the control is multi-select, so it SAYS multi-select, as Type's panel does.
describe("SetGridView — the rarity panel's semantics", () => {
  it("announces itself as multi-selectable", () => {
    stubDesktop(true);
    view([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], []);
    fireEvent.click(screen.getByRole("button", { name: /Filter by rarity/ }));
    const list = screen.getByRole("listbox", { name: "Filter by rarity" });
    expect(list).toHaveAttribute("aria-multiselectable", "true");
  });

  it("counts on its trigger, as Type's does", () => {
    stubDesktop(true);
    search = "r=rare,common";
    view([p("1", { rarity: "rare" }), p("2", { rarity: "common" })], []);
    expect(screen.getByRole("button", { name: /Filter by rarity/ }).textContent)
      .toContain("Rarities 2");
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

  it("counts two rarities as one dimension", () => {
    search = "r=rare,common";
    view([p("1", { rarity: "rare" }), p("2")], []);
    expect(screen.getByRole("button", { name: /1 filter on/ })).toBeInTheDocument();
  });

});

// Review round 3 on the rack. A filter that is SET but not APPLIED draws no chip, so the
// chip line alone would offer no way out of it — which happens exactly once, and is the
// desktop half of the same defect the sheet's Clear had.
describe("SetGridView — a stale filter a complete set does not apply", () => {
  it("keeps Clear on the chip line with m=1 on a completed set", () => {
    search = "m=1";
    view([p("1")], ["1"]);
    expect(screen.getByRole("button", { name: /^Clear all filters/ })).toBeInTheDocument();
  });

  it("removes the parameter when it is used", () => {
    search = "m=1";
    view([p("1")], ["1"]);
    fireEvent.click(screen.getByRole("button", { name: /^Clear all filters/ }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  it("leaves Clear inert when nothing at all is on", () => {
    view([p("1")], ["1"]);
    expect(screen.getByRole("button", { name: /^Clear all filters/ })).toBeDisabled();
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
    const clear = screen.getByRole("button", { name: /^Clear all filters/ });
    expect(scroller).not.toBeNull();
    expect(scroller.querySelectorAll("span > button").length).toBe(3);
    expect(scroller.contains(clear)).toBe(false);
    expect(row.contains(clear)).toBe(true);
  });
});

// Review round 7.
describe("SetGridView — the last route out of a stale m=1", () => {
  // `?m=1&c=W` on a complete set draws a White chip, so an "empty chip line" test was false
  // and the hidden `m` had neither a toggle nor a Clear.
  it("keeps Clear beside a chip when m=1 is still set on a completed set", () => {
    search = "m=1&c=W";
    view([p("1")], ["1"]);
    expect(screen.getByRole("button", { name: /^Clear all filters/ })).toBeInTheDocument();
  });

  it("removes both from it", () => {
    search = "m=1&c=W";
    view([p("1")], ["1"]);
    fireEvent.click(screen.getByRole("button", { name: /^Clear all filters/ }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  // The accessible name has to contain the visible label, or a voice-control user cannot
  // say the words they can see.
  it("names the control with the words it shows", () => {
    search = "m=1&c=W";
    view([p("1")], ["1"]);
    const clear = screen.getByRole("button", { name: /^Clear all filters/ });
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

// Addendum R2 §29 — the name search is the chassis's field slot, and it leads.
describe("SetGridView — the name search", () => {
  const field = () => screen.getByRole("searchbox", { name: "Search cards in Duskmourn" });

  it("leads the control row and names the set it searches", () => {
    stubDesktop(true);
    view([p("1"), p("2")], []);
    expect(field()).toBeInTheDocument();
    // The set is in the accessible name and not in the placeholder: the index's own field
    // says "Find any set" in the same skin one tap away.
    expect(field()).toHaveAttribute("placeholder", "Find a card in this set");
  });

  it("is the only child of the row that shrinks", () => {
    const { container } = view([p("1"), p("2")], []);
    const row = field().closest("[class*='flex-nowrap']") as HTMLElement;
    expect(row).not.toBeNull();
    const growing = [...row.children].filter((c) => !/shrink-0/.test(c.className));
    expect(growing).toHaveLength(1);
    expect(growing[0].contains(field())).toBe(true);
    // And it does not shrink past the chassis's floor. `min-w-0` alone let it reach zero on
    // a narrower phone, which the row's 173px-at-390 arithmetic assumes it cannot.
    expect(growing[0].className).toMatch(/min-w-\[132px\]/);
    expect(container).toBeTruthy();
  });

  it("filters the grid without reaching the server", () => {
    vi.useFakeTimers();
    try {
      view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
      fireEvent.change(field(), { target: { value: "plains" } });
      act(() => void vi.advanceTimersByTime(150));
      expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?q=plains");
      expect(replace).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  // §29: 150ms, the shipped card-search window. Applying per keystroke recomputed both
  // sections, the rarity counts, the cost strip and the live result line once per
  // character — and re-announced the line each time.
  it("waits 150ms before applying, and keeps the box responsive meanwhile", () => {
    vi.useFakeTimers();
    try {
      view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
      fireEvent.change(field(), { target: { value: "pla" } });
      // The text is in the box immediately…
      expect((field() as HTMLInputElement).value).toBe("pla");
      // …and nothing has been applied yet.
      act(() => void vi.advanceTimersByTime(149));
      expect(replaceState).not.toHaveBeenCalled();
      expect(screen.getAllByRole("button", { name: /Mountain/ }).length).toBeGreaterThan(0);
      act(() => void vi.advanceTimersByTime(1));
      expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?q=pla");
      expect(screen.queryByRole("button", { name: /Mountain/ })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("applies once for a burst of keystrokes, not once per character", () => {
    vi.useFakeTimers();
    try {
      view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
      for (const v of ["p", "pl", "pla", "plai", "plain", "plains"]) {
        fireEvent.change(field(), { target: { value: v } });
        act(() => void vi.advanceTimersByTime(40));
      }
      expect(replaceState).not.toHaveBeenCalled();
      act(() => void vi.advanceTimersByTime(150));
      expect(replaceState).toHaveBeenCalledTimes(1);
      expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?q=plains");
    } finally {
      vi.useRealTimers();
    }
  });

  // A pending keystroke landing after the clear would put the query straight back.
  it("drops a pending keystroke when the field is cleared", () => {
    vi.useFakeTimers();
    try {
      view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
      fireEvent.change(field(), { target: { value: "plains" } });
      act(() => void vi.advanceTimersByTime(50));
      fireEvent.click(screen.getByRole("button", { name: "Clear the search" }));
      act(() => void vi.advanceTimersByTime(300));
      expect((field() as HTMLInputElement).value).toBe("");
      // The keystroke never landed, so the bar is still bare and nothing wrote the dropped query.
      expect(window.location.pathname + window.location.search).toBe("/collection/sets/dsk");
      expect(replaceState).not.toHaveBeenCalledWith(null, "", "/collection/sets/dsk?q=plains");
    } finally {
      vi.useRealTimers();
    }
  });

  // The × belongs to the text in the box. Reading the APPLIED query left it hidden for the
  // 150ms after the first character.
  it("shows the field's clear as soon as a character is typed", () => {
    vi.useFakeTimers();
    try {
      view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
      fireEvent.change(field(), { target: { value: "p" } });
      const clear = screen.getByLabelText("Clear the search", { selector: "button" });
      expect(clear).toBeVisible();
      expect(clear).toHaveAttribute("tabindex", "0");
    } finally {
      vi.useRealTimers();
    }
  });

  // `Clear all filters` clears the query too, so the box has to follow — otherwise the text
  // stays visible over an unfiltered grid.
  it("empties the box when Clear all clears the query", () => {
    search = "q=plains&c=W";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    expect((field() as HTMLInputElement).value).toBe("plains");
    fireEvent.click(screen.getByRole("button", { name: /^Clear all filters/ }));
    expect((field() as HTMLInputElement).value).toBe("");
  });

  // Back/Forward gives a new URL and the render-time sync puts its query in the box — but a
  // timer armed before the navigation would write the OLD value 150ms later, undoing the
  // state the reader just navigated to.
  it("drops a pending keystroke when the URL changes underneath it", () => {
    vi.useFakeTimers();
    try {
      const r = view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
      fireEvent.change(field(), { target: { value: "plains" } });
      act(() => void vi.advanceTimersByTime(50));
      // A navigation: a different query arrives through the URL.
      search = "q=mountain";
      r.rerender(r.again());
      act(() => void vi.advanceTimersByTime(300));
      expect((field() as HTMLInputElement).value).toBe("mountain");
      // The stale keystroke never reaches the URL. Asserted on the ARGUMENT rather than the
      // call count: the page legitimately rewrites the URL on a navigation.
      expect(replaceState).not.toHaveBeenCalledWith(
        null, "", "/collection/sets/dsk?q=plains",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  // A `q` the parse throws away is still in the address bar, and nothing else removes it:
  // the grid is unfiltered, so `Clear all filters` does not render and the field's × is
  // inert. Without this it survives a reload and a share as a dead parameter.
  it("strips a query that folds to nothing from the URL", () => {
    search = "q=%20%20";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  it("leaves the URL alone when the query is real", () => {
    search = "q=plains";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("and when there is no query at all", () => {
    search = "c=W";
    view([p("1", { name: "Plains", colorIdentity: ["W"] })], []);
    expect(replaceState).not.toHaveBeenCalled();
  });

  // The phone slot is 173px, and the long placeholder truncates in it. The accessible name
  // carries the set at both widths and does not change.
  it("shortens the placeholder on the phone and keeps the full name", () => {
    stubDesktop(false);
    view([p("1"), p("2")], []);
    expect(field()).toHaveAttribute("placeholder", "Find a card");
    expect(field()).toHaveAccessibleName("Search cards in Duskmourn");
  });

  it("uses the long placeholder on the desktop", () => {
    stubDesktop(true);
    view([p("1"), p("2")], []);
    expect(field()).toHaveAttribute("placeholder", "Find a card in this set");
  });

  // The badge counts dimensions. The field is visible on the row beside it, so counting it
  // would state the same fact twice — the same rule missing-only is held to.
  it("is not counted by the phone badge", () => {
    search = "q=plains";
    view([p("1", { name: "Plains" })], []);
    expect(screen.queryByRole("button", { name: /filter(s)? on/ })).toBeNull();
  });

  // A second field behind `Filters` is two controls with one accessible name.
  it("never appears in the phone sheet", () => {
    view([p("1"), p("2")], []);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(screen.getAllByRole("searchbox", { name: "Search cards in Duskmourn" }))
      .toHaveLength(1);
  });

  it("is cleared by Clear all filters, which the chassis excludes only sort from", () => {
    search = "q=plains&c=W";
    view([p("1", { name: "Plains" })], []);
    fireEvent.click(screen.getByRole("button", { name: /^Clear all filters and the search$/ }));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  it("re-scopes the money, because the filters are the selector", () => {
    search = "q=plains";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    // One missing cell matches, so the button offers one and not two — and the link it
    // builds carries that one card, not the whole set.
    expect(screen.getByText("Send 1 to ManaPool")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /1 missing card,/ })).toBeInTheDocument();
  });

  describe("zero with a query", () => {
    it("names the query and offers the narrowest correction first", () => {
      search = "q=zzz";
      view([p("1", { name: "Plains" })], []);
      expect(screen.getByText("Nothing in Duskmourn matches “zzz”")).toBeInTheDocument();
      const empty = screen.getByText(/Nothing in Duskmourn matches/)
        .closest("section") as HTMLElement;
      expect([...empty.querySelectorAll("button")][0])
        .toHaveAccessibleName("Clear the search");
    });

    // `q=plains&c=U` returns nothing in a set that plainly contains Plains: the name is
    // present and a filter removed it. Claiming it is absent, and calling it a spelling,
    // would be false — so that case takes the ordinary filtered-empty heading.
    it("does not claim the name is absent when a filter is what removed it", () => {
      search = "q=plains&c=U";
      view([p("1", { name: "Plains", colorIdentity: ["W"] })], []);
      expect(screen.queryByText(/Nothing in Duskmourn matches/)).toBeNull();
      expect(screen.queryByText(/spelling rather than a gap/)).toBeNull();
      expect(screen.getByText(/No cards matching “plains” in this set/)).toBeInTheDocument();
    });

    it("still offers the search's own correction first there", () => {
      search = "q=plains&c=U";
      view([p("1", { name: "Plains", colorIdentity: ["W"] })], []);
      // Scoped to the empty state: the rack above it carries a `Clear every filter and the
      // search`, and the field carries its own `Clear the search`, both higher in the
      // document. The order under test is the one inside this block.
      const empty = screen.getByText(/No cards matching/).closest("section") as HTMLElement;
      const buttons = [...empty.querySelectorAll("button")];
      expect(buttons[0]).toHaveAccessibleName("Clear the search");
      expect(buttons[1]).toHaveAccessibleName("Clear all filters and the search");
    });

    // With missing-only on and every match already owned, the shipped good-news branch
    // carries it — which is why `what` was a parameter in the first place.
    it("keeps the good news when missing-only matched only cards you own", () => {
      search = "q=plains&m=1";
      // Two printings so the set is not complete: at 100% missing-only is dropped from
      // what is applied, and the page would not be at zero at all.
      view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], ["1"]);
      expect(screen.getByText(/You are not missing any cards matching “plains”/))
        .toBeInTheDocument();
    });
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

// H13 retired `Rarity · all` / `Rarity · uncommon`: the trigger counts, as `/collection`'s
// Type does, and the names live in the chip row.
describe("SetGridView — the rarity trigger counts", () => {
  it("reads Rarity 0 at rest", () => {
    stubDesktop(true);
    view([p("1", { rarity: "rare" }), p("2")], []);
    const trigger = screen.getByRole("button", { name: /Filter by rarity, collapsed/ });
    expect(trigger.textContent).toContain("Rarity 0");
  });

  it("names the one value in its accessible name when one is on", () => {
    stubDesktop(true);
    search = "r=uncommon";
    view([p("1", { rarity: "uncommon" }), p("2", { rarity: "rare" })], []);
    const trigger = screen.getByRole("button", { name: /Filter by rarity/ });
    expect(trigger.textContent).toContain("Rarity 1");
    expect(trigger.getAttribute("aria-label")).toContain("Uncommon");
  });

  // The sheet's chips are Title Case, a chip being a control.
  it("keeps the phone sheet's chips in Title Case", () => {
    stubDesktop(false);
    view([p("1", { rarity: "rare" }), p("2")], []);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(screen.getByRole("switch", { name: /^Rare/ })).toBeInTheDocument();
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

// H10 and H13 put up to seven chips on the line beside an always-drawn Clear — about 770px —
// so a desktop line that wrapped grew the sticky head across the 768-900 band. The line is
// one row at every width; whether that row fits is a browser measurement, and this pins the
// classes that decide it.
describe("SetGridView — the chip line never wraps", () => {
  it("scrolls sideways at desktop too, with no wrap at any breakpoint", () => {
    search = "own=missing&r=common,uncommon,rare,mythic&m=exact&c=W,U";
    const { container } = view([p("1", { colorIdentity: ["W", "U"] }), p("2")], []);
    const scroller = container.querySelector("[data-set-chips] .overflow-x-auto") as HTMLElement;
    const classes = scroller.className.split(/\s+/);
    expect(classes).toContain("flex-nowrap");
    expect(classes.some((c) => /(^|:)flex-wrap$/.test(c))).toBe(false);
    expect(classes.some((c) => /(^|:)overflow-(x-)?visible$/.test(c))).toBe(false);
    expect(classes).toContain("md:overflow-y-hidden");
    expect(scroller.querySelectorAll("span > button").length).toBe(7);
  });
});

// The count is for the eye, the names are for the ear — the split `filter-chassis.tsx`
// makes with its `spoken` field. §28 rules the VISIBLE label (`3 colours`, never one chip
// per hue) and says nothing about the accessible name; without the split a screen reader
// hears "3 colours" and, on a phone, has no pips mounted to find out which three.
describe("SetGridView — the collapsed colour chip names its hues", () => {
  it("shows the count, draws a swatch per hue, and speaks the names", () => {
    search = "c=W,U,B";
    const { container } = view([p("1"), p("2")], []);
    const row = container.querySelector("[data-set-chips]") as HTMLElement;
    expect(row.querySelector(".sr-only")?.textContent).toBe("White, Blue, Black");
    // The count, in the half the eye reads.
    const shown = [...row.querySelectorAll('[aria-hidden="true"]')]
      .map((el) => el.textContent).filter(Boolean);
    expect(shown).toContain("3 colors");
    // And the swatches beside it. §28 forbids a chip PER hue, not swatches inside one —
    // and on a phone the pips are unmounted, so this is the only thing a sighted reader
    // has to tell them which three.
    const dots = [...row.querySelectorAll<HTMLElement>("span.rounded-full")];
    expect(dots.map((d) => d.style.background)).toEqual(["var(--w)", "var(--u)", "var(--b)"]);
  });

  it("names them on the dismiss control too, not the count", () => {
    search = "c=W,U,B";
    view([p("1"), p("2")], []);
    expect(screen.getByRole("button", { name: "Remove filter: White, Blue, Black" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove filter: 3 colors" })).toBeNull();
  });

  it("leaves a single-colour chip alone — its label is already the name", () => {
    search = "c=W";
    const { container } = view([p("1"), p("2")], []);
    const row = container.querySelector("[data-set-chips]") as HTMLElement;
    expect(row.querySelector(".sr-only")).toBeNull();
    expect(screen.getByRole("button", { name: "Remove filter: White" })).toBeInTheDocument();
  });

  // §28's open item 3 defers the chip line's pixels to the chassis package — and since
  // round 21 the chip IS the chassis's component, so there are no pixels here to defer.
  it("renders the shared chip rather than a copy of it", () => {
    search = "c=W";
    const { container } = view([p("1"), p("2")], []);
    const chip = container.querySelector("[data-set-chips] span.inline-flex") as HTMLElement;
    expect(chip.className).toMatch(/bg-\[color:var\(--bg\)\]/);
    expect(chip.className).toMatch(/border-\[color:var\(--border-strong\)\]/);
  });
});

// The chip row's tokens are the chassis's, and this pins the whole set rather than the one
// a review happened to name — the background, the border and the × each drifted separately
// and each cost a round.
describe("SetGridView — the chip row's tokens are the chassis's", () => {
  // Round 21 made this true by construction rather than by matching: the chip is
  // `FilterChipPill`, exported from the chassis. Three tokens drifted separately before
  // that — background, border, and the × — each costing its own round.
  it("carries the chassis's tokens because it IS the chassis's chip", () => {
    search = "c=W,U&r=rare";
    // A white-blue rare: under H10's Any the selection is every lit colour, and a fixture
    // matching nothing would draw the empty state's own Clear beside the chip line's.
    const { container } = view(
      [p("1", { rarity: "rare", colorIdentity: ["W", "U"] }), p("2")], [],
    );
    const chip = container
      .querySelector("[data-set-chips] span.inline-flex") as HTMLElement;
    expect(chip.className).toMatch(/bg-\[color:var\(--bg\)\]/);
    expect(chip.className).toMatch(/border-\[color:var\(--border-strong\)\]/);
    expect(chip.className).toMatch(/text-\[color:var\(--fg-body\)\]/);
    // The × is --fg-faint; the Clear beside it is --fg-muted. Different controls, and the
    // chassis does not give them the same weight.
    expect((chip.querySelector("button") as HTMLElement).className)
      .toMatch(/text-\[color:var\(--fg-faint\)\]/);
    expect(screen.getByRole("button", { name: /^Clear all filters/ }).className)
      .toMatch(/text-\[color:var\(--fg-muted\)\]/);
  });
});

// Every other colour case seeds `c=` in the URL, and `ColourPips`' own test only proves it
// emits a code to its callback. Nothing pressed the pip on this page — so a regression in
// this adapter or its URL write would leave the visible control dead with the suite green.
describe("SetGridView — the colour pips are wired, not just painted", () => {
  it("filters the grid and writes the URL when a pip is clicked", () => {
    stubDesktop(true);
    view([
      p("1", { name: "Plains", colorIdentity: ["W"] }),
      p("2", { name: "Island", colorIdentity: ["U"] }),
    ], []);
    fireEvent.click(screen.getAllByRole("switch", { name: "White" })[0]);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?c=W");
    expect(screen.getAllByRole("button", { name: /Plains/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Island/ })).toBeNull();
  });

  it("turns the same pip off again", () => {
    stubDesktop(true);
    search = "c=W";
    view([p("1", { colorIdentity: ["W"] }), p("2", { colorIdentity: ["U"] })], []);
    fireEvent.click(screen.getAllByRole("switch", { name: "White" })[0]);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  it("adds a second hue rather than replacing the first", () => {
    stubDesktop(true);
    search = "c=W";
    // A white-blue card, or under H10's `Any` (every lit colour) Blue would empty the grid
    // and be offered as unavailable.
    view([p("1", { colorIdentity: ["W", "U"] }), p("2", { colorIdentity: ["W"] })], []);
    fireEvent.click(screen.getAllByRole("switch", { name: "Blue" })[0]);
    // `URLSearchParams.toString()` percent-encodes the separator, which `parseFilters`
    // reads back through `URLSearchParams` and so never sees.
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?c=W%2CU");
  });
});

// H13: the sheet's rarity group is `/collection`'s Type group — `SheetChip` toggles with
// counts, any number on at once. The radiogroup it replaces, with its roving tab stop and
// arrow stepping, was the single-select control's contract and retired with it.
describe("SetGridView — the sheet's rarity group is Type's chip group", () => {
  const openSheet = () => fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
  const sheet = () => screen.getByRole("dialog");
  const chipsIn = () =>
    [...sheet().querySelectorAll<HTMLElement>('[aria-label="Rarity"] [role="switch"]')];

  it("draws four switches with counts, not a radiogroup", () => {
    stubDesktop(false);
    view([p("1", { rarity: "rare" }), p("2"), p("3")], []);
    openSheet();
    expect(screen.queryByRole("radiogroup", { name: "Rarity" })).toBeNull();
    expect(chipsIn()).toHaveLength(4);
    const common = chipsIn().find((c) => /Common/.test(c.textContent ?? "")) as HTMLElement;
    expect(common.textContent).toContain("2");
  });

  it("lights every selected value", () => {
    stubDesktop(false);
    search = "r=rare,common";
    view([p("1", { rarity: "rare" }), p("2")], []);
    openSheet();
    const on = chipsIn().filter((c) => c.getAttribute("aria-checked") === "true");
    expect(on.map((c) => /Common/.test(c.textContent ?? "") ? "common" : "rare"))
      .toEqual(["common", "rare"]);
  });

  it("adds a value rather than replacing the lit one", () => {
    stubDesktop(false);
    search = "r=rare";
    view([p("1", { rarity: "rare" }), p("2")], []);
    openSheet();
    fireEvent.click(chipsIn().find((c) => /Common/.test(c.textContent ?? "")) as HTMLElement);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?r=common%2Crare");
  });

  it("clears a value when it is pressed again", () => {
    stubDesktop(false);
    search = "r=rare";
    view([p("1", { rarity: "rare" }), p("2")], []);
    openSheet();
    fireEvent.click(chipsIn().find((c) => /Rare/.test(c.textContent ?? "")) as HTMLElement);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  // The desktop panel refuses a zero-count rarity; the sheet refuses it the same way Type's
  // chips do, so the two widths offer the same choices.
  it("disables a rarity the set has none of, with the reason in its name", () => {
    stubDesktop(false);
    view([p("1", { rarity: "common" }), p("2", { rarity: "rare" })], []);
    openSheet();
    const uncommon = screen.getByRole("switch", { name: /^Uncommon, no cells/ });
    expect(uncommon).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(uncommon);
    expect(replaceState).not.toHaveBeenCalled();
    const common = chipsIn().find((c) => /^Common/.test(c.textContent ?? "")) as HTMLElement;
    expect(common).not.toHaveAttribute("aria-disabled");
  });
});

// The pips, the URL and the chip must agree on order regardless of click order.
describe("SetGridView — colour order is canonical, not click order", () => {
  it("stores WUBRG order when Blue is clicked before White", () => {
    stubDesktop(true);
    view([p("1", { colorIdentity: ["W", "U"] }), p("2", { colorIdentity: ["U"] })], []);
    fireEvent.click(screen.getAllByRole("switch", { name: "Blue" })[0]);
    fireEvent.click(screen.getAllByRole("switch", { name: "White" })[0]);
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/collection/sets/dsk?c=W%2CU");
  });

  it("speaks and draws the chip in that same order", () => {
    stubDesktop(true);
    const { container } = view(
      [p("1", { colorIdentity: ["W", "U"] }), p("2", { colorIdentity: ["U"] })],
      [],
    );
    fireEvent.click(screen.getAllByRole("switch", { name: "Blue" })[0]);
    fireEvent.click(screen.getAllByRole("switch", { name: "White" })[0]);
    const row = container.querySelector("[data-set-chips]") as HTMLElement;
    expect(row.querySelector(".sr-only")?.textContent).toBe("White, Blue");
    expect([...row.querySelectorAll<HTMLElement>("span.rounded-full")]
      .map((d) => d.style.background)).toEqual(["var(--w)", "var(--u)"]);
  });
});

// A colour combination can leave no rarity with any cards. Every chip is then disabled and
// still listed, the state the reader can understand and back out of.
describe("SetGridView — the rarity group when nothing matches", () => {
  it("lists every rarity as unavailable", () => {
    stubDesktop(false);
    search = "c=G";
    view([p("1", { rarity: "common", colorIdentity: ["W"] }),
          p("2", { rarity: "rare", colorIdentity: ["W"] })], []);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const chips = [...screen.getByRole("dialog")
      .querySelectorAll<HTMLElement>('[aria-label="Rarity"] [role="switch"]')];
    expect(chips).toHaveLength(4);
    expect(chips.every((c) => c.getAttribute("aria-disabled") === "true")).toBe(true);
  });
});

// H10: the colour match is the commander rack's, with its meanings and its parameter.
describe("SetGridView — colour match", () => {
  const cellNames = () => screen.getAllByRole("button", { name: /in your collection/ })
    .map((b) => (b.getAttribute("aria-label") ?? "").split(",")[0]);

  it("keeps a card holding EVERY lit colour under Any", () => {
    search = "c=W,U";
    view([
      p("1", { colorIdentity: ["W"] }),
      p("2", { colorIdentity: ["U"] }),
      p("3", { colorIdentity: ["W", "U"] }),
      p("4", { colorIdentity: ["W", "U", "B"] }),
    ], []);
    expect(cellNames()).toEqual(["Card 3", "Card 4"]);
  });

  it("keeps only the identity that is the selection under Exactly", () => {
    search = "c=W,U&m=exact";
    view([
      p("1", { colorIdentity: ["W"] }),
      p("3", { colorIdentity: ["W", "U"] }),
      p("4", { colorIdentity: ["W", "U", "B"] }),
    ], []);
    expect(cellNames()).toEqual(["Card 3"]);
  });

  it("writes m=exact when Exactly is pressed on the rack", () => {
    stubDesktop(true);
    search = "c=W";
    view([p("1", { colorIdentity: ["W"] }), p("2", { colorIdentity: ["W", "U"] })], []);
    fireEvent.click(screen.getAllByRole("radio", { name: "Exactly these" })[0]);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?c=W&m=exact");
    expect(cellNames()).toEqual(["Card 1"]);
  });

  for (const desktop of [true, false]) {
    for (const url of ["m=exact", "m=exact&c=Z"]) {
      it(`opens ?${url} on Any, every pip offered (${desktop ? "rack" : "sheet"})`, () => {
        stubDesktop(desktop);
        search = url;
        view([p("1", { colorIdentity: ["W", "U"] }), p("2", { colorIdentity: ["B", "R"] })], []);
        if (!desktop) fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
        const scope = desktop ? document.body : screen.getByRole("dialog");
        for (const name of ["White", "Blue", "Black", "Red"]) {
          const pip = within(scope).getAllByRole("switch", { name })[0];
          expect(pip.getAttribute("aria-disabled")).not.toBe("true");
          expect(pip).not.toBeDisabled();
        }
      });
    }
  }

  it("returns to Any when the last pip goes off, so no pip is left unreachable", () => {
    stubDesktop(true);
    search = "c=W&m=exact";
    // Multicolor cells only: under a stale Exactly with nothing lit, every single pip would
    // match nothing and read unavailable.
    view([p("1", { colorIdentity: ["W", "U"] }), p("2", { colorIdentity: ["B", "R"] })], []);
    fireEvent.click(screen.getAllByRole("switch", { name: "White" })[0]);
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/collection/sets/dsk");
    const blue = screen.getAllByRole("switch", { name: "Blue" })[0];
    expect(blue.getAttribute("aria-disabled")).not.toBe("true");
    expect(blue).not.toBeDisabled();
  });

  it("carries the modifier into the phone sheet", () => {
    stubDesktop(false);
    search = "c=W";
    view([p("1", { colorIdentity: ["W"] }), p("2", { colorIdentity: ["W", "U"] })], []);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const sheet = screen.getByRole("dialog");
    const exactly = [...sheet.querySelectorAll<HTMLElement>('[role="radio"]')]
      .find((r) => r.getAttribute("aria-label") === "Exactly these") as HTMLElement;
    expect(exactly).toBeDefined();
    fireEvent.click(exactly);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk?c=W&m=exact");
  });

  // A pip is unavailable when lighting it would leave nothing, which under Any is asked of
  // the selection the press makes, not of the hue alone.
  it("greys a pip whose press would empty the grid", () => {
    stubDesktop(true);
    search = "c=W";
    view([p("1", { colorIdentity: ["W"] }), p("2", { colorIdentity: ["U"] })], []);
    const blue = screen.getAllByRole("switch", { name: /Blue/ })[0];
    expect(blue.getAttribute("aria-disabled") === "true" || blue.hasAttribute("disabled"))
      .toBe(true);
  });
});

// The badge counts dimensions; the result LINE describes the page, and a query narrows the
// page. Reading one off the other made a query-only search state the whole set's figures
// over a grid showing a handful.
describe("SetGridView — the result line under a query", () => {
  it("states the filtered form for a query with no other filter on", () => {
    search = "q=plains";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    const status = screen.getAllByRole("status").find((el) => /cells/.test(el.textContent ?? ""));
    expect(status?.textContent).toMatch(/1 of 2 cells/);
  });

  it("states the rest form when nothing is narrowing", () => {
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], ["1"]);
    const status = screen.getAllByRole("status").find((el) => /cells/.test(el.textContent ?? ""));
    expect(status?.textContent).toMatch(/2 cells/);
    expect(status?.textContent).not.toMatch(/of 2 cells/);
  });
});

// The field's own scoped clear. The chip line deliberately draws no chip for a query, and
// at one active control there is no `Clear all filters` either — so without this the only
// way out of a search was to select the text and delete it.
describe("SetGridView — the search field clears itself", () => {
  const field = () => screen.getByRole("searchbox", { name: "Search cards in Duskmourn" });

  it("offers a clear once something is typed", () => {
    search = "q=plains";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    const clear = screen.getByRole("button", { name: "Clear the search" });
    expect(clear).toBeVisible();
    fireEvent.click(clear);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/collection/sets/dsk");
  });

  // Present but hidden, not unmounted: its 22px would otherwise reflow the input as the
  // last character goes.
  it("holds the control's box while the field is empty", () => {
    view([p("1"), p("2")], []);
    const clear = screen.getByLabelText("Clear the search", { selector: "button" });
    expect(clear).not.toBeVisible();
    expect(clear).toHaveAttribute("tabindex", "-1");
    expect(field()).toBeInTheDocument();
  });
});

// Clearing hides the field's own × — `visibility`, and out of the tab order with it — and
// unmounts the empty state's buttons. Every control that clears the query therefore has to
// put focus back in the field, or using one strands the keyboard on a control that is gone.
describe("SetGridView — focus survives clearing the search", () => {
  const field = () => screen.getByRole("searchbox", { name: "Search cards in Duskmourn" });

  it("returns focus to the field from the field's own ×", () => {
    search = "q=plains";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    fireEvent.click(screen.getByRole("button", { name: "Clear the search" }));
    expect(document.activeElement).toBe(field());
  });

  it("returns focus to the field from the empty state's correction", () => {
    search = "q=zzz";
    view([p("1", { name: "Plains" })], []);
    const empty = screen.getByText(/Nothing in Duskmourn matches/)
      .closest("section") as HTMLElement;
    fireEvent.click([...empty.querySelectorAll("button")][0]);
    expect(document.activeElement).toBe(field());
  });
});

// Clear all is always drawn since H13, so the question is only whether it is LIVE. A query
// on its own makes it live, because Clear clears the query and says so in its name.
describe("SetGridView — what makes Clear all live", () => {
  it("is live for a query on its own", () => {
    search = "q=plains";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    expect(screen.getByRole("button", { name: /^Clear all filters/ })).toBeEnabled();
  });

  it("and for a stale m=1 on a completed set", () => {
    search = "m=1";
    view([p("1")], ["1"]);
    expect(screen.getByRole("button", { name: /^Clear all filters/ })).toBeEnabled();
  });

  it("and for a query beside a real filter", () => {
    search = "q=plains&c=W";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    expect(screen.getByRole("button", { name: /^Clear all filters/ })).toBeEnabled();
  });
});

// Every other reading of the query trims: serialisation, matching, the result line. The
// clear did not, so typing only spaces left the grid unfiltered under an enabled,
// focusable control for a query that filtered nothing.
describe("SetGridView — a blank query has one inactive state", () => {
  it("keeps the clear inert for whitespace", () => {
    search = "q=%20%20";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    const clear = screen.getByLabelText("Clear the search", { selector: "button" });
    expect(clear).not.toBeVisible();
    expect(clear).toHaveAttribute("tabindex", "-1");
  });

  it("and live for a real one", () => {
    search = "q=plains";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    const clear = screen.getByLabelText("Clear the search", { selector: "button" });
    expect(clear).toBeVisible();
    expect(clear).toHaveAttribute("tabindex", "0");
  });
});

// `Clear all filters` clears the query too, so it owes the same focus return the field's
// own × does — it unmounts itself in the process, and focus was falling to the body.
describe("SetGridView — Clear all returns focus to the field", () => {
  const field = () => screen.getByRole("searchbox", { name: "Search cards in Duskmourn" });

  it("from the chip line", () => {
    search = "q=plains&c=W";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    fireEvent.click(screen.getByRole("button", { name: /^Clear all filters and the search$/ }));
    expect(document.activeElement).toBe(field());
  });

  it("from the empty state's wider correction", () => {
    search = "q=zzz&c=W";
    view([p("1", { name: "Plains", colorIdentity: ["W"] })], []);
    const empty = screen.getByText(/No cards matching/).closest("section") as HTMLElement;
    const buttons = [...empty.querySelectorAll("button")];
    fireEvent.click(buttons[1]);
    expect(document.activeElement).toBe(field());
  });
});

// EVERY control that clears the query names it. Three exist — the chip line's, the sheet's,
// and the empty state's — and they were fixed one round apart each, which is what a class
// swept by instance looks like.
describe("SetGridView — every Clear-all names the search too", () => {
  it("carries the same search-aware name the chip line does", () => {
    search = "q=plains&c=W";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const sheet = screen.getByRole("dialog");
    const clear = [...sheet.querySelectorAll("button")]
      .find((b) => /Clear all filters/.test(b.textContent ?? ""));
    expect(clear).toHaveAttribute("aria-label", "Clear all filters and the search");
  });

  it("names it on the chip line", () => {
    search = "q=plains&c=W";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    expect(screen.getByRole("button", { name: "Clear all filters and the search" }))
      .toBeInTheDocument();
  });

  it("and in the empty state", () => {
    search = "q=zzz&c=W";
    view([p("1", { name: "Plains", colorIdentity: ["W"] })], []);
    const empty = screen.getByText(/No cards matching/).closest("section") as HTMLElement;
    const buttons = [...empty.querySelectorAll("button")];
    expect(buttons[1]).toHaveAccessibleName("Clear all filters and the search");
  });
});

// Row 2 at rest says `No filters on`, which is a contradiction when a query is narrowing:
// the field IS on, the result line says so, and the chip line has no chip for it only
// because the field is visible on the row above.
describe("SetGridView — row 2 under a query alone", () => {
  it("says no OTHER filters are on", () => {
    search = "q=plains";
    view([p("1", { name: "Plains" }), p("2", { name: "Mountain" })], []);
    expect(screen.getByText("No other filters on")).toBeInTheDocument();
    expect(screen.queryByText("No filters on")).toBeNull();
  });

  it("and says none are on when none are", () => {
    view([p("1"), p("2")], []);
    expect(screen.getByText("No filters on")).toBeInTheDocument();
  });

  // The only escape when the search is the sole active control, so it clears 24px.
  it("gives the field's clear a 24px target", () => {
    search = "q=plains";
    view([p("1", { name: "Plains" })], []);
    const clear = screen.getByRole("button", { name: "Clear the search" });
    expect(clear.style.width).toBe("24px");
    expect(clear.style.height).toBe("24px");
  });
});


// The rarity panel's per-row counts are a fourth reader of the same computation, and could
// have gone on showing whole-set figures while the grid, the result line and the cost strip
// all showed the query subset.
describe("SetGridView — a query narrows the rarity panel's counts too", () => {
  it("counts only what the query matches", () => {
    stubDesktop(true);
    search = "q=plains";
    view([
      p("1", { name: "Plains", rarity: "common" }),
      p("2", { name: "Mountain", rarity: "common" }),
      p("3", { name: "Island", rarity: "rare" }),
    ], []);
    fireEvent.click(screen.getByRole("button", { name: /Filter by rarity/ }));
    // One Plains, not the two commons the set holds.
    expect(screen.getByRole("option", { name: /^Common, 1 cell/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^Common, 2 cells/ })).toBeNull();
    // And a rarity the query empties is offered as unavailable rather than as one card.
    expect(screen.getByRole("option", { name: /^Rare, no cells/ })).toBeInTheDocument();
  });
});

// JSDOM applies no CSS, so BOTH responsive forms are in the tree and the class list is the
// only discriminator. `hidden` as a bare token means desktop-only (`hidden md:block`);
// `md:hidden` means phone-only. Matching on the substring "hidden" catches both and reads
// as neither — the first version of these tests did exactly that and asserted on "".
const tokens = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/);
const phoneOnlyHidden = (el: Element) => tokens(el).includes("hidden");
const desktopOnlyHidden = (el: Element) => tokens(el).includes("md:hidden");
const textOf = (root: ParentNode, sel: string, drop: (el: Element) => boolean) =>
  [...root.querySelectorAll(sel)].filter((el) => !drop(el))
    .map((el) => el.textContent).join(" | ");

// R3 finding 6, moves 1, 2 and 4 — the content the phone head stops carrying, before any
// collapse mechanism exists. Every one of them is a PHONE FORM BESIDE the shipped string,
// never a replacement: desktop is asserted unchanged in the same block.
describe("SetGridView — the phone head carries less than the desktop one", () => {
  const indexed = () => [
    p("1", { name: "Plains", booster: true }),
    p("2", { name: "Island", booster: true }),
    p("3", { name: "Token", booster: false }),
  ];

  // Move 1. The scope note is a whole line saying what the denominator counts, so the word
  // goes into the figure and the line goes away.
  it("puts the scope word in the figure and drops the note", () => {
    stubDesktop(false);
    const { container } = view(indexed(), ["1"]);
    expect(container.textContent).toMatch(/1 \/ 2 base/);
    const note = [...container.querySelectorAll("p")]
      .find((el) => /base run only/.test(el.textContent ?? ""));
    expect(note).toBeDefined();
    // The BARE token. `/hidden/` also matches `md:hidden`, so the substring passes on a
    // note that was swapped to the wrong breakpoint — which is the whole thing this
    // asserts. The helper above exists for exactly this and these two assertions did not
    // use it.
    expect(tokens(note as Element)).toContain("hidden");
  });

  it("and the extras ratio trails it, because the note promised they were counted apart", () => {
    stubDesktop(false);
    const { container } = view(indexed(), ["1"]);
    expect(container.textContent).toMatch(/0 \/ 1 extra/);
  });

  // The one state where the note still stands alone: no ratio for `base` to ride on.
  it("keeps the note standing when the set is not indexed", () => {
    stubDesktop(false);
    const { container } = view(
      [p("1", { name: "Plains", booster: false })], [],
    );
    const note = [...container.querySelectorAll("p")]
      .find((el) => /base run only/.test(el.textContent ?? ""));
    expect(note).toBeDefined();
    expect(note?.className).not.toMatch(/hidden/);
  });

  // Move 2. The full interpolated string is the desktop form and is unchanged; the phone
  // gets what identifies the set, on the RATIO line's trailing edge. The handoff names the
  // title line; that placement wrapped a real set name and is corrected in the readiness
  // doc, so the title line appears here only as the thing being ruled out.
  it("rides a short provenance on the ratio line and hides the long one", () => {
    stubDesktop(false);
    const { container } = view(indexed(), []);
    expect(container.textContent).toMatch(/DSK · 2026/);
    const long = [...container.querySelectorAll("p")]
      .find((el) => /released 2026-09-01/.test(el.textContent ?? ""));
    expect(long).toBeDefined();
    expect(tokens(long as Element)).toContain("hidden");
  });

  // Move 4. The second half restates the head's own subtraction.
  it("drops the result line's redundant half", () => {
    stubDesktop(false);
    const status = () => screen.getAllByRole("status")
      .find((el) => /cell/.test(el.textContent ?? ""));
    view(indexed(), ["1"]);
    const region = status();
    expect(region).toBeDefined();
    const shown = textOf(region as HTMLElement, "span", phoneOnlyHidden);
    expect(shown).toMatch(/3 cells/);
    expect(shown).not.toMatch(/yours/);
  });

  // The live region is the thing that announces a filter change, and it has to be ONE
  // region holding both forms rather than two regions of which one is hidden.
  // An `aria-label` REPLACES everything its descendants contribute, so the extras figure
  // and the code were on the screen and absent from the accessible name while nested
  // inside the ratio's labelled span. They sit outside it now.
  it("announces the extras figure and the code rather than swallowing them", () => {
    stubDesktop(false);
    const { container } = view(indexed(), ["1"]);
    const labelled = container.querySelector("[aria-label^='You have']") as HTMLElement;
    expect(labelled).toBeTruthy();
    expect(labelled.textContent).not.toMatch(/extras|extra|DSK/);
    expect(container.querySelector("[data-set-provenance-short]")).toBeTruthy();
    expect(container.querySelector("[data-set-provenance-short]")?.closest("[aria-label]"))
      .toBeNull();
  });

  // Scoped to the incomplete branch, this left a completed set's phone with no code and no
  // year at all — the long paragraph is hidden there too.
  it("keeps the code and year when the set is complete", () => {
    stubDesktop(false);
    const { container } = view(
      [p("1", { name: "Plains", booster: true }), p("2", { name: "Island", booster: true })],
      ["1", "2"],
    );
    expect(container.textContent).toMatch(/DSK · 2026/);
  });

  // The noun agrees with the denominator, as `head.meta` and the set index both do.
  it("says one extra, not one extras", () => {
    stubDesktop(false);
    const { container } = view(indexed(), ["1"]);
    expect(container.textContent).toMatch(/0 \/ 1 extra(?!s)/);
  });

  it("keeps both forms inside a single live region", () => {
    stubDesktop(false);
    view(indexed(), ["1"]);
    const regions = screen.getAllByRole("status")
      .filter((el) => /cell/.test(el.textContent ?? ""));
    expect(regions).toHaveLength(1);
  });
});

// Asserted in its own block so a phone-only change that quietly rewrote the desktop head
// fails here rather than passing as "the form the test happened to read".
describe("SetGridView — the desktop head is untouched by finding 6", () => {
  const indexed = () => [
    p("1", { name: "Plains", booster: true }),
    p("2", { name: "Island", booster: true }),
    p("3", { name: "Token", booster: false }),
  ];

  it("keeps the bare ratio, the full provenance and the standalone note", () => {
    stubDesktop(true);
    const { container } = view(indexed(), ["1"]);
    const visible = textOf(container, "p, span", desktopOnlyHidden);
    expect(visible).toMatch(/1 \/ 2 · 50%/);
    expect(visible).toMatch(/DSK · released 2026-09-01 · 2 in the base run · 1 extra/);
    expect(visible).toMatch(/base run only · extras counted apart/);
  });

  it("keeps the result line's full form", () => {
    stubDesktop(true);
    view(indexed(), ["1"]);
    const status = screen.getAllByRole("status")
      .find((el) => /cell/.test(el.textContent ?? ""));
    expect(status).toBeDefined();
    const shown = textOf(status as HTMLElement, "span", desktopOnlyHidden);
    expect(shown).toMatch(/3 cells · 1 yours, 2 missing/);
  });
});

// An indexed set with no recorded release date is a supported catalog state: the desktop
// string says "an unrecorded date" rather than dropping itself, and the set index falls
// back to the code alone. Gated on the date, the phone lost the code with it.
describe("SetGridView — the phone provenance without a release date", () => {
  it("shows the code alone rather than nothing", () => {
    stubDesktop(false);
    const { container } = view(
      [p("1", { booster: true }), p("2", { booster: true })], [], "Duskmourn", null,
    );
    const short = container.querySelector("[data-set-provenance-short]");
    expect(short).toBeTruthy();
    expect(short?.textContent).toMatch(/DSK/);
    expect(short?.textContent).not.toMatch(/null|undefined|NaN/);
  });

  // The desktop form does not drop itself either; it names the gap.
  it("keeps the desktop string naming the unrecorded date", () => {
    stubDesktop(true);
    const { container } = view(
      [p("1", { booster: true }), p("2", { booster: true })], [], "Duskmourn", null,
    );
    expect(container.querySelector("[data-set-provenance-long]")?.textContent)
      .toMatch(/an unrecorded date/);
  });
});

// R3 finding 6, the collapse. Two heights, one threshold, an 80px hysteresis band, and a
// reserve so the document does not change height when the head shrinks.
//
// The parts a browser has to answer — that the bar overlays rather than reflowing the grid,
// and the rest height in pixels — are in `scripts/probe-sets.mjs`. What is here is the
// state machine: which threshold fires, in which direction, and what the bar stops
// carrying.
describe("SetGridView — the phone head collapses past a threshold", () => {
  const scrollTo = (y: number) => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true, writable: true });
    fireEvent.scroll(window);
  };
  const head = (c: HTMLElement) => c.querySelector("[data-set-head]") as HTMLElement;
  const isShy = (c: HTMLElement) => head(c).hasAttribute("data-set-head-collapsed");

  beforeEach(() => scrollTo(0));

  // d9's ruling on H10: the collapsed head below 1000px hides Any / Exactly so the set name
  // keeps its room. Hiding is display only, and this pins that it never changes state.
  it("hides Any / Exactly in the collapsed head without un-applying Exactly", () => {
    stubDesktop(true);
    search = "c=W&m=exact";
    const { container } = view([p("1", { colorIdentity: ["W"] }), p("2", { colorIdentity: ["W", "U"] })], []);
    const box = () => container.querySelector("[data-set-colour]") as HTMLElement;
    const HIDE = NARROW_HIDE;
    expect(container.querySelector('[data-set-colour] [role="radiogroup"]')!
      .hasAttribute("data-set-shy-hides-narrow")).toBe(true);
    const exactly = () => container.querySelector('[data-set-colour] [role="radio"][aria-label="Exactly these"]') as HTMLElement;
    const names = () => screen.getAllByRole("button", { name: /in your collection/ })
      .map((b) => (b.getAttribute("aria-label") ?? "").split(",")[0]);
    expect(box().className).not.toContain(HIDE);
    scrollTo(200);
    expect(isShy(container)).toBe(true);
    expect(box().className).toContain(HIDE);
    expect(exactly().getAttribute("aria-checked")).toBe("true");
    expect(names()).toEqual(["Card 1"]);
    for (const [, , url] of replaceState.mock.calls) expect(String(url)).toContain("m=exact");
    scrollTo(0);
    expect(isShy(container)).toBe(false);
    expect(box().className).not.toContain(HIDE);
    expect(exactly().getAttribute("aria-checked")).toBe("true");
  });

  // Round 5: a head that collapsed WIDE and is then narrowed (resize, zoom) never runs the
  // scroll guard, so the hide itself must spare a focused radio. jsdom resolves no CSS, so
  // this pins the selector and probe-sets reads the painted result in a browser.
  it("never hides Any / Exactly while it holds keyboard focus", () => {
    expect(NARROW_HIDE).toContain(":not(:has(:focus-visible))");
    expect(NARROW_HIDE).toMatch(/^max-\[999px\]:/);
  });

  // Round 4: below 1000px the collapse hides Any / Exactly, so keyboard focus on it must
  // hold the head open, as it does for every other member the collapse hides; above 1000
  // nothing is hidden and focus there holds nothing.
  for (const [width, holds] of [[900, true], [1200, false]] as const) {
    it(`${holds ? "holds" : "does not hold"} the head open for focus on Any / Exactly at ${width}px`, () => {
      stubDesktop(true);
      Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
      search = "c=W";
      const { container } = view([p("1", { colorIdentity: ["W"] })], []);
      const radio = container.querySelector('[data-set-colour] [role="radio"][aria-checked="true"]') as HTMLElement;
      // KEYBOARD focus, answered as a browser does after a Tab (the H17 rule's own stub).
      const matches = Element.prototype.matches;
      const spy = vi.spyOn(Element.prototype, "matches").mockImplementation(function (
        this: Element,
        selector: string,
      ) {
        return selector === ":focus-visible" ? this === document.activeElement : matches.call(this, selector);
      });
      try {
        radio.focus();
        scrollTo(2000);
        expect(isShy(container)).toBe(!holds);
        if (holds) {
          radio.blur();
          scrollTo(2001);
          expect(isShy(container)).toBe(true);
        }
      } finally {
        spy.mockRestore();
      }
    });
  }

  it("stays open until 120px of scroll", () => {
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], []);
    scrollTo(119);
    expect(isShy(container)).toBe(false);
    scrollTo(121);
    expect(isShy(container)).toBe(true);
  });

  // The band is what stops a thumb resting mid-gesture from fluttering the head: once
  // collapsed it does NOT restore at 119, only at 40.
  it("restores at 40, not at the same threshold it collapsed on", () => {
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], []);
    scrollTo(200);
    expect(isShy(container)).toBe(true);
    scrollTo(119);
    expect(isShy(container)).toBe(true);
    scrollTo(41);
    expect(isShy(container)).toBe(true);
    scrollTo(39);
    expect(isShy(container)).toBe(false);
  });

  // The reserve is the open head's height held in the document while the 52px bar draws in
  // its place, so anywhere above `rest - bar` the band under the bar is empty. A fixed 40
  // left the reader scrolling up into that band and watching the head pop open underneath
  // them; the threshold is measured so there is no band to see. jsdom lays nothing out, so
  // the two heights are stubbed — that is the whole input to the rule.
  it("restores where the reserve would start showing, not at a fixed 40", () => {
    stubDesktop(false);
    const rect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function boxed(this: HTMLElement) {
      if (this.hasAttribute("data-set-head")) {
        const height = this.hasAttribute("data-set-head-collapsed") ? 52 : 200;
        return { ...rect.call(this), height, bottom: height } as DOMRect;
      }
      // The reserve's bottom edge is where the grid starts, and the rule is read off that
      // rather than off the head's height: the head sits below the phone header, so its own
      // offset is not 0 and reads 0 again once it is stuck.
      if (this.hasAttribute("data-set-head-reserve")) {
        // Viewport-relative, as a real rect is: the grid sits at document 200 whatever the
        // page is scrolled to.
        return { ...rect.call(this), bottom: 200 - window.scrollY } as DOMRect;
      }
      return rect.call(this);
    };
    try {
      const { container } = view([p("1"), p("2")], []);
      // The first collapse of a visit has no bar to measure — one has never been drawn — so
      // it runs on the grid's own top instead of the old fixed 120: the head collapses once
      // it has scrolled entirely past, which is within a few pixels of where the measured
      // rule puts every later one.
      scrollTo(199);
      expect(isShy(container)).toBe(false);
      scrollTo(201);
      expect(isShy(container)).toBe(true);
      // From here both heights are known. It restores the moment the reserve would come
      // into view — 200 less the bar's 52 — rather than holding until the old 40.
      scrollTo(160);
      expect(isShy(container)).toBe(true);
      scrollTo(147);
      expect(isShy(container)).toBe(false);
      // And collapses again a band past that point, not at 120.
      scrollTo(200);
      expect(isShy(container)).toBe(false);
      scrollTo(229);
      expect(isShy(container)).toBe(true);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = rect;
    }
  });

  // A reader who asked for no motion gets the two heights and the step between them, with
  // nothing drawn in between — so no animation may be started at all.
  //
  // Asked of the ENGINE rather than of an inline style: the step is `Element.animate`, which
  // jsdom does not implement, so the hook's own "this engine will not animate" branch
  // answers first and a test reading `style.height` passes with the motion check deleted —
  // which is what the first version of this did. Stubbing `animate` is what gives both
  // halves something to see.
  function stubMotion(reduce: boolean) {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: /prefers-reduced-motion/.test(query) ? reduce : false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    // Typed rather than bare: the assertions below read the keyframes and the timing off
    // the recorded calls, and `vi.fn()` with no signature records them as an empty tuple.
    const animate = vi.fn((frames: Keyframe[], timing: KeyframeAnimationOptions) => ({
      frames,
      timing,
      cancel: vi.fn(),
      finish: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    Object.defineProperty(HTMLElement.prototype, "animate", {
      value: animate, configurable: true, writable: true,
    });
    // The head has to be measurable, or the hook falls back before it reaches the question.
    const rect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function boxed(this: HTMLElement) {
      if (this.hasAttribute("data-set-head")) {
        const height = this.hasAttribute("data-set-head-collapsed") ? 52 : 200;
        return { ...rect.call(this), height, bottom: height } as DOMRect;
      }
      if (this.hasAttribute("data-set-head-reserve")) {
        // The height the hook last wrote, so a restore starts from the reserve the collapse
        // left in the document rather than from jsdom's 0.
        const height = Number.parseFloat(this.style.height) || 0;
        return { ...rect.call(this), height, bottom: 200 - window.scrollY } as DOMRect;
      }
      return rect.call(this);
    };
    return {
      animate,
      restore: () => {
        HTMLElement.prototype.getBoundingClientRect = rect;
        delete (HTMLElement.prototype as { animate?: unknown }).animate;
        vi.unstubAllGlobals();
      },
    };
  }

  it("starts no animation when the reader asks for reduced motion", () => {
    const motion = stubMotion(true);
    try {
      const { container } = view([p("1"), p("2")], []);
      scrollTo(400);
      expect(isShy(container)).toBe(true);
      expect(motion.animate).not.toHaveBeenCalled();
    } finally {
      motion.restore();
    }
  });

  // H14 (Hugh's walk, 2026-10-02): "the collapse jumps to full height first". The head
  // turns `sticky` in the commit that draws the bar, so a step from the open height pinned a
  // full-height head over the grid and shrank it there — measured at 390x844 as `top 0,
  // height 302, sticky` on the collapse's first frame. The collapse waits until the open head
  // has scrolled entirely past, so there is no open form on screen to shrink: it SNAPS, and
  // the reserve takes the difference in the same commit.
  it("does not animate the collapse, and the reserve takes the difference at once", () => {
    const motion = stubMotion(false);
    try {
      const { container } = view([p("1"), p("2")], []);
      scrollTo(400);
      expect(isShy(container)).toBe(true);
      expect(motion.animate).not.toHaveBeenCalled();
      const reserve = container.querySelector("[data-set-head-reserve]") as HTMLElement;
      expect(reserve.style.height).toBe("148px");
    } finally {
      motion.restore();
    }
  });

  // The other side of the same switch, and what makes the reduced-motion test above a
  // measurement rather than a restatement of jsdom: with motion allowed the RESTORE animates
  // the head and the reserve TOGETHER, which is what holds the document still across the step.
  it("animates the head and the reserve as one on the restore when motion is allowed", () => {
    const motion = stubMotion(false);
    try {
      const { container } = view([p("1"), p("2")], []);
      scrollTo(400);
      expect(isShy(container)).toBe(true);
      scrollTo(0);
      expect(isShy(container)).toBe(false);
      expect(motion.animate).toHaveBeenCalledTimes(2);
      const [headFrames, headTiming] = motion.animate.mock.calls[0];
      const [spacerFrames, spacerTiming] = motion.animate.mock.calls[1];
      expect(headFrames).toEqual([{ height: "52px" }, { height: "200px" }]);
      // The mirror image: the reserve gives back exactly what the head takes.
      expect(spacerFrames).toEqual([{ height: "148px" }, { height: "0px" }]);
      expect(spacerTiming).toEqual(headTiming);
    } finally {
      motion.restore();
    }
  });

  // A breakpoint crossing is a re-layout, not a step between two heights. Widening while
  // the phone bar is drawn turns `shy` off as a side effect, and animating that put the
  // desktop head's controls inside a 75px clipped box on the way to a height belonging to a
  // different design. The head must arrive at its desktop form without an animation.
  it("does not animate a crossing to desktop", () => {
    const listeners: (() => void)[] = [];
    let wide = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: /prefers-reduced-motion/.test(query) ? false : wide,
        addEventListener: (_: string, fn: () => void) => listeners.push(fn),
        removeEventListener: vi.fn(),
      })),
    );
    // The stub records its `finish` handlers, and the test fires them: without a finished
    // collapse the hook's own cleanup records the head at its DESKTOP height, the crossing
    // then has nothing to animate BETWEEN, and the test passes with the guard deleted.
    const finishers: (() => void)[] = [];
    const animate = vi.fn((frames: Keyframe[], timing: KeyframeAnimationOptions) => ({
      frames,
      timing,
      cancel: vi.fn(),
      finish: vi.fn(),
      addEventListener: (type: string, fn: () => void) => {
        if (type === "finish") finishers.push(fn);
      },
      removeEventListener: vi.fn(),
    }));
    Object.defineProperty(HTMLElement.prototype, "animate", {
      value: animate, configurable: true, writable: true,
    });
    // WIDTH-AWARE, which is what makes the reopen observable: a stub giving both widths one
    // pair of heights cannot tell a head that re-measured at its new width from one that
    // carried the old figures across. The phone head is 200 open and 52 collapsed; the
    // desktop head is 900 and 56, far enough apart that the two outcomes cannot overlap.
    const rect = HTMLElement.prototype.getBoundingClientRect;
    const openH = () => (wide ? 900 : 200);
    HTMLElement.prototype.getBoundingClientRect = function boxed(this: HTMLElement) {
      if (this.hasAttribute("data-set-head")) {
        const height = this.hasAttribute("data-set-head-collapsed") ? (wide ? 56 : 52) : openH();
        return { ...rect.call(this), height, bottom: height } as DOMRect;
      }
      if (this.hasAttribute("data-set-head-reserve")) {
        return { ...rect.call(this), bottom: openH() - window.scrollY } as DOMRect;
      }
      return rect.call(this);
    };
    try {
      const { container } = view([p("1"), p("2")], []);
      scrollTo(400);
      expect(isShy(container)).toBe(true);
      // The phone's own RESTORE is animated — the control for what follows (the collapse
      // snaps since H14, so it cannot be the control).
      scrollTo(0);
      expect(animate).toHaveBeenCalled();
      // And it finishes, so the head is recorded at its own height rather than mid-step.
      act(() => { for (const fn of finishers) fn(); });
      scrollTo(400);
      expect(isShy(container)).toBe(true);
      animate.mockClear();
      // And now the window widens. Since addendum 2 the desktop head collapses too, so the
      // crossing is no longer a one-way flip to the open form: the reopen fires because the
      // reserve and the recorded rest height belong to the other width, and the scroll
      // listener — re-armed by the same `isDesktop` change — re-decides at the reader's
      // offset, which at 400 is back to collapsed.
      //
      // The RULE is unchanged and is what this asserts: neither the crossing nor the step
      // that settles it animates. The two widths are different designs rather than two
      // heights of one, and animating between them clipped the desktop controls inside a
      // 75px box on the way to a height belonging to the other design.
      wide = true;
      act(() => { for (const fn of listeners) fn(); });
      // What this case proves is the SILENCE, and only that. The reopen it depends on is
      // not assertable here: the settle re-decides inside the same `act`, so the state this
      // can read is the settle's answer rather than the reopen's, and every stub that makes
      // the two differ in jsdom ends up asserting the stub. Its proof is in `probe:sets`,
      // which measures the reserve after a real round trip — `head + spacer` against the
      // width's own rest height, in an engine that lays out.
      expect(animate).not.toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = rect;
      delete (HTMLElement.prototype as { animate?: unknown }).animate;
      vi.unstubAllGlobals();
    }
  });

  // Hidden, not unmounted. Unmounting threw away the reader's expanded cost disclosure and
  // any focus in it, and the head that came back was a different height from the one the
  // reserve had been holding.
  it("hides the chip line and the cost strip without unmounting them", () => {
    stubDesktop(false);
    const { container } = view([p("1", { rarity: "rare" }), p("2")], []);
    const costBefore = container.querySelector("[data-set-cost]");
    expect(costBefore).toBeTruthy();
    scrollTo(200);
    expect(container.querySelector("[data-set-chips]")?.className).toMatch(/hidden/);
    expect(container.querySelector("[data-set-cost]")).toBe(costBefore);
    expect(container.querySelector("[data-set-cost]")?.closest("div.hidden")).toBeTruthy();
  });

  // `Filters` IS reachable from the collapsed bar, so the result count still changes
  // there. Unmounting the only `role="status"` left a screen-reader user filtering into
  // silence — and a SECOND region beside it would announce twice, so it is one node whose
  // class changes rather than two that swap.
  it("keeps the result region announcing, unseen, while collapsed", () => {
    stubDesktop(false);
    const { container } = view([p("1", { rarity: "rare" }), p("2")], []);
    const before = container.querySelector("[data-set-result]");
    scrollTo(200);
    const after = container.querySelector("[data-set-result]");
    expect(after).toBe(before);
    expect(after?.className).toBe("sr-only");
    expect(screen.getAllByRole("status").filter((el) => /cell/.test(el.textContent ?? "")))
      .toHaveLength(1);
  });

  // The open row draws the Missing toggle beside the badge, so counting it there says one
  // thing twice. The collapsed bar hides it and the sheet does not carry it, so there the
  // same exclusion hides a live filter completely.
  it("counts missing-only on the collapsed badge, unlike the open row", () => {
    stubDesktop(false);
    search = "m=1";
    const { container } = view([p("1"), p("2")], ["1"]);
    scrollTo(200);
    const bar = container.querySelector("[data-set-head-bar]") as HTMLElement;
    expect(bar.querySelector("[aria-label*='filter']")?.textContent).toBe("1");
    scrollTo(0);
    // And the open row still does not count it.
    expect(screen.getByRole("button", { name: /^Filters/ }).textContent).not.toMatch(/1/);
  });

  // What the collapsed bar keeps: where you are, how far along, and the two ways to change
  // what you are looking at.
  // Where you are, how far along, and the two ways to change what you are looking at.
  it("keeps the set, the ratio and both controls", () => {
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], ["1"]);
    scrollTo(200);
    const bar = container.querySelector("[data-set-head-bar]") as HTMLElement;
    expect(bar.textContent).toMatch(/Duskmourn/);
    expect(bar.textContent).toMatch(/1 \/ 2/);
    expect(screen.getByRole("button", { name: /Show the search/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Filters/ }).length).toBeGreaterThan(0);
  });

  // §31's bar is ONE row, not the full block with members hidden — that reaches 140px and
  // no further, because the identity block is a two-line stack and the controls are a
  // third row. Its pixels are in the probe; what is here is that it exists and what it
  // carries.
  it("draws its own one-row bar rather than reusing the open block", () => {
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], ["1"]);
    scrollTo(200);
    const bar = container.querySelector("[data-set-head-bar]") as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.className).toMatch(/h-\[52px\]/);
    expect(bar.textContent).toMatch(/Duskmourn/);
    expect(bar.textContent).toMatch(/1 \/ 2/);
  });

  // §29 forbids two controls with one accessible name on this page, so the bar's search
  // control is a way BACK to the field rather than a second one.
  it("offers a route back to the search rather than a second field", () => {
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], []);
    scrollTo(200);
    const bar = container.querySelector("[data-set-head-bar]") as HTMLElement;
    expect(bar.querySelector("input")).toBeNull();
    expect(screen.getByRole("button", { name: /Show the search/ })).toBeInTheDocument();
    expect(screen.getAllByRole("searchbox", { name: /Search cards/ })).toHaveLength(1);
  });

  // The badge is how the bar carries the filter state, which is what earns it the right to
  // drop the chip line.
  it("carries the filter count on the badge", () => {
    stubDesktop(false);
    search = "c=W&r=common";
    const { container } = view([p("1", { rarity: "common" }), p("2")], []);
    scrollTo(200);
    const bar = container.querySelector("[data-set-head-bar]") as HTMLElement;
    expect(bar.textContent).toMatch(/2/);
    expect(bar.querySelector("[aria-label*='filter']")).toBeTruthy();
  });

  // §31, verbatim: "if it is firing, the collapse waits". Round 7 replaced this gate with
  // "the strip is simply not a member the collapse hides", which shows the message but is
  // not what the ruling says — and let a variable-height strip grow the fixed 52px bar.
  it("waits for the delta strip rather than collapsing around it", () => {
    stubDesktop(false);
    deltaProps.firing = true;
    try {
      const { container } = view([p("1"), p("2")], []);
      scrollTo(400);
      expect(isShy(container)).toBe(false);
      expect(container.textContent).toMatch(/a card arrived/);
    } finally {
      deltaProps.firing = false;
    }
  });

  it("and collapses once the message clears", () => {
    stubDesktop(false);
    deltaProps.firing = true;
    try {
      const r = view([p("1"), p("2")], []);
      scrollTo(400);
      expect(isShy(r.container)).toBe(false);
      deltaProps.firing = false;
      r.rerender(r.again());
      scrollTo(401);
      expect(isShy(r.container)).toBe(true);
    } finally {
      deltaProps.firing = false;
    }
  });

  // The gate does NOT apply behind an open sheet. A strip that starts firing there would
  // otherwise reopen the head and unmount the trigger `useDialogA11y` saved — which is the
  // defect the sheet freeze exists to prevent, arriving through the delta gate.
  it("does not reopen behind an open sheet when the strip fires", () => {
    stubDesktop(false);
    const r = view([p("1"), p("2")], []);
    scrollTo(400);
    expect(isShy(r.container)).toBe(true);
    const bar = r.container.querySelector("[data-set-head-bar]") as HTMLElement;
    fireEvent.click([...bar.querySelectorAll("button")]
      .find((b) => /Filters/.test(b.textContent ?? "")) as HTMLElement);
    deltaProps.firing = true;
    try {
      r.rerender(r.again());
      expect(isShy(r.container)).toBe(true);
      expect(r.container.querySelector("[data-set-head-bar]")).toBeTruthy();
    } finally {
      deltaProps.firing = false;
    }
  });

  // Opening the sheet from the collapsed bar keeps the bar: the head does not reopen, so
  // `useDialogA11y` still has the trigger it will return focus to.
  it("keeps the bar when the sheet opens from it", () => {
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], []);
    scrollTo(400);
    const bar = container.querySelector("[data-set-head-bar]") as HTMLElement;
    const trigger = [...bar.querySelectorAll("button")]
      .find((b) => /Filters/.test(b.textContent ?? "")) as HTMLElement;
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(isShy(container)).toBe(true);
    expect(container.querySelector("[data-set-head-bar]")).toBeTruthy();
  });

  // The open block is `display:none` while the bar is drawn, which takes its `h1` out of
  // the accessibility tree — heading navigation had no page heading for the whole collapsed
  // state.
  it("keeps a page heading while collapsed", () => {
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], []);
    scrollTo(400);
    const bar = container.querySelector("[data-set-head-bar]") as HTMLElement;
    expect(bar.querySelector("h1")?.textContent).toMatch(/Duskmourn/);
    // Exactly one is exposed at a time: the other is inside the hidden subtree.
    const shown = [...container.querySelectorAll("h1")]
      .filter((h) => h.closest("div.hidden") === null);
    expect(shown).toHaveLength(1);
  });

  // A delta that starts while the bar is drawn opens the head; opening Filters from that
  // head then flipped the bar back and unmounted the trigger `useDialogA11y` had saved, in
  // the same render that showed the dialog.
  it("holds the head open when the sheet opens during a delta", () => {
    stubDesktop(false);
    const r = view([p("1"), p("2")], []);
    scrollTo(400);
    expect(isShy(r.container)).toBe(true);
    deltaProps.firing = true;
    try {
      r.rerender(r.again());
      expect(isShy(r.container)).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      // The head it was opened from is still the head that is drawn.
      expect(isShy(r.container)).toBe(false);
    } finally {
      deltaProps.firing = false;
    }
  });

  // `effective` forces missing-only off at 100%, but `m=1` can still be in the URL — the
  // stale-filter case Clear exists for — and the bar showed no badge for it at all.
  it("badges a stale m=1 on a complete set", () => {
    stubDesktop(false);
    search = "m=1";
    const { container } = view(
      [p("1", { booster: true }), p("2", { booster: true })], ["1", "2"],
    );
    scrollTo(400);
    const bar = container.querySelector("[data-set-head-bar]") as HTMLElement;
    expect(bar.querySelector("[aria-label*='filter']")?.textContent).toBe("1");
  });

  // A complete base run can still have extras and enough cells to scroll, and the icon is
  // `aria-hidden` — a bar carrying the bare name told a screen-reader user nothing.
  it("keeps the ratio and the completion state when the set is complete", () => {
    stubDesktop(false);
    const { container } = view(
      [p("1", { booster: true }), p("2", { booster: false })], ["1"],
    );
    scrollTo(400);
    const bar = container.querySelector("[data-set-head-bar]") as HTMLElement;
    expect(bar.textContent).toMatch(/1 \/ 1/);
    expect(bar.textContent).not.toBe("Duskmourn");
    expect(bar.textContent).toMatch(/Duskmourn/);
  });

  // The field is inside the `hidden` open-head subtree while the bar is drawn, so the
  // button has to OPEN the head before focusing — `scrollTo` does not commit the state,
  // and focusing a hidden input does nothing at all.
  it("opens the head and lands focus in the field", async () => {
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], []);
    scrollTo(400);
    fireEvent.click(screen.getByRole("button", { name: /Show the search/ }));
    // The STATE, first. JSDOM applies no CSS and will happily focus an input inside a
    // `hidden` subtree, so asserting focus alone passes whether or not the head opened —
    // which is the whole defect. Opening is the part a browser would enforce.
    expect(isShy(container)).toBe(false);
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    expect(document.activeElement)
      .toBe(screen.getByRole("searchbox", { name: /Search cards/ }));
  });

  // #623's rule, now at every width. A head pinned while OPEN holds itself over the grid
  // for the whole band below the threshold — the reader scrolls a screen of cards under a
  // header that never moves, and then it snaps. `md:sticky` exempted desktop from that
  // while desktop could not collapse; once it could, the exemption was the same defect at a
  // second width.
  //
  // Whether a pinned box actually holds is a layout question and `probe:sets` answers it at
  // 390, 768, 1180 and 1440. What is asserted here is the rule the class expresses: no
  // width-qualified `sticky` survives, so there is one rule rather than two.
  it("pins the head only while it is collapsed, at every width", () => {
    for (const wide of [true, false]) {
      stubDesktop(wide);
      const { container, unmount } = view([p("1"), p("2")], []);
      const head = container.querySelector("[data-set-head]") as HTMLElement;
      // No `sticky` in any form while open — `md:sticky` included, which is what the second
      // clause below would say if `/sticky/` did not already match it as a substring. The
      // classes are read as WORDS for that reason.
      const classes = () => head.className.split(/\s+/).filter(Boolean);
      expect(classes()).not.toContain("sticky");
      expect(classes()).not.toContain("md:sticky");
      scrollTo(2000);
      expect(classes()).toContain("sticky");
      expect(classes()).not.toContain("md:sticky");
      unmount();
      scrollTo(0);
    }
  });

  // The reserve is a SIBLING, not a wrapper. A sticky element sticks only within its
  // containing block, so a wrapper the height of the open head pushed the head out of the
  // viewport past that height — the feature stopped existing where it was meant to start.
  it("keeps the head out of any box that would bound its stickiness", () => {
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], []);
    scrollTo(400);
    const spacer = container.querySelector("[data-set-head-reserve]");
    expect(spacer).toBeTruthy();
    // A sibling of the head, never its parent.
    expect(spacer?.parentElement).toBe(head(container).parentElement);
    expect(head(container).parentElement?.contains(
      container.querySelector("[data-set-grid]"),
    )).toBe(true);
  });

  // The four-part focus mechanism this replaced — a pin, a bar exception, a rescue ref and
  // a layout effect — drew findings in five consecutive rounds and grew a new hole in each.
  // What is left is one term: the head does not collapse while the SHEET is open, because
  // that is the case with a real defect behind it. `useDialogA11y` returns focus to the
  // trigger on close, and a collapse would have removed it.
  it("does not collapse while the filter sheet is open", () => {
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], []);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    scrollTo(400);
    expect(isShy(container)).toBe(false);
  });

  it("and collapses once the sheet closes", () => {
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], []);
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    scrollTo(400);
    expect(isShy(container)).toBe(false);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    scrollTo(401);
    expect(isShy(container)).toBe(true);
  });

  // The region is `sr-only` to keep ANNOUNCING, not to keep offering: clipped to a 1px box
  // the jump link is still focusable, so Tab landed on an invisible control.
  // Unmounted, not merely untabbable. `tabIndex={-1}` only stops FUTURE tabbing: a reader
  // already focused on the link keeps it as the active element when the collapse clips the
  // region to a 1px box, which is the same invisible-focus defect one step later.
  it("unmounts the extras jump link while collapsed", () => {
    stubDesktop(false);
    const { container } = view(
      [p("1", { booster: true }), p("2", { booster: false })], [],
    );
    const region = () => container.querySelector("[data-set-result]") as HTMLElement;
    expect(container.querySelector('a[href="#extras"]')).toBeTruthy();
    scrollTo(400);
    expect(container.querySelector('a[href="#extras"]')).toBeNull();
    // The separator goes with it. Left behind, the live region announced a dangling "·"
    // after the result count on every filter change.
    expect(region().textContent).not.toMatch(/·\s*$/);
  });

  // The crossing's suppression must not outlive the crossing. A resize at the top of the
  // page settles nothing — the head was already open — and a flag cleared by the next run of
  // the layout effect would still be set when the reader's next genuine collapse arrived
  // minutes later, and snap it.
  //
  // What takes it down here is the reader's own next scroll: the listener clears a stale arm
  // before it evaluates anything, so that scroll's step animates like any other. The
  // `requestAnimationFrame` version this replaces is a regression in the other direction —
  // it cleared the arm before the settle it was covering — and only `probe:sets` can see
  // that one, because jsdom orders the frame and React's flush the way that happens to work.
  it("still animates the step that follows a crossing it did not settle", () => {
    vi.useFakeTimers();
    const listeners: (() => void)[] = [];
    let wide = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: /prefers-reduced-motion/.test(query) ? false : wide,
        addEventListener: (_: string, fn: () => void) => listeners.push(fn),
        removeEventListener: vi.fn(),
      })),
    );
    const animate = vi.fn(() => ({
      cancel: vi.fn(),
      finish: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    Object.defineProperty(HTMLElement.prototype, "animate", {
      value: animate, configurable: true, writable: true,
    });
    const rect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function boxed(this: HTMLElement) {
      if (this.hasAttribute("data-set-head")) {
        const height = this.hasAttribute("data-set-head-collapsed") ? 52 : 200;
        return { ...rect.call(this), height, bottom: height } as DOMRect;
      }
      if (this.hasAttribute("data-set-head-reserve")) {
        return { ...rect.call(this), bottom: 200 - window.scrollY } as DOMRect;
      }
      return rect.call(this);
    };
    try {
      const { container } = view([p("1"), p("2")], []);
      // At the top of the page, so the crossing changes the width and nothing else.
      scrollTo(0);
      wide = true;
      act(() => { for (const fn of listeners) fn(); });
      expect(isShy(container)).toBe(false);
      expect(animate).not.toHaveBeenCalled();
      // And the reader scrolls for real. What takes the arm down is this scroll itself —
      // the listener clears a stale arm before evaluating. The collapse it causes snaps by
      // rule since H14, so the step that has to animate like any other is the restore after
      // it. The timer flush is only to let anything else pending settle first.
      act(() => { vi.runAllTimers(); });
      scrollTo(900);
      expect(isShy(container)).toBe(true);
      expect(animate).not.toHaveBeenCalled();
      scrollTo(0);
      expect(isShy(container)).toBe(false);
      expect(animate).toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = rect;
      delete (HTMLElement.prototype as { animate?: unknown }).animate;
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  // Addendum 2 §1. The round's load-bearing claim: at `md` the collapsed head IS the rack's
  // own row, so there is exactly ONE search field in the document at every offset. A
  // redrawn desktop bar would mount a second behind a `display:none` twin — two controls
  // with one accessible name, which §29 forbids on this page.
  it("keeps one search field at desktop, collapsed or not", () => {
    stubDesktop(true);
    const { container } = view([p("1"), p("2")], []);
    const fieldName = /^Search cards in /;
    expect(screen.getAllByRole("searchbox", { name: fieldName })).toHaveLength(1);
    const before = screen.getByRole("searchbox", { name: fieldName });
    scrollTo(2000);
    expect(isShy(container)).toBe(true);
    expect(screen.getAllByRole("searchbox", { name: fieldName })).toHaveLength(1);
    // The SAME node, which is what keeps focus, the caret and the 150ms debounce across the
    // threshold with nothing to rescue.
    expect(screen.getByRole("searchbox", { name: fieldName })).toBe(before);
  });

  // The same node is not enough on its own — a remount that happened to produce an equal
  // element would be caught by the identity check above, but LIVE state would not. Focus,
  // the caret and the typed-but-not-yet-applied draft are the three things the round claims
  // survive the threshold because nothing unmounts, so all three are read back.
  //
  // Round 2 asked whether the conditional prefix shifts the rack's unkeyed children and
  // hands the search slot's fiber to the prefix. It does not: `{cond ? <div/> : null}` is a
  // stable slot in the parent's children array, so a null becoming an element changes that
  // slot alone and every later child keeps its index. This is what proves it rather than
  // the reasoning.
  it("keeps focus, the caret and the pending draft across the desktop collapse", () => {
    stubDesktop(true);
    const { container } = view([p("1"), p("2")], []);
    const field = screen.getByRole("searchbox", { name: /^Search cards in / });
    field.focus();
    fireEvent.change(field, { target: { value: "plai" } });
    (field as HTMLInputElement).setSelectionRange(2, 2);
    expect(document.activeElement).toBe(field);

    scrollTo(2000);
    expect(isShy(container)).toBe(true);

    const after = screen.getByRole("searchbox", { name: /^Search cards in / });
    expect(after).toBe(field);
    expect(document.activeElement).toBe(after);
    expect((after as HTMLInputElement).value).toBe("plai");
    expect((after as HTMLInputElement).selectionStart).toBe(2);
  });

  // The phone's two bar controls exist because its rack is behind a sheet. At `md` the rack
  // is on the row, so a `Filters` trigger would be a second route to one rack and the
  // back-to-search button would point at a field that never moved.
  it("draws no Filters trigger and no back-to-search button on the desktop bar", () => {
    stubDesktop(true);
    const { container } = view([p("1"), p("2")], []);
    scrollTo(2000);
    expect(isShy(container)).toBe(true);
    expect(container.querySelector("[data-set-head-bar]")).toBeNull();
    expect(container.querySelector("[data-set-head-prefix]")).toBeTruthy();
    // The sheet trigger is `md:hidden` rather than unmounted — it is the phone's route to
    // the rack and stays mounted for the crossing back — so what is asserted is that it is
    // gated off at this width, not that it is absent.
    expect(screen.getByRole("button", { name: /^Filters/ }).className).toMatch(/md:hidden/);
    // The back-to-search button IS unmounted: it belongs to the phone bar, which does not
    // render at `md` at all.
    expect(screen.queryByRole("button", { name: setPageCopy.head.backToSearch }))
      .toBeNull();
  });

  // The open block is `display:none` while the head is collapsed, which takes its heading
  // out of the accessibility tree — so without an `h1` on the prefix, heading navigation
  // would have no page heading at all for the whole collapsed state.
  //
  // Which of the two is EXPOSED is a `display` question and jsdom computes no styles, so
  // that half is the probe's (`probe:sets`). What is asserted here is that the prefix
  // carries an `h1` naming the set, rather than a span.
  it("carries a page heading on the desktop prefix", () => {
    stubDesktop(true);
    const { container } = view([p("1"), p("2")], []);
    scrollTo(2000);
    expect(isShy(container)).toBe(true);
    const prefix = container.querySelector("[data-set-head-prefix]");
    expect(prefix?.querySelector("h1")?.textContent).toBe("Duskmourn");
  });

  // The band between the two thresholds is the BAR's own height rather than a constant: the
  // head reopens where the reserve would start showing (`gridTop − bar`) and collapses where
  // the open head has entirely left (`gridTop`). Both come from measurement, so this needs a
  // stub — jsdom reports every box at 0 and the fallback pair would answer instead.
  //
  // What the retired constant did, and why it went: `reopenAt + 120` put the desktop
  // collapse 63px past the point the open head leaves, so every collapse after the first of
  // a visit left a band with no head on screen at all and then snapped the bar in.
  it("collapses where the open head leaves and reopens where the reserve shows", () => {
    const rect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function boxed(this: HTMLElement) {
      if (this.hasAttribute("data-set-head")) {
        const height = this.hasAttribute("data-set-head-collapsed") ? 52 : 200;
        return { ...rect.call(this), height, bottom: height } as DOMRect;
      }
      if (this.hasAttribute("data-set-head-reserve")) {
        return { ...rect.call(this), bottom: 200 - window.scrollY } as DOMRect;
      }
      return rect.call(this);
    };
    try {
      for (const wide of [true, false]) {
        stubDesktop(wide);
        const { container, unmount } = view([p("1"), p("2")], []);
        // The grid starts at 200 in this stub, so that is where the open head has gone.
        scrollTo(199);
        expect(isShy(container)).toBe(false);
        scrollTo(201);
        expect(isShy(container)).toBe(true);
        // And on the way back up it holds until the reserve would show, at 200 − 52.
        scrollTo(149);
        expect(isShy(container)).toBe(true);
        scrollTo(147);
        expect(isShy(container)).toBe(false);
        // THE SECOND COLLAPSE, which is the only one the retired constant ever touched: the
        // first of a visit has no bar to measure and ran on `gridTop` either way. With
        // `reopenAt + 120` this offset left the head open to 268 — 68px of grid with no head
        // on screen at all — and every check above passes over it.
        scrollTo(201);
        expect(isShy(container)).toBe(true);
        unmount();
        scrollTo(0);
      }
    } finally {
      HTMLElement.prototype.getBoundingClientRect = rect;
    }
  });

  // Addendum 2 §3 asks for a gate holding the head open while the rarity panel is open,
  // because the panel is anchored to a trigger inside the row the head collapses into.
  // There is none: the desktop popover dismisses itself on scroll, so the panel is already
  // gone by the time any collapse decision is taken. The gate was built, and `probe:sets`
  // reported it unreachable.
  //
  // That dismissal is NOT assertable here, which is why the probe owns it. `fireEvent.scroll`
  // dispatches with `window` as the target, and the panel's listener asks
  // `panelRef.current.contains(target)` — `contains` takes a Node, and window is not one. In
  // a browser the target is `document` and the check runs; in jsdom it never gets that far,
  // so a unit test would report the panel still open on a build where it closes.

  // Hiding a member takes the keyboard with it. The gate is read at decision time, and it
  // gates the open→shy edge alone — a reader who tabs into the row while the head is
  // already collapsed must not have it open underneath them.
  it("does not collapse while focus is inside a member the collapse hides", () => {
    stubDesktop(true);
    // Extras, so the result region carries its `extras ↓` link — the one desktop-visible
    // control among the hidden members.
    const { container } = view([p("1", { booster: true }), p("2", { booster: false })], []);
    // The `extras ↓` link inside the result region, which is a DESKTOP-visible control and
    // deliberately not `CostStrip`'s phone-only toggle: that one is `md:hidden` but still in
    // the document, and jsdom lets a `display:none` element take focus — so a test that
    // focused it would pass at `md` without ever exercising the gate at this width.
    const hidden = container.querySelector(
      '[data-set-shy-hides] a[href="#extras"]',
    ) as HTMLElement;
    expect(hidden).toBeTruthy();
    expect(hidden.className).not.toMatch(/md:hidden/);
    // KEYBOARD focus, which is the only kind that holds the head (H17). jsdom does not say
    // which kind `.focus()` is, so `:focus-visible` answers as a browser does after a Tab.
    const matches = Element.prototype.matches;
    const spy = vi.spyOn(Element.prototype, "matches").mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      return selector === ":focus-visible"
        ? this === document.activeElement
        : matches.call(this, selector);
    });
    try {
      hidden.focus();
      scrollTo(2000);
      expect(isShy(container)).toBe(false);
      // And once focus leaves, the next read collapses.
      hidden.blur();
      scrollTo(2001);
      expect(isShy(container)).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  // H17: a POINTER press leaves focus behind too (the cost strip's toggles take focus on
  // every press), and holding the head open for it left the phone's head unpinned after the
  // strip opened and closed. Only keyboard focus holds it. jsdom cannot tell the two kinds of
  // focus apart, so `:focus-visible` is answered here the way a browser answers it after a tap.
  it("collapses over focus a pointer press left behind (H17)", () => {
    // The real path: a tap on the cost strip's ▾, whose replacement ▴ takes focus inside a
    // member the collapse hides. The phone form, where the toggle is drawn.
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], []);
    fireEvent.click(container.querySelector("[data-set-cost-toggle]") as HTMLElement);
    const hidden = container.querySelector("[data-set-cost-toggle]") as HTMLElement;
    expect(hidden.getAttribute("aria-expanded")).toBe("true");
    expect(hidden.closest("[data-set-shy-hides]")).not.toBeNull();
    const matches = Element.prototype.matches;
    const spy = vi.spyOn(Element.prototype, "matches").mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      return selector === ":focus-visible" ? false : matches.call(this, selector);
    });
    try {
      // Focus is where the press put it, on the replacement toggle.
      expect(document.activeElement).toBe(hidden);
      scrollTo(2000);
      expect(isShy(container)).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  // The rack row's marker is CONDITIONAL — present below `md`, absent at it — so the desktop
  // case above cannot see it at all. On the phone that row hides on collapse and carries the
  // search field, which is the case the gate was added for; without this, removing the
  // marker leaves every other test green.
  it("does not collapse on the phone while focus is in the search field", () => {
    stubDesktop(false);
    const { container } = view([p("1"), p("2")], []);
    const field = screen.getByRole("searchbox", { name: /^Search cards in / });
    field.focus();
    scrollTo(400);
    expect(isShy(container)).toBe(false);
    // And once focus leaves it, the next read collapses.
    field.blur();
    scrollTo(401);
    expect(isShy(container)).toBe(true);
  });

  // Rows 2 and 3 go, but the result line keeps its live region — which is what lets them.
  // A filter changed from the collapsed bar is still announced.
  it("keeps the result line announcing, unseen, while collapsed at desktop", () => {
    stubDesktop(true);
    const { container } = view([p("1"), p("2")], []);
    scrollTo(2000);
    const result = container.querySelector("[data-set-result]");
    expect(result?.className).toBe("sr-only");
    expect(screen.getAllByRole("status").filter((el) => /cell/.test(el.textContent ?? "")))
      .toHaveLength(1);
    expect(container.querySelector("[data-set-chips]")?.className).toMatch(/hidden/);
  });

  // Addendum 2 reverses `ADDENDUM-STATES.md`'s fifth Must-not. The desktop head is 276px of
  // a page that runs to ~16,500, and it followed the reader down all of it.
  it("collapses at desktop too, and the cost strip goes with it", () => {
    stubDesktop(true);
    const { container } = view([p("1"), p("2")], []);
    scrollTo(2000);
    expect(isShy(container)).toBe(true);
    // The money is not on the bar. The figure re-scopes with the filters, and the collapsed
    // head is the one place those can be changed with the denominator off screen. Hidden
    // rather than unmounted, as on the phone — unmounting throws away the reader's expanded
    // disclosure and any focus in it.
    expect(container.querySelector("[data-set-cost]")?.closest("div.hidden")).toBeTruthy();
  });
});
