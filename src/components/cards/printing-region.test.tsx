import { cleanup, render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowsePrinting } from "../../lib/collection/browse";
import type { PrintingChoice } from "../../lib/collection/catalog-read";
import { printingPickerCopy } from "../../lib/copy/collection";
import { deckPrintingsCopy } from "../../lib/copy/deck-printings";
import { PrintingRegion, OVERFLOW_THRESHOLD, printingKey } from "./printing-region";
import { reveal } from "../../lib/ui/reveal";

// jsdom lays nothing out, so the scroll itself is `reveal`'s own test; here, what is revealed and when.
vi.mock("../../lib/ui/reveal", () => ({ reveal: vi.fn(() => () => {}) }));
const revealed = vi.mocked(reveal);

const copy = printingPickerCopy.printing;

const printing = (over: Partial<BrowsePrinting> = {}): BrowsePrinting => ({
  setCode: "C21",
  setName: "Commander 2021",
  collectorNumber: "263",
  releasedAt: "2021-04-23",
  quantity: 1,
  finishes: { nonfoil: 1 },
  imageUri: null,
  flavorName: null,
  ...over,
});

type ArtOver = Partial<Extract<React.ComponentProps<typeof PrintingRegion>, { preferred: unknown }>>;

const deckCopy = deckPrintingsCopy.picker;
function renderRegion(over: ArtOver = {}) {
  const onPick = vi.fn();
  const onReset = vi.fn();
  const onForget = vi.fn();
  const onAnnounce = vi.fn();
  const printings = over.printings ?? [
    printing(),
    printing({ setCode: "LEA", setName: "Limited Edition Alpha", collectorNumber: "270", releasedAt: "1993-08-05" }),
    printing({ setCode: "ZNR", setName: "Zendikar Rising", collectorNumber: "12", releasedAt: "2020-09-25" }),
  ];
  const utils = render(
    <PrintingRegion
      id="printings"
      printings={printings}
      preferred={null}
      resolvedKey={printingKey(printings[0])}
      cardName="Arcane Signet"
      colorIdentity={[]}
      onPick={onPick}
      onReset={onReset}
      onForget={onForget}
      onAnnounce={onAnnounce}
      {...over}
    />,
  );
  return { ...utils, onPick, onReset, onForget, onAnnounce, printings };
}

