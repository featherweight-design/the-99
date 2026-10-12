import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const assign = vi.hoisted(() => vi.fn());
vi.mock("../../app/decks/assignment-actions", () => ({ assignCopy: assign }));
import { CopyLine } from "./copy-line";
import { addedCopyCopy as copy } from "../../lib/copy/added-copy";
import { cardAssignmentsCopy } from "../../lib/copy/card-assignments";
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

  it("redraws from the read-back card after a pick is cleared, never the frozen sentence", async () => {
    // Frozen: Thorin, picked earlier. The player clears that pick; Brago now holds the copy.
    assign.mockResolvedValueOnce({ ok: true, card: card(0) });
    render(
      <ul>
        <CopyLine cardName="Sol Ring" sentence={copy.row.goesToEarlier("HD -Thorin")} chooser={card(1)} />
      </ul>,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.changeAria("Sol Ring") }));
    fireEvent.click(screen.getByText("HD -Thorin"));
    await waitFor(() => expect(screen.getByText(copy.row.goesTo("HD - Brago"))).toBeTruthy());
    expect(screen.queryByText(copy.row.goesToEarlier("HD -Thorin"))).toBeNull();
  });

  it("never falls back to the frozen sentence after a write, even with nothing to say", async () => {
    // The read-back card has the copy gone (another tab removed it): no deck holds or reads it.
    const gone = { ...card(0), owned: 0, claimants: card(0).claimants.map((c) => ({ ...c, allocated: 0 })) };
    assign.mockResolvedValueOnce({ ok: false, cause: "no-supply-left", card: gone });
    render(
      <ul>
        <CopyLine cardName="Sol Ring" sentence={copy.row.goesToEarlier("HD -Thorin")} chooser={card(1)} />
      </ul>,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.changeAria("Sol Ring") }));
    fireEvent.click(screen.getByText("HD - Brago"));
    await waitFor(() => expect(assign).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(copy.row.goesToEarlier("HD -Thorin"))).toBeNull());
  });

  it("stops naming a destination when the write settles with no card to read back", async () => {
    // The last copy was removed in another tab: the pick is refused and the live read finds nothing.
    assign.mockResolvedValueOnce({ ok: false, cause: "no-supply-left", card: null });
    render(line(card()));
    fireEvent.click(screen.getByRole("button", { name: copy.changeAria("Sol Ring") }));
    fireEvent.click(screen.getByText("HD -Thorin"));
    await waitFor(() => expect(assign).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(copy.row.goesTo("HD - Brago"))).toBeNull());
    // And Change goes once the chooser closes: the chooser it would reopen could only be refused.
    fireEvent.click(screen.getByRole("button", { name: copy.changeAria("Sol Ring") }));
    expect(screen.queryByRole("button", { name: copy.changeAria("Sol Ring") })).toBeNull();
  });

  it("keeps the chooser and its refusal when the last copy went, and Done then closes it for good", async () => {
    assign.mockResolvedValueOnce({ ok: false, cause: "no-supply-left", card: null });
    render(line(card()));
    const change = screen.getByRole("button", { name: copy.changeAria("Sol Ring") });
    fireEvent.click(change);
    const thorin = screen.getByText("HD -Thorin").closest("[role=radio]") as HTMLElement;
    thorin.focus();
    fireEvent.click(thorin);
    // The refusal is drawn, in the chooser the press left focus in.
    const refusal = cardAssignmentsCopy.contested.refusedNoSupply("HD - Brago", 1, "HD -Thorin");
    await waitFor(() => expect(screen.getAllByText(refusal).some((el) => el.tagName === "P")).toBe(true));
    expect(screen.getByRole("radiogroup").contains(document.activeElement)).toBe(true);
    expect(change.textContent).toBe(copy.done);
    // Done closes it, and nothing reopens a chooser whose every option could only be refused.
    fireEvent.click(change);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.activeElement).toBe(screen.getByText("Sol Ring"));
  });

  it("in Add Cards' form names the card, and redraws in the long form after a pick", async () => {
    assign.mockResolvedValueOnce({ ok: true, card: card(1) });
    render(
      <ul>
        <CopyLine form="line" cardName="Sol Ring" sentence={copy.line.goesTo("Sol Ring", "HD - Brago")} chooser={card()} />
      </ul>,
    );
    expect(screen.getByText(copy.line.goesTo("Sol Ring", "HD - Brago"))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.changeAria("Sol Ring") }));
    fireEvent.click(screen.getByText("HD -Thorin"));
    await waitFor(() => expect(screen.getByText(copy.line.goesToPicked("Sol Ring", "HD -Thorin"))).toBeTruthy());
  });

  it("draws no Change when there is no chooser to open", () => {
    render(line());
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(copy.row.goesTo("HD - Brago"))).toBeTruthy();
  });
});
