// The Mulligan's fixed land line (contract 6): drawn by the app ahead of the model's lines, from
// the range stored with the overview, and absent on an overview written before it existed.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
