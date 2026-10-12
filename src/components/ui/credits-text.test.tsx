import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CREDITS_HREF, creditsCopy } from "../../lib/copy/credits";
import { creditLine } from "./credit-line-matcher";
import { CreditsText } from "./credits-text";

describe("CreditsText", () => {
  it("draws the link phrase as a link to the About credits entry, and the rest as text", () => {
    const line = creditsCopy.spent(5, null);
    render(<p>{"Ready · "}<CreditsText text={line} /></p>);
    const link = screen.getByRole("link", { name: creditsCopy.link });
    expect(link).toHaveAttribute("href", CREDITS_HREF);
    expect(screen.getByText(creditLine(`Ready · ${line}`))).toBeInTheDocument();
  });

  it("draws a line without the phrase as it is, with no link", () => {
    render(<p><CreditsText text="Uses a credit. 4 of 5 left." /></p>);
    expect(screen.getByText("Uses a credit. 4 of 5 left.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links the phrase wherever it sits in a joined line", () => {
    render(<p><CreditsText text={`${creditsCopy.spent(5, null)} · Nothing was changed.`} /></p>);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
