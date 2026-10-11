import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { BuyTag } from "./buy-tag";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { priceCopy } from "../../lib/copy/price";
import type { PriceFact, ProvenanceForm } from "../../lib/decks/price";

const NEWEST = new Date("2026-09-01T09:00:00Z");
const OLDER = new Date("2026-08-25T09:00:00Z");

const fact = (over: Partial<PriceFact> = {}): PriceFact => ({
  cents: null,
  foilCents: null,
  etchedCents: null,
  asOf: NEWEST,
  ...over,
});

const PRICED = fact({ cents: 210 });
const FOIL_ONLY = fact({ foilCents: 940 });
const ETCHED_ONLY = fact({ etchedCents: 1250 });
const SOLD_OUT = fact({ cents: 210, asOf: OLDER });

const provenance: ProvenanceForm = { behind: false, when: "Monday" };
const behind: ProvenanceForm = { behind: true, when: "12 August" };

const VARIANTS = ["row", "tile"] as const;

describe("BuyTag tails", () => {
  for (const variant of VARIANTS) {
    describe(`variant ${variant}`, () => {
      it("priced appends the figure", () => {
        render(<BuyTag variant={variant} price={PRICED} newestAsOf={NEWEST} />);
        expect(screen.getByText("$2.10")).toBeInTheDocument();
      });

      it("foil-only appends the foil figure and its qualifier", () => {
        render(<BuyTag variant={variant} price={FOIL_ONLY} newestAsOf={NEWEST} />);
        expect(screen.getByText("$9.40")).toBeInTheDocument();
        expect(screen.getByText(priceCopy.tag.foil)).toBeInTheDocument();
      });

      it("etched-only qualifies as etched, not foil", () => {
        render(<BuyTag variant={variant} price={ETCHED_ONLY} newestAsOf={NEWEST} />);
        expect(screen.getByText("$12.50")).toBeInTheDocument();
        expect(screen.getByText(priceCopy.tag.etched)).toBeInTheDocument();
        expect(screen.queryByText(priceCopy.tag.foil)).toBeNull();
      });

      it("a row older than the newest reads sold out, with no figure", () => {
        render(<BuyTag variant={variant} price={SOLD_OUT} newestAsOf={NEWEST} />);
        expect(screen.getByText(priceCopy.tag.soldOut)).toBeInTheDocument();
        expect(screen.queryByText("$2.10")).toBeNull();
      });

      // Silence is the state. A dash or a zero would be a claim the feed never
      // made — the bare tag already says everything true about the card.
      it("absent renders the bare tag and no tail", () => {
        const { container } = render(
          <BuyTag variant={variant} price={null} newestAsOf={NEWEST} />,
        );
        expect(container.textContent).toBe(addPanelCopy.unowned.tag);
      });

      it("a fact with no price columns at all also renders bare", () => {
        const { container } = render(
          <BuyTag variant={variant} price={fact()} newestAsOf={NEWEST} />,
        );
        expect(container.textContent).toBe(addPanelCopy.unowned.tag);
      });

      // Liveness is a comparison against the table's newest row. With no newest
      // row there is nothing to compare against, so no state can be asserted.
      it("renders bare when the table has no newest row", () => {
        const { container } = render(
          <BuyTag variant={variant} price={PRICED} newestAsOf={null} />,
        );
        expect(container.textContent).toBe(addPanelCopy.unowned.tag);
      });
    });
  }

  // State 4 of the design table: the tag as it shipped, byte for byte. A price
  // pass that changed the unpriced tag would be changing a surface it has
  // nothing to say about.
  it("the unpriced tag is byte-identical to the tag without the price props", () => {
    const before = render(<BuyTag variant="row" />).container.innerHTML;
    const after = render(
      <BuyTag variant="row" price={null} newestAsOf={NEWEST} provenance={provenance} />,
    ).container.innerHTML;
    expect(after).toBe(before);
  });
});

