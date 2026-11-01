// The landed delete's toast on Groups (small items 9, item 7; D7, D8): Deleted {group}. with a bare ✕ and no Undo,
// and the `?deleted=` parameter stripped through `mirrorUrl`, never `history.replaceState` directly.
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mirror = vi.fn();
vi.mock("../../lib/url/mirror", () => ({ mirrorUrl: (u: URL) => mirror(String(u)) }));

const { DeletedGroupToast } = await import("./deleted-group-toast");

beforeEach(() => {
  mirror.mockReset();
  window.history.pushState(null, "", "/admin/groups?deleted=testers&x=1");
});

describe("DeletedGroupToast", () => {
  it("says the group was deleted, offers only a bare ✕, and strips the parameter", () => {
    render(<DeletedGroupToast name="testers" />);
    expect(screen.getByRole("status")).toHaveTextContent("Deleted testers.");
    expect(screen.queryByRole("button", { name: /undo/i })).toBeNull();
    expect(mirror).toHaveBeenCalledWith(`${window.location.origin}/admin/groups?x=1`);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("draws nothing without a name", () => {
    render(<DeletedGroupToast name={null} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(mirror).not.toHaveBeenCalled();
  });
});
