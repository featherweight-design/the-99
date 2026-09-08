// The plan wrote these six with `@testing-library/user-event`, which this repo
// does not depend on (see theme-picker.test.tsx). The assertions are the plan's,
// verbatim; only the two interactions are fireEvent instead. The Esc case aims
// the key at whatever holds focus, so it still fails if the sheet never took it.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultParams } from "@/lib/commanders/lane-params";
import { commandersCopy } from "@/lib/copy/lanes";
import { FilterSheet } from "./filter-sheet";

describe("FilterSheet", () => {
  it("puts scope first on the discover lane", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("discover")} lane="discover" onChange={() => {}} shown={3301} total={3301} />,
    );
    const legends = screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"));
    expect(legends[0]).toBe("Scope");
  });

  it("keeps search out of the sheet, which is why the badge does not count it", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={148} total={148} />,
    );
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  // The rack drops this line because the two segments sit side by side there.
  // In the sheet the contrast has to be said, so the sheet is where it is tested.
  it("carries the availability explainer the rack leaves out", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={148} total={148} />,
    );
    expect(screen.getByText(commandersCopy.availability.hint)).toBeInTheDocument();
  });

  it("labels the footer with the live count", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={4} total={148} />,
    );
    expect(screen.getByRole("button", { name: "Show 4 commanders" })).toBeInTheDocument();
  });

  // The header answers the same question the result line behind the scrim does,
  // in the same words, so the two counts can never be read as disagreeing.
  it("heads the sheet with the live result sentence, not the filter count", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={{ ...defaultParams("owned"), colors: ["b"] }} lane="owned" onChange={() => {}} shown={4} total={148} />,
    );
    expect(screen.getByText("4 of 148 commanders match")).toBeInTheDocument();
  });

  it("applies a tap immediately rather than staging it behind an Apply", () => {
    const onChange = vi.fn();
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={onChange} shown={148} total={148} />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Free cards only" }));
    expect(onChange).toHaveBeenCalled();
  });

  it("dismisses on Esc without reverting", () => {
    const onOpenChange = vi.fn();
    const onChange = vi.fn();
    render(
      <FilterSheet open onOpenChange={onOpenChange} params={{ ...defaultParams("owned"), avail: "free" }} lane="owned" onChange={onChange} shown={4} total={148} />,
    );
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders nothing when closed, leaving no duplicate controls in the a11y tree", () => {
    const { container } = render(
      <FilterSheet open={false} onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={148} total={148} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