describe("BuyTag accessible name", () => {
  // The row passes no label: `buy` already sits in the row's reading order, and
  // a second utterance there would double-announce the card.
  it("unlabelled speaks only the word, whatever the price", () => {
    const { container } = render(
      <BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} provenance={provenance} />,
    );
    expect(container.querySelector(".sr-only")).toBeNull();
    expect(container.textContent).toContain("$2.10");
  });

  it("labelled appends the figure and its provenance to the shipped sentence", () => {
    const { container } = render(
      <BuyTag
        variant="tile"
        label="Sol Ring, not owned"
        price={PRICED}
        newestAsOf={NEWEST}
        provenance={provenance}
      />,
    );
    expect(container.querySelector(".sr-only")).toHaveTextContent(
      `Sol Ring, not owned. ${priceCopy.aria.priced("$2.10", "Monday")}`,
    );
  });

  // The qualifier names which printing the figure belongs to, so a sentence
  // that drops it quotes a foil price as if it were the card's.
  it("carries the foil qualifier into the spoken figure", () => {
    const { container } = render(
      <BuyTag
        variant="tile"
        label="Sol Ring, not owned"
        price={FOIL_ONLY}
        newestAsOf={NEWEST}
        provenance={provenance}
      />,
    );
    expect(container.querySelector(".sr-only")).toHaveTextContent(
      `Sol Ring, not owned. ${priceCopy.aria.priced(`$9.40 ${priceCopy.tag.foil}`, "Monday")}`,
    );
  });

  it("labelled uses the behind sentence when the table is behind", () => {
    const { container } = render(
      <BuyTag
        variant="tile"
        label="Sol Ring, not owned"
        price={PRICED}
        newestAsOf={NEWEST}
        provenance={behind}
      />,
    );
    expect(container.querySelector(".sr-only")).toHaveTextContent(
      `Sol Ring, not owned. ${priceCopy.aria.pricedBehind("$2.10", "12 August")}`,
    );
  });

  // One utterance per price: where the sentence carries the figure, the visible
  // tail is hidden from the reader rather than read out a second time.
  it("hides the tail from readers only when the sentence already carries it", () => {
    const { container } = render(
      <BuyTag
        variant="tile"
        label="Sol Ring, not owned"
        price={PRICED}
        newestAsOf={NEWEST}
        provenance={provenance}
      />,
    );
    expect(screen.getByText("$2.10").closest("[aria-hidden='true']")).not.toBeNull();
    expect(container.querySelector(".sr-only")).not.toBeNull();
  });

  // `sold out` is never in the spoken sentence, so hiding its tail would leave
  // a sold-out card silent to a screen reader.
  it("leaves the sold out tail readable", () => {
    render(
      <BuyTag
        variant="tile"
        label="Sol Ring, not owned"
        price={SOLD_OUT}
        newestAsOf={NEWEST}
        provenance={provenance}
      />,
    );
    const tail = screen.getByText(priceCopy.tag.soldOut);
    expect(tail.closest("[aria-hidden='true']")).toBeNull();
  });

  it("speaks the bare label when there is no price to append", () => {
    const { container } = render(
      <BuyTag
        variant="tile"
        label="Sol Ring, not owned"
        price={null}
        newestAsOf={NEWEST}
        provenance={provenance}
      />,
    );
    expect(container.querySelector(".sr-only")).toHaveTextContent("Sol Ring, not owned");
  });
});

describe("BuyTag is not a control", () => {
  for (const variant of VARIANTS) {
    it(`${variant} renders no button, link or click handler`, () => {
      const { container } = render(
        <BuyTag
          variant={variant}
          label="Sol Ring, not owned"
          price={PRICED}
          newestAsOf={NEWEST}
          provenance={provenance}
        />,
      );
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.queryByRole("link")).toBeNull();
      expect(container.querySelector("a,button,[href],[role='button']")).toBeNull();
      expect(container.querySelector("[onclick]")).toBeNull();
    });
  }
});

