import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { CartFact, NameFitProvider, fitNames } from "./cart-facts";

// Widths: 10px a name character, a `+N` pill 20px plus 6px a further digit, `, ` 10px, 7px before the pill.
const pill = (rest: number) => 20 + (String(rest).length - 1) * 6;
const fit = (avail: number, names: number[]) => fitNames({ avail, names, sep: 10, gap: 7, pill });

describe("fitNames (call 2, G6, addendum R2 ruling 3)", () => {
  it("shows every name, and no pill, when they all fit", () => {
    expect(fit(200, [80, 80])).toEqual({ shown: 2, cut: false, pill: null });
    // Exactly the width fits.
    expect(fit(170, [80, 80])).toEqual({ shown: 2, cut: false, pill: null });
  });

  it("drops whole names from the end until the rest fit beside a +N pill", () => {
    // Three names need 260; two need 170 + 7 + 20 = 197; one needs 80 + 7 + 20 = 107.
    expect(fit(200, [80, 80, 80])).toEqual({ shown: 2, cut: false, pill: { kind: "count", rest: 1 } });
    expect(fit(196, [80, 80, 80])).toEqual({ shown: 1, cut: false, pill: { kind: "count", rest: 2 } });
  });

  it("leaves room for a wider pill at two digits", () => {
    const names = Array.from({ length: 11 }, () => 40);
    // One name and `+10` (26px): 40 + 7 + 26 = 73; at 72 the first name no longer fits beside it, and is cut.
    expect(fit(73, names)).toEqual({ shown: 1, cut: false, pill: { kind: "count", rest: 10 } });
    expect(fit(72, names)).toEqual({ shown: 1, cut: true, pill: { kind: "count", rest: 10 } });
  });

  it("cuts the first name when it cannot fit beside its pill, the only name ever cut", () => {
    expect(fit(100, [300, 80])).toEqual({ shown: 1, cut: true, pill: { kind: "count", rest: 1 } });
  });

  it("offers `more` for one cut name with nothing after it", () => {
    expect(fit(100, [300])).toEqual({ shown: 1, cut: true, pill: { kind: "more" } });
    // A lone name that fits has no pill at all.
    expect(fit(100, [90])).toEqual({ shown: 1, cut: false, pill: null });
  });

  it("shows every name before anything is measured", () => {
    expect(fit(0, [300, 300])).toEqual({ shown: 2, cut: false, pill: null });
  });
});

