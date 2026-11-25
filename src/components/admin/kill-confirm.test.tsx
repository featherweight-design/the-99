// The kill confirm (small items 9, item 4; `Flags-Kill` K4, K6): the board's strings, the danger action, the note sent
// back, and a failure drawn inside the dialog.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KillConfirm } from "./kill-confirm";
import { adminCopy } from "../../lib/copy/admin";

const WHO = "All 212 accounts, the 13 held on by Founders, two account overrides and All features too.";

describe("KillConfirm", () => {
  it("draws the title, lead, facts and note, with Cancel and the danger action", () => {
    render(<KillConfirm label={"Fixture push flag"} who={WHO} pending={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading").textContent).toBe("Kill Fixture push flag for everyone?");
    expect(dialog.textContent).toContain("Killed turns Fixture push flag off for every account, and beats every override and All features. Nothing is deleted.");
    expect([...dialog.querySelectorAll("dt")].map((d) => d.textContent)).toEqual(["Who", "Overrides", "When"]);
    expect([...dialog.querySelectorAll("dd")].map((d) => d.textContent)).toEqual([
      WHO,
      adminCopy.killConfirm.overrides,
      "Each server picks it up after 30 seconds and one more request.",
    ]);
    expect(within(dialog).getByRole("textbox", { name: adminCopy.killConfirm.note })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBe(document.activeElement);
    const action = within(dialog).getByRole("button", { name: adminCopy.killConfirm.confirm });
    expect(action.className).toContain("bg-[color:var(--danger)]");
    expect(action.className).toContain("text-[#fff]");
  });

  it("sends the note back on Kill for everyone, and calls Cancel on Cancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<KillConfirm label={"Fixture push flag"} who={WHO} pending={false} onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "push keys leaked" } });
    fireEvent.click(screen.getByRole("button", { name: adminCopy.killConfirm.confirm }));
    expect(onConfirm).toHaveBeenCalledWith("push keys leaked");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("holds both buttons while the write is in flight, and draws a failure inside the dialog", () => {
    render(<KillConfirm label={"Fixture push flag"} who={WHO} pending failure={<p role="alert">Fixture failure</p>} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: adminCopy.killConfirm.confirm })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(within(dialog).getByRole("alert").textContent).toBe("Fixture failure");
  });
});