describe("BuyTag figure slot", () => {
  // The slot belongs to the Shopping list, not to the tag: under `All` the
  // figure hugs the word instead of holding a column open.
  it("reserves the column only when asked", () => {
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} reserveSlot />);
    expect(screen.getByText("$2.10")).toHaveStyle({ minWidth: "46px" });
  });

  it("does not reserve it by default", () => {
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} />);
    expect(screen.getByText("$2.10")).not.toHaveStyle({ minWidth: "46px" });
  });

  // The slot's only job is holding a column open, so it has to survive the
  // longest thing that can land in it. `sold out` is that thing, and a slot
  // narrower than the word would let one row's tail push past the column every
  // other row lines up on.
  it("still holds the column open for `sold out`", () => {
    render(<BuyTag variant="row" price={SOLD_OUT} newestAsOf={NEWEST} reserveSlot />);
    expect(screen.getByText(priceCopy.tag.soldOut)).toHaveStyle({ minWidth: "46px" });
  });
  // Shopping from md to lg is two lines and gives the name every pixel, so the figure hugs the word
  // there and the column opens from lg only (Hugh, 2026-09-26).
  it("reserves it from lg only when asked for lg", () => {
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} reserveSlot="lg" />);
    const figure = screen.getByText("$2.10");
    expect(figure).not.toHaveStyle({ minWidth: "46px" });
    expect(figure.className).toContain("lg:min-w-[46px]");
  });
});

describe("BuyTag collapsed density", () => {
  // The All tab is a list being scanned. What collapses is the drawing only —
  // the word and the figure are what the tag is for, and dropping either from
  // the reading order would make the glyph mean nothing to a reader who cannot
  // see it.
  it("draws the live figure (not a bare $) and speaks the word and the figure in full", () => {
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} density="collapsed" />);
    // A live price always has a figure to show — a bare `$` beside it would read
    // identically to a sold-out or unpriced card (Copilot round 3, medium).
    expect(screen.queryByText("$")).toBeNull();
    expect(screen.getAllByText("$2.10").length).toBeGreaterThan(0);
    expect(screen.getByText(addPanelCopy.unowned.tag)).toBeInTheDocument();
  });

  it("keeps the foil qualifier on a collapsed foil-only figure", () => {
    render(<BuyTag variant="row" price={FOIL_ONLY} newestAsOf={NEWEST} density="collapsed" />);
    // The bare amount alone implies a normal-printing price, which this fact never has
    // (Copilot round 4, medium) — `price.ts` folds the qualifier into the figure for exactly
    // that reason.
    expect(screen.queryByText("$")).toBeNull();
    expect(screen.getAllByText(`$9.40 ${priceCopy.tag.foil}`).length).toBeGreaterThan(0);
  });

  it("still speaks the word when there is no price to speak", () => {
    render(<BuyTag variant="row" density="collapsed" />);
    expect(screen.getByText("$")).toBeInTheDocument();
    expect(screen.getByText(addPanelCopy.unowned.tag)).toBeInTheDocument();
  });

  it("speaks sold out, which is a fact about the shop and never collapses away", () => {
    render(<BuyTag variant="row" price={SOLD_OUT} newestAsOf={NEWEST} density="collapsed" />);
    expect(screen.getByText(priceCopy.tag.soldOut)).toBeInTheDocument();
    // No LIVE figure exists for this fact, so the glyph keeps standing for the word.
    expect(screen.getByText("$")).toBeInTheDocument();
  });

  it("is the full tag by default", () => {
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} />);
    expect(screen.queryByText("$")).toBeNull();
  });
});

