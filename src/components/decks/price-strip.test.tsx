import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceStrip } from "./price-strip";
import { priceCopy } from "../../lib/copy/price";
import type { ProvenanceForm } from "../../lib/decks/price";

const fresh: ProvenanceForm = { behind: false, when: "Monday" };
const behind: ProvenanceForm = { behind: true, when: "12 August" };

describe("PriceStrip provenance line", () => {
  it("names the source and the day it was checked", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
        provenance={fresh}
      />,
    );
    expect(screen.getByText(/prices from ManaPool/)).toHaveTextContent(
      `${priceCopy.strip.provenance} · ${priceCopy.strip.lastChecked("Monday")}`,
    );
    expect(screen.queryByText(new RegExp(priceCopy.strip.behind))).toBeNull();
  });

  it("adds the behind clause when the table is behind", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
        provenance={behind}
      />,
    );
    expect(screen.getByText(/prices from ManaPool/)).toHaveTextContent(
      `${priceCopy.strip.provenance} · ${priceCopy.strip.lastChecked("12 August")} · ${priceCopy.strip.behind}`,
    );
  });

  // Null provenance is the failed-read and empty-table case alike. The strip is
  // absent rather than degraded, because every line it renders is a claim about
  // a table it could not read.
  it("renders nothing at all without provenance", () => {
    const { container } = render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
        provenance={null}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("PriceStrip figure line", () => {
  it("shows the total and the priced clause when some copies are unpriced", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
        provenance={fresh}
      />,
    );
    expect(screen.getByText("$12.40")).toBeInTheDocument();
    expect(screen.getByText(priceCopy.strip.pricedClause(6, 8))).toBeInTheDocument();
  });

  // The pill and the spine already carry that number twice on the same screen;
  // a third instance names nothing missing.
  it("drops the clause when every copy is priced", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 8, totalCopies: 8 }}
        provenance={fresh}
      />,
    );
    expect(screen.getByText("$12.40")).toBeInTheDocument();
    expect(screen.queryByText(priceCopy.strip.pricedClause(8, 8))).toBeNull();
  });

  // No price at all is not "$0.00".
  it("drops the figure when nothing is priced, keeping the clause", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 0, pricedCopies: 0, totalCopies: 8 }}
        provenance={fresh}
      />,
    );
    expect(screen.queryByText("$0.00")).toBeNull();
    expect(screen.getByText(priceCopy.strip.pricedClause(0, 8))).toBeInTheDocument();
  });

  it("renders only the provenance line when the list is empty", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 0, pricedCopies: 0, totalCopies: 0 }}
        provenance={fresh}
      />,
    );
    expect(screen.queryByText("$0.00")).toBeNull();
    expect(screen.queryByText(priceCopy.strip.pricedClause(0, 0))).toBeNull();
    expect(screen.getByText(/prices from ManaPool/)).toBeInTheDocument();
  });
});
