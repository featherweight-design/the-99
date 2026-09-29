import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AvailabilityMarker, markerAria } from "./availability-marker";
import { availabilityCopy } from "../../lib/copy/availability";

// Off-decklist vantage — no excludeDeckId — so `free` really is `owned − hard`
// here. Fixtures for a deck's own list must set `free` explicitly instead.
const a = (owned: number, hard: number, soft: number, names: string[] = []) => ({
  owned,
  hard,
  soft,
  free: owned - hard,
  claims: names.map((n, i) => ({ id: `d${i + 1}`, name: n, quantity: 1, mature: true, pending: false, commander: false, senior: true })),
});

const root = (c: HTMLElement) => c.firstElementChild as HTMLElement;

const deckName = () => document.querySelector("[data-deck-name]") as HTMLElement;

describe("AvailabilityMarker", () => {
  // The single most important behaviour in this feature.
  it("renders nothing at all in the free state", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(4, 0, 0)} density="row" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a card the player does not own", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(0, 0, 0)} density="row" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  // The prefix and the deck name are two sibling spans, so that the name can
  // truncate on its own. getByText's default matcher only ever sees one text
  // node, so it can never match the composed string — read the container.
  const composed = (c: HTMLElement) => c.textContent?.replace(/\s+/g, " ").trim();

  it("names the claiming deck when there is exactly one", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(1, 1, 0, ["Atraxa"])} density="row" />,
    );
    expect(composed(container)).toBe("none free, in Atraxa");
  });

  // The space before the deck name lives at the end of the prefix, and a flex
  // item trims its own trailing whitespace. `whitespace-pre` is what keeps
  // `none free, in Atraxa` from rendering as `none free, inAtraxa` in a browser.
  // jsdom collapses nothing, so only the class can be asserted here.
  it("preserves the space the prefix ends with", () => {
    render(<AvailabilityMarker availability={a(1, 1, 0, ["Atraxa"])} density="row" />);
    const prefix = deckName().previousElementSibling!;
    expect(prefix.textContent).toBe("none free, in ");
    expect(prefix.className).toContain("whitespace-pre");
    expect(prefix.className).not.toContain("whitespace-nowrap");
  });

  it("puts the deck name in its own truncating span", () => {
    render(
      <AvailabilityMarker availability={a(1, 1, 0, ["Atraxa"])} density="row" />,
    );
    const name = deckName();
    expect(name).toHaveTextContent("Atraxa");
    expect(name).toHaveClass("truncate");
  });

  // `linkDeck` is card detail's alone. Everywhere else the marker sits inside a
  // `role="button"` row or an option, where a nested link is invalid — so the
  // default has to be the plain span.
  it("draws the deck name as plain text unless asked for a link", () => {
    render(<AvailabilityMarker availability={a(1, 1, 0, ["Atraxa"])} density="row" />);
    expect(deckName().tagName).toBe("SPAN");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("links the named deck to that deck when asked", () => {
    render(
      <AvailabilityMarker availability={a(1, 1, 0, ["Atraxa"])} density="row" linkDeck />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/decks/d1");
    expect(link).toHaveTextContent("Atraxa");
  });

  // The visible text is a bare proper noun that truncates, so "Atraxa…" alone
  // does not say the link opens a deck.
  it("gives the link a name that says what it opens", () => {
    render(
      <AvailabilityMarker availability={a(1, 1, 0, ["Atraxa"])} density="row" linkDeck />,
    );
    expect(
      screen.getByRole("link", {
        name: availabilityCopy.collection.detailDeckLinkAria("Atraxa"),
      }),
    ).toBeInTheDocument();
  });

  // A silent precedence rule would hide the mistake at the one moment it is
  // still cheap to fix, so the combination throws in dev instead.
  it("refuses to be both spoken and linked", () => {
    expect(() =>
      render(
        <AvailabilityMarker
          availability={a(1, 1, 0, ["Atraxa"])}
          density="row"
          spoken
          linkDeck
        />,
      ),
    ).toThrow(/mutually exclusive/);
  });

  // Nothing to link to: the counted branch names no deck at all.
  it("draws no link when several decks share the claim", () => {
    render(
      <AvailabilityMarker availability={a(2, 2, 0, ["Atraxa", "Kykar"])} density="row" linkDeck />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  // Design table row 3.6: no title-on-marker. A clipped name stays clipped for
  // the eye; `markerAria` is what carries the full name to a screen reader.
  it("hangs no title anywhere on the marker", () => {
    const { container } = render(
      <AvailabilityMarker
        availability={a(1, 1, 0, ["Kykar Spellslinging Wind-Shaper"])}
        density="row"
      />,
    );
    expect(container.querySelectorAll("[title]")).toHaveLength(0);
  });

  it("counts the decks instead of naming them when there are several", () => {
    render(
      <AvailabilityMarker
        availability={a(2, 2, 0, ["Atraxa", "Kykar"])}
        density="row"
      />,
    );
    expect(screen.getByText("none free, across 2 decks")).toBeInTheDocument();
  });

  it("says how short the player is when over-committed", () => {
    render(
      <AvailabilityMarker
        availability={a(1, 3, 0, ["A", "B", "C"])}
        density="row"
      />,
    );
    expect(screen.getByText(/short 2/)).toBeInTheDocument();
  });

  // Glyph plus number plus word: the text alone must distinguish the states,
  // so the marker survives greyscale.
  it("hides the glyph from assistive tech", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(1, 1, 0, ["Atraxa"])} density="row" />,
    );
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

// Property table rows 2.5–2.7 and 3.3–3.4. The plan's draft painted every
// glyph accent at 1px and drew one diamond in every state; the table is the
// authority and disagrees on both.
describe("AvailabilityMarker glyph", () => {
  const glyphOf = (c: HTMLElement) =>
    c.querySelector('[aria-hidden="true"]') as HTMLElement;

  it("draws the soft glyph as a hollow 1.5px outline, never accent", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(2, 0, 1)} density="row" />,
    );
    const g = glyphOf(container);
    expect(g.className).toContain("[border:1.5px_solid_var(--avail-soft)]");
    expect(g.className).toContain("bg-transparent");
    expect(g.className).not.toContain("avail-hard");
  });

  it("fills the hard glyph accent", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(1, 1, 0, ["Atraxa"])} density="row" />,
    );
    expect(glyphOf(container).className).toContain(
      "bg-[color:var(--avail-hard)]",
    );
  });

  // Row 2.7: two --danger diamonds with a 1px seam in the container's own
  // background. One diamond in the over state is the plan's error.
  it("doubles the diamond in the over state", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(1, 3, 0, ["A", "B", "C"])} density="row" />,
    );
    const diamonds = glyphOf(container).querySelectorAll("span");
    expect(diamonds).toHaveLength(2);
    diamonds.forEach((d) =>
      expect(d.className).toContain("bg-[color:var(--danger)]"),
    );
  });

  // "The seam is not a fixed colour" — design table line 124. It has to be
  // repointed to whatever sits behind the marker, so it is a prop.
  it("seams the doubled diamond with the background the caller names", () => {
    const { container } = render(
      <AvailabilityMarker
        availability={a(1, 3, 0, ["A", "B", "C"])}
        density="row"
        seam="var(--elevated-hover)"
      />,
    );
    const front = glyphOf(container).querySelectorAll("span")[1];
    expect(front.style.borderLeft).toBe("1px solid var(--elevated-hover)");
  });

  // The chip draws its own scrim, so its seam is that scrim and nothing else.
  // A caller cannot get it wrong, so it does not get to try.
  it("ignores the seam prop at chip density and uses the scrim", () => {
    const { container } = render(
      <AvailabilityMarker
        availability={a(1, 3, 0, ["A", "B", "C"])}
        density="chip"
        seam="var(--elevated-hover)"
      />,
    );
    const front = glyphOf(container).querySelectorAll("span")[1];
    expect(front.style.borderLeft).toBe("1px solid var(--bg)");
  });
});

