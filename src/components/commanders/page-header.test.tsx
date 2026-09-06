import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PageHeader } from "./page-header";
import { availabilityCopy } from "../../lib/copy/availability";
import { discoveryCopy } from "../../lib/copy/commander-discovery";

// One subtree, so every string appears exactly once: the header used to ship a
// mobile branch beside a desktop one and matched twice.
describe("PageHeader subtitle", () => {
  it("names what the list is ranked by in each mode", () => {
    render(<PageHeader uniqueCardsRead={1240} avail="all" />);
    screen.getByText(`1,240 cards scanned · ${availabilityCopy.ranking.subtitleAll}`);
  });

  it("switches the clause under ?avail=free", () => {
    render(<PageHeader uniqueCardsRead={1240} avail="free" />);
    screen.getByText(`1,240 cards scanned · ${availabilityCopy.ranking.subtitleFree}`);
  });

  // The no-candidates page renders this header with nothing ranked beneath it,
  // so the clause would be a claim about a list that isn't there.
  it("drops the clause when no mode is given", () => {
    render(<PageHeader uniqueCardsRead={1240} />);
    screen.getByText("1,240 cards scanned");
  });

  it("leads with the population and the ordering once a scope is given", () => {
    render(
      <PageHeader
        uniqueCardsRead={2805}
        avail="free"
        scope="play"
        onScopeChange={() => {}}
        sort="new"
        candidateCount={1704}
      />,
    );
    screen.getByText(
      `${discoveryCopy.scope.subtitlePlay(1704, 2805, "new")} · ${
        availabilityCopy.ranking.subtitleFree
      }`,
    );
  });

  // The availability clause is not in the handoff's two subtitle strings, but it
  // is the only place this page says which pool it ranked against.
  it("keeps the availability clause under a scope", () => {
    render(
      <PageHeader
        uniqueCardsRead={2805}
        avail="all"
        scope="owned"
        onScopeChange={() => {}}
        candidateCount={242}
      />,
    );
    screen.getByText(
      `${discoveryCopy.scope.subtitleOwned(242, 2805)} · ${availabilityCopy.ranking.subtitleAll}`,
    );
  });
});

describe("PageHeader scope control", () => {
  it("is absent without a scope, so the empty pages are unchanged", () => {
    render(<PageHeader uniqueCardsRead={1240} />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("reports the segment the player picked", () => {
    const onScopeChange = vi.fn();
    render(
      <PageHeader
        uniqueCardsRead={2805}
        scope="owned"
        onScopeChange={onScopeChange}
        candidateCount={242}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: discoveryCopy.scope.playAria }));
    expect(onScopeChange).toHaveBeenCalledWith("play");
  });

  // Two radios, not four: both labels ship on one button and the breakpoint
  // hides one, so a screen reader reads a two-option group.
  it("exposes one radio per scope", () => {
    render(
      <PageHeader
        uniqueCardsRead={2805}
        scope="play"
        onScopeChange={() => {}}
        candidateCount={3334}
      />,
    );
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: discoveryCopy.scope.playAria })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
