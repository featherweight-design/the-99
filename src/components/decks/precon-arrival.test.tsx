import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreconArrivalBand } from "./arrival-strip";

const arrival = { name: "Eldrazi Unbound", setCode: "CMM", cards: 100, unmapped: 0, owned: 74, of: 85 };

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));

describe("PreconArrivalBand (precons S2, S2b)", () => {
  it("names the precon and what you own: no Shopping line, no printings line, no draft claim", () => {
    render(<PreconArrivalBand onDismiss={() => {}} arrival={arrival} />);
    expect(screen.getByText("Started from the Eldrazi Unbound precon")).toBeInTheDocument();
    expect(screen.getByText("You own 74 of its 85.")).toBeInTheDocument();
    expect(screen.queryByText(/Shopping/)).toBeNull();
    expect(screen.queryByText(/printings/)).toBeNull();
    // The board's `.mt` line: mono and faint, and one row with the head from md.
    const body = screen.getByText("You own 74 of its 85.");
    expect(body.className).toContain("font-mono");
    expect(body.parentElement!.className).toContain("md:flex-row");
    expect(screen.queryByText(/draft/i)).toBeNull();
    expect(screen.queryByRole("link", { name: "History" })).toBeNull();
  });

  it("says the cards were added, and links the History entry, when the start added them", () => {
    render(<PreconArrivalBand onDismiss={() => {}} arrival={arrival} added={{ entryId: "e1" }} />);
    expect(screen.getByText(/^All 100 cards added to your collection\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/collection/history?entry=e1");
    expect(screen.queryByText(/Shopping/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("says what the catalog lacks when it could not map every card, added or not", () => {
    const { rerender } = render(<PreconArrivalBand onDismiss={() => {}} arrival={{ ...arrival, cards: 99, unmapped: 1 }} />);
    expect(screen.getByText(/1 card isn’t in our catalog yet\./)).toBeInTheDocument();
    rerender(<PreconArrivalBand onDismiss={() => {}} arrival={{ ...arrival, cards: 99, unmapped: 2 }} added={{ entryId: "e1" }} />);
    expect(screen.getByText(/^99 cards added to your collection\. 2 cards aren’t in our catalog yet\./)).toBeInTheDocument();
  });

  it("drops the Shopping clause when you own every card", () => {
    render(<PreconArrivalBand onDismiss={() => {}} arrival={{ ...arrival, owned: 85 }} />);
    expect(screen.getByText("You own every card.")).toBeInTheDocument();
    expect(screen.queryByText(/Shopping/)).toBeNull();
  });

  it("puts the ✓ at the top-left, level with the head, and keeps the dismiss at the end", () => {
    render(<PreconArrivalBand onDismiss={() => {}} arrival={arrival} />);
    const mark = screen.getByText("✓");
    expect(mark.className).toContain("mt-[3px]");
    expect(mark.parentElement!.className).toContain("items-start");
  });
});
