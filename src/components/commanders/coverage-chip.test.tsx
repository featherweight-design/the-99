// CoverageChip, CoverageRow, CoverageDisclosure — tests (#131).
// Mock pattern follows card-detail-surfaces.test.tsx.

import { act, render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { HoverPreviewProvider } from "../decks/hover-preview";
import { CoverageChip, CoverageDisclosure, CoverageRow } from "./coverage-chip";
import type { RoleCard } from "../../lib/recs/score";
import { avail, heldBy } from "./availability-fixture";
import { availabilityCopy } from "../../lib/copy/availability";

/** What `markerAria` says for a hard claim naming one deck. Read from the copy
    module so an edit there does not leave this file asserting a dead sentence. */
const heldClaim = (name: string) => availabilityCopy.marker.hardAria(name);

// Stub fetch used by CardDetailProvider in all tests.
function renderInProvider(ui: React.ReactNode) {
  const fetchCard = vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null);
  const rendered = render(<CardDetailProvider fetchCard={fetchCard}>{ui}</CardDetailProvider>);
  return { fetchCard, ...rendered };
}


const card = (overrides: Partial<RoleCard> = {}): RoleCard => ({
  oracleId: "oracle-sol",
  name: "Sol Ring",
  inclusionPct: 82,
  committedTo: null,
  availability: null,
  ...overrides,
});

const siblings = ["oracle-sol", "oracle-signet"];

