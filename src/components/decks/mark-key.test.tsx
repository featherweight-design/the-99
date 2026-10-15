import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkKey } from "./mark-key";
import { proxyCopy } from "../../lib/copy/proxies";

describe("the mark key", () => {
  const proxy = { id: "proxy", sample: <span>P</span>, word: proxyCopy.key.proxy };
  const buy = { id: "buy", sample: <span>$</span>, word: proxyCopy.key.buy };

  it("renders nothing at all when the view has no marks", () => {
    // An empty legend is furniture. Not an empty box, not a hidden one — absent.
    const { container } = render(<MarkKey marks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("lists only the marks it was given", () => {
    render(<MarkKey marks={[proxy]} />);
    expect(screen.getByText(proxyCopy.key.proxy)).toBeTruthy();
    // The view has no unowned card, so the money mark is not decoded here.
    expect(screen.queryByText(proxyCopy.key.buy)).toBeNull();
  });

  it("decodes both when both are present", () => {
    render(<MarkKey marks={[buy, proxy]} />);
    expect(screen.getByText(proxyCopy.key.buy)).toBeTruthy();
    expect(screen.getByText(proxyCopy.key.proxy)).toBeTruthy();
  });

  it("omits the about-page link while that page does not exist", () => {
    // Absent rather than dead: a link to a 404 teaches nothing.
    render(<MarkKey marks={[proxy]} />);
    expect(screen.queryByText(proxyCopy.key.about)).toBeNull();
  });

  it("does not repeat each mark's own spoken word", () => {
    // The samples are the components the rows draw, so each carries its own
    // `sr-only` word. Spoken here they would read twice, and the key would
    // become a second copy of the row vocabulary in the reading order.
    const { container } = render(<MarkKey marks={[{ ...proxy, sample: <span>speak me</span> }]} />);
    // Drawn but not spoken. `queryByText` finds `aria-hidden` text, so the
    // assertion is on the attribute rather than on findability.
    expect(container.textContent).toContain("speak me");
    const sample = screen.getByText("speak me").closest("[aria-hidden='true']");
    expect(sample).not.toBeNull();
  });

  it("names itself, since every glyph inside it is drawn rather than spoken", () => {
    render(<MarkKey marks={[proxy]} />);
    expect(screen.getByRole("group", { name: proxyCopy.key.regionAria })).toBeTruthy();
  });

  it("sets its entries in equal columns on the phone only when asked (H7)", () => {
    const { rerender } = render(<MarkKey marks={[proxy, buy]} phoneColumns={2} />);
    const group = screen.getByRole("group", { name: proxyCopy.key.regionAria });
    expect(group.className).toMatch(/(^|\s)grid grid-cols-2/);
    expect(group.className).toMatch(/md:flex md:flex-wrap/);
    rerender(<MarkKey marks={[proxy, buy]} />);
    // Every other key keeps the wrapping line.
    expect(screen.getByRole("group", { name: proxyCopy.key.regionAria }).className).not.toMatch(/grid/);
  });

  it("sets each sample in a flex box, so an inline sample cannot grow the line by a baseline strut", () => {
    const { container } = render(<MarkKey marks={[proxy]} />);
    const sample = container.querySelector('[aria-hidden="true"]');
    expect(sample?.className).toMatch(/(^|\s)inline-flex(\s|$)/);
    expect(sample?.className).toMatch(/items-center/);
  });
});
