// No-collection entry R2 (PR 2): the ticked import's strip (S10, and its unresolved and printing variants), and the
// ✕-only dismiss every arrival strip now carries, 44px on the phone and 32px on desktop.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArrivalStrip, PreconArrivalBand } from "./arrival-strip";
import { UpdateStrip } from "./update-strip";

vi.mock("next/link", () => ({ default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => <a href={href} className={className}>{children}</a> }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));

const noop = () => {};

describe("the ticked import's strip (S10)", () => {
  it("takes the three-line form: head, the add with History, meta", () => {
    render(<ArrivalStrip onDismiss={noop} importedLineCount={100} added={{ entryId: "e1", copies: 100 }} />);
    expect(screen.getByText("All 100 lines came over clean.")).toBeTruthy();
    expect(screen.getByText(/^All 100 cards added to your collection\./)).toBeTruthy();
    expect(screen.getByText("Imported from your list a moment ago")).toBeTruthy();
    expect(screen.getByRole("link", { name: "History" }).getAttribute("href")).toBe("/collection/history?entry=e1");
    // The one-line form is gone at both widths: the phone takes the same three lines.
    expect(screen.queryByText(/came over · from your list/)).toBeNull();
  });

  it("names copies, not lines, in the body", () => {
    render(<ArrivalStrip onDismiss={noop} importedLineCount={65} added={{ entryId: "e1", copies: 1 }} />);
    expect(screen.getByText("All 65 lines came over clean.")).toBeTruthy();
    expect(screen.getByText(/^All 1 card added to your collection\./)).toBeTruthy();
  });

  it("keeps the printing clauses in the head", () => {
    render(<ArrivalStrip onDismiss={noop} importedLineCount={100} printings={{ kept: 12, notOwned: 0 }} added={{ entryId: "e1", copies: 100 }} />);
    expect(screen.getByText("All 100 lines came over clean, 12 with the printing you own.")).toBeTruthy();
  });

  it("over unresolved lines, never says clean: it says what was added", () => {
    render(<ArrivalStrip onDismiss={noop} importedLineCount={100} unresolved added={{ entryId: "e1", copies: 97 }} />);
    expect(screen.queryByText(/came over clean/)).toBeNull();
    expect(screen.getByText("97 cards added to your collection.")).toBeTruthy();
    expect(screen.getByText(/^The lines we couldn’t put a card to added nothing\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "History" })).toBeTruthy();
  });

  it("over unresolved lines, keeps the printing clauses in the head without saying clean", () => {
    render(<ArrivalStrip onDismiss={noop} importedLineCount={100} unresolved printings={{ kept: 3, notOwned: 2 }} added={{ entryId: "e1", copies: 97 }} />);
    expect(screen.queryByText(/came over clean/)).toBeNull();
    expect(screen.getByText(/^97 cards added to your collection, .*printing you own/)).toBeTruthy();
  });

  it("reads as shipped with nothing added", () => {
    render(<ArrivalStrip onDismiss={noop} importedLineCount={100} />);
    expect(screen.getByText("All 100 lines came over clean. Imported from your list a moment ago.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "History" })).toBeNull();
  });
});

/** The dismiss of one strip: named `Dismiss`, drawing the ✕ and no word at any width. */
function expectCrossOnly(container: HTMLElement) {
  const button = within(container).getByRole("button", { name: "Dismiss" });
  expect(button.textContent).toBe("✕");
  // 44px on the phone and 32px from md up, the two presses the handoff draws.
  for (const c of ["h-[44px]", "w-[44px]", "md:h-[32px]", "md:w-[32px]"]) expect(button.className.split(" ")).toContain(c);
  return button;
}

describe("every arrival strip dismisses with the ✕ alone (R2 audit)", () => {
  it("the import's one-line strip hands the dismissal to its owner and stores nothing", () => {
    const onDismiss = vi.fn();
    const { container } = render(<ArrivalStrip onDismiss={onDismiss} importedLineCount={100} />);
    fireEvent.click(expectCrossOnly(container));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
  });

  it("the ticked import's three-line strip", () => {
    const { container } = render(<ArrivalStrip onDismiss={noop} importedLineCount={100} added={{ entryId: "e1", copies: 100 }} />);
    expectCrossOnly(container);
  });

  it("the precon start's strip", () => {
    const { container } = render(
      <PreconArrivalBand onDismiss={noop} arrival={{ name: "Eldrazi Unbound", setCode: "CMM", cards: 100, unmapped: 0, owned: 74, of: 85 }} />,
    );
    expectCrossOnly(container);
  });

  it("the update's strip", () => {
    const onDismiss = vi.fn();
    const { container } = render(<UpdateStrip arrival={{ in: 3, out: 2, kept: 0 }} onDismiss={onDismiss} />);
    fireEvent.click(expectCrossOnly(container));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
