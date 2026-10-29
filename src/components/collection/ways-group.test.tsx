// The "ways" group (no-collection entry S1, S13, S15): one component on first run's step 1 and on the empty
// Collection. These pin what it holds, in which order, where each press goes, both widths' structure, and that
// both surfaces render this one component rather than a copy of it.
import fs from "node:fs";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../discovery/home-tour", () => ({ HomeTour: () => null }));
vi.mock("../../app/collection/actions", () => ({ confirmUpload: vi.fn(), previewPaste: vi.fn(), previewUpload: vi.fn() }));
const settle = vi.fn();
vi.mock("../../app/collection/edit-actions", () => ({ settleCollectionWrite: (...a: unknown[]) => settle(...a) }));
let sheet: { onSaved?: (n: number) => void; onClose: () => void } | null = null;
vi.mock("./add-cards-sheet", () => ({
  AddCardsSheet: (p: { onSaved?: (n: number) => void; onClose: () => void }) => {
    sheet = p;
    return <div role="dialog" aria-label="Add cards sheet" />;
  },
}));

const { WaysGroup, preconsPickHref } = await import("./ways-group");
const { FirstRunChecklist } = await import("../home/first-run");
const { CollectionEmptyDoors } = await import("./collection-empty-doors");

const group = () => screen.getByRole("group", { name: "No file? Start another way" });
const presses = () => Array.from(group().querySelectorAll("a, button")) as HTMLElement[];
const label = (el: HTMLElement) => el.querySelector("span")?.firstChild?.textContent;

beforeEach(() => {
  settle.mockReset();
  sheet = null;
});

describe("WaysGroup", () => {
  it("is a group named by its kicker, holding Precons I own, Import a deck and Add cards by hand, in that order", () => {
    render(<WaysGroup surface="step1" precons onAddCards={() => {}} />);
    expect(presses().map(label)).toEqual(["Precons I own", "Import a deck", "Add cards by hand"]);
    expect(within(group()).getByRole("link", { name: /Precons I own/ })).toHaveAttribute("href", "/decks/precons?pick=own");
    expect(within(group()).getByRole("link", { name: /Import a deck/ })).toHaveAttribute("href", "/decks/import");
  });

  it("drops Precons I own with PRECONS_ENABLED off, and the other two take two columns (S15)", () => {
    render(<WaysGroup surface="step1" precons={false} onAddCards={() => {}} />);
    expect(presses().map(label)).toEqual(["Import a deck", "Add cards by hand"]);
    expect(screen.queryByText("Precons I own")).toBeNull();
    const grid = presses()[0].parentElement!;
    expect(grid.className).toContain("sm:grid-cols-2");
    expect(grid.className).not.toContain("sm:grid-cols-3");
  });

  it("draws three columns on desktop and 44px rows on the phone, with no fill and no border on a press", () => {
    render(<WaysGroup surface="step1" precons onAddCards={() => {}} />);
    const grid = presses()[0].parentElement!;
    expect(grid.className.split(/\s+/)).toEqual(expect.arrayContaining(["flex", "flex-col", "sm:grid", "sm:grid-cols-3"]));
    for (const press of presses()) {
      const cls = press.className.split(/\s+/);
      // A 44px row on the phone, a hairline between rows that the desktop columns drop.
      expect(cls).toEqual(expect.arrayContaining(["min-h-[44px]", "border-b-[1px]", "sm:border-b-0", "sm:flex-col"]));
      // Text presses: no fill, never the accent.
      expect(cls).toContain("bg-transparent");
      expect(press.className).not.toMatch(/bg-\[color:var\(--accent\)\]|bg-accent/);
    }
  });

  it("carries a sub-line on desktop only, the full form on step 1", () => {
    render(<WaysGroup surface="step1" precons onAddCards={() => {}} />);
    const sub = screen.getByText("Pick the boxes. We know every card in them.");
    expect(sub.className.split(/\s+/)).toEqual(expect.arrayContaining(["hidden", "sm:block"]));
    expect(screen.getByText("Search by name and add them one by one.")).toBeInTheDocument();
  });

  it("on the empty Collection: no rule, the short sub-lines, `Add cards`, and a pick that reads ‹ Collection", () => {
    render(<WaysGroup surface="empty" precons onAddCards={() => {}} />);
    expect(presses().map(label)).toEqual(["Precons I own", "Import a deck", "Add cards"]);
    expect(screen.getByText("Pick the boxes you own.")).toBeInTheDocument();
    expect(screen.getByText("Search by name, one by one.")).toBeInTheDocument();
    expect(group().className).not.toContain("border-t");
    expect(within(group()).getByRole("link", { name: /Precons I own/ })).toHaveAttribute(
      "href",
      "/decks/precons?pick=own&from=collection",
    );
    expect(preconsPickHref("step1")).toBe("/decks/precons?pick=own");
  });

  it("hands Add cards its own press, so the sheet returns focus there", () => {
    const onAddCards = vi.fn();
    render(<WaysGroup surface="step1" precons onAddCards={onAddCards} />);
    const add = screen.getByRole("button", { name: /Add cards by hand/ });
    fireEvent.click(add);
    expect(onAddCards).toHaveBeenCalledWith(add);
  });
});

