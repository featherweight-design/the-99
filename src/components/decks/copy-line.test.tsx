import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const assign = vi.hoisted(() => vi.fn());
vi.mock("../../app/decks/assignment-actions", () => ({ assignCopy: assign }));
import { CopyLine } from "./copy-line";
import { addedCopyCopy as copy } from "../../lib/copy/added-copy";
import type { ContestedCard } from "../../lib/collection/summary-read";

// One new Sol Ring, held by HD - Brago by seniority; HD -Thorin is a brew that wants one too.
function card(thorinGranted = 0): ContestedCard {
  return {
    oracleId: "sol", cardName: "Sol Ring", arrived: 1, ownedBefore: 0, fromImport: true, owned: 1,
    claimants: [
      { deckId: "brago", deckName: "HD - Brago", quantity: 1, commanderCopies: 0, granted: 0, since: 1, versionNumber: 3, allocated: 1 - thorinGranted },
      { deckId: "thorin", deckName: "HD -Thorin", quantity: 1, commanderCopies: 0, granted: thorinGranted, since: null, versionNumber: null, brew: true, allocated: thorinGranted },
    ],
  };
}

const line = (chooser?: ContestedCard) => (
  <ul>
    <CopyLine cardName="Sol Ring" sentence={copy.row.goesTo("HD - Brago")} chooser={chooser} />
  </ul>
);

describe("CopyLine", () => {
  it("says where the copy went, with Change", () => {
    render(line(card()));
    expect(screen.getByText(copy.row.goesTo("HD - Brago"))).toBeTruthy();
    const change = screen.getByRole("button", { name: copy.changeAria("Sol Ring") });
    expect(change.textContent).toBe(copy.change);
    expect(change.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens the chooser under the row on Change, and closes it on Done", () => {
    render(line(card()));
    expect(screen.queryByRole("radiogroup")).toBeNull();
    const change = screen.getByRole("button", { name: copy.changeAria("Sol Ring") });
    fireEvent.click(change);
    expect(screen.getByRole("radiogroup")).toBeTruthy();
    expect(change.textContent).toBe(copy.done);
    expect(change.getAttribute("aria-expanded")).toBe("true");
    const panel = document.getElementById(change.getAttribute("aria-controls") ?? "");
    expect(panel?.contains(screen.getByRole("radiogroup"))).toBe(true);
    fireEvent.click(change);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(change.textContent).toBe(copy.change);
  });

  it("moves the copy through the shipped pick, and redraws from the card it read back", async () => {
    assign.mockResolvedValueOnce({ ok: true, card: card(1) });
    render(line(card()));
    fireEvent.click(screen.getByRole("button", { name: copy.changeAria("Sol Ring") }));
    fireEvent.click(screen.getByText("HD -Thorin"));
    await waitFor(() => expect(screen.getByText(copy.row.goesToPicked("HD -Thorin"))).toBeTruthy());
    expect(assign).toHaveBeenCalledWith("sol", "thorin");
    expect(screen.queryByText(copy.row.goesTo("HD - Brago"))).toBeNull();
  });

  it("draws no Change when there is no chooser to open", () => {
    render(line());
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(copy.row.goesTo("HD - Brago"))).toBeTruthy();
  });
});