// Rows 2.1 and 2.5–2.7: the chip's scrim alpha AND its border both move with
// the state. The plan hardcoded one alpha and no border at all.
describe("AvailabilityMarker chip density", () => {
  it("carries a state-specific scrim and border", () => {
    const soft = root(
      render(<AvailabilityMarker availability={a(2, 0, 1)} density="chip" />)
        .container,
    );
    expect(soft.className).toContain("bg-[color-mix(in_srgb,var(--bg)_86%,transparent)]");
    expect(soft.className).toContain("border-[color:var(--border-dashed)]");

    const hard = root(
      render(
        <AvailabilityMarker
          availability={a(1, 1, 0, ["Atraxa"])}
          density="chip"
        />,
      ).container,
    );
    expect(hard.className).toContain("bg-[color-mix(in_srgb,var(--bg)_90%,transparent)]");
    expect(hard.className).toContain("border-[color:var(--accent)]");

    const over = root(
      render(
        <AvailabilityMarker
          availability={a(1, 3, 0, ["A", "B", "C"])}
          density="chip"
        />,
      ).container,
    );
    expect(over.className).toContain("bg-[color-mix(in_srgb,var(--bg)_92%,transparent)]");
    expect(over.className).toContain("border-[color:var(--danger)]");
  });

  // Rows 2.1–2.3. The next six PRs consume this component, so the chip's
  // geometry and type are pinned here rather than left to a screenshot.
  it("pins the chip's geometry and type to the table", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(1, 1, 0, ["Atraxa"])} density="chip" />,
    );
    const el = root(container);
    // 2.1 — absolutely placed top-left; top-right is the shipped quantity badge.
    expect(el.className).toContain("absolute");
    expect(el.className).toContain("left-[6px]");
    expect(el.className).toContain("top-[6px]");
    expect(el.className).toContain("px-[5px]");
    expect(el.className).toContain("py-[2px]");
    expect(el.className).toContain("gap-[4px]");
    expect(el.className).toContain("rounded-[4px]");
    // 2.2 — the glyph is 6px square whatever the density.
    const glyph = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(glyph.className).toContain("w-[6px]");
    expect(glyph.className).toContain("h-[6px]");
    expect(glyph.className).toContain("rotate-45");
    // 2.3 — mono, 8.5px, 600, 0.02em.
    const labelEl = el.querySelector("span:last-of-type") as HTMLElement;
    expect(labelEl.className).toContain("font-mono");
    expect(labelEl.className).toContain("text-[8.5px]");
    expect(labelEl.className).toContain("font-semibold");
    expect(labelEl.className).toContain("tracking-[0.02em]");
  });

  // A 63×88 tile has no room for a proper noun, and every chip the canvases
  // draw is count-only. Density decides this, not the caller, so no second
  // tile surface can forget the flag.
  it("never speaks a deck name", () => {
    const { container } = render(
      <AvailabilityMarker
        availability={a(1, 1, 0, ["Atraxa"])}
        density="chip"
      />,
    );
    expect(container.textContent).toBe("none free");
    expect(screen.queryByTitle("Atraxa")).toBeNull();
  });
});

