import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  KeyPip,
  OwnershipDot,
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

describe("KeyPip", () => {
  // The key renders the dot rather than naming a colour: `--success` is now
  // redefined by Canopy, so a test naming a hex would be true in five themes.
  //
  // Two states, not three. The committed pip retired with the three-state dot —
  // severity is the marker's job, and the key no longer has a word for it.
  it("renders the owned dot and stays hidden from assistive tech", () => {
    const { container } = render(<KeyPip owned />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.getAttribute("aria-hidden")).toBe("true");
    expect((wrapper.firstElementChild as HTMLElement).className).toContain(
      "bg-[color:var(--success)]",
    );
  });

  it("renders the unowned dot dashed and hollow", () => {
    const { container } = render(<KeyPip owned={false} />);
    const dot = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(dot.className).toContain("bg-transparent");
    expect(dot.className).toContain("border:1px_dashed_var(--fg-locked)");
  });

  // The offsets `LegendPip` carried, reproduced rather than re-derived: a 6px
  // circle sits low against 10.5px mono, and Design flagged this baseline as
  // unverified, so drift here is drift nobody measured.
  it("keeps the inline offsets the legend has always had", () => {
    const { container } = render(<KeyPip owned />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.marginRight).toBe("5px");
    expect(wrapper.style.top).toBe("-0.5px");
    expect(wrapper.style.verticalAlign).toBe("baseline");
  });
});