describe("BuyTag as I got it's button (press)", () => {
  const press = (over: Partial<import("./buy-tag").BuyTagPress> = {}) => ({
    onPress: vi.fn(),
    state: "rest" as const,
    cardName: "Etali, Primal Conqueror",
    ...over,
  });

  it("is a plain span with no press: no button anywhere", () => {
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} density="full" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(addPanelCopy.unowned.tag)).toBeInTheDocument();
  });

  it("is a button with a press, named by tagAria and described by the tag's own sentence", () => {
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} density="full" press={press()} />);
    const button = screen.getByRole("button", { name: gotItCopy.row.tagAria("Etali, Primal Conqueror") });
    expect(button).toHaveAccessibleDescription(/^buy\s?\$2\.10$/);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("carries the spoken-for sentence as its description, not as its name", () => {
    render(
      <BuyTag variant="row" label="a second copy to buy" price={PRICED} newestAsOf={NEWEST} density="full" press={press()} />,
    );
    const button = screen.getByRole("button", { name: gotItCopy.row.tagAria("Etali, Primal Conqueror") });
    expect(button.getAttribute("aria-describedby")).toBeTruthy();
    expect(button).toHaveAccessibleDescription(/a second copy to buy/);
  });

  it("puts `over $X` under the plate, inside the button, and in the description", () => {
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} density="full" press={press({ under: "over $10" })} />);
    const button = screen.getByRole("button");
    expect(button).toContainElement(screen.getByText("over $10"));
    expect(button).toHaveAccessibleDescription(/over \$10/);
  });

  it("draws the focus ring on the plate, not around the 44px stack", () => {
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} density="full" press={press({ under: "over $10" })} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("focus-visible:outline-none");
    const plate = button.firstElementChild as HTMLElement;
    expect(plate.className).toContain("group-focus-visible/buy:outline-[color:var(--accent)]");
    expect(plate.className).toContain("group-focus-visible/buy:outline-offset-2");
  });

  // A touch browser keeps :hover after a tap, so the hover wash is desktop's alone.
  it("draws the hover wash from lg only, and the press wash at every width", () => {
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} density="full" press={press()} />);
    const plate = screen.getByRole("button").firstElementChild as HTMLElement;
    expect(plate.className).toContain("lg:group-hover/buy:bg-");
    expect(plate.className).not.toMatch(/(^|\s)group-hover\/buy:/);
    expect(plate.className).toMatch(/(^|\s)group-active\/buy:bg-/);
  });

  it("opens on a press at rest, and does not let the press reach the row", () => {
    const p = press();
    const rowClick = vi.fn();
    render(
      <div onClick={rowClick}>
        <BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} density="full" press={p} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(p.onPress).toHaveBeenCalledTimes(1);
    expect(rowClick).not.toHaveBeenCalled();
  });

  it("holds the open wash while the confirm is up", () => {
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} density="full" press={press({ state: "open" })} />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button.firstElementChild?.className).toContain("var(--warning)_24%");
  });

  it("reads `adding…` in the figure slot while pending, and takes no second press", () => {
    const p = press({ state: "pending" });
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} density="full" press={p} />);
    expect(screen.getByText(gotItCopy.row.pending)).toBeInTheDocument();
    expect(screen.queryByText("$2.10")).toBeNull();
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(p.onPress).not.toHaveBeenCalled();
  });

  it("reads `adding…` on a bare tag too", () => {
    render(<BuyTag variant="row" price={null} newestAsOf={NEWEST} density="full" press={press({ state: "pending" })} />);
    expect(screen.getByText(gotItCopy.row.pending)).toBeInTheDocument();
  });

  it("takes no press while disabled", () => {
    const p = press({ state: "disabled" });
    render(<BuyTag variant="row" price={SOLD_OUT} newestAsOf={NEWEST} density="full" press={p} />);
    fireEvent.click(screen.getByRole("button"));
    expect(p.onPress).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-disabled", "true");
  });

  it("stays inert on the All tab's collapsed tag even when handed a press", () => {
    render(<BuyTag variant="row" price={PRICED} newestAsOf={NEWEST} density="collapsed" press={press()} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
