import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { landingCopy } from "../../lib/copy/landing";
import { stubViewport } from "../../test-utils/stub-viewport";
import { CreditTips } from "./credit-tips";

const tools = landingCopy.tools;
const info = (i: number) => screen.getByRole("button", { name: landingCopy.tip.open(tools[i].name) });

afterEach(() => {
  vi.restoreAllMocks();
});

// 768 and up: the floating tooltip, exactly as shipped (addendum A4 call 2). jsdom's own matchMedia reports false, which
// is the phone branch, so this suite states its width.
describe("CreditTips, 768 and up", () => {
  beforeEach(() => {
    stubViewport(1300);
  });

  it("draws Help me choose's row with the field's own name, and keeps the whole name for its tip and its ⓘ", () => {
    render(<CreditTips suggestedTwo={false} />);
    const row = screen.getByRole("button", { name: landingCopy.tip.open(tools[3].name) }).closest("li");
    expect(row).toHaveTextContent(tools[3].row);
    expect(row).not.toHaveTextContent(tools[3].name);
  });

  it("lists the five paid tools, each with an ⓘ, and every tip closed", () => {
    render(<CreditTips suggestedTwo />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.queryByRole("tooltip")).toBeNull();
    for (const b of screen.getAllByRole("button")) expect(b).toHaveAttribute("aria-expanded", "false");
  });

  it("a press opens the tip with its sentence and its What you get preview, and a second press closes it", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(1));
    const tip = screen.getByRole("tooltip");
    expect(within(tip).getByText(tools[1].tip)).toBeInTheDocument();
    expect(within(tip).getByText(landingCopy.tip.youGet)).toBeInTheDocument();
    expect(within(tip).getByText("Chaos Warp")).toBeInTheDocument();
    expect(info(1)).toHaveAttribute("aria-describedby", tip.id);
    fireEvent.click(info(1));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("holds one tip open at a time", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(0));
    fireEvent.click(info(3));
    const tips = screen.getAllByRole("tooltip");
    expect(tips).toHaveLength(1);
    expect(within(tips[0]).getByText(tools[3].tip)).toBeInTheDocument();
  });

  it("Escape closes an open tip, and so does a press outside", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(2));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(info(2));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("a mouse hovering the ⓘ shows the tip and leaving it hides an unpinned one; a pinned one stays", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.pointerEnter(info(4), { pointerType: "mouse" });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerLeave(info(4), { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.pointerEnter(info(4), { pointerType: "mouse" });
    fireEvent.click(info(4));
    fireEvent.pointerLeave(info(4), { pointerType: "mouse" });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("a mouse over the row but not the ⓘ opens nothing, and an unpinned tip takes no pointer", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.pointerEnter(info(1).closest("li") as HTMLElement, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.pointerEnter(info(1), { pointerType: "mouse" });
    expect(screen.getByRole("tooltip").className).toContain("pointer-events-none");
    fireEvent.click(info(1));
    expect(screen.getByRole("tooltip").className).not.toContain("pointer-events-none");
  });

  it("a pinned tip survives the button's blur (a press inside the tip blurs it), and closes on a second press", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(0));
    fireEvent.blur(info(0));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(info(0));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("an unpinned (keyboard or hover) tip closes on blur", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.pointerEnter(info(2), { pointerType: "mouse" });
    fireEvent.blur(info(2));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("a touch never opens a tip by hover, and a touch press on another ⓘ moves the one open tip", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.pointerEnter(info(0), { pointerType: "touch" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.pointerDown(info(0), { pointerType: "touch" });
    fireEvent.click(info(0), { detail: 1 });
    fireEvent.pointerDown(info(3), { pointerType: "touch" });
    fireEvent.click(info(3), { detail: 1 });
    const tips = screen.getAllByRole("tooltip");
    expect(tips).toHaveLength(1);
    expect(within(tips[0]).getByText(tools[3].tip)).toBeInTheDocument();
  });

  it("every preview draws its tool's own example rows, labelled an example", () => {
    render(<CreditTips suggestedTwo />);
    for (let i = 0; i < tools.length; i++) {
      fireEvent.click(info(i));
      const tip = screen.getByRole("tooltip");
      expect(within(tip).getByText(landingCopy.tip.example)).toBeInTheDocument();
      for (const [, name, note] of tools[i].example.rows) {
        expect(within(tip).getByText(note)).toBeInTheDocument();
        if (name) expect(within(tip).getByText(name)).toBeInTheDocument();
      }
    }
  });

  it("a press never scrolls the page, and the floating tip keeps no phone-only class but its entrance, which CSS turns off from 768", () => {
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(0));
    fireEvent.click(info(2));
    expect(scrollBy).not.toHaveBeenCalled();
    const tip = screen.getByRole("tooltip");
    expect(tip.className.split(/\s+/)).toEqual(expect.arrayContaining(["anim-tip-in", "md:absolute", "md:w-[330px]"]));
    expect(tip.className).not.toContain("anim-menu-in");
    expect(info(2)).not.toHaveAttribute("aria-controls");
  });

  it("is still the floating tooltip at exactly 768", () => {
    vi.restoreAllMocks();
    stubViewport(768);
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(1));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(info(1)).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);
  });
});

