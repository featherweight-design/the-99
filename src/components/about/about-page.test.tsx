import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AboutPage } from "./about-page";
import { ABOUT_VERSION, aboutCopy, aboutEntries } from "../../lib/copy/about";

// The action is a server function; the page only needs it to exist as a form
// target, and importing it for real drags a database client into jsdom.
vi.mock("../../app/about/actions", () => ({ dismissAbout: vi.fn() }));

describe("the page a first-time reader sees", () => {
  it("marks nothing, because all of it is new to them", () => {
    render(<AboutPage seen={0} />);
    expect(screen.queryAllByText(aboutCopy.newBadge)).toHaveLength(0);
    expect(screen.queryByText(aboutCopy.newSinceEyebrow(1))).toBeNull();
  });

  it("draws every entry", () => {
    render(<AboutPage seen={0} />);
    for (const entry of aboutEntries) {
      expect(screen.getByRole("heading", { name: new RegExp(escape(entry.title)) })).toBeTruthy();
    }
  });

  it("offers the dismiss, because they have acknowledged nothing", () => {
    render(<AboutPage seen={0} />);
    expect(screen.getByRole("button", { name: new RegExp("^" + aboutCopy.dismiss) })).toBeTruthy();
  });
});

describe("the reader who is current", () => {
  it("has no dismiss to press", () => {
    render(<AboutPage seen={ABOUT_VERSION} />);
    expect(screen.queryByRole("button", { name: new RegExp("^" + aboutCopy.dismiss) })).toBeNull();
  });
});

describe("the reader who is behind", () => {
  // Every shipped entry is `since: 1` and ABOUT_VERSION is 1, so the marked
  // state cannot be reached with real copy at all. The first version of this
  // test recomputed the predicate against that copy and asserted the empty
  // array it was always going to get — green whatever `isNew` did, including
  // returning false unconditionally. This renders a version-2 page instead.
  const twoVersions = {
    ABOUT_VERSION: 2,
    aboutEntries: [
      { ...aboutEntries[0], id: "old", chapter: "01" as const, title: "Older entry", since: 1 },
      { ...aboutEntries[0], id: "new", chapter: "01" as const, title: "Newer entry", since: 2 },
    ],
  };

  it("marks the entry added since, and only that one", async () => {
    vi.resetModules();
    vi.doMock("../../lib/copy/about", async () => {
      const real = await vi.importActual<typeof import("../../lib/copy/about")>(
        "../../lib/copy/about",
      );
      return { ...real, ...twoVersions };
    });
    const { AboutPage: Page } = await import("./about-page");

    render(<Page seen={1} />);
    const badges = screen.getAllByText(aboutCopy.newBadge);
    expect(badges).toHaveLength(1);
    expect(badges[0].closest("li")?.textContent).toContain("Newer entry");
    expect(screen.getByText(aboutCopy.newSinceEyebrow(1))).toBeTruthy();
    vi.doUnmock("../../lib/copy/about");
    vi.resetModules();
  });
});

describe("where the dismiss sends them", () => {
  it("carries a same-origin destination through", () => {
    render(<AboutPage seen={0} next="/decks?sort=name" />);
    const form = screen.getByRole("button", { name: new RegExp("^" + aboutCopy.dismiss) }).closest("form");
    expect(form?.querySelector("input[name=next]")).toHaveValue("/decks?sort=name");
    expect(screen.getByText(aboutCopy.dismissDestination("/decks?sort=name"))).toBeTruthy();
  });

  it("refuses to print or carry another origin", () => {
    render(<AboutPage seen={0} next="//evil.example" />);
    const form = screen.getByRole("button", { name: new RegExp("^" + aboutCopy.dismiss) }).closest("form");
    expect(form?.querySelector("input[name=next]")).toHaveValue("/");
    expect(screen.getByText(aboutCopy.dismissDestinationHome)).toBeTruthy();
  });
});

describe("the contents", () => {
  it("links every chapter that has entries", () => {
    render(<AboutPage seen={0} />);
    const nav = screen.getByRole("navigation", { name: aboutCopy.contentsLabel });
    for (const n of ["01", "02", "03", "04"] as const) {
      const link = within(nav).getByRole("link", {
        name: new RegExp(escape(aboutCopy.chapters[n].title)),
      });
      expect(link).toHaveAttribute("href", `#chapter-${n}`);
    }
  });
});

