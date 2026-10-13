import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../app/decks/precon-link-actions", () => ({ linkPrecon: vi.fn(), unlinkPrecon: vi.fn() }));

const { LinkPicker } = await import("./precon-link-dialogs");

const items = [
  { id: "p1", name: "Elven Empire", meta: "KHC · 2021", note: null, fig: "80%", search: "Elven Empire" },
  { id: "p2", name: "Phantom Premonition", meta: "KHC · 2021", note: null, fig: "40%", search: "Phantom Premonition" },
];

function mount(onDismiss = vi.fn()) {
  render(
    <LinkPicker
      title="Link a precon"
      lead="Pick the precon this deck started from."
      searchLabel="Search precons"
      label="Precons"
      figSub="match"
      items={items}
      none="No precons"
      noMatch={(q) => `Nothing matches ${q}`}
      foot="Linking keeps your list."
      footNone="Pick one to link."
      submit={(name) => `Link ${name}`}
      onLink={vi.fn(async () => {})}
      onDismiss={onDismiss}
    />,
  );
  return onDismiss;
}

// One rule for a search field that picks from a list (DECK INPUT UX, Hugh 2026-10-12): inside a
// dialog, the first Escape clears a typed search and the next closes the dialog.
describe("the precon link picker's search", () => {
  it("clears a typed search on the first Escape and closes the dialog on the next", () => {
    const onDismiss = mount();
    const field = screen.getByRole("searchbox", { name: "Search precons" });
    fireEvent.change(field, { target: { value: "elven" } });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(field).toHaveValue("");
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