describe("Step 1 with the ways group (S1)", () => {
  it("moves Add cards by hand out of the button row into the group, under the upload's two buttons", () => {
    render(<FirstRunChecklist addByHand ways={{ precons: true }} />);
    const paste = screen.getByRole("button", { name: "Paste a list" });
    // The row is the upload's alone: Upload a CSV (the one fill), then Paste a list.
    expect(paste.nextElementSibling).toBeNull();
    expect(Array.from(paste.parentElement!.querySelectorAll("button")).map((b) => b.textContent)).toEqual([
      "Upload a CSV",
      "Paste a list",
    ]);
    const add = within(group()).getByRole("button", { name: /Add cards by hand/ });
    // The group follows the upload in the document, so the tab order is the upload, then the group.
    expect(paste.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Add cards by hand/ })).toHaveLength(1);
  });

  it("opens the shipped Add cards sheet from the group, and settles only after a save", () => {
    render(<FirstRunChecklist addByHand ways={{ precons: true }} />);
    fireEvent.click(within(group()).getByRole("button", { name: /Add cards by hand/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    act(() => sheet!.onSaved!(1));
    act(() => sheet!.onClose());
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it("names three locked slots in the page line, and the phone body no longer names the add", () => {
    render(<FirstRunChecklist addByHand ways={{ precons: true }} />);
    expect(screen.getByText("Commanders, Discover and Decks open once your cards are in.")).toBeInTheDocument();
    expect(screen.queryByText(/or add cards by hand/)).toBeNull();
  });

  it("leaves the group out while the paste panel is open", () => {
    render(<FirstRunChecklist addByHand ways={{ precons: true }} />);
    fireEvent.click(screen.getByRole("button", { name: "Paste a list" }));
    expect(screen.queryByRole("group", { name: "No file? Start another way" })).toBeNull();
  });

  it("with the switch off, step 1 is as shipped: the button row's Add cards by hand and four names", () => {
    render(<FirstRunChecklist addByHand />);
    expect(screen.queryByRole("group", { name: "No file? Start another way" })).toBeNull();
    expect(screen.getByRole("button", { name: "Paste a list" }).nextElementSibling).toHaveTextContent("Add cards by hand");
    expect(screen.getByText("Collection, Commanders, Discover and Decks open once your cards are in.")).toBeInTheDocument();
  });
});

describe("The empty Collection with the ways group (S13)", () => {
  it("draws one Upload tile, then the group with Add cards", () => {
    render(<CollectionEmptyDoors ways={{ precons: true }} />);
    expect(screen.getAllByRole("link", { name: /Upload a file/ })).toHaveLength(1);
    expect(presses().map(label)).toEqual(["Precons I own", "Import a deck", "Add cards"]);
    // The shipped second tile is gone: Add cards is the group's row.
    expect(screen.getAllByRole("button", { name: /Add cards/ })).toHaveLength(1);
    fireEvent.click(within(group()).getByRole("button", { name: /Add cards/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("with the switch off keeps the two equal doors", () => {
    render(<CollectionEmptyDoors />);
    expect(screen.queryByRole("group", { name: "No file? Start another way" })).toBeNull();
    expect(screen.getByRole("button", { name: /Add cards/ }).className).toBe(
      screen.getByRole("link", { name: /Upload a file/ }).className,
    );
  });
});

describe("one component on both surfaces", () => {
  // The check `check:shared` makes, made here: each surface imports the group as a value and renders it.
  it.each([
    ["src/components/home/first-run-step-one.tsx", 'surface="step1"'],
    ["src/components/collection/collection-empty-doors.tsx", 'surface="empty"'],
  ])("%s renders WaysGroup", (file, surface) => {
    const src = fs.readFileSync(file, "utf8");
    expect(src).toMatch(/import \{ WaysGroup \} from "\.\.?\/(collection\/)?ways-group";/);
    expect(src).toContain(`<WaysGroup ${surface}`);
  });
});
