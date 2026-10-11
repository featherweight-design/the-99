// The Mulligan's fixed land line (contract 6): drawn by the app ahead of the model's lines, from
// the range stored with the overview, and absent on an overview written before it existed.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { checkedSynopsis } from "./__fixtures__/synopsis";
import { SynopsisSections } from "./synopsis-body";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { HoverPreviewProvider } from "./hover-preview";

const draw = (content = checkedSynopsis()) =>
  render(
    <CardDetailProvider fetchCard={async () => null}>
      <HoverPreviewProvider>
        <SynopsisSections content={content} art={new Map()} onRetry={null} busy={false} />
      </HoverPreviewProvider>
    </CardDetailProvider>,
  );

describe("the Mulligan's land line", () => {
  it("opens each box with the range, before the generated lines", () => {
    draw(checkedSynopsis({ lands: { keep: { low: 2, high: 4 }, sendBack: { none: 0, under: 1, over: 5 } } }));
    const fixed = screen.getAllByTestId("synopsis-land-range").map((e) => e.lastElementChild?.textContent);
    expect(fixed).toEqual(["2 to 4 lands", "0 or 1 lands, or 5 or more"]);
    // Each fixed line comes first in its box.
    for (const line of screen.getAllByTestId("synopsis-land-range")) {
      expect(line.previousElementSibling?.tagName).toBe("SPAN");
    }
  });

  it("draws no range on an overview written before the fixed line", () => {
    draw();
    expect(screen.queryAllByTestId("synopsis-land-range")).toHaveLength(0);
  });
});

describe("the Based on line (Overview accuracy PR 6)", () => {
  const evidence = {
    strategy: [["sol-ring"], []],
    keep: [["sol-ring"]],
    sendBack: [[]],
    tips: [["craterhoof", "sol-ring"]],
    keyCards: [["sol-ring", "craterhoof"]],
    weaknesses: [[]],
  };
  const names = { "sol-ring": "Sol Ring", craterhoof: "Craterhoof Behemoth" };
  const drawWith = (content: ReturnType<typeof checkedSynopsis>, evidenceNames: Record<string, string>, fetchCard = async () => null) =>
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <HoverPreviewProvider>
          <SynopsisSections content={content} art={new Map()} evidenceNames={evidenceNames} onRetry={null} busy={false} />
        </HoverPreviewProvider>
      </CardDetailProvider>,
    );

  it("lists a claim's cards under it, one line per claim that cites any", () => {
    drawWith(checkedSynopsis({ evidence }), names);
    const lines = screen.getAllByTestId("synopsis-based-on").map((e) => e.textContent);
    // strategy 1, keep 1, tip 1, key card 1 (its own card left out); the empty claims draw none.
    expect(lines).toEqual(["Based onSol Ring", "Based onSol Ring", "Based onCraterhoof BehemothSol Ring", "Based onCraterhoof Behemoth"]);
  });

  it("opens the card's details from a listed card, as a mark does", async () => {
    const fetchCard = vi.fn(async () => null);
    drawWith(checkedSynopsis({ evidence }), names, fetchCard);
    const line = screen.getAllByTestId("synopsis-based-on")[2];
    fireEvent.click(within(line).getByRole("button", { name: "View details for Craterhoof Behemoth" }));
    await waitFor(() => expect(fetchCard).toHaveBeenCalled());
  });

  it("draws nothing without evidence, or while no names are read (the switch off)", () => {
    drawWith(checkedSynopsis(), names);
    expect(screen.queryAllByTestId("synopsis-based-on")).toHaveLength(0);
  });
  it("draws nothing for a card with no name read", () => {
    drawWith(checkedSynopsis({ evidence }), {});
    expect(screen.queryAllByTestId("synopsis-based-on")).toHaveLength(0);
  });
});
