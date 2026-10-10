import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowsePrinting } from "../../lib/collection/browse";
import type { PrintingChoice } from "../../lib/collection/catalog-read";
import { printingPickerCopy } from "../../lib/copy/collection";
import { PrintingRegion, OVERFLOW_THRESHOLD, printingKey } from "./printing-region";

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
});
