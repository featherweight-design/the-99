import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavRail, TabBar } from "./nav";
import { setAboutSheetUp } from "./about-sheet-presence";
import { reveal } from "../../lib/ui/reveal";
// The jump is `reveal`'s; its eased scroll is `reveal`'s own test.
vi.mock("../../lib/ui/reveal", () => ({ reveal: vi.fn() }));

const LABELS = ["Home", "Collection", "Commanders", "Discover", "Decks"];

let pathname = "/collection";
const push = vi.fn();
// Records every code-started navigation the component starts through `usePendingPush`, which is
// what hands it to the navigation-pending provider (the plan's PR 3). The push still reaches the
// router mock, so the cases that assert it are unchanged.
const pushed = vi.hoisted(() => [] as string[]);
vi.mock("./pending-push", async () => {
  const { useRouter } = await import("next/navigation");
  return {
    usePendingPush: () => {
      const router = useRouter();
      return { go: (href: string) => { pushed.push(href); router.push(href); } };
    },
  };
});

vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push }) }));

afterEach(() => {
  pathname = "/collection";
  push.mockReset();
  document.body.innerHTML = "";
});

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      firstName: "Ana",
      lastName: "Ruiz",
      fullName: "Ana Ruiz",
      primaryEmailAddress: { emailAddress: "ana.ruiz@example.com" },
    },
  }),
  useClerk: () => ({ openUserProfile: vi.fn(), signOut: vi.fn() }),
}));

