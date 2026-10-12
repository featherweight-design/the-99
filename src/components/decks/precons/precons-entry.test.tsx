import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreconsEntry } from "./precons-entry";
import { preconDate, preconsCopy } from "../../../lib/copy/precons";

vi.mock("next/link", () => ({
  useLinkStatus: () => ({ pending: false }),
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const copy = preconsCopy.door;

describe("PreconsEntry (P1, P2)", () => {
  it("opens the list and draws both widths' line with its meta", () => {
    render(<PreconsEntry summary={{ count: 181, newest: "2026-09-26" }} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/decks/precons");
    expect(link.textContent).toContain(copy.line);
    expect(link.textContent).toContain(copy.lineMeta(181, preconDate("2026-09-26")));
    expect(link.textContent).toContain(copy.linePhone);
    expect(link.textContent).toContain(copy.lineMetaPhone(181));
  });

  it("keeps the line and drops the meta when the summary could not be read", () => {
    render(<PreconsEntry summary={null} />);
    const link = screen.getByRole("link");
    expect(link.textContent).toContain(copy.line);
    expect(link.textContent).not.toContain("decklist");
  });
});
