// The settings dialog keeps the modal rule: the box is capped in dvh and never scrolls itself; the fields are its
// one scroller, `min-h-0` so it can shrink; the title and Save sit outside it, so an open keyboard never hides them.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../app/admin/actions", () => ({ setAccountCap: vi.fn(), setOrgCap: vi.fn(), setSystemCeiling: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { SettingAction } from "./setting-dialog";

describe("SettingDialog's capped column", () => {
  it("scrolls the fields between a pinned title and pinned buttons", () => {
    render(<SettingAction kind="ceiling" label="Change the ceiling" />);
    fireEvent.click(screen.getByRole("button", { name: "Change the ceiling" }));
    const dialog = screen.getByRole("dialog");
    const cls = dialog.className.split(/\s+/);
    expect(cls).toEqual(expect.arrayContaining(["flex", "flex-col", "overflow-hidden", "max-h-[88dvh]"]));
    expect(cls).not.toContain("overflow-y-auto");
    const scrollers = [...dialog.querySelectorAll<HTMLElement>(".overflow-y-auto")];
    expect(scrollers).toHaveLength(1);
    const body = scrollers[0];
    expect(body.className.split(/\s+/)).toEqual(expect.arrayContaining(["min-h-0", "flex-1"]));
    expect(body.contains(screen.getByRole("textbox", { name: "Amount ($)" }))).toBe(true);
    const title = screen.getByRole("heading");
    expect(body.contains(title)).toBe(false);
    expect(title.className).toContain("flex-none");
    const save = screen.getByRole("button", { name: "Save" });
    expect(body.contains(save)).toBe(false);
    expect(save.parentElement!.className).toContain("flex-none");
    expect(save.closest("form")!.className.split(/\s+/)).toEqual(expect.arrayContaining(["min-h-0", "flex-1"]));
  });
});
