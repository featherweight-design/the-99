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
  it("draws a specimen for the entries whose subject is a mark", () => {
    const { container } = render(<AboutPage seen={0} />);
    const drawn = [...container.querySelectorAll("[data-specimen]")].map((f) =>
      f.getAttribute("data-specimen"),
    );
    expect(drawn).toContain("availability");
    expect(drawn).toContain("marks");
    expect(drawn).toContain("status");
  });

  it("hides every specimen from the reading order", () => {
    // A figure repeats what the caption and the key lines already say.
    // Announced, it reads every mark twice and names controls that cannot be
    // pressed — and `pointer-events: none` is what makes "inert" true of a
    // real component rather than merely intended.
    const { container } = render(<AboutPage seen={0} />);
    const figures = [...container.querySelectorAll("[data-specimen]")];
    expect(figures.length).toBeGreaterThan(0);
    for (const figure of figures) {
      expect(figure).toHaveAttribute("aria-hidden", "true");
      expect(figure.className).toContain("pointer-events-none");
    }
  });

  it("leaves an entry with no figure complete, and gives it no empty frame", () => {
    // The first version of this asserted only that the caption rendered, which
    // held before figures existed and holds with FIGURES deleted — it named
    // the partial-map behaviour and measured none of it. What distinguishes
    // the two is whether this entry has a specimen box at all.
    const { container } = render(<AboutPage seen={0} />);
    const workflow = aboutEntries.find((e) => e.id === "deck-import");
    expect(workflow).toBeTruthy();
    const li = [...container.querySelectorAll("li")].find((el) =>
      el.textContent?.includes(workflow!.caption),
    );
    expect(li).toBeTruthy();
    expect(li!.querySelector("[data-specimen]")).toBeNull();
  });

  it("draws something inside every specimen", () => {
    // The class that let three broken figures through: every earlier test
    // asserted the FRAME — its data attribute, its aria-hidden, its
    // pointer-events — and none asserted that the component inside it drew
    // anything. StatusPillBadge defaulting to an absolute tile box, an
    // unsized OwnershipDot at 0x0 and a TwoFacedMark with no layout all
    // rendered nothing while passing.
    const { container } = render(<AboutPage seen={0} />);
    const figures = [...container.querySelectorAll("[data-specimen]")];
    expect(figures.length).toBeGreaterThan(0);
    for (const figure of figures) {
      const name = figure.getAttribute("data-specimen");
      // A cell's caption is this page's own text; what has to be there is
      // something the APP drew, so count elements that are not our chassis.
      const drawn = [...figure.querySelectorAll("*")].filter(
        (el) => !el.className.toString().includes("font-mono text-[10px]"),
      );
      expect(drawn.length, `${name} drew nothing`).toBeGreaterThan(2);
    }
  });

  it("gives every mark in the marks plate a drawn body", () => {
    const { container } = render(<AboutPage seen={0} />);
    const marks = container.querySelector('[data-specimen="marks"]');
    expect(marks).toBeTruthy();

    // A cell is [content box, caption]. Querying the CELL finds the caption
    // span and passes over an empty content box — which is how a TwoFacedMark
    // called with no layout, returning null, read as a drawn mark.
    const cells = [...marks!.querySelectorAll(":scope > div > div")];
    expect(cells).toHaveLength(4);
    for (const [i, cell] of cells.entries()) {
      const content = cell.firstElementChild;
      expect(content, `mark ${i} has no content box`).toBeTruthy();
      expect(content!.childElementCount, `mark ${i} drew nothing`).toBeGreaterThan(0);
    }
  });

  it("sizes the ownership dots, which carry colour and shape only", () => {
    // jsdom lays nothing out, so a 0x0 dot is present in the DOM and invisible
    // on screen — the component sets fill and radius and leaves sizing to the
    // caller, so the only thing a unit test can read is whether the caller
    // supplied one.
    const { container } = render(<AboutPage seen={0} />);
    const marks = container.querySelector('[data-specimen="marks"]');
    const dots = [...marks!.querySelectorAll("span")].filter((el) =>
      el.className.toString().includes("rounded-full"),
    );
    expect(dots.length).toBeGreaterThanOrEqual(2);
    for (const dot of dots) {
      expect((dot as HTMLElement).style.width, "an unsized dot draws at 0x0").toBeTruthy();
    }
  });

  it("keeps the status pills in flow", () => {
    // StatusPillBadge defaults its className to the TILE box, which opens
    // `absolute bottom-[13px] left-[13px]` because its usual home is pinned to
    // a tile's art. Defaulted inside an unpositioned figure, all six leave
    // flow and stack on the page's corner, and the plate draws empty.
    //
    // Scoped to this plate rather than swept across every specimen: a marker
    // that positions its own internals — the over glyph's two diamonds and
    // their seam — is doing it deliberately and inside its own box.
    const { container } = render(<AboutPage seen={0} />);
    const plate = container.querySelector('[data-specimen="status"]');
    expect(plate).toBeTruthy();
    const pinned = [...plate!.querySelectorAll("*")].filter((el) =>
      el.className.toString().includes("absolute"),
    );
    expect(pinned).toHaveLength(0);
    expect(plate!.querySelectorAll("span")).toHaveLength(6);
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
