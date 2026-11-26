import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceStrip } from "./price-strip";
import { priceCopy } from "../../lib/copy/price";
import { exportLinkOutCopy } from "../../lib/copy/decks-builder";
import type { ProvenanceForm } from "../../lib/decks/price";
import { StoreProvider } from "../stores/store-provider";
import { storeCopy } from "../../lib/copy/store";
import { STORE_INFO } from "../../lib/stores/info";

const fresh: ProvenanceForm = { behind: false, when: "Monday" };
const behind: ProvenanceForm = { behind: true, when: "12 August" };

const list = [
  { name: "Sol Ring", quantity: 1 },
  { name: "Cultivate", quantity: 2 },
];

describe("PriceStrip provenance line", () => {
  it("names the source and the day it was checked", () => {
    const { container } = render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
        provenance={fresh}
        shoppingCards={list}
      />,
    );
    expect(screen.getByText(/single-copy prices on Mana Pool/)).toHaveTextContent(priceCopy.strip.provenance);
    expect(container.textContent).toContain(`${priceCopy.strip.box.lastChecked}Monday${priceCopy.strip.cartNote}`);
    // A substring, not a `RegExp` built from the copy: the clause carries
    // punctuation, which a regex would read as syntax.
    expect(container.textContent).not.toContain(priceCopy.strip.behind);
  });

  it("adds the behind clause when the table is behind", () => {
    const { container } = render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
        provenance={behind}
        shoppingCards={list}
      />,
    );
    expect(container.textContent).toContain(
      `${priceCopy.strip.box.lastChecked}12 August${priceCopy.strip.behind} · ${priceCopy.strip.cartNote}`,
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
        shoppingCards={list}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

// One column, both widths (Hugh's ruling, #1222 follow-up): the figure tops
// it, the provenance line and the buy link follow under it. Desktop used to
// `flex-row-reverse` this into a row with the figure at the far end — a
// second arrangement that put the total where it was easily missed.
describe("PriceStrip arrangement", () => {
  it("renders each fact exactly once, reordering rather than duplicating", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
        provenance={fresh}
        shoppingCards={list}
      />,
    );
    expect(screen.getAllByText("$12.40")).toHaveLength(1);
    expect(screen.getAllByText(/single-copy prices on Mana Pool/)).toHaveLength(1);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("draws one To buy box with the total, the date and the buy link in its foot", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
        provenance={fresh}
        shoppingCards={list}
      />,
    );
    const box = screen.getByRole("region", { name: new RegExp(priceCopy.strip.box.title) });
    expect(box).toHaveTextContent(priceCopy.strip.box.total);
    expect(box).toHaveTextContent(priceCopy.strip.box.lastChecked);
    // The link row's own 44px target holds at both widths: the link stays inline text.
    const linkRow = screen.getByRole("link").parentElement!;
    expect(linkRow).toHaveClass("flex", "items-center", "min-h-[44px]");
    expect(linkRow.className).not.toMatch(/md:block|md:min-h-0/);
  });
});

describe("PriceStrip figure line", () => {
  it("shows the total and the priced clause when some copies are unpriced", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
        provenance={fresh}
        shoppingCards={list}
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
        shoppingCards={list}
      />,
    );
    expect(screen.getByText("$12.40")).toBeInTheDocument();
    expect(screen.queryByText(priceCopy.strip.pricedClause(8, 8))).toBeNull();
  });

  // No price at all is not "$0.00", and it is not "0 of 8" either — a fraction
  // over nothing is arithmetic for a sentence the provenance line now says.
  it("drops both the figure and the clause when nothing is priced", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 0, pricedCopies: 0, totalCopies: 8 }}
        provenance={fresh}
        shoppingCards={list}
      />,
    );
    expect(screen.queryByText("$0.00")).toBeNull();
    expect(screen.queryByText(priceCopy.strip.pricedClause(0, 8))).toBeNull();
    expect(screen.getByText(/no prices from Mana Pool/)).toHaveTextContent(priceCopy.strip.provenanceUnpriced);
    // No figure, nothing for a cart to cost more than.
    expect(screen.queryByText(new RegExp(priceCopy.strip.cartNote))).toBeNull();
  });

  // Nothing to shop for is not a total of nothing, and a provenance line above
  // an empty list dates a list with nothing in it.
  it("renders nothing at all when the list is empty", () => {
    const { container } = render(
      <PriceStrip
        summary={{ totalCents: 0, pricedCopies: 0, totalCopies: 0 }}
        provenance={fresh}
        shoppingCards={[]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("PriceStrip buy link", () => {
  // Base64 of UTF-8 BYTES, as `manapoolAddDeckUrl` writes it — `atob` alone
  // returns one char per byte, which turns any card name outside ASCII into
  // mojibake and would let a broken payload pass.
  function hrefList(href: string): string {
    const binary = atob(new URL(href).searchParams.get("deck")!);
    return new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0)));
  }

  it("buys the list it was passed, quantities and all", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
        provenance={fresh}
        shoppingCards={list}
      />,
    );
    const link = screen.getByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) });
    expect(link).toHaveAttribute("href", expect.stringContaining("manapool.com/add-deck"));
    expect(hrefList(link.getAttribute("href")!)).toBe("1 Sol Ring\n2 Cultivate");
  });

  // Card names carry accents and Æ, and a payload built from raw char codes
  // would hand the store a different card than the one on screen.
  it("carries a name outside ASCII through the payload intact", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
        provenance={fresh}
        shoppingCards={[{ name: "Æther Vial", quantity: 1 }]}
      />,
    );
    expect(hrefList(screen.getByRole("link").getAttribute("href")!)).toBe("1 Æther Vial");
  });

  // The link buys every row on the list, priced or not — the unpriced ones are
  // cards the store may well stock, and a basket of only the six we could price
  // would be a basket the player did not ask for.
  it("buys the unpriced rows too, in every price state", () => {
    for (const summary of [
      { totalCents: 1240, pricedCopies: 6, totalCopies: 8 },
      { totalCents: 1240, pricedCopies: 8, totalCopies: 8 },
      { totalCents: 0, pricedCopies: 0, totalCopies: 8 },
    ]) {
      const { unmount } = render(
        <PriceStrip summary={summary} provenance={fresh} shoppingCards={list} />,
      );
      expect(hrefList(screen.getByRole("link").getAttribute("href")!)).toBe(
        "1 Sol Ring\n2 Cultivate",
      );
      unmount();
    }
  });

  // Absent, not disabled: the link carries no condition of its own, so it cannot
  // render where the strip would be wrong.
  it("is absent when the strip is", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 0, pricedCopies: 0, totalCopies: 0 }}
        provenance={fresh}
        shoppingCards={[]}
      />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("opens in a new tab without handing Mana Pool the opener", () => {
    render(
      <PriceStrip
        summary={{ totalCents: 1240, pricedCopies: 6, totalCopies: 8 }}
        provenance={fresh}
        shoppingCards={list}
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
  });
});

