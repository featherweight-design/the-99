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

  it("names itself, since every glyph inside it is drawn rather than spoken", () => {
    render(<MarkKey marks={[proxy]} />);
    expect(screen.getByRole("group", { name: proxyCopy.key.regionAria })).toBeTruthy();
  });
});
