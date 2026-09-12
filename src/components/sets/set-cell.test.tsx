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
  owned: false, byName: false, foilOnly: false, ...over,
});

const fact = (over: Partial<PriceFact>): PriceFact => ({
  cents: 120, foilCents: null, etchedCents: null, asOf: NEWEST, ...over,
});

const art = (c: HTMLElement) => c.querySelector("img") as HTMLImageElement;
const plate = (c: HTMLElement) => c.querySelector("button > span") as HTMLElement;

describe("SetCell — the dim", () => {
  it("dims the art and dashes the edge on a missing cell", () => {
    const { container } = render(<SetCell cell={cell({})} />);
    expect(art(container).style.opacity).toBe("0.28");
    expect(art(container).style.filter).toBe("saturate(.55)");
    expect(plate(container).style.border).toContain("dashed");
  });

  it("uses --fg-locked for the dashed edge, never --border-dashed", () => {
    // --border-dashed measures 1.46:1 to 1.97:1 against --surface-sunken and fails the
    // 3:1 non-text floor in all six themes.
    const { container } = render(<SetCell cell={cell({})} />);
    expect(plate(container).style.border).toContain("var(--fg-locked)");
    expect(plate(container).style.border).not.toContain("--border-dashed");
  });

  it("leaves an owned cell's art at full strength", () => {
    const { container } = render(<SetCell cell={cell({ owned: true })} />);
    expect(art(container).style.opacity).toBe("1");
    expect(plate(container).style.border).toContain("solid");
  });

  it("keeps the name at full strength on a missing cell — the dim is on the art only", () => {
    render(<SetCell cell={cell({})} />);
    expect(screen.getByText("Faller's Faithful")).toHaveStyle({ color: "var(--fg-body)" });
  });

  it("gives owned and missing cells identical geometry so the grid never reflows", () => {
    const { container: a } = render(<SetCell cell={cell({ owned: true })} />);
    const { container: b } = render(<SetCell cell={cell({ owned: false })} />);
    const box = (c: HTMLElement) => {
      const s = plate(c).style;
      return { width: s.width, height: s.height, borderRadius: s.borderRadius };
    };
    expect(box(a)).toEqual(box(b));
  });
});

describe("SetCell — marks", () => {
  it("marks a foil-only holding", () => {
    render(<SetCell cell={cell({ owned: true, foilOnly: true })} />);
    expect(screen.getByText("◆ FOIL")).toBeInTheDocument();
  });

  it("marks a fill that was matched by name", () => {
    render(<SetCell cell={cell({ owned: true, byName: true })} />);
    expect(screen.getByText("BY NAME")).toBeInTheDocument();
  });

  it("never marks a missing cell by name — only a filled cell was matched to anything", () => {
    render(<SetCell cell={cell({ owned: false, byName: true })} />);
    expect(screen.queryByText("BY NAME")).toBeNull();
  });
});

describe("SetCell — caption and price", () => {
  it("captions the collector number and rarity in the shipped tile's format", () => {
    render(<SetCell cell={cell({})} />);
    expect(screen.getByText("042")).toBeInTheDocument();
    expect(screen.getByText("· uncommon")).toBeInTheDocument();
  });

  it("drops rarity below md, where the caption has room for two things", () => {
    render(<SetCell cell={cell({})} />);
    expect(screen.getByText("· uncommon").className).toContain("hidden md:inline");
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
});

describe("SetCell — the target", () => {
  it("is one target and holds no control of its own", () => {
    const { container } = render(<SetCell cell={cell({})} />);
    expect(container.querySelectorAll("button")).toHaveLength(1);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("opens the card it names", () => {
    const onOpen = vi.fn();
    render(<SetCell cell={cell({ oracleId: "o-42" })} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledWith("o-42");
  });

  it("says whether the card is yours in its accessible name", () => {
    render(<SetCell cell={cell({ owned: true })} />);
    expect(screen.getByRole("button", {
      name: "Faller's Faithful, 042, in your collection",
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
    render(<SetCell cell={cell({ owned: true, foilOnly: true })} />);
    expect(screen.getByRole("button", { name: /You hold this in foil/ })).toBeInTheDocument();
  });

  it("explains a by-name match and what to do about it", () => {
    render(<SetCell cell={cell({ owned: true, byName: true })} />);
    expect(screen.getByRole("button", { name: /matched to this set by name/ }))
      .toBeInTheDocument();
  });
});
