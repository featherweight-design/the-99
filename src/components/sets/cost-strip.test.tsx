import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CostStrip } from "./cost-strip";
import type { CostToComplete } from "../../lib/sets/cost";

const cost = (over: Partial<CostToComplete> = {}): CostToComplete => ({
  totalCents: 128_440, pricedCount: 193, missingCount: 214, absentCount: 21,
  soldOutCount: 0, inconclusiveCount: 0, ...over,
});

describe("CostStrip", () => {
  it("states the priced-of-missing gap in the same breath as the total", () => {
    render(<CostStrip cost={cost()} href="https://manapool.com/add-deck?x=1" />);
    expect(screen.getByText("$1,284.40")).toBeInTheDocument();
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
    expect(screen.getByText("no price")).toBeInTheDocument();
  });
});
