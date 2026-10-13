// The switch page's write controls (admin STATES F3, F5, F10, F11): the pressed option holds while a
// write is in flight, a failure says so with Try again, a rise opens the confirm and sends its count
// back, and a kill disables the segment while leaving Clear live.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WriteResult } from "../../lib/admin/switch-writes";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const set = vi.fn<(input: object) => Promise<WriteResult>>();
const clear = vi.fn<(input: object) => Promise<WriteResult>>();
vi.mock("../../app/admin/switches/actions", () => ({ setSwitchOverride: (i: object) => set(i), clearSwitchOverride: (i: object) => clear(i) }));

const { AppWideControl, RowControls } = await import("./override-controls");

const PREVIEW = { names: ["Mara", "Theo"], count: 2, costs: [{ key: "intake" as const, reserveMicroUsd: 240_000, meanMicroUsd: null }], credits: [5], whatsNew: 2 };
function deferred() {
  let resolve!: (r: WriteResult) => void;
  return { promise: new Promise<WriteResult>((r) => (resolve = r)), resolve };
}
const radio = (name: string) => screen.getByRole("radio", { name });

beforeEach(() => {
  set.mockReset();
  clear.mockReset();
  refresh.mockReset();
});

describe("AppWideControl", () => {
  it("holds the pressed option and disables the others while the write is in flight, then refreshes (F10)", async () => {
    const d = deferred();
    set.mockReturnValueOnce(d.promise);
    render(<AppWideControl name="DECK_NOTES_ENABLED" label="Deck notes" value={null} killed={false} />);
    fireEvent.click(radio("On"));
    expect(radio("On")).toHaveAttribute("aria-checked", "true");
    expect(radio("Off")).toBeDisabled();
    expect(radio("Not set")).toBeDisabled();
    expect(set).toHaveBeenCalledWith({ switchName: "DECK_NOTES_ENABLED", scope: "app", value: "on" });
    await act(async () => d.resolve({ ok: true }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("says nothing changed, and Try again repeats the write (F11)", async () => {
    clear.mockResolvedValueOnce({ ok: false, error: "failed" }).mockResolvedValueOnce({ ok: true });
    render(<AppWideControl name="DECK_NOTES_ENABLED" label="Deck notes" value="off" killed={false} />);
    await act(async () => fireEvent.click(radio("Not set")));
    expect(screen.getByRole("alert").textContent).toContain("Didn’t save. Nothing changed.");
    expect(radio("Off")).toHaveAttribute("aria-checked", "true");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Try again" })));
    expect(clear).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("opens the confirm on a rise and sends the confirmed count and note back (F3)", async () => {
    clear.mockResolvedValueOnce({ ok: false, error: "confirm", preview: PREVIEW }).mockResolvedValueOnce({ ok: true });
    render(<AppWideControl name="HELP_ME_CHOOSE_ENABLED" label="Help me choose" value="off" killed={false} />);
    await act(async () => fireEvent.click(radio("Not set")));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading").textContent).toBe("Turn Help me choose on for 2 more accounts?");
    // The option the confirm asks about is ringed in dashed accent; the saved one stays selected.
    expect(radio("Not set").className).toContain("border-dashed");
    expect(radio("Off")).toHaveAttribute("aria-checked", "true");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "evals settled" } });
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Turn on for 2" })));
    expect(clear).toHaveBeenLastCalledWith({ switchName: "HELP_ME_CHOOSE_ENABLED", scope: "app", note: "evals settled", confirmed: 2 });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("writes nothing when the confirm is cancelled", async () => {
    set.mockResolvedValueOnce({ ok: false, error: "confirm", preview: PREVIEW });
    render(<AppWideControl name="HELP_ME_CHOOSE_ENABLED" label="Help me choose" value={null} killed={false} />);
    await act(async () => fireEvent.click(radio("On")));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(set).toHaveBeenCalledOnce();
  });

  it("is disabled under a kill, except Not set when a row is there to clear (F5)", () => {
    const { rerender } = render(<AppWideControl name="DECK_NOTES_ENABLED" label="Deck notes" value={null} killed />);
    for (const n of ["Not set", "On", "Off"]) expect(radio(n)).toBeDisabled();
    rerender(<AppWideControl name="DECK_NOTES_ENABLED" label="Deck notes" value="on" killed />);
    expect(radio("Not set")).toBeEnabled();
    expect(radio("Off")).toBeDisabled();
  });
});

describe("RowControls", () => {
  const row = (killed: boolean) => (
    <ul>
      <li>
        <RowControls target={{ switchName: "DECK_NOTES_ENABLED", scope: "user", targetUserId: "u2" }} title="Mara" value="on" killed={killed} context={{ switchLabel: "Deck notes", scope: "user", groupName: null }} />
      </li>
    </ul>
  );

  it("disables On and Off under a kill and leaves Clear live (F5)", async () => {
    clear.mockResolvedValueOnce({ ok: true });
    render(row(true));
    expect(radio("On")).toBeDisabled();
    expect(radio("Off")).toBeDisabled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Clear" })));
    expect(clear).toHaveBeenCalledWith({ switchName: "DECK_NOTES_ENABLED", scope: "user", targetUserId: "u2" });
  });

  it("hands focus to the section's Add button once a Clear saves, since the row leaves the page", async () => {
    clear.mockResolvedValueOnce({ ok: true });
    render(
      <>
        {row(false)}
        <button type="button" data-add-override="user">Add an account override</button>
      </>,
    );
    screen.getByRole("button", { name: "Clear" }).focus();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Clear" })));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add an account override" }));
  });

  it("says the server refused a change with no Try again", async () => {
    set.mockResolvedValueOnce({ ok: false, error: "killed" });
    render(row(false));
    await act(async () => fireEvent.click(radio("Off")));
    expect(screen.getByRole("alert").textContent).toBe("The server refused that change. Reload the page and try again.");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});