// Row 3.1: the row marker "takes no column and no row height". It rides the
// shipped meta line, so it must not set a font size or a family of its own —
// the plan's 11.5px would have changed the line's height on every surface.
describe("AvailabilityMarker row density", () => {
  it("inherits the meta line's type rather than setting its own", () => {
    const el = root(
      render(
        <AvailabilityMarker
          availability={a(1, 1, 0, ["Atraxa"])}
          density="row"
        />,
      ).container,
    );
    expect(el.style.fontSize).toBe("");
    expect(el.className).not.toContain("font-mono");
    expect(el.className).not.toContain("text-[");
  });

  // Row 3.4 gives the row-density hard label --avail-hard-fg too. The plan reserved
  // --avail-hard-fg for the chip and painted rows accent.
  it("uses the lifted hard foreground, not raw accent", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(1, 1, 0, ["Atraxa"])} density="row" />,
    );
    expect(deckName().className).toContain(
      "text-[color:var(--avail-hard-fg)]",
    );
    expect(container.innerHTML).not.toContain("text-[color:var(--avail-hard)]");
  });

  // Row 3.4: soft is --fg-body, which is NOT the --fg-muted the glyph
  // outline uses. One state, two greys.
  it("paints the soft label a step brighter than its glyph", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(2, 0, 1)} density="row" />,
    );
    expect(container.innerHTML).toContain("text-[color:var(--fg-body)]");
  });
});

// A degraded read can return counts with no names, and an "any number" card
// (Relentless Rats, Nazgul) lets one list be the whole demand. Both shapes are
// reachable and neither may render a count of zero or drop the explanation.
describe("AvailabilityMarker sparse claimants", () => {
  it("falls back to the base hard form when no deck names arrived", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(1, 1, 0)} density="row" />,
    );
    expect(container.textContent).toBe("none free");
    expect(markerAria(a(1, 1, 0))).toBe("no free copies");
  });

  // No names means no count either: `overAria(5, 0)` would say "0 of your
  // finished lists include this card", so the branch drops to the count-only
  // sibling the copy file ships for exactly this shape.
  it("drops the deck count from the over aria when no names arrived", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(4, 9, 0)} density="row" />,
    );
    expect(container.textContent).toBe("short 5");
    expect(markerAria(a(4, 9, 0))).toBe(
      "you own 5 too few for the committed decks that include it",
    );
  });

  it("still counts the claimant when a single deck is the whole demand", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(4, 9, 0, ["Rats"])} density="row" />,
    );
    expect(container.textContent).toBe("short 5, also in 1 deck");
    expect(markerAria(a(4, 9, 0, ["Rats"]))).toBe(
      "1 of your committed decks includes this card and you own 5 too few",
    );
  });
});

