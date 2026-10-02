import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CostStrip } from "./cost-strip";
import type { CostToComplete } from "../../lib/sets/cost";

const cost = (over: Partial<CostToComplete> = {}): CostToComplete => ({
  totalCents: 128_440, pricedCount: 193, missingCount: 214, absentCount: 21,
  soldOutCount: 0, inconclusiveCount: 0, ...over,
});

describe("CostStrip", () => {
  it("states the priced-of-missing gap in the same breath as the total", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/add-deck?x=1" />);
    // TWO nodes carry the figure now, and both are in the tree at once: JSDOM applies no
    // CSS, so the phone's collapsed row and the desktop card are both present and the
    // breakpoint decides which is drawn.
    expect(screen.getAllByText("$1,284.40").length).toBeGreaterThan(0);
    expect(screen.getByText("over 193 of the 214 missing")).toBeInTheDocument();
  });

  it("names what the figure leaves out rather than burying it", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/add-deck?x=1" />);
    expect(screen.getByText("21 have never been stocked and are not in this figure"))
      .toBeInTheDocument();
  });

  it("separates a sold-out card from one the feed has never carried", () => {
    // The aggregate used to claim every uncosted card had never been stocked, which is
    // false for one that was stocked and has since sold out.
    render(
      <CostStrip
        cost={cost({ pricedCount: 190, absentCount: 21, soldOutCount: 3 })}
        href="https://manapool.com/add-deck?x=1"
      />,
    );
    expect(screen.getByText(/21 have never been stocked/)).toBeInTheDocument();
    expect(screen.getByText(/3 are sold out/)).toBeInTheDocument();
  });

  it("says nothing about unstocked cards when every missing card is priced", () => {
    render(
      <CostStrip
        cost={cost({ pricedCount: 214, absentCount: 0 })}
        href="https://manapool.com/add-deck?x=1"
      />,
    );
    expect(screen.queryByText(/never been stocked/)).toBeNull();
  });

  it("labels the one selector with the same count the sentence uses", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/add-deck?x=1" />);
    expect(screen.getByRole("link", { name: /214 missing cards/ })).toBeInTheDocument();
    expect(screen.getByText("Send 214 to ManaPool")).toBeInTheDocument();
  });

  it("holds no per-cell control of its own — the filters are the selector", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/add-deck?x=1" />);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("prints staleness once for the page when the feed itself trails", () => {
    render(
      <CostStrip cost={cost()} href="https://manapool.com/add-deck?x=1" staleAsOf="2026-09-08" />,
    );
    expect(screen.getByText("prices as of 2026-09-08")).toBeInTheDocument();
  });

  it("re-scopes to the extras rather than becoming a different control", () => {
    render(
      <CostStrip
        cost={cost({ totalCents: 41_290, pricedCount: 98, missingCount: 105, absentCount: 7 })}
        href="https://manapool.com/add-deck?x=1"
        scope="extras"
      />,
    );
    expect(screen.getByText("Cost to finish the extras")).toBeInTheDocument();
    expect(screen.getByText("over 98 of the 105 you are missing")).toBeInTheDocument();
  });

  it("still states a zero figure when nothing is missing", () => {
    // Whether the strip appears at all is the grid's call — it renders one per scoped
    // section — so a zero here is "you are missing none of these", which is a figure
    // rather than a reason to vanish.
    render(<CostStrip cost={cost({ missingCount: 0, pricedCount: 0, absentCount: 0 })}
      href={null} />);
    expect(screen.getByText("over 0 of the 0 missing")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("CostStrip staleness", () => {
  it("says nothing when the feed is current", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/add-deck?x=1" staleAsOf={null} />);
    expect(screen.queryByText(/prices as of/)).toBeNull();
  });
});

describe("CostStrip when nothing missing can be costed", () => {
  it("does not print $0.00, which reads as a set that costs nothing to finish", () => {
    render(
      <CostStrip
        cost={cost({ totalCents: 0, pricedCount: 0, missingCount: 214, absentCount: 214 })}
        href="https://manapool.com/add-deck?x=1"
      />,
    );
    expect(screen.queryByText("$0.00")).toBeNull();
    expect(screen.getAllByText("no price").length).toBeGreaterThan(0);
  });
});

// R3 finding 6, move 3. The phone form is one 44px row that expands in place. This is the
// one part of the finding whose behaviour is a state machine rather than a layout, so it
// is unit-tested here; the probe answers the parts only a browser can — that the bar
// overlays rather than reflowing the grid, and that the row is 44px on screen.
//
// JSDOM applies no CSS, so both forms are always in the tree. What separates them is the
// `md:hidden` token and the `expanded` state, never a computed style.
describe("CostStrip — the phone's collapsed row", () => {
  const toggles = () => screen.getAllByRole("button")
    .filter((b) => b.hasAttribute("data-set-cost-toggle"));
  const opener = () => toggles().find((b) => b.getAttribute("aria-expanded") === "false");
  const closer = () => toggles().find((b) => b.getAttribute("aria-expanded") === "true");

  it("collapses to one row with the figure and what it covers", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/x" />);
    const row = opener();
    expect(row).toBeDefined();
    expect(row?.className).toMatch(/h-\[44px\]/);
    expect(row?.textContent).toMatch(/\$1,284\.40/);
    expect(row?.textContent).toMatch(/to finish · 193 of 214/);
  });

  it("expands in place on tap, and the row it replaces is gone", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/x" />);
    fireEvent.click(opener() as HTMLElement);
    expect(opener()).toBeUndefined();
    expect(closer()).toBeDefined();
    expect(screen.getByRole("link", { name: /ManaPool Mass Entry/ })).toBeInTheDocument();
  });

  it("collapses again from the expanded form", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/x" />);
    fireEvent.click(opener() as HTMLElement);
    fireEvent.click(closer() as HTMLElement);
    expect(opener()).toBeDefined();
  });

  // A row that silently dropped "3 have never been stocked" would be a figure the reader
  // cannot audit. The count is in the row AND in the accessible name.
  it("counts the caveats rather than dropping them", () => {
    render(
      <CostStrip
        cost={cost({ absentCount: 2, soldOutCount: 1 })}
        href="https://manapool.com/x"
        staleAsOf="2026-09-01T00:00:00Z"
      />,
    );
    expect(opener()).toHaveAttribute("aria-label", expect.stringContaining("3 notes"));
  });

  // An explicit `aria-label` REPLACES the button's descendant text, so a name stating only
  // the action removed the very audit information this row exists to keep: the figure and
  // what it covers were on the screen and absent from the name.
  it("puts the figure and its coverage in the accessible name", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/x" />);
    const label = opener()?.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/\$1,284\.40/);
    expect(label).toMatch(/193 of 214/);
    expect(label).toMatch(/Show the full cost/);
  });

  it("says one note, not one notes", () => {
    render(<CostStrip cost={cost({ absentCount: 2 })} href="https://manapool.com/x" />);
    expect(opener()).toHaveAttribute("aria-label", expect.stringContaining("1 note"));
    expect(opener()?.getAttribute("aria-label")).not.toMatch(/1 notes/);
  });

  it("and offers no count when there is nothing to note", () => {
    render(<CostStrip cost={cost({ absentCount: 0 })} href="https://manapool.com/x" />);
    expect(opener()?.getAttribute("aria-label")).not.toMatch(/note/);
  });

  // Each caveat branch, because the collapsed row's whole justification is that their
  // number is unpredictable.
  it.each([
    ["unpriced", { absentCount: 3 }, /never been stocked/],
    ["noFigure", { inconclusiveCount: 2 }, /no price in this feed/],
    ["soldOut", { soldOutCount: 4 }, /sold out/i],
  ])("shows the %s caveat once expanded", (_name, over, pattern) => {
    render(<CostStrip cost={cost({ absentCount: 0, ...over })} href="https://manapool.com/x" />);
    fireEvent.click(opener() as HTMLElement);
    expect(screen.getByText(pattern)).toBeInTheDocument();
  });

  it("shows the stale caveat once expanded", () => {
    render(
      <CostStrip cost={cost()} href="https://manapool.com/x" staleAsOf="2026-09-01T00:00:00Z" />,
    );
    fireEvent.click(opener() as HTMLElement);
    expect(screen.getByText(/prices as of/)).toBeInTheDocument();
  });

  // The extras scope keeps its own sentence in the collapsed row too.
  it("re-scopes the collapsed row to the extras", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/x" scope="extras" />);
    expect(opener()?.textContent).toMatch(/to finish the extras/);
  });

  // The desktop card has never been closable and does not become so: its toggle is
  // `md:hidden`, and the full form carries no `hidden` token of its own.
  it("leaves the desktop form open and uncloseable", () => {
    const { container } = render(<CostStrip cost={cost()} href="https://manapool.com/x" />);
    for (const b of toggles()) expect(b.className).toMatch(/md:hidden/);
    const full = container.querySelector("[data-set-cost] > div") as HTMLElement;
    expect(full.className).toMatch(/md:flex/);
  });
});

