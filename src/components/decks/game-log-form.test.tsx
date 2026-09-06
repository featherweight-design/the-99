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
    fireEvent.click(screen.getByText(gameLogCopy.form.playedToday));
    const date = screen.getByLabelText(gameLogCopy.form.playedToday) as HTMLInputElement;
    expect(date.max).toBe(new Date().toISOString().slice(0, 10));
  });

  it("refuses to save a date typed past today", () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));
    fireEvent.click(screen.getByText(gameLogCopy.form.playedToday));
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText(gameLogCopy.form.playedToday), {
      target: { value: tomorrow },
    });
    expect(screen.getByRole("button", { name: gameLogCopy.form.save })).toBeDisabled();
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
