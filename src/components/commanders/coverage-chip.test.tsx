// CoverageChip, CoverageRow, CoverageDisclosure — tests (#131).
// Mock pattern follows card-detail-surfaces.test.tsx.

import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { CoverageChip, CoverageDisclosure, CoverageRow } from "./coverage-chip";
import type { RoleCard } from "../../lib/recs/score";

// Stub fetch used by CardDetailProvider in all tests.
function renderInProvider(ui: React.ReactNode) {
  const fetchCard = vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null);
  render(<CardDetailProvider fetchCard={fetchCard}>{ui}</CardDetailProvider>);
  return { fetchCard };
}

const card = (overrides: Partial<RoleCard> = {}): RoleCard => ({
  oracleId: "oracle-sol",
  name: "Sol Ring",
  inclusionPct: 82,
  ...overrides,
});

const siblings = ["oracle-sol", "oracle-signet"];

describe("CoverageChip", () => {
  it("prints its figure and includes it in the accessible name", () => {
    renderInProvider(
      <CoverageChip card={card()} siblings={siblings} showFigures />,
    );
    // The figure plate is visible text.
    expect(screen.getByText("82%")).toBeInTheDocument();
    // The accessible name on the button carries both name and figure.
    expect(
      screen.getByRole("button", { name: /Sol Ring.*In 82% of decks/i }),
    ).toBeInTheDocument();
  });

  it("prints an aria-hidden em dash and says 'No EDHREC figure' in accessible name when inclusionPct is null", () => {
    renderInProvider(
      <CoverageChip card={card({ inclusionPct: null })} siblings={siblings} showFigures />,
    );
    // The em dash must be present (aria-hidden).
    const dash = screen.getByText("—");
    expect(dash).toHaveAttribute("aria-hidden", "true");
    // The accessible name on the button must mention absence.
    expect(
      screen.getByRole("button", { name: /Sol Ring.*No EDHREC figure/i }),
    ).toBeInTheDocument();
  });

  it("prints neither plate nor dash when showFigures is false", () => {
    renderInProvider(
      <CoverageChip card={card()} siblings={siblings} showFigures={false} />,
    );
    expect(screen.queryByText("82%")).toBeNull();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("prints neither plate nor dash when showFigures is false even with null inclusionPct", () => {
    renderInProvider(
      <CoverageChip card={card({ inclusionPct: null })} siblings={siblings} showFigures={false} />,
    );
    expect(screen.queryByText("—")).toBeNull();
  });

  it("clicking the chip calls open with the card's oracle id and siblings list", () => {
    const fetchCard = vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null);
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CoverageChip card={card()} siblings={siblings} showFigures />
      </CardDetailProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Sol Ring/i }));
    expect(fetchCard).toHaveBeenCalledWith("oracle-sol");
  });
});

describe("CoverageRow", () => {
  it("is at least 44px via min-height", () => {
    renderInProvider(
      <CoverageRow card={card()} siblings={siblings} showFigures />,
    );
    const btn = screen.getByRole("button", { name: /Sol Ring/i });
    // The component sets minHeight via style; we check the style attribute.
    expect(btn.style.minHeight).toBe("44px");
  });

  it("ellipses a long name by applying truncate/overflow-hidden styling", () => {
    const longName = "A Very Long Card Name That Should Be Truncated Because It Exceeds The Available Space";
    renderInProvider(
      <CoverageRow card={card({ name: longName })} siblings={siblings} showFigures />,
    );
    const nameSpan = screen.getByText(longName);
    // The truncate class applies overflow:hidden + text-overflow:ellipsis + white-space:nowrap.
    expect(nameSpan.className).toMatch(/truncate/);
  });

  it("prints the figure right-aligned when showFigures is true", () => {
    renderInProvider(
      <CoverageRow card={card()} siblings={siblings} showFigures />,
    );
    expect(screen.getByText("82%")).toBeInTheDocument();
  });

  it("prints neither plate nor dash when showFigures is false", () => {
    renderInProvider(
      <CoverageRow card={card()} siblings={siblings} showFigures={false} />,
    );
    expect(screen.queryByText("82%")).toBeNull();
    expect(screen.queryByText("—")).toBeNull();
  });
});

describe("CoverageDisclosure", () => {
  it("desktop reads '+N more' with the count", () => {
    render(
      <CoverageDisclosure
        width="desktop"
        total={17}
        role="ramp"
        expanded={false}
        controls="ramp-list"
        onToggle={vi.fn()}
      />,
    );
    // The visible label stays "+5 more"; the accessible name spells the role out.
    expect(screen.getByText(/\+5 more/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Show all 17 ramp cards/i }),
    ).toBeInTheDocument();
  });

  it("paints the desktop label accent while it can still expand, faint once it cannot", () => {
    const { rerender } = render(
      <CoverageDisclosure
        width="desktop"
        total={17}
        role="ramp"
        expanded={false}
        controls="ramp-list"
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText(/\+5 more/)).toHaveClass("text-accent");

    rerender(
      <CoverageDisclosure
        width="desktop"
        total={17}
        role="ramp"
        expanded
        controls="ramp-list"
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText(/Show fewer/)).toHaveClass("text-fg-faint");
  });

  it("phone reads 'Show all N' with the count", () => {
    render(
      <CoverageDisclosure
        width="phone"
        total={5}
        role="ramp"
        expanded={false}
        controls="ramp-list"
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Show all 5 ramp cards/i })).toBeInTheDocument();
    expect(screen.getByText(/Show all 5/)).toBeInTheDocument();
  });

  // Expansion stops at 40. A sighted reader sees the "+N more not shown" line
  // as soon as the panel opens; the accessible name has to say it up front,
  // because "Show all 52" is a promise the control cannot keep.
  it("announces the expansion cap, not the total, past 40 cards", () => {
    render(
      <CoverageDisclosure
        width="phone"
        total={52}
        role="ramp"
        expanded={false}
        controls="ramp-list"
        onToggle={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Show 40 of 52 ramp cards" }),
    ).toBeInTheDocument();
  });

  it("shows 'Show fewer' and aria-expanded=true when expanded", () => {
    render(
      <CoverageDisclosure
        width="desktop"
        total={17}
        role="ramp"
        expanded
        controls="ramp-list"
        onToggle={vi.fn()}
      />,
    );
    // Four role panels each carry this control, so the accessible name has to
    // name its role — the visible label stays short beside its own panel.
    const btn = screen.getByRole("button", { name: /Show fewer ramp cards/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("Show fewer");
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("carries aria-expanded=false when collapsed", () => {
    render(
      <CoverageDisclosure
        width="phone"
        total={5}
        role="ramp"
        expanded={false}
        controls="ramp-list"
        onToggle={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button", { name: /Show all 5 ramp cards/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("carries aria-controls pointing at the container it expands", () => {
    render(
      <CoverageDisclosure
        width="desktop"
        total={15}
        role="draw"
        expanded={false}
        controls="draw-overflow"
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Show all 15 draw cards/i })).toHaveAttribute(
      "aria-controls",
      "draw-overflow",
    );
  });

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    render(
      <CoverageDisclosure
        width="desktop"
        total={17}
        role="ramp"
        expanded={false}
        controls="ramp-list"
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Show all 17 ramp cards/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
