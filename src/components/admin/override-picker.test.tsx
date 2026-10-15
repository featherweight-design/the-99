// Add a group or an account override (admin STATES F7, F8).
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Suspense, use, useState } from "react";
import { describe, expect, it, vi } from "vitest";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const set = vi.fn<(input: object) => Promise<{ ok: true }>>(async () => ({ ok: true }));
vi.mock("../../app/admin/switches/actions", () => ({ setSwitchOverride: (i: object) => set(i), clearSwitchOverride: vi.fn() }));

const { OverridePicker } = await import("./override-picker");

const PEOPLE = Array.from({ length: 9 }, (_, i) => ({ id: `user_${i}`, label: `Player ${i}`, sub: `p${i}@x`, search: `player ${i} p${i}@x` }));
const draw = (kind: "group" | "user", choices = PEOPLE, taken = new Set<string>(), killed = false) =>
  render(<OverridePicker kind={kind} name="DECK_NOTES_ENABLED" label="Deck notes" choices={choices} taken={taken} killed={killed} announces={false} />);

describe("OverridePicker", () => {
  it("opens an inline lookup of at most seven, filtered by name, email or id prefix (F7)", () => {
    draw("user");
    fireEvent.click(screen.getByRole("button", { name: "Add an account override" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "p3@" } });
    expect(screen.getAllByRole("listitem").map((l) => l.textContent)).toEqual(["Player 3p3@x"]);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(screen.getByText("No account matches.")).toBeInTheDocument();
  });

  it("adds a pending row that writes nothing until On or Off, then saves with its note", async () => {
    draw("user");
    fireEvent.click(screen.getByRole("button", { name: "Add an account override" }));
    fireEvent.click(screen.getByRole("button", { name: /Player 2/ }));
    expect(screen.getByTestId("pending-override")).toBeInTheDocument();
    expect(set).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "Note (optional)" }), { target: { value: "early look" } });
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "On" })));
    expect(set).toHaveBeenCalledWith({ switchName: "DECK_NOTES_ENABLED", scope: "user", targetUserId: "user_2", value: "on", note: "early look" });
  });

  it("hands back to the add button once saved, and a group turned on says members see it next visit (F12)", async () => {
    render(<OverridePicker kind="group" name="DECK_NOTES_ENABLED" label="Deck notes" choices={[{ id: "g1", label: "friends", sub: "g1", search: "friends" }]} taken={new Set()} killed={false} announces />);
    fireEvent.click(screen.getByRole("button", { name: "Add a group override" }));
    fireEvent.click(screen.getByRole("button", { name: /friends/ }));
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "On" })));
    expect(screen.queryByTestId("pending-override")).toBeNull();
    expect(screen.getByText("Members see it in What’s new on their next visit.")).toBeInTheDocument();
  });

  // The pending row hands back in the refresh's own transition: handed back at once, it left the list
  // with neither the pending row nor the saved one until the refresh drew.
  it("keeps the pending row until the refresh draws the saved one", async () => {
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
          <OverridePicker kind="user" name="DECK_NOTES_ENABLED" label="Deck notes" choices={PEOPLE} taken={new Set()} killed={false} announces={false} />
        </Suspense>
      );
    }
    refresh.mockImplementationOnce(() => startRefresh());
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Add an account override" }));
    fireEvent.click(screen.getByRole("button", { name: /Player 2/ }));
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "On" })));
    expect(screen.getByTestId("pending-override")).toBeInTheDocument();
    await act(async () => land());
    expect(screen.queryByTestId("pending-override")).toBeNull();
  });

  it("returns focus to the Add button after a save", async () => {
    draw("user");
    fireEvent.click(screen.getAllByRole("button", { name: "Add an account override" }).at(-1)!);
    fireEvent.click(screen.getByRole("button", { name: /Player 1/ }));
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "Off" })));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add an account override" }));
  });

  it("caps a long group list at seven, with a search that reaches the rest", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `g${i}`, label: `group ${i}`, sub: `g${i}`, search: `group ${i}` }));
    draw("group", many);
    fireEvent.click(screen.getByRole("button", { name: "Add a group override" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search groups" }), { target: { value: "group 8" } });
    expect(screen.getAllByRole("listitem").map((l) => l.textContent)).toEqual(["group 8g8"]);
  });

  it("marks a target that already has a row `already set` and unpickable (F8)", () => {
    draw("group", [{ id: "g1", label: "friends", sub: "g1", search: "friends" }, { id: "g2", label: "testers", sub: "g2", search: "testers" }], new Set(["g1"]));
    fireEvent.click(screen.getByRole("button", { name: "Add a group override" }));
    expect(screen.getByRole("button", { name: /friends/ })).toBeDisabled();
    expect(screen.getByText("already set")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /testers/ })).toBeEnabled();
  });

  it("says there are no groups yet, and is disabled under a kill", () => {
    draw("group", []);
    fireEvent.click(screen.getByRole("button", { name: "Add a group override" }));
    expect(screen.getByText("No groups yet.")).toBeInTheDocument();
    draw("user", PEOPLE, new Set(), true);
    expect(screen.getAllByRole("button", { name: "Add an account override" }).at(-1)).toBeDisabled();
  });
});
