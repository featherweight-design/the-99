import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

const { deleteDeck, renameDeck } = vi.hoisted(() => ({
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({ deleteDeck, renameDeck }));

const { DeckCardOverflow } = await import("./deck-card-overflow");

// Named per deck: "Deck options" said the same thing for every tile on the
// page, so a reader tabbing the grid heard one label repeated as many times as
// there were decks.
const trigger = (deckName = "Atraxa") =>
  screen.getByRole("button", { name: `Actions for ${deckName}` });

describe("DeckCardOverflow", () => {
  it("closes the whole menu on the press, and hands the move to the view", () => {
    // Hugh's call, 2026-09-13 (errata E21): the act is finished, so the panel
    // that performed it goes. Design had it return to the menu with the Move
    // row as the receipt. And it goes ON THE PRESS (H24): the view moves the
    // deck optimistically, so there is no round trip to wait for here.
    const onMove = vi.fn();
    render(
      <DeckCardOverflow
        deckId="d1"
        deckName="Atraxa"
        built={99}
        folders={[{ id: "f1", name: "Cube night" }]}
        folderId={null}
        folderName={null}
        onCreateFolder={() => {}}
        onMove={onMove}
        keepsFocus closeAfterCreate={null}
      />,
    );
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("button", { name: /^Move / }));
    fireEvent.click(screen.getByRole("button", { name: "Cube night" }));
    // Synchronously: nothing here is awaited.
    expect(onMove).toHaveBeenCalledWith({ id: "f1", name: "Cube night" });
    expect(screen.queryByRole("button", { name: /^Move / })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rename" })).toBeNull();
  });

  it("names the deck's current shelf on the Move row", () => {
    render(
      <DeckCardOverflow
        deckId="d1"
        deckName="Atraxa"
        built={99}
        folders={[{ id: "f1", name: "Cube night" }]}
        folderId="f1"
        folderName="Cube night"
        onCreateFolder={() => {}}
        onMove={() => {}} keepsFocus closeAfterCreate={null}
      />,
    );
    fireEvent.click(trigger());
    expect(screen.getByRole("button", { name: /Currently filed under Cube night/ }))
      .toHaveTextContent("Move · Cube night");
  });

  it("says Unfiled when the deck is on no shelf", () => {
    render(
      <DeckCardOverflow
        deckId="d1"
        deckName="Atraxa"
        built={99}
        folders={[]}
        folderId={null}
        folderName={null}
        onCreateFolder={() => {}}
        onMove={() => {}} keepsFocus closeAfterCreate={null}
      />,
    );
    fireEvent.click(trigger());
    expect(screen.getByRole("button", { name: /Currently filed under Unfiled/ }))
      .toBeInTheDocument();
  });

  // ARIA defines aria-haspopup="true" as equivalent to "menu", and every other
  // value names a pattern this panel does not implement either. Its rename mode
  // is a form, not a list of actions, so no value is honest here.
  it("claims no popup pattern it does not implement", () => {
    render(<DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} folders={[]} folderId={null} folderName={null} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} />);
    expect(trigger()).not.toHaveAttribute("aria-haspopup");
  });

  it("points aria-controls at the panel only while it is open", () => {
    render(<DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} folders={[]} folderId={null} folderName={null} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} />);
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).not.toHaveAttribute("aria-controls");

    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    const id = trigger().getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)).toBeInTheDocument();
  });

  // Every deck card renders one of these, so two on a page must not collide.
  it("gives each instance its own panel id", () => {
    render(
      <>
        <DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} folders={[]} folderId={null} folderName={null} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} />
        <DeckCardOverflow deckId="d2" deckName="Krenko" built={99} folders={[]} folderId={null} folderName={null} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} />
      </>,
    );
    fireEvent.click(trigger("Atraxa"));
    fireEvent.click(trigger("Krenko"));
    const ids = [trigger("Atraxa"), trigger("Krenko")].map((t) =>
      t.getAttribute("aria-controls"),
    );
    expect(new Set(ids).size).toBe(2);
  });
});

