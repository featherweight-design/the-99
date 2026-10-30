import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KARSTEN_ARTICLE_URL, manaBalanceCopy } from "../../lib/copy/mana-balance";
import { KarstenCitation, NeedsExplainer } from "./mana-evidence";

afterEach(cleanup);

describe("the TCGplayer article link", () => {
  it.each([
    ["the citation", () => render(<KarstenCitation landOnly={false} />)],
    ["What Needs means", () => {
      render(<NeedsExplainer />);
      fireEvent.click(screen.getByRole("button", { name: manaBalanceCopy.needs.toggle }));
    }],
  ])("in %s ends in the shared link-out icon, bound to its word", (_, draw) => {
    draw();
    const link = screen.getByRole("link", { name: manaBalanceCopy.newTab(manaBalanceCopy.cite.link) });
    expect(link).toHaveAttribute("href", KARSTEN_ARTICLE_URL);
    expect(link.querySelector("svg[data-link-out]")).not.toBeNull();
    expect(link.querySelectorAll("svg")).toHaveLength(1);
    expect(link.className.split(/\s+/)).toContain("whitespace-nowrap");
  });
});