describe("PrintingRegion", () => {
  it("renders one radio per owned printing", () => {
    renderRegion();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("top-aligns every tile: a stretched button would center a short tile's art under a tall title", () => {
    renderRegion();
    for (const tile of screen.getAllByRole("radio")) expect(tile.className).toContain("self-start");
  });

  it("checks nothing when no pick is stored (decision 10)", () => {
    renderRegion();
    for (const tile of screen.getAllByRole("radio")) {
      expect(tile).toHaveAttribute("aria-checked", "false");
    }
  });

  it("marks the resolved printing 'shown now', not 'your pick'", () => {
    renderRegion();
    expect(screen.getByText(copy.badgeShownNow)).toBeInTheDocument();
    expect(screen.queryByText(copy.badgePicked)).not.toBeInTheDocument();
  });

  it("checks the stored pick and shows no shown-now badge on it", () => {
    renderRegion({ preferred: { setCode: "LEA", collectorNumber: "270" } });
    const picked = screen.getByRole("radio", { checked: true });
    expect(within(picked).getByText(copy.badgePicked)).toBeInTheDocument();
  });

  it("reports the picked printing and announces it", () => {
    const { onPick, onAnnounce } = renderRegion();
    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ setCode: "LEA", collectorNumber: "270" }));
    expect(onAnnounce).toHaveBeenCalledWith(copy.announcePicked("Limited Edition Alpha", "270"));
  });

  it("offers the reset only once a pick exists", () => {
    const { rerender, onReset } = renderRegion();
    expect(screen.queryByText(copy.resetToDefault)).not.toBeInTheDocument();
    rerender(
      <PrintingRegion
        id="printings"
        printings={[printing(), printing({ setCode: "LEA", collectorNumber: "270" })]}
        preferred={{ setCode: "LEA", collectorNumber: "270" }}
        resolvedKey="LEA|270"
        cardName="Arcane Signet"
        colorIdentity={[]}
        onPick={vi.fn()}
        onReset={onReset}
        onForget={vi.fn()}
        onAnnounce={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText(copy.resetToDefault));
    expect(onReset).toHaveBeenCalled();
  });

  describe("keyboard (radiogroup)", () => {
    it("arrow keys move and select, and do not wrap at the ends", () => {
      const { onPick, onAnnounce } = renderRegion();
      const tiles = screen.getAllByRole("radio");
      // The end absorbs the key. Re-selecting from a standstill would re-run the server
      // action and re-announce a pick that never moved.
      fireEvent.keyDown(tiles[0], { key: "ArrowLeft" });
      expect(onPick).not.toHaveBeenCalled();
      expect(onAnnounce).not.toHaveBeenCalled();
      fireEvent.keyDown(tiles[0], { key: "ArrowRight" });
      expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ setCode: "LEA" }));
    });

    it("Home and End jump the ends", () => {
      const { onPick } = renderRegion();
      fireEvent.keyDown(screen.getAllByRole("radio")[0], { key: "End" });
      expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ setCode: "ZNR" }));
    });

    it("parks the tab stop on the shown-now entry when nothing is picked", () => {
      renderRegion();
      const tiles = screen.getAllByRole("radio");
      expect(tiles[0]).toHaveAttribute("tabindex", "0");
      expect(tiles[1]).toHaveAttribute("tabindex", "-1");
    });
  });

  describe("finish captions (decision 9)", () => {
    it("renders no finish string for a plain nonfoil printing", () => {
      renderRegion({ printings: [printing({ quantity: 2, finishes: { nonfoil: 2 } }), printing({ setCode: "LEA" })] });
      expect(screen.getByText(copy.entryMeta("263", copy.entryQty(2)))).toBeInTheDocument();
    });

    it("labels an all-foil printing", () => {
      renderRegion({ printings: [printing({ quantity: 2, finishes: { foil: 2 } }), printing({ setCode: "LEA" })] });
      expect(screen.getByText(copy.entryMeta("263", copy.entryQtyAllFoil(2)))).toBeInTheDocument();
    });

    it("labels a mixed printing with the foil count", () => {
      renderRegion({ printings: [printing({ quantity: 3, finishes: { nonfoil: 2, foil: 1 } }), printing({ setCode: "LEA" })] });
      expect(screen.getByText(copy.entryMeta("263", copy.entryQtyMixed(3, 1)))).toBeInTheDocument();
    });

    it("counts etched as foil", () => {
      renderRegion({ printings: [printing({ quantity: 2, finishes: { etched: 2 } }), printing({ setCode: "LEA" })] });
      expect(screen.getByText(copy.entryMeta("263", copy.entryQtyAllFoil(2)))).toBeInTheDocument();
    });
  });

  it("omits the collector number and its separator on a bare import", () => {
    renderRegion({ printings: [printing({ collectorNumber: "", quantity: 4 }), printing({ setCode: "LEA" })] });
    const bare = screen.getAllByRole("radio")[0];
    expect(within(bare).getByText(copy.entryQty(4))).toBeInTheDocument();
    expect(within(bare).queryByText(/#/)).not.toBeInTheDocument();
  });

  describe("dormant pick (ratified exception to decision 5)", () => {
    const dormant = { preferred: { setCode: "MMQ", collectorNumber: "9" } };

    it("shows a tile and a note for a pick no longer owned", () => {
      renderRegion(dormant);
      expect(screen.getByText(copy.dormantNote("MMQ"))).toBeInTheDocument();
      expect(screen.getByText(copy.dormantBadge)).toBeInTheDocument();
      expect(screen.getAllByRole("radio")).toHaveLength(4);
    });

    it("does not let the dormant tile be picked or reached by arrow keys", () => {
      const { onPick } = renderRegion(dormant);
      const dormantTile = screen.getByRole("radio", { name: copy.dormantAria("MMQ") });
      // Natively disabled so the modal's `button:not([disabled])` focus trap skips it, and
      // aria-disabled because role="radio" overrides the role native disabled maps from.
      expect(dormantTile).toBeDisabled();
      expect(dormantTile).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(dormantTile);
      expect(onPick).not.toHaveBeenCalled();
    });

    it("reports the dormant tile as the checked one", () => {
      renderRegion(dormant);
      // It wears the ✓ badge and the "Your pick" label, so announcing nothing selected
      // would contradict the screen.
      expect(screen.getByRole("radio", { name: copy.dormantAria("MMQ") })).toHaveAttribute("aria-checked", "true");
    });

    it("forgets the pick on request", () => {
      const { onForget, onAnnounce } = renderRegion(dormant);
      fireEvent.click(screen.getByText(copy.dormantClear));
      expect(onForget).toHaveBeenCalled();
      expect(onAnnounce).toHaveBeenCalledWith(copy.announceForget);
    });

    it("sorts the dormant tile among its own set, not after it", () => {
      renderRegion({
        preferred: { setCode: "C21", collectorNumber: "264" },
        printings: [
          printing({ collectorNumber: "263" }),
          printing({ collectorNumber: "265" }),
          printing({ setCode: "ZNR", setName: "Zendikar Rising", collectorNumber: "12" }),
        ],
      });
      const labels = screen.getAllByRole("radio").map((t) => t.getAttribute("aria-label"));
      expect(labels[1]).toBe(copy.dormantAria("C21"));
    });

    it("renders nothing dormant once the printing is owned again", () => {
      renderRegion({ preferred: { setCode: "LEA", collectorNumber: "270" } });
      expect(screen.queryByText(copy.dormantBadge)).not.toBeInTheDocument();
      expect(screen.getAllByRole("radio")).toHaveLength(3);
    });
  });

  describe("deck scope (deck printings)", () => {
    const deck = { scope: "deck" as const };

    it("swaps both intro strings and drops the reset", () => {
      const { unmount } = renderRegion(deck);
      expect(screen.getByText(deckCopy.regionIntro(3))).toBeInTheDocument();
      unmount();
      renderRegion({ ...deck, preferred: { setCode: "LEA", collectorNumber: "270" } });
      expect(screen.getByText(deckCopy.regionIntroPicked)).toBeInTheDocument();
      expect(screen.queryByText(copy.resetToDefault)).not.toBeInTheDocument();
    });

    it("shows no dormant tile for a pick no longer held", () => {
      renderRegion({ ...deck, preferred: { setCode: "MMQ", collectorNumber: "9" } });
      expect(screen.queryByText(copy.dormantBadge)).not.toBeInTheDocument();
      expect(screen.getAllByRole("radio")).toHaveLength(3);
    });

    it("announces the pick for this deck, once", () => {
      const { onAnnounce, onPick } = renderRegion(deck);
      fireEvent.click(screen.getByRole("radio", { name: /Limited Edition Alpha/ }));
      expect(onPick).toHaveBeenCalled();
      expect(onAnnounce).toHaveBeenCalledTimes(1);
      expect(onAnnounce).toHaveBeenCalledWith(deckCopy.announcePicked("Limited Edition Alpha", "270"));
    });

    it("draws a refused save as a status line", () => {
      renderRegion({ ...deck, notice: deckCopy.failed });
      expect(screen.getByRole("status")).toHaveTextContent(deckCopy.failed);
    });
  });

  describe(`overflow (past ${OVERFLOW_THRESHOLD})`, () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      printing({
        setCode: `S${i.toString().padStart(2, "0")}`,
        setName: `Set ${i}`,
        collectorNumber: `${i + 1}`,
        releasedAt: `20${(10 + i).toString()}-01-01`,
        finishes: i % 2 === 0 ? { nonfoil: 1 } : { foil: 1 },
      }),
    );

    it("renders no search or chips at or below the threshold", () => {
      renderRegion({ printings: many.slice(0, OVERFLOW_THRESHOLD) });
      expect(screen.queryByLabelText(copy.searchAriaLabel)).not.toBeInTheDocument();
    });

    it("renders search, finish chips and set headers past it", () => {
      renderRegion({ printings: many });
      expect(screen.getByLabelText(copy.searchAriaLabel)).toBeInTheDocument();
      expect(screen.getByText(copy.filterAll(20))).toBeInTheDocument();
      expect(screen.getByText(copy.filterFoil(10))).toBeInTheDocument();
      expect(screen.getByText(copy.filterNonFoil(10))).toBeInTheDocument();
      expect(screen.getByText(copy.groupSet("Set 0", "S00", 1))).toBeInTheDocument();
    });

    it("names and dates a set group from an owned sibling when the dormant tile opens it", () => {
      // The dormant entry knows only the set code, so a group it opens would header as a bare
      // code and sort as undated if it were the only source of the group's metadata.
      renderRegion({ printings: many, preferred: { setCode: "S05", collectorNumber: "0" } });
      expect(screen.getByText(copy.groupSet("Set 5", "S05", 2))).toBeInTheDocument();
      const headers = screen.getAllByText(/· S\d+ · \d+$/i).map((el) => el.textContent);
      expect(headers[0]).toBe(copy.groupSet("Set 19", "S19", 1));
    });

    it("orders set groups newest release first", () => {
      renderRegion({ printings: many });
      const headers = screen.getAllByText(/^SET \d+ · S\d+ · 1$/i).map((el) => el.textContent);
      expect(headers[0]).toBe(copy.groupSet("Set 19", "S19", 1));
    });

    it("filters on set name, code and collector number — never card name", () => {
      renderRegion({ printings: many });
      const field = screen.getByLabelText(copy.searchAriaLabel);
      fireEvent.change(field, { target: { value: "S07" } });
      expect(screen.getAllByRole("radio")).toHaveLength(1);
      fireEvent.change(field, { target: { value: "Arcane" } });
      expect(screen.getByText(copy.emptyTitle)).toBeInTheDocument();
    });

    // One rule for a search field that picks from a list (DECK INPUT UX): the first Escape clears a
    // typed search and stops there, so the card's dialog (listening on window) stays open.
    it("clears a typed search on Escape without letting the key reach the dialog", () => {
      renderRegion({ printings: many });
      const field = screen.getByLabelText(copy.searchAriaLabel);
      const reached = vi.fn();
      window.addEventListener("keydown", reached);
      fireEvent.change(field, { target: { value: "S07" } });
      fireEvent.keyDown(field, { key: "Escape" });
      expect(field).toHaveValue("");
      expect(reached).not.toHaveBeenCalled();
      fireEvent.keyDown(field, { key: "Escape" });
      expect(reached).toHaveBeenCalledTimes(1);
      window.removeEventListener("keydown", reached);
    });

    it("narrows to one finish and back", () => {
      renderRegion({ printings: many });
      fireEvent.click(screen.getByText(copy.filterFoil(10)));
      expect(screen.getAllByRole("radio")).toHaveLength(10);
      fireEvent.click(screen.getByText(copy.filterAll(20)));
      expect(screen.getAllByRole("radio")).toHaveLength(20);
    });

    it("counts the announcement through the active finish chip, not around it", () => {
      const { onAnnounce } = renderRegion({ printings: many });
      fireEvent.click(screen.getByText(copy.filterFoil(10)));
      // "1" matches S00's collector number 1 plus 1x, 12x…; only the foil ones are on screen.
      fireEvent.change(screen.getByLabelText(copy.searchAriaLabel), { target: { value: "1" } });
      const announced = onAnnounce.mock.calls.at(-1)?.[0];
      expect(announced).toBe(copy.announceMatches(screen.getAllByRole("radio").length, "1"));
    });

    it("keeps the dormant tile through a finish chip and a search that excludes it", () => {
      renderRegion({ printings: many, preferred: { setCode: "MMQ", collectorNumber: "9" } });
      const dormantTile = () => screen.queryByRole("radio", { name: copy.dormantAria("MMQ") });
      fireEvent.click(screen.getByText(copy.filterFoil(11)));
      expect(dormantTile()).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(copy.searchAriaLabel), { target: { value: "S07" } });
      // The note is still on screen, so stranding it above a grid without its tile would
      // leave the explanation pointing at nothing.
      expect(screen.getByText(copy.dormantNote("MMQ"))).toBeInTheDocument();
      expect(dormantTile()).toBeInTheDocument();
    });

    it("keeps the radiogroup and its id mounted when the search matches nothing", () => {
      const { container } = renderRegion({ printings: many });
      fireEvent.change(screen.getByLabelText(copy.searchAriaLabel), { target: { value: "zzz" } });
      expect(screen.getByText(copy.emptyTitle)).toBeInTheDocument();
      // The trigger's aria-controls names this element, so it must survive every branch.
      const group = container.querySelector("#printings");
      expect(group).toHaveAttribute("role", "radiogroup");
      expect(group).toHaveAttribute("aria-label", copy.regionLabel);
    });

    it("announces the match count as the query changes", () => {
      const { onAnnounce } = renderRegion({ printings: many });
      fireEvent.change(screen.getByLabelText(copy.searchAriaLabel), { target: { value: "S07" } });
      expect(onAnnounce).toHaveBeenCalledWith(copy.announceMatches(1, "S07"));
    });
  });

  describe("set abbreviation (#118)", () => {
    it("shows the set code alongside the name on every tile", () => {
      renderRegion();
      for (const code of ["C21", "LEA", "ZNR"]) {
        expect(screen.getByText(code)).toBeInTheDocument();
      }
    });

    it("carries the code in the tile's aria-label, so search-by-code is announced", () => {
      renderRegion();
      expect(
        screen.getByRole("radio", { name: /Commander 2021 \(C21\)/ }),
      ).toBeInTheDocument();
    });

    it("suppresses the code when the name IS the code, so the tile does not read it twice", () => {
      renderRegion({
        printings: [
          printing({ setCode: "MH3", setName: null }),
          printing({ setCode: "LEA", setName: "Limited Edition Alpha", collectorNumber: "270" }),
        ],
      });
      expect(screen.getAllByText("MH3")).toHaveLength(1);
    });
  });
});