describe("DeckCardOverflow — THE PLATE on phone", () => {
  // The round's one accessibility fix, and it ships in the same change that
  // creates the exposure. This control was bare at 44px by ruling — "the drawn
  // plate is desktop-only" — and what made that safe was the top scrim veiling
  // the crop beneath it. That scrim is gone from this tile, so the glyph would be
  // `var(--fg)` on an unmodified crop.
  it("draws the 26px plate inside the 44px target, at both widths", () => {
    render(<DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} folders={[]} folderId={null} folderName={null} onCreateFolder={() => {}} onMove={() => {}} keepsFocus closeAfterCreate={null} />);
    const button = screen.getByRole("button");
    // Target unchanged: 44 on a phone, 26 from `sm:` up, where the plate fills it.
    expect(button.className).toContain("h-[44px]");
    expect(button.className).toContain("sm:h-[26px]");
    expect(button.className).toContain("bg-transparent");

    const plate = button.firstElementChild as HTMLElement;
    expect(plate.className).toContain("h-[26px]");
    expect(plate.className).toContain("rounded-[7px]");
    expect(plate.className).toContain("bg-[color:var(--bg)]");
    expect(plate.className).toContain("border-[color:var(--border-strong)]");
    expect(plate.textContent).toBe("…");
  });
});

