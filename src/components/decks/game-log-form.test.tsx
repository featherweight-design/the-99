import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameLogForm } from "./game-log-form";
import { gameLogCopy, axisCopy } from "../../lib/copy/game-log";

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
});
