import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SetCell } from "./set-cell";
import type { Cell } from "../../lib/sets/completion";
import type { PriceFact } from "../../lib/decks/price";

const NEWEST = new Date("2026-09-08T09:00:00Z");

const cell = (over: Partial<Cell>): Cell => ({
  scryfallId: "s", oracleId: "o", collectorNumber: "042", name: "Faller's Faithful",
  imageUriSmall: "https://cards.scryfall.io/small/a.jpg", colorIdentity: ["W"],
  rarity: "uncommon", booster: true, isVariant: false,
  owned: false, byName: false, foilOnly: false, finishes: [], ...over,
});

const fact = (over: Partial<PriceFact>): PriceFact => ({
  cents: 120, foilCents: null, etchedCents: null, asOf: NEWEST, ...over,
});

const art = (c: HTMLElement) => c.querySelector("img") as HTMLImageElement;
const plate = (c: HTMLElement) => c.querySelector("button > span") as HTMLElement;

describe("SetCell — the dim", () => {
  it("dims the art and dashes the edge on a missing cell", () => {
    const { container } = render(<SetCell cell={cell({})}  newestAsOf={null}/>);
    expect(art(container).style.opacity).toBe("0.28");
    expect(art(container).style.filter).toBe("saturate(.55)");
    expect(plate(container).style.border).toContain("dashed");
  });

  it("uses --fg-locked for the dashed edge, never --border-dashed", () => {
    // --border-dashed measures 1.46:1 to 1.97:1 against --surface-sunken and fails the
    // 3:1 non-text floor in all six themes.
    const { container } = render(<SetCell cell={cell({})}  newestAsOf={null}/>);
    expect(plate(container).style.border).toContain("var(--fg-locked)");
    expect(plate(container).style.border).not.toContain("--border-dashed");
  });

  it("leaves an owned cell's art at full strength", () => {
    const { container } = render(<SetCell cell={cell({ owned: true })}  newestAsOf={null}/>);
    expect(art(container).style.opacity).toBe("1");
    expect(plate(container).style.border).toContain("solid");
  });

  it("keeps the name at full strength on a missing cell — the dim is on the art only", () => {
    render(<SetCell cell={cell({})}  newestAsOf={null}/>);
    expect(screen.getByText("Faller's Faithful")).toHaveStyle({ color: "var(--fg-body)" });
  });

  it("gives owned and missing cells identical geometry so the grid never reflows", () => {
    const { container: a } = render(<SetCell cell={cell({ owned: true })}  newestAsOf={null}/>);
    const { container: b } = render(<SetCell cell={cell({ owned: false })}  newestAsOf={null}/>);
    const box = (c: HTMLElement) => {
      const s = plate(c).style;
      return { width: s.width, height: s.height, borderRadius: s.borderRadius };
    };
    expect(box(a)).toEqual(box(b));
  });
});

describe("SetCell — marks", () => {
  it("marks a foil-only holding", () => {
    render(<SetCell cell={cell({ owned: true, foilOnly: true })}  newestAsOf={null}/>);
    expect(screen.getByText("◆ FOIL")).toBeInTheDocument();
  });

  it("marks a fill that was matched by name", () => {
    render(<SetCell cell={cell({ owned: true, byName: true })}  newestAsOf={null}/>);
    expect(screen.getByText("BY NAME")).toBeInTheDocument();
  });

  it("never marks a missing cell by name — only a filled cell was matched to anything", () => {
    render(<SetCell cell={cell({ owned: false, byName: true })}  newestAsOf={null}/>);
    expect(screen.queryByText("BY NAME")).toBeNull();
  });
});

