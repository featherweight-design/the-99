import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AboutPage } from "./about-page";
import { ABOUT_VERSION, aboutCopy, aboutEntries } from "../../lib/copy/about";
import { FIGURES } from "./figures";
import { availabilityCopy } from "../../lib/copy/availability";

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
    // TWO navigations carry this label now — the in-flow list below the wide
    // stop and the sticky rail above it — so the compact one is taken by
    // position rather than by name alone.
    const [nav] = screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
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

  it("draws one specimen for every entry that has a figure", () => {
    // DERIVED, not a hard-coded list. A literal set of labels has to be edited
    // every time a figure lands, which makes the test a chore rather than a
    // guard — and the thing worth catching is a figure REGISTERED in FIGURES
    // that renders nothing, which counting catches and a label list does not.
    const { container } = render(<AboutPage seen={0} />);
    const drawn = container.querySelectorAll("[data-specimen]").length;
    const registered = aboutEntries.filter((e) => e.id in FIGURES).length;
    expect(registered, "no entry has a figure at all").toBeGreaterThan(0);
    expect(drawn).toBe(registered);
  });

  it("hides a MOUNTED specimen from the reading order, and reads a legend aloud", () => {
    // Two figure kinds, two rules, and the difference is where the information
    // lives. A mounted component repeats what the caption and keys already
    // say, so announcing it reads every mark twice and names controls that
    // cannot be pressed. A legend's content exists NOWHERE else — Discover's
    // five orders and their glosses are drawn there and in no caption — so
    // hiding it hid the entry's whole subject from the readers least able to
    // recover it elsewhere.
    const { container } = render(<AboutPage seen={0} />);
    const all = Object.entries(figures(container));
    const legends = all.filter(([, el]) => el.hasAttribute("data-legend"));
    const mounted = all.filter(([, el]) => !el.hasAttribute("data-legend"));
    expect(legends.length).toBeGreaterThan(0);
    expect(mounted.length).toBeGreaterThan(0);

    for (const [name, figure] of mounted) {
      expect(figure, name).toHaveAttribute("aria-hidden", "true");
      expect(figure, name).toHaveAttribute("inert");
      expect(figure.className, name).toContain("pointer-events-none");
    }
    for (const [name, figure] of legends) {
      // Readable, and structured: a mark and its meaning are a pair, so they
      // are a `dt` and a `dd` rather than two spans a reader must infer.
      expect(figure.hasAttribute("aria-hidden"), name).toBe(false);
      expect(figure.hasAttribute("inert"), name).toBe(false);
      expect(figure.querySelector("dl"), name).toBeTruthy();
      expect(figure.querySelectorAll("dt").length, name).toBeGreaterThan(0);
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

  it("gives every entry a figure, and none of them an empty frame", () => {
    // This assertion used to be its own inverse — that an entry with NO figure
    // drew no frame — and it had a subject because 29 of the 34 entries had
    // none. The ledger is empty now, so the question worth asking flipped: the
    // page's unit is a figure with a caption, and an empty frame is the way
    // that unit fails quietly.
    const { container } = render(<AboutPage seen={0} />);
    const entries = [...container.querySelectorAll("li")].filter((li) =>
      li.querySelector("h3"),
    );
    expect(entries).toHaveLength(aboutEntries.length);
    for (const li of entries) {
      const figure = li.querySelector("[data-specimen]");
      const title = li.querySelector("h3")?.textContent ?? "";
      expect(figure, `${title} has no figure`).toBeTruthy();
      // NOT `childElementCount`, not "has a leaf", and not raw `textContent`.
      // Every Specimen wraps its content in one div, so the count is 1 whatever
      // it holds; an EMPTY div is itself a leaf; and `textContent` includes
      // sr-only descendants, so a figure whose only words are hidden would
      // satisfy the very check meant to catch a blank one. Three attempts,
      // each passing over the emptiness the last one missed.
      const el = figure as HTMLElement;
      const visible = [...el.querySelectorAll("*")]
        .filter((n) => n.childElementCount === 0 && n.closest(".sr-only") === null)
        .map((n) => (n.textContent ?? "").trim())
        .join("");
      const art = el.querySelector("svg, img");
      expect(visible.length > 0 || art !== null, `${title} draws an empty frame`).toBe(true);
    }
  });
});

describe("the contents", () => {
  it("gives every chapter row a figure, new or not", () => {
    // A row that carried a count only when something was new would be blank
    // for every reader at launch, which is everyone.
    render(<AboutPage seen={0} />);
    const [nav] = screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
    const counts = within(nav).getAllByText(/\d+ (entries|entry|new)/);
    expect(counts).toHaveLength(4);
  });
});

describe("the contents rail", () => {
  it("draws beside the column at the wide stop and not below it", () => {
    // The page is about nine screens long. An in-flow list answers "what is
    // here" once and scrolls away; the rail is what says where you ARE, which
    // is the reason it was wrong to take Design's offer to cut it.
    const navs = screen.queryAllByRole("navigation", { name: aboutCopy.contentsLabel });
    expect(navs).toHaveLength(0);

    render(<AboutPage seen={0} />);
    const [inFlow, rail] = screen.getAllByRole("navigation", {
      name: aboutCopy.contentsLabel,
    });
    // Each is present at exactly one width, and the pair is what makes the
    // links reachable at both.
    expect(inFlow.className).toContain("min-[1000px]:hidden");
    expect(rail.className).toContain("sticky");
    expect(rail.className).toContain("hidden");
    expect(rail.className).toContain("min-[1000px]:block");
  });

  it("marks where the reader is, for a screen reader as well as an eye", () => {
    render(<AboutPage seen={0} />);
    const [, rail] = screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
    const current = within(rail).getAllByRole("link").filter((a) => a.getAttribute("aria-current"));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", "#chapter-01");
  });

  it("follows the reader down the page, and back up it", () => {
    // jsdom has no IntersectionObserver, so without a stub the test above
    // asserts the initial useState and nothing else — deleting the entire
    // effect left every test in this file green, which the pre-open pass
    // proved by doing it.
    //
    // The stub is also what makes the REAL defect testable: the callback
    // receives only the entries whose state CHANGED, so a reading that sorts
    // "this callback's intersecting entries" answers "whichever chapter most
    // recently entered the band". Scrolling 01 → 02 delivers 02 alone.
    const callbacks: IntersectionObserverCallback[] = [];
    const observed: Element[] = [];
    class Stub {
      constructor(cb: IntersectionObserverCallback) {
        callbacks.push(cb);
      }
      observe(el: Element) {
        observed.push(el);
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "";
      thresholds = [];
    }
    vi.stubGlobal("IntersectionObserver", Stub);
    try {
      render(<AboutPage seen={0} />);
      const [, rail] = screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
      const marked = () =>
        within(rail)
          .getAllByRole("link")
          .find((a) => a.getAttribute("aria-current"))
          ?.getAttribute("href");

      // BOTH observers — the rail and the compact list each hold one, because
      // `aria-current` has to be true at both widths and a phone is where the
      // page is longest. Firing only the first marked whichever nav happened
      // to mount first and left the other static.
      const fire = (changes: { id: string; isIntersecting: boolean }[]) =>
        act(() => {
          for (const cb of callbacks) cb(
            changes.map((c) => ({
              target: observed.find((el) => el.id === `chapter-${c.id}`)!,
              isIntersecting: c.isIntersecting,
            })) as unknown as IntersectionObserverEntry[],
            {} as IntersectionObserver,
          );
        });

      // Everything starts on screen at the top of the page.
      fire([{ id: "01", isIntersecting: true }]);
      expect(marked()).toBe("#chapter-01");

      // Scrolling into 02 delivers ONE entry. 01 is still intersecting and is
      // absent from the callback — the case that broke the first version.
      fire([{ id: "02", isIntersecting: true }]);
      expect(marked()).toBe("#chapter-01");

      // 01 leaves the band. Now 02 is the first in order still on screen.
      fire([{ id: "01", isIntersecting: false }]);
      expect(marked()).toBe("#chapter-02");

      fire([{ id: "03", isIntersecting: true }, { id: "02", isIntersecting: false }]);
      expect(marked()).toBe("#chapter-03");

      // And back up: 02 returning takes the mark back, because it is earlier.
      fire([{ id: "02", isIntersecting: true }]);
      expect(marked()).toBe("#chapter-02");

      // The compact list carries the same mark. It is the ONLY navigation
      // below the wide stop, so a mark that lived on the rail alone answered
      // nobody on a phone.
      const [list] = screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
      const listMarked = within(list)
        .getAllByRole("link")
        .find((a) => a.getAttribute("aria-current"));
      expect(listMarked).toHaveAttribute("href", "#chapter-02");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("links every chapter from the rail", () => {
    render(<AboutPage seen={0} />);
    const [, rail] = screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
    for (const n of ["01", "02", "03", "04"] as const) {
      expect(within(rail).getByRole("link", { name: new RegExp(escape(aboutCopy.chapters[n].title)) }))
        .toHaveAttribute("href", `#chapter-${n}`);
    }
  });
});

describe("what each chapter 01 figure actually draws", () => {
  // Counting frames is not coverage: `Specimen` creates the `[data-specimen]`
  // node itself, so a registered figure can return an empty frame and the
  // count assertion still passes. Six figures landed with no content check at
  // all, which is the fifth round in this feature that an assertion measured
  // the frame instead of the body.
  const plate = (label: string) => {
    const { container } = render(<AboutPage seen={0} />);
    const el = container.querySelector(`[data-specimen="${label}"]`);
    expect(el, `${label} drew no specimen`).toBeTruthy();
    return el as HTMLElement;
  };

  it("sets: four cells, and only the missing one carries a price", () => {
    const el = plate("sets");
    // The completion figure and the cell count disagree on purpose — base run
    // versus extras — and the entry's key line is about exactly that.
    expect(el.textContent).toContain("162 / 208");
    expect(el.textContent).toContain("321 cells");
    expect(el.querySelectorAll("button").length).toBe(4);
  });

  it("browse: a chip per narrowing, a count, and the reading choice", () => {
    const el = plate("browse");
    expect(el.textContent).toContain("1 colour");
    expect(el.textContent).toContain("The Hobbit");
    expect(el.textContent).toContain("Showing");
    // The third key line is the grid-or-rows choice, which the first version
    // of this figure left out entirely.
    expect(el.textContent).toMatch(/rows/i);
    expect(el.textContent).toMatch(/grid/i);
  });

  it("import: the doors, and the fact that decides whether you lose anything", () => {
    const el = plate("import");
    expect(el.textContent).toContain("Moxfield");
    expect(el.textContent).toContain("ManaBox");
    expect(el.textContent).toContain("replaces");
  });

  it("post-import: the three sections, in the app's own words", () => {
    const el = plate("post-import");
    expect(el.textContent).toContain("No longer to buy");
    expect(el.textContent).toContain("Still to buy");
    expect(el.textContent).toContain("Still short");
  });

  it("import-issues: both tabs, because they are different failures", () => {
    const el = plate("import-issues");
    expect(el.textContent).toContain("Unmatched");
    expect(el.textContent).toContain("Parse errors");
  });

  it("card-detail: the pick, the preview, and BOTH printed costs", () => {
    const el = plate("card-detail");
    expect(el.textContent).toContain("✓");
    expect(el.textContent).toContain("◇");
    // Scoped to the COST cell. The plate also draws a two-faced mark, whose
    // glyph is `//` — so a sweep of the plate's text is satisfied by the wrong
    // element and passes with the cost drawing its front face alone, which is
    // the right pips for the wrong card.
    const costCell = [...el.querySelectorAll(":scope > div > div")].find((c) =>
      (c.lastElementChild?.textContent ?? "").includes("both halves"),
    );
    expect(costCell, "no cell captions the two-cost case").toBeTruthy();
    expect(costCell!.firstElementChild?.textContent).toContain("//");
  });
});

describe("the themes figure", () => {
  it("draws each theme's palette, not just its name", () => {
    // The generic empty-frame check cannot see this: remove all eighteen
    // swatches and the six names keep the frame non-empty, so the figure whose
    // whole subject is "a theme changes the palette" goes green while showing
    // no palette at all.
    const { container } = render(<AboutPage seen={0} />);
    const plate = container.querySelector('[data-specimen="themes"]');
    expect(plate).toBeTruthy();
    const tiles = [...plate!.querySelectorAll("[data-theme]")];
    expect(tiles).toHaveLength(6);
    for (const tile of tiles) {
      const swatches = [...tile.querySelectorAll("span")].filter(
        (el) => (el as HTMLElement).style.background !== "",
      );
      expect(swatches, `${tile.getAttribute("data-theme")} draws no palette`).toHaveLength(3);
    }
  });
});

describe("what each legend must hold", () => {
  // The empty-frame gate is a floor, not coverage: a legend dropping a row —
  // Discover drawing four of its five orders — clears it, and those rows ARE
  // the entry. Where an entry's caption states a count, the figure is held to
  // it here rather than left to a photograph.
  const rows = (container: HTMLElement, label: string) => {
    const el = container.querySelector(`[data-specimen="${label}"]`);
    expect(el, `${label} drew no figure`).toBeTruthy();
    return [...el!.querySelectorAll("dt")];
  };

  it("gives Discover all five of its orders", () => {
    // "two of them change which commanders the list holds" only means anything
    // beside the other three.
    const { container } = render(<AboutPage seen={0} />);
    expect(rows(container, "discover")).toHaveLength(5);
  });

  it("gives the deck page all four of its tabs", () => {
    const { container } = render(<AboutPage seen={0} />);
    expect(rows(container, "deck-page")).toHaveLength(4);
  });

  it("gives the resume rows all three verbs", () => {
    // edited, committed, played — the entry's line is that each row says which
    // event put it there, which two verbs cannot demonstrate.
    const { container } = render(<AboutPage seen={0} />);
    expect(rows(container, "resume")).toHaveLength(3);
  });

  it("pairs every legend mark with a meaning", () => {
    // A `dt` with no `dd` is a mark nobody explained, and the pairing is the
    // whole reason a legend is a description list.
    const { container } = render(<AboutPage seen={0} />);
    for (const el of container.querySelectorAll("[data-legend]")) {
      const label = el.getAttribute("data-specimen");
      const dts = el.querySelectorAll("dt").length;
      const dds = el.querySelectorAll("dd").length;
      expect(dts, `${label} has no rows`).toBeGreaterThan(1);
      expect(dds, `${label} has ${dts} marks and ${dds} meanings`).toBe(dts);
    }
  });
});

// ── The commander-availability figure draws its four readings ─────────────
//
// The generic gates — "a figure is registered", "no entry ships undrawn" — stay
// green over a specimen that renders an empty box or somebody else's marks. This
// asserts the thing the entry claims: four readings, the marker count-only, and
// the dot the same at every one of them, which is the change the entry describes.
describe("the commander-availability figure", () => {
  it("draws all four readings, count-only, with one dot treatment", async () => {
    const { FIGURES } = await import("./figures");
    const Figure = FIGURES["commander-availability"]!;
    expect(Figure).toBeDefined();
    const { container } = render(<Figure width="plate" />);

    // Three readings print a label; `free` prints none, and that absence is the
    // fourth. Read from the copy module rather than pinned here.
    expect(screen.getByText(availabilityCopy.marker.soft(1))).toBeInTheDocument();
    expect(screen.getByText(availabilityCopy.marker.hard)).toBeInTheDocument();
    expect(screen.getByText(availabilityCopy.marker.over(2))).toBeInTheDocument();

    // Count-only: no deck name anywhere in the figure.
    expect(container.textContent).not.toMatch(/in [A-Z]/);

    // One dot treatment across all four cells — the feature's whole claim.
    const dots = container.querySelectorAll('[class*="rounded-full"][style*="width: 6px"]');
    expect(dots.length).toBe(4);
    for (const d of dots) {
      expect(d.className).toContain("bg-[color:var(--success)]");
    }
  });
});

describe("the page's own type, against the design table", () => {
  // `docs/superpowers/design-tables/about.md` states weight 700 on both
  // headings, and Tailwind's preflight gives an h1 and an h2 the BODY weight —
  // so `font-display` alone rendered them at 400 while the table said 700 and
  // the verification pass that wrote the table read past it. A row a machine
  // can check should not be left to a reader who has just written it down.
  it("gives every heading the weight and size the table specifies", () => {
    // Asserting `className` contains `font-bold` restates the change rather
    // than the property — and it covered two headings while the same preflight
    // default was left on the third. The entry title is an h3 with
    // `font-display` and no weight, which §3 draws at 600.
    render(<AboutPage seen={0} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.className).toContain("font-bold");
    expect(h1.className).toContain("leading-[1.2]");
    expect(h1.className).toContain("text-[23px]");
    expect(h1.className).toContain("min-[1000px]:text-[29px]");

    for (const h2 of screen.getAllByRole("heading", { level: 2 })) {
      expect(h2.className).toContain("font-bold");
      expect(h2.className).toContain("text-[16px]");
    }
    for (const h3 of screen.getAllByRole("heading", { level: 3 })) {
      expect(h3.className, "an h3 inherits the body weight without one").toContain(
        "font-semibold",
      );
    }
  });

  it("separates the intro from the h1 by the drawn 10px", () => {
    const { container } = render(<AboutPage seen={0} />);
    const intro = container.querySelector("h1 + p");
    expect(intro?.className).toContain("mt-[10px]");
  });

  it("gives a plate and an inset their own padding", () => {
    // Two treatments in the canvas — 14px 16px and 12px — collapsed into one
    // row of the first table and then one blanket value in the code.
    const { container } = render(<AboutPage seen={0} />);
    const plate = container.querySelector('[data-width="plate"]');
    const inset = container.querySelector('[data-width="inset"]');
    expect(plate?.className).toContain("px-[16px]");
    expect(plate?.className).toContain("py-[14px]");
    expect(inset?.className).toContain("p-[12px]");
  });
});
