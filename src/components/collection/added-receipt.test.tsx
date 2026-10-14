import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));

const { AddedReceipt } = await import("./added-receipt");

describe("AddedReceipt", () => {
  it("draws the title, body, counts, the History link and the caller's actions", () => {
    render(
      <AddedReceipt title="100 copies added" body="99 cards are in your collection now." counts="4,492 → 4,592 cards" went={null} historyHref="/collection/history?entry=e1" historyLabel="See it in History">
        <button type="button">Undo</button>
      </AddedReceipt>,
    );
    expect(screen.getByText("100 copies added")).toBeInTheDocument();
    expect(screen.getByText("99 cards are in your collection now.")).toBeInTheDocument();
    expect(screen.getByText("4,492 → 4,592 cards")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See it in History" })).toHaveAttribute("href", "/collection/history?entry=e1");
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("draws a counts line of 0 → N as the sheet's first save does", () => {
    render(<AddedReceipt title="t" body="b" counts="0 → 3 cards" went={null} historyHref="/h" historyLabel="History" />);
    expect(screen.getByText("0 → 3 cards")).toBeInTheDocument();
  });

  it("leaves the counts line out when the caller does not know the size before", () => {
    render(<AddedReceipt title="t" body="b" went={null} historyHref="/h" historyLabel="History" />);
    expect(screen.queryByText(/→/)).toBeNull();
  });
});
