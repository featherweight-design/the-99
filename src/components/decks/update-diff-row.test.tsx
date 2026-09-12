// The diff row's two mountings, and the four facts only one of them passes. What
// is tested here is that the review page's row draws a cost, a price and a
// sleeved dot from those facts, and that the update flow's row — which passes
// none of them — draws exactly what it drew before: the source line in the
// trailing column, a bare `buy` tag, and no pips.

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { spokenManaCost } from "../../lib/copy/card-surfaces";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { DiffRowIn, DiffRowOut, type DiffRowCard } from "./update-diff-row";

const copy = deckImportCopy.update.diff;

function card(over: Partial<DiffRowCard> = {}): DiffRowCard {
  return {
    oracleId: "o1",
    name: "Cyclonic Rift",
    typeLine: "Instant",
    auto: false,
    owned: true,
    availability: null,
    ...over,
  };
}

function draw(node: React.ReactNode) {
  const { container } = render(
    <CardDetailProvider fetchCard={async () => null}>{node}</CardDetailProvider>,
  );
  return container.firstElementChild as HTMLElement;
}

afterEach(cleanup);

describe("the review page's mounting", () => {
  it("draws the cost in the column the source line reserved", () => {
    const row = draw(<DiffRowIn review card={card({ manaCost: "{1}{U}" })} sourceLine={null} />);
    // The pips are decorative; the cost is spoken once, by the run itself.
    expect(screen.getByText(spokenManaCost("{1}{U}"))).toBeTruthy();
    // The column is the line number's, and a row carrying a cost cites no lines.
    expect(row.textContent).not.toContain("line");
  });

  it("prices the tag on a sleeved add, and hues its dot", () => {
    const row = draw(
      <DiffRowIn
        review
        card={card({
          owned: true,
          committed: true,
          price: { cents: 2840, foilCents: null, etchedCents: null, asOf: new Date("2026-09-08") },
          newestAsOf: new Date("2026-09-08"),
        })}
        sourceLine={null}
      />,
    );
    // The one row that is owned and still has a price to read: buying is the
    // alternative the pull is weighed against.
    expect(row.textContent).toContain("$28.40");
    expect(row.querySelector(".bg-\\[color\\:var\\(--avail-hard-fg\\)\\]")).toBeTruthy();
  });

  it("writes a moved count inside the row, and names no card in it", () => {
    const row = draw(
      <DiffRowOut review card={card({ name: "Swamp" })} recount={{ from: "9", to: "7" }} />,
    );
    expect(row.textContent).toContain("9 → 7");
    // The name is the element beside the figures, not part of them.
    expect(row.textContent).not.toContain("Swamp 9 → 7");
    expect(screen.getByText("Swamp")).toBeTruthy();
  });

  it("holds 44px for a row carrying an action, and 40px for one that does not", () => {
    const resting = draw(<DiffRowOut review card={card()} />);
    expect(resting.className).toContain("md:min-h-[40px]");
    cleanup();
    const acting = draw(
      <DiffRowOut review card={card()} action={<button type="button">Pull it</button>} />,
    );
    expect(acting.className).toContain("min-h-[44px]");
    expect(acting.className).not.toContain("md:min-h-[40px]");
    // The right padding closes up under the control, which has its own hit box.
    expect(acting.className).toContain("md:pr-[6px]");
  });
});

describe("the update flow's mounting", () => {
  // The box, the hover fill and the pointer hint are the review page's, and this
  // flow draws six row kinds in one list: four of them are other components on
  // the shipped 44px / 12px box, so a pair retuned to the newer geometry would
  // stand 4px shorter and 3px narrower than its own neighbours.
  it("keeps the shipped box, and neither hovers nor hints", () => {
    const row = draw(<DiffRowIn card={card()} sourceLine={3} />);
    expect(row.className).toContain("px-[12px]");
    expect(row.className).not.toContain("md:min-h-[40px]");
    expect(row.className).not.toContain("md:hover:bg-[color:var(--elevated-hover)]");
    expect(row.textContent).not.toContain("open card");
    cleanup();
    const out = draw(<DiffRowOut card={card()} />);
    expect(out.className).toContain("pl-[12px]");
    expect(out.className).toContain("pr-[6px]");
    expect(out.className).not.toContain("md:min-h-[40px]");
  });

  it("keeps the trailing column for its source line, and draws no pips", () => {
    const row = draw(<DiffRowIn card={card({ owned: true })} sourceLine={12} />);
    expect(row.textContent).toContain(copy.sourceLine("12"));
    // No pips: the cost is the review mounting's fact and this one never has it.
    expect(screen.queryByText(spokenManaCost("{1}{U}"))).toBeNull();
  });

  it("keeps the reserved column on a row with no source line", () => {
    const row = draw(<DiffRowIn card={card()} sourceLine={null} />);
    expect(row.querySelector(".min-w-\\[54px\\]")).toBeTruthy();
  });

  it("draws a bare buy tag with no figure when the mounting passes no price", () => {
    const row = draw(<DiffRowIn card={card({ owned: false })} sourceLine={3} />);
    expect(row.textContent).toContain("buy");
    expect(row.textContent).not.toContain("$");
  });

  it("keeps the auto tag's invisible box where there is no cost track", () => {
    const row = draw(<DiffRowIn card={card({ auto: false })} sourceLine={3} />);
    expect(row.querySelector(".invisible")).toBeTruthy();
    cleanup();
    // A row that draws a cost track has a fixed trailing column of its own and
    // gives that space back.
    const priced = draw(<DiffRowIn card={card({ auto: false, manaCost: "{U}" })} sourceLine={null} />);
    expect(priced.querySelector(".invisible")).toBeNull();
  });
});
