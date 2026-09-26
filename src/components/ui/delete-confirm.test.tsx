import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeleteConfirm } from "./delete-confirm";

function mount(over: Partial<Parameters<typeof DeleteConfirm>[0]> = {}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(
    <DeleteConfirm
      heading="Delete “Gishath”?"
      body="Its list goes with it."
      cancelLabel="Keep it"
      confirmLabel="Delete deck"
      pendingLabel="Deleting…"
      pending={false}
      error={null}
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...over}
    />,
  );
  return { onCancel, onConfirm };
}

describe("DeleteConfirm, the one delete pane", () => {
  it("names the thing, says what goes, and puts focus on KEEP rather than the delete", () => {
    mount();
    expect(screen.getByText("Delete “Gishath”?")).toBeInTheDocument();
    expect(screen.getByText("Its list goes with it.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep it" })).toHaveFocus();
  });

  it("hands each press to its caller", () => {
    const { onCancel, onConfirm } = mount();
    fireEvent.click(screen.getByRole("button", { name: "Delete deck" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons and names the wait while the action is in flight", () => {
    mount({ pending: true });
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Keep it" })).toBeDisabled();
  });

  it("keeps the confirm's own label in flight when no pending label is given", () => {
    mount({ pending: true, pendingLabel: undefined });
    expect(screen.getByRole("button", { name: "Delete deck" })).toBeDisabled();
  });

  it("says a failure as an alert, inside the pane", () => {
    mount({ error: "We couldn’t delete that deck." });
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t delete that deck.");
  });
});