/** Escapes a title for use inside a RegExp — several carry em dashes and parens. */
function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("the dismiss control's accessible name", () => {
  it("says where pressing it lands", () => {
    // The clause beside the button is a sibling, so it is not part of the
    // button's name. Without this a screen-reader user hears "Got it" and
    // nothing about the destination.
    render(<AboutPage seen={0} next="/decks" />);
    expect(
      screen.getByRole("button", {
        name: `${aboutCopy.dismiss} — ${aboutCopy.dismissDestination("/decks")}`,
      }),
    ).toBeTruthy();
  });
});

describe("a crafted link", () => {
  it("cannot pick a local route through an authority", async () => {
    // `//evil.example/decks` never leaves the origin, but it resolves to
    // /decks — a destination the reader never asked for, chosen by whoever
    // wrote the link. The page must not print or carry it.
    render(<AboutPage seen={0} next="//evil.example/decks" />);
    const form = screen
      .getByRole("button", { name: new RegExp("^" + aboutCopy.dismiss) })
      .closest("form");
    expect(form?.querySelector("input[name=next]")).toHaveValue("/");
    expect(screen.getByText(aboutCopy.dismissDestinationHome)).toBeTruthy();
  });
});

describe("the figures", () => {
  const figures = (c: HTMLElement): Record<string, HTMLElement> =>
    Object.fromEntries(
      [...c.querySelectorAll<HTMLElement>("[data-specimen]")].map((f) => [
        f.getAttribute("data-specimen") ?? "",
        f,
      ]),
    );

  it("draws one for every entry whose subject is a mark", () => {
    // The complete set, not a sample: a partial list leaves a miswired figure
    // green, which is the regression this whole file exists to catch.
    const { container } = render(<AboutPage seen={0} />);
    expect(Object.keys(figures(container)).sort()).toEqual([
      "availability",
      "buy-tag",
      "fit",
      "marks",
      "status",
    ]);
  });

  it("hides every specimen from the reading order and from the pointer", () => {
    const { container } = render(<AboutPage seen={0} />);
    for (const [name, figure] of Object.entries(figures(container))) {
      expect(figure, name).toHaveAttribute("aria-hidden", "true");
      expect(figure.className, name).toContain("pointer-events-none");
    }
  });

  it("draws the buy tag's four claims, which are not four ways of saying cost", () => {
    // The frame is not the figure: asserting `data-width` alone leaves three
    // of the four states deletable with the suite still green.
    const { container } = render(<AboutPage seen={0} />);
    const plate = figures(container)["buy-tag"];
    // `sold out` is a live-row comparison, so it only appears when the fixture
    // is stale against the newest stamp — a wrong date silently makes it a
    // fourth priced tag.
    expect(plate.textContent).toContain("sold out");
    expect(plate.textContent).toContain("foil");
    // The priced state prints a figure; absent prints nothing at all.
    expect(plate.textContent).toMatch(/\$\d/);
    const tags = [...plate.querySelectorAll("span")].filter((el) =>
      el.className.toString().includes("rounded"),
    );
    expect(tags.length).toBeGreaterThanOrEqual(3);
  });

  it("mounts a real bar in each fit shape", () => {
    // `out of 100` and `out of 40` are SpecimenCell captions and print whether
    // or not FitBar returned anything, so the annotation cannot stand in for
    // the figure.
    const { container } = render(<AboutPage seen={0} />);
    const plate = figures(container)["fit"];
    const tracks = [...plate.querySelectorAll("div")].filter((el) =>
      el.className.toString().includes("rounded-full"),
    );
    expect(tracks.length).toBeGreaterThanOrEqual(2);
  });

  it("gives an inset entry the inset frame and a plate entry the plate", () => {
    const { container } = render(<AboutPage seen={0} />);
    const f = figures(container);
    // `width` is a field on every entry and was ignored at first, so the
    // buy-tag entry drew a full-width frame around one small mark.
    expect(f["buy-tag"]).toHaveAttribute("data-width", "inset");
    expect(f["availability"]).toHaveAttribute("data-width", "plate");
  });

  // Each figure is asserted on ITS OWN content. The first version of this
  // counted elements inside the frame, which counts the grid and the cells —
  // an empty plate has more than two of those and passed.
  it("draws the four availability states, including the one that draws nothing", () => {
    const { container } = render(<AboutPage seen={0} />);
    const plate = figures(container)["availability"];
    // Asserted on the MARKERS, not on the plate's text. The captions beside
    // each cell repeat the same words, so a textContent sweep stays green with
    // every AvailabilityMarker deleted — which is the third round running that
    // an assertion here measured this page's annotation instead of the app's
    // output.
    const cells = [...plate.querySelectorAll(":scope > div > div")];
    expect(cells).toHaveLength(4);
    // The content box always holds the marker's typography wrapper, so its
    // child COUNT is 1 either way — what separates the states is whether the
    // marker inside it drew any text.
    const drawn = cells.map((cell) => (cell.firstElementChild?.textContent ?? "").trim());
    expect(drawn[0], "free draws nothing, and that IS the state").toBe("");
    expect(drawn.filter((t) => t.length > 0)).toHaveLength(3);
    expect(drawn.join(" ")).toContain("in a brew");
    expect(drawn.join(" ")).toContain("short 2");

    // The no-echo rule is swept across every plate below rather than checked
    // here — fixing it in this one plate and pinning it in this one test was
    // the instance, not the class, and the marks and buy-tag plates were still
    // doing it.
  });

  it("lets no availability caption repeat the mark it sits under", () => {
    // The close-out contact sheet's finding: a cell drew `◆ none free` with
    // the words `none free` directly beneath it. Both halves individually
    // correct, which is why every other assertion in this file passed over it.
    //
    // SCOPED TO THIS PLATE, deliberately, and the scope is the honest part.
    // Here the mark IS the whole label, so "does the caption repeat it" is a
    // containment test. On the other plates it is not: the marks row reads
    // `Rhystic Study 2 1 in a brew` and the buy tag `buy·$6.40 foil`, so the
    // mark carries a card name and a price and neither string contains the
    // other — a sweep across all five plates ran green over the same defect in
    // two of them, which is how this comment came to be here rather than a
    // broader loop.
    //
    // Those two were swept by hand and by eye on the contact sheet. This pins
    // the one plate a machine can judge; the rest is the walk's job.
    const { container } = render(<AboutPage seen={0} />);
    const plate = container.querySelector('[data-specimen="availability"]')!;
    for (const [i, cell] of [...plate.querySelectorAll(":scope > div > div")].entries()) {
      const mark = (cell.firstElementChild?.textContent ?? "").trim();
      const cap = (cell.lastElementChild?.textContent ?? "").trim();
      // A mark that draws NOTHING is exempt and has to be: `free` has only its
      // caption to say what the blank means.
      if (mark === "") continue;
      // Leading glyphs and counts come off — `◇ 1 in a brew` compared whole
      // finds no overlap with `in a brew`, which IS the stutter.
      const words = mark.replace(/^[^a-z]+/i, "").toLowerCase();
      expect(cap.toLowerCase(), `cell ${i}: caption repeats its mark "${words}"`).not.toContain(
        words,
      );
    }
  });

  it("draws all six statuses, each with the figure that explains it", () => {
    const { container } = render(<AboutPage seen={0} />);
    const plate = figures(container)["status"];
    const pills = [...plate.querySelectorAll("span")].filter((el) =>
      el.className.toString().includes("rounded-[6px]"),
    );
    expect(pills).toHaveLength(6);
    // `TILE_CLASS` is the component's default and opens `absolute
    // bottom-[13px] left-[13px]`; defaulted here all six leave flow.
    for (const pill of pills) {
      expect(pill.className).not.toContain("absolute");
      // The deck card's FOOTER treatment — 22px at 10.5px — not the tile's
      // 24px at 11px. The component defaults to the tile box, so copying that
      // box while merely removing `absolute` draws a badge a size too large.
      expect(pill.className).toContain("h-[22px]");
      expect(pill.className).toContain("text-[10.5px]");
    }
    // The clause beside the badge, in the app's own words.
    expect(plate.textContent).toContain("created today");
    expect(plate.textContent).toContain("2 lines unresolved");
    // The To buy clause carries its cost. A deck at a legal list you cannot
    // sleeve is explained by what the shop trip costs, not by the count alone.
    expect(plate.textContent).toContain("3 to buy · $12.40");

    // Building and Complete carry NO clause in the app — their count and their
    // bar are the whole explanation — so a sentence for either would be a
    // string the deck card never shows.
    expect(plate.textContent).not.toContain("87 cards");
    expect(plate.textContent).not.toContain("99 cards");
    expect(plate.textContent).toContain("87 / 99");

    // Five fills for six statuses: Draft draws an empty track, which is what
    // an empty track means.
    const fills = plate.querySelectorAll("[data-status-fill]");
    expect(fills).toHaveLength(5);
  });

  it("draws the decklist marks as rows, at the row's own geometry", () => {
    const { container } = render(<AboutPage seen={0} />);
    const plate = figures(container)["marks"];
    // A dot with no size draws at 0x0, and jsdom cannot see that — what a
    // unit test can read is whether the caller supplied one.
    // `rounded-full` alone also matches every mana pip, and a pip carries an
    // inline width too — so that filter passed with all five dots deleted.
    // The dot is the only 7px square in the plate.
    const dots = [...plate.querySelectorAll("span")].filter((el) => {
      const style = (el as HTMLElement).style;
      return (
        el.className.toString().includes("rounded-full") &&
        style.width === "7px" &&
        style.height === "7px"
      );
    });
    expect(dots.length, "the ownership dots drew nothing").toBeGreaterThanOrEqual(4);
    // `//` renders only for a two-sided layout; called bare the mark is null.
    // Asserted on the MARK's own element — the row's note also contains the
    // characters, so a textContent sweep passes over a mark that never drew.
    const flip = [...plate.querySelectorAll("span")].filter(
      (el) => el.textContent?.trim() === "//",
    );
    expect(flip.length, "the two-faced mark drew nothing").toBeGreaterThan(0);
    expect(plate.textContent).toContain("Sol Ring");

    // The other three slot components, each deletable without the assertions
    // above noticing: the marker's words, the cost's pips, and the unowned
    // row's buy mark — `$` and not the shopping treatment.
    expect(plate.textContent).toContain("in a brew");
    expect(plate.textContent).toContain("short 2");
    // The cost draws a fixed-width track; jsdom sees the style even though it
    // lays nothing out, and an omitted CostPips leaves no element carrying it.
    const tracks = [...plate.querySelectorAll("span")].filter(
      (el) => (el as HTMLElement).style.width === "72px",
    );
    expect(tracks.length, "the cost track drew nothing").toBeGreaterThan(0);
    // `collapsed` is a bare `$`; `full` is the shopping treatment and prints a
    // figure. The entry's key line names the bare mark, so a price here would
    // teach the wrong one — and the visible text is what tells them apart,
    // since `full` keeps the word in the accessible name either way.
    // Leaf spans with no sr-only ANCESTOR. `collapsed` draws `$` and keeps the
    // sentence in an sr-only sibling, so two things defeat a naive sweep:
    // every ancestor span reads back as `$buy·$2.10`, and the figure inside
    // the sr-only subtree is itself a leaf whose own class is not sr-only.
    // Both made the two densities indistinguishable.
    const visible = [...plate.querySelectorAll("span")]
      .filter((el) => el.childElementCount === 0 && el.closest(".sr-only") === null)
      .map((el) => el.textContent ?? "");
    expect(visible.some((t) => t.trim() === "$"), "the buy mark drew nothing").toBe(true);
    expect(visible.some((t) => /\$\d/.test(t)), "the shopping treatment leaked in").toBe(false);

    // The slot is SHARED: a card you are printing takes `P` instead of `$`,
    // and a figure that only ever drew the buy mark would document half of it.
    expect(visible.some((t) => t.trim() === "P"), "the proxy mark drew nothing").toBe(true);
  });

  it("draws both fit shapes and writes no prose inside the frame", () => {
    const { container } = render(<AboutPage seen={0} />);
    const plate = figures(container)["fit"];
    // Rule 4 of the copy file: a figure may only draw what the app draws.
    // The decomposition and the denominators are annotation under the bar,
    // never sentences inside it.
    // The headline beside each bar is the lane's own string, so a reader can
    // check the sum against the figure the app would print.
    expect(plate.textContent).toContain("/100 FIT");
    expect(plate.textContent).toContain("/40 MEASURABLE FIT");
    expect(plate.textContent).toContain("73");
    expect(plate.textContent).toContain("27");
  });

  it("leaves an entry with no figure complete, and gives it no empty frame", () => {
    const { container } = render(<AboutPage seen={0} />);
    const workflow = aboutEntries.find((e) => e.id === "deck-import");
    expect(workflow).toBeTruthy();
    const li = [...container.querySelectorAll("li")].find((el) =>
      el.textContent?.includes(workflow!.caption),
    );
    expect(li).toBeTruthy();
    expect(li!.querySelector("[data-specimen]")).toBeNull();
  });
});

describe("the contents", () => {
  it("gives every chapter row a figure, new or not", () => {
    // A row that carried a count only when something was new would be blank
    // for every reader at launch, which is everyone.
    render(<AboutPage seen={0} />);
    const nav = screen.getByRole("navigation", { name: aboutCopy.contentsLabel });
    const counts = within(nav).getAllByText(/\d+ (entries|entry|new)/);
    expect(counts).toHaveLength(4);
  });
});