describe("PrintingRegion reveals the tile the reader is looking for (motion U1)", () => {
  const printings = [
    printing(),
    printing({ setCode: "LEA", setName: "Limited Edition Alpha", collectorNumber: "270", releasedAt: "1993-08-05" }),
    printing({ setCode: "ZNR", setName: "Zendikar Rising", collectorNumber: "12", releasedAt: "2020-09-25" }),
  ];
  const region = (preferred: { setCode: string; collectorNumber: string } | null) => (
    <PrintingRegion
      id="printings"
      printings={printings}
      preferred={preferred}
      resolvedKey={printingKey(printings[0])}
      cardName="Arcane Signet"
      colorIdentity={[]}
      onPick={() => {}}
      onReset={() => {}}
      onForget={() => {}}
      onAnnounce={() => {}}
    />
  );
  const tileFor = (name: RegExp) => screen.getAllByRole("radio").find((r) => name.test(r.getAttribute("aria-label") ?? ""));

  // The About page's specimen draws this region on a page the reader is scrolling: it must not
  // move them to its tile (pre-open pass).
  it("reveals nothing for a still specimen, pick or no pick", () => {
    revealed.mockClear();
    const still = (preferred: { setCode: string; collectorNumber: string } | null) => {
      const el = region(preferred);
      return { ...el, props: { ...el.props, still: true } };
    };
    const { rerender } = render(still(null));
    rerender(still({ setCode: "LEA", collectorNumber: "270" }));
    expect(revealed).not.toHaveBeenCalled();
  });

  it("centered in the column on open (Hugh, 2026-10-12), and only brought into view after a pick or a Reset", () => {
    revealed.mockClear();
    const { rerender } = render(region(null));
    expect(revealed).toHaveBeenCalledTimes(1);
    expect(revealed).toHaveBeenLastCalledWith(tileFor(/Commander 2021/), "center", "center");
    // A pick lands on a tile the reader just pressed: it must not slide out from under the pointer.
    rerender(region({ setCode: "LEA", collectorNumber: "270" }));
    expect(revealed).toHaveBeenCalledTimes(2);
    expect(revealed).toHaveBeenLastCalledWith(tileFor(/Limited Edition Alpha/), "nearest", "center");
    rerender(region(null));
    expect(revealed).toHaveBeenCalledTimes(3);
    expect(revealed).toHaveBeenLastCalledWith(tileFor(/Commander 2021/), "nearest", "center");
  });
});

