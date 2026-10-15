import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UploadChoiceFigureBody } from "./collection-edit-figures";

// About's specimen draws the upload step inert, in a plate: a phone-sized frame whose body scrolls would clip its
// lower cards where nobody can scroll to them, so the figure is drawn at its natural height.
describe("UploadChoiceFigureBody", () => {
  it("draws the step at its natural height, with no scrolling frame, body region or sticky foot", () => {
    const { container } = render(<UploadChoiceFigureBody sync />);
    const html = container.innerHTML;
    expect(html).not.toContain("max-md:h-[calc(");
    expect(html).not.toContain("max-md:overflow-y-auto");
    expect(container.querySelector("[role=region]")).toBeNull();
    expect(html).not.toContain("md:sticky");
  });
});