// Each toggle unmounts the other, so a reader who is not using a mouse has to be handed
// to the control that now represents the same disclosure — in BOTH directions. Focus was
// falling to the body on the way back.
describe("CostStrip — focus survives the swap", () => {
  const toggles = () => screen.getAllByRole("button")
    .filter((b) => b.hasAttribute("data-set-cost-toggle"));
  const opener = () => toggles().find((b) => b.getAttribute("aria-expanded") === "false");
  const closer = () => toggles().find((b) => b.getAttribute("aria-expanded") === "true");

  it("lands on the collapse control after expanding", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/x" />);
    fireEvent.click(opener() as HTMLElement);
    expect(document.activeElement).toBe(closer());
  });

  it("and back on the expand control after collapsing", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/x" />);
    fireEvent.click(opener() as HTMLElement);
    fireEvent.click(closer() as HTMLElement);
    expect(document.activeElement).toBe(opener());
  });

  // The first render must not steal focus from wherever the reader actually is.
  it("takes no focus on mount", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/x" />);
    expect(document.activeElement).toBe(document.body);
  });
});

// The strip renders without a link when the filters left nothing to buy, and a name
// promising a send button there announces an action that is not on the page.
describe("CostStrip — the accessible name with no send link", () => {
  const opener = () => screen.getAllByRole("button")
    .find((b) => b.hasAttribute("data-set-cost-toggle")
      && b.getAttribute("aria-expanded") === "false");

  it("does not promise an action when there is none", () => {
    render(<CostStrip cost={cost({ absentCount: 0 })} href={null} />);
    const label = opener()?.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/Show the full cost/);
    expect(label).not.toMatch(/ManaPool/);
  });

  // A LINK, not a button: the expanded action is an `<a>`, and naming a control type the
  // reader will not find is worse than naming none.
  it("names it a link when there is, because that is what it is", () => {
    render(<CostStrip cost={cost({ absentCount: 0 })} href="https://manapool.com/x" />);
    expect(opener()?.getAttribute("aria-label")).toMatch(/ManaPool link/);
    expect(opener()?.getAttribute("aria-label")).not.toMatch(/button/);
  });

  it("keeps the notes clause in both forms", () => {
    render(<CostStrip cost={cost({ absentCount: 2 })} href={null} />);
    expect(opener()?.getAttribute("aria-label")).toMatch(/1 note/);
  });

  it("explains the cap when it bites, and only then (H15)", () => {
    const { rerender, container } = render(
      <CostStrip cost={cost()} href="https://manapool.com/add-deck?x=1" sendCount={99} sendCapped />,
    );
    expect(container.querySelector("[data-set-cost-cap]")?.textContent).toBe(
      "A send holds up to 99 cards, and 214 are missing here. Narrow the grid to send the rest.",
    );
    rerender(<CostStrip cost={cost()} href="https://manapool.com/add-deck?x=1" sendCount={99} />);
    expect(container.querySelector("[data-set-cost-cap]")).toBeNull();
  });

  it("keeps the phone's close control where the open control was (H15)", () => {
    const { container } = render(<CostStrip cost={cost()} href="https://manapool.com/add-deck?x=1" />);
    fireEvent.click(container.querySelector("[data-set-cost-toggle]")!);
    const close = container.querySelector("[data-set-cost-toggle]") as HTMLElement;
    expect(close.getAttribute("aria-expanded")).toBe("true");
    // Pinned to the strip's top right, not wrapped to a full-width row at its foot.
    expect(close.className).toMatch(/absolute right-0 top-0/);
    expect(close.className).not.toMatch(/w-full/);
    expect((container.querySelector("[data-set-cost]") as HTMLElement).className).toMatch(/\brelative\b/);
  });

  it("puts the send button at the left on the phone and the right from md (H15)", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/add-deck?x=1" />);
    const send = screen.getByRole("link");
    expect(send.className).toMatch(/md:ml-auto/);
    expect(send.className).not.toMatch(/(^|\s)ml-auto/);
  });
});