describe("PriceStrip by store (store choice)", () => {
  const summary = { totalCents: 1240, pricedCopies: 3, totalCopies: 3 };
  const strip = (store: "manapool" | "tcgplayer" | "cardkingdom") =>
    render(
      <StoreProvider store={store}>
        <PriceStrip summary={summary} provenance={fresh} shoppingCards={list} />
      </StoreProvider>,
    );

  it("names TCGplayer's market prices with the accuracy note, and offers the list to paste instead of a cart link", () => {
    const { container } = strip("tcgplayer");
    expect(container.textContent).toContain(`${storeCopy.provenance(STORE_INFO.tcgplayer)} · ${storeCopy.marketNote}`);
    expect(container.textContent).toContain(`${priceCopy.strip.box.lastChecked}Monday`);
    expect(container.textContent).not.toContain(priceCopy.strip.cartNote);
    expect(container.querySelector("[data-no-cart]")).toHaveTextContent(storeCopy.noCart(STORE_INFO.tcgplayer));
    expect(screen.getByRole("button", { name: storeCopy.copyAria(3) })).toBeTruthy();
    expect(screen.queryByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) })).toBeNull();
  });

  it("names Card Kingdom's listings without the market note", () => {
    const { container } = strip("cardkingdom");
    expect(container.textContent).toContain(storeCopy.provenance(STORE_INFO.cardkingdom));
    expect(container.textContent).toContain(`${priceCopy.strip.box.lastChecked}Monday`);
    expect(container.textContent).not.toContain(storeCopy.marketNote);
    expect(container.querySelector('[data-store-paste="cardkingdom"]')).toBeTruthy();
  });

  it("under Mana Pool draws exactly what it drew before stores", () => {
    const { container } = strip("manapool");
    expect(container.querySelector("[data-no-cart]")).toBeNull();
    expect(container.querySelector("[data-store-paste]")).toBeNull();
    expect(screen.getByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) })).toBeTruthy();
  });
});