describe("NavRail", () => {
  // The rail is `sticky`, which makes it a stacking context, so the account
  // popover's own z-index cannot lift it past the main column. Routes put
  // positive z-index on ordinary content — the collection filter bar is
  // `md:z-[2]`, a rec card's overlay is `z-[1]` — and that content comes later
  // in the DOM, so without a rank on the rail it paints over the open menu.
  it("outranks the main column, so an open popover is not painted over", () => {
    const { container } = render(<NavRail locked={false} theme="amonkhet" />);
    const rail = container.querySelector("aside");
    expect(rail?.className).toContain("z-30");
  });

  // Ranked below the tab bar, the menu's backdrop (z-45) and the modals (z-50),
  // all of which are meant to cover the rail rather than sit under it.
  it("ranks below the mobile tab bar", () => {
    render(<TabBar locked={false} />);
    const tabs = screen.getByRole("navigation", { name: "Primary" });
    expect(tabs.className).toContain("z-40");
  });

  it("is icon-only beside a pointer, so every item carries its label as an accessible name and no native tooltip", () => {
    render(<NavRail locked={false} theme="amonkhet" />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const label of LABELS) {
      const item = within(nav).getByRole("link", { name: label });
      // The name tag draws the name beside a pointer (rail-tag.test.tsx); a native `title`
      // would draw a second, browser tooltip over it (audit E3).
      expect(item).not.toHaveAttribute("title");
      // The label's only text is the touch rail's span, which is hidden unless
      // `(hover: none)` (jsdom applies no media query, so this reads the class)
      // and aria-hidden, so the name is heard once (audit E3).
      const span = item.querySelector("[data-rail-label]");
      expect(span).toHaveTextContent(label);
      expect(span).toHaveAttribute("aria-hidden", "true");
      expect(span?.className).toMatch(/(^| )hidden( |$)/);
      expect(span?.className).toContain("touch:block");
    }
  });

  // The mark is the crowned numeral, not the bare diamond the rail drew until
  // 2026-09-08 — that was the crown's middle diamond alone, which is also the
  // shape Discover's nav glyph is built from. Asserted by role and name rather
  // than a test-only attribute, so this covers the accessible name as well.
  it("carries the app mark once, at the top, not once per row", () => {
    const { container } = render(<NavRail locked={false} theme="amonkhet" />);
    const rail = container.querySelector("aside")!;
    const marks = within(rail).getAllByRole("img", { name: "The 99" });
    expect(marks).toHaveLength(1);
    // Before the Primary landmark, so a screen reader reads the app's name and
    // then the nav, rather than meeting the name somewhere inside it.
    const nav = within(rail).getByRole("navigation", { name: "Primary" });
    // A bitmask, so test the one bit — an equality check would break the day
    // either element gains an ancestor relationship to the other.
    expect(marks[0].compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // The two lanes are separate routes, so each marks itself current on its own
  // pathname and neither claims the other's.
  it("marks Discover current on the discover route, and Commanders not", () => {
    pathname = "/discover";
    render(<NavRail locked={false} theme="amonkhet" />);
    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Commanders" })).not.toHaveAttribute("aria-current");
  });
});

// Desktop nav labels (R2 for the input split, R1 as the touch rail, V1 for short touch screens).
// jsdom applies no media queries, so these read the classes (audit E12); probe:nav-labels walks
// the rail with `(hover: none)` emulated.
describe("NavRail on a touch screen", () => {
  const railSlots = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLElement>("aside a, aside [data-locked-slot]")];

  it("takes its width from --rail-w and its height from the visible viewport", () => {
    const { container } = render(<NavRail locked={false} theme="amonkhet" />);
    const rail = container.querySelector("aside")!;
    expect(rail.className).toContain("w-[var(--rail-w)]");
    expect(rail.className).not.toContain("w-[62px]");
    expect(rail.className).toContain("touch:h-dvh");
    expect(rail.className).toContain("touch-short:py-[10px]");
  });

  it("draws every live and locked slot as the tab bar's 72 × 52 slot, and 72 × 44 when short", () => {
    for (const locked of [false, true]) {
      const { container, unmount } = render(<NavRail locked={locked} theme="amonkhet" />);
      const slots = railSlots(container);
      expect(slots).toHaveLength(5);
      for (const slot of slots) {
        for (const cls of ["touch:w-[72px]", "touch:h-[52px]", "touch:flex-col", "touch:rounded-[12px]", "touch-short:h-[44px]", "shrink-0"]) {
          expect(slot.className).toContain(cls);
        }
        expect(slot.querySelector("[data-rail-label]")?.className).toContain("leading-[12px]");
      }
      unmount();
    }
  });

  it("makes the nav the one scroll region, with the mark and the account control outside it", () => {
    const { container } = render(<NavRail locked={false} theme="amonkhet" />);
    const nav = container.querySelector("[data-rail-nav]")!;
    for (const cls of ["touch:overflow-y-auto", "touch:flex-1", "touch:min-h-0", "touch:pt-[4px]", "touch:pb-[8px]"]) {
      expect(nav.className).toContain(cls);
    }
    // V1 tightens the gap between icon and label when short, never the gap between slots, which
    // stays 4px in the nav and in the well (5 × 44 + 4 × 4 = 236; the well's 188 and its 4 to the foot).
    expect(nav.className).not.toMatch(/touch-short:gap-/);
    // A classic scrollbar would take ~15px of the column and clip the slot's ring at both sides.
    expect(nav.className).toContain("touch:[scrollbar-width:none]");
    expect(nav.className).toContain("touch:[&::-webkit-scrollbar]:hidden");
    expect(nav.contains(screen.getByRole("img", { name: /the 99/i }))).toBe(false);
  });

  it("widens the first-run well to 80px and tightens it when short", () => {
    const { container } = render(<NavRail locked theme="amonkhet" />);
    const well = container.querySelector("[data-lock-well]")!;
    for (const cls of ["touch:w-[80px]", "touch:rounded-[14px]", "touch:px-[3px]", "touch-short:pb-[5px]"]) {
      expect(well.className).toContain(cls);
    }
    expect(well.className).not.toMatch(/touch-short:gap-/);
  });

  it("re-places an open lock note when the nav scrolls under it (audit V-E3)", () => {
    render(<NavRail locked theme="amonkhet" />);
    const slot = screen.getByRole("button", { name: /^Collection/ });
    let top = 100;
    slot.getBoundingClientRect = () => ({ top, height: 52, right: 80, left: 8, bottom: top + 52, width: 72, x: 8, y: top, toJSON: () => ({}) });
    fireEvent.pointerEnter(slot);
    const note = document.querySelector<HTMLElement>('[data-lock-note="open"]')!;
    const before = note.style.top;
    top = 40;
    act(() => {
      document.querySelector("[data-rail-nav]")!.dispatchEvent(new Event("scroll"));
    });
    expect(document.querySelector<HTMLElement>('[data-lock-note="open"]')!.style.top).not.toBe(before);
  });
});

describe("TabBar", () => {
  // The rail's touch classes live on the rail alone: every phone is `(hover: none)` too, and the
  // tab bar shares NavSlot (audit E5). Its slots and pip are what they were.
  it("carries none of the touch rail's classes", () => {
    pathname = "/decks";
    const { container } = render(<TabBar locked={false} />);
    expect(container.innerHTML).not.toMatch(/touch(-short)?:/);
  });

  it("keeps its visible labels, the way the touch rail draws them", () => {
    render(<TabBar locked={false} />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const label of LABELS) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
  });

  // Discover sits after Commanders and before Decks: owned before unowned, and
  // the two commander lanes read as one shelf.
  it("renders the same five slots in the same order as the rail", () => {
    render(<TabBar locked={false} />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/collection", "/commanders", "/discover", "/decks"]);
  });

  // 320pt is the narrowest phone the bar is measured against, and `Commanders`
  // at the shipped 9px leaves 3.4px of air there. The label drops to 8.5px and
  // loses its tracking below 360px, which buys back 3px per label.
  it("shrinks the label below 360px so the longest one still clears", () => {
    render(<TabBar locked={false} />);
    const label = screen.getByText("Commanders");
    expect(label.className).toContain("max-[359px]:text-[8.5px]");
    expect(label.className).toContain("max-[359px]:tracking-normal");
  });

  // Only the locked slot may override the name. An unlocked tab already shows
  // its label, so an aria-label there would be a second, competing copy of it.
  it("leaves an unlocked tab's name to its visible label", () => {
    render(<TabBar locked={false} />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const item of within(nav).getAllByRole("link")) {
      expect(item).not.toHaveAttribute("aria-label");
    }
  });
});

// One icon set for both chromes, so slot N cannot draw a different glyph in
// the rail than it does in the tab bar — the transposition the handoff says
// was caught in review once already.
describe("Nav glyphs", () => {
  it("draws the same shape in the same slot in both chromes", () => {
    const rail = render(<NavRail locked={false} theme="amonkhet" />);
    const railShapes = [...rail.container.querySelectorAll("nav a svg")].map((s) => s.innerHTML);
    const tabs = render(<TabBar locked={false} />);
    const tabShapes = [...tabs.container.querySelectorAll("nav a svg")].map((s) => s.innerHTML);
    expect(railShapes).toHaveLength(5);
    expect(tabShapes).toEqual(railShapes);
  });

  // 19px drawn on 20 units is what the handoff frames specify; reading the
  // viewBox off the rendered size instead rescales every stroke.
  it("renders 19px glyphs on the handoff's 20-unit viewBox", () => {
    const { container } = render(<TabBar locked={false} />);
    for (const svg of container.querySelectorAll("nav a svg")) {
      expect(svg.getAttribute("width")).toBe("19");
      expect(svg.getAttribute("viewBox")).toBe("0 0 20 20");
      expect(svg.getAttribute("stroke-width")).toBe("1.5");
    }
  });
});

// ---------------------------------------------------------------------------
// The lock (docs/superpowers/design-tables/first-run-locked-nav.md). jsdom lays
// nothing out, so geometry (the well, the note's placement, the 88px bar) is
// `probe:locked-nav`'s; these pin the contract and the open/close rules.
// ---------------------------------------------------------------------------

const DECKS_NOTE = "Decks opens once your cards are in. So do Collection, Commanders and Discover.";

function slot(name: string) {
  return screen.getByRole("button", { name: `${name}, locked` });
}
function noteOf(button: HTMLElement) {
  return document.getElementById(button.getAttribute("aria-controls")!)!;
}
function isOpen(button: HTMLElement) {
  return button.getAttribute("aria-expanded") === "true";
}

describe("The lock, desktop rail", () => {
  it("draws each locked slot as a button that opens a note, not a disabled link", () => {
    render(<NavRail locked theme="amonkhet" />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const label of ["Collection", "Commanders", "Discover", "Decks"]) {
      const item = within(nav).getByRole("button", { name: `${label}, locked` });
      expect(item).toHaveAttribute("type", "button");
      expect(item).toHaveAttribute("aria-expanded", "false");
      expect(item).not.toHaveAttribute("aria-disabled");
      expect(item).not.toHaveAttribute("title");
      // In the tab order.
      expect(item).not.toHaveAttribute("tabindex");
      expect(noteOf(item)).toBeInTheDocument();
    }
    expect(within(nav).queryByRole("link", { name: /Decks/ })).toBeNull();
    // Home is never lockable.
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });

  it("describes the slot by its note's sentence, which is present while the note is closed", () => {
    render(<NavRail locked theme="amonkhet" />);
    const decks = slot("Decks");
    const sentence = document.getElementById(decks.getAttribute("aria-describedby")!);
    expect(sentence?.textContent).toBe(DECKS_NOTE);
    expect(decks).toHaveAccessibleDescription(DECKS_NOTE);
    // Closed: visually hidden, and nothing in it takes focus.
    const note = noteOf(decks);
    expect(note.className).toContain("sr-only");
    expect(within(note).queryByRole("button")).toBeNull();
    expect(within(note).queryByText("Locked")).toBeNull();
    expect(note).not.toHaveAttribute("role");
  });

  it("keeps a locked slot current on its own route, without the active fill", () => {
    const { container } = render(<NavRail locked theme="amonkhet" />);
    expect(slot("Collection")).toHaveAttribute("aria-current", "page");
    expect(slot("Decks")).not.toHaveAttribute("aria-current");
    expect(container.querySelector(".bg-elevated")).toBeNull();
  });

  it("puts the four locked slots and the LOCKED foot inside one well, with Home outside", () => {
    const { container } = render(<NavRail locked theme="amonkhet" />);
    const well = container.querySelector("[data-lock-well]")!;
    expect(well).not.toBeNull();
    expect(within(well as HTMLElement).getAllByRole("button", { name: /, locked$/ })).toHaveLength(4);
    expect(within(well as HTMLElement).getByText("Locked")).toBeInTheDocument();
    expect(well.contains(screen.getByRole("link", { name: "Home" }))).toBe(false);
    // The divider and the lone --fg-disabled padlock it replaces are gone.
    expect(container.querySelector('[stroke="var(--fg-disabled)"]')).toBeNull();
  });

  it("opens on hover, on focus and on a click", () => {
    render(<NavRail locked theme="amonkhet" />);
    const decks = slot("Decks");
    const discover = slot("Discover");

    fireEvent.pointerEnter(decks);
    expect(isOpen(decks)).toBe(true);
    const note = noteOf(decks);
    expect(note.className).not.toContain("sr-only");
    expect(within(note).getByText("Locked")).toBeInTheDocument();
    expect(within(note).getByRole("button", { name: "Go to step 1" })).toBeInTheDocument();

    // Hovering another slot moves the note there: one at a time.
    fireEvent.pointerEnter(discover);
    expect(isOpen(discover)).toBe(true);
    expect(isOpen(decks)).toBe(false);

    fireEvent.pointerDown(document.body);
    act(() => decks.focus());
    expect(isOpen(decks)).toBe(true);

    fireEvent.pointerDown(document.body);
    act(() => (document.activeElement as HTMLElement).blur());
    fireEvent.click(discover);
    expect(isOpen(discover)).toBe(true);
  });

  it("does not close when the pointer leaves the slot, so it can travel onto the note", () => {
    render(<NavRail locked theme="amonkhet" />);
    const decks = slot("Decks");
    fireEvent.pointerEnter(decks);
    fireEvent.pointerLeave(decks);
    expect(isOpen(decks)).toBe(true);
    // A press on the note's own text is inside it.
    fireEvent.pointerDown(noteOf(decks));
    expect(isOpen(decks)).toBe(true);
  });

  it("closes on Escape and hands focus back to the slot, without reopening", () => {
    render(<NavRail locked theme="amonkhet" />);
    const decks = slot("Decks");
    act(() => decks.focus());
    expect(isOpen(decks)).toBe(true);
    fireEvent.keyDown(decks, { key: "Escape" });
    expect(isOpen(decks)).toBe(false);
    expect(document.activeElement).toBe(decks);
  });

  // The reopen the guard exists for: a note opened by HOVER has focus elsewhere, so Escape's
  // return of focus to the slot fires its focus handler, which would open the note again.
  it("does not reopen a hover-opened note when Escape returns focus to its slot", () => {
    render(<NavRail locked theme="amonkhet" />);
    const decks = slot("Decks");
    fireEvent.pointerEnter(decks);
    expect(isOpen(decks)).toBe(true);
    expect(document.activeElement).not.toBe(decks);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(document.activeElement).toBe(decks);
    expect(isOpen(decks)).toBe(false);
  });

  it("leaves an Escape pressed inside something else alone", () => {
    render(
      <>
        <NavRail locked theme="amonkhet" />
        <input aria-label="elsewhere" />
      </>,
    );
    const decks = slot("Decks");
    fireEvent.pointerEnter(decks);
    const other = screen.getByRole("textbox", { name: "elsewhere" });
    act(() => other.focus());
    fireEvent.keyDown(other, { key: "Escape" });
    expect(isOpen(decks)).toBe(true);
  });

  it("closes on a press outside slot and note", () => {
    render(<NavRail locked theme="amonkhet" />);
    const decks = slot("Decks");
    fireEvent.pointerEnter(decks);
    fireEvent.pointerDown(document.body);
    expect(isOpen(decks)).toBe(false);
  });

  it("closes when focus leaves both slot and note, and not when it moves between them", () => {
    render(
      <>
        <NavRail locked theme="amonkhet" />
        <button type="button">after</button>
      </>,
    );
    const decks = slot("Decks");
    act(() => decks.focus());
    const go = within(noteOf(decks)).getByRole("button", { name: "Go to step 1" });
    act(() => go.focus());
    expect(isOpen(decks)).toBe(true);
    act(() => screen.getByRole("button", { name: "after" }).focus());
    expect(isOpen(decks)).toBe(false);
  });

  it("takes Go to step 1 to the upload entry when it is on the page", () => {
    render(
      <>
        <NavRail locked theme="amonkhet" />
        <button type="button" data-step1-upload>
          Upload a CSV
        </button>
      </>,
    );
    const decks = slot("Decks");
    vi.mocked(reveal).mockClear();
    fireEvent.pointerEnter(decks);
    fireEvent.click(within(noteOf(decks)).getByRole("button", { name: "Go to step 1" }));
    expect(reveal).toHaveBeenCalledWith(screen.getByRole("button", { name: "Upload a CSV" }), "center");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Upload a CSV" }));
    expect(push).not.toHaveBeenCalled();
    expect(isOpen(decks)).toBe(false);
  });

  // While step 1's review is open its upload entry is gone; leaving for the replace page would
  // throw the review away, so the step-1 card takes focus instead.
  it("takes Go to step 1 to the step-1 card while its review has replaced the entry", () => {
    render(
      <>
        <NavRail locked theme="amonkhet" />
        <div data-step1-card="" tabIndex={-1} aria-label="Step 1" />
      </>,
    );
    const decks = slot("Decks");
    fireEvent.pointerEnter(decks);
    fireEvent.click(within(noteOf(decks)).getByRole("button", { name: "Go to step 1" }));
    expect(document.activeElement).toBe(document.querySelector("[data-step1-card]"));
    expect(push).not.toHaveBeenCalled();
  });

  it("routes Go to step 1 to the replace page when no checklist is on screen", () => {
    render(<NavRail locked theme="amonkhet" />);
    const decks = slot("Decks");
    fireEvent.pointerEnter(decks);
    fireEvent.click(within(noteOf(decks)).getByRole("button", { name: "Go to step 1" }));
    expect(push).toHaveBeenCalledWith("/collection/replace");
    expect(pushed).toContain("/collection/replace");
    expect(isOpen(decks)).toBe(false);
  });

  it("unmounts every part of the lock once unlocked", () => {
    const { container } = render(<NavRail locked={false} theme="amonkhet" />);
    expect(container.querySelector("[data-lock-well]")).toBeNull();
    expect(container.querySelector("[data-lock-note]")).toBeNull();
    expect(screen.queryByRole("button", { name: /, locked$/ })).toBeNull();
    for (const item of within(screen.getByRole("navigation", { name: "Primary" })).getAllByRole("link")) {
      expect(item).not.toHaveAttribute("aria-expanded");
      expect(item).not.toHaveAttribute("aria-controls");
    }
  });

  it("draws nothing with a transition or animation", () => {
    const { container } = render(<NavRail locked theme="amonkhet" />);
    fireEvent.pointerEnter(slot("Decks"));
    // The account trigger below the well has a hover transition of its own; the
    // lock is the well and everything in it (the open note included).
    const well = container.querySelector("[data-lock-well]")!;
    expect(well.className).not.toMatch(/transition|anim/);
    expect(well.querySelector('[class*="transition"], [class*="anim"]')).toBeNull();
  });
});

describe("The lock, phone tab bar", () => {
  it("draws the bracket over tabs 2 to 5 and stacks it over the tabs, only while locked", () => {
    const { container, rerender } = render(<TabBar locked />);
    const bar = screen.getByRole("navigation", { name: "Primary" });
    const bracket = container.querySelector("[data-lock-bracket]")!;
    expect(bracket).toHaveTextContent("Open once your cards are in");
    expect(bracket.className).toContain("ml-[20%]");
    expect(bar.className).toContain("flex-col");
    expect(bar.className).toContain("pt-[7px]");
    expect(bar.className).toContain("h-[var(--tabbar-h)]");

    rerender(<TabBar locked={false} />);
    expect(container.querySelector("[data-lock-bracket]")).toBeNull();
    expect(container.querySelector("[data-lock-note]")).toBeNull();
    expect(bar.className).not.toContain("flex-col");
    expect(bar.className).toContain("pt-2");
  });

  it("draws each locked tab as a button under the same contract as the rail", () => {
    render(<TabBar locked />);
    const collection = slot("Collection");
    expect(collection).toHaveAttribute("aria-expanded", "false");
    expect(collection).toHaveAttribute("aria-current", "page");
    expect(collection).not.toHaveAttribute("aria-disabled");
    expect(collection).not.toHaveAttribute("title");
    expect(collection).toHaveAccessibleDescription(
      "Collection opens once your cards are in. So do Commanders, Discover and Decks.",
    );
    expect(collection.className).toContain("gap-[5px]");
  });

  it("waits for the About sheet: a tap under it opens the note once it closes (H1)", () => {
    // At 390 the sheet and this note sit in the same place, and the sheet holds it.
    act(() => setAboutSheetUp(true));
    try {
      render(<TabBar locked />);
      const decks = slot("Decks");
      fireEvent.click(decks);
      expect(isOpen(decks)).toBe(false);
      // The sheet closes the way a reader closes it, with a press on its Later: a
      // pointerdown outside the lock, which must not clear the waiting note.
      const later = document.createElement("button");
      const sheet = document.createElement("div");
      sheet.setAttribute("data-about-sheet", "");
      sheet.appendChild(later);
      document.body.appendChild(sheet);
      fireEvent.pointerDown(later);
      act(() => setAboutSheetUp(false));
      sheet.remove();
      expect(isOpen(decks)).toBe(true);
    } finally {
      act(() => setAboutSheetUp(false));
    }
  });

  it("cancels a waiting note on a second tap while the About sheet is up", () => {
    act(() => setAboutSheetUp(true));
    try {
      render(<TabBar locked />);
      const decks = slot("Decks");
      fireEvent.click(decks);
      fireEvent.click(decks);
      act(() => setAboutSheetUp(false));
      expect(isOpen(decks)).toBe(false);
    } finally {
      act(() => setAboutSheetUp(false));
    }
  });

  it("opens on a tap only, and a second tap closes it", () => {
    render(<TabBar locked />);
    const decks = slot("Decks");
    fireEvent.pointerEnter(decks);
    act(() => decks.focus());
    expect(isOpen(decks)).toBe(false);

    fireEvent.click(decks);
    expect(isOpen(decks)).toBe(true);
    expect(decks.className).toContain("shadow-[inset_0_0_0_1px_var(--border-strong)]");
    const note = noteOf(decks);
    expect(within(note).getByRole("button", { name: "Go to step 1" })).toBeInTheDocument();
    // No LOCKED label on the phone note.
    expect(within(note).queryByText("Locked")).toBeNull();

    fireEvent.pointerDown(decks);
    fireEvent.click(decks);
    expect(isOpen(decks)).toBe(false);
    expect(decks.className).not.toContain("shadow-[inset");
  });

  it("closes on a tap outside, and on Escape with focus back on the slot", () => {
    render(<TabBar locked />);
    const decks = slot("Decks");
    fireEvent.click(decks);
    fireEvent.pointerDown(document.body);
    expect(isOpen(decks)).toBe(false);

    act(() => decks.focus());
    fireEvent.click(decks);
    const go = within(noteOf(decks)).getByRole("button", { name: "Go to step 1" });
    act(() => go.focus());
    fireEvent.keyDown(go, { key: "Escape" });
    expect(isOpen(decks)).toBe(false);
    expect(document.activeElement).toBe(decks);
  });

  it("closes on Go to step 1", () => {
    render(<TabBar locked />);
    const decks = slot("Decks");
    fireEvent.click(decks);
    fireEvent.click(within(noteOf(decks)).getByRole("button", { name: "Go to step 1" }));
    expect(push).toHaveBeenCalledWith("/collection/replace");
    expect(isOpen(decks)).toBe(false);
  });
});
