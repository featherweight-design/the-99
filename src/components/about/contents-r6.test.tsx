// The entry-level contents and their search (About R6 §Q, §R), rendered inside
// the real page so "the page is untouched" (ruling 4) is asserted against the
// page's own sections rather than a stand-in.

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../app/about/actions", () => ({ dismissAbout: vi.fn(), recordAboutVisit: vi.fn(async () => {}) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { AboutPage } = await import("./about-page");
const { ABOUT_VERSION, aboutCopy, aboutEntries } = await import("../../lib/copy/about");

const TOTAL = aboutEntries.length;
/** Both placements are in the document; jsdom computes no styles. Phone first in DOM order. */
const navs = () => screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
const phone = () => navs()[0];
const rail = () => navs()[1];
const field = (nav: HTMLElement) => within(nav).getByRole("searchbox", { name: aboutCopy.contents.searchLabel });
const type = (nav: HTMLElement, q: string) => fireEvent.change(field(nav), { target: { value: q } });
const entryRows = (nav: HTMLElement) => [...nav.querySelectorAll<HTMLAnchorElement>("a[data-entry-row]")];

beforeEach(() => {
  window.history.replaceState(null, "", "/about");
});

describe("the search (§R)", () => {
  it("filters the rows to titles holding the query, and counts them", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    type(rail(), "combo");
    const want = aboutEntries.filter((e) => e.title.toLowerCase().includes("combo"));
    expect(want.length).toBeGreaterThan(0);
    expect(entryRows(rail()).map((a) => a.getAttribute("href"))).toEqual(want.map((e) => `#${e.id}`));
    expect(within(rail()).getByText(aboutCopy.contents.count(want.length, TOTAL))).toBeTruthy();
  });

  it("never hides, removes or reorders any part of the page (ruling 4)", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    const before = [...document.querySelectorAll("article li[id]")].map((li) => li.id);
    type(rail(), "combo");
    type(phone(), "mulligan");
    const after = [...document.querySelectorAll("article li[id]")].map((li) => li.id);
    expect(after).toEqual(before);
    for (const n of ["01", "02", "03", "04"]) {
      const section = document.getElementById(`chapter-${n}`)!;
      expect(section.hidden).toBe(false);
      expect(section.getAttribute("style") ?? "").not.toMatch(/display|opacity|visibility/);
    }
  });

  it("drops a chapter with no match from the list only", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    const q = aboutEntries[0].title;
    type(rail(), q);
    const chapterLinks = within(rail()).getAllByRole("link").filter((a) => a.getAttribute("href")!.startsWith("#chapter-"));
    expect(chapterLinks.map((a) => a.getAttribute("href"))).toEqual([`#chapter-${aboutEntries[0].chapter}`]);
  });

  it("draws the matched run apart from the rest of the title", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    type(rail(), "COMBO");
    const hit = entryRows(rail())[0].querySelector(".font-semibold")!;
    expect(hit.textContent!.toLowerCase()).toBe("combo");
  });

  it("reads regex characters as characters", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    expect(() => type(rail(), "(+[")).not.toThrow();
  });

  it("says so when nothing matches, and offers to clear (§R3)", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    type(rail(), "mulligan");
    expect(within(rail()).getByText(aboutCopy.contents.none("mulligan"))).toBeTruthy();
    expect(within(rail()).getByText(aboutCopy.contents.noneNote)).toBeTruthy();
    // The empty state's own button, which is the second of the two: the field's ✕
    // carries the same name and does the same thing.
    const clears = within(rail()).getAllByRole("button", { name: aboutCopy.contents.clear });
    expect(clears).toHaveLength(2);
    fireEvent.click(clears[1]);
    expect((field(rail()) as HTMLInputElement).value).toBe("");
  });

  it("jumps to the first match on Enter, and clears on Escape (§R5)", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    type(rail(), "combo");
    const first = entryRows(rail())[0].getAttribute("href")!;
    act(() => {
      fireEvent.keyDown(field(rail()), { key: "Enter" });
    });
    expect(window.location.hash).toBe(first);
    fireEvent.keyDown(field(rail()), { key: "Escape" });
    expect((field(rail()) as HTMLInputElement).value).toBe("");
  });

  it("moves into the list on the down arrow", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    type(rail(), "combo");
    fireEvent.keyDown(field(rail()), { key: "ArrowDown" });
    expect(document.activeElement).toBe(entryRows(rail())[0]);
  });
});

describe("the rail (§Q1–Q3, E4 fallback)", () => {
  it("opens only the current chapter, which is the first before any scroll", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    const first = aboutEntries.filter((e) => e.chapter === "01");
    expect(entryRows(rail()).map((a) => a.getAttribute("href"))).toEqual(first.map((e) => `#${e.id}`));
  });

  it("prints N new for a chapter holding new entries, and nothing otherwise", () => {
    render(<AboutPage seen={ABOUT_VERSION - 1} sheetMode />);
    const fresh = aboutEntries.find((e) => e.since === ABOUT_VERSION)!;
    const row = within(rail()).getByRole("link", { name: new RegExp(`^${fresh.chapter} `) });
    expect(row.textContent).toContain(aboutCopy.newInChapter(1));
    const quiet = ["01", "02", "03", "04"].find((n) => n !== fresh.chapter)!;
    const quietRow = within(rail()).getByRole("link", { name: new RegExp(`^${quiet} `) });
    expect(quietRow.textContent).not.toMatch(/entries|new/);
  });
});

describe("the phone list (§Q4–Q7)", () => {
  it("starts with every chapter closed, even for a reader who is behind (Q7)", () => {
    render(<AboutPage seen={ABOUT_VERSION - 1} sheetMode />);
    const toggles = within(phone()).getAllByRole("button", { expanded: false });
    expect(toggles).toHaveLength(4);
    expect(entryRows(phone())).toHaveLength(0);
  });

  it("opens one chapter without closing another (Q5)", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    const [a, b] = within(phone()).getAllByRole("button", { expanded: false });
    fireEvent.click(a);
    fireEvent.click(b);
    expect(within(phone()).getAllByRole("button", { expanded: true })).toHaveLength(2);
  });

  it("marks a new entry's row", () => {
    render(<AboutPage seen={ABOUT_VERSION - 1} sheetMode />);
    type(phone(), aboutEntries.find((e) => e.since === ABOUT_VERSION)!.title);
    expect(entryRows(phone())[0].textContent).toMatch(new RegExp(`${aboutCopy.contents.newRow}$`));
  });

  it("opens every chapter with a match while searching, and restores the reader's own on clear (§R2, §R6)", () => {
    render(<AboutPage seen={ABOUT_VERSION} sheetMode />);
    const [first] = within(phone()).getAllByRole("button", { expanded: false });
    fireEvent.click(first);
    type(phone(), "combo");
    expect(entryRows(phone()).length).toBeGreaterThan(0);
    expect(within(phone()).queryAllByRole("button", { expanded: true })).toHaveLength(0);
    type(phone(), "");
    expect(within(phone()).getAllByRole("button", { expanded: true })).toHaveLength(1);
  });
});

describe("with the switch off", () => {
  it("draws the old contents, with no search", () => {
    render(<AboutPage seen={ABOUT_VERSION} />);
    expect(screen.queryAllByRole("searchbox")).toHaveLength(0);
  });
});
