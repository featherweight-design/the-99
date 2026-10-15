import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Step 1 reaches the upload flow through ReplaceFlow, which calls useRouter at
// render to send a confirmed upload on to /collection. Outside an app-router
// tree that throws, and none of these tests navigates.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

// The review is reached through the real paste path; only the server read is stubbed.
const previewPaste = vi.fn();
vi.mock("../../app/collection/actions", () => ({
  confirmUpload: vi.fn(),
  previewPaste: (...args: unknown[]) => previewPaste(...args),
  previewUpload: vi.fn(),
}));

const settle = vi.fn();
vi.mock("../../app/collection/edit-actions", () => ({ settleCollectionWrite: (...a: unknown[]) => settle(...a) }));
let sheet: { onSaved?: (n: number) => void; onClose: () => void } | null = null;
vi.mock("../collection/add-cards-sheet", () => ({
  AddCardsSheet: (p: { onSaved?: (n: number) => void; onClose: () => void }) => {
    sheet = p;
    return <div role="dialog" aria-label="Add cards sheet" />;
  },
}));

const { FirstRunChecklist } = await import("./first-run");

describe("FirstRunChecklist · Add cards by hand (collection edit B0c)", () => {
  it("draws no button with the switch off", () => {
    render(<FirstRunChecklist />);
    expect(screen.queryByRole("button", { name: "Add cards by hand" })).toBeNull();
    expect(screen.queryByText(/or add cards by hand/)).toBeNull();
  });

  it("draws the ghost button beside Paste with the switch on, and it opens the sheet", () => {
    render(<FirstRunChecklist addByHand />);
    const paste = screen.getByRole("button", { name: "Paste a list" });
    const add = screen.getByRole("button", { name: "Add cards by hand" });
    expect(add.className).toBe(paste.className);
    expect(paste.nextElementSibling).toBe(add);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(add);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("settles the write (a fresh Home) only when the sheet closes after a save", () => {
    settle.mockReset();
    render(<FirstRunChecklist addByHand />);
    fireEvent.click(screen.getByRole("button", { name: "Add cards by hand" }));
    act(() => sheet!.onClose());
    expect(settle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Add cards by hand" }));
    act(() => sheet!.onSaved!(2));
    expect(settle).not.toHaveBeenCalled();
    act(() => sheet!.onClose());
    expect(settle).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("the phone body names the new door", () => {
    render(<FirstRunChecklist addByHand />);
    expect(screen.getByText(/ManaBox, or add cards by hand\./)).toBeTruthy();
  });
});

describe("FirstRunChecklist", () => {
  it("counts the steps in the kicker, not in a sentence", () => {
    render(<FirstRunChecklist />);
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.queryByText(/Three steps/)).toBeNull();
  });

  it("greets without a name", () => {
    render(<FirstRunChecklist />);
    expect(screen.getByRole("heading", { name: "Welcome to The 99" })).toBeInTheDocument();
  });

  it("says what each locked step is waiting for", () => {
    render(<FirstRunChecklist />);
    expect(screen.getByText("Opens once your cards are in")).toBeInTheDocument();
    expect(screen.getByText("Opens once you pick a commander")).toBeInTheDocument();
  });

  it("names each locked step in the accessibility tree, not just on a div", () => {
    render(<FirstRunChecklist />);
    // A role, because a name on a generic names nothing: without it a
    // screen-reader user hears the step's title and never that it is locked.
    // Each step's name is its own reason — step 3 waits on a commander, not on
    // the collection.
    expect(
      screen.getByRole("group", { name: "Pick a commander or import a deck Opens once your cards are in" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Build the 99 Opens once you pick a commander" }),
    ).toBeInTheDocument();
  });

  it("offers both entries into step 1", () => {
    render(<FirstRunChecklist />);
    expect(screen.getByRole("button", { name: "Upload a CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paste a list" })).toBeInTheDocument();
  });

  it("names both paths in the locked step 2, and has no import foot", () => {
    // First-run rulings 1 and 2 (2026-09-28): step 1 is the collection alone, and step 2
    // is now the only place a first-run player learns import exists.
    render(<FirstRunChecklist />);
    expect(screen.getByText("Pick a commander or import a deck")).toBeInTheDocument();
    expect(screen.queryByText("Already have a deck elsewhere?")).toBeNull();
    expect(screen.queryByRole("link", { name: "Import a deck" })).toBeNull();
  });

  it("draws no Replace collection heading inside its own step-1 card", () => {
    // The replace route's desktop heading lives in `ReplaceFlow` so it can sit in the entry's
    // own column — see the note there. Unconditional, it gave this surface a second title and a
    // `‹ Collection` link back to a route the reader has not been to.
    render(<FirstRunChecklist />);
    expect(screen.queryByRole("heading", { name: "Replace collection" })).toBeNull();
    expect(screen.queryByText("‹ Collection")).toBeNull();
  });

  // Class-level only: jsdom lays nothing out, so these say the rule is in place and
  // `probe:onboarding` says it lands. Prod walk 2026-09-28, items 3, 9 and 10.
  it("pins the card fan to the top of step 1 from sm, not the card's middle", () => {
    render(<FirstRunChecklist />);
    const card = screen.getByRole("button", { name: "Upload a CSV" }).closest(".rounded-\\[14px\\]");
    expect(card?.className).toContain("sm:items-start");
  });

  it("does not let the step card's centring reach the paste panel", () => {
    render(<FirstRunChecklist />);
    fireEvent.click(screen.getByRole("button", { name: "Paste a list" }));
    const textarea = screen.getByRole("textbox", { name: "Paste your card list" });
    // The nearest alignment rule above the textarea must be the flow's own left-aligned,
    // full-width wrapper, not the card's `text-center` / `items-center`.
    const wrapper = textarea.closest(".text-left, .text-center");
    expect(wrapper?.className).toContain("text-left");
    expect(wrapper?.className).toContain("w-full");
    expect(wrapper?.className).toContain("self-stretch");
  });

  it("hides the card fan from the accessibility tree", () => {
    const { container } = render(<FirstRunChecklist />);
    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
    // The plan asserted `queryByText("99")` is null. It is not: only the role
    // queries consult the accessibility tree, and `getByText` walks the DOM, so
    // that assertion would fail against a correctly hidden fan. What it meant
    // to check is asserted directly — the numeral sits inside a hidden subtree.
    expect(screen.getByText("99").closest("[aria-hidden='true']")).not.toBeNull();
  });

  // D11, 5a: the embedded review has no header of its own, so the card says what is under
  // review; the phone's fan and body step aside; and Cancel is the way back to the two entries.
  it("names the file under review on the card, and Cancel returns step 1 to its entries", async () => {
    previewPaste.mockResolvedValueOnce({
      uploadId: "up_1",
      matchedCardCount: 3,
      unmatchedRows: [],
      skippedByDesignCount: 0,
      parseErrors: [],
      currentCollectionCount: 0,
      filename: "pasted list",
      rowCount: 1_313,
    });
    const { container } = render(<FirstRunChecklist />);
    fireEvent.click(screen.getAllByRole("button", { name: /^Paste a list/ })[0]);
    fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), {
      target: { value: "3 Sol Ring" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));

    expect(await screen.findByText("Reviewing · pasted list · 1,313 rows")).toBeInTheDocument();
    expect(screen.queryByText("Review import")).toBeNull();
    const card = container.querySelector("[data-reviewing]");
    expect(card?.className.split(/\s+/)).toContain("items-start");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/^Reviewing ·/)).toBeNull();
    expect(container.querySelector("[data-reviewing]")).toBeNull();
    expect(screen.getAllByRole("button", { name: /^Paste a list/ }).length).toBeGreaterThan(0);
  });

  // The lock's page line (first-run-locked-nav 2.x): under the H1, desktop only
  // (the rail shows from `md`; the phone's bracket carries the reason).
  it("draws the lock's page line under the heading, from md only", () => {
    const { container } = render(<FirstRunChecklist />);
    const line = container.querySelector<HTMLElement>("[data-lock-page-line]")!;
    expect(line).toHaveTextContent(
      "Collection, Commanders, Discover and Decks open once your cards are in.",
    );
    expect(line.className).toContain("hidden");
    expect(line.className).toContain("md:flex");
    const heading = screen.getByRole("heading", { name: "Welcome to The 99" });
    expect(heading.nextElementSibling).toBe(line);
    const lock = line.querySelector<SVGElement>("svg[data-lock-size]")!;
    expect(lock.dataset.lockSize).toBe("lg");
    expect(lock.style.color).toBe("var(--fg-locked)");
  });

  it("draws every lock on this page, the step cards' included, in --fg-locked (a divider ink read 1.2 to 1.5:1)", () => {
    const { container } = render(<FirstRunChecklist />);
    const locks = [...container.querySelectorAll<SVGElement>("svg[data-lock-size]")];
    expect(locks.length).toBeGreaterThanOrEqual(2);
    for (const lock of locks) expect(lock.style.color).toBe("var(--fg-locked)");
  });

  it("marks Upload a CSV as the target of the nav's Go to step 1", () => {
    render(<FirstRunChecklist />);
    expect(screen.getByRole("button", { name: "Upload a CSV" })).toHaveAttribute("data-step1-upload");
  });
});