describe("CartFact", () => {
  // jsdom lays nothing out: a text's width is 7px a character, and a slot's is the width its test frame names.
  const saved = Element.prototype.getBoundingClientRect;
  beforeEach(() => {
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const w = this.hasAttribute("data-fact-slot")
        ? Number(this.closest("[data-test-width]")?.getAttribute("data-test-width") ?? 0)
        : (this.textContent?.length ?? 0) * 7;
      return { width: w, height: 0, x: 0, y: 0, top: 0, left: 0, right: w, bottom: 0, toJSON: () => ({}) } as DOMRect;
    };
  });
  afterEach(() => {
    Element.prototype.getBoundingClientRect = saved;
    vi.unstubAllGlobals();
  });

  const decks = [
    { name: "HD - Gishath", count: 1 },
    { name: "HD - Kratos", count: 2 },
    { name: "HD - Thorin", count: 1 },
  ];
  const need = (width: number, items = decks) => (
    <NameFitProvider>
      <div data-test-width={width}>
        <CartFact testId="need" label={copy.facts.need} count={4} items={items} head={copy.facts.forDecks(items.length)} moreAria={copy.facts.moreDecksAria} />
      </div>
    </NameFitProvider>
  );
  const drawnNames = () => document.querySelector("[data-fact-names]")?.textContent;

  it("draws what fits, then +N, and reads every name in full", () => {
    // `HD - Gishath, HD - Kratos` is 25 characters (175px), plus 7 and the 14px `+8`: 196 fits, the third name does not.
    render(need(200));
    expect(drawnNames()).toBe("HD - Gishath, HD - Kratos");
    const press = screen.getByRole("button", { name: copy.facts.moreDecksAria(1) });
    expect(press.textContent).toBe(copy.facts.more(1));
    expect(press.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".sr-only")?.textContent).toBe("HD - Gishath, HD - Kratos, HD - Thorin");
    expect(screen.getByText(copy.facts.need)).toBeTruthy();
  });

  it("makes room for the pill's own drawn width", () => {
    // Two names and `+1` need 175 + 7 + 14 = 196: at 190 only the first fits beside `+2`. Read without the pill's width
    // (182), two would show and the pill would run past the cell.
    render(need(190));
    expect(drawnNames()).toBe("HD - Gishath");
    expect(screen.getByRole("button", { name: copy.facts.moreDecksAria(2) }).textContent).toBe(copy.facts.more(2));
  });

  it("draws every name, and no pill, when they fit", () => {
    render(need(400));
    expect(drawnNames()).toBe("HD - Gishath, HD - Kratos, HD - Thorin");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("opens the full list in place, each deck with its count, and folds it with less on the same press", () => {
    render(need(200));
    const press = screen.getByRole("button", { name: copy.facts.moreDecksAria(1) });
    press.focus();
    fireEvent.click(press);
    // One press, open and shut: focus does not fall to the page.
    const less = screen.getByRole("button", { name: copy.facts.lessAria });
    expect(less).toBe(press);
    expect(document.activeElement).toBe(press);
    expect(less.textContent).toBe(copy.facts.less);
    expect(less.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(copy.facts.forDecks(3))).toBeTruthy();
    const list = document.getElementById(less.getAttribute("aria-controls")!)!;
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["HD - Gishath1", "HD - Kratos2", "HD - Thorin1"]);
    expect(document.querySelector("[data-fact]")?.hasAttribute("data-fact-open")).toBe(true);
    fireEvent.click(less);
    expect(document.getElementById(less.getAttribute("aria-controls") ?? "none")).toBeNull();
    expect(screen.getByRole("button", { name: copy.facts.moreDecksAria(1) })).toBe(press);
  });

  it("cuts a lone name too wide for its cell and offers more, which opens it whole", () => {
    const long = [{ name: "HD Tune - The Wise Mothman, Apocalypse Cult", count: 1 }];
    render(need(120, long));
    expect(drawnNames()).toBe(long[0].name);
    const press = screen.getByRole("button", { name: copy.facts.moreNameAria });
    expect(press.textContent).toBe(copy.facts.moreName);
    expect(press.getAttribute("data-fact-pill")).toBe("more");
    fireEvent.click(press);
    expect(screen.getByRole("listitem").textContent).toBe(`${long[0].name}1`);
  });

  it("says G1's fallback with no names and no pill", () => {
    render(
      <NameFitProvider>
        <div data-test-width={40}>
          <CartFact label={copy.facts.own} count={2} items={[]} prefix={copy.facts.in} fallback={copy.facts.inOther} head="" moreAria={copy.facts.moreDecksAria} dim />
        </div>
      </NameFitProvider>,
    );
    expect(screen.getByText(copy.facts.inOther)).toBeTruthy();
    expect(screen.queryByText(copy.facts.in)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("watches a whole list with one ResizeObserver, not one a row", () => {
    const made = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor() { made(); }
      observe = observe;
      unobserve() {}
      disconnect() {}
    });
    render(
      <NameFitProvider>
        <div data-test-width={200}>
          {[0, 1, 2].map((i) => (
            <CartFact key={i} label={copy.facts.need} count={1} items={decks} head="" moreAria={copy.facts.moreDecksAria} />
          ))}
        </div>
      </NameFitProvider>,
    );
    expect(made).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledTimes(3);
  });
});
