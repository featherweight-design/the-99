// The diff row's two mountings, and the four facts only one of them passes. What
// is tested here is that the review page's row draws a cost, a price and a
// sleeved dot from those facts, and that the update flow's row — which passes
// none of them — draws exactly what it drew before: the source line in the
// trailing column, a bare `buy` tag, and no pips.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { availabilityCopy } from "../../lib/copy/availability";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { spokenManaCost } from "../../lib/copy/card-surfaces";
import { CardDetailProvider, cardDetailCopy } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { DiffRowIn, DiffRowOut, type DiffRowCard } from "./update-diff-row";
import { COST_TRACK } from "../ui/cost-pips";

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
  it("names the deck sleeving the copy, and stacks the row at every width", () => {
    const row = draw(
      <DiffRowIn
        review
        card={card({ committed: true, manaCost: "{1}{U}" })}
        sourceLine={null}
        heldBy="Kess Storm"
        action={<button type="button">Pull it</button>}
      />,
    );
    // The deck name is the flexible item on the second line at every width, so a
    // long one ellipsizes rather than pushing the price and the control off the row.
    const held = screen.getByText(deckVersioningCopy.review.heldBy("Kess Storm"));
    expect(held.className).toContain("flex-1");
    expect(held.className).toContain("truncate");
    expect(held.className).toContain("min-w-[90px]");
    // Nothing about it is width-conditional now that it never shares a line with
    // the card name: the desktop row that dissolved these lines could not fit them.
    expect(held.className).not.toContain("md:");
    const name = screen.getByRole("button", {
      name: cardDetailCopy.triggerAria("Cyclonic Rift"),
    });
    expect(name.className).toContain("truncate");
    // Two lines at EVERY width. A single desktop line asks for a dot, a card name,
    // a deck name, a price tag, a 44px control and the cost track against the width
    // a type column gets, so whichever item was flexible went to zero: first the
    // card name, then the deck name once the name had a floor.
    expect(row.className).toContain("flex-col");
    expect(row.className).not.toContain("md:flex-row");
    const lines = Array.from(row.children) as HTMLElement[];
    expect(lines).toHaveLength(2);
    for (const line of lines) expect(line.className).not.toContain("md:contents");
    // The meta line is indented to the name's own text.
    expect(lines[1].className).toContain("pl-[16px]");
  });

  // Addendum R1: 2+ sources that could be chosen — the row names a count, not one
  // of them, since the reader has not picked yet.
  it("names a count rather than a deck when 2+ sources could be chosen", () => {
    draw(
      <DiffRowIn
        review
        card={card({ manaCost: "{1}{U}" })}
        sourceLine={null}
        heldBy="Kess Storm"
        heldByCount={3}
        action={<button type="button">Pull it</button>}
      />,
    );
    expect(screen.getByText(deckVersioningCopy.review.heldByMany(3))).toBeTruthy();
    expect(screen.queryByText(deckVersioningCopy.review.heldBy("Kess Storm"))).toBeNull();
  });

  // Addendum R1: after the pull, the same slot links to the source instead.
  it("draws the post-pull label linked to the source deck, over heldBy/heldByCount", () => {
    draw(
      <DiffRowIn
        review
        card={card({ manaCost: "{1}{U}" })}
        sourceLine={null}
        heldBy="Kess Storm"
        heldByCount={3}
        pulledFrom={{ sourceDeckId: "d9", sourceDeckName: "Prismari Artistry" }}
      />,
    );
    const link = screen.getByRole("link", {
      name: deckVersioningCopy.review.pulledFrom("Prismari Artistry"),
    });
    expect(link.getAttribute("href")).toBe("/decks/d9");
    expect(screen.queryByText(deckVersioningCopy.review.heldByMany(3))).toBeNull();
    expect(screen.queryByText(deckVersioningCopy.review.heldBy("Kess Storm"))).toBeNull();
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

  // A staged add IS a `deck_cards` row, so the figures the review page reads
  // already have this deck's own claim subtracted: `free === 0` there means the
  // collection covers the add, and a brew holding the copy is a soft claim rather
  // than the hard one the un-excluded vantage would report.
  it("reads a review add's availability with this deck's own claim excluded", () => {
    const availability = {
      owned: 1,
      hard: 0,
      soft: 1,
      free: 0,
      claims: [{ id: "d1", name: "Kess Storm", quantity: 1, mature: false, pending: false, commander: false, senior: true }],
    };
    const row = draw(<DiffRowIn review card={card({ owned: true, availability })} sourceLine={null} />);
    expect(row.textContent).toContain(availabilityCopy.marker.soft(1));
    cleanup();
    // The update flow's adds are a proposed import that has written nothing, so
    // nothing of theirs was subtracted and the same figures are a hard claim.
    const update = draw(<DiffRowIn card={card({ owned: true, availability })} sourceLine={null} />);
    // The claim is a brew's, so it is not among `hardDecks` and the hard state has
    // no name to print: the base form is what a nameless hard read draws.
    expect(update.textContent).toContain(availabilityCopy.marker.hard);
  });

  // §Surfaces 2 gives the out column a dot, a name and a cost track, and its
  // header says every row in it goes back to the pool on commit. A `buy` tag there
  // quotes a price for a copy the reader is about to stop needing.
  // The review page and the update diff are the deck's own pages, so one missing copy reads a bare
  // `short` there (deck bug batch, 2026-09-28), where every other surface prints `short 1`.
  it("reads a bare short at one missing copy", () => {
    const availability = {
      owned: 1,
      hard: 2,
      soft: 0,
      free: -1,
      claims: [
        { id: "d1", name: "Kess Storm", quantity: 1, mature: true, pending: false, commander: false, senior: true },
        { id: "d2", name: "Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: false },
      ],
    };
    const row = draw(<DiffRowOut review card={card({ owned: true, availability })} />);
    const marker = Array.from(row.querySelectorAll("span")).find((s) => /^short\b/.test(s.textContent ?? ""));
    expect(marker?.textContent).toMatch(/^short(,|$)/);
    expect(row.textContent).not.toContain("short 1");
  });

  it("quotes no price on a card leaving the deck", () => {
    const price = {
      cents: 2840,
      foilCents: null,
      etchedCents: null,
      asOf: new Date("2026-09-08"),
    };
    const row = draw(
      <DiffRowOut
        review
        card={card({ owned: true, committed: true, price, newestAsOf: new Date("2026-09-08") })}
      />,
    );
    expect(row.textContent).not.toContain("$28.40");
    expect(row.textContent).not.toContain(addPanelCopy.unowned.tag);
    cleanup();
    // An unowned removal reaches the same slot by the other route, and draws just
    // as little: the deck is giving the card up either way.
    const unowned = draw(<DiffRowOut review card={card({ owned: false, price })} />);
    expect(unowned.textContent).not.toContain("$28.40");
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
    expect(empty.style.width).toBe(`${COST_TRACK}px`);
    expect(empty.textContent).toBe("");
    cleanup();
    // The same width a costed removal ends on, which is the point: the name is
    // the row's only flexible item, so a land that drew no track put its
    // availability slot a whole track right of every spell above it.
    const spell = draw(<DiffRowOut review card={card({ manaCost: "{1}{U}" })} />);
    expect((spell.lastElementChild as HTMLElement).style.width).toBe(`${COST_TRACK}px`);
  });

  it("types the availability marker itself, having no meta line to lend it one", () => {
    // The marker sets no size and no family of its own by design, so whatever
    // hosts it has to. `ROW_SHELL` declares a flex box and nothing about type,
    // which left the label painting in the page's sans base — half again the
    // `buy` tag that alternates with it in the same slot.
    const soft = draw(
      <DiffRowIn
        review
        sourceLine={null}
        card={card({
          availability: {
            owned: 1,
            hard: 0,
            soft: 1,
            free: 1,
            claims: [
              {
                id: "d1",
                name: "Atraxa",
                quantity: 1,
                mature: false,
                pending: false,
                commander: false,
                senior: true,
              },
            ],
          },
        })}
      />,
    );
    // Anchored on the label the marker itself writes, then walked up to the
    // marker's own root — three other elements on this row carry `font-mono`
    // with a px size, so any class-only selector finds one of them and passes
    // with the marker left untyped.
    const label = screen.getByText(availabilityCopy.marker.soft(1));
    const marker = label.closest("span.inline-flex");
    expect(marker).toBeTruthy();
    expect(marker!.className).toContain("font-mono");
    // Both steps, by value: the decklist row's own pair. A pattern that takes any
    // px size passes on a marker that drops the `md:` step, which is a size the
    // design specifies and the phone assertion cannot speak for.
    expect(marker!.className).toContain("text-[11px]");
    expect(marker!.className).toContain("md:text-[11.5px]");
    // And the row above it lends nothing, which is why the marker must carry it.
    expect(soft.className).not.toContain("font-mono");
    expect(soft.className).not.toMatch(/text-\[/);
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

// The whole plate opens the card on the review page, because the hover fill says
// it does. What is tested is the three answers the plate has to a click: its own,
// the name's, and the action's.
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
  // The box and the hover fill are the review page's, and this flow draws six row
  // kinds in one list: four of them are other components on the shipped 44px /
  // 12px box, so a pair retuned to the newer geometry would stand 4px shorter and
  // 3px narrower than its own neighbours.
  it("keeps the shipped box and does not hover", () => {
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

  // A modal DFC whose front is a land and whose back is a spell stores
  // `" // {3}{R}"` — a NON-EMPTY string describing a face this row does not
  // show. The row draws no pips for it, so it must keep the box a costless card
  // keeps; a gate on the stored string's truthiness took that box away.
  it("keeps the box for a card whose cost belongs to its back face", () => {
    const row = draw(
      <DiffRowIn card={card({ auto: false, manaCost: " // {3}{R}" })} sourceLine={3} />,
    );
    expect(row.querySelector(".invisible")).toBeTruthy();
  });
});

// A card the deck prints, on both mountings. `draft-state.ts` carries `proxied`
// beside `owned` and leaves the row to decide what to draw — and `owned` is
// forced true for every basic land there, so `owned: true, proxied: true` is an
// ordinary pairing rather than a contrived one.
describe("the dot on a printed row", () => {
  const printed = card({ owned: true, proxied: true });

  for (const [label, node] of [
    ["out", <DiffRowOut key="o" card={printed} />],
    ["in", <DiffRowIn key="i" card={printed} sourceLine={null} />],
  ] as const) {
    it(`draws hollow on the ${label} row, beside the mark`, () => {
      const row = draw(node);

      // The contradiction this closes: a solid green dot immediately left of the
      // `P` the same row renders off the same field.
      expect(row.querySelector('[class*="1px_dashed_var(--fg-locked)"]')).not.toBeNull();
      expect(row.querySelector('[class*="1px_solid_var(--success)"]')).toBeNull();
    });
  }

  it("leaves an ordinary owned row solid", () => {
    const row = draw(<DiffRowOut card={card({ owned: true })} />);

    expect(row.querySelector('[class*="1px_solid_var(--success)"]')).not.toBeNull();
  });
});