// Addendum 2 §6 — the deck's-own-decklist vantage. `free` here comes from a
// query given the matching excludeDeckId, so the helper above cannot build
// these: it derives free as owned − hard, which is the off-decklist form.
describe("selfExcluded, on a deck's own decklist", () => {
  const own = (free: number, soft: number, names: string[]) => ({
    owned: 1,
    hard: names.length,
    soft,
    free,
    claims: names.map((n, i) => ({ id: `d${i + 1}`, name: n, quantity: 1, mature: true, pending: false, commander: false, senior: true })),
  });

  // The ruling that makes the whole vantage worth having: free === 0 means
  // "exactly enough for everyone, including this deck", so a deck never claims
  // a card against itself. Off-decklist the same figures would draw `none free`.
  it("stays silent where the off-decklist marker would claim", () => {
    const { container } = render(
      <AvailabilityMarker availability={own(0, 0, ["Atraxa"])} density="row" selfExcluded />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(markerAria(own(0, 0, ["Atraxa"]), { selfExcluded: true })).toBeNull();
  });

  it("names the one other claimant instead of counting decks", () => {
    const av = own(-1, 0, ["Atraxa"]);
    const { container } = render(
      <AvailabilityMarker availability={av} density="row" selfExcluded bareOne />,
    );
    expect(container.textContent).toBe("short, also in Atraxa");
    expect(markerAria(av, { selfExcluded: true })).toBe(
      "your Atraxa deck also includes this card and you don’t own enough for both",
    );
  });

  // Two other claimants is a count again — naming one would be a lie about the
  // other, and "also in" has no plural form in the copy file.
  it("falls back to the count when more than one other deck claims it", () => {
    const av = own(-2, 0, ["Atraxa", "Kykar"]);
    const { container } = render(
      <AvailabilityMarker availability={av} density="row" selfExcluded />,
    );
    expect(container.textContent).toBe("short 2, also in 2 decks");
    expect(markerAria(av, { selfExcluded: true })).toBe(
      "2 of your committed decks include this card and you own 2 too few",
    );
  });

  // A chip is count-only, so the proper noun cannot appear even here.
  it("drops the name under nameless, label and aria alike", () => {
    const av = own(-1, 0, ["Atraxa"]);
    const { container } = render(
      <AvailabilityMarker availability={av} density="row" selfExcluded nameless />,
    );
    // Off the deck page the figure is drawn at one too (Hugh, 2026-09-28).
    expect(container.textContent).toBe("short 1");
    expect(markerAria(av, { selfExcluded: true, nameless: true })).toBe(
      "you own 1 too few for the committed decks that include it",
    );
  });
});

describe("markerAria", () => {
  it("is null in the free state, so no accessible name changes", () => {
    expect(markerAria(a(4, 0, 0))).toBeNull();
  });

  it("describes lists, never physical locations", () => {
    const s = markerAria(a(1, 1, 0, ["Atraxa"]))!;
    expect(s).toBe("no free copies; this one is in your Atraxa deck");
    expect(s).not.toMatch(/box|binder|sleeve|shelf/i);
  });

  // `nameless` is /collection's contract: count-only in the label too.
  it("never speaks a deck name when nameless", () => {
    expect(markerAria(a(1, 1, 0, ["Atraxa"]), { nameless: true })).toBe(
      "no free copies",
    );
  });

  it("drops the deck count from the over aria when nameless", () => {
    expect(markerAria(a(4, 9, 0, ["Rats", "Nazgûl"]), { nameless: true })).toBe(
      "you own 5 too few for the committed decks that include it",
    );
  });

  // The class the two tests above are instances of. `nameless` means the label
  // shows no deck name AND no deck count, so an accessible name that supplies
  // either reads out something the surface deliberately does not draw. Walking
  // every state is what caught the `over` branch ignoring the flag while `hard`
  // honoured it — a per-branch test would have kept passing on `hard` alone.
  it("never adds a name or a count the nameless label does not show", () => {
    const names = ["Atraxa", "Kykar", "Rats"];
    const cases = [a(4, 2, 3, names), a(2, 2, 0, names), a(4, 9, 0, names)];

    for (const av of cases) {
      const { container, unmount } = render(
        <AvailabilityMarker availability={av} density="row" nameless />,
      );
      const aria = markerAria(av, { nameless: true })!;
      for (const n of names) expect(aria).not.toContain(n);
      // The label is the ceiling: any deck count in the aria has to be drawn.
      if (!/\d+ deck/.test(container.textContent ?? "")) {
        expect(aria).not.toMatch(/\d+ of your committed decks/);
      }
      unmount();
    }
  });

  // R5 §8: a count-only sibling is part of the state, not a fallback, so the
  // two forms of a state have to open the same way. A reader who hears the
  // name-bearing string on one surface and the count-only one on another should
  // not think they are in different states.
  it("opens a state's two forms the same way", () => {
    const c = availabilityCopy.marker;
    expect(c.hardAria("Atraxa").startsWith(c.hardAriaCountOnly)).toBe(true);
    expect(c.overAriaCountOnly(5)).toContain("you own 5 too few");
    expect(c.overAria(5, 2)).toContain("you own 5 too few");
  });
});