// The figure plate and the absent dash are aria-hidden too, so the dot is found
// by the one property only it has: it is round.
const dotOf = (container: HTMLElement): HTMLElement => {
  const dot = [...container.querySelectorAll<HTMLElement>("span[aria-hidden]")].find((el) =>
    el.className.includes("rounded-full"),
  );
  if (!dot) throw new Error("no round aria-hidden span in the chip");
  return dot;
};

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

  // The dot is OWNERSHIP now and nothing else — it no longer moves with
  // severity, whatever the marker beside it says. Asserted at the loudest
  // reading, because that is the one the old three-state dot repainted.
  // `committedTo` is set on PURPOSE and is what makes this measure anything.
  // Left null, the retired `availabilityDotState` also returns "free" and paints
  // `--success`, so every assertion below passes with the old three-state dot
  // restored — verified, and it did. A deck name here is the one input that
  // makes the old code and the new code disagree.
  it("keeps the owned dot at every reading, severity included", () => {
    for (const reading of ["free", "soft", "hard", "over"] as const) {
      const { container, unmount } = render(
        <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
          <CoverageChip
            card={card({ committedTo: "Atraxa", availability: avail(reading) })}
            siblings={siblings}
            showFigures
          />
        </CardDetailProvider>,
      );
      expect(dotOf(container).className).toContain("bg-[color:var(--success)]");
      expect(dotOf(container).className).not.toContain("--avail-hard-fg");
      unmount();
    }
  });

  // Three readings draw a marker; free draws nothing at all. The absence is the
  // feature — a player whose collection covers their decks sees nothing new.
  it("draws the marker at soft, hard and over, and nothing at free", () => {
    const expected = {
      soft: availabilityCopy.marker.soft(1),
      hard: availabilityCopy.marker.hard,
      over: availabilityCopy.marker.over(1),
    };
    for (const [reading, label] of Object.entries(expected)) {
      const { unmount } = renderInProvider(
        <CoverageChip
          card={card({ availability: avail(reading as "soft" | "hard" | "over") })}
          siblings={siblings}
          showFigures
        />,
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
    renderInProvider(<CoverageChip card={card({ availability: avail("free") })} siblings={siblings} showFigures />);
    expect(screen.queryByText(availabilityCopy.marker.hard)).toBeNull();
  });

  // The count-only contract: never a deck name in the DRAWN label, on either
  // geometry. The name still rides the accessible name below.
  it("never draws a deck name", () => {
    renderInProvider(
      <CoverageChip
        card={card({ availability: heldBy("Atraxa") })}
        siblings={siblings}
        showFigures
      />,
    );
    expect(screen.queryByText(/Atraxa/)).toBeNull();
  });

  // The chip's border tints on ONE reading. The committed branch is gone with
  // `committedTo`; free keeps exactly the border it ships with.
  it("tints the border at over only, and leaves the free border alone", () => {
    const { container: over } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <CoverageChip card={card({ availability: avail("over") })} siblings={siblings} showFigures />
      </CardDetailProvider>,
    );
    expect(over.querySelector("button")!.className).toMatch(/var\(--danger\)/);
    for (const reading of ["free", "soft", "hard"] as const) {
      const { container, unmount } = render(
        <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
          <CoverageChip card={card({ availability: avail(reading) })} siblings={siblings} showFigures />
        </CardDetailProvider>,
      );
      expect(container.querySelector("button")!.className).toMatch(/var\(--success\)/);
      unmount();
    }
  });

  // D1, the round's one drawn defect. The chip declares a fixed 28px with no
  // floor, and this span shipped bare — so the marker's 69-89px made a long name
  // wrap and break the pill. jsdom lays nothing out, so what a unit test CAN
  // assert is the rule that prevents it.
  it("never lets the name wrap", () => {
    renderInProvider(
      <CoverageChip
        card={card({ name: "Asmoranomardicadaistinaculdacar", availability: avail("over") })}
        siblings={siblings}
        showFigures
      />,
    );
    expect(screen.getByText("Asmoranomardicadaistinaculdacar").className).toContain(
      "whitespace-nowrap",
    );
  });

  // R2 rewrote this name wholesale once and lost "View details for". The claim
  // clause is a suffix on whichever branch the shipped name took.
  it("appends the deck to the accessible name it already had", () => {
    renderInProvider(
      <CoverageChip
        card={card({ availability: heldBy("Atraxa") })}
        siblings={siblings}
        showFigures
      />,
    );
    expect(
      screen.getByRole("button", {
        name: `View details for Sol Ring. In 82% of decks. ${heldClaim("Atraxa")}.`,
      }),
    ).toBeInTheDocument();
  });

  // The one branch whose shipped name is undefined: without a synthesised base,
  // the suffix would be the whole accessible name and say nothing about opening.
  it("still names the trigger when figures are hidden", () => {
    renderInProvider(
      <CoverageChip
        card={card({ availability: heldBy("Atraxa") })}
        siblings={siblings}
        showFigures={false}
      />,
    );
    expect(
      screen.getByRole("button", { name: `View details for Sol Ring. ${heldClaim("Atraxa")}.` }),
    ).toBeInTheDocument();
  });

  it("clicking the chip calls open with the card's oracle id and siblings list", () => {
    const fetchCard = vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null);
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <CoverageChip card={card()} siblings={siblings} showFigures />
      </CardDetailProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Sol Ring/i }));
    expect(fetchCard).toHaveBeenCalledWith("oracle-sol", undefined);
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
    // And min-w-0, without which truncate does nothing here: the span is a flex
    // item, whose default min-width is its own content, so it would refuse to
    // shrink and push the figure off the row rather than ellipsing.
    expect(nameSpan.className).toMatch(/min-w-0/);
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

  it("carries the same marker and the same claim clause as the desktop chip", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <CoverageRow
          card={card({ committedTo: "Atraxa", availability: heldBy("Atraxa") })}
          siblings={siblings}
          showFigures
        />
      </CardDetailProvider>,
    );
    // Ownership only, as on the chip.
    expect(dotOf(container).className).toContain("bg-[color:var(--success)]");
    // Count-only in the drawn label...
    expect(screen.getByText(availabilityCopy.marker.hard)).toBeInTheDocument();
    expect(screen.queryByText(/Atraxa/)).toBeNull();
    // ...and the deck named in the accessible name, exactly as the chip does it.
    expect(
      screen.getByRole("button", {
        name: `View details for Sol Ring. In 82% of decks. ${heldClaim("Atraxa")}.`,
      }),
    ).toBeInTheDocument();
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

describe("hover preview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({ matches: query === "(hover: hover)", media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }),
    });
  });
  afterEach(() => { vi.useRealTimers(); });

  it.each([["chip", CoverageChip], ["row", CoverageRow]] as const)("a %s previews the printing its card carries", (_, Part) => {
    renderInProvider(
      <HoverPreviewProvider>
        <Part card={card({ imageUri: "https://img.test/sol.jpg" })} siblings={siblings} showFigures />
      </HoverPreviewProvider>,
    );
    fireEvent.mouseEnter(screen.getByRole("button"), { clientX: 10, clientY: 10 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId("hover-preview").getAttribute("style")).toContain("https://img.test/sol.jpg");
  });
});
