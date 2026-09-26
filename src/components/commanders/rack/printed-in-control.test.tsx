import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultParams } from "@/lib/commanders/lane-params";
import type { PrintedInOption } from "@/lib/commanders/printed-in-lane";
import { commandersCopy, filterCopy } from "@/lib/copy/lanes";
import { chipsFor, printedInLabel } from "./chip-line";
import { FilterSheet } from "./filter-sheet";
import { PrintedInControl } from "./printed-in-control";

const options: PrintedInOption[] = [
  { code: "hob", label: "The Hobbit", hint: "HOB", count: 12, disabled: false },
  { code: "cmm", label: "Commander Masters", hint: "CMM", count: 0, disabled: true },
];

describe("PrintedInControl, sheet form", () => {
  it("draws a row saying what is chosen, and opens the set list over the sheet", () => {
    render(<PrintedInControl form="sheet" options={options} selected={[]} onChange={() => {}} shown={40} total={40} />);
    const row = screen.getByTestId("printed-in-row");
    expect(row).toHaveTextContent(filterCopy.printedIn.rowAny);
    fireEvent.click(row);
    const layer = screen.getByRole("dialog", { name: "Filter by printed-in set" });
    // Portalled: outside the row's own subtree, so an inert filter sheet cannot take it along.
    expect(row.parentElement?.contains(layer)).toBe(false);
    expect(within(layer).getByText(filterCopy.printedIn.hint)).toBeInTheDocument();
  });

  it("names the one chosen set by its name, and several by their codes", () => {
    const { rerender } = render(
      <PrintedInControl form="sheet" options={options} selected={["hob"]} onChange={() => {}} shown={1} total={40} />,
    );
    expect(screen.getByTestId("printed-in-row")).toHaveTextContent("The Hobbit");
    rerender(<PrintedInControl form="sheet" options={options} selected={["hob", "cmm"]} onChange={() => {}} shown={1} total={40} />);
    expect(screen.getByTestId("printed-in-row")).toHaveTextContent("Printed in HOB, CMM");
  });

  it("toggles a set, and leaves a set the other filters empty untickable", () => {
    const onChange = vi.fn();
    render(<PrintedInControl form="sheet" options={options} selected={[]} onChange={onChange} shown={40} total={40} />);
    fireEvent.click(screen.getByTestId("printed-in-row"));
    const layer = screen.getByRole("dialog", { name: "Filter by printed-in set" });
    fireEvent.click(within(layer).getByRole("switch", { name: /The Hobbit/ }));
    expect(onChange).toHaveBeenLastCalledWith(["hob"]);
    fireEvent.click(within(layer).getByRole("switch", { name: /Commander Masters/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  // The filter sheet closes on Escape from its own onKeyDown, and a portal still bubbles through
  // the React tree. Without the stop, Escape in the set list would close BOTH layers.
  it("keeps its keys from reaching the sheet it sits over", () => {
    const sheetKeys = vi.fn();
    render(
      <div onKeyDown={sheetKeys}>
        <PrintedInControl form="sheet" options={options} selected={[]} onChange={() => {}} shown={40} total={40} />
      </div>,
    );
    fireEvent.click(screen.getByTestId("printed-in-row"));
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Filter by printed-in set" }), { key: "Escape" });
    expect(sheetKeys).not.toHaveBeenCalled();
  });
});

describe("PrintedInControl in the filter sheet", () => {
  it("sits after the colours, and makes the sheet inert while its list is up", () => {
    render(
      <FilterSheet
        open
        onOpenChange={() => {}}
        params={defaultParams("discover")}
        lane="discover"
        onChange={() => {}}
        shown={9}
        resultLine="9 of 9"
        printedInOptions={options}
      />,
    );
    const legends = screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"));
    expect(legends).toEqual(["Color identity", filterCopy.printedIn.legend]);
    const sheet = screen.getByRole("dialog", { name: filterCopy.sheet.title });
    expect(sheet).not.toHaveAttribute("inert");
    fireEvent.click(screen.getByTestId("printed-in-row"));
    expect(sheet).toHaveAttribute("inert");
  });

  // The owned lane reads search · colour · printed-in · score-against, and Build from carries the
  // hint line, so it goes last (sheet order rule 4).
  it("sits before Build from on the owned lane", () => {
    render(
      <FilterSheet
        open
        onOpenChange={() => {}}
        params={defaultParams("owned")}
        lane="owned"
        onChange={() => {}}
        shown={9}
        resultLine="9 of 9"
        printedInOptions={options}
      />,
    );
    const legends = screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"));
    expect(legends).toEqual(["Color identity", filterCopy.printedIn.legend, commandersCopy.availability.legend]);
  });

  it("is not drawn where the lane shipped no index", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={9} resultLine="9 of 9" />,
    );
    expect(screen.queryByTestId("printed-in-row")).not.toBeInTheDocument();
  });
});

describe("the Printed in chip", () => {
  it("is one chip, by code up to two sets and by count past that, and removing it clears it", () => {
    expect(printedInLabel(["hob"])).toBe("Printed in HOB");
    expect(printedInLabel(["hob", "hoc"])).toBe("Printed in HOB, HOC");
    expect(printedInLabel(["hob", "hoc", "cmm"])).toBe("Printed in 3 sets");
    const chips = chipsFor({ ...defaultParams("discover"), printedIn: ["hob", "hoc", "cmm"] }, "discover");
    expect(chips).toHaveLength(1);
    // In dimension order, not click order: after the colours, before Build from.
    const all = chipsFor({ ...defaultParams("owned"), colors: ["g"], avail: "free", printedIn: ["hob"] }, "owned");
    expect(all.map((c) => c.key)).toEqual(["colors", "printedIn", "avail"]);
    expect(chips[0]).toMatchObject({ key: "printedIn", spoken: "Printed in HOB, HOC, CMM", next: { printedIn: [] } });
  });
});