describe("SetCell — caption and price", () => {
  it("captions the collector number and rarity in the shipped tile's format", () => {
    render(<SetCell cell={cell({})}  newestAsOf={null}/>);
    expect(screen.getByText("042")).toBeInTheDocument();
    expect(screen.getByText("· uncommon")).toBeInTheDocument();
  });

  // Addendum R2 §27: the caption format stops varying by width. The phone cell is ~114px
  // under `/collection`'s 3-up tracks, and the caption still fits.
  it("keeps rarity at every width", () => {
    render(<SetCell cell={cell({})}  newestAsOf={null}/>);
    expect(screen.getByText("· uncommon").className).not.toContain("hidden");
  });

  it("renders `no stock` holding the tag's height when the feed has never carried it", () => {
    render(<SetCell cell={cell({})} price={null} newestAsOf={NEWEST} />);
    expect(screen.getByText("no stock")).toBeInTheDocument();
  });

  it("prefixes the foil mark when only a foil price exists", () => {
    render(
      <SetCell
        cell={cell({})}
        price={fact({ cents: null, foilCents: 500 })}
        newestAsOf={NEWEST}
      />,
    );
    expect(screen.getByText("◆ foil $5.00")).toBeInTheDocument();
  });

  it("reads a sold-out row as no stock rather than quoting its last known price", () => {
    render(
      <SetCell
        cell={cell({})}
        price={fact({ asOf: new Date("2026-09-01T09:00:00Z") })}
        newestAsOf={NEWEST}
      />,
    );
    expect(screen.getByText("no stock")).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it("carries no price tag on an owned cell — the tag is a carrier of missing", () => {
    render(<SetCell cell={cell({ owned: true })} price={fact({})} newestAsOf={NEWEST} />);
    expect(screen.queryByText("$1.20")).toBeNull();
  });

  it("draws an owned cell's figure as text, at the finish held, and says it", () => {
    const { container } = render(
      <SetCell cell={cell({ owned: true, finishes: ["foil"] })} price={fact({ foilCents: 450 })} newestAsOf={NEWEST} />,
    );
    expect(screen.getByText("$4.50")).toBeInTheDocument();
    expect(screen.getByText("foil")).toBeInTheDocument();
    expect(container.querySelector("button")?.getAttribute("aria-label")).toMatch(/\$4\.50 foil/);
  });

  it("says no stock on an owned cell whose printing the store never carried", () => {
    render(<SetCell cell={cell({ owned: true, finishes: ["nonfoil"] })} price={null} newestAsOf={NEWEST} />);
    expect(screen.getByText("no stock")).toBeInTheDocument();
  });
});

describe("SetCell — the target", () => {
  it("is one target and holds no control of its own", () => {
    const { container } = render(<SetCell cell={cell({})}  newestAsOf={null}/>);
    expect(container.querySelectorAll("button")).toHaveLength(1);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("opens the card it names", () => {
    const onOpen = vi.fn();
    render(<SetCell cell={cell({ oracleId: "o-42" })} onOpen={onOpen}  newestAsOf={null}/>);
    fireEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledWith("o-42");
  });

  it("says whether the card is yours in its accessible name", () => {
    render(<SetCell cell={cell({ owned: true })}  newestAsOf={null}/>);
    expect(screen.getByRole("button", {
      name: /^Faller's Faithful, 042, in your collection/,
    })).toBeInTheDocument();
  });
});

describe("SetCell — the accessible name carries the state the tag shows", () => {
  // An explicit aria-label on the button replaces what its descendants contribute, so
  // every one of these was visible and announced to nobody.
  it("says a card has never been stocked", () => {
    render(<SetCell cell={cell({})} price={null} newestAsOf={NEWEST} />);
    expect(screen.getByRole("button", { name: /Never stocked at ManaPool/ }))
      .toBeInTheDocument();
  });

  it("says a live row carries no price, rather than that it was never stocked", () => {
    render(
      <SetCell
        cell={cell({})}
        price={fact({ cents: null, foilCents: null, etchedCents: null })}
        newestAsOf={NEWEST}
      />,
    );
    expect(screen.getByRole("button", { name: /No price in this feed/ })).toBeInTheDocument();
  });

  it("says a card is sold out rather than never stocked", () => {
    render(
      <SetCell
        cell={cell({})}
        price={fact({ asOf: new Date("2026-09-01T09:00:00Z") })}
        newestAsOf={NEWEST}
      />,
    );
    expect(screen.getByRole("button", { name: /Sold out at ManaPool/ })).toBeInTheDocument();
  });

  it("says a price is foil only", () => {
    render(
      <SetCell
        cell={cell({})}
        price={fact({ cents: null, foilCents: 500 })}
        newestAsOf={NEWEST}
      />,
    );
    expect(screen.getByRole("button", { name: /Available in foil only/ })).toBeInTheDocument();
  });

  it("says an owned copy is foil", () => {
    render(<SetCell cell={cell({ owned: true, foilOnly: true })}  newestAsOf={null}/>);
    expect(screen.getByRole("button", { name: /You hold this in foil/ })).toBeInTheDocument();
  });

  it("explains a by-name match and what to do about it", () => {
    render(<SetCell cell={cell({ owned: true, byName: true })}  newestAsOf={null}/>);
    expect(screen.getByRole("button", { name: /matched to this set by name/ }))
      .toBeInTheDocument();
  });
});

// Addendum R2 §27. The track sets the width and `aspect-ratio: 63/88` sets the height, so
// the identical-geometry constraint the grid depends on is true by construction rather than
// by two pairs of literals kept in step by hand.
describe("SetCell — no size literal at any width", () => {
  /**
   * Any width or height that is a MEASUREMENT, at any breakpoint: an arbitrary value
   * (`w-[116px]`), a scale step (`h-10`), a fraction (`w-1/2`) or the 1px `w-px`.
   * `w-full` and `h-full` are
   * deliberately allowed — they are the cell taking the track's width, which is the ruling
   * rather than a violation of it. The first version of this matcher recognised only
   * `md:`-prefixed `px` values, so a regression under `sm:` or a plain `w-10` would have
   * passed a test whose whole subject is "at any width"; `w-px` is a fixed 1px and belongs
   * in the same net.
   */
  const sizeLiteral =
    /(?:^|\s)(?:[a-z0-9.]+:)*[wh]-(?:\[[^\]]*\]|px|\d+(?:\.\d+)?|\d+\/\d+)(?=\s|$)/;

  it("carries no width or height literal on any element it renders", () => {
    const { container } = render(<SetCell cell={cell({ owned: true, byName: true, foilOnly: true })}  newestAsOf={null}/>);
    const offenders = [...container.querySelectorAll<HTMLElement>("*")]
      .map((el) => el.className)
      .filter((c) => typeof c === "string" && sizeLiteral.test(c));
    expect(offenders).toEqual([]);
  });

  // Inline styles too, and scoped to the two elements the ruling is about: the by-name
  // marker inside the plate carries a deliberate 7px box, which is a glyph and not the cell.
  it("sizes neither the cell nor its plate from an inline style", () => {
    const { container } = render(<SetCell cell={cell({ owned: true, byName: true })}  newestAsOf={null}/>);
    const button = container.querySelector("button") as HTMLElement;
    const plate = container.querySelector(".aspect-\\[63\\/88\\]") as HTMLElement;
    for (const el of [button, plate]) {
      expect(el.style.width).toBe("");
      expect(el.style.height).toBe("");
    }
  });

  it("catches a literal if one comes back", () => {
    // The matcher's own test, because a regex that matches nothing passes every assertion
    // above while proving nothing.
    expect(sizeLiteral.test("group flex w-[108px] flex-col")).toBe(true);
    expect(sizeLiteral.test("relative block sm:h-[151px]")).toBe(true);
    expect(sizeLiteral.test("mt-[6px] w-10 flex")).toBe(true);
    expect(sizeLiteral.test("flex h-px bg-[color:var(--border)]")).toBe(true);
    expect(sizeLiteral.test("mt-[2px] block w-full truncate")).toBe(false);
    expect(sizeLiteral.test("relative block aspect-[63/88] w-full")).toBe(false);
  });

  it("sizes the art by aspect ratio instead", () => {
    const { container } = render(<SetCell cell={cell({})}  newestAsOf={null}/>);
    expect(container.querySelector(".aspect-\\[63\\/88\\]")).not.toBeNull();
  });

  it("gives owned and missing cells the same classes bar the art's own", () => {
    const { container: owned } = render(<SetCell cell={cell({ owned: true })}  newestAsOf={null}/>);
    const { container: missing } = render(<SetCell cell={cell({ owned: false })}  newestAsOf={null}/>);
    const shape = (root: HTMLElement) =>
      (root.querySelector("button") as HTMLElement).className;
    expect(shape(owned)).toBe(shape(missing));
  });
});
