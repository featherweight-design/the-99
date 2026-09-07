import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CostPips } from "./cost-pips";

// The desktop decklist track: 12px pips, gap 3, fixed 40px, five slots.
const TRACK = { size: 12, track: 40, cap: 5 } as const;

function runOf(ui: React.ReactElement) {
  const { container } = render(ui);
  return container.firstElementChild as HTMLElement;
}

function pipsOf(ui: React.ReactElement) {
  return [...runOf(ui).querySelectorAll<HTMLElement>("span.rounded-full")];
}

/**
 * What the run measures, in px, from the drawn sizes and the shingle inset.
 * A shingled run sets `gap: 0` inline; otherwise the 3px gap comes from a class
 * jsdom does not compute, so it is passed in.
 */
function widthOf(ui: React.ReactElement, gap: number) {
  const run = runOf(ui);
  const step = run.style.gap === "" ? gap : Number.parseFloat(run.style.gap);
  return [...run.querySelectorAll<HTMLElement>("span.rounded-full")].reduce((total, pip, i) => {
    const advance = i === 0 ? 0 : step + Number.parseFloat(pip.style.marginLeft || "0");
    return total + Number.parseFloat(pip.style.width) + advance;
  }, 0);
}

describe("CostPips — the pip ladder", () => {
  // Every row of STATES-card-surfaces.md § The pip ladder.
  const ladder: Array<{ cost: string; slots: number; measured: number; label?: string }> = [
    { cost: "{U}", slots: 1, measured: 12 },
    { cost: "{2}{W}", slots: 2, measured: 27 },
    { cost: "{1}{W}{B}", slots: 3, measured: 26 },
    { cost: "{2}{U}{B}{R}", slots: 4, measured: 33 },
    { cost: "{W}{U}{B}{R}{G}", slots: 5, measured: 40 },
    {
      cost: "{W}{W}{U}{U}{B}{B}{R}{R}{G}{G}",
      slots: 5,
      measured: 40,
      // Ten symbols over four drawn pips. STATES prints "+7" in this one cell,
      // but the README's rule is the count of symbols NOT drawn, so it is +6.
      label: "+6",
    },
  ];

  for (const { cost, slots, measured, label } of ladder) {
    it(`draws ${cost} in ${slots} slot(s) at ${measured}px`, () => {
      const pips = pipsOf(<CostPips cost={cost} {...TRACK} />);
      expect(pips).toHaveLength(slots);
      expect(widthOf(<CostPips cost={cost} {...TRACK} />, 3)).toBe(measured);
      if (label) expect(pips[pips.length - 1].textContent).toBe(label);
    });
  }

  it("never bursts the track, whatever the cost", () => {
    for (const { cost } of ladder) {
      expect(widthOf(<CostPips cost={cost} {...TRACK} />, 3)).toBeLessThanOrEqual(40);
    }
  });

  // The cap starts at six, not five: a five-symbol cost fits the track exactly,
  // so capping it would hide a symbol to save nothing.
  it("draws five symbols in full and only counts from the sixth", () => {
    const five = pipsOf(<CostPips cost="{W}{U}{B}{R}{G}" {...TRACK} />);
    expect(five.some((p) => p.textContent?.startsWith("+"))).toBe(false);
    const six = pipsOf(<CostPips cost="{W}{U}{B}{R}{G}{G}" {...TRACK} />);
    expect(six[4].textContent).toBe("+2");
  });

  it("keeps the gap real below three and shingles from three", () => {
    expect(pipsOf(<CostPips cost="{2}{W}" {...TRACK} />)[1].style.marginLeft).toBe("");
    expect(pipsOf(<CostPips cost="{1}{W}{B}" {...TRACK} />)[1].style.marginLeft).toBe("-5px");
  });

  it("right-aligns inside a fixed track rather than widening it", () => {
    const { container } = render(<CostPips cost="{U}" {...TRACK} />);
    const run = container.firstElementChild as HTMLElement;
    expect(run.style.width).toBe("40px");
    expect(run.style.justifyContent).toBe("flex-end");
  });

  // The phone meta line takes the same component uncapped, so ten symbols draw
  // ten pips and the line scrolls with the row rather than lying about the cost.
  it("neither fans nor caps without a cap", () => {
    const pips = pipsOf(<CostPips cost="{W}{W}{U}{U}{B}{B}{R}{R}{G}{G}" size={13} />);
    expect(pips).toHaveLength(10);
    expect(pips[1].style.marginLeft).toBe("");
  });
});

describe("CostPips — symbols", () => {
  it("splits a hybrid pip and fills a mono one, keeping any numeral", () => {
    const pips = pipsOf(<CostPips cost="{2}{U/B}{2/W}{G/P}" />);
    expect(pips.map((p) => p.textContent)).toEqual(["2", "", "2", ""]);
    expect(pips[1].style.background).toContain("135deg");
  });

  it("draws generic and colourless on the same grey as the overflow pip", () => {
    const generic = pipsOf(<CostPips cost="{3}" />)[0];
    const overflow = pipsOf(<CostPips cost="{W}{W}{U}{U}{B}{B}" {...TRACK} />)[4];
    expect(generic.style.background).toBe("var(--fg-faint)");
    expect(overflow.style.background).toBe("var(--fg-faint)");
  });

  it("renders nothing for a card with no cost", () => {
    const { container } = render(<CostPips cost="" />);
    expect(container.firstElementChild).toBeNull();
  });
});

describe("CostPips — the spoken cost", () => {
  it("is hidden from sight and the pips from assistive tech", () => {
    const { container } = render(<CostPips cost="{2}{W}" spoken />);
    expect((container.firstElementChild as HTMLElement).getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector(".sr-only")?.textContent).toBe("mana cost 2 white");
  });

  // Ruling 8: the pips truncate, the string never does.
  it("speaks every symbol of a cost the pips capped", () => {
    const { container } = render(
      <CostPips cost="{W}{W}{U}{U}{B}{B}{R}{R}{G}{G}" {...TRACK} spoken />,
    );
    expect(container.querySelector(".sr-only")?.textContent).toBe(
      "mana cost white white blue blue black black red red green green",
    );
  });

  it("says nothing at all when a caller does not ask it to speak", () => {
    const { container } = render(<CostPips cost="{2}{W}" />);
    expect(container.querySelector(".sr-only")).toBeNull();
  });
});
