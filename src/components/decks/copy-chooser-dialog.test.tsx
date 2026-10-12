import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { assignCopy } = vi.hoisted(() => ({ assignCopy: vi.fn() }));
vi.mock("../../app/decks/assignment-actions", () => ({ assignCopy }));
import { CopyChooserDialog } from "./copy-chooser-dialog";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { cardAssignmentsCopy } from "../../lib/copy/card-assignments";
import type { ContestedCard } from "../../lib/collection/summary-read";

const c = gotItCopy.receipt;
const card = (picked = false): ContestedCard => ({
  oracleId: "sol", cardName: "", arrived: 1, ownedBefore: 0, fromImport: true, owned: 1,
  claimants: [
    { deckId: "eldrazi", deckName: "HD - Eldrazi", quantity: 1, commanderCopies: 0, granted: 0, since: 1, versionNumber: 1, allocated: picked ? 0 : 1 },
    { deckId: "brago", deckName: "HD - Brago", quantity: 1, commanderCopies: 0, granted: picked ? 1 : 0, since: 2, versionNumber: 1, allocated: picked ? 1 : 0 },
  ],
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("CopyChooserDialog", () => {
  it("is a dialog titled where this copy goes, with the card added just now and this deck tagged", () => {
    render(<CopyChooserDialog card={card()} cardName="Sol Ring" thisDeckId="eldrazi" onCard={vi.fn()} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: c.changeTitle });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.textContent).toContain(c.changeSub("Sol Ring"));
    expect(dialog.textContent).toContain(cardAssignmentsCopy.contested.thisDeck);
    // 520 wide from md, a sheet below it.
    expect(dialog.className).toContain("md:w-[520px]");
    expect(dialog.className).toContain("rounded-[22px_22px_0_0]");
    // Above the toast it opens from (ToastFrame is z-[60]), so the toast's Undo is not pressable
    // through the modal.
    expect(dialog.parentElement!.className.split(" ")).toContain("z-[70]");
  });

  it("closes on Done, on Escape and on the scrim", () => {
    const onClose = vi.fn();
    render(<CopyChooserDialog card={card()} cardName="Sol Ring" thisDeckId="eldrazi" onCard={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: c.done }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("hands each pick's read-back card to the receipt", async () => {
    assignCopy.mockResolvedValue({ ok: true, card: card(true) });
    const onCard = vi.fn();
    render(<CopyChooserDialog card={card()} cardName="Sol Ring" thisDeckId="eldrazi" onCard={onCard} onClose={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByText("HD - Brago")); });
    expect(assignCopy).toHaveBeenCalledWith("sol", "brago");
    expect(onCard).toHaveBeenCalledWith(expect.objectContaining({ claimants: card(true).claimants }));
  });
});
