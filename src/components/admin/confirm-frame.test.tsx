// The shared admin confirm: the model confirm draws in it today, and Delete a group and Kill a flag (small items 9)
// draw in it with `tone: "danger"`. Pins what both callers rely on: the danger fill, Cancel taking the focus, the
// caller's own body under the facts, and a pending write holding both buttons.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmFrame } from "./confirm-frame";

const base = {
  title: "Delete Founders?",
  lead: "It's empty, so deleting it changes nothing for any account.",
  facts: [["Members", "None."], ["Flyer codes", "None."]] as const,
  cancelLabel: "Keep it",
  confirmLabel: "Delete the group",
};

describe("ConfirmFrame", () => {
  it("draws the danger action in --danger with white ink, and the default action in --fg", () => {
    const { unmount } = render(<ConfirmFrame {...base} tone="danger" pending={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const danger = screen.getByRole("button", { name: "Delete the group" });
    expect(danger.className).toContain("bg-[color:var(--danger)]");
    expect(danger.className).toContain("text-[#fff]");
    expect(danger.className).not.toContain("bg-[color:var(--fg)]");
    unmount();
    render(<ConfirmFrame {...base} pending={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const plain = screen.getByRole("button", { name: "Delete the group" });
    expect(plain.className).toContain("bg-[color:var(--fg)]");
    expect(plain.className).not.toContain("bg-[color:var(--danger)]");
  });

  it("focuses Cancel on open, so a stray Enter never confirms", () => {
    render(<ConfirmFrame {...base} tone="danger" pending={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Keep it" }));
  });

  it("names the dialog by its title, lists the facts and draws the caller's body in the scroller", () => {
    render(
      <ConfirmFrame {...base} tone="danger" pending={false} onConfirm={vi.fn()} onCancel={vi.fn()}>
        <p role="alert">{"Founders isn’t empty now. Nothing was deleted."}</p>
      </ConfirmFrame>,
    );
    const dialog = screen.getByRole("dialog", { name: "Delete Founders?" });
    expect(screen.getByText("Flyer codes").tagName).toBe("DT");
    const scroller = dialog.querySelector<HTMLElement>(".overflow-y-auto");
    expect(scroller?.contains(screen.getByRole("alert"))).toBe(true);
  });

  it("holds both buttons while the write is in flight", () => {
    const onConfirm = vi.fn();
    render(<ConfirmFrame {...base} tone="danger" pending onConfirm={onConfirm} onCancel={vi.fn()} />);
    const go = screen.getByRole("button", { name: "Delete the group" });
    expect(go).toBeDisabled();
    expect(screen.getByRole("button", { name: "Keep it" })).toBeDisabled();
    fireEvent.click(go);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
