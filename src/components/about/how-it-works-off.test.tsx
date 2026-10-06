import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aboutCopy } from "../../lib/copy/about";
import { howItWorksRowsCopy } from "../../lib/copy/how-it-works";
import { entryRow, howItWorksLinksCopy } from "../../lib/copy/how-it-works-links";
import { AboutPage } from "./about-page";

vi.mock("../../app/about/actions", () => ({ dismissAbout: vi.fn(), recordAboutVisit: vi.fn(() => Promise.resolve()) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// The plan's promise for this line (2026-09-28): with HOW_IT_WORKS_ENABLED off, production's
// /about is the page it was. Checked in both page modes, since the sheet mode draws the jump mark
// the rows share.
afterEach(() => {
  delete process.env.HOW_IT_WORKS_ENABLED;
});

describe.each([false, true])("About with HOW_IT_WORKS_ENABLED off (sheetMode %s)", (sheetMode) => {
  it("draws no appendix and keeps the intro word for word", () => {
    const { container } = render(<AboutPage seen={0} sheetMode={sheetMode} />);
    expect(container.querySelector("#how-it-works")).toBeNull();
    expect(container.querySelector("[data-method]")).toBeNull();
    expect(screen.queryByText(howItWorksRowsCopy.title)).toBeNull();
    for (const paragraph of aboutCopy.pageIntro.split("\n\n")) expect(screen.getByText(paragraph)).toBeTruthy();
    expect(container.textContent).not.toContain(howItWorksRowsCopy.pageIntroClause);
    // PR C's pieces: no entry links to a row, and no contents link reaches the section or a row.
    expect(container.querySelector("[data-entry-link]")).toBeNull();
    expect(container.querySelector("a[href='#how-it-works'], a[href^='#how-']")).toBeNull();
  });
});

describe("About with HOW_IT_WORKS_ENABLED on", () => {
  it("draws the appendix after the chapters, and names it in the intro", () => {
    process.env.HOW_IT_WORKS_ENABLED = "true";
    const { container } = render(<AboutPage seen={0} />);
    const section = container.querySelector("#how-it-works");
    expect(section).not.toBeNull();
    const chapters = [...container.querySelectorAll("section[id^='chapter-']")];
    expect(chapters.length).toBeGreaterThan(0);
    // After the last chapter in document order.
    expect(chapters.at(-1)!.compareDocumentPosition(section!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.textContent).toContain(howItWorksRowsCopy.pageIntroClause);
    expect(section!.querySelectorAll("li[id^='how-']")).toHaveLength(8);
  });

  it("links each entry the appendix explains to its row, and nothing else", () => {
    process.env.HOW_IT_WORKS_ENABLED = "true";
    const { container } = render(<AboutPage seen={0} />);
    const links = [...container.querySelectorAll<HTMLAnchorElement>("[data-entry-link]")];
    const drawn = [...container.querySelectorAll("section[id^='chapter-'] li[id]")].map((li) => li.id);
    const expected = drawn.filter((id) => entryRow[id]);
    expect(links).toHaveLength(expected.length);
    for (const a of links) {
      const entry = a.closest("li[id]")!.id;
      expect(a.getAttribute("href")).toBe(`#${entryRow[entry]}`);
      expect(a.textContent).toContain(howItWorksLinksCopy.entryLink);
    }
  });

  it("lists the entries that explain each row, back up the page", () => {
    process.env.HOW_IT_WORKS_ENABLED = "true";
    const { container } = render(<AboutPage seen={0} />);
    fireEvent.click(screen.getByRole("button", { name: /^Prices/ }));
    const body = container.querySelector("#how-prices-body")!;
    const back = [...body.querySelectorAll<HTMLAnchorElement>("a[href^='#']")].map((a) => a.getAttribute("href"));
    const want = Object.entries(entryRow).filter(([, row]) => row === "how-prices").map(([id]) => `#${id}`);
    expect(back.sort()).toEqual(want.filter((h) => container.querySelector(h)).sort());
    expect(back.length).toBeGreaterThan(0);
  });

  it("adds the appendix and its eight rows to both contents, and eight to the search's total", () => {
    process.env.HOW_IT_WORKS_ENABLED = "true";
    const { container } = render(<AboutPage seen={0} sheetMode />);
    const navs = [...container.querySelectorAll("nav")].filter((n) => n.querySelector("a[href='#how-it-works']"));
    expect(navs).toHaveLength(2);
    const rail = navs.find((n) => n.querySelectorAll("a[data-entry-row][href^='#how-']").length === 8)!;
    expect(rail).toBeTruthy();
    const search = rail.querySelector("input")!;
    fireEvent.change(search, { target: { value: "prices" } });
    const count = rail.textContent!;
    const entryTotal = [...container.querySelectorAll("section[id^='chapter-'] li[id]")].length;
    expect(count).toContain(`of ${entryTotal + 8}`);
    expect(rail.querySelector("a[href='#how-prices']")).not.toBeNull();
  });
});
