// The switch page's write controls (admin STATES F3, F5, F10, F11): the pressed option holds while a
// write is in flight, a failure says so with Try again, a rise opens the confirm and sends its count
// back, and a kill disables the segment while leaving Clear live. Killed asks first; a lift saves at once.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Suspense, use, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WriteResult } from "../../lib/admin/flag-writes";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const set = vi.fn<(input: object) => Promise<WriteResult>>();
const clear = vi.fn<(input: object) => Promise<WriteResult>>();
vi.mock("../../app/admin/flags/actions", () => ({ setSwitchOverride: (i: object) => set(i), clearSwitchOverride: (i: object) => clear(i) }));

const { AppWideControl, RowControls, Seg } = await import("./override-controls");

const PREVIEW = { names: ["Mara", "Theo"], count: 2, costs: [{ key: "intake" as const, reserveMicroUsd: 240_000, meanMicroUsd: null }], credits: [5] };
function deferred() {
  let resolve!: (r: WriteResult) => void;
  return { promise: new Promise<WriteResult>((r) => (resolve = r)), resolve };
}
const radio = (name: string) => screen.getByRole("radio", { name });
const WHO = "All 2 accounts, the 1 held on by Founders.";

beforeEach(() => {
  set.mockReset();
  clear.mockReset();
  refresh.mockReset();
});

