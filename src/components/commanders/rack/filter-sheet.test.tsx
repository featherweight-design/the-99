// The plan wrote these six with `@testing-library/user-event`, which this repo
// does not depend on (see theme-picker.test.tsx). The assertions are the plan's,
// verbatim; only the two interactions are fireEvent instead. The Esc case aims
// the key at whatever holds focus, so it still fails if the sheet never took it.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultParams } from "@/lib/commanders/lane-params";
import { commandersCopy } from "@/lib/copy/lanes";
import { FilterSheet } from "./filter-sheet";
import { resultLineWithAside } from "./result-line";

describe("FilterSheet", () => {
  // Discover's only sheet control is colour: order is on the persistent row
  // behind the scrim, and availability belongs to the other lane.
  it("leads with colour on the discover lane, and mounts nothing else", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("discover")} lane="discover" onChange={() => {}} shown={3301} resultLine="3301 of 3301" />,
    );
    const legends = screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"));
    expect(legends).toEqual(["Color identity"]);
  });

  // Reported as redundant: two doors to one control, with one of them behind a
  // scrim hiding the other.
  it("keeps order out of the sheet, on both lanes", () => {
    for (const lane of ["owned", "discover"] as const) {
      const { unmount } = render(
        <FilterSheet open onOpenChange={() => {}} params={defaultParams(lane)} lane={lane} onChange={() => {}} shown={9} resultLine="9 of 9" />,
      );
      expect(screen.queryByRole("radiogroup", { name: "Order" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Order · / })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("keeps search out of the sheet, which is why the badge does not count it", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={148} resultLine="148 of 148" />,
    );
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  // The rack drops this line because the two segments sit side by side there.
  // In the sheet the contrast has to be said, so the sheet is where it is tested.
  it("carries the availability explainer the rack leaves out", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={148} resultLine="148 of 148" />,
    );
    expect(screen.getByText(commandersCopy.availability.hint)).toBeInTheDocument();
  });

  it("labels the footer with the live count", () => {
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={4} resultLine="4 of 148" />,
    );
    expect(screen.getByRole("button", { name: "Show 4 commanders" })).toBeInTheDocument();
  });

  // The header answers the same question the result line behind the scrim does,
  // in the same words, so the two counts can never be read as disagreeing.
  it("heads the sheet with the live result sentence, not the filter count", () => {
    const line = resultLineWithAside(4, 148, "owned", null, null);
    render(
      <FilterSheet open onOpenChange={() => {}} params={{ ...defaultParams("owned"), colors: ["b"] }} lane="owned" onChange={() => {}} shown={4} resultLine={line} />,
    );
    expect(screen.getByText("4 of 148 commanders match")).toBeInTheDocument();
  });

  // The header's own promise is that it says what the result line behind the
  // scrim says. It recomposed the sentence for itself instead, so both asides
  // went missing the moment the reader opened Filters — and in the compact form
  // that is the ONLY place four of the lane's controls exist, so the phone lost the
  // explanation entirely while the desktop kept it.
  it("carries the rack's asides, not just its sentence", () => {
    const line = resultLineWithAside(12, 12, "owned", null, 3);
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={12} resultLine={line} />,
    );
    expect(
      screen.getByText(/3 more are sleeved into decks you've built/),
    ).toBeInTheDocument();
  });

  // The rack mounts this sheet only while it is open, so a reopening is a fresh
  // mount and starts silent whatever the sentence says. Asserted as the unmount
  // the rack performs, not as an `open={false}` rerender, because that is the
  // lifecycle the component actually has — and it is the whole reason it no
  // longer tracks an announcement's identity by hand.
  it("starts silent on a reopening, even on the count it last announced", async () => {
    const sheet = (shown: number) => (
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={shown} resultLine={resultLineWithAside(shown, 148, "owned", null, null)} />
    );
    const first = render(sheet(148));
    first.rerender(sheet(12));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/12/));
    first.unmount();

    render(sheet(12));
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("applies a tap immediately rather than staging it behind an Apply", () => {
    const onChange = vi.fn();
    render(
      <FilterSheet open onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={onChange} shown={148} resultLine="148 of 148" />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Free cards only" }));
    expect(onChange).toHaveBeenCalled();
  });

  it("dismisses on Esc without reverting", () => {
    const onOpenChange = vi.fn();
    const onChange = vi.fn();
    render(
      <FilterSheet open onOpenChange={onOpenChange} params={{ ...defaultParams("owned"), avail: "free" }} lane="owned" onChange={onChange} shown={4} resultLine="4 of 148" />,
    );
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders nothing when closed, leaving no duplicate controls in the a11y tree", () => {
    const { container } = render(
      <FilterSheet open={false} onOpenChange={() => {}} params={defaultParams("owned")} lane="owned" onChange={() => {}} shown={148} resultLine="148 of 148" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
