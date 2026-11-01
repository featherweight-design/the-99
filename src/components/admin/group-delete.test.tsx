// Delete a group (small items 9, item 7; `Groups-Delete` D1 to D6c): the foot's open and refused states, the shared
// confirm in its danger tone with Keep it focused, a landed delete going to Groups with the name, and a delete the
// server refuses or loses saying so in the dialog's body.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupDeleteResult } from "../../lib/admin/group-writes";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));
vi.mock("../../app/admin/groups/actions", () => ({ deleteGroup: vi.fn() }));

const { GroupDelete } = await import("./group-delete");

const T = "11111111-1111-4111-8111-111111111111";
const remove = vi.fn<(id: string) => Promise<GroupDeleteResult>>();
const OVERRIDES = [{ name: "FEEDBACK_ENABLED" as const, label: "Overview v2", value: "on" as const }];
const press = () => screen.getByRole("button", { name: "Delete this group" });

beforeEach(() => {
  refresh.mockReset();
  push.mockReset();
  remove.mockReset();
});

describe("GroupDelete", () => {
  it("draws the press in --danger with the hint, and opens the danger confirm with Keep it focused", () => {
    render(<GroupDelete id={T} name="testers" members={0} codes={[]} overrides={OVERRIDES} remove={remove} />);
    expect(press().className).toContain("text-[color:var(--danger)]");
    expect(press()).not.toHaveAttribute("aria-disabled");
    expect(screen.getByText("Only an empty group can go: no members, no flyer codes.")).toBeInTheDocument();
    fireEvent.click(press());
    expect(screen.getByRole("dialog", { name: "Delete testers?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete the group" }).className).toContain("bg-[color:var(--danger)]");
    expect(screen.getByRole("button", { name: "Keep it" })).toHaveFocus();
    expect(screen.getByText("Overview v2 on goes with it. It reaches nobody now.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("holds the press dimmed and inert, with the reason, when the group has members or a live code", () => {
    const { rerender } = render(<GroupDelete id={T} name="testers" members={2} codes={[]} overrides={[]} remove={remove} />);
    expect(press()).toHaveAttribute("aria-disabled", "true");
    expect(press().className).toContain("aria-disabled:opacity-45");
    expect(screen.getByText("It still has 2 members. Unselect them above and save, then delete it.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Flyer codes ›" })).toBeNull();
    fireEvent.click(press());
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<GroupDelete id={T} name="testers" members={0} codes={[{ code: "MOXB7K", revoked: false }]} overrides={[]} remove={remove} />);
    expect(screen.getByText("It has the live flyer code MOXB7K. Revoke it on Invites first.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Flyer codes ›" })).toHaveAttribute("href", "/admin/invites#flyer-codes");
    rerender(<GroupDelete id={T} name="testers" members={2} codes={[{ code: "MOXB7K", revoked: false }]} overrides={[]} remove={remove} />);
    expect(screen.getByText(/^It still has 2 members and the live flyer code MOXB7K\./)).toBeInTheDocument();
    // A revoked code does not block.
    rerender(<GroupDelete id={T} name="testers" members={0} codes={[{ code: "MOXB7K", revoked: true }]} overrides={[]} remove={remove} />);
    expect(press()).not.toHaveAttribute("aria-disabled");
  });

  it("goes to Groups with the name once the delete lands", async () => {
    remove.mockResolvedValue({ ok: true, name: "testers" });
    render(<GroupDelete id={T} name="testers" members={0} codes={[]} overrides={[]} remove={remove} />);
    fireEvent.click(press());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete the group" })));
    expect(remove).toHaveBeenCalledWith(T);
    expect(push).toHaveBeenCalledWith("/admin/groups?deleted=testers");
  });

  it("says a raced delete deleted nothing, in the dialog, and refreshes the page", async () => {
    remove.mockResolvedValue({ ok: false, error: "not_empty" });
    render(<GroupDelete id={T} name="testers" members={0} codes={[]} overrides={[]} remove={remove} />);
    fireEvent.click(press());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete the group" })));
    expect(screen.getByRole("alert")).toHaveTextContent("testers isn’t empty now. Nothing was deleted.");
    expect(screen.getByRole("dialog")).toContainElement(screen.getByRole("alert"));
    expect(refresh).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("says a failed delete deleted nothing, and a lost one that it may have", async () => {
    remove.mockResolvedValueOnce({ ok: false, error: "failed" }).mockRejectedValueOnce(new Error("offline"));
    render(<GroupDelete id={T} name="testers" members={0} codes={[]} overrides={[]} remove={remove} />);
    fireEvent.click(press());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete the group" })));
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t delete the group. Nothing was deleted.");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete the group" })));
    expect(screen.getByRole("alert")).toHaveTextContent("Lost touch with the server, so it may have deleted.");
    expect(refresh).not.toHaveBeenCalled();
  });
});
