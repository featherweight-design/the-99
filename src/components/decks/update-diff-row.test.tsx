// The diff row's two mountings, and the four facts only one of them passes. What
// is tested here is that the review page's row draws a cost, a price and a
// sleeved dot from those facts, and that the update flow's row — which passes
// none of them — draws exactly what it drew before: the source line in the
// trailing column, a bare `buy` tag, and no pips.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { spokenManaCost } from "../../lib/copy/card-surfaces";
import { CardDetailProvider, cardDetailCopy } from "../cards/card-detail-provider";
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
  it("names the deck sleeving the copy, and stacks the row on the phone", () => {
    const row = draw(
      <DiffRowIn
        review
        card={card({ committed: true, manaCost: "{1}{U}" })}
        sourceLine={null}
        heldBy="Kess Storm"
        action={<button type="button">Pull it</button>}
      />,
    );
    expect(screen.getByText(deckVersioningCopy.review.heldBy("Kess Storm"))).toBeTruthy();
    // Two lines on the phone, one flat flex line above it — the wrappers
    // dissolve at `md`, so the desktop row keeps every other row's anatomy.
    expect(row.className).toContain("flex-col");
    expect(row.className).toContain("md:flex-row");
    const lines = Array.from(row.children) as HTMLElement[];
    expect(lines).toHaveLength(2);
    for (const line of lines) expect(line.className).toContain("md:contents");
    // The meta line is indented to the name's own text.
    expect(lines[1].className).toContain("pl-[16px]");
  });

  it("keeps one line on a row with nothing to decide", () => {
    const row = draw(<DiffRowIn review card={card({ manaCost: "{1}{U}" })} sourceLine={null} />);
    expect(row.className).not.toContain("flex-col");
  });

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

  it("holds the cost track's width on a costless removal", () => {
    const land = draw(<DiffRowOut review card={card({ name: "Swamp" })} />);
    const empty = land.lastElementChild as HTMLElement;
    expect(empty.style.width).toBe("40px");
    expect(empty.textContent).toBe("");
    cleanup();
    // The same width a costed removal ends on, which is the point: the name is
    // the row's only flexible item, so a land that drew no track put its
    // availability slot 40px right of every spell above it.
    const spell = draw(<DiffRowOut review card={card({ manaCost: "{1}{U}" })} />);
    expect((spell.lastElementChild as HTMLElement).style.width).toBe("40px");
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

// The whole plate opens the card on the review page, because the hover fill and
// the `open card →` hint say it does. What is tested is the three answers the
// plate has to a click: its own, the name's, and the action's.
describe("the review page's plate as the card's target", () => {
  function fetching(node: React.ReactNode) {
    const asked: string[] = [];
    const { container } = render(
      <CardDetailProvider
        fetchCard={async (oracleId) => {
          asked.push(oracleId);
          return null;
        }}
      >
        {node}
      </CardDetailProvider>,
    );
    return { row: container.firstElementChild as HTMLElement, asked };
  }

  async function click(el: Element) {
    await act(async () => {
      fireEvent.click(el);
    });
  }

  it("opens the card from the plate itself", async () => {
    const { row, asked } = fetching(<DiffRowOut review card={card()} />);
    await click(row);
    expect(asked).toEqual(["o1"]);
  });

  it("opens the card once when the name inside it is clicked", async () => {
    const { asked } = fetching(<DiffRowOut review card={card()} />);
    await click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Cyclonic Rift") }));
    expect(asked).toEqual(["o1"]);
  });

  it("leaves a click on the row's action to that action", async () => {
    let pulls = 0;
    const { asked } = fetching(
      <DiffRowIn
        review
        card={card()}
        sourceLine={null}
        action={
          <button type="button" onClick={() => (pulls += 1)}>
            Pull it
          </button>
        }
      />,
    );
    await click(screen.getByRole("button", { name: "Pull it" }));
    expect(pulls).toBe(1);
    expect(asked).toEqual([]);
  });

  it("is not a target in the update flow, which draws no hint", async () => {
    const { row, asked } = fetching(<DiffRowIn card={card()} sourceLine={3} />);
    await click(row);
    expect(asked).toEqual([]);
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
    // No cost column either, empty or otherwise: six row kinds share this list's
    // geometry and a reserved 40px on two of them would leave the other four short.
    expect(out.querySelector('[style*="width: 40px"]')).toBeNull();
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