// Matched by prefix on both carriers, for the reason `create-deck-redirect.test.tsx`
// gives: Next has moved the redirect target between `message` and `digest` across
// versions, so an exact-equality check would stop matching on the next move and
// fail this file for the wrong reason.
function isRedirect(value: unknown) {
  if (!(value instanceof Error)) return false;
  const digest = (value as { digest?: unknown }).digest;
  return (
    value.message.startsWith("NEXT_REDIRECT") ||
    (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT"))
  );
}

// Rethrowing is the behaviour under test, and the rethrow escapes the transition:
// in the app Next's router catches it and navigates, but nothing here does, so
// jsdom reports it as an uncaught error and vitest fails the file. Swallow it —
// the assertion below is about what the pane painted, not about who catches it.
function swallowRedirect(event: ErrorEvent | PromiseRejectionEvent) {
  const value = "reason" in event ? event.reason : event.error;
  if (isRedirect(value)) event.preventDefault();
}

describe("DeckCardOverflow — the delete confirm", () => {
  function open(name = "Atraxa") {
    render(
      <DeckCardOverflow
        deckId="d1"
        deckName={name}
        built={99}
        folders={[]}
        folderId={null}
        folderName={null}
        onCreateFolder={() => {}}
        onMove={() => {}}
        keepsFocus
        closeAfterCreate={null}
      />,
    );
    fireEvent.click(trigger(name));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  }

  // The whole point of the change: the destructive act is now described before
  // it happens, in the app's own chrome, rather than by a browser string.
  it("asks in the panel and deletes nothing yet", () => {
    deleteDeck.mockReset();
    open();
    expect(screen.getByText("Delete “Atraxa”?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Its list, its versions and its game log go with it. Nothing leaves your collection.",
      ),
    ).toBeInTheDocument();
    expect(deleteDeck).not.toHaveBeenCalled();
  });

  it("returns to the menu on Keep it, having deleted nothing", () => {
    deleteDeck.mockReset();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
    expect(screen.queryByText("Delete “Atraxa”?")).toBeNull();
    expect(deleteDeck).not.toHaveBeenCalled();
  });

  // Entering the mode replaces the focused menu row, and this panel is not a
  // `dialog` and traps nothing — so a reader dropped on <body> here resumes at
  // the top of the DOCUMENT, with both buttons reachable only by tabbing the
  // whole page. `deck-move-mode.tsx` solves the same case the same way.
  it("puts focus in the pane, on the button that changes nothing", () => {
    deleteDeck.mockReset();
    open();
    expect(screen.getByRole("button", { name: "Keep it" })).toHaveFocus();
  });

  // And hands it back, because the pane unmounts holding it.
  it("returns focus to the row that was pressed", async () => {
    deleteDeck.mockReset();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus(),
    );
  });

  it("deletes the deck it named on Delete deck", async () => {
    deleteDeck.mockReset();
    deleteDeck.mockResolvedValue(undefined);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Delete deck" }));
    await waitFor(() => expect(deleteDeck).toHaveBeenCalledWith("d1"));
  });

  // `window.confirm` had no error path at all: a throwing `deleteDeck` left the
  // menu sitting there having reported nothing.
  it("names an outage rather than reporting nothing", async () => {
    deleteDeck.mockReset();
    deleteDeck.mockRejectedValue(new Error("boom"));
    open();
    fireEvent.click(screen.getByRole("button", { name: "Delete deck" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We couldn’t delete that deck. Try again.");
    // Re-enabled, because the reader's only move is to try again. Awaited rather
    // than read in the alert's own tick: `setError` runs inside the transition,
    // so the alert can commit while `pending` is still true — and while it is,
    // this button is labelled `Deleting…` and the query throws rather than
    // asserting.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete deck" })).not.toBeDisabled(),
    );
  });

  // The pane's `pending` and `inFlight` guard the PANE, and a pane that has been
  // unmounted guards nothing. The ⋯ trigger sits outside the panel and stays
  // reachable by Shift+Tab and by pointer, so without a busy flag held ABOVE the
  // pane, toggling the panel mid-request resets the guard and a reopened menu
  // submits the same delete a second time.
  it("refuses to close the panel while a delete is in flight", async () => {
    deleteDeck.mockReset();
    // Never settles: the window under test is exactly the time the action is
    // outstanding, so a resolved mock would close it before the assertion.
    deleteDeck.mockImplementation(() => new Promise(() => {}));
    open();
    fireEvent.click(screen.getByRole("button", { name: "Delete deck" }));
    await waitFor(() => expect(deleteDeck).toHaveBeenCalledTimes(1));

    fireEvent.click(trigger());
    // Still the pane, not the menu and not a closed panel.
    expect(screen.getByText("Delete “Atraxa”?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rename" })).toBeNull();

    // And the second submit a reopened menu would have offered never happens:
    // pressing the trigger twice more leaves the pane standing, so the Delete
    // row that would start a second request is never on screen to press.
    fireEvent.click(trigger());
    fireEvent.click(trigger());
    expect(screen.getByText("Delete “Atraxa”?")).toBeInTheDocument();
    expect(deleteDeck).toHaveBeenCalledTimes(1);
  });

  // THE TRAP. `deleteDeck` ends in `redirect()`, which signals BY THROWING, and
  // the throw arrives in the pane's catch before the router navigates. A bare
  // catch reports a failure over a deletion that succeeded.
  it("does not report a failure when the action redirects", async () => {
    deleteDeck.mockReset();
    // Next's own error, caught from its own `redirect`, never a hand-built one:
    // `unstable_rethrow` matches on the digest's internal shape, and a synthetic
    // `NEXT_REDIRECT;/decks` is NOT recognised — the first version of this test
    // used one, and it failed, which is the only reason the fixture is real.
    let thrown: unknown;
    try {
      redirect("/decks");
    } catch (err) {
      thrown = err;
    }
    deleteDeck.mockRejectedValue(thrown);
    window.addEventListener("unhandledrejection", swallowRedirect);
    window.addEventListener("error", swallowRedirect);
    try {
      open();
      fireEvent.click(screen.getByRole("button", { name: "Delete deck" }));
      await waitFor(() => expect(deleteDeck).toHaveBeenCalledWith("d1"));
      // Settle the rejection before asserting the absence, or the assertion runs
      // before the catch it is about.
      await new Promise((r) => setTimeout(r, 0));
      expect(screen.queryByRole("alert")).toBeNull();
    } finally {
      window.removeEventListener("unhandledrejection", swallowRedirect);
      window.removeEventListener("error", swallowRedirect);
    }
  });
});