describe("PrintingRegion role=choose source=catalog", () => {
  const choice = (over: Partial<PrintingChoice> = {}): PrintingChoice => ({
    scryfallId: "id-1",
    setCode: "c21",
    setName: "Commander 2021",
    collectorNumber: "263",
    releasedAt: "2021-04-23",
    imageUri: null,
    flavorName: null,
    finishes: ["nonfoil", "foil"],
    owned: {},
    ...over,
  });
  const choices = [
    choice(),
    choice({ scryfallId: "id-2", setCode: "sld", setName: "Secret Lair", collectorNumber: "1512", owned: { foil: 2, nonfoil: 1 } }),
    choice({ scryfallId: "id-3", setCode: "cmm", setName: "Commander Masters", collectorNumber: "410" }),
  ];
  function renderChoose(over: Partial<Extract<React.ComponentProps<typeof PrintingRegion>, { role: "choose" }>> = {}) {
    const onPick = vi.fn();
    const utils = render(
      <PrintingRegion
        role="choose"
        source="catalog"
        id="choose"
        printings={choices}
        intro="Which printing are you adding? 3 printings."
        cardName="Sol Ring"
        colorIdentity={[]}
        onPick={onPick}
        {...over}
      />,
    );
    return { ...utils, onPick };
  }

  it("selects nothing, badges nothing and offers no reset", () => {
    renderChoose();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    for (const r of radios) expect(r).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByText(copy.badgePicked)).toBeNull();
    expect(screen.queryByText(copy.badgeShownNow)).toBeNull();
    expect(screen.queryByText(copy.resetToDefault)).toBeNull();
    expect(screen.getByText("Which printing are you adding? 3 printings.")).toBeInTheDocument();
  });

  it("says what the player holds, and nothing on a printing they do not", () => {
    renderChoose();
    expect(screen.getByText("#1512 \u00b7 you own \u00d73")).toBeInTheDocument();
    expect(screen.getByText("#263")).toBeInTheDocument();
  });

  it("hands back the catalog printing on a press, and only on a press", () => {
    const { onPick } = renderChoose();
    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: "ArrowRight" });
    expect(onPick).not.toHaveBeenCalled();
    expect(radios[1]).toHaveFocus();
    fireEvent.click(radios[1]);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0][0].scryfallId).toBe("id-2");
  });

  it("draws the phone's row without set headers, and no finish chips past the threshold", () => {
    const many = Array.from({ length: OVERFLOW_THRESHOLD + 3 }, (_, i) =>
      choice({ scryfallId: `m${i}`, setCode: `s${i}`, setName: `Set ${i}`, collectorNumber: String(i) }),
    );
    renderChoose({ printings: many, layout: "row" });
    expect(screen.getByPlaceholderText("Set, code or number")).toBeInTheDocument();
    expect(screen.queryByText(/^Foil \d+/)).toBeNull();
    expect(screen.queryByText(/Set 1 \u00b7 s1/)).toBeNull();
  });

  it("moves focus into its search when asked", () => {
    const many = Array.from({ length: OVERFLOW_THRESHOLD + 3 }, (_, i) =>
      choice({ scryfallId: `m${i}`, setCode: `s${i}`, collectorNumber: String(i) }),
    );
    renderChoose({ printings: many, autoFocus: true });
    expect(screen.getByPlaceholderText("Set, code or number")).toHaveFocus();
  });

  describe("controlled by `selected` (I got it's confirm)", () => {
    it("checks the selected tile with no badge and no label", () => {
      renderChoose({ selected: "id-2", layout: "row" });
      const radios = screen.getAllByRole("radio");
      expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
      expect(screen.queryByText(copy.badgePicked)).toBeNull();
      // The tab stop parks on the selection.
      expect(radios[1]).toHaveAttribute("tabindex", "0");
    });

    it("selects on an arrow key as well as a press, and the step stays open", () => {
      const { onPick } = renderChoose({ selected: "id-1", layout: "row" });
      const radios = screen.getAllByRole("radio");
      radios[0].focus();
      fireEvent.keyDown(radios[0], { key: "ArrowRight" });
      expect(onPick).toHaveBeenCalledTimes(1);
      expect(onPick.mock.calls[0][0].scryfallId).toBe("id-2");
      fireEvent.click(radios[2]);
      expect(onPick.mock.calls[1][0].scryfallId).toBe("id-3");
      expect(screen.getAllByRole("radio")).toHaveLength(3);
    });

    it("checks nothing when nothing is selected yet", () => {
      renderChoose({ selected: null, layout: "row", intro: undefined });
      for (const r of screen.getAllByRole("radio")) expect(r).toHaveAttribute("aria-checked", "false");
      expect(screen.queryByText("Which printing are you adding? 3 printings.")).toBeNull();
    });

    it("keeps the selected tile first while a search narrows it out", () => {
      const many = Array.from({ length: OVERFLOW_THRESHOLD + 3 }, (_, i) =>
        choice({ scryfallId: `m${i}`, setCode: `s${i}`, setName: `Set ${i}`, collectorNumber: String(i) }),
      );
      renderChoose({ printings: many, layout: "row", selected: "m4" });
      fireEvent.change(screen.getByPlaceholderText("Set, code or number"), { target: { value: "set 12" } });
      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(2);
      expect(radios[0]).toHaveAttribute("aria-checked", "true");
      expect(radios[0]).toHaveAccessibleName(/Set 4/);
      expect(radios[1]).toHaveAccessibleName(/Set 12/);
    });

    it("draws the confirm's tiles only when asked, leaving the sheet's as they were", () => {
      renderChoose({ selected: "id-1", layout: "row", tiles: "confirm" });
      const tile = screen.getAllByRole("radio")[0];
      expect(tile.className).toContain("md:w-[104px]");
      expect((tile.firstElementChild as HTMLElement).className).toContain("rounded-[9px]");
      expect(tile.parentElement!.className).toContain("pb-[2px]");
      cleanup();
      renderChoose({ layout: "row" });
      const sheetTile = screen.getAllByRole("radio")[0];
      expect(sheetTile.className).toContain("w-[96px]");
      expect((sheetTile.firstElementChild as HTMLElement).className).toContain("rounded-[10px]");
    });

    it("keys catalog tiles by id, so two variants sharing a set and number are two choices", () => {
      const twins = [
        choice({ scryfallId: "v-1", setCode: "sld", setName: "Secret Lair", collectorNumber: "1512" }),
        choice({ scryfallId: "v-2", setCode: "sld", setName: "Secret Lair", collectorNumber: "1512", finishes: ["foil"] }),
      ];
      const { onPick } = renderChoose({ printings: twins, layout: "row", selected: "v-2" });
      const radios = screen.getAllByRole("radio");
      expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true"]);
      fireEvent.click(radios[0]);
      expect(onPick.mock.calls[0][0].scryfallId).toBe("v-1");
      radios[1].focus();
      fireEvent.keyDown(radios[1], { key: "ArrowLeft" });
      expect(radios[0]).toHaveFocus();
      expect(onPick.mock.calls[1][0].scryfallId).toBe("v-1");
    });

    it("focuses the selected tile when asked", () => {
      renderChoose({ selected: "id-3", layout: "row", autoFocus: true });
      expect(screen.getAllByRole("radio")[2]).toHaveFocus();
    });

    it("focuses without the browser's own scroll, which would fight the reveal", () => {
      const focus = vi.spyOn(HTMLElement.prototype, "focus");
      renderChoose({ selected: "id-3", layout: "row", autoFocus: true });
      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      focus.mockRestore();
    });

    it("keeps the browser's own focus scroll when nothing is selected, since nothing is revealed", () => {
      const focus = vi.spyOn(HTMLElement.prototype, "focus");
      renderChoose({ layout: "row", autoFocus: true });
      expect(focus).toHaveBeenCalled();
      expect(focus).not.toHaveBeenCalledWith({ preventScroll: true });
      focus.mockRestore();
    });

    it("centers the selected tile on open and after a press, but not after an arrow key moved focus", () => {
      revealed.mockClear();
      const props = {
        role: "choose" as const, source: "catalog" as const, id: "choose", printings: choices, cardName: "Sol Ring",
        colorIdentity: [] as string[], onPick: () => {}, layout: "row" as const, tiles: "confirm" as const,
      };
      const { rerender } = render(<PrintingRegion {...props} selected="id-2" />);
      expect(revealed).toHaveBeenCalledTimes(1);
      expect(revealed).toHaveBeenLastCalledWith(screen.getAllByRole("radio")[1], "nearest", "center");
      // A press: the parent moves the selection.
      rerender(<PrintingRegion {...props} selected="id-3" />);
      expect(revealed).toHaveBeenCalledTimes(2);
      expect(revealed).toHaveBeenLastCalledWith(screen.getAllByRole("radio")[2], "nearest", "center");
      // An arrow key: focus already moved (and the browser scrolled with it), so no second scroll.
      fireEvent.keyDown(screen.getAllByRole("radio")[2], { key: "ArrowLeft" });
      rerender(<PrintingRegion {...props} selected="id-2" />);
      expect(revealed).toHaveBeenCalledTimes(2);
      // The next press reveals again.
      rerender(<PrintingRegion {...props} selected="id-1" />);
      expect(revealed).toHaveBeenCalledTimes(3);
    });

    it("reveals nothing while nothing is selected", () => {
      revealed.mockClear();
      renderChoose({ selected: null, layout: "row" });
      renderChoose({ layout: "row" });
      expect(revealed).not.toHaveBeenCalled();
    });
  });
});