describe("AppWideControl", () => {
  it("holds the pressed option and disables the others while the write is in flight, then refreshes (F10)", async () => {
    const d = deferred();
    set.mockReturnValueOnce(d.promise);
    render(<AppWideControl name="FEEDBACK_ENABLED" label="Feedback" value={null} stopped={false} who={WHO} />);
    fireEvent.click(radio("On"));
    expect(radio("On")).toHaveAttribute("aria-checked", "true");
    expect(radio("Off")).toBeDisabled();
    expect(radio("Not set")).toBeDisabled();
    // The value the page drew rides along, so a write over a kill it never saw is refused.
    expect(set).toHaveBeenCalledWith({ switchName: "FEEDBACK_ENABLED", scope: "app", expected: null, value: "on" });
    await act(async () => d.resolve({ ok: true }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  // The refresh the save starts is a transition, and the page is drawn with the old value until it
  // lands. Released before then, On flipped back to Off for a beat and then to On (Hugh's report).
  it("keeps the saved option pressed until the refresh has drawn it", async () => {
    let land!: () => void;
    const landed = new Promise<void>((r) => (land = r));
    let startRefresh!: () => void;
    function Pending({ go }: { go: boolean }) {
      if (go) use(landed);
      return null;
    }
    function Page() {
      const [go, setGo] = useState(false);
      startRefresh = () => setGo(true);
      return (
        <Suspense fallback={null}>
          <Pending go={go} />
          <AppWideControl name="FEEDBACK_ENABLED" label="Feedback" value={null} stopped={false} who={WHO} />
        </Suspense>
      );
    }
    refresh.mockImplementation(() => startRefresh());
    set.mockResolvedValueOnce({ ok: true });
    render(<Page />);
    await act(async () => fireEvent.click(radio("On")));
    expect(refresh).toHaveBeenCalledOnce();
    expect(radio("On")).toHaveAttribute("aria-checked", "true");
    expect(radio("Not set")).toHaveAttribute("aria-checked", "false");
    await act(async () => land());
    // Drawn with the page's own value once the refresh has landed (this fixture's never moves).
    expect(radio("Not set")).toHaveAttribute("aria-checked", "true");
  });

  it("says nothing changed, and Try again repeats the write (F11)", async () => {
    clear.mockResolvedValueOnce({ ok: false, error: "failed" }).mockResolvedValueOnce({ ok: true });
    render(<AppWideControl name="FEEDBACK_ENABLED" label="Feedback" value="off" stopped={false} who={WHO} />);
    await act(async () => fireEvent.click(radio("Not set")));
    expect(screen.getByRole("alert").textContent).toContain("Didn’t save. Nothing changed.");
    expect(radio("Off")).toHaveAttribute("aria-checked", "true");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Try again" })));
    expect(clear).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("opens the confirm on a rise and sends the confirmed count and note back (F3)", async () => {
    clear.mockResolvedValueOnce({ ok: false, error: "confirm", preview: PREVIEW }).mockResolvedValueOnce({ ok: true });
    render(<AppWideControl name="SUGGESTED_CHANGES_V2_ENABLED" label="Suggested changes v2" value="off" stopped={false} who={WHO} />);
    await act(async () => fireEvent.click(radio("Not set")));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading").textContent).toBe("Turn Suggested changes v2 on for 2 more accounts?");
    // The option the confirm asks about is ringed in dashed accent; the saved one stays selected.
    expect(radio("Not set").className).toContain("border-dashed");
    expect(radio("Off")).toHaveAttribute("aria-checked", "true");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "evals settled" } });
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Turn on for 2" })));
    expect(clear).toHaveBeenLastCalledWith({ switchName: "SUGGESTED_CHANGES_V2_ENABLED", scope: "app", expected: "off", note: "evals settled", confirmed: 2 });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("writes nothing when the confirm is cancelled", async () => {
    set.mockResolvedValueOnce({ ok: false, error: "confirm", preview: PREVIEW });
    render(<AppWideControl name="SUGGESTED_CHANGES_V2_ENABLED" label="Suggested changes v2" value={null} stopped={false} who={WHO} />);
    await act(async () => fireEvent.click(radio("On")));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(set).toHaveBeenCalledOnce();
  });

  // Small items 9, item 4 (`Flags-Kill` K4 to K7).
  it("draws Killed last, in the kill ink, and fills it in --danger once chosen", () => {
    const { rerender } = render(<AppWideControl name="PUSH_ENABLED" label="Push notifications" value="on" stopped={false} who={WHO} />);
    expect(within(screen.getByRole("radiogroup")).getAllByRole("radio").map((r) => r.textContent)).toEqual(["Not set", "On", "Off", "Killed"]);
    expect(radio("Killed").className).toContain("text-[color:var(--danger)]");
    expect(radio("Killed")).toHaveAttribute("aria-checked", "false");
    rerender(<AppWideControl name="PUSH_ENABLED" label="Push notifications" value="killed" stopped={false} who={WHO} />);
    expect(radio("Killed")).toHaveAttribute("aria-checked", "true");
    expect(radio("Killed").className).toContain("bg-[color:var(--danger)]");
    expect(radio("Killed").className).toContain("text-[#fff]");
    // Lifting is live: On, Off and Not set are not held under a killed row.
    for (const n of ["Not set", "On", "Off"]) expect(radio(n)).toBeEnabled();
  });

  it("asks before a kill, every time, with its strings and the danger action; Cancel writes nothing", async () => {
    render(<AppWideControl name="PUSH_ENABLED" label="Push notifications" value="on" stopped={false} who={WHO} />);
    fireEvent.click(radio("Killed"));
    expect(set).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading").textContent).toBe("Kill Push notifications for everyone?");
    expect(dialog.textContent).toContain("Killed turns Push notifications off for every account, and beats every override and All features. Nothing is deleted.");
    expect([...dialog.querySelectorAll("dt")].map((d) => d.textContent)).toEqual(["Who", "Overrides", "When"]);
    expect([...dialog.querySelectorAll("dd")].map((d) => d.textContent)).toEqual([
      WHO,
      "Kept, and refused while killed. Lifting the kill brings them back.",
      "Within 30 seconds, on every server.",
    ]);
    expect(within(dialog).getByText("Note (optional)")).toBeInTheDocument();
    const action = within(dialog).getByRole("button", { name: "Kill for everyone" });
    expect(action.className).toContain("bg-[color:var(--danger)]");
    // The option it asks about is ringed, in the kill ink; the saved one stays selected.
    expect(radio("Killed").className).toContain("border-dashed");
    expect(radio("Killed").className).toContain("border-[color:var(--danger)]");
    expect(radio("On")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(set).not.toHaveBeenCalled();
  });

  it("writes the kill with its note from the value the page drew, then closes", async () => {
    set.mockResolvedValueOnce({ ok: true });
    render(<AppWideControl name="PUSH_ENABLED" label="Push notifications" value="on" stopped={false} who={WHO} />);
    fireEvent.click(radio("Killed"));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: " push keys leaked " } });
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Kill for everyone" })));
    expect(set).toHaveBeenCalledWith({ switchName: "PUSH_ENABLED", scope: "app", expected: "on", value: "killed", note: "push keys leaked" });
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps a failed kill in its confirm, as the override write's shipped line", async () => {
    set.mockResolvedValueOnce({ ok: false, error: "failed" });
    render(<AppWideControl name="PUSH_ENABLED" label="Push notifications" value="on" stopped={false} who={WHO} />);
    fireEvent.click(radio("Killed"));
    await act(async () => fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kill for everyone" })));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("alert").textContent).toContain("Didn’t save. Nothing changed.");
    expect(within(dialog).getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("drops a failed kill's line when its confirm is cancelled, so no Try again re-sends it under the segment", async () => {
    set.mockResolvedValueOnce({ ok: false, error: "failed" });
    render(<AppWideControl name="PUSH_ENABLED" label="Push notifications" value="on" stopped={false} who={WHO} />);
    fireEvent.click(radio("Killed"));
    await act(async () => fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kill for everyone" })));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(set).toHaveBeenCalledOnce();
  });

  it("lifts a kill at once, with no confirm, from the kill the page drew", async () => {
    set.mockResolvedValueOnce({ ok: true });
    clear.mockResolvedValueOnce({ ok: true });
    render(<AppWideControl name="PUSH_ENABLED" label="Push notifications" value="killed" stopped={false} who={WHO} />);
    await act(async () => fireEvent.click(radio("Off")));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(set).toHaveBeenCalledWith({ switchName: "PUSH_ENABLED", scope: "app", expected: "killed", value: "off" });
  });

  const STALE = "This flag changed since the page loaded. The page now shows what’s saved.";

  it("refreshes the page when a write's view went stale, and says so with no Try again", async () => {
    set.mockResolvedValueOnce({ ok: false, error: "stale" });
    render(<AppWideControl name="PUSH_ENABLED" label="Push notifications" value="on" stopped={false} who={WHO} />);
    await act(async () => fireEvent.click(radio("Off")));
    expect(screen.getByRole("alert").textContent).toBe(STALE);
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("closes the kill confirm on a stale kill, refreshes, and leaves no Confirm resending the old view", async () => {
    set.mockResolvedValueOnce({ ok: false, error: "stale" });
    render(<AppWideControl name="PUSH_ENABLED" label="Push notifications" value="on" stopped={false} who={WHO} />);
    fireEvent.click(radio("Killed"));
    await act(async () => fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kill for everyone" })));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("alert").textContent).toBe(STALE);
    expect(refresh).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledOnce();
  });

  // A write that saved but lost its reply reads `failed`; its Try again resends the old view and finds it stale.
  it("redraws the saved state when a lost reply's Try again finds its own write landed", async () => {
    set.mockResolvedValueOnce({ ok: false, error: "failed" }).mockResolvedValueOnce({ ok: false, error: "stale" });
    render(<AppWideControl name="PUSH_ENABLED" label="Push notifications" value="on" stopped={false} who={WHO} />);
    await act(async () => fireEvent.click(radio("Off")));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Try again" })));
    expect(screen.getByRole("alert").textContent).toBe(STALE);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("drops an earlier failure when Killed opens its confirm, so the old write's Try again is not in the dialog", async () => {
    set.mockResolvedValueOnce({ ok: false, error: "failed" });
    render(<AppWideControl name="PUSH_ENABLED" label="Push notifications" value="on" stopped={false} who={WHO} />);
    await act(async () => fireEvent.click(radio("Off")));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(radio("Killed"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("is disabled under the env stop, except Not set when a row is there to clear (F5)", () => {
    const { rerender } = render(<AppWideControl name="FEEDBACK_ENABLED" label="Feedback" value={null} stopped who={WHO} />);
    for (const n of ["Not set", "On", "Off", "Killed"]) expect(radio(n)).toBeDisabled();
    rerender(<AppWideControl name="FEEDBACK_ENABLED" label="Feedback" value="on" stopped who={WHO} />);
    expect(radio("Not set")).toBeEnabled();
    expect(radio("Off")).toBeDisabled();
  });
});

describe("RowControls", () => {
  const row = (killed: boolean) => (
    <ul>
      <li>
        <RowControls target={{ switchName: "FEEDBACK_ENABLED", scope: "user", targetUserId: "u2" }} title="Mara" value="on" killed={killed} context={{ switchLabel: "Feedback", scope: "user", groupName: null }} />
      </li>
    </ul>
  );

  it("disables On and Off under a kill and leaves Clear live (F5)", async () => {
    clear.mockResolvedValueOnce({ ok: true });
    render(row(true));
    expect(radio("On")).toBeDisabled();
    expect(radio("Off")).toBeDisabled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Clear" })));
    expect(clear).toHaveBeenCalledWith({ switchName: "FEEDBACK_ENABLED", scope: "user", targetUserId: "u2" });
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

  it("forgets a cancelled clear's focus handoff, so a later confirmed set keeps focus on the row", async () => {
    clear.mockResolvedValueOnce({ ok: false, error: "confirm", preview: PREVIEW });
    set.mockResolvedValueOnce({ ok: false, error: "confirm", preview: PREVIEW }).mockResolvedValueOnce({ ok: true });
    render(
      <>
        {row(false)}
        <button type="button" data-add-override="user">Add an account override</button>
      </>,
    );
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Clear" })));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await act(async () => fireEvent.click(radio("Off")));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Turn on for 2" })));
    expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Add an account override" }));
  });

  it("says the server refused a change with no Try again", async () => {
    set.mockResolvedValueOnce({ ok: false, error: "killed" });
    render(row(false));
    await act(async () => fireEvent.click(radio("Off")));
    expect(screen.getByRole("alert").textContent).toBe("The server refused that change. Reload the page and try again.");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});

describe("Seg keys", () => {
  const OPTIONS = [{ key: "on", text: "On" }, { key: "off", text: "Off" }, { key: "unset", text: "Not set" }] as const;

  // A pick saves an override at once, so the keys move focus and never pick: Enter or Space does.
  it("is one tab stop on the chosen option; the arrows, Home and End move focus past a locked one and pick nothing", () => {
    const pick = vi.fn();
    render(<Seg label="Notes" options={OPTIONS} selected="off" pressed={null} disabled={false} locked={["on"]} onPick={pick} />);
    expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
    fireEvent.keyDown(radio("Off"), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(radio("Not set"));
    // The tab stop follows focus, so Tab leaves the group from where the reader is.
    expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([-1, -1, 0]);
    fireEvent.keyDown(radio("Not set"), { key: "Home" });
    expect(document.activeElement).toBe(radio("Off"));
    fireEvent.keyDown(radio("Off"), { key: "End" });
    expect(document.activeElement).toBe(radio("Not set"));
    expect(pick).not.toHaveBeenCalled();
    fireEvent.click(radio("Not set"));
    expect(pick).toHaveBeenCalledWith("unset");
  });

  it("puts the tab stop on the first option that can take focus when the chosen one cannot", () => {
    render(<Seg label="Notes" options={OPTIONS} selected="on" pressed={null} disabled={false} locked={["on"]} onPick={() => {}} />);
    expect(screen.getAllByRole("radio").map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  });
});
