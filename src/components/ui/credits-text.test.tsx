import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
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

  it("L4: Get more credits is its own line under the spent line, a link to /credits", () => {
    render(<p><CreditsText text={`${creditsCopy.spent(5, null)}\n${creditsCopy.getMore}`} /></p>);
    expect(screen.getByRole("link", { name: /Get more credits/ })).toHaveAttribute("href", "/credits");
    expect(screen.getByRole("link", { name: creditsCopy.link })).toHaveAttribute("href", CREDITS_HREF);
  });

  it("L7: the expiry phrase at the end of a line is drawn in --warning, and nothing else is", () => {
    render(<p><CreditsText text="4 of 5 free · reset at 2:01 AM · 114 paid · 74 plan credits expire Nov 16" /></p>);
    const mark = screen.getByTestId("credit-expiring");
    expect(mark).toHaveTextContent("74 plan credits expire Nov 16");
    expect(mark).toHaveStyle({ color: "var(--warning)" });
  });

  it("L7: the phrase keeps --warning when a caller appends a tail after it", () => {
    const line = creditsCopy.afterLine("4 of 5 free · reset at 2:01 AM · 114 paid · 74 plan credits expire Nov 16", " · Nothing was changed");
    render(<p><CreditsText text={line} /></p>);
    expect(screen.getByTestId("credit-expiring")).toHaveTextContent("74 plan credits expire Nov 16");
  });

  it("a line with no expiry draws no warning", () => {
    render(<p><CreditsText text="4 of 5 left · reset at 2:01 AM" /></p>);
    expect(screen.queryByTestId("credit-expiring")).toBeNull();
  });

  it("a tail appended after a spent line with Get more credits keeps the link last", () => {
    const line = creditsCopy.withMore(creditsCopy.spent(5, null), true);
    const joined = creditsCopy.afterLine(line, " · Nothing was changed");
    expect(joined.endsWith(`\n${creditsCopy.getMore}`)).toBe(true);
    render(<p><CreditsText text={joined} /></p>);
    expect(screen.getByRole("link", { name: /Get more credits/ }).getAttribute("href")).toBe("/credits");
    expect(screen.getByText(/Nothing was changed/)).toBeTruthy();
    // Payments off: a plain append, no link.
    expect(creditsCopy.afterLine(creditsCopy.spent(5, null), " · x").endsWith(" · x")).toBe(true);
  });

  describe("the welcome lot's tail (welcome credits G4, G5)", () => {
    const line = "0 of 1 free · reset at 2:01 AM · this run uses 1 of 9 welcome · 9 welcome credits expire Nov 20";

    it("draws it in --warning once hydrated, and nothing else", () => {
      render(<p data-testid="line"><CreditsText text={line} /></p>);
      const mark = screen.getByTestId("credit-expiring");
      expect(mark).toHaveTextContent("9 welcome credits expire Nov 20");
      expect(mark).toHaveStyle({ color: "var(--warning)" });
      expect(screen.getByTestId("line").textContent).toBe(line);
    });

    it("holds the whole tail, its separator included, out of the server's render: the date is the reader's day", () => {
      const html = renderToString(<p><CreditsText text={line} /></p>);
      expect(html).not.toContain("welcome credits expire");
      expect(html).toContain("this run uses 1 of 9 welcome</p>");
    });

    it("draws both tails when a plan's follows it, each in --warning, keeping the line's words in order", () => {
      const both = `${line} · 74 plan credits expire Nov 19.`;
      render(<p data-testid="line"><CreditsText text={both} /></p>);
      expect(screen.getAllByTestId("credit-expiring").map((e) => e.textContent)).toEqual(["9 welcome credits expire Nov 20", "74 plan credits expire Nov 19"]);
      expect(screen.getByTestId("line").textContent).toBe(both);
    });
  });
});
