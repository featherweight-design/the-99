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
    expect(screen.getByRole("button", { name: aboutCopy.dismiss })).toBeTruthy();
  });
});

describe("the reader who is current", () => {
  it("has no dismiss to press", () => {
    render(<AboutPage seen={ABOUT_VERSION} />);
    expect(screen.queryByRole("button", { name: aboutCopy.dismiss })).toBeNull();
  });
});

describe("the reader who is behind", () => {
  // No entry is above version 1 yet, so the marked state cannot be reached with
  // real copy. A reader at 0 against a version of 1 is the only honest live
  // case, and it is asserted above. This pins the rule itself.
  it("marks only entries added since the version they acknowledged", () => {
    const seen = ABOUT_VERSION;
    const marked = aboutEntries.filter((e) => seen > 0 && e.since > seen);
    expect(marked).toHaveLength(0);
  });
});

describe("where the dismiss sends them", () => {
  it("carries a same-origin destination through", () => {
    render(<AboutPage seen={0} next="/decks?sort=name" />);
    const form = screen.getByRole("button", { name: aboutCopy.dismiss }).closest("form");
    expect(form?.querySelector("input[name=next]")).toHaveValue("/decks?sort=name");
    expect(screen.getByText(aboutCopy.dismissDestination("/decks?sort=name"))).toBeTruthy();
  });

  it("refuses to print or carry another origin", () => {
    render(<AboutPage seen={0} next="//evil.example" />);
    const form = screen.getByRole("button", { name: aboutCopy.dismiss }).closest("form");
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
