import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AvailabilityDot,
  LegendPip,
  OwnershipDot,
  availabilityDotState,
} from "./ownership-dot";

function renderDot(ui: React.ReactElement) {
  const { container } = render(ui);
  return container.firstElementChild as HTMLElement;
}

describe("OwnershipDot", () => {
  it("fills with the success token when owned", () => {
    const el = renderDot(<OwnershipDot owned />);
    expect(el.className).toContain("bg-[color:var(--success)]");
    expect(el.className).toContain("[border:1px_solid_var(--success)]");
  });

  it("renders a dashed hollow ring when unowned", () => {
    const el = renderDot(<OwnershipDot owned={false} />);
    expect(el.className).toContain("bg-transparent");
    expect(el.className).toContain("[border:1px_dashed_var(--fg-locked)]");
  });

  // The three call sites size the dot differently (7px responsive, 8px, 7px),
  // so the primitive owns color and shape only and sizing arrives by class.
  it("merges caller sizing classes", () => {
    const el = renderDot(
      <OwnershipDot owned className="w-[7px] h-[7px] md:w-[8px]" />,
    );
    expect(el.className).toContain("w-[7px]");
    expect(el.className).toContain("md:w-[8px]");
    expect(el.className).toContain("rounded-full");
  });

  it("is hidden from assistive tech when no label is given", () => {
    const el = renderDot(<OwnershipDot owned />);
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.getAttribute("aria-label")).toBeNull();
  });

  // The decklist row announces ownership per card; the suggestion card and the
  // export dialog convey it in adjacent text and keep the dot decorative.
  it("exposes a label to assistive tech when one is given", () => {
    const el = renderDot(<OwnershipDot owned label="Owned" />);
    expect(el.getAttribute("aria-label")).toBe("Owned");
    expect(el.getAttribute("aria-hidden")).toBeNull();
  });

  it("carries color in classes, not inline style", () => {
    const el = renderDot(<OwnershipDot owned={false} />);
    expect(el.getAttribute("style")).toBeNull();
  });

  it("moves hue only for committed, so the third state costs no width", () => {
    const el = renderDot(<OwnershipDot owned committed />);
    expect(el.className).toContain("bg-[color:var(--avail-hard-fg)]");
    expect(el.className).toContain("[border:1px_solid_var(--avail-hard-fg)]");
    expect(el.className).not.toContain("bg-transparent");
  });

  // The constraint the card-rows handoff put on the third state: adding it must
  // not change what an existing caller draws.
  it("still gives a caller passing owned alone exactly two states", () => {
    expect(renderDot(<OwnershipDot owned />).className).toBe(
      renderDot(<OwnershipDot owned committed={false} />).className,
    );
    expect(renderDot(<OwnershipDot owned={false} />).className).toBe(
      renderDot(<OwnershipDot owned={false} committed />).className,
    );
  });

  it("sizes inline only when a caller computes the size", () => {
    expect(renderDot(<OwnershipDot owned size={7} />).style.width).toBe("7px");
    expect(renderDot(<OwnershipDot owned />).getAttribute("style")).toBeNull();
  });
});

describe("availabilityDotState", () => {
  it("reads unowned before it reads the commitment", () => {
    expect(availabilityDotState({ owned: false, committedTo: "Atraxa" })).toBe("unowned");
  });

  it("is free with no deck and committed with one", () => {
    expect(availabilityDotState({ owned: true, committedTo: null })).toBe("free");
    expect(availabilityDotState({ owned: true, committedTo: "Atraxa" })).toBe("committed");
  });

  // The commander payloads omit `owned` where every card is owned by
  // construction, and an absent flag must not read as unowned.
  it("treats an absent owned flag as owned", () => {
    expect(availabilityDotState({ committedTo: null })).toBe("free");
  });
});

describe("AvailabilityDot", () => {
  it("draws unowned dashed, not as a solid hollow ring", () => {
    const el = renderDot(<AvailabilityDot state="unowned" size={7} />);
    expect(el.className).toContain("[border:1px_dashed_var(--fg-locked)]");
    expect(el.className).toContain("bg-transparent");
  });

  it("draws committed at the availability token", () => {
    const el = renderDot(<AvailabilityDot state="committed" size={7} />);
    expect(el.className).toContain("bg-[color:var(--avail-hard-fg)]");
  });

  it("is decorative, because the row states availability in words beside it", () => {
    expect(renderDot(<AvailabilityDot state="free" size={6} />).getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});

describe("LegendPip", () => {
  // The legend renders the dot rather than naming its colour, because
  // `--avail-hard-fg` is redefined by all six themes.
  it("renders the shared dot and stays hidden from assistive tech", () => {
    const { container } = render(<LegendPip state="committed" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("aria-hidden")).toBe("true");
    expect((wrapper.firstElementChild as HTMLElement).className).toContain(
      "bg-[color:var(--avail-hard-fg)]",
    );
  });
});
