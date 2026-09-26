import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameLogForm } from "./game-log-form";
import { gameLogCopy, axisCopy } from "../../lib/copy/game-log";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";

const logGame = vi.fn<(deckId: string, input: unknown) => Promise<{ ok: boolean; message?: string }>>(
  async () => ({ ok: true }),
);
vi.mock("../../app/decks/actions", () => ({
  logGame: (deckId: string, input: unknown) => logGame(deckId, input),
}));

function mount(onAnnounce = vi.fn()) {
  render(
    <GameLogForm deckId="deck_1" isFirstGame={false} onSaved={vi.fn()} onAnnounce={onAnnounce} />,
  );
  return onAnnounce;
}

const open = () => fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.open }));
const save = () => screen.getByRole("button", { name: gameLogCopy.form.save });
// Two columns render a row for every axis, so an axis always matches twice:
// index 0 is "what worked", index 1 is "what let me down".
const mana = () => screen.getAllByRole("checkbox", { name: new RegExp(axisCopy.mana.label) });
// The form speaks in the player's calendar day, so the expectations do too —
// `toISOString()` would name a different day in any offset past UTC.
const localDay = (at: Date) =>
  `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;

describe("GameLogForm", () => {
  // The read-back names Suggested changes only where that panel exists: a deck with a reading.
  it("says Suggested changes reads the note only on a tuned deck", () => {
    const { unmount } = render(
      <GameLogForm deckId="deck_1" isFirstGame={false} onSaved={vi.fn()} onAnnounce={vi.fn()} tuned />,
    );
    open();
    expect(screen.getByText(deckTuningCopy.note.readBackTuned, { exact: false })).toBeInTheDocument();
    unmount();
    mount();
    open();
    expect(screen.getByText(deckTuningCopy.note.readBack, { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(deckTuningCopy.note.readBackTuned, { exact: false })).toBeNull();
  });

  // State 2 → 3. The fifteen-second log is result-then-save, and nothing else.
  it("enables save on a result alone", () => {
    mount();
    open();
    expect(save()).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    expect(save()).toBeEnabled();
  });

  // State 8. A disabled control that also shouts at you is telling the player
  // off for something they have not finished doing.
  it("shows no error text while save is disabled", () => {
    mount();
    open();
    fireEvent.click(mana()[0]);
    expect(save()).toBeDisabled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // State 6 — the whole reason the child table has a composite key.
  it("moves an axis between columns rather than marking it twice", () => {
    const onAnnounce = mount();
    open();
    const [worked, hurt] = mana();

    fireEvent.click(worked);
    expect(worked).toBeChecked();

    fireEvent.click(hurt);
    expect(hurt).toBeChecked();
    expect(worked).not.toBeChecked();
    expect(onAnnounce).toHaveBeenCalledWith(
      gameLogCopy.announce.moved(axisCopy.mana.label, gameLogCopy.form.hurtLabel),
    );
  });

  it("submits the two lists disjoint", async () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.lost }));
    fireEvent.click(mana()[0]);
    fireEvent.click(mana()[1]);
    fireEvent.click(save());
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect(logGame.mock.calls[0][1]).toMatchObject({ worked: [], hurt: ["mana"] });
  });

  // The action refuses a future instant, so a game logged before lunch must not
  // be sent as noon today.
  it("sends today as an instant that has already happened", async () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(save());
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    const { playedAt } = logGame.mock.calls[0][1] as { playedAt: Date };
    expect(playedAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(localDay(playedAt)).toBe(localDay(new Date()));
  });

  // State 7. Marking everything is a legitimate thing to say about a game.
  it("puts no cap on how many axes can be marked", () => {
    mount();
    open();
    // One column only: ticking the same axis in the other would move it back.
    for (const box of screen.getAllByRole("checkbox").slice(0, 8)) {
      if (!(box as HTMLInputElement).checked) fireEvent.click(box);
    }
    expect(
      screen.getAllByRole("checkbox").filter((b) => (b as HTMLInputElement).checked),
    ).toHaveLength(8);
  });

  // State 9 — the picker refuses before the action has to, and the save button
  // refuses the values the picker cannot reach.
  it("caps the date at today", () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.playedToday }));
    const date = screen.getByLabelText(gameLogCopy.form.playedToday) as HTMLInputElement;
    expect(date.max).toBe(localDay(new Date()));
  });

  it("refuses to save a date typed past today", () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.playedToday }));
    const tomorrow = localDay(new Date(Date.now() + 86_400_000));
    fireEvent.change(screen.getByLabelText(gameLogCopy.form.playedToday), {
      target: { value: tomorrow },
    });
    expect(screen.getByRole("button", { name: gameLogCopy.form.save })).toBeDisabled();
  });

  // Clearing the field is not a request to log today's game. Sending it would
  // build an Invalid Date and buy a refusal the form could have avoided.
  it("refuses to save once the date has been cleared", () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.playedToday }));
    fireEvent.change(screen.getByLabelText(gameLogCopy.form.playedToday), {
      target: { value: "" },
    });
    expect(screen.getByRole("button", { name: gameLogCopy.form.save })).toBeDisabled();
  });

  // The field's name is a sentence about the value, so it cannot go on saying
  // "today" once the player has picked a different day.
  it("names the date field after the day it holds", () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.playedToday }));
    fireEvent.change(screen.getByLabelText(gameLogCopy.form.playedToday), {
      target: { value: "2026-08-12" },
    });
    expect(screen.getByLabelText(gameLogCopy.form.played("2026-08-12"))).toBeInTheDocument();
    expect(screen.queryByLabelText(gameLogCopy.form.playedToday)).toBeNull();
  });

  // A radiogroup is one tab stop with arrows moving inside it, and selection
  // follows focus — the same pattern the rest of the app's radiogroups ship.
  it("gives each radiogroup a single tab stop", () => {
    mount();
    open();
    // Nothing is chosen in Result, so its first option holds the stop.
    expect(screen.getByRole("radio", { name: gameLogCopy.form.won })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("radio", { name: gameLogCopy.form.lost })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    // Pod size defaults to 4, so the stop is on the chosen option.
    expect(screen.getByRole("radio", { name: "4" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "3" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves selection and focus with the arrow keys", () => {
    mount();
    open();
    fireEvent.keyDown(screen.getByRole("radio", { name: gameLogCopy.form.won }), {
      key: "ArrowRight",
    });
    const lost = screen.getByRole("radio", { name: gameLogCopy.form.lost });
    expect(lost).toBeChecked();
    expect(lost).toHaveFocus();
  });

  // The ends wrap, so the group is a ring rather than a line with dead ends.
  it("wraps from the first option to the last", () => {
    mount();
    open();
    fireEvent.keyDown(screen.getByRole("radio", { name: "4" }), { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "3" })).toBeChecked();
    fireEvent.keyDown(screen.getByRole("radio", { name: "3" }), { key: "ArrowLeft" });
    fireEvent.keyDown(screen.getByRole("radio", { name: "2" }), { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "8" })).toBeChecked();
  });

  // States 2, 11 and 13. The collapsed button is unmounted while the form is
  // open, so the focus return has to outlive it.
  it("moves focus into the form on open and back to the row on cancel", () => {
    mount();
    open();
    expect(screen.getByRole("radio", { name: gameLogCopy.form.won })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.cancel }));
    expect(screen.getByRole("button", { name: gameLogCopy.form.open })).toHaveFocus();
  });

  // The gloss describes the axis; it must not be read as part of its name.
  it("keeps the gloss out of the checkbox's name", () => {
    mount();
    open();
    const [worked] = mana();
    expect(worked).toHaveAccessibleName(axisCopy.mana.label);
    expect(worked).toHaveAccessibleDescription(axisCopy.mana.worked);
  });

  // State 12. There is no edit action, so a refusal that cleared the form would
  // make the player retype a game they have already described once.
  it("keeps every value when the save is refused", async () => {
    logGame.mockResolvedValueOnce({ ok: false, message: gameLogCopy.form.refused });
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(mana()[0]);
    fireEvent.click(save());
    await screen.findByRole("alert");
    expect(screen.getByRole("radio", { name: gameLogCopy.form.won })).toBeChecked();
    expect(mana()[0]).toBeChecked();
  });

  // Hugh, 2026-09-27: a FIRST game's save holds the saving state rather than collapsing, so the
  // empty state never paints again in the beat before the revalidated game arrives.
  it("holds a first game's save in its saving state rather than collapsing", async () => {
    logGame.mockResolvedValueOnce({ ok: true });
    const onSaved = vi.fn();
    render(<GameLogForm deckId="deck_1" isFirstGame onSaved={onSaved} onAnnounce={vi.fn()} />);
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(save());
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(true, "win"));
    const saving = screen.getByRole("button", { name: gameLogCopy.form.saving });
    expect(saving).toBeDisabled();
    expect(screen.queryByRole("button", { name: gameLogCopy.form.open })).toBeNull();
  });

  it("collapses after any later game's save", async () => {
    logGame.mockResolvedValueOnce({ ok: true });
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(save());
    expect(await screen.findByRole("button", { name: gameLogCopy.form.open })).toBeInTheDocument();
  });

  // State 13.
  it("cancels without a confirm", () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.cancel }));
    expect(screen.getByRole("button", { name: gameLogCopy.form.open })).toBeInTheDocument();
  });

  // State 14. A form that remembered would quietly log a second game with the
  // first game's pod size.
  it("forgets everything when reopened", () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(screen.getByRole("radio", { name: "6" }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.cancel }));
    open();
    expect(screen.getByRole("radio", { name: gameLogCopy.form.won })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "4" })).toBeChecked();
    expect(save()).toBeDisabled();
  });

  // ── The note (#10's Surface 1, S1 states 1–8) ──────────────────────────────
  //
  // Optional, never required, and never mined for axes — the checkboxes are the
  // structured answer and this is the unstructured one.
  describe("the note", () => {
    const field = () => screen.getByLabelText(deckTuningCopy.note.label);
    const counter = (n: number) =>
      screen.queryByText(
        deckTuningCopy.note.counter(String(n), String(deckTuningCopy.note.maxLength)),
      );

    // S1 state 1. A counter on an untouched field is a cap nobody asked about.
    it("hides the counter until the field is touched", () => {
      mount();
      open();
      expect(field()).toBeInTheDocument();
      expect(counter(0)).toBeNull();
    });

    // S1 state 2.
    it("shows a zero counter once the field has focus", () => {
      mount();
      open();
      fireEvent.focus(field());
      expect(counter(0)).toBeInTheDocument();
    });

    // S1 state 6 freezes the counter through the save and state 7 preserves it
    // through a refusal — and pressing Save blurs the field on the way. Keyed
    // on focus alone, an empty note's counter vanished at exactly the moment
    // both states say it stays.
    it("keeps the counter when the field is blurred still empty", () => {
      mount();
      open();
      fireEvent.focus(field());
      fireEvent.blur(field());
      expect(counter(0)).toBeInTheDocument();
    });

    // The global `:focus-visible` ring is the accessibility contract for every
    // control in the app. The accent border is this field's own design state
    // and the two are not alternatives — suppressing the outline to get the
    // border leaves a keyboard user with nothing.
    it("keeps the global focus ring", () => {
      mount();
      open();
      expect(field().className).not.toContain("outline-none");
    });

    // S1 states 3 → 4. The warning has to arrive before the stop, or the first
    // the player knows of the cap is the keyboard going dead.
    it("warns as the cap comes up, and not before", () => {
      mount();
      open();
      fireEvent.change(field(), { target: { value: "x".repeat(deckTuningCopy.note.warnAt - 1) } });
      expect(counter(deckTuningCopy.note.warnAt - 1)).not.toHaveClass("text-warning");
      fireEvent.change(field(), { target: { value: "x".repeat(deckTuningCopy.note.warnAt) } });
      expect(counter(deckTuningCopy.note.warnAt)).toHaveClass("text-warning");
    });

    // S1 state 5. A hard stop and no error: a cap you cannot exceed does not
    // need one, and a red field for typing too much reads as a mistake.
    it("stops at the cap without erroring", () => {
      mount();
      open();
      expect(field()).toHaveAttribute("maxlength", String(deckTuningCopy.note.maxLength));
      fireEvent.change(field(), { target: { value: "x".repeat(deckTuningCopy.note.maxLength) } });
      expect(counter(deckTuningCopy.note.maxLength)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).toBeNull();
    });

    // Both hints are in the DOM and the breakpoint hides one, so jsdom sees
    // both whatever the width. That is what makes them assertable at all — and
    // it is also why nothing caught this: every other test here reads the
    // field, the counter or the footer, so dropping "optional" from the desktop
    // gloss, or restoring it, left the whole suite green.
    //
    // The two are pinned TOGETHER and against the copy keys, because the rule
    // is a relationship rather than two strings: the phone says "optional"
    // because its footer is `hidden md:block` and the gloss is the only marker
    // there; the desktop does not, because that footer already says it.
    it("draws both note hints, and only the phone's says optional", () => {
      mount();
      open();
      expect(screen.getByText(deckTuningCopy.note.hintShort)).toBeInTheDocument();
      expect(screen.getByText(deckTuningCopy.note.hint)).toBeInTheDocument();
      expect(deckTuningCopy.note.hintShort).toMatch(/optional/i);
      expect(deckTuningCopy.note.hint).not.toMatch(/optional/i);
    });

    it("never requires a note, not even on a loss", () => {
      mount();
      open();
      fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.lost }));
      expect(save()).toBeEnabled();
      expect(field()).not.toBeRequired();
    });

    it("sends what was typed", async () => {
      mount();
      open();
      fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
      fireEvent.change(field(), { target: { value: "  Flooded out on turn six.  " } });
      fireEvent.click(save());
      await waitFor(() => expect(logGame).toHaveBeenCalled());
      // Verbatim. The trim belongs to the action, which is the boundary that
      // has to defend the column's cap against any caller, not just this form.
      expect(logGame.mock.calls.at(-1)?.[1]).toMatchObject({ note: "  Flooded out on turn six.  " });
    });

    // S1 state 7. There is no edit action on a logged game, so a refusal that
    // wiped the field would mean retyping a sentence the player has already
    // written — and the refusal is the one moment they are least inclined to.
    it("keeps the note, and its counter, when the save is refused", async () => {
      logGame.mockResolvedValueOnce({ ok: false, message: "nope" });
      mount();
      open();
      fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
      fireEvent.change(field(), { target: { value: "Flooded out on turn six." } });
      fireEvent.click(save());

      await screen.findByRole("alert");
      expect(field()).toHaveValue("Flooded out on turn six.");
      expect(counter("Flooded out on turn six.".length)).toBeInTheDocument();
    });

    // S1 state 8. A note is about one game, so the next game starts blank —
    // and the counter goes with it.
    it("reopens blank after a save", async () => {
      mount();
      open();
      fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
      fireEvent.change(field(), { target: { value: "Flooded out." } });
      fireEvent.click(save());
      await waitFor(() => expect(screen.queryByLabelText(deckTuningCopy.note.label)).toBeNull());

      open();
      expect(field()).toHaveValue("");
      expect(counter(0)).toBeNull();
    });

    // The line above the buttons said "marks are optional". There are two
    // optional things now.
    it("says both the marks and the note are optional", () => {
      mount();
      open();
      expect(screen.getByText(deckTuningCopy.note.optionalNote)).toBeInTheDocument();
      expect(screen.queryByText(gameLogCopy.form.optionalNote)).toBeNull();
    });
  });
});
