import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OwnershipDot } from "./ownership-dot";

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
    expect(el.className).toContain("[border:1px_dashed_#6E6353]");
  });

  // The three call sites size the dot differently (7px responsive, 8px, 7px),
  // so the primitive owns colour and shape only and sizing arrives by class.
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

  it("carries colour in classes, not inline style", () => {
    const el = renderDot(<OwnershipDot owned={false} />);
    expect(el.getAttribute("style")).toBeNull();
  });
});