/** The tip an ⓘ opened, by its id (below 768 it has no role). */
const tipOf = (i: number) => {
  const id = info(i).getAttribute("aria-controls");
  return id ? document.getElementById(id) : null;
};

/** The id an open ⓘ points at, read straight from the DOM (safe inside a mocked `getBoundingClientRect`). */
const tipIdOf = (i: number) => document.querySelector(`button[aria-label="${landingCopy.tip.open(tools[i].name)}"]`)?.getAttribute("aria-controls");

/**
 * Rects for the scroll tests. `rects` maps an element to its rect, read when `getBoundingClientRect` is called, so a rect
 * can depend on what else is in the document at that moment (a tip above the pressed row, open or closed).
 */
function stubRects(rect: (el: Element) => Partial<DOMRect> | null) {
  const real = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const r = rect(this);
    if (!r) return real.call(this);
    const top = r.top ?? 0;
    const height = r.height ?? (r.bottom ?? top) - top;
    return { x: 0, y: top, left: 0, right: 0, width: 0, top, height, bottom: top + height, toJSON: () => ({}) } as DOMRect;
  });
}

// Below 768: addendum A4. The tip opens in the list's flow and pushes the rows under it down.
describe("CreditTips, below 768 (A4)", () => {
  let scrollBy: MockInstance<typeof window.scrollBy>;
  beforeEach(() => {
    stubViewport(390);
    scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  });

  it("opens the tip inside its row, in the flow: the row wraps and the tip takes the whole line, never floated", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(2));
    const tip = tipOf(2)!;
    const row = info(2).closest("li")!;
    expect(row).toContainElement(tip);
    expect(row.className.split(/\s+/)).toContain("max-md:flex-wrap");
    const cls = tip.className.split(/\s+/);
    // Absolute, inset and the drop shadow are behind md: only; below it the card is a flex item on its own line.
    expect(cls).toEqual(expect.arrayContaining(["max-md:basis-full", "max-md:mt-[2px]", "max-md:mb-[3px]", "md:absolute", "md:z-30", "md:shadow-[0_14px_34px_rgba(0,0,0,0.5)]"]));
    expect(cls.filter((k) => /^(absolute|z-30|inset-|top-|shadow-)/.test(k))).toEqual([]);
    // The card is the shipped tip body: sentence and What you get preview.
    expect(within(tip).getByText(tools[2].tip)).toBeInTheDocument();
    expect(within(tip).getByText(landingCopy.tip.youGet)).toBeInTheDocument();
  });

  it("the card arrives with the phone-only entrance (anim-tip-in), never the all-widths anim-menu-in", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(0));
    expect(tipOf(0)!.className.split(/\s+/)).toContain("anim-tip-in");
    expect(tipOf(0)!.className).not.toContain("anim-menu-in");
  });

  it("is a disclosure: aria-expanded, aria-controls only while open, no tooltip role and no aria-describedby", () => {
    render(<CreditTips suggestedTwo />);
    for (let i = 0; i < tools.length; i++) expect(info(i)).not.toHaveAttribute("aria-controls");
    fireEvent.click(info(3));
    const tip = tipOf(3)!;
    expect(tip).not.toBeNull();
    expect(info(3)).toHaveAttribute("aria-expanded", "true");
    expect(info(3)).toHaveAttribute("aria-controls", tip.id);
    expect(info(3)).not.toHaveAttribute("aria-describedby");
    expect(tip).not.toHaveAttribute("role");
    expect(screen.queryByRole("tooltip")).toBeNull();
    // The label stays `What is {name}?`.
    expect(info(3)).toHaveAccessibleName(landingCopy.tip.open(tools[3].name));
    for (const i of [0, 1, 2, 4]) expect(info(i)).not.toHaveAttribute("aria-controls");
    fireEvent.click(info(3));
    expect(info(3)).not.toHaveAttribute("aria-controls");
    expect(info(3)).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(tip.id)).toBeNull();
  });

  it("a press elsewhere leaves the tip open; the same ⓘ and Escape close it; one tip at a time", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(1));
    fireEvent.pointerDown(document.body);
    expect(tipOf(1)).not.toBeNull();
    fireEvent.click(info(1));
    expect(info(1)).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(info(0));
    fireEvent.click(info(4));
    expect(info(0)).toHaveAttribute("aria-expanded", "false");
    expect(within(tipOf(4)!).getByText(tools[4].tip)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(info(4)).toHaveAttribute("aria-expanded", "false");
  });

  it("a mouse in a narrow window follows the shipped hover: an unpinned tip, pointer-events-none, gone on leave, no scroll", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.pointerEnter(info(1), { pointerType: "mouse" });
    expect(tipOf(1)!.className.split(/\s+/)).toContain("pointer-events-none");
    fireEvent.pointerLeave(info(1), { pointerType: "mouse" });
    expect(info(1)).toHaveAttribute("aria-expanded", "false");
    fireEvent.pointerEnter(info(1), { pointerType: "mouse" });
    fireEvent.click(info(1));
    expect(tipOf(1)!.className).not.toContain("pointer-events-none");
    fireEvent.pointerLeave(info(1), { pointerType: "mouse" });
    expect(tipOf(1)).not.toBeNull();
    // The hover opened it without a scroll; pinning it runs the into-view check, which a tip in view passes untouched.
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("keyboard focus opens the tip as shipped and scrolls it into view; blur closes it", () => {
    stubRects((el) => (el.id && el.id === tipIdOf(4) ? { top: 700, height: 220 } : null));
    render(<CreditTips suggestedTwo />);
    const b = info(4);
    const matches = b.matches.bind(b);
    b.matches = (s: string) => s === ":focus-visible" || matches(s);
    fireEvent.focus(b);
    expect(tipOf(4)).not.toBeNull();
    // 700 + 220 = 920 runs past innerHeight (768) - 16: scroll just enough, smooth.
    expect(scrollBy.mock.calls).toEqual([[{ top: 920 - (window.innerHeight - 16), behavior: "smooth" }]]);
    fireEvent.blur(b);
    expect(b).toHaveAttribute("aria-expanded", "false");
  });

  it("switching holds the pressed row in place: the instant anchor scroll runs first, then the smooth scroll into view", () => {
    // Proposed cuts' ⓘ sits at 500 while Overview's 240px tip is open above it, and at 260 once that tip closes.
    const button = (i: number) => document.querySelector(`button[aria-label="${landingCopy.tip.open(tools[i].name)}"]`);
    stubRects((el) => {
      if (el === button(2)) return { top: button(0)?.getAttribute("aria-expanded") === "true" ? 500 : 260, height: 44 };
      if (el.id && el.id === button(2)?.getAttribute("aria-controls")) return { top: 700, height: 250 };
      return null;
    });
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(0));
    scrollBy.mockClear();
    fireEvent.click(info(2));
    expect(scrollBy.mock.calls).toEqual([
      [{ top: -240, behavior: "instant" }],
      [{ top: 950 - (window.innerHeight - 16), behavior: "smooth" }],
    ]);
  });

  it("a tip already in view never moves the page, and closing never scrolls", () => {
    stubRects((el) => (el.id && el.id === tipIdOf(1) ? { top: 200, height: 260 } : null));
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(1));
    expect(tipOf(1)).not.toBeNull();
    fireEvent.click(info(1));
    fireEvent.click(info(1));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("a tip taller than the screen puts its top 16px under the top of the screen", () => {
    stubRects((el) => (el.id && el.id === tipIdOf(1) ? { top: 300, height: window.innerHeight } : null));
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(1));
    expect(scrollBy.mock.calls).toEqual([[{ top: 300 - 16, behavior: "smooth" }]]);
  });

  it("under reduced motion the scroll into view is instant", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("prefers-reduced-motion: reduce"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    stubRects((el) => (el.id && el.id === tipIdOf(4) ? { top: 700, height: 220 } : null));
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(4));
    expect(scrollBy.mock.calls).toEqual([[{ top: 920 - (window.innerHeight - 16), behavior: "instant" }]]);
  });

  it("widening the window past 768 turns an open in-flow tip back into the floating tooltip", () => {
    vi.restoreAllMocks();
    const vp = stubViewport(390);
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(2));
    expect(screen.queryByRole("tooltip")).toBeNull();
    act(() => vp.resizeTo(1300));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(info(2)).not.toHaveAttribute("aria-controls");
  });
});

describe("credit-tips.tsx decides width through useMinWidth", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "credit-tips.tsx"), "utf8");
  it("reads the 768 split with useMinWidth and never calls matchMedia itself", () => {
    expect(src).toMatch(/useMinWidth\("\(min-width: 768px\)"\)/);
    expect(src).not.toMatch(/matchMedia/);
  });
});

